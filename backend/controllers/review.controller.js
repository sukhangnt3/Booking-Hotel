const pool = require("../config/database");
const { formatReview } = require("../utils/formatters");

async function listHotelReviews(req, res, next) {
  try {
    const hotelId = req.params.hotelId || req.params.id;

    if (!hotelId) {
      return res.status(400).json({ message: "hotelId là bắt buộc." });
    }

    const query = `
      SELECT
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
      LIMIT 50
    `;

    const result = await pool.query(query, [hotelId]);

    const formattedReviews = result.rows.map((row) =>
      typeof formatReview === "function" ? formatReview(row) : row
    );

    return res.json({
      reviews: formattedReviews,
      data: formattedReviews,
      total: result.rowCount,
    });
  } catch (error) {
    console.error("Lỗi tại listHotelReviews:", error);
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
    const query = `
      INSERT INTO review (user_id, hotel_id, booking_id, description, point)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, user_id, hotel_id, booking_id, description, point, reply, created_at
    `;

    const result = await pool.query(query, [
      req.auth?.sub || null,
      hotelId,
      bookingId || null,
      description?.trim() || null,
      rating,
    ]);

    const createdReview =
      typeof formatReview === "function"
        ? formatReview(result.rows[0])
        : result.rows[0];

    return res.status(201).json({
      message: "Đã gửi đánh giá.",
      review: createdReview,
      data: createdReview,
    });
  } catch (error) {
    console.error("Lỗi tại createReview:", error);
    return next(error);
  }
}

module.exports = {
  createReview,
  listHotelReviews,
};