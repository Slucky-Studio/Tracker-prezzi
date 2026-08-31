import { useRef, useState } from 'react'
import './AggiungiProdotto.css'
import Foglio from './Foglio'
import { Pannello } from './Vetro'
import { archivio } from '../archivio'
import { leggiPrezzo } from '../utils/ocr'

const MODI = [
  { id: 'mano', etichetta: 'Scrivi' },
  { id: 'foto', etichetta: 'Immagine' }
]

export default function AggiungiProdotto({ onChiudi, onFatto }) {
  const [modo, setModo] = useState('mano')
  const [nome, setNome] = useState('')
  const [prezzo, setPrezzo] = useState('')
  const [obiettivo, setObiettivo] = useState('')
  const [url, setUrl] = useState('')
  const [immagine, setImmagine] = useState(null)
  const [sopra, setSopra] = useState(false)
  const [inCorso, setInCorso] = useState(false)
  const [errore, setErrore] = useState(null)
  const [ocr, setOcr] = useState(null)
  const fileRef = useRef(null)

  const pronto = nome.trim().length > 0 && prezzo.trim().length > 0

  async function salva() {
    if (!pronto || inCorso) return
    setInCorso(true); setErrore(null)
    try {
      const { prodotto } = await archivio.creaProdotto({
        nome: nome.trim(),
        prezzo,
        prezzoObiettivo: obiettivo.trim() || null,
        url: url.trim() || null,
        immagineDati: immagine
      })
      onFatto?.(prodotto)
      onChiudi?.()
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

      {modo === 'foto' && (
        immagine ? (
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
        )
      )}
      {modo === 'foto' && (
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={e => leggiFile(e.target.files?.[0])}
        />
      )}
      {modo === 'foto' && ocr && <Pannello className="avviso">{ocr}</Pannello>}

      <input
        className="campo"
        placeholder="Nome del prodotto"
        value={nome}
        autoFocus={modo === 'mano'}
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
      <input
        className="campo"
        placeholder="Link (facoltativo)"
        inputMode="url"
        value={url}
        onChange={e => setUrl(e.target.value)}
      />

      {errore && <Pannello className="avviso">{errore}</Pannello>}
    </Foglio>
  )
}
