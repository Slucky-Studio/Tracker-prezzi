/**
 * Sfondi intercambiabili. Due strati per ognuno:
 * un gradiente dipinto a mano (sempre presente, zero rete) e una fotografia
 * che entra in dissolvenza quando è pronta. Se la foto manca resta il gradiente
 * e la schermata non è mai bianca né rotta.
 *
 * Le foto vivono in web/public/sfondi/ — vedi README per sostituirle con le tue.
 */
export const SFONDI = [
  {
    id: 'notturno',
    nome: 'Notte viola',
    foto: '/sfondi/notturno.jpg',
    gradiente:
      'radial-gradient(120% 80% at 18% 0%, #4A2C57 0%, rgba(74,44,87,0) 58%),' +
      'radial-gradient(100% 70% at 88% 12%, #6B3A52 0%, rgba(107,58,82,0) 52%),' +
      'linear-gradient(168deg, #2C1D38 0%, #241830 42%, #1B1520 78%, #140F1A 100%)',
    velo: 0.10
  },
  {
    id: 'ambra',
    nome: 'Ora ambrata',
    foto: '/sfondi/ambra.jpg',
    gradiente:
      'radial-gradient(90% 60% at 78% 8%, #C2703A 0%, rgba(194,112,58,0) 55%),' +
      'radial-gradient(120% 90% at 10% 30%, #5B2F46 0%, rgba(91,47,70,0) 60%),' +
      'linear-gradient(170deg, #3A2033 0%, #2A1A2A 46%, #1B1520 100%)',
    velo: 0.16
  },
  {
    id: 'bruma',
    nome: 'Bruma fredda',
    foto: '/sfondi/bruma.jpg',
    gradiente:
      'radial-gradient(110% 70% at 30% 4%, #45516F 0%, rgba(69,81,111,0) 56%),' +
      'radial-gradient(90% 60% at 90% 40%, #3E3A5C 0%, rgba(62,58,92,0) 60%),' +
      'linear-gradient(172deg, #2A2A3C 0%, #221E2E 48%, #1B1520 100%)',
    velo: 0.12
  },
  {
    id: 'inchiostro',
    nome: 'Inchiostro',
    foto: '/sfondi/inchiostro.jpg',
    gradiente:
      'radial-gradient(120% 80% at 50% -10%, #33253D 0%, rgba(51,37,61,0) 62%),' +
      'linear-gradient(180deg, #1F1727 0%, #1B1520 55%, #100C15 100%)',
    velo: 0.06
  }
]

export function sfondoPerId(id) {
  return SFONDI.find(s => s.id === id) || SFONDI[0]
}
