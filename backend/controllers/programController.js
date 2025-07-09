// backend/controllers/programController.js

exports.getAllPrograms = (req, res) => {
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
      const allPrograms = req.db
        .prepare(
          `SELECT * FROM programs p ${whereClause} ORDER BY p."createdAt" DESC`
        )
        .all(...queryParams);
      return res.json({ data: allPrograms });
    }

    const countQuery = `SELECT COUNT(*) as totalCount FROM programs p ${whereClause}`;
    const countResult = req.db.prepare(countQuery).get(...queryParams);
    const totalCount = countResult.totalCount;

    const offset = (page - 1) * limit;
    const programsQuery = `SELECT * FROM programs p ${whereClause} ORDER BY p."createdAt" DESC LIMIT ? OFFSET ?`;
    const programs = req.db
      .prepare(programsQuery)
      .all(...queryParams, limit, offset);

    for (const program of programs) {
      program.pricing = req.db
        .prepare(`SELECT * FROM program_pricing WHERE "programId" = ?`)
        .get(program.id);

      program.cities = JSON.parse(program.cities || "[]");
      program.packages = JSON.parse(program.packages || "[]");

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

exports.getProgramById = (req, res) => {
  const { id } = req.params;
  const { adminId } = req.user;
  try {
    const program = req.db
      .prepare('SELECT * FROM programs WHERE id = ? AND "userId" = ?')
      .get(id, adminId);

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

exports.createProgram = (req, res) => {
  const { name, type, duration, cities, packages } = req.body;
  const userId = req.user.adminId;
  const employeeId = null;

  try {
    const sql =
      'INSERT INTO programs ("userId", "employeeId", name, type, duration, cities, packages, "totalBookings") VALUES (?, ?, ?, ?, ?, ?, ?, 0)';
    const result = req.db
      .prepare(sql)
      .run(
        userId,
        employeeId,
        name,
        type,
        duration,
        JSON.stringify(cities),
        JSON.stringify(packages)
      );

    const newProgram = req.db
      .prepare("SELECT * FROM programs WHERE id = ?")
      .get(result.lastInsertRowid);
    res.status(201).json(newProgram);
  } catch (error) {
    console.error("Create Program Error:", error);
    res.status(400).json({ message: error.message });
  }
};

exports.updateProgram = (req, res) => {
  const { id } = req.params;
  const { name, type, duration, cities, packages } = req.body;

  try {
    const program = req.db
      .prepare('SELECT * FROM programs WHERE id = ? AND "userId" = ?')
      .get(id, req.user.adminId);

    if (!program) {
      return res.status(404).json({
        message: "Program not found or you are not authorized to access it.",
      });
    }

    const sql =
      'UPDATE programs SET name = ?, type = ?, duration = ?, cities = ?, packages = ?, "updatedAt" = CURRENT_TIMESTAMP WHERE id = ?';
    req.db
      .prepare(sql)
      .run(
        name,
        type,
        duration,
        JSON.stringify(cities),
        JSON.stringify(packages),
        id
      );

    const updatedProgram = req.db
      .prepare("SELECT * FROM programs WHERE id = ?")
      .get(id);
    res.json(updatedProgram);
  } catch (error) {
    console.error("Update Program Error:", error);
    res.status(400).json({ message: error.message });
  }
};

exports.deleteProgram = (req, res) => {
  const { id } = req.params;
  const db = req.db;

  const deleteTransaction = db.transaction(() => {
    const program = db
      .prepare('SELECT * FROM programs WHERE id = ? AND "userId" = ?')
      .get(id, req.user.adminId);
    if (!program) {
      throw new Error(
        "Program not found or you are not authorized to access it."
      );
    }

    db.prepare('DELETE FROM program_pricing WHERE "programId" = ?').run(id);
    db.prepare('DELETE FROM bookings WHERE "tripId" = ?').run(id);
    db.prepare("DELETE FROM programs WHERE id = ?").run(id);
  });

  try {
    deleteTransaction();
    res.json({
      message: "Program and all associated data deleted successfully",
    });
  } catch (error) {
    console.error("Delete Program Error:", error);
    if (error.message.includes("not found")) {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
};
