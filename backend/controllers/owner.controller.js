// backend/controllers/owner.controller.js
const crypto = require("crypto");
const pool = require("../config/database");

const safeRequire = (m) => {
  try {
    return require(m);
  } catch {
    return null;
  }
};
const bcrypt = safeRequire("bcryptjs") || safeRequire("bcrypt");

// Tự động đảm bảo migration các cột mở rộng tồn tại
(async () => {
  try {
    await pool.query(`
      ALTER TABLE public.booking ADD COLUMN IF NOT EXISTS room_legs jsonb DEFAULT '[]'::jsonb;
      ALTER TABLE public.booking ADD COLUMN IF NOT EXISTS receptionist_assigned boolean DEFAULT false;
      ALTER TABLE public.booking ADD COLUMN IF NOT EXISTS checkin_time TIME WITHOUT TIME ZONE DEFAULT '14:00:00';
      ALTER TABLE public.booking ADD COLUMN IF NOT EXISTS checkout_time TIME WITHOUT TIME ZONE DEFAULT '12:00:00';
      ALTER TABLE public.booking ADD COLUMN IF NOT EXISTS rental_type VARCHAR(50) DEFAULT 'DAY';
    `);
  } catch (err) {
    console.warn("⚠️ Cảnh báo migration owner columns:", err.message);
  }
})();

const hashPassword = async (p) =>
  bcrypt
    ? bcrypt.hash(p, 10)
    : crypto.createHash("sha256").update(p).digest("hex");
const toDateStr = (d) => d.toLocaleDateString("en-CA");

function resolveDateRange(range) {
  const now = new Date();
  const y = now.getFullYear(),
    m = now.getMonth(),
    d = now.getDate();

  const makeRange = (s, e, ps, pe, count, label) => ({
    startDate: toDateStr(s),
    endDate: toDateStr(e),
    prevStartDate: toDateStr(ps),
    prevEndDate: toDateStr(pe),
    dayCount: count,
    compLabel: label,
  });

  if (range === "today") {
    return makeRange(
      now,
      now,
      new Date(y, m, d - 1),
      new Date(y, m, d - 1),
      1,
      "so với hôm qua",
    );
  }
  if (range === "yesterday") {
    return makeRange(
      new Date(y, m, d - 1),
      new Date(y, m, d - 1),
      new Date(y, m, d - 2),
      new Date(y, m, d - 2),
      1,
      "so với ngày hôm kia",
    );
  }
  if (range === "7days") {
    return makeRange(
      new Date(y, m, d - 6),
      now,
      new Date(y, m, d - 13),
      new Date(y, m, d - 7),
      7,
      "so với 7 ngày trước",
    );
  }
  if (range === "last_month") {
    const lastDay = new Date(y, m, 0);
    return makeRange(
      new Date(y, m - 1, 1),
      lastDay,
      new Date(y, m - 2, 1),
      new Date(y, m - 1, 0),
      lastDay.getDate(),
      "so với tháng trước đó",
    );
  }
  return makeRange(
    new Date(y, m, 1),
    now,
    new Date(y, m - 1, 1),
    new Date(y, m - 1, Math.min(d, 28)),
    Math.max(1, d),
    "so với cùng kỳ tháng trước",
  );
}

// ─── 1. THỐNG KÊ DASHBOARD (ĐÃ ĐỒNG BỘ ĐẦY ĐỦ CHART DATA CHO CẢ 2 TAB) ───
async function getOwnerStats(req, res, next) {
  try {
    const ownerId =
      req.user?.id || req.user?.userId || req.auth?.sub || req.auth?.id;
    const hotelId = String(req.query.hotel_id || "all").trim();
    if (!ownerId)
      return res.status(401).json({ message: "Vui lòng đăng nhập." });

    let hotelFilter =
      "(h.owner_id = $1 OR h.id IN (SELECT hotel_id FROM public.hotel_staff WHERE user_id = $1)) AND h.status = 'active'";
    const baseParams = [ownerId];
    if (hotelId && hotelId !== "all" && hotelId !== "undefined") {
      baseParams.push(hotelId);
      hotelFilter += ` AND h.id = $${baseParams.length}`;
    }

    const revDates = resolveDateRange(
      req.query.revenue_range || req.query.range || "this_month",
    );
    const occDates = resolveDateRange(
      req.query.occupancy_range || req.query.range || "this_month",
    );

    const revParams = [...baseParams, revDates.startDate, revDates.endDate];
    const prevParams = [
      ...baseParams,
      revDates.prevStartDate,
      revDates.prevEndDate,
    ];
    const occParams = [...baseParams, occDates.startDate, occDates.endDate];

    // Chạy song song toàn bộ queries để tối đa hóa hiệu năng
    const [
      roomsRes,
      occupiedRes,
      stayingRes,
      waitingCleanRes,
      occupiedDirtyRes,
      channelRes,
      stayDateRes,
      prevRevRes,
      dailyOccRes,
      roomTypeRes,
      areaRes,
      paymentAlertsRes,
      leakAlertsRes,
    ] = await Promise.all([
      pool.query(
        `SELECT COALESCE(SUM(r.amount), 0)::int AS total_rooms FROM public.room r JOIN public.hotel h ON h.id = r.hotel_id WHERE ${hotelFilter} AND COALESCE(r.is_active, true)`,
        baseParams,
      ),
      pool.query(
        `SELECT COALESCE(SUM(COALESCE(br.quantity, 1)), 0)::int AS occupied FROM public.booking b JOIN public.hotel h ON h.id = b.hotel_id LEFT JOIN public.booking_room br ON br.booking_id = b.id WHERE ${hotelFilter} AND b.status = 'checked_in'`,
        baseParams,
      ),
      pool.query(
        `SELECT COALESCE(SUM(COALESCE(b.adult_total, 1)), 0)::int AS adults, COALESCE(SUM(COALESCE(b.children_total, 0)), 0)::int AS children FROM public.booking b JOIN public.hotel h ON h.id = b.hotel_id WHERE ${hotelFilter} AND b.status = 'checked_in'`,
        baseParams,
      ),
      pool
        .query(
          `SELECT COUNT(DISTINCT ru.id)::int AS waiting_clean FROM public.room_unit ru JOIN public.room r ON r.id = ru.room_id JOIN public.hotel h ON h.id = r.hotel_id WHERE ${hotelFilter} AND ru.status = 'dirty' AND ru.room_number NOT IN (SELECT COALESCE(b.room_number, '') FROM public.booking b WHERE b.hotel_id = h.id AND b.status = 'checked_in' AND b.room_number IS NOT NULL)`,
          baseParams,
        )
        .catch(() => ({ rows: [{ waiting_clean: 0 }] })),
      pool
        .query(
          `SELECT COUNT(DISTINCT ru.id)::int AS occupied_dirty FROM public.room_unit ru JOIN public.room r ON r.id = ru.room_id JOIN public.hotel h ON h.id = r.hotel_id WHERE ${hotelFilter} AND ru.status = 'dirty' AND ru.room_number IN (SELECT COALESCE(b.room_number, '') FROM public.booking b WHERE b.hotel_id = h.id AND b.status = 'checked_in' AND b.room_number IS NOT NULL)`,
          baseParams,
        )
        .catch(() => ({ rows: [{ occupied_dirty: 0 }] })),
      // 🌟 LẤY DOANH THU THEO KÊNH BÁN (BAO GỒM CẢ CÁC ĐƠN ĐẶT ONLINE VỪA TẠO)
      pool.query(
        `
        WITH booking_channels AS (
          SELECT CASE 
                   WHEN b.booking_code LIKE 'DP%' OR b.guest_email ILIKE '%walkin%' OR b.customer_name ILIKE '%Khách lẻ%' THEN 'direct' 
                   ELSE 'online' 
                 END AS channel,
                 COALESCE(b.total_price, 0) AS total_price, 
                 b.id, 
                 b.status
          FROM public.booking b 
          JOIN public.hotel h ON h.id = b.hotel_id
          WHERE ${hotelFilter} 
            AND b.status != 'cancelled'
            AND ((b.created_at::date BETWEEN $${revParams.length - 1}::date AND $${revParams.length}::date) 
                 OR (b.checkin_date::date BETWEEN $${revParams.length - 1}::date AND $${revParams.length}::date))
        )
        SELECT channel, status, COALESCE(SUM(total_price), 0)::bigint AS total_money, COUNT(id)::int AS order_count 
        FROM booking_channels 
        GROUP BY channel, status
      `,
        revParams,
      ),
      // 🌟 LẤY DOANH THU THEO NGÀY LƯU TRÚ (ĐẦY ĐỦ CÁC NGÀY TRONG KỲ)
      pool.query(
        `
        WITH period_days AS (
          SELECT generate_series($${revParams.length - 1}::date, $${revParams.length}::date, '1 day'::interval)::date AS day_date
        ),
        day_usage AS (
          SELECT pd.day_date, 
                 COALESCE(SUM(b.total_price), 0)::bigint AS total_amount, 
                 COUNT(DISTINCT b.id)::int AS booking_count
          FROM period_days pd
          LEFT JOIN public.booking b ON 
            ((b.checkin_date::date <= pd.day_date AND b.checkout_date::date >= pd.day_date) 
             OR (b.created_at::date = pd.day_date)) 
            AND b.status != 'cancelled'
          LEFT JOIN public.hotel h ON h.id = b.hotel_id AND ${hotelFilter}
          GROUP BY pd.day_date
        ) 
        SELECT * FROM day_usage ORDER BY day_date ASC
      `,
        revParams,
      ),
      pool.query(
        `SELECT COALESCE(SUM(b.total_price), 0)::bigint AS prev_revenue FROM public.booking b JOIN public.hotel h ON h.id = b.hotel_id WHERE ${hotelFilter} AND b.status != 'cancelled' AND ((b.created_at::date BETWEEN $${prevParams.length - 1}::date AND $${prevParams.length}::date) OR (b.checkin_date BETWEEN $${prevParams.length - 1}::date AND $${prevParams.length}::date))`,
        prevParams,
      ),
      pool.query(
        `
        WITH period_days AS (SELECT generate_series($${occParams.length - 1}::date, $${occParams.length}::date, '1 day'::interval)::date AS day_date),
        day_usage AS (
          SELECT pd.day_date, COUNT(DISTINCT COALESCE(b.room_number, b.id::text))::int AS occupied_on_day
          FROM period_days pd
          LEFT JOIN public.booking b ON ((b.checkin_date <= pd.day_date AND b.checkout_date > pd.day_date) OR (b.checkin_date = pd.day_date)) AND b.status IN ('checked_in', 'checked_out', 'confirmed')
          LEFT JOIN public.hotel h ON h.id = b.hotel_id AND ${hotelFilter}
          GROUP BY pd.day_date
        ) SELECT day_date, occupied_on_day, EXTRACT(DOW FROM day_date)::int AS day_of_week FROM day_usage ORDER BY day_date ASC
      `,
        occParams,
      ),
      pool.query(
        `
        SELECT r.id, r.name, COALESCE(r.amount, 1)::int AS room_amount, COUNT(b.id)::int AS total_bookings
        FROM public.room r JOIN public.hotel h ON h.id = r.hotel_id
        LEFT JOIN public.booking_room br ON br.room_id = r.id
        LEFT JOIN public.booking b ON (b.id = br.booking_id OR b.room_number ILIKE '%' || r.code || '%') AND b.status IN ('checked_in', 'checked_out', 'confirmed') AND (b.checkin_date <= $${occParams.length}::date AND b.checkout_date >= $${occParams.length - 1}::date)
        WHERE ${hotelFilter} AND COALESCE(r.is_active, true)
        GROUP BY r.id, r.name, r.amount ORDER BY r.base_price ASC
      `,
        occParams,
      ),
      pool.query(
        `SELECT COALESCE(ru.area, 'Tầng 1') AS area_name, COUNT(DISTINCT ru.id)::int AS unit_count FROM public.room_unit ru JOIN public.hotel h ON h.id = ru.hotel_id WHERE ${hotelFilter} GROUP BY COALESCE(ru.area, 'Tầng 1') ORDER BY area_name ASC`,
        baseParams,
      ),
      pool.query(
        `SELECT b.id, b.booking_code, COALESCE(b.room_number, 'Chưa xếp') AS room, b.customer_name AS guest, (b.total_price - COALESCE(b.subtotal, 0)) AS amount FROM public.booking b JOIN public.hotel h ON h.id = b.hotel_id WHERE ${hotelFilter} AND b.status = 'checked_in' AND b.payment_status != 'paid'`,
        baseParams,
      ),
      pool.query(
        `SELECT b.id, b.booking_code, COALESCE(b.room_number, 'P.101') AS room, b.customer_name AS guest, 100000 AS amount FROM public.booking b JOIN public.hotel h ON h.id = b.hotel_id WHERE ${hotelFilter} AND b.status = 'checked_in' AND b.checkout_date < CURRENT_DATE`,
        baseParams,
      ),
    ]);

    // Xử lý dữ liệu phòng & công suất
    const totalRooms = Number(roomsRes.rows[0]?.total_rooms || 0);
    const occupiedCount =
      totalRooms > 0
        ? Math.min(totalRooms, Number(occupiedRes.rows[0]?.occupied || 0))
        : 0;
    const currentRate =
      totalRooms > 0
        ? Math.min(100, Math.round((occupiedCount / totalRooms) * 100))
        : 0;

    // Xử lý kênh bán phòng
    let directAmount = 0,
      directCount = 0,
      onlineAmount = 0,
      onlineCount = 0,
      cancelledAmount = 0,
      cancelledCount = 0;
    channelRes.rows.forEach((r) => {
      const money = Number(r.total_money || 0),
        count = Number(r.order_count || 0);
      if (r.status === "cancelled") {
        cancelledAmount += money;
        cancelledCount += count;
      } else if (r.channel === "direct") {
        directAmount += money;
        directCount += count;
      } else {
        onlineAmount += money;
        onlineCount += count;
      }
    });
    const totalRevenue = directAmount + onlineAmount,
      totalOrderCount = directCount + onlineCount;

    // Tăng trưởng doanh thu
    const prevRevenue = Number(prevRevRes.rows[0]?.prev_revenue || 0);
    const growthRate =
      prevRevenue > 0
        ? Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 100)
        : totalRevenue > 0
          ? 100
          : 0;

    // Xử lý timeline & thứ trong tuần
    let totalUsedRoomDays = 0;
    const weekdayBuckets = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 0: [] };
    const timelineDay = dailyOccRes.rows.map((row) => {
      const occ = Number(row.occupied_on_day || 0);
      totalUsedRoomDays += occ;
      const rate =
        totalRooms > 0
          ? Math.min(100, Math.round((occ / totalRooms) * 100))
          : 0;
      weekdayBuckets[row.day_of_week]?.push(rate);
      const d = new Date(row.day_date);
      return {
        label: `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`,
        date: row.day_date,
        rate,
      };
    });

    const weekdayMap = {
      1: "T2",
      2: "T3",
      3: "T4",
      4: "T5",
      5: "T6",
      6: "T7",
      0: "CN",
    };
    const timelineWeekday = [1, 2, 3, 4, 5, 6, 0].map((dow) => ({
      label: weekdayMap[dow],
      rate: weekdayBuckets[dow].length
        ? Math.round(
            weekdayBuckets[dow].reduce((a, b) => a + b, 0) /
              weekdayBuckets[dow].length,
          )
        : 0,
    }));

    const byRoomType = roomTypeRes.rows.map((r) => {
      const cap = Number(r.room_amount || 1) * occDates.dayCount;
      return {
        name: r.name,
        rate:
          cap > 0
            ? Math.min(
                100,
                Math.round((Number(r.total_bookings || 0) / cap) * 100),
              )
            : 0,
      };
    });

    return res.json({
      success: true,
      occupancyCurrent: {
        occupied: occupiedCount,
        vacant: Math.max(0, totalRooms - occupiedCount),
        total: totalRooms,
        rate: currentRate,
        vacantRate: Math.max(0, 100 - currentRate),
      },
      staying: {
        totalGuests:
          Number(stayingRes.rows[0]?.adults || 0) +
          Number(stayingRes.rows[0]?.children || 0),
        adults: Number(stayingRes.rows[0]?.adults || 0),
        children: Number(stayingRes.rows[0]?.children || 0),
      },
      housekeeping: {
        waitingClean: Number(waitingCleanRes.rows[0]?.waiting_clean || 0),
        occupiedAndWaitingClean: Number(
          occupiedDirtyRes.rows[0]?.occupied_dirty || 0,
        ),
      },
      channelStats: {
        directAmount,
        directCount,
        directPercent:
          totalRevenue > 0
            ? Math.round((directAmount / totalRevenue) * 100)
            : 0,
        onlineAmount,
        onlineCount,
        onlinePercent:
          totalRevenue > 0
            ? Math.round((onlineAmount / totalRevenue) * 100)
            : 0,
        cancelledAmount,
        cancelledCount,
        chartData: [
          { name: "Khách trực tiếp", booked: directAmount, count: directCount },
          {
            name: "Khách đặt online",
            booked: onlineAmount,
            count: onlineCount,
          },
        ],
      },
      stayDateStats: {
        totalAmount: totalRevenue,
        totalCount: totalOrderCount,
        growthRate,
        growthLabel: revDates.compLabel,
        chartData: stayDateRes.rows.map((r) => {
          const d = new Date(r.day_date);
          return {
            label: `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`,
            date: r.day_date,
            amount: Number(r.total_amount || 0),
            booking_count: Number(r.booking_count || 0),
          };
        }),
      },
      occupancyAnalytics: {
        hasData: totalRooms > 0,
        avgRate:
          totalRooms > 0
            ? Math.min(
                100,
                Math.round(
                  (totalUsedRoomDays /
                    Math.max(1, totalRooms * occDates.dayCount)) *
                    100,
                ),
              )
            : null,
        timelineDay,
        timelineWeekday,
        byRoomType,
        byArea: areaRes.rows.length
          ? areaRes.rows.map((a) => ({ name: a.area_name, rate: currentRate }))
          : [{ name: "Tầng 1", rate: currentRate }],
      },
      automationSummary: {
        autoReconciledToday: totalOrderCount,
        autoReconciledAmount: totalRevenue,
        paymentAlerts: paymentAlertsRes.rows || [],
        leakAlerts: leakAlertsRes.rows || [],
        totalUnpaidAmount: (paymentAlertsRes.rows || []).reduce(
          (s, i) => s + Number(i.amount || 0),
          0,
        ),
        potentialLeakTotal: (leakAlertsRes.rows || []).reduce(
          (s, i) => s + Number(i.amount || 0),
          0,
        ),
      },
      revenueTotal: totalRevenue,
      invoiceCount: totalOrderCount,
    });
  } catch (error) {
    console.error("❌ LỖI GET_OWNER_STATS:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ─── 2. DANH SÁCH ĐƠN ĐẶT PHÒNG ───
async function getOwnerBookings(req, res) {
  try {
    const userId = req.user?.id || req.user?.userId || req.auth?.sub;
    if (!userId)
      return res.status(401).json({ message: "Vui lòng đăng nhập." });

    const result = await pool.query(
      `
      SELECT b.*, 
             COALESCE(b.checkin_time, '14:00:00'::time) AS checkin_time,
             COALESCE(b.checkout_time, '12:00:00'::time) AS checkout_time,
             COALESCE(b.rental_type, 'DAY') AS rental_type,
             h.name AS hotel_name, 
             COALESCE(u.full_name, b.customer_name) AS customer_name, 
             COALESCE(u.phone, b.guest_phone) AS guest_phone,
             COALESCE((SELECT br.room_name FROM public.booking_room br WHERE br.booking_id = b.id LIMIT 1), 'Phòng tiêu chuẩn') AS room_name
      FROM public.booking b 
      JOIN public.hotel h ON h.id = b.hotel_id 
      LEFT JOIN public.users u ON u.id = b.user_id
      WHERE h.owner_id = $1 OR h.id IN (SELECT hotel_id FROM public.hotel_staff WHERE user_id = $1)
      ORDER BY b.created_at DESC
    `,
      [userId],
    );

    return res.json({
      success: true,
      data: result.rows || [],
      bookings: result.rows || [],
    });
  } catch {
    return res.json({ success: true, data: [], bookings: [] });
  }
}

// ─── 3. SƠ ĐỒ PHÒNG LỄ TÂN ───
async function getRoomMapData(req, res) {
  try {
    const { hotel_id: hotelId } = req.query;
    if (!hotelId)
      return res
        .status(400)
        .json({ success: false, message: "hotel_id là bắt buộc." });

    const [roomsRes, bookingsRes] = await Promise.all([
      pool.query(
        `
        SELECT r.id AS room_type_id, r.name AS room_type_name, r.code AS room_code, r.base_price AS daily_price, r.hourly_tiers,
               COALESCE(NULLIF(r.hourly_price, 0), ROUND(r.base_price * 0.25)) AS hourly_price,
               COALESCE(NULLIF(r.overnight_price, 0), r.base_price) AS overnight_price,
               COALESCE(r.half_day_price, ROUND(r.base_price * 0.8)) AS half_day_price,
               ru.id AS unit_id, ru.room_number, COALESCE(ru.status, 'available') AS unit_status, COALESCE(ru.area, 'Tầng 1') AS area
        FROM public.room r LEFT JOIN public.room_unit ru ON ru.room_id = r.id
        WHERE r.hotel_id::text = $1 AND COALESCE(r.is_active, true) ORDER BY ru.area ASC, ru.room_number ASC
      `,
        [hotelId],
      ),
      pool
        .query(
          `
        SELECT b.*,
               COALESCE(b.checkin_time, '14:00:00'::time) AS checkin_time,
               COALESCE(b.checkout_time, '12:00:00'::time) AS checkout_time,
               COALESCE(b.rental_type, 'DAY') AS rental_type
        FROM public.booking b
        WHERE b.hotel_id::text = $1 AND b.status IN ('confirmed', 'checked_in') AND TRIM(COALESCE(b.room_number, '')) <> ''
        ORDER BY b.created_at DESC
      `,
          [hotelId],
        )
        .catch(() => ({ rows: [] })),
    ]);

    const usedBookingIds = new Set();
    const activeBookings = bookingsRes.rows || [];

    const roomList = roomsRes.rows.map((row, idx) => {
      const roomNum =
        row.room_number || `P.${idx < 9 ? "10" + (idx + 1) : "1" + (idx + 1)}`;
      const isDirty = row.unit_status === "dirty";
      const cleanDigits = String(roomNum).replace(/[^0-9]/g, "");

      const room = {
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
        half_day_price: Number(row.half_day_price || 0),
        status: isDirty ? "dirty" : "available",
        unit_status: row.unit_status || "available",
        is_dirty: isDirty,
        booking: null,
      };

      const match = activeBookings.find((b) => {
        if (usedBookingIds.has(b.id) || !b.room_number) return false;
        const bDigits = String(b.room_number).replace(/[^0-9]/g, "");
        return (
          String(b.room_number).trim().toLowerCase() ===
            String(roomNum).trim().toLowerCase() ||
          (cleanDigits && bDigits === cleanDigits)
        );
      });

      if (match) {
        usedBookingIds.add(match.id);
        const now = new Date();
        const diffMs = Math.max(
          0,
          now - new Date(match.confirmed_at || match.created_at || now),
        );
        const diffHours = Math.floor(diffMs / 36e5);

        room.booking = {
          id: match.id,
          code: match.booking_code,
          customer_name: match.customer_name || "Khách đặt trước",
          guest_phone: match.guest_phone || "",
          stay_duration:
            diffHours < 1
              ? `${Math.floor(diffMs / 6e4)} phút`
              : `${diffHours} giờ`,
          checkin_date: match.checkin_date,
          checkout_date: match.checkout_date,
          checkin_time: match.checkin_time,
          checkout_time: match.checkout_time,
          rental_type: match.rental_type,
          total_price: Number(match.total_price || room.daily_price || 0),
          customer_paid: Number(match.subtotal || match.total_price || 0),
          adult_total: Number(match.adult_total || 1),
          children_total: Number(match.children_total || 0),
        };
        room.status = match.status === "checked_in" ? "occupied" : "incoming";
      }

      return room;
    });

    return res.json({ success: true, rooms: roomList });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ─── 4. ĐƠN ONLINE CHỜ XẾP PHÒNG & XÁC NHẬN ───
async function getPendingOnlineBookings(req, res) {
  try {
    const rawHotelId = String(req.query.hotel_id || "").trim();
    const result = await pool.query(
      `
      SELECT b.id, b.booking_code, b.customer_name, b.guest_phone, b.guest_email, 
             b.checkin_date, b.checkout_date,
             COALESCE(b.checkin_time, '14:00:00'::time) AS checkin_time,
             COALESCE(b.checkout_time, '12:00:00'::time) AS checkout_time,
             COALESCE(b.rental_type, 'DAY') AS rental_type,
             b.adult_total, b.children_total, b.total_price, b.created_at, b.payment_status, b.status, b.room_number, b.hotel_id,
             COALESCE(p.paid_amount, b.total_price) AS paid_amount, 
             COALESCE(br.room_name, r.name, 'Phòng tiêu chuẩn') AS room_type_name,
             COALESCE(br.room_id, r.id) AS room_type_id
      FROM public.booking b
      LEFT JOIN public.booking_room br ON br.booking_id = b.id
      LEFT JOIN public.room r ON r.id = br.room_id
      LEFT JOIN public.payment p ON p.booking_id = b.id
      WHERE b.status NOT IN ('checked_in', 'checked_out', 'cancelled') 
        AND TRIM(COALESCE(b.room_number, '')) = ''
        AND ($1 = '' OR $1 = 'all' OR b.hotel_id::text = $1 OR b.hotel_id IS NULL)
      ORDER BY b.created_at DESC LIMIT 50
    `,
      [rawHotelId],
    );
    return res.json({ success: true, data: result.rows || [] });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

async function confirmAndAssignRoom(req, res) {
  const client = await pool.connect();
  try {
    const { booking_id, room_number } = req.body;
    if (!booking_id || !room_number)
      return res
        .status(400)
        .json({ success: false, message: "Vui lòng chọn số phòng!" });

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

    const updateRes = await client.query(
      `
      UPDATE public.booking SET room_number = $1, status = 'confirmed'::public.booking_status_enum,
             receptionist_assigned = true, confirmed_at = NOW(), updated_at = NOW()
      WHERE id = $2 RETURNING *
    `,
      [room_number.trim(), booking.id],
    );

    await client.query("COMMIT");
    return res.json({
      success: true,
      message: `✓ Đã xếp đơn ${booking.booking_code} vào phòng ${room_number} thành công!`,
      booking: updateRes.rows[0],
    });
  } catch (err) {
    await client.query("ROLLBACK");
    return res.status(500).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
}

// ─── 5. ĐẶT PHÒNG TẠI QUẦY (WALK-IN) ───
async function createWalkInBooking(req, res) {
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
      checkin_time = "14:00:00",
      checkout_time = "12:00:00",
      rental_type = "DAY",
      is_check_in_now = true,
    } = req.body;
    await client.query("BEGIN");

    const unitRes = await client.query(
      `SELECT ru.room_number FROM public.room_unit ru JOIN public.room r ON r.id = ru.room_id WHERE ru.id::text = $1 OR r.id::text = $1 LIMIT 1`,
      [room_id],
    );
    const roomNumber = unitRes.rows[0]?.room_number || "P.101";

    const inTime =
      checkin_time.length === 5 ? `${checkin_time}:00` : checkin_time;
    const outTime =
      checkout_time.length === 5 ? `${checkout_time}:00` : checkout_time;

    const insertBooking = await client.query(
      `
      INSERT INTO public.booking (
        id, booking_code, hotel_id, status, payment_status, total_price, 
        checkin_date, checkout_date, checkin_time, checkout_time, rental_type,
        adult_total, children_total, customer_name, guest_email, guest_phone, room_number, subtotal,
        receptionist_assigned, confirmed_at, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4::public.booking_status_enum, 'paid'::public.booking_payment_status_enum, $5,
        $6::date, $7::date, $8::time, $9::time, $10,
        1, 0, $11, 'walkin@hotel.internal', $12, $13, $14, true, NOW(), NOW(), NOW()
      ) RETURNING *;
    `,
      [
        crypto.randomUUID(),
        `DP${Math.floor(100000 + Math.random() * 900000)}`,
        hotel_id,
        is_check_in_now ? "checked_in" : "confirmed",
        Number(total_price || 0),
        checkin_date || toDateStr(new Date()),
        checkout_date || toDateStr(new Date(Date.now() + 864e5)),
        inTime,
        outTime,
        rental_type,
        customer_name || "Khách lẻ",
        guest_phone || "",
        roomNumber,
        Number(customer_paid || 0),
      ],
    );

    if (is_check_in_now) {
      await client
        .query(
          `UPDATE public.room_unit SET status = 'occupied', updated_at = NOW() WHERE hotel_id = $1 AND room_number = $2`,
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

// ─── 6. CHECK-IN / CHECK-OUT / ĐỔI PHÒNG ───
async function handleOwnerCheckOut(req, res) {
  try {
    const updateRes = await pool.query(
      `
      UPDATE public.booking SET status = 'checked_out'::public.booking_status_enum, payment_status = 'paid'::public.booking_payment_status_enum, updated_at = NOW()
      WHERE id::text = $1 OR booking_code = $1 RETURNING *
    `,
      [req.params.id],
    );

    const booking = updateRes.rows[0];
    if (booking?.room_number) {
      await pool
        .query(
          `UPDATE public.room_unit SET status = 'dirty', updated_at = NOW() WHERE hotel_id = $1 AND (room_number = $2 OR room_number ILIKE $3)`,
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

async function handleOwnerCheckIn(req, res) {
  try {
    const { room_number } = req.body;
    const updateRes = await pool.query(
      `
      UPDATE public.booking SET status = 'checked_in'::public.booking_status_enum, room_number = COALESCE($1, room_number), confirmed_at = NOW(), updated_at = NOW()
      WHERE id::text = $2 OR booking_code = $2 RETURNING *
    `,
      [room_number || null, req.params.id],
    );

    const b = updateRes.rows[0];
    if (b?.room_number && b?.hotel_id) {
      await pool
        .query(
          `UPDATE public.room_unit SET status = 'occupied', updated_at = NOW() WHERE hotel_id = $1 AND room_number = $2`,
          [b.hotel_id, b.room_number],
        )
        .catch(() => {});
    }
    return res.json({ success: true, booking: b });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function handleChangeRoom(req, res) {
  try {
    const { new_room_number, room_legs } = req.body;
    await pool.query(
      `
      UPDATE public.booking SET room_number = $1, room_legs = COALESCE($2::jsonb, room_legs), updated_at = NOW() WHERE id::text = $3 OR booking_code = $3
    `,
      [
        new_room_number,
        room_legs ? JSON.stringify(room_legs) : null,
        req.params.id,
      ],
    );
    return res.json({
      success: true,
      message: `Đã đổi sang phòng ${new_room_number}!`,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ─── 7. DỌN PHÒNG ───
const setRoomUnitCleanStatus = async (hotelId, roomNumber, status) => {
  const cleanNum = String(roomNumber || "").replace(/[^0-9]/g, "");
  return pool.query(
    `UPDATE public.room_unit SET status = $1, updated_at = NOW() WHERE hotel_id::text = $2 AND (room_number = $3 OR room_number ILIKE $4)`,
    [status, hotelId, roomNumber, `%${cleanNum}%`],
  );
};
const markRoomCleaned = async (req, res) => {
  await setRoomUnitCleanStatus(
    req.body.hotel_id,
    req.body.room_number,
    "available",
  );
  return res.json({
    success: true,
    message: `Phòng ${req.body.room_number} đã được dọn sạch!`,
  });
};
const markRoomDirty = async (req, res) => {
  await setRoomUnitCleanStatus(
    req.body.hotel_id,
    req.body.room_number,
    "dirty",
  );
  return res.json({
    success: true,
    message: `Phòng ${req.body.room_number} đã chuyển sang Cần dọn!`,
  });
};

// ─── 8. QUẢN LÝ NHÂN VIÊN LỄ TÂN ───
async function getOwnerStaff(req, res) {
  try {
    const ownerId = req.user?.id || req.auth?.sub;
    if (!ownerId)
      return res.status(401).json({ message: "Vui lòng đăng nhập." });

    const result = await pool.query(
      `
      SELECT u.id, u.full_name, u.email, u.phone, u.activate, u.created_at, h.id AS hotel_id, h.name AS hotel_name
      FROM public.hotel_staff hs JOIN public.hotel h ON h.id = hs.hotel_id JOIN public.users u ON u.id = hs.user_id
      WHERE h.owner_id = $1::uuid ORDER BY hs.created_at DESC
    `,
      [ownerId],
    );
    return res.json({
      success: true,
      staff: result.rows || [],
      data: result.rows || [],
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function createOwnerStaff(req, res) {
  const client = await pool.connect();
  try {
    const ownerId = req.user?.id || req.auth?.sub;
    const { full_name, email, phone, password, hotel_id } = req.body;
    if (!full_name || !email || !password || !hotel_id)
      return res
        .status(400)
        .json({ message: "Họ tên, email, mật khẩu và khách sạn là bắt buộc." });

    const targetEmail = String(email).trim().toLowerCase();
    await client.query("BEGIN");

    const hotelCheck = await client.query(
      `SELECT id, name FROM public.hotel WHERE id::text = $1 AND owner_id::text = $2 LIMIT 1`,
      [hotel_id, ownerId],
    );
    if (!hotelCheck.rows.length) {
      await client.query("ROLLBACK");
      return res
        .status(403)
        .json({ message: "Bạn không có quyền quản trị khách sạn này." });
    }

    const existingUser = await client.query(
      `SELECT id FROM public.users WHERE email = $1 LIMIT 1`,
      [targetEmail],
    );
    let staffUserId = existingUser.rows[0]?.id;

    if (!staffUserId) {
      const userRes = await client.query(
        `
        INSERT INTO public.users (id, full_name, email, password, phone, activate, email_verified, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, true, true, NOW(), NOW()) RETURNING id
      `,
        [
          crypto.randomUUID(),
          full_name.trim(),
          targetEmail,
          await hashPassword(password),
          phone?.trim() || null,
        ],
      );
      staffUserId = userRes.rows[0].id;
    }

    const roleRes = await client.query(
      `INSERT INTO public.roles (id, name) VALUES (gen_random_uuid(), 'RECEPTIONIST') ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
    );
    await client.query(
      `INSERT INTO public.user_roles (user_id, role_id) VALUES ($1::uuid, $2::uuid) ON CONFLICT DO NOTHING`,
      [staffUserId, roleRes.rows[0].id],
    );
    await client.query(
      `INSERT INTO public.hotel_staff (id, hotel_id, user_id, created_at) VALUES (gen_random_uuid(), $1::uuid, $2::uuid, NOW()) ON CONFLICT (hotel_id, user_id) DO NOTHING`,
      [hotel_id, staffUserId],
    );

    await client.query("COMMIT");
    return res.status(201).json({
      success: true,
      message: `Đã cấp tài khoản lễ tân cho ${full_name} thành công!`,
      staff: {
        id: staffUserId,
        full_name,
        email: targetEmail,
        phone,
        hotel_id,
        hotel_name: hotelCheck.rows[0].name,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    return res.status(500).json({
      success: false,
      message: error.message || "Lỗi tạo tài khoản nhân viên.",
    });
  } finally {
    client.release();
  }
}

async function deleteOwnerStaff(req, res) {
  const client = await pool.connect();
  try {
    const ownerId = req.user?.id || req.auth?.sub;
    await client.query("BEGIN");
    const deleteRes = await client.query(
      `DELETE FROM public.hotel_staff WHERE user_id::text = $1 AND hotel_id IN (SELECT id FROM public.hotel WHERE owner_id::text = $2) RETURNING id`,
      [req.params.id, ownerId],
    );

    if (!deleteRes.rowCount) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        message: "Không tìm thấy nhân viên lễ tân này trong cơ sở của bạn.",
      });
    }
    await client.query("COMMIT");
    return res.json({
      success: true,
      message: "Đã xóa nhân viên lễ tân khỏi cơ sở thành công!",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    return res.status(500).json({ success: false, message: error.message });
  } finally {
    client.release();
  }
}

async function toggleStaffStatus(req, res) {
  try {
    const ownerId = req.user?.id || req.auth?.sub;
    const check = await pool.query(
      `SELECT hs.id FROM public.hotel_staff hs JOIN public.hotel h ON h.id = hs.hotel_id WHERE hs.user_id::text = $1 AND h.owner_id::text = $2 LIMIT 1`,
      [req.params.id, ownerId],
    );
    if (!check.rows.length)
      return res
        .status(403)
        .json({ message: "Bạn không có quyền quản lý nhân viên này." });

    await pool.query(
      `UPDATE public.users SET activate = $1, updated_at = NOW() WHERE id::text = $2`,
      [Boolean(req.body.activate), req.params.id],
    );
    return res.json({
      success: true,
      message: `Đã ${req.body.activate ? "mở khóa" : "tạm khóa"} tài khoản nhân viên thành công!`,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ─── 9. PLACEHOLDERS ───
const handleAddBookingService = (req, res) => res.json({ success: true });
const updateOwnerBookingStatus = (req, res) => res.json({ success: true });
const updateHotelInfo = (req, res) => res.json({ success: true });

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
