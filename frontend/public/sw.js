// Service Worker for Punjabi Religious Reader
// Provides offline reading capability and caching strategy

const CACHE_NAME = 'punjabi-reader-v1';
const STATIC_CACHE = 'punjabi-reader-static-v1';
const PAGES_CACHE = 'punjabi-reader-pages-v1';

// Static assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  // Add other static assets as needed
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        // Skip waiting to activate immediately
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Delete old caches that don't match current version
            if (cacheName !== CACHE_NAME && 
                cacheName !== STATIC_CACHE && 
                cacheName !== PAGES_CACHE) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        // Take control of all clients immediately
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle page image requests with cache-first strategy
  if (url.pathname.includes('/api/pages/') || url.pathname.includes('placeholder')) {
    event.respondWith(
      caches.open(PAGES_CACHE)
        .then((cache) => {
          return cache.match(request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                console.log('Serving page from cache:', url.pathname);
                return cachedResponse;
              }

              // Not in cache, fetch from network
              return fetch(request)
                .then((networkResponse) => {
                  // Cache successful responses
                  if (networkResponse.ok) {
                    console.log('Caching page:', url.pathname);
                    cache.put(request, networkResponse.clone());
                  }
                  return networkResponse;
                })
                .catch((error) => {
                  console.error('Failed to fetch page:', error);
                  // Return a fallback offline page if available
                  return cache.match('/offline-page.html') || 
                         new Response('Page unavailable offline', { 
                           status: 503, 
                           statusText: 'Service Unavailable' 
                         });
                });
            });
        })
    );
    return;
  }

  // Handle static assets with cache-first strategy
  if (request.destination === 'script' || 
      request.destination === 'style' || 
      request.destination === 'document') {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }

          return fetch(request)
            .then((networkResponse) => {
              // Cache successful responses
              if (networkResponse.ok) {
                caches.open(STATIC_CACHE)
                  .then((cache) => {
                    cache.put(request, networkResponse.clone());
                  });
              }
              return networkResponse;
            });
        })
    );
    return;
  }

  // Handle API requests with network-first strategy
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          // Cache successful GET requests
          if (request.method === 'GET' && networkResponse.ok) {
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(request, networkResponse.clone());
              });
          }
          return networkResponse;
        })
        .catch(() => {
          // Fallback to cache for GET requests
          if (request.method === 'GET') {
            return caches.match(request);
          }
          throw new Error('Network unavailable');
        })
    );
    return;
  }

  // Default: network-first for everything else
  event.respondWith(
    fetch(request)
      .catch(() => {
        return caches.match(request);
      })
  );
});

// Handle background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync-bookmarks') {
    event.waitUntil(syncBookmarks());
  }
});

// Sync bookmarks when back online
async function syncBookmarks() {
  try {
    // Get pending bookmark actions from IndexedDB
    const pendingActions = await getPendingBookmarkActions();
    
    for (const action of pendingActions) {
      try {
        await fetch('/api/navigation/bookmark', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(action.data),
        });
        
        // Remove from pending actions after successful sync
        await removePendingBookmarkAction(action.id);
      } catch (error) {
        console.error('Failed to sync bookmark action:', error);
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Helper functions for IndexedDB operations (simplified)
async function getPendingBookmarkActions() {
  // In a real implementation, this would use IndexedDB
  return [];
}

async function removePendingBookmarkAction(id) {
  // In a real implementation, this would remove from IndexedDB
  console.log('Removing pending action:', id);
}

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'PRELOAD_PAGES') {
    const { pages } = event.data;
    preloadPages(pages);
  }
});

// Preload pages for better performance
async function preloadPages(pageNumbers) {
  try {
    const cache = await caches.open(PAGES_CACHE);
    
    for (const pageNumber of pageNumbers) {
      const imageUrl = `/api/pages/${pageNumber}/image`;
      const request = new Request(imageUrl);
      
      // Check if already cached
      const cachedResponse = await cache.match(request);
      if (!cachedResponse) {
        try {
          const response = await fetch(request);
          if (response.ok) {
            await cache.put(request, response);
            console.log('Preloaded page:', pageNumber);
          }
        } catch (error) {
          console.warn('Failed to preload page:', pageNumber, error);
        }
      }
    }
  } catch (error) {
    console.error('Preload pages failed:', error);
  }
}