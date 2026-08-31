import './Verdetto.css'
import { VERDETTI } from '../utils/verdetto'

/** Una parola sola: il motivo per cui l'app esiste. */
export default function Verdetto({ chiave }) {
  const v = VERDETTI[chiave] || VERDETTI.pochi
  return (
    <span className={`verdetto ${v.acceso ? 'acceso' : ''}`}>
      <span className="verdetto-pallino" />
      {v.testo}
    </span>
  )
}
