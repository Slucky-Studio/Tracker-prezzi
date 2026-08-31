import { useCallback, useEffect, useState } from 'react'
import './App.css'
import Sfondo from './components/Sfondo'
import Vetro from './components/Vetro'
import AggiungiProdotto from './components/AggiungiProdotto'
import Elenco from './schermate/Elenco'
import Dettaglio from './schermate/Dettaglio'
import Impostazioni from './schermate/Impostazioni'
import { api } from './api'

/** Rotta dall'hash: torna indietro col tasto del telefono. */
function leggiRotta() {
  const h = window.location.hash.replace(/^#\/?/, '')
  if (h === 'impostazioni') return { nome: 'impostazioni' }
  if (h.startsWith('p/')) return { nome: 'dettaglio', id: h.slice(2) }
  return { nome: 'elenco' }
}

export default function App() {
  const [dati, setDati] = useState(null)
  const [errore, setErrore] = useState(null)
  const [rotta, setRotta] = useState(leggiRotta)
  const [aggiungi, setAggiungi] = useState(false)
  const [controllando, setControllando] = useState(false)

  const carica = useCallback(async () => {
    try {
      setDati(await api.stato())
      setErrore(null)
    } catch (e) {
      setErrore(e.message)
    }
  }, [])

  useEffect(() => { carica() }, [carica])

  useEffect(() => {
    const cambio = () => setRotta(leggiRotta())
    window.addEventListener('hashchange', cambio)
    return () => window.removeEventListener('hashchange', cambio)
  }, [])

  const vai = (hash) => { window.location.hash = hash }

  async function controllaTutti() {
    setControllando(true)
    try { await api.controllaTutti(); await carica() }
    catch (e) { setErrore(e.message) }
    finally { setControllando(false) }
  }

  const sfondo = dati?.impostazioni?.sfondo || 'notturno'
  const prodotto = rotta.nome === 'dettaglio'
    ? dati?.prodotti.find(p => p.id === rotta.id)
    : null

  return (
    <>
      <Sfondo id={sfondo} />
      <div className="guscio">
        {!dati && !errore && (
          <Vetro className="vuoto entra"><div className="t-corpo">Carico l'archivio…</div></Vetro>
        )}

        {errore && (
          <Vetro className="vuoto entra">
            <div className="t-titolo">Non riesco a leggere i dati.</div>
            <div className="t-corpo">{errore}</div>
            <button className="bottone primario" onClick={carica}>Riprova</button>
          </Vetro>
        )}

        {dati && rotta.nome === 'elenco' && (
          <Elenco
            dati={dati}
            onApri={(p) => vai(`/p/${p.id}`)}
            onAggiungi={() => setAggiungi(true)}
            onImpostazioni={() => vai('/impostazioni')}
            onControllaTutti={controllaTutti}
            controllando={controllando}
          />
        )}

        {dati && rotta.nome === 'impostazioni' && (
          <Impostazioni dati={dati} onIndietro={() => vai('/')} onCambiato={carica} />
        )}

        {dati && rotta.nome === 'dettaglio' && (
          prodotto ? (
            <Dettaglio
              prodotto={prodotto}
              valuta={dati.impostazioni.valuta}
              onIndietro={() => vai('/')}
              onCambiato={carica}
            />
          ) : (
            <Vetro className="vuoto entra">
              <div className="t-titolo">Questo prodotto non c'è più.</div>
              <button className="bottone primario" onClick={() => vai('/')}>Torna all'elenco</button>
            </Vetro>
          )
        )}

        {aggiungi && (
          <AggiungiProdotto
            onChiudi={() => setAggiungi(false)}
            onFatto={async (p, opzioni) => { await carica(); if (!opzioni?.resta) vai(`/p/${p.id}`) }}
          />
        )}
      </div>
    </>
  )
}
