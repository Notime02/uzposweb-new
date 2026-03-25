import streamlit as st
from database import get_supabase_client, run_query, save_account_transaction, get_account_movements, pay_supplier_debt
import pandas as pd
from datetime import datetime

def show_accounts():
    st.markdown("### 💳 Finansal Hesaplar ve Nakit Akışı")
    from database import get_accounts, get_treasury_summary
    supabase = get_supabase_client()
    
    # --- V19 TREASURY SUMMARY TABLE ---
    treasury = get_treasury_summary()
    st.markdown(f"""
    <div style='display:flex; gap:10px; margin-bottom:20px;'>
        <div style='flex:1; background:white; padding:15px; border:1px solid #E2E8F0; border-radius:8px;'>
            <div style='font-size:11px; color:#64748B;'>ELDEKİ NAKİT</div>
            <div style='font-size:20px; font-weight:800; color:#10B981;'>{treasury['Nakit']:,.2f} TL</div>
        </div>
        <div style='flex:1; background:white; padding:15px; border:1px solid #E2E8F0; border-radius:8px;'>
            <div style='font-size:11px; color:#64748B;'>POS / KART TOPLAMI</div>
            <div style='font-size:20px; font-weight:800; color:#6366F1;'>{treasury['Kart']:,.2f} TL</div>
        </div>
    </div>
    """, unsafe_allow_html=True)

    # 1. ACTION BAR - POWER BUTTONS
    c1, c2, c3, c4 = st.columns([1.5, 1, 1, 1])
    with c1:
        if st.button("🔴 CARİ BORÇ ÖDE", width="stretch", type="primary"):
            st.session_state.v13_acc_mode = "PAY_DEBT"
    with c2:
        if st.button("➕ PARA GİRİŞİ", width="stretch"):
            st.session_state.v13_acc_mode = "IN"
    with c3:
        if st.button("➖ PARA ÇIKIŞI", width="stretch"):
            st.session_state.v13_acc_mode = "OUT"
    with c4:
        if st.button("🔄 LİSTEYİ YENİLE", width="stretch"):
            st.rerun()

    # 2. DIALOGS
    if "v13_acc_mode" in st.session_state:
        mode = st.session_state.v13_acc_mode
        with st.expander(f"İşlem Paneli: {mode}", expanded=True):
            if mode == "PAY_DEBT":
                with st.form("pay_debt_form"):
                    s_res = run_query(lambda: supabase.table("suppliers").select("id, name, balance").gt("balance", 0).execute())
                    supps = {f"{s['name']} ({s['balance']} TL)": s['id'] for s in s_res.data} if s_res else {}
                    sel_supp = st.selectbox("Tedarikçi Seçin", list(supps.keys()))
                    
                    acc_res = get_accounts()
                    acc_map = {a['account_name']: a['id'] for a in acc_res}
                    acc_col, amt_col = st.columns(2)
                    sel_acc_name = acc_col.selectbox("Ödeme Hesabı", list(acc_map.keys()))
                    amount = amt_col.number_input("Ödeme Tutarı", min_value=1.0)
                    
                    if st.form_submit_button("ÖDEMEYİ ONAYLA"):
                        # V19 Fix: Corrected Argument Order (supp_id, acc_id, amt, desc)
                        if pay_supplier_debt(supps[sel_supp], acc_map[sel_acc_name], amount, f"{sel_supp} Ödemesi"):
                            st.toast("Borç başarıyla ödendi!", icon="✅")
                            del st.session_state.v13_acc_mode; st.rerun()
            elif mode in ["IN", "OUT"]:
                with st.form("quick_acc_form"):
                    acc_res = get_accounts()
                    acc_map = {a['account_name']: a['id'] for a in acc_res}
                    sel_acc = st.selectbox("Hesap Seçin", list(acc_map.keys()))
                    amt = st.number_input("Tutar", min_value=0.1)
                    desc = st.text_area("Açıklama / Belge No")
                    if st.form_submit_button("KAYDET"):
                        save_account_transaction(
                            acc_map[sel_acc], 
                            amt, 
                            "Giriş" if mode == "IN" else "Çıkış", 
                            desc
                        )
                        st.toast("İşlem kaydedildi."); del st.session_state.v13_acc_mode; st.rerun()

    st.markdown("---")
    
    # 3. MOVEMENT GRID
    movements = get_account_movements()
    if movements:
        df = pd.DataFrame(movements)
        if not df.empty:
            # V16.2 Safety Check
            if 'created_at' not in df.columns:
                df['created_at'] = pd.Timestamp.now()
            
            try:
                df['created_at'] = pd.to_datetime(df['created_at']).dt.strftime('%d.%m.%Y %H:%M')
            except:
                pass
                
            df['İşlem'] = "📝 🗑️"
            
            # Ensure columns exist before displaying
            cols = ['İşlem', 'created_at', 'doc_no', 'type', 'description', 'amount']
            actual_cols = [c for c in cols if c in df.columns]
            
            st.dataframe(
                df[actual_cols],
                column_config={
                    "İşlem": st.column_config.TextColumn("Aksiyon", width="small"),
                    "created_at": "Tarih",
                    "doc_no": "Belge No",
                    "type": "İşlem Tipi",
                    "amount": st.column_config.NumberColumn("Tutar", format="%.2f TL")
                },
                hide_index=True,
                width="stretch"
            )
        else:
            st.info("Hesap hareketi bulunamadı.")
    else:
        st.info("Kayıt bulunamadı.")
