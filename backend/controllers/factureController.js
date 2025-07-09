// backend/controllers/factureController.js

const getFactures = (req, res) => {
  try {
    const { adminId } = req.user;
    const page = parseInt(req.query.page || "1", 10);
    const limit = parseInt(req.query.limit || "10", 10);
    const offset = (page - 1) * limit;

    const facturesStmt = req.db.prepare(
      'SELECT * FROM factures WHERE "userId" = ? ORDER BY "createdAt" DESC LIMIT ? OFFSET ?'
    );
    const factures = facturesStmt.all(adminId, limit, offset);

    const totalCountResult = req.db
      .prepare('SELECT COUNT(*) as totalCount FROM factures WHERE "userId" = ?')
      .get(adminId);
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

const createFacture = (req, res) => {
  const db = req.db;
  const createTransaction = db.transaction(() => {
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

    const lastFactureRes = db
      .prepare(
        `SELECT facture_number FROM factures WHERE "userId" = ? AND facture_number IS NOT NULL ORDER BY CAST(facture_number AS INTEGER) DESC LIMIT 1`
      )
      .get(adminId);

    let nextFactureNumber = 1;
    if (lastFactureRes && lastFactureRes.facture_number) {
      nextFactureNumber = parseInt(lastFactureRes.facture_number, 10) + 1;
    }
    const formattedFactureNumber = nextFactureNumber
      .toString()
      .padStart(5, "0");

    const sql = `INSERT INTO factures ("userId", "employeeId", "clientName", "clientAddress", date, items, type, "prixTotalHorsFrais", "totalFraisServiceHT", tva, total, notes, facture_number)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const result = db
      .prepare(sql)
      .run(
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
        formattedFactureNumber
      );

    const newFacture = db
      .prepare("SELECT * FROM factures WHERE id = ?")
      .get(result.lastInsertRowid);
    return newFacture;
  });

  try {
    const newFacture = createTransaction();
    res.status(201).json({
      ...newFacture,
      items: JSON.parse(newFacture.items || "[]"),
    });
  } catch (error) {
    console.error("Create Facture Error:", error);
    if (error.code === "SQLITE_CONSTRAINT") {
      return res.status(409).json({
        message: "A facture with this number already exists. Please try again.",
      });
    }
    res.status(400).json({ message: "Failed to create facture." });
  }
};

const updateFacture = (req, res) => {
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

    const result = req.db
      .prepare(sql)
      .run(
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
        adminId
      );

    if (result.changes === 0) {
      return res
        .status(404)
        .json({ message: "Facture not found or not authorized." });
    }

    const updatedFacture = req.db
      .prepare("SELECT * FROM factures WHERE id = ?")
      .get(id);
    res.json({
      ...updatedFacture,
      items: JSON.parse(updatedFacture.items || "[]"),
    });
  } catch (error) {
    console.error("Update Facture Error:", error);
    res.status(400).json({ message: "Failed to update facture." });
  }
};

const deleteFacture = (req, res) => {
  try {
    const { id } = req.params;
    const { adminId } = req.user;

    const result = req.db
      .prepare('DELETE FROM factures WHERE id = ? AND "userId" = ?')
      .run(id, adminId);

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
