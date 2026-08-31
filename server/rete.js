import os from 'node:os'

/** Primo indirizzo IPv4 non interno: quello da aprire dal telefono. */
export function ipLocale() {
  const reti = os.networkInterfaces()
  for (const nome of Object.keys(reti)) {
    for (const i of reti[nome] || []) {
      if (i.family === 'IPv4' && !i.internal) return i.address
    }
  }
  return null
}
