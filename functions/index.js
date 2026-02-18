
const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Firebase Admin SDK'sını başlat
admin.initializeApp();

const db = admin.firestore();

// AppId sabiti - client tarafındaki appId ile eşleşmeli
const APP_ID = "default-app-id";

/**
 * Yardımcı: Veri koleksiyonu yolu
 */
function dataPath(collectionName) {
  return `artifacts/${APP_ID}/public/data/${collectionName}`;
}

/**
 * Admin Giriş Doğrulama - Callable Function
 * Client admin username/password gönderir, sunucu doğrular ve custom claims atar
 */
exports.verifyAdmin = functions.https.onCall(async (data, context) => {
  // Anonim auth gerekli
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Kimlik doğrulaması gereklidir.");
  }

  const { username, password } = data;

  if (!username || !password) {
    throw new functions.https.HttpsError("invalid-argument", "Kullanıcı adı ve şifre gereklidir.");
  }

  try {
    // Firestore'dan admin bilgilerini oku (sunucu tarafı - güvenli)
    const adminRef = db.doc(`${dataPath("settings")}/admin`);
    const adminSnap = await adminRef.get();

    if (!adminSnap.exists) {
      throw new functions.https.HttpsError("not-found", "Admin ayarları bulunamadı.");
    }

    const adminData = adminSnap.data();

    if (username !== adminData.adminUsername || password !== adminData.adminPassword) {
      throw new functions.https.HttpsError("permission-denied", "Kullanıcı adı veya şifre yanlış.");
    }

    // Custom claim olarak admin: true ata
    await admin.auth().setCustomUserClaims(context.auth.uid, { admin: true });

    // Başarılı giriş logla
    console.log(`Admin girişi başarılı: UID=${context.auth.uid}`);

    return { success: true, message: "Admin doğrulaması başarılı." };

  } catch (error) {
    if (error instanceof functions.https.HttpsError) throw error;
    console.error("Admin doğrulama hatası:", error);
    throw new functions.https.HttpsError("internal", "Sunucu hatası.");
  }
});

/**
 * Admin Yetkisi Kontrol - Callable Function
 * Token yenilendikten sonra admin claim'ini doğrular
 */
exports.checkAdminStatus = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Kimlik doğrulaması gereklidir.");
  }

  const isAdmin = context.auth.token.admin === true;
  return { isAdmin };
});

/**
 * iyzico Ayarlarını Kaydetme - Server-Side (API Key'ler sunucuda kalır)
 */
exports.saveIyzicoSettings = functions.https.onCall(async (data, context) => {
  // Admin kontrolü
  if (!context.auth || context.auth.token.admin !== true) {
    throw new functions.https.HttpsError("permission-denied", "Bu işlem için admin yetkisi gereklidir.");
  }

  const { apiKey, secretKey, callbackUrl, enabled, mode } = data;

  if (!apiKey || !secretKey) {
    throw new functions.https.HttpsError("invalid-argument", "API Key ve Secret Key zorunludur.");
  }

  try {
    // iyzico ayarlarını sunucu tarafında güvenli bir yere kaydet
    // Firestore'a sadece public bilgileri yaz (key'ler hariç)
    const iyzicoPublicRef = db.doc(`${dataPath("settings")}/iyzico`);
    await iyzicoPublicRef.set({
      enabled: enabled || false,
      mode: mode || "sandbox",
      callbackUrl: callbackUrl || "",
      updatedAt: new Date().toISOString(),
      hasKeys: true // API key'leri olduğunu belirt ama key'i kaydetme
    }, { merge: true });

    // API Key'leri ayrı güvenli koleksiyonda sakla (sadece Cloud Functions erişebilir)
    const iyzicoSecureRef = db.doc("secure_config/iyzico");
    await iyzicoSecureRef.set({
      apiKey, secretKey, mode,
      updatedAt: new Date().toISOString()
    });

    return { success: true, message: "iyzico ayarları güvenli şekilde kaydedildi." };

  } catch (error) {
    console.error("iyzico ayarları kaydetme hatası:", error);
    throw new functions.https.HttpsError("internal", "Ayarlar kaydedilemedi.");
  }
});

/**
 * iyzico Ayarlarını Okuma (sadece admin) - Key'leri maskelenmiş döndürür
 */
exports.getIyzicoSettings = functions.https.onCall(async (data, context) => {
  if (!context.auth || context.auth.token.admin !== true) {
    throw new functions.https.HttpsError("permission-denied", "Admin yetkisi gereklidir.");
  }

  try {
    const secureRef = db.doc("secure_config/iyzico");
    const secureSnap = await secureRef.get();
    const publicRef = db.doc(`${dataPath("settings")}/iyzico`);
    const publicSnap = await publicRef.get();

    const secureData = secureSnap.exists ? secureSnap.data() : {};
    const publicData = publicSnap.exists ? publicSnap.data() : {};

    return {
      apiKey: secureData.apiKey ? secureData.apiKey.substring(0, 8) + "****" : "",
      secretKey: secureData.secretKey ? "****" + secureData.secretKey.slice(-4) : "",
      callbackUrl: publicData.callbackUrl || "",
      enabled: publicData.enabled || false,
      mode: publicData.mode || "sandbox"
    };

  } catch (error) {
    console.error("iyzico ayarları okuma hatası:", error);
    throw new functions.https.HttpsError("internal", "Ayarlar okunamadı.");
  }
});

/**
 * Admin Çıkış - Custom claims'i temizle
 */
exports.adminLogout = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Kimlik doğrulaması gereklidir.");
  }

  try {
    await admin.auth().setCustomUserClaims(context.auth.uid, { admin: false });
    return { success: true };
  } catch (error) {
    console.error("Admin çıkış hatası:", error);
    throw new functions.https.HttpsError("internal", "Çıkış hatası.");
  }
});

/**
 * Her gün sabah saat 9'da çalışacak şekilde zamanlanmış bir fonksiyon.
 * Bitiş tarihine 5 gün kalmış hesapları kontrol eder ve e-posta gönderilmesini tetikler.
 */
exports.hesapSuresiBildirimi = functions.pubsub
  .schedule("every day 09:00")
  .timeZone("Europe/Istanbul")
  .onRun(async (context) => {
    console.log("Hesap süre sonu kontrolü başladı.");

    const bugun = new Date();
    const hedefTarih = new Date(bugun);
    hedefTarih.setDate(bugun.getDate() + 5);

    // Doğru tarih başlangıç/bitiş (mutation yok)
    const startOfDay = new Date(hedefTarih.getFullYear(), hedefTarih.getMonth(), hedefTarih.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(hedefTarih.getFullYear(), hedefTarih.getMonth(), hedefTarih.getDate(), 23, 59, 59, 999);

    // Hedef tarih string formatları (YYYY-MM-DD)
    const hedefStr = `${hedefTarih.getFullYear()}-${String(hedefTarih.getMonth() + 1).padStart(2, "0")}-${String(hedefTarih.getDate()).padStart(2, "0")}`;

    try {
      // Doğru koleksiyon yolu (artifacts/{appId}/public/data/iptv_users)
      const usersRef = db.collection(dataPath("iptv_users"));
      const snapshot = await usersRef.get();

      if (snapshot.empty) {
        console.log("Hiç kullanıcı bulunamadı.");
        return null;
      }

      const promises = [];

      snapshot.docs.forEach((doc) => {
        const user = doc.data();
        const expiryDate = user.hesapBitisTarihi;

        if (!expiryDate) return;

        // String tarih karşılaştır (YYYY-MM-DD formatı)
        const expiryStr = typeof expiryDate === "string" ? expiryDate.substring(0, 10) : "";

        if (expiryStr === hedefStr) {
          const userEmail = user.email;
          if (!userEmail) {
            console.warn(`Kullanıcı ${doc.id} için e-posta adresi bulunamadı.`);
            return;
          }

          console.log(`${userEmail} adresine bildirim maili gönderiliyor...`);

          promises.push(
            db.collection("mail").add({
              to: userEmail,
              message: {
                subject: "Balkan TV Panel Üyeliğiniz Yakında Sona Eriyor!",
                html: `
                  <p>Merhaba ${user.iptvUsername || ""},</p>
                  <p>Balkan TV Panel üyeliğinizin süresi <strong>5 gün</strong> içinde dolacaktır.</p>
                  <p>Bitiş Tarihi: <strong>${expiryStr}</strong></p>
                  <p>Hizmetinizde herhangi bir kesinti yaşamamak için lütfen üyeliğinizi yenileyin.</p>
                  <p>Yenileme için panele giriş yapabilirsiniz: <a href="https://balkantvpanel.web.app">balkantvpanel.web.app</a></p>
                  <p>Teşekkürler,<br>Balkan TV Panel Ekibi</p>
                `,
              },
            })
          );
        }
      });

      if (promises.length === 0) {
        console.log("Bitiş süresi yaklaşan kullanıcı bulunamadı.");
        return null;
      }

      await Promise.all(promises);
      console.log(`${promises.length} kullanıcıya e-posta görevi oluşturuldu.`);

    } catch (error) {
      console.error("Hesap kontrolü sırasında bir hata oluştu:", error);
    }

    return null;
  });