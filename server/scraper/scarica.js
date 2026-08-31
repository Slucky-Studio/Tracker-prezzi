/**
 * Scarica una pagina come farebbe un browser desktop.
 * Timeout 15s, massimo 2 tentativi, poi si arrende in silenzio.
 * Non lancia: ritorna sempre un esito leggibile.
 */

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

const INTESTAZIONI = {
  'User-Agent': UA,
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'it-IT,it;q=0.9,en;q=0.7',
  'Cache-Control': 'no-cache',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none'
}

const SEGNI_DI_BLOCCO = [
  'captcha', 'robot check', 'sei un robot', 'are you a human', 'access denied',
  'cf-browser-verification', 'attention required', 'unusual traffic', 'bot detection'
]

const LIMITE_BYTE = 4 * 1024 * 1024

export async function scarica(url, { timeout = 15000, tentativi = 2 } = {}) {
  let ultimo = { ok: false, stato: 'fallito', motivo: 'nessun tentativo' }

  for (let n = 0; n < tentativi; n++) {
    if (n > 0) await attendi(1500 + Math.random() * 1500)
    try {
      const risposta = await fetch(url, {
        headers: INTESTAZIONI,
        redirect: 'follow',
        signal: AbortSignal.timeout(timeout)
      })

      if ([403, 429, 503].includes(risposta.status)) {
        return { ok: false, stato: 'bloccato', motivo: `il sito risponde ${risposta.status}` }
      }
      if (!risposta.ok) {
        ultimo = { ok: false, stato: 'fallito', motivo: `risposta ${risposta.status}` }
        continue
      }

      const tipo = risposta.headers.get('content-type') || ''
      if (!/text\/html|application\/xhtml|text\/plain/i.test(tipo)) {
        return { ok: false, stato: 'fallito', motivo: `la pagina non è HTML (${tipo.split(';')[0]})` }
      }

      const html = (await risposta.text()).slice(0, LIMITE_BYTE)
      const spia = html.slice(0, 6000).toLowerCase()
      if (html.length < 2500 && SEGNI_DI_BLOCCO.some(s => spia.includes(s))) {
        return { ok: false, stato: 'bloccato', motivo: 'la pagina chiede una verifica anti-bot' }
      }

      return { ok: true, stato: 'ok', html, urlFinale: risposta.url || url }
    } catch (e) {
      const scaduto = e?.name === 'TimeoutError' || e?.name === 'AbortError'
      ultimo = {
        ok: false,
        stato: 'fallito',
        motivo: scaduto ? 'tempo scaduto' : (e?.message || 'errore di rete')
      }
    }
  }
  return ultimo
}

export function attendi(ms) {
  return new Promise(r => setTimeout(r, ms))
}
