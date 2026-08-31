const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs/promises');
const os = require('os');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const { autoUpdater } = require('electron-updater');

const fontkit = require('@pdf-lib/fontkit');

const WINDOWS_FONTS_DIR = 'C:\\Windows\\Fonts';

const APP_ICON = path.join(__dirname, 'assets', 'fraktpdflogo.ico');

// ---- Version + print settings ----
ipcMain.handle('get-app-version', () => app.getVersion());
ipcMain.handle('get-printers', () => {
  try {
    return (mainWindow?.webContents.getPrinters() || []).map(p => ({ name: p.name, isDefault: p.isDefault }));
  } catch { return []; }
});

// ---- Auto-update (GitHub Releases) ----
// updateMode: 'auto' -> download & install silently; 'notify' -> show a prompt.
let updateMode = 'auto';
const UPDATE_STATE_FILE = path.join(app.getPath('userData'), 'update-state.json');

function updaterSend(channel, payload) { mainWindow?.webContents.send(channel, payload); }

function configureUpdater() {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => updaterSend('update-status', { status: 'checking' }));
  autoUpdater.on('update-available', (info) => {
    if (updateMode === 'auto') { autoUpdater.downloadUpdate(); updaterSend('update-status', { status: 'downloading', info }); }
    else updaterSend('update-status', { status: 'available', info });
  });
  autoUpdater.on('update-not-available', (info) => updaterSend('update-status', { status: 'not-available', info }));
  autoUpdater.on('download-progress', (p) => updaterSend('update-progress', { percent: p.percent, transferred: p.transferred, total: p.total }));
  autoUpdater.on('update-downloaded', (info) => {
    if (updateMode === 'auto') { pendUpdatedState(); autoUpdater.quitAndInstall(false, true); }
    else updaterSend('update-status', { status: 'downloaded', info });
  });
  autoUpdater.on('error', (error) => updaterSend('update-status', { status: 'error', message: error ? (error.message || String(error)) : 'unknown' }));
}

async function pendUpdatedState() {
  try { await fs.writeFile(UPDATE_STATE_FILE, JSON.stringify({ version: app.getVersion() })); } catch {}
}

// On launch, if we just installed an update, tell the renderer so it can show a
// closable "updated" message, then clear the flag.
async function notifyIfJustUpdated() {
  try {
    const raw = await fs.readFile(UPDATE_STATE_FILE, 'utf8');
    const state = JSON.parse(raw);
    await fs.unlink(UPDATE_STATE_FILE).catch(() => {});
    if (state.version && state.version === app.getVersion()) updaterSend('app-updated', app.getVersion());
  } catch {}
}

ipcMain.handle('updater-set-mode', (_e, mode) => { updateMode = mode === 'notify' ? 'notify' : 'auto'; });
ipcMain.handle('updater-check', () => { if (app.isPackaged) return autoUpdater.checkForUpdates(); return null; });
ipcMain.handle('updater-download', () => autoUpdater.downloadUpdate());
ipcMain.handle('updater-install', async () => { await pendUpdatedState(); autoUpdater.quitAndInstall(false, true); });

let mainWindow;
let initialFilePaths = process.argv.filter(argument => argument.toLowerCase().endsWith('.pdf'));

if (!app.requestSingleInstanceLock()) app.quit();

async function readPdfFiles(filePaths) {
  return Promise.all(filePaths.map(async filePath => ({
    path: filePath, name: path.basename(filePath), data: (await fs.readFile(filePath)).toString('base64')
  })));
}

async function sendFilesToWindow(filePaths) {
  const files = await readPdfFiles(filePaths).catch(() => []);
  if (files.length) mainWindow?.webContents.send('open-pdf-files', files);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 980,
    minHeight: 680,
    icon: APP_ICON,
    backgroundColor: '#131416',
    title: 'fraktPDF',
    frame: false,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true }
  });
  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  mainWindow.webContents.once('did-finish-load', () => {
    sendFilesToWindow(initialFilePaths);
    notifyIfJustUpdated();
  });
}

app.whenReady().then(() => {
  createWindow();
  configureUpdater();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('second-instance', (_event, commandLine) => {
  const filePaths = commandLine.filter(argument => argument.toLowerCase().endsWith('.pdf'));
  if (mainWindow) { if (mainWindow.isMinimized()) mainWindow.restore(); mainWindow.focus(); sendFilesToWindow(filePaths); }
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

// ---- Frameless window controls ----
ipcMain.handle('window-minimize', () => { mainWindow?.minimize(); });
ipcMain.handle('window-maximize', () => {
  if (!mainWindow) return;
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  else mainWindow.maximize();
});
ipcMain.handle('window-close', () => { mainWindow?.close(); });

ipcMain.handle('pick-pdf', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Välj fraktsedlar', properties: ['openFile', 'multiSelections'], filters: [{ name: 'PDF', extensions: ['pdf'] }]
  });
  if (result.canceled) return [];
  return readPdfFiles(result.filePaths);
});

ipcMain.handle('open-path', async (_event, filePath) => {
  try { return await readPdfFiles([filePath]); } catch { return []; }
});

ipcMain.handle('pick-image', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Välj bild', properties: ['openFile'], filters: [
      { name: 'Bilder', extensions: ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'] }
    ]
  });
  if (result.canceled || !result.filePaths.length) return null;
  const filePath = result.filePaths[0];
  const buffer = await fs.readFile(filePath);
  const ext = path.extname(filePath).toLowerCase().replace('.', '');
  const mime = ext === 'jpg' ? 'jpeg' : ext;
  return { name: path.basename(filePath), dataUrl: `data:image/${mime};base64,${buffer.toString('base64')}` };
});

// Crop a PDF to the selected label region. Portrait (stående) orientation is
// enforced at print time via landscape:false so all labels print upright.
async function cropPdf(base64, crop) {
  const pdf = await PDFDocument.load(Buffer.from(base64, 'base64'));
  for (const page of pdf.getPages()) {
    const { width, height } = page.getSize();
    const x = Math.max(0, Math.min(width, crop.x * width));
    const y = Math.max(0, Math.min(height, (1 - crop.y - crop.height) * height));
    const w = Math.max(1, Math.min(width - x, crop.width * width));
    const h = Math.max(1, Math.min(height - y, crop.height * height));
    page.setCropBox(x, y, w, h);
  }
  return Buffer.from(await pdf.save());
}

// Combine multiple cropped PDFs into a single multi-page document for queued printing.
async function combineAndCrop(items) {
  const out = await PDFDocument.create();
  for (const item of items) {
    const cropped = await cropPdf(item.data, item.crop);
    const src = await PDFDocument.load(cropped);
    const pages = await out.copyPages(src, src.getPages().map((_, i) => i));
    pages.forEach(p => out.addPage(p));
  }
  return Buffer.from(await out.save());
}

ipcMain.handle('export-cropped', async (_event, { data, crop, sourceName, sourcePath, mode }) => {
  const buffer = await cropPdf(data, crop);
  if (mode === 'overwrite' && sourcePath) {
    await fs.writeFile(sourcePath, buffer);
    return { success: true, mode: 'overwrite' };
  }
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Spara beskuren fraktsedel', defaultPath: sourceName.replace(/\.pdf$/i, '') + '-etikett.pdf', filters: [{ name: 'PDF', extensions: ['pdf'] }]
  });
  if (result.canceled || !result.filePath) return { success: false, canceled: true };
  await fs.writeFile(result.filePath, buffer);
  return { success: true, mode: 'copy', filePath: result.filePath };
});

async function printBuffer(buffer, settings) {
  const tempPath = path.join(os.tmpdir(), `fraktPDF-print-${Date.now()}.pdf`);
  await fs.writeFile(tempPath, buffer);
  const printWindow = new BrowserWindow({ show: false, webPreferences: { plugins: true } });
  await printWindow.loadURL(`file://${tempPath.replace(/\\/g, '/')}`);
  await new Promise(resolve => setTimeout(resolve, 700));
  const opts = { landscape: false, printBackground: true };
  if (settings && settings.printer) {
    opts.silent = true;
    opts.deviceName = settings.printer;
  } else {
    opts.silent = false;
  }
  if (settings && settings.dpi) {
    opts.scaleFactor = Math.max(50, Math.min(400, Math.round((settings.dpi / 96) * 100)));
  }
  return new Promise(resolve => {
    printWindow.webContents.print(opts, (success, failureReason) => {
      printWindow.close();
      setTimeout(() => fs.unlink(tempPath).catch(() => {}), 10000);
      resolve({ success, failureReason });
    });
  });
}

ipcMain.handle('print-cropped', async (_event, { data, crop, settings }) => {
  return printBuffer(await cropPdf(data, crop), settings);
});

ipcMain.handle('print-queue', async (_event, { items, settings }) => {
  return printBuffer(await combineAndCrop(items), settings);
});

// ---- Create PDF from scratch ----
const PAPER_PT = {
  a4: { w: 595.28, h: 841.89, name: 'A4' },
  a5: { w: 419.53, h: 595.28, name: 'A5' },
  '10x15': { w: 283.46, h: 425.20, name: '10×15 cm' }
};

// Built-in Adobe standard fonts (embedded for free by pdf-lib, always available).
const STANDARD_FONTS = {
  helvetica: { name: 'Helvetica', n: StandardFonts.Helvetica, b: StandardFonts.HelveticaBold, i: StandardFonts.HelveticaOblique, bi: StandardFonts.HelveticaBoldOblique },
  times: { name: 'Times', n: StandardFonts.TimesRoman, b: StandardFonts.TimesRomanBold, i: StandardFonts.TimesItalic, bi: StandardFonts.TimesBoldItalic },
  courier: { name: 'Courier', n: StandardFonts.Courier, b: StandardFonts.CourierBold, i: StandardFonts.CourierOblique, bi: StandardFonts.CourierBoldOblique }
};

// Extra fonts embedded from a user's Windows installation. The id is used in the
// UI, `family` is the CSS family name for the on-screen preview, and the four
// `*File` entries point at TTF files in C:\Windows\Fonts. Missing files are
// skipped at runtime so the app never crashes on a machine lacking a font.
const FONT_CATALOG = [
  { id: 'arial', family: 'Arial', regular: 'arial.ttf', bold: 'arialbd.ttf', italic: 'ariali.ttf', boldItalic: 'arialbi.ttf' },
  { id: 'calibri', family: 'Calibri', regular: 'calibri.ttf', bold: 'calibrib.ttf', italic: 'calibrii.ttf', boldItalic: 'calibriz.ttf' },
  { id: 'verdana', family: 'Verdana', regular: 'verdana.ttf', bold: 'verdanab.ttf', italic: 'verdanai.ttf', boldItalic: 'verdanaz.ttf' },
  { id: 'tahoma', family: 'Tahoma', regular: 'tahoma.ttf', bold: 'tahomabd.ttf' },
  { id: 'trebuchet', family: 'Trebuchet MS', regular: 'trebuc.ttf', bold: 'trebucbd.ttf', italic: 'trebucit.ttf', boldItalic: 'trebucbi.ttf' },
  { id: 'georgia', family: 'Georgia', regular: 'georgia.ttf', bold: 'georgiab.ttf', italic: 'georgiai.ttf', boldItalic: 'georgiaz.ttf' },
  { id: 'impact', family: 'Impact', regular: 'impact.ttf' },
  { id: 'segoe', family: 'Segoe UI', regular: 'segoeui.ttf', bold: 'segoeuib.ttf', italic: 'segoeuii.ttf', boldItalic: 'segoeuiz.ttf' },
  { id: 'candara', family: 'Candara', regular: 'Candara.ttf', bold: 'Candarab.ttf', italic: 'Candarai.ttf', boldItalic: 'Candaraz.ttf' },
  { id: 'consolas', family: 'Consolas', regular: 'consola.ttf', bold: 'consolab.ttf', italic: 'consolai.ttf', boldItalic: 'consolaz.ttf' },
  { id: 'cambria', family: 'Cambria', regular: 'cambria.ttf', bold: 'cambriab.ttf', italic: 'cambriai.ttf', boldItalic: 'cambriaz.ttf' },
  { id: 'constantia', family: 'Constantia', regular: 'constan.ttf', bold: 'constanb.ttf', italic: 'constani.ttf', boldItalic: 'constanz.ttf' },
  { id: 'corbel', family: 'Corbel', regular: 'corbel.ttf', bold: 'corbelb.ttf', italic: 'corbeli.ttf', boldItalic: 'corbelli.ttf' },
  { id: 'comic', family: 'Comic Sans MS', regular: 'comic.ttf', bold: 'comicbd.ttf', italic: 'comici.ttf', boldItalic: 'comicz.ttf' },
  { id: 'bahns', family: 'Bahnschrift', regular: 'bahnschrift.ttf' },
  { id: 'inkfree', family: 'Ink Free', regular: 'Inkfree.ttf' },
  { id: 'ebrima', family: 'Ebrima', regular: 'ebrima.ttf', bold: 'ebrimabd.ttf' },
  { id: 'gabriola', family: 'Gabriola', regular: 'Gabriola.ttf' },
  { id: 'gadugi', family: 'Gadugi', regular: 'gadugi.ttf', bold: 'gadugib.ttf' },
  { id: 'mvboli', family: 'MV Boli', regular: 'mvboli.ttf' },
  { id: 'sylfaen', family: 'Sylfaen', regular: 'sylfaen.ttf' }
];

// Cache embedded font objects so the same TTF file is only parsed once per save.
const fontCache = new Map();

function fontCatalogWithAvailability() {
  return FONT_CATALOG.map(f => {
    const present = (file) => !file || fsExistsSync(WINDOWS_FONTS_DIR + '\\' + file);
    return { id: f.id, name: f.family, hasRegular: present(f.regular), hasBold: present(f.bold) };
  });
}
function fsExistsSync(p) { try { require('fs').accessSync(p); return true; } catch { return false; } }

function standardFontKey(box) {
  let key = '';
  if (box.bold) key += 'b';
  if (box.italic) key += 'i';
  return key || 'n';
}

// Returns a ready-to-use embedded pdf-lib font (standard or custom). Custom fonts
// are cached by their file path. If a requested variant file is missing we fall
// back to the plain regular file so bold/italic silently degrade instead of err.
async function embedBoxFont(pdf, box) {
  const std = STANDARD_FONTS[box.font];
  if (std) return pdf.embedStandardFont(std[standardFontKey(box)]);

  const catalog = FONT_CATALOG.find(f => f.id === box.font);
  if (!catalog) return pdf.embedStandardFont(StandardFonts.Helvetica);

  const variant = (box.bold ? 'bold' : '') + (box.italic ? 'italic' : '') || 'regular';
  const file = catalog[variant] && fsExistsSync(WINDOWS_FONTS_DIR + '\\' + catalog[variant]) ? catalog[variant] : catalog.regular;
  let font = fontCache.get(file);
  if (!font) {
    const bytes = await fs.readFile(path.join(WINDOWS_FONTS_DIR, file));
    font = await pdf.embedFont(bytes);
    fontCache.set(file, font);
  }
  return font;
}

function hexToRgb(hex) {
  const sanitized = (hex || '#000000').replace('#', '');
  const n = parseInt(sanitized, 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

// Keep only characters the chosen font can encode, so an unencodable glyph never
// crashes the whole save.
function encodableChars(f, text) {
  let out = '';
  for (const ch of String(text || '')) {
    try { f.widthOfTextAtSize(ch, 8); out += ch; } catch { /* drop unencodable glyph */ }
  }
  return out;
}

async function createPdf({ paper, boxes }) {
  const size = PAPER_PT[paper] || PAPER_PT.a4;
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const page = pdf.addPage([size.w, size.h]);

  for (const box of boxes || []) {
    if (box.type === 'image') {
      const img = await embedImage(pdf, box);
      if (!img) continue;
      const w = Math.max(1, box.w || 40), h = Math.max(1, box.h || 40);
      const yPdf = size.h - (box.y + h);
      page.drawImage(img, { x: box.x, y: yPdf, width: w, height: h });
      continue;
    }

    const f = await embedBoxFont(pdf, box);
    const fs = box.size || 20;
    const align = box.align || 'left';
    const color = box.color ? hexToRgb(box.color) : rgb(0, 0, 0);

    const maxWidth = Math.max(1, (box.w || 100) - 4);
    const clean = encodableChars(f, box.text);
    const words = clean.split(/\s+/).filter(Boolean);
    const lines = [];
    let line = '';
    for (const word of words) {
      const test = line ? line + ' ' + word : word;
      if (f.widthOfTextAtSize(test, fs) <= maxWidth || !line) { line = test; } else { lines.push(line); line = word; }
    }
    if (line) lines.push(line);
    if (!lines.length) lines.push('');

    const lineHeight = fs * 1.25;
    lines.forEach((textLine, i) => {
      const textWidth = f.widthOfTextAtSize(textLine, fs);
      let x = box.x;
      if (align === 'center') x = box.x + (box.w - textWidth) / 2;
      else if (align === 'right') x = box.x + box.w - textWidth;
      // box.y is the top of the box in top-down space; pdf-lib's y grows upward
      // from the bottom of the page, so mirror it and place the baseline below the top.
      const baseline = size.h - (box.y + i * lineHeight + fs * 0.9);
      page.drawText(textLine, { x, y: baseline, size: fs, font: f, color, lineHeight });
    });
  }

  return Buffer.from(await pdf.save());
}

// Decode an image payload (base64 PNG/JPEG data URL) and embed it into the PDF.
async function embedImage(pdf, box) {
  const dataUrl = box.dataUrl || '';
  const m = /^data:(image\/[a-z+]+);base64,(.+)$/i.exec(dataUrl);
  if (!m) return null;
  const buffer = Buffer.from(m[2], 'base64');
  try {
    if (m[1] === 'image/png') return await pdf.embedPng(buffer);
    if (m[1] === 'image/jpeg' || m[1] === 'image/jpg') return await pdf.embedJpg(buffer);
  } catch { /* fall through */ }
  return null;
}

ipcMain.handle('get-fonts', async () => fontCatalogWithAvailability());

ipcMain.handle('create-pdf', async (_event, payload) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Spara ny fraktsedel', defaultPath: 'fraktetikett.pdf', filters: [{ name: 'PDF', extensions: ['pdf'] }]
  });
  if (result.canceled || !result.filePath) return { success: false, canceled: true };
  fontCache.clear();
  await fs.writeFile(result.filePath, await createPdf(payload));
  return { success: true, filePath: result.filePath };
});
