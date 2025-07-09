// backend/controllers/dailyServiceController.js

const getDailyServices = (req, res) => {
  try {
    const { adminId } = req.user;
    const page = parseInt(req.query.page || "1", 10);
    const limit = parseInt(req.query.limit || "10", 10);
    const offset = (page - 1) * limit;

    const servicesStmt = req.db.prepare(
      'SELECT * FROM daily_services WHERE "userId" = ? ORDER BY "createdAt" DESC LIMIT ? OFFSET ?'
    );
    const services = servicesStmt.all(adminId, limit, offset);

    const totalCountResult = req.db
      .prepare(
        'SELECT COUNT(*) as totalCount FROM daily_services WHERE "userId" = ?'
      )
      .get(adminId);
    const totalCount = totalCountResult.totalCount;

    res.json({
      data: services,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Get Daily Services Error:", error);
    res.status(500).json({ message: "Failed to retrieve daily services." });
  }
};

const createDailyService = (req, res) => {
  const { adminId } = req.user;
  const { type, serviceName, originalPrice, totalPrice, date } = req.body;

  const commission = totalPrice - originalPrice;
  const profit = commission;

  try {
    const sql = `INSERT INTO daily_services ("userId", "employeeId", type, "serviceName", "originalPrice", "totalPrice", commission, profit, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const result = req.db
      .prepare(sql)
      .run(
        adminId,
        null,
        type,
        serviceName,
        originalPrice,
        totalPrice,
        commission,
        profit,
        date
      );

    const newService = req.db
      .prepare("SELECT * FROM daily_services WHERE id = ?")
      .get(result.lastInsertRowid);
    res.status(201).json(newService);
  } catch (error) {
    console.error("Create Daily Service Error:", error);
    res.status(400).json({ message: "Failed to create daily service." });
  }
};

const updateDailyService = (req, res) => {
  try {
    const { id } = req.params;
    const { adminId } = req.user;
    const { type, serviceName, originalPrice, totalPrice, date } = req.body;

    const commission = totalPrice - originalPrice;
    const profit = commission;

    const sql = `UPDATE daily_services SET type = ?, "serviceName" = ?, "originalPrice" = ?, "totalPrice" = ?, commission = ?, profit = ?, date = ?, "updatedAt" = CURRENT_TIMESTAMP WHERE id = ? AND "userId" = ?`;
    req.db
      .prepare(sql)
      .run(
        type,
        serviceName,
        originalPrice,
        totalPrice,
        commission,
        profit,
        date,
        id,
        adminId
      );

    const updatedService = req.db
      .prepare("SELECT * FROM daily_services WHERE id = ?")
      .get(id);
    if (!updatedService) {
      return res
        .status(404)
        .json({ message: "Service not found or not authorized." });
    }
    res.json(updatedService);
  } catch (error) {
    console.error("Update Daily Service Error:", error);
    res.status(400).json({ message: "Failed to update daily service." });
  }
};

const deleteDailyService = (req, res) => {
  try {
    const { id } = req.params;
    const { adminId } = req.user;

    const result = req.db
      .prepare('DELETE FROM daily_services WHERE id = ? AND "userId" = ?')
      .run(id, adminId);

    if (result.changes === 0) {
      return res
        .status(404)
        .json({ message: "Service not found or not authorized." });
    }
    res.status(204).send();
  } catch (error) {
    console.error("Delete Daily Service Error:", error);
    res.status(500).json({ message: "Failed to delete daily service." });
  }
};

const getDailyServiceReport = (req, res) => {
  const { adminId } = req.user;
  const { startDate, endDate } = req.query;

  const isValidDate = (dateString) =>
    dateString && !isNaN(new Date(dateString));

  try {
    const lifetimeSummary = req.db
      .prepare(
        `
        SELECT COUNT(*) as "totalSalesCount",
               COALESCE(SUM("totalPrice"), 0) as "totalRevenue",
               COALESCE(SUM(profit), 0) as "totalProfit",
               COALESCE(SUM("originalPrice"), 0) as "totalCost"
        FROM daily_services WHERE "userId" = ?`
      )
      .get(adminId);

    const monthlyTrendQuery = `
        SELECT strftime('%Y-%m', date) as month, SUM(profit) as profit
        FROM daily_services
        WHERE "userId" = ? AND date(date) >= date('now', '-6 months')
        GROUP BY month ORDER BY month ASC`;
    const monthlyTrend = req.db.prepare(monthlyTrendQuery).all(adminId);

    const byTypeQuery = `
        SELECT type, COUNT(*) as "count",
               COALESCE(SUM("originalPrice"), 0) as "totalOriginalPrice",
               COALESCE(SUM("totalPrice"), 0) as "totalSalePrice",
               COALESCE(SUM(commission), 0) as "totalCommission",
               COALESCE(SUM(profit), 0) as "totalProfit"
        FROM daily_services WHERE "userId" = ?
        GROUP BY type ORDER BY type`;
    const byType = req.db.prepare(byTypeQuery).all(adminId);

    let dateFilterClause = "";
    const dateParams = { adminId };
    if (isValidDate(startDate) && isValidDate(endDate)) {
      dateFilterClause = `AND date(date) BETWEEN date(:startDate) AND date(:endDate)`;
      dateParams.startDate = startDate;
      dateParams.endDate = endDate;
    }

    const filteredSummaryQuery = `
        SELECT
            COUNT(*) as "totalSalesCount",
            COALESCE(SUM("totalPrice"), 0) as "totalRevenue",
            COALESCE(SUM(profit), 0) as "totalProfit",
            COALESCE(SUM("originalPrice"), 0) as "totalCost"
        FROM daily_services WHERE "userId" = :adminId ${dateFilterClause}`;
    const dateFilteredSummary = req.db
      .prepare(filteredSummaryQuery)
      .get(dateParams);

    res.json({
      lifetimeSummary,
      dateFilteredSummary,
      byType,
      monthlyTrend,
    });
  } catch (error) {
    console.error("Daily Service Report Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getDailyServices,
  createDailyService,
  updateDailyService,
  deleteDailyService,
  getDailyServiceReport,
};
