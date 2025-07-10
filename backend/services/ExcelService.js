// backend/services/ExcelService.js
const excel = require("exceljs");
const { calculateBasePrice } = require("./BookingService");

const sanitizeName = (name) => {
  if (!name) return "";
  let sanitized = name.toString().replace(/\s/g, "_");
  if (/^[0-9]/.test(sanitized)) {
    sanitized = "N_" + sanitized;
  }
  return sanitized;
};

exports.generateBookingsExcel = async (bookings, program, userRole) => {
  const workbook = new excel.Workbook();
  const worksheet = workbook.addWorksheet("Bookings", {
    views: [{ rightToLeft: false }],
  });

  const allColumns = [
    { header: "ID", key: "id" },
    { header: "Prenom/Nom", key: "clientNameFr" },
    { header: "الاسم/النسب", key: "clientNameAr" },
    { header: "Passport Number", key: "passportNumber" },
    { header: "Phone Number", key: "phoneNumber" },
    { header: "الباقة", key: "packageId" },
    { header: "الفندق المختار", key: "hotels" },
    { header: "نوع الغرفة", key: "roomType" },
    { header: "Prix Cost", key: "basePrice" },
    { header: "Prix Vente", key: "sellingPrice" },
    { header: "Bénéfice", key: "profit" },
    { header: "Payé", key: "paid" },
    { header: "Reste", key: "remaining" },
  ];

  worksheet.columns = allColumns.filter((col) => {
    if (userRole === "admin") return true;
    return col.key !== "basePrice" && col.key !== "profit";
  });

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
  headerRow.height = 35;
  headerRow.eachCell((cell) => {
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF007BFF" },
    };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });

  bookings.forEach((booking, index) => {
    const totalPaid = (booking.advancePayments || []).reduce(
      (sum, p) => sum + p.amount,
      0
    );
    const rowData = {
      id: index + 1,
      clientNameFr: booking.clientNameFr,
      clientNameAr: booking.clientNameAr,
      passportNumber: booking.passportNumber,
      phoneNumber: booking.phoneNumber,
      packageId: booking.packageId,
      hotels: (booking.selectedHotel.hotelNames || []).join(", "),
      roomType: (booking.selectedHotel.roomTypes || []).join(", "),
      sellingPrice: Number(booking.sellingPrice),
      paid: totalPaid,
      remaining: Number(booking.remainingBalance),
    };
    if (userRole === "admin") {
      rowData.basePrice = Number(booking.basePrice);
      rowData.profit = Number(booking.profit);
    }
    worksheet.addRow(rowData);
  });

  return workbook;
};

exports.generateBookingTemplateForProgramExcel = async (program) => {
  const workbook = new excel.Workbook();
  const templateSheet = workbook.addWorksheet("Booking Template");
  const validationSheet = workbook.addWorksheet("Lists");
  validationSheet.state = "hidden";

  const hasPackages = program.packages && program.packages.length > 0;

  let headers = [
    { header: "Client Name (French)", key: "clientNameFr", width: 25 },
    { header: "Client Name (Arabic)", key: "clientNameAr", width: 25 },
    { header: "Person Type", key: "personType", width: 15 },
    { header: "Passport Number", key: "passportNumber", width: 20 },
    { header: "Phone Number", key: "phoneNumber", width: 20 },
  ];

  const cityHeaders = (program.cities || []).map((city) => ({
    header: `${city.name} Hotel`,
    key: `hotel_${sanitizeName(city.name)}`,
    width: 25,
  }));
  const roomTypeHeaders = (program.cities || []).map((city) => ({
    header: `${city.name} Room Type`,
    key: `roomType_${sanitizeName(city.name)}`,
    width: 20,
  }));

  if (hasPackages) {
    headers.push({ header: "Package", key: "package", width: 20 });
    headers.push(...cityHeaders, ...roomTypeHeaders);
  }
  headers.push({ header: "Selling Price", key: "sellingPrice", width: 15 });
  templateSheet.columns = headers;
  templateSheet.getRow(1).font = { bold: true };

  // Data Validation Logic
  const personTypes = ["adult", "child", "infant"];
  validationSheet.getColumn("A").values = ["PersonTypes", ...personTypes];
  workbook.definedNames.add("Lists!$A$2:$A$4", "PersonTypes");
  const personTypeCol = templateSheet.getColumn("personType").letter;
  for (let i = 2; i <= 101; i++) {
    templateSheet.getCell(`${personTypeCol}${i}`).dataValidation = {
      type: "list",
      allowBlank: false,
      formulae: ["=PersonTypes"],
    };
  }

  if (hasPackages) {
    const packageCol = templateSheet.getColumn("package").letter;
    const packageNames = (program.packages || []).map((p) => p.name);
    validationSheet.getColumn("B").values = ["Packages", ...packageNames];
    if (packageNames.length > 0) {
      workbook.definedNames.add(
        `Lists!$B$2:$B$${packageNames.length + 1}`,
        "Packages"
      );
    }
    for (let i = 2; i <= 101; i++) {
      templateSheet.getCell(`${packageCol}${i}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: ["=Packages"],
      };
    }

    let listColumnIndex = 2;
    const hotelRoomTypesMap = new Map();

    (program.packages || []).forEach((pkg) => {
      const packageNameSanitized = sanitizeName(pkg.name);
      (program.cities || []).forEach((city) => {
        const hotels = pkg.hotels[city.name] || [];
        if (hotels.length > 0) {
          listColumnIndex++;
          const col = validationSheet.getColumn(listColumnIndex);
          const rangeName = `${packageNameSanitized}_${sanitizeName(
            city.name
          )}_Hotels`;
          col.values = [rangeName, ...hotels];
          try {
            workbook.definedNames.add(
              `Lists!$${col.letter}$2:$${col.letter}$${hotels.length + 1}`,
              rangeName
            );
          } catch (e) {
            console.warn(
              `Could not create named range for Hotel: ${rangeName}.`
            );
          }
        }
      });

      (pkg.prices || []).forEach((price) => {
        const roomTypesForCombo = (price.roomTypes || []).map((rt) => rt.type);
        if (roomTypesForCombo.length > 0) {
          const individualHotels = price.hotelCombination.split("_");
          individualHotels.forEach((hotelName) => {
            if (!hotelRoomTypesMap.has(hotelName))
              hotelRoomTypesMap.set(hotelName, new Set());
            roomTypesForCombo.forEach((rt) =>
              hotelRoomTypesMap.get(hotelName).add(rt)
            );
          });
        }
      });
    });

    for (const [hotelName, roomTypesSet] of hotelRoomTypesMap.entries()) {
      const roomTypes = Array.from(roomTypesSet);
      if (roomTypes.length > 0) {
        listColumnIndex++;
        const col = validationSheet.getColumn(listColumnIndex);
        const rangeName = `${sanitizeName(hotelName)}_Rooms`;
        col.values = [rangeName, ...roomTypes];
        try {
          workbook.definedNames.add(
            `Lists!$${col.letter}$2:$${col.letter}$${roomTypes.length + 1}`,
            rangeName
          );
        } catch (e) {
          console.warn(
            `Could not create named range for RoomType: ${rangeName}.`
          );
        }
      }
    }

    for (let i = 2; i <= 101; i++) {
      cityHeaders.forEach((h) => {
        const hotelColumn = templateSheet.getColumn(h.key);
        if (hotelColumn) {
          const hotelFormula = `=INDIRECT(SUBSTITUTE(${packageCol}${i}," ","_")&"_${sanitizeName(
            h.header.replace(" Hotel", "")
          )}_Hotels")`;
          templateSheet.getCell(`${hotelColumn.letter}${i}`).dataValidation = {
            type: "list",
            allowBlank: true,
            formulae: [hotelFormula],
          };
        }
      });

      roomTypeHeaders.forEach((h, index) => {
        const hotelColumnKey = cityHeaders[index].key;
        const hotelColumn = templateSheet.getColumn(hotelColumnKey);
        const roomTypeColumn = templateSheet.getColumn(h.key);
        if (hotelColumn && roomTypeColumn) {
          const roomFormula = `=INDIRECT(SUBSTITUTE(${hotelColumn.letter}${i}," ","_")&"_Rooms")`;
          templateSheet.getCell(`${roomTypeColumn.letter}${i}`).dataValidation =
            { type: "list", allowBlank: true, formulae: [roomFormula] };
        }
      });
    }
  }

  return workbook;
};

exports.parseBookingsFromExcel = async (file, user, db, programId) => {
  // Step 1: Asynchronously read and parse the entire Excel file into memory.
  const workbook = new excel.Workbook();
  await workbook.xlsx.readFile(file.path);
  const worksheet = workbook.getWorksheet(1);

  const headerRow = worksheet.getRow(1).values;
  const headerMap = {};
  if (Array.isArray(headerRow)) {
    headerRow.forEach((header, index) => {
      if (header) headerMap[header.toString()] = index;
    });
  }

  const rowsToInsert = [];
  for (let i = 2; i <= worksheet.rowCount; i++) {
    const row = worksheet.getRow(i);
    const rowData = {};
    Object.keys(headerMap).forEach((header) => {
      rowData[header] = row.getCell(headerMap[header]).value;
    });
    rowsToInsert.push(rowData);
  }

  // Step 2: Define the synchronous database transaction function.
  const importTransaction = db.transaction((parsedRows) => {
    const program = db
      .prepare('SELECT * FROM programs WHERE "userId" = ? AND id = ?')
      .get(user.adminId, programId);
    if (!program) throw new Error("Program not found.");
    program.packages = JSON.parse(program.packages || "[]");
    program.cities = JSON.parse(program.cities || "[]");

    const existingBookings = db
      .prepare(
        'SELECT "passportNumber" FROM bookings WHERE "userId" = ? AND "tripId" = ?'
      )
      .all(user.adminId, programId);
    const existingPassportNumbers = new Set(
      existingBookings.map((b) => b.passportNumber)
    );

    let newBookingsCount = 0;
    const insertStmt = db.prepare(
      'INSERT INTO bookings ("userId", "employeeId", "clientNameAr", "clientNameFr", "personType", "phoneNumber", "passportNumber", "tripId", "packageId", "selectedHotel", "sellingPrice", "basePrice", profit, "advancePayments", "remainingBalance", "isFullyPaid") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );

    for (const rowData of parsedRows) {
      const passportNumber = rowData["Passport Number"];
      if (!passportNumber || existingPassportNumbers.has(passportNumber))
        continue;

      const selectedHotel = { cities: [], hotelNames: [], roomTypes: [] };
      (program.cities || []).forEach((city) => {
        const hotelName = rowData[`${city.name} Hotel`];
        const roomType = rowData[`${city.name} Room Type`];
        if (hotelName && roomType) {
          selectedHotel.cities.push(city.name);
          selectedHotel.hotelNames.push(hotelName);
          selectedHotel.roomTypes.push(roomType);
        }
      });

      const basePrice = calculateBasePrice(
        db,
        user.adminId,
        programId,
        rowData["Package"],
        selectedHotel,
        rowData["Person Type"] || "adult"
      );
      const sellingPrice = Number(rowData["Selling Price"]) || 0;
      const profit = sellingPrice - basePrice;

      insertStmt.run(
        user.adminId,
        null,
        rowData["Client Name (Arabic)"],
        rowData["Client Name (French)"],
        rowData["Person Type"] || "adult",
        rowData["Phone Number"] || "",
        passportNumber,
        programId,
        rowData["Package"],
        JSON.stringify(selectedHotel),
        sellingPrice,
        basePrice,
        profit,
        "[]",
        sellingPrice,
        sellingPrice <= 0 ? 1 : 0
      );

      newBookingsCount++;
      existingPassportNumbers.add(passportNumber);
    }

    if (newBookingsCount > 0) {
      db.prepare(
        'UPDATE programs SET "totalBookings" = "totalBookings" + ? WHERE id = ?'
      ).run(newBookingsCount, programId);
    }

    return {
      message: `Import complete. ${newBookingsCount} new bookings added.`,
    };
  });

  // Step 3: Execute the transaction with the data parsed from the Excel file.
  return importTransaction(rowsToInsert);
};
