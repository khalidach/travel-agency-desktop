// backend/middleware/authMiddleware.js
const jwt = require("jsonwebtoken");

// Helper to get a single row from the database
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
      const user = await dbGet(
        req.db,
        `SELECT id, username, "agencyName", role, "facturationSettings" FROM users WHERE id = ?`,
        [decoded.id]
      );

      if (!user) {
        return res
          .status(401)
          .json({ message: "Not authorized, user not found" });
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
