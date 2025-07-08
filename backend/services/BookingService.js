// backend/services/BookingService.js

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

const calculateBasePrice = async (
  db,
  userId,
  tripId,
  packageId,
  selectedHotel,
  personType
) => {
  const program = await dbGet(
    db,
    'SELECT * FROM programs WHERE id = ? AND "userId" = ?',
    [tripId, userId]
  );
  if (!program)
    throw new Error("Program not found for base price calculation.");

  const pricing = await dbGet(
    db,
    'SELECT * FROM program_pricing WHERE "programId" = ? AND "userId" = ?',
    [tripId, userId]
  );
  if (!pricing) return 0;

  const parsedProgram = {
    ...program,
    cities: JSON.parse(program.cities || "[]"),
    packages: JSON.parse(program.packages || "[]"),
  };
  const parsedPricing = {
    ...pricing,
    allHotels: JSON.parse(pricing.allHotels || "[]"),
    personTypes: JSON.parse(pricing.personTypes || "[]"),
  };

  const personTypeInfo = (parsedPricing.personTypes || []).find(
    (p) => p.type === personType
  );
  const ticketPercentage = personTypeInfo
    ? personTypeInfo.ticketPercentage / 100
    : 1;

  const ticketPrice =
    Number(parsedPricing.ticketAirline || 0) * ticketPercentage;
  const visaPrice = Number(parsedPricing.visaFees || 0);
  const guidePrice = Number(parsedPricing.guideFees || 0);
  const transportPrice = Number(parsedPricing.transportFees || 0);
  const nonHotelCosts = ticketPrice + visaPrice + guidePrice + transportPrice;

  let hotelCosts = 0;
  const bookingPackage = (parsedProgram.packages || []).find(
    (p) => p.name === packageId
  );

  if (
    bookingPackage &&
    selectedHotel &&
    selectedHotel.hotelNames &&
    selectedHotel.hotelNames.some((h) => h)
  ) {
    const hotelCombination = (selectedHotel.hotelNames || []).join("_");
    const priceStructure = (bookingPackage.prices || []).find(
      (p) => p.hotelCombination === hotelCombination
    );

    if (priceStructure) {
      const guestMap = new Map(
        priceStructure.roomTypes.map((rt) => [rt.type, rt.guests])
      );
      hotelCosts = (selectedHotel.cities || []).reduce((total, city, index) => {
        const hotelName = selectedHotel.hotelNames[index];
        const roomTypeName = selectedHotel.roomTypes[index];
        const hotelPricingInfo = (parsedPricing.allHotels || []).find(
          (h) => h.name === hotelName && h.city === city
        );
        const cityInfo = (parsedProgram.cities || []).find(
          (c) => c.name === city
        );

        if (hotelPricingInfo && cityInfo && roomTypeName) {
          const pricePerNight = Number(
            hotelPricingInfo.PricePerNights?.[roomTypeName] || 0
          );
          const nights = Number(cityInfo.nights || 0);
          const guests = Number(guestMap.get(roomTypeName) || 1);
          if (guests > 0) {
            return total + (pricePerNight * nights) / guests;
          }
        }
        return total;
      }, 0);
    }
  }
  return Math.round(nonHotelCosts + hotelCosts);
};

// This function now uses db.serialize to ensure the operations run in order (like a transaction)
const runInTransaction = (db, callback) => {
  return new Promise((resolve, reject) => {
    db.serialize(async () => {
      try {
        await dbRun(db, "BEGIN");
        const result = await callback();
        await dbRun(db, "COMMIT");
        resolve(result);
      } catch (error) {
        await dbRun(db, "ROLLBACK");
        reject(error);
      }
    });
  });
};

const createBooking = async (db, user, bookingData) => {
  return runInTransaction(db, async () => {
    const { adminId } = user;
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
    } = bookingData;

    const existingBooking = await dbGet(
      db,
      'SELECT id FROM bookings WHERE "passportNumber" = ? AND "tripId" = ? AND "userId" = ?',
      [passportNumber, tripId, adminId]
    );
    if (existingBooking) {
      throw new Error("This person is already booked for this program.");
    }

    const program = await dbGet(
      db,
      'SELECT packages FROM programs WHERE id = ? AND "userId" = ?',
      [tripId, adminId]
    );
    if (!program) throw new Error("Program not found.");

    const parsedPackages = JSON.parse(program.packages || "[]");
    if (parsedPackages.length > 0 && !packageId) {
      throw new Error("A package must be selected for this program.");
    }

    const basePrice = await calculateBasePrice(
      db,
      adminId,
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
    const employeeId = null; // No employees in desktop version

    const sql =
      'INSERT INTO bookings ("userId", "employeeId", "clientNameAr", "clientNameFr", "personType", "phoneNumber", "passportNumber", "tripId", "packageId", "selectedHotel", "sellingPrice", "basePrice", profit, "advancePayments", "remainingBalance", "isFullyPaid", "relatedPersons") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
    const result = await dbRun(db, sql, [
      adminId,
      employeeId,
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
    ]);

    await dbRun(
      db,
      'UPDATE programs SET "totalBookings" = "totalBookings" + 1 WHERE id = ?',
      [tripId]
    );

    return dbGet(db, "SELECT * FROM bookings WHERE id = ?", [result.lastID]);
  });
};

module.exports = {
  calculateBasePrice,
  createBooking,
};
