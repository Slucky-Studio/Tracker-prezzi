import { useEffect } from 'react'
import './Foglio.css'
import Vetro from './Vetro'

/** Foglio che sale dal basso su telefono, centrato su schermo grande. */
export default function Foglio({ titolo, onChiudi, children, piede }) {
  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onChiudi?.() }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onChiudi])

  return (
    <div className="velo-foglio" onClick={onChiudi}>
      <Vetro className="foglio" onClick={(e) => e.stopPropagation()}>
        <div className="foglio-testa">
          <div className="t-titolo">{titolo}</div>
          <button className="bottone piatto" onClick={onChiudi}>Chiudi</button>
        </div>
        <div className="foglio-corpo">{children}</div>
        {piede && <div className="foglio-piede">{piede}</div>}
      </Vetro>
    </div>
  )
}
