const { app, BrowserWindow, ipcMain, shell, clipboard } = require('electron');
const path = require('path');
const fs = require('fs');
const systemService = require('./system-service.cjs');

let mainWindow = null;

function createWindow() {
  const iconPath = process.platform === 'win32'
    ? path.join(__dirname, 'assets/icon.ico')
    : path.join(__dirname, 'assets/icon.png');

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 1024,
    minHeight: 700,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#020617',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Window control IPC handlers
ipcMain.handle('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('window-maximize', () => {
  if (!mainWindow) return;
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});

ipcMain.handle('window-close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.handle('window-is-maximized', () => {
  return mainWindow ? mainWindow.isMaximized() : false;
});

// Shell & System IPC handlers
ipcMain.handle('open-in-explorer', async (_event, targetPath) => {
  try {
    if (!targetPath) return false;
    if (fs.existsSync(targetPath)) {
      shell.showItemInFolder(targetPath);
      return true;
    } else {
      const parentDir = path.dirname(targetPath);
      if (fs.existsSync(parentDir)) {
        shell.openPath(parentDir);
        return true;
      }
    }
    return false;
  } catch (err) {
    console.error('Failed to open in explorer:', err);
    return false;
  }
});

ipcMain.handle('trash-item', async (_event, targetPath) => {
  try {
    if (fs.existsSync(targetPath)) {
      await shell.trashItem(targetPath);
      return { success: true };
    }
    return { success: false, reason: 'File does not exist' };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('clipboard-write', (_event, text) => {
  clipboard.writeText(text || '');
  return true;
});

ipcMain.handle('kill-process', async (_event, pid) => {
  return await systemService.killProcess(pid);
});

// Real System Service IPC handlers
ipcMain.handle('get-system-drives', async () => {
  return await systemService.getSystemDrives();
});

ipcMain.handle('get-system-telemetry', () => {
  return systemService.getSystemTelemetry();
});

ipcMain.handle('scan-active-ports', async () => {
  return await systemService.getActivePorts();
});

ipcMain.handle('get-windows-services', async () => {
  return await systemService.getWindowsServices();
});

ipcMain.handle('stop-service', async (_event, name) => {
  return await systemService.stopService(name);
});

ipcMain.handle('start-service', async (_event, name) => {
  return await systemService.startService(name);
});

ipcMain.handle('scan-uninstall-blockers', async (_event, target) => {
  return await systemService.scanUninstallBlockers(target);
});

ipcMain.handle('scan-real-junk', async () => {
  return await systemService.scanRealJunk();
});

ipcMain.handle('clean-junk-items', async (_event, items, safeRecycleBin) => {
  return await systemService.cleanJunkItems(items, safeRecycleBin);
});

ipcMain.handle('scan-large-files', async (_event, drive, minSizeMB, depth) => {
  return await systemService.scanLargeFiles(drive, minSizeMB, depth);
});

ipcMain.handle('get-startup-apps', async () => {
  return await systemService.getStartupApps();
});

ipcMain.handle('open-windows-add-remove', () => {
  systemService.openWindowsAddRemove();
});

ipcMain.handle('open-install-folder', () => {
  systemService.openInstallFolder();
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
