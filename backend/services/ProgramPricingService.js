// backend/services/ProgramPricingService.js
const { calculateBasePrice } = require("./BookingService");

function updateRelatedBookings(db, userId, programId) {
  const relatedBookings = db
    .prepare('SELECT * FROM bookings WHERE "tripId" = ? AND "userId" = ?')
    .all(programId, userId);

  const updateStmt = db.prepare(
    'UPDATE bookings SET "basePrice" = ?, profit = ?, "remainingBalance" = ?, "isFullyPaid" = ? WHERE id = ?'
  );

  for (const booking of relatedBookings) {
    const newBasePrice = calculateBasePrice(
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

    updateStmt.run(
      newBasePrice,
      newProfit,
      newRemainingBalance,
      newIsFullyPaid,
      booking.id
    );
  }
}

exports.createPricingAndBookings = (db, user, pricingData) => {
  const createTransaction = db.transaction(() => {
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
    const employeeId = null;

    const sql =
      'INSERT INTO program_pricing ("userId", "employeeId", "programId", "selectProgram", "ticketAirline", "visaFees", "guideFees", "transportFees", "allHotels", "personTypes") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
    const result = db
      .prepare(sql)
      .run(
        userId,
        employeeId,
        programId,
        selectProgram,
        ticketAirline,
        visaFees,
        guideFees,
        transportFees,
        JSON.stringify(allHotels || []),
        JSON.stringify(personTypes || [])
      );

    updateRelatedBookings(db, userId, programId);

    const createdPricing = db
      .prepare("SELECT * FROM program_pricing WHERE id = ?")
      .get(result.lastInsertRowid);
    return createdPricing;
  });

  return createTransaction();
};

exports.updatePricingAndBookings = (db, user, pricingId, pricingData) => {
  const updateTransaction = db.transaction(() => {
    const existingPricing = db
      .prepare(
        'SELECT "employeeId" FROM program_pricing WHERE id = ? AND "userId" = ?'
      )
      .get(pricingId, user.adminId);
    if (!existingPricing) {
      throw new Error("Program pricing not found or user not authorized");
    }

    const sql =
      'UPDATE program_pricing SET "programId" = ?, "selectProgram" = ?, "ticketAirline" = ?, "visaFees" = ?, "guideFees" = ?, "allHotels" = ?, "transportFees" = ?, "personTypes" = ?, "updatedAt" = CURRENT_TIMESTAMP WHERE id = ? AND "userId" = ?';
    db.prepare(sql).run(
      pricingData.programId,
      pricingData.selectProgram,
      pricingData.ticketAirline,
      pricingData.visaFees,
      pricingData.guideFees,
      JSON.stringify(pricingData.allHotels || []),
      pricingData.transportFees,
      JSON.stringify(pricingData.personTypes || []),
      pricingId,
      user.adminId
    );

    updateRelatedBookings(db, user.adminId, pricingData.programId);

    const updatedPricing = db
      .prepare("SELECT * FROM program_pricing WHERE id = ?")
      .get(pricingId);
    return updatedPricing;
  });

  return updateTransaction();
};
