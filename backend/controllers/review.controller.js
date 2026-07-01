const pool = require("../config/database");
const { formatReview } = require("../utils/formatters");

async function listHotelReviews(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT
         rv.id,
         rv.user_id,
         rv.hotel_id,
         rv.booking_id,
         rv.description,
         rv.point,
         rv.reply,
         rv.created_at,
         u.full_name AS user_name
       FROM review rv
       LEFT JOIN users u ON u.id = rv.user_id
       WHERE rv.hotel_id = $1
       ORDER BY rv.created_at DESC
       LIMIT 50`,
      [req.params.hotelId],
    );

    return res.json({
      reviews: result.rows.map(formatReview),
      total: result.rowCount,
    });
  } catch (error) {
    return next(error);
  }
}

async function createReview(req, res, next) {
  const { hotelId, bookingId, description, point } = req.body;
  const rating = Number(point);

  if (!hotelId || !rating || rating < 1 || rating > 5) {
    return res.status(400).json({
      message: "hotelId và điểm đánh giá từ 1 đến 5 là bắt buộc.",
    });
  }

  try {
    const result = await pool.query(
      `INSERT INTO review (user_id, hotel_id, booking_id, description, point)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, user_id, hotel_id, booking_id, description, point, reply, created_at`,
      [
        req.auth.sub,
        hotelId,
        bookingId || null,
        description?.trim() || null,
        rating,
      ],
    );

    return res.status(201).json({
      message: "Đã gửi đánh giá.",
      review: formatReview(result.rows[0]),
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createReview,
  listHotelReviews,
};
