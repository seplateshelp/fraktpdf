# Publicera fraktPDF

Den här guiden förklarar hur du publicerar fraktPDF, både källkoden och färdiga versioner med automatiska uppdateringar.

## Förutsättningar

- Ett GitHub-konto och ett repo (t.ex. `seplateshelp/fraktPDF`).
- `gh`-CLI eller Git inloggat med rättigheter till repot.
- Node.js + npm installerat lokalt.

---

## Vem kan publicera releaser? (viktigt)

**Bara du (och eventuella medarbetare du lägger till) kan publicera releaser.** Detta är GitHub:s standardbeteende — du behöver inte göra något extra för att låsa det:

- Alla som inte är medarbetare kan **använda** programmet: klona källkoden och ladda ner/automatuppdatera via [Releases](https://github.com/seplateshelp/fraktPDF/releases).
- Ingen utanför repot kan **pusha**, skapa taggar eller publicera/ändra releaser. Det kräver skrivrättigheter, som bara ägaren (eller konton du lägger till under **Settings → Collaborators / Manage access**) har.
- **Auto-uppdateringen fungerar för alla** utan någon inloggning: appen hämtar `latest.yml` och installeraren från GitHubs publika nedladdningslänk.

Med andra ord: den som släpper versionen är alltid den som kontrollerar repot. För att en annan person ska kunna släppa en version måste du aktivt lägga till dem som medarbetare med skrivrättigheter.

---

## 1. Publicera källkoden

Första gången du trycker upp hela källkoden till ett nytt/annat repo:

```bash
# Alla källfilerna ligger i src/ tillsammans med package.json, README m.m.
git init
git add -A
git commit -m "Initial release"
git branch -M main
git remote add origin https://github.com/SEPLATES_HELP/fraktPDF.git   # byt till ditt repo
git push -u origin main
```

(`.gitignore` ser till att `node_modules/`, `release-installer/` och byggartefakter inte trycks upp.)

För framtida ändringar räcker det med:
```bash
git add -A
git commit -m "Beskriv vad du ändrade"
git push
```

---

## 2. Bygga och publicera en release (installerare + auto-update)

fraktPDF använder **electron-builder** med `publish` satt till GitHub. Det gör att en release som laddas upp till GitHub automatiskt fungerar med **elektron-updater** i appen.

### Steg för steg

**1. Uppdatera versionsnumret** i `package.json` (t.ex. `1.0.0` → `1.1.0`). Uppdateringar jämförs med semantisk versionshantering, så en ny version måste vara högre än den förra.

**2. Bygg och publicera** (electro-builder skapar installeraren *och* laddar upp den, samt filen `latest.yml` som uppdateringsmotorn behöver):

```bash
cd fraktPDF
npm install
npm run release   # = electron-builder --win --publish always
```

> Du får en fråga om en GitHub-token första gången, eller så anger du den direkt: `GH_TOKEN=<din-token> npm run release`

electron-builder gör sedan följande automatiskt:
- Bygger `fraktPDF Setup <version>.exe` (tyst NSIS-installerare).
- Skapar en tagg + release på GitHub (t.ex. `v1.1.0`).
- Laddar upp `Setup .exe`, `.blockmap` och `latest.yml` till releasen.

**3. Klart!** Användare med den installerade versionen får uppdateringen automatiskt (eller efter godkännande, beroende på inställningen i appen).

### Bara bygga utan att publicera (för eget test)

```bash
npm run dist      # electron-builder --win --publish never
```

Installeraren hamnar i `release-installer/`.

---

## 3. Hur auto-uppdateringen fungerar

- Vid start kontrollerar appen senaste releasen på GitHub.
- **Automatiskt läge** (standard): ny version laddas ner och installeras, appen startas om, och en stängbar "uppdaterad"-notis visas.
- **Fråga mig först-läget**: en ruta frågar om du vill uppdatera nu eller senare. Du kan också söka manuellt under ⚙ **Inställningar → Uppdateringar**.

Viktiga tekniska detaljer:
- Uppdateringsmotorn är `electron-updater` och konfigureras i `package.json` under `build.publish`.
- Installeraren är en **enkel-användares (perMachine: false)** tyst NSIS-installation, så uppdateringar kräver inte adminrättigheter.
- En release måste innehålla `latest.yml` (genereras automatiskt av `npm run release`) — utan den fungerar inte auto-uppdatering.

---

## 4. Vanliga problem

| Problem | Lösning |
| --- | --- |
| "Installeraren kan inte uppdateras" | Se till att releasen innehåller `latest.yml` och att versionsnumret är högre än den installerade. |
| Uppdatering kräver inloggning | Generera en token med `repo`-scope och använd `GH_TOKEN`. |
| SmartScreen-varning vid installation | Installeraren är inte kodsignerad. För en helt smidig install kan du koda signera den (t.ex. med ett EV-certifikat) eller låta användare klicka "Mer info → Kör ändå". |

---

## Projektstruktur

```
src/
  main.js      # Huvudprocess: fönster, utskrift, PDF, updater
  preload.js   # Säker brygga renderer <-> main
  index.html   # Gränssnitt
  renderer.js  # All logik i gränssnittet
  styles.css   # Tema, accentfärger, layout
  assets/      # Ikon och logotyp
package.json   # Beror på, skript och build-konfiguration
```
