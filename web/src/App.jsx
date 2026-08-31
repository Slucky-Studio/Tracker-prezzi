import './App.css'
import Sfondo from './components/Sfondo'
import CardProdotto from './components/CardProdotto'

/* Blocco 1: solo estetica. Dati finti, nessuna logica. */
const FINTI = [
  {
    id: '1', nome: 'Monitor Dell 27" 4K UltraSharp', url: 'https://www.dell.com/it',
    prezzoObiettivo: 349, ultimoControllo: new Date(Date.now() - 3 * 3600e3).toISOString(),
    statoUltimoControllo: 'ok',
    storico: [
      { data: '2026-04-02T08:00:00Z', prezzo: 469 },
      { data: '2026-05-11T08:00:00Z', prezzo: 429 },
      { data: '2026-06-14T08:00:00Z', prezzo: 449 },
      { data: '2026-07-20T08:00:00Z', prezzo: 399 },
      { data: '2026-08-30T08:00:00Z', prezzo: 341 }
    ]
  },
  {
    id: '2', nome: 'MacBook Air M4 16GB', prezzoObiettivo: 1099,
    ultimoControllo: null,
    storico: [
      { data: '2026-06-01T08:00:00Z', prezzo: 1299 },
      { data: '2026-07-04T08:00:00Z', prezzo: 1249 },
      { data: '2026-08-21T08:00:00Z', prezzo: 1219 }
    ]
  },
  {
    id: '3', nome: 'Zaino Peak Design Everyday 30L', url: 'https://www.amazon.it',
    ultimoControllo: new Date(Date.now() - 26 * 3600e3).toISOString(),
    statoUltimoControllo: 'bloccato',
    storico: [
      { data: '2026-03-08T08:00:00Z', prezzo: 279 },
      { data: '2026-05-02T08:00:00Z', prezzo: 239 },
      { data: '2026-06-19T08:00:00Z', prezzo: 259 },
      { data: '2026-08-28T08:00:00Z', prezzo: 272 }
    ]
  },
  {
    id: '4', nome: 'Sedia Herman Miller Aeron (usata)',
    storico: [{ data: '2026-08-29T18:22:00Z', prezzo: 640 }]
  }
]

export default function App() {
  return (
    <>
      <Sfondo id="notturno" />
      <div className="guscio">
        <header className="intestazione">
          <div>
            <div className="marchio">Soglia</div>
            <div className="t-corpo marchio-sotto">4 prodotti seguiti</div>
          </div>
          <button className="bottone primario">Aggiungi</button>
        </header>

        <div className="griglia">
          {FINTI.map((p, i) => (
            <CardProdotto key={p.id} prodotto={p} ritardo={i * 70} />
          ))}
        </div>
      </div>
    </>
  )
}
