// backend/controllers/factureController.js

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

const getFactures = async (req, res) => {
  try {
    const { adminId } = req.user;
    const page = parseInt(req.query.page || "1", 10);
    const limit = parseInt(req.query.limit || "10", 10);
    const offset = (page - 1) * limit;

    const facturesPromise = dbAll(
      req.db,
      'SELECT * FROM factures WHERE "userId" = ? ORDER BY "createdAt" DESC LIMIT ? OFFSET ?',
      [adminId, limit, offset]
    );

    const totalCountPromise = dbGet(
      req.db,
      'SELECT COUNT(*) as totalCount FROM factures WHERE "userId" = ?',
      [adminId]
    );

    const [factures, totalCountResult] = await Promise.all([
      facturesPromise,
      totalCountPromise,
    ]);

    const totalCount = totalCountResult.totalCount;

    res.json({
      data: factures.map((f) => ({
        ...f,
        items: JSON.parse(f.items || "[]"),
      })),
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Get Factures Error:", error);
    res.status(500).json({ message: "Failed to retrieve factures." });
  }
};

const createFacture = async (req, res) => {
  const db = req.db;
  db.serialize(async () => {
    try {
      await dbRun(db, "BEGIN TRANSACTION");

      const { adminId, id: employeeId, role } = req.user;
      const {
        clientName,
        clientAddress,
        date,
        items,
        type,
        prixTotalHorsFrais,
        totalFraisServiceHT,
        tva,
        total,
        notes,
      } = req.body;

      const lastFactureRes = await dbGet(
        db,
        `SELECT facture_number FROM factures WHERE "userId" = ? AND facture_number IS NOT NULL ORDER BY CAST(facture_number AS INTEGER) DESC LIMIT 1`,
        [adminId]
      );

      let nextFactureNumber = 1;
      if (lastFactureRes && lastFactureRes.facture_number) {
        nextFactureNumber = parseInt(lastFactureRes.facture_number, 10) + 1;
      }

      const formattedFactureNumber = nextFactureNumber
        .toString()
        .padStart(5, "0");

      const sql = `INSERT INTO factures ("userId", "employeeId", "clientName", "clientAddress", date, items, type, "prixTotalHorsFrais", "totalFraisServiceHT", tva, total, notes, facture_number)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      const result = await dbRun(db, sql, [
        adminId,
        role === "admin" ? null : employeeId,
        clientName,
        clientAddress,
        date,
        JSON.stringify(items),
        type,
        prixTotalHorsFrais,
        totalFraisServiceHT,
        tva,
        total,
        notes,
        formattedFactureNumber,
      ]);

      const newFacture = await dbGet(
        db,
        "SELECT * FROM factures WHERE id = ?",
        [result.lastID]
      );

      await dbRun(db, "COMMIT");
      res.status(201).json({
        ...newFacture,
        items: JSON.parse(newFacture.items || "[]"),
      });
    } catch (error) {
      await dbRun(db, "ROLLBACK");
      console.error("Create Facture Error:", error);
      if (error.code === "SQLITE_CONSTRAINT") {
        return res.status(409).json({
          message:
            "A facture with this number already exists. Please try again.",
        });
      }
      res.status(400).json({ message: "Failed to create facture." });
    }
  });
};

const updateFacture = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminId } = req.user;
    const {
      clientName,
      clientAddress,
      date,
      items,
      type,
      prixTotalHorsFrais,
      totalFraisServiceHT,
      tva,
      total,
      notes,
    } = req.body;

    const sql = `UPDATE factures SET "clientName" = ?, "clientAddress" = ?, date = ?, items = ?, type = ?, "prixTotalHorsFrais" = ?, "totalFraisServiceHT" = ?, tva = ?, total = ?, notes = ?, "updatedAt" = CURRENT_TIMESTAMP
       WHERE id = ? AND "userId" = ?`;

    const result = await dbRun(req.db, sql, [
      clientName,
      clientAddress,
      date,
      JSON.stringify(items),
      type,
      prixTotalHorsFrais,
      totalFraisServiceHT,
      tva,
      total,
      notes,
      id,
      adminId,
    ]);

    if (result.changes === 0) {
      return res
        .status(404)
        .json({ message: "Facture not found or not authorized." });
    }

    const updatedFacture = await dbGet(
      req.db,
      "SELECT * FROM factures WHERE id = ?",
      [id]
    );
    res.json({
      ...updatedFacture,
      items: JSON.parse(updatedFacture.items || "[]"),
    });
  } catch (error) {
    console.error("Update Facture Error:", error);
    res.status(400).json({ message: "Failed to update facture." });
  }
};

const deleteFacture = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminId } = req.user;

    const result = await dbRun(
      req.db,
      'DELETE FROM factures WHERE id = ? AND "userId" = ?',
      [id, adminId]
    );

    if (result.changes === 0) {
      return res
        .status(404)
        .json({ message: "Facture not found or not authorized." });
    }
    res.status(204).send();
  } catch (error) {
    console.error("Delete Facture Error:", error);
    res.status(500).json({ message: "Failed to delete facture." });
  }
};

module.exports = {
  getFactures,
  createFacture,
  updateFacture,
  deleteFacture,
};
