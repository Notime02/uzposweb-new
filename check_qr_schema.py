import sys
import io
import json

# Force UTF-8 for stdout
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from backend.database import supabase

# Check menu_items columns
try:
    res = supabase.table("menu_items").select("*").limit(1).execute()
    print("Menu Items Columns:", list(res.data[0].keys()) if res.data else "No data")
except Exception as e:
    print(f"Menu Items Error: {e}")

# Check ingredients columns
try:
    res = supabase.table("ingredients").select("*").limit(1).execute()
    print("Ingredients Columns:", list(res.data[0].keys()) if res.data else "No data")
except Exception as e:
    print(f"Ingredients Error: {e}")
