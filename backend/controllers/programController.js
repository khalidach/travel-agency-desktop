// backend/controllers/programController.js

// Helper to run a query and get all results
const dbAll = (db, sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

// Helper to get a single row
const dbGet = (db, sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

// Helper to run a single command
const dbRun = (db, sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

exports.getAllPrograms = async (req, res) => {
  try {
    const { adminId } = req.user;
    const {
      searchTerm,
      filterType,
      page = 1,
      noPaginate = "false",
    } = req.query;
    let { limit = 10 } = req.query;

    let whereConditions = ['p."userId" = ?'];
    const queryParams = [adminId];

    if (searchTerm) {
      whereConditions.push(`p.name LIKE ?`);
      queryParams.push(`%${searchTerm}%`);
    }

    if (filterType && filterType !== "all") {
      whereConditions.push(`p.type = ?`);
      queryParams.push(filterType);
    }

    const whereClause = `WHERE ${whereConditions.join(" AND ")}`;

    if (noPaginate === "true") {
      const allPrograms = await dbAll(
        req.db,
        `SELECT * FROM programs p ${whereClause} ORDER BY p."createdAt" DESC`,
        queryParams
      );
      return res.json({ data: allPrograms });
    }

    const countQuery = `SELECT COUNT(*) as totalCount FROM programs p ${whereClause}`;
    const countResult = await dbGet(req.db, countQuery, queryParams);
    const totalCount = countResult.totalCount;

    const offset = (page - 1) * limit;
    const programsQuery = `SELECT * FROM programs p ${whereClause} ORDER BY p."createdAt" DESC LIMIT ? OFFSET ?`;
    const programs = await dbAll(req.db, programsQuery, [
      ...queryParams,
      limit,
      offset,
    ]);

    for (const program of programs) {
      program.pricing = await dbGet(
        req.db,
        `SELECT * FROM program_pricing WHERE "programId" = ?`,
        [program.id]
      );

      // Parse the program's own JSON columns
      program.cities = JSON.parse(program.cities || "[]");
      program.packages = JSON.parse(program.packages || "[]");

      // **FIX**: If pricing exists, parse its internal JSON columns as well
      if (program.pricing) {
        program.pricing.allHotels = JSON.parse(
          program.pricing.allHotels || "[]"
        );
        program.pricing.personTypes = JSON.parse(
          program.pricing.personTypes || "[]"
        );
      }
    }

    res.json({
      data: programs,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Get All Programs Error:", error);
    res.status(500).json({ message: error.message });
  }
};

exports.getProgramById = async (req, res) => {
  const { id } = req.params;
  const { adminId } = req.user;
  try {
    const program = await dbGet(
      req.db,
      'SELECT * FROM programs WHERE id = ? AND "userId" = ?',
      [id, adminId]
    );

    if (!program) {
      return res
        .status(404)
        .json({ message: "Program not found or you are not authorized" });
    }

    program.cities = JSON.parse(program.cities || "[]");
    program.packages = JSON.parse(program.packages || "[]");

    res.json(program);
  } catch (error) {
    console.error("Get Program by ID Error:", error);
    res.status(500).json({ message: error.message });
  }
};

exports.createProgram = async (req, res) => {
  const { name, type, duration, cities, packages } = req.body;
  const userId = req.user.adminId;
  const employeeId = null;

  try {
    const sql =
      'INSERT INTO programs ("userId", "employeeId", name, type, duration, cities, packages, "totalBookings") VALUES (?, ?, ?, ?, ?, ?, ?, 0)';
    const result = await dbRun(req.db, sql, [
      userId,
      employeeId,
      name,
      type,
      duration,
      JSON.stringify(cities),
      JSON.stringify(packages),
    ]);

    const newProgram = await dbGet(
      req.db,
      "SELECT * FROM programs WHERE id = ?",
      [result.lastID]
    );
    res.status(201).json(newProgram);
  } catch (error) {
    console.error("Create Program Error:", error);
    res.status(400).json({ message: error.message });
  }
};

exports.updateProgram = async (req, res) => {
  const { id } = req.params;
  const { name, type, duration, cities, packages } = req.body;

  try {
    const program = await dbGet(
      req.db,
      'SELECT * FROM programs WHERE id = ? AND "userId" = ?',
      [id, req.user.adminId]
    );

    if (!program) {
      return res.status(404).json({
        message: "Program not found or you are not authorized to access it.",
      });
    }

    const sql =
      'UPDATE programs SET name = ?, type = ?, duration = ?, cities = ?, packages = ?, "updatedAt" = CURRENT_TIMESTAMP WHERE id = ?';
    await dbRun(req.db, sql, [
      name,
      type,
      duration,
      JSON.stringify(cities),
      JSON.stringify(packages),
      id,
    ]);

    const updatedProgram = await dbGet(
      req.db,
      "SELECT * FROM programs WHERE id = ?",
      [id]
    );
    res.json(updatedProgram);
  } catch (error) {
    console.error("Update Program Error:", error);
    res.status(400).json({ message: error.message });
  }
};

exports.deleteProgram = async (req, res) => {
  const { id } = req.params;
  const db = req.db;

  try {
    db.serialize(async () => {
      try {
        await dbRun(db, "BEGIN TRANSACTION");

        const program = await dbGet(
          db,
          'SELECT * FROM programs WHERE id = ? AND "userId" = ?',
          [id, req.user.adminId]
        );
        if (!program) {
          await dbRun(db, "ROLLBACK");
          return res.status(404).json({
            message:
              "Program not found or you are not authorized to access it.",
          });
        }

        await dbRun(db, 'DELETE FROM program_pricing WHERE "programId" = ?', [
          id,
        ]);
        await dbRun(db, 'DELETE FROM bookings WHERE "tripId" = ?', [id]);
        await dbRun(db, "DELETE FROM programs WHERE id = ?", [id]);

        await dbRun(db, "COMMIT");
        res.json({
          message: "Program and all associated data deleted successfully",
        });
      } catch (err) {
        await dbRun(db, "ROLLBACK");
        console.error("Delete Program Error:", err);
        res.status(500).json({ message: err.message });
      }
    });
  } catch (error) {
    console.error("Outer Delete Program Error:", error);
    res.status(500).json({ message: error.message });
  }
};
