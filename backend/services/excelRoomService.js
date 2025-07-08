// backend/services/excelRoomService.js
const excel = require("exceljs");

/**
 * Generates an Excel workbook for rooming lists, with each hotel on a separate sheet.
 * @param {object} program - The program data.
 * @param {Array<object>} roomData - An array of room management objects for all hotels in the program.
 * @returns {Promise<object>} A promise that resolves to an exceljs Workbook object.
 */
exports.generateRoomingListExcel = async (program, roomData) => {
  const workbook = new excel.Workbook();

  const hotelDataMap = new Map();
  roomData.forEach((data) => {
    if (data.rooms && data.rooms.length > 0) {
      hotelDataMap.set(data.hotelName, data.rooms);
    }
  });

  for (const [hotelName, rooms] of hotelDataMap.entries()) {
    const sheetName = hotelName.replace(/[\/\\?*[\]]/g, "").substring(0, 31);
    const worksheet = workbook.addWorksheet(sheetName, {
      views: [{ rightToLeft: true }],
    });

    const roomsByType = rooms.reduce((acc, room) => {
      const type = room.type || "Uncategorized";
      acc[type] = acc[type] || [];
      acc[type].push(room);
      return acc;
    }, {});

    const roomTypes = Object.keys(roomsByType);
    let currentCol = 1;

    // Main header for the hotel
    if (roomTypes.length > 0) {
      worksheet.mergeCells(1, 1, 1, roomTypes.length * 2);
      const hotelHeaderCell = worksheet.getCell(1, 1);
      hotelHeaderCell.value = hotelName;
      hotelHeaderCell.font = {
        bold: true,
        size: 18,
        color: { argb: "FFFFFFFF" },
      };
      hotelHeaderCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF007BFF" },
      }; // Blue
      hotelHeaderCell.alignment = { vertical: "middle", horizontal: "center" };
    }

    // Process each room type as a separate vertical block
    for (const type of roomTypes) {
      const roomsForType = roomsByType[type];

      // Type Header
      const typeHeaderCell = worksheet.getCell(2, currentCol);
      typeHeaderCell.value = type;
      typeHeaderCell.font = { bold: true, size: 14 };
      typeHeaderCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFFFF00" },
      }; // Yellow
      typeHeaderCell.alignment = { vertical: "middle", horizontal: "center" };
      worksheet.mergeCells(2, currentCol, 2, currentCol + 1);

      // Sub-headers
      worksheet.getCell(3, currentCol).value = "الغرفة";
      worksheet.getCell(3, currentCol + 1).value = "الساكن";

      [
        worksheet.getCell(3, currentCol),
        worksheet.getCell(3, currentCol + 1),
      ].forEach((cell) => {
        cell.font = { bold: true, size: 12 };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFD3D3D3" },
        }; // Light Gray
        cell.alignment = { vertical: "middle", horizontal: "center" };
      });

      let currentRow = 4;
      for (const room of roomsForType) {
        const startRow = currentRow;
        const occupants = room.occupants.filter((o) => o); // Filter out null/empty occupants
        const numOccupants = occupants.length;
        const numRowsForRoom = Math.max(1, numOccupants);

        // Write room name and merge cells
        const roomNameCell = worksheet.getCell(startRow, currentCol);
        roomNameCell.value = room.name;
        if (numRowsForRoom > 1) {
          worksheet.mergeCells(
            startRow,
            currentCol,
            startRow + numRowsForRoom - 1,
            currentCol
          );
        }
        roomNameCell.alignment = { vertical: "middle", horizontal: "center" };

        // Write occupants
        occupants.forEach((occupant, index) => {
          worksheet.getCell(startRow + index, currentCol + 1).value =
            occupant.clientName;
        });

        currentRow += numRowsForRoom;
      }
      currentCol += 2; // Move to the next block for the next type
    }

    // Apply borders to all cells with content
    worksheet.eachRow({ includeEmpty: true }, (row) => {
      row.eachCell({ includeEmpty: true }, (cell) => {
        if (cell.value) {
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
        }
      });
    });

    // Auto-fit columns based on content
    worksheet.columns.forEach((column) => {
      let maxColumnLength = 0;
      column.eachCell({ includeEmpty: true }, (cell) => {
        const cellLength = cell.value ? cell.value.toString().length : 0;
        if (cellLength > maxColumnLength) {
          maxColumnLength = cellLength;
        }
      });
      column.width = maxColumnLength < 10 ? 10 : maxColumnLength + 2;
    });
  }

  return workbook;
};
