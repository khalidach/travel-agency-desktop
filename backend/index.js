// backend/index.js
const express = require("express");
const cors = require("cors");
const path = require("path");
// Reverted to the standard sqlite3 package
const sqlite3 = require("sqlite3").verbose();
require("dotenv").config();

// --- SQLite Database Setup ---
const dbPath = path.join(__dirname, "travel_agency.db");
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Error opening database", err.message);
  } else {
    console.log("Connected to the SQLite database.");
    db.serialize(() => {
      // --- Simplified Tables for Desktop Version ---
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL,
          "agencyName" TEXT,
          role TEXT NOT NULL,
          "activeUser" BOOLEAN,
          "facturationSettings" TEXT
        );
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS programs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          "userId" INTEGER NOT NULL,
          "employeeId" INTEGER, -- Keep for data compatibility, but won't be used
          name TEXT NOT NULL,
          type TEXT NOT NULL,
          duration INTEGER,
          cities TEXT,
          packages TEXT,
          "totalBookings" INTEGER DEFAULT 0,
          "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Keep all other functional tables (program_pricing, bookings, etc.)
      db.run(`
        CREATE TABLE IF NOT EXISTS program_pricing (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          "userId" INTEGER NOT NULL,
          "employeeId" INTEGER,
          "programId" INTEGER NOT NULL UNIQUE,
          "selectProgram" TEXT,
          "ticketAirline" REAL,
          "visaFees" REAL,
          "guideFees" REAL,
          "transportFees" REAL,
          "allHotels" TEXT,
          "personTypes" TEXT,
          "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS bookings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          "userId" INTEGER NOT NULL,
          "employeeId" INTEGER,
          "clientNameAr" TEXT,
          "clientNameFr" TEXT,
          "personType" TEXT,
          "phoneNumber" TEXT,
          "passportNumber" TEXT,
          "tripId" TEXT,
          "packageId" TEXT,
          "selectedHotel" TEXT,
          "sellingPrice" REAL,
          "basePrice" REAL,
          profit REAL,
          "advancePayments" TEXT,
          "remainingBalance" REAL,
          "isFullyPaid" BOOLEAN,
          "relatedPersons" TEXT,
          "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS room_managements (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          "userId" INTEGER NOT NULL,
          "programId" INTEGER NOT NULL,
          "hotelName" TEXT NOT NULL,
          rooms TEXT,
          "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE("userId", "programId", "hotelName")
        );
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS factures (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          "userId" INTEGER NOT NULL,
          "employeeId" INTEGER,
          "clientName" TEXT NOT NULL,
          "clientAddress" TEXT,
          "date" TEXT NOT NULL,
          items TEXT NOT NULL,
          type TEXT NOT NULL,
          "prixTotalHorsFrais" REAL,
          "totalFraisServiceHT" REAL,
          tva REAL,
          total REAL NOT NULL,
          notes TEXT,
          facture_number TEXT,
          "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE ("userId", "facture_number")
        );
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS daily_services (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          "userId" INTEGER NOT NULL,
          "employeeId" INTEGER,
          type TEXT NOT NULL,
          "serviceName" TEXT NOT NULL,
          "originalPrice" REAL NOT NULL,
          "totalPrice" REAL NOT NULL,
          commission REAL NOT NULL,
          profit REAL NOT NULL,
          date TEXT NOT NULL,
          "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      console.log("All tables created or already exist.");
    });
  }
});

// Import middleware and routes
const { protect } = require("./middleware/authMiddleware");
const authRoutes = require("./routes/authRoutes");
const programRoutes = require("./routes/programRoutes");
const programPricingRoutes = require("./routes/programPricingRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const roomManagementRoutes = require("./routes/roomManagementRoutes");
const factureRoutes = require("./routes/factureRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const dailyServiceRoutes = require("./routes/dailyServiceRoutes");

const app = express();

const corsOptions = {
  origin: process.env.VITE_FRONTEND_URL || "http://localhost:5173",
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.json());

app.use((req, res, next) => {
  req.db = db;
  next();
});

// --- Simplified API Routes ---
app.use("/api/auth", authRoutes);
app.use("/api/dashboard", protect, dashboardRoutes);
app.use("/api/programs", protect, programRoutes);
app.use("/api/program-pricing", protect, programPricingRoutes);
app.use("/api/bookings", protect, bookingRoutes);
app.use("/api/room-management", protect, roomManagementRoutes);
app.use("/api/facturation", protect, factureRoutes);
app.use("/api/settings", protect, settingsRoutes);
app.use("/api/daily-services", protect, dailyServiceRoutes);

// Export the app object so it can be started by main.js
module.exports = app;
