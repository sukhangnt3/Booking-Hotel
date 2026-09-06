// backend/controllers/favorite.controller.js
const pool = require("../config/database");
const { formatHotel } = require("../utils/formatters");

// ─── 1. LẤY DANH SÁCH YÊU THÍCH CỦA USER ───
async function listUserFavorites(req, res, next) {
  try {
    const userId = req.user?.id || req.auth?.sub || req.auth?.id;

    if (!userId) {
      return res.json({ success: true, data: [], favorites: [], total: 0 });
    }

    const query = `
      SELECT
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
         h.status,
         COALESCE(
           (
             SELECT img.path 
             FROM public.image img 
             WHERE img.hotel_id = h.id 
             ORDER BY img.is_thumbnail DESC, img.created_at ASC 
             LIMIT 1
           ),
           'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600'
         ) AS thumbnail,
         COALESCE(
           (
             SELECT MIN(r.base_price) 
             FROM public.room r 
             WHERE r.hotel_id = h.id AND r.is_active = true
           ),
           500000
         ) AS min_price
       FROM public.favorites f
       JOIN public.hotel h ON h.id = f.hotel_id
       WHERE f.user_id = $1
       ORDER BY f.created_at DESC;
    `;

    const result = await pool.query(query, [userId]);

    const favorites = result.rows.map((row) =>
      formatHotel ? formatHotel(row) : row,
    );

    return res.json({
      success: true,
      data: favorites,
      favorites: favorites,
      total: result.rowCount,
    });
  } catch (error) {
    console.error("❌ LỖI LIST_FAVORITES:", error.message);
    return res.json({ success: true, data: [], favorites: [], total: 0 });
  }
}

async function listFavorites(req, res, next) {
  return listUserFavorites(req, res, next);
}

// ─── 2. THÊM VÀO DANH SÁCH YÊU THÍCH ───
async function addFavorite(req, res, next) {
  try {
    const userId = req.user?.id || req.auth?.sub || req.auth?.id;
    const hotelId = req.params.hotelId || req.params.id || req.body.hotel_id;

    if (!userId) {
      return res
        .status(401)
        .json({ message: "Vui lòng đăng nhập để lưu yêu thích." });
    }

    if (!hotelId) {
      return res.status(400).json({ message: "hotelId là bắt buộc." });
    }

    await pool.query(
      `INSERT INTO public.favorites (user_id, hotel_id, created_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (user_id, hotel_id) DO NOTHING`,
      [userId, hotelId],
    );

    return res
      .status(201)
      .json({ success: true, message: "Đã thêm vào danh sách yêu thích." });
  } catch (error) {
    console.error("❌ LỖI ADD_FAVORITE:", error);
    return next(error);
  }
}

// ─── 3. XÓA KHỎI DANH SÁCH YÊU THÍCH ───
async function removeFavorite(req, res, next) {
  try {
    const userId = req.user?.id || req.auth?.sub || req.auth?.id;
    const hotelId = req.params.hotelId || req.params.id || req.body.hotel_id;

    if (!userId) {
      return res.status(401).json({ message: "Vui lòng đăng nhập." });
    }

    if (!hotelId) {
      return res.status(400).json({ message: "hotelId là bắt buộc." });
    }

    await pool.query(
      `DELETE FROM public.favorites WHERE user_id = $1 AND hotel_id = $2`,
      [userId, hotelId],
    );

    return res.json({ success: true, message: "Đã bỏ yêu thích." });
  } catch (error) {
    console.error("❌ LỖI REMOVE_FAVORITE:", error);
    return next(error);
  }
}

module.exports = {
  addFavorite,
  listFavorites,
  listUserFavorites,
  removeFavorite,
};
