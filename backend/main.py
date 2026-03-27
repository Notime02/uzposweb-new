from fastapi import FastAPI, HTTPException, Body, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from schemas import Ingredient, IngredientUpdate, Supplier, Recipe, Invoice, InvoiceItem
from logic import (
    get_recursive_recipe_cost, calculate_box_to_unit, get_supplier_items, 
    get_daily_stats, get_revenue_chart_data, get_all_ingredients, 
    get_all_suppliers, save_full_invoice, get_all_accounts, save_transaction,
    get_all_recipes, delete_recipe, get_all_sales, get_all_invoices,
    update_ingredient, delete_ingredient, create_ingredient, update_supplier, delete_supplier, add_supplier,
    update_ingredient, delete_ingredient, create_ingredient, update_supplier, delete_supplier, add_supplier,
    get_invoice_full_data, update_full_invoice, delete_invoice, update_menu_item_recipe
)
from database import supabase
from typing import List, Dict, Any

app = FastAPI(title="UzPos Backend API", version="1.1.0")

# 1. CORS Ayarlarını En Başa Al
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. Global Hata Yakalayıcı (Cari Hatalar ve Çökmeleri Önlemek İçin)
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(f"CRITICAL ERROR: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={"message": "Sunucuda beklenmedik bir hata oluştu.", "detail": str(exc)},
    )

@app.get("/")
def read_root():
    return {"message": "UzPos Backend API is running"}

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    print(f"ERROR: Detaylı Doğrulama Hatası -> {errors}")
    return JSONResponse(
        status_code=422,
        content={"detail": errors, "message": "Veri doğrulama hatası oluştu. Terminali kontrol edin."},
    )

# --- DASHBOARD & SALES ---
@app.get("/dashboard/summary")
def dashboard_summary():
    print("DEBUG: Dashboard özeti isteniyor...")
    return get_daily_stats()

@app.get("/dashboard/chart")
def dashboard_chart_data(days: int = 15):
    print(f"DEBUG: {days} günlük grafik verisi isteniyor...")
    return get_revenue_chart_data(days)

@app.get("/sales")
def list_sales():
    print("DEBUG: Günlük satış listesi isteniyor...")
    return get_all_sales()

# --- INVENTORY ---
@app.get("/ingredients")
def list_ingredients():
    print("DEBUG: Hammadde listesi isteniyor...")
    res = get_all_ingredients()
    return res.data if res.data else []

@app.post("/ingredients")
def add_ingredient(data: Ingredient):
    print(f"DEBUG: Yeni hammadde ekleniyor: {data.name}")
    db_data = data.model_dump(exclude_none=True)
    # Fatura üzerinden eklenen ürünler varsayılan olarak satışa kapalıdır (Envanterden açılmalıdır)
    db_data["is_saleable"] = False
    res = create_ingredient(db_data)
    if res:
        return res
    return {"message": "Created"}

@app.post("/calculate/box-unit")
def calculate_unit(box_price: float, units_per_box: float, tax_rate: float = 10, margin: float = 20):
    return calculate_box_to_unit(box_price, units_per_box, tax_rate, margin)

@app.put("/ingredients/{ingredient_id}")
def edit_ingredient(ingredient_id: str, data: IngredientUpdate):
    # Map the update model back to the DB columns if they differ
    db_data = data.model_dump(exclude_unset=True)
    if "unit_price" in db_data:
        db_data["sales_price"] = db_data.pop("unit_price")
    
    update_ingredient(ingredient_id, db_data)
    return {"message": "Updated"}

@app.delete("/ingredients/{ingredient_id}")
def remove_ingredient(ingredient_id: str):
    delete_ingredient(ingredient_id)
    return {"message": "Deleted"}

# --- SUPPLIERS & ACCOUNTS ---
@app.get("/suppliers")
def list_suppliers():
    print("DEBUG: Tedarikçi listesi isteniyor...")
    res = get_all_suppliers()
    return res.data if res.data else []

@app.get("/suppliers/{supplier_id}/items")
def fetch_supplier_items(supplier_id: int):
    print(f"DEBUG: Tedarikçi {supplier_id} ürünleri isteniyor...")
    items = get_supplier_items(supplier_id)
    return items if items else []

@app.get("/accounts")
def list_accounts():
    print("DEBUG: Kasa listesi isteniyor...")
    res = get_all_accounts()
    return res.data if res.data else []

@app.post("/transactions")
def add_transaction(account_id: int, amount: float, t_type: str, description: str):
    success = save_transaction(account_id, amount, t_type, description)
    if not success:
        raise HTTPException(status_code=400, detail="Transaction failed")
    return {"message": "Success"}

@app.put("/suppliers/{supplier_id}")
def edit_supplier(supplier_id: str, data: Dict[str, Any] = Body(...)):
    update_supplier(supplier_id, data)
    return {"message": "Updated"}

@app.post("/suppliers")
def create_supplier(data: Dict[str, Any] = Body(...)):
    print(f"DEBUG: Yeni cari ekleniyor: {data.get('name')}")
    res = add_supplier(data)
    return res.data[0] if res.data else {"message": "Created"}

@app.delete("/suppliers/{supplier_id}")
def remove_supplier(supplier_id: str):
    delete_supplier(supplier_id)
    return {"message": "Deleted"}

# --- RECIPES ---
@app.get("/recipes")
def list_recipes():
    print("DEBUG: Reçete listesi isteniyor...")
    return get_all_recipes()

@app.get("/recipes/{menu_item_id}/cost")
def get_recipe_cost(menu_item_id: int):
    cost = get_recursive_recipe_cost(menu_item_id)
    return {"menu_item_id": menu_item_id, "total_calculated_cost": round(cost, 2)}

@app.delete("/recipes/{recipe_id}")
def remove_recipe(recipe_id: str):
    delete_recipe(recipe_id)
    return {"message": "Deleted"}

@app.put("/recipes/{recipe_id}")
def edit_recipe(recipe_id: int, payload: Dict[str, Any] = Body(...)):
    """
    Updates basic info and ingredients list for a recipe.
    Payload expected:
    {
      "menu_data": { "name": "...", "price": ..., "category": "..." },
      "recipe_items": [ { "ingredient_id": ..., "quantity_used": ... }, ... ]
    }
    """
    res = update_menu_item_recipe(recipe_id, payload['menu_data'], payload['recipe_items'])
    return res

# --- INVOICES ---
@app.get("/invoices")
def list_invoices():
    print("DEBUG: Fatura geçmişi isteniyor...")
    return get_all_invoices()

@app.get("/invoices/{invoice_id}")
def fetch_invoice_details(invoice_id: str):
    print(f"DEBUG: Fatura detayları isteniyor: {invoice_id}")
    data = get_invoice_full_data(invoice_id)
    if not data:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return data

@app.post("/invoices")
def create_invoice(invoice: Dict[str, Any] = Body(...)):
    """Saves a complete invoice and updates balances/stocks."""
    print(f"DEBUG: Yeni fatura kaydediliyor: {invoice.get('invoice_number')}")
    inv_id = save_full_invoice(invoice)
    return {"id": inv_id, "message": "Created"}

@app.put("/invoices/{invoice_id}")
def update_invoice(invoice_id: str, invoice: Dict[str, Any] = Body(...)):
    """Updates an existing invoice."""
    print(f"DEBUG: Fatura güncelleniyor: {invoice_id}")
    update_full_invoice(invoice_id, invoice)
    return {"message": "Updated"}

@app.delete("/invoices/{invoice_id}")
def remove_invoice(invoice_id: str):
    """Deletes an invoice and its items."""
    print(f"DEBUG: Fatura siliniyor: {invoice_id}")
    delete_invoice(invoice_id)
    return {"message": "Deleted"}
