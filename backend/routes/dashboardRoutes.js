// backend/routes/dashboardRoutes.js
const express = require("express");
const router = express.Router();
const {
  getDashboardStats,
  getProfitReport,
} = require("../controllers/dashboardController");

// This route will be protected by the middleware applied in index.js
router.get("/stats", getDashboardStats);
router.get("/profit-report", getProfitReport);

module.exports = router;
