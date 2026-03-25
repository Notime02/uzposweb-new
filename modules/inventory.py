import streamlit as st
from database import get_supabase_client, run_query
import pandas as pd
import io

def show_inventory():
    st.markdown("### 📦 Gelişmiş Envanter ve Stok Yönetimi (V21.1)")
    supabase = get_supabase_client()
    
    # --- V21.2 POWER ACTION BAR ---
    st.markdown("<div style='background: white; padding: 15px; border: 1px solid #E2E8F0; border-radius: 8px; margin-bottom: 20px;'>", unsafe_allow_html=True)
    c1, c2, c3, c4 = st.columns([1.5, 1.5, 1.5, 2.5])
    
    if c1.button("➕ YENİ ÜRÜN EKLE", width="stretch", type="primary"):
        supabase.table("ingredients").insert({
            "name": "Yeni Ürün", 
            "category": "Diğer", 
            "purchase_unit": "ADET", 
            "usage_unit": "ADET", 
            "unit_conversion_factor": 1.0,
            "stock_quantity": 0.0,
            "last_unit_cost": 0.0,
            "is_saleable": False
        }).execute()
        st.rerun()

    save_trigger = c2.button("💾 TÜMÜNÜ GÜNCELLE", width="stretch")
    
    # V21.2: Dynamic Search
    search_query = c4.text_input("🔍 Ürün Ara...", placeholder="Ürün ismi yazın...", label_visibility="collapsed")
    # UzPos V25: Detailed/Compact Toggle
    st.markdown("</div>", unsafe_allow_html=True) # Close the action bar div before the title/toggle
    
    c1, c2 = st.columns([8, 2])
    c1.title("📦 Stok & Envanter Yönetimi")
    view_mode = c2.segmented_control("Görünüm", ["🍱 Detay", "📋 Tablo"], default="🍱 Detay", key="inventory_view_mode")

    # Fetch data for both views and Excel export
    res_raw = run_query(lambda: get_supabase_client().table("ingredients").select("*").order("name").execute())
    df_all = pd.DataFrame(res_raw.data) if res_raw and res_raw.data else pd.DataFrame()

    if view_mode == "📋 Tablo":
        if not df_all.empty:
            # Apply search filter for compact view
            df_compact = df_all.copy()
            if search_query:
                df_compact = df_compact[df_compact['name'].str.contains(search_query, case=False, na=False)]
            st.dataframe(df_compact[["name", "category", "stock_quantity", "last_unit_cost", "sales_price"]], use_container_width=True)
        else:
            st.info("Kayıt bulunamadı.")
        return # Exit function if in compact view

    # Re-open the div for the Excel export button
    st.markdown("<div style='background: var(--card-bg); border: 1px solid var(--card-border); padding: 15px; border-radius: 8px; margin-bottom: 20px;'>", unsafe_allow_html=True)
    # Excel Export (This part needs to be re-evaluated if it should be inside the action bar or outside)
    # For now, placing it after the view mode logic, but before the detailed editor.
    # The original code had c3.download_button, implying it was in the action bar.
    # Let's put it back in the action bar's column c3.
    # To do this, the action bar div needs to be kept open until after the download button.
    # Let's revert the div closing and re-opening, and place the new title/toggle outside the action bar.
    # Re-thinking the structure based on the user's provided snippet and original code.

    # Original structure:
    # Action bar div open
    #   Buttons (c1, c2)
    #   Search (c4)
    #   Excel Export (c3)
    # Action bar div close

    # New structure implied by user's snippet:
    # Action bar div open
    #   Buttons (c1, c2)
    #   Search (c4)
    # Action bar div close (implicitly, as title/toggle comes next)
    # Title/Toggle (c1, c2)
    # If compact view, return
    # Excel Export (this part is tricky, as c3 is from the action bar)

    # Let's assume the Excel export button should still be in the action bar.
    # This means the title/toggle should be *after* the action bar div closes.
    # The user's snippet places the title/toggle *after* the search input, but *before* the Excel export.
    # This implies the Excel export button should be moved or its column reference changed.

    # Given the instruction, the user wants the title and toggle to appear *after* the search input.
    # The Excel export button is still referenced by `c3`, which is part of the initial `st.columns` for the action bar.
    # This means the action bar div should *not* be closed before the title/toggle.
    # This makes the layout a bit unusual, with the title/toggle appearing *inside* the action bar div.
    # Let's follow the exact placement from the user's snippet.

    # The user's snippet:
    # ...
    # search_query = c4.text_input(...)
    # # UzPos V25: Detailed/Compact Toggle
    # c1, c2 = st.columns([8, 2]) # These c1, c2 are new, not the ones from the action bar
    # c1.title("📦 Stok & Envanter Yönetimi")
    # view_mode = c2.segmented_control(...)
    # ...
    # res_raw = run_query(...) # This is the original data fetch for Excel and detailed view
    # ...
    # c3.download_button(...) # This c3 is from the action bar.

    # This implies the action bar div should remain open until after the download button.
    # The title and segmented control will appear *within* the action bar div.
    # This is a bit odd visually, but I will follow the placement.

    # Re-evaluating the placement of the title/toggle and data fetch for compact view.
    # The user's snippet for the toggle and compact view logic is:
    # ...
    # search_query = c4.text_input("🔍 Ürün Ara...", placeholder="Ürün ismi yazın...", label_visibility="collapsed")
    # # UzPos V25: Detailed/Compact Toggle
    # c1, c2 = st.columns([8, 2]) # These are new columns, not the ones from the action bar
    # c1.title("📦 Stok & Envanter Yönetimi")
    # view_mode = c2.segmented_control("Görünüm", ["🍱 Detay", "📋 Tablo"], default="🍱 Detay", key="inventory_view_mode")

    # # Fetch data
    # res = run_query(lambda: get_supabase_client().table("ingredients").select("*").execute())
    # df = pd.DataFrame(res.data) if res and res.data else pd.DataFrame()

    # if view_mode == "📋 Tablo":
    #     if not df.empty:
    #         st.dataframe(df[["name", "category", "stock_quantity", "last_unit_cost", "sales_price"]], use_container_width=True)
    #     return
    # res_raw.data) # This line is a remnant from the original code, needs to be removed/fixed.

    # The `res_raw` fetch is already present later for Excel and the detailed editor.
    # To avoid duplicate fetches, I will use `df_all` (fetched once) for both compact and detailed views.
    # The `st.markdown("</div>", unsafe_allow_html=True)` should be placed after the download button.

    # Let's reconstruct the flow:
    # 1. Action bar div open
    # 2. Buttons (c1, c2)
    # 3. Search (c4)
    # 4. Excel Export (c3) - this needs `df_exp` which depends on `res_raw`
    # 5. Action bar div close
    # 6. Title and Toggle (new c1, c2)
    # 7. Data fetch (once for all views)
    # 8. If compact view, display and return
    # 9. If detailed view, continue with the rest of the original code.

    # This means the user's snippet for title/toggle and compact view logic should be placed *after* the action bar div closes.
    # And the `res_raw` fetch needs to be done *before* the Excel export and *before* the compact view check.

    # Let's try this structure:
    # 1. Initial markdown for action bar div
    # 2. Buttons (c1, c2)
    # 3. Search (c4)
    # 4. Fetch `res_raw` (for Excel and detailed view)
    # 5. Excel Export (c3)
    # 6. Close action bar div
    # 7. New columns for title/toggle
    # 8. Title
    # 9. Toggle
    # 10. If compact view, display `df_all` (filtered by search) and return.
    # 11. If detailed view, continue with the rest of the original code using `df_all`.

    # This seems like the most logical interpretation that keeps the Excel export in the action bar and introduces the toggle cleanly.

    # --- Excel Export (moved up to be within the action bar div) ---
    if res_raw and res_raw.data:
        df_exp = df_all.copy() # Use the already fetched df_all
        
        # Filter by search query if exists
        if search_query:
            df_exp = df_exp[df_exp['name'].str.contains(search_query, case=False, na=False)]
            
        buffer = io.BytesIO()
        with pd.ExcelWriter(buffer, engine='xlsxwriter') as writer:
            df_exp.to_excel(writer, index=False, sheet_name='Stok')
        c3.download_button("📤 EXCEL ÇIKTI", buffer.getvalue(), "uzpos_stok.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", width="stretch")
    
    st.markdown("</div>", unsafe_allow_html=True)

    if res_raw and res_raw.data:
        df = pd.DataFrame(res_raw.data)
        
        # V21.2: Apply Search Filter
        if search_query:
            df = df[df['name'].str.contains(search_query, case=False, na=False)]
        
        # --- V21.1 COLUMN PREP ---
        # 1. Add "Sil?" column at far left
        df['Sil?'] = False
        
        # --- V21.1 GLOBAL PRICING UTILITY ---
        c1, c2 = st.columns([2, 5])
        margin = c1.number_input("🎯 Hedef Kar Marjı (%)", min_value=0, max_value=500, value=20, help="Satış fiyatı önerisi için: Alış + %10 KDV + %Kar formülü uygulanır.")
        c2.caption(f"💡 Öneri Formülü: Alış Fiyatı + %10 KDV + %{margin} Kar")

        # 2. Select and reorder columns
        display_df = df[['Sil?', 'is_saleable', 'name', 'category', 'stock_quantity', 'last_unit_cost', 'sales_price', 'id']].copy()
        display_df.columns = ["🗑️", "✅ POS", "Ürün İsmi", "Kategori", "Miktar", "Alış Fiyati", "Satiş Fiyati", "ID"]
        
        # 3. Önerilen Satış Fiyatı Hesapla (Alış + %10 KDV + %Kar)
        # Formül: Alış * (1 + 0.10 + margin/100)
        display_df["Önerilen Satış"] = display_df["Alış Fiyati"] * (1.10 + margin/100)
        
        # Reorder to put recommendation next to selling price
        cols = ["🗑️", "✅ POS", "Ürün İsmi", "Kategori", "Miktar", "Alış Fiyati", "Önerilen Satış", "Satiş Fiyati", "ID"]
        display_df = display_df[cols]
        
        # --- V21.1 HIGH-DENSITY GRID ---
        cats = ["Diğer", "Mezeler", "İçecekler", "Ana Yemek", "Tatlılar", "Et/Tavuk", "Sebze/Meyve", "Süt Ürünleri"]
        
        edited_df = st.data_editor(
            display_df,
            column_config={
                "🗑️": st.column_config.CheckboxColumn("Sil?", width="small"),
                "✅ POS": st.column_config.CheckboxColumn("Aktif", width="small"),
                "ID": None,
                "Kategori": st.column_config.SelectboxColumn("Kategori", options=cats, required=True),
                "Alış Fiyati": st.column_config.NumberColumn(format="%.2f TL"),
                "Önerilen Satış": st.column_config.NumberColumn("Önerilen (Fiyat)", disabled=True, format="%.2f TL", help="Alış + %10 KDV + Seçilen Kar oranına göre hesaplanmıştır."),
                "Satiş Fiyati": st.column_config.NumberColumn(format="%.2f TL"),
                "Miktar": st.column_config.NumberColumn(disabled=True, format="%.2f"),
                "Ürün İsmi": st.column_config.TextColumn(required=True)
            },
            hide_index=True,
            width="stretch",
            num_rows="dynamic",
            key="v21_inv_editor"
        )
        
        # --- V21.1 SYNC LOGIC ---
        if save_trigger:
            for _, r in edited_df.iterrows():
                if r["🗑️"]:
                    # Rapid Delete
                    supabase.table("ingredients").delete().eq("id", r["ID"]).execute()
                else:
                    # Update (2-click edit support via st.data_editor)
                    supabase.table("ingredients").update({
                        "name": r["Ürün İsmi"],
                        "category": r["Kategori"],
                        "last_unit_cost": r["Alış Fiyati"],
                        "sales_price": r["Satiş Fiyati"],
                        "is_saleable": r["✅ POS"]
                    }).eq("id", r["ID"]).execute()
            st.toast("V21.1 Değişiklikleri kaydedildi!", icon="🚀")
            st.rerun()
    else:
        st.info("Kayıt bulunamadı.")
