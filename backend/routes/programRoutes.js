// backend/routes/programRoutes.js
const express = require("express");
const router = express.Router();
const {
  getAllPrograms,
  getProgramById,
  createProgram,
  updateProgram,
  deleteProgram,
} = require("../controllers/programController");
const {
  programValidation,
  handleValidationErrors,
} = require("../middleware/validationMiddleware");
// const { checkProgramLimit } = require("../middleware/tierMiddleware"); // REMOVED

router.get("/", getAllPrograms);
router.get("/:id", getProgramById);
router.post(
  "/",
  programValidation,
  handleValidationErrors,
  // checkProgramLimit, // REMOVED
  createProgram
);
router.put("/:id", programValidation, handleValidationErrors, updateProgram);
router.delete("/:id", deleteProgram);

module.exports = router;
