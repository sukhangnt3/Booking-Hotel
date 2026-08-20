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
  return diff > 0 ? diff : 1;
}

// ─── HÀM LOAD CHI TIẾT ĐƠN HÀNG ───
async function loadBookingDetail(identifier, userId = null) {
  if (!identifier) return null;

  const bookingResult = await pool.query(
    `SELECT
       b.id,
       b.booking_code,
       b.user_id,
       b.hotel_id,
       h.name AS hotel_name,
       h.address AS hotel_address,
       h.city AS hotel_city,
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
     LEFT JOIN hotel h ON h.id = b.hotel_id
     WHERE (b.id::text = $1 OR b.booking_code = $1)
       AND ($2::uuid IS NULL OR b.user_id = $2)
     LIMIT 1`,
    [String(identifier).trim(), userId || null],
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
       ORDER BY book_date ASC`,
      [booking.id],
    ),
    pool
      .query(
        `SELECT
         service_name,
         quantity,
         unit_price,
         total_price
       FROM booking_service
       WHERE booking_id = $1
       ORDER BY created_at ASC`,
        [booking.id],
      )
      .catch(() => ({ rows: [] })),
  ]);

  const formatted = formatBooking ? formatBooking(booking) : booking;

  return {
    ...formatted,
    hotel: {
      id: booking.hotel_id,
      name: booking.hotel_name,
      address: booking.hotel_address,
      city: booking.hotel_city,
    },
    rooms: roomResult.rows.map((row) => ({
      roomId: row.room_id,
      room_id: row.room_id,
      roomName: row.room_name,
      room_name: row.room_name,
      roomType: row.room_type,
      room_type: row.room_type,
      capacity: row.capacity,
      bookDate: row.book_date,
      quantity: row.quantity,
      price: row.price,
      basePrice: row.base_price,
      adultAmount: row.adult_amount,
      childrenAmount: row.children_amount,
    })),
    services: serviceResult.rows,
  };
}

// ─── 1. LẤY DANH SÁCH ĐƠN ĐẶT CỦA USER ───
async function listMyBookings(req, res, next) {
  try {
    let userId = req.auth?.sub || req.user?.id;
    const userEmail = req.auth?.email || req.user?.email;

    if (!userId && userEmail) {
      const userResult = await pool.query(
        `SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
        [userEmail],
      );
      if (userResult.rows[0]) {
        userId = userResult.rows[0].id;
      }
    }

    if (!userId) {
      return res.json({ data: [], bookings: [], total: 0 });
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
       LEFT JOIN hotel h ON h.id = b.hotel_id
       WHERE b.user_id = $1
       ORDER BY b.created_at DESC`,
      [userId],
    );

    const bookings = result.rows.map((row) =>
      formatBooking ? formatBooking(row) : row,
    );

    return res.json({
      data: bookings,
      bookings: bookings,
      total: result.rowCount,
    });
  } catch (error) {
    console.error("Lỗi listMyBookings:", error);
    return res.json({ data: [], bookings: [], total: 0 });
  }
}

// ─── 2. TẠO KHÓA PHÒNG TẠM THỜI (TEMP LOCK) ───
async function createTemporaryLock(req, res, next) {
  const roomId = req.body.room_id || req.body.roomId;
  const checkIn =
    req.body.checkIn || req.body.lock_date || req.body.checkin_date;
  let checkOut = req.body.checkOut || req.body.checkout_date;
  const quantity = Number(req.body.quantity || 1);

  if (!roomId || !checkIn || quantity <= 0) {
    return res.status(400).json({
      message: "room_id, checkIn và quantity hợp lệ là bắt buộc.",
    });
  }

  if (!checkOut) {
    const nextDay = new Date(checkIn);
    nextDay.setDate(nextDay.getDate() + 1);
    checkOut = nextDay.toISOString().slice(0, 10);
  }

  const nights = getNights(checkIn, checkOut);
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
         id, room_id, user_id, lock_date, quantity, lock_expires_at, created_at, updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING id, room_id, user_id, lock_date, quantity, lock_expires_at`,
      [
        lockId,
        roomId,
        req.auth?.sub || req.user?.id || null,
        checkIn,
        quantity,
        lockExpiresAt,
      ],
    );

    await client.query("COMMIT");

    const lock = lockResult.rows[0];

    return res.status(201).json({
      data: {
        id: lock.id,
        roomId: lock.room_id,
        checkIn,
        checkOut,
        quantity: lock.quantity,
        lockExpiresAt: lock.lock_expires_at,
        room: {
          id: room.id,
          hotelId: room.hotel_id,
          name: room.name,
          basePrice: room.base_price,
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

// ─── 3. TẠO ĐƠN ĐẶT PHÒNG CHÍNH THỨC (ĐÃ SỬA ĐỦ 12 CỘT CHO BOOKING_ROOM) ───
async function createBooking(req, res, next) {
  const {
    hotelId,
    roomId,
    checkinDate,
    checkoutDate,
    customerName,
    guestEmail,
    guestPhone,
    specialRequire,
    checkIn,
    checkOut,
    adults,
    children,
    quantity,
    total_price,
    subtotal: rawSubtotal,
  } = req.body;

  const finalHotelId = hotelId || req.body.hotel_id;
  let finalRoomId = roomId || req.body.room_id;
  const finalCheckinDate = checkinDate || checkIn || req.body.checkin_date;
  const finalCheckoutDate = checkoutDate || checkOut || req.body.checkout_date;

  // 👈 Luôn đảm bảo có giá trị số (mặc định tối thiểu 1 người lớn, 0 trẻ em)
  const finalAdultTotal =
    Number(adults || req.body.adults || req.body.adult_total || 1) || 1;
  const finalChildrenTotal =
    Number(children || req.body.children || req.body.children_total || 0) || 0;

  const finalQuantity = Number(quantity || req.body.quantity || 1) || 1;
  const finalCustomerName =
    customerName || req.body.customer_name || "Khách hàng";
  const finalGuestEmail = guestEmail || req.body.guest_email;
  const finalGuestPhone = guestPhone || req.body.guest_phone;
  const finalSpecialRequire =
    specialRequire || req.body.special_require || null;

  const nights = getNights(finalCheckinDate, finalCheckoutDate);

  if (!finalHotelId) {
    return res.status(400).json({ message: "hotelId là bắt buộc." });
  }

  // Tự động tìm phòng nếu frontend chưa gửi roomId
  if (!finalRoomId) {
    const defaultRoom = await pool.query(
      `SELECT id FROM room WHERE hotel_id = $1 AND is_active = true AND deleted_at IS NULL LIMIT 1`,
      [finalHotelId],
    );
    finalRoomId = defaultRoom.rows[0]?.id;
  }

  if (!finalRoomId) {
    return res
      .status(404)
      .json({ message: "Không tìm thấy phòng khả dụng cho khách sạn này." });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Lấy user_id an toàn
    let finalUserId = req.auth?.sub || req.user?.id || null;
    if (!finalUserId && finalGuestEmail) {
      const userRes = await client.query(
        `SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
        [finalGuestEmail.trim()],
      );
      finalUserId = userRes.rows[0]?.id;
    }

    const roomRes = await client.query(
      `SELECT id, hotel_id, name, type, capacity, base_price 
       FROM room WHERE id = $1`,
      [finalRoomId],
    );
    const room = roomRes.rows[0];
    if (!room) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Phòng không tồn tại." });
    }

    const pricePerNight = Number(room.base_price || 0);
    const calculatedSubtotal =
      rawSubtotal || pricePerNight * nights * finalQuantity;
    const finalTotalPrice = total_price || calculatedSubtotal;
    const bookingCode = createBookingCode();

    // 1. Tạo đơn trong bảng booking
    const bookingResult = await client.query(
      `INSERT INTO booking (
         booking_code, user_id, hotel_id, checkin_date, checkout_date,
         adult_total, children_total, customer_name, guest_email, guest_phone,
         status, payment_status, special_require, source, currency,
         subtotal, total_price, commission_amount, hotel_payout, created_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending', 'unpaid', $11, 'web', 'VND', $12, $13, 0, $13, NOW())
       RETURNING *`,
      [
        bookingCode,
        finalUserId,
        finalHotelId,
        finalCheckinDate,
        finalCheckoutDate,
        finalAdultTotal,
        finalChildrenTotal,
        finalCustomerName,
        finalGuestEmail,
        finalGuestPhone,
        finalSpecialRequire,
        calculatedSubtotal,
        finalTotalPrice,
      ],
    );

    const booking = bookingResult.rows[0];

    // 2. Tạo bản ghi chi tiết từng đêm trong booking_room (ĐẦY ĐỦ 12 THAM SỐ)
    const start = new Date(finalCheckinDate);
    for (let index = 0; index < nights; index += 1) {
      const date = new Date(start);
      date.setDate(start.getDate() + index);

      await client.query(
        `INSERT INTO booking_room (
           booking_id, room_id, sub_index, room_name, room_type,
           capacity, book_date, quantity, price, base_price,
           adult_amount, children_amount, created_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())`,
        [
          booking.id,
          room.id,
          index + 1,
          room.name,
          room.type || "Standard",
          room.capacity || 2,
          date.toISOString().slice(0, 10),
          finalQuantity,
          pricePerNight,
          pricePerNight,
          finalAdultTotal, // 👈 $11: adult_amount (không bao giờ null)
          finalChildrenTotal, // 👈 $12: children_amount (không bao giờ null)
        ],
      );
    }

    await client.query("COMMIT");

    return res.status(201).json({
      data: booking,
      message: "Đặt phòng thành công.",
      booking_code: booking.booking_code,
      code: booking.booking_code,
      id: booking.id,
      total_price: finalTotalPrice,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    return next(error);
  } finally {
    client.release();
  }
}

// ─── 4. LẤY CHI TIẾT ĐƠN ĐẶT PHÒNG ───
async function getBookingDetail(req, res, next) {
  try {
    const booking = await loadBookingDetail(
      req.params.id,
      req.auth?.sub || req.user?.id || null,
    );

    if (!booking) {
      const publicBooking = await loadBookingDetail(req.params.id, null);
      if (publicBooking) {
        return res.json({ data: publicBooking, booking: publicBooking });
      }
      return res.status(404).json({ message: "Không tìm thấy đơn đặt phòng." });
    }

    return res.json({ data: booking, booking });
  } catch (error) {
    return next(error);
  }
}

// ─── 5. HỦY ĐƠN HÀNG ───
async function cancelBooking(req, res, next) {
  const bookingId = req.params.id;
  const reason = (req.body.reason || "").toString().trim();

  try {
    const result = await pool.query(
      `UPDATE booking
       SET status = 'cancelled'::booking_status_enum,
           cancel_reason = NULLIF($2, ''),
           cancelled_at = NOW(),
           updated_at = NOW()
       WHERE (id::text = $1 OR booking_code = $1)
       RETURNING id, booking_code`,
      [bookingId, reason],
    );

    if (!result.rows[0]) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy đơn đặt phòng để hủy." });
    }

    return res.json({ message: "Đã hủy đơn đặt phòng thành công." });
  } catch (error) {
    return next(error);
  }
}

// ─── 6. CẬP NHẬT TRẠNG THÁI ĐƠN ───
async function updateBookingStatus(req, res, next) {
  const bookingCode =
    req.params.code || req.body.bookingCode || req.body.booking_code;
  const status = (req.body.status || "").toString().trim();
  const paymentStatus = (
    req.body.payment_status ||
    req.body.paymentStatus ||
    ""
  )
    .toString()
    .trim();

  if (!bookingCode || !status) {
    return res
      .status(400)
      .json({ message: "bookingCode và status là bắt buộc." });
  }

  try {
    const result = await pool.query(
      `UPDATE booking
       SET status = $2::booking_status_enum,
           payment_status = CASE
             WHEN $3::text IS NULL OR $3::text = '' THEN payment_status
             ELSE $3::booking_payment_status_enum
           END,
           confirmed_at = CASE WHEN $2 = 'confirmed' THEN COALESCE(confirmed_at, NOW()) ELSE confirmed_at END,
           updated_at = NOW()
       WHERE (booking_code = $1 OR id::text = $1)
       RETURNING id, booking_code, status, payment_status`,
      [bookingCode, status, paymentStatus || null],
    );

    if (!result.rows[0]) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy đơn đặt phòng phù hợp." });
    }

    return res.json({
      data: result.rows[0],
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
