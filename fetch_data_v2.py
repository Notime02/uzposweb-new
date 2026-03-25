from supabase import create_client
import json

def main():
    url = "https://boidhdjsayrojooxqasd.supabase.co"
    key = "sb_publishable_LaVS7eQfaevWyROLmx357A_b-PSkxua"
    supabase = create_client(url, key)
    try:
        # Fetch up to 100 rows from 'tables'
        res = supabase.table("tables").select("*").limit(100).execute()
        if res and res.data:
            with open("schema_output_v4.json", "w", encoding="utf-8") as f:
                json.dump(res.data, f, ensure_ascii=False, indent=2)
            print("Successfully written schema_output_v4.json")
            
            # Analyze types
            names = set(row.get('name') for row in res.data)
            print(f"Distinct names in tables: {names}")
            
            non_masa = [row for row in res.data if 'masa' not in row.get('name', '').lower()]
            if non_masa:
                print(f"Sample non-masa row: {non_masa[0]}")
        else:
            print("No data in 'tables' table.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
