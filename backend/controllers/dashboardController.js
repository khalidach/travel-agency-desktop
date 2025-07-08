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
    let dateFilterClause = "";
    const queryParams = [adminId];
    if (isValidDate(startDate) && isValidDate(endDate)) {
      queryParams.push(startDate, endDate);
      // SQLite uses JULIANDAY for date comparisons
      dateFilterClause = `AND JULIANDAY(b."createdAt") BETWEEN JULIANDAY(?) AND JULIANDAY(?)`;
    }

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

    const filteredStatsQuery = `
        SELECT
            COUNT(*) as "filteredBookingsCount",
            COALESCE(SUM(b."sellingPrice"), 0) as "filteredRevenue",
            COALESCE(SUM(b.profit), 0) as "filteredProfit",
            COALESCE(SUM(b."basePrice"), 0) as "filteredCost",
            COALESCE(SUM(b."sellingPrice" - b."remainingBalance"), 0) as "filteredPaid",
            (SELECT COUNT(*) FROM bookings WHERE "userId" = ? AND "isFullyPaid" = 1) as "fullyPaid",
            (SELECT COUNT(*) FROM bookings WHERE "userId" = ? AND "isFullyPaid" = 0) as "pending"
        FROM bookings b
        WHERE b."userId" = ? ${dateFilterClause.replace(/\?/g, () =>
          queryParams.length > 1 ? `?` : ""
        )}
    `;
    const filteredStatsPromise = dbGet(req.db, filteredStatsQuery, [
      adminId,
      adminId,
      ...queryParams,
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
  // This function will be updated in a later step
  res.json({ profitData: [], monthlyTrend: [] });
};

module.exports = {
  getDashboardStats,
  getProfitReport,
};
