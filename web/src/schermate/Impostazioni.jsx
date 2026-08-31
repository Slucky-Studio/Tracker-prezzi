import { useEffect, useRef, useState } from 'react'
import './Impostazioni.css'
import Vetro, { Pannello } from '../components/Vetro'
import { SFONDI } from '../data/sfondi'
import { archivio, scaricaEsportazione, stimaSpazio } from '../archivio'

const VALUTE = ['EUR', 'USD', 'GBP', 'CHF']

function formattaByte(n) {
  if (!n) return null
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

export default function Impostazioni({ dati, onIndietro, onCambiato }) {
  const imp = dati.impostazioni
  const [messaggio, setMessaggio] = useState(null)
  const [spazio, setSpazio] = useState(null)
  const [inArrivo, setInArrivo] = useState(null)   // { dati, quanti, nomeFile }
  const [esportando, setEsportando] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => { stimaSpazio().then(setSpazio) }, [dati.prodotti.length])

  async function cambia(campi, testo) {
    try {
      await archivio.impostazioni(campi)
      await onCambiato()
      if (testo) setMessaggio(testo)
    } catch (e) {
      setMessaggio(e.message)
    }
  }

  function leggiFile(file) {
    if (!file) return
    setMessaggio(null); setInArrivo(null)
    const lettore = new FileReader()
    lettore.onload = () => {
      try {
        const contenuto = JSON.parse(lettore.result)
        if (!contenuto || !Array.isArray(contenuto.prodotti)) {
          throw new Error('Questo file non è un export di Soglia: manca la lista dei prodotti.')
        }
        setInArrivo({ dati: contenuto, quanti: contenuto.prodotti.length, nomeFile: file.name })
      } catch (e) {
        setMessaggio(e instanceof SyntaxError
          ? 'Questo file non è JSON valido. I tuoi dati non sono stati toccati.'
          : `${e.message} I tuoi dati non sono stati toccati.`)
      }
    }
    lettore.onerror = () => setMessaggio('Non riesco a leggere il file.')
    lettore.readAsText(file)
  }

  async function importa(modalita) {
    try {
      const r = await archivio.importa(inArrivo.dati, modalita)
      setInArrivo(null)
      await onCambiato()
      setMessaggio(`Importati. Ora sono ${r.prodotti} prodotti.`)
    } catch (e) {
      setMessaggio(`${e.message} I tuoi dati non sono stati toccati.`)
    }
  }

  async function esporta() {
    setEsportando(true)
    try { await scaricaEsportazione() }
    catch { setMessaggio('Non sono riuscito a preparare il file. Riprova.') }
    finally { setEsportando(false) }
  }

  return (
    <div className="dettaglio">
      <div className="dettaglio-testa">
        <button className="bottone piatto" onClick={onIndietro}>← Elenco</button>
      </div>

      <Vetro className="sezione entra">
        <div className="t-etichetta sezione-titolo">Valuta</div>
        <div className="scelte">
          {VALUTE.map(v => (
            <button
              key={v}
              className={`bottone valuta ${imp.valuta === v ? 'scelto' : ''}`}
              onClick={() => cambia({ valuta: v }, 'Salvato')}
            >
              {v}
            </button>
          ))}
        </div>
      </Vetro>

      <Vetro className="sezione">
        <div className="t-etichetta sezione-titolo">Sfondo</div>
        <div className="sfondi-scelta">
          {SFONDI.map(s => (
            <button
              key={s.id}
              className={`miniatura ${imp.sfondo === s.id ? 'attiva' : ''}`}
              onClick={() => cambia({ sfondo: s.id }, 'Salvato')}
              title={s.nome}
            >
              <span className="miniatura-tela" style={{ background: s.gradiente }} />
              <span className="t-etichetta">{s.nome}</span>
            </button>
          ))}
        </div>
      </Vetro>

      <Vetro className="sezione">
        <div className="t-etichetta sezione-titolo">Export e import</div>
        <div className="scelte">
          <button className="bottone" onClick={esporta} disabled={esportando}>
            {esportando ? 'Preparo il file…' : 'Esporta JSON'}
          </button>
          <button className="bottone" onClick={() => fileRef.current?.click()}>Importa JSON</button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={e => { leggiFile(e.target.files?.[0]); e.target.value = '' }}
        />
        {inArrivo && (
          <Pannello className="sezione" style={{ padding: 'var(--s4)' }}>
            <div className="t-corpo">
              {inArrivo.nomeFile}: {inArrivo.quanti} {inArrivo.quanti === 1 ? 'prodotto' : 'prodotti'}.
              Unisci tiene quello che hai già; sostituisci mette al suo posto l'archivio importato.
            </div>
            <div className="scelte">
              <button className="bottone" onClick={() => importa('unisci')}>Unisci</button>
              <button className="bottone" onClick={() => importa('sostituisci')}>Sostituisci</button>
              <button className="bottone piatto" onClick={() => setInArrivo(null)}>Annulla</button>
            </div>
          </Pannello>
        )}
        <div className="t-corpo">
          Il file esportato contiene tutto, immagini comprese: è il tuo backup completo
          e il modo di spostare l'archivio su un altro telefono.
        </div>
      </Vetro>

      <Vetro className="sezione">
        <div className="t-etichetta sezione-titolo">Dove stanno i dati</div>
        <Pannello className="messaggio">
          Solo su questo dispositivo, nella memoria del browser. Nessun account, nessun cloud.
        </Pannello>
        <div className="t-corpo">
          {dati.prodotti.length} {dati.prodotti.length === 1 ? 'prodotto' : 'prodotti'}
          {spazio?.usage ? ` · circa ${formattaByte(spazio.usage)} occupati` : ''}.
          Se disinstalli l'app o cancelli i dati del browser, questo archivio sparisce:
          esportalo ogni tanto.
        </div>
      </Vetro>

      {messaggio && <Pannello className="messaggio">{messaggio}</Pannello>}
    </div>
  )
}
