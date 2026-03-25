import streamlit as st
from supabase import create_client, Client
import pandas as pd
from datetime import datetime

def get_supabase_client() -> Client:
    url = st.secrets["supabase"]["url"]
    key = st.secrets["supabase"]["key"]
    return create_client(url, key)

def run_query(query_input, data=None, is_select=True):
    """V13.2: Universal query runner for functions, raw SQL (RPC), or direct table operations."""
    supabase = get_supabase_client()
    try:
        if callable(query_input):
            return query_input()
        elif isinstance(query_input, str):
            if data is not None:
                return supabase.table(query_input).insert(data).execute()
            else:
                # Raw SQL via RPC fallback or direct table select if simple
                return supabase.rpc("exec_sql", {"sql_query": query_input}).execute()
        return None
    except Exception as e:
        # Minimal select-only fallback if RPC missing
        if isinstance(query_input, str) and query_input.strip().upper().startswith("SELECT"):
             parts = query_input.split()
             if "FROM" in parts:
                 tbl = parts[parts.index("FROM")+1]
                 return supabase.table(tbl).select("*").execute()
        st.error(f"Sorgu hatası: {e}")
        return None

# --- V7.0 ELITE FUNCTIONS ---

def get_or_create_ingredient(name: str, supplier_id: str):
    supabase = get_supabase_client()
    res = supabase.table("ingredients").select("id").eq("name", name).execute()
    if res and res.data:
        return res.data[0]['id']
    else:
        new_data = {
            "name": name,
            "supplier_id": supplier_id,
            "category": "Genel",
            "purchase_unit": "ADET",
            "usage_unit": "ADET",
            "unit_conversion_factor": 1.0,
            "stock_quantity": 0.0,
            "last_unit_cost": 0.0,
            "is_saleable": False
        }
        ins_res = supabase.table("ingredients").insert(new_data).execute()
        return ins_res.data[0]['id']


# --- V33: ACCOUNTING LOGIC UPGRADE ---

def recalculate_supplier_balance(supplier_id):
    """
    V33: Carinin borcunu (balance) tüm faturalar ve tüm ödemeler üzerinden SUM ile hesaplar.
    Formül: Borç = SUM(Faturalar) - SUM(Ödemeler)
    """
    supabase = get_supabase_client()
    try:
        # 1. Faturaların Toplamı
        inv_res = supabase.table("invoices").select("total_amount_gross").eq("supplier_id", supplier_id).execute()
        total_invoices = sum([float(i['total_amount_gross']) for i in inv_res.data]) if inv_res.data else 0.0
        
        # 2. Ödemelerin Toplamı (account_transactions içindeki supplier_id'li Çıkışlar)
        try:
            pay_res = supabase.table("account_transactions").select("amount").eq("supplier_id", supplier_id).eq("transaction_type", "Çıkış").execute()
            total_payments = sum([float(p['amount']) for p in pay_res.data]) if pay_res.data else 0.0
        except Exception as pay_err:
            # V34: Eğer supplier_id sütunu yoksa şimdilik sadece faturalardan hesapla
            if "supplier_id" in str(pay_err):
                total_payments = 0.0
            else:
                raise pay_err
        
        # 3. Bakiyeyi Güncelle
        new_balance = total_invoices - total_payments
        supabase.table("suppliers").update({"balance": new_balance}).eq("id", supplier_id).execute()
        return new_balance
    except Exception as e:
        st.error(f"Bakiye Hesaplama Hatası: {e}")
        return 0.0

def get_last_purchase_info(product_name):
    """
    V33: Ürünün en son alindigi fiyattaki Birim Fiyat ve KDV oranini getirir.
    """
    supabase = get_supabase_client()
    try:
        # ingredients -> invoice_items (join) -> invoices (sort by date)
        res = supabase.table("invoice_items").select("""
            unit_price, tax_rate, 
            invoices!inner(invoice_date),
            ingredients!inner(name)
        """).eq("ingredients.name", product_name).order("invoices(invoice_date)", desc=True).limit(1).execute()
        
        if res.data:
            return {
                "fiyat": float(res.data[0]['unit_price']),
                "kdv": float(res.data[0]['tax_rate'])
            }
        return None
    except:
        return None

# --- Updated CRUD functions to call recalculate ---

def save_v7_invoice(header: dict, items: list):
    supabase = get_supabase_client()
    try:
        res_inv = supabase.table("invoices").insert(header).execute()
        if not res_inv.data: return False
        inv_id = res_inv.data[0]['id']
        supp_id = header['supplier_id']
        
        for item in items:
            ing_id = get_or_create_ingredient(item['name'], supp_id)
            supabase.table("invoice_items").insert({
                "invoice_id": inv_id,
                "ingredient_id": ing_id,
                "quantity": item['qty'],
                "unit_price": item['price'],
                "tax_rate": item['tax_rate'],
                "tax_amount": (item['qty'] * item['price']) * (item['tax_rate']/100),
                "line_total": item['line_total']
            }).execute()
            
            # STOK ARTIR
            ing_data = supabase.table("ingredients").select("stock_quantity").eq("id", ing_id).single().execute().data
            if ing_data:
                new_stock = float(ing_data.get('stock_quantity', 0)) + float(item['qty'])
                supabase.table("ingredients").update({"stock_quantity": new_stock, "last_unit_cost": item['price']}).eq("id", ing_id).execute()
            
        # DİNAMİK BAKİYE HESAPLA
        recalculate_supplier_balance(supp_id)
        return True
    except Exception as e:
        st.error(f"Fatura Kayıt Hatası: {e}")
        return False

def delete_v7_invoice(inv_id: str):
    supabase = get_supabase_client()
    try:
        inv_res = supabase.table("invoices").select("*, invoice_items(*)").eq("id", inv_id).single().execute()
        if not inv_res.data: return False
        inv = inv_res.data
        supp_id = inv['supplier_id']
        
        for item in inv['invoice_items']:
            ing_id = item['ingredient_id']
            qty = float(item['quantity'])
            ing_data = supabase.table("ingredients").select("stock_quantity").eq("id", ing_id).single().execute().data
            if ing_data:
                new_stock = float(ing_data.get('stock_quantity', 0)) - qty
                supabase.table("ingredients").update({"stock_quantity": new_stock}).eq("id", ing_id).execute()
            
        supabase.table("invoices").delete().eq("id", inv_id).execute()
        
        # DİNAMİK BAKİYE HESAPLA
        recalculate_supplier_balance(supp_id)
        return True
    except Exception as e:
        st.error(f"Fatura Silme Hatası: {e}")
        return False
def get_invoice_full_data(inv_id: str):
    supabase = get_supabase_client()
    res = supabase.table("invoices").select("*, invoice_items(*, ingredients(name))").eq("id", inv_id).single().execute()
    return res.data if res else None

def get_recursive_recipe_cost(m_id: str, visited=None):
    """Recursively calculate the cost of a recipe, including sub-recipes and Yield (Fire %)."""
    if visited is None: visited = set()
    if m_id in visited: return 0.0 # Circular ref protection
    visited.add(m_id)
    
    supabase = get_supabase_client()
    # V13.3.1: Specific fkey join for integrity
    res = supabase.table("recipes").select("""
        *,
        ingredients!recipes_ingredient_id_fkey(*)
    """).eq("menu_item_id", m_id).execute()
    
    total_cost = 0.0
    if res and res.data:
        for row in res.data:
            # V10: Yield (Fire %) Logic
            # Actual Qty = Used Qty / (Yield/100)
            # E.g., 1kg meat with 80% yield uses 1.25kg raw meat.
            yield_factor = (float(row.get('yield_rate', 100)) / 100.0)
            if yield_factor <= 0: yield_factor = 1.0
            
            qty_effective = row['quantity_used'] / yield_factor
            
            if row.get('ingredient_id'):
                # Raw Ingredient Cost
                ing = row['ingredients']
                line_cost = (qty_effective / ing['unit_conversion_factor']) * ing['last_unit_cost']
                line_cost += float(row.get('additional_cost', 0.0)) # V19: Additional Expense
                total_cost += line_cost
            elif row.get('sub_recipe_id'):
                # Sub-Recipe Cost (Nested)
                sub_cost = get_recursive_recipe_cost(row['sub_recipe_id'], visited)
                line_cost = (qty_effective * sub_cost) + float(row.get('additional_cost', 0.0)) # V19: Additional Expense
                total_cost += line_cost
                
    return total_cost

def get_price_alerts():
    """Identify recipes with cost variances since last save."""
    from database import get_supabase_client, run_query, get_recursive_recipe_cost
    supabase = get_supabase_client()
    items_res = run_query(lambda: supabase.table("menu_items").select("id, name, last_calculated_cost").execute())
    alerts = []
    if items_res and items_res.data:
        for item in items_res.data:
            c_cost = get_recursive_recipe_cost(item['id'])
            l_cost = float(item.get('last_calculated_cost') or 0.0)
            if abs(c_cost - l_cost) > 0.05:
                alerts.append({"name": item['name'], "current": c_cost, "last": l_cost})
    return alerts

def get_sparkline_data(days=7):
    """Fetch last 7 days revenue for Sparkline trend."""
    supabase = get_supabase_client()
    res = run_query(lambda: supabase.table("orders").select("total_amount, created_at").order("created_at", desc=True).limit(100).execute())
    if not res or not hasattr(res, 'data') or not res.data: return [0]*days
    df = pd.DataFrame(res.data)
    df['date'] = pd.to_datetime(df['created_at']).dt.date
    daily = df.groupby('date')['total_amount'].sum().tail(days).tolist()
    while len(daily) < days: daily.insert(0, 0.0)
    return daily


def get_account_movements():
    """Tüm hesap hareketlerini getirir."""
    return run_query("SELECT t.*, a.account_name FROM account_transactions t JOIN accounts a ON t.account_id = a.id ORDER BY t.created_at DESC")

def save_account_transaction(account_id, amount, t_type, description):
    """Hesaba para girişi/çıkışı yapar ve bakiyeyi günceller."""
    # Bakiyeyi güncelle
    op = "+" if t_type == "Giriş" else "-"
    run_query(f"UPDATE accounts SET balance = balance {op} {amount} WHERE id = '{account_id}'", is_select=False)
    
    # Hareketi kaydet
    data = {
        "account_id": account_id,
        "transaction_type": t_type,
        "amount": float(amount),
        "description": description
    }
    return run_query("account_transactions", data=data)

def get_accounts():
    """Tüm para hesaplarını listeler."""
    supabase = get_supabase_client()
    res = supabase.table("accounts").select("id, account_name, balance").execute()
    return res.data if res.data else []

def get_treasury_summary():
    """Kasadaki toplam Nakit ve Kart bakiyesini döndürür."""
    supabase = get_supabase_client()
    # Payments tablosundan tüm zamanların toplamını al
    res = supabase.table("payments").select("type, amount").execute()
    summary = {"Nakit": 0.0, "Kart": 0.0}
    if res.data:
        for p in res.data:
            if p['type'] in summary:
                summary[p['type']] += float(p['amount'])
    return summary

def pay_supplier_debt(supplier_id, account_id, amount, description):
    """Firmaya ödeme yapar: Kasadan düşer, firmanın borcundan (dinamik) düşer."""
    # 1. Kasadan parayı çık (Tedarikçi ID'si ile ilişkilendirerek)
    data = {
        "account_id": account_id,
        "transaction_type": "Çıkış",
        "amount": float(amount),
        "description": description
    }
    
    # V34: supplier_id sütunu varsa ekle
    try:
        data["supplier_id"] = supplier_id
        run_query("account_transactions", data=data)
    except:
        # Sütun yoksa supplier_id olmadan kaydet
        if "supplier_id" in data: del data["supplier_id"]
        run_query("account_transactions", data=data)
    
    # 2. Bakiyeyi dinamik olarak yeniden hesapla
    recalculate_supplier_balance(supplier_id)
    return True

def check_login(username, password):
    """Kullanıcı adı ve şifre kontrolü yapar."""
    res = run_query(f"SELECT * FROM app_users WHERE username = '{username}' AND password = '{password}'")
    if res and hasattr(res, 'data') and res.data:
        return res.data[0]
    return None

def get_daily_payments():
    """Bugünkü ödemeleri tipine göre gruplayarak getirir."""
    today = datetime.now().strftime('%Y-%m-%d')
    supabase = get_supabase_client()
    res = supabase.table("payments").select("*").gte("created_at", f"{today}T00:00:00").lte("created_at", f"{today}T23:59:59").execute()
    return res.data if res.data else []

def get_all_payments():
    """Tüm ödeme geçmisini getirir."""
    supabase = get_supabase_client()
    res = supabase.table("payments").select("*").order("created_at", desc=True).execute()
    return res.data if res.data else []

# --- V25: USER MANAGEMENT ---

def get_users():
    """Tüm uygulama kullanıcılarını listeler."""
    res = run_query("SELECT id, username, role, created_at FROM app_users ORDER BY created_at DESC")
    return res.data if res and res.data else []

def add_user(username, password, role="staff"):
    """Yeni bir kullanıcı ekler."""
    data = {"username": username, "password": password, "role": role}
    return run_query("app_users", data=data)

def delete_user(user_id):
    """Kullanıcıyı siler."""
    supabase = get_supabase_client()
    return supabase.table("app_users").delete().eq("id", user_id).execute()

# --- V32: SUPPLIER CRUD ---

def get_supplier(s_id):
    """Belirli bir tedarikçinin bilgilerini getirir."""
    supabase = get_supabase_client()
    res = supabase.table("suppliers").select("*").eq("id", s_id).single().execute()
    return res.data if res else None

def add_supplier(name, phone, initial_balance=0.0):
    """Yeni bir tedarikçi/cari ekler."""
    data = {
        "name": name,
        "phone": phone,
        "balance": float(initial_balance)
    }
    return run_query("suppliers", data=data)

def update_supplier(s_id, name, phone):
    """Tedarikçi bilgilerini günceller."""
    supabase = get_supabase_client()
    return supabase.table("suppliers").update({
        "name": name,
        "phone": phone
    }).eq("id", s_id).execute()

def delete_supplier(s_id):
    """Tedarikçiyi siler."""
    supabase = get_supabase_client()
    return supabase.table("suppliers").delete().eq("id", s_id).execute()
