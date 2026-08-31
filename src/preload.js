const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('frakt', {
  pickPdf: () => ipcRenderer.invoke('pick-pdf'),
  openPath: filePath => ipcRenderer.invoke('open-path', filePath),
  exportCropped: payload => ipcRenderer.invoke('export-cropped', payload),
  printCropped: payload => ipcRenderer.invoke('print-cropped', payload),
  printQueue: payload => ipcRenderer.invoke('print-queue', payload),
  createPdf: payload => ipcRenderer.invoke('create-pdf', payload),
  getFonts: () => ipcRenderer.invoke('get-fonts'),
  pickImage: () => ipcRenderer.invoke('pick-image'),
  getVersion: () => ipcRenderer.invoke('get-app-version'),
  getPrinters: () => ipcRenderer.invoke('get-printers'),
  updaterSetMode: mode => ipcRenderer.invoke('updater-set-mode', mode),
  updaterCheck: () => ipcRenderer.invoke('updater-check'),
  updaterDownload: () => ipcRenderer.invoke('updater-download'),
  updaterInstall: () => ipcRenderer.invoke('updater-install'),
  windowMinimize: () => ipcRenderer.invoke('window-minimize'),
  windowMaximize: () => ipcRenderer.invoke('window-maximize'),
  windowClose: () => ipcRenderer.invoke('window-close'),
  onOpenFiles: callback => ipcRenderer.on('open-pdf-files', (_event, files) => callback(files)),
  onUpdateStatus: callback => ipcRenderer.on('update-status', (_event, info) => callback(info)),
  onUpdateProgress: callback => ipcRenderer.on('update-progress', (_event, info) => callback(info)),
  onAppUpdated: callback => ipcRenderer.on('app-updated', (_event, version) => callback(version))
});
