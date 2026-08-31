/** node --test src/utils/prove — nessuna dipendenza esterna. */
import test from 'node:test'
import assert from 'node:assert/strict'
import { aNumero, estraiPrezzoDaTesto, riconosciValuta } from '../normalizzaPrezzo.js'

test('normalizza i formati di prezzo', () => {
  const casi = [
    ['1.299,00 €', 1299], ['€ 1.299', 1299], ['1299,00', 1299], ['1 299,00 €', 1299],
    ['$1,299.00', 1299], ['45,99 €', 45.99], ['45.99', 45.99], ['1.50', 1.5],
    ['12.345,67', 12345.67], ['12,345.67', 12345.67], ['1.234.567,89', 1234567.89],
    ['999', 999], ['EUR 89,90', 89.9], ['prezzo: 2.499,99€ IVA inclusa', 2499.99]
  ]
  for (const [testo, atteso] of casi) {
    assert.equal(estraiPrezzoDaTesto(testo)?.prezzo, atteso, testo)
  }
})

test('riconosce la valuta', () => {
  assert.equal(riconosciValuta('1.299,00 €'), 'EUR')
  assert.equal(riconosciValuta('$12'), 'USD')
  assert.equal(riconosciValuta('12 GBP'), 'GBP')
  assert.equal(riconosciValuta('senza simbolo'), null)
})

test('testo senza numeri non inventa prezzi', () => {
  assert.equal(estraiPrezzoDaTesto('disponibile in negozio'), null)
  assert.equal(aNumero('ciao'), null)
})

