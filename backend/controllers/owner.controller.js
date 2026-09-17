// backend/controllers/owner.controller.js
const crypto = require("crypto");
const pool = require("../config/database");

// Tự động nhận diện thư viện mã hóa bcrypt
let bcrypt;
try {
  bcrypt = require("bcryptjs");
} catch {
  try {
    bcrypt = require("bcrypt");
  } catch {
    bcrypt = null;
  }
}

// Tự động đảm bảo các cột và bảng phân quyền lễ tân tồn tại
(async function ensureRequiredColumnsAndTables() {
  try {
    await pool.query(`
      ALTER TABLE public.booking ADD COLUMN IF NOT EXISTS room_legs jsonb DEFAULT '[]'::jsonb;
      ALTER TABLE public.booking ADD COLUMN IF NOT EXISTS receptionist_assigned boolean DEFAULT false;
      
      CREATE TABLE IF NOT EXISTS public.hotel_staff (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        hotel_id uuid NOT NULL REFERENCES public.hotel(id) ON DELETE CASCADE,
        user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        created_at timestamp with time zone DEFAULT NOW(),
        updated_at timestamp with time zone DEFAULT NOW(),
        CONSTRAINT hotel_staff_unique UNIQUE (hotel_id, user_id)
      );
    `);
  } catch (err) {
    console.warn("⚠️ Cảnh báo migration owner/staff columns:", err.message);
  }
})();

const hashPassword = async (plainPassword) => {
  if (bcrypt) {
    return await bcrypt.hash(plainPassword, 10);
  }
  return crypto.createHash("sha256").update(plainPassword).digest("hex");
};

function resolveDateRange(rangeStr) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const todayDateNum = now.getDate();

  let startDate, endDate, prevStartDate, prevEndDate;
  let dayCount = 1;
  let compLabel = "so với kỳ trước";

  if (rangeStr === "today") {
    startDate = now.toLocaleDateString("en-CA");
    endDate = startDate;
    const yest = new Date(now);
    yest.setDate(now.getDate() - 1);
    prevStartDate = yest.toLocaleDateString("en-CA");
    prevEndDate = prevStartDate;
    dayCount = 1;
    compLabel = "so với hôm qua";
  } else if (rangeStr === "yesterday") {
    const yest = new Date(now);
    yest.setDate(now.getDate() - 1);
    startDate = yest.toLocaleDateString("en-CA");
    endDate = startDate;

    const dayBefore = new Date(now);
    dayBefore.setDate(now.getDate() - 2);
    prevStartDate = dayBefore.toLocaleDateString("en-CA");
    prevEndDate = prevStartDate;
    dayCount = 1;
    compLabel = "so với ngày hôm kia";
  } else if (rangeStr === "7days") {
    const start = new Date(now);
    start.setDate(now.getDate() - 6);
    startDate = start.toLocaleDateString("en-CA");
    endDate = now.toLocaleDateString("en-CA");

    const pStart = new Date(now);
    pStart.setDate(now.getDate() - 13);
    const pEnd = new Date(now);
    pEnd.setDate(now.getDate() - 7);
    prevStartDate = pStart.toLocaleDateString("en-CA");
    prevEndDate = pEnd.toLocaleDateString("en-CA");
    dayCount = 7;
    compLabel = "so với 7 ngày trước";
  } else if (rangeStr === "last_month") {
    const firstDay = new Date(currentYear, currentMonth - 1, 1);
    const lastDay = new Date(currentYear, currentMonth, 0);
    startDate = firstDay.toLocaleDateString("en-CA");
    endDate = lastDay.toLocaleDateString("en-CA");

    const pFirst = new Date(currentYear, currentMonth - 2, 1);
    const pLast = new Date(currentYear, currentMonth - 1, 0);
    prevStartDate = pFirst.toLocaleDateString("en-CA");
    prevEndDate = pLast.toLocaleDateString("en-CA");
    dayCount = lastDay.getDate();
    compLabel = "so với tháng trước đó";
  } else {
    const firstDay = new Date(currentYear, currentMonth, 1);
    startDate = firstDay.toLocaleDateString("en-CA");
    endDate = now.toLocaleDateString("en-CA");

    const pFirst = new Date(currentYear, currentMonth - 1, 1);
    const pEnd = new Date(
      currentYear,
      currentMonth - 1,
      Math.min(todayDateNum, 28),
    );
    prevStartDate = pFirst.toLocaleDateString("en-CA");
    prevEndDate = pEnd.toLocaleDateString("en-CA");
    dayCount = Math.max(1, todayDateNum);
    compLabel = "so với cùng kỳ tháng trước";
  }

  return {
    startDate,
    endDate,
    prevStartDate,
    prevEndDate,
    dayCount,
    compLabel,
  };
}

// ─── 1. THỐNG KÊ DASHBOARD QUẢN TRỊ KHÁCH SẠN (API /api/owner/stats) ───
async function getOwnerStats(req, res, next) {
  try {
    const ownerId =
      req.user?.id || req.user?.userId || req.auth?.sub || req.auth?.id;
    const hotelId = req.query.hotel_id
      ? String(req.query.hotel_id).trim()
      : "all";

    const revenueRangeParam =
      req.query.revenue_range || req.query.range || "this_month";
    const occupancyRangeParam =
      req.query.occupancy_range || req.query.range || "this_month";

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

    const revDates = resolveDateRange(revenueRangeParam);
    const occDates = resolveDateRange(occupancyRangeParam);

    const roomsRes = await pool.query(
      `SELECT COALESCE(SUM(r.amount), 0)::int AS total_rooms 
       FROM public.room r 
       JOIN public.hotel h ON h.id = r.hotel_id 
       WHERE ${hotelFilter} AND (r.is_active = true OR r.is_active IS NULL)`,
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

    const revTimeParams = [...baseParams, revDates.startDate, revDates.endDate];
    const rpStart = revTimeParams.length - 1;
    const rpEnd = revTimeParams.length;

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
           b.id,
           b.status
         FROM public.booking b
         JOIN public.hotel h ON h.id = b.hotel_id
         WHERE ${hotelFilter}
           AND (
             (b.created_at::date >= $${rpStart}::date AND b.created_at::date <= $${rpEnd}::date)
             OR (b.checkin_date >= $${rpStart}::date AND b.checkin_date <= $${rpEnd}::date)
           )
       )
       SELECT 
         channel,
         status,
         COALESCE(SUM(total_price), 0)::bigint AS total_money,
         COUNT(id)::int AS order_count
       FROM booking_channels
       GROUP BY channel, status`,
      revTimeParams,
    );

    let directAmount = 0;
    let directCount = 0;
    let onlineAmount = 0;
    let onlineCount = 0;
    let cancelledAmount = 0;
    let cancelledCount = 0;

    channelQuery.rows.forEach((r) => {
      if (r.status === "cancelled") {
        cancelledAmount += Number(r.total_money || 0);
        cancelledCount += Number(r.order_count || 0);
      } else {
        if (r.channel === "direct") {
          directAmount += Number(r.total_money || 0);
          directCount += Number(r.order_count || 0);
        } else {
          onlineAmount += Number(r.total_money || 0);
          onlineCount += Number(r.order_count || 0);
        }
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
      cancelledAmount,
      cancelledCount,
      chartData: [
        { name: "Khách đến trực tiếp", booked: directAmount, cancelled: 0 },
        { name: "Khách đặt online", booked: onlineAmount, cancelled: 0 },
      ],
    };

    const stayDateRes = await pool.query(
      `WITH period_days AS (
         SELECT generate_series($${rpStart}::date, $${rpEnd}::date, '1 day'::interval)::date AS day_date
       ),
       day_usage AS (
         SELECT 
           pd.day_date,
           COALESCE(SUM(b.total_price), 0)::bigint AS total_amount,
           COUNT(DISTINCT b.id)::int AS booking_count
         FROM period_days pd
         LEFT JOIN public.booking b 
           ON (
             (b.checkin_date <= pd.day_date AND b.checkout_date > pd.day_date)
             OR (b.checkin_date = b.checkout_date AND b.checkin_date = pd.day_date)
             OR (b.created_at::date = pd.day_date)
           )
           AND b.status IN ('checked_in', 'checked_out', 'confirmed')
         LEFT JOIN public.hotel h ON h.id = b.hotel_id AND ${hotelFilter}
         GROUP BY pd.day_date
       )
       SELECT day_date, total_amount, booking_count 
       FROM day_usage 
       ORDER BY day_date ASC`,
      revTimeParams,
    );

    const prevTimeParams = [
      ...baseParams,
      revDates.prevStartDate,
      revDates.prevEndDate,
    ];
    const ppStart = prevTimeParams.length - 1;
    const ppEnd = prevTimeParams.length;

    const prevRevRes = await pool.query(
      `SELECT COALESCE(SUM(b.total_price), 0)::bigint AS prev_revenue
       FROM public.booking b
       JOIN public.hotel h ON h.id = b.hotel_id
       WHERE ${hotelFilter}
         AND b.status IN ('checked_in', 'checked_out', 'confirmed')
         AND (
           (b.created_at::date >= $${ppStart}::date AND b.created_at::date <= $${ppEnd}::date)
           OR (b.checkin_date >= $${ppStart}::date AND b.checkin_date <= $${ppEnd}::date)
         )`,
      prevTimeParams,
    );

    const prevRevenue = Number(prevRevRes.rows[0]?.prev_revenue || 0);
    let growthRate = 0;
    if (prevRevenue > 0) {
      growthRate = Math.round(
        ((totalRevenue - prevRevenue) / prevRevenue) * 100,
      );
    } else if (totalRevenue > 0) {
      growthRate = 300;
    }

    const stayDateChartData = stayDateRes.rows.map((r) => {
      const d = new Date(r.day_date);
      const label = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
      return {
        label,
        date: r.day_date,
        amount: Number(r.total_amount || 0),
        booking_count: Number(r.booking_count || 0),
      };
    });

    const stayDateStats = {
      totalAmount: totalRevenue,
      totalCount: totalOrderCount,
      growthRate: growthRate,
      growthLabel: revDates.compLabel,
      chartData: stayDateChartData,
    };

    const occTimeParams = [...baseParams, occDates.startDate, occDates.endDate];
    const opStart = occTimeParams.length - 1;
    const opEnd = occTimeParams.length;

    const dailyOccupancyRes = await pool.query(
      `WITH period_days AS (
         SELECT generate_series($${opStart}::date, $${opEnd}::date, '1 day'::interval)::date AS day_date
       ),
       day_usage AS (
         SELECT 
           pd.day_date,
           COUNT(DISTINCT COALESCE(b.room_number, b.id::text))::int AS occupied_on_day
         FROM period_days pd
         LEFT JOIN public.booking b 
           ON (
             (b.checkin_date <= pd.day_date AND b.checkout_date > pd.day_date)
             OR (b.checkin_date = b.checkout_date AND b.checkin_date = pd.day_date)
           )
           AND b.status IN ('checked_in', 'checked_out', 'confirmed')
         LEFT JOIN public.hotel h ON h.id = b.hotel_id AND ${hotelFilter}
         GROUP BY pd.day_date
       )
       SELECT 
         day_date,
         occupied_on_day,
         EXTRACT(DOW FROM day_date)::int AS day_of_week
       FROM day_usage
       ORDER BY day_date ASC`,
      occTimeParams,
    );

    let totalUsedRoomDays = 0;
    const timelineDay = dailyOccupancyRes.rows.map((row) => {
      const occupied = Number(row.occupied_on_day || 0);
      totalUsedRoomDays += occupied;
      const rate =
        totalRooms > 0
          ? Math.min(100, Math.round((occupied / totalRooms) * 100))
          : 0;
      const d = new Date(row.day_date);
      const dayLabel = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
      return {
        label: dayLabel,
        date: row.day_date,
        rate: rate,
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
    const weekdayStats = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 0: [] };

    dailyOccupancyRes.rows.forEach((row) => {
      const dow = row.day_of_week;
      const occupied = Number(row.occupied_on_day || 0);
      const rate =
        totalRooms > 0
          ? Math.min(100, Math.round((occupied / totalRooms) * 100))
          : 0;
      if (weekdayStats[dow]) {
        weekdayStats[dow].push(rate);
      }
    });

    const timelineWeekday = [1, 2, 3, 4, 5, 6, 0].map((dow) => {
      const list = weekdayStats[dow];
      const avg =
        list.length > 0
          ? Math.round(list.reduce((a, b) => a + b, 0) / list.length)
          : 0;
      return {
        label: weekdayMap[dow],
        rate: avg,
      };
    });

    const roomTypeStatsRes = await pool.query(
      `SELECT 
         r.id,
         r.name,
         COALESCE(r.amount, 1)::int AS room_amount,
         COUNT(b.id)::int AS total_bookings
       FROM public.room r
       JOIN public.hotel h ON h.id = r.hotel_id
       LEFT JOIN public.booking_room br ON br.room_id = r.id
       LEFT JOIN public.booking b 
         ON (b.id = br.booking_id OR b.room_number ILIKE '%' || r.code || '%')
         AND b.status IN ('checked_in', 'checked_out', 'confirmed')
         AND (
           (b.checkin_date <= $${opEnd}::date AND b.checkout_date >= $${opStart}::date)
         )
       WHERE ${hotelFilter} AND (r.is_active = true OR r.is_active IS NULL)
       GROUP BY r.id, r.name, r.amount
       ORDER BY r.base_price ASC`,
      occTimeParams,
    );

    const byRoomType = roomTypeStatsRes.rows.map((r) => {
      const roomCapacity = Number(r.room_amount || 1) * occDates.dayCount;
      const used = Number(r.total_bookings || 0);
      const rate =
        roomCapacity > 0
          ? Math.min(100, Math.round((used / roomCapacity) * 100))
          : 0;
      return {
        name: r.name,
        rate: rate,
      };
    });

    const areaStatsRes = await pool.query(
      `SELECT 
         COALESCE(ru.area, 'Tầng 1') AS area_name,
         COUNT(DISTINCT ru.id)::int AS unit_count
       FROM public.room_unit ru
       JOIN public.hotel h ON h.id = ru.hotel_id
       WHERE ${hotelFilter}
       GROUP BY COALESCE(ru.area, 'Tầng 1')
       ORDER BY area_name ASC`,
      baseParams,
    );

    const byArea = areaStatsRes.rows.map((a) => {
      return {
        name: a.area_name,
        rate: currentRate,
      };
    });

    const totalPotentialDays = Math.max(1, totalRooms * occDates.dayCount);
    const avgRate =
      totalRooms > 0
        ? Math.min(
            100,
            Math.round((totalUsedRoomDays / totalPotentialDays) * 100),
          )
        : 0;

    const paymentAlertsRes = await pool.query(
      `SELECT b.id, b.booking_code, COALESCE(b.room_number, 'Chưa xếp') AS room,
              b.customer_name AS guest, (b.total_price - COALESCE(b.subtotal, 0)) AS amount
       FROM public.booking b
       JOIN public.hotel h ON h.id = b.hotel_id
       WHERE ${hotelFilter}
         AND b.status = 'checked_in'
         AND b.payment_status != 'paid'`,
      baseParams,
    );

    const leakAlertsRes = await pool.query(
      `SELECT b.id, b.booking_code, COALESCE(b.room_number, 'P.101') AS room,
              b.customer_name AS guest, 100000 AS amount
       FROM public.booking b
       JOIN public.hotel h ON h.id = b.hotel_id
       WHERE ${hotelFilter}
         AND b.status = 'checked_in'
         AND b.checkout_date < CURRENT_DATE`,
      baseParams,
    );

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
      stayDateStats,
      occupancyAnalytics: {
        hasData: totalRooms > 0,
        avgRate: totalRooms > 0 ? avgRate : null,
        timelineDay,
        timelineWeekday,
        byRoomType,
        byArea:
          byArea.length > 0 ? byArea : [{ name: "Tầng 1", rate: currentRate }],
      },
      automationSummary: {
        autoReconciledToday: totalOrderCount,
        autoReconciledAmount: totalRevenue,
        paymentAlerts: paymentAlertsRes.rows || [],
        leakAlerts: leakAlertsRes.rows || [],
        totalUnpaidAmount: (paymentAlertsRes.rows || []).reduce(
          (sum, item) => sum + Number(item.amount || 0),
          0,
        ),
        potentialLeakTotal: (leakAlertsRes.rows || []).reduce(
          (sum, item) => sum + Number(item.amount || 0),
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

// ─── 3. SƠ ĐỒ PHÒNG LỄ TÂN ───
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

// ─── 3.1. LẤY TẤT CẢ ĐƠN ONLINE CHỜ LỄ TÂN CHỌN PHÒNG ───
async function getPendingOnlineBookings(req, res, next) {
  try {
    const rawHotelId = req.query.hotel_id
      ? String(req.query.hotel_id).trim()
      : "";

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
         COALESCE(p.paid_amount, b.total_price) AS paid_amount,
         COALESCE(br.room_name, r.name, 'Phòng tiêu chuẩn') AS room_type_name,
         COALESCE(br.room_id, r.id) AS room_type_id
       FROM public.booking b
       LEFT JOIN public.booking_room br ON br.booking_id = b.id
       LEFT JOIN public.room r ON r.id = br.room_id
       LEFT JOIN public.payment p ON p.booking_id = b.id
       WHERE b.status NOT IN ('checked_in', 'checked_out', 'cancelled')
         AND (b.room_number IS NULL OR TRIM(b.room_number) = '')
         AND ($1 = '' OR $1 = 'all' OR b.hotel_id::text = $1 OR b.hotel_id IS NULL)
       ORDER BY b.created_at DESC
       LIMIT 50
    `;

    const result = await pool.query(querySql, [rawHotelId]);
    return res.json({
      success: true,
      data: result.rows || [],
    });
  } catch (err) {
    console.error("❌ LỖI GET_PENDING_ONLINE_BOOKINGS:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ─── 3.2. LỄ TÂN CHỌN PHÒNG & BẤM XÁC NHẬN ───
async function confirmAndAssignRoom(req, res, next) {
  const client = await pool.connect();
  try {
    const { booking_id, room_number } = req.body;

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

// ─── 5. TRẢ PHÒNG (CHECK-OUT) ───
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
    const { new_room_number, room_legs } = req.body;
    await pool.query(
      `UPDATE public.booking 
       SET room_number = $1, 
           room_legs = COALESCE($2::jsonb, room_legs), 
           updated_at = NOW() 
       WHERE id::text = $3 OR booking_code = $3`,
      [new_room_number, room_legs ? JSON.stringify(room_legs) : null, id],
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

// ─── 8. NHẬN PHÒNG (CHECK-IN) ───
async function handleOwnerCheckIn(req, res, next) {
  try {
    const { id } = req.params;
    const { room_number } = req.body;
    const updateBookingRes = await pool.query(
      `UPDATE public.booking 
       SET status = 'checked_in'::public.booking_status_enum, 
           room_number = COALESCE($1, room_number), 
           confirmed_at = NOW(), 
           updated_at = NOW()
       WHERE id::text = $2 OR booking_code = $2 RETURNING *`,
      [room_number || null, id],
    );

    const b = updateBookingRes.rows[0];
    if (b?.room_number && b?.hotel_id) {
      await pool
        .query(
          `UPDATE public.room_unit SET status = 'occupied', updated_at = NOW()
         WHERE hotel_id = $1 AND room_number = $2`,
          [b.hotel_id, b.room_number],
        )
        .catch(() => {});
    }

    return res.json({ success: true, booking: b });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function updateOwnerBookingStatus(req, res, next) {
  return res.json({ success: true });
}

// ─── 9. LẤY DANH SÁCH NHÂN VIÊN LỄ TÂN CỦA OWNER (ĐẦY ĐỦ LOGIC SQL) ───
async function getOwnerStaff(req, res, next) {
  try {
    const ownerId = req.user?.id || req.auth?.sub;
    if (!ownerId) {
      return res.status(401).json({ message: "Vui lòng đăng nhập." });
    }

    const query = `
      SELECT 
        u.id,
        u.full_name,
        u.email,
        u.phone,
        u.activate,
        u.created_at,
        h.id AS hotel_id,
        h.name AS hotel_name
      FROM public.hotel_staff hs
      JOIN public.hotel h ON h.id = hs.hotel_id
      JOIN public.users u ON u.id = hs.user_id
      WHERE h.owner_id = $1::uuid
      ORDER BY hs.created_at DESC
    `;

    const result = await pool.query(query, [ownerId]);
    return res.json({
      success: true,
      staff: result.rows || [],
      data: result.rows || [],
    });
  } catch (error) {
    console.error("❌ Lỗi getOwnerStaff:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ─── 10. TẠO TÀI KHOẢN LỄ TÂN MỚI (LƯU VÀO USERS, ROLES, HOTEL_STAFF) ───
async function createOwnerStaff(req, res, next) {
  const client = await pool.connect();
  try {
    const ownerId = req.user?.id || req.auth?.sub;
    const { full_name, email, phone, password, hotel_id } = req.body;

    if (!full_name || !email || !password || !hotel_id) {
      return res.status(400).json({
        message: "Họ tên, email, mật khẩu và khách sạn là bắt buộc.",
      });
    }

    const targetEmail = String(email).trim().toLowerCase();

    await client.query("BEGIN");

    // Kiểm tra xem khách sạn này có đúng là của Owner không
    const hotelCheck = await client.query(
      `SELECT id, name FROM public.hotel WHERE id::text = $1 AND owner_id::text = $2 LIMIT 1`,
      [hotel_id, ownerId],
    );

    if (hotelCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(403).json({
        message: "Bạn không có quyền quản trị khách sạn này.",
      });
    }

    // Kiểm tra xem email đã tồn tại trong bảng users chưa
    const existingUser = await client.query(
      `SELECT id FROM public.users WHERE email = $1 LIMIT 1`,
      [targetEmail],
    );

    let staffUserId;

    if (existingUser.rows.length > 0) {
      staffUserId = existingUser.rows[0].id;
    } else {
      // Tạo user mới trong bảng users
      const newUserId = crypto.randomUUID();
      const hashedPassword = await hashPassword(password);

      const userInsertSql = `
        INSERT INTO public.users (
          id, full_name, email, password, phone, activate, email_verified, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, true, true, NOW(), NOW()
        ) RETURNING id;
      `;

      const userRes = await client.query(userInsertSql, [
        newUserId,
        full_name.trim(),
        targetEmail,
        hashedPassword,
        phone ? phone.trim() : null,
      ]);
      staffUserId = userRes.rows[0].id;
    }

    // Đảm bảo Role RECEPTIONIST tồn tại
    const roleRes = await client.query(
      `INSERT INTO public.roles (id, name)
       VALUES (gen_random_uuid(), 'RECEPTIONIST')
       ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
    );
    const receptionistRoleId = roleRes.rows[0].id;

    // Gán role vào bảng user_roles
    await client.query(
      `INSERT INTO public.user_roles (user_id, role_id)
       VALUES ($1::uuid, $2::uuid)
       ON CONFLICT DO NOTHING`,
      [staffUserId, receptionistRoleId],
    );

    // Gán nhân viên vào khách sạn trong bảng hotel_staff
    await client.query(
      `INSERT INTO public.hotel_staff (id, hotel_id, user_id, created_at, updated_at)
       VALUES (gen_random_uuid(), $1::uuid, $2::uuid, NOW(), NOW())
       ON CONFLICT (hotel_id, user_id) DO NOTHING`,
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
    console.error("❌ Lỗi createOwnerStaff:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Lỗi tạo tài khoản nhân viên.",
    });
  } finally {
    client.release();
  }
}

// ─── 11. XÓA NHÂN VIÊN LỄ TÂN KHỎI CƠ SỞ ───
async function deleteOwnerStaff(req, res, next) {
  const client = await pool.connect();
  try {
    const ownerId = req.user?.id || req.auth?.sub;
    const staffUserId = req.params.id;

    await client.query("BEGIN");

    // Xóa liên kết của nhân viên trong khách sạn thuộc quyền sở hữu của Owner
    const deleteRes = await client.query(
      `DELETE FROM public.hotel_staff 
       WHERE user_id::text = $1 
         AND hotel_id IN (SELECT id FROM public.hotel WHERE owner_id::text = $2)
       RETURNING id`,
      [staffUserId, ownerId],
    );

    if (deleteRes.rowCount === 0) {
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
    console.error("❌ Lỗi deleteOwnerStaff:", error);
    return res.status(500).json({ success: false, message: error.message });
  } finally {
    client.release();
  }
}

// ─── 12. KHÓA HOẶC MỞ KHÓA TÀI KHOẢN LỄ TÂN ───
async function toggleStaffStatus(req, res, next) {
  try {
    const ownerId = req.user?.id || req.auth?.sub;
    const staffUserId = req.params.id;
    const { activate } = req.body;

    const checkRes = await pool.query(
      `SELECT hs.id 
       FROM public.hotel_staff hs
       JOIN public.hotel h ON h.id = hs.hotel_id
       WHERE hs.user_id::text = $1 AND h.owner_id::text = $2
       LIMIT 1`,
      [staffUserId, ownerId],
    );

    if (checkRes.rows.length === 0) {
      return res.status(403).json({
        message: "Bạn không có quyền quản lý nhân viên này.",
      });
    }

    await pool.query(
      `UPDATE public.users 
       SET activate = $1, updated_at = NOW() 
       WHERE id::text = $2`,
      [Boolean(activate), staffUserId],
    );

    return res.json({
      success: true,
      message: `Đã ${activate ? "mở khóa" : "tạm khóa"} tài khoản nhân viên thành công!`,
    });
  } catch (error) {
    console.error("❌ Lỗi toggleStaffStatus:", error);
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
