// backend/controllers/booking.controller.js
const crypto = require("crypto");
const pool = require("../config/database");

// Tài khoản dự phòng hệ thống (Nếu khách sạn chưa điền thông tin ngân hàng)
const DEFAULT_PLATFORM_BANK = {
  bankId: "MB",
  bankName: "MBBank",
  accountNumber: "0833404928",
  accountName: "GOSTAY PLATFORM",
};

// Hàm lấy thông tin tài khoản ngân hàng của Chủ khách sạn
async function getHotelOwnerBankInfo(client, hotelId) {
  try {
    const res = await client.query(
      `SELECT 
         h.id, h.name AS hotel_name,
         COALESCE(h.bank_code, u.bank_code, 'MB') AS bank_id,
         COALESCE(h.bank_name, u.bank_name, 'MBBank') AS bank_name,
         COALESCE(h.bank_account, u.bank_account, '0833404928') AS account_number,
         COALESCE(h.bank_account_holder, u.bank_account_holder, h.name, 'GOSTAY PARTNER') AS account_name
       FROM public.hotel h
       LEFT JOIN public.users u ON u.id = h.owner_id
       WHERE h.id = $1 LIMIT 1`,
      [hotelId],
    );

    if (res.rows.length > 0) {
      const row = res.rows[0];
      return {
        bankId: (row.bank_id || "MB").toUpperCase(),
        bankName: row.bank_name || "MBBank",
        accountNumber: row.account_number || "0833404928",
        accountName: (row.account_name || "GOSTAY PARTNER").toUpperCase(),
      };
    }
  } catch (err) {
    console.warn("⚠️ Lỗi truy vấn ngân hàng Owner:", err.message);
  }
  return DEFAULT_PLATFORM_BANK;
}

// Hàm dọn dẹp các khóa phòng quá hạn 15 phút
async function cleanupExpiredLocks(client) {
  try {
    await client.query(`
      DELETE FROM public.temporary_locks 
      WHERE lock_expires_at < NOW() OR (expires_at IS NOT NULL AND expires_at < NOW())
    `);
  } catch (e) {
    console.warn("Dọn dẹp lock hết hạn:", e.message);
  }
}

// ─── 1. TẠO ĐƠN ĐẶT PHÒNG & TẠO QR VIETQR THEO NGÂN HÀNG CỦA OWNER ───
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

    // Dọn dẹp lock cũ hết hạn
    await cleanupExpiredLocks(client);

    // Kiểm tra số lượng phòng còn trống
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

      const conflictCheckSql = `
        WITH days AS (
          SELECT generate_series($2::date, ($3::date - interval '1 day')::date, '1 day'::interval)::date AS day
        ),
        daily_locks AS (
          SELECT lock_date, COALESCE(SUM(quantity), 0)::int AS locked_qty
          FROM public.temporary_locks
          WHERE room_id = $1 AND lock_expires_at > NOW()
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
        SELECT days.day
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

    // Tính toán số tiền
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

    // Tạo booking
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
        'pending'::public.booking_status_enum, 'unpaid'::public.booking_payment_status_enum,
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

    // Lưu booking_room và temporary_locks
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

      const insertLockSql = `
        INSERT INTO public.temporary_locks (
          id, room_id, user_id, session_id, lock_date, quantity, 
          lock_expires_at, booking_id, created_at, expires_at
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
          NOW(), 
          NOW() + INTERVAL '15 minutes'
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

    // 🌟 LẤY TÀI KHOẢN NGÂN HÀNG CỦA OWNER KHÁCH SẠN ĐỂ TẠO VIETQR ĐỘNG
    const ownerBank = await getHotelOwnerBankInfo(client, hotel_id);

    const qrUrl = `https://img.vietqr.io/image/${ownerBank.bankId}-${ownerBank.accountNumber}-compact2.png?amount=${amountToPayNow}&addInfo=${bookingCode}&accountName=${encodeURIComponent(ownerBank.accountName)}`;

    const paymentInsertSql = `
      INSERT INTO public.payment (
        id, booking_id, payment_method, expected_amount, paid_amount, 
        qr_code, qr_content, status, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, 'VietQR', $2, 0, 
        $3, $4, 'pending'::public.payment_status_enum, NOW(), NOW()
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
      message: "Khởi tạo đơn đặt phòng thành công!",
      booking_code: newBooking.booking_code,
      payment: payRes.rows[0],
      qr_code: qrUrl,
      qr_content: bookingCode,
      bank_info: ownerBank, // Gửi thông tin ngân hàng Owner về cho giao diện
    });
  } catch (error) {
    await client.query("ROLLBACK");
    client.release();
    console.error("❌ LỖI CREATE_BOOKING:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ─── 2. TRA CỨU ĐƠN & THÔNG TIN NGÂN HÀNG OWNER ───
async function getBookingByCode(req, res, next) {
  try {
    const { code } = req.params;
    const result = await pool.query(
      `SELECT 
         b.*, 
         h.name AS hotel_name, 
         h.address AS hotel_address, 
         h.city AS hotel_city,
         COALESCE(h.bank_code, u.bank_code, 'MB') AS bank_id,
         COALESCE(h.bank_name, u.bank_name, 'MBBank') AS bank_name,
         COALESCE(h.bank_account, u.bank_account, '0833404928') AS bank_account,
         COALESCE(h.bank_account_holder, u.bank_account_holder, h.name, 'GOSTAY PARTNER') AS bank_account_holder,
         COALESCE((SELECT br.room_name FROM public.booking_room br WHERE br.booking_id = b.id LIMIT 1), 'Phòng tiêu chuẩn') AS room_name,
         COALESCE(p.paid_amount, 0) AS paid_amount,
         COALESCE(p.expected_amount, b.total_price) AS expected_amount,
         p.status AS payment_status_record,
         p.qr_code,
         p.qr_content
       FROM public.booking b
       JOIN public.hotel h ON h.id = b.hotel_id
       LEFT JOIN public.users u ON u.id = h.owner_id
       LEFT JOIN public.payment p ON p.booking_id = b.id
       WHERE b.booking_code ILIKE $1 OR b.id::text = $2
       LIMIT 1`,
      [`%${code}%`, code],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy đơn đặt phòng." });
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

    const ownerBank = {
      bankId: (row.bank_id || "MB").toUpperCase(),
      bankName: row.bank_name || "MBBank",
      accountNumber: row.bank_account || "0833404928",
      accountName: (row.bank_account_holder || "GOSTAY PARTNER").toUpperCase(),
    };

    return res.json({
      success: true,
      booking: {
        ...row,
        payment_type: isDep ? "DEPOSIT_30" : "FULL",
        deposit_amount: dep,
        remaining_amount: rem,
      },
      bank_info: ownerBank,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ─── 3. HỦY ĐƠN & GIẢI PHÓNG PHÒNG ───
async function cancelBooking(req, res, next) {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    await client.query("BEGIN");

    const result = await client.query(
      `UPDATE public.booking
       SET status = 'cancelled'::public.booking_status_enum,
           cancelled_at = NOW(),
           updated_at = NOW()
       WHERE id::text = $1 OR booking_code ILIKE $2
       RETURNING *`,
      [id, `%${id}%`],
    );

    if (result.rows.length === 0) {
      await client.query("ROLLBACK");
      client.release();
      return res.status(404).json({ message: "Không tìm thấy đơn cần hủy." });
    }

    const cancelledBooking = result.rows[0];

    // Xóa ngay khóa phòng trong temporary_locks để nhường cho khách khác
    await client.query(
      `DELETE FROM public.temporary_locks WHERE booking_id = $1`,
      [cancelledBooking.id],
    );

    await client.query("COMMIT");
    client.release();

    return res.json({
      success: true,
      message: "Đã hủy đơn và giải phóng phòng thành công!",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    client.release();
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ─── 4. CONFIRM PAYMENT & GET MY BOOKINGS ───
async function confirmPayment(req, res, next) {
  const client = await pool.connect();
  try {
    const rawCode = req.body.booking_code || req.body.code;
    if (!rawCode) {
      client.release();
      return res.status(400).json({ message: "Thiếu mã đơn đặt phòng." });
    }

    await client.query("BEGIN");
    const bookingRes = await client.query(
      `SELECT * FROM public.booking WHERE booking_code ILIKE $1 FOR UPDATE`,
      [`%${rawCode}%`],
    );

    if (bookingRes.rows.length === 0) {
      await client.query("ROLLBACK");
      client.release();
      return res.status(404).json({ message: "Không tìm thấy đơn." });
    }

    const b = bookingRes.rows[0];
    await client.query(
      `UPDATE public.booking SET payment_status = 'paid', status = 'confirmed', updated_at = NOW() WHERE id = $1`,
      [b.id],
    );
    await client.query(
      `UPDATE public.payment SET status = 'paid', paid_amount = expected_amount, paid_at = NOW() WHERE booking_id = $1`,
      [b.id],
    );
    await client.query(
      `DELETE FROM public.temporary_locks WHERE booking_id = $1`,
      [b.id],
    );

    await client.query("COMMIT");
    client.release();

    return res.json({ success: true, message: "Thanh toán thành công!" });
  } catch (err) {
    await client.query("ROLLBACK");
    client.release();
    return res.status(500).json({ success: false, message: err.message });
  }
}

async function getMyBookings(req, res) {
  try {
    const userId = req.user?.id || req.user?.userId;
    const result = await pool.query(
      `SELECT b.*, h.name as hotel_name FROM public.booking b JOIN public.hotel h ON h.id = b.hotel_id WHERE b.user_id = $1 ORDER BY b.created_at DESC`,
      [userId],
    );
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = {
  createBooking,
  confirmPayment,
  getBookingByCode,
  getMyBookings,
  cancelBooking,
};
