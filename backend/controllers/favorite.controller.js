const pool = require("../config/database");
const { formatHotel } = require("../utils/formatters");

async function listUserFavorites(req, res, next) {
  try {
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
       FROM favorites f
       JOIN hotel h ON h.id = f.hotel_id
       LEFT JOIN image thumb ON thumb.hotel_id = h.id AND thumb.is_thumbnail = true
       LEFT JOIN room r ON r.hotel_id = h.id AND r.is_active = true AND r.deleted_at IS NULL
       WHERE f.user_id = $1
       GROUP BY h.id, thumb.path, f.created_at
       ORDER BY f.created_at DESC`,
      [req.auth.sub],
    );

    const favorites = result.rows.map(formatHotel);

    return res.json({
      data: favorites,
      favorites,
      total: result.rowCount,
    });
  } catch (error) {
    return next(error);
  }
}

async function listFavorites(req, res, next) {
  try {
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
       FROM favorites f
       JOIN hotel h ON h.id = f.hotel_id
       LEFT JOIN image thumb ON thumb.hotel_id = h.id AND thumb.is_thumbnail = true
       LEFT JOIN room r ON r.hotel_id = h.id AND r.is_active = true AND r.deleted_at IS NULL
       WHERE f.user_id = $1
       GROUP BY h.id, thumb.path, f.created_at
       ORDER BY f.created_at DESC`,
      [req.auth.sub],
    );

    return res.json({
      favorites: result.rows.map(formatHotel),
      total: result.rowCount,
    });
  } catch (error) {
    return next(error);
  }
}

async function addFavorite(req, res, next) {
  const hotelId = req.params.hotelId || req.params.id;

  if (!hotelId) {
    return res.status(400).json({ message: "hotelId là bắt buộc." });
  }

  try {
    await pool.query(
      `INSERT INTO favorites (user_id, hotel_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, hotel_id) DO NOTHING`,
      [req.auth.sub, hotelId],
    );

    return res.status(201).json({ message: "Đã thêm vào yêu thích." });
  } catch (error) {
    return next(error);
  }
}

async function removeFavorite(req, res, next) {
  const hotelId = req.params.hotelId || req.params.id;

  if (!hotelId) {
    return res.status(400).json({ message: "hotelId là bắt buộc." });
  }

  try {
    await pool.query(
      "DELETE FROM favorites WHERE user_id = $1 AND hotel_id = $2",
      [req.auth.sub, hotelId],
    );

    return res.json({ message: "Đã bỏ yêu thích." });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  addFavorite,
  listFavorites,
  listUserFavorites,
  removeFavorite,
};
