const crypto = require("crypto");
const pool = require("../config/database");
const { formatBooking } = require("../utils/formatters");

function createBookingCode() {
  return `BK${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 90 + 10)}`;
}

function getNights(checkinDate, checkoutDate) {
  const start = new Date(checkinDate);
  const end = new Date(checkoutDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
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
  let checkIn = req.body.checkIn || req.body.lock_date || req.body.checkin_date;
  let checkOut = req.body.checkOut || req.body.checkout_date;
  const quantity = Number(req.body.quantity || 1);

  // Nếu không nhận được ngày checkIn, tự tạo ngày hôm nay
  if (!checkIn || checkIn.trim() === "") {
    checkIn = new Date().toISOString().slice(0, 10);
  }

  if (!roomId || quantity <= 0) {
    return res.status(400).json({
      message: "room_id và quantity hợp lệ là bắt buộc.",
    });
  }

  if (!checkOut || checkOut.trim() === "") {
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
  // 1. Khai báo và bóc tách các trường từ payload Frontend
  const {
    hotel_id,
    hotelId,
    room_id,
    roomId,
    checkin_date,
    checkinDate,
    checkIn,
    checkout_date,
    checkoutDate,
    checkOut,
    customer_name,
    customerName,
    guest_email,
    guestEmail,
    guest_phone,
    guestPhone,
    special_require,
    specialRequire,
    payment_method,
    paymentMethod,
    adult_total,
    adultTotal,
    children_total,
    childrenTotal,
    customerInfo,
  } = req.body;

  // Map lại dữ liệu nhận được linh hoạt từ Frontend
  const finalHotelId = hotel_id || hotelId;
  let finalRoomId = room_id || roomId;

  // Xử lý ngày check-in/check-out nếu Frontend truyền rỗng ""
  let finalCheckinDate = checkin_date || checkinDate || checkIn;
  let finalCheckoutDate = checkout_date || checkoutDate || checkOut;

  if (!finalCheckinDate || finalCheckinDate.trim() === "") {
    finalCheckinDate = new Date().toISOString().slice(0, 10);
  }

  if (!finalCheckoutDate || finalCheckoutDate.trim() === "") {
    const nextDay = new Date(finalCheckinDate);
    nextDay.setDate(nextDay.getDate() + 1);
    finalCheckoutDate = nextDay.toISOString().slice(0, 10);
  }

  // Lấy thông tin khách hàng từ root body hoặc từ object customerInfo nếu có
  const finalCustomerName =
    customer_name ||
    customerName ||
    (customerInfo
      ? `${customerInfo.lastName || ""} ${customerInfo.firstName || ""}`.trim()
      : "Khách hàng");

  const finalGuestEmail = guest_email || guestEmail || customerInfo?.email || null;
  const finalGuestPhone = guest_phone || guestPhone || customerInfo?.phone || null;
  const finalSpecialRequire = special_require || specialRequire || customerInfo?.specialRequest || null;
  const finalPaymentMethod = payment_method || paymentMethod || "VNPay";
  const finalAdultTotal = Number(adult_total || adultTotal || 1);
  const finalChildrenTotal = Number(children_total || childrenTotal || 0);

  const nights = getNights(finalCheckinDate, finalCheckoutDate);

  if (!finalHotelId) {
    return res.status(400).json({
      message: "hotel_id là bắt buộc.",
    });
  }

  // Tự động tìm room_id nếu Frontend không gửi trường này
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
      [req.auth?.sub || null, finalHotelId],
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

  if (!finalRoomId || nights <= 0) {
    return res.status(400).json({
      message: "Không tìm thấy phòng phù hợp hoặc khoảng thời gian không hợp lệ.",
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Lấy thông tin phòng thực tế từ cơ sở dữ liệu
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
      return res.status(404).json({ message: "Không tìm thấy phòng phù hợp trong hệ thống." });
    }

    const subtotal = Number(room.base_price) * nights;
    const totalPrice = subtotal;
    const bookingCode = createBookingCode();

    // Thêm bản ghi vào Bảng 16: booking
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
        req.auth?.sub || null,
        finalHotelId,
        finalCheckinDate,
        finalCheckoutDate,
        finalAdultTotal,
        finalChildrenTotal,
        finalCustomerName,
        finalGuestEmail,
        finalGuestPhone,
        finalSpecialRequire,
        subtotal,
        totalPrice,
        0,
        totalPrice,
      ],
    );

    const booking = bookingResult.rows[0];
    const start = new Date(finalCheckinDate);

    // Lưu chi tiết các đêm lưu trú vào bảng booking_room
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
          finalChildrenTotal,
        ],
      );
    }

    // Tạo bản ghi thanh toán (Bảng 20: payment)
    try {
      await client.query(
        `INSERT INTO payment (booking_id, payment_method, amount, status, created_at)
         VALUES ($1, $2, $3, 'pending', NOW())`,
        [booking.id, finalPaymentMethod, totalPrice],
      );
    } catch (paymentError) {
      console.warn("Lưu ý: Không thể chèn vào bảng payment:", paymentError.message);
    }

    // Tạo thông báo nếu người dùng đã đăng nhập
    if (req.auth?.sub) {
      try {
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
      } catch (notifError) {
        console.warn("Lưu ý: Không thể tạo thông báo:", notifError.message);
      }
    }

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
    const booking = await loadBookingDetail(req.params.id, req.auth?.sub);

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
      [bookingId, req.auth?.sub, reason],
    );

    if (!result.rows[0]) {
      return res.status(404).json({ message: "Không tìm thấy đơn đặt phòng phù hợp." });
    }

    const booking = await loadBookingDetail(bookingId, req.auth?.sub);

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