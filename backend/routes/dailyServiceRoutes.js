// backend/routes/dailyServiceRoutes.js
const express = require("express");
const router = express.Router();
const {
  getDailyServices,
  createDailyService,
  updateDailyService,
  deleteDailyService,
  getDailyServiceReport,
} = require("../controllers/dailyServiceController");
const {
  dailyServiceValidation,
  handleValidationErrors,
} = require("../middleware/validationMiddleware");
// REMOVED TIER MIDDLEWARE
// const {
//   checkDailyServiceLimit,
//   checkDailyServiceAccess,
// } = require("../middleware/tierMiddleware");

// router.use(checkDailyServiceAccess); // REMOVED

router.get("/", getDailyServices);
router.post(
  "/",
  // checkDailyServiceLimit, // REMOVED
  dailyServiceValidation,
  handleValidationErrors,
  createDailyService
);
router.put(
  "/:id",
  dailyServiceValidation,
  handleValidationErrors,
  updateDailyService
);
router.delete("/:id", deleteDailyService);
router.get("/report", getDailyServiceReport);

module.exports = router;
