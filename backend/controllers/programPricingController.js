// backend/controllers/programPricingController.js
const ProgramPricingService = require("../services/ProgramPricingService");

exports.getAllProgramPricing = (req, res) => {
  try {
    const page = parseInt(req.query.page || "1", 10);
    const limit = parseInt(req.query.limit || "10", 10);
    const offset = (page - 1) * limit;

    const pricingQuery = `
       SELECT pp.*, e.username as "employeeName"
       FROM program_pricing pp
       LEFT JOIN users e ON pp."employeeId" = e.id
       WHERE pp."userId" = ?
       ORDER BY pp."createdAt" DESC
       LIMIT ? OFFSET ?`;
    const pricingResult = req.db
      .prepare(pricingQuery)
      .all(req.user.adminId, limit, offset);

    const totalCountResult = req.db
      .prepare(
        'SELECT COUNT(*) as totalCount FROM program_pricing WHERE "userId" = ?'
      )
      .get(req.user.adminId);
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

exports.getProgramPricingByProgramId = (req, res) => {
  const { programId } = req.params;
  const { adminId } = req.user;
  try {
    const pricing = req.db
      .prepare(
        'SELECT * FROM program_pricing WHERE "programId" = ? AND "userId" = ?'
      )
      .get(programId, adminId);

    if (!pricing) {
      return res.json(null);
    }

    pricing.allHotels = JSON.parse(pricing.allHotels || "[]");
    pricing.personTypes = JSON.parse(pricing.personTypes || "[]");

    res.json(pricing);
  } catch (error) {
    console.error("Get Program Pricing by Program ID Error:", error);
    res.status(500).json({ message: error.message });
  }
};

exports.createProgramPricing = (req, res) => {
  try {
    const newPricing = ProgramPricingService.createPricingAndBookings(
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

exports.updateProgramPricing = (req, res) => {
  const { id } = req.params;
  try {
    const updatedProgramPricing =
      ProgramPricingService.updatePricingAndBookings(
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

exports.deleteProgramPricing = (req, res) => {
  const { id } = req.params;
  try {
    const pricing = req.db
      .prepare(
        'SELECT "employeeId" FROM program_pricing WHERE id = ? AND "userId" = ?'
      )
      .get(id, req.user.adminId);

    if (!pricing) {
      return res
        .status(404)
        .json({ message: "Program pricing not found or not authorized." });
    }

    req.db.prepare("DELETE FROM program_pricing WHERE id = ?").run(id);

    res.json({ message: "Program pricing deleted successfully" });
  } catch (error) {
    console.error("Delete Pricing Error:", error);
    res.status(500).json({ message: error.message });
  }
};
