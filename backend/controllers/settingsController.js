// backend/controllers/settingsController.js

const dbRun = (db, sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      err ? reject(err) : resolve(this);
    });
  });

const getSettings = async (req, res) => {
  // The settings are already attached to req.user via authMiddleware and parsed
  res.json(req.user.facturationSettings || {});
};

const updateSettings = async (req, res) => {
  try {
    const { id } = req.user;
    const { agencyName, facturationSettings } = req.body;

    if (typeof agencyName !== "string" || agencyName.trim() === "") {
      return res.status(400).json({ message: "Agency name cannot be empty." });
    }

    const result = await dbRun(
      req.db,
      'UPDATE users SET "agencyName" = ?, "facturationSettings" = ? WHERE id = ?',
      [agencyName.trim(), JSON.stringify(facturationSettings), id]
    );

    if (result.changes === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    // Return the updated data so the frontend can update its state
    res.json({
      agencyName: agencyName.trim(),
      facturationSettings: facturationSettings,
    });
  } catch (error) {
    console.error("Update Settings Error:", error);
    res.status(500).json({ message: "Failed to update settings." });
  }
};

module.exports = {
  getSettings,
  updateSettings,
};
