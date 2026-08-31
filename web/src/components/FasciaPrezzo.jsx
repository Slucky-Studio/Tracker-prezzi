import { useEffect, useRef, useState } from 'react'
import './FasciaPrezzo.css'
import { formattaPrezzo } from '../utils/formato'
import { posizioneObiettivo } from '../utils/verdetto'

/**
 * La fascia di prezzo: tutto il range storico in una riga sottile,
 * con un punto luminoso dove sta il prezzo di oggi.
 * Il punto scorre verso la sua posizione all'ingresso, in ~600ms, una volta sola.
 */
export default function FasciaPrezzo({ analisi, obiettivo, valuta = 'EUR', estremi = true }) {
  const [k, setK] = useState(0)
  const partito = useRef(false)

  const definita = analisi && analisi.rilevazioni >= 2 && analisi.escursione > 0
  const posizione = definita ? analisi.posizione : 0.5

  useEffect(() => {
    if (partito.current) { setK(posizione); return }
    partito.current = true
    const t = requestAnimationFrame(() => requestAnimationFrame(() => setK(posizione)))
    return () => cancelAnimationFrame(t)
  }, [posizione])

  const tacca = definita ? posizioneObiettivo(analisi, obiettivo) : null

  return (
    <div>
      <div className={`fascia ${definita ? '' : 'muta'}`}>
        <div className="fascia-traccia" />
        {tacca !== null && (
          <div
            className="fascia-tacca"
            style={{ left: `calc(7px + ${tacca} * (100% - 14px))` }}
            title={`obiettivo ${formattaPrezzo(obiettivo, valuta)}`}
          />
        )}
        <div className="fascia-corsa" style={{ transform: `translateX(${k * 100}%)` }}>
          <span className="fascia-punto" />
        </div>
      </div>

      {estremi && (
        <div className="fascia-estremi">
          <span className="t-etichetta">
            {definita ? formattaPrezzo(analisi.min, valuta) : 'range da costruire'}
          </span>
          <span className="t-etichetta">
            {definita ? formattaPrezzo(analisi.max, valuta) : ''}
          </span>
        </div>
      )}
    </div>
  )
}
