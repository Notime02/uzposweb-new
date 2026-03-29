import sys
import io
import json

# Force UTF-8 for stdout
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from backend.database import supabase

# Check suggested tables
tables = ["account_transactions", "payments", "accounts"]
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

print(json.dumps(results, indent=2))
