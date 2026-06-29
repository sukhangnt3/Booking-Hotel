const pool = require("../config/database");
const { formatHotel } = require("../utils/formatters");

async function listHotels(req, res, next) {
  const destination = (req.query.destination || req.query.city || req.query.q || "")
    .toString()
    .trim();

  try {
    const params = [];
    const where = [
      "h.deleted_at IS NULL",
      "h.status = 'approved'",
    ];

    if (destination) {
      params.push(`%${destination}%`);
      where.push(`(
        h.name ILIKE $${params.length}
        OR h.city ILIKE $${params.length}
        OR h.address ILIKE $${params.length}
      )`);
    }

    const result = await pool.query(
      `SELECT
         h.id,
         h.name,
         h.address,
         h.city,
         h.description,
         h.star_rating,
         h.average_rating,
         h.review_count,
         h.phone,
         h.email,
         thumb.path AS thumbnail,
         MIN(r.base_price) AS min_price
       FROM hotel h
       LEFT JOIN image thumb
         ON thumb.hotel_id = h.id
        AND thumb.is_thumbnail = true
       LEFT JOIN room r
         ON r.hotel_id = h.id
        AND r.is_active = true
        AND r.deleted_at IS NULL
       WHERE ${where.join(" AND ")}
       GROUP BY h.id, thumb.path
       ORDER BY h.average_rating DESC, h.created_at DESC
       LIMIT 30`,
      params,
    );

    return res.json({
      hotels: result.rows.map(formatHotel),
      total: result.rowCount,
      destination,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listHotels,
};
