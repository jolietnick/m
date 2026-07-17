# Marz for U

Piccola applicazione statica che raccoglie le playlist Marz da YouTube, permette di cercare brani e artisti e apre le playlist in YouTube Music o SimpMusic.

## Sito

<https://jolietnick.github.io/m/>

## Sviluppo e controlli

Non servono dipendenze applicative. Per eseguire i controlli con Node.js 22:

```sh
npm run check
npm test
```

La CI esegue gli stessi controlli a ogni pull request e a ogni aggiornamento di `main`.

## Chiave YouTube Data API

Il sito è interamente statico: qualsiasi chiave usata dal browser è necessariamente visibile ai visitatori. La chiave deve quindi essere trattata come identificatore pubblico e protetta nella Google Cloud Console:

1. limita l'applicazione ai referrer HTTP `https://jolietnick.github.io/m/*`;
2. limita l'API consentita a **YouTube Data API v3**;
3. imposta una quota adeguata e monitora gli utilizzi anomali;
4. ruota la chiave se in passato è stata usata senza queste restrizioni.

## Struttura

- `index.html`: interfaccia della pagina;
- `style.css`: presentazione e layout responsive;
- `app-core.js`: funzioni pure e testabili;
- `app.js`: caricamento dei dati e interazioni con la pagina;
- `tests/`: test automatici senza dipendenze esterne.
