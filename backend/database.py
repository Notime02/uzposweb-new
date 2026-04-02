import os
from dotenv import load_dotenv
from supabase import create_client, Client
from pathlib import Path

# Fix: Look for .env in the same directory as this file (uzposweb/backend/.env)
env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)

def get_supabase() -> Client:
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")
    
    if not url or not key:
        print("HATA: SUPABASE_URL veya SUPABASE_KEY .env dosyasinda bulunamadi!")
        # Raising an error here will stop the server, which is better than running with broken data
        raise ValueError("Supabase baglanti bilgileri eksik. Lutfen .env dosyasini kontrol edin.")
    
    print(f"Supabase istemcisi hazirlandi: {url[:20]}...")
    return create_client(url, key)

try:
    supabase = get_supabase()
except Exception as e:
    print(f"Supabase Baslatma Hatasi: {e}")
    supabase = None
