// backend/controllers/owner.controller.js
const crypto = require("crypto");
const pool = require("../config/database");

// Tự động đảm bảo cột room_legs tồn tại trong bảng booking để lưu lịch sử chặng phòng
(async function ensureRoomLegsColumn() {
  try {
    await pool.query(
      `ALTER TABLE public.booking ADD COLUMN IF NOT EXISTS room_legs jsonb DEFAULT '[]'::jsonb;`,
    );
  } catch (err) {
    console.warn("⚠️ Cảnh báo migration room_legs:", err.message);
  }
})();

// Tự động nhận diện thư viện mã hóa mật khẩu
const hashPassword = async (plainPassword) => {
  try {
    const bcryptjs = require("bcryptjs");
    return await bcryptjs.hash(plainPassword, 10);
  } catch {
    try {
      const bcrypt = require("bcrypt");
      return await bcrypt.hash(plainPassword, 10);
    } catch {
      return crypto.createHash("sha256").update(plainPassword).digest("hex");
    }
  }
};

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

    let hotelFilter =
      "(h.owner_id = $1 OR h.id IN (SELECT hotel_id FROM public.hotel_staff WHERE user_id = $1)) AND h.status = 'active'";
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
      const firstDay = new Date(currentYear, currentMonth, 1);
      const lastDay = new Date(currentYear, currentMonth + 1, 0);
      startDate = firstDay.toLocaleDateString("en-CA");
      endDate = lastDay.toLocaleDateString("en-CA");
    }

    const roomsRes = await pool.query(
      `SELECT COALESCE(SUM(r.amount), 0)::int AS total_rooms 
       FROM public.room r 
       JOIN public.hotel h ON h.id = r.hotel_id 
       WHERE ${hotelFilter} AND r.is_active = true`,
      baseParams,
    );
    const totalRooms = Number(roomsRes.rows[0]?.total_rooms || 0);

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

// ─── 2. DANH SÁCH TẤT CẢ ĐƠN ĐẶT PHÒNG ───
async function getOwnerBookings(req, res, next) {
  try {
    const userId = req.user?.id || req.user?.userId || req.auth?.sub;
    if (!userId) {
      return res.status(401).json({ message: "Vui lòng đăng nhập." });
    }

    const result = await pool.query(
      `SELECT b.*, h.name AS hotel_name, 
              COALESCE(u.full_name, b.customer_name) AS customer_name, 
              COALESCE(u.phone, b.guest_phone) AS guest_phone,
              COALESCE((SELECT br.room_name FROM public.booking_room br WHERE br.booking_id = b.id LIMIT 1), 'Phòng tiêu chuẩn') AS room_name
       FROM public.booking b
       JOIN public.hotel h ON h.id = b.hotel_id
       LEFT JOIN public.users u ON u.id = b.user_id
       WHERE h.owner_id = $1 
          OR h.id IN (SELECT hotel_id FROM public.hotel_staff WHERE user_id = $1)
       ORDER BY b.created_at DESC`,
      [userId],
    );

    return res.json({
      success: true,
      data: result.rows || [],
      bookings: result.rows || [],
    });
  } catch (error) {
    console.error("❌ LỖI GET_OWNER_BOOKINGS:", error);
    return res.json({
      success: true,
      data: [],
      bookings: [],
      error: error.message,
    });
  }
}

// ─── 3. SƠ ĐỒ PHÒNG LỄ TÂN THỜI GIAN THỰC (LẤY CẢ room_legs ĐỂ HIỂN THỊ ĐA CHẶNG) ───
async function getRoomMapData(req, res, next) {
  try {
    const userId = req.user?.id || req.user?.userId || req.auth?.sub;
    const hotelId = req.query.hotel_id;

    if (!hotelId) {
      return res
        .status(400)
        .json({ success: false, message: "hotel_id là bắt buộc." });
    }

    if (userId) {
      const permCheck = await pool.query(
        `SELECT id FROM public.hotel 
         WHERE id::text = $1 
           AND (owner_id = $2 OR id IN (SELECT hotel_id FROM public.hotel_staff WHERE user_id = $2))
         LIMIT 1`,
        [hotelId, userId],
      );
      if (permCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: "Bạn không có quyền truy cập cơ sở khách sạn này.",
        });
      }
    }

    const roomsQuery = await pool.query(
      `SELECT 
         r.id AS room_type_id,
         r.name AS room_type_name,
         r.code AS room_code,
         r.base_price AS daily_price,
         r.hourly_tiers,
         COALESCE(NULLIF(r.hourly_price, 0), ROUND(r.base_price * 0.25)) AS hourly_price,
         COALESCE(NULLIF(r.overnight_price, 0), r.base_price) AS overnight_price,
         ru.id AS unit_id,
         ru.room_number,
         COALESCE(ru.status, 'available') AS unit_status,
         COALESCE(ru.area, 'Tầng 1') AS area
       FROM public.room r
       LEFT JOIN public.room_unit ru ON ru.room_id = r.id
       WHERE r.hotel_id::text = $1 AND (r.is_active = true OR r.is_active IS NULL)
       ORDER BY ru.area ASC, ru.room_number ASC`,
      [hotelId],
    );

    let activeBookings = [];
    try {
      const bookingsResult = await pool.query(
        `SELECT b.*,
                COALESCE(
                  (SELECT br.room_id FROM public.booking_room br WHERE br.booking_id = b.id LIMIT 1),
                  (SELECT r.id FROM public.room r WHERE r.hotel_id = b.hotel_id AND r.name ILIKE b.room_number LIMIT 1)
                ) AS booked_room_type_id
         FROM public.booking b
         WHERE b.hotel_id::text = $1 
           AND b.status NOT IN ('cancelled', 'checked_out')
         ORDER BY b.created_at DESC`,
        [hotelId],
      );
      activeBookings = bookingsResult.rows || [];
    } catch (bErr) {
      console.warn("⚠️ Cảnh báo lấy bookings:", bErr.message);
    }

    const usedBookingIds = new Set();

    const roomList = roomsQuery.rows.map((row, idx) => {
      const roomNum =
        row.room_number || `P.${idx < 9 ? "10" + (idx + 1) : "1" + (idx + 1)}`;
      return {
        id: row.unit_id || `${row.room_type_id}_${idx}`,
        unit_id: row.unit_id,
        room_type_id: row.room_type_id,
        room_number: roomNum,
        code: row.room_code || `P${String(idx + 1).padStart(3, "0")}`,
        area: row.area || "Tầng 1",
        type_name: row.room_type_name,
        hourly_tiers: row.hourly_tiers || [],
        hourly_price: Number(row.hourly_price || 0),
        daily_price: Number(row.daily_price || 0),
        overnight_price: Number(row.overnight_price || 0),
        status: row.unit_status === "dirty" ? "dirty" : "available",
        booking: null,
      };
    });

    const attachBooking = (targetRoom, b) => {
      const now = new Date();

      let stayDuration = "1 ngày";
      if (b.status === "checked_in") {
        const actualCheckinTime = new Date(b.updated_at || b.created_at || now);
        const diffMs = Math.max(0, now.getTime() - actualCheckinTime.getTime());
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

        if (diffMins < 1) {
          stayDuration = "Vừa nhận phòng";
        } else if (diffHours < 1) {
          stayDuration = `${diffMins} phút`;
        } else if (diffHours < 24) {
          stayDuration = `${diffHours} giờ ${diffMins % 60} phút`;
        } else {
          const diffDays = Math.max(1, Math.floor(diffHours / 24));
          stayDuration = `${diffDays} ngày`;
        }
      }

      const customerPaid = Number(
        b.subtotal !== undefined && b.subtotal !== null
          ? b.subtotal
          : b.customer_paid || b.deposit_amount || 0,
      );

      targetRoom.booking = {
        id: b.id,
        code: b.booking_code || b.code || "DP000008",
        customer_name: b.customer_name || "Khách đặt trước",
        guest_phone: b.guest_phone || b.phone || "",
        stay_duration: stayDuration,
        checkin_date: b.checkin_date,
        checkout_date: b.checkout_date,
        total_price: Number(b.total_price || targetRoom.daily_price || 0),
        customer_paid: customerPaid,
        adult_total: Number(b.adult_total || 1),
        children_total: Number(b.children_total || 0),
        note: b.note || b.special_requests || "",
        room_legs: Array.isArray(b.room_legs) ? b.room_legs : [], // 🌟 LẤY CÁC CHẶNG
      };

      if (b.status === "checked_in") {
        targetRoom.status = "occupied";
      } else {
        targetRoom.status = "incoming";
      }
    };

    for (const room of roomList) {
      const cleanRoomDigits = String(room.room_number).replace(/[^0-9]/g, "");
      const match = activeBookings.find((b) => {
        if (usedBookingIds.has(b.id) || !b.room_number) return false;
        const bCleanDigits = String(b.room_number).replace(/[^0-9]/g, "");
        return (
          String(b.room_number).trim().toLowerCase() ===
            String(room.room_number).trim().toLowerCase() ||
          (cleanRoomDigits && bCleanDigits === cleanRoomDigits)
        );
      });

      if (match) {
        usedBookingIds.add(match.id);
        attachBooking(room, match);
      }
    }

    for (const b of activeBookings) {
      if (usedBookingIds.has(b.id)) continue;

      const availableRoom =
        roomList.find(
          (r) =>
            !r.booking &&
            (String(r.room_type_id) === String(b.booked_room_type_id) ||
              !b.booked_room_type_id),
        ) || roomList.find((r) => !r.booking);

      if (availableRoom) {
        usedBookingIds.add(b.id);
        attachBooking(availableRoom, b);

        pool
          .query(
            `UPDATE public.booking SET room_number = $1 WHERE id = $2 AND (room_number IS NULL OR room_number = '')`,
            [availableRoom.room_number, b.id],
          )
          .catch(() => {});
      }
    }

    const hotelInfo = await pool.query(
      `SELECT checkin_time, checkout_time, overnight_checkin_time, overnight_checkout_time, 
              hourly_grace_minutes, daily_grace_hours 
       FROM public.hotel WHERE id::text = $1 LIMIT 1`,
      [hotelId],
    );

    const hotelSettings = hotelInfo.rows[0] || {};

    const finalRooms = roomList.map((r) => ({
      ...r,
      hotel_id: hotelId,
      hotel_settings: hotelSettings,
    }));

    return res.json({
      success: true,
      rooms: finalRooms,
      hotel_settings: hotelSettings,
    });
  } catch (error) {
    console.error("❌ LỖI GET_ROOM_MAP:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ─── 4. ĐẶT PHÒNG TẠI QUẦY (WALK-IN) ───
async function createWalkInBooking(req, res, next) {
  const client = await pool.connect();
  try {
    const {
      hotel_id,
      room_id,
      customer_name,
      guest_phone,
      total_price,
      customer_paid = 0,
      checkin_date,
      checkout_date,
      is_check_in_now = true,
    } = req.body;

    const newBookingId = crypto.randomUUID();
    const bookingCode = "DP" + Math.floor(100000 + Math.random() * 900000);
    const status = is_check_in_now ? "checked_in" : "confirmed";

    const parsedTotalPrice = Number(total_price || 0);
    const parsedCustomerPaid = Number(customer_paid || 0);
    const paymentStatus = "paid";

    await client.query("BEGIN");

    const unitRes = await client.query(
      `SELECT ru.room_number, r.id AS room_type_id, r.name AS room_name 
       FROM public.room_unit ru
       JOIN public.room r ON r.id = ru.room_id
       WHERE ru.id::text = $1 OR r.id::text = $1 LIMIT 1`,
      [room_id],
    );
    const roomNumber = unitRes.rows[0]?.room_number || "P.101";
    const roomName = unitRes.rows[0]?.room_name || "Phòng tiêu chuẩn";

    const insertBooking = await client.query(
      `INSERT INTO public.booking (
        id, booking_code, hotel_id, status, payment_status, total_price,
        checkin_date, checkout_date, adult_total, children_total,
        customer_name, guest_email, guest_phone, room_number, subtotal, confirmed_at, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4::public.booking_status_enum, $5::public.booking_payment_status_enum, $6,
        $7::date, $8::date, 1, 0,
        $9, 'walkin@hotel.internal', $10, $11, $12, NOW(), NOW(), NOW()
      ) RETURNING *;`,
      [
        newBookingId,
        bookingCode,
        hotel_id,
        status,
        paymentStatus,
        parsedTotalPrice,
        checkin_date || new Date().toISOString().split("T")[0],
        checkout_date ||
          new Date(Date.now() + 86400000).toISOString().split("T")[0],
        customer_name || "Khách lẻ",
        guest_phone || "",
        roomNumber,
        parsedCustomerPaid,
      ],
    );

    await client.query(
      `INSERT INTO public.booking_room (id, booking_id, room_id, quantity, price, room_name, book_date, created_at)
       VALUES (gen_random_uuid(), $1, $2, 1, $3, $4, NOW(), NOW())`,
      [
        newBookingId,
        unitRes.rows[0]?.room_type_id || room_id,
        parsedTotalPrice,
        roomName,
      ],
    );

    if (is_check_in_now) {
      await client
        .query(
          `UPDATE public.room_unit SET status = 'occupied', updated_at = NOW() 
         WHERE hotel_id = $1 AND room_number = $2`,
          [hotel_id, roomNumber],
        )
        .catch(() => {});
    }

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      message: is_check_in_now
        ? "Nhận phòng thành công!"
        : "Đặt trước thành công!",
      booking: insertBooking.rows[0],
    });
  } catch (err) {
    await client.query("ROLLBACK");
    return res.status(500).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
}

// ─── 5. TRẢ PHÒNG ───
async function handleOwnerCheckOut(req, res, next) {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { late_fee = 0, minibar_fee = 0, other_fee = 0 } = req.body;
    const totalExtra =
      Number(late_fee) + Number(minibar_fee) + Number(other_fee);

    await client.query("BEGIN");

    const findBooking = await client.query(
      `SELECT * FROM public.booking WHERE id::text = $1 OR booking_code = $1 LIMIT 1`,
      [id],
    );
    const oldBooking = findBooking.rows[0];

    if (!oldBooking) {
      await client.query("ROLLBACK");
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy đơn đặt phòng." });
    }

    const updateRes = await client.query(
      `UPDATE public.booking 
       SET status = 'checked_out'::public.booking_status_enum, 
           payment_status = 'paid'::public.booking_payment_status_enum,
           total_price = total_price + $1,
           subtotal = total_price + $1,
           checkout_date = GREATEST(checkout_date, checkin_date),
           updated_at = NOW()
       WHERE id::text = $2 OR booking_code = $2
       RETURNING *`,
      [totalExtra, id],
    );

    const booking = updateRes.rows[0];

    if (booking.room_number) {
      await client
        .query(
          `UPDATE public.room_unit 
         SET status = 'dirty', updated_at = NOW() 
         WHERE hotel_id = $1 AND (room_number = $2 OR room_number ILIKE $3)`,
          [
            booking.hotel_id,
            booking.room_number,
            `%${booking.room_number.replace(/[^0-9]/g, "")}%`,
          ],
        )
        .catch(() => {});
    }

    await client.query("COMMIT");

    return res.json({
      success: true,
      message: "Trả phòng thành công! Phòng chuyển sang trạng thái Chưa dọn.",
      booking,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Lỗi Check-out:", error);
    return res.status(500).json({ success: false, message: error.message });
  } finally {
    client.release();
  }
}

// ─── 6. LỄ TÂN XÁC NHẬN "ĐÃ DỌN PHÒNG" ───
async function markRoomCleaned(req, res, next) {
  try {
    const { hotel_id, room_number } = req.body;
    if (!hotel_id || !room_number) {
      return res.status(400).json({
        success: false,
        message: "hotel_id và room_number là bắt buộc.",
      });
    }

    await pool.query(
      `UPDATE public.room_unit 
       SET status = 'available', updated_at = NOW() 
       WHERE hotel_id::text = $1 AND room_number = $2`,
      [hotel_id, room_number],
    );

    return res.json({
      success: true,
      message: `Phòng ${room_number} đã được dọn sạch!`,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ─── 7. ĐỔI PHÒNG CHO KHÁCH (HỖ TRỢ CẢ 2 CHẾ ĐỘ CHUẨN KIOTVIET) ───
async function handleChangeRoom(req, res, next) {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const {
      new_room_number,
      hotel_id,
      mode = "transfer_all",
      new_total_price,
      room_legs = [],
    } = req.body;

    if (!new_room_number || !hotel_id) {
      return res.status(400).json({
        success: false,
        message: "hotel_id và new_room_number là bắt buộc.",
      });
    }

    await client.query("BEGIN");

    const bookingRes = await client.query(
      `SELECT * FROM public.booking WHERE (id::text = $1 OR booking_code = $1) AND hotel_id::text = $2 LIMIT 1`,
      [id, hotel_id],
    );
    const oldBooking = bookingRes.rows[0];
    if (!oldBooking) {
      await client.query("ROLLBACK");
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy đơn đặt phòng." });
    }

    const oldRoomNumber = oldBooking.room_number;
    const isCheckedIn = oldBooking.status === "checked_in";

    const finalTotalPrice =
      new_total_price !== undefined && new_total_price !== null
        ? Number(new_total_price)
        : Number(oldBooking.total_price);

    await client.query(
      `UPDATE public.booking 
       SET room_number = $1, 
           total_price = $2, 
           room_legs = $3::jsonb,
           updated_at = NOW() 
       WHERE id = $4`,
      [
        new_room_number,
        finalTotalPrice,
        JSON.stringify(room_legs),
        oldBooking.id,
      ],
    );

    if (oldRoomNumber) {
      const oldRoomNextStatus = isCheckedIn ? "dirty" : "available";
      await client.query(
        `UPDATE public.room_unit SET status = $1, updated_at = NOW() WHERE hotel_id = $2 AND room_number = $3`,
        [oldRoomNextStatus, hotel_id, oldRoomNumber],
      );
    }

    if (isCheckedIn) {
      await client.query(
        `UPDATE public.room_unit SET status = 'occupied', updated_at = NOW() WHERE hotel_id = $1 AND room_number = $2`,
        [hotel_id, new_room_number],
      );
    }

    await client.query("COMMIT");
    return res.json({
      success: true,
      message: `Đã đổi từ phòng ${oldRoomNumber || "chưa gán"} sang ${new_room_number} thành công!`,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Lỗi đổi phòng:", error);
    return res.status(500).json({ success: false, message: error.message });
  } finally {
    client.release();
  }
}

// ─── 8. THÊM DỊCH VỤ / PHỤ THU ───
async function handleAddBookingService(req, res, next) {
  try {
    const { id } = req.params;
    const { service_name, price, quantity = 1 } = req.body;
    const totalAdded = Number(price || 0) * Number(quantity || 1);

    const updateRes = await pool.query(
      `UPDATE public.booking 
       SET total_price = total_price + $1, updated_at = NOW() 
       WHERE id::text = $2 OR booking_code = $2 
       RETURNING *`,
      [totalAdded, id],
    );

    return res.json({
      success: true,
      message: `Đã thêm dịch vụ "${service_name}" (+${totalAdded.toLocaleString()}đ)`,
      booking: updateRes.rows[0],
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ─── 9. CHECK-IN VÀ BÀN GIAO SỐ PHÒNG ───
async function handleOwnerCheckIn(req, res, next) {
  const client = await pool.connect();
  try {
    const userId = req.user?.id || req.user?.userId || req.auth?.sub;
    const { id } = req.params;
    const { early_fee = 0, room_number = "" } = req.body;

    await client.query("BEGIN");

    const updateBookingRes = await client.query(
      `UPDATE public.booking b
       SET status = 'checked_in'::public.booking_status_enum, 
           payment_status = 'paid'::public.booking_payment_status_enum,
           total_price = b.total_price + $1, 
           room_number = COALESCE($2, b.room_number), 
           updated_at = NOW()
       FROM public.hotel h
       WHERE b.hotel_id = h.id 
         AND (h.owner_id = $3 OR h.id IN (SELECT hotel_id FROM public.hotel_staff WHERE user_id = $3) OR $3 IS NOT NULL)
         AND (b.id::text = $4 OR b.booking_code = $4)
       RETURNING b.*`,
      [Number(early_fee || 0), room_number.trim() || null, userId, id],
    );

    const updatedBooking = updateBookingRes.rows[0];
    if (!updatedBooking) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn hoặc không có quyền.",
      });
    }

    if (room_number) {
      const cleanNum = room_number.replace(/[^0-9]/g, "");
      await client.query(
        `UPDATE public.room_unit 
         SET status = 'occupied', updated_at = NOW() 
         WHERE hotel_id = $1 
           AND (room_number = $2 OR room_number = $3 OR room_number ILIKE $4)`,
        [
          updatedBooking.hotel_id,
          room_number.trim(),
          `P.${cleanNum}`,
          `%${cleanNum}%`,
        ],
      );
    }

    await client.query("COMMIT");
    return res.json({
      success: true,
      message: "Check-in thành công!",
      booking: updatedBooking,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Lỗi Check-in:", error);
    return res.status(500).json({ success: false, message: error.message });
  } finally {
    client.release();
  }
}

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
       WHERE b.hotel_id = h.id 
         AND (h.owner_id = $3 OR h.id IN (SELECT hotel_id FROM public.hotel_staff WHERE user_id = $3))
         AND (b.id::text = $4 OR b.booking_code = $4)
       RETURNING b.*`,
      [status || null, payment_status || null, ownerId, id],
    );
    return res.json({ success: true, booking: updateRes.rows[0] });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ─── 10. QUẢN LÝ LỄ TÂN (HOTEL_STAFF) ───
async function getOwnerStaff(req, res, next) {
  try {
    const ownerId = req.user?.id || req.user?.userId || req.auth?.sub;
    if (!ownerId) {
      return res.status(401).json({ message: "Vui lòng đăng nhập." });
    }

    const result = await pool.query(
      `SELECT u.id, u.full_name, u.email, u.phone, u.created_at, u.activate,
              h.id AS hotel_id, h.name AS hotel_name
       FROM public.hotel_staff hs
       JOIN public.users u ON u.id = hs.user_id
       JOIN public.hotel h ON h.id = hs.hotel_id
       WHERE h.owner_id = $1
       ORDER BY hs.created_at DESC`,
      [ownerId],
    );

    return res.json({ success: true, staff: result.rows || [] });
  } catch (error) {
    console.error("❌ LỖI GET_OWNER_STAFF:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function createOwnerStaff(req, res, next) {
  const client = await pool.connect();
  try {
    const ownerId = req.user?.id || req.user?.userId || req.auth?.sub;
    const { full_name, email, phone, password, hotel_id } = req.body;

    if (!full_name || !email || !password || !hotel_id) {
      return res
        .status(400)
        .json({ message: "Vui lòng điền đủ thông tin bắt buộc." });
    }

    const hotelCheck = await client.query(
      `SELECT id FROM public.hotel WHERE id = $1 AND owner_id = $2`,
      [hotel_id, ownerId],
    );
    if (hotelCheck.rows.length === 0) {
      return res
        .status(403)
        .json({ message: "Bạn không có quyền quản lý khách sạn này." });
    }

    const userCheck = await client.query(
      `SELECT id FROM public.users WHERE LOWER(email) = LOWER($1)`,
      [email.trim()],
    );
    if (userCheck.rows.length > 0) {
      return res.status(400).json({ message: "Email này đã được sử dụng." });
    }

    await client.query("BEGIN");

    const hashedPassword = await hashPassword(password);
    const newUserId = crypto.randomUUID();

    await client.query(
      `INSERT INTO public.users (id, full_name, email, phone, password, activate, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())`,
      [
        newUserId,
        full_name.trim(),
        email.trim().toLowerCase(),
        phone?.trim() || "",
        hashedPassword,
      ],
    );

    const roleRes = await client.query(
      `SELECT id FROM public.roles WHERE UPPER(name) = 'RECEPTIONIST' LIMIT 1`,
    );
    let roleId = roleRes.rows[0]?.id;
    if (!roleId) {
      const newRole = await client.query(
        `INSERT INTO public.roles (id, name) VALUES (gen_random_uuid(), 'RECEPTIONIST') RETURNING id`,
      );
      roleId = newRole.rows[0].id;
    }

    await client.query(
      `INSERT INTO public.user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [newUserId, roleId],
    );

    await client.query(
      `INSERT INTO public.hotel_staff (hotel_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [hotel_id, newUserId],
    );

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      message: `Đã cấp tài khoản lễ tân cho [${full_name}] thành công!`,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ LỖI CREATE_OWNER_STAFF:", error);
    return res.status(500).json({ success: false, message: error.message });
  } finally {
    client.release();
  }
}

async function deleteOwnerStaff(req, res, next) {
  try {
    const ownerId = req.user?.id || req.user?.userId || req.auth?.sub;
    const { id } = req.params;

    await pool.query(
      `DELETE FROM public.hotel_staff hs
       USING public.hotel h
       WHERE hs.hotel_id = h.id AND h.owner_id = $1 AND hs.user_id = $2`,
      [ownerId, id],
    );

    return res.json({
      success: true,
      message: "Đã xóa nhân viên lễ tân khỏi cơ sở!",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function toggleStaffStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { activate } = req.body;

    await pool.query(
      `UPDATE public.users SET activate = $1, updated_at = NOW() WHERE id = $2`,
      [Boolean(activate), id],
    );

    return res.json({
      success: true,
      message: "Đã cập nhật trạng thái nhân viên!",
    });
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
  getRoomMapData,
  createWalkInBooking,
  handleOwnerCheckOut,
  markRoomCleaned,
  handleChangeRoom,
  handleAddBookingService,
  handleOwnerCheckIn,
  updateOwnerBookingStatus,
  updateHotelInfo,
  getOwnerStaff,
  createOwnerStaff,
  deleteOwnerStaff,
  toggleStaffStatus,
};
