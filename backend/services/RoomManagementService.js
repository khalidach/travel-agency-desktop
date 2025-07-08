// backend/services/RoomManagementService.js

// --- Database Helper Functions ---
const dbGet = (db, sql, params = []) => new Promise((resolve, reject) => { db.get(sql, params, (err, row) => err ? reject(err) : resolve(row)); });
const dbAll = (db, sql, params = []) => new Promise((resolve, reject) => { db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows)); });
const dbRun = (db, sql, params = []) => new Promise((resolve, reject) => { db.run(sql, params, function(err) { err ? reject(err) : resolve(this); }); });

const initializeRooms = async (db, userId, programId, hotelName) => {
  // For the desktop version, we will not create default rooms.
  // The user will add them manually.
  return [];
};

exports.getRooms = async (db, userId, programId, hotelName) => {
  const result = await dbGet(
    db,
    'SELECT rooms FROM room_managements WHERE "userId" = ? AND "programId" = ? AND "hotelName" = ?',
    [userId, programId, hotelName]
  );

  if (result && result.rooms) {
    return JSON.parse(result.rooms);
  } else {
    return initializeRooms(db, userId, programId, hotelName);
  }
};

exports.saveRooms = async (db, userId, programId, hotelName, rooms) => {
    const sql = `
        INSERT INTO room_managements ("userId", "programId", "hotelName", rooms)
        VALUES (?, ?, ?, ?)
        ON CONFLICT("userId", "programId", "hotelName") 
        DO UPDATE SET rooms = excluded.rooms, "updatedAt" = CURRENT_TIMESTAMP
    `;
    await dbRun(db, sql, [userId, programId, hotelName, JSON.stringify(rooms)]);
    
    // Return the saved rooms after parsing
    const savedData = await dbGet(db, 'SELECT rooms FROM room_managements WHERE "userId" = ? AND "programId" = ? AND "hotelName" = ?', [userId, programId, hotelName]);
    return JSON.parse(savedData.rooms);
};

exports.searchUnassignedOccupants = async (db, userId, programId, hotelName, searchTerm) => {
    // 1. Get all occupant IDs already assigned to any room in this hotel for this program.
    const assignedResult = await dbGet(db, `SELECT rooms FROM room_managements WHERE "userId" = ? AND "programId" = ? AND "hotelName" = ?`, [userId, programId, hotelName]);
    
    const assignedIds = new Set();
    if (assignedResult && assignedResult.rooms) {
        const rooms = JSON.parse(assignedResult.rooms);
        rooms.forEach(room => {
            room.occupants.forEach(occ => {
                if (occ && occ.id) assignedIds.add(occ.id);
            });
        });
    }

    // 2. Search for bookings in this program that are NOT in the assigned list.
    let query = `SELECT id, "clientNameFr" as "clientName" FROM bookings WHERE "userId" = ? AND "tripId" = ?`;
    const params = [userId, programId];
    
    if (assignedIds.size > 0) {
        // Create placeholders for the IN clause
        const placeholders = Array.from(assignedIds).map(() => '?').join(',');
        query += ` AND id NOT IN (${placeholders})`;
        params.push(...Array.from(assignedIds));
    }

    if (searchTerm) {
        query += ` AND "clientNameFr" LIKE ?`;
        params.push(`%${searchTerm}%`);
    }

    query += ` LIMIT 20`;

    return dbAll(db, query, params);
};
