import streamlit as st
from database import get_all_payments
import pandas as pd

def show_sales():
    st.markdown("### 💲 Satış ve Tahsilat Geçmişi (V17)")
    
    payments = get_all_payments()
    
    if payments:
        df = pd.DataFrame(payments)
        
        # V18: TODAY'S QUICK SUMMARY
        from datetime import datetime
        today_str = datetime.now().strftime('%Y-%m-%d')
        df_today = df[df['created_at'].str.startswith(today_str)] if 'created_at' in df.columns else pd.DataFrame()
        
        with st.expander("📅 BUGÜNÜN ÖZETİ (Dashboard Kısayolu)", expanded=True):
            t1, t2, t3 = st.columns(3)
            t_total = df_today['amount'].sum() if not df_today.empty else 0
            t_cash = df_today[df_today['type'] == 'Nakit']['amount'].sum() if not df_today.empty else 0
            t_card = df_today[df_today['type'] == 'Kart']['amount'].sum() if not df_today.empty else 0
            t1.metric("BUGÜN NAKİT", f"{t_cash:,.2f} TL")
            t2.metric("BUGÜN KART", f"{t_card:,.2f} TL")
            t3.metric("GÜNLÜK TOPLAM", f"{t_total:,.2f} TL")

        # 1. GLOBAL SUMMARY METRICS
        st.markdown("<div style='background: white; padding: 20px; border: 1px solid #E2E8F0; border-radius: 12px; margin-bottom: 25px;'>", unsafe_allow_html=True)
        m1, m2, m3 = st.columns(3)
        total_all = df['amount'].sum()
        total_nakit = df[df['type'] == 'Nakit']['amount'].sum() if 'type' in df.columns else 0
        total_kart = df[df['type'] == 'Kart']['amount'].sum() if 'type' in df.columns else 0
        
        m1.metric("TOPLAM TAHSİLAT", f"{total_all:,.2f} TL")
        m2.metric("NAKİT TOPLAMI", f"{total_nakit:,.2f} TL")
        m3.metric("KART TOPLAMI", f"{total_kart:,.2f} TL")
        st.markdown("</div>", unsafe_allow_html=True)
        
        # 2. DETAILED LIST
        st.write("#### Tüm Ödemeler")
        
        # Date conversion safety (V16.2 logic)
        if 'created_at' in df.columns:
            try:
                df['Tarih'] = pd.to_datetime(df['created_at']).dt.strftime('%d.%m.%Y %H:%M')
            except:
                df['Tarih'] = df['created_at']
        
        st.dataframe(
            df[['Tarih', 'type', 'amount']],
            column_config={
                "Tarih": st.column_config.TextColumn("İşlem Tarihi", width="medium"),
                "type": "Ödeme Yöntemi",
                "amount": st.column_config.NumberColumn("Tutar", format="%.2f TL")
            },
            hide_index=True,
            width="stretch"
        )
    else:
        st.info("Sistemde henüz kayıtlı bir satış bulunamadı.")
