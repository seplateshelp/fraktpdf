import * as pdfjsLib from '../node_modules/pdfjs-dist/build/pdf.mjs';
// PDF.js needs an explicit, absolute worker URL in Electron. A relative path
// makes valid PDFs look invalid after the app has been packaged.
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('../node_modules/pdfjs-dist/build/pdf.worker.mjs', import.meta.url).toString();

const $ = id => document.getElementById(id);
const canvas = $('pdfCanvas'); const ctx = canvas.getContext('2d'); const cropBox = $('cropBox');
let documentData, documentName, documentPath, pdfPage, pageSize, crop = { x: .08, y: .08, width: .84, height: .84 }, drag = null, confirmed = false;
let documents = [], activeDocumentId = null;
let zoom = 1;
let queue = [];
const presetsKey = 'fraktpdf-presets-v1';

// ---- i18n (Svenska / English) ----
const DICT = {
  sv: {
    brandBy: 'av SEPLATES', createPdf: '+ Skapa PDF', openPdf: 'Öppna PDF', print: 'Skriv ut',
    presets: 'Förinställningar', saveCurrent: 'Spara aktuell', noPresets: 'Inga sparade förinställningar.',
    printQueue: 'Utskriftskö', noQueue: 'Inga etiketter i kön.', addQueue: 'Lägg till i kö (Q)',
    addQueueShort: '+ Kö', printAll: 'Skriv ut alla (0)', saveCropped: 'Spara beskuren PDF',
    dropHere: 'Släpp en fraktsedel här', orChoose: 'eller välj en PDF från datorn', choosePdf: 'Välj PDF',
    closeAll: 'Stäng alla', closePdf: 'Stäng PDF', noDoc: 'Öppna en PDF för att börja.',
    remove: 'Ta bort', removePreset: 'Ta bort {name}', inQueue: 'I utskriftskö', closeDoc: 'Stäng {name}',
    opening: 'Öppnar PDF...', openFail: 'PDF:en kunde inte öppnas: {msg}', openFailName: '{name} - kunde inte öppnas',
    confirmedReady: 'Beskärningen är redo för utskrift.', dragHint: 'Dra i ramen för att markera etiketten. Tryck Enter när du är klar.',
    confirmedBadge: '✓ Beskärning klar',
    printFail: 'Kunde inte skriva ut: {msg}', addedToQueue: '{name} lades till i utskriftskö ({n} st).',
    queueSent: 'Utskriftskö skickad.', queuePrintFail: 'Kunde inte skriva ut kön: {msg}',
    overwritten: 'Originalet har skrivits över.', copySaved: 'Kopia sparad.', newLabel: 'Ny fraktsedel',
    defaultText: 'Text',
    savePresetTitle: 'Spara förinställning', savePresetDesc: 'Ge den ett namn och välj ett valfritt snabbkommando.',
    saveCroppedTitle: 'Spara beskuren PDF', saveCroppedDesc: 'Välj hur filen ska sparas.',
    format: 'Format', saveCopy: 'Spara en kopia', overwrite: 'Skriv över original', shortcut: 'Snabbkommando',
    cancel: 'Avbryt', save: 'Spara', back: 'Tillbaka', savePdf: 'Spara PDF',
    presetPlaceholder: 'Till exempel: Tradera standard', none: 'Inget',
    zoomOut: 'Zooma ut', zoomIn: 'Zooma in', resetZoom: 'Återställ zoom',
    settings: 'Inställningar', settingsTitle: 'Inställningar', settingsDesc: 'Anpassa fraktPDF efter ditt arbetsflöde.',
    secAppearance: 'Utseende', theme: 'Tema', themeDark: 'Mörkt', themeLight: 'Ljust',
    accent: 'Accentfärg', accentBlue: 'Blå', accentGreen: 'Grön', accentYellow: 'Gul', accentPurple: 'Lila', accentRed: 'Röd', accentWhite: 'Vit', accentOrange: 'Orange',
    secUpdates: 'Uppdateringar', updateMode: 'Så här uppdateras fraktPDF', updateAuto: 'Uppdatera automatiskt', updateNotify: 'Fråga mig först', checkUpdates: 'Sök efter uppdateringar',
    secLanguage: 'Språk', language: 'Språk',
    secPrint: 'Utskrift', printer: 'Skrivare', printerHint: 'Välj en skrivare för att skriva ut utan dialogruta.', dpi: 'Upplösning (DPI)', dpiHint: 'Standard för utskrift av etiketter.', defaultPaper: 'Standard pappersformat (Skapa PDF)',
    close: 'Stäng',
    updateAvailable: 'Ny version tillgänglig', updateNow: 'Uppdatera nu', later: 'Senare', restartUpdate: 'Starta om och installera',
    updatedToast: 'fraktPDF uppdaterades till {v}.', downloadStart: 'Laddar ner {v}...', updateError: 'Uppdateringen misslyckades: {msg}', upToDate: 'Du har senaste versionen ({v}).',
    setupTitle: 'Välkommen till fraktPDF', setupDesc: 'Konfigurera fraktPDF på 30 sekunder. Du kan ändra allt senare i inställningarna.'
  },
  en: {
    brandBy: 'by SEPLATES', createPdf: '+ Create PDF', openPdf: 'Open PDF', print: 'Print',
    presets: 'Presets', saveCurrent: 'Save current', noPresets: 'No saved presets.',
    printQueue: 'Print queue', noQueue: 'No labels in the queue.', addQueue: 'Add to queue (Q)',
    addQueueShort: '+ Queue', printAll: 'Print all (0)', saveCropped: 'Save cropped PDF',
    dropHere: 'Drop a shipping label here', orChoose: 'or choose a PDF from your computer', choosePdf: 'Choose PDF',
    closeAll: 'Close all', closePdf: 'Close PDF', noDoc: 'Open a PDF to get started.',
    remove: 'Remove', removePreset: 'Remove {name}', inQueue: 'In print queue', closeDoc: 'Close {name}',
    opening: 'Opening PDF...', openFail: 'Could not open PDF: {msg}', openFailName: '{name} - could not open',
    confirmedReady: 'Crop is ready to print.', dragHint: 'Drag the box to mark the label. Press Enter when done.',
    confirmedBadge: '✓ Crop ready',
    printFail: 'Could not print: {msg}', addedToQueue: '{name} added to the print queue ({n} total).',
    queueSent: 'Print queue sent.', queuePrintFail: 'Could not print queue: {msg}',
    overwritten: 'Original has been overwritten.', copySaved: 'Copy saved.', newLabel: 'New label',
    defaultText: 'Text',
    savePresetTitle: 'Save preset', savePresetDesc: 'Give it a name and an optional shortcut key.',
    saveCroppedTitle: 'Save cropped PDF', saveCroppedDesc: 'Choose how to save the file.',
    format: 'Format', saveCopy: 'Save a copy', overwrite: 'Overwrite original', shortcut: 'Shortcut',
    cancel: 'Cancel', save: 'Save', back: 'Back', savePdf: 'Save PDF',
    presetPlaceholder: 'e.g. Tradera default', none: 'None',
    zoomOut: 'Zoom out', zoomIn: 'Zoom in', resetZoom: 'Reset zoom',
    settings: 'Settings', settingsTitle: 'Settings', settingsDesc: 'Customize fraktPDF to your workflow.',
    secAppearance: 'Appearance', theme: 'Theme', themeDark: 'Dark', themeLight: 'Light',
    accent: 'Accent color', accentBlue: 'Blue', accentGreen: 'Green', accentYellow: 'Yellow', accentPurple: 'Purple', accentRed: 'Red', accentWhite: 'White', accentOrange: 'Orange',
    secUpdates: 'Updates', updateMode: 'How fraktPDF updates', updateAuto: 'Update automatically', updateNotify: 'Ask me first', checkUpdates: 'Check for updates',
    secLanguage: 'Language', language: 'Language',
    secPrint: 'Printing', printer: 'Printer', printerHint: 'Choose a printer to print without showing a dialog.', dpi: 'Resolution (DPI)', dpiHint: 'Default for printing labels.', defaultPaper: 'Default paper size (Create PDF)',
    close: 'Close',
    updateAvailable: 'New version available', updateNow: 'Update now', later: 'Later', restartUpdate: 'Restart & install',
    updatedToast: 'fraktPDF updated to {v}.', downloadStart: 'Downloading {v}...', updateError: 'Update failed: {msg}', upToDate: 'You have the latest version ({v}).',
    setupTitle: 'Welcome to fraktPDF', setupDesc: 'Set up fraktPDF in 30 seconds. You can change all of this later in settings.'
  }
};
const fmt = (s, map) => String(s).replace(/\{(\w+)\}/g, (_, k) => (k in map ? map[k] : `{${k}}`));
let lang = localStorage.getItem('fraktpdf-lang') === 'en' ? 'en' : 'sv';
const t = key => DICT[lang][key] || DICT.sv[key] || key;
function applyI18n() {
  document.querySelectorAll('[data-i18n]').forEach(el => (el.textContent = t(el.dataset.i18n)));
  document.querySelectorAll('[data-i18n-title]').forEach(el => (el.title = t(el.dataset.i18nTitle)));
  document.documentElement.lang = lang;
  $('langToggle').textContent = lang === 'sv' ? 'Svenska' : 'English';
  $('langToggle').title = lang === 'sv' ? 'Switch to English (Svenska)' : 'Byt till Svenska (English)';
  $('presetName').placeholder = t('presetPlaceholder');
  $('emptyOpen').textContent = t('choosePdf');
  $('confirmedBadge').textContent = t('confirmedBadge');
  $('settingsHeading').textContent = isSetup ? t('setupTitle') : t('settingsTitle');
  $('settingsIntro').textContent = isSetup ? t('setupDesc') : t('settingsDesc');
  $('settingsLang').value = lang;
  renderPresets(); renderQueue(); renderTabs();
  if (inCreate()) { $('fileName').textContent = t('newLabel'); }
  else if (!documentData) { $('fileName').textContent = t('noDoc'); }
  else if (documentData) { $('fileName').textContent = documentName; setConfirmed(confirmed); }
}
$('langToggle').onclick = () => { lang = lang === 'sv' ? 'en' : 'sv'; localStorage.setItem('fraktpdf-lang', lang); const s = getSettings(); s.language = lang; setSettings(s); applyI18n(); };

// ---- Settings (persisted) ----
const settingsKey = 'fraktpdf-settings-v1';
const defaultSettings = {
  language: 'sv', updateMode: 'auto', theme: 'dark', accent: 'blue',
  printer: '', dpi: 300, paper: 'a4', setupDone: false
};
function getSettings() { try { return { ...defaultSettings, ...JSON.parse(localStorage.getItem(settingsKey)) }; } catch { return { ...defaultSettings }; } }
function setSettings(settings) { localStorage.setItem(settingsKey, JSON.stringify(settings)); }

let isSetup = false;
let settings = getSettings();
if (typeof lang !== 'undefined' && settings.language !== lang) settings.language = lang;

function applyAppearance() {
  document.documentElement.setAttribute('data-theme', settings.theme);
  document.documentElement.setAttribute('data-accent', settings.accent);
  syncChips('theme', settings.theme, 'themeChips');
  syncChips('accent', settings.accent, 'accentChips');
  syncChips('updateMode', settings.updateMode, 'updateChips');
  $('settingsLang').value = settings.language;
}
function syncChips(name, value, containerId) {
  const chips = document.querySelectorAll(`#${containerId} .chip`);
  chips.forEach(chip => { const input = chip.querySelector('input[type="radio"]'); chip.classList.toggle('selected', input && input.value === value); });
}

// ---- Toasts ----
function toast(text, options = {}) {
  const container = $('toastContainer');
  const el = document.createElement('div'); el.className = `toast ${options.type || 'info'}`;
  const txt = document.createElement('span'); txt.className = 'toast-text'; txt.textContent = text;
  el.append(txt);
  let closed = false;
  const close = () => { if (closed) return; closed = true; el.remove(); };
  if (options.actionText && options.onAction) {
    const b = document.createElement('button'); b.className = 'primary'; b.textContent = options.actionText;
    b.onclick = () => { close(); options.onAction(); };
    el.append(b);
  }
  const closeBtn = document.createElement('button'); closeBtn.className = 'toast-close'; closeBtn.setAttribute('aria-label', 'Close'); closeBtn.textContent = '×';
  closeBtn.onclick = close; el.append(closeBtn);
  container.append(el);
  if (options.timeout !== false && !options.actionText) setTimeout(close, options.timeout || 5000);
  return close;
}

// ---- Version ----
async function initVersion() {
  try {
    const v = await window.frakt.getVersion();
    if (v) { appVersion = v; $('versionText').textContent = 'v' + v; $('versionText').title = 'fraktPDF v' + v; }
  } catch {}
}
let appVersion = '1.0.0';
initVersion();

// ---- Auto-update UI ----
function openUpdateDialog(message, { primaryText = t('updateNow'), onPrimary, showProgress = false } = {}) {
  $('updateMessage').textContent = message;
  $('updateProgressWrap').classList.toggle('hidden', !showProgress);
  $('updateProgressFill').style.width = '0%'; $('updateProgressPct').textContent = '0%';
  $('updateNowBtn').textContent = primaryText;
  $('updateNowBtn').onclick = () => { onPrimary && onPrimary(); };
  $('updateDialog').showModal();
}
function closeUpdateDialog() { if ($('updateDialog').open) $('updateDialog').close(); }

$('updateDialog').querySelector('button[value="later"]').onclick = e => { e.preventDefault(); closeUpdateDialog(); };

$('checkUpdatesBtn').onclick = async () => {
  const res = await window.frakt.updaterCheck();
  if (!res) toast(t('upToDate', { v: 'v' + appVersion }), { type: 'info', timeout: 5000 });
};

function initUpdater() {
  window.frakt.onUpdateStatus(info => {
    if (info.status === 'available') {
      const ver = info.info && info.info.version ? 'v' + info.info.version : '';
      if (settings.updateMode === 'notify') {
        openUpdateDialog(`${t('updateAvailable')}${ver ? ' · ' + ver : ''}`, {
          primaryText: t('updateNow'),
          onPrimary: () => { window.frakt.updaterDownload(); $('updateProgressWrap').classList.remove('hidden'); $('updateNowBtn').disabled = true; toast(fmt(t('downloadStart'), { v: ver || 'v' + appVersion }), { type: 'info' }); }
        });
      } else {
        toast(fmt(t('downloadStart'), { v: ver || 'v' + appVersion }), { type: 'info' });
      }
    } else if (info.status === 'downloading') {
      $('updateProgressWrap').classList.remove('hidden');
      $('updateProgressPct').textContent = '0%';
    } else if (info.status === 'downloaded') {
      $('updateProgressWrap').classList.add('hidden');
      if (settings.updateMode === 'notify') openUpdateDialog(t('updateAvailable'), {
        primaryText: t('restartUpdate'),
        onPrimary: () => window.frakt.updaterInstall()
      });
    } else if (info.status === 'error') {
      toast(fmt(t('updateError'), { msg: info.message || '' }), { type: 'error' });
    }
  });
  window.frakt.onUpdateProgress(info => {
    const pct = info && info.percent != null ? Math.round(info.percent) : 0;
    $('updateProgressFill').style.width = `${pct}%`;
    $('updateProgressPct').textContent = `${pct}%`;
  });
  window.frakt.onAppUpdated(version => {
    toast(fmt(t('updatedToast'), { v: version ? 'v' + version : '' }), { type: 'success', timeout: 8000 });
  });
  window.frakt.updaterSetMode(settings.updateMode);
  setTimeout(() => window.frakt.updaterCheck(), 3000);
}

// ---- Settings dialog ----
async function populatePrinters() {
  const sel = $('settingsPrinter');
  const printers = await window.frakt.getPrinters();
  sel.replaceChildren();
  const none = document.createElement('option'); none.value = ''; none.textContent = t('none');
  sel.append(none);
  for (const p of printers) {
    const opt = document.createElement('option'); opt.value = p.name;
    opt.textContent = p.isDefault ? `${p.name} (${lang === 'sv' ? 'standard' : 'default'})` : p.name;
    sel.append(opt);
  }
  sel.value = settings.printer;
}
function openSettingsDialog(gotoSetup) {
  isSetup = !!gotoSetup;
  $('settingsHeading').textContent = isSetup ? t('setupTitle') : t('settingsTitle');
  $('settingsIntro').textContent = isSetup ? t('setupDesc') : t('settingsDesc');
  $('settingsLang').value = lang;
  $('settingsDpi').value = String(settings.dpi);
  $('settingsPaper').value = settings.paper;
  applyAppearance();
  populatePrinters();
  $('settingsDialog').showModal();
}
$('settingsButton').onclick = () => openSettingsDialog(false);

function readSettingsFromDialog() {
  const theme = $('themeChips').querySelector('input[name="theme"]:checked').value;
  const accent = $('accentChips').querySelector('input[name="accent"]:checked').value;
  const updateMode = $('updateChips').querySelector('input[name="updateMode"]:checked').value;
  const dpi = Number($('settingsDpi').value) || 300;
  const paper = $('settingsPaper').value;
  const printer = $('settingsPrinter').value;
  const language = $('settingsLang').value;
  return { language, updateMode, theme, accent, printer, dpi, paper, setupDone: true };
}
$('settingsDialog').querySelector('button[value="cancel"]').onclick = e => { e.preventDefault(); $('settingsDialog').close(); };
$('confirmSettings').onclick = e => {
  e.preventDefault();
  const next = readSettingsFromDialog();
  const prevTheme = settings.theme, prevAccent = settings.accent;
  settings = { ...settings, ...next };
  setSettings(settings);
  if (settings.language !== lang) {
    lang = settings.language; localStorage.setItem('fraktpdf-lang', lang);
    document.documentElement.lang = lang; applyI18n();
  }
  applyAppearance();
  if (prevTheme !== settings.theme || prevAccent !== settings.accent) { if (inCreate()) renderCreateCanvas(); else if (documentData) updateBox(); }
  window.frakt.updaterSetMode(settings.updateMode);
  $('settingsDialog').close();
  if (isSetup) { isSetup = false; $('settingsButton').hidden = false; }
};
$('settingsDialog').querySelector('form').addEventListener('submit', e => e.preventDefault());

// ---- Window controls ----
$('winMin').onclick = () => window.frakt.windowMinimize();
$('winMax').onclick = () => window.frakt.windowMaximize();
$('winClose').onclick = () => window.frakt.windowClose();

// ---- Presets ----
function getPresets() { try { return JSON.parse(localStorage.getItem(presetsKey)) || []; } catch { return []; } }
function setPresets(items) { localStorage.setItem(presetsKey, JSON.stringify(items)); renderPresets(); }
function renderPresets() {
  const list = $('presetList'); const presets = getPresets();
  list.replaceChildren();
  if (!presets.length) { list.innerHTML = `<p class="muted">${t('noPresets')}</p>`; return; }
  for (const preset of presets) {
    const row = document.createElement('div'); row.className = 'preset';
    const use = document.createElement('button'); use.className = 'preset-use'; use.textContent = preset.hotkey ? `${preset.name}  ·  ${preset.hotkey}` : preset.name;
    use.onclick = () => { crop = preset.crop; updateBox(); setConfirmed(false); };
    const del = document.createElement('button'); del.className = 'preset-delete'; del.textContent = t('remove'); del.title = fmt(t('removePreset'), { name: preset.name });
    del.onclick = () => setPresets(getPresets().filter(item => item.id !== preset.id));
    row.append(use, del); list.append(row);
  }
}
function visualSize() { return { width: canvas.clientWidth, height: canvas.clientHeight }; }
function updateBox() { const s = visualSize(); cropBox.style.left = `${crop.x * s.width}px`; cropBox.style.top = `${crop.y * s.height}px`; cropBox.style.width = `${crop.width * s.width}px`; cropBox.style.height = `${crop.height * s.height}px`; }
function setConfirmed(value) { confirmed = value; $('confirmedBadge').classList.toggle('show', value); $('confirmedBadge').textContent = t('confirmedBadge'); $('statusText').textContent = value ? t('confirmedReady') : t('dragHint'); }

function saveActiveDocument() {
  const current = documents.find(item => item.id === activeDocumentId);
  if (current) Object.assign(current, { crop: { ...crop }, confirmed });
}
function renderTabs() {
  const list = $('tabList'); list.replaceChildren();
  for (const doc of documents) {
    const tab = document.createElement('div'); tab.className = `tab${doc.id === activeDocumentId ? ' active' : ''}${queue.some(q => q.sourceId === doc.id) ? ' badge' : ''}`;
    const name = document.createElement('span'); name.className = 'tab-name'; name.textContent = doc.name; name.title = doc.name;
    const close = document.createElement('button'); close.className = 'tab-close'; close.textContent = '×'; close.title = fmt(t('closeDoc'), { name: doc.name });
    tab.onclick = () => activateDocument(doc.id);
    close.onclick = event => { event.stopPropagation(); closeDocument(doc.id); };
    tab.append(name, close);
    if (queue.some(q => q.sourceId === doc.id)) { const dot = document.createElement('span'); dot.className = 'queue-dot'; dot.title = t('inQueue'); tab.append(dot); }
    list.append(tab);
  }
}
function showHome() {
  activeDocumentId = null; documentData = undefined; $('tabs').classList.add('hidden'); $('editor').classList.add('hidden'); $('emptyState').classList.remove('hidden'); $('viewer').classList.remove('hidden'); $('createView').classList.add('hidden');
  $('fileName').textContent = t('noDoc'); $('printButton').disabled = true; $('exportButton').disabled = true; $('savePreset').disabled = true; $('queueAddButton').disabled = true; $('queueAddButtonTop').disabled = true;
}
async function activateDocument(id) {
  if (id === activeDocumentId) return;
  saveActiveDocument(); const doc = documents.find(item => item.id === id); if (!doc) return;
  activeDocumentId = id; documentData = doc.data; documentName = doc.name; documentPath = doc.path; crop = { ...doc.crop }; confirmed = doc.confirmed; zoom = doc.zoom || 1;
  $('fileName').textContent = doc.name; $('emptyState').classList.add('hidden'); $('tabs').classList.remove('hidden'); $('editor').classList.remove('hidden'); $('viewer').classList.remove('hidden'); $('createView').classList.add('hidden');
  $('printButton').disabled = false; $('exportButton').disabled = false; $('savePreset').disabled = false; $('queueAddButton').disabled = false; $('queueAddButtonTop').disabled = false; renderTabs(); await renderActivePdf();
}
function closeDocument(id) {
  saveActiveDocument(); const index = documents.findIndex(item => item.id === id); if (index === -1) return;
  documents.splice(index, 1);
  if (!documents.length) { showHome(); return; }
  if (id === activeDocumentId) { activeDocumentId = null; activateDocument(documents[Math.min(index, documents.length - 1)].id); } else renderTabs();
}
function closeAllDocuments() { documents = []; showHome(); }
async function renderActivePdf() {
  $('statusText').textContent = t('opening');
  try {
    const bytes = Uint8Array.from(atob(documentData), char => char.charCodeAt(0));
    const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
    pdfPage = await pdf.getPage(1); pageSize = pdfPage.getViewport({ scale: 1 });
    const availableWidth = Math.max(300, $('stage').clientWidth - 100); const availableHeight = Math.max(300, $('stage').clientHeight - 84);
    const baseScale = Math.min(availableWidth / pageSize.width, availableHeight / pageSize.height, 1.35);
    const scale = baseScale * zoom; const viewport = pdfPage.getViewport({ scale });
    const density = window.devicePixelRatio || 1; canvas.width = Math.floor(viewport.width * density); canvas.height = Math.floor(viewport.height * density); canvas.style.width = `${viewport.width}px`; canvas.style.height = `${viewport.height}px`;
    await pdfPage.render({ canvasContext: ctx, viewport, transform: density === 1 ? null : [density, 0, 0, density, 0, 0] }).promise;
    setConfirmed(confirmed); requestAnimationFrame(updateBox);
  } catch (error) {
    console.error('PDF could not be opened', error);
    $('statusText').textContent = fmt(t('openFail'), { msg: error.message || 'okänt fel' });
    $('fileName').textContent = fmt(t('openFailName'), { name: documentName });
  }
}
function setZoom(z) {
  zoom = Math.max(.25, Math.min(4, z));
  $('zoomPct').textContent = `${Math.round(zoom * 100)}%`;
  const doc = documents.find(item => item.id === activeDocumentId); if (doc) doc.zoom = zoom;
  if (documentData) renderActivePdf();
}
// Ctrl+scroll zooms toward the cursor. The fraction of the page under the cursor
// is kept fixed by adjusting the scroll a frame after the canvas re-renders.
let pointerX = 0, pointerY = 0;
function zoomToPointer(stageEl, el, newZoom, clientX, clientY) {
  const old = el.getBoundingClientRect();
  const fx = (clientX - old.left) / old.width, fy = (clientY - old.top) / old.height;
  setZoom(newZoom);
  requestAnimationFrame(() => {
    const r = el.getBoundingClientRect();
    const desiredLeft = (old.left + fx * old.width) - fx * r.width;
    const desiredTop = (old.top + fy * old.height) - fy * r.height;
    stageEl.scrollLeft += (r.left - desiredLeft);
    stageEl.scrollTop += (r.top - desiredTop);
  });
}
async function openPdf() { const files = await window.frakt.pickPdf(); addFiles(files); }
async function addFiles(files) {
  if (!files.length) return;
  saveActiveDocument();
  for (const file of files) {
    if (!documents.some(item => item.path === file.path)) documents.push({ id: crypto.randomUUID(), path: file.path, name: file.name, data: file.data, crop: { x: .08, y: .08, width: .84, height: .84 }, confirmed: false, zoom: 1 });
  }
  const last = documents.find(item => item.path === files.at(-1).path); activeDocumentId = null; await activateDocument(last.id);
}
function constrain(next) { const min = .04; next.width = Math.max(min, Math.min(next.width, 1)); next.height = Math.max(min, Math.min(next.height, 1)); next.x = Math.max(0, Math.min(next.x, 1 - next.width)); next.y = Math.max(0, Math.min(next.y, 1 - next.height)); return next; }
cropBox.addEventListener('pointerdown', event => { if (!documentData) return; event.preventDefault(); const rect = cropBox.getBoundingClientRect(); drag = { startX: event.clientX, startY: event.clientY, original: { ...crop }, handle: [...event.target.classList].find(c => ['nw','ne','se','sw'].includes(c)) || 'move', stage: visualSize() }; cropBox.setPointerCapture(event.pointerId); });
cropBox.addEventListener('pointermove', event => { if (!drag) return; const dx = (event.clientX - drag.startX) / drag.stage.width; const dy = (event.clientY - drag.startY) / drag.stage.height; const o = drag.original; let n = { ...o }; if (drag.handle === 'move') { n.x += dx; n.y += dy; } else { if (drag.handle.includes('w')) { n.x += dx; n.width -= dx; } if (drag.handle.includes('e')) n.width += dx; if (drag.handle.includes('n')) { n.y += dy; n.height -= dy; } if (drag.handle.includes('s')) n.height += dy; } crop = constrain(n); updateBox(); setConfirmed(false); });
cropBox.addEventListener('pointerup', () => { drag = null; });
async function print() {
  if (!documentData) return;
  if (!confirmed) setConfirmed(true);
  $('printButton').disabled = true;
  const st = getSettings();
  const result = await window.frakt.printCropped({ data: documentData, crop, settings: { printer: st.printer, dpi: st.dpi } });
  $('printButton').disabled = false;
  if (!result.success && result.failureReason) $('statusText').textContent = fmt(t('printFail'), { msg: result.failureReason });
}

// ---- Utskriftskö ----
function renderQueue() {
  const list = $('queueList'); list.replaceChildren();
  const count = queue.length;
  $('queueCount').textContent = count; $('queueBadge').textContent = count;
  $('queuePrintButton').disabled = count === 0;
  if (!count) { list.innerHTML = `<p class="muted">${t('noQueue')}</p>`; renderTabs(); return; }
  for (const item of queue) {
    const row = document.createElement('div'); row.className = 'queue-item';
    const name = document.createElement('span'); name.className = 'q-name'; name.textContent = item.name; name.title = item.name;
    const remove = document.createElement('button'); remove.className = 'q-remove'; remove.textContent = '×'; remove.title = fmt(t('removePreset'), { name: item.name }); remove.onclick = () => queueRemove(item.id);
    row.append(name, remove); list.append(row);
  }
  renderTabs();
}
function queueAdd() {
  if (!documentData) return;
  const id = crypto.randomUUID();
  queue.push({ id, sourceId: activeDocumentId, name: documentName, data: documentData, crop: { ...crop } });
  renderQueue();
  $('statusText').textContent = fmt(t('addedToQueue'), { name: documentName, n: queue.length });
}
function queueRemove(id) { queue = queue.filter(item => item.id !== id); renderQueue(); }
async function queuePrint() {
  $('queuePrintButton').disabled = true; $('printButton').disabled = true;
  const st = getSettings();
  const result = await window.frakt.printQueue({ items: queue.map(item => ({ data: item.data, crop: item.crop })), settings: { printer: st.printer, dpi: st.dpi } });
  $('queuePrintButton').disabled = queue.length === 0; $('printButton').disabled = false;
  if (result && result.success) { queue = []; renderQueue(); $('statusText').textContent = t('queueSent'); }
  else if (result && result.failureReason) $('statusText').textContent = fmt(t('queuePrintFail'), { msg: result.failureReason });
}

// ---- Skapa PDF ----
const CREATE_PAPER = { a4: { w: 595.28, h: 841.89 }, a5: { w: 419.53, h: 595.28 }, '10x15': { w: 283.46, h: 425.20 } };
let createBoxes = [], createSelected = null, createPaper = 'a4', createZoom = 1;
let clipboardBox = null;

function dispScaleValue() {
  const stage = $('createStage');
  const size = CREATE_PAPER[createPaper];
  const availW = Math.max(300, stage.clientWidth - 80); const availH = Math.max(300, stage.clientHeight - 80);
  return Math.min(availW / size.w, availH / size.h) * createZoom;
}
const SNAP_PX = 7;

function renderCreateCanvas() {
  const stage = $('createStage'); stage.replaceChildren();
  const size = CREATE_PAPER[createPaper];
  const dispScale = dispScaleValue();
  const page = document.createElement('div'); page.className = 'create-canvas';
  page.style.width = `${size.w * dispScale}px`; page.style.height = `${size.h * dispScale}px`;
  page.addEventListener('pointerdown', () => selectBox(null));
  const others = () => createBoxes.filter(b => b.id !== createSelected);
  for (const box of createBoxes) {
    if (box.type === 'image') { appendCreateImage(page, box, dispScale, size); continue; }
    const el = document.createElement('div'); el.className = 'create-textbox'; el.setAttribute('contenteditable', 'true'); el.spellcheck = false;
    el.textContent = box.text || '';
    el.style.left = `${box.x * dispScale}px`; el.style.top = `${box.y * dispScale}px`;
    el.style.width = `${box.w * dispScale}px`;
    el.style.fontSize = `${box.size * dispScale}px`;
    el.style.fontFamily = createFontFamily(box);
    el.style.fontWeight = box.bold ? '700' : '400';
    el.style.fontStyle = box.italic ? 'italic' : 'normal';
    el.style.color = box.color;
    el.style.textAlign = alignMap(box.align);
    if (box.id === createSelected) el.classList.add('selected');
    el.dataset.id = box.id;
    el.addEventListener('input', () => { box.text = el.textContent; });
    el.addEventListener('focus', () => selectBox(box.id, createSelected !== box.id));
    attachHandlers(el, box, dispScale, size, others);
    if (box.id === createSelected) appendHandles(el, box, dispScale, size, others);
    page.append(el);
  }
  stage.append(page);
}
function appendCreateImage(page, box, dispScale, size) {
  const el = document.createElement('div'); el.className = 'create-image'; if (box.grayscale) el.classList.add('grayscale');
  el.style.left = `${box.x * dispScale}px`; el.style.top = `${box.y * dispScale}px`;
  el.style.width = `${box.w * dispScale}px`; el.style.height = `${box.h * dispScale}px`;
  if (box.id === createSelected) el.classList.add('selected');
  el.dataset.id = box.id;
  const img = document.createElement('img'); img.src = box.grayscale && box.dataUrlGray ? box.dataUrlGray : box.dataUrl; img.draggable = false; el.append(img);
  const others = () => createBoxes.filter(b => b.id !== createSelected);
  attachHandlers(el, box, dispScale, size, others);
  if (box.id === createSelected) appendHandles(el, box, dispScale, size, others);
  page.append(el);
}
function positionBox(box) {
  const stage = $('createStage');
  const dispScale = dispScaleValue();
  const el = stage.querySelector(`[data-id="${box.id}"]`); if (!el) return;
  el.style.left = `${box.x * dispScale}px`; el.style.top = `${box.y * dispScale}px`;
  el.style.width = `${box.w * dispScale}px`;
  if (box.type === 'image') el.style.height = `${box.h * dispScale}px`;
}
function manageSnapGuides(v, h) {
  const stage = $('createStage'); const dispScale = dispScaleValue();
  stage.querySelectorAll('.snap-line').forEach(n => n.remove());
  const page = stage.querySelector('.create-canvas');
  if (!page) return;
  if (v) { const line = document.createElement('div'); line.className = 'snap-line v'; line.style.left = `${v * dispScale}px`; line.style.top = '0'; line.style.height = '100%'; page.append(line); }
  if (h) { const line = document.createElement('div'); line.className = 'snap-line h'; line.style.top = `${h * dispScale}px`; line.style.left = '0'; line.style.width = '100%'; page.append(line); }
}
function attachHandlers(el, box, dispScale, size, others) {
  let dragging = false, moved = false, sx = 0, sy = 0, ox = 0, oy = 0;
  el.addEventListener('pointerdown', ev => {
    if (ev.target.closest('.resize-handle')) return;
    ev.stopPropagation();
    if (createSelected !== box.id) selectBox(box.id);
    sx = ev.clientX; sy = ev.clientY; ox = box.x; oy = box.y; moved = false; dragging = true;
    const move = me => {
      if (!dragging) return;
      if (!moved && Math.hypot(me.clientX - sx, me.clientY - sy) < 5) return;
      if (!moved) { moved = true; }
      box.x = Math.max(0, Math.min(size.w - 20, ox + (me.clientX - sx) / dispScale));
      box.y = Math.max(0, Math.min(size.h - 24, oy + (me.clientY - sy) / dispScale));
      const guides = snapMove(box, others(), size);
      positionBox(box);
      manageSnapGuides(guides.v, guides.h);
    };
    const up = () => { dragging = false; manageSnapGuides(null, null); document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up); };
    document.addEventListener('pointermove', move); document.addEventListener('pointerup', up);
  });
}
function appendHandles(el, box, dispScale, size, others) {
  const corners = box.type === 'image' ? ['nw', 'ne', 'se', 'sw', 'e', 's'] : ['nw', 'ne', 'se', 'sw', 'e'];
  for (const corner of corners) {
    const h = document.createElement('span'); h.className = `resize-handle rh-${corner}`; h.dataset.corner = corner;
    h.addEventListener('pointerdown', ev => {
      ev.stopPropagation(); ev.preventDefault();
      const sx = ev.clientX, sy = ev.clientY; const orig = { ...box };
      const move = me => {
        const ddx = (me.clientX - sx) / dispScale, ddy = (me.clientY - sy) / dispScale;
        let nx = orig.x, ny = orig.y, nw = orig.w, nh = orig.h;
        if (corner.includes('w')) { nw = orig.w - ddx; nx = orig.x + ddx; }
        if (corner.includes('e')) { nw = orig.w + ddx; }
        nw = Math.max(20, nw); nx = Math.max(0, Math.min(nx, size.w - nw));
        if (box.type === 'image') {
          if (corner.includes('n')) { nh = orig.h - ddy; ny = orig.y + ddy; }
          if (corner.includes('s')) { nh = orig.h + ddy; }
          nh = Math.max(20, nh); ny = Math.max(0, Math.min(ny, size.h - nh));
          box.x = nx; box.y = ny; box.w = nw; box.h = nh;
        } else {
          box.x = nx; box.w = nw;
        }
        positionBox(box);
      };
      const up = () => { document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up); renderCreateCanvas(); };
      document.addEventListener('pointermove', move); document.addEventListener('pointerup', up);
    });
    el.append(h);
  }
}
function snapMove(box, others, size) {
  if (!others.length) return { v: null, h: null };
  const TH = SNAP_PX / dispScaleValue();
  const xs = [0, size.w]; const ys = [0, size.h];
  for (const o of others) { xs.push(o.x, o.x + (o.w || 20)); ys.push(o.y, o.y + (o.h || 20)); }
  let dx = 0, bestDX = Infinity, dv = null;
  for (const t of xs) { for (const edge of [box.x, box.x + box.w]) { const d = t - edge; if (Math.abs(d) <= TH && Math.abs(d) < bestDX) { bestDX = Math.abs(d); dx = d; } } }
  if (dx) { box.x += dx; dv = box.x; }
  let dy = 0, bestDY = Infinity, dh = null;
  for (const t of ys) { for (const edge of [box.y, box.y + (box.h || 24)]) { const d = t - edge; if (Math.abs(d) <= TH && Math.abs(d) < bestDY) { bestDY = Math.abs(d); dy = d; } } }
  if (dy) { box.y += dy; dh = box.y; }
  return { v: dv, h: dh };
}
function createFontFamily(box) {
  const f = box.font;
  if (f === 'times') return 'Georgia, "Times New Roman", serif';
  if (f === 'courier') return '"Courier New", monospace';
  if (f === 'helvetica') return 'Helvetica, Arial, sans-serif';
  const fam = FONT_FAMILY_MAP[f];
  return fam ? `"${fam}", sans-serif` : 'Helvetica, Arial, sans-serif';
}
function alignMap(a) { return a === 'center' ? 'center' : a === 'right' ? 'right' : 'left'; }
function selectBox(id, rerender = true) {
  const currentEl = document.activeElement;
  if (createSelected === id && rerender && currentEl && currentEl.isContentEditable) {
    const host = currentEl.closest ? currentEl.closest('[data-id]') : null;
    if (host && host.dataset.id === String(id)) rerender = false;
  }
  createSelected = id;
  $('deleteTextBtn').disabled = !id; $('duplicateBtn').disabled = !id;
  const box = createBoxes.find(b => b.id === id);
  const isImg = box && box.type === 'image';
  $('img-grp') && $('img-grp').classList.toggle('hidden', !isImg);
  if (isImg && box) { $('cImageGray').classList.toggle('active', !!box.grayscale); }
  if (box && !isImg) { $('cFont').value = box.font; $('cSize').value = box.size; $('cBold').classList.toggle('active', box.bold); $('cItalic').classList.toggle('active', box.italic); $('cAlign').value = box.align; $('cColor').value = box.color; }
  if (rerender) renderCreateCanvas();
}
function addTextBox() {
  const size = CREATE_PAPER[createPaper];
  const box = { id: crypto.randomUUID(), text: t('defaultText'), x: 20, y: 20, w: Math.max(120, size.w - 80), h: 30, size: 20, bold: false, italic: false, font: 'helvetica', align: 'left', color: '#000000' };
  createBoxes.push(box); selectBox(box.id);
}
async function addImage() {
  const res = await window.frakt.pickImage();
  if (!res) return;
  const png = await normalizeImage(res.dataUrl);
  const box = { type: 'image', id: crypto.randomUUID(), x: 20, y: 20, w: 140, h: 140, dataUrl: png, name: res.name, grayscale: false };
  createBoxes.push(box); selectBox(box.id);
}
async function normalizeImage(dataUrl) {
  try {
    const img = new Image(); img.src = dataUrl; await img.decode();
    const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
    const x = c.getContext('2d'); x.drawImage(img, 0, 0);
    return c.toDataURL('image/png');
  } catch { return dataUrl; }
}
function duplicateSelected() {
  if (!createSelected) return;
  const src = createBoxes.find(b => b.id === createSelected); if (!src) return;
  const copy = { ...src, id: crypto.randomUUID(), x: src.x + 12, y: src.y + 12 };
  createBoxes.splice(createBoxes.indexOf(src) + 1, 0, copy);
  selectBox(copy.id);
}
function applyFormat(patch) {
  if (!createSelected) return;
  const box = createBoxes.find(b => b.id === createSelected); if (!box) return;
  Object.assign(box, patch); selectBox(createSelected);
}
function deleteSelectedBox() { if (!createSelected) return; createBoxes = createBoxes.filter(b => b.id !== createSelected); createSelected = null; $('deleteTextBtn').disabled = true; $('duplicateBtn').disabled = true; $('img-grp') && $('img-grp').classList.add('hidden'); renderCreateCanvas(); }
function alignBox(axis) {
  if (!createSelected) return;
  const size = CREATE_PAPER[createPaper];
  const box = createBoxes.find(b => b.id === createSelected); if (!box) return;
  const w = box.w || 100, h = box.h || 40;
  if (axis === 'L') box.x = 0;
  else if (axis === 'C') box.x = (size.w - w) / 2;
  else if (axis === 'R') box.x = size.w - w;
  else if (axis === 'T') box.y = 0;
  else if (axis === 'M') box.y = (size.h - h) / 2;
  else if (axis === 'B') box.y = size.h - h;
  renderCreateCanvas();
}
function setCreateZoom(z) {
  createZoom = Math.max(.25, Math.min(4, z));
  $('cZoomPct').textContent = `${Math.round(createZoom * 100)}%`;
  renderCreateCanvas();
}
async function grayscaleDataUrl(dataUrl) {
  try {
    const img = new Image(); img.src = dataUrl; await img.decode();
    const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
    const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0);
    const id = x.getImageData(0, 0, c.width, c.height); const d = id.data;
    for (let i = 0; i < d.length; i += 4) { const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]; d[i] = d[i + 1] = d[i + 2] = g; }
    x.putImageData(id, 0, 0);
    return c.toDataURL('image/png');
  } catch { return dataUrl; }
}

// ---- Händelser ----
$('openButton').onclick = openPdf; $('emptyOpen').onclick = openPdf; $('printButton').onclick = print;
$('newTabButton').onclick = openPdf; $('closeCurrentButton').onclick = () => closeDocument(activeDocumentId); $('closeAllButton').onclick = closeAllDocuments;
$('exportButton').onclick = async () => { const mode = await openSaveDialog(); if (!mode) return; const result = await window.frakt.exportCropped({ data: documentData, crop, sourceName: documentName, sourcePath: documentPath, mode }); if (result && result.success) { setConfirmed(true); $('statusText').textContent = result.mode === 'overwrite' ? t('overwritten') : t('copySaved'); } };
$('zoomIn').onclick = () => setZoom(zoom * 1.25); $('zoomOut').onclick = () => setZoom(zoom / 1.25); $('zoomReset').onclick = () => setZoom(1);
$('queueAddButton').onclick = queueAdd; $('queueAddButtonTop').onclick = queueAdd; $('queuePrintButton').onclick = queuePrint; $('queueButton').onclick = () => { if (queue.length) queuePrint(); };
$('createButton').onclick = () => { saveActiveDocument(); createBoxes = []; createSelected = null; createZoom = 1; addTextBox(); openCreateMode(); };
$('createBackBtn').onclick = () => { if (documents.length) activateDocument(activeDocumentId || documents[0].id); else showHome(); };
$('createExportBtn').onclick = createExport;
$('addTextBtn').onclick = addTextBox; $('addImageBtn').onclick = addImage; $('deleteTextBtn').onclick = deleteSelectedBox; $('duplicateBtn').onclick = duplicateSelected;
$('cFont').onchange = e => applyFormat({ font: e.target.value }); $('cSize').onchange = e => applyFormat({ size: Number(e.target.value) || 20 }); $('cBold').onclick = () => { const b = createBoxes.find(x => x.id === createSelected); applyFormat({ bold: b ? !b.bold : false }); }; $('cItalic').onclick = () => { const b = createBoxes.find(x => x.id === createSelected); applyFormat({ italic: b ? !b.italic : false }); }; $('cAlign').onchange = e => applyFormat({ align: e.target.value }); $('cColor').oninput = e => applyFormat({ color: e.target.value });
$('cSizeSel').onchange = e => { createPaper = e.target.value; renderCreateCanvas(); };
$('cZoomIn').onclick = () => setCreateZoom(createZoom * 1.2); $('cZoomOut').onclick = () => setCreateZoom(createZoom / 1.2);
$('alLeft').onclick = () => alignBox('L'); $('alCenter').onclick = () => alignBox('C'); $('alRight').onclick = () => alignBox('R'); $('alTop').onclick = () => alignBox('T'); $('alMiddle').onclick = () => alignBox('M'); $('alBottom').onclick = () => alignBox('B');
$('cImageGray').onclick = async () => {
  const box = createBoxes.find(b => b.id === createSelected);
  if (!box || box.type !== 'image') return;
  box.grayscale = !box.grayscale;
  if (box.grayscale && !box.dataUrlGray) box.dataUrlGray = await grayscaleDataUrl(box.dataUrl);
  $('cImageGray').classList.toggle('active', !!box.grayscale);
  renderCreateCanvas();
};

function openCreateMode() {
  createPaper = settings.paper || 'a4';
  $('cSizeSel').value = createPaper;
  zoom = 1; $('zoomPct').textContent = '100%';
  $('cZoomPct').textContent = '100%';
  $('viewer').classList.add('hidden'); $('createView').classList.remove('hidden');
  $('fileName').textContent = t('newLabel'); $('printButton').disabled = true; $('exportButton').disabled = true; $('savePreset').disabled = true;
  $('queueAddButton').disabled = true; $('queueAddButtonTop').disabled = true;
  renderCreateCanvas();
}
async function createExport() {
  const exportBoxes = createBoxes.map(b => (b.type === 'image' && b.grayscale && b.dataUrlGray) ? { ...b, dataUrl: b.dataUrlGray } : b);
  const result = await window.frakt.createPdf({ paper: createPaper, boxes: exportBoxes });
  if (!result || !result.success) return;
  const files = await window.frakt.openPath(result.filePath); addFiles(files);
}

function openSaveDialog() {
  return new Promise(resolve => {
    const dlg = $('saveDialog');
    const copyRadio = dlg.querySelector('input[value="copy"]');
    const overRadio = dlg.querySelector('input[value="overwrite"]');
    const optCopy = $('optCopy'), optOver = $('optOverwrite');
    const sync = () => { optCopy.classList.toggle('selected', copyRadio.checked); optOver.classList.toggle('selected', overRadio.checked); };
    copyRadio.onchange = sync; overRadio.onchange = sync;
    const close = (mode) => { dlg.close(); resolve(mode); };
    const cancelBtn = dlg.querySelector('button[value="cancel"]');
    const confirmBtn = $('confirmSave');
    cancelBtn.onclick = e => { e.preventDefault(); close(null); };
    confirmBtn.onclick = e => { e.preventDefault(); close(copyRadio.checked ? 'copy' : 'overwrite'); };
    dlg.querySelector('form').addEventListener('submit', e => e.preventDefault());
    dlg.showModal();
  });
}

$('savePreset').onclick = () => { $('presetName').value = ''; $('presetHotkey').value = ''; $('presetDialog').showModal(); };
$('confirmPreset').onclick = event => { const name = $('presetName').value.trim(); if (!name) { event.preventDefault(); $('presetName').focus(); return; } const hotkey = $('presetHotkey').value; setPresets([...getPresets().filter(item => !hotkey || item.hotkey !== hotkey), { id: crypto.randomUUID(), name, hotkey, crop: { ...crop } }]); };
document.addEventListener('keydown', event => {
  const inCreateMode = !$('createView').classList.contains('hidden');
  const typing = event.target && ['INPUT', 'TEXTAREA'].includes(event.target.tagName) || (event.target && event.target.isContentEditable);
  const modalOpen = ['presetDialog', 'saveDialog', 'settingsDialog', 'updateDialog'].some(id => $(id).open);
  if (modalOpen) {
    if (event.key === 'F11') { event.preventDefault(); window.frakt.windowMaximize(); }
    return;
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'p' && !inCreateMode) { event.preventDefault(); print(); return; }
  if ((event.ctrlKey || event.metaKey) && !typing && !inCreateMode) {
    if (['-', '_'].includes(event.key)) { event.preventDefault(); setZoom(zoom / 1.25); return; }
    if (['=', '+'].includes(event.key)) { event.preventDefault(); setZoom(zoom * 1.25); return; }
    if (event.key.toLowerCase() === '0') { event.preventDefault(); setZoom(1); return; }
  }
  if (inCreateMode && !typing) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'c') { const b = createBoxes.find(x => x.id === createSelected); if (b) { clipboardBox = { ...b, id: crypto.randomUUID() }; } event.preventDefault(); return; }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'v') { if (clipboardBox) { const copy = { ...clipboardBox, id: crypto.randomUUID(), x: clipboardBox.x + 12, y: clipboardBox.y + 12 }; createBoxes.push(copy); selectBox(copy.id); } event.preventDefault(); return; }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd') { event.preventDefault(); duplicateSelected(); return; }
    if ((event.ctrlKey || event.metaKey) && ['-', '_'].includes(event.key)) { event.preventDefault(); setCreateZoom(createZoom / 1.2); return; }
    if ((event.ctrlKey || event.metaKey) && ['=', '+'].includes(event.key)) { event.preventDefault(); setCreateZoom(createZoom * 1.2); return; }
    if (event.key.toLowerCase() === 't') { event.preventDefault(); addTextBox(); }
    if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); deleteSelectedBox(); }
  }
  if (event.key === 'F11') { event.preventDefault(); window.frakt.windowMaximize(); return; }
  if (documentData && !inCreateMode && !$('presetDialog').open && !$('saveDialog').open && !typing) {
    if (event.key === 'Enter') { event.preventDefault(); setConfirmed(true); return; }
    if (event.key === '0') { event.preventDefault(); print(); return; }
    if (event.key.toLowerCase() === 'q') { event.preventDefault(); queueAdd(); return; }
    const preset = !event.ctrlKey && !event.metaKey ? getPresets().find(item => item.hotkey === event.key) : null;
    if (preset) { crop = preset.crop; updateBox(); setConfirmed(false); }
  }
});
window.addEventListener('resize', () => {
  if (inCreate()) { requestAnimationFrame(renderCreateCanvas); return; }
  if (documentData) requestAnimationFrame(updateBox);
});
function inCreate() { return !$('createView').classList.contains('hidden'); }

// Ctrl+scroll zoom toward cursor (viewer). Normal (non-ctrl) scroll is untouched.
const stageEl = $('stage');
stageEl.addEventListener('wheel', event => {
  if (!documentData || !event.ctrlKey) return;
  event.preventDefault();
  pointerX = event.clientX; pointerY = event.clientY;
  const factor = event.deltaY < 0 ? 1.25 : 1 / 1.25;
  zoomToPointer(stageEl, canvas, zoom * factor, event.clientX, event.clientY);
}, { passive: false });
const createStageEl = $('createStage');
createStageEl.addEventListener('wheel', event => {
  if (!inCreate() || !event.ctrlKey) return;
  event.preventDefault();
  const factor = event.deltaY < 0 ? 1.2 : 1 / 1.2;
  setCreateZoom(createZoom * factor);
}, { passive: false });

// ---- Fonts ----
let FONT_FAMILY_MAP = {};
async function loadFonts() {
  const fonts = await window.frakt.getFonts();
  const sel = $('cFont');
  const base = [
    { id: 'helvetica', name: 'Helvetica', ok: true },
    { id: 'times', name: 'Times', ok: true },
    { id: 'courier', name: 'Courier', ok: true }
  ];
  const all = base.concat((fonts || []).filter(f => f.hasRegular).map(f => ({ id: f.id, name: f.name, ok: true })));
  const families = { helvetica: 'Helvetica', times: 'Serif', courier: 'Courier New' };
  for (const f of fonts || []) families[f.id] = f.name;
  FONT_FAMILY_MAP = families;
  sel.replaceChildren();
  for (const f of all) { const opt = document.createElement('option'); opt.value = f.id; opt.textContent = f.name; if (f.id === 'helvetica') opt.selected = true; sel.append(opt); }
}

renderPresets(); showHome(); renderQueue(); applyI18n(); loadFonts();
applyAppearance();
initUpdater();
if (!settings.setupDone) {
  setTimeout(() => { if (!settings.setupDone) openSettingsDialog(true); }, 600);
}
window.frakt.onOpenFiles(addFiles);
