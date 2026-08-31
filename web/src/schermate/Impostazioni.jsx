import { useEffect, useRef, useState } from 'react'
import './Impostazioni.css'
import Vetro, { Pannello } from '../components/Vetro'
import { SFONDI } from '../data/sfondi'
import { api } from '../api'

const FREQUENZE = [
  { id: 'giornaliero', etichetta: 'Ogni giorno alle 08:00' },
  { id: '12h', etichetta: 'Ogni 12 ore' },
  { id: '6h', etichetta: 'Ogni 6 ore' },
  { id: 'manuale', etichetta: 'Solo quando lo chiedo io' }
]

const VALUTE = ['EUR', 'USD', 'GBP', 'CHF']

export default function Impostazioni({ dati, onIndietro, onCambiato }) {
  const imp = dati.impostazioni
  const [messaggio, setMessaggio] = useState(null)
  const [backup, setBackup] = useState(null)
  const [inArrivo, setInArrivo] = useState(null)   // { dati, quanti, nomeFile }
  const fileRef = useRef(null)

  useEffect(() => {
    api.backup().then(setBackup).catch(() => setBackup(null))
  }, [])

  async function cambia(campi, testo) {
    try {
      await api.impostazioni(campi)
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
        const dati = JSON.parse(lettore.result)
        if (!dati || !Array.isArray(dati.prodotti)) {
          throw new Error('Questo file non è un export di Soglia: manca la lista dei prodotti.')
        }
        setInArrivo({ dati, quanti: dati.prodotti.length, nomeFile: file.name })
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
      const r = await api.importa(inArrivo.dati, modalita)
      setInArrivo(null)
      await onCambiato()
      setMessaggio(`Importati. Ora sono ${r.prodotti} prodotti.`)
    } catch (e) {
      setMessaggio(`${e.message} I tuoi dati non sono stati toccati.`)
    }
  }

  return (
    <div className="dettaglio">
      <div className="dettaglio-testa">
        <button className="bottone piatto" onClick={onIndietro}>← Elenco</button>
      </div>

      <Vetro className="sezione entra">
        <div className="t-etichetta sezione-titolo">Controllo automatico</div>
        <div className="scelte">
          {FREQUENZE.map(f => (
            <button
              key={f.id}
              className={`bottone ${imp.frequenzaControllo === f.id ? 'scelto' : ''}`}
              onClick={() => cambia({ frequenzaControllo: f.id }, 'Salvato')}
            >
              {f.etichetta}
            </button>
          ))}
        </div>
        <div className="t-corpo">
          Il controllo gira nel server, in coda, con qualche secondo di pausa tra un
          sito e l'altro. Un punto nella cronologia si scrive solo se il prezzo cambia.
        </div>
      </Vetro>

      <Vetro className="sezione">
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
          <a className="bottone" href="/api/esporta" download>Esporta JSON</a>
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
          Prima di ogni import faccio una copia dell'archivio nella cartella dei backup.
        </div>
      </Vetro>

      <Vetro className="sezione">
        <div className="t-etichetta sezione-titolo">Dove stanno i dati</div>
        <Pannello className="messaggio percorso">{backup?.archivio || 'dati/prodotti.json'}</Pannello>
        <div className="t-corpo">
          Backup automatici (ultimi 10) in {backup?.cartella || 'dati/backup/'}
          {backup?.file?.length ? ` — ${backup.file.length} copie.` : '.'}
        </div>
      </Vetro>

      {messaggio && <Pannello className="messaggio">{messaggio}</Pannello>}
    </div>
  )
}
