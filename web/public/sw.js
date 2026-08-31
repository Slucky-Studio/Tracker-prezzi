/**
 * Service worker minimo: rende l'app installabile e utilizzabile offline.
 * Nessuna lista di file da tenere aggiornata — la cache si riempie da sola
 * al primo utilizzo, così sopravvive ai nomi con hash della build di Vite.
 *
 * Navigazione: prova la rete, cade sulla copia in cache se non c'è linea.
 * Il resto (JS, CSS, icone, motore OCR): serve dalla cache se c'è già,
 * e intanto la rinfresca in background.
 */
const CACHE = 'soglia-v1'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys().then(nomi => Promise.all(
      nomi.filter(n => n !== CACHE).map(n => caches.delete(n))
    ))
  )
  self.clients.claim()
})

self.addEventListener('fetch', (evento) => {
  const { request } = evento
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    evento.respondWith(
      fetch(request)
        .then(risposta => {
          caches.open(CACHE).then(c => c.put(request, risposta.clone()))
          return risposta
        })
        .catch(() => caches.match(request).then(r => r || caches.match(self.registration.scope)))
    )
    return
  }

  evento.respondWith(
    caches.match(request).then(dallaCache => {
      const dallaRete = fetch(request)
        .then(risposta => {
          if (risposta.ok) caches.open(CACHE).then(c => c.put(request, risposta.clone()))
          return risposta
        })
        .catch(() => dallaCache)
      return dallaCache || dallaRete
    })
  )
})
