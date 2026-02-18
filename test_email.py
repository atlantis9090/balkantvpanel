#!/usr/bin/env python3
"""
Firebase Firestore'a test email belgesi eklemek için script
"""

import subprocess
import json
import sys
from datetime import datetime

def add_test_email():
    """Firestore'a test email belgesi ekler"""
    
    # Test belgesi
    test_doc = {
        "to": "mersinakpinar@outlook.com",
        "message": {
            "subject": "Test Mail - Balkan TV Panel",
            "text": "Bu bir test emailidir. Email sistemi çalışıyor mu kontrol etmek için gönderildi."
        },
        "createdAt": datetime.now().isoformat()
    }
    
    # firebase CLI komutu - Firestore'a doğrudan ekleme
    cmd = [
        "firebase",
        "firestore",
        "databases",
        "describe"
    ]
    
    try:
        print("📧 Test email belgesi oluşturuluyor...")
        print(f"   Alıcı: mersinakpinar@outlook.com")
        print(f"   Konu: Test Mail - Balkan TV Panel")
        print("\n⏳ Lütfen Firebase Console'u açın ve şu adımları takip edin:")
        print("\n1. https://console.firebase.google.com/project/balkantvpanel")
        print("2. Firestore Database > 'mail' koleksiyonuna gidip")
        print("3. 'Belge Ekle' tıklayıp bu JSON'u yapıştırın:\n")
        
        print(json.dumps(test_doc, indent=2, ensure_ascii=False))
        
        print("\n4. Kaydet tıklayın")
        print("5. 2-5 dakika bekleyin")
        print("6. mersinakpinar@outlook.com mail kutusunu kontrol edin\n")
        
    except Exception as e:
        print(f"❌ Hata: {e}")
        sys.exit(1)

if __name__ == "__main__":
    add_test_email()
