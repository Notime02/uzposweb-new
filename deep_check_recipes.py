import sys
import io
import json

# Force UTF-8 for stdout
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from backend.database import supabase

# Check menu_items columns and data
res = supabase.table("menu_items").select("*").limit(5).execute()
print("Menu Items Sample Data:")
if res.data:
    print(json.dumps(res.data, indent=2))
    print("\nColumns found:", list(res.data[0].keys()))
else:
    print("No menu items found.")

# Check recipes for one of the menu items
if res.data:
    mi_id = res.data[0]['id']
    res_r = supabase.table("recipes").select("*, ingredients(*)").eq("menu_item_id", mi_id).execute()
    print(f"\nRecipes for {res.data[0]['name']}:")
    print(json.dumps(res_r.data, indent=2))
