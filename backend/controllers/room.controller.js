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

    return res.json({ room: formatRoom(room) });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getRoomById,
};
