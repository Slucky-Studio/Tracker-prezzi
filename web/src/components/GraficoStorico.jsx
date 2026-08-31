import './GraficoStorico.css'
import { formattaPrezzo, dataBreve } from '../utils/formato'

/* SVG scritto a mano: nessuna libreria di charting. */
const L = 720, A = 220
const MARGINE = { alto: 34, basso: 44, sinistro: 10, destro: 10 }

export default function GraficoStorico({ storico = [], valuta = 'EUR', obiettivo = null }) {
  if (storico.length < 2) {
    return (
      <div className="grafico-vuoto t-corpo">
        Serve più di una rilevazione per disegnare la curva.
      </div>
    )
  }

  const prezzi = storico.map(p => p.prezzo)
  const tempi = storico.map(p => new Date(p.data).getTime())
  const min = Math.min(...prezzi)
  const max = Math.max(...prezzi)
  const escursione = max - min || Math.max(max * 0.1, 1)

  const daPrezzo = (p) => {
    const alto = MARGINE.alto
    const basso = A - MARGINE.basso
    const k = (p - (min - escursione * 0.12)) / (escursione * 1.24)
    return basso - k * (basso - alto)
  }
  const daTempo = (t) => {
    const primo = tempi[0]
    const ultimo = tempi[tempi.length - 1]
    const k = ultimo === primo ? 0.5 : (t - primo) / (ultimo - primo)
    return MARGINE.sinistro + k * (L - MARGINE.sinistro - MARGINE.destro)
  }

  const punti = storico.map((p, i) => ({ x: daTempo(tempi[i]), y: daPrezzo(p.prezzo), ...p }))
  const linea = punti.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const area = `${linea} L${punti[punti.length - 1].x.toFixed(1)},${A - MARGINE.basso} ` +
               `L${punti[0].x.toFixed(1)},${A - MARGINE.basso} Z`

  const yObiettivo = typeof obiettivo === 'number' ? daPrezzo(obiettivo) : null
  const obiettivoVisibile = yObiettivo !== null && yObiettivo > 4 && yObiettivo < A - MARGINE.basso

  return (
    <svg className="grafico" viewBox={`0 0 ${L} ${A}`} role="img"
         aria-label="Andamento del prezzo nel tempo">
      <defs>
        <linearGradient id="velo-grafico" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.22)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>

      <line className="grafico-griglia" x1="0" y1={daPrezzo(max)} x2={L} y2={daPrezzo(max)} />
      <line className="grafico-griglia" x1="0" y1={daPrezzo(min)} x2={L} y2={daPrezzo(min)} />

      <path className="grafico-area" d={area} />
      <path className="grafico-linea" d={linea} />

      {obiettivoVisibile && (
        <>
          <line className="grafico-obiettivo" x1="0" y1={yObiettivo} x2={L} y2={yObiettivo} />
          <text className="grafico-testo" x={L / 2} y={yObiettivo - 9} textAnchor="middle">
            obiettivo
          </text>
        </>
      )}

      {punti.map((p, i) => (
        <circle
          key={`${p.data}-${i}`}
          className={i === punti.length - 1 ? 'grafico-ultimo' : 'grafico-punto'}
          cx={p.x} cy={p.y} r={i === punti.length - 1 ? 5 : 3}
        />
      ))}

      <text className="grafico-testo" x={MARGINE.sinistro} y={daPrezzo(max) - 12}>
        {formattaPrezzo(max, valuta)}
      </text>
      <text className="grafico-testo" x={MARGINE.sinistro} y={daPrezzo(min) - 12}>
        {formattaPrezzo(min, valuta)}
      </text>
      <text className="grafico-testo" x={MARGINE.sinistro} y={A - 8}>
        {dataBreve(storico[0].data)}
      </text>
      <text className="grafico-testo" x={L - MARGINE.destro} y={A - 8} textAnchor="end">
        {dataBreve(storico[storico.length - 1].data)}
      </text>
    </svg>
  )
}
