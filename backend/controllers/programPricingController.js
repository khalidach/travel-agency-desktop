// backend/controllers/programPricingController.js
const ProgramPricingService = require("../services/ProgramPricingService");

// Helper to run a query and get all results
const dbAll = (db, sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

// Helper to get a single row
const dbGet = (db, sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

// Helper to run a single command
const dbRun = (db, sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

exports.getAllProgramPricing = async (req, res) => {
  try {
    const page = parseInt(req.query.page || "1", 10);
    const limit = parseInt(req.query.limit || "10", 10);
    const offset = (page - 1) * limit;

    const pricingQuery = `
       SELECT pp.*, e.username as "employeeName"
       FROM program_pricing pp
       LEFT JOIN employees e ON pp."employeeId" = e.id
       WHERE pp."userId" = ?
       ORDER BY pp."createdAt" DESC
       LIMIT ? OFFSET ?`;

    const pricingResult = await dbAll(req.db, pricingQuery, [
      req.user.adminId,
      limit,
      offset,
    ]);

    const totalCountResult = await dbGet(
      req.db,
      'SELECT COUNT(*) as totalCount FROM program_pricing WHERE "userId" = ?',
      [req.user.adminId]
    );
    const totalCount = totalCountResult.totalCount;

    res.json({
      data: pricingResult,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Get All Pricing Error:", error);
    res.status(500).json({ message: error.message });
  }
};

exports.getProgramPricingByProgramId = async (req, res) => {
  const { programId } = req.params;
  const { adminId } = req.user;
  try {
    const pricing = await dbGet(
      req.db,
      'SELECT * FROM program_pricing WHERE "programId" = ? AND "userId" = ?',
      [programId, adminId]
    );

    if (!pricing) {
      return res.json(null); // Return null if no pricing is set up
    }

    // Parse JSON columns
    pricing.allHotels = JSON.parse(pricing.allHotels || "[]");
    pricing.personTypes = JSON.parse(pricing.personTypes || "[]");

    res.json(pricing);
  } catch (error) {
    console.error("Get Program Pricing by Program ID Error:", error);
    res.status(500).json({ message: error.message });
  }
};

exports.createProgramPricing = async (req, res) => {
  try {
    const newPricing = await ProgramPricingService.createPricingAndBookings(
      req.db,
      req.user,
      req.body
    );
    res.status(201).json(newPricing);
  } catch (error) {
    console.error("Create Pricing Error:", error);
    res.status(400).json({ message: error.message });
  }
};

exports.updateProgramPricing = async (req, res) => {
  const { id } = req.params;
  try {
    const updatedProgramPricing =
      await ProgramPricingService.updatePricingAndBookings(
        req.db,
        req.user,
        id,
        req.body
      );
    res.json(updatedProgramPricing);
  } catch (error) {
    console.error("Update Pricing Error:", error);
    res.status(400).json({ message: error.message });
  }
};

exports.deleteProgramPricing = async (req, res) => {
  const { id } = req.params;
  try {
    const pricing = await dbGet(
      req.db,
      'SELECT "employeeId" FROM program_pricing WHERE id = ? AND "userId" = ?',
      [id, req.user.adminId]
    );

    if (!pricing) {
      return res
        .status(404)
        .json({ message: "Program pricing not found or not authorized." });
    }

    // In the desktop version, only one admin user exists, so no need for employee check.

    await dbRun(req.db, "DELETE FROM program_pricing WHERE id = ?", [id]);

    res.json({ message: "Program pricing deleted successfully" });
  } catch (error) {
    console.error("Delete Pricing Error:", error);
    res.status(500).json({ message: error.message });
  }
};
