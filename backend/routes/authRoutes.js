// backend/routes/authRoutes.js
const express = require("express");
const router = express.Router();
const { loginUser, refreshToken } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

// This route now correctly calls loginUser without validation middleware
router.post("/login", loginUser);

router.post("/refresh", protect, refreshToken);

module.exports = router;
