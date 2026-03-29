import sys
import io
import json

# Force UTF-8 for stdout
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from backend.database import supabase

# Check menu_items
res_m = supabase.table("menu_items").select("*").limit(1).execute()
print("Menu Items Columns:", list(res_m.data[0].keys()) if res_m.data else "No data")

# Check ingredients
res_i = supabase.table("ingredients").select("*").limit(1).execute()
print("Ingredients Columns:", list(res_i.data[0].keys()) if res_i.data else "No data")
