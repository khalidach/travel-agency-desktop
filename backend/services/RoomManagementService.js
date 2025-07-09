// backend/services/RoomManagementService.js

exports.getRooms = (db, userId, programId, hotelName) => {
  const result = db
    .prepare(
      'SELECT rooms FROM room_managements WHERE "userId" = ? AND "programId" = ? AND "hotelName" = ?'
    )
    .get(userId, programId, hotelName);

  if (result && result.rooms) {
    return JSON.parse(result.rooms);
  } else {
    return []; // Return empty array if no rooms are set
  }
};

exports.saveRooms = (db, userId, programId, hotelName, rooms) => {
  const sql = `
        INSERT INTO room_managements ("userId", "programId", "hotelName", rooms)
        VALUES (?, ?, ?, ?)
        ON CONFLICT("userId", "programId", "hotelName") 
        DO UPDATE SET rooms = excluded.rooms, "updatedAt" = CURRENT_TIMESTAMP
    `;
  db.prepare(sql).run(userId, programId, hotelName, JSON.stringify(rooms));

  const savedData = db
    .prepare(
      'SELECT rooms FROM room_managements WHERE "userId" = ? AND "programId" = ? AND "hotelName" = ?'
    )
    .get(userId, programId, hotelName);
  return JSON.parse(savedData.rooms);
};

exports.searchUnassignedOccupants = (
  db,
  userId,
  programId,
  hotelName,
  searchTerm
) => {
  const assignedResult = db
    .prepare(
      `SELECT rooms FROM room_managements WHERE "userId" = ? AND "programId" = ? AND "hotelName" = ?`
    )
    .get(userId, programId, hotelName);

  const assignedIds = new Set();
  if (assignedResult && assignedResult.rooms) {
    const rooms = JSON.parse(assignedResult.rooms);
    rooms.forEach((room) => {
      room.occupants.forEach((occ) => {
        if (occ && occ.id) assignedIds.add(occ.id);
      });
    });
  }

  let query = `SELECT id, "clientNameFr" as "clientName" FROM bookings WHERE "userId" = ? AND "tripId" = ?`;
  const params = [userId, programId];

  if (assignedIds.size > 0) {
    const placeholders = Array.from(assignedIds)
      .map(() => "?")
      .join(",");
    query += ` AND id NOT IN (${placeholders})`;
    params.push(...Array.from(assignedIds));
  }

  if (searchTerm) {
    query += ` AND "clientNameFr" LIKE ?`;
    params.push(`%${searchTerm}%`);
  }

  query += ` LIMIT 20`;

  return db.prepare(query).all(...params);
};
