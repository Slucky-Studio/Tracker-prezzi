# Soglia

Il blocco note dei prezzi. Scrivi un prodotto, scrivi un prezzo; la prossima
volta che lo vedi in offerta, apri l'app e ti dice se è davvero un buon
momento o no — guardando la sua storia, non indovinando.

Gira **solo nel telefono**. Nessun server, nessun account, nessuna chiave
API, nessun cloud. I dati stanno nella memoria del browser, sul dispositivo
che stai usando in quel momento.

---

## Aprila dal telefono

**https://slucky-studio.github.io/Tracker-prezzi/**

(l'indirizzo esatto dipende da dove l'hai pubblicata — vedi *Pubblicarla* più
sotto se lo stai facendo tu)

Su iPhone: apri il link in Safari, poi **Condividi → Aggiungi alla schermata
Home**. Diventa un'icona come le altre app: si apre a schermo intero, senza
la barra di Safari, e funziona anche senza connessione dopo il primo
caricamento.

Su Android: Chrome di solito propone da solo "Installa app"; altrimenti è nel
menu ⋮ → *Aggiungi a schermata Home*.

---

## Come si usa

- **Aggiungi** → scrivi nome e prezzo, invio. Due campi, basta.
- Oppure trascina o incolla uno **screenshot** di un'offerta: il prezzo viene
  letto dallo screenshot stesso (OCR nel telefono, nessuna rete) e
  precompilato — tu confermi o correggi.
- Un **link** è facoltativo, solo come promemoria cliccabile verso la pagina
  del prodotto. Non viene controllato da solo: qui non c'è un server che gira
  di notte a guardare i siti per te.
- Ogni volta che vedi un prezzo nuovo, apri il prodotto e aggiungilo: la
  cronologia cresce, il grafico e la fascia di prezzo si aggiornano.
- Il **verdetto** su ogni card (*minimo storico*, *buon momento*, *caro*,
  *pochi dati*) e la fascia luminosa sotto il prezzo sono la risposta rapida:
  dove sta oggi rispetto a tutto quello che hai visto prima.

---

## Dove stanno i dati

Nella memoria del browser (**IndexedDB**), solo su questo dispositivo. Non
c'è un file da qualche parte che puoi copiare, non c'è sincronizzazione tra
telefoni.

Questo significa una cosa importante: **se disinstalli l'app, cancelli i dati
del browser, o cambi telefono, l'archivio sparisce con loro.** Per questo in
*Impostazioni* c'è sempre:

- **Esporta JSON** — scarica un file con tutto, immagini comprese. È il tuo
  backup, e il modo di portare l'archivio su un altro telefono.
- **Importa JSON** — carica un export precedente, con anteprima di quanti
  prodotti stai per aggiungere e scelta *unisci* (tiene quello che hai già) o
  *sostituisci*. Un file non valido viene rifiutato con un messaggio chiaro,
  senza toccare i dati che hai già.

Esportalo ogni tanto, soprattutto prima di aggiornare il telefono o svuotare
la cache del browser.

---

## Pubblicarla (per chi vuole ospitarla altrove)

Il repository include `.github/workflows/pages.yml`: ad ogni push su questo
branch (o su `main`), costruisce l'app e la pubblica su **GitHub Pages**
gratuitamente. Per attivarlo la prima volta:

*Impostazioni del repository → Pages → Source: "GitHub Actions"* — poi il
workflow fa il resto da solo.

Se preferisci ospitarla tu (Netlify, Vercel, un tuo spazio):

```bash
npm install
npm run build
```

produce una cartella `web/dist/` con solo file statici (HTML, CSS, JS): la
carichi dove vuoi, non serve altro. Se il sito non vive alla radice del
dominio (es. `tuosito.it/soglia/`), builda con
`BASE_PATH=/soglia/ npm run build` così i percorsi restano corretti.

Per lavorare in locale con ricarica automatica: `npm run dev`.

---

## Gli sfondi

Quattro sfondi, ognuno con un gradiente dipinto a mano (sempre presente) e
una fotografia che entra in dissolvenza sopra, se c'è. Per usare le tue foto,
mettile in `web/public/sfondi/` con questi nomi:

```
notturno.jpg    ambra.jpg    bruma.jpg    inchiostro.jpg
```

poi ricostruisci (`npm run build`) o ripubblica.

---

## L'OCR delle immagini

`tesseract.js` gira **nel browser**: legge il numero scritto più in grande
nello screenshot (così un prezzo barrato non vince su quello di oggi) e
propone il prezzo. Motore e modello italiano sono copiati da `node_modules` a
`web/public/ocr/` durante il build — nessuna CDN, nessuna chiamata di rete,
nessuna chiave. La prima immagine richiede qualche secondo in più mentre il
motore si carica; se non riconosce niente, il campo resta vuoto e l'immagine
si salva comunque.

---

## Com'è fatto

Un'unica app React statica, installabile come PWA (manifest + service worker
per l'uso offline). Non c'è più un server: quello che serviva a Soglia in una
versione precedente (scraping automatico dei prezzi dai link, controllo
periodico) è stato tolto perché richiedeva un computer sempre acceso — non
compatibile con "solo dal telefono".

```
web/src/
  archivio.js       il "database": IndexedDB, CRUD, export/import, migrazione
  theme.css         i token: colori, raggi, scala tipografica
  components/       Vetro (il materiale), FasciaPrezzo (l'elemento firma), …
  schermate/        Elenco, Dettaglio, Impostazioni
  utils/            formattazione, calcolo del verdetto, OCR, prezzi
web/public/
  manifest.webmanifest, sw.js, icone/    installabilità e uso offline
  sfondi/                                le tue fotografie
```

Dipendenze: React, Vite, `tesseract.js` per l'OCR. Nessun server, nessun
ORM, nessuno state manager, nessuna libreria di UI o di grafici: il CSS e
l'SVG del grafico sono scritti a mano.

`npm test` esegue le prove sulla normalizzazione dei prezzi (formato
italiano, separatori, simboli di valuta).
