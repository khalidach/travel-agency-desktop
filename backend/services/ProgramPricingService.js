// backend/services/ProgramPricingService.js
const { calculateBasePrice } = require("./BookingService");

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

async function updateRelatedBookings(db, userId, programId) {
  const relatedBookings = await dbAll(
    db,
    'SELECT * FROM bookings WHERE "tripId" = ? AND "userId" = ?',
    [programId, userId]
  );

  for (const booking of relatedBookings) {
    const newBasePrice = await calculateBasePrice(
      db,
      userId,
      booking.tripId,
      booking.packageId,
      JSON.parse(booking.selectedHotel),
      booking.personType
    );
    const newProfit = Number(booking.sellingPrice || 0) - newBasePrice;
    const totalPaid = JSON.parse(booking.advancePayments || "[]").reduce(
      (sum, p) => sum + p.amount,
      0
    );
    const newRemainingBalance = Number(booking.sellingPrice || 0) - totalPaid;
    const newIsFullyPaid = newRemainingBalance <= 0;

    await dbRun(
      db,
      'UPDATE bookings SET "basePrice" = ?, profit = ?, "remainingBalance" = ?, "isFullyPaid" = ? WHERE id = ?',
      [newBasePrice, newProfit, newRemainingBalance, newIsFullyPaid, booking.id]
    );
  }
}

exports.createPricingAndBookings = async (db, user, pricingData) => {
  return new Promise((resolve, reject) => {
    db.serialize(async () => {
      try {
        await dbRun(db, "BEGIN TRANSACTION");

        const {
          programId,
          selectProgram,
          ticketAirline,
          visaFees,
          guideFees,
          transportFees,
          allHotels,
          personTypes,
        } = pricingData;
        const userId = user.adminId;
        const employeeId = null; // No employees in desktop version

        const sql =
          'INSERT INTO program_pricing ("userId", "employeeId", "programId", "selectProgram", "ticketAirline", "visaFees", "guideFees", "transportFees", "allHotels", "personTypes") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
        const result = await dbRun(db, sql, [
          userId,
          employeeId,
          programId,
          selectProgram,
          ticketAirline,
          visaFees,
          guideFees,
          transportFees,
          JSON.stringify(allHotels || []),
          JSON.stringify(personTypes || []),
        ]);

        await updateRelatedBookings(db, userId, programId);

        await dbRun(db, "COMMIT");

        const createdPricing = await dbGet(
          db,
          "SELECT * FROM program_pricing WHERE id = ?",
          [result.lastID]
        );
        resolve(createdPricing);
      } catch (error) {
        await dbRun(db, "ROLLBACK");
        reject(error);
      }
    });
  });
};

exports.updatePricingAndBookings = async (db, user, pricingId, pricingData) => {
  return new Promise((resolve, reject) => {
    db.serialize(async () => {
      try {
        await dbRun(db, "BEGIN TRANSACTION");

        const existingPricing = await dbGet(
          db,
          'SELECT "employeeId" FROM program_pricing WHERE id = ? AND "userId" = ?',
          [pricingId, user.adminId]
        );
        if (!existingPricing) {
          throw new Error("Program pricing not found or user not authorized");
        }

        const sql =
          'UPDATE program_pricing SET "programId" = ?, "selectProgram" = ?, "ticketAirline" = ?, "visaFees" = ?, "guideFees" = ?, "allHotels" = ?, "transportFees" = ?, "personTypes" = ?, "updatedAt" = CURRENT_TIMESTAMP WHERE id = ? AND "userId" = ?';
        await dbRun(db, sql, [
          pricingData.programId,
          pricingData.selectProgram,
          pricingData.ticketAirline,
          pricingData.visaFees,
          pricingData.guideFees,
          JSON.stringify(pricingData.allHotels || []),
          pricingData.transportFees,
          JSON.stringify(pricingData.personTypes || []),
          pricingId,
          user.adminId,
        ]);

        await updateRelatedBookings(db, user.adminId, pricingData.programId);

        await dbRun(db, "COMMIT");

        const updatedPricing = await dbGet(
          db,
          "SELECT * FROM program_pricing WHERE id = ?",
          [pricingId]
        );
        resolve(updatedPricing);
      } catch (error) {
        await dbRun(db, "ROLLBACK");
        reject(error);
      }
    });
  });
};
