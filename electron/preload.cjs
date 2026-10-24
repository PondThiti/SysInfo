const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.invoke('window-minimize'),
  maximize: () => ipcRenderer.invoke('window-maximize'),
  close: () => ipcRenderer.invoke('window-close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  openInExplorer: (path) => ipcRenderer.invoke('open-in-explorer', path),
  trashItem: (path) => ipcRenderer.invoke('trash-item', path),
  clipboardWrite: (text) => ipcRenderer.invoke('clipboard-write', text),
  killProcess: (pid) => ipcRenderer.invoke('kill-process', pid),
  getSystemDrives: () => ipcRenderer.invoke('get-system-drives'),
  getSystemTelemetry: () => ipcRenderer.invoke('get-system-telemetry'),
  scanActivePorts: () => ipcRenderer.invoke('scan-active-ports'),
  getWindowsServices: () => ipcRenderer.invoke('get-windows-services'),
  stopService: (name) => ipcRenderer.invoke('stop-service', name),
  startService: (name) => ipcRenderer.invoke('start-service', name),
  scanUninstallBlockers: (target) => ipcRenderer.invoke('scan-uninstall-blockers', target),
  scanRealJunk: () => ipcRenderer.invoke('scan-real-junk'),
  cleanJunkItems: (items, safeRecycleBin) => ipcRenderer.invoke('clean-junk-items', items, safeRecycleBin),
  scanLargeFiles: (drive, minSizeMB, depth) => ipcRenderer.invoke('scan-large-files', drive, minSizeMB, depth),
  getStartupApps: () => ipcRenderer.invoke('get-startup-apps'),
  openWindowsAddRemove: () => ipcRenderer.invoke('open-windows-add-remove'),
  openInstallFolder: () => ipcRenderer.invoke('open-install-folder'),
  uninstallSelf: () => ipcRenderer.invoke('uninstall-self'),
  getAllBackgroundProcesses: () => ipcRenderer.invoke('get-all-background-processes'),
  detectProgramConflicts: () => ipcRenderer.invoke('detect-program-conflicts'),
  resolveConflict: (conflictId, pids) => ipcRenderer.invoke('resolve-conflict', conflictId, pids)
});
