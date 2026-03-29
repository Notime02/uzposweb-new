import sys
import io
import json

# Force UTF-8 for stdout
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from backend.database import supabase

# Check accounts table columns by trying to select a non-existent one if empty
try:
    res = supabase.table("accounts").select("*").limit(1).execute()
    # If empty, this won't show columns. Let's try to get schema info.
    # In Postgrest, we can use a system RPC if allowed, or just trust the 'Exists but empty'
    # Let's try to insert a dummy and rollback if possible, but actually let's just use what we have.
    print("Accounts check:")
    print(res)
except Exception as e:
    print(f"Error: {e}")
