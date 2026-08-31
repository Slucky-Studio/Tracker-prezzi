/**
 * La cascata: JSON-LD → microdata → meta tag → euristica sul DOM.
 * Si ferma al primo passo che dà un prezzo, ma tiene comunque nome e immagine
 * raccolti per strada. Non lancia mai: se non trova, ritorna campi a null.
 */
import * as cheerio from 'cheerio'
import { aNumero, estraiPrezzoDaTesto, riconosciValuta } from './normalizzaPrezzo.js'

const PREZZO_MIN = 0.5
const PREZZO_MAX = 1e7

export function estrai(html, urlBase = null) {
  const risultato = { nome: null, prezzo: null, valuta: null, immagine: null, fonte: null }
  if (!html || typeof html !== 'string') return risultato

  let $
  try { $ = cheerio.load(html) } catch { return risultato }

  const passi = [
    ['json-ld', daJsonLd],
    ['microdata', daMicrodata],
    ['meta', daMeta],
    ['dom', daDom]
  ]

  for (const [nomePasso, passo] of passi) {
    let trovato = null
    try { trovato = passo($) } catch { trovato = null }
    if (!trovato) continue

    if (!risultato.nome && trovato.nome) risultato.nome = ripulisciNome(trovato.nome)
    if (!risultato.immagine && trovato.immagine) risultato.immagine = trovato.immagine

    const prezzo = valido(trovato.prezzo)
    if (prezzo !== null) {
      risultato.prezzo = prezzo
      risultato.valuta = trovato.valuta || null
      risultato.fonte = nomePasso
      break
    }
  }

  // reti di sicurezza per nome e immagine
  if (!risultato.nome) {
    const titolo = $('meta[property="og:title"]').attr('content')
      || $('h1').first().text()
      || $('title').text()
    if (titolo) risultato.nome = ripulisciNome(titolo)
  }
  if (!risultato.immagine) {
    risultato.immagine = $('meta[property="og:image"]').attr('content')
      || $('meta[name="twitter:image"]').attr('content') || null
  }
  if (risultato.immagine && urlBase) {
    try { risultato.immagine = new URL(risultato.immagine, urlBase).toString() } catch {}
  }
  if (!risultato.valuta && risultato.prezzo !== null) {
    risultato.valuta = riconosciValuta($('body').text().slice(0, 4000)) || null
  }

  return risultato
}

function valido(n) {
  const v = aNumero(n)
  if (v === null || v < PREZZO_MIN || v > PREZZO_MAX) return null
  return v
}

function ripulisciNome(grezzo) {
  let n = String(grezzo).replace(/\s+/g, ' ').trim()
  // "Prodotto | Negozio" → "Prodotto", ma solo se resta un nome vero
  for (const sep of [' | ', ' – ', ' — ', ' - ']) {
    const i = n.indexOf(sep)
    if (i >= 12) { n = n.slice(0, i).trim(); break }
  }
  return n.slice(0, 200)
}

/* ----------------------------- 1. JSON-LD ----------------------------- */

function daJsonLd($) {
  const blocchi = $('script[type="application/ld+json"]').toArray()
  for (const b of blocchi) {
    let dati
    try { dati = JSON.parse($(b).text()) } catch { continue }
    const prodotto = cercaProdotto(dati)
    if (!prodotto) continue

    const offerta = primaOfferta(prodotto.offers)
    const prezzo = offerta ? (offerta.price ?? offerta.lowPrice ?? offerta.highPrice) : null
    return {
      nome: testoDi(prodotto.name),
      prezzo,
      valuta: offerta?.priceCurrency || null,
      immagine: immagineDi(prodotto.image)
    }
  }
  return null
}

function cercaProdotto(nodo, profondita = 0) {
  if (!nodo || profondita > 6) return null
  if (Array.isArray(nodo)) {
    for (const n of nodo) { const t = cercaProdotto(n, profondita + 1); if (t) return t }
    return null
  }
  if (typeof nodo !== 'object') return null

  const tipo = nodo['@type']
  const tipi = Array.isArray(tipo) ? tipo : [tipo]
  if (tipi.some(t => typeof t === 'string' && /product|offer|vehicle|book/i.test(t)) && (nodo.offers || nodo.price)) {
    return nodo.offers ? nodo : { ...nodo, offers: { price: nodo.price, priceCurrency: nodo.priceCurrency } }
  }

  for (const chiave of ['@graph', 'mainEntity', 'itemListElement', 'hasVariant']) {
    if (nodo[chiave]) { const t = cercaProdotto(nodo[chiave], profondita + 1); if (t) return t }
  }
  return null
}

function primaOfferta(offers) {
  if (!offers) return null
  const lista = Array.isArray(offers) ? offers : [offers]
  for (const o of lista) {
    if (!o || typeof o !== 'object') continue
    if (o.price ?? o.lowPrice ?? o.highPrice) return o
    if (o.offers) { const dentro = primaOfferta(o.offers); if (dentro) return dentro }
  }
  return null
}

function testoDi(v) {
  if (typeof v === 'string') return v
  if (v && typeof v === 'object') return v['@value'] || v.name || null
  return null
}

function immagineDi(v) {
  if (typeof v === 'string') return v
  if (Array.isArray(v)) return immagineDi(v[0])
  if (v && typeof v === 'object') return v.url || v.contentUrl || null
  return null
}

/* ---------------------------- 2. Microdata ---------------------------- */

function daMicrodata($) {
  const nodo = $('[itemprop="price"]').first()
  if (!nodo.length) return null
  const grezzo = nodo.attr('content') || nodo.attr('data-price') || nodo.text()
  const valuta = $('[itemprop="priceCurrency"]').first().attr('content')
    || riconosciValuta(nodo.parent().text().slice(0, 200))
  return {
    nome: $('[itemprop="name"]').first().text() || null,
    prezzo: grezzo,
    valuta: valuta || null,
    immagine: $('[itemprop="image"]').first().attr('content')
      || $('[itemprop="image"]').first().attr('src') || null
  }
}

/* ------------------------------ 3. Meta ------------------------------- */

const META_PREZZO = [
  'meta[property="product:price:amount"]',
  'meta[property="og:price:amount"]',
  'meta[name="product:price:amount"]',
  'meta[itemprop="price"]',
  'meta[property="og:product:price:amount"]'
]

function daMeta($) {
  let prezzo = null
  for (const sel of META_PREZZO) {
    const v = $(sel).attr('content')
    if (v) { prezzo = v; break }
  }
  const valuta = $('meta[property="product:price:currency"]').attr('content')
    || $('meta[property="og:price:currency"]').attr('content')
    || $('meta[itemprop="priceCurrency"]').attr('content')
  if (!prezzo && !valuta) return null
  return {
    nome: $('meta[property="og:title"]').attr('content') || null,
    prezzo,
    valuta: valuta || null,
    immagine: $('meta[property="og:image"]').attr('content') || null
  }
}

/* ------------------------- 4. Euristica sul DOM ----------------------- */

// in ordine di fiducia decrescente
const SELETTORI = [
  '[data-price]', '[data-product-price]', '[data-testid*="price" i]',
  '.price', '.prezzo', '.product-price', '.current-price', '.sale-price',
  '[class*="price" i]', '[id*="price" i]', '[class*="prezzo" i]'
]

// prezzi barrati o vecchi: da scartare
const SCARTA = 'del, s, strike, [class*="old" i], [class*="strike" i], [class*="was" i], ' +
  '[class*="barrat" i], [class*="listino" i], [class*="list-price" i], [class*="regular" i], ' +
  '[class*="compare" i], [class*="crossed" i], [class*="rrp" i]'

function daDom($) {
  for (const selettore of SELETTORI) {
    const nodi = $(selettore).toArray().slice(0, 60)
    for (const nodo of nodi) {
      const el = $(nodo)
      if (el.is(SCARTA) || el.closest(SCARTA).length) continue

      const attributo = el.attr('data-price') || el.attr('data-product-price')
      const dallAttributo = attributo ? estraiPrezzoDaTesto(attributo) : null
      if (dallAttributo) return { prezzo: dallAttributo.prezzo, valuta: dallAttributo.valuta }

      const testo = el.text().replace(/\s+/g, ' ').trim()
      if (!testo || testo.length > 90) continue
      const trovato = estraiPrezzoDaTesto(testo)
      if (trovato) return { prezzo: trovato.prezzo, valuta: trovato.valuta }
    }
  }
  return null
}
