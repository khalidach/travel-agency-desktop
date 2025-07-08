// backend/routes/settingsRoutes.js
const express = require("express");
const router = express.Router();
const {
  getSettings,
  updateSettings,
} = require("../controllers/settingsController");

// Note: The 'protect' middleware is applied in index.js for this route group
router.get("/", getSettings);
router.put("/", updateSettings);

module.exports = router;
