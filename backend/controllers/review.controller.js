// backend/controllers/review.controller.js
const pool = require("../config/database");
const { formatReview } = require("../utils/formatters");

// ─── 1. LẤY DANH SÁCH ĐÁNH GIÁ CỦA KHÁCH SẠN (KÈM PHẢN HỒI CỦA OWNER) ───
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
        u.full_name AS user_name,
        u.avatar AS user_avatar
      FROM public.review rv
      LEFT JOIN public.users u ON u.id = rv.user_id
      WHERE rv.hotel_id::text = $1
      ORDER BY rv.created_at DESC
      LIMIT 100;
    `;

    const result = await pool.query(query, [hotelId]);

    const formattedReviews = result.rows.map((row) =>
      typeof formatReview === "function" ? formatReview(row) : row,
    );

    return res.json({
      success: true,
      reviews: formattedReviews,
      data: formattedReviews,
      total: result.rowCount,
    });
  } catch (error) {
    console.error("Lỗi tại listHotelReviews:", error);
    return next(error);
  }
}

// ─── 2. KHÁCH HÀNG TẠO ĐÁNH GIÁ MỚI ───
async function createReview(req, res, next) {
  const { hotelId, bookingId, description, point } = req.body;
  const rating = Number(point);
  const userId = req.auth?.sub || req.auth?.id || req.user?.id || null;

  if (!hotelId || !rating || rating < 1 || rating > 5) {
    return res.status(400).json({
      message: "hotelId và điểm đánh giá từ 1 đến 5 là bắt buộc.",
    });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const query = `
      INSERT INTO public.review (id, user_id, hotel_id, booking_id, description, point, created_at)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW())
      RETURNING id, user_id, hotel_id, booking_id, description, point, reply, created_at;
    `;

    const result = await client.query(query, [
      userId,
      hotelId,
      bookingId || null,
      description?.trim() || null,
      rating,
    ]);

    // Tự động tính lại điểm trung bình và số lượng đánh giá cho khách sạn
    await client.query(
      `UPDATE public.hotel
       SET average_rating = (SELECT COALESCE(AVG(point), 0) FROM public.review WHERE hotel_id = $1),
           review_count = (SELECT COUNT(*)::int FROM public.review WHERE hotel_id = $1),
           updated_at = NOW()
       WHERE id = $1`,
      [hotelId],
    );

    await client.query("COMMIT");

    const createdReview =
      typeof formatReview === "function"
        ? formatReview(result.rows[0])
        : result.rows[0];

    return res.status(201).json({
      success: true,
      message: "Đã gửi đánh giá thành công!",
      review: createdReview,
      data: createdReview,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Lỗi tại createReview:", error);
    return next(error);
  } finally {
    client.release();
  }
}

// ─── 3. CHỦ KHÁCH SẠN PHẢN HỒI ĐÁNH GIÁ (CẬP NHẬT CỘT REPLY TRONG BẢNG 19) ───
async function replyReview(req, res, next) {
  const { id } = req.params; // review_id
  const { reply } = req.body;
  const ownerId = req.user?.id || req.auth?.sub;

  if (!reply || !reply.trim()) {
    return res
      .status(400)
      .json({ message: "Nội dung phản hồi không được để trống." });
  }

  try {
    // Kiểm tra xem người trả lời có đúng là Chủ của khách sạn này không
    const updateResult = await pool.query(
      `UPDATE public.review r
       SET reply = $1
       FROM public.hotel h
       WHERE r.hotel_id = h.id 
         AND h.owner_id = $2
         AND r.id::text = $3
       RETURNING r.id, r.reply, r.point`,
      [reply.trim(), ownerId, id],
    );

    if (updateResult.rows.length === 0) {
      return res.status(403).json({
        message:
          "Không tìm thấy đánh giá hoặc bạn không có quyền quản trị cơ sở này.",
      });
    }

    return res.json({
      success: true,
      message: "Đã gửi phản hồi đánh giá thành công!",
      review: updateResult.rows[0],
    });
  } catch (error) {
    console.error("Lỗi phản hồi đánh giá:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  createReview,
  listHotelReviews,
  replyReview,
};
