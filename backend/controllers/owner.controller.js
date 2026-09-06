// backend/controllers/owner.controller.js
const pool = require("../config/database");

// ─── 1. THỐNG KÊ DASHBOARD CHO OWNER ───
async function getOwnerStats(req, res, next) {
  try {
    const ownerId =
      req.user?.id || req.user?.userId || req.auth?.sub || req.auth?.id;
    const rawHotelId = req.query.hotel_id;
    const hotelId = rawHotelId ? String(rawHotelId).trim() : "";

    if (!ownerId) {
      return res
        .status(401)
        .json({ message: "Vui lòng đăng nhập để xem báo cáo." });
    }

    let hotelFilter = "h.owner_id = $1 AND h.status = 'active'";
    const params = [ownerId];

    if (
      hotelId &&
      hotelId !== "all" &&
      hotelId !== "undefined" &&
      hotelId !== ""
    ) {
      params.push(hotelId);
      hotelFilter += ` AND h.id = $2`;
    }

    const [
      revenueRes,
      roomsRes,
      arrivalsRes,
      departuresRes,
      monthlyRes,
      activeRes,
    ] = await Promise.all([
      pool.query(
        `SELECT COALESCE(SUM(b.total_price), 0)::bigint AS revenue
         FROM public.booking b
         JOIN public.hotel h ON h.id = b.hotel_id
         WHERE ${hotelFilter} 
           AND b.status NOT IN ('cancelled')
           AND b.payment_status = 'paid'`,
        params,
      ),
      pool.query(
        `SELECT COALESCE(SUM(r.amount), 0)::int AS total_rooms
         FROM public.room r
         JOIN public.hotel h ON h.id = r.hotel_id
         WHERE ${hotelFilter} AND r.is_active = true`,
        params,
      ),
      pool.query(
        `SELECT COUNT(*)::int AS count
         FROM public.booking b
         JOIN public.hotel h ON h.id = b.hotel_id
         WHERE ${hotelFilter} 
           AND b.status = 'confirmed'
           AND b.checkin_date = CURRENT_DATE`,
        params,
      ),
      pool.query(
        `SELECT COUNT(*)::int AS count
         FROM public.booking b
         JOIN public.hotel h ON h.id = b.hotel_id
         WHERE ${hotelFilter} 
           AND b.status = 'checked_out'
           AND (b.updated_at::date = CURRENT_DATE OR b.checkout_date = CURRENT_DATE)`,
        params,
      ),
      pool.query(
        `SELECT 
           TO_CHAR(DATE_TRUNC('month', b.created_at), 'MM/YYYY') AS month,
           COALESCE(SUM(b.total_price), 0)::bigint AS revenue,
           COUNT(*)::int AS bookings
         FROM public.booking b
         JOIN public.hotel h ON h.id = b.hotel_id
         WHERE ${hotelFilter} 
           AND b.status NOT IN ('cancelled')
           AND b.payment_status = 'paid'
           AND b.created_at >= NOW() - INTERVAL '6 MONTHS'
         GROUP BY DATE_TRUNC('month', b.created_at)
         ORDER BY DATE_TRUNC('month', b.created_at) ASC`,
        params,
      ),
      pool.query(
        `SELECT COALESCE(SUM(COALESCE(br.quantity, 1)), 0)::int AS occupied
         FROM public.booking b
         JOIN public.hotel h ON h.id = b.hotel_id
         LEFT JOIN public.booking_room br ON br.booking_id = b.id
         WHERE ${hotelFilter} 
           AND b.status = 'checked_in'
           AND CURRENT_DATE >= b.checkin_date 
           AND CURRENT_DATE <= b.checkout_date`,
        params,
      ),
    ]);

    const totalRooms = roomsRes.rows[0]?.total_rooms || 1;
    const activeRooms = activeRes.rows[0]?.occupied || 0;
    const occupancyRate = Math.min(
      Math.round((activeRooms / totalRooms) * 100),
      100,
    );

    return res.json({
      success: true,
      totalRevenue: Number(revenueRes.rows[0]?.revenue || 0),
      totalRooms,
      activeRooms,
      occupancyRate,
      todayArrivals: arrivalsRes.rows[0]?.count || 0,
      todayDepartures: departuresRes.rows[0]?.count || 0,
      chartData:
        monthlyRes.rows.length > 0
          ? monthlyRes.rows
          : [{ month: "Hiện tại", revenue: 0, bookings: 0 }],
    });
  } catch (error) {
    console.error("❌ LỖI GET_OWNER_STATS:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ─── 2. DANH SÁCH ĐƠN CHO OWNER ───
async function getOwnerBookings(req, res, next) {
  try {
    const ownerId =
      req.user?.id || req.user?.userId || req.auth?.sub || req.auth?.id;
    if (!ownerId)
      return res.status(401).json({ message: "Vui lòng đăng nhập." });

    const result = await pool.query(
      `SELECT 
         b.*, 
         h.name AS hotel_name,
         u.full_name AS customer_name,
         u.phone AS guest_phone,
         COALESCE(
           (
             SELECT br.room_name 
             FROM public.booking_room br 
             WHERE br.booking_id = b.id 
             LIMIT 1
           ),
           'Phòng tiêu chuẩn'
         ) AS room_name
       FROM public.booking b
       JOIN public.hotel h ON h.id = b.hotel_id
       LEFT JOIN public.users u ON u.id = b.user_id
       WHERE h.owner_id = $1
       ORDER BY b.created_at DESC`,
      [ownerId],
    );

    return res.json({
      success: true,
      data: result.rows,
      bookings: result.rows,
    });
  } catch (error) {
    console.error("❌ LỖI GET_OWNER_BOOKINGS:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ─── 3. ĐẶT PHÒNG TẠI QUẦY (WALK-IN) ───
async function createWalkInBooking(req, res, next) {
  try {
    const ownerId =
      req.user?.id || req.user?.userId || req.auth?.sub || req.auth?.id;
    if (!ownerId) return res.status(401).json({ message: "Chưa xác thực." });

    const {
      hotel_id,
      room_id,
      customer_name,
      guest_phone,
      total_price,
      checkin_date,
      checkout_date,
      is_check_in_now = true,
    } = req.body;

    if (!hotel_id || !customer_name || !total_price) {
      return res
        .status(400)
        .json({ message: "Thiếu thông tin khách hoặc giá phòng." });
    }

    const hotelCheck = await pool.query(
      `SELECT id, name FROM public.hotel WHERE id = $1 AND owner_id = $2`,
      [hotel_id, ownerId],
    );
    if (hotelCheck.rows.length === 0) {
      return res
        .status(403)
        .json({ message: "Bạn không có quyền quản lý khách sạn này." });
    }

    const newBookingId = require("crypto").randomUUID();
    const bookingCode = "WI" + Math.floor(10000000 + Math.random() * 90000000);
    const status = is_check_in_now ? "checked_in" : "confirmed";

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const insertSql = `
        INSERT INTO public.booking (
          id, booking_code, hotel_id, status, payment_status, total_price,
          checkin_date, checkout_date, adult_total, children_total,
          customer_name, guest_email, guest_phone, subtotal, confirmed_at, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4::public.booking_status_enum, 'paid'::public.booking_payment_status_enum, $5,
          $6::date, $7::date, 2, 0,
          $8, 'walkin@hotel.internal', $9, $5, NOW(), NOW(), NOW()
        ) RETURNING *;
      `;

      const insertBooking = await client.query(insertSql, [
        newBookingId,
        bookingCode,
        hotel_id,
        status,
        Number(total_price),
        checkin_date || new Date().toISOString().split("T")[0],
        checkout_date,
        customer_name,
        guest_phone || "",
      ]);
      const newBooking = insertBooking.rows[0];

      if (room_id) {
        const roomRes = await client.query(
          `SELECT name, base_price FROM public.room WHERE id = $1 LIMIT 1`,
          [room_id],
        );
        const roomName = roomRes.rows[0]?.name || "Phòng trực tiếp";
        const roomPrice = Number(roomRes.rows[0]?.base_price || total_price);

        await client.query(
          `INSERT INTO public.booking_room (
             id, booking_id, room_id, quantity, price, room_name, book_date, created_at
           ) VALUES (
             gen_random_uuid(), $1, $2, 1, $3, $4, $5::date, NOW()
           ) ON CONFLICT DO NOTHING`,
          [
            newBooking.id,
            room_id,
            roomPrice,
            roomName,
            checkin_date || new Date(),
          ],
        );
      }

      await client.query("COMMIT");

      return res.status(201).json({
        success: true,
        message: is_check_in_now
          ? "✓ Tạo đơn thành công và đã Check-in ngay cho khách!"
          : "✓ Tạo đơn đặt phòng tại quầy thành công!",
        booking: newBooking,
      });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("❌ LỖI CREATE_WALK_IN:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ─── 4. CHECK-IN (ĐÃ LƯU room_number VÀO BẢNG booking) ───
async function handleOwnerCheckIn(req, res, next) {
  try {
    const ownerId =
      req.user?.id || req.user?.userId || req.auth?.sub || req.auth?.id;
    const { id } = req.params;
    const { early_fee = 0, room_number = "" } = req.body;

    if (!ownerId) return res.status(401).json({ message: "Chưa xác thực." });

    const updateRes = await pool.query(
      `UPDATE public.booking b
       SET status = 'checked_in'::public.booking_status_enum,
           payment_status = 'paid'::public.booking_payment_status_enum,
           total_price = b.total_price + $1,
           room_number = COALESCE($2, b.room_number),
           confirmed_at = COALESCE(b.confirmed_at, NOW()),
           updated_at = NOW()
       FROM public.hotel h
       WHERE b.hotel_id = h.id 
         AND h.owner_id = $3
         AND (b.id::text = $4 OR b.booking_code = $4)
       RETURNING b.id, b.booking_code, b.total_price, b.status, b.payment_status, b.room_number`,
      [Number(early_fee), room_number || null, ownerId, id],
    );

    if (updateRes.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy đơn hoặc không có quyền thao tác." });
    }

    return res.json({
      success: true,
      message: "✓ Đã thu tiền thành công & Bàn giao chìa khóa cho khách!",
      booking: updateRes.rows[0],
    });
  } catch (error) {
    console.error("❌ LỖI CHECK-IN:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ─── 5. CHECK-OUT ───
async function handleOwnerCheckOut(req, res, next) {
  try {
    const ownerId =
      req.user?.id || req.user?.userId || req.auth?.sub || req.auth?.id;
    const { id } = req.params;
    const { late_fee = 0, minibar_fee = 0, other_fee = 0 } = req.body;
    const totalExtra =
      Number(late_fee) + Number(minibar_fee) + Number(other_fee);

    if (!ownerId) return res.status(401).json({ message: "Chưa xác thực." });

    const updateRes = await pool.query(
      `UPDATE public.booking b
       SET status = 'checked_out'::public.booking_status_enum,
           payment_status = 'paid'::public.booking_payment_status_enum,
           total_price = b.total_price + $1,
           updated_at = NOW()
       FROM public.hotel h
       WHERE b.hotel_id = h.id 
         AND h.owner_id = $2
         AND (b.id::text = $3 OR b.booking_code = $3)
       RETURNING b.id, b.booking_code, b.total_price, b.status, b.payment_status`,
      [totalExtra, ownerId, id],
    );

    if (updateRes.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy đơn hoặc không có quyền thao tác." });
    }

    return res.json({
      success: true,
      message: "Quyết toán & Trả phòng thành công!",
      booking: updateRes.rows[0],
    });
  } catch (error) {
    console.error("❌ LỖI CHECK-OUT:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ─── 6. CẬP NHẬT TRẠNG THÁI / THU TIỀN NHANH ───
async function updateOwnerBookingStatus(req, res, next) {
  try {
    const ownerId =
      req.user?.id || req.user?.userId || req.auth?.sub || req.auth?.id;
    const { id } = req.params;
    const { status, payment_status } = req.body;

    if (!ownerId) return res.status(401).json({ message: "Chưa xác thực." });

    const updateRes = await pool.query(
      `UPDATE public.booking b
       SET status = COALESCE($1::public.booking_status_enum, b.status),
           payment_status = COALESCE($2::public.booking_payment_status_enum, b.payment_status),
           confirmed_at = CASE WHEN $1 = 'confirmed' THEN NOW() ELSE b.confirmed_at END,
           updated_at = NOW()
       FROM public.hotel h
       WHERE b.hotel_id = h.id 
         AND h.owner_id = $3
         AND (b.id::text = $4 OR b.booking_code = $4)
       RETURNING b.id, b.booking_code, b.status, b.payment_status`,
      [status || null, payment_status || null, ownerId, id],
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy đơn đặt phòng." });
    }

    return res.json({
      success: true,
      message: "Cập nhật trạng thái thành công!",
      booking: updateRes.rows[0],
    });
  } catch (error) {
    console.error("❌ LỖI UPDATE_STATUS:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ─── 7. CẬP NHẬT THÔNG TIN CƠ SỞ ───
async function updateHotelInfo(req, res, next) {
  try {
    const ownerId =
      req.user?.id || req.user?.userId || req.auth?.sub || req.auth?.id;
    const { id } = req.params;
    const { name, address, city, description, phone, bank_account, bank_name } =
      req.body;

    if (!ownerId) return res.status(401).json({ message: "Chưa xác thực." });

    const result = await pool.query(
      `UPDATE public.hotel
       SET name = COALESCE($1, name),
           address = COALESCE($2, address),
           city = COALESCE($3, city),
           description = COALESCE($4, description),
           phone = COALESCE($5, phone),
           bank_account = COALESCE($6, bank_account),
           bank_name = COALESCE($7, bank_name),
           updated_at = NOW()
       WHERE id = $8 AND owner_id = $9
       RETURNING *`,
      [
        name,
        address,
        city,
        description,
        phone,
        bank_account,
        bank_name,
        id,
        ownerId,
      ],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy khách sạn." });
    }

    return res.json({
      success: true,
      message: "Cập nhật hồ sơ khách sạn thành công!",
      hotel: result.rows[0],
    });
  } catch (error) {
    console.error("❌ LỖI UPDATE_HOTEL_INFO:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  getOwnerStats,
  getOwnerBookings,
  createWalkInBooking,
  handleOwnerCheckIn,
  handleOwnerCheckOut,
  updateOwnerBookingStatus,
  updateHotelInfo,
};
