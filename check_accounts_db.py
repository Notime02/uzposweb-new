import sys
import io
import json

# Force UTF-8 for stdout
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from backend.database import supabase

# Check tables
tables = ["accounts", "transactions", "cash_flow", "cash_movements"]
results = {}

for table in tables:
    try:
        res = supabase.table(table).select("*").limit(1).execute()
        results[table] = {
            "exists": True,
            "columns": list(res.data[0].keys()) if res.data else "Exists but empty"
        }
    except Exception as e:
        results[table] = {"exists": False, "error": str(e)}

# Check suppliers for the "Nereye" dropdown
try:
    res = supabase.table("suppliers").select("id, name").limit(5).execute()
    results["suppliers"] = {"exists": True, "count": len(res.data) if res.data else 0}
except:
    results["suppliers"] = {"exists": False}

print(json.dumps(results, indent=2))
