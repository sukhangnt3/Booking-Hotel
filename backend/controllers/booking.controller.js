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

    return res.json({
      bookings: result.rows.map(formatBooking),
      total: result.rowCount,
    });
  } catch (error) {
    return next(error);
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
  } = req.body;

  const nights = getNights(checkinDate, checkoutDate);

  if (!hotelId || !roomId || !checkinDate || !checkoutDate || nights <= 0) {
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
         special_require,
         source,
         subtotal,
         total_price
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending', $11, 'web', $12, $13)
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
         discount,
         tax,
         service_total,
         total_price,
         special_require,
         created_at`,
      [
        createBookingCode(),
        req.auth.sub,
        hotelId,
        checkinDate,
        checkoutDate,
        adultTotal,
        childrenTotal,
        customerName?.trim() || "Khách hàng",
        guestEmail?.trim() || null,
        guestPhone?.trim() || null,
        specialRequire?.trim() || null,
        subtotal,
        totalPrice,
      ],
    );

    const booking = bookingResult.rows[0];
    const start = new Date(checkinDate);

    for (let index = 0; index < nights; index += 1) {
      const date = new Date(start);
      date.setDate(start.getDate() + index);

      await client.query(
        `INSERT INTO booking_room (
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
         )
         VALUES ($1, $2, $3, $4, $5, $6, 1, $7, $8, $9, $10)`,
        [
          booking.id,
          room.id,
          room.name,
          room.type,
          room.capacity,
          date.toISOString().slice(0, 10),
          room.base_price,
          room.base_price,
          adultTotal,
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

    return res.status(201).json({
      message: "Đặt phòng thành công.",
      booking: formatBooking(booking),
    });
  } catch (error) {
    await client.query("ROLLBACK");
    return next(error);
  } finally {
    client.release();
  }
}

module.exports = {
  createBooking,
  listMyBookings,
};
