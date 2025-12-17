// Service Worker for Ticket Scanner PWA
// This is a basic service worker - next-pwa will enhance it

const CACHE_NAME = 'ticket-scanner-v1'
const urlsToCache = [
  '/',
  '/admin/scanner',
  '/manifest.json',
]

// Install event - cache resources
self.addEventListener('install', (event: any) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache)
    })
  )
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener('activate', (event: any) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName: string) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
  return self.clients.claim()
})

// Fetch event - NetworkFirst strategy for API, CacheFirst for static assets
self.addEventListener('fetch', (event: any) => {
  const { request } = event
  const url = new URL(request.url)

  // API requests - NetworkFirst
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone response for caching
          const responseToCache = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache)
          })
          return response
        })
        .catch(() => {
          // Network failed, try cache
          return caches.match(request)
        })
    )
    return
  }

  // Static assets - CacheFirst
  event.respondWith(
    caches.match(request).then((response) => {
      return response || fetch(request)
    })
  )
})

// Message handler for sync requests
self.addEventListener('message', (event: any) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

