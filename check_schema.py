import streamlit as st
import pandas as pd
from database import get_supabase_client
import json

def main():
    st.title("Schema Check V2")
    supabase = get_supabase_client()
    try:
        # Fetch more rows
        res = supabase.table("tables").select("*").limit(20).execute()
        if res and res.data:
            df = pd.DataFrame(res.data)
            st.write(df)
            # Save to json
            with open("schema_output_v2.json", "w") as f:
                json.dump(res.data, f)
        else:
            st.write("No data in 'tables' table.")
            
    except Exception as e:
        st.error(f"Schema check error: {e}")

if __name__ == "__main__":
    main()
