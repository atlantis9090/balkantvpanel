const CACHE_NAME = 'balkan-iptv-v5';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-72.png',
  '/icons/icon-96.png',
  '/icons/icon-128.png',
  '/icons/icon-144.png',
  '/icons/icon-152.png',
  '/icons/icon-384.png'
];

// CDN kaynakları - cache-first stratejisi
const CDN_CACHE_NAME = 'balkan-iptv-cdn-v2';
const CDN_PATTERNS = [
  'cdn.tailwindcss.com',
  'cdn.jsdelivr.net',
  'cdnjs.cloudflare.com',
  'npmcdn.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'www.gstatic.com/firebasejs'
];

// Yükleme - statik dosyaları önbelleğe al
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('Bazı kaynaklar önbelleğe alınamadı:', err);
      });
    })
  );
  self.skipWaiting();
});

// Aktivasyon - eski önbellekleri temizle
self.addEventListener('activate', (event) => {
  const validCaches = [CACHE_NAME, CDN_CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => !validCaches.includes(name))
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch - Akıllı cache stratejisi
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Sadece http/https isteklerini ele al (chrome-extension vb. atla)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return;
  }

  // POST isteklerini cache'leme
  if (request.method !== 'GET') {
    return;
  }

  // CDN kaynakları - Cache first (SDK, CSS, fontlar)
  if (CDN_PATTERNS.some(p => request.url.includes(p))) {
    event.respondWith(
      caches.open(CDN_CACHE_NAME).then(cache =>
        cache.match(request).then(cached => {
          if (cached) return cached;
          return fetch(request).then(response => {
            if (response.status === 200) cache.put(request, response.clone());
            return response;
          });
        })
      )
    );
    return;
  }

  // Firebase API isteklerini cache'leme (her zaman ağdan gelsin)
  if (request.url.includes('firebaseio.com') || 
      request.url.includes('firestore.googleapis.com') ||
      request.url.includes('identitytoolkit') ||
      request.url.includes('securetoken') ||
      request.url.includes('cloudfunctions.net')) {
    return;
  }

  // Diğer GET istekleri: Network first, cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.status === 200 && response.type === 'basic') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (request.mode === 'navigate') {
            return caches.match('/index.html');
          }
        });
      })
  );
});

// =========================================
// PUSH NOTIFICATION HANDLER
// =========================================
self.addEventListener('push', (event) => {
  let data = { title: 'Balkan IPTV', body: 'Yeni bir bildiriminiz var.' };
  
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    if (event.data) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body || 'Yeni bir bildiriminiz var.',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    vibrate: [100, 50, 100],
    tag: data.tag || 'general',
    renotify: true,
    data: {
      url: data.url || '/',
      dateOfArrival: Date.now()
    },
    actions: data.actions || []
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Balkan IPTV', options)
  );
});

// Bildirime tıklandığında
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Zaten açık sekme varsa odaklan
      for (const client of windowClients) {
        if (client.url.includes('balkantvpanel') && 'focus' in client) {
          return client.focus();
        }
      }
      // Yoksa yeni sekme aç
      return clients.openWindow(urlToOpen);
    })
  );
});

// Arka plan senkronizasyonu (gelecekte offline talep desteği için)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-requests') {
    console.log('[SW] Arka plan senkronizasyonu tetiklendi');
  }
});
