"use strict";

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
  openDirectory: () => ipcRenderer.invoke("dialog:openDirectory"),
  openFile: () => ipcRenderer.invoke("dialog:openFile"),
  readMetadata: (filePath) => ipcRenderer.invoke("audio:readMetadata", filePath),
  minimize: () => ipcRenderer.invoke("window:minimize"),
  maximize: () => ipcRenderer.invoke("window:maximize"),
  close: () => ipcRenderer.invoke("window:close"),
  downloadTrack: (videoId, title, artist) => ipcRenderer.invoke("download:track", videoId, title, artist),
  getStorageSize: () => ipcRenderer.invoke("download:getStorageSize"),
  openDownloadFolder: () => ipcRenderer.invoke("download:openFolder"),
  getDownloadPath: (videoId) => ipcRenderer.invoke("download:getPath", videoId),
  onDownloadProgress: (callback) => {
    ipcRenderer.on("download:progress", (_, data) => callback(data));
  },
  saveData: (key, data) => ipcRenderer.invoke("store:save", key, data),
  loadData: (key) => ipcRenderer.invoke("store:load", key),
});
