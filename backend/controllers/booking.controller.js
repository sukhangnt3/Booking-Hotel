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
      [req.auth.sub],
    );

    const bookings = result.rows.map(formatBooking);

    return res.json({
      data: bookings,
      bookings,
      total: result.rowCount,
    });
  } catch (error) {
    return next(error);
  }
}

async function createTemporaryLock(req, res, next) {
  const roomId = req.body.room_id || req.body.roomId;
  const checkIn = req.body.checkIn;
  const checkOut = req.body.checkOut;
  const quantity = Number(req.body.quantity || 1);

  if (!roomId || !checkIn || !checkOut || quantity <= 0) {
    return res.status(400).json({
      message: "room_id, checkIn, checkOut và quantity hợp lệ là bắt buộc.",
    });
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
  } = req.body;

  // Map từ format frontend sang format backend nếu cần
  const finalCheckinDate = checkinDate || checkIn;
  const finalCheckoutDate = checkoutDate || checkOut;
  const finalAdultTotal = Number(adultTotal || adults || 1);
  const finalCustomerName =
    customerName ||
    (customerInfo
      ? `${customerInfo.lastName || ""} ${customerInfo.firstName || ""}`.trim()
      : null);
  const finalGuestEmail = guestEmail || customerInfo?.email || null;
  const finalGuestPhone = guestPhone || customerInfo?.phone || null;
  const finalSpecialRequire = specialRequire || customerInfo?.specialRequest || null;

  const nights = getNights(finalCheckinDate, finalCheckoutDate);

  if (!hotelId || !roomId || !finalCheckinDate || !finalCheckoutDate || nights <= 0) {
    return res.status(400).json({
      message: "hotelId, roomId, ngày nhận phòng và ngày trả phòng hợp lệ là bắt buộc.",
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const roomResult = await client.query(
      `SELECT id, hotel_id, name, type, capacity, base_price
       FROM room
       WHERE id = $1
        AND hotel_id = $2
        AND is_active = true
        AND deleted_at IS NULL`,
      [roomId, hotelId],
    );

    const room = roomResult.rows[0];

    if (!room) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Không tìm thấy phòng phù hợp." });
    }

    const subtotal = Number(room.base_price) * nights;
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
        req.auth.sub,
        hotelId,
        finalCheckinDate,
        finalCheckoutDate,
        finalAdultTotal,
        childrenTotal,
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
         VALUES ($1, $2, $3, $4, $5, $6, $7, 1, $8, $9, $10, $11, NOW())`,
        [
          booking.id,
          room.id,
          index + 1,
          room.name,
          room.type,
          room.capacity,
          date.toISOString().slice(0, 10),
          room.base_price,
          room.base_price,
          finalAdultTotal,
          childrenTotal,
        ],
      );
    }

    await client.query(
      `INSERT INTO notification (user_id, title, content, type, link)
       VALUES ($1, $2, $3, 'booking', $4)`,
      [
        req.auth.sub,
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
       SET status = 'cancelled',
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

module.exports = {
  createTemporaryLock,
  createBooking,
  getBookingDetail,
  cancelBooking,
  listMyBookings,
};
