import { useEffect, useState } from 'react'
import './Dettaglio.css'
import Vetro, { Pannello } from '../components/Vetro'
import Verdetto from '../components/Verdetto'
import FasciaPrezzo from '../components/FasciaPrezzo'
import { analizza } from '../utils/verdetto'
import {
  formattaNumero, formattaPrezzo, formattaPercentuale,
  simbolo, dominio, dataEOra, quando
} from '../utils/formato'
import { api, urlImmagine } from '../api'

const STATI = { ok: 'controllo riuscito', fallito: 'controllo fallito', bloccato: 'sito bloccato' }

export default function Dettaglio({ prodotto, valuta, onIndietro, onCambiato }) {
  const analisi = analizza(prodotto)

  const [nome, setNome] = useState(prodotto.nome)
  const [note, setNote] = useState(prodotto.note)
  const [tag, setTag] = useState(prodotto.tag.join(', '))
  const [obiettivo, setObiettivo] = useState(
    prodotto.prezzoObiettivo === null ? '' : String(prodotto.prezzoObiettivo)
  )
  const [nuovoPrezzo, setNuovoPrezzo] = useState('')
  const [messaggio, setMessaggio] = useState(null)
  const [inCorso, setInCorso] = useState(false)
  const [fotoRotta, setFotoRotta] = useState(false)

  useEffect(() => {
    setNome(prodotto.nome); setNote(prodotto.note)
    setTag(prodotto.tag.join(', '))
    setObiettivo(prodotto.prezzoObiettivo === null ? '' : String(prodotto.prezzoObiettivo))
  }, [prodotto.id])

  const modificato =
    nome !== prodotto.nome ||
    note !== prodotto.note ||
    tag !== prodotto.tag.join(', ') ||
    obiettivo !== (prodotto.prezzoObiettivo === null ? '' : String(prodotto.prezzoObiettivo))

  async function con(azione, testo) {
    setInCorso(true); setMessaggio(null)
    try {
      await azione()
      await onCambiato()
      if (testo) setMessaggio(testo)
    } catch (e) {
      setMessaggio(e.message)
    } finally {
      setInCorso(false)
    }
  }

  const salva = () => con(() => api.aggiornaProdotto(prodotto.id, {
    nome: nome.trim() || prodotto.nome,
    note,
    tag: tag.split(',').map(t => t.trim()).filter(Boolean),
    prezzoObiettivo: obiettivo.trim() === '' ? null : Number(obiettivo.replace(',', '.'))
  }), 'Salvato')

  const aggiungiPrezzo = () => {
    const n = Number(nuovoPrezzo.replace(',', '.'))
    if (!Number.isFinite(n)) { setMessaggio('Prezzo non valido.'); return }
    return con(async () => {
      const r = await api.aggiungiPrezzo(prodotto.id, n)
      setNuovoPrezzo('')
      if (!r.cambiato) setMessaggio('Prezzo identico all’ultimo: non l’ho riscritto.')
    }, 'Prezzo aggiunto')
  }

  return (
    <div className="dettaglio">
      <div className="dettaglio-testa">
        <button className="bottone piatto" onClick={onIndietro}>← Elenco</button>
        {prodotto.url && (
          <a className="bottone piatto" href={prodotto.url} target="_blank" rel="noreferrer">
            apri {dominio(prodotto.url)} ↗
          </a>
        )}
      </div>

      <Vetro className="scheda entra">
        <div className="scheda-alta">
          {prodotto.immagine && !fotoRotta && (
            <img
              className="scheda-foto"
              src={urlImmagine(prodotto.immagine)}
              alt=""
              onError={() => setFotoRotta(true)}
            />
          )}
          <div className="cresci">
            <div className="t-titolo">{prodotto.nome}</div>
            <div className="t-etichetta" style={{ marginTop: 4 }}>
              {prodotto.url ? dominio(prodotto.url) : 'aggiornato a mano'}
              {prodotto.ultimoControllo ? ` · ${quando(prodotto.ultimoControllo)}` : ''}
              {prodotto.statoUltimoControllo && prodotto.statoUltimoControllo !== 'ok'
                ? ` · ${STATI[prodotto.statoUltimoControllo]}` : ''}
            </div>
          </div>
          <Verdetto chiave={analisi.verdetto} />
        </div>

        <div className="prezzo-grande">
          <span className="simbolo">{simbolo(valuta)}</span>
          <span className="t-hero">{formattaNumero(analisi.prezzo)}</span>
        </div>

        <FasciaPrezzo analisi={analisi} obiettivo={prodotto.prezzoObiettivo} valuta={valuta} />

        <Pannello className="numeri">
          <div className="numero">
            <span className="t-etichetta">Minimo</span>
            <span className="t-valore">{formattaPrezzo(analisi.min, valuta)}</span>
          </div>
          <div className="numero">
            <span className="t-etichetta">Massimo</span>
            <span className="t-valore">{formattaPrezzo(analisi.max, valuta)}</span>
          </div>
          <div className="numero">
            <span className="t-etichetta">Media</span>
            <span className="t-valore">{formattaPrezzo(analisi.media, valuta)}</span>
          </div>
          <div className="numero">
            <span className="t-etichetta">Dal primo</span>
            <span className="t-valore">{formattaPercentuale(analisi.variazione)}</span>
          </div>
        </Pannello>
      </Vetro>

      <Vetro className="sezione">
        <div className="t-etichetta sezione-titolo">Aggiungi un prezzo</div>
        <div className="coppia" style={{ display: 'flex', gap: 'var(--s2)' }}>
          <input
            className="campo"
            placeholder="Prezzo di oggi"
            inputMode="decimal"
            value={nuovoPrezzo}
            onChange={e => setNuovoPrezzo(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && aggiungiPrezzo()}
          />
          <button className="bottone primario" onClick={aggiungiPrezzo} disabled={inCorso || !nuovoPrezzo}>
            Aggiungi
          </button>
        </div>
        {prodotto.url && (
          <button className="bottone" onClick={() => con(() => api.controlla(prodotto.id))} disabled={inCorso}>
            {inCorso ? 'Controllo…' : 'Controlla adesso'}
          </button>
        )}
        {messaggio && <Pannello className="messaggio">{messaggio}</Pannello>}
      </Vetro>

      <Vetro className="sezione">
        <div className="t-etichetta sezione-titolo">Scheda</div>
        <input className="campo" value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome" />
        <div className="coppia" style={{ display: 'flex', gap: 'var(--s2)' }}>
          <input
            className="campo"
            value={obiettivo}
            onChange={e => setObiettivo(e.target.value)}
            placeholder="Prezzo obiettivo"
            inputMode="decimal"
          />
          <input
            className="campo"
            value={tag}
            onChange={e => setTag(e.target.value)}
            placeholder="Tag, separati da virgola"
          />
        </div>
        <textarea
          className="campo"
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Note"
        />
        <button className="bottone" onClick={salva} disabled={!modificato || inCorso}>
          Salva
        </button>
      </Vetro>

      <Vetro className="sezione">
        <div className="t-etichetta sezione-titolo">Cronologia · {analisi.rilevazioni} rilevazioni</div>
        {[...prodotto.storico].map((r, i) => ({ r, i })).reverse().map(({ r, i }) => (
          <div className="storico-riga" key={`${r.data}-${i}`}>
            <span className="t-corpo">{dataEOra(r.data)}</span>
            <span className="riga">
              <span className="t-etichetta">{r.fonte}</span>
              <span className="t-valore">{formattaPrezzo(r.prezzo, valuta)}</span>
              <button
                className="storico-togli"
                onClick={() => con(() => api.togliRilevazione(prodotto.id, i))}
                title="Togli questa rilevazione"
              >
                ×
              </button>
            </span>
          </div>
        ))}
        {analisi.rilevazioni === 0 && (
          <div className="t-corpo">Nessuna rilevazione. Aggiungi il primo prezzo qui sopra.</div>
        )}
      </Vetro>

      <Vetro className="sezione">
        <div className="azioni">
          <button
            className="bottone"
            onClick={() => con(() => api.aggiornaProdotto(prodotto.id, { archiviato: !prodotto.archiviato }))}
          >
            {prodotto.archiviato ? 'Riprendi a seguire' : 'Archivia'}
          </button>
          <button
            className="bottone pericolo"
            onClick={async () => {
              if (!confirm(`Elimino "${prodotto.nome}" e tutta la sua cronologia?`)) return
              await api.eliminaProdotto(prodotto.id)
              onIndietro()
              await onCambiato()
            }}
          >
            Elimina
          </button>
        </div>
      </Vetro>
    </div>
  )
}
