# rytme

Et Simon-says-inspirert rytmespill. Hver dag genereres en ny rytme. Lytt, husk og gjenta!

## Slik spiller du

1. Trykk **START** på startsiden
2. Du får servert en rytme i 3 runder, hver med et **lytt**- og **spill**-steg

### Runde 1 (4 slag)

- **LYTT** – en nedtelling vises, deretter hører du rytmen spilt med metronom og skarptrommer
- **KLAR?** – nedtelling med sveipende markør
- **TRYKK** – gjenta rytmen ved å trykke på den store knappen

### Runde 2 (4 slag)

Samme opplegg, men BPM dobles

### Runde 3 (8 slag)

Samme opplegg over 8 slag fordelt på to rader i rutenettet.

Etter siste runde får du poengsummen.

## Poengberegning

| Hendelse                       | Poeng               |
| ------------------------------ | ------------------- |
| Riktig slag (treff)            | +100                |
| Riktig slag med perfekt timing | + opptil 100 ekstra |
| Slag på feil sirkel            | −100                |
| Bommet på et rytmeslag         | −50                 |

**Nøyaktighetsbonus** regnes per treff: `max(0, 100 × (1 − avvikMs / 100))`.  
Avvik måles i millisekunder fra det ideelle slaget. Jo nærmere 0 ms avvik, desto høyere bonus.

Totalsum = `max(0, treff×100 − feil×100 − bom×50) + nøyaktighetsbonus`

**Folk flest** = `max(0, antallRytmeslag − 1) × 177`

**Perfekt!** oppnås når du treffer alle rytmeslag, ikke trykker på noen feil sirkler, og nøyaktigheten er minst 75 % på hvert enkelt slag.

Tilbakemeldingen etter spillet baseres på nøyaktigheten:

| Tilbakemelding | Krav |
|---|---|
| **Perfekt!** | Alle treff, ingen feil, og minst 75 % nøyaktighet på hvert slag |
| **Bra!** | Ingen bom eller feil, og gjennomsnittlig nøyaktighet mellom 50 % og 90 % |
| **OK, klarer du bedre?** | En eller flere bom/feil, eller gjennomsnittlig nøyaktighet under 50 % |

## Rekorder

Hver dags beste poengsum lagres i nettleseren (`localStorage`).  
Nye rekorder markeres med **Ny rekord**; ellers vises **Din rekord** fra tidligere.

## Teknisk

Bygget med [Phaser](https://phaser.io) (Canvas-modus) og Web Audio API.

| Modul             | Rolle                              |
| ----------------- | ---------------------------------- |
| `PreloadScene`    | Laster lydfiler                    |
| `GameScene`       | Spillogikk, tilstandsmaskin, input |
| `GridRenderer`    | Tegner rutenett, sveip, effekter   |
| `ScoreKeeper`     | Poengberegning                     |
| `ResultScreen`    | Resultatskjerm og rekorder         |
| `LowLatencyAudio` | Lydplanlegger mot AudioContext     |
| `LevelGenerator`  | Dato-basert rytmegenerering        |

### Utvikling

```bash
npm install
npm run dev
```
