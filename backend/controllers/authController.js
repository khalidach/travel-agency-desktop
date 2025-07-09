// backend/controllers/authController.js
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

// Helper to generate JWT
const generateToken = (id, role, adminId) => {
  return jwt.sign(
    { id, role, adminId },
    process.env.JWT_SECRET || "your_jwt_secret",
    {
      expiresIn: "8h", // Extended session for desktop app
    }
  );
};

// This function now acts as an "auto-login" or "get default user"
const loginUser = (req, res) => {
  try {
    const db = req.db;

    // 1. Check if an admin user already exists using the correct better-sqlite3 API.
    let user = db
      .prepare(`SELECT * FROM users WHERE role = 'admin' LIMIT 1`)
      .get();

    // 2. If no admin exists, create one.
    if (!user) {
      console.log("No admin user found, creating a default one...");
      const salt = bcrypt.genSaltSync(10);
      const hashedPassword = bcrypt.hashSync("password123", salt);

      db.prepare(
        `INSERT INTO users (username, password, "agencyName", role, "activeUser") VALUES (?, ?, ?, ?, ?)`
      ).run("admin", hashedPassword, "My Travel Agency", "admin", 1);

      // Fetch the newly created admin
      user = db
        .prepare(`SELECT * FROM users WHERE role = 'admin' LIMIT 1`)
        .get();
    }

    if (!user) {
      return res
        .status(404)
        .json({ message: "Default user could not be found or created." });
    }

    // 3. Return the user data and a token.
    res.json({
      id: user.id,
      username: user.username,
      agencyName: user.agencyName,
      role: user.role,
      activeUser: user.activeUser,
      token: generateToken(user.id, user.role, user.id),
    });
  } catch (error) {
    console.error("Auto-Login Error:", error);
    res.status(500).json({ message: "Server error during auto-login." });
  }
};

const refreshToken = (req, res) => {
  const { id, role, adminId, agencyName } = req.user;
  res.json({
    id,
    username: req.user.username,
    agencyName,
    role,
    adminId,
    token: generateToken(id, role, adminId),
  });
};

module.exports = { loginUser, refreshToken };
