# Bygg och installera fraktPDF själv

Den här guiden visar hur du bygger fraktPDF från källkoden och installerar resultatet på din egen dator. Den beskriver **inte** hur man publicerar/släpper versioner till andra — det gör projektets underhållare.

## Förutsättningar

- Node.js och npm installerade (LTS rekommenderas).
- Windows 10/11 (fraktPDF är ett Windows-program).

## 1. Hämta källkoden

```bash
git clone https://github.com/seplateshelp/fraktPDF.git
cd fraktPDF
npm install
```

## 2. Kör direkt från källkoden (för utveckling/test)

```bash
npm start
```

Programmet startar utan att bygga någon installerare — bra när du bara vill testa.

## 3. Bygg en Windows-installerare

```bash
npm run dist
```

electron-builder bygger installeraren till mappen `release-installer/`. Resultatet blir:

```
release-installer/
  fraktPDF-Setup-<version>.exe      # den färdiga installeraren
  win-unpacked/                     # den okomprimerade appen (kan köras direkt)
```

## 4. Installera

Kör `fraktPDF-Setup-<version>.exe`. Installeraren är tyst och snabb — den installerar utan att be om val, och lägger till genvägar på skrivbordet och i startmenyn. Programmet installeras för den aktuella användaren och kräver inga adminrättigheter.

Vill du istället köra utan att installera kan du köra `win-unpacked\fraktPDF.exe` direkt.

## Vanliga frågor

| Problem | Lösning |
| --- | --- |
| `npm start` startar inte | Se till att `npm install` kördes utan fel och att Node.js är installerat. |
| Bygget klagar på Electron | Kontrollera internettillgång — electron-builder laddar ner Electron vid första bygget. |
| SmartScreen-varning vid installation | Installeraren är inte kodsignerad. Klicka "Mer info → Kör ändå" om du litar på källan. Bakomliggande orsak: projektet är inte kodsignerat. |

## Projektstruktur

```
src/
  main.js      # Huvudprocess: fönster, utskrift, PDF
  preload.js   # Säker brygga renderer <-> main
  index.html   # Gränssnitt
  renderer.js  # All logik i gränssnittet
  styles.css   # Tema, accentfärger, layout
  assets/      # Ikon och logotyp
package.json   # Beroenden, skript och build-konfiguration
```
