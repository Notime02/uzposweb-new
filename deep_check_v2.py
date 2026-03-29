import sys
import io
import json

# Force UTF-8 for stdout
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from backend.database import supabase

# Just check menu_items columns
res = supabase.table("menu_items").select("*").limit(1).execute()
print("Menu Items Sample Data:")
if res.data:
    print(json.dumps(res.data, indent=2))
else:
    print("No menu items found.")

# Check recipes columns
res_r = supabase.table("recipes").select("*").limit(1).execute()
print("\nRecipes Sample Data:")
if res_r.data:
    print(json.dumps(res_r.data, indent=2))
else:
    print("No recipes found.")
