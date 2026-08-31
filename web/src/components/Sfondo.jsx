import { useEffect, useState } from 'react'
import './Sfondo.css'
import { sfondoPerId } from '../data/sfondi'

/** Due strati: gradiente sempre presente, foto in dissolvenza se c'è. */
export default function Sfondo({ id }) {
  const sfondo = sfondoPerId(id)
  const [pronta, setPronta] = useState(false)

  useEffect(() => { setPronta(false) }, [sfondo.id])

  return (
    <div className="sfondo">
      <div className="sfondo-gradiente" style={{ background: sfondo.gradiente }} />
      {sfondo.foto && (
        <img
          className={`sfondo-foto ${pronta ? 'pronta' : ''}`}
          src={sfondo.foto}
          alt=""
          aria-hidden="true"
          onLoad={() => setPronta(true)}
          onError={() => setPronta(false)}
        />
      )}
      <div className="sfondo-velo" style={{ opacity: 0.4 + sfondo.velo }} />
    </div>
  )
}
