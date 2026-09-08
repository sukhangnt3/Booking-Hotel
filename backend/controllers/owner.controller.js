// backend/controllers/owner.controller.js
const pool = require("../config/database");

// ─── 1. THỐNG KÊ DASHBOARD QUẢN TRỊ KHÁCH SẠN ───
async function getOwnerStats(req, res, next) {
  try {
    const ownerId =
      req.user?.id || req.user?.userId || req.auth?.sub || req.auth?.id;
    const hotelId = req.query.hotel_id
      ? String(req.query.hotel_id).trim()
      : "all";
    const range = req.query.range || "this_month";
    const revTab = req.query.rev_tab || "day";

    if (!ownerId) {
      return res.status(401).json({ message: "Vui lòng đăng nhập." });
    }

    let hotelFilter = "h.owner_id = $1 AND h.status = 'active'";
    const baseParams = [ownerId];

    if (
      hotelId &&
      hotelId !== "all" &&
      hotelId !== "undefined" &&
      hotelId !== ""
    ) {
      baseParams.push(hotelId);
      hotelFilter += ` AND h.id = $${baseParams.length}`;
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const todayDateNum = now.getDate();
    const lastDayOfMonthNum = new Date(
      currentYear,
      currentMonth + 1,
      0,
    ).getDate();

    let startDate, endDate;

    if (range === "today") {
      startDate = now.toLocaleDateString("en-CA");
      endDate = startDate;
    } else if (range === "yesterday") {
      const yest = new Date(now);
      yest.setDate(now.getDate() - 1);
      startDate = yest.toLocaleDateString("en-CA");
      endDate = startDate;
    } else if (range === "7days") {
      const start = new Date(now);
      start.setDate(now.getDate() - 7);
      startDate = start.toLocaleDateString("en-CA");
      endDate = now.toLocaleDateString("en-CA");
    } else if (range === "last_month") {
      const firstDay = new Date(currentYear, currentMonth - 1, 1);
      const lastDay = new Date(currentYear, currentMonth, 0);
      startDate = firstDay.toLocaleDateString("en-CA");
      endDate = lastDay.toLocaleDateString("en-CA");
    } else {
      // this_month
      const firstDay = new Date(currentYear, currentMonth, 1);
      const lastDay = new Date(currentYear, currentMonth + 1, 0);
      startDate = firstDay.toLocaleDateString("en-CA");
      endDate = lastDay.toLocaleDateString("en-CA");
    }

    // 1.1 LẤY TỔNG SỐ PHÒNG (Nếu không có phòng thì trả về 0, KHÔNG ép thành 1)
    const roomsRes = await pool.query(
      `SELECT COALESCE(SUM(r.amount), 0)::int AS total_rooms 
       FROM public.room r 
       JOIN public.hotel h ON h.id = r.hotel_id 
       WHERE ${hotelFilter} AND r.is_active = true`,
      baseParams,
    );
    const totalRooms = Number(roomsRes.rows[0]?.total_rooms || 0);

    // 1.2 CÔNG SUẤT PHÒNG HIỆN TẠI (HÔM NAY)
    let occupiedCount = 0;
    let vacantCount = 0;
    let currentRate = 0;
    let vacantRate = 0;

    if (totalRooms > 0) {
      const currentOccupiedRes = await pool.query(
        `SELECT COALESCE(SUM(COALESCE(br.quantity, 1)), 0)::int AS occupied
         FROM public.booking b
         JOIN public.hotel h ON h.id = b.hotel_id
         LEFT JOIN public.booking_room br ON br.booking_id = b.id
         WHERE ${hotelFilter} 
           AND b.status = 'checked_in'
           AND CURRENT_DATE >= b.checkin_date AND CURRENT_DATE <= b.checkout_date`,
        baseParams,
      );
      occupiedCount = Math.min(
        totalRooms,
        Number(currentOccupiedRes.rows[0]?.occupied || 0),
      );
      vacantCount = Math.max(0, totalRooms - occupiedCount);
      currentRate = Math.min(
        100,
        Math.round((occupiedCount / totalRooms) * 100),
      );
      vacantRate = Math.max(0, 100 - currentRate);
    }

    const timeParams = [...baseParams, startDate, endDate];
    const pStart = timeParams.length - 1;
    const pEnd = timeParams.length;

    // 1.3 TỔNG DOANH THU THUẦN TRONG KỲ
    const revenueRes = await pool.query(
      `SELECT COALESCE(SUM(b.total_price), 0)::bigint AS total_rev
       FROM public.booking b
       JOIN public.hotel h ON h.id = b.hotel_id
       WHERE ${hotelFilter} 
         AND b.status NOT IN ('cancelled') 
         AND b.payment_status = 'paid'
         AND b.created_at::date >= $${pStart}::date AND b.created_at::date <= $${pEnd}::date`,
      timeParams,
    );
    const revenueTotal = Number(revenueRes.rows[0]?.total_rev || 0);

    // 1.4 BIỂU ĐỒ CÔNG SUẤT
    const timelineSql = `
      WITH DailyOccupied AS (
        SELECT 
          night_series::date AS stay_day,
          COALESCE(SUM(COALESCE(br.quantity, 1)), 0)::int AS occupied_rooms
        FROM public.booking b
        JOIN public.hotel h ON h.id = b.hotel_id
        LEFT JOIN public.booking_room br ON br.booking_id = b.id
        CROSS JOIN LATERAL generate_series(
          b.checkin_date, 
          (b.checkout_date - INTERVAL '1 day')::date, 
          INTERVAL '1 day'
        ) AS night_series
        WHERE ${hotelFilter} 
          AND b.status NOT IN ('cancelled')
          AND night_series >= $${pStart}::date AND night_series <= $${pEnd}::date
        GROUP BY night_series::date
      )
      SELECT 
        TO_CHAR(stay_day, 'DD') AS day,
        occupied_rooms
      FROM DailyOccupied
      ORDER BY stay_day ASC
    `;
    const timelineRes = await pool.query(timelineSql, timeParams);

    const occMap = new Map();
    timelineRes.rows.forEach((r) => {
      occMap.set(r.day, Number(r.occupied_rooms || 0));
    });

    const occupancyTimeline = [];
    if (range === "this_month") {
      for (let d = todayDateNum; d <= lastDayOfMonthNum; d++) {
        const dayStr = String(d).padStart(2, "0");
        const occupiedRooms = totalRooms > 0 ? occMap.get(dayStr) || 0 : 0;
        const rate =
          totalRooms > 0
            ? Math.min(100, Math.round((occupiedRooms / totalRooms) * 100))
            : 0;
        occupancyTimeline.push({ day: dayStr, rate });
      }
    } else {
      const sDateObj = new Date(startDate);
      const eDateObj = new Date(endDate);
      let curr = new Date(sDateObj);
      while (curr <= eDateObj) {
        const dayStr = String(curr.getDate()).padStart(2, "0");
        const occupiedRooms = totalRooms > 0 ? occMap.get(dayStr) || 0 : 0;
        const rate =
          totalRooms > 0
            ? Math.min(100, Math.round((occupiedRooms / totalRooms) * 100))
            : 0;
        occupancyTimeline.push({ day: dayStr, rate });
        curr.setDate(curr.getDate() + 1);
      }
    }

    // 1.5 BIỂU ĐỒ DOANH THU THUẦN
    let revenueTimeline = [];
    if (revTab === "hour") {
      const revHourSql = `
        SELECT 
          TO_CHAR(b.created_at, 'HH24:00') AS label,
          COALESCE(SUM(b.total_price), 0)::bigint AS revenue
        FROM public.booking b
        JOIN public.hotel h ON h.id = b.hotel_id
        WHERE ${hotelFilter} 
          AND b.status NOT IN ('cancelled') 
          AND b.payment_status = 'paid'
          AND b.created_at::date >= $${pStart}::date AND b.created_at::date <= $${pEnd}::date
        GROUP BY TO_CHAR(b.created_at, 'HH24:00')
        ORDER BY label ASC
      `;
      const resHour = await pool.query(revHourSql, timeParams);
      const hourMap = new Map();
      resHour.rows.forEach((r) => hourMap.set(r.label, Number(r.revenue || 0)));

      for (let h = 6; h <= 23; h++) {
        const hourStr = `${String(h).padStart(2, "0")}:00`;
        revenueTimeline.push({
          label: hourStr,
          revenue: hourMap.get(hourStr) || 0,
        });
      }
    } else if (revTab === "weekday") {
      const revDayOfWeekSql = `
        SELECT 
          EXTRACT(ISODOW FROM b.created_at)::int AS dow,
          COALESCE(SUM(b.total_price), 0)::bigint AS revenue
        FROM public.booking b
        JOIN public.hotel h ON h.id = b.hotel_id
        WHERE ${hotelFilter} 
          AND b.status NOT IN ('cancelled') 
          AND b.payment_status = 'paid'
          AND b.created_at::date >= $${pStart}::date AND b.created_at::date <= $${pEnd}::date
        GROUP BY EXTRACT(ISODOW FROM b.created_at)
        ORDER BY dow ASC
      `;
      const resDayOfWeek = await pool.query(revDayOfWeekSql, timeParams);
      const dowMap = new Map();
      resDayOfWeek.rows.forEach((r) =>
        dowMap.set(r.dow, Number(r.revenue || 0)),
      );

      const weekdayNames = [
        "Thứ 2",
        "Thứ 3",
        "Thứ 4",
        "Thứ 5",
        "Thứ 6",
        "Thứ 7",
        "Chủ Nhật",
      ];
      for (let i = 1; i <= 7; i++) {
        revenueTimeline.push({
          label: weekdayNames[i - 1],
          revenue: dowMap.get(i) || 0,
        });
      }
    } else {
      const revDaySql = `
        SELECT 
          TO_CHAR(b.created_at::date, 'DD') AS day,
          COALESCE(SUM(b.total_price), 0)::bigint AS revenue
        FROM public.booking b
        JOIN public.hotel h ON h.id = b.hotel_id
        WHERE ${hotelFilter} 
          AND b.status NOT IN ('cancelled') 
          AND b.payment_status = 'paid'
          AND b.created_at::date >= $${pStart}::date AND b.created_at::date <= $${pEnd}::date
        GROUP BY b.created_at::date
        ORDER BY b.created_at::date ASC
      `;
      const resDay = await pool.query(revDaySql, timeParams);
      const revMap = new Map();
      resDay.rows.forEach((r) => revMap.set(r.day, Number(r.revenue || 0)));

      const maxDay =
        range === "this_month"
          ? Math.min(todayDateNum + 1, lastDayOfMonthNum)
          : lastDayOfMonthNum;
      for (let d = 1; d <= maxDay; d++) {
        const dayStr = String(d).padStart(2, "0");
        revenueTimeline.push({
          label: dayStr,
          revenue: revMap.get(dayStr) || 0,
        });
      }
    }

    // 1.6 TOP 10 HẠNG PHÒNG (Nếu không có phòng thì trả mảng rỗng, KHÔNG bơm dữ liệu ảo)
    const topRoomsSql = `
      SELECT 
        COALESCE(r.name, br.room_name, 'Hạng phòng') AS name,
        COALESCE(SUM(b.total_price), 0)::bigint AS revenue,
        COUNT(b.id)::int AS quantity
      FROM public.room r
      JOIN public.hotel h ON h.id = r.hotel_id
      LEFT JOIN public.booking_room br ON br.room_id = r.id
      LEFT JOIN public.booking b ON b.id = br.booking_id 
        AND b.status NOT IN ('cancelled') 
        AND b.payment_status = 'paid'
        AND b.created_at::date >= $${pStart}::date AND b.created_at::date <= $${pEnd}::date
      WHERE ${hotelFilter} AND r.is_active = true
      GROUP BY 1
      ORDER BY revenue DESC
      LIMIT 10
    `;
    const topRoomsRes = await pool.query(topRoomsSql, timeParams);

    const topRooms = topRoomsRes.rows.map((r) => ({
      name: String(r.name),
      revenue: Number(r.revenue || 0),
      quantity: Number(r.quantity || 0),
    }));

    return res.json({
      success: true,
      occupancyCurrent: {
        occupied: occupiedCount,
        vacant: vacantCount,
        total: totalRooms,
        rate: currentRate,
        vacantRate: vacantRate,
      },
      revenueTotal,
      occupancyTimeline,
      revenueTimeline,
      topRooms,
    });
  } catch (error) {
    console.error("❌ LỖI GET_OWNER_STATS:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ─── 2. DANH SÁCH ĐƠN HÀNG ───
async function getOwnerBookings(req, res, next) {
  try {
    const ownerId = req.user?.id || req.user?.userId || req.auth?.sub;
    if (!ownerId)
      return res.status(401).json({ message: "Vui lòng đăng nhập." });

    const result = await pool.query(
      `SELECT b.*, h.name AS hotel_name, 
              COALESCE(u.full_name, b.customer_name) AS customer_name, 
              COALESCE(u.phone, b.guest_phone) AS guest_phone,
              COALESCE((SELECT br.room_name FROM public.booking_room br WHERE br.booking_id = b.id LIMIT 1), 'Phòng tiêu chuẩn') AS room_name
       FROM public.booking b
       JOIN public.hotel h ON h.id = b.hotel_id
       LEFT JOIN public.users u ON u.id = b.user_id
       WHERE h.owner_id = $1
       ORDER BY b.created_at DESC`,
      [ownerId],
    );
    return res.json({
      success: true,
      data: result.rows || [],
      bookings: result.rows || [],
    });
  } catch (error) {
    return res.json({
      success: true,
      data: [],
      bookings: [],
      error: error.message,
    });
  }
}

// ─── 3. ĐẶT PHÒNG TẠI QUẦY (WALK-IN) ───
async function createWalkInBooking(req, res, next) {
  const client = await pool.connect();
  try {
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
    const newBookingId = require("crypto").randomUUID();
    const bookingCode = "WI" + Math.floor(10000000 + Math.random() * 90000000);
    const status = is_check_in_now ? "checked_in" : "confirmed";

    await client.query("BEGIN");
    const insertBooking = await client.query(
      `INSERT INTO public.booking (
        id, booking_code, hotel_id, status, payment_status, total_price,
        checkin_date, checkout_date, adult_total, children_total,
        customer_name, guest_email, guest_phone, subtotal, confirmed_at, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4::public.booking_status_enum, 'paid'::public.booking_payment_status_enum, $5,
        $6::date, $7::date, 2, 0,
        $8, 'walkin@hotel.internal', $9, $5, NOW(), NOW(), NOW()
      ) RETURNING *;`,
      [
        newBookingId,
        bookingCode,
        hotel_id,
        status,
        Number(total_price),
        checkin_date || new Date().toISOString().split("T")[0],
        checkout_date,
        customer_name,
        guest_phone || "",
      ],
    );

    if (room_id) {
      await client.query(
        `INSERT INTO public.booking_room (id, booking_id, room_id, quantity, price, room_name, book_date, created_at)
         VALUES (gen_random_uuid(), $1, $2, 1, $3, 'Phòng trực tiếp', $4::date, NOW())`,
        [
          newBookingId,
          room_id,
          Number(total_price),
          checkin_date || new Date(),
        ],
      );
    }
    await client.query("COMMIT");
    return res.status(201).json({
      success: true,
      booking: insertBooking.rows[0],
      message: "✓ Tạo đơn tại quầy thành công!",
    });
  } catch (err) {
    await client.query("ROLLBACK");
    return res.status(500).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
}

// ─── 4. CHECK-IN ───
async function handleOwnerCheckIn(req, res, next) {
  try {
    const ownerId = req.user?.id || req.user?.userId || req.auth?.sub;
    const { id } = req.params;
    const { early_fee = 0, room_number = "" } = req.body;

    const updateRes = await pool.query(
      `UPDATE public.booking b
       SET status = 'checked_in'::public.booking_status_enum, 
           payment_status = 'paid'::public.booking_payment_status_enum,
           total_price = b.total_price + $1, 
           room_number = COALESCE($2, b.room_number), 
           updated_at = NOW()
       FROM public.hotel h
       WHERE b.hotel_id = h.id AND h.owner_id = $3 AND (b.id::text = $4 OR b.booking_code = $4)
       RETURNING b.*`,
      [Number(early_fee), room_number || null, ownerId, id],
    );
    return res.json({ success: true, booking: updateRes.rows[0] });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ─── 5. CHECK-OUT ───
async function handleOwnerCheckOut(req, res, next) {
  try {
    const ownerId = req.user?.id || req.user?.userId || req.auth?.sub;
    const { id } = req.params;
    const { late_fee = 0, minibar_fee = 0, other_fee = 0 } = req.body;
    const totalExtra =
      Number(late_fee) + Number(minibar_fee) + Number(other_fee);

    const updateRes = await pool.query(
      `UPDATE public.booking b
       SET status = 'checked_out'::public.booking_status_enum, 
           payment_status = 'paid'::public.booking_payment_status_enum,
           total_price = b.total_price + $1, 
           updated_at = NOW()
       FROM public.hotel h
       WHERE b.hotel_id = h.id AND h.owner_id = $2 AND (b.id::text = $3 OR b.booking_code = $3)
       RETURNING b.*`,
      [totalExtra, ownerId, id],
    );
    return res.json({ success: true, booking: updateRes.rows[0] });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ─── 6. CẬP NHẬT TRẠNG THÁI ĐƠN ───
async function updateOwnerBookingStatus(req, res, next) {
  try {
    const ownerId = req.user?.id || req.user?.userId || req.auth?.sub;
    const { id } = req.params;
    const { status, payment_status } = req.body;

    const updateRes = await pool.query(
      `UPDATE public.booking b
       SET status = COALESCE($1::public.booking_status_enum, b.status),
           payment_status = COALESCE($2::public.booking_payment_status_enum, b.payment_status), 
           updated_at = NOW()
       FROM public.hotel h
       WHERE b.hotel_id = h.id AND h.owner_id = $3 AND (b.id::text = $4 OR b.booking_code = $4)
       RETURNING b.*`,
      [status || null, payment_status || null, ownerId, id],
    );
    return res.json({ success: true, booking: updateRes.rows[0] });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function updateHotelInfo(req, res, next) {
  return res.json({ success: true });
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
