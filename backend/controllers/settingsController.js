// backend/controllers/settingsController.js

const getSettings = (req, res) => {
  res.json(req.user.facturationSettings || {});
};

const updateSettings = (req, res) => {
  try {
    const { id } = req.user;
    const { agencyName, facturationSettings } = req.body;

    if (typeof agencyName !== "string" || agencyName.trim() === "") {
      return res.status(400).json({ message: "Agency name cannot be empty." });
    }

    const stmt = req.db.prepare(
      'UPDATE users SET "agencyName" = ?, "facturationSettings" = ? WHERE id = ?'
    );
    const result = stmt.run(
      agencyName.trim(),
      JSON.stringify(facturationSettings),
      id
    );

    if (result.changes === 0) {
      return res.status(404).json({ message: "User not found." });
    }

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
