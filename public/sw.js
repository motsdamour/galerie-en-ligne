const CACHE_NAME = 'mots-damour-v1'

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim())
})

self.addEventListener('fetch', (event) => {
  // Ne rien intercepter - laisser toutes les requêtes passer normalement
  return
})
