// main.js
const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const { machineIdSync } = require("node-machine-id");
const backendApp = require("./backend/index.js");

const PORT = process.env.PORT || 5000;
let server;

const mId = machineIdSync({ original: true });

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      // These settings are crucial for security and for the preload script to work.
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, "assets", "icon.png"),
  });

  const isDev = !app.isPackaged;

  if (isDev) {
    win.loadURL("http://localhost:5173");
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, "frontend", "dist", "index.html"));
  }
}

app.whenReady().then(() => {
  ipcMain.handle("get-machine-id", () => {
    return mId;
  });

  server = backendApp.listen(PORT, () => {
    console.log(`Backend server is listening on http://localhost:${PORT}`);
    createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    if (server) {
      server.close();
    }
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
