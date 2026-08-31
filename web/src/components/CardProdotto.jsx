import { useState } from 'react'
import './CardProdotto.css'
import Vetro from './Vetro'
import Verdetto from './Verdetto'
import FasciaPrezzo from './FasciaPrezzo'
import { analizza } from '../utils/verdetto'
import { formattaNumero, formattaPrezzo, simbolo, dominio, quando } from '../utils/formato'
import { useImmagine } from '../archivio'

export default function CardProdotto({ prodotto, valuta = 'EUR', ritardo = 0, onApri }) {
  const analisi = analizza(prodotto)
  const [fotoRotta, setFotoRotta] = useState(false)
  const immagine = useImmagine(prodotto.immagine)

  return (
    <Vetro
      as="button"
      type="button"
      className={`card entra ${prodotto.archiviato ? 'card-archiviata' : ''}`}
      style={{ animationDelay: `${ritardo}ms` }}
      onClick={() => onApri?.(prodotto)}
    >
      <div className="card-testa">
        {immagine && !fotoRotta && (
          <img
            className="card-foto"
            src={immagine}
            alt=""
            onError={() => setFotoRotta(true)}
          />
        )}
        <div className="cresci">
          <div className="t-titolo card-nome">{prodotto.nome}</div>
          <div className="card-fonte">
            <span className="t-etichetta">{prodotto.url ? dominio(prodotto.url) : 'a mano'}</span>
          </div>
        </div>
        <Verdetto chiave={analisi.verdetto} />
      </div>

      <div className="card-prezzo">
        <span className="simbolo">{simbolo(valuta)}</span>
        <span className="t-hero mini">{formattaNumero(analisi.prezzo)}</span>
      </div>

      <FasciaPrezzo
        analisi={analisi}
        obiettivo={prodotto.prezzoObiettivo}
        valuta={valuta}
      />

      <div className="card-piede">
        <span className="t-etichetta">
          {analisi.ultimaData
            ? quando(analisi.ultimaData)
            : `${analisi.rilevazioni} ${analisi.rilevazioni === 1 ? 'rilevazione' : 'rilevazioni'}`}
        </span>
        {typeof prodotto.prezzoObiettivo === 'number' && (
          <span className="t-etichetta">obiettivo {formattaPrezzo(prodotto.prezzoObiettivo, valuta)}</span>
        )}
      </div>
    </Vetro>
  )
}
