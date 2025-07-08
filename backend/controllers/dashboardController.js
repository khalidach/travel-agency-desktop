// backend/controllers/dashboardController.js

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

const getDashboardStats = async (req, res) => {
  const { adminId } = req.user;
  const { startDate, endDate } = req.query;

  const isValidDate = (dateString) =>
    dateString && !isNaN(new Date(dateString));

  try {
    const statsQuery = `
      SELECT
        (SELECT COUNT(*) FROM programs WHERE "userId" = ?) as "activePrograms",
        (SELECT COUNT(*) FROM bookings WHERE "userId" = ?) as "allTimeBookings",
        (SELECT COALESCE(SUM("sellingPrice"), 0) FROM bookings WHERE "userId" = ?) as "allTimeRevenue",
        (SELECT COALESCE(SUM(profit), 0) FROM bookings WHERE "userId" = ?) as "allTimeProfit"
    `;
    const statsPromise = dbGet(req.db, statsQuery, [
      adminId,
      adminId,
      adminId,
      adminId,
    ]);

    let dateFilterClause = "";
    const dateParams = [];
    if (isValidDate(startDate) && isValidDate(endDate)) {
      // Use date() function for comparison to ignore time part
      dateFilterClause = `AND date("createdAt") BETWEEN date(?) AND date(?)`;
      dateParams.push(startDate, endDate);
    }

    const filteredStatsQuery = `
        SELECT
            COUNT(*) as "filteredBookingsCount",
            COALESCE(SUM("sellingPrice"), 0) as "filteredRevenue",
            COALESCE(SUM(profit), 0) as "filteredProfit",
            COALESCE(SUM("basePrice"), 0) as "filteredCost",
            COALESCE(SUM("sellingPrice" - "remainingBalance"), 0) as "filteredPaid",
            SUM(CASE WHEN "isFullyPaid" = 1 THEN 1 ELSE 0 END) as "fullyPaid",
            SUM(CASE WHEN "isFullyPaid" = 0 THEN 1 ELSE 0 END) as "pending"
        FROM bookings
        WHERE "userId" = ? ${dateFilterClause}
    `;
    const filteredStatsPromise = dbGet(req.db, filteredStatsQuery, [
      adminId,
      ...dateParams,
    ]);

    const programTypePromise = dbAll(
      req.db,
      `SELECT type, COUNT(*) as count FROM programs WHERE "userId" = ? GROUP BY type`,
      [adminId]
    );

    const recentBookingsPromise = dbAll(
      req.db,
      `SELECT id, "clientNameFr", "passportNumber", "sellingPrice", "isFullyPaid" FROM bookings WHERE "userId" = ? ORDER BY "createdAt" DESC LIMIT 3`,
      [adminId]
    );

    const dailyServiceProfitPromise = dbAll(
      req.db,
      `SELECT type, COALESCE(SUM(profit), 0) as "totalProfit" FROM daily_services WHERE "userId" = ? GROUP BY type`,
      [adminId]
    );

    const [
      stats,
      filteredStats,
      programTypes,
      recentBookings,
      dailyServiceProfits,
    ] = await Promise.all([
      statsPromise,
      filteredStatsPromise,
      programTypePromise,
      recentBookingsPromise,
      dailyServiceProfitPromise,
    ]);

    const filteredRevenue = parseFloat(filteredStats.filteredRevenue);
    const filteredPaid = parseFloat(filteredStats.filteredPaid);

    const formattedResponse = {
      allTimeStats: {
        totalBookings: stats.allTimeBookings,
        totalRevenue: stats.allTimeRevenue,
        totalProfit: stats.allTimeProfit,
        activePrograms: stats.activePrograms,
      },
      dateFilteredStats: {
        totalBookings: filteredStats.filteredBookingsCount,
        totalRevenue: filteredRevenue,
        totalProfit: filteredStats.filteredProfit,
        totalCost: filteredStats.filteredCost,
        totalPaid: filteredPaid,
        totalRemaining: filteredRevenue - filteredPaid,
      },
      programTypeData: {
        Hajj: programTypes.find((p) => p.type === "Hajj")?.count || 0,
        Umrah: programTypes.find((p) => p.type === "Umrah")?.count || 0,
        Tourism: programTypes.find((p) => p.type === "Tourism")?.count || 0,
      },
      dailyServiceProfitData: dailyServiceProfits.map((item) => ({
        type: item.type,
        totalProfit: item.totalProfit,
      })),
      paymentStatus: {
        fullyPaid: filteredStats.fullyPaid,
        pending: filteredStats.pending,
      },
      recentBookings: recentBookings,
    };

    res.json(formattedResponse);
  } catch (error) {
    console.error("Dashboard Stats Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getProfitReport = async (req, res) => {
  const { adminId } = req.user;
  const { programType } = req.query;

  try {
    let programFilterClause = "";
    const queryParams = [adminId];

    if (programType && programType !== "all") {
      programFilterClause = `AND p.type = ?`;
      queryParams.push(programType);
    }

    const profitDataQuery = `
        SELECT
            p.id,
            p.name as "programName",
            p.type,
            COUNT(b.id) as bookings,
            COALESCE(SUM(b."sellingPrice"), 0) as "totalSales",
            COALESCE(SUM(b."basePrice"), 0) as "totalCost",
            COALESCE(SUM(b.profit), 0) as "totalProfit",
            CASE
                WHEN SUM(b."sellingPrice") > 0 THEN (SUM(b.profit) * 100.0 / SUM(b."sellingPrice"))
                ELSE 0
            END as "profitMargin"
        FROM programs p
        LEFT JOIN bookings b ON p.id = b."tripId"
        WHERE p."userId" = ? ${programFilterClause}
        GROUP BY p.id, p.name, p.type
        ORDER BY "totalProfit" DESC;
    `;
    const profitDataPromise = dbAll(req.db, profitDataQuery, queryParams);

    const monthlyTrendQuery = `
        SELECT
            strftime('%Y-%m', b."createdAt") as month,
            COALESCE(SUM(b.profit), 0) as profit
        FROM bookings b
        JOIN programs p ON b."tripId" = p.id
        WHERE b."userId" = ? ${programFilterClause.replace(
          /p\.type/g,
          "p.type"
        )}
        GROUP BY month
        ORDER BY month ASC;
    `;
    const monthlyTrendPromise = dbAll(req.db, monthlyTrendQuery, queryParams);

    const [profitData, monthlyTrend] = await Promise.all([
      profitDataPromise,
      monthlyTrendPromise,
    ]);

    res.json({ profitData, monthlyTrend });
  } catch (error) {
    console.error("Profit Report Error:", error);
    res
      .status(500)
      .json({ message: "Server error while fetching profit report." });
  }
};

module.exports = {
  getDashboardStats,
  getProfitReport,
};
