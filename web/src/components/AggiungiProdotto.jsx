import { useRef, useState } from 'react'
import './AggiungiProdotto.css'
import Foglio from './Foglio'
import { Pannello } from './Vetro'
import { api } from '../api'
import { leggiPrezzo } from '../utils/ocr'

const MODI = [
  { id: 'link', etichetta: 'Link' },
  { id: 'mano', etichetta: 'A mano' },
  { id: 'foto', etichetta: 'Immagine' }
]

export default function AggiungiProdotto({ onChiudi, onFatto }) {
  const [modo, setModo] = useState('link')
  const [url, setUrl] = useState('')
  const [nome, setNome] = useState('')
  const [prezzo, setPrezzo] = useState('')
  const [obiettivo, setObiettivo] = useState('')
  const [immagine, setImmagine] = useState(null)
  const [sopra, setSopra] = useState(false)
  const [inCorso, setInCorso] = useState(false)
  const [avviso, setAvviso] = useState(null)
  const [errore, setErrore] = useState(null)
  const [ocr, setOcr] = useState(null)
  const fileRef = useRef(null)

  const pronto = modo === 'link' ? url.trim().length > 4 : nome.trim().length > 0

  async function salva() {
    if (!pronto || inCorso) return
    setInCorso(true); setErrore(null); setAvviso(null)
    try {
      const risposta = await api.creaProdotto({
        url: modo === 'link' ? url.trim() : null,
        nome: nome.trim(),
        prezzo: prezzo.trim() || null,
        prezzoObiettivo: obiettivo.trim() || null,
        immagineDati: immagine
      })
      const p = risposta.prodotto
      if (modo === 'link' && p.manuale) {
        setAvviso('Non sono riuscito a leggere il prezzo da questo sito. Inseriscilo tu, il resto funziona lo stesso.')
        setModo('mano')
        setNome(p.nome && p.nome !== 'Senza nome' ? p.nome : nome)
        onFatto?.(p, { resta: true })
      } else {
        onFatto?.(p)
        onChiudi?.()
      }
    } catch (e) {
      setErrore(e.message)
    } finally {
      setInCorso(false)
    }
  }

  function leggiFile(file) {
    if (!file || !file.type.startsWith('image/')) return
    const lettore = new FileReader()
    lettore.onload = async () => {
      const dataUrl = lettore.result
      setImmagine(dataUrl)
      setOcr('preparo il riconoscimento…')
      const trovato = await leggiPrezzo(dataUrl, { onStato: setOcr })
      if (trovato?.prezzo) {
        const scritto = trovato.prezzo.toFixed(2).replace('.', ',')
        setPrezzo(scritto)
        setOcr(`ho letto ${scritto}. Correggi se ho sbagliato.`)
      } else {
        setOcr('non ho riconosciuto un prezzo. Scrivilo tu, l’immagine la tengo lo stesso.')
      }
    }
    lettore.readAsDataURL(file)
  }

  return (
    <Foglio
      titolo="Aggiungi prodotto"
      onChiudi={onChiudi}
      piede={
        <>
          <button className="bottone" onClick={onChiudi}>Annulla</button>
          <button className="bottone primario" disabled={!pronto || inCorso} onClick={salva}>
            {inCorso ? 'Un attimo…' : 'Salva'}
          </button>
        </>
      }
    >
      <Pannello className="segmenti" pillola>
        {MODI.map(m => (
          <button
            key={m.id}
            className={modo === m.id ? 'attivo' : ''}
            onClick={() => { setModo(m.id); setErrore(null) }}
          >
            {m.etichetta}
          </button>
        ))}
      </Pannello>

      {modo === 'link' && (
        <>
          <input
            className="campo"
            placeholder="Incolla il link del prodotto"
            value={url}
            autoFocus
            inputMode="url"
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && salva()}
          />
          <div className="t-corpo">
            Leggo io nome e prezzo dalla pagina. Se il sito non me li dà, il prodotto
            si crea comunque e il prezzo lo metti a mano.
          </div>
        </>
      )}

      {modo === 'mano' && (
        <>
          <input
            className="campo"
            placeholder="Nome del prodotto"
            value={nome}
            autoFocus
            onChange={e => setNome(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && salva()}
          />
          <div className="coppia">
            <input
              className="campo"
              placeholder="Prezzo di oggi"
              inputMode="decimal"
              value={prezzo}
              onChange={e => setPrezzo(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && salva()}
            />
            <input
              className="campo"
              placeholder="Obiettivo"
              inputMode="decimal"
              value={obiettivo}
              onChange={e => setObiettivo(e.target.value)}
            />
          </div>
        </>
      )}

      {modo === 'foto' && (
        <>
          {immagine ? (
            <>
              <img className="anteprima-immagine" src={immagine} alt="" />
              <button className="bottone piatto" onClick={() => { setImmagine(null); setOcr(null) }}>
                Cambia immagine
              </button>
            </>
          ) : (
            <div
              className={`zona-immagine ${sopra ? 'sopra' : ''}`}
              onClick={() => fileRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setSopra(true) }}
              onDragLeave={() => setSopra(false)}
              onDrop={e => { e.preventDefault(); setSopra(false); leggiFile(e.dataTransfer.files?.[0]) }}
              onPaste={e => leggiFile(e.clipboardData?.files?.[0])}
            >
              <div className="t-corpo">Trascina qui uno screenshot, o tocca per sceglierlo.</div>
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={e => leggiFile(e.target.files?.[0])}
          />
          <input
            className="campo"
            placeholder="Nome del prodotto"
            value={nome}
            onChange={e => setNome(e.target.value)}
          />
          <div className="coppia">
            <input
              className="campo"
              placeholder="Prezzo"
              inputMode="decimal"
              value={prezzo}
              onChange={e => setPrezzo(e.target.value)}
            />
            <input
              className="campo"
              placeholder="Obiettivo"
              inputMode="decimal"
              value={obiettivo}
              onChange={e => setObiettivo(e.target.value)}
            />
          </div>
        </>
      )}

      {modo === 'foto' && ocr && <Pannello className="avviso">{ocr}</Pannello>}
      {avviso && <Pannello className="avviso">{avviso}</Pannello>}
      {errore && <Pannello className="avviso">{errore}</Pannello>}
    </Foglio>
  )
}
