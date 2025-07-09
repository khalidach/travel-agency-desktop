// backend/controllers/roomManagementController.js
const RoomManagementService = require("../services/RoomManagementService");
const ExcelRoomService = require("../services/excelRoomService.js");

exports.getRoomsByProgramAndHotel = (req, res) => {
  try {
    const { programId, hotelName } = req.params;
    const { adminId } = req.user;
    const rooms = RoomManagementService.getRooms(
      req.db,
      adminId,
      programId,
      hotelName
    );
    res.json(rooms);
  } catch (error) {
    console.error("Get Rooms Error:", error);
    res.status(500).json({ message: error.message });
  }
};

exports.saveRooms = (req, res) => {
  try {
    const { programId, hotelName } = req.params;
    const rooms = req.body.rooms;
    const { adminId } = req.user;

    const savedRooms = RoomManagementService.saveRooms(
      req.db,
      adminId,
      programId,
      hotelName,
      rooms
    );
    res.status(200).json(savedRooms);
  } catch (error) {
    console.error("Save Rooms Error:", error);
    res.status(400).json({ message: error.message });
  }
};

exports.searchUnassignedOccupants = (req, res) => {
  try {
    const { programId, hotelName } = req.params;
    const { searchTerm = "" } = req.query;
    const { adminId } = req.user;
    const occupants = RoomManagementService.searchUnassignedOccupants(
      req.db,
      adminId,
      programId,
      hotelName,
      searchTerm
    );
    res.json(occupants);
  } catch (error) {
    console.error("Search Unassigned Occupants Error:", error);
    res.status(500).json({ message: error.message });
  }
};

exports.exportRoomsToExcel = async (req, res) => {
  try {
    const { programId } = req.params;
    const { adminId } = req.user;

    const program = req.db
      .prepare('SELECT * FROM programs WHERE id = ? AND "userId" = ?')
      .get(programId, adminId);
    if (!program)
      return res.status(404).json({ message: "Program not found." });

    const roomData = req.db
      .prepare(
        'SELECT * FROM room_managements WHERE "programId" = ? AND "userId" = ?'
      )
      .all(programId, adminId);

    const parsedRoomData = roomData.map((rd) => ({
      ...rd,
      rooms: JSON.parse(rd.rooms || "[]"),
    }));

    if (parsedRoomData.length === 0) {
      return res
        .status(404)
        .json({ message: "No room data found for this program to export." });
    }

    const workbook = await ExcelRoomService.generateRoomingListExcel(
      program,
      parsedRoomData
    );

    const fileName = `${(program.name || "Rooming_List").replace(
      /[\s\W]/g,
      "_"
    )}.xlsx`;
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);

    const buffer = await workbook.xlsx.writeBuffer();
    res.send(buffer);
  } catch (error) {
    console.error("Failed to export rooming list to Excel:", error);
    if (!res.headersSent) {
      res.status(500).json({ message: "Failed to export rooming list." });
    }
  }
};
