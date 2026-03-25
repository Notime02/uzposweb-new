import json
from database import get_supabase_client

def main():
    supabase = get_supabase_client()
    try:
        # Fetch more rows directly
        res = supabase.table("tables").select("*").limit(50).execute()
        if res and res.data:
            with open("schema_output_v3.json", "w", encoding="utf-8") as f:
                json.dump(res.data, f, ensure_ascii=False, indent=2)
            print("Successfully written schema_output_v3.json")
        else:
            print("No data in 'tables' table.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
