# Soglia

Tracker personale di prezzi. Segui un prodotto nel tempo e, quando stai per
comprarlo, rispondi a una domanda sola:

> il prezzo di oggi è buono rispetto a quello che ho visto nei mesi scorsi,
> o conviene aspettare?

Non è un e-commerce e non è un comparatore. Funziona con qualsiasi prodotto,
aggiunto da **link**, da **nome scritto a mano** o da **screenshot**.

Nessuna chiave API, nessun servizio a pagamento, nessun account. I dati stanno
in un file JSON sul tuo computer.

---

## Avvio

```bash
npm install
npm start
```

Un comando solo: costruisce l'interfaccia e avvia il server sulla porta 4173.
In console trovi i due indirizzi:

```
  Soglia è in ascolto.
  su questo computer   http://localhost:4173
  dal telefono         http://192.168.1.24:4173
  dati                 /…/Tracker-prezzi/dati/prodotti.json
  controllo automatico   ogni giorno alle 08:00
```

Serve Node 20 o più recente.

### Dal telefono

Apri l'indirizzo `dal telefono` con il telefono collegato **alla stessa rete
Wi-Fi** del computer. Il server ascolta su `0.0.0.0`, quindi non serve altro.
Il computer deve restare acceso e con Soglia in esecuzione.
Su iPhone, *Condividi → Aggiungi a Home* la trasforma in un'icona.

Se non si apre: quasi sempre è il firewall del computer che blocca la porta
4173 in entrata. Consentila per Node.

### Altri comandi

| comando | cosa fa |
|---|---|
| `npm start` | build + server (l'uso normale) |
| `npm run server` | solo il server, senza ricostruire l'interfaccia |
| `npm run controlla` | controlla adesso tutti i prodotti con link, da riga di comando |
| `npm run dev` | server + Vite con ricarica a caldo, per lavorare al codice |
| `npm test` | le prove del normalizzatore di prezzo e della cascata di estrazione |

---

## Dove stanno i dati

```
dati/
  prodotti.json     la fonte di verità: prodotti, storico, impostazioni
  backup/           copie datate automatiche, tenute le ultime 10
  img/              le immagini che incolli o trascini
```

`dati/prodotti.json` è un file di testo: puoi aprirlo, leggerlo, copiarlo su
una chiavetta. Viene creato al primo avvio e non è versionato da git.

**Export e import** sono in *Impostazioni*. L'export è il tuo backup e il modo
di spostare tutto su un altro PC; l'import ti chiede prima quanti prodotti stai
per caricare e se vuoi *unire* o *sostituire*. Prima di ogni import viene fatta
una copia dell'archivio. Un file malformato viene rifiutato con un messaggio,
senza toccare i dati che hai già.

Lo schema ha un numero di versione: gli export vecchi vengono migrati
automaticamente all'apertura, quindi non si rompono mai.

---

## Il controllo automatico

Gira nel server, non nel browser: funziona anche con nessuna scheda aperta,
purché il processo `npm start` resti acceso.

- frequenza scegliibile in *Impostazioni*: ogni giorno alle 08:00 (predefinito),
  ogni 12 ore, ogni 6 ore, oppure solo manuale;
- coda seriale con 3-6 secondi di pausa fra un sito e l'altro, mai richieste
  parallele: è il modo più rapido per farsi bloccare;
- timeout 15 secondi, due tentativi, poi si arrende in silenzio;
- **un punto nella cronologia si scrive solo se il prezzo è cambiato**;
  altrimenti aggiorna solo la data dell'ultimo controllo;
- all'avvio, se l'ultimo controllo è più vecchio dell'intervallo, ne fa subito uno;
- backup datato prima di ogni scrittura di massa.

---

## Limiti noti dello scraping

Il prezzo viene letto dalla pagina in cascata: JSON-LD (`@type: Product`) →
microdata schema.org → meta tag Open Graph → euristica sul DOM, con i prezzi
barrati e di listino scartati. Ci si ferma al primo passo che funziona.

**Alcuni siti bloccano attivamente le richieste automatiche.** Amazon in primis,
ma non solo: possono rispondere `403`, mostrare un captcha, o cambiare il
proprio HTML da un giorno all'altro. Con quei siti il tracking automatico può
smettere di funzionare senza preavviso: **è previsto**. Il prodotto non si
rompe — passa in stato *controllo fallito* o *sito bloccato* e resta
aggiornabile a mano dal dettaglio.

Vale lo stesso per l'aggiunta da link: se il prezzo non si legge, il prodotto
viene creato lo stesso con quello che si è riuscito a leggere (spesso nome e
immagine) e il prezzo lo metti tu.

Nessun proxy pubblico, nessun servizio di scraping: sono inaffidabili e quasi
sempre a pagamento.

---

## Gli sfondi

Quattro sfondi, ognuno fatto di due strati: un gradiente CSS sempre presente e
una fotografia che entra in dissolvenza quando è pronta. Se la foto manca resta
il gradiente, e la schermata non è mai bianca né rotta.

Per usare le tue foto, mettile in `web/public/sfondi/` con questi nomi:

```
notturno.jpg    ambra.jpg    bruma.jpg    inchiostro.jpg
```

poi rilancia `npm start`. Per cambiarne i nomi o aggiungerne altri, il file da
toccare è `web/src/data/sfondi.js`.

---

## L'OCR delle immagini

Trascina o incolla uno screenshot: `tesseract.js` gira **nel browser**, legge il
prezzo scritto più in grande (così il prezzo barrato non vince su quello di
oggi) e precompila il campo. Tu confermi o correggi.

Motore e modello italiano vengono copiati da `node_modules` a
`web/public/ocr/` durante il build: nessuna CDN, nessuna chiamata di rete,
nessuna chiave. La prima immagine richiede qualche secondo in più perché il
motore si carica; se il riconoscimento fallisce, il campo resta vuoto e
l'immagine viene comunque salvata come foto del prodotto.

---

## Controllo a PC spento (facoltativo)

Il percorso principale resta locale. Se però vuoi che i prezzi si aggiornino
anche a computer spento, in `.github/workflows/controllo.yml.esempio` trovi un
workflow GitHub Actions già pronto: gira `npm run controlla` una volta al giorno
e ricommitta `dati/prodotti.json`.

Per usarlo:

1. rinomina il file in `controllo.yml`;
2. togli `dati/prodotti.json` da `.gitignore` e committalo, altrimenti il
   workflow non ha niente da controllare;
3. **usa un repository privato**: quel file è la tua lista della spesa.

Ricordati poi di fare `git pull` sul computer prima di aprire Soglia, se no le
due copie divergono. È il motivo per cui questa strada resta facoltativa.

---

## Com'è fatto

```
server/
  index.js          API + statici (Express)
  archivio.js       lettura/scrittura JSON, backup, migrazione
  scheduler.js      node-cron
  controllo.js      orchestrazione: archivio + scraper
  controlla.js      la stessa cosa da riga di comando
  scraper/
    scarica.js          richiesta HTTP con User-Agent da browser
    estrai.js           la cascata JSON-LD → microdata → meta → DOM
    normalizzaPrezzo.js "1.299,00 €" → 1299
    controlla.js        coda seriale, disaccoppiata da Express
web/src/
  theme.css         i token: colori, raggi, scala tipografica
  components/       Vetro (il materiale), FasciaPrezzo (l'elemento firma), …
  schermate/        Elenco, Dettaglio, Impostazioni
  utils/            formattazione, calcolo del verdetto, OCR
dati/               i tuoi dati (creati al primo avvio)
```

Dipendenze: `express`, `node-cron`, `cheerio` per il server; React, Vite e
`tesseract.js` per l'interfaccia. Nessun ORM, nessuno state manager, nessuna
libreria di UI o di grafici: il CSS e l'SVG sono scritti a mano.
