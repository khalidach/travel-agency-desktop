// backend/controllers/bookingController.js
const BookingService = require("../services/BookingService");
const ExcelService = require("../services/ExcelService");

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

const findBookingForUser = async (db, user, bookingId) => {
  const booking = await dbGet(
    db,
    'SELECT * FROM bookings WHERE id = ? AND "userId" = ?',
    [bookingId, user.adminId]
  );
  if (!booking) throw new Error("Booking not found or not authorized");
  return booking;
};

exports.getAllBookings = async (req, res) => {
  try {
    const { adminId } = req.user;
    const page = parseInt(req.query.page || "1", 10);
    const limit = parseInt(req.query.limit || "10", 10);
    const offset = (page - 1) * limit;

    const bookings = await dbAll(
      req.db,
      `SELECT * FROM bookings WHERE "userId" = ? ORDER BY "createdAt" DESC LIMIT ? OFFSET ?`,
      [adminId, limit, offset]
    );
    const totalResult = await dbGet(
      req.db,
      `SELECT COUNT(*) as totalCount FROM bookings WHERE "userId" = ?`,
      [adminId]
    );
    const totalCount = totalResult.totalCount;

    res.json({
      data: bookings.map((b) => ({
        ...b,
        advancePayments: JSON.parse(b.advancePayments || "[]"),
        relatedPersons: JSON.parse(b.relatedPersons || "[]"),
        selectedHotel: JSON.parse(b.selectedHotel || "{}"),
      })),
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Get All Bookings Error:", error);
    res.status(500).json({ message: error.message });
  }
};

exports.getBookingsByProgram = async (req, res) => {
  try {
    const { programId } = req.params;
    const {
      page = 1,
      limit = 10,
      searchTerm = "",
      sortOrder = "newest",
      statusFilter = "all",
    } = req.query;
    const { adminId } = req.user;

    let whereConditions = ['b."userId" = ?', 'b."tripId" = ?'];
    const queryParams = [adminId, programId];

    if (searchTerm) {
      whereConditions.push(
        `(b."clientNameFr" LIKE ? OR b."clientNameAr" LIKE ? OR b."passportNumber" LIKE ?)`
      );
      queryParams.push(`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`);
    }
    if (statusFilter === "paid") {
      whereConditions.push('b."isFullyPaid" = 1');
    } else if (statusFilter === "pending") {
      whereConditions.push('b."isFullyPaid" = 0');
    }

    const whereClause = `WHERE ${whereConditions.join(" AND ")}`;

    let orderByClause;
    switch (sortOrder) {
      case "oldest":
        orderByClause = 'ORDER BY b."createdAt" ASC, b.id ASC';
        break;
      case "family":
        orderByClause =
          'ORDER BY b."phoneNumber" ASC, b."createdAt" DESC, b.id DESC';
        break;
      default:
        orderByClause = 'ORDER BY b."createdAt" DESC, b.id DESC';
        break;
    }

    const offset = (page - 1) * limit;

    const bookingsQuery = `SELECT * FROM bookings b ${whereClause} ${orderByClause} LIMIT ? OFFSET ?`;
    const bookingsParams = [...queryParams, limit, offset];
    const bookings = await dbAll(req.db, bookingsQuery, bookingsParams);

    const countQuery = `SELECT COUNT(*) as totalCount FROM bookings b ${whereClause}`;
    const totalResult = await dbGet(req.db, countQuery, queryParams);
    const totalCount = totalResult.totalCount;

    const summaryQuery = `
            SELECT
                COALESCE(SUM("sellingPrice"), 0) as totalRevenue,
                COALESCE(SUM("basePrice"), 0) as totalCost,
                COALESCE(SUM(profit), 0) as totalProfit,
                COALESCE(SUM("sellingPrice" - "remainingBalance"), 0) as totalPaid
            FROM bookings b ${whereClause}`;
    const summaryResult = await dbGet(req.db, summaryQuery, queryParams);

    const totalRevenue = summaryResult.totalRevenue;
    const totalPaid = summaryResult.totalPaid;

    res.json({
      data: bookings.map((b) => ({
        ...b,
        advancePayments: JSON.parse(b.advancePayments || "[]"),
        relatedPersons: JSON.parse(b.relatedPersons || "[]"),
        selectedHotel: JSON.parse(b.selectedHotel || "{}"),
      })),
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
      summary: {
        totalBookings: totalCount,
        totalRevenue,
        totalCost: summaryResult.totalCost,
        totalProfit: summaryResult.totalProfit,
        totalPaid,
        totalRemaining: totalRevenue - totalPaid,
      },
    });
  } catch (error) {
    console.error("Get Bookings By Program Error:", error);
    res.status(500).json({ message: error.message });
  }
};

exports.createBooking = async (req, res) => {
  try {
    const newBooking = await BookingService.createBooking(
      req.db,
      req.user,
      req.body
    );
    res.status(201).json(newBooking);
  } catch (error) {
    console.error("Create Booking Error:", error);
    res.status(400).json({ message: error.message });
  }
};

exports.updateBooking = async (req, res) => {
  const { id } = req.params;
  try {
    const {
      clientNameAr,
      clientNameFr,
      personType,
      phoneNumber,
      passportNumber,
      tripId,
      packageId,
      selectedHotel,
      sellingPrice,
      advancePayments,
      relatedPersons,
    } = req.body;
    const booking = await dbGet(
      req.db,
      'SELECT * FROM bookings WHERE id = ? AND "userId" = ?',
      [id, req.user.adminId]
    );
    if (!booking) throw new Error("Booking not found or not authorized");

    const basePrice = await BookingService.calculateBasePrice(
      req.db,
      req.user.adminId,
      tripId,
      packageId,
      selectedHotel,
      personType
    );
    const profit = sellingPrice - basePrice;
    const totalPaid = (advancePayments || []).reduce(
      (sum, p) => sum + p.amount,
      0
    );
    const remainingBalance = sellingPrice - totalPaid;
    const isFullyPaid = remainingBalance <= 0;

    const sql =
      'UPDATE bookings SET "clientNameAr" = ?, "clientNameFr" = ?, "personType" = ?, "phoneNumber" = ?, "passportNumber" = ?, "tripId" = ?, "packageId" = ?, "selectedHotel" = ?, "sellingPrice" = ?, "basePrice" = ?, profit = ?, "advancePayments" = ?, "remainingBalance" = ?, "isFullyPaid" = ?, "relatedPersons" = ? WHERE id = ?';
    await dbRun(req.db, sql, [
      clientNameAr,
      clientNameFr,
      personType,
      phoneNumber,
      passportNumber,
      tripId,
      packageId,
      JSON.stringify(selectedHotel),
      sellingPrice,
      basePrice,
      profit,
      JSON.stringify(advancePayments || []),
      remainingBalance,
      isFullyPaid ? 1 : 0,
      JSON.stringify(relatedPersons || []),
      id,
    ]);

    const updatedBooking = await dbGet(
      req.db,
      "SELECT * FROM bookings WHERE id = ?",
      [id]
    );
    res.json(updatedBooking);
  } catch (error) {
    console.error("Update Booking Error:", error);
    res.status(400).json({ message: error.message });
  }
};

exports.deleteBooking = async (req, res) => {
  const { id } = req.params;
  const db = req.db;
  try {
    db.serialize(async () => {
      try {
        await dbRun(db, "BEGIN TRANSACTION");
        const booking = await dbGet(
          db,
          'SELECT "tripId" FROM bookings WHERE id = ? AND "userId" = ?',
          [id, req.user.adminId]
        );
        if (!booking) throw new Error("Booking not found or not authorized");

        await dbRun(db, "DELETE FROM bookings WHERE id = ?", [id]);
        if (booking.tripId) {
          await dbRun(
            db,
            'UPDATE programs SET "totalBookings" = "totalBookings" - 1 WHERE id = ? AND "totalBookings" > 0',
            [booking.tripId]
          );
        }
        await dbRun(db, "COMMIT");
        res.json({ message: "Booking deleted successfully" });
      } catch (err) {
        await dbRun(db, "ROLLBACK");
        throw err;
      }
    });
  } catch (error) {
    console.error("Delete Booking Error:", error);
    res.status(500).json({ message: error.message });
  }
};

exports.addPayment = async (req, res) => {
  try {
    const booking = await findBookingForUser(
      req.db,
      req.user,
      req.params.bookingId
    );
    const newPayment = { ...req.body, _id: new Date().getTime().toString() };
    const advancePayments = [
      ...JSON.parse(booking.advancePayments || "[]"),
      newPayment,
    ];
    const totalPaid = advancePayments.reduce((sum, p) => sum + p.amount, 0);
    const remainingBalance = booking.sellingPrice - totalPaid;
    const isFullyPaid = remainingBalance <= 0;

    await dbRun(
      req.db,
      'UPDATE bookings SET "advancePayments" = ?, "remainingBalance" = ?, "isFullyPaid" = ? WHERE id = ?',
      [
        JSON.stringify(advancePayments),
        remainingBalance,
        isFullyPaid ? 1 : 0,
        req.params.bookingId,
      ]
    );
    const updatedBooking = await findBookingForUser(
      req.db,
      req.user,
      req.params.bookingId
    );
    res.json({
      ...updatedBooking,
      advancePayments: JSON.parse(updatedBooking.advancePayments || "[]"),
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.updatePayment = async (req, res) => {
  try {
    const booking = await findBookingForUser(
      req.db,
      req.user,
      req.params.bookingId
    );
    const advancePayments = JSON.parse(booking.advancePayments || "[]").map(
      (p) =>
        p._id === req.params.paymentId ? { ...p, ...req.body, _id: p._id } : p
    );
    const totalPaid = advancePayments.reduce((sum, p) => sum + p.amount, 0);
    const remainingBalance = booking.sellingPrice - totalPaid;
    const isFullyPaid = remainingBalance <= 0;

    await dbRun(
      req.db,
      'UPDATE bookings SET "advancePayments" = ?, "remainingBalance" = ?, "isFullyPaid" = ? WHERE id = ?',
      [
        JSON.stringify(advancePayments),
        remainingBalance,
        isFullyPaid ? 1 : 0,
        req.params.bookingId,
      ]
    );
    const updatedBooking = await findBookingForUser(
      req.db,
      req.user,
      req.params.bookingId
    );
    res.json({
      ...updatedBooking,
      advancePayments: JSON.parse(updatedBooking.advancePayments || "[]"),
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deletePayment = async (req, res) => {
  try {
    const booking = await findBookingForUser(
      req.db,
      req.user,
      req.params.bookingId
    );
    const advancePayments = JSON.parse(booking.advancePayments || "[]").filter(
      (p) => p._id !== req.params.paymentId
    );
    const totalPaid = advancePayments.reduce((sum, p) => sum + p.amount, 0);
    const remainingBalance = booking.sellingPrice - totalPaid;
    const isFullyPaid = remainingBalance <= 0;

    await dbRun(
      req.db,
      'UPDATE bookings SET "advancePayments" = ?, "remainingBalance" = ?, "isFullyPaid" = ? WHERE id = ?',
      [
        JSON.stringify(advancePayments),
        remainingBalance,
        isFullyPaid ? 1 : 0,
        req.params.bookingId,
      ]
    );
    const updatedBooking = await findBookingForUser(
      req.db,
      req.user,
      req.params.bookingId
    );
    res.json({
      ...updatedBooking,
      advancePayments: JSON.parse(updatedBooking.advancePayments || "[]"),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- Excel Functions ---
exports.exportBookingsToExcel = async (req, res) => {
  try {
    const { programId } = req.params;
    const { adminId } = req.user;

    const program = await dbGet(
      req.db,
      'SELECT * FROM programs WHERE id = ? AND "userId" = ?',
      [programId, adminId]
    );
    if (!program)
      return res.status(404).json({ message: "Program not found." });

    const bookings = await dbAll(
      req.db,
      'SELECT * FROM bookings WHERE "tripId" = ? AND "userId" = ? ORDER BY "createdAt" DESC',
      [programId, adminId]
    );
    if (bookings.length === 0)
      return res
        .status(404)
        .json({ message: "No bookings found for this program." });

    const parsedBookings = bookings.map((b) => ({
      ...b,
      advancePayments: JSON.parse(b.advancePayments || "[]"),
      relatedPersons: JSON.parse(b.relatedPersons || "[]"),
      selectedHotel: JSON.parse(b.selectedHotel || "{}"),
    }));

    const workbook = await ExcelService.generateBookingsExcel(
      parsedBookings,
      program
    );

    const fileName = `${(program.name || "Untitled_Program").replace(
      /[\s\W]/g,
      "_"
    )}_bookings.xlsx`;
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Failed to export to Excel:", error);
    if (!res.headersSent) {
      res.status(500).json({ message: "Failed to export bookings to Excel." });
    }
  }
};

exports.exportBookingTemplateForProgram = async (req, res) => {
  try {
    const { programId } = req.params;
    const program = await dbGet(
      req.db,
      'SELECT * FROM programs WHERE id = ? AND "userId" = ?',
      [programId, req.user.adminId]
    );
    if (!program)
      return res.status(404).json({ message: "Program not found." });

    program.packages = JSON.parse(program.packages || "[]");
    program.cities = JSON.parse(program.cities || "[]");

    const workbook = await ExcelService.generateBookingTemplateForProgramExcel(
      program
    );
    const fileName = `${(program.name || "Untitled_Program").replace(
      /[\s\W]/g,
      "_"
    )}_Template.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Failed to export template:", error);
    if (!res.headersSent) {
      res.status(500).json({ message: "Failed to export booking template." });
    }
  }
};

exports.importBookingsFromExcel = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded." });
  const { programId } = req.params;
  if (!programId)
    return res.status(400).json({ message: "Program ID is required." });

  try {
    const result = await ExcelService.parseBookingsFromExcel(
      req.file,
      req.user,
      req.db,
      programId
    );
    res.status(201).json(result);
  } catch (error) {
    console.error("Excel import error:", error);
    res.status(500).json({ message: error.message });
  }
};
