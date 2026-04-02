import os
import json
from typing import List, Dict, Any
from google import genai
from google.genai import types
from thefuzz import process, fuzz
from database import supabase
import traceback

# --- API Configuration ---
def get_ai_client():
    gen_key = os.getenv("GEMINI_API_KEY")
    if not gen_key:
        return None
    return genai.Client(api_key=gen_key)

# --- AI Vision & Extraction ---
def process_full_invoice(image_content: bytes, supplier_id: str = None) -> Dict[str, Any]:
    """Uses the NEW google-genai SDK with intensive logging."""
    try:
        print("🔍 [İNCELEME] Fatura tarama süreci başladı...")
        
        client = get_ai_client()
        if not client:
            print("🔴 HATA: API Anahtarı (.env) okunamadı veya Client başlatılamadı!")
            return {"error": "API anahtarı eksik."}
            
        print(f"📡 [BAĞLANTI] Gemini 2.5 Flash kapısı zorlanıyor...")
        
        # Multimodal Part (Image)
        image_part = types.Part.from_bytes(
            data=image_content,
            mime_type="image/jpeg"
        )
        
        # Prompt for structuring
        prompt = """
        Bu faturadaki verileri analiz et ve sonucu SADECE şu JSON formatında döndür:
        {
            "supplier_name": "Tedarikçi Adı",
            "invoice_date": "YYYY-MM-DD",
            "invoice_number": "Fatura No",
            "total_amount_gross": 0.0,
            "items": [
                {
                    "description": "Ürün Adı",
                    "quantity": 0.0,
                    "unit_price": 0.0,
                    "total_price": 0.0,
                    "tax_rate": 20.0
                }
            ]
        }
        
        Notlar: 
        - Sayısal değerleri float olarak döndür.
        - Dil: Türkçe.
        - Sadece JSON metnini döndür, açıklama yapma.
        """
        
        # AI Call
        response = client.models.generate_content(
            model="gemini-2.5-flash", 
            contents=[prompt, image_part]
        )
        
        if not response or not response.text:
            print("🔴 HATA: Gemini'den boş yanıt geldi veya model desteklenmiyor!")
            return {"error": "Yapay zeka yanıt vermedi."}
            
        print("✅ [BAŞARI] Yapay zeka veriyi okudu, işleniyor...")
        
        text_response = response.text
        if "```json" in text_response:
            text_response = text_response.split("```json")[1].split("```")[0].strip()
        elif "```" in text_response:
            text_response = text_response.split("```")[1].split("```")[0].strip()
            
        parsed_data = json.loads(text_response)
        
        # --- Akıllı Cari Eşleştirme ---
        # Eğer faturadan bir tedarikçi ismi geldiyse sistemdeki en yakınını bulalım
        detected_name = parsed_data.get('supplier_name')
        if detected_name:
            print(f"🔍 [EŞLEŞTİRME] Tedarikçi aranıyor: {detected_name}")
            best_id, match_name, match_score = match_supplier_to_db(detected_name)
            if best_id and match_score >= 80:
                print(f"✅ [BULDUM] En yakın Cari: {match_name} (%{match_score})")
                parsed_data['supplier_id'] = str(best_id)
                parsed_data['supplier_name'] = match_name # Sistemdeki tam ismini kullanalım
            else:
                print(f"⚠️ [UYARI] Cari tam eşleşmedi: {detected_name}")
                parsed_data['supplier_id'] = "" # Boş bırakalım, kullanıcı seçsin
        
        matched_items = match_items_to_inventory(parsed_data.get('items', []), parsed_data.get('supplier_id'))
        parsed_data['items'] = matched_items
        
        print("🎯 [SONUÇ] İşlem başarıyla tamamlandı.")
        return parsed_data
            
    except Exception as e:
        print(f"🔴🔴🔴 KRİTİK HATA DETAYI: {str(e)}")
        # Eğer hata 404 ise model ismindendir, ama kullanıcı 2.5'ten emin.
        return {"error": str(e)}

# --- Akıllı Cari Eşleştirme Mantığı ---
def match_supplier_to_db(detected_name: str):
    """Sistemdeki cariler arasında en yakın ismi bulur."""
    try:
        res = supabase.table("suppliers").select("id, name").execute()
        suppliers = res.data if res and res.data else []
        if not suppliers:
            return None, None, 0
            
        names = [s['name'] for s in suppliers]
        match, score = process.extractOne(detected_name, names, scorer=fuzz.token_sort_ratio)
        
        if match:
            # ID'yi bulalım
            sup_id = next((s['id'] for s in suppliers if s['name'] == match), None)
            return sup_id, match, score
            
        return None, None, 0
    except Exception as e:
        print(f"⚠️ Cari eşleştirme hatası: {e}")
        return None, None, 0

# --- Smart Item Matching ---
def match_items_to_inventory(invoice_items: List[Dict[str, Any]], supplier_id: str) -> List[Dict[str, Any]]:
    """Matches invoice descriptions with existing ingredients using fuzzy matching."""
    res = supabase.table("ingredients").select("id, name").execute()
    inventory = res.data if res and res.data else []
    inv_names = [i['name'] for i in inventory]
    inv_map = {i['name']: i['id'] for i in inventory}
    
    results = []
    for item in invoice_items:
        desc = item['description']
        # Use fuzzy matching to find the best match
        match, score = process.extractOne(desc, inv_names, scorer=fuzz.token_sort_ratio) if inv_names else (None, 0)
        
        item_with_match = item.copy()
        if match and score >= 70:
            # Ensure the ID is a string for JSON safety
            item_with_match['matched_ingredient_id'] = str(inv_map[match])
            item_with_match['matched_name'] = match
            item_with_match['match_score'] = score
        else:
            item_with_match['matched_ingredient_id'] = None
            item_with_match['matched_name'] = "Yeni Ürün"
            item_with_match['match_score'] = score
            
        results.append(item_with_match)
        
    return results
