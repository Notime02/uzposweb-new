import sys
import io
import json

# Force UTF-8 for stdout
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from backend.database import supabase

# Check menu_items
res_m = supabase.table("menu_items").select("name, is_saleable").execute()
print("Menu Items Saleable Status:")
print(json.dumps(res_m.data, indent=2))

# Check ingredients
res_i = supabase.table("ingredients").select("name, is_menu").execute()
print("\nIngredients Menu Status:")
print(json.dumps(res_i.data, indent=2))
