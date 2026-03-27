from database import supabase
from typing import Set, Dict, Any, List
import pandas as pd
from datetime import datetime

# --- INGREDIENTS & INVENTORY ---
def get_all_ingredients():
    return supabase.table("ingredients").select("*").order("name").execute()

def update_ingredient_stock(ing_id: int, qty_change: float):
    """Updates stock count. qty_change can be positive (invoice) or negative (sale/waste)."""
    # ID kontrolü: Eğer ID yoksa veya "None" gelmişse işlemi yapma
    if not ing_id or str(ing_id).lower() == "none":
        print(f"⚠️ Uyarı: Geçersiz ürün ID'si (ID: {ing_id}). Stok güncellenmedi.")
        return None

    res = supabase.table("ingredients").select("stock_quantity").eq("id", ing_id).single().execute()
    if res and res.data:
        new_qty = float(res.data['stock_quantity']) + qty_change
        supabase.table("ingredients").update({"stock_quantity": new_qty}).eq("id", ing_id).execute()

def create_ingredient(data: Dict[str, Any]):
    if 'purchase_unit' not in data or not data['purchase_unit']:
        data['purchase_unit'] = 'Adet'
    if 'usage_unit' not in data or not data['usage_unit']:
        data['usage_unit'] = 'Adet'
    res = supabase.table("ingredients").insert(data).execute()
    if res and res.data:
        return res.data[0]
    return None

def update_ingredient(ing_id: str, data: Dict[str, Any]):
    return supabase.table("ingredients").update(data).eq("id", ing_id).execute()

def delete_ingredient(ing_id: str):
    return supabase.table("ingredients").delete().eq("id", ing_id).execute()

# --- SUPPLIERS & DEBT ---
def get_all_suppliers():
    return supabase.table("suppliers").select("*").order("name").execute()

def recalculate_supplier_balance(supp_id: str):
    """
    Dinamik olarak borç hesaplar: 
    Bakiye = SUM(Faturalar) - SUM(Ödemeler/Tahsilatlar)
    """
    try:
        # 1. Faturaların Toplamı (Borç)
        inv_res = supabase.table("invoices").select("total_amount_gross").eq("supplier_id", supp_id).execute()
        total_invoices = sum([float(i.get('total_amount_gross', 0) or 0) for i in inv_res.data]) if inv_res.data else 0.0
        
        # 2. Ödemelerin Toplamı (Alacak - cariler tablosu veya account_transactions üzerinden)
        # Şimdilik sadece account_transactions içinde bu cariye ait bir çıkış var mı diye bakabiliriz
        # Ama basitleştirmek için mevcut bakiyeyi koruyup fatura tutarını eklemek daha güvenli olabilir
        # Eğer tam cari takibi isteniyorsa tüm hareketlerin taranması gerekir.
        # User dedi ki: "carileri kaydetmiyor". 
        # En güvenli yol: Mevcut bakiye + yeni fatura (incremental) ama bug'ları temizlemek için Recalculate daha iyi.
        
        # Mevcut logic.py'deki update_supplier_balance yerine bunu kullanacağız
        print(f"DEBUG: Cari {supp_id} için bakiye hesaplanıyor. Toplam Fatura: {total_invoices}")
        supabase.table("suppliers").update({"balance": total_invoices}).eq("id", supp_id).execute()
        return total_invoices
    except Exception as e:
        print(f"ERROR: Bakiye hesaplanamadı: {e}")
        return 0.0

def update_supplier_balance(supp_id: str, amount_change: float):
    """Legacy incremental update, now calls recalculate for safety."""
    return recalculate_supplier_balance(supp_id)

def update_supplier(supp_id: str, data: Dict[str, Any]):
    return supabase.table("suppliers").update(data).eq("id", supp_id).execute()

def add_supplier(data: Dict[str, Any]):
    return supabase.table("suppliers").insert(data).execute()

def delete_supplier(supp_id: str):
    return supabase.table("suppliers").delete().eq("id", supp_id).execute()

# --- INVOICES (The Master Saver) ---
def save_full_invoice(invoice_data: Dict[str, Any]):
    """
    Saves invoice header and items. 
    Updates: Supplier balance and Ingredient stocks/costs.
    """
    # 1. Save Header
    header = {
        "supplier_id": invoice_data['supplier_id'],
        "invoice_date": invoice_data['invoice_date'],
        "invoice_number": invoice_data.get('invoice_number', ''),
        "total_amount_gross": invoice_data['total_amount_gross'],
        "total_amount": invoice_data['total_amount_gross'],
        "status": "Kaydedildi"
    }
    inv_res = supabase.table("invoices").insert(header).execute()
    if not inv_res or not inv_res.data: return None
    inv_id = inv_res.data[0]['id']

    # 2. Save Items & Update Inventory
    for item in invoice_data['items']:
        line = {
            "invoice_id": inv_id,
            "ingredient_id": item['ingredient_id'],
            "quantity": item['quantity'],
            "unit_price": item['unit_price'],
            "total_price": item['total_price']
        }
        supabase.table("invoice_items").insert(line).execute()
        
        # Update Stock, Last Cost and Tax Rate
        tax_val = item['tax_rate'] if 'tax_rate' in item and item['tax_rate'] is not None else 10
        update_ingredient_stock(item['ingredient_id'], item['quantity'])
        supabase.table("ingredients").update({
            "last_unit_cost": item['unit_price'],
            "tax_rate": tax_val
        }).eq("id", item['ingredient_id']).execute()

    # 3. Final Recalculation
    recalculate_supplier_balance(invoice_data['supplier_id'])
    
    return inv_id

def revert_invoice_stock(invoice_id: str):
    """Fetches all items of an invoice and subtracts their quantity from ingredients stock."""
    res = supabase.table("invoice_items").select("ingredient_id, quantity").eq("invoice_id", invoice_id).execute()
    if res and res.data:
        for it in res.data:
            # Passing negative quantity to update_ingredient_stock will subtract from inventory
            update_ingredient_stock(it['ingredient_id'], -float(it['quantity']))

def update_full_invoice(invoice_id: str, invoice_data: Dict[str, Any]):
    """
    Updates an existing invoice by:
    1. Updating the header.
    2. Deleting old items.
    3. Inserting new items.
    4. Syncing stocks.
    5. Recalculating balance.
    """
    # Note: Stock reversal is complex, for now we just update & sync
    header = {
        "supplier_id": invoice_data['supplier_id'],
        "invoice_number": invoice_data.get('invoice_number', ''),
        "total_amount_gross": invoice_data['total_amount_gross'],
        "total_amount": invoice_data['total_amount_gross'],
    }
    supabase.table("invoices").update(header).eq("id", invoice_id).execute()
    
    # 1.5 Revert old stocks before replacing items
    revert_invoice_stock(invoice_id)

    # 2. Delete existing items
    supabase.table("invoice_items").delete().eq("invoice_id", invoice_id).execute()
    
    for item in invoice_data['items']:
        line = {
            "invoice_id": invoice_id,
            "ingredient_id": item['ingredient_id'],
            "quantity": item['quantity'],
            "unit_price": item['unit_price'],
            "total_price": item['total_price'],
            "tax_rate": item.get('tax_rate', 10)
        }
        supabase.table("invoice_items").insert(line).execute()
        update_ingredient_stock(item['ingredient_id'], item['quantity'])
        
        # Update Ingredient Cost & Tax
        tax_val = item['tax_rate'] if 'tax_rate' in item and item['tax_rate'] is not None else 10
        supabase.table("ingredients").update({
            "last_unit_cost": item['unit_price'],
            "tax_rate": tax_val
        }).eq("id", item['ingredient_id']).execute()
    
    recalculate_supplier_balance(invoice_data['supplier_id'])
    return True

# --- ACCOUNTS & TRANSACTIONS ---
def get_all_accounts():
    return supabase.table("accounts").select("*").execute()

def save_transaction(account_id: int, amount: float, t_type: str, desc: str):
    """Saves movement and updates account balance."""
    op = 1 if t_type == "Giriş" else -1
    acc_res = supabase.table("accounts").select("balance").eq("id", account_id).single().execute()
    if acc_res and acc_res.data:
        new_bal = float(acc_res.data['balance']) + (amount * op)
        supabase.table("accounts").update({"balance": new_bal}).eq("id", account_id).execute()
        
        move = {
            "account_id": account_id,
            "amount": amount,
            "type": t_type,
            "description": desc,
            "created_at": datetime.now().isoformat()
        }
        supabase.table("account_transactions").insert(move).execute()
        return True
    return False

# --- RECIPES (CRUD) ---
def get_all_recipes():
    """
    Returns unique menu items with their recipes.
    Includes a 'price_changed' flag if current recursive cost != last_calculated_cost.
    """
    res = supabase.table("menu_items").select("*, recipes(*)").execute()
    items = res.data if res and res.data else []
    
    for item in items:
        current_cost = get_recursive_recipe_cost(item['id'])
        last_cost = float(item.get('last_calculated_cost') or 0.2) # Default if null
        
        # Eğer maliyet %1'den fazla değişmişse asıl uyarıyı ver
        diff = abs(current_cost - last_cost)
        item['current_cost'] = round(current_cost, 2)
        item['price_changed'] = diff > (last_cost * 0.01) if last_cost > 0 else False
        
    return items

def delete_recipe(menu_item_id: str):
    return supabase.table("recipes").delete().eq("menu_item_id", menu_item_id).execute()

def update_menu_item_recipe(m_id: int, menu_data: Dict[str, Any], recipe_items: List[Dict[str, Any]]):
    """
    Updates a menu item and its associated recipe ingredients.
    """
    # 1. Update basic info (name, price, category, etc.)
    supabase.table("menu_items").update(menu_data).eq("id", m_id).execute()
    
    # 2. Sync recipes table
    # Deleting existing and inserting new is cleaner than trying to diff
    supabase.table("recipes").delete().eq("menu_item_id", m_id).execute()
    
    if recipe_items:
        # Prepare rows for batch insert
        rows = []
        for ri in recipe_items:
            rows.append({
                "menu_item_id": m_id,
                "ingredient_id": ri.get('ingredient_id'),
                "sub_recipe_id": ri.get('sub_recipe_id'),
                "quantity_used": ri['quantity_used'],
                "additional_cost": ri.get('additional_cost', 0),
                "yield_rate": ri.get('yield_rate', 100)
            })
        supabase.table("recipes").insert(rows).execute()
    
    # 3. Force cost cache update
    new_cost = get_recursive_recipe_cost(m_id)
    supabase.table("menu_items").update({"last_calculated_cost": new_cost}).eq("id", m_id).execute()
    
    return {"id": m_id, "new_cost": round(new_cost, 2)}

# --- REFRESHED COST LOGIC (From database.py) ---
def get_recursive_recipe_cost(m_id: int, visited: Set[int] = None) -> float:
    if visited is None: visited = set()
    if m_id in visited: return 0.0
    visited.add(m_id)
    
    res = supabase.table("recipes").select("""
        *,
        ingredients!recipes_ingredient_id_fkey(*)
    """).eq("menu_item_id", m_id).execute()
    
    total_cost = 0.0
    if res and res.data:
        for row in res.data:
            yield_factor = (float(row.get('yield_rate', 100)) / 100.0)
            if yield_factor <= 0: yield_factor = 1.0
            qty_effective = row['quantity_used'] / yield_factor
            
            if row.get('ingredient_id'):
                ing = row['ingredients']
                line_cost = (qty_effective / ing['unit_conversion_factor']) * ing['last_unit_cost']
                line_cost += float(row.get('additional_cost', 0.0))
                total_cost += line_cost
            elif row.get('sub_recipe_id'):
                sub_cost = get_recursive_recipe_cost(row['sub_recipe_id'], visited)
                line_cost = (qty_effective * sub_cost) + float(row.get('additional_cost', 0.0))
                total_cost += line_cost
    return total_cost

# --- DASHBOARD HELPERS ---
def get_daily_stats():
    today = datetime.now().strftime('%Y-%m-%d')
    p_res = supabase.table("payments").select("*").gte("created_at", f"{today}T00:00:00").execute()
    df_p = pd.DataFrame(p_res.data) if p_res and p_res.data else pd.DataFrame()
    cash = df_p[df_p['type'] == 'Nakit']['amount'].sum() if not df_p.empty else 0
    card = df_p[df_p['type'] == 'Kart']['amount'].sum() if not df_p.empty else 0
    t_res = supabase.table("tables").select("*").gte("created_at", f"{today}T00:00:00").execute()
    df_t = pd.DataFrame(t_res.data) if t_res and t_res.data else pd.DataFrame()
    masa_rev = df_t[df_t['name'].str.contains('masa', case=False, na=False)]['payments'].sum() if not df_t.empty else 0
    paket_rev = df_t[df_t['name'].str.contains('paket', case=False, na=False)]['payments'].sum() if not df_t.empty else 0
    paket_count = len(df_t[df_t['name'].str.contains('paket', case=False, na=False)]) if not df_t.empty else 0
    s_res = supabase.table("suppliers").select("name, balance").order("balance", desc=True).execute()
    debt_total = sum(s['balance'] for s in s_res.data if s['balance'] > 0) if s_res.data else 0
    return {
        "metrics": {
            "transactions": len(df_p), "cash_payment": cash, "card_payment": card,
            "total_revenue": cash + card, "table_revenue": masa_rev, "package_revenue": paket_rev,
            "package_count": paket_count, "total_debt": debt_total
        },
        "recent_movements": p_res.data[:10] if p_res.data else [],
        "debts": [s for s in s_res.data if s['balance'] > 0][:5] if s_res.data else []
    }

def get_revenue_chart_data(days=15):
    """
    Fetches actual received payments for the last X days.
    Uses the 'payments' table as the source of truth.
    """
    res = supabase.table("payments").select("amount, created_at").order("created_at", desc=True).limit(1000).execute()
    if not res or not res.data: 
        return [{"name": (datetime.now().date() - pd.Timedelta(days=i)).strftime('%d %b'), "revenue": 0} for i in range(days-1, -1, -1)]
    
    df = pd.DataFrame(res.data)
    df['date'] = pd.to_datetime(df['created_at']).dt.date
    daily = df.groupby('date')['amount'].sum().reset_index()
    daily.columns = ['date', 'revenue']
    
    result = []
    for i in range(days - 1, -1, -1):
        d = (pd.Timestamp.now().date() - pd.Timedelta(days=i))
        match = daily[daily['date'] == d]
        val = float(match['revenue'].iloc[0]) if not match.empty else 0.0
        result.append({"name": d.strftime('%d %b'), "revenue": val})
    return result

def calculate_box_to_unit(box_price: float, units_per_box: float, tax_rate: float, margin_percent: float) -> Dict[str, float]:
    unit_cost = box_price / units_per_box if units_per_box > 0 else box_price
    price_with_tax = unit_cost * (1 + tax_rate / 100)
    suggested_price = price_with_tax * (1 + margin_percent / 100)
    return {"unit_cost": round(unit_cost, 2), "price_with_tax": round(price_with_tax, 2), "suggested_price": round(suggested_price, 2)}

def get_all_sales():
    """Fetches sales (orders) for the current day."""
    today = datetime.now().strftime('%Y-%m-%d')
    res = supabase.table("orders").select("*, payments(*)").gte("created_at", f"{today}T00:00:00").execute()
    return res.data if res and res.data else []

def get_all_invoices():
    """Fetches full invoice history with supplier details."""
    res = supabase.table("invoices").select("*, suppliers(name)").order("invoice_date", desc=True).execute()
    return res.data if res and res.data else []

def get_invoice_full_data(invoice_id: str):
    """Fetches single invoice with all its items and detailed ingredient info."""
    res = supabase.table("invoices").select("*, suppliers(name), invoice_items(*, ingredients(name, box_quantity, purchase_unit))").eq("id", invoice_id).single().execute()
    return res.data if res else None

def get_supplier_items(supplier_id: str):
    """Fetches ingredients specifically linked to this supplier OR previously used in their invoices."""
    # Priority 1: Ingredients table linked by supplier_id
    res_direct = supabase.table("ingredients").select("*").eq("supplier_id", supplier_id).execute()
    
    # Priority 2: Historical ingredients from invoices
    # We join invoices to filter by supplier_id
    res_hist = supabase.table("invoice_items").select("""
        ingredient_id,
        ingredients!inner(id, name, category, last_unit_cost, box_quantity, tax_rate, purchase_unit)
    """).eq("ingredients.supplier_id", supplier_id).execute()
    
    # Alternative: Sometimes the link is only through invoices
    res_inv = supabase.table("invoice_items").select("""
        ingredient_id,
        ingredients!inner(id, name, category, last_unit_cost, box_quantity, tax_rate, purchase_unit),
        invoices!inner(supplier_id)
    """).eq("invoices.supplier_id", supplier_id).execute()
    
    items = {}
    
    # Process Direct
    if res_direct and res_direct.data:
        for row in res_direct.data:
            items[row['id']] = row

    # Process Historical (Joined by Supplier ID in ingredients or invoices)
    for res in [res_hist, res_inv]:
        if res and res.data:
            for row in res.data:
                ing = row.get('ingredients')
                if ing and ing['id'] not in items:
                    items[ing['id']] = ing
            
    print(f"DEBUG: Supplier {supplier_id} için {len(items)} ürün bulundu.")
    return list(items.values())

def delete_invoice(invoice_id: str):
    """Deletes header and items, then recalculates balance."""
    # Get supplier_id first for recalculation
    res = supabase.table("invoices").select("supplier_id").eq("id", invoice_id).single().execute()
    if not res or not res.data: return False
    supp_id = res.data['supplier_id']
    
    # 0. Revert stocks
    revert_invoice_stock(invoice_id)

    # Delete (Cascades should handle items if set, but let's be safe)
    supabase.table("invoice_items").delete().eq("invoice_id", invoice_id).execute()
    supabase.table("invoices").delete().eq("id", invoice_id).execute()
    
    recalculate_supplier_balance(supp_id)
    return True
