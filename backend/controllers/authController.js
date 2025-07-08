// backend/controllers/authController.js
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

// Helper to safely parse JSON from the database
const safeJsonParse = (data) => {
  if (typeof data === "string") {
    try {
      return JSON.parse(data);
    } catch (e) {
      return null;
    }
  }
  return data;
};

// Helper function to run a SQL command and return a promise
const dbRun = (db, sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) {
        reject(err);
      } else {
        resolve(this);
      }
    });
  });
};

// Helper function to get a single row
const dbGet = (db, sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

const generateToken = (id, role, adminId) => {
  // Removed tierId from token generation
  return jwt.sign(
    { id, role, adminId },
    process.env.JWT_SECRET || "your_jwt_secret",
    {
      expiresIn: "8h", // Extended session for desktop app
    }
  );
};

// This function now acts as an "auto-login" or "get default user"
const loginUser = async (req, res) => {
  try {
    const db = req.db;

    // 1. Check if an admin user already exists.
    let user = await dbGet(
      db,
      `SELECT * FROM users WHERE role = 'admin' LIMIT 1`
    );

    // 2. If no admin exists, create one.
    if (!user) {
      console.log("No admin user found, creating a default one...");
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash("password123", salt);

      // Removed tierId from the INSERT statement
      await dbRun(
        db,
        `INSERT INTO users (username, password, "agencyName", role, "activeUser") VALUES (?, ?, ?, ?, ?)`,
        ["admin", hashedPassword, "My Travel Agency", "admin", 1]
      );

      // Fetch the newly created admin
      user = await dbGet(
        db,
        `SELECT * FROM users WHERE role = 'admin' LIMIT 1`
      );
    }

    if (!user) {
      return res
        .status(404)
        .json({ message: "Default user could not be found or created." });
    }

    // 3. Return the user data and a token. No need to join with tiers table.
    res.json({
      id: user.id,
      username: user.username,
      agencyName: user.agencyName,
      role: user.role,
      activeUser: user.activeUser,
      // Removed tierId, limits, and tierLimits from the response
      token: generateToken(user.id, user.role, user.id),
    });
  } catch (error) {
    console.error("Auto-Login Error:", error);
    res.status(500).json({ message: "Server error during auto-login." });
  }
};

const refreshToken = async (req, res) => {
  // Simplified refresh logic without tiers/limits
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
