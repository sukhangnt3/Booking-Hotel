// backend/controllers/booking.controller.js
const crypto = require("crypto");
const pool = require("../config/database");

// Tài khoản sàn mặc định (Có kết nối SePay)
const PLATFORM_BANK = {
  bankId: process.env.PLATFORM_BANK_ID || "MB",
  bankName:
    process.env.PLATFORM_BANK_NAME || "Ngân hàng TMCP Quân Đội (MBBank)",
  accountNumber: process.env.PLATFORM_BANK_ACCOUNT || "0833404928",
  accountName: process.env.PLATFORM_BANK_HOLDER || "SU TRACH KHANG",
};

// Hàm lấy tên cột hạn khóa phòng trong temporary_locks (tránh lỗi sai tên cột)
let cachedExpireCol = null;
async function getLockExpireColumn() {
  if (cachedExpireCol) return cachedExpireCol;
  try {
    const res = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'temporary_locks' 
        AND column_name IN ('lock_expires_at', 'expires_at')
    `);
    const cols = res.rows.map((r) => r.column_name);
    if (cols.includes("lock_expires_at")) cachedExpireCol = "lock_expires_at";
    else if (cols.includes("expires_at")) cachedExpireCol = "expires_at";
    else cachedExpireCol = "created_at";
  } catch (err) {
    cachedExpireCol = "lock_expires_at";
  }
  return cachedExpireCol;
}

// Hàm dọn dẹp các lock đã hết hạn (DÙNG POOL ĐỘC LẬP, KHÔNG CHẠY TRONG TRANSACTION CLIENT)
async function cleanupExpiredLocks() {
  try {
    const col = await getLockExpireColumn();
    await pool.query(`DELETE FROM public.temporary_locks WHERE ${col} < NOW()`);
  } catch (e) {
    console.warn("⚠️ Dọn dẹp lock hết hạn:", e.message);
  }
}

// ─── 1. TẠO ĐƠN ĐẶT PHÒNG & KHÓA PHÒNG REAL-TIME 15 PHÚT ───
async function createBooking(req, res, next) {
  // Dọn dẹp lock cũ trước khi mở transaction mới
  await cleanupExpiredLocks();

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
      quantity = 1,
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
      client.release();
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin khách sạn hoặc ngày lưu trú.",
      });
    }

    if (new Date(checkout_date) <= new Date(checkin_date)) {
      client.release();
      return res.status(400).json({
        success: false,
        message: "Ngày trả phòng phải sau ngày nhận phòng.",
      });
    }

    const bookingQty = Math.max(1, Number(quantity) || 1);

    await client.query("BEGIN");

    // KIỂM TRA TỒN KHO THEO TỪNG NGÀY TRONG KHOẢNG CHECKIN -> CHECKOUT
    if (room_id) {
      const roomStockRes = await client.query(
        `SELECT id, name, base_price, COALESCE(amount, 1)::int AS total_stock 
         FROM public.room 
         WHERE id = $1 AND is_active = true 
         FOR UPDATE`,
        [room_id],
      );

      if (roomStockRes.rows.length === 0) {
        await client.query("ROLLBACK");
        client.release();
        return res.status(404).json({
          success: false,
          message: "Hạng phòng không tồn tại hoặc đã ngừng kinh doanh.",
        });
      }

      const roomData = roomStockRes.rows[0];
      const maxStock = roomData.total_stock;
      const expireCol = await getLockExpireColumn();

      const conflictCheckSql = `
        WITH days AS (
          SELECT generate_series($2::date, ($3::date - interval '1 day')::date, '1 day'::interval)::date AS day
        ),
        daily_locks AS (
          SELECT lock_date, COALESCE(SUM(quantity), 0)::int AS locked_qty
          FROM public.temporary_locks
          WHERE room_id = $1 AND ${expireCol} > NOW()
          GROUP BY lock_date
        ),
        daily_bookings AS (
          SELECT days.day, COALESCE(SUM(br.quantity), 0)::int AS booked_qty
          FROM days
          JOIN public.booking b 
            ON b.checkin_date <= days.day 
           AND b.checkout_date > days.day
           AND b.status IN ('confirmed', 'checked_in')
          JOIN public.booking_room br 
            ON br.booking_id = b.id 
           AND br.room_id = $1
          GROUP BY days.day
        )
        SELECT days.day,
               COALESCE(l.locked_qty, 0) AS locked_count,
               COALESCE(b.booked_qty, 0) AS booked_count
        FROM days
        LEFT JOIN daily_locks l ON l.lock_date = days.day
        LEFT JOIN daily_bookings b ON b.day = days.day
        WHERE (COALESCE(l.locked_qty, 0) + COALESCE(b.booked_qty, 0) + $4) > $5
        LIMIT 1;
      `;

      const conflictRes = await client.query(conflictCheckSql, [
        room_id,
        checkin_date,
        checkout_date,
        bookingQty,
        maxStock,
      ]);

      if (conflictRes.rows.length > 0) {
        await client.query("ROLLBACK");
        client.release();
        return res.status(400).json({
          success: false,
          message: `Rất tiếc! Hạng phòng "${roomData.name}" đã hết chỗ hoặc có khách khác đang giữ phòng. Quý khách vui lòng chọn ngày khác!`,
        });
      }
    }

    // TÍNH TOÁN TIỀN PHÒNG & TIỀN CỌC 30%
    const newBookingId = crypto.randomUUID();
    const bookingCode = "BK" + Math.floor(10000000 + Math.random() * 90000000);
    const finalPrice = Math.round(Number(total_price || 650000));
    const discountVal = Math.round(Number(discount || 0));
    const subtotalVal = finalPrice + discountVal;

    const isDeposit = payment_type === "DEPOSIT_30";
    const depAmount = isDeposit
      ? Math.round(Number(deposit_amount) || finalPrice * 0.3)
      : finalPrice;
    const remAmount = isDeposit ? finalPrice - depAmount : 0;
    const amountToPayNow = Math.round(Number(expected_amount) || depAmount);

    // TẠO BOOKING (TRUYỀN CHUỖI TRỰC TIẾP, KHÔNG ÉP KIỂU ENUM CỨNG)
    const insertBookingSql = `
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
        'pending', 'unpaid',
        $13, $14, 0,
        $15, 0, NOW(), NOW()
      ) RETURNING *;
    `;

    const insertRes = await client.query(insertBookingSql, [
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

    // LƯU BẢNG BOOKING_ROOM VÀ KHÓA PHÒNG 15 PHÚT
    if (room_id) {
      const roomRes = await client.query(
        `SELECT name, base_price AS room_price FROM public.room WHERE id = $1 LIMIT 1`,
        [room_id],
      );

      const roomName = roomRes.rows[0]?.name || "Phòng tiêu chuẩn";
      const roomPrice = Number(roomRes.rows[0]?.room_price || finalPrice);

      await client.query(
        `INSERT INTO public.booking_room (
          id, booking_id, room_id, room_name, book_date, quantity, price, created_at
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4::date, $5, $6, NOW()
        ) ON CONFLICT DO NOTHING`,
        [newBooking.id, room_id, roomName, checkin_date, bookingQty, roomPrice],
      );

      const sessionId =
        req.headers["x-session-id"] ||
        req.sessionID ||
        `sess_${crypto.randomBytes(8).toString("hex")}`;

      const expireCol = await getLockExpireColumn();

      const insertLockSql = `
        INSERT INTO public.temporary_locks (
          id, room_id, user_id, session_id, lock_date, quantity, 
          ${expireCol}, booking_id, created_at
        )
        SELECT 
          gen_random_uuid(),
          $1, 
          $2, 
          $3, 
          d::date, 
          $4, 
          NOW() + INTERVAL '15 minutes', 
          $5, 
          NOW()
        FROM generate_series($6::date, ($7::date - interval '1 day')::date, '1 day'::interval) d;
      `;

      await client.query(insertLockSql, [
        room_id,
        userId,
        sessionId,
        bookingQty,
        newBooking.id,
        checkin_date,
        checkout_date,
      ]);
    }

    // TẠO LINK VIETQR (Theo tài khoản sàn SePay)
    const qrUrl = `https://img.vietqr.io/image/${PLATFORM_BANK.bankId}-${PLATFORM_BANK.accountNumber}-compact2.png?amount=${amountToPayNow}&addInfo=${bookingCode}&accountName=${encodeURIComponent(PLATFORM_BANK.accountName)}`;

    // TẠO BẢN GHI PAYMENT: ĐÚNG CHUẨN SCHEMA status LÀ varchar(50) DEFAULT 'pending'
    const paymentInsertSql = `
      INSERT INTO public.payment (
        id, booking_id, payment_method, expected_amount, paid_amount, 
        qr_code, qr_content, status, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, 'VietQR', $2, 0, 
        $3, $4, 'pending', NOW(), NOW()
      ) RETURNING *;
    `;

    const payRes = await client.query(paymentInsertSql, [
      newBooking.id,
      amountToPayNow,
      qrUrl,
      bookingCode,
    ]);

    await client.query("COMMIT");
    client.release();

    return res.status(201).json({
      success: true,
      message: "Khởi tạo đơn đặt phòng và giữ chỗ 15 phút thành công!",
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
      payment: payRes.rows[0],
      qr_code: qrUrl,
      qr_content: bookingCode,
      lock_expires_in_seconds: 15 * 60,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    client.release();
    console.error("❌ LỖI CREATE_BOOKING:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ─── 2. HÀM CONFIRM PAYMENT ───
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
      client.release();
      return res.status(400).json({ message: "Thiếu mã đơn đặt phòng." });
    }

    await client.query("BEGIN");

    const bookingRes = await client.query(
      `SELECT b.*, p.id AS payment_id, p.expected_amount 
       FROM public.booking b
       LEFT JOIN public.payment p ON p.booking_id = b.id
       WHERE b.booking_code ILIKE $1 OR b.id::text = $2
       LIMIT 1
       FOR UPDATE`,
      [`%${booking_code}%`, booking_code],
    );

    const booking = bookingRes.rows[0];
    if (!booking) {
      await client.query("ROLLBACK");
      client.release();
      return res.status(404).json({ message: "Không tìm thấy đơn đặt phòng." });
    }

    const actualPaid =
      paidAmountReq > 0
        ? paidAmountReq
        : Number(booking.expected_amount || booking.total_price);

    // Cập nhật booking (status và payment_status để 'confirmed' và 'paid')
    await client.query(
      `UPDATE public.booking
       SET payment_status = 'paid',
           status = 'confirmed',
           confirmed_at = COALESCE(confirmed_at, NOW()),
           updated_at = NOW()
       WHERE id = $1`,
      [booking.id],
    );

    let paymentId = booking.payment_id;
    if (paymentId) {
      await client.query(
        `UPDATE public.payment 
         SET status = 'paid',
             paid_amount = $1,
             paid_at = NOW(),
             updated_at = NOW()
         WHERE id = $2`,
        [actualPaid, paymentId],
      );
    } else {
      const qrUrl = `https://img.vietqr.io/image/${PLATFORM_BANK.bankId}-${PLATFORM_BANK.accountNumber}-compact2.png?amount=${actualPaid}&addInfo=${booking.booking_code}&accountName=${encodeURIComponent(PLATFORM_BANK.accountName)}`;
      const newPay = await client.query(
        `INSERT INTO public.payment (
          id, booking_id, payment_method, expected_amount, paid_amount, 
          qr_code, qr_content, status, paid_at, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), $1, 'VietQR', $2, $2, 
          $3, $4, 'paid', NOW(), NOW(), NOW()
        ) RETURNING id`,
        [booking.id, actualPaid, qrUrl, booking.booking_code],
      );
      paymentId = newPay.rows[0].id;
    }

    // Ghi vào bảng payment_transaction (ép kiểu an toàn sang transaction_status_enum)
    await client.query(
      `INSERT INTO public.payment_transaction (
        id, payment_id, transaction_id, gateway, amount, status, raw_response, created_at
      ) VALUES (
        gen_random_uuid(), $1, $2, 'VietQR', $3, 'success'::public.transaction_status_enum, $4, NOW()
      )`,
      [
        paymentId,
        req.body.transaction_id || `TXN_${Date.now()}`,
        actualPaid,
        JSON.stringify({
          bookingCode: booking.booking_code,
          amount: actualPaid,
          confirmed_by: "system",
        }),
      ],
    );

    // Giải phóng temporary_locks
    await client.query(
      `DELETE FROM public.temporary_locks WHERE booking_id = $1`,
      [booking.id],
    );

    await client.query("COMMIT");
    client.release();

    return res.json({
      success: true,
      message: "✓ Xác nhận thanh toán thành công!",
      bookingCode: booking.booking_code,
      paidAmount: actualPaid,
      status: "paid",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    client.release();
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ─── 3. TRA CỨU ĐƠN ĐẶT PHÒNG THEO CODE ───
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
         p.payment_method,
         p.qr_code,
         p.qr_content
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

// ─── 4. LỊCH SỬ ĐẶT PHÒNG CỦA NGƯỜI DÙNG ───
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
         p.payment_method
       FROM public.booking b
       JOIN public.hotel h ON h.id = b.hotel_id
       LEFT JOIN public.payment p ON p.booking_id = b.id
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

// ─── 5. HỦY ĐƠN & GIẢI PHÓNG KHÓA PHÒNG ───
async function cancelBooking(req, res, next) {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    await client.query("BEGIN");

    const result = await client.query(
      `UPDATE public.booking
       SET status = 'cancelled',
           cancelled_at = NOW(),
           updated_at = NOW()
       WHERE id::text = $1 OR booking_code ILIKE $2
       RETURNING *`,
      [id, `%${id}%`],
    );

    if (result.rows.length === 0) {
      await client.query("ROLLBACK");
      client.release();
      return res
        .status(404)
        .json({ message: "Không tìm thấy đơn hoặc không có quyền hủy." });
    }

    const cancelledBooking = result.rows[0];

    // Xóa khóa phòng tạm thời
    await client.query(
      `DELETE FROM public.temporary_locks WHERE booking_id = $1`,
      [cancelledBooking.id],
    );

    await client.query("COMMIT");
    client.release();

    return res.json({
      success: true,
      message: "Đã hủy đơn đặt phòng thành công!",
      booking: cancelledBooking,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    client.release();
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
