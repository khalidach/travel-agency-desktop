// backend/services/BookingService.js
const calculateBasePrice = (
  db,
  userId,
  tripId,
  packageId,
  selectedHotel,
  personType
) => {
  const programStmt = db.prepare(
    'SELECT * FROM programs WHERE id = ? AND "userId" = ?'
  );
  const program = programStmt.get(tripId, userId);
  if (!program)
    throw new Error("Program not found for base price calculation.");

  const pricingStmt = db.prepare(
    'SELECT * FROM program_pricing WHERE "programId" = ? AND "userId" = ?'
  );
  const pricing = pricingStmt.get(tripId, userId);
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

const createBooking = (db, user, bookingData) => {
  const createTransaction = db.transaction(() => {
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

    const existingBooking = db
      .prepare(
        'SELECT id FROM bookings WHERE "passportNumber" = ? AND "tripId" = ? AND "userId" = ?'
      )
      .get(passportNumber, tripId, adminId);
    if (existingBooking) {
      throw new Error("This person is already booked for this program.");
    }

    const program = db
      .prepare('SELECT packages FROM programs WHERE id = ? AND "userId" = ?')
      .get(tripId, adminId);
    if (!program) throw new Error("Program not found.");

    const parsedPackages = JSON.parse(program.packages || "[]");
    if (parsedPackages.length > 0 && !packageId) {
      throw new Error("A package must be selected for this program.");
    }

    const basePrice = calculateBasePrice(
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
    const employeeId = null;

    const sql =
      'INSERT INTO bookings ("userId", "employeeId", "clientNameAr", "clientNameFr", "personType", "phoneNumber", "passportNumber", "tripId", "packageId", "selectedHotel", "sellingPrice", "basePrice", profit, "advancePayments", "remainingBalance", "isFullyPaid", "relatedPersons") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
    const result = db
      .prepare(sql)
      .run(
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
        JSON.stringify(relatedPersons || [])
      );

    db.prepare(
      'UPDATE programs SET "totalBookings" = "totalBookings" + 1 WHERE id = ?'
    ).run(tripId);

    return db
      .prepare("SELECT * FROM bookings WHERE id = ?")
      .get(result.lastInsertRowid);
  });
  return createTransaction();
};

module.exports = {
  calculateBasePrice,
  createBooking,
};
