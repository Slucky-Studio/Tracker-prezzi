import './Vetro.css'

/** Superficie di vetro chiaro. Riusata ovunque: card, barre, fogli. */
export default function Vetro({ as: Tag = 'div', className = '', stretto = false, children, ...resto }) {
  return (
    <Tag className={`vetro ${stretto ? 'stretto' : ''} ${className}`} {...resto}>
      {children}
    </Tag>
  )
}

/** Pannello scuro da mettere dentro il vetro chiaro. */
export function Pannello({ as: Tag = 'div', className = '', pillola = false, children, ...resto }) {
  return (
    <Tag className={`pannello ${pillola ? 'pillola' : ''} ${className}`} {...resto}>
      {children}
    </Tag>
  )
}
