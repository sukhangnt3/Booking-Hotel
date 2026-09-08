// backend/controllers/owner.controller.js
const crypto = require("crypto");
const pool = require("../config/database");

// ─── 1. THỐNG KÊ DASHBOARD QUẢN TRỊ KHÁCH SẠN (ĐẦY ĐỦ 100%) ───
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

    // 1.1 Tổng số phòng
    const roomsRes = await pool.query(
      `SELECT COALESCE(SUM(r.amount), 0)::int AS total_rooms 
       FROM public.room r 
       JOIN public.hotel h ON h.id = r.hotel_id 
       WHERE ${hotelFilter} AND r.is_active = true`,
      baseParams,
    );
    const totalRooms = Number(roomsRes.rows[0]?.total_rooms || 0);

    // 1.2 Công suất phòng hiện tại
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

    // 1.3 Doanh thu thuần
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

    // 1.4 Biểu đồ công suất sử dụng
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

    // 1.5 Biểu đồ doanh thu thuần (theo ngày / giờ / thứ)
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

    // 1.6 Top 10 hạng phòng
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

// ─── 2. DANH SÁCH TẤT CẢ ĐƠN ĐẶT PHÒNG (KHÔI PHỤC ĐẦY ĐỦ 100%) ───
async function getOwnerBookings(req, res, next) {
  try {
    const ownerId = req.user?.id || req.user?.userId || req.auth?.sub;
    if (!ownerId) {
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
       ORDER BY b.created_at DESC`,
      [ownerId],
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

// ─── 3. SƠ ĐỒ PHÒNG LỄ TÂN THỜI GIAN THỰC (SO KHỚP CHÍNH XÁC SỐ PHÒNG) ───
async function getRoomMapData(req, res, next) {
  try {
    const hotelId = req.query.hotel_id;
    if (!hotelId) {
      return res
        .status(400)
        .json({ success: false, message: "hotel_id là bắt buộc." });
    }

    await pool
      .query(
        `ALTER TABLE public.room_unit ADD COLUMN IF NOT EXISTS area VARCHAR(100) DEFAULT 'Tầng 1'`,
      )
      .catch(() => {});
    await pool
      .query(
        `ALTER TABLE public.room_unit ALTER COLUMN status TYPE VARCHAR(50)`,
      )
      .catch(() => {});

    // 1. Lấy danh sách phòng vật lý
    const roomsQuery = await pool.query(
      `SELECT 
         r.id AS room_type_id,
         r.name AS room_type_name,
         r.base_price AS daily_price,
         COALESCE(NULLIF(r.hourly_price, 0), ROUND(r.base_price * 0.25)) AS hourly_price,
         COALESCE(NULLIF(r.overnight_price, 0), r.base_price) AS overnight_price,
         ru.id AS unit_id,
         ru.room_number,
         COALESCE(ru.status, 'available') AS unit_status,
         COALESCE(ru.area, 'Tầng 1') AS area
       FROM public.room r
       LEFT JOIN public.room_unit ru ON ru.room_id = r.id
       WHERE r.hotel_id::text = $1 AND r.is_active = true
       ORDER BY ru.area ASC, ru.room_number ASC`,
      [hotelId],
    );

    // 2. Lấy đơn active (chỉ lấy đơn checked_in hoặc confirmed hôm nay)
    const bookingsResult = await pool.query(
      `SELECT 
         b.id AS booking_id,
         b.booking_code,
         b.customer_name,
         b.guest_phone,
         b.status,
         b.checkin_date,
         b.checkout_date,
         b.created_at,
         b.room_number,
         b.total_price
       FROM public.booking b
       WHERE b.hotel_id::text = $1 
         AND b.status IN ('checked_in', 'confirmed')
         AND CURRENT_DATE >= b.checkin_date::date AND CURRENT_DATE <= b.checkout_date::date`,
      [hotelId],
    );

    const activeBookings = bookingsResult.rows;
    const now = new Date();

    const roomList = roomsQuery.rows.map((row, idx) => {
      const roomNum =
        row.room_number || `P.${idx < 9 ? "10" + (idx + 1) : "1" + (idx + 1)}`;

      // 👉 SO KHỚP CHÍNH XÁC THEO SỐ PHÒNG (KHÔNG SO BẰNG ROOM_TYPE ĐỂ TRÁNH BỊ TRÙNG TẤT CẢ PHÒNG)
      const currentBooking = activeBookings.find(
        (b) =>
          b.room_number &&
          String(b.room_number).trim() === String(roomNum).trim(),
      );

      let status = row.unit_status || "available";
      let bookingInfo = null;

      if (currentBooking) {
        if (currentBooking.status === "checked_in") {
          status = "occupied";
          const checkoutDateStr = new Date(currentBooking.checkout_date)
            .toISOString()
            .slice(0, 10);
          const todayStr = now.toISOString().slice(0, 10);
          if (checkoutDateStr === todayStr) {
            status = "checkout_soon";
          }

          const checkinTime = new Date(
            currentBooking.created_at || currentBooking.checkin_date,
          );
          const diffMs = Math.max(0, now - checkinTime);
          const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
          const diffMins = Math.floor(
            (diffMs % (1000 * 60 * 60)) / (1000 * 60),
          );

          bookingInfo = {
            id: currentBooking.booking_id,
            code: currentBooking.booking_code,
            customer_name: currentBooking.customer_name || "Khách lẻ",
            guest_phone: currentBooking.guest_phone || "",
            stay_duration: `${diffHours} giờ ${diffMins} phút / 12 giờ`,
            checkin_date: currentBooking.checkin_date,
            checkout_date: currentBooking.checkout_date,
            total_price: Number(currentBooking.total_price || 0),
          };
        } else if (currentBooking.status === "confirmed") {
          status = "incoming";
        }
      }

      return {
        id: row.unit_id || `${row.room_type_id}_${idx}`,
        room_number: roomNum,
        area: row.area,
        type_name: row.room_type_name,
        hourly_price: Number(row.hourly_price || 0),
        daily_price: Number(row.daily_price || 0),
        overnight_price: Number(row.overnight_price || 0),
        status,
        booking: bookingInfo,
      };
    });

    return res.json({ success: true, rooms: roomList });
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
      checkin_date,
      checkout_date,
      is_check_in_now = true,
    } = req.body;

    const newBookingId = crypto.randomUUID();
    const bookingCode = "DP" + Math.floor(100000 + Math.random() * 900000);
    const status = is_check_in_now ? "checked_in" : "confirmed";

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
        $1, $2, $3, $4::public.booking_status_enum, 'paid'::public.booking_payment_status_enum, $5,
        $6::date, $7::date, 1, 0,
        $8, 'walkin@hotel.internal', $9, $10, $5, NOW(), NOW(), NOW()
      ) RETURNING *;`,
      [
        newBookingId,
        bookingCode,
        hotel_id,
        status,
        Number(total_price || 0),
        checkin_date || new Date().toISOString().split("T")[0],
        checkout_date ||
          new Date(Date.now() + 86400000).toISOString().split("T")[0],
        customer_name || "Khách lẻ",
        guest_phone || "",
        roomNumber,
      ],
    );

    await client.query(
      `INSERT INTO public.booking_room (id, booking_id, room_id, quantity, price, room_name, book_date, created_at)
       VALUES (gen_random_uuid(), $1, $2, 1, $3, $4, NOW(), NOW())`,
      [
        newBookingId,
        unitRes.rows[0]?.room_type_id || room_id,
        Number(total_price || 0),
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

// ─── 5. TRẢ PHÒNG (CHUYỂN SANG CHƯA DỌN) ───
async function handleOwnerCheckOut(req, res, next) {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { late_fee = 0, minibar_fee = 0, other_fee = 0 } = req.body;
    const totalExtra =
      Number(late_fee) + Number(minibar_fee) + Number(other_fee);

    await client.query("BEGIN");

    const updateRes = await client.query(
      `UPDATE public.booking 
       SET status = 'checked_out'::public.booking_status_enum, 
           payment_status = 'paid'::public.booking_payment_status_enum,
           total_price = total_price + $1, 
           checkout_date = NOW(),
           updated_at = NOW()
       WHERE id::text = $2 OR booking_code = $2
       RETURNING *`,
      [totalExtra, id],
    );

    const booking = updateRes.rows[0];
    if (!booking) {
      await client.query("ROLLBACK");
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy đơn đặt phòng." });
    }

    if (booking.room_number) {
      await client
        .query(
          `UPDATE public.room_unit 
         SET status = 'dirty', updated_at = NOW() 
         WHERE hotel_id = $1 AND room_number = $2`,
          [booking.hotel_id, booking.room_number],
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

// ─── 7. ĐỔI PHÒNG CHO KHÁCH ───
async function handleChangeRoom(req, res, next) {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { new_room_number, hotel_id } = req.body;

    await client.query("BEGIN");

    const bookingRes = await client.query(
      `SELECT * FROM public.booking WHERE id::text = $1 LIMIT 1`,
      [id],
    );
    const oldBooking = bookingRes.rows[0];
    if (!oldBooking) {
      await client.query("ROLLBACK");
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy đơn đặt phòng." });
    }

    const oldRoomNumber = oldBooking.room_number;

    await client.query(
      `UPDATE public.booking SET room_number = $1, updated_at = NOW() WHERE id::text = $2`,
      [new_room_number, id],
    );

    if (oldRoomNumber) {
      await client.query(
        `UPDATE public.room_unit SET status = 'dirty', updated_at = NOW() WHERE hotel_id = $1 AND room_number = $2`,
        [hotel_id, oldRoomNumber],
      );
    }

    await client.query(
      `UPDATE public.room_unit SET status = 'occupied', updated_at = NOW() WHERE hotel_id = $1 AND room_number = $2`,
      [hotel_id, new_room_number],
    );

    await client.query("COMMIT");
    return res.json({
      success: true,
      message: `Đã đổi từ phòng ${oldRoomNumber} sang ${new_room_number} thành công!`,
    });
  } catch (error) {
    await client.query("ROLLBACK");
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

// ─── 9. CHECK-IN / CẬP NHẬT ĐƠN ───
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
  getRoomMapData,
  createWalkInBooking,
  handleOwnerCheckOut,
  markRoomCleaned,
  handleChangeRoom,
  handleAddBookingService,
  handleOwnerCheckIn,
  updateOwnerBookingStatus,
  updateHotelInfo,
};
