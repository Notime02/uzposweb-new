import streamlit as st
from database import get_supabase_client, run_query, save_v7_invoice, delete_v7_invoice, get_invoice_full_data
import pandas as pd
from datetime import date, datetime

def show_invoices():
    st.markdown("### 🧾 Alış Faturaları Yönetimi (V20)")
    supabase = get_supabase_client()
    
    if "v20_inv_mode" not in st.session_state: st.session_state.v20_inv_mode = "LIST"
    if "v20_edit_id" not in st.session_state: st.session_state.v20_edit_id = None

    if st.session_state.v20_inv_mode == "LIST":
        # --- V20 ACTION BAR ---
        c1, c2 = st.columns([5, 2])
        if c1.button("➕ YENİ FATURA EKLE", type="primary"):
            st.session_state.v20_inv_mode = "FORM"; st.session_state.v20_edit_id = None
            st.session_state.pop("v12_entry_items", None); st.rerun()

        # Monthly Filter Logic
        all_res = run_query(lambda: supabase.table("invoices").select("invoice_date").execute())
        if all_res and all_res.data:
            dates = sorted(list(set([datetime.strptime(i['invoice_date'], '%Y-%m-%d').strftime('%m.%Y') for i in all_res.data])), reverse=True)
            sel_month = c2.selectbox("📅 DÖNEM SEÇİMİ", dates, label_visibility="collapsed")
        else:
            sel_month = datetime.now().strftime('%m.%Y')

        # --- V20 GROUPED LIST ---
        res = run_query(lambda: supabase.table("invoices").select("*, suppliers(name, balance)").order("invoice_date", desc=True).execute())
        if res and res.data:
            df = pd.DataFrame(res.data)
            df['month_key'] = df['invoice_date'].apply(lambda x: datetime.strptime(x, '%Y-%m-%d').strftime('%m.%Y'))
            df['display_date'] = df['invoice_date'].apply(lambda x: datetime.strptime(x, '%Y-%m-%d').strftime('%d.%m.%Y'))
            
            # Filter by selected month
            df_filtered = df[df['month_key'] == sel_month]
            
            if not df_filtered.empty:
                # Group by Supplier Name
                for s_name, group in df_filtered.groupby(lambda x: df_filtered.loc[x, 'suppliers']['name']):
                    group_balance = group.iloc[0]['suppliers']['balance'] if 'suppliers' in group.iloc[0] else 0
                    with st.expander(f"🏢 {s_name} (Bakiyeniz: {group_balance:,.2f} TL) - {len(group)} Fatura", expanded=True):
                        # Header Row
                        h1, h2, h3, h4 = st.columns([1.5, 2, 2, 1.5])
                        h1.caption("FATURA NO")
                        h2.caption("TARİH")
                        h3.caption("TOPLAM")
                        h4.caption("AKSİYON")
                        
                        for _, row in group.iterrows():
                            r1, r2, r3, r4 = st.columns([1.5, 2, 2, 1.5])
                            r1.write(f"**{row['invoice_no']}**")
                            r2.write(row['display_date'])
                            r3.write(f"**{row['total_amount_gross']:,.2f} TL**")
                            
                            b1, b2 = r4.columns(2)
                            if b1.button("📝", key=f"edit_{row['id']}"):
                                st.session_state.v20_edit_id = row['id']
                                st.session_state.v20_inv_mode = "FORM"
                                st.rerun()
                            if b2.button("🗑️", key=f"del_{row['id']}"):
                                delete_v7_invoice(row['id'])
                                st.toast("Fatura silindi."); st.rerun()
            else:
                st.info(f"{sel_month} döneminde kayıtlı fatura bulunamadı.")
        else:
            st.info("Henüz sisteme fatura girişi yapılmamış.")
            
    else:
        # --- V20 STREAMLINED EDITOR ---
        m_id = st.session_state.v20_edit_id
        is_edit = m_id is not None
        
        c_back, c_title = st.columns([1, 5])
        if c_back.button("⬅️ GERİ"):
            st.session_state.v20_inv_mode = "LIST"; st.rerun()
        
        st.write(f"### {'📝 Fatura Düzenle' if is_edit else '➕ Yeni Fatura Kaydı'}")

        # --- V31.2 PERFECT REACTIVE TEMPLATE ---
        if is_edit and "invoice_items" not in st.session_state:
            raw = get_invoice_full_data(m_id)
            items = []
            for i in raw['invoice_items']:
                qty = float(i['quantity'])
                prc = float(i['unit_price'])
                tax = float(i['tax_rate'])
                items.append({
                    "Ürün Seçiniz": i['ingredients']['name'],
                    "Miktar": qty,
                    "Birim Fiyat": prc,
                    "KDV %": tax,
                    "Satır Tutarı": (qty * prc) * (1 + tax / 100)
                })
            st.session_state.invoice_items = pd.DataFrame(items)
            st.session_state.v12_f_h = {"no": raw['invoice_no'], "date": date.fromisoformat(raw['invoice_date']), "supp": raw['supplier_id']}

        # Header Section
        with st.container(border=True):
            h1, h2, h3 = st.columns(3)
            f_header = st.session_state.get('v12_f_h', {'no': "", 'date': date.today(), 'supp': None})
            no = h1.text_input("Belge No", value=f_header['no'] if is_edit else "")
            dt = h2.date_input("Belge Tarihi", value=f_header['date'] if is_edit else date.today())
            s_res = run_query(lambda: supabase.table("suppliers").select("id, name").execute())
            ss = {s['name']: s['id'] for s in s_res.data} if s_res else {}
            supp_list = list(ss.keys())
            rev_ss = {v: k for k, v in ss.items()}
            selected_s = h3.selectbox("Cari Firma", supp_list, index=supp_list.index(rev_ss.get(f_header['supp'])) if is_edit and rev_ss.get(f_header['supp']) in supp_list else 0)

        st.write("#### 📦 Fatura Kalemleri")
        
        # 1. Veritabanından Ürünleri Al (Sadece İsim ve Fiyat)
        ing_data = run_query(lambda: supabase.table("ingredients").select("name, last_unit_cost").execute()).data
        product_dict = {i['name']: {'fiyat': float(i.get('last_unit_cost', 0.0)), 'kdv': 10} for i in ing_data} if ing_data else {}
        
        # 2. Ürün Seçim Modu (Hibrit Sistem)
        is_manual = st.checkbox("✍️ Listede Olmayan Yeni Bir Ürün Yazmak İstiyorum", help="Mevcut ürünleri aramak için bu kutuyu boş bırakın. Yeni ürünler için işaretleyin.")

        # 3. DataFrame Hazırla
        if "invoice_items" not in st.session_state or st.session_state.invoice_items is None:
            st.session_state.invoice_items = pd.DataFrame(columns=["Ürün Seçiniz", "Miktar", "Birim Fiyat", "KDV %", "Satır Tutarı", "🗑️"])
        
        # Sütun eksikse ekle (V34.5 Geçiş)
        if "🗑️" not in st.session_state.invoice_items.columns:
            st.session_state.invoice_items["🗑️"] = False

        st.session_state.invoice_items = st.session_state.invoice_items.reset_index(drop=True)

        # 4. Sütun Konfigürasyonu
        col_cfg = {
            "Miktar": st.column_config.NumberColumn("Miktar", min_value=1.0, default=1.0),
            "Birim Fiyat": st.column_config.NumberColumn("Birim Fiyat", min_value=0.0, format="%.2f TL"),
            "KDV %": st.column_config.NumberColumn("KDV %", min_value=0, max_value=100, default=10),
            "Satır Tutarı": st.column_config.NumberColumn("Satır Tutarı", disabled=True, format="%.2f TL"),
            "🗑️": st.column_config.CheckboxColumn("Sil", width="small")
        }
        
        if is_manual:
            col_cfg["Ürün Seçiniz"] = st.column_config.TextColumn("Ürün Adı Yazın", required=True)
        else:
            col_cfg["Ürün Seçiniz"] = st.column_config.SelectboxColumn("Ürün Seçiniz", options=list(product_dict.keys()), required=True)

        # 5. Tabloyu Çiz
        edited_df = st.data_editor(
            st.session_state.invoice_items,
            num_rows="dynamic",
            width="stretch",
            hide_index=True,
            column_config=col_cfg,
            key="invoice_table_v31_2"
        )

        # 5.1 Silme İşlemini Yakala
        if edited_df["🗑️"].any():
            st.session_state.invoice_items = edited_df[~edited_df["🗑️"]].reset_index(drop=True)
            st.rerun()

        # 6. Hesaplama ve Otomatik Doldurma Döngüsü
        from database import get_last_purchase_info
        import numpy as np
        
        needs_rerun = False
        for i in range(len(edited_df)):
            urun = edited_df.iloc[i]["Ürün Seçiniz"]
            if pd.notna(urun) and str(urun).strip() != "" and str(urun).strip() != "None":
                
                # --- 1. DEĞERLERİ GÜVENLİ OKUMA (NaN Hatalarını Çözen Kısım) ---
                mevcut_fiyat = edited_df.iloc[i]["Birim Fiyat"]
                mevcut_miktar = edited_df.iloc[i]["Miktar"]
                mevcut_kdv = edited_df.iloc[i]["KDV %"]
                mevcut_tutar = edited_df.iloc[i]["Satır Tutarı"]
                
                # Eğer değerler boş (NaN) ise zorla 0 yap ki matematik çökmesin!
                if pd.isna(mevcut_fiyat): mevcut_fiyat = 0.0
                if pd.isna(mevcut_miktar) or mevcut_miktar == 0: mevcut_miktar = 1.0
                if pd.isna(mevcut_kdv): mevcut_kdv = 0.0
                if pd.isna(mevcut_tutar): mevcut_tutar = 0.0
                
                # --- 2. OTOMATİK DOLDURMA ---
                if float(mevcut_fiyat) == 0.0:
                    last_info = get_last_purchase_info(urun)
                    if last_info:
                        mevcut_fiyat = float(last_info.get("fiyat", 0))
                        mevcut_kdv = float(last_info.get("kdv", 10))
                    elif urun in product_dict:
                        mevcut_fiyat = float(product_dict[urun]["fiyat"])
                        mevcut_kdv = float(product_dict[urun]["kdv"])
                    
                    edited_df.at[i, "Birim Fiyat"] = mevcut_fiyat
                    edited_df.at[i, "KDV %"] = mevcut_kdv
                    edited_df.at[i, "Miktar"] = mevcut_miktar
                    needs_rerun = True
                
                # --- 3. MATEMATİKSEL HESAPLAMA ---
                yeni_tutar = (float(mevcut_miktar) * float(mevcut_fiyat)) * (1 + (float(mevcut_kdv) / 100))
                
                # TOLERANS PAYI: 0.05 TL (Gereksiz rerun engelleme)
                if abs(float(mevcut_tutar) - yeni_tutar) > 0.05:
                    edited_df.at[i, "Satır Tutarı"] = yeni_tutar
                    needs_rerun = True

        # 4. DEĞİŞİKLİK VARSA YENİLE (State Karşılaştırması ile Hızlandırma)
        if needs_rerun and not edited_df.equals(st.session_state.invoice_items):
            st.session_state.invoice_items = edited_df
            st.rerun()

        # 4. DEĞİŞİKLİK VARSA YENİLE
        if needs_rerun:
            st.session_state.invoice_items = edited_df
            st.rerun()
        
        st.session_state.invoice_items = edited_df

        # 5. GENEL TOPLAMI GÖSTER
        genel_toplam = float(edited_df["Satır Tutarı"].fillna(0).sum())
        f1, f2 = st.columns([2, 1])
        f1.markdown(f"### 💰 GENEL TOPLAM: {genel_toplam:,.2f} TL")
        
        if f2.button("💾 KAYDET VE STOĞA AL", type="primary", use_container_width=True):
            if is_edit: delete_v7_invoice(m_id)
            v_rows = edited_df[edited_df["Ürün Seçiniz"].notna() & (edited_df["Ürün Seçiniz"] != "")]
            net_total = float((v_rows["Miktar"] * v_rows["Birim Fiyat"]).sum())
            header = {"invoice_no": no, "invoice_date": str(dt), "supplier_id": ss[selected_s], "total_amount_gross": genel_toplam, "total_amount_net": net_total, "total_tax": genel_toplam - net_total}
            items = [{"name": r["Ürün Seçiniz"], "qty": float(r["Miktar"]), "price": float(r["Birim Fiyat"]), "tax_rate": float(r["KDV %"]), "tax_amount": 0.0, "line_total": float(r["Satır Tutarı"])} for _, r in v_rows.iterrows()]
            if save_v7_invoice(header, items):
                st.session_state.v20_inv_mode = "LIST"
                st.session_state.pop("invoice_items", None)
                st.toast("Fatura Başarıyla Kaydedildi."); st.rerun()
