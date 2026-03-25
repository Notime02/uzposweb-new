import streamlit as st
from database import get_supabase_client, run_query, add_supplier, update_supplier, delete_supplier, get_supplier
import pandas as pd

def show_suppliers():
    st.markdown("### 🏢 Tedarikçi ve Cari Rehberi")
    supabase = get_supabase_client()
    
    if "supp_mode" not in st.session_state: st.session_state.supp_mode = "LIST"
    if "edit_supp_id" not in st.session_state: st.session_state.edit_supp_id = None

    if st.session_state.supp_mode == "LIST":
        # 1. Action Bar
        c1, h2 = st.columns([6, 1.5])
        if h2.button("➕ YENİ CARİ EKLE", type="primary", width="stretch"):
            st.session_state.supp_mode = "FORM"
            st.session_state.edit_supp_id = None
            st.rerun()

        # 2. Serious Grid V13.1
        res = run_query(lambda: supabase.table("suppliers").select("*").order("name").execute())
        if res and res.data:
            df = pd.DataFrame(res.data)
            
            # Header
            h1, h2, h3, h4 = st.columns([3, 2, 2, 1.5])
            h1.caption("FİRMA ADI")
            h2.caption("TELEFON")
            h3.caption("BAKİYE")
            h4.caption("İŞLEMLER")
            
            st.divider()
            
            for _, row in df.iterrows():
                r1, r2, r3, r4 = st.columns([3, 2, 2, 1.5])
                r1.write(f"**{row['name']}**")
                r2.write(row['phone'] if row['phone'] else "-")
                r3.write(f"{row['balance']:,.2f} TL")
                
                b1, b2 = r4.columns(2)
                if b1.button("📝", key=f"edit_{row['id']}"):
                    st.session_state.edit_supp_id = row['id']
                    st.session_state.supp_mode = "FORM"
                    st.rerun()
                if b2.button("🗑️", key=f"del_{row['id']}"):
                    delete_supplier(row['id'])
                    st.toast(f"{row['name']} silindi.")
                    st.rerun()
            
            st.markdown(f"<div style='font-size:11px; color:#64748B; margin-top:20px;'>Toplam Kayıt: {len(df)}</div>", unsafe_allow_html=True)
        else:
            st.info("Kayıt yok.")
            
    else:
        # --- ADD / EDIT FORM ---
        is_edit = st.session_state.edit_supp_id is not None
        st.write(f"#### {'📝 Cari Düzenle' if is_edit else '➕ Yeni Cari Ekle'}")
        
        current_data = {"name": "", "phone": "", "balance": 0.0}
        if is_edit:
            s_data = get_supplier(st.session_state.edit_supp_id)
            if s_data:
                current_data = s_data

        with st.form("supplier_form"):
            name = st.text_input("Firma/Cari Adı", value=current_data['name'])
            phone = st.text_input("Telefon", value=current_data['phone'])
            # Only allow setting initial balance on NEW entries
            if not is_edit:
                bal = st.number_input("Açılış Bakiyesi (Borç)", value=0.0, step=100.0)
            
            f1, f2 = st.columns(2)
            if f1.form_submit_button("KAYDET", type="primary", width="stretch"):
                if name:
                    if is_edit:
                        update_supplier(st.session_state.edit_supp_id, name, phone)
                        st.toast("Güncellendi.")
                    else:
                        add_supplier(name, phone, bal)
                        st.toast("Eklendi.")
                    st.session_state.supp_mode = "LIST"
                    st.rerun()
                else:
                    st.error("Firma adı gereklidir.")
            
            if f2.form_submit_button("İPTAL", width="stretch"):
                st.session_state.supp_mode = "LIST"
                st.rerun()
