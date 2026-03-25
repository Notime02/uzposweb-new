import streamlit as st
from database import get_supabase_client, run_query, get_daily_payments, get_sparkline_data, get_price_alerts
import pandas as pd
import plotly.express as px
from datetime import datetime

def render_flex_card(icon, value, label, trend, color="blue"):
    """V24.3: Dynamic Color Metric Card"""
    colors = {
        "blue": ("#3B82F6", "59, 130, 246"),
        "green": ("#10B981", "16, 185, 129"),
        "orange": ("#F59E0B", "245, 158, 11"),
        "red": ("#EF4444", "239, 68, 68"),
        "purple": ("#8B5CF6", "139, 92, 246"),
        "indigo": ("#6366F1", "99, 102, 241"),
        "slate": ("#64748B", "100, 116, 139"),
    }
    hex_c, rgb_c = colors.get(color, colors["blue"])
    
    html = f"""
    <div class="flex-metric-card" style="--accent-color: {hex_c}; --accent-rgb: {rgb_c};">
        <div class="card-icon">{icon}</div>
        <div class="card-content">
            <div class="card-value">{value}</div>
            <div class="card-label">{label}</div>
            <div class="trend-pill">{trend}</div>
        </div>
    </div>
    """
    st.markdown(html, unsafe_allow_html=True)

def show_dashboard():
    # UzPos V24.3 Color Refinement
    st.title("📊 Yönetim Paneli")
    # ... (Data fetching omitted for brevity, keeping same logic)
    res_p = get_daily_payments()
    df_p = pd.DataFrame(res_p) if res_p else pd.DataFrame()
    cash_total = df_p[df_p['type'] == 'Nakit']['amount'].sum() if not df_p.empty else 0
    card_total = df_p[df_p['type'] == 'Kart']['amount'].sum() if not df_p.empty else 0
    total_rev = cash_total + card_total

    today_str = datetime.now().strftime('%Y-%m-%d')
    res_t = run_query(lambda: get_supabase_client().table("tables").select("*").gte("created_at", f"{today_str}T00:00:00").execute())
    df_t = pd.DataFrame(res_t.data) if res_t and res_t.data else pd.DataFrame()
    masa_rev = df_t[df_t['name'].str.contains('masa', case=False, na=False)]['payments'].sum() if not df_t.empty else 0
    paket_rev = df_t[df_t['name'].str.contains('paket', case=False, na=False)]['payments'].sum() if not df_t.empty else 0
    paket_count = len(df_t[df_t['name'].str.contains('paket', case=False, na=False)]) if not df_t.empty else 0

    # --- TOP ROW: KPI METRICS (Color Coded) ---
    m1, m2, m3, m4 = st.columns(4)
    with m1: render_flex_card("📈", f"{len(df_p)}", "GÜNLÜK İŞLEM", "↑ 3% (Today)", "blue")
    with m2: render_flex_card("💳", f"{card_total:,.0f} TL", "KART TAHSİLAT", "↑ 8% (Today)", "indigo")
    with m3: render_flex_card("💵", f"{cash_total:,.0f} TL", "NAKİT TAHSİLAT", "↓ 2% (Today)", "green")
    with m4: render_flex_card("💰", f"{total_rev:,.0f} TL", "GÜNLÜK CİRO", "↑ 12% (Today)", "blue")

    st.subheader("🏠 Günlük Hizmet Özeti")
    sm1, sm2, sm3 = st.columns(3)
    with sm1: render_flex_card("🪑", f"{masa_rev:,.1f} TL", "MASA KAZANCI", "Stable", "slate")
    with sm2: render_flex_card("🛵", f"{paket_rev:,.1f} TL", "PAKET KAZANCI", "↑ 5% (Today)", "purple")
    with sm3: render_flex_card("📦", f"{paket_count}", "PAKET SAYISI", "Active", "orange")

    # --- MAIN CONTENT ---
    st.divider()
    c_left, c_right = st.columns([2, 1])

    with c_left:
        st.subheader("📈 Gelir Akışı (15 Gün)")
        spark = get_sparkline_data(days=15)
        df_spark = pd.DataFrame({"Gün": range(1, 16), "Ciro": spark})
        fig = px.area(df_spark, x="Gün", y="Ciro", template="seaborn")
        fig.update_traces(line_color='#2563EB', fillcolor='rgba(37, 99, 235, 0.1)')
        fig.update_layout(height=400, margin=dict(l=0,r=0,t=0,b=0))
        st.plotly_chart(fig, width="stretch")

    with c_right:
        # V24: All-Time Stats in a Container
        with st.container(border=True):
            st.subheader("🏨 Dükkan Genel Özeti")
            res_all_p = run_query(lambda: get_supabase_client().table("payments").select("type, amount").execute())
            df_all_p = pd.DataFrame(res_all_p.data) if res_all_p and res_all_p.data else pd.DataFrame()
            total_sales_all = df_all_p['amount'].sum() if not df_all_p.empty else 0
            
            res_all_t = run_query(lambda: get_supabase_client().table("tables").select("name, payments").execute())
            df_all_t = pd.DataFrame(res_all_t.data) if res_all_t and res_all_t.data else pd.DataFrame()
            total_masa_all = df_all_t[df_all_t['name'].str.contains('masa', case=False, na=False)]['payments'].sum() if not df_all_t.empty else 0
            total_paket_all = df_all_t[df_all_t['name'].str.contains('paket', case=False, na=False)]['payments'].sum() if not df_all_t.empty else 0
            
            res_exp = run_query(lambda: get_supabase_client().table("invoices").select("total_amount_gross").execute())
            total_exp_all = sum(o['total_amount_gross'] for o in (res_exp.data if res_exp else []))
            net_profit = total_sales_all - total_exp_all

            st.write(f"**Toplam Satış:** {total_sales_all:,.0f} TL")
            st.write(f"**Masa Geliri:** {total_masa_all:,.0f} TL")
            st.write(f"**Paket Geliri:** {total_paket_all:,.0f} TL")
            st.divider()
            st.metric("📊 TOPLAM NET KAR", f"{net_profit:,.2f} TL")

    # --- LOWER SECTION: DEBT & ACTIVITY ---
    st.divider()
    d1, d2 = st.columns([1, 1])

    with d1:
        with st.container(border=True):
            st.subheader("📉 Cari Borç Listesi")
            res_supp = run_query(lambda: get_supabase_client().table("suppliers").select("name, balance").order("balance", desc=True).execute())
            df_supp = pd.DataFrame(res_supp.data) if res_supp and res_supp.data else pd.DataFrame()
            if not df_supp.empty:
                debt_supps = df_supp[df_supp['balance'] > 0]
                if not debt_supps.empty:
                    st.write(f"**Toplam Borç:** {debt_supps['balance'].sum():,.2f} TL")
                    st.dataframe(debt_supps, hide_index=True, width="stretch")
                else:
                    st.success("Tebrikler, tüm borçlar ödenmiş!")
    
    with d2:
        with st.container(border=True):
            st.subheader("🕒 Son Hareketler")
            if not df_p.empty:
                for _, row in df_p.head(10).iterrows():
                    st.text(f"• {row['type']} Tahsilat: {row['amount']:,.1f} TL")
            else:
                st.caption("Bugün henüz hareket yok.")
