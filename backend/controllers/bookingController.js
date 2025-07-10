// backend/controllers/bookingController.js
const BookingService = require("../services/BookingService");
const ExcelService = require("../services/ExcelService");

const findBookingForUser = (db, user, bookingId) => {
  const stmt = db.prepare(
    'SELECT * FROM bookings WHERE id = ? AND "userId" = ?'
  );
  const booking = stmt.get(bookingId, user.adminId);
  if (!booking) throw new Error("Booking not found or not authorized");
  return booking;
};

exports.getAllBookings = (req, res) => {
  try {
    const { adminId } = req.user;
    const page = parseInt(req.query.page || "1", 10);
    const limit = parseInt(req.query.limit || "10", 10);
    const offset = (page - 1) * limit;

    const bookingsStmt = req.db.prepare(
      `SELECT * FROM bookings WHERE "userId" = ? ORDER BY "createdAt" DESC LIMIT ? OFFSET ?`
    );
    const bookings = bookingsStmt.all(adminId, limit, offset);

    const totalResult = req.db
      .prepare(`SELECT COUNT(*) as totalCount FROM bookings WHERE "userId" = ?`)
      .get(adminId);
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

exports.getBookingsByProgram = (req, res) => {
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
    const bookings = req.db
      .prepare(bookingsQuery)
      .all(...queryParams, limit, offset);

    const countQuery = `SELECT COUNT(*) as totalCount FROM bookings b ${whereClause}`;
    const totalResult = req.db.prepare(countQuery).get(...queryParams);
    const totalCount = totalResult.totalCount;

    const summaryQuery = `
            SELECT
                COALESCE(SUM("sellingPrice"), 0) as totalRevenue,
                COALESCE(SUM("basePrice"), 0) as totalCost,
                COALESCE(SUM(profit), 0) as totalProfit,
                COALESCE(SUM("sellingPrice" - "remainingBalance"), 0) as totalPaid
            FROM bookings b ${whereClause}`;
    const summaryResult = req.db.prepare(summaryQuery).get(...queryParams);

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

exports.createBooking = (req, res) => {
  try {
    const newBooking = BookingService.createBooking(req.db, req.user, req.body);
    res.status(201).json(newBooking);
  } catch (error) {
    console.error("Create Booking Error:", error);
    res.status(400).json({ message: error.message });
  }
};

exports.updateBooking = (req, res) => {
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

    findBookingForUser(req.db, req.user, id);

    const basePrice = BookingService.calculateBasePrice(
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

    const stmt = req.db.prepare(
      'UPDATE bookings SET "clientNameAr" = ?, "clientNameFr" = ?, "personType" = ?, "phoneNumber" = ?, "passportNumber" = ?, "tripId" = ?, "packageId" = ?, "selectedHotel" = ?, "sellingPrice" = ?, "basePrice" = ?, profit = ?, "advancePayments" = ?, "remainingBalance" = ?, "isFullyPaid" = ?, "relatedPersons" = ? WHERE id = ?'
    );
    stmt.run(
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
      id
    );

    const updatedBooking = req.db
      .prepare("SELECT * FROM bookings WHERE id = ?")
      .get(id);
    res.json(updatedBooking);
  } catch (error) {
    console.error("Update Booking Error:", error);
    res.status(400).json({ message: error.message });
  }
};

exports.deleteBooking = (req, res) => {
  const { id } = req.params;
  const db = req.db;
  try {
    const deleteTransaction = db.transaction(() => {
      const booking = db
        .prepare('SELECT "tripId" FROM bookings WHERE id = ? AND "userId" = ?')
        .get(id, req.user.adminId);
      if (!booking) throw new Error("Booking not found or not authorized");

      db.prepare("DELETE FROM bookings WHERE id = ?").run(id);
      if (booking.tripId) {
        db.prepare(
          'UPDATE programs SET "totalBookings" = "totalBookings" - 1 WHERE id = ? AND "totalBookings" > 0'
        ).run(booking.tripId);
      }
    });

    deleteTransaction();
    res.json({ message: "Booking deleted successfully" });
  } catch (error) {
    console.error("Delete Booking Error:", error);
    res.status(500).json({ message: error.message });
  }
};

exports.deleteMultipleBookings = (req, res) => {
  const { ids } = req.body;
  const { adminId } = req.user;
  const db = req.db;

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ message: "No booking IDs provided." });
  }

  try {
    const deleteTransaction = db.transaction(() => {
      const placeholders = ids.map(() => "?").join(",");
      const bookingsToDelete = db
        .prepare(
          `SELECT "tripId" FROM bookings WHERE id IN (${placeholders}) AND "userId" = ?`
        )
        .all(...ids, adminId);

      if (bookingsToDelete.length !== ids.length) {
        throw new Error("One or more bookings not found or not authorized.");
      }

      const programCounts = bookingsToDelete.reduce((acc, booking) => {
        acc[booking.tripId] = (acc[booking.tripId] || 0) + 1;
        return acc;
      }, {});

      const deleteStmt = db.prepare(
        `DELETE FROM bookings WHERE id IN (${placeholders}) AND "userId" = ?`
      );
      deleteStmt.run(...ids, adminId);

      const updateProgramStmt = db.prepare(
        'UPDATE programs SET "totalBookings" = "totalBookings" - ? WHERE id = ?'
      );
      for (const tripId in programCounts) {
        updateProgramStmt.run(programCounts[tripId], tripId);
      }
    });

    deleteTransaction();
    res.json({ message: "Selected bookings deleted successfully." });
  } catch (error) {
    console.error("Bulk Delete Bookings Error:", error);
    res.status(500).json({ message: error.message });
  }
};

exports.addPayment = (req, res) => {
  try {
    const { bookingId } = req.params;
    const booking = findBookingForUser(req.db, req.user, bookingId);
    const newPayment = { ...req.body, _id: new Date().getTime().toString() };
    const advancePayments = [
      ...JSON.parse(booking.advancePayments || "[]"),
      newPayment,
    ];
    const totalPaid = advancePayments.reduce((sum, p) => sum + p.amount, 0);
    const remainingBalance = booking.sellingPrice - totalPaid;
    const isFullyPaid = remainingBalance <= 0;

    req.db
      .prepare(
        'UPDATE bookings SET "advancePayments" = ?, "remainingBalance" = ?, "isFullyPaid" = ? WHERE id = ?'
      )
      .run(
        JSON.stringify(advancePayments),
        remainingBalance,
        isFullyPaid ? 1 : 0,
        bookingId
      );
    const updatedBooking = findBookingForUser(req.db, req.user, bookingId);
    res.json({
      ...updatedBooking,
      advancePayments: JSON.parse(updatedBooking.advancePayments || "[]"),
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.updatePayment = (req, res) => {
  try {
    const { bookingId, paymentId } = req.params;
    const booking = findBookingForUser(req.db, req.user, bookingId);
    const advancePayments = JSON.parse(booking.advancePayments || "[]").map(
      (p) => (p._id === paymentId ? { ...p, ...req.body, _id: p._id } : p)
    );
    const totalPaid = advancePayments.reduce((sum, p) => sum + p.amount, 0);
    const remainingBalance = booking.sellingPrice - totalPaid;
    const isFullyPaid = remainingBalance <= 0;

    req.db
      .prepare(
        'UPDATE bookings SET "advancePayments" = ?, "remainingBalance" = ?, "isFullyPaid" = ? WHERE id = ?'
      )
      .run(
        JSON.stringify(advancePayments),
        remainingBalance,
        isFullyPaid ? 1 : 0,
        bookingId
      );
    const updatedBooking = findBookingForUser(req.db, req.user, bookingId);
    res.json({
      ...updatedBooking,
      advancePayments: JSON.parse(updatedBooking.advancePayments || "[]"),
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deletePayment = (req, res) => {
  try {
    const { bookingId, paymentId } = req.params;
    const booking = findBookingForUser(req.db, req.user, bookingId);
    const advancePayments = JSON.parse(booking.advancePayments || "[]").filter(
      (p) => p._id !== paymentId
    );
    const totalPaid = advancePayments.reduce((sum, p) => sum + p.amount, 0);
    const remainingBalance = booking.sellingPrice - totalPaid;
    const isFullyPaid = remainingBalance <= 0;

    req.db
      .prepare(
        'UPDATE bookings SET "advancePayments" = ?, "remainingBalance" = ?, "isFullyPaid" = ? WHERE id = ?'
      )
      .run(
        JSON.stringify(advancePayments),
        remainingBalance,
        isFullyPaid ? 1 : 0,
        bookingId
      );
    const updatedBooking = findBookingForUser(req.db, req.user, bookingId);
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
    const { adminId, role } = req.user;

    const program = req.db
      .prepare('SELECT * FROM programs WHERE id = ? AND "userId" = ?')
      .get(programId, adminId);
    if (!program)
      return res.status(404).json({ message: "Program not found." });

    const bookings = req.db
      .prepare(
        'SELECT * FROM bookings WHERE "tripId" = ? AND "userId" = ? ORDER BY "createdAt" DESC'
      )
      .all(programId, adminId);
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
      program,
      role
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

    const buffer = await workbook.xlsx.writeBuffer();
    res.send(buffer);
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
    const program = req.db
      .prepare('SELECT * FROM programs WHERE id = ? AND "userId" = ?')
      .get(programId, req.user.adminId);
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

    const buffer = await workbook.xlsx.writeBuffer();
    res.send(buffer);
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
