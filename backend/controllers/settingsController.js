// backend/controllers/settingsController.js

const getSettings = async (req, res) => {
  // The settings are already attached to req.user via authMiddleware
  res.json(req.user.facturationSettings || {});
};

const updateSettings = async (req, res) => {
  try {
    const { id } = req.user;
    const settings = req.body;

    const { rows } = await req.db.query(
      'UPDATE users SET "facturationSettings" = $1 WHERE id = $2 RETURNING "facturationSettings"',
      [JSON.stringify(settings), id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }
    res.json(rows[0].facturationSettings);
  } catch (error) {
    console.error("Update Settings Error:", error);
    res.status(500).json({ message: "Failed to update settings." });
  }
};

module.exports = {
  getSettings,
  updateSettings,
};
