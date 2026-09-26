// backend/controllers/booking.controller.js
const crypto = require("crypto");
const pool = require("../config/database");

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

const PLATFORM_ADMIN_BANK = {
  bankId: "970422",
  bankCode: "MB",
  bankName: "Ngân hàng TMCP Quân Đội (MBBank)",
  accountNumber: "0833404928",
  accountName: "SU TRACH KHANG",
};

// 🌟 HÀM FORMAT NGÀY AN TOÀN TUYỆT ĐỐI (KHÔNG DÙNG toISOString() TRÁNH LỆCH MÚI GIỜ)
function formatLocalDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(dateVal, days) {
  let dt;
  if (typeof dateVal === "string") {
    const [y, m, d] = dateVal.slice(0, 10).split("-").map(Number);
    dt = new Date(y, m - 1, d);
  } else {
    dt = new Date(dateVal);
  }
  dt.setDate(dt.getDate() + days);
  return formatLocalDate(dt);
}

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
  } catch (e) {}
}

// ─── 1. TẠO ĐƠN ĐẶT PHÒNG (CHẶN OVERBOOKING CHUẨN THỜI GIAN THỰC) ───
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
      checkin_time,
      checkInTime,
      checkout_time,
      checkOutTime,
      rental_type = "DAY",
      rentalType,
      hours,
      total_price,
      adults,
      adult_total,
      children,
      children_total,
      quantity = 1,
      customer_name,
      guest_phone,
      guest_email,
      special_require,
      payment_type = "FULL",
      deposit_amount = 0,
      remaining_amount = 0,
      expected_amount,
      booking_type = "online",
      source = "online",
      is_walk_in = false,
      is_check_in_now = false,
      customer_paid = 0,
    } = req.body;

    const finalCheckInTime = String(checkin_time || checkInTime || "14:00")
      .trim()
      .slice(0, 5);
    const finalCheckOutTime = String(checkout_time || checkOutTime || "12:00")
      .trim()
      .slice(0, 5);
    const currentRentalType = String(
      rental_type || rentalType || "DAY",
    ).toUpperCase();

    if (!hotel_id || !checkin_date || !checkout_date) {
      client.release();
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin khách sạn hoặc ngày lưu trú.",
      });
    }

    const inDateStr = String(checkin_date).slice(0, 10);
    let outDateStr = String(checkout_date).slice(0, 10);

    const formattedInTime =
      finalCheckInTime.length === 5 ? `${finalCheckInTime}:00` : "14:00:00";
    const formattedOutTime =
      finalCheckOutTime.length === 5 ? `${finalCheckOutTime}:00` : "12:00:00";

    const inHourNum = parseInt(finalCheckInTime.slice(0, 2), 10);

    // 🌟 ĐỒNG BỘ MỐC GIỜ THUÊ LINH HOẠT (ĐÃ FIX LỖI TỤT NGÀY DO UTC)
    if (currentRentalType === "HOUR" || currentRentalType === "HALF_DAY") {
      const inTs = new Date(`${inDateStr}T${formattedInTime}`).getTime();
      let outTs = new Date(`${outDateStr}T${formattedOutTime}`).getTime();
      if (outTs <= inTs) {
        outDateStr = addDays(inDateStr, 1);
      }
    } else if (currentRentalType === "OVERNIGHT") {
      // Ca rạng sáng (00h - 06h): Cùng ngày hôm đó trả phòng lúc 11:00
      if (inHourNum >= 0 && inHourNum <= 6) {
        outDateStr = inDateStr;
      } else {
        // Ca tối: Trả phòng trưa ngày hôm sau
        outDateStr = addDays(inDateStr, 1);
      }
    } else {
      if (new Date(outDateStr) < new Date(inDateStr)) {
        client.release();
        return res.status(400).json({
          success: false,
          message: "Ngày trả phòng phải sau ngày nhận phòng.",
        });
      }
    }

    const finalAdults = Math.max(
      1,
      Number(adult_total ?? adults ?? req.body.adult ?? 1),
    );
    const finalChildren = Math.max(
      0,
      Number(children_total ?? children ?? req.body.child ?? 0),
    );

    const bookingQty = Math.max(1, Number(quantity) || 1);

    await client.query("BEGIN");

    // Đảm bảo bảng booking có đủ các cột cần thiết kể cả cọc
    await client
      .query(
        `
      ALTER TABLE public.booking 
      ADD COLUMN IF NOT EXISTS checkin_time TIME WITHOUT TIME ZONE DEFAULT '14:00:00',
      ADD COLUMN IF NOT EXISTS checkout_time TIME WITHOUT TIME ZONE DEFAULT '12:00:00',
      ADD COLUMN IF NOT EXISTS rental_type VARCHAR(50) DEFAULT 'DAY',
      ADD COLUMN IF NOT EXISTS payment_type VARCHAR(50) DEFAULT 'FULL',
      ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC DEFAULT 0;
    `,
      )
      .catch(() => {});

    // Lấy thông tin khách sạn và buffer dọn phòng
    const hotelQueryRes = await client.query(
      `SELECT id, name, commission_rate, bank_code, bank_name, bank_account, bank_account_holder,
              COALESCE(hourly_grace_minutes, 15) AS cleaning_buffer_minutes
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
    const cleaningBufferMinutes = Math.max(
      15,
      Number(hotelData.cleaning_buffer_minutes || 15),
    );

    const isWalkInBooking =
      Boolean(is_walk_in) ||
      booking_type === "walk_in" ||
      booking_type === "counter" ||
      source === "walk_in" ||
      source === "counter";

    const commissionRate = isWalkInBooking
      ? 0
      : Number(hotelData.commission_rate ?? 18.0);

    if (room_id) {
      const roomStockRes = await client.query(
        `SELECT r.id, r.name, r.base_price,
                COALESCE(
                  NULLIF((SELECT COUNT(ru.id)::int FROM public.room_unit ru WHERE ru.room_id = r.id), 0),
                  r.amount,
                  1
                ) AS total_stock
         FROM public.room r
         WHERE r.id = $1 AND COALESCE(r.is_active, true) = true 
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
      const maxStock = Number(roomData.total_stock);

      const localInTimestampStr = `${inDateStr} ${formattedInTime}`;
      const localOutTimestampStr = `${outDateStr} ${formattedOutTime}`;

      const conflictCheckSql = `
        SELECT COALESCE(SUM(br.quantity), 0)::int AS booked_count
        FROM public.booking b
        JOIN public.booking_room br ON br.booking_id = b.id
        WHERE br.room_id = $1
          AND b.status NOT IN ('checked_out', 'cancelled')
          AND (
            b.status IN ('confirmed', 'checked_in')
            OR (
              b.status = 'pending' 
              AND (b.payment_status IN ('paid', 'partially_paid') OR COALESCE(b.deposit_amount, 0) > 0 OR b.created_at >= NOW() - INTERVAL '15 minutes')
            )
          )
          AND (
            $2::timestamp < (b.checkout_date + COALESCE(b.checkout_time, '12:00:00'::time) + ($4 || ' minutes')::interval)
            AND $3::timestamp > (b.checkin_date + COALESCE(b.checkin_time, '14:00:00'::time))
          );
      `;

      const conflictRes = await client.query(conflictCheckSql, [
        room_id,
        localInTimestampStr,
        localOutTimestampStr,
        cleaningBufferMinutes,
      ]);

      const currentlyBooked = Number(conflictRes.rows[0]?.booked_count || 0);

      if (currentlyBooked + bookingQty > maxStock) {
        await client.query("ROLLBACK");
        client.release();
        return res.status(400).json({
          success: false,
          message: `Rất tiếc! Hạng phòng "${roomData.name}" hiện đã có khách đặt kín từ ${finalCheckInTime} đến ${finalCheckOutTime} (kèm ${cleaningBufferMinutes} phút vệ sinh dọn phòng). Vui lòng chọn khung giờ khác!`,
        });
      }
    }

    const newBookingId = crypto.randomUUID();
    const bookingCodePrefix = isWalkInBooking ? "DP" : "BK";
    const bookingCode =
      bookingCodePrefix + Math.floor(10000000 + Math.random() * 90000000);

    const finalPrice = Math.round(Number(total_price || 650000));
    const discountVal = Math.round(Number(discount || 0));
    const subtotalVal = finalPrice + discountVal;

    const adminCommission = isWalkInBooking
      ? 0
      : Math.round((finalPrice * commissionRate) / 100);
    const hotelPayout = finalPrice - adminCommission;

    const isDeposit = payment_type === "DEPOSIT_30";
    const depAmount = isDeposit
      ? Math.round(Number(deposit_amount) || finalPrice * 0.3)
      : 0;
    const remAmount = isDeposit ? finalPrice - depAmount : 0;
    const amountToPayNow = Math.round(
      Number(expected_amount) || (isDeposit ? depAmount : finalPrice),
    );

    let initialStatus = "pending";
    let initialPaymentStatus = "unpaid";

    if (isWalkInBooking) {
      initialStatus = is_check_in_now ? "checked_in" : "confirmed";
      initialPaymentStatus =
        Number(customer_paid) >= finalPrice ? "paid" : "unpaid";
    }

    const insertBookingSql = `
      INSERT INTO public.booking (
        id, booking_code, user_id, hotel_id, promotion_id,
        checkin_date, checkout_date, checkin_time, checkout_time, rental_type,
        adult_total, children_total, customer_name, guest_email, guest_phone, special_require,
        status, payment_status, subtotal, discount, service_total,
        total_price, hotel_payout, payment_type, deposit_amount,
        room_number, receptionist_assigned, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6::date, $7::date, $8::time, $9::time, $10,
        $11, $12, $13, $14, $15, $16,
        $17, $18, $19, $20, 0,
        $21, $22, $23, $24,
        NULL, false, NOW(), NOW()
      ) RETURNING *;
    `;

    const insertRes = await client.query(insertBookingSql, [
      newBookingId,
      bookingCode,
      userId,
      hotel_id,
      promotion_id || null,
      inDateStr,
      outDateStr,
      formattedInTime,
      formattedOutTime,
      currentRentalType,
      finalAdults,
      finalChildren,
      customer_name ||
        (isWalkInBooking ? "Khách lẻ tại quầy" : "Khách đặt trực tuyến"),
      guest_email ||
        req.user?.email ||
        (isWalkInBooking ? "walkin@hotel.local" : "guest@gostay.vn"),
      guest_phone || "0900000000",
      special_require || null,
      initialStatus,
      initialPaymentStatus,
      subtotalVal,
      discountVal,
      finalPrice,
      hotelPayout,
      payment_type,
      depAmount,
    ]);

    const newBooking = insertRes.rows[0];

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
        [newBooking.id, room_id, roomName, inDateStr, bookingQty, roomPrice],
      );
    }

    let qrUrl = null;
    let payRecord = null;
    const paymentBank = PLATFORM_ADMIN_BANK;

    if (!isWalkInBooking) {
      qrUrl = `https://img.vietqr.io/image/${paymentBank.bankId}-${paymentBank.accountNumber}-compact2.png?amount=${amountToPayNow}&addInfo=${bookingCode}&accountName=${encodeURIComponent(paymentBank.accountName)}`;

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
      payRecord = payRes.rows[0];
    }

    await client.query("COMMIT");
    client.release();

    return res.status(201).json({
      success: true,
      message: "Khởi tạo đơn đặt phòng thành công!",
      booking: {
        ...newBooking,
        commission_rate: commissionRate,
        commission_amount: adminCommission,
        hotel_payout: hotelPayout,
        payment_type: payment_type,
        deposit_amount: depAmount,
        remaining_amount: remAmount,
        is_walk_in: isWalkInBooking,
      },
      booking_code: newBooking.booking_code,
      deposit_amount: depAmount,
      remaining_amount: remAmount,
      payment_type: payment_type,
      payment: payRecord,
      qr_code: qrUrl,
      qr_content: bookingCode,
      bankInfo: paymentBank,
      lock_expires_in_seconds: isWalkInBooking ? 0 : 15 * 60,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    client.release();
    console.error("❌ LỖI CREATE_BOOKING:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ─── 2. XÁC NHẬN THANH TOÁN (TỰ ĐỘNG CHUYỂN SANG CONFIRMED KHI NHẬN TIỀN) ───
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

    const isDeposit = booking.payment_type === "DEPOSIT_30";
    const isPaidFull = actualPaid >= Number(booking.total_price);
    const newPayStatus = isPaidFull
      ? "paid"
      : isDeposit
        ? "partially_paid"
        : "paid";

    // 🌟 KHI ĐÃ NHẬN TIỀN (FULL HOẶC CỌC 30%): CHUYỂN SANG CONFIRMED ĐỂ KHÓA GIỮ PHÒNG CHÍNH THỨC
    await client.query(
      `UPDATE public.booking
       SET payment_status = $1,
           deposit_amount = CASE WHEN $2 THEN $3 ELSE deposit_amount END,
           status = 'confirmed'::public.booking_status_enum,
           cancelled_at = NULL,
           receptionist_assigned = false,
           confirmed_at = NOW(),
           updated_at = NOW()
       WHERE id = $4`,
      [newPayStatus, isDeposit, actualPaid, booking.id],
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
    }

    await client
      .query(`DELETE FROM public.temporary_locks WHERE booking_id = $1`, [
        booking.id,
      ])
      .catch(() => {});

    await client.query("COMMIT");
    client.release();

    return res.json({
      success: true,
      message: "✓ Xác nhận thanh toán thành công và đã giữ phòng chính thức!",
      bookingCode: booking.booking_code,
      paidAmount: actualPaid,
      status: newPayStatus,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    client.release();
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ─── 3. TRA CỨU ĐƠN ĐẶT PHÒNG THEO MÃ ───
async function getBookingByCode(req, res, next) {
  try {
    const { code } = req.params;
    const result = await pool.query(
      `SELECT 
         b.*, 
         COALESCE(b.checkin_time, '14:00:00'::time) AS checkin_time,
         COALESCE(b.checkout_time, '12:00:00'::time) AS checkout_time,
         COALESCE(b.rental_type, 'DAY') AS rental_type,
         COALESCE(b.payment_type, 'FULL') AS payment_type,
         COALESCE(b.deposit_amount, 0) AS deposit_amount,
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

    const isWalkIn =
      row.booking_type === "walk_in" ||
      row.source === "walk_in" ||
      row.source === "counter" ||
      String(row.booking_code).startsWith("DP");

    const isDep =
      row.payment_type === "DEPOSIT_30" ||
      (!isWalkIn &&
        ((expAmount > 0 && expAmount < total) ||
          (paidMoney > 0 && paidMoney < total)));

    const dep = isDep
      ? Number(row.deposit_amount) > 0
        ? Number(row.deposit_amount)
        : paidMoney > 0
          ? paidMoney
          : expAmount
      : isWalkIn
        ? paidMoney
        : total;
    const rem = isDep ? total - dep : isWalkIn ? total - paidMoney : 0;

    const paymentBank = PLATFORM_ADMIN_BANK;
    const ownerBank = await getOwnerBankAccount(row.hotel_id);

    const finalBooking = {
      ...row,
      is_walk_in: isWalkIn,
      commission_rate: isWalkIn ? 0 : row.commission_rate,
      commission_amount: isWalkIn ? 0 : Number(row.commission_amount || 0),
      payment_type: isDep ? "DEPOSIT_30" : "FULL",
      deposit_amount: dep,
      remaining_amount: rem,
    };

    return res.json({
      success: true,
      booking: finalBooking,
      data: finalBooking,
      bankInfo: paymentBank,
      ownerBankInfo: ownerBank,
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
         COALESCE(b.checkin_time, '14:00:00'::time) AS checkin_time,
         COALESCE(b.checkout_time, '12:00:00'::time) AS checkout_time,
         COALESCE(b.rental_type, 'DAY') AS rental_type,
         COALESCE(b.payment_type, 'FULL') AS payment_type,
         COALESCE(b.deposit_amount, 0) AS deposit_amount,
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

// ─── 5. HỦY ĐƠN (ĐÃ BẢO VỆ CHẶT CHẼ: TUYỆT ĐỐI KHÔNG HỦY ĐƠN ĐÃ THANH TOÁN HOẶC ĐÃ CỌC) ───
async function cancelBooking(req, res, next) {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    await client.query("BEGIN");

    // 🌟 CHỈ CHO PHÉP HỦY NẾU ĐƠN ĐANG PENDING VÀ CHƯA THANH TOÁN / CHƯA CỌC
    const result = await client.query(
      `UPDATE public.booking
       SET status = 'cancelled',
           cancelled_at = NOW(),
           updated_at = NOW()
       WHERE (id::text = $1 OR booking_code ILIKE $2)
         AND status = 'pending'
         AND (payment_status IS NULL OR payment_status NOT IN ('paid', 'partially_paid'))
         AND COALESCE(deposit_amount, 0) = 0
       RETURNING *`,
      [id, `%${id}%`],
    );

    if (result.rows.length === 0) {
      await client.query("ROLLBACK");
      client.release();
      return res.status(400).json({
        success: false,
        message:
          "Không thể hủy đơn: Đơn không tồn tại, đã thanh toán thành công hoặc đã bị hủy trước đó.",
      });
    }

    const cancelledBooking = result.rows[0];

    await client
      .query(`DELETE FROM public.temporary_locks WHERE booking_id = $1`, [
        cancelledBooking.id,
      ])
      .catch(() => {});

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
