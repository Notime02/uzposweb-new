import streamlit as st
import pandas as pd

def hizli_fatura_test_ekrani():
    st.markdown("### ⚡ Yeni Nesil Hızlı Fatura Girişi (Test)")
    st.info("💡 Tablonun en altındaki boş satıra tıklayarak Excel'deki gibi hızlıca yeni ürün ekleyebilirsiniz. Sayfa asla yenilenmez!")

    # 1. Geçici Hafıza (Session State) Oluşturma
    # Eğer hafızada fatura tablosu yoksa, boş bir tablo yaratır. 
    # SİZİN KODUNUZU BOZMAZ, SADECE TARAYICIDA ÇALIŞIR.
    if "fatura_kalemleri" not in st.session_state:
        st.session_state.fatura_kalemleri = pd.DataFrame(
            columns=["Ürün Adı", "Alım Birimi", "Koli İçi Adet", "Miktar", "Birim Fiyat", "KDV %", "Satır İskontosu (TL)"]
        )

    # 2. Tedarikçi Seçimi (Şimdilik Temsili - Daha sonra Supabase'e bağlayacağız)
    secili_cari = st.selectbox("Cari Firma Seçiniz:", ["Adem Kaner", "Ahmet Toptan", "Metro Grossmarket"])
    
    # Seçilen cariye göre ürün listesini filtreleme mantığı (Temsili)
    if secili_cari == "Adem Kaner":
        cari_urunleri = ["Coca Cola 330ml", "Fanta 330ml", "Ayran"]
    else:
        cari_urunleri = ["Dana Kıyma", "Tavuk Göğsü", "Domates"]

    # 3. MUCİZEVİ TABLO (Data Editor)
    # Bu tablo Streamlit'i yormaz, siz "Kaydet" diyene kadar veritabanına gitmez.
    duzenlenen_tablo = st.data_editor(
        st.session_state.fatura_kalemleri,
        num_rows="dynamic", # Kullanıcının sınırsız yeni satır eklemesine izin verir
        column_config={
            "Ürün Adı": st.column_config.SelectboxColumn("Ürün Seçiniz (Sadece bu cariye ait)", options=cari_urunleri, required=True),
            "Alım Birimi": st.column_config.SelectboxColumn("Birim", options=["Adet", "Koli", "Çuval", "Kg"], required=True),
            "Koli İçi Adet": st.column_config.NumberColumn("Koli İçi", min_value=1, default=1, help="Örn: Kolide 24 adet varsa 24 yazın."),
            "Miktar": st.column_config.NumberColumn("Miktar", min_value=0.1, required=True),
            "Birim Fiyat": st.column_config.NumberColumn("Birim Fiyat (TL)", min_value=0.0, required=True),
            "KDV %": st.column_config.NumberColumn("KDV %", min_value=0, max_value=100, default=20),
            "Satır İskontosu (TL)": st.column_config.NumberColumn("İndirim (TL)", min_value=0.0, default=0.0),
        },
        use_container_width=True,
        hide_index=True
    )

    # 4. Kaydet ve Arka Planda Hesapla Butonu
    if st.button("💾 Faturayı Kaydet ve Stoğa Al", type="primary"):
        if duzenlenen_tablo.empty:
            st.warning("Lütfen faturaya en az bir ürün ekleyin.")
        else:
            # Burada girilen verileri hesaplayıp Supabase'e göndereceğiz
            toplam_stoga_giren_adet = 0
            
            for index, row in duzenlenen_tablo.iterrows():
                # Koli hesabını arka planda yapıyoruz (Siz hesap makinesi kullanmıyorsunuz)
                gercek_stok_miktari = row["Miktar"] * row["Koli İçi Adet"]
                toplam_stoga_giren_adet += gercek_stok_miktari
                
            st.success(f"Harika! Fatura tek seferde kaydedildi. Stoğunuza toplam {toplam_stoga_giren_adet} adet/kg ürün eklendi.")
            st.balloons()

# Test etmek için bu fonksiyonu çağırın
hizli_fatura_test_ekrani()