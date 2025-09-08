const CACHE_NAME = 'sleepatra-v1.2.0';
const STATIC_CACHE_NAME = 'sleepatra-static-v1.2.0';
const AUDIO_CACHE_NAME = 'sleepatra-audio-v1.2.0';

// Files to cache immediately
const STATIC_FILES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Outfit:wght@400;600&display=swap'
];

// Audio files to cache
const AUDIO_FILES = [
  '/sounds/528hz.mp3',
  '/sounds/396hz.mp3', 
  '/sounds/432hz.mp3',
  '/sounds/theta.mp3',
  '/sounds/852hz.mp3',
  '/sounds/741hz.mp3'
];

// Install event - cache static resources
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...');
  
  event.waitUntil(
    Promise.all([
      // Cache static files
      caches.open(STATIC_CACHE_NAME).then((cache) => {
        console.log('📦 Caching static files...');
        return cache.addAll(STATIC_FILES).catch(err => {
          console.error('Failed to cache static files:', err);
          // Continue anyway - some files might not exist yet
        });
      }),
      
      // Cache audio files
      caches.open(AUDIO_CACHE_NAME).then((cache) => {
        console.log('🎵 Caching audio files...');
        return Promise.allSettled(
          AUDIO_FILES.map(url => 
            cache.add(url).catch(err => {
              console.warn(`Failed to cache audio: ${url}`, err);
              return null;
            })
          )
        );
      })
    ]).then(() => {
      console.log('✅ Service Worker installed successfully');
      // Skip waiting to activate immediately
      return self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete old caches
          if (cacheName !== STATIC_CACHE_NAME && 
              cacheName !== AUDIO_CACHE_NAME &&
              cacheName.startsWith('sleepatra-')) {
            console.log('🗑️ Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('✅ Service Worker activated');
      // Claim all clients immediately
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Skip non-GET requests and chrome-extension URLs
  if (event.request.method !== 'GET' || url.protocol === 'chrome-extension:') {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Return cached version if available
      if (cachedResponse) {
        console.log('📦 Serving from cache:', event.request.url);
        return cachedResponse;
      }

      // Network request with error handling
      return fetch(event.request)
        .then((response) => {
          // Don't cache failed requests
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone the response since it can only be consumed once
          const responseToCache = response.clone();
          
          // Cache audio files
          if (event.request.url.includes('/sounds/')) {
            caches.open(AUDIO_CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          // Cache other resources
          else if (event.request.url.includes(self.location.origin)) {
            caches.open(STATIC_CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }

          return response;
        })
        .catch((error) => {
          console.error('🌐 Network request failed:', event.request.url, error);
          
          // Return offline fallback for navigation requests
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html').then((cachedPage) => {
              return cachedPage || new Response(
                '<html><body><h1>Offline</h1><p>SleepAura is not available offline yet.</p></body></html>',
                { headers: { 'Content-Type': 'text/html' } }
              );
            });
          }
          
          // For audio files, return a generic error
          if (event.request.url.includes('/sounds/')) {
            return new Response(
              JSON.stringify({ error: 'Audio not available offline' }),
              { 
                status: 503,
                headers: { 'Content-Type': 'application/json' }
              }
            );
          }
          
          throw error;
        });
    })
  );
});

// Handle background sync for analytics or usage data
self.addEventListener('sync', (event) => {
  console.log('🔄 Background sync triggered:', event.tag);
  
  if (event.tag === 'usage-sync') {
    event.waitUntil(syncUsageData());
  }
});

// Handle push notifications (for sleep reminders)
self.addEventListener('push', (event) => {
  console.log('📱 Push notification received');
  
  const options = {
    body: event.data ? event.data.text() : 'Time for your sleep session 🌙',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    vibrate: [200, 100, 200],
    tag: 'sleep-reminder',
    actions: [
      {
        action: 'start-session',
        title: 'Start Session',
        icon: '/icons/icon-192.png'
      },
      {
        action: 'snooze',
        title: 'Remind in 30min',
        icon: '/icons/icon-192.png'
      }
    ],
    data: {
      url: '/',
      timestamp: Date.now()
    }
  };

  event.waitUntil(
    self.registration.showNotification('SleepAura 🌙', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Notification clicked:', event.action);
  
  event.notification.close();

  if (event.action === 'start-session') {
    event.waitUntil(
      clients.openWindow('/?notification=start')
    );
  } else if (event.action === 'snooze') {
    // Schedule another notification in 30 minutes
    setTimeout(() => {
      self.registration.showNotification('SleepAura 🌙', {
        body: 'Ready for your sleep session now? 😴',
        icon: '/icons/icon-192.png',
        tag: 'sleep-reminder-snooze'
      });
    }, 30 * 60 * 1000);
  } else {
    // Default click - open app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Utility function to sync usage data
async function syncUsageData() {
  try {
    // This would sync any stored usage data when back online
    console.log('📊 Syncing usage data...');
    // Implementation depends on your backend
  } catch (error) {
    console.error('Failed to sync usage data:', error);
  }
}

// Message handler for communication with main app
self.addEventListener('message', (event) => {
  console.log('📨 Message received:', event.data);
  
  if (event.data && event.data.type) {
    switch (event.data.type) {
      case 'CACHE_AUDIO':
        cacheAudioFile(event.data.url);
        break;
      case 'GET_CACHE_STATUS':
        getCacheStatus().then(status => {
          event.ports[0].postMessage({ type: 'CACHE_STATUS', data: status });
        });
        break;
      case 'CLEAR_CACHE':
        clearCache().then(() => {
          event.ports[0].postMessage({ type: 'CACHE_CLEARED' });
        });
        break;
    }
  }
});

// Utility functions
async function cacheAudioFile(url) {
  try {
    const cache = await caches.open(AUDIO_CACHE_NAME);
    await cache.add(url);
    console.log('🎵 Audio cached:', url);
  } catch (error) {
    console.error('Failed to cache audio:', url, error);
  }
}

async function getCacheStatus() {
  try {
    const cacheNames = await caches.keys();
    const status = {};
    
    for (const cacheName of cacheNames) {
      if (cacheName.startsWith('sleepatra-')) {
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();
        status[cacheName] = keys.length;
      }
    }
    
    return status;
  } catch (error) {
    console.error('Failed to get cache status:', error);
    return {};
  }
}

async function clearCache() {
  try {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map(cacheName => {
        if (cacheName.startsWith('sleepatra-')) {
          return caches.delete(cacheName);
        }
      })
    );
    console.log('🗑️ All caches cleared');
  } catch (error) {
    console.error('Failed to clear cache:', error);
  }
}
