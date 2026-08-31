/** node --test server/scraper/prove — nessuna dipendenza esterna. */
import test from 'node:test'
import assert from 'node:assert/strict'
import { aNumero, estraiPrezzoDaTesto, riconosciValuta } from '../normalizzaPrezzo.js'
import { estrai } from '../estrai.js'

test('normalizza i formati di prezzo', () => {
  const casi = [
    ['1.299,00 €', 1299], ['€ 1.299', 1299], ['1299,00', 1299], ['1 299,00 €', 1299],
    ['$1,299.00', 1299], ['45,99 €', 45.99], ['45.99', 45.99], ['1.50', 1.5],
    ['12.345,67', 12345.67], ['12,345.67', 12345.67], ['1.234.567,89', 1234567.89],
    ['999', 999], ['EUR 89,90', 89.9], ['prezzo: 2.499,99€ IVA inclusa', 2499.99]
  ]
  for (const [testo, atteso] of casi) {
    assert.equal(estraiPrezzoDaTesto(testo)?.prezzo, atteso, testo)
  }
})

test('riconosce la valuta', () => {
  assert.equal(riconosciValuta('1.299,00 €'), 'EUR')
  assert.equal(riconosciValuta('$12'), 'USD')
  assert.equal(riconosciValuta('12 GBP'), 'GBP')
  assert.equal(riconosciValuta('senza simbolo'), null)
})

test('testo senza numeri non inventa prezzi', () => {
  assert.equal(estraiPrezzoDaTesto('disponibile in negozio'), null)
  assert.equal(aNumero('ciao'), null)
})

test('cascata: JSON-LD ha la precedenza', () => {
  const html = `<html><head>
    <script type="application/ld+json">
    {"@type":"Product","name":"Monitor Dell 27","image":["/img/a.jpg"],
     "offers":{"@type":"Offer","price":"341.00","priceCurrency":"EUR"}}
    </script></head><body><div class="price">999,00 €</div></body></html>`
  const r = estrai(html, 'https://esempio.it/p')
  assert.equal(r.prezzo, 341)
  assert.equal(r.fonte, 'json-ld')
  assert.equal(r.immagine, 'https://esempio.it/img/a.jpg')
})

test('cascata: microdata quando manca JSON-LD', () => {
  const html = `<div itemscope><span itemprop="name">Sedia</span>
    <span itemprop="price" content="640.00">640,00 €</span>
    <meta itemprop="priceCurrency" content="EUR"></div>`
  const r = estrai(html)
  assert.equal(r.prezzo, 640)
  assert.equal(r.fonte, 'microdata')
})

test('cascata: meta tag Open Graph', () => {
  const html = `<head><meta property="og:title" content="Cuffie XM5">
    <meta property="product:price:amount" content="289.99">
    <meta property="product:price:currency" content="EUR"></head>`
  const r = estrai(html)
  assert.equal(r.prezzo, 289.99)
  assert.equal(r.fonte, 'meta')
})

test('euristica DOM: scarta i prezzi barrati', () => {
  const html = `<html><head><title>Tastiera meccanica - Sito</title></head><body>
    <del class="old-price">199,00 €</del><div class="price">149,90 €</div></body></html>`
  const r = estrai(html)
  assert.equal(r.prezzo, 149.9)
  assert.equal(r.nome, 'Tastiera meccanica')
})

test('pagina senza prezzo non è un errore', () => {
  const r = estrai('<html><head><title>Pagina qualsiasi</title></head><body><p>ciao</p></body></html>')
  assert.equal(r.prezzo, null)
  assert.equal(r.nome, 'Pagina qualsiasi')
})
