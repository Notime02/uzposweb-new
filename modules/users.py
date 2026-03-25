import streamlit as st
from database import get_users, add_user, delete_user

def show_user_management():
    st.title("👤 Kullanıcı Yönetimi")
    st.write("Sistem kullanıcılarını ekleyin, yetkilerini düzenleyin veya silin.")
    st.divider()

    # --- YENİ KULLANICI EKLE ---
    with st.expander("➕ Yeni Kullanıcı Ekle", expanded=False):
        with st.form("add_user_form"):
            new_user = st.text_input("Kullanıcı Adı")
            new_pass = st.text_input("Şifre", type="password")
            new_role = st.selectbox("Yetki", ["admin", "staff"])
            submit = st.form_submit_button("Kullanıcıyı Kaydet")
            
            if submit:
                if new_user and new_pass:
                    res = add_user(new_user, new_pass, new_role)
                    if res:
                        st.success(f"'{new_user}' kullanıcısı başarıyla eklendi.")
                        st.rerun()
                    else:
                        st.error("Kullanıcı eklenemedi (Kullanıcı adı zaten var olabilir).")
                else:
                    st.warning("Lütfen tüm alanları doldurun.")

    # --- KULLANICI LİSTESİ ---
    st.subheader("📋 Mevcut Kullanıcılar")
    users = get_users()
    if users:
        for u in users:
            c1, c2, c3, c4 = st.columns([2, 1, 1, 1])
            c1.write(f"**{u['username']}**")
            c2.write(f"`{u['role']}`")
            c3.write(f"{u['created_at'][:10]}")
            
            # Kendi kullanıcısını silmeyi engelle
            if u['username'] == st.session_state.username:
                c4.write("*(Siz)*")
            else:
                if c4.button("Sil", key=f"del_{u['id']}"):
                    if delete_user(u['id']):
                        st.success("Kullanıcı silindi.")
                        st.rerun()
                    else:
                        st.error("Silme işlemi başarısız.")
            st.divider()
    else:
        st.info("Kayıtlı kullanıcı bulunamadı.")
