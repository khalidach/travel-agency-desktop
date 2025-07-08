// backend/routes/factureRoutes.js
const express = require("express");
const router = express.Router();
const {
  getFactures,
  createFacture,
  updateFacture,
  deleteFacture,
} = require("../controllers/factureController");
// REMOVED TIER MIDDLEWARE
// const {
//   checkInvoicingAccess,
//   checkFactureLimit,
// } = require("../middleware/tierMiddleware");

// router.use(checkInvoicingAccess); // REMOVED
router.get("/", getFactures);
router.post("/", createFacture); // REMOVED checkFactureLimit
router.put("/:id", updateFacture);
router.delete("/:id", deleteFacture);

module.exports = router;
