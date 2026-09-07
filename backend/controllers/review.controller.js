// backend/controllers/review.controller.js
const pool = require("../config/database");
const { formatReview } = require("../utils/formatters");

// ─── 1. LẤY DANH SÁCH ĐÁNH GIÁ (CHUẨN FORM DỮ LIỆU ĐỂ RENDER NHƯ ẢNH) ───
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
        COALESCE(u.full_name, 'Khách du lịch GoStay') AS user_name,
        u.avatar AS user_avatar
      FROM public.review rv
      LEFT JOIN public.users u ON u.id = rv.user_id
      WHERE rv.hotel_id::text = $1
      ORDER BY rv.created_at DESC
      LIMIT 100;
    `;

    const result = await pool.query(query, [hotelId]);

    return res.json({
      success: true,
      reviews: result.rows,
      data: result.rows,
      total: result.rowCount,
    });
  } catch (error) {
    console.error("❌ Lỗi tại listHotelReviews:", error);
    return next(error);
  }
}

// ─── 2. KIỂM TRA XEM KHÁCH CÓ ĐƠN ĐÃ ĐẶT TẠI KHÁCH SẠN NÀY CHƯA ───
async function checkCanReview(req, res, next) {
  try {
    const hotelId = req.params.hotelId || req.params.id;
    const userId = req.user?.id || req.auth?.sub || req.auth?.id;

    if (!userId) {
      return res.json({ canReview: false, reason: "not_logged_in" });
    }

    // Kiểm tra đơn hàng có status là 'confirmed' hoặc 'checked_out' hoặc 'checked_in'
    const query = `
      SELECT b.id, b.booking_code, b.checkout_date
      FROM public.booking b
      WHERE b.user_id = $1 
        AND b.hotel_id::text = $2
        AND b.status IN ('confirmed', 'checked_in', 'checked_out')
        AND b.id NOT IN (SELECT COALESCE(booking_id, '00000000-0000-0000-0000-000000000000'::uuid) FROM public.review WHERE user_id = $1 AND hotel_id::text = $2)
      ORDER BY b.created_at DESC
      LIMIT 1;
    `;

    const result = await pool.query(query, [userId, hotelId]);

    if (result.rows.length > 0) {
      return res.json({
        canReview: true,
        booking: result.rows[0],
      });
    }

    // Nếu không có đơn nào chưa đánh giá
    return res.json({
      canReview: false,
      reason: "no_booking",
      message:
        "Chỉ khách hàng đã đặt phòng tại chỗ nghỉ này mới có thể viết đánh giá.",
    });
  } catch (error) {
    console.error("❌ Lỗi checkCanReview:", error);
    return res.json({ canReview: false, reason: "error" });
  }
}

// ─── 3. TẠO ĐÁNH GIÁ (CHẶN NẾU CHƯA TỪNG ĐẶT PHÒNG) ───
async function createReview(req, res, next) {
  const client = await pool.connect();
  try {
    const hotelId = req.params.hotelId || req.params.id || req.body.hotelId;
    const { bookingId, description, point } = req.body;
    const userId = req.user?.id || req.auth?.sub || req.auth?.id;

    if (!userId) {
      return res.status(401).json({ message: "Vui lòng đăng nhập tài khoản." });
    }

    // Kiểm tra khách đã từng đặt phòng ở khách sạn này chưa
    let validBookingId = bookingId;
    if (!validBookingId) {
      const bCheck = await client.query(
        `SELECT id FROM public.booking 
         WHERE user_id = $1 AND hotel_id::text = $2
           AND status IN ('confirmed', 'checked_in', 'checked_out')
         ORDER BY created_at DESC LIMIT 1`,
        [userId, hotelId],
      );
      if (bCheck.rows.length === 0) {
        return res.status(403).json({
          message:
            "Bạn chưa có đơn đặt phòng hợp lệ tại khách sạn này để viết đánh giá.",
        });
      }
      validBookingId = bCheck.rows[0].id;
    }

    let finalRating = Number(point || 10);
    if (finalRating < 1) finalRating = 1;
    if (finalRating > 10) finalRating = 10;

    await client.query("BEGIN");

    const insertRes = await client.query(
      `INSERT INTO public.review (id, user_id, hotel_id, booking_id, description, point, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW())
       RETURNING *;`,
      [userId, hotelId, validBookingId, description?.trim() || "", finalRating],
    );

    const newReview = insertRes.rows[0];

    // Cập nhật lại điểm trung bình cho khách sạn
    const statRes = await client.query(
      `SELECT COUNT(*)::int AS total, ROUND(AVG(point)::numeric, 1) AS avg_score
       FROM public.review WHERE hotel_id::text = $1`,
      [hotelId],
    );
    const totalReviews = statRes.rows[0]?.total || 1;
    const avgRating = statRes.rows[0]?.avg_score || finalRating;

    await client.query(
      `UPDATE public.hotel SET average_rating = $1, review_count = $2, updated_at = NOW() WHERE id::text = $3`,
      [avgRating, totalReviews, hotelId],
    );

    await client.query("COMMIT");

    // Lấy thông tin user
    const userRes = await pool.query(
      `SELECT full_name, avatar FROM public.users WHERE id = $1`,
      [userId],
    );
    const userName = userRes.rows[0]?.full_name || "Khách du lịch GoStay";

    return res.status(201).json({
      success: true,
      message: "✓ Cảm ơn bạn đã đánh giá kỳ nghỉ!",
      review: {
        ...newReview,
        user_name: userName,
        user_avatar: userRes.rows[0]?.avatar,
      },
      average_rating: avgRating,
      total_reviews: totalReviews,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Lỗi createReview:", error);
    return res.status(500).json({ success: false, message: error.message });
  } finally {
    client.release();
  }
}

// ─── 4. CHỦ KHÁCH SẠN PHẢN HỒI ───
async function replyReview(req, res, next) {
  const { id } = req.params;
  const { reply } = req.body;
  const ownerId = req.user?.id || req.auth?.sub;

  if (!reply || !reply.trim()) {
    return res
      .status(400)
      .json({ message: "Nội dung phản hồi không được để trống." });
  }

  try {
    const updateResult = await pool.query(
      `UPDATE public.review r
       SET reply = $1
       FROM public.hotel h
       WHERE r.hotel_id = h.id AND h.owner_id = $2 AND r.id::text = $3
       RETURNING r.id, r.reply`,
      [reply.trim(), ownerId, id],
    );

    if (updateResult.rows.length === 0) {
      return res
        .status(403)
        .json({ message: "Bạn không có quyền phản hồi đánh giá này." });
    }

    return res.json({
      success: true,
      message: "Đã phản hồi thành công!",
      review: updateResult.rows[0],
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  listHotelReviews,
  checkCanReview,
  createReview,
  replyReview,
};
