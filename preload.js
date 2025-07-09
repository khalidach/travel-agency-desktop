// preload.js
const { contextBridge, ipcRenderer } = require("electron");

// Expose a secure API to the renderer process (your React app)
contextBridge.exposeInMainWorld("electronAPI", {
  // This function will send a request to the main process to get the machine ID
  getMachineId: () => ipcRenderer.invoke("get-machine-id"),
});
