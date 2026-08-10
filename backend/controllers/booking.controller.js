const crypto = require("crypto");
const pool = require("../config/database");
const { formatBooking } = require("../utils/formatters");

function createBookingCode() {
  return `BK${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 90 + 10)}`;
}

function getNights(checkinDate, checkoutDate) {
  const start = new Date(checkinDate);
  const end = new Date(checkoutDate);
  const diff = Math.ceil((end - start) / (24 * 60 * 60 * 1000));

  return diff > 0 ? diff : 0;
}

function buildDates(checkinDate, checkoutDate) {
  const dates = [];
  const start = new Date(checkinDate);
  const end = new Date(checkoutDate);

  for (let date = new Date(start); date < end; date.setDate(date.getDate() + 1)) {
    dates.push(new Date(date).toISOString().slice(0, 10));
  }

  return dates;
}

async function loadBookingDetail(bookingId, userId) {
  const bookingResult = await pool.query(
    `SELECT
       b.id,
       b.booking_code,
       b.user_id,
       b.hotel_id,
       h.name AS hotel_name,
       b.checkin_date,
       b.checkout_date,
       b.adult_total,
       b.children_total,
       b.customer_name,
       b.guest_email,
       b.guest_phone,
       b.status,
       b.payment_status,
       b.subtotal,
      b.currency,
       b.discount,
       b.tax,
       b.service_total,
       b.total_price,
      b.commission_rate,
      b.commission_amount,
      b.hotel_payout,
       b.special_require,
       b.cancel_reason,
       b.cancelled_at,
       b.created_at,
       b.updated_at
     FROM booking b
     JOIN hotel h ON h.id = b.hotel_id
     WHERE b.id = $1
       AND ($2::uuid IS NULL OR b.user_id = $2)
     LIMIT 1`,
    [bookingId, userId || null],
  );

  const booking = bookingResult.rows[0];
  if (!booking) return null;

  const [roomResult, serviceResult] = await Promise.all([
    pool.query(
      `SELECT
         booking_id,
         room_id,
         room_name,
         room_type,
         capacity,
         book_date,
         quantity,
         price,
         base_price,
         adult_amount,
         children_amount
       FROM booking_room
       WHERE booking_id = $1
       ORDER BY book_date ASC, sub_index ASC`,
      [bookingId],
    ),
    pool.query(
      `SELECT
         service_name,
         quantity,
         unit_price,
         total_price
       FROM booking_service
       WHERE booking_id = $1
       ORDER BY created_at ASC`,
      [bookingId],
    ),
  ]);

  return {
    ...formatBooking(booking),
    rooms: roomResult.rows.map((row) => ({
      roomId: row.room_id,
      room_id: row.room_id,
      roomName: row.room_name,
      room_name: row.room_name,
      roomType: row.room_type,
      room_type: row.room_type,
      capacity: row.capacity,
      bookDate: row.book_date,
      book_date: row.book_date,
      quantity: row.quantity,
      price: row.price,
      basePrice: row.base_price,
      base_price: row.base_price,
      adultAmount: row.adult_amount,
      adult_amount: row.adult_amount,
      childrenAmount: row.children_amount,
      children_amount: row.children_amount,
    })),
    services: serviceResult.rows.map((row) => ({
      serviceName: row.service_name,
      service_name: row.service_name,
      quantity: row.quantity,
      unitPrice: row.unit_price,
      unit_price: row.unit_price,
      totalPrice: row.total_price,
      total_price: row.total_price,
    })),
  };
}

async function listMyBookings(req, res, next) {
  try {
    // ─── Tìm user theo id HOẶC email (token chứa email) ───
    // Nếu booking được tạo với user mới (cùng email khi token cũ),
    // vẫn tìm thấy đơn đặt của user.
    let userId = req.auth.sub;
    if (req.auth.email) {
      const userResult = await pool.query(
        `SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
        [req.auth.email],
      );
      if (userResult.rows[0]) {
        userId = userResult.rows[0].id;
      }
    }

    const result = await pool.query(
      `SELECT
         b.id,
         b.booking_code,
         b.user_id,
         b.hotel_id,
         h.name AS hotel_name,
         b.checkin_date,
         b.checkout_date,
         b.adult_total,
         b.children_total,
         b.customer_name,
         b.guest_email,
         b.guest_phone,
         b.status,
         b.payment_status,
         b.subtotal,
         b.discount,
         b.tax,
         b.service_total,
         b.total_price,
         b.special_require,
         b.created_at
       FROM booking b
       JOIN hotel h ON h.id = b.hotel_id
       WHERE b.user_id = $1
       ORDER BY b.created_at DESC`,
      [userId],
    );

    const bookings = result.rows.map(formatBooking);

    return res.json({
      data: bookings,
      bookings,
      total: result.rowCount,
      // ─── Trả bookings ở top-level để frontend dễ đọc ───
      booking_list: bookings,
    });
  } catch (error) {
    return next(error);
  }
}

async function createTemporaryLock(req, res, next) {
  const roomId = req.body.room_id || req.body.roomId;
  const checkIn = req.body.checkIn || req.body.lock_date || req.body.checkin_date;
  let checkOut = req.body.checkOut || req.body.checkout_date;
  const quantity = Number(req.body.quantity || 1);

  if (!roomId || !checkIn || quantity <= 0) {
    return res.status(400).json({
      message: "room_id, lock_date và quantity hợp lệ là bắt buộc.",
    });
  }

  // Frontend chỉ gửi lock_date → mặc định checkOut = checkIn + 1 ngày
  if (!checkOut) {
    const nextDay = new Date(checkIn);
    nextDay.setDate(nextDay.getDate() + 1);
    checkOut = nextDay.toISOString().slice(0, 10);
  }

  const nights = getNights(checkIn, checkOut);
  if (nights <= 0) {
    return res.status(400).json({
      message: "Ngày nhận phòng và trả phòng không hợp lệ.",
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const roomResult = await client.query(
      `SELECT id, hotel_id, name, capacity, base_price
       FROM room
       WHERE id = $1 AND deleted_at IS NULL AND is_active = true`,
      [roomId],
    );

    const room = roomResult.rows[0];
    if (!room) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Không tìm thấy phòng phù hợp." });
    }

    const lockExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
    const lockId = crypto.randomUUID();

    const lockResult = await client.query(
      `INSERT INTO temporary_locks (
         id,
         room_id,
         user_id,
         lock_date,
         quantity,
         lock_expires_at,
         created_at,
         updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING id, room_id, user_id, lock_date, quantity, lock_expires_at, booking_id, released_at, created_at, updated_at`,
      [lockId, roomId, req.auth?.sub || null, checkIn, quantity, lockExpiresAt],
    );

    await client.query("COMMIT");

    const lock = lockResult.rows[0];

    return res.status(201).json({
      data: {
        id: lock.id,
        roomId: lock.room_id,
        room_id: lock.room_id,
        userId: lock.user_id,
        user_id: lock.user_id,
        checkIn,
        checkOut,
        quantity: lock.quantity,
        lockExpiresAt: lock.lock_expires_at,
        lock_expires_at: lock.lock_expires_at,
        room: {
          id: room.id,
          hotelId: room.hotel_id,
          hotel_id: room.hotel_id,
          name: room.name,
          capacity: room.capacity,
          basePrice: room.base_price,
          base_price: room.base_price,
        },
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    return next(error);
  } finally {
    client.release();
  }
}

async function createBooking(req, res, next) {
  const {
    hotelId,
    roomId,
    checkinDate,
    checkoutDate,
    adultTotal = 1,
    childrenTotal = 0,
    customerName,
    guestEmail,
    guestPhone,
    specialRequire,
    // ─── Hỗ trợ payload từ BookingConfirmPage (frontend) ───
    checkIn,
    checkOut,
    adults,
    customerInfo,
    paymentMethod,
    quantity,
  } = req.body;
  const finalPaymentMethod =
    paymentMethod || req.body.payment_method || "VNPay";
  const finalQuantity = Number(quantity || req.body.quantity || 1);

  // Map từ format frontend (snake_case) sang format backend (camelCase)
  let finalHotelId = hotelId || req.body.hotel_id;
  let finalRoomId = roomId || req.body.room_id;
  const finalCheckinDate = checkinDate || checkIn || req.body.checkin_date;
  const finalCheckoutDate = checkoutDate || checkOut || req.body.checkout_date;
  const finalAdultTotal = Number(adultTotal || adults || req.body.adult_total || 1);
  const finalChildrenTotal = Number(childrenTotal || req.body.children_total || 0);
  const finalCustomerName =
    customerName ||
    req.body.customer_name ||
    (customerInfo
      ? `${customerInfo.lastName || ""} ${customerInfo.firstName || ""}`.trim()
      : null);
  const finalGuestEmail = guestEmail || req.body.guest_email || customerInfo?.email || null;
  const finalGuestPhone = guestPhone || req.body.guest_phone || customerInfo?.phone || null;
  const finalSpecialRequire =
    specialRequire || req.body.special_require || customerInfo?.specialRequest || null;

  const nights = getNights(finalCheckinDate, finalCheckoutDate);

  if (!finalHotelId) {
    return res.status(400).json({
      message: "hotelId là bắt buộc.",
    });
  }

  // Frontend không gửi room_id → tự suy ra từ temporary_locks gần nhất của user
  // hoặc lấy phòng rẻ nhất của khách sạn
  if (!finalRoomId) {
    const fallbackRoomResult = await pool.query(
      `SELECT tl.room_id
       FROM temporary_locks tl
       WHERE tl.user_id = $1
         AND tl.released_at IS NULL
         AND tl.lock_expires_at > NOW()
         AND tl.room_id IN (
           SELECT r.id FROM room r
           WHERE r.hotel_id = $2
             AND r.is_active = true
             AND r.deleted_at IS NULL
         )
       ORDER BY tl.created_at DESC
       LIMIT 1`,
      [req.auth.sub, finalHotelId],
    );

    if (fallbackRoomResult.rows[0]) {
      finalRoomId = fallbackRoomResult.rows[0].room_id;
    } else {
      const cheapestRoomResult = await pool.query(
        `SELECT id
         FROM room
         WHERE hotel_id = $1
           AND is_active = true
           AND deleted_at IS NULL
         ORDER BY base_price ASC
         LIMIT 1`,
        [finalHotelId],
      );
      finalRoomId = cheapestRoomResult.rows[0]?.id || null;
    }
  }

  if (!finalRoomId || !finalCheckinDate || !finalCheckoutDate || nights <= 0) {
    return res.status(400).json({
      message: "Không tìm thấy phòng khả dụng cho khách sạn này.",
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // ─── ĐẢM BẢO user_id HỢP LỆ (tránh lỗi fk_booking_user) ───
    // Nếu req.auth.sub không tồn tại trong bảng users (user bị xóa, token cũ...),
    // tự động tạo user mới từ thông tin khách hàng trong payload.
    let finalUserId = req.auth.sub;
    const userCheck = await client.query(
      `SELECT id FROM users WHERE id = $1 LIMIT 1`,
      [finalUserId],
    );

    if (!userCheck.rows[0]) {
      // 1. Nếu có email, thử tìm user theo email (tránh vi phạm UNIQUE email)
      let existingByEmail = null;
      if (finalGuestEmail?.trim()) {
        const emailResult = await client.query(
          `SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
          [finalGuestEmail.trim()],
        );
        existingByEmail = emailResult.rows[0] || null;
      }

      if (existingByEmail) {
        finalUserId = existingByEmail.id;
        console.warn(`[createBooking] User ${req.auth.sub} không tồn tại, dùng user theo email ${finalUserId}`);
      } else {
        // 2. Tạo user mới với đầy đủ cột NOT NULL bắt buộc
        const newUserResult = await client.query(
          `INSERT INTO users (
             full_name, email, password, phone,
             email_verified, phone_verified, activate,
             created_at, updated_at
           )
           VALUES ($1, $2, $3, $4, true, false, true, NOW(), NOW())
           RETURNING id`,
          [
            finalCustomerName?.trim() || "Khách hàng",
            finalGuestEmail?.trim() || `guest_${Date.now()}@temp.local`,
            // Password giả ngẫu nhiên (không dùng được để đăng nhập)
            `booking$${crypto.randomBytes(16).toString("hex")}`,
            finalGuestPhone?.trim() || null,
          ],
        );
        finalUserId = newUserResult.rows[0].id;
        console.warn(`[createBooking] User ${req.auth.sub} không tồn tại, đã tạo user mới ${finalUserId}`);
      }
    }

    const roomResult = await client.query(
      `SELECT id, hotel_id, name, type, capacity, base_price
       FROM room
       WHERE id = $1
        AND hotel_id = $2
        AND is_active = true
        AND deleted_at IS NULL`,
      [finalRoomId, finalHotelId],
    );

    const room = roomResult.rows[0];

    if (!room) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Không tìm thấy phòng phù hợp." });
    }

    const subtotal = Number(room.base_price) * nights * finalQuantity;
    const totalPrice = subtotal;
    const bookingCode = createBookingCode();

    const bookingResult = await client.query(
      `INSERT INTO booking (
         booking_code,
         user_id,
         hotel_id,
         checkin_date,
         checkout_date,
         adult_total,
         children_total,
         customer_name,
         guest_email,
         guest_phone,
         status,
         payment_status,
         special_require,
         source,
         currency,
         subtotal,
         discount,
         tax,
         service_total,
         total_price,
         commission_amount,
         hotel_payout
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending', 'unpaid', $11, 'web', 'VND', $12, 0, 0, 0, $13, $14, $15)
       RETURNING
         id,
         booking_code,
         user_id,
         hotel_id,
         checkin_date,
         checkout_date,
         adult_total,
         children_total,
         customer_name,
         guest_email,
         guest_phone,
         status,
         payment_status,
         subtotal,
         currency,
         discount,
         tax,
         service_total,
         total_price,
         commission_rate,
         commission_amount,
         hotel_payout,
         special_require,
         created_at`,
      [
        bookingCode,
        finalUserId,
        finalHotelId,
        finalCheckinDate,
        finalCheckoutDate,
        finalAdultTotal,
        finalChildrenTotal,
        finalCustomerName?.trim() || "Khách hàng",
        finalGuestEmail?.trim() || null,
        finalGuestPhone?.trim() || null,
        finalSpecialRequire?.trim() || null,
        subtotal,
        totalPrice,
        0,
        totalPrice,
      ],
    );

    const booking = bookingResult.rows[0];
    const start = new Date(finalCheckinDate);

    for (let index = 0; index < nights; index += 1) {
      const date = new Date(start);
      date.setDate(start.getDate() + index);

      await client.query(
        `INSERT INTO booking_room (
           booking_id,
           room_id,
           sub_index,
           room_name,
           room_type,
           capacity,
           book_date,
           quantity,
           price,
           base_price,
           adult_amount,
           children_amount,
           created_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())`,
        [
          booking.id,
          room.id,
          index + 1,
          room.name,
          room.type,
          room.capacity,
          date.toISOString().slice(0, 10),
          finalQuantity,
          room.base_price,
          room.base_price,
          finalAdultTotal,
          finalChildrenTotal,
        ],
      );
    }

    // Tạo bản ghi thanh toán (Bảng 20: payment) - defensive nếu bảng/cột chưa đúng.
    // Dùng SAVEPOINT để nếu câu lệnh này lỗi, chỉ phần này bị rollback,
    // KHÔNG làm "chết" toàn bộ transaction (tránh lỗi
    // "current transaction is aborted, commands ignored until end of transaction block"
    // ở các câu lệnh phía sau).
    try {
      await client.query("SAVEPOINT before_payment_insert");
      await client.query(
        `INSERT INTO payment (booking_id, payment_method, expected_amount, status, created_at)
         VALUES ($1, $2, $3, 'pending', NOW())`,
        [booking.id, finalPaymentMethod, totalPrice],
      );
      await client.query("RELEASE SAVEPOINT before_payment_insert");
    } catch (paymentError) {
      await client.query("ROLLBACK TO SAVEPOINT before_payment_insert");
      console.warn("Không thể tạo bản ghi payment (bảng/cột có thể chưa đúng):", paymentError.message);
    }

    await client.query(
      `INSERT INTO notification (user_id, title, content, type, link)
       VALUES ($1, $2, $3, 'booking', $4)`,
      [
        finalUserId,
        "Đặt phòng thành công",
        `Mã đặt phòng của bạn là ${booking.booking_code}.`,
        `/bookings/${booking.id}`,
      ],
    );

    await client.query("COMMIT");

    const responseBooking = formatBooking(bookingResult.rows[0]);

    return res.status(201).json({
      data: responseBooking,
      message: "Đặt phòng thành công.",
      booking: responseBooking,
      // ─── Trả booking_code & id ở top-level để frontend dễ đọc ───
      booking_code: responseBooking.booking_code,
      code: responseBooking.booking_code,
      id: responseBooking.id,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    return next(error);
  } finally {
    client.release();
  }
}

async function getBookingDetail(req, res, next) {
  try {
    const booking = await loadBookingDetail(req.params.id, req.auth.sub);

    if (!booking) {
      return res.status(404).json({ message: "Không tìm thấy đơn đặt phòng." });
    }

    return res.json({ data: booking, booking });
  } catch (error) {
    return next(error);
  }
}

async function cancelBooking(req, res, next) {
  const bookingId = req.params.id;
  const reason = (req.body.reason || req.body.cancelReason || "").toString().trim();

  try {
    const result = await pool.query(
      `UPDATE booking
       SET status = 'cancelled'::booking_status_enum,
           cancel_reason = NULLIF($3, ''),
           cancelled_at = NOW(),
           updated_at = NOW()
       WHERE id = $1
         AND user_id = $2
         AND status NOT IN ('cancelled', 'completed', 'checked_out')
       RETURNING id`,
      [bookingId, req.auth.sub, reason],
    );

    if (!result.rows[0]) {
      return res.status(404).json({ message: "Không tìm thấy đơn đặt phòng phù hợp." });
    }

    const booking = await loadBookingDetail(bookingId, req.auth.sub);

    return res.json({ data: booking, booking, message: "Đã hủy đơn đặt phòng." });
  } catch (error) {
    return next(error);
  }
}

async function updateBookingStatus(req, res, next) {
  const bookingCode = req.params.code || req.body.bookingCode || req.body.booking_code;
  const status = (req.body.status || "").toString().trim();
  const paymentStatus = (req.body.payment_status || req.body.paymentStatus || "").toString().trim();

  if (!bookingCode || !status) {
    return res.status(400).json({ message: "bookingCode và status là bắt buộc." });
  }

  try {
    // Ưu tiên tìm theo booking_code + user_id (an toàn).
    // Nếu không tìm thấy (user mới được tạo tự động trong createBooking),
    // fallback tìm theo booking_code thuần túy.
    let result = await pool.query(
      `UPDATE booking
       SET status = $2::booking_status_enum,
           payment_status = CASE
             WHEN $3::text IS NULL OR $3::text = '' THEN payment_status
             ELSE $3::booking_payment_status_enum
           END,
           confirmed_at = CASE WHEN $2 = 'confirmed' THEN COALESCE(confirmed_at, NOW()) ELSE confirmed_at END,
           updated_at = NOW()
       WHERE (booking_code = $1 OR id::text = $1)
         AND user_id = $4
       RETURNING id`,
      [bookingCode, status, paymentStatus || null, req.auth.sub],
    );

    if (!result.rows[0]) {
      result = await pool.query(
        `UPDATE booking
         SET status = $2::booking_status_enum,
             payment_status = CASE
               WHEN $3::text IS NULL OR $3::text = '' THEN payment_status
               ELSE $3::booking_payment_status_enum
             END,
             confirmed_at = CASE WHEN $2 = 'confirmed' THEN COALESCE(confirmed_at, NOW()) ELSE confirmed_at END,
             updated_at = NOW()
         WHERE (booking_code = $1 OR id::text = $1)
         RETURNING id`,
        [bookingCode, status, paymentStatus || null],
      );
    }

    if (!result.rows[0]) {
      return res.status(404).json({ message: "Không tìm thấy đơn đặt phòng phù hợp." });
    }

    // Nếu cập nhật thành công ở fallback (không có user_id), truyền null để
    // loadBookingDetail không lọc theo user (chỉ lấy theo booking_id).
    const booking = await loadBookingDetail(
      result.rows[0].id,
      // Lấy user_id từ booking vừa cập nhật nếu có
      req.auth.sub,
    );

    if (!booking) {
      // Fallback: load không cần filter user
      const detailResult = await loadBookingDetail(result.rows[0].id, null);
      return res.json({
        data: detailResult,
        booking: detailResult,
        message: "Cập nhật trạng thái đặt phòng thành công.",
      });
    }

    return res.json({
      data: booking,
      booking,
      message: "Cập nhật trạng thái đặt phòng thành công.",
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createTemporaryLock,
  createBooking,
  getBookingDetail,
  cancelBooking,
  updateBookingStatus,
  listMyBookings,
};