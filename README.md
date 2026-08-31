# fraktPDF

<p align="center">
  <img src="https://i.ibb.co/rGTq6VYQ/Nytt-projekt-2026-08-31-T214801-090.png" alt="fraktPDF banner" width="800">
</p>

<p align="center">
  <a href="https://github.com/seplateshelp/fraktpdf/releases/latest">
    <img src="https://i.ibb.co/bj3wTJV2/Nytt-projekt-2026-08-31-T225008-821.png" alt="Ladda ner senaste versionen" width="800">
  </a>
</p>

<h3 align="center">Enklare sätt att skriva ut</h3>

<p align="center">
  Beskär och skriv ut frakt- och paketetiketter snabbt, utan krångel.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="License">
  <img src="https://img.shields.io/badge/status-active-brightgreen" alt="Status">
  <img src="https://img.shields.io/badge/platform-Windows-0078D6" alt="Platform">
</p>

---

## Om fraktPDF

Vi har tröttnat på att det ska vara krångligt att skriva ut fraktetiketter eller andra etiketter. Ibland erbjuds inte det format eller den storlek man faktiskt behöver, och de program som finns idag är ofta onödigt komplexa — de saknar smidighet och fungerar inte effektivt i vardagen.

Där kommer **fraktPDF** in och löser problemet:

1. Öppna din PDF-fil
2. Tryck på en knapp för att beskära
3. Skriv ut

Enkelt som det.

## Funktioner

- 📄 Öppna valfri PDF-etikett direkt i programmet
- ✂️ Beskär etiketten med ett knapptryck
- 🖨️ Skriv ut direkt — med valfri standard-skrivare och DPI
- ⚡ Skapa egna **presets med hotkeys** för snabbare, mer effektiv packning
- 🏷️ **Skapa PDF** från grunden: lägg till text och bild, anpassa typsnitt/storlek, justera och spara som etikett
- 🌗 **Tema**: mörkt eller ljust läge, med 7 accentfärger att välja mellan
- 🔄 **Automatiska uppdateringar** direkt från GitHub (eller "fråga mig först"-läge)
- 🔤 **Svenska och engelska**
- 📦 Perfekt för t.ex. **Tradera**, som bara erbjuder A4-format på frakter — ställ in en preset en gång och skriv ut på sekunder
- 🔓 Öppen källkod och enkel att använda

Efter första starten visas en **guide** där du ställer in språk, uppdateringsläge, tema, accentfärg och utskrift. Allt kan ändras när som helst via ⚙ **Inställningar**.

## Varför fraktPDF?

Befintliga alternativ är ofta tunga, otympliga och saknar stöd för anpassade format och storlekar. fraktPDF är byggt för att vara snabbt, lätt och anpassningsbart för just ditt arbetsflöde — särskilt när du hanterar många etiketter i följd.

<p align="center">
  <img src="https://i.ibb.co/B5f4QqCd/image-2026-08-31-T221224-825.png" alt="fraktPDF overblick" width="800">
</p>

## Installation

fraktPDF stödjer endast **Windows 10/11**.

### Ladda ner färdig installerare
Ladda ner senaste versionen från [Releases](https://github.com/seplateshelp/fraktPDF/releases). Installeraren är tyst och snabb — inga guider som stör. När en ny version släpps uppdateras programmet automatiskt (eller efter att du godkänt det, beroende på inställningarna). Du kan även bygga den själv från källkoden — se [Bygg och installera själv](#bygg-och-installera-själv).

## Användning

1. Öppna en PDF-fil i fraktPDF
2. Välj eller skapa en preset för det format du vill beskära till
3. Klicka på beskär-knappen (eller använd din hotkey)
4. Skriv ut

För att lägga en etikett i utskriftskö, klicka på **Lägg till i kö**. När du är redo trycker du **Skriv ut alla**.

## Presets & hotkeys

Att skapa presets och hotkeys är enklare än någonsin. Vid sidopanelen vid "Förinställningar" finns det en knapp "Spara aktuell". Beskär din PDF och tryck sedan på Spara. Där kan du skriva in ett namn och välja en hotkey. Efter sparat kan du när som helst trycka på den knappen för att få in samma beskäring.

### Förinställda hotkeys:
- **0** - Skriv ut
- **Q** - Lägg PDF i kö
- **CTRL + C** - Kopiera textblock (Skapa PDF)
- **CTRL + V** - Klistra in textblock (Skapa PDF)
- **CTRL + D** - Duplicera textblock (Skapa PDF)
- **T** - Lägg till textblock (Skapa PDF)

## Inställningar

Öppna ⚙ **Inställningar** längst ner i sidopanelen (eller i guiden vid första start):

- **Tema**: Mörkt / Ljust, plus accentfärg (blå, grön, gul, lila, röd, vit eller orange)
- **Uppdateringar**: automatiskt eller fråga mig först
- **Språk**: Svenska / English
- **Utskrift**: standard-skrivare (utan dialogruta), DPI och standard pappersformat

## Bygg och installera själv

Vill du bygga installeraren från källkoden själv (istället för att ladda ner den färdiga) gör du så här:

```bash
git clone https://github.com/seplateshelp/fraktPDF.git
cd fraktPDF
npm install
npm run dist    # bygger Windows-installeraren till mappen release-installer/
```

Installeraren lägger du sedan i `release-installer/` med namnet `fraktPDF-Setup-<version>.exe`. Du kan också köra programmet direkt från källkoden med `npm start` för att testa utan att bygga något.

## Ansvarsfriskrivning

Vi ansvarar inte för användningen av programmet. Allt förvaras lokalt på din dator och inget delas med oss.

## Kontakt

Har du frågor, buggrapporter eller förslag? Öppna gärna ett [Issue](https://github.com/seplateshelp/fraktPDF/issues) eller maila till hej@seplates.se
