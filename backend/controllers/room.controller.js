const crypto = require("crypto");
const pool = require("../config/database");
const { formatRoom } = require("../utils/formatters");

async function getRoomById(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT
         r.id,
         r.hotel_id,
         r.name,
         r.capacity,
         r.base_price,
         r.description,
         r.type,
         r.bed_type,
         r.room_area,
         r.amount,
         r.is_active,
         thumb.path AS thumbnail,
         COALESCE(array_agg(DISTINCT a.name) FILTER (WHERE a.name IS NOT NULL), '{}') AS amenities
       FROM room r
       LEFT JOIN image thumb
         ON thumb.room_id = r.id
        AND thumb.is_thumbnail = true
       LEFT JOIN room_amenity ra ON ra.room_id = r.id
       LEFT JOIN amenity a ON a.id = ra.amenity_id
       WHERE r.id = $1
        AND r.deleted_at IS NULL
       GROUP BY r.id, thumb.path`,
      [req.params.id],
    );

    const room = result.rows[0];

    if (!room) {
      return res.status(404).json({ message: "Không tìm thấy phòng." });
    }

    return res.json({ data: formatRoom(room), room: formatRoom(room) });
  } catch (error) {
    return next(error);
  }
}

async function listRoomAmenities(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT a.id, a.name
       FROM room_amenity ra
       JOIN amenity a ON a.id = ra.amenity_id
       WHERE ra.room_id = $1
       ORDER BY a.name ASC`,
      [req.params.id],
    );

    const amenities = result.rows.map((row) => ({
      id: row.id,
      name: row.name,
    }));

    return res.json({ data: amenities, amenities });
  } catch (error) {
    return next(error);
  }
}

async function updateRoomInventory(req, res, next) {
  const roomId = req.params.id;
  const inventoryDate = req.body.inventoryDate || req.body.date;
  const startDate = req.body.startDate || null;
  const endDate = req.body.endDate || null;
  const availableCount = Number(req.body.availableCount ?? req.body.available_count ?? 0);
  const soldCount = Number(req.body.soldCount ?? req.body.sold_count ?? 0);
  const lockedCount = Number(req.body.lockedCount ?? req.body.locked_count ?? 0);
  const basePrice = Number(req.body.basePrice ?? req.body.base_price ?? 0);
  const sellPrice = Number(req.body.sellPrice ?? req.body.sell_price ?? basePrice);
  const status = req.body.status || "active";

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const dates = [];
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
        dates.push(new Date(date).toISOString().slice(0, 10));
      }
    } else if (inventoryDate) {
      dates.push(inventoryDate);
    } else {
      return res.status(400).json({ message: "inventoryDate hoặc startDate/endDate là bắt buộc." });
    }

    const rows = [];
    for (const date of dates) {
      const existing = await client.query(
        `UPDATE room_inventory
         SET available_count = $1,
             sold_count = $2,
             locked_count = $3,
             base_price = $4,
             sell_price = $5,
             status = $6,
             updated_at = NOW()
         WHERE room_id = $7 AND inventory_date = $8
         RETURNING *`,
        [availableCount, soldCount, lockedCount, basePrice, sellPrice, status, roomId, date],
      );

      let row = existing.rows[0];

      if (!row) {
        const created = await client.query(
          `INSERT INTO room_inventory (
             id,
             room_id,
             inventory_date,
             available_count,
             sold_count,
             locked_count,
             base_price,
             sell_price,
             status,
             created_at,
             updated_at
           )
          VALUES ($9, $1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
           RETURNING *`,
          [roomId, date, availableCount, soldCount, lockedCount, basePrice, sellPrice, status, crypto.randomUUID()],
        );

        row = created.rows[0];
      }

      rows.push(row);
    }

    await client.query("COMMIT");

    return res.json({ data: rows, roomInventory: rows });
  } catch (error) {
    await client.query("ROLLBACK");
    return next(error);
  } finally {
    client.release();
  }
}

module.exports = {
  getRoomById,
  listRoomAmenities,
  updateRoomInventory,
};
