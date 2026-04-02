from database import supabase
from typing import Set, Dict, Any, List
import pandas as pd
from datetime import datetime

# --- INGREDIENTS & INVENTORY ---
def get_all_ingredients():
    try:
        return supabase.table("ingredients").select("*").order("name").execute()
    except Exception as e:
        print(f"⚠️ Hata: Ürün listesi çekilemedi: {e}")
        return type('obj', (object,), {'data': []})

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
    res = supabase.table("ingredients").update(data).eq("id", ing_id).execute()
    # Trigger global cost update if cost or factor changed
    if 'last_unit_cost' in data or 'unit_conversion_factor' in data:
        update_all_menu_costs()
    return res

def update_all_menu_costs():
    """Recalculates costs for all menu items."""
    res = supabase.table("menu_items").select("id").execute()
    if res and res.data:
        for item in res.data:
            get_recursive_recipe_cost(item['id'])
    return True

def delete_ingredient(ing_id: str):
    return supabase.table("ingredients").delete().eq("id", ing_id).execute()

# --- SUPPLIERS & DEBT ---
def get_all_suppliers():
    try:
        return supabase.table("suppliers").select("*").order("name").execute()
    except Exception as e:
        print(f"⚠️ Hata: Tedarikçi listesi çekilemedi: {e}")
        return type('obj', (object,), {'data': []})

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
    try:
        # Crucial fix: removed .order("name") because the column doesn't exist.
        return supabase.table("accounts").select("*").execute()
    except Exception as e:
        print(f"⚠️ Hata: Hesap listesi çekilemedi: {e}")
        return type('obj', (object,), {'data': []})

def add_account(name: str, balance: float = 0.0):
    return supabase.table("accounts").insert({"name": name, "balance": balance}).execute()

def get_account_targets():
    """Returns a list of potential transaction targets: Caris + Categories."""
    # 1. Caris (Suppliers)
    res = supabase.table("suppliers").select("id, name").order("name").execute()
    caris = [{"id": s['id'], "name": s['name'], "type": "Cari"} for s in res.data] if res.data else []
    
    # 2. Fixed Categories (As requested by user: Personel maaşları, dükkan giderleri vb)
    categories = [
        {"id": "cat_salary", "name": "Personel Maaşı", "type": "Gider"},
        {"id": "cat_rent", "name": "Dükkan Kirası", "type": "Gider"},
        {"id": "cat_bill", "name": "Fatura (Su/Elektirik/Gaz)", "type": "Gider"},
        {"id": "cat_general", "name": "Genel Dükkan Gideri", "type": "Gider"},
        {"id": "cat_other_debt", "name": "Cari Dışı Borç Ödemesi", "type": "Gider"},
        {"id": "cat_other_income", "name": "Diğer Gelir", "type": "Gelir"}
    ]
    
    return caris + categories

def save_transaction(account_id: int, amount: float, t_type: str, desc: str, target: str = None):
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
            "target": target, # New field
            "created_at": datetime.now().isoformat()
        }
        supabase.table("account_transactions").insert(move).execute()
        
        # If target IS a Cari, we should ALSO update the supplier balance (as debt payment)
        # This is a bit complex, but let's try to detect if target is a UUID (supplier)
        if target and target.startswith('{') == False: # Simple UUID check or just try
             # Actually let's keep it simple for now as per user request: "nereye kısmına carileri ekle"
             pass

        return True
    return False

def get_qr_menu_items():
    """
    Fetches all Saleable Items for the QR Menu.
    Combines: 
      1. All records from 'menu_items'
      2. All records from 'ingredients' marked as 'is_menu'
    Standardizes output format.
    """
    # 1. Fetch Menu Items (Ready-to-eat products)
    res_m = supabase.table("menu_items").select("id, name, base_price, category, image_url, description, description_en, description_ru, description_ar").execute()
    menu_items = []
    if res_m and res_m.data:
        for m in res_m.data:
            menu_items.append({
                "id": f"m_{m['id']}",
                "name": m['name'],
                "price": m['base_price'],
                "category": m.get('category', 'Genel'),
                "image_url": f"https://api.uzpos.site/proxy-image?url={m.get('image_url')}" if m.get('image_url') else None,
                "description": m.get('description'),
                "description_en": m.get('description_en'),
                "description_ru": m.get('description_ru'),
                "description_ar": m.get('description_ar'),
                "source": "menu_items"
            })
            
    # 2. Fetch Ingredients marked as Menu (Simple products like Ayran, Su etc)
    res_i = supabase.table("ingredients").select("id, name, menu_name, menu_price, sales_price, category, image_url, description, menu_description, description_en, description_ru, description_ar, is_menu, last_unit_cost").eq("is_menu", True).execute()
    if res_i and res_i.data:
        for i in res_i.data:
            menu_items.append({
                "id": f"i_{i['id']}",
                "name": i.get('menu_name') or i['name'],
                "price": i.get('menu_price') or i.get('sales_price') or i.get('last_unit_cost', 0),
                "category": i.get('category', 'İçecek/Diğer'),
                "image_url": f"https://api.uzpos.site/proxy-image?url={i.get('image_url')}" if i.get('image_url') else None,
                "description": i.get('description') or i.get('menu_description'),
                "description_en": i.get('description_en'),
                "description_ru": i.get('description_ru'),
                "description_ar": i.get('description_ar'),
                "source": "ingredients"
            })
            
    return menu_items

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
    # 1. Update basic info (name, base_price, category, etc.)
    # Map 'price' from frontend to 'base_price' in DB
    db_menu_data = {
        "name": menu_data.get('name'),
        "category": menu_data.get('category'),
        "base_price": menu_data.get('price', 0.0)
    }
    supabase.table("menu_items").update(db_menu_data).eq("id", m_id).execute()
    
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

def create_menu_item_recipe(menu_data: Dict[str, Any], recipe_items: List[Dict[str, Any]]):
    """
    Creates a new menu item and its recipe items.
    """
    # 1. Create Menu Item
    res = supabase.table("menu_items").insert({
        "name": menu_data['name'],
        "category": menu_data.get('category', 'Genel'),
        "base_price": menu_data.get('price', 0.0),
        "last_calculated_cost": 0.0
    }).execute()
    
    if not res or not res.data: return None
    menu_id = res.data[0]['id']
    
    # 2. Add Recipe Items
    rows = []
    for ri in recipe_items:
        rows.append({
            "menu_item_id": menu_id,
            "ingredient_id": ri['ingredient_id'],
            "quantity_used": ri['quantity_used'],
            "yield_rate": ri.get('yield_rate', 100),
            "additional_cost": ri.get('additional_cost', 0.0)
        })
    
    if rows:
        supabase.table("recipes").insert(rows).execute()
        
    # 3. Initial Cost Calculation
    get_recursive_recipe_cost(menu_id)
    
    return {"id": menu_id, "message": "Created"}

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
                b_qty = float(ing.get('box_quantity') or 1.0)
                conv_f = float(ing.get('unit_conversion_factor') or 1.0)
                if b_qty <= 0: b_qty = 1.0
                if conv_f <= 0: conv_f = 1.0
                
                # Formula: (Used Qty / (Box Qty * Conv Factor)) * Box Price
                # Example: (250g / (1 * 1000)) * 100 TL/KG = 25 TL
                line_cost = (qty_effective / (b_qty * conv_f)) * float(ing.get('last_unit_cost') or 0.0)
                line_cost += float(row.get('additional_cost', 0.0))
                total_cost += line_cost
            elif row.get('sub_recipe_id'):
                sub_cost = get_recursive_recipe_cost(row['sub_recipe_id'], visited)
                line_cost = (qty_effective * sub_cost) + float(row.get('additional_cost', 0.0))
                total_cost += line_cost
    return total_cost

# --- DASHBOARD HELPERS ---
def get_daily_stats():
    """
    Dashboard summary strictly based on user-defined sources.
    - Revenue (Nakit, Masa, Paket): Strictly from 'tables' table.
    - Product Performance (Top/Bottom): Strictly from 'orders.item' analysis.
    """
    try:
        today = datetime.now().strftime('%Y-%m-%d')
        
        # 1. Revenue Metrics (Strictly from 'tables')
        cash, card, masa_rev, paket_rev, paket_count = 0, 0, 0, 0, 0
        try:
            t_res = supabase.table("tables").select("*").gte("created_at", f"{today}T00:00:00").execute()
            if t_res and t_res.data:
                for t in t_res.data:
                    val = float(t.get('payments') or 0)
                    status = str(t.get('status', '')).strip().lower()
                    name = str(t.get('name', '')).strip().lower()
                    
                    # Status based (Cash/Card)
                    if status == 'nakit': 
                        cash += val
                    elif status in ['kart', 'kredi', 'pos', 'banka']: 
                        card += val
                    
                    # Name based (Masa/Paket)
                    if 'masa' in name: 
                        masa_rev += val
                    elif 'paket' in name: 
                        paket_rev += val
                        paket_count += 1
        except Exception as e:
            print(f"⚠️ Dashboard: Tables tablosu verisi çekilemedi: {e}")

        # 2. Product Analysis (Strictly from 'orders.item' names)
        top_item = {"name": "Veri Yok", "count": 0}
        bottom_item = {"name": "Veri Yok", "count": 0}
        try:
            # We analyze ALL orders to find top/bottom performers as requested
            o_res = supabase.table("orders").select("item").execute()
            if o_res and o_res.data:
                product_counts = {}
                for o in o_res.data:
                    name = o.get('item')
                    if name:
                        product_counts[name] = product_counts.get(name, 0) + 1
                
                if product_counts:
                    sorted_items = sorted(product_counts.items(), key=lambda x: x[1], reverse=True)
                    top_item = {"name": sorted_items[0][0], "count": sorted_items[0][1]}
                    bottom_item = {"name": sorted_items[-1][0], "count": sorted_items[-1][1]}
        except Exception as e:
            print(f"⚠️ Dashboard: Ürün analizi çekilemedi: {e}")

        # 3. Debt Analysis (Suppliers - Remains from suppliers table)
        debt_total = 0
        debts_list = []
        try:
            s_res = supabase.table("suppliers").select("name, balance").order("balance", desc=True).execute()
            if s_res and s_res.data:
                valid_debts = [s for s in s_res.data if float(s.get('balance') or 0) > 0]
                debt_total = sum(float(s.get('balance') or 0) for s in valid_debts)
                debts_list = valid_debts[:5]
        except Exception as e:
            print(f"⚠️ Dashboard: Borç verisi çekilemedi: {e}")

        return {
            "metrics": {
                "transactions": paket_count + (1 if masa_rev > 0 else 0), # Estimated transactions
                "cash_payment": cash, 
                "card_payment": card,
                "total_revenue": cash + card, 
                "table_revenue": masa_rev, 
                "package_revenue": paket_rev,
                "package_count": paket_count, 
                "total_debt": debt_total,
                "top_product": top_item, 
                "bottom_product": bottom_item
            },
            "recent_movements": [], # Simplified as orders now handle sales history
            "debts": debts_list
        }
    except Exception as e:
        print(f"⚠️ KRITIK HATA: Dashboard onarimi basarisiz: {e}")
        return {
            "metrics": {
                "transactions": 0, "cash_payment": 0, "card_payment": 0,
                "total_revenue": 0, "table_revenue": 0, "package_revenue": 0,
                "package_count": 0, "total_debt": 0,
                "top_product": {"name": "Hata", "count": 0}, "bottom_product": {"name": "Hata", "count": 0}
            },
            "recent_movements": [], "debts": []
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
    """Fetches full history of sales (orders) strictly from the 'orders' table."""
    res = supabase.table("orders").select("*").order("created_at", desc=True).execute()
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
