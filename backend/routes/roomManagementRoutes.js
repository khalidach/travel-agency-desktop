// backend/routes/roomManagementRoutes.js
const express = require("express");
const router = express.Router();
const roomManagementController = require("../controllers/roomManagementController");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);

router.get(
  "/program/:programId/hotel/:hotelName",
  roomManagementController.getRoomsByProgramAndHotel
);

router.get(
  "/program/:programId/hotel/:hotelName/search-unassigned",
  roomManagementController.searchUnassignedOccupants
);

router.post(
  "/program/:programId/hotel/:hotelName",
  roomManagementController.saveRooms
);

// New route for Excel export
router.get(
  "/program/:programId/export-excel",
  roomManagementController.exportRoomsToExcel
);

module.exports = router;
