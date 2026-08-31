import { useMemo, useState } from 'react'
import './Elenco.css'
import Vetro from '../components/Vetro'
import CardProdotto from '../components/CardProdotto'
import { analizza, punteggioConvenienza } from '../utils/verdetto'

const ORDINI = [
  { id: 'convenienza', etichetta: 'Convenienza' },
  { id: 'aggiunta', etichetta: 'Aggiunti di recente' },
  { id: 'nome', etichetta: 'Nome' }
]

export default function Elenco({ dati, onApri, onAggiungi, onImpostazioni, onControllaTutti, controllando }) {
  const [cerca, setCerca] = useState('')
  const [ordine, setOrdine] = useState('convenienza')
  const [tagScelto, setTagScelto] = useState(null)
  const [conArchiviati, setConArchiviati] = useState(false)

  const valuta = dati.impostazioni.valuta

  const tagDisponibili = useMemo(() => {
    const insieme = new Set()
    dati.prodotti.forEach(p => p.tag.forEach(t => insieme.add(t)))
    return [...insieme].sort()
  }, [dati.prodotti])

  const visibili = useMemo(() => {
    const testo = cerca.trim().toLowerCase()
    const lista = dati.prodotti.filter(p => {
      if (!conArchiviati && p.archiviato) return false
      if (tagScelto && !p.tag.includes(tagScelto)) return false
      if (!testo) return true
      return (p.nome + ' ' + (p.url || '') + ' ' + p.tag.join(' ') + ' ' + p.note)
        .toLowerCase().includes(testo)
    })

    const conAnalisi = lista.map(p => ({ p, a: analizza(p) }))
    if (ordine === 'nome') conAnalisi.sort((x, y) => x.p.nome.localeCompare(y.p.nome, 'it'))
    else if (ordine === 'aggiunta') conAnalisi.sort((x, y) => new Date(y.p.creatoIl) - new Date(x.p.creatoIl))
    else conAnalisi.sort((x, y) => punteggioConvenienza(x.a) - punteggioConvenienza(y.a))
    return conAnalisi.map(v => v.p)
  }, [dati.prodotti, cerca, ordine, tagScelto, conArchiviati])

  const seguiti = dati.prodotti.filter(p => !p.archiviato).length

  return (
    <>
      <header className="intestazione">
        <div>
          <div className="marchio">Soglia</div>
          <div className="t-corpo marchio-sotto">
            {seguiti === 0 ? 'niente da seguire, per ora'
              : `${seguiti} ${seguiti === 1 ? 'prodotto seguito' : 'prodotti seguiti'}`}
          </div>
        </div>
        <div className="riga">
          <button className="bottone" onClick={onImpostazioni} title="Impostazioni">Impostazioni</button>
          <button className="bottone primario" onClick={onAggiungi}>Aggiungi</button>
        </div>
      </header>

      {dati.prodotti.length > 0 && (
        <>
          <div className="strumenti">
            <input
              className="campo cresci"
              placeholder="Cerca"
              value={cerca}
              onChange={e => setCerca(e.target.value)}
            />
            <select className="select" value={ordine} onChange={e => setOrdine(e.target.value)}>
              {ORDINI.map(o => <option key={o.id} value={o.id}>{o.etichetta}</option>)}
            </select>
            <button
              className={`bottone ${conArchiviati ? 'primario' : ''}`}
              onClick={() => setConArchiviati(v => !v)}
            >
              Archiviati
            </button>
            <button className="bottone" onClick={onControllaTutti} disabled={controllando}>
              {controllando ? 'Controllo…' : 'Controlla tutti'}
            </button>
          </div>

          {tagDisponibili.length > 0 && (
            <div className="tag-riga">
              {tagDisponibili.map(t => (
                <button key={t} onClick={() => setTagScelto(tagScelto === t ? null : t)}>
                  <span className={`pillola ${tagScelto === t ? 'attiva' : ''}`}>{t}</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {visibili.length === 0 ? (
        <Vetro className="vuoto entra">
          <div className="t-titolo">
            {dati.prodotti.length === 0 ? 'Nessun prodotto ancora.' : 'Nessun prodotto con questi filtri.'}
          </div>
          <div className="t-corpo">
            {dati.prodotti.length === 0
              ? 'Incolla un link o scrivi un nome per iniziare.'
              : 'Cambia la ricerca, o togli il filtro sui tag.'}
          </div>
          {dati.prodotti.length === 0 && (
            <button className="bottone" onClick={onAggiungi}>Aggiungi il primo</button>
          )}
        </Vetro>
      ) : (
        <div className="griglia">
          {visibili.map((p, i) => (
            <CardProdotto
              key={p.id}
              prodotto={p}
              valuta={valuta}
              ritardo={Math.min(i, 8) * 60}
              onApri={onApri}
            />
          ))}
        </div>
      )}
    </>
  )
}
