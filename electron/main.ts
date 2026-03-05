import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const electron = require('electron');
const { app, BrowserWindow, ipcMain, dialog, shell } = electron;

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import fs from 'node:fs';
import { fork, ChildProcess } from 'node:child_process';

// Log crash to file
const logPath = path.join(process.cwd(), 'startup-error.log');
function logError(err: any) {
  const msg = `[${new Date().toISOString()}] ERROR: ${err.stack || err}\n`;
  console.error(msg);
  fs.appendFileSync(logPath, msg);
}

function appendFrontendLog(level: string, message: string, meta?: any) {
  try {
    const logDir = path.join(app.getPath('userData'), 'logs');
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
    const line = `[${new Date().toISOString()}] [${level}] ${message}${meta ? ` ${JSON.stringify(meta)}` : ''}\n`;
    fs.appendFileSync(path.join(logDir, 'frontend.log'), line);
  } catch {
    // Never crash on logging
  }
}

process.on('uncaughtException', logError);
process.on('unhandledRejection', logError);

// Cargar variables de entorno del proyecto desde la raíz
const envPath = path.resolve(app.getAppPath(), '.env');
dotenv.config({ path: envPath });
process.env.SOUNDVZN_USER_DATA = app.getPath('userData');
console.log('[Main] Loading env from:', envPath);
console.log('[Main] UserData Path:', process.env.SOUNDVZN_USER_DATA);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
(globalThis as any).__filename = __filename;
(globalThis as any).__dirname = __dirname;


let mainWindow: any = null;
let backendProcess: ChildProcess | null = null;
let isQuitting = false;

function createWindow() {
  // En dev y prod, el preload se compila a dist-electron/preload.js
  // Como main.js también está en dist-electron, __dirname es correcto.
  const preloadPath = path.join(__dirname, 'preload.js');

  console.log('[Main] Preload Path:', preloadPath);
  console.log('[Main] UserData Path:', app.getPath('userData'));
  console.log('[Main] AppPath:', app.getAppPath());

  const isMac = process.platform === 'darwin';

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    // On macOS: show native traffic light buttons in the custom titlebar area
    // On Windows/Linux: use fully frameless window with custom controls in the UI
    frame: isMac,
    titleBarStyle: isMac ? 'hiddenInset' : 'hidden',
    trafficLightPosition: isMac ? { x: 16, y: 20 } : undefined,
    backgroundColor: '#0a0a0a',
    resizable: true,
    maximizable: true,
    minimizable: true,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
    show: false,
    icon: process.env.VITE_DEV_SERVER_URL
      ? path.join(__dirname, '../public/logo-app.png')
      : path.join(__dirname, '../dist/logo-app.png'),
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }: { url: string }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'deny' };
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Permitir carga de media desde YouTube CDN (necesario para redirect del proxy)
  const { session } = electron;
  session.defaultSession.setPermissionRequestHandler((_webContents: any, _permission: any, callback: (allowed: boolean) => void) => {
    callback(true); // Permitir todos los permisos de media
  });

  try {
    const backendEntry = path.join(__dirname, 'backend.js');
    backendProcess = fork(backendEntry, [], {
      env: { ...process.env, SOUNDVZN_USER_DATA: app.getPath('userData') },
      stdio: 'inherit',
    });
    backendProcess.on('exit', (code, signal) => {
      console.warn(`[Main] Backend process exited (code=${code}, signal=${signal}).`);
      backendProcess = null;
      if (!isQuitting) {
        // Simple retry after short delay to keep UI responsive
        setTimeout(() => {
          try {
            backendProcess = fork(backendEntry, [], {
              env: { ...process.env, SOUNDVZN_USER_DATA: app.getPath('userData') },
              stdio: 'inherit',
            });
          } catch (err) {
            logError(err);
          }
        }, 1000);
      }
    });
  } catch (err) {
    logError(err);
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    isQuitting = true;
    backendProcess?.kill();
    app.quit();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
  backendProcess?.kill();
});

// --- WINDOW CONTROLS ---
ipcMain.handle('window:minimize', () => mainWindow?.minimize());
ipcMain.handle('window:maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow?.unmaximize();
  else mainWindow?.maximize();
});
ipcMain.handle('window:close', () => mainWindow?.close());


ipcMain.handle('dialog:openDirectory', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
  });
  return result.filePaths;
});

ipcMain.handle('dialog:openFile', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections'],
    filters: [
      {
        name: 'Audio Files',
        extensions: ['mp3', 'flac', 'wav', 'ogg', 'm4a', 'aac', 'opus', 'wma', 'alac']
      },
    ],
  });
  return result.filePaths;
});

ipcMain.handle('audio:readMetadata', async (_event: any, filePath: string) => {
  try {
    const mm = await import('music-metadata');
    const metadata = await mm.parseFile(filePath);
    const picture = metadata.common.picture?.[0];
    let artworkUrl = '';

    if (picture) {
      const base64 = Buffer.from(picture.data).toString('base64');
      artworkUrl = `data:${picture.format};base64,${base64}`;
    }

    return {
      title: metadata.common.title || path.basename(filePath, path.extname(filePath)),
      artist: metadata.common.artist || 'Unknown Artist',
      album: metadata.common.album || 'Unknown Album',
      duration: metadata.format.duration || 0,
      artwork: artworkUrl,
    };
  } catch (error) {
    console.error('Error reading metadata:', error);
    return null;
  }
});


// Store logic (simple JSON file)
ipcMain.handle('store:save', async (_event: any, key: string, data: any) => {
  try {
    const storagePath = path.join(app.getPath('userData'), 'storage');
    if (!fs.existsSync(storagePath)) {
      fs.mkdirSync(storagePath, { recursive: true });
    }
    fs.writeFileSync(path.join(storagePath, `${key}.json`), JSON.stringify(data));
    return true;
  } catch (err) {
    console.error('Store save error:', err);
    return false;
  }
});

ipcMain.handle('store:load', async (_event: any, key: string) => {
  try {
    const filePath = path.join(app.getPath('userData'), 'storage', `${key}.json`);
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    }
    return null;
  } catch (err) {
    console.error('Store load error:', err);
    return null;
  }
});

function getDownloadsDir() {
  const dir = path.join(app.getPath('userData'), 'downloads');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

ipcMain.handle('download:getStorageSize', async () => {
  try {
    const dir = getDownloadsDir();
    const entries = fs.readdirSync(dir);
    let total = 0;
    for (const name of entries) {
      const full = path.join(dir, name);
      const stat = fs.statSync(full);
      if (stat.isFile()) total += stat.size;
    }
    return total;
  } catch (err) {
    console.error('download:getStorageSize error:', err);
    return 0;
  }
});

ipcMain.handle('download:openFolder', async () => {
  try {
    const dir = getDownloadsDir();
    await shell.openPath(dir);
    return true;
  } catch (err) {
    console.error('download:openFolder error:', err);
    return false;
  }
});

ipcMain.handle('download:track', async (_event: any, videoId: string, title?: string, artist?: string) => {
  try {
    const dir = getDownloadsDir();
    const fileName = `${artist || 'Unknown'} - ${title || videoId}.mp3`.replace(/[<>:"/\\|?*]/g, '_');
    const targetPath = path.join(dir, fileName);

    if (fs.existsSync(targetPath)) return { success: true, filePath: targetPath };

    console.log(`[Main] Starting download for ${videoId}...`);

    // Resolve stream URL
    const { getYouTubeStreamUrlLocked } = await import('./backend/youtube');
    const streamUrl = await getYouTubeStreamUrlLocked(videoId);

    if (!streamUrl) {
      console.error(`[Main] Could not resolve stream URL for ${videoId}`);
      return { success: false, error: 'Could not resolve stream URL' };
    }

    console.log(`[Main] Resolved stream URL for ${videoId}, starting download to ${targetPath}`);

    const axios = (await import('axios')).default;
    const response = await axios.get(streamUrl, {
      responseType: 'stream',
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      }
    });

    const writer = fs.createWriteStream(targetPath);
    response.data.pipe(writer);

    return new Promise((resolve) => {
      writer.on('finish', () => {
        console.log(`[Main] Download finished: ${targetPath}`);
        resolve({ success: true, filePath: targetPath });
      });
      writer.on('error', (err) => {
        console.error(`[Main] Writer error for ${videoId}:`, err);
        if (fs.existsSync(targetPath)) fs.unlinkSync(targetPath);
        resolve({ success: false, error: String(err) });
      });
      response.data.on('error', (err: any) => {
        console.error(`[Main] Stream error for ${videoId}:`, err);
        writer.close();
        if (fs.existsSync(targetPath)) fs.unlinkSync(targetPath);
        resolve({ success: false, error: String(err) });
      });
    });
  } catch (err) {
    console.error('download:track error:', err);
    return { success: false, error: String(err) };
  }
});

ipcMain.handle('download:getPath', async (_event: any, videoId: string) => {
  try {
    const dir = getDownloadsDir();
    if (!fs.existsSync(dir)) return null;
    const files = fs.readdirSync(dir);
    // Find file that contains videoId or artist/title match
    const match = files.find((name) => name.includes(videoId));
    return match ? path.join(dir, match) : null;
  } catch (err) {
    return null;
  }
});

// AUTO-CACHE CLEANUP (Arquitectura 6.4)
const CACHE_LIMIT_BYTES = 1024 * 1024 * 1024; // 1GB limit refined

async function cleanCacheIfNeeded() {
  try {
    const cacheDir = path.join(app.getPath('userData'), 'cache');
    if (!fs.existsSync(cacheDir)) return;

    const files = fs.readdirSync(cacheDir);
    let totalSize = 0;
    const fileInfos = files.map(file => {
      const p = path.join(cacheDir, file);
      const stat = fs.statSync(p);
      totalSize += stat.size;
      return { path: p, mtime: stat.mtimeMs, size: stat.size };
    });

    if (totalSize > CACHE_LIMIT_BYTES) {
      console.log(`[Cleaner] Cache size (${(totalSize / 1024 / 1024).toFixed(2)}MB) exceeds 1GB. Cleaning...`);
      // Sort by oldest first
      fileInfos.sort((a, b) => a.mtime - b.mtime);

      let deletedSize = 0;
      const targetToDelete = totalSize - (CACHE_LIMIT_BYTES * 0.7); // Leave 700MB

      for (const info of fileInfos) {
        if (deletedSize >= targetToDelete) break;
        try {
          fs.unlinkSync(info.path);
          deletedSize += info.size;
        } catch { }
      }
      console.log(`[Cleaner] Cleaned ${(deletedSize / 1024 / 1024).toFixed(2)}MB from cache.`);
    }
  } catch (err) {
    console.error('[Cleaner] Cache cleanup error:', err);
  }
}

// Run cleanup every 12 hours (Arquitectura 6.4)
setInterval(cleanCacheIfNeeded, 12 * 60 * 60 * 1000);
// Also run 1 minute after startup
setTimeout(cleanCacheIfNeeded, 60 * 1000);

ipcMain.handle('system:clearCache', async () => {
  try {
    const cacheDir = path.join(app.getPath('userData'), 'cache');
    if (fs.existsSync(cacheDir)) {
      const files = fs.readdirSync(cacheDir);
      files.forEach(f => fs.unlinkSync(path.join(cacheDir, f)));
    }
    return true;
  } catch (err) {
    return false;
  }
});

ipcMain.handle('log:write', async (_event: any, level: string, message: string, meta?: any) => {
  appendFrontendLog(level || 'INFO', message || '', meta);
  return true;
});

ipcMain.handle('log:export', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory', 'createDirectory'],
    title: 'Seleccionar carpeta para exportar logs de diagnóstico'
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  const targetDir = result.filePaths[0];
  const logFiles = ['frontend.log', 'backend.log'];
  const logsSourceDir = path.join(app.getPath('userData'), 'logs');

  try {
    logFiles.forEach(file => {
      const src = path.join(logsSourceDir, file);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, path.join(targetDir, `svln_${file}`));
      }
    });
    // Also include startup error log if exists in project root
    const rootErrorLog = path.join(process.cwd(), 'startup-error.log');
    if (fs.existsSync(rootErrorLog)) {
      fs.copyFileSync(rootErrorLog, path.join(targetDir, 'svln_startup-error.log'));
    }
    return targetDir;
  } catch (err) {
    console.error('Log export error:', err);
    return false;
  }
});

ipcMain.handle('system:getPerf', async () => {
  try {
    const mem = await process.getProcessMemoryInfo();
    return {
      ramMB: Math.round(mem.private / 1024), // process.getProcessMemoryInfo returns KB
      uptime: Math.round(process.uptime()),
      platform: process.platform,
      arch: process.arch
    };
  } catch (err) {
    return { ramMB: 0, uptime: 0 };
  }
});

ipcMain.handle('profile:saveAvatar', async (_: any, filePath: string) => {
  try {
    if (!fs.existsSync(filePath)) return null;
    const avatarDir = path.join(app.getPath('userData'), 'avatars');
    if (!fs.existsSync(avatarDir)) fs.mkdirSync(avatarDir, { recursive: true });

    const ext = path.extname(filePath);
    const fileName = `avatar_${Date.now()}${ext}`;
    const targetPath = path.join(avatarDir, fileName);

    fs.copyFileSync(filePath, targetPath);
    console.log('[Main] Avatar saved to:', targetPath);
    return targetPath;
  } catch (err) {
    console.error('profile:saveAvatar error:', err);
    return null;
  }
});

ipcMain.handle('bug:submit', async (_: any, data: { description: string; includeLogs: boolean; email?: string }) => {
  try {
    const reportDir = path.join(app.getPath('userData'), 'reports');
    if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });

    const reportId = `report_${Date.now()}`;
    const targetFolder = path.join(reportDir, reportId);
    fs.mkdirSync(targetFolder, { recursive: true });

    // 1. Guardar el reporte JSON
    const reportJson = {
      id: reportId,
      timestamp: new Date().toISOString(),
      description: data.description,
      userEmail: data.email || 'anonymous',
      system: {
        platform: process.platform,
        arch: process.arch,
        version: app.getVersion()
      }
    };
    fs.writeFileSync(path.join(targetFolder, 'report.json'), JSON.stringify(reportJson, null, 2));

    // 2. Adjuntar logs si se solicita
    if (data.includeLogs) {
      const logsSourceDir = path.join(app.getPath('userData'), 'logs');
      const logFiles = ['frontend.log', 'backend.log'];
      logFiles.forEach(file => {
        const src = path.join(logsSourceDir, file);
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, path.join(targetFolder, `svln_${file}`));
        }
      });
      // Startup error log
      const rootErrorLog = path.join(process.cwd(), 'startup-error.log');
      if (fs.existsSync(rootErrorLog)) {
        fs.copyFileSync(rootErrorLog, path.join(targetFolder, 'svln_startup-error.log'));
      }
    }

    console.log(`[Main] Bug report submitted: ${reportId}`);
    return { success: true, path: targetFolder };
  } catch (err) {
    console.error('bug:submit error:', err);
    return { success: false, error: String(err) };
  }
});
