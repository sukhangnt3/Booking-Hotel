const crypto = require("crypto");
const pool = require("../config/database");

// ─── 1. TẠO ĐƠN ĐẶT PHÒNG ───
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
      payment_type = "FULL",
      deposit_amount = 0,
      remaining_amount = 0,
      expected_amount,
    } = req.body;

    if (!hotel_id || !checkin_date || !checkout_date) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin khách sạn hoặc ngày lưu trú.",
      });
    }

    if (new Date(checkout_date) <= new Date(checkin_date)) {
      return res.status(400).json({
        success: false,
        message: "Ngày trả phòng phải sau ngày nhận phòng.",
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

    // TÍNH ĐÚNG SỐ TIỀN CỌC 30% VÀ 70% CÒN LẠI
    const isDeposit = payment_type === "DEPOSIT_30";
    const depAmount = isDeposit
      ? Math.round(Number(deposit_amount) || finalPrice * 0.3)
      : finalPrice;
    const remAmount = isDeposit ? finalPrice - depAmount : 0;
    const amountToPayNow = Math.round(Number(expected_amount) || depAmount);

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

    // ─── LƯU SỐ TIỀN CỌC VÀO BẢNG 16: PAYMENT VỚI expected_amount = 30% ───
    await client.query(
      `INSERT INTO public.payment (
        id, booking_id, payment_method, expected_amount, paid_amount, status, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, 'VietQR', $2, 0, 'pending'::public.payment_status_enum, NOW(), NOW()
      ) ON CONFLICT DO NOTHING`,
      [newBooking.id, amountToPayNow],
    );

    await client.query("COMMIT");
    client.release();

    return res.status(201).json({
      success: true,
      message: "Khởi tạo đơn đặt phòng thành công!",
      booking: {
        ...newBooking,
        payment_type: payment_type,
        deposit_amount: depAmount,
        remaining_amount: remAmount,
      },
      booking_code: newBooking.booking_code,
      deposit_amount: depAmount,
      remaining_amount: remAmount,
      payment_type: payment_type,
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
  const client = await pool.connect();
  try {
    const rawCode =
      req.body.booking_code ||
      req.body.bookingCode ||
      req.body.code ||
      req.body.id;
    const booking_code = rawCode ? String(rawCode).trim() : "";
    const paidAmountReq = Number(req.body.paid_amount || req.body.amount || 0);

    if (!booking_code) {
      return res.status(400).json({ message: "Thiếu mã đơn đặt phòng." });
    }

    await client.query("BEGIN");

    const bookingRes = await client.query(
      `SELECT b.*, p.id AS payment_id, p.expected_amount 
       FROM public.booking b
       LEFT JOIN public.payment p ON p.booking_id = b.id
       WHERE b.booking_code ILIKE $1 OR b.id::text = $2
       LIMIT 1`,
      [`%${booking_code}%`, booking_code],
    );

    const booking = bookingRes.rows[0];
    if (!booking) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Không tìm thấy đơn đặt phòng." });
    }

    const actualPaid =
      paidAmountReq > 0
        ? paidAmountReq
        : Number(booking.expected_amount || booking.total_price);

    // Cập nhật bảng booking
    await client.query(
      `UPDATE public.booking
       SET payment_status = 'paid'::public.booking_payment_status_enum,
           status = CASE WHEN status::text = 'pending' THEN 'confirmed'::public.booking_status_enum ELSE status END,
           confirmed_at = COALESCE(confirmed_at, NOW()),
           updated_at = NOW()
       WHERE id = $1`,
      [booking.id],
    );

    // Cập nhật bảng 16: payment
    let paymentId = booking.payment_id;
    if (paymentId) {
      await client.query(
        `UPDATE public.payment 
         SET status = 'paid'::public.payment_status_enum,
             paid_amount = $1,
             paid_at = NOW(),
             updated_at = NOW()
         WHERE id = $2`,
        [actualPaid, paymentId],
      );
    } else {
      const newPay = await client.query(
        `INSERT INTO public.payment (
          id, booking_id, payment_method, expected_amount, paid_amount, status, paid_at, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), $1, 'VietQR', $2, $2, 'paid'::public.payment_status_enum, NOW(), NOW(), NOW()
        ) RETURNING id`,
        [booking.id, actualPaid],
      );
      paymentId = newPay.rows[0].id;
    }

    // Ghi vào bảng 17: payment_transaction
    await client.query(
      `INSERT INTO public.payment_transaction (
        id, payment_id, transaction_id, gateway, amount, status, raw_response, created_at
      ) VALUES (
        gen_random_uuid(), $1, $2, 'VietQR', $3, 'success'::public.transaction_status_enum, $4, NOW()
      )`,
      [
        paymentId,
        `TXN_${Date.now()}`,
        actualPaid,
        JSON.stringify({
          bookingCode: booking.booking_code,
          amount: actualPaid,
        }),
      ],
    );

    await client.query("COMMIT");

    return res.json({
      success: true,
      message: "✓ Xác nhận thanh toán thành công!",
      bookingCode: booking.booking_code,
      paidAmount: actualPaid,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    return res.status(500).json({ success: false, message: error.message });
  } finally {
    client.release();
  }
}

// ─── 3. TRA CỨU ĐƠN BẰNG CODE ───
async function getBookingByCode(req, res, next) {
  try {
    const { code } = req.params;
    const result = await pool.query(
      `SELECT 
         b.*, 
         h.name AS hotel_name, 
         h.address AS hotel_address, 
         h.city AS hotel_city,
         COALESCE((SELECT br.room_name FROM public.booking_room br WHERE br.booking_id = b.id LIMIT 1), 'Phòng tiêu chuẩn') AS room_name,
         COALESCE(p.paid_amount, 0) AS paid_amount,
         COALESCE(p.expected_amount, b.total_price) AS expected_amount,
         p.status AS payment_status_record,
         p.payment_method
       FROM public.booking b
       JOIN public.hotel h ON h.id = b.hotel_id
       LEFT JOIN public.payment p ON p.booking_id = b.id
       WHERE b.booking_code ILIKE $1 OR b.id::text = $2
       LIMIT 1`,
      [`%${code}%`, code],
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy thông tin đơn đặt phòng." });
    }

    const row = result.rows[0];
    const total = Number(row.total_price || 0);
    const expAmount = Number(row.expected_amount || 0);
    const paidMoney = Number(row.paid_amount || 0);

    // Phân biệt chính xác cọc 30% dựa trên expected_amount hoặc paid_amount
    const isDep =
      (expAmount > 0 && expAmount < total) ||
      (paidMoney > 0 && paidMoney < total);

    const dep = isDep ? (paidMoney > 0 ? paidMoney : expAmount) : total;
    const rem = isDep ? total - dep : 0;

    const finalBooking = {
      ...row,
      payment_type: isDep ? "DEPOSIT_30" : "FULL",
      deposit_amount: dep,
      remaining_amount: rem,
    };

    return res.json({
      success: true,
      booking: finalBooking,
      data: finalBooking,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ─── 4. LỊCH SỬ ĐẶT PHÒNG CỦA TÔI ───
async function getMyBookings(req, res, next) {
  try {
    const userId =
      req.user?.id || req.user?.userId || req.auth?.sub || req.auth?.id;
    const userEmail = req.user?.email || req.auth?.email;

    if (!userId && !userEmail) {
      return res.status(401).json({ message: "Vui lòng đăng nhập." });
    }

    const result = await pool.query(
      `SELECT 
         b.*, 
         h.name AS hotel_name, 
         h.address AS hotel_address, 
         h.city AS hotel_city,
         COALESCE(
           (SELECT br.room_name FROM public.booking_room br WHERE br.booking_id = b.id LIMIT 1), 
           'Phòng tiêu chuẩn'
         ) AS room_name,
         COALESCE(p.paid_amount, 0) AS paid_amount,
         COALESCE(p.expected_amount, b.total_price) AS expected_amount,
         p.payment_method,
         CASE WHEN rv.id IS NOT NULL THEN true ELSE false END AS is_reviewed,
         rv.id AS review_id,
         rv.point AS reviewed_point
       FROM public.booking b
       JOIN public.hotel h ON h.id = b.hotel_id
       LEFT JOIN public.payment p ON p.booking_id = b.id
       LEFT JOIN public.review rv ON rv.booking_id = b.id
       WHERE b.user_id = $1 OR (b.guest_email = $2 AND $2 IS NOT NULL)
       ORDER BY b.created_at DESC`,
      [userId || null, userEmail || null],
    );

    const formattedBookings = result.rows.map((row) => {
      const total = Number(row.total_price || 0);
      const expAmount = Number(row.expected_amount || 0);
      const paidMoney = Number(row.paid_amount || 0);

      const isDep =
        (expAmount > 0 && expAmount < total) ||
        (paidMoney > 0 && paidMoney < total);

      const dep = isDep ? (paidMoney > 0 ? paidMoney : expAmount) : total;
      const rem = isDep ? total - dep : 0;

      return {
        ...row,
        payment_type: isDep ? "DEPOSIT_30" : "FULL",
        deposit_amount: dep,
        remaining_amount: rem,
      };
    });

    return res.json({
      success: true,
      data: formattedBookings,
      bookings: formattedBookings,
    });
  } catch (error) {
    console.error("❌ Lỗi getMyBookings:", error);
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
