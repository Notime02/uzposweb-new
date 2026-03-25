import streamlit as st
from database import check_login
import pandas as pd

# Page Config V25 - Identity & Branding
st.set_page_config(
    page_title="UzPos | Premium Admin",
    page_icon="images/logo.ico",
    layout="wide",
    initial_sidebar_state="expanded"
)

# --- V24.2 FLEX-METRIC CSS ---
st.markdown("""
<style>
    :root {
        --card-bg: #FFFFFF;
        --card-border: #E2E8F0;
        --card-text: #1E293B;
        --card-subtext: #64748b;
        --card-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        --bg-main: #F8FAFC;
        
        --accent-yemek: #3B82F6;
        --accent-meze: #10B981;
        --accent-icecek: #F59E0B;
        --accent-diger: #64748B;
    }
    [data-theme="dark"] {
        --card-bg: #1E293B;
        --card-border: #334155;
        --card-text: #F8FAFC;
        --card-subtext: #94A3B8;
        --card-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
        --bg-main: #0F172A;

        --accent-yemek: #60A5FA;
        --accent-meze: #34D399;
        --accent-icecek: #FBBF24;
        --accent-diger: #94A3B8;
    }

    /* Fixed Header for Profile */
    .header-container {
        display: flex;
        justify-content: flex-end;
        align-items: center;
        padding: 5px 20px;
        background: transparent;
        margin-bottom: -40px;
        z-index: 1000;
    }
    /* Rest of Flex Metric CSS (Dynamic & Refined) */
    .flex-metric-card {
        background: var(--card-bg);
        padding: 24px;
        border-radius: 16px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        display: flex;
        flex-direction: row;
        align-items: center;
        margin-bottom: 20px;
        border: 1px solid var(--card-border);
        border-left: 5px solid var(--accent-color, #3B82F6);
        min-height: 120px;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .flex-metric-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
    }
    .card-icon {
        font-size: 36px;
        margin-right: 20px;
        color: var(--accent-color, #3B82F6);
        background: rgba(var(--accent-rgb, 59, 130, 246), 0.1);
        width: 64px;
        height: 64px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .card-content { display: flex; flex-direction: column; justify-content: center; }
    .card-value { font-size: 26px; font-weight: 800; color: var(--card-text); line-height: 1.2; }
    .card-label { font-size: 13px; font-weight: 500; color: var(--card-subtext); margin-bottom: 5px; text-transform: uppercase; letter-spacing: 0.5px; }
    .trend-pill { display: inline-block; padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; background: var(--card-bg); border: 1px solid var(--card-border); color: var(--card-subtext); }
    
    /* RECIPIENT CARD OVERRIDES FOR RECIPES.PY */
    .recipe-card {
        display: flex;
        background: var(--card-bg);
        border: 1px solid var(--card-border);
        border-radius: 12px;
        padding: 15px;
        margin-bottom: 15px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        transition: all 0.3s;
    }
    .recipe-card:hover { transform: scale(1.01); box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
    .recipe-img { width: 80px; height: 80px; object-fit: cover; border-radius: 8px; margin-right: 15px; }
    .recipe-info { flex-grow: 1; }
    .recipe-name { font-size: 18px; font-weight: bold; color: var(--card-text); }
    .recipe-meta { font-size: 12px; color: var(--card-subtext); margin-bottom: 10px; }
    .recipe-stats { display: flex; gap: 20px; }
    .stat-label { font-size: 10px; color: var(--card-subtext); }
    .stat-value { font-size: 14px; font-weight: bold; color: var(--card-text); }

    /* GLOBAL NOTIFICATION BELL */
    .notif-bell {
        position: relative;
        cursor: pointer;
        font-size: 20px;
        background: var(--card-bg);
        padding: 8px;
        border-radius: 50%;
        border: 1px solid var(--card-border);
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-right: 15px;
    }
    .notif-bell:hover {
        background: #F1F5F9;
        transform: scale(1.1);
    }
    .notif-badge {
        position: absolute;
        top: -3px;
        right: -3px;
        background: #EF4444;
        color: white;
        font-size: 9px;
        font-weight: 800;
        padding: 1px 5px;
        border-radius: 10px;
        border: 1.5px solid white;
    }
    [data-theme="dark"] .notif-bell { background: #1e293b; border-color: #334155; }
</style>
""", unsafe_allow_html=True)

# --- LOGIN LOGIC ---
if 'logged_in' not in st.session_state:
    st.session_state.logged_in = False

if not st.session_state.logged_in:
    st.title("🛡️ UzPos Giriş")
    with st.form("login_form"):
        username = st.text_input("Kullanıcı Adı")
        password = st.text_input("Şifre", type="password")
        submit = st.form_submit_button("Giriş Yap")
        
        if submit:
            user = check_login(username, password)
            # V24.1: Hardcoded fallback for immediate access
            if user or (username == "admin" and password == "123"):
                st.session_state.logged_in = True
                st.session_state.user_role = user.get('role', 'admin') if user else 'admin'
                st.session_state.username = username
                st.rerun()
            else:
                st.error("Hatalı kullanıcı adı veya şifre!")
    st.stop()

# --- NATIVE SIDEBAR NAVIGATION ---
st.sidebar.image("images/Gemini_Generated_Image_ch45u9ch45u9ch45-Photoroom (1).png", width="stretch")
st.sidebar.markdown(f"**👤 {st.session_state.username}** (`{st.session_state.user_role}`)")
st.sidebar.divider()

nav_options = {
    "📊 DashBoard": "Dashboard",
    "🧾 Faturalar": "Faturalar",
    "📦 Envanter & Stok": "Envanter",
    "🍱 Reçeteler": "Reçeteler",
    "👥 Tedarikçiler": "Tedarikçiler",
    "💰 Hesaplar & Kasa": "Hesaplar",
    "🛒 Satışlar": "Satışlar"
}

# Admin-only options
if st.session_state.user_role == "admin":
    nav_options["👤 Kullanıcı Yönetimi"] = "Users"

choice_label = st.sidebar.radio(
    "Menüden bir sayfa seçin:",
    options=list(nav_options.keys()),
    label_visibility="collapsed"
)
choice = nav_options[choice_label]

# --- TOP RIGHT PROFILE HEADER ---
from database import get_price_alerts
alerts = get_price_alerts()
alert_count = len(alerts)

# Custom Label for Popover (Bell + Badge)
notif_label = f"🔔 {alert_count}" if alert_count > 0 else "🔔"

h1, h2, h3 = st.columns([12, 1.5, 1.5])
with h2:
    with st.popover(notif_label):
        st.subheader("🔔 Bildirimler")
        if alerts:
            for a in alerts:
                st.warning(f"**{a['name']}**\n\nFiyat: {a['last']:.2f} → {a['current']:.2f}")
            if st.button("Reçetelere Git", width="stretch"):
                # Bu kısım için session state 'choice' tetiklenebilir ama radio kullanıldığı için 
                # kullanıcıyı yönlendirmek biraz zahmetli, şimdilik uyarıyoruz.
                st.info("Menüden 'Reçeteler' sekmesini seçiniz.")
        else:
            st.success("Tüm fiyatlar güncel! 🎉")

with h3:
    with st.popover("👤 Profil"):
        st.write(f"**{st.session_state.username}**")
        st.write(f"Rol: `{st.session_state.user_role}`")
        if st.button("🚪 Çıkış Yap", width="stretch"):
            st.session_state.logged_in = False
            st.rerun()

st.sidebar.divider()

# --- MODULE ROUTING ---
from modules import dashboard, invoices, inventory, recipes, suppliers, accounts, sales, users

if choice == "Dashboard":
    dashboard.show_dashboard()
elif choice == "Faturalar":
    invoices.show_invoices()
elif choice == "Envanter":
    inventory.show_inventory()
elif choice == "Reçeteler":
    recipes.show_recipes()
elif choice == "Tedarikçiler":
    suppliers.show_suppliers()
elif choice == "Hesaplar":
    accounts.show_accounts()
elif choice == "Satışlar":
    sales.show_sales()
elif choice == "Users":
    users.show_user_management()
