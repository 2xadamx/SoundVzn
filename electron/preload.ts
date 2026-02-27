const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  readMetadata: (filePath: string) => ipcRenderer.invoke('audio:readMetadata', filePath),
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),
  downloadTrack: (videoId: string, title?: string, artist?: string) => ipcRenderer.invoke('download:track', videoId, title, artist),
  getDownloadPath: (videoId: string) => ipcRenderer.invoke('download:getPath', videoId),
  getStorageSize: () => ipcRenderer.invoke('download:getStorageSize'),
  openDownloadFolder: () => ipcRenderer.invoke('download:openFolder'),
  onDownloadProgress: (callback: (data: any) => void) => {
    ipcRenderer.on('download:progress', (_: any, data: any) => callback(data));
  },
  saveData: (key: string, data: any) => ipcRenderer.invoke('store:save', key, data),
  loadData: (key: string) => ipcRenderer.invoke('store:load', key),
  setAutoStart: (enabled: boolean) => ipcRenderer.invoke('system:setAutoStart', enabled),
  clearCache: () => ipcRenderer.invoke('system:clearCache'),
  log: (level: 'INFO' | 'WARN' | 'ERROR', message: string, meta?: any) =>
    ipcRenderer.invoke('log:write', level, message, meta),
  exportLogs: () => ipcRenderer.invoke('log:export'),
  getSystemPerf: () => ipcRenderer.invoke('system:getPerf'),
  saveAvatar: (filePath: string) => ipcRenderer.invoke('profile:saveAvatar', filePath),
  submitBug: (data: { description: string; includeLogs: boolean; email?: string }) =>
    ipcRenderer.invoke('bug:submit', data),
});
