// backend/controllers/owner.controller.js
const crypto = require("crypto");
const pool = require("../config/database");

// Tự động đảm bảo cột room_legs và receptionist_assigned tồn tại trong bảng booking
(async function ensureRequiredColumns() {
  try {
    await pool.query(
      `ALTER TABLE public.booking ADD COLUMN IF NOT EXISTS room_legs jsonb DEFAULT '[]'::jsonb;`,
    );
    await pool.query(
      `ALTER TABLE public.booking ADD COLUMN IF NOT EXISTS receptionist_assigned boolean DEFAULT false;`,
    );
  } catch (err) {
    console.warn("⚠️ Cảnh báo migration columns:", err.message);
  }
})();

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

// ─── 1. THỐNG KÊ DASHBOARD QUẢN TRỊ KHÁCH SẠN (API /api/owner/stats) ───
async function getOwnerStats(req, res, next) {
  try {
    const ownerId =
      req.user?.id || req.user?.userId || req.auth?.sub || req.auth?.id;
    const hotelId = req.query.hotel_id
      ? String(req.query.hotel_id).trim()
      : "all";
    const range = req.query.range || "today";

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

    let startDate, endDate;
    let dayCount = 1;

    if (range === "today") {
      startDate = now.toLocaleDateString("en-CA");
      endDate = startDate;
      dayCount = 1;
    } else if (range === "yesterday") {
      const yest = new Date(now);
      yest.setDate(now.getDate() - 1);
      startDate = yest.toLocaleDateString("en-CA");
      endDate = startDate;
      dayCount = 1;
    } else if (range === "7days") {
      const start = new Date(now);
      start.setDate(now.getDate() - 6);
      startDate = start.toLocaleDateString("en-CA");
      endDate = now.toLocaleDateString("en-CA");
      dayCount = 7;
    } else if (range === "last_month") {
      const firstDay = new Date(currentYear, currentMonth - 1, 1);
      const lastDay = new Date(currentYear, currentMonth, 0);
      startDate = firstDay.toLocaleDateString("en-CA");
      endDate = lastDay.toLocaleDateString("en-CA");
      dayCount = lastDay.getDate();
    } else {
      const firstDay = new Date(currentYear, currentMonth, 1);
      startDate = firstDay.toLocaleDateString("en-CA");
      endDate = now.toLocaleDateString("en-CA");
      dayCount = Math.max(1, todayDateNum);
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
    let vacantCount = totalRooms;
    let currentRate = 0;
    let vacantRate = 100;

    if (totalRooms > 0) {
      const currentOccupiedRes = await pool.query(
        `SELECT COALESCE(SUM(COALESCE(br.quantity, 1)), 0)::int AS occupied
         FROM public.booking b
         JOIN public.hotel h ON h.id = b.hotel_id
         LEFT JOIN public.booking_room br ON br.booking_id = b.id
         WHERE ${hotelFilter} 
           AND b.status = 'checked_in'`,
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

    const stayingRes = await pool.query(
      `SELECT 
         COALESCE(SUM(COALESCE(b.adult_total, 1)), 0)::int AS adults,
         COALESCE(SUM(COALESCE(b.children_total, 0)), 0)::int AS children
       FROM public.booking b
       JOIN public.hotel h ON h.id = b.hotel_id
       WHERE ${hotelFilter} 
         AND b.status = 'checked_in'`,
      baseParams,
    );
    const stayingAdults = Number(stayingRes.rows[0]?.adults || 0);
    const stayingChildren = Number(stayingRes.rows[0]?.children || 0);
    const totalGuests = stayingAdults + stayingChildren;

    const waitingCleanRes = await pool
      .query(
        `SELECT COUNT(DISTINCT ru.id)::int AS waiting_clean
       FROM public.room_unit ru
       JOIN public.room r ON r.id = ru.room_id
       JOIN public.hotel h ON h.id = r.hotel_id
       WHERE ${hotelFilter} AND ru.status = 'dirty'
         AND ru.room_number NOT IN (
           SELECT COALESCE(b.room_number, '') FROM public.booking b 
           WHERE b.hotel_id = h.id AND b.status = 'checked_in' AND b.room_number IS NOT NULL
         )`,
        baseParams,
      )
      .catch(() => ({ rows: [{ waiting_clean: 0 }] }));
    const waitingClean = Number(waitingCleanRes.rows[0]?.waiting_clean || 0);

    const occupiedCleanRes = await pool
      .query(
        `SELECT COUNT(DISTINCT ru.id)::int AS occupied_dirty
       FROM public.room_unit ru
       JOIN public.room r ON r.id = ru.room_id
       JOIN public.hotel h ON h.id = r.hotel_id
       WHERE ${hotelFilter} AND ru.status = 'dirty'
         AND ru.room_number IN (
           SELECT COALESCE(b.room_number, '') FROM public.booking b 
           WHERE b.hotel_id = h.id AND b.status = 'checked_in' AND b.room_number IS NOT NULL
         )`,
        baseParams,
      )
      .catch(() => ({ rows: [{ occupied_dirty: 0 }] }));
    const occupiedAndWaitingClean = Number(
      occupiedCleanRes.rows[0]?.occupied_dirty || 0,
    );

    const timeParams = [...baseParams, startDate, endDate];
    const pStart = timeParams.length - 1;
    const pEnd = timeParams.length;

    const channelQuery = await pool.query(
      `WITH booking_channels AS (
         SELECT 
           CASE 
             WHEN b.booking_code LIKE 'DP%' 
               OR b.guest_email ILIKE '%walkin%' 
               OR b.customer_name ILIKE '%Khách lẻ%'
             THEN 'direct'
             ELSE 'online'
           END AS channel,
           b.total_price,
           b.id
         FROM public.booking b
         JOIN public.hotel h ON h.id = b.hotel_id
         WHERE ${hotelFilter}
           AND b.status IN ('checked_in', 'checked_out', 'confirmed')
           AND (
             (b.created_at::date >= $${pStart}::date AND b.created_at::date <= $${pEnd}::date)
             OR (b.checkin_date >= $${pStart}::date AND b.checkin_date <= $${pEnd}::date)
           )
       )
       SELECT 
         channel,
         COALESCE(SUM(total_price), 0)::bigint AS total_money,
         COUNT(id)::int AS order_count
       FROM booking_channels
       GROUP BY channel`,
      timeParams,
    );

    let directAmount = 0;
    let directCount = 0;
    let onlineAmount = 0;
    let onlineCount = 0;

    channelQuery.rows.forEach((r) => {
      if (r.channel === "direct") {
        directAmount = Number(r.total_money || 0);
        directCount = Number(r.order_count || 0);
      } else {
        onlineAmount = Number(r.total_money || 0);
        onlineCount = Number(r.order_count || 0);
      }
    });

    const totalRevenue = directAmount + onlineAmount;
    const totalOrderCount = directCount + onlineCount;

    const channelStats = {
      directAmount,
      directCount,
      directPercent:
        totalRevenue > 0 ? Math.round((directAmount / totalRevenue) * 100) : 0,
      onlineAmount,
      onlineCount,
      onlinePercent:
        totalRevenue > 0 ? Math.round((onlineAmount / totalRevenue) * 100) : 0,
      cancelledAmount: 0,
      cancelledCount: 0,
      chartData: [
        { name: "Khách đến trực tiếp", booked: directAmount, cancelled: 0 },
        { name: "Đặt phòng online", booked: onlineAmount, cancelled: 0 },
      ],
    };

    const dailyOccupiedCTE = `
      WITH period_days AS (
        SELECT generate_series($${pStart}::date, $${pEnd}::date, '1 day'::interval)::date AS day_date
      ),
      daily_occupied_rooms AS (
        SELECT DISTINCT
          pd.day_date,
          COALESCE(b.room_number, 'P001') AS room_num,
          COALESCE(br.room_id, r.id) AS room_type_id,
          COALESCE(ru.area, 'Tầng 1') AS area_name
        FROM period_days pd
        JOIN public.booking b 
          ON (
            (b.checkin_date <= pd.day_date AND b.checkout_date > pd.day_date)
            OR (b.checkin_date = b.checkout_date AND b.checkin_date = pd.day_date)
          )
          AND b.status IN ('checked_in', 'checked_out', 'confirmed')
        JOIN public.hotel h ON h.id = b.hotel_id
        LEFT JOIN public.booking_room br ON br.booking_id = b.id
        LEFT JOIN public.room r ON r.hotel_id = b.hotel_id AND (r.name ILIKE b.room_number OR b.room_number ILIKE '%' || r.code || '%')
        LEFT JOIN public.room_unit ru ON ru.hotel_id = b.hotel_id AND (ru.room_number = b.room_number OR ru.room_number ILIKE '%' || b.room_number || '%')
        WHERE ${hotelFilter}
      ),
      room_units_count AS (
        SELECT room_id, COUNT(id)::int AS unit_count 
        FROM public.room_unit 
        GROUP BY room_id
      )
    `;

    const roomTypeOccupancyRes = await pool.query(
      ` ${dailyOccupiedCTE}
        SELECT 
          r.id,
          r.name,
          COALESCE(r.amount, ruc.unit_count, 1)::int AS total_rooms,
          COUNT(dor.day_date)::int AS used_room_days
        FROM public.room r
        JOIN public.hotel h ON h.id = r.hotel_id
        LEFT JOIN room_units_count ruc ON ruc.room_id = r.id
        LEFT JOIN daily_occupied_rooms dor ON dor.room_type_id = r.id
        WHERE ${hotelFilter} AND r.is_active = true
        GROUP BY r.id, r.name, r.amount, ruc.unit_count, r.base_price
        ORDER BY r.base_price ASC`,
      timeParams,
    );

    let totalHotelUsedRoomDays = 0;
    const occupancyByRoomType = roomTypeOccupancyRes.rows.map((r) => {
      const roomTotal = Number(r.total_rooms || 1);
      const roomCapacity = roomTotal * dayCount;
      const usedDays = Number(r.used_room_days || 0);
      totalHotelUsedRoomDays += usedDays;

      const rate =
        roomCapacity > 0
          ? Number(Math.min(100, (usedDays / roomCapacity) * 100).toFixed(2))
          : 0;
      return {
        name: r.name,
        rate: rate,
      };
    });

    const totalHotelCapacity = Math.max(1, totalRooms * dayCount);
    const avgOccupancyRate =
      totalHotelUsedRoomDays > 0
        ? Number(
            Math.min(
              100,
              (totalHotelUsedRoomDays / totalHotelCapacity) * 100,
            ).toFixed(2),
          )
        : 0;

    return res.json({
      success: true,
      occupancyCurrent: {
        occupied: occupiedCount,
        vacant: vacantCount,
        total: totalRooms,
        rate: currentRate,
        vacantRate: vacantRate,
      },
      staying: {
        totalGuests: totalGuests,
        adults: stayingAdults,
        children: stayingChildren,
      },
      housekeeping: {
        waitingClean,
        occupiedAndWaitingClean,
      },
      channelStats,
      revenueTotal: totalRevenue,
      invoiceCount: totalOrderCount,
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
    return res.json({ success: true, data: [], bookings: [] });
  }
}

// ─── 3. SƠ ĐỒ PHÒNG LỄ TÂN (CHỈ GẮN PHÒNG KHI LỄ TÂN ĐÃ DUYỆT XẾP PHÒNG) ───
async function getRoomMapData(req, res, next) {
  try {
    const hotelId = req.query.hotel_id;
    if (!hotelId) {
      return res
        .status(400)
        .json({ success: false, message: "hotel_id là bắt buộc." });
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

    // 🌟 CHỈ LẤY ĐƠN ĐÃ ĐƯỢC LỄ TÂN XẾP PHÒNG (receptionist_assigned = true)
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
           AND b.status IN ('confirmed', 'checked_in')
           AND b.receptionist_assigned = true
           AND b.room_number IS NOT NULL 
           AND TRIM(b.room_number) <> ''
         ORDER BY b.created_at DESC`,
        [hotelId],
      );
      activeBookings = bookingsResult.rows || [];
    } catch (bErr) {
      console.warn("⚠️ Cảnh báo lấy activeBookings:", bErr.message);
    }

    const usedBookingIds = new Set();

    const roomList = roomsQuery.rows.map((row, idx) => {
      const roomNum =
        row.room_number || `P.${idx < 9 ? "10" + (idx + 1) : "1" + (idx + 1)}`;
      const isDirtyUnit = row.unit_status === "dirty";

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
        status: isDirtyUnit ? "dirty" : "available",
        unit_status: row.unit_status || "available",
        is_dirty: isDirtyUnit,
        booking: null,
      };
    });

    const attachBooking = (targetRoom, b) => {
      const now = new Date();
      let stayDuration = "Vừa nhận phòng";
      if (b.status === "checked_in") {
        const actualCheckinTime = new Date(
          b.confirmed_at || b.created_at || now,
        );
        const diffMs = Math.max(0, now.getTime() - actualCheckinTime.getTime());
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        stayDuration = diffHours < 1 ? `${diffMins} phút` : `${diffHours} giờ`;
      }

      targetRoom.booking = {
        id: b.id,
        code: b.booking_code,
        customer_name: b.customer_name || "Khách đặt trước",
        guest_phone: b.guest_phone || "",
        stay_duration: stayDuration,
        checkin_date: b.checkin_date,
        checkout_date: b.checkout_date,
        total_price: Number(b.total_price || targetRoom.daily_price || 0),
        customer_paid: Number(b.subtotal || b.total_price || 0),
        adult_total: Number(b.adult_total || 1),
        children_total: Number(b.children_total || 0),
      };

      targetRoom.status = b.status === "checked_in" ? "occupied" : "incoming";
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

    return res.json({
      success: true,
      rooms: roomList,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ─── 3.1. LẤY TẤT CẢ ĐƠN ONLINE CHỜ LỄ TÂN CHỌN PHÒNG (100% HIỆN RA) ───
async function getPendingOnlineBookings(req, res, next) {
  try {
    const rawHotelId = req.query.hotel_id
      ? String(req.query.hotel_id).trim()
      : "";

    // 🌟 ĐIỀU KIỆN CHUẨN XÁC TUYỆT ĐỐI:
    // Lấy mọi đơn online chưa trả phòng/chưa hủy mà LỄ TÂN CHƯA CHỌN PHÒNG (receptionist_assigned != true)
    const querySql = `
      SELECT 
         b.id,
         b.booking_code,
         b.customer_name,
         b.guest_phone,
         b.guest_email,
         b.checkin_date,
         b.checkout_date,
         b.adult_total,
         b.children_total,
         b.total_price,
         b.created_at,
         b.payment_status,
         b.status,
         b.room_number,
         b.hotel_id,
         COALESCE(p.paid_amount, CASE WHEN b.payment_status = 'paid' THEN b.total_price ELSE 0 END) AS paid_amount,
         COALESCE(br.room_name, r.name, 'Phòng tiêu chuẩn') AS room_type_name,
         COALESCE(br.room_id, r.id) AS room_type_id
       FROM public.booking b
       LEFT JOIN public.booking_room br ON br.booking_id = b.id
       LEFT JOIN public.room r ON r.id = br.room_id
       LEFT JOIN public.payment p ON p.booking_id = b.id
       WHERE b.status NOT IN ('checked_in', 'checked_out', 'cancelled')
         AND (b.receptionist_assigned IS NULL OR b.receptionist_assigned = false)
         AND ($1 = '' OR $1 = 'all' OR b.hotel_id::text = $1 OR b.hotel_id IS NULL)
       ORDER BY b.created_at DESC
       LIMIT 50
    `;

    const result = await pool.query(querySql, [rawHotelId]);

    console.log(`\n==================================================`);
    console.log(
      `📋 [LỄ TÂN API]: Tìm thấy ${result.rows.length} đơn đang chờ Lễ tân xếp phòng!`,
    );
    if (result.rows.length > 0) {
      console.log(
        `👉 Danh sách đơn:`,
        result.rows
          .map((r) => `${r.booking_code} (${r.customer_name})`)
          .join(" | "),
      );
    }
    console.log(`==================================================\n`);

    return res.json({
      success: true,
      data: result.rows || [],
    });
  } catch (err) {
    console.error("❌ LỖI GET_PENDING_ONLINE_BOOKINGS:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ─── 3.2. LỄ TÂN CHỌN PHÒNG & BẤM XÁC NHẬN (ĐƠN CHUYỂN SANG ĐÃ ĐẶT TRƯỚC) ───
async function confirmAndAssignRoom(req, res, next) {
  const client = await pool.connect();
  try {
    const { booking_id, room_number, hotel_id } = req.body;

    if (!booking_id || !room_number) {
      return res
        .status(400)
        .json({ success: false, message: "Vui lòng chọn số phòng!" });
    }

    await client.query("BEGIN");

    const bRes = await client.query(
      `SELECT * FROM public.booking WHERE (id::text = $1 OR booking_code = $1) LIMIT 1 FOR UPDATE`,
      [booking_id],
    );
    const booking = bRes.rows[0];
    if (!booking) {
      await client.query("ROLLBACK");
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy đơn đặt phòng." });
    }

    // 🌟 ĐÁNH DẤU receptionist_assigned = true ĐỂ CHUYỂN LÊN SƠ ĐỒ PHÒNG
    const updateRes = await client.query(
      `UPDATE public.booking 
       SET room_number = $1,
           status = 'confirmed'::public.booking_status_enum,
           receptionist_assigned = true,
           confirmed_at = NOW(),
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [room_number.trim(), booking.id],
    );

    await client.query("COMMIT");

    console.log(
      `✅ [LỄ TÂN]: Đã xếp đơn ${booking.booking_code} vào phòng ${room_number}!`,
    );

    return res.json({
      success: true,
      message: `✓ Đã xếp đơn ${booking.booking_code} vào phòng ${room_number} thành công!`,
      booking: updateRes.rows[0],
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ LỖI CONFIRM_AND_ASSIGN_ROOM:", err);
    return res.status(500).json({ success: false, message: err.message });
  } finally {
    client.release();
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
        customer_name, guest_email, guest_phone, room_number, subtotal, 
        receptionist_assigned, confirmed_at, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4::public.booking_status_enum, 'paid'::public.booking_payment_status_enum, $5,
        $6::date, $7::date, 1, 0,
        $8, 'walkin@hotel.internal', $9, $10, $11, true, NOW(), NOW(), NOW()
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
        Number(customer_paid || 0),
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
    return res
      .status(201)
      .json({ success: true, booking: insertBooking.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    return res.status(500).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
}

// ─── 5. TRẢ PHÒNG ───
async function handleOwnerCheckOut(req, res, next) {
  try {
    const { id } = req.params;
    const updateRes = await pool.query(
      `UPDATE public.booking 
       SET status = 'checked_out'::public.booking_status_enum, 
           payment_status = 'paid'::public.booking_payment_status_enum,
           updated_at = NOW()
       WHERE id::text = $1 OR booking_code = $1
       RETURNING *`,
      [id],
    );

    const booking = updateRes.rows[0];
    if (booking?.room_number) {
      await pool
        .query(
          `UPDATE public.room_unit SET status = 'dirty', updated_at = NOW() 
         WHERE hotel_id = $1 AND (room_number = $2 OR room_number ILIKE $3)`,
          [
            booking.hotel_id,
            booking.room_number,
            `%${booking.room_number.replace(/[^0-9]/g, "")}%`,
          ],
        )
        .catch(() => {});
    }

    return res.json({
      success: true,
      message: "Trả phòng thành công!",
      booking,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ─── 6. DỌN PHÒNG ───
async function markRoomCleaned(req, res, next) {
  try {
    const { hotel_id, room_number } = req.body;
    const cleanNum = String(room_number || "").replace(/[^0-9]/g, "");
    await pool.query(
      `UPDATE public.room_unit SET status = 'available', updated_at = NOW() 
       WHERE hotel_id::text = $1 AND (room_number = $2 OR room_number ILIKE $3)`,
      [hotel_id, room_number, `%${cleanNum}%`],
    );
    return res.json({
      success: true,
      message: `Phòng ${room_number} đã được dọn sạch!`,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function markRoomDirty(req, res, next) {
  try {
    const { hotel_id, room_number } = req.body;
    const cleanNum = String(room_number || "").replace(/[^0-9]/g, "");
    await pool.query(
      `UPDATE public.room_unit SET status = 'dirty', updated_at = NOW() 
       WHERE hotel_id::text = $1 AND (room_number = $2 OR room_number ILIKE $3)`,
      [hotel_id, room_number, `%${cleanNum}%`],
    );
    return res.json({
      success: true,
      message: `Phòng ${room_number} đã chuyển sang Cần dọn!`,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ─── 7. ĐỔI PHÒNG ───
async function handleChangeRoom(req, res, next) {
  try {
    const { id } = req.params;
    const { new_room_number } = req.body;
    await pool.query(
      `UPDATE public.booking SET room_number = $1, updated_at = NOW() WHERE id::text = $2 OR booking_code = $2`,
      [new_room_number, id],
    );
    return res.json({
      success: true,
      message: `Đã đổi sang phòng ${new_room_number}!`,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function handleAddBookingService(req, res, next) {
  return res.json({ success: true });
}

async function handleOwnerCheckIn(req, res, next) {
  try {
    const { id } = req.params;
    const { room_number } = req.body;
    const updateBookingRes = await pool.query(
      `UPDATE public.booking SET status = 'checked_in', room_number = COALESCE($1, room_number), updated_at = NOW()
       WHERE id::text = $2 OR booking_code = $2 RETURNING *`,
      [room_number || null, id],
    );
    return res.json({ success: true, booking: updateBookingRes.rows[0] });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function updateOwnerBookingStatus(req, res, next) {
  return res.json({ success: true });
}

async function getOwnerStaff(req, res, next) {
  return res.json({ success: true, staff: [] });
}
async function createOwnerStaff(req, res, next) {
  return res.json({ success: true });
}
async function deleteOwnerStaff(req, res, next) {
  return res.json({ success: true });
}
async function toggleStaffStatus(req, res, next) {
  return res.json({ success: true });
}
async function updateHotelInfo(req, res, next) {
  return res.json({ success: true });
}

module.exports = {
  getOwnerStats,
  getOwnerBookings,
  getRoomMapData,
  getPendingOnlineBookings,
  confirmAndAssignRoom,
  createWalkInBooking,
  handleOwnerCheckOut,
  markRoomCleaned,
  markRoomDirty,
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
