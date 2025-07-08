// backend/controllers/factureController.js
const getFactures = async (req, res) => {
  try {
    const { adminId } = req.user;
    const page = parseInt(req.query.page || "1", 10);
    const limit = parseInt(req.query.limit || "10", 10);
    const offset = (page - 1) * limit;

    const facturesPromise = req.db.query(
      'SELECT * FROM factures WHERE "userId" = $1 ORDER BY "createdAt" DESC LIMIT $2 OFFSET $3',
      [adminId, limit, offset]
    );

    const totalCountPromise = req.db.query(
      'SELECT COUNT(*) FROM factures WHERE "userId" = $1',
      [adminId]
    );

    const [facturesResult, totalCountResult] = await Promise.all([
      facturesPromise,
      totalCountPromise,
    ]);

    const totalCount = parseInt(totalCountResult.rows[0].count, 10);

    res.json({
      data: facturesResult.rows,
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
  const client = await req.db.connect();
  try {
    await client.query("BEGIN");

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

    const lastFactureRes = await client.query(
      `SELECT facture_number FROM factures WHERE "userId" = $1 AND facture_number IS NOT NULL ORDER BY CAST(facture_number AS INTEGER) DESC LIMIT 1`,
      [adminId]
    );

    let nextFactureNumber = 1;
    if (lastFactureRes.rows.length > 0) {
      nextFactureNumber =
        parseInt(lastFactureRes.rows[0].facture_number, 10) + 1;
    }

    const formattedFactureNumber = nextFactureNumber
      .toString()
      .padStart(5, "0");

    const { rows } = await client.query(
      `INSERT INTO factures ("userId", "employeeId", "clientName", "clientAddress", date, items, type, "prixTotalHorsFrais", "totalFraisServiceHT", tva, total, notes, facture_number)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
      [
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
      ]
    );
    await client.query("COMMIT");
    res.status(201).json(rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Create Facture Error:", error);
    if (
      error.code === "23505" &&
      error.constraint === "unique_facture_number_per_user"
    ) {
      return res.status(409).json({
        message: "A facture with this number already exists. Please try again.",
      });
    }
    res.status(400).json({ message: "Failed to create facture." });
  } finally {
    client.release();
  }
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

    const { rows } = await req.db.query(
      `UPDATE factures SET "clientName" = $1, "clientAddress" = $2, date = $3, items = $4, type = $5, "prixTotalHorsFrais" = $6, "totalFraisServiceHT" = $7, tva = $8, total = $9, notes = $10, "updatedAt" = NOW()
       WHERE id = $11 AND "userId" = $12 RETURNING *`,
      [
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
      ]
    );

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ message: "Facture not found or not authorized." });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error("Update Facture Error:", error);
    res.status(400).json({ message: "Failed to update facture." });
  }
};

const deleteFacture = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminId } = req.user;

    const { rowCount } = await req.db.query(
      'DELETE FROM factures WHERE id = $1 AND "userId" = $2',
      [id, adminId]
    );

    if (rowCount === 0) {
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
