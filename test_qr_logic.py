import sys
import io
import json

# Force UTF-8 for stdout
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from backend.logic import get_qr_menu_items

try:
    items = get_qr_menu_items()
    print(f"Items found: {len(items)}")
    print(json.dumps(items, indent=2))
except Exception as e:
    print(f"Error: {e}")
