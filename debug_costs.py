from backend.database import supabase
import json

res = supabase.table("ingredients").select("name, last_unit_cost, box_quantity").limit(10).execute()
print("Ingredients Cost Data:")
print(json.dumps(res.data, indent=2))

res_mi = supabase.table("menu_items").select("name, last_calculated_cost").limit(10).execute()
print("\nMenu Items Cost Data:")
print(json.dumps(res_mi.data, indent=2))
