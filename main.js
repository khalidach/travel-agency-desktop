// main.js
const { app, BrowserWindow } = require("electron");
const path = require("path");
const backendApp = require("./backend/index.js"); // Import the express app

const PORT = process.env.PORT || 5000;
let server; // To hold the server instance

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, // Note: For better security, consider using a preload script
    },
    icon: path.join(__dirname, "assets", "icon.png"),
  });

  // Check if running in development or in a packaged app
  const isDev = !app.isPackaged;

  if (isDev) {
    // In development, load from the Vite dev server for features like hot-reloading
    win.loadURL("http://localhost:5173");
    // Open DevTools automatically in development
    win.webContents.openDevTools();
  } else {
    // In production, load the built index.html file from the package
    win.loadFile(path.join(__dirname, "frontend", "dist", "index.html"));
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(() => {
  // Start the backend Express server
  server = backendApp.listen(PORT, () => {
    console.log(`Backend server is listening on http://localhost:${PORT}`);
    // Create the window only after the server is ready
    createWindow();
  });
});

// Quit when all windows are closed, except on macOS.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    // Gracefully close the server before quitting
    if (server) {
      server.close();
    }
    app.quit();
  }
});

app.on("activate", () => {
  // On macOS, re-create a window when the dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
