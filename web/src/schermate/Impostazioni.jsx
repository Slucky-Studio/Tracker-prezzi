import { useEffect, useState } from 'react'
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
              className={`bottone ${imp.frequenzaControllo === f.id ? 'primario' : ''}`}
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
              className={`bottone ${imp.valuta === v ? 'primario' : ''}`}
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
