const { app, BrowserWindow } = require("electron");
const path = require("path");
const backendApp = require("./backend/index.js"); // Import the express app

const PORT = process.env.PORT || 5000;

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // Load the URL from the Vite dev server
  win.loadURL("http://localhost:5173");

  win.webContents.openDevTools();
}

// Start the backend server before creating the window
const server = backendApp.listen(PORT, () => {
  console.log(`Backend server is listening on http://localhost:${PORT}`);

  // Create the Electron window once the server is ready
  if (!app.isReady()) {
    app.whenReady().then(createWindow);
  } else {
    createWindow();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    server.close(); // Close the server when the app quits
    app.quit();
  }
});
