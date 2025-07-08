// backend/controllers/dailyServiceController.js

// --- Database Helper Functions ---
const dbAll = (db, sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
const dbGet = (db, sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });
const dbRun = (db, sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      err ? reject(err) : resolve(this);
    });
  });

const getDailyServices = async (req, res) => {
  try {
    const { adminId } = req.user;
    const page = parseInt(req.query.page || "1", 10);
    const limit = parseInt(req.query.limit || "10", 10);
    const offset = (page - 1) * limit;

    const servicesPromise = dbAll(
      req.db,
      'SELECT * FROM daily_services WHERE "userId" = ? ORDER BY "createdAt" DESC LIMIT ? OFFSET ?',
      [adminId, limit, offset]
    );
    const totalCountPromise = dbGet(
      req.db,
      'SELECT COUNT(*) as totalCount FROM daily_services WHERE "userId" = ?',
      [adminId]
    );

    const [services, totalCountResult] = await Promise.all([
      servicesPromise,
      totalCountPromise,
    ]);

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

const createDailyService = async (req, res) => {
  const { adminId } = req.user;
  const { type, serviceName, originalPrice, totalPrice, date } = req.body;

  const commission = totalPrice - originalPrice;
  const profit = commission;

  try {
    const sql = `INSERT INTO daily_services ("userId", "employeeId", type, "serviceName", "originalPrice", "totalPrice", commission, profit, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const result = await dbRun(req.db, sql, [
      adminId,
      null,
      type,
      serviceName,
      originalPrice,
      totalPrice,
      commission,
      profit,
      date,
    ]);

    const newService = await dbGet(
      req.db,
      "SELECT * FROM daily_services WHERE id = ?",
      [result.lastID]
    );
    res.status(201).json(newService);
  } catch (error) {
    console.error("Create Daily Service Error:", error);
    res.status(400).json({ message: "Failed to create daily service." });
  }
};

const updateDailyService = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminId } = req.user;
    const { type, serviceName, originalPrice, totalPrice, date } = req.body;

    const commission = totalPrice - originalPrice;
    const profit = commission;

    const sql = `UPDATE daily_services SET type = ?, "serviceName" = ?, "originalPrice" = ?, "totalPrice" = ?, commission = ?, profit = ?, date = ?, "updatedAt" = CURRENT_TIMESTAMP WHERE id = ? AND "userId" = ?`;
    await dbRun(req.db, sql, [
      type,
      serviceName,
      originalPrice,
      totalPrice,
      commission,
      profit,
      date,
      id,
      adminId,
    ]);

    const updatedService = await dbGet(
      req.db,
      "SELECT * FROM daily_services WHERE id = ?",
      [id]
    );
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

const deleteDailyService = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminId } = req.user;

    const result = await dbRun(
      req.db,
      'DELETE FROM daily_services WHERE id = ? AND "userId" = ?',
      [id, adminId]
    );

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

const getDailyServiceReport = async (req, res) => {
  const { adminId } = req.user;
  const { startDate, endDate } = req.query;

  const isValidDate = (dateString) =>
    dateString && !isNaN(new Date(dateString));

  try {
    // 1. Lifetime Summary (for top cards) - No date filter
    const lifetimeSummaryPromise = dbGet(
      req.db,
      `
        SELECT COUNT(*) as "totalSalesCount",
               COALESCE(SUM("totalPrice"), 0) as "totalRevenue",
               COALESCE(SUM(profit), 0) as "totalProfit",
               COALESCE(SUM("originalPrice"), 0) as "totalCost"
        FROM daily_services WHERE "userId" = ?`,
      [adminId]
    );

    // 2. Monthly Trend (last 6 months) - Always last 6 months, ignores date range filter
    const monthlyTrendQuery = `
        SELECT strftime('%Y-%m', date) as month, SUM(profit) as profit
        FROM daily_services
        WHERE "userId" = ? AND date(date) >= date('now', '-6 months')
        GROUP BY month ORDER BY month ASC`;
    const monthlyTrendPromise = dbAll(req.db, monthlyTrendQuery, [adminId]);

    // 3. Detailed Performance (by type) - Lifetime data, ignores date range filter
    const byTypeQuery = `
        SELECT type, COUNT(*) as "count",
               COALESCE(SUM("originalPrice"), 0) as "totalOriginalPrice",
               COALESCE(SUM("totalPrice"), 0) as "totalSalePrice",
               COALESCE(SUM(commission), 0) as "totalCommission",
               COALESCE(SUM(profit), 0) as "totalProfit"
        FROM daily_services WHERE "userId" = ?
        GROUP BY type ORDER BY type`;
    const byTypePromise = dbAll(req.db, byTypeQuery, [adminId]);

    // 4. Filtered Summary (for the filter box) - This is the only part that uses the date filter
    let dateFilterClause = "";
    const dateParams = [];
    if (isValidDate(startDate) && isValidDate(endDate)) {
      dateFilterClause = `AND date(date) BETWEEN date(?) AND date(?)`;
      dateParams.push(startDate, endDate);
    }

    const filteredSummaryQuery = `
        SELECT
            COUNT(*) as "totalSalesCount",
            COALESCE(SUM("totalPrice"), 0) as "totalRevenue",
            COALESCE(SUM(profit), 0) as "totalProfit",
            COALESCE(SUM("originalPrice"), 0) as "totalCost"
        FROM daily_services WHERE "userId" = ? ${dateFilterClause}`;
    const filteredSummaryPromise = dbGet(req.db, filteredSummaryQuery, [
      adminId,
      ...dateParams,
    ]);

    // Await all promises
    const [lifetimeSummary, monthlyTrend, dateFilteredSummary, byType] =
      await Promise.all([
        lifetimeSummaryPromise,
        monthlyTrendPromise,
        filteredSummaryPromise,
        byTypePromise,
      ]);

    // Send response
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
