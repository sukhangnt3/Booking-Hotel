const crypto = require("crypto");
const pool = require("../config/database");

// 🌟 BẢNG MÃ BIN NAPAS 6 CHỮ SỐ CHUẨN QUỐC GIA (KHÔNG BAO GIỜ BỊ LỖI QR)
const NAPAS_BANK_BINS = {
  VCB: "970436",
  VIETCOMBANK: "970436",
  MB: "970422",
  MBB: "970422",
  MBBANK: "970422",
  TCB: "970407",
  TECHCOMBANK: "970407",
  ICB: "970415",
  CTG: "970415",
  VIETINBANK: "970415",
  BIDV: "970418",
  ACB: "970416",
  VPB: "970432",
  VPBANK: "970432",
  TPB: "970423",
  TPBANK: "970423",
  STB: "970403",
  SACOMBANK: "970403",
  VBA: "970405",
  AGRIBANK: "970405",
};

// 👑 TÀI KHOẢN TRUNG TÂM CỦA ADMIN / SÀN GOSTAY (TIỀN PHẢI VỀ ĐÂY ĐỂ ADMIN GIỮ HOA HỒNG)
const PLATFORM_ADMIN_BANK = {
  bankId: "970422",
  bankCode: "MB",
  bankName: "Ngân hàng TMCP Quân Đội (MBBank)",
  accountNumber: "0833404928",
  accountName: "SU TRACH KHANG",
};

async function getOwnerBankAccount(hotelId) {
  if (!hotelId) return PLATFORM_ADMIN_BANK;
  try {
    const res = await pool.query(
      `SELECT bank_code, bank_name, bank_account, bank_account_holder, name
       FROM public.hotel
       WHERE id::text = $1::text
       LIMIT 1`,
      [hotelId],
    );

    if (res.rows.length > 0) {
      const row = res.rows[0];
      const cleanAcc = String(row.bank_account || "").replace(/\D/g, "");

      if (cleanAcc.length >= 6) {
        const rawCode = String(row.bank_code || row.bank_name || "VCB")
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, "");
        const binCode = NAPAS_BANK_BINS[rawCode] || rawCode || "970436";

        return {
          bankId: binCode,
          bankName: row.bank_name || "Ngân hàng",
          accountNumber: cleanAcc,
          accountName: String(
            row.bank_account_holder || row.name || "CHỦ KHÁCH SẠN",
          )
            .toUpperCase()
            .trim(),
        };
      }
    }
  } catch (err) {
    console.warn("⚠️ getOwnerBankAccount fallback:", err.message);
  }
  return PLATFORM_ADMIN_BANK;
}

async function cleanupExpiredLocks() {
  try {
    await pool.query(
      `DELETE FROM public.temporary_locks 
       WHERE (lock_expires_at IS NOT NULL AND lock_expires_at < NOW())
          OR (expires_at IS NOT NULL AND expires_at < NOW())`,
    );
  } catch (e) {
    // Bỏ qua nếu bảng chưa có cột
  }
}

// ─── 1. TẠO ĐƠN ĐẶT PHÒNG & TỰ ĐỘNG CẮT HOA HỒNG CHO ADMIN ───
async function createBooking(req, res, next) {
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

    // 🌟 1. LẤY TỶ LỆ HOA HỒNG (% COMMISSION) ĐÃ THIẾT LẬP CỦA KHÁCH SẠN NÀY
    const hotelQueryRes = await client.query(
      `SELECT id, name, commission_rate, bank_code, bank_name, bank_account, bank_account_holder 
       FROM public.hotel 
       WHERE id = $1 LIMIT 1`,
      [hotel_id],
    );

    if (hotelQueryRes.rows.length === 0) {
      await client.query("ROLLBACK");
      client.release();
      return res.status(404).json({
        success: false,
        message: "Khách sạn không tồn tại trên hệ thống.",
      });
    }

    const hotelData = hotelQueryRes.rows[0];
    const commissionRate = Number(hotelData.commission_rate ?? 18.0); // Mặc định 18% nếu chưa gán

    // 🌟 2. KIỂM TRA PHÒNG TRỐNG VÀ XUNG ĐỘT PHÒNG
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
          WHERE room_id = $1 AND (
            (lock_expires_at IS NOT NULL AND lock_expires_at > NOW())
            OR (expires_at IS NOT NULL AND expires_at > NOW())
          )
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

    // 🌟 3. TÍNH TOÁN DÒNG TIỀN HOA HỒNG (ADMIN ĂN HOA HỒNG TẠI ĐÂY)
    const newBookingId = crypto.randomUUID();
    const bookingCode = "BK" + Math.floor(10000000 + Math.random() * 90000000);
    const finalPrice = Math.round(Number(total_price || 650000));
    const discountVal = Math.round(Number(discount || 0));
    const subtotalVal = finalPrice + discountVal;

    // Tiền hoa hồng Admin thu về: Ví dụ 1.000.000đ * 18% = 180.000đ
    const adminCommission = Math.round((finalPrice * commissionRate) / 100);
    // Tiền sàn sẽ quyết toán cho Owner sau này: 1.000.000đ - 180.000đ = 820.000đ
    const hotelPayout = finalPrice - adminCommission;

    const isDeposit = payment_type === "DEPOSIT_30";
    const depAmount = isDeposit
      ? Math.round(Number(deposit_amount) || finalPrice * 0.3)
      : finalPrice;
    const remAmount = isDeposit ? finalPrice - depAmount : 0;
    const amountToPayNow = Math.round(Number(expected_amount) || depAmount);

    // 🌟 4. INSERT VÀO BẢNG BOOKING (LƯU CHUẨN XÁC hotel_payout THAY VÌ 0)
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
        $15, $16, NOW(), NOW()
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
      hotelPayout, // 💰 GHI RÕ TIỀN SẼ TRẢ CHO OWNER VÀO ĐÂY
    ]);

    const newBooking = insertRes.rows[0];

    // LƯU CHI TIẾT PHÒNG
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

      const tlColsRes = await client.query(
        `SELECT column_name 
         FROM information_schema.columns 
         WHERE table_schema = 'public' AND table_name = 'temporary_locks'`,
      );
      const tlCols = tlColsRes.rows.map((r) => r.column_name.toLowerCase());

      const lockCols = [
        "id",
        "room_id",
        "user_id",
        "session_id",
        "lock_date",
        "quantity",
        "booking_id",
        "created_at",
      ];
      const selectCols = [
        "gen_random_uuid()",
        "$1",
        "$2",
        "$3",
        "d::date",
        "$4",
        "$5",
        "NOW()",
      ];

      if (tlCols.includes("lock_expires_at")) {
        lockCols.push("lock_expires_at");
        selectCols.push("NOW() + INTERVAL '15 minutes'");
      }
      if (tlCols.includes("expires_at")) {
        lockCols.push("expires_at");
        selectCols.push("NOW() + INTERVAL '15 minutes'");
      }

      const insertLockSql = `
        INSERT INTO public.temporary_locks (${lockCols.join(", ")})
        SELECT ${selectCols.join(", ")}
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

    // 🌟 5. TẠO MÃ VIETQR VỀ TÀI KHOẢN ADMIN ĐỂ THU TIỀN VÀ GIỮ HOA HỒNG
    const paymentBank = PLATFORM_ADMIN_BANK;

    const qrUrl = `https://img.vietqr.io/image/${paymentBank.bankId}-${paymentBank.accountNumber}-compact2.png?amount=${amountToPayNow}&addInfo=${bookingCode}&accountName=${encodeURIComponent(paymentBank.accountName)}`;

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
        commission_rate: commissionRate,
        commission_amount: adminCommission, // Số tiền Admin hưởng
        hotel_payout: hotelPayout, // Số tiền chuyển trả Owner sau này
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
      bankInfo: paymentBank,
      lock_expires_in_seconds: 15 * 60,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    client.release();
    console.error("❌ LỖI CREATE_BOOKING:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ─── 2. HÀM CONFIRM PAYMENT (XÁC NHẬN TIỀN ĐÃ VÀO VÍ ADMIN) ───
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
      const paymentBank = PLATFORM_ADMIN_BANK;
      const qrUrl = `https://img.vietqr.io/image/${paymentBank.bankId}-${paymentBank.accountNumber}-compact2.png?amount=${actualPaid}&addInfo=${booking.booking_code}&accountName=${encodeURIComponent(paymentBank.accountName)}`;
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

    await client.query(
      `DELETE FROM public.temporary_locks WHERE booking_id = $1`,
      [booking.id],
    );

    await client.query("COMMIT");
    client.release();

    return res.json({
      success: true,
      message:
        "✓ Xác nhận thanh toán thành công! Tiền đã ghi nhận vào tài khoản Admin.",
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

// ─── 3. TRA CỨU ĐƠN ĐẶT PHÒNG THEO MÃ (HIỂN THỊ CẢ HOA HỒNG & TIỀN OWNER) ───
async function getBookingByCode(req, res, next) {
  try {
    const { code } = req.params;
    const result = await pool.query(
      `SELECT 
         b.*, 
         h.name AS hotel_name, 
         h.address AS hotel_address, 
         h.city AS hotel_city,
         h.commission_rate,
         (b.total_price - COALESCE(b.hotel_payout, 0)) AS commission_amount,
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

    const paymentBank = PLATFORM_ADMIN_BANK;
    const ownerBank = await getOwnerBankAccount(row.hotel_id);

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
      bankInfo: paymentBank, // Tài khoản nhận tiền (Admin)
      ownerBankInfo: ownerBank, // Tài khoản để Admin chuyển khoản trả cho Owner sau này
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
