const pool = require("../config/database");
const { formatPromotion } = require("../utils/formatters");

async function listPromotions(req, res, next) {
  const hotelId = req.query.hotelId || null;

  try {
    const params = [];
    const where = [
      "p.is_active = true",
      "(p.start_date IS NULL OR p.start_date <= NOW())",
      "(p.end_date IS NULL OR p.end_date >= NOW())",
    ];

    if (hotelId) {
      params.push(hotelId);
      where.push(`(p.hotel_id IS NULL OR p.hotel_id = $${params.length})`);
    }

    const result = await pool.query(
      `SELECT
         p.id,
         p.hotel_id,
         h.name AS hotel_name,
         p.code,
         p.type,
         p.value,
         p.max_discount,
         p.min_order_value,
         p.start_date,
         p.end_date,
         p.usage_limit,
         p.is_active
       FROM promotion p
       LEFT JOIN hotel h ON h.id = p.hotel_id
       WHERE ${where.join(" AND ")}
       ORDER BY p.created_at DESC
       LIMIT 50`,
      params,
    );

    return res.json({
      promotions: result.rows.map(formatPromotion),
      total: result.rowCount,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listPromotions,
};
