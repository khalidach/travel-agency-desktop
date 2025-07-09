// backend/middleware/authMiddleware.js
const jwt = require("jsonwebtoken");

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "your_jwt_secret"
      );

      // Fetch the user from the database to ensure they still exist
      // Using better-sqlite3 synchronous API
      const stmt = req.db.prepare(
        `SELECT id, username, "agencyName", role, "facturationSettings" FROM users WHERE id = ?`
      );
      const user = stmt.get(decoded.id);

      if (!user) {
        return res
          .status(401)
          .json({ message: "Not authorized, user not found" });
      }

      // Parse facturationSettings from JSON string
      if (
        user.facturationSettings &&
        typeof user.facturationSettings === "string"
      ) {
        try {
          user.facturationSettings = JSON.parse(user.facturationSettings);
        } catch (e) {
          console.error("Failed to parse facturationSettings:", e);
          user.facturationSettings = {}; // Default to empty object on parse error
        }
      } else if (!user.facturationSettings) {
        user.facturationSettings = {};
      }

      // Attach the simplified user object to the request
      req.user = {
        ...user,
        adminId: user.id, // For desktop version, the user is their own admin
      };

      next();
    } catch (error) {
      console.error("Auth Middleware Error:", error);
      res.status(401).json({ message: "Not authorized, token failed" });
    }
  }

  if (!token) {
    res.status(401).json({ message: "Not authorized, no token" });
  }
};

module.exports = { protect };
