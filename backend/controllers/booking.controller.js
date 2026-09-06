// backend/controllers/booking.controller.js
const crypto = require("crypto");
const pool = require("../config/database");

// ─── 1. TẠO ĐƠN ĐẶT PHÒNG (GỒM LƯU PROMOTION_USAGE) ───
async function createBooking(req, res, next) {
  const client = await pool.connect();
  try {
    const userId =
      req.user?.id || req.user?.userId || req.auth?.sub || req.auth?.id || null;
    const {
      hotel_id,
      room_id,
      promotion_id,
      discount = 0,
      checkin_date,
      checkout_date,
      total_price,
      adults = 2,
      customer_name,
      guest_phone,
      guest_email,
      special_require,
    } = req.body;

    if (!hotel_id || !checkin_date || !checkout_date) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Thiếu thông tin khách sạn hoặc ngày lưu trú.",
        });
    }

    // Kiểm tra phòng trống
    const roomCountRes = await client.query(
      `SELECT COALESCE(SUM(amount), 0)::int AS total_rooms FROM public.room WHERE hotel_id = $1 AND is_active = true`,
      [hotel_id],
    );
    const totalRooms = Number(roomCountRes.rows[0]?.total_rooms || 0);

    const bookedRes = await client.query(
      `SELECT COUNT(*)::int AS booked_count FROM public.booking
       WHERE hotel_id = $1 AND status IN ('confirmed', 'checked_in', 'pending')
         AND (checkin_date < $3::date AND checkout_date > $2::date)`,
      [hotel_id, checkin_date, checkout_date],
    );
    const currentBooked = Number(bookedRes.rows[0]?.booked_count || 0);

    if (totalRooms > 0 && currentBooked >= totalRooms) {
      return res.status(400).json({
        success: false,
        message: `Khách sạn đã KÍN PHÒNG (${currentBooked}/${totalRooms}). Quý khách vui lòng chọn ngày khác!`,
      });
    }

    await client.query("BEGIN");

    const newBookingId = crypto.randomUUID();
    const bookingCode = "BK" + Math.floor(10000000 + Math.random() * 90000000);
    const finalPrice = Math.round(Number(total_price || 650000));
    const discountVal = Math.round(Number(discount || 0));
    const subtotalVal = finalPrice + discountVal;

    const insertSql = `
      INSERT INTO public.booking (
        id, booking_code, user_id, hotel_id, promotion_id,
        checkin_date, checkout_date, adult_total, children_total,
        customer_name, guest_email, guest_phone, special_require,
        status, payment_status, subtotal, discount, service_total,
        total_price, hotel_payout, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6::date, $7::date, $8, 0,
        $9, $10, $11, $12,
        'confirmed'::public.booking_status_enum, 'unpaid'::public.booking_payment_status_enum,
        $13, $14, 0,
        $15, 0, NOW(), NOW()
      ) RETURNING *;
    `;

    const insertRes = await client.query(insertSql, [
      newBookingId,
      bookingCode,
      userId,
      hotel_id,
      promotion_id || null,
      checkin_date,
      checkout_date,
      Number(adults) || 2,
      customer_name || "Khách đặt trực tuyến",
      guest_email || req.user?.email || "guest@gostay.vn",
      guest_phone || "0900000000",
      special_require || null,
      subtotalVal,
      discountVal,
      finalPrice,
    ]);

    const newBooking = insertRes.rows[0];

    // Lưu chi tiết booking_room
    if (room_id) {
      const roomRes = await client.query(
        `SELECT name, base_price FROM public.room WHERE id = $1 LIMIT 1`,
        [room_id],
      );

      const roomName = roomRes.rows[0]?.name || "Phòng tiêu chuẩn";
      const roomPrice = Number(roomRes.rows[0]?.base_price || finalPrice);

      await client.query(
        `INSERT INTO public.booking_room (
          id, booking_id, room_id, room_name, book_date, quantity, price, created_at
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4::date, 1, $5, NOW()
        ) ON CONFLICT DO NOTHING`,
        [newBooking.id, room_id, roomName, checkin_date, roomPrice],
      );
    }

    // ─── GHI NHẬN VÀO BẢNG 18: PROMOTION_USAGE ───
    if (promotion_id && userId) {
      await client
        .query(
          `INSERT INTO public.promotion_usage (
           id, promotion_id, user_id, booking_id, used_at
         ) VALUES (
           gen_random_uuid(), $1, $2, $3, NOW()
         )`,
          [promotion_id, userId, newBooking.id],
        )
        .catch((e) => console.warn("Lưu ý promotion_usage:", e.message));
    }

    await client.query("COMMIT");
    client.release();

    return res.status(201).json({
      success: true,
      message: "Khởi tạo đơn đặt phòng thành công!",
      booking: newBooking,
      booking_code: newBooking.booking_code,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    client.release();
    console.error("❌ LỖI CREATE_BOOKING:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ─── 2. XÁC NHẬN THANH TOÁN ───
async function confirmPayment(req, res, next) {
  try {
    const rawCode =
      req.body.booking_code ||
      req.body.bookingCode ||
      req.body.code ||
      req.body.id;
    const booking_code = rawCode ? String(rawCode).trim() : "";

    if (!booking_code) {
      return res.status(400).json({ message: "Thiếu mã đơn đặt phòng." });
    }

    const updateRes = await pool.query(
      `UPDATE public.booking
       SET payment_status = 'paid'::public.booking_payment_status_enum,
           status = CASE WHEN status::text = 'pending' THEN 'confirmed'::public.booking_status_enum ELSE status END,
           confirmed_at = COALESCE(confirmed_at, NOW()),
           updated_at = NOW()
       WHERE booking_code ILIKE $1 OR id::text = $2
       RETURNING *`,
      [`%${booking_code}%`, booking_code],
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy đơn đặt phòng." });
    }

    return res.json({
      success: true,
      message: "✓ Xác nhận thanh toán thành công!",
      booking: updateRes.rows[0],
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ─── 3. TRA CỨU ĐƠN BẰNG CODE ───
async function getBookingByCode(req, res, next) {
  try {
    const { code } = req.params;
    const result = await pool.query(
      `SELECT b.*, h.name AS hotel_name, h.address AS hotel_address, h.city AS hotel_city,
         COALESCE((SELECT br.room_name FROM public.booking_room br WHERE br.booking_id = b.id LIMIT 1), 'Phòng tiêu chuẩn') AS room_name
       FROM public.booking b
       JOIN public.hotel h ON h.id = b.hotel_id
       WHERE b.booking_code ILIKE $1 OR b.id::text = $2
       LIMIT 1`,
      [`%${code}%`, code],
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy thông tin đơn đặt phòng." });
    }

    return res.json({
      success: true,
      booking: result.rows[0],
      data: result.rows[0],
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ─── 4. LỊCH SỬ ĐẶT PHÒNG CỦA TÔI (CHO USER PROFILE) ───
async function getMyBookings(req, res, next) {
  try {
    const userId =
      req.user?.id || req.user?.userId || req.auth?.sub || req.auth?.id;
    const userEmail = req.user?.email || req.auth?.email;

    if (!userId && !userEmail) {
      return res.status(401).json({ message: "Vui lòng đăng nhập." });
    }

    const result = await pool.query(
      `SELECT b.*, h.name AS hotel_name, h.address AS hotel_address, h.city AS hotel_city,
         COALESCE((SELECT br.room_name FROM public.booking_room br WHERE br.booking_id = b.id LIMIT 1), 'Phòng tiêu chuẩn') AS room_name
       FROM public.booking b
       JOIN public.hotel h ON h.id = b.hotel_id
       WHERE b.user_id = $1 OR (b.guest_email = $2 AND $2 IS NOT NULL)
       ORDER BY b.created_at DESC`,
      [userId || null, userEmail || null],
    );

    return res.json({
      success: true,
      data: result.rows,
      bookings: result.rows,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ─── 5. HỦY ĐƠN ───
async function cancelBooking(req, res, next) {
  try {
    const { id } = req.params;
    const userId =
      req.user?.id || req.user?.userId || req.auth?.sub || req.auth?.id;

    const result = await pool.query(
      `UPDATE public.booking
       SET status = 'cancelled'::public.booking_status_enum,
           cancelled_at = NOW(),
           updated_at = NOW()
       WHERE (id::text = $1 OR booking_code ILIKE $2)
         AND (user_id = $3 OR $3 IS NULL)
       RETURNING *`,
      [id, `%${id}%`, userId || null],
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy đơn hoặc không có quyền hủy." });
    }

    return res.json({
      success: true,
      message: "Đã hủy đơn đặt phòng thành công!",
      booking: result.rows[0],
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  createBooking,
  confirmPayment,
  getBookingByCode,
  getMyBookings,
  cancelBooking,
};
