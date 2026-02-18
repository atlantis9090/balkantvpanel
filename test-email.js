const admin = require('firebase-admin');
const serviceAccount = require('./functions/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://balkantvpanel.firebaseio.com"
});

const db = admin.firestore();

async function sendTestEmail() {
  try {
    const result = await db.collection('mail').add({
      to: 'balkan-iptv@outlook.com',
      message: {
        subject: 'Test Mail - Balkan TV Panel',
        text: 'Bu bir test emailidir. Email sistemi çalışıyor mu kontrol etmek için gönderildi.'
      },
      createdAt: new Date()
    });

    console.log('✅ Test belgesi başarıyla oluşturuldu!');
    console.log('Document ID:', result.id);
    console.log('\n📧 Email adresine gitmesini bekleyin (2-5 dakika)');
    console.log('Email adresi: balkan-iptv@outlook.com');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Hata:', error);
    process.exit(1);
  }
}

sendTestEmail();
