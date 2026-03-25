import streamlit as st
from database import get_supabase_client, run_query, get_recursive_recipe_cost
import pandas as pd

def show_recipes():
    supabase = get_supabase_client()
    
    # UzPos V25: Card/Table Toggle
    c1, c2 = st.columns([8, 2])
    c1.title("🍱 Reçeteler & Operasyonel Plan")
    view_mode = c2.segmented_control("Görünüm", ["🍱 Kart", "📋 Tablo"], default="🍱 Kart", key="recipes_view_mode")

    if view_mode == "📋 Tablo":
        items = run_query(lambda: supabase.table("menu_items").select("*").execute()).data
        if items:
            df_table = pd.DataFrame(items)
            st.dataframe(df_table[["name", "category", "base_price", "last_calculated_cost", "id"]], width="stretch", hide_index=True)
        return

    # EXISTING CARD LOGIC BELOW...
    # st.markdown("### 🍳 Reçete ve Operasyon Paneli (V15)") # This line is replaced by c1.title above
    
    if "v13_rec_mode" not in st.session_state: st.session_state.v13_rec_mode = "LIST"
    if "v13_rec_id" not in st.session_state: st.session_state.v13_rec_id = None

    if st.session_state.v13_rec_mode == "LIST":
        # 1. Action Row
        h1, h2, h3 = st.columns([5, 1.5, 1.5])
        if h2.button("➕ YENİ REÇETE", type="primary", width="stretch"):
            st.session_state.v13_rec_mode = "PANEL"; st.session_state.v13_rec_id = None; st.rerun()
        if h3.button("🔄 GLOBAL SYNC", width="stretch"):
            supabase.table("menu_items").update({"category": "Yemek", "is_saleable": True}).neq("id", "00").execute()
            st.toast("Eşitlendi!"); st.rerun()

        # --- V17 PREMIUM CARD CSS ---
        st.markdown("""
        <style>
        .recipe-card {
            background: #ffffff;
            border: 1px solid #E2E8F0;
            border-radius: 12px;
            padding: 15px;
            margin-bottom: 12px;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            gap: 15px;
        }
        .recipe-card:hover {
            box-shadow: 0 4px 12px rgba(0,0,0,0.05);
            border-color: #3B82F6;
        }
        .recipe-img {
            width: 80px;
            height: 80px;
            border-radius: 8px;
            object-fit: cover;
            background: #F1F5F9;
        }
        .recipe-info { flex: 1; }
        .recipe-name { font-size: 16px; font-weight: 700; color: #1E293B; margin-bottom: 4px; }
        .recipe-meta { font-size: 12px; color: #64748B; margin-bottom: 8px; }
        .recipe-stats { display: flex; gap: 20px; }
        .stat-item { font-size: 13px; }
        .stat-label { color: #94A3B8; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
        .stat-value { font-weight: 600; color: #334155; }
        .profit-pos { color: #10B981; }
        .profit-neg { color: #EF4444; }
        </style>
        """, unsafe_allow_html=True)

        res = run_query(lambda: supabase.table("menu_items").select("*").order("name").execute())
        if res and res.data:
            # --- V18 CATEGORY TABS ---
            categories = ["Tümü", "Yemek", "Meze", "İçecek", "Diğer"]
            tabs = st.tabs(categories)
            
            for idx, tab in enumerate(tabs):
                with tab:
                    cat_filter = categories[idx]
                    filtered_data = res.data if cat_filter == "Tümü" else [i for i in res.data if i.get('category') == cat_filter]
                    
                    if not filtered_data:
                        st.info(f"{cat_filter} kategorisinde henüz reçete bulunmuyor.")
                        continue

                    for item in filtered_data:
                        # 1. Verileri Hazırla
                        cost = get_recursive_recipe_cost(item['id'])
                        price = item.get('base_price', 0)
                        profit = float(price) - cost
                        margin = (profit / float(price) * 100) if price > 0 else 0
                        img_url = item.get('image_url') or item.get('photo_url') or "https://via.placeholder.com/80?text=No+Img"
                        
                        # 2. Kartı Çiz (Main Container)
                        with st.container():
                            c_main, c_actions = st.columns([6, 1.5])
                            
                            with c_main:
                                # 0. Fiyat Değişimi Kontrolü & Kategori Akıllı Renk
                                last_cost = float(item.get('last_calculated_cost') or 0.0)
                                has_diff = abs(cost - last_cost) > 0.05
                                diff_badge = " ❗<span style='color:#EF4444; font-size:10px; font-weight:bold;'> [FİYAT DEĞİŞTİ!]</span>" if has_diff else ""
                                
                                cat = item.get('category', 'Diğer')
                                cat_color = "var(--accent-yemek)" if cat == "Yemek" else \
                                            "var(--accent-meze)" if cat == "Meze" else \
                                            "var(--accent-icecek)" if cat == "İçecek" else \
                                            "var(--accent-diger)"

                                st.markdown(f"""
                                <div class="recipe-card" style="border-left: 5px solid {cat_color};">
                                    <img src="{img_url}" class="recipe-img">
                                    <div class="recipe-info">
                                        <div class="recipe-name">{item['name']}{diff_badge}</div>
                                        <div class="recipe-meta" style="color: {cat_color}; font-weight: 600;"># {cat} | ID: {item['id']}</div>
                                        <div class="recipe-stats">
                                            <div class="stat-item">
                                                <div class="stat-label">MALİYET</div>
                                                <div class="stat-value">{cost:,.2f} TL</div>
                                            </div>
                                            <div class="stat-item">
                                                <div class="stat-label">SATIŞ</div>
                                                <div class="stat-value">{price:,.2f} TL</div>
                                            </div>
                                            <div class="stat-item">
                                                <div class="stat-label">KAR (%{(margin):,.0f})</div>
                                                <div class="stat-value {'profit-pos' if profit > 0 else 'profit-neg'}">{profit:,.2f} TL</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                """, unsafe_allow_html=True)
                            
                            # 3. Aksiyon Butonları (Sağ Taraf)
                            with c_actions:
                                st.markdown("<div style='height: 10px;'></div>", unsafe_allow_html=True)
                                if st.button(f"🛠️ DÜZENLE", key=f"edit_{cat_filter}_{item['id']}", width="stretch"):
                                    st.session_state.v13_rec_id = item['id']
                                    st.session_state.v13_rec_mode = "PANEL"
                                    st.rerun()
                                
                                if st.button(f"🗑️ SİL", key=f"del_{cat_filter}_{item['id']}", width="stretch", type="secondary"):
                                    supabase.table("recipes").delete().eq("menu_item_id", item['id']).execute()
                                    supabase.table("menu_items").delete().eq("id", item['id']).execute()
                                    st.toast(f"{item['name']} silindi."); st.rerun()
        else:
            st.info("Henüz reçete bulunmuyor. Yeni butonuna basarak başlayabilirsiniz.")
    else:
        # 2. V15 DETAILED PANEL
        m_id = st.session_state.v13_rec_id
        is_new = m_id is None
        
        if st.button("⬅️ REÇETE LİSTESİNE DÖN"):
            st.session_state.v13_rec_mode = "LIST"; st.rerun()

        if is_new:
            c1, c2 = st.columns(2)
            name = c1.text_input("Reçete İsmi")
            cat = c2.selectbox("Kategori", ["Yemek", "Meze", "İçecek", "Diğer"])
            if st.button("OLUŞTUR VE DÜZENLE"):
                mi = supabase.table("menu_items").insert({"name": name, "base_price": 0.0, "category": cat, "is_saleable": True}).execute()
                st.session_state.v13_rec_id = mi.data[0]['id']; st.rerun()
            return

        m_item = supabase.table("menu_items").select("*").eq("id", m_id).single().execute().data
        
        # RECIPE NAME & CATEGORY (EDIT MODE)
        c1, c2 = st.columns([2, 1])
        new_name = c1.text_input("Reçete İsmi", value=m_item['name'])
        
        current_cat = m_item.get('category', 'Diğer')
        cats_list = ["Yemek", "Meze", "İçecek", "Diğer"]
        new_cat = c2.selectbox("Kategori", cats_list, index=cats_list.index(current_cat) if current_cat in cats_list else 3)

        # BOM
        ing_res = run_query(lambda: supabase.table("ingredients").select("*").execute())
        sub_res = run_query(lambda: supabase.table("menu_items").select("*").neq("id", m_id).execute())
        opts = {**{f"📦 {i['name']}": ("ING", i) for i in (ing_res.data if ing_res else [])}, **{f"🍳 {s['name']}": ("REC", s) for s in (sub_res.data if sub_res else [])}}
        
        recs = supabase.table("recipes").select("*, ingredients!recipes_ingredient_id_fkey(name, unit), sub_recipe_items:ingredients!recipes_sub_recipe_id_fkey(name)").eq("menu_item_id", m_id).execute().data
        df_rows = []
        for r in (recs or []):
            iname = f"📦 {r['ingredients']['name']}" if r.get('ingredient_id') else f"🍳 {r['sub_recipe_items']['name'] if r.get('sub_recipe_items') else 'Alt Reçete'}"
            df_rows.append({
                "Bileşen": iname, 
                "Mkt": r['quantity_used'], 
                "Fire %": r.get('yield_rate', 100),
                "Ek Gider (TL)": r.get('additional_cost', 0.0)
            })
        while len(df_rows) < 5: df_rows.append({"Bileşen": "", "Mkt": 0.0, "Fire %": 100, "Ek Gider (TL)": 0.0})
        
        ed = st.data_editor(
            pd.DataFrame(df_rows), 
            column_config={
                "Bileşen": st.column_config.SelectboxColumn("Seçim", options=list(opts.keys())), 
                "Mkt": st.column_config.NumberColumn("Mkt", format="%.4f"),
                "Fire %": st.column_config.NumberColumn("Fire %", min_value=1, max_value=100),
                "Ek Gider (TL)": st.column_config.NumberColumn("Gider (TL)", min_value=0.0, format="%.2f")
            }, 
            num_rows="dynamic", width="stretch", hide_index=True
        )
        
        # Prices
        total_c = 0.0
        active_v = ed[ed["Bileşen"] != ""]
        for _, r in active_v.iterrows():
            o_t, o_d = opts[r["Bileşen"]]
            y = r["Fire %"] / 100.0
            gider = float(r.get("Ek Gider (TL)", 0.0))
            
            if o_t == "ING": line_cost = (r["Mkt"] / y / o_d["unit_conversion_factor"]) * o_d["last_unit_cost"]
            else: line_cost = (r["Mkt"] / y) * get_recursive_recipe_cost(o_d["id"])
            
            total_c += (line_cost + gider)
            
        st.markdown(f"""
        <div style='background: var(--card-bg); padding:15px; border-radius:12px; border-left:5px solid #0284C7; color: var(--card-text); border: 1px solid var(--card-border);'>
            <b style='color: #0284C7;'>📊 Maliyet Analizi:</b> {total_c:,.2f} TL
        </div>
        """, unsafe_allow_html=True)
        
        new_p = st.number_input("Satış Fiyatı (TL)", value=float(m_item['base_price']) or total_c/0.3, format="%.2f")
        
        if st.button("💾 TÜM DEĞİŞİKLİKLERİ KAYDET", type="primary", width="stretch"):
            # Update Menu Item & Cost Snapshot
            supabase.table("menu_items").update({
                "name": new_name, 
                "base_price": new_p, 
                "category": new_cat, 
                "is_saleable": True,
                "last_calculated_cost": total_c # SNAPSHOT
            }).eq("id", m_id).execute()
            
            # Update Recipe Components
            supabase.table("recipes").delete().eq("menu_item_id", m_id).execute()
            for _, r in active_v.iterrows():
                o_t, o_d = opts[r["Bileşen"]]
                supabase.table("recipes").insert({
                    "menu_item_id": m_id, 
                    "quantity_used": r["Mkt"], 
                    "yield_rate": r["Fire %"],
                    "additional_cost": float(r.get("Ek Gider (TL)", 0.0)), # SAVE EXPENSE
                    "ingredient_id": o_d["id"] if o_t == "ING" else None,
                    "sub_recipe_id": o_d["id"] if o_t == "REC" else None
                }).execute()
            st.toast("Reçete ve Maliyet Kaydı Güncellendi."); st.session_state.v13_rec_mode = "LIST"; st.rerun()
