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

// 🌟 TỰ ĐỘNG MIGRATION TOÀN BỘ CỘT CHO BẢNG BOOKING, HOTEL VÀ ROOM TRÊN POSTGRESQL 🌟
(async () => {
  try {
    await pool
      .query(
        `
      ALTER TYPE public.booking_payment_status_enum ADD VALUE IF NOT EXISTS 'unpaid';
      ALTER TYPE public.booking_payment_status_enum ADD VALUE IF NOT EXISTS 'paid';
      ALTER TYPE public.booking_payment_status_enum ADD VALUE IF NOT EXISTS 'partially_paid';
    `,
      )
      .catch(() => {});

    await pool.query(`
      -- 1. Cột mở rộng cho bảng booking (Đơn đặt phòng)
      ALTER TABLE public.booking ADD COLUMN IF NOT EXISTS room_legs jsonb DEFAULT '[]'::jsonb;
      ALTER TABLE public.booking ADD COLUMN IF NOT EXISTS receptionist_assigned boolean DEFAULT false;
      ALTER TABLE public.booking ADD COLUMN IF NOT EXISTS checkin_time TIME WITHOUT TIME ZONE DEFAULT '14:00:00';
      ALTER TABLE public.booking ADD COLUMN IF NOT EXISTS checkout_time TIME WITHOUT TIME ZONE DEFAULT '12:00:00';
      ALTER TABLE public.booking ADD COLUMN IF NOT EXISTS rental_type VARCHAR(50) DEFAULT 'DAY';
      ALTER TABLE public.booking ADD COLUMN IF NOT EXISTS payment_type VARCHAR(50) DEFAULT 'FULL';
      ALTER TABLE public.booking ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC DEFAULT 0;
      ALTER TABLE public.booking ADD COLUMN IF NOT EXISTS guest_declarations jsonb DEFAULT '[]'::jsonb;
      ALTER TABLE public.booking ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP WITHOUT TIME ZONE;

      -- 2. Cột giờ & thông số định vị cho bảng hotel (Cơ sở lưu trú)
      ALTER TABLE public.hotel ADD COLUMN IF NOT EXISTS checkin_time TIME WITHOUT TIME ZONE DEFAULT '14:00:00';
      ALTER TABLE public.hotel ADD COLUMN IF NOT EXISTS checkout_time TIME WITHOUT TIME ZONE DEFAULT '12:00:00';
      ALTER TABLE public.hotel ADD COLUMN IF NOT EXISTS overnight_checkin_time TIME WITHOUT TIME ZONE DEFAULT '21:00:00';
      ALTER TABLE public.hotel ADD COLUMN IF NOT EXISTS overnight_checkout_time TIME WITHOUT TIME ZONE DEFAULT '11:00:00';
      ALTER TABLE public.hotel ADD COLUMN IF NOT EXISTS hourly_start_time TIME WITHOUT TIME ZONE DEFAULT '07:00:00';
      ALTER TABLE public.hotel ADD COLUMN IF NOT EXISTS hourly_end_time TIME WITHOUT TIME ZONE DEFAULT '21:00:00';
      ALTER TABLE public.hotel ADD COLUMN IF NOT EXISTS hourly_grace_minutes INT DEFAULT 15;
      ALTER TABLE public.hotel ADD COLUMN IF NOT EXISTS daily_grace_hours INT DEFAULT 1;
      ALTER TABLE public.hotel ADD COLUMN IF NOT EXISTS is_beachfront BOOLEAN DEFAULT false;
      ALTER TABLE public.hotel ADD COLUMN IF NOT EXISTS distance_to_center NUMERIC DEFAULT 1.2;

      -- 3. Cột giá đa dạng cho bảng room (Hạng phòng)
      ALTER TABLE public.room ADD COLUMN IF NOT EXISTS hourly_price NUMERIC DEFAULT 0;
      ALTER TABLE public.room ADD COLUMN IF NOT EXISTS overnight_price NUMERIC DEFAULT 0;
      ALTER TABLE public.room ADD COLUMN IF NOT EXISTS hourly_tiers JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE public.room ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

      -- 4. Bảng khóa tạm giữ phòng khi khách đang thanh toán
      CREATE TABLE IF NOT EXISTS public.temporary_locks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        room_id UUID,
        user_id UUID,
        session_id TEXT,
        lock_date DATE,
        quantity INT DEFAULT 1,
        lock_expires_at TIMESTAMP,
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log(
      "✓ [AUTO-MIGRATION] Đã đồng bộ cấu trúc cột Bảng Hotel, Room và Booking thành công!",
    );
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

// ─── 1. THỐNG KÊ DASHBOARD (ĐÃ TÍNH CHUẨN CÔNG SUẤT THEO KHU VỰC / TẦNG) ───
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
            AND (b.booking_code LIKE 'DP%' OR b.payment_status IN ('paid', 'partially_paid') OR COALESCE(b.deposit_amount, 0) > 0)
            AND ((b.created_at::date BETWEEN $${revParams.length - 1}::date AND $${revParams.length}::date) 
                 OR (b.checkin_date::date BETWEEN $${revParams.length - 1}::date AND $${revParams.length}::date))
        )
        SELECT channel, status, COALESCE(SUM(total_price), 0)::bigint AS total_money, COUNT(id)::int AS order_count 
        FROM booking_channels 
        GROUP BY channel, status
      `,
        revParams,
      ),

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
          LEFT JOIN (
            SELECT b_sub.* 
            FROM public.booking b_sub
            JOIN public.hotel h ON h.id = b_sub.hotel_id
            WHERE ${hotelFilter} 
              AND b_sub.status != 'cancelled'
              AND (b_sub.booking_code LIKE 'DP%' OR b_sub.payment_status IN ('paid', 'partially_paid') OR COALESCE(b_sub.deposit_amount, 0) > 0)
          ) b ON ((b.checkin_date::date <= pd.day_date AND b.checkout_date::date >= pd.day_date) 
                  OR (b.created_at::date = pd.day_date))
          GROUP BY pd.day_date
        ) 
        SELECT * FROM day_usage ORDER BY day_date ASC
      `,
        revParams,
      ),

      pool.query(
        `SELECT COALESCE(SUM(b.total_price), 0)::bigint AS prev_revenue 
         FROM public.booking b 
         JOIN public.hotel h ON h.id = b.hotel_id 
         WHERE ${hotelFilter} 
           AND b.status != 'cancelled' 
           AND (b.booking_code LIKE 'DP%' OR b.payment_status IN ('paid', 'partially_paid') OR COALESCE(b.deposit_amount, 0) > 0)
           AND ((b.created_at::date BETWEEN $${prevParams.length - 1}::date AND $${prevParams.length}::date) 
                OR (b.checkin_date BETWEEN $${prevParams.length - 1}::date AND $${prevParams.length}::date))`,
        prevParams,
      ),

      pool.query(
        `
        WITH period_days AS (
          SELECT generate_series($${occParams.length - 1}::date, $${occParams.length}::date, '1 day'::interval)::date AS day_date
        ),
        day_usage AS (
          SELECT pd.day_date, 
                 COUNT(DISTINCT COALESCE(b.room_number, b.id::text))::int AS occupied_on_day
          FROM period_days pd
          LEFT JOIN (
            SELECT b_sub.* 
            FROM public.booking b_sub
            JOIN public.hotel h ON h.id = b_sub.hotel_id
            WHERE ${hotelFilter} AND b_sub.status IN ('checked_in', 'checked_out', 'confirmed')
          ) b ON ((b.checkin_date::date <= pd.day_date AND b.checkout_date::date > pd.day_date) 
                  OR (b.checkin_date::date = pd.day_date))
          GROUP BY pd.day_date
        ) 
        SELECT day_date, occupied_on_day, EXTRACT(DOW FROM day_date)::int AS day_of_week 
        FROM day_usage ORDER BY day_date ASC
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

      // 🌟 ĐÃ SỬA CÂU QUERY: NỐI ROOM_UNIT VỚI BOOKING ĐỂ TÍNH ĐÚNG CÔNG SUẤT THEO TẦNG / KHU VỰC
      pool.query(
        `
        SELECT 
          COALESCE(ru.area, 'Tầng 1') AS area_name,
          COUNT(DISTINCT ru.id)::int AS total_units,
          COUNT(DISTINCT b.id)::int AS total_bookings
        FROM public.room_unit ru
        JOIN public.hotel h ON h.id = ru.hotel_id
        LEFT JOIN public.booking b ON b.hotel_id = h.id 
          AND (b.room_number = ru.room_number OR b.room_number ILIKE '%' || ru.room_number || '%')
          AND b.status IN ('checked_in', 'checked_out', 'confirmed')
          AND (b.checkin_date <= $${occParams.length}::date AND b.checkout_date >= $${occParams.length - 1}::date)
        WHERE ${hotelFilter}
        GROUP BY COALESCE(ru.area, 'Tầng 1')
        ORDER BY area_name ASC
      `,
        occParams,
      ),

      pool.query(
        `SELECT b.id, b.booking_code, COALESCE(b.room_number, 'Chưa xếp') AS room, b.customer_name AS guest, (b.total_price - COALESCE(b.deposit_amount, b.subtotal, 0)) AS amount FROM public.booking b JOIN public.hotel h ON h.id = b.hotel_id WHERE ${hotelFilter} AND b.status = 'checked_in' AND b.payment_status != 'paid'`,
        baseParams,
      ),
      pool.query(
        `SELECT b.id, b.booking_code, COALESCE(b.room_number, 'P.101') AS room, b.customer_name AS guest, 100000 AS amount FROM public.booking b JOIN public.hotel h ON h.id = b.hotel_id WHERE ${hotelFilter} AND b.status = 'checked_in' AND b.checkout_date < CURRENT_DATE`,
        baseParams,
      ),
    ]);

    const totalRooms = Number(roomsRes.rows[0]?.total_rooms || 0);
    const occupiedCount =
      totalRooms > 0
        ? Math.min(totalRooms, Number(occupiedRes.rows[0]?.occupied || 0))
        : 0;
    const currentRate =
      totalRooms > 0
        ? Math.min(100, Math.round((occupiedCount / totalRooms) * 100))
        : 0;

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

    const prevRevenue = Number(prevRevRes.rows[0]?.prev_revenue || 0);
    const growthRate =
      prevRevenue > 0
        ? Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 100)
        : totalRevenue > 0
          ? 100
          : 0;

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

    // 🌟 TÍNH CÔNG SUẤT THỰC TẾ CHO TỪNG TẦNG / KHU VỰC
    const byArea = areaRes.rows.map((a) => {
      const cap = Number(a.total_units || 1) * occDates.dayCount;
      const bCount = Number(a.total_bookings || 0);
      return {
        name: a.area_name,
        rate:
          cap > 0
            ? Math.min(100, Math.round((bCount / cap) * 100))
            : currentRate,
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
        byArea: byArea.length
          ? byArea
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
    const hotelId = String(req.query.hotel_id || "").trim();
    if (!userId)
      return res.status(401).json({ message: "Vui lòng đăng nhập." });

    let hotelFilter =
      "(h.owner_id = $1 OR h.id IN (SELECT hotel_id FROM public.hotel_staff WHERE user_id = $1))";
    const params = [userId];

    if (hotelId && hotelId !== "all" && hotelId !== "undefined") {
      params.push(hotelId);
      hotelFilter += ` AND b.hotel_id::text = $${params.length}`;
    }

    const result = await pool.query(
      `
      SELECT b.*, 
             COALESCE(b.checkin_time, '14:00:00'::time) AS checkin_time,
             COALESCE(b.checkout_time, '12:00:00'::time) AS checkout_time,
             COALESCE(b.rental_type, 'DAY') AS rental_type,
             COALESCE(b.payment_type, 'FULL') AS payment_type,
             COALESCE(b.deposit_amount, 0) AS deposit_amount,
             h.name AS hotel_name, 
             COALESCE(u.full_name, b.customer_name) AS customer_name, 
             COALESCE(u.phone, b.guest_phone) AS guest_phone,
             COALESCE((SELECT br.room_name FROM public.booking_room br WHERE br.booking_id = b.id LIMIT 1), 'DELUXE') AS room_name
      FROM public.booking b 
      JOIN public.hotel h ON h.id = b.hotel_id 
      LEFT JOIN public.users u ON u.id = b.user_id
      WHERE ${hotelFilter}
      ORDER BY b.created_at DESC
    `,
      params,
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

// ─── 3. SƠ ĐỒ PHÒNG LỄ TÂN (HỖ TRỢ ĐỦ 3 HÌNH THỨC: GIỜ, ĐÊM, NGÀY) ───
async function getRoomMapData(req, res) {
  try {
    const { hotel_id: hotelId } = req.query;
    if (!hotelId)
      return res
        .status(400)
        .json({ success: false, message: "hotel_id là bắt buộc." });

    await pool
      .query(
        `
      UPDATE public.booking 
      SET status = 'cancelled'::public.booking_status_enum, updated_at = NOW()
      WHERE status = 'pending' 
        AND (payment_status IS NULL OR (payment_status != 'paid' AND payment_status != 'partially_paid'))
        AND COALESCE(deposit_amount, 0) = 0
        AND created_at < NOW() - INTERVAL '15 minutes'
    `,
      )
      .catch(() => {});

    await pool
      .query(`DELETE FROM public.temporary_locks WHERE expires_at < NOW()`)
      .catch(() => {});

    const [roomsRes, bookingsRes] = await Promise.all([
      pool.query(
        `
        SELECT r.id AS room_type_id, r.name AS room_type_name, r.code AS room_code, r.base_price AS daily_price, r.hourly_tiers,
               COALESCE(NULLIF(r.hourly_price, 0), ROUND(r.base_price * 0.25)) AS hourly_price,
               COALESCE(NULLIF(r.overnight_price, 0), r.base_price) AS overnight_price,
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
               COALESCE(b.rental_type, 'DAY') AS rental_type,
               COALESCE(b.payment_type, 'FULL') AS payment_type,
               COALESCE(b.deposit_amount, 0) AS deposit_amount,
               p.paid_amount AS payment_paid_amount
        FROM public.booking b
        LEFT JOIN public.payment p ON p.booking_id = b.id
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
        hotel_id: hotelId,
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

        const safeGetDate = (val) => {
          if (!val) return new Date().toISOString().slice(0, 10);
          if (val instanceof Date) {
            const y = val.getFullYear();
            const m = String(val.getMonth() + 1).padStart(2, "0");
            const d = String(val.getDate()).padStart(2, "0");
            return `${y}-${m}-${d}`;
          }
          return String(val).slice(0, 10);
        };

        const inDate = safeGetDate(match.checkin_date);
        const outDate = safeGetDate(match.checkout_date);
        const inTime = String(match.checkin_time || "14:00").slice(0, 5);
        const outTime = String(match.checkout_time || "12:00").slice(0, 5);

        const safeStart = new Date(`${inDate}T${inTime}:00`);
        const safeEnd = new Date(`${outDate}T${outTime}:00`);
        const diffMs = Math.max(
          0,
          !isNaN(safeEnd) && !isNaN(safeStart)
            ? safeEnd.getTime() - safeStart.getTime()
            : 3600000,
        );

        let durationText = "1 ngày";
        if (match.rental_type === "HOUR") {
          const hours = Math.max(1, Math.round(diffMs / 3600000)) || 1;
          durationText = `${hours} giờ`;
        } else if (match.rental_type === "OVERNIGHT") {
          durationText = "1 đêm";
        } else {
          const days = Math.max(1, Math.round(diffMs / (24 * 3600000))) || 1;
          durationText = `${days} ngày`;
        }

        const totalPrice = Number(match.total_price || room.daily_price || 0);
        const isWalkIn =
          match.booking_code && String(match.booking_code).startsWith("DP");

        let isDep = false;
        let paidAmount = 0;

        if (isWalkIn) {
          if (match.payment_status === "paid") {
            paidAmount = totalPrice;
          } else {
            paidAmount = Number(
              match.deposit_amount ||
                match.payment_paid_amount ||
                match.subtotal ||
                0,
            );
          }
        } else {
          isDep =
            match.payment_type === "DEPOSIT_30" ||
            (Number(match.deposit_amount) > 0 &&
              Number(match.deposit_amount) < totalPrice) ||
            (Number(match.payment_paid_amount) > 0 &&
              Number(match.payment_paid_amount) < totalPrice);

          if (isDep) {
            paidAmount = Number(
              match.deposit_amount ||
                match.payment_paid_amount ||
                Math.round(totalPrice * 0.3),
            );
          } else if (match.payment_status === "paid") {
            paidAmount = totalPrice;
          } else {
            paidAmount = Number(match.payment_paid_amount || 0);
          }
        }

        room.booking = {
          id: match.id,
          code: match.booking_code,
          booking_code: match.booking_code,
          customer_name: match.customer_name || "Khách đặt trước",
          guest_phone: match.guest_phone || "",
          stay_duration: durationText,
          checkin_date: inDate,
          checkout_date: outDate,
          checkin_time: inTime,
          checkout_time: outTime,
          // 🌟 BỔ SUNG TRƯỜNG confirmed_at VÀ created_at ĐỂ THẺ PHÒNG KHỚP GIỜ TỪNG GIÂY
          confirmed_at: match.confirmed_at,
          created_at: match.created_at,
          rental_type: match.rental_type,
          total_price: totalPrice,
          customer_paid: paidAmount,
          paid_amount: paidAmount,
          deposit_amount: isDep ? paidAmount : match.deposit_amount || 0,
          payment_type: isDep ? "DEPOSIT_30" : match.payment_type || "FULL",
          payment_status: match.payment_status || "unpaid",
          is_deposit: isDep,
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

// ─── 4. ĐƠN ONLINE CHỜ XẾP PHÒNG ───
async function getPendingOnlineBookings(req, res) {
  try {
    const rawHotelId = String(req.query.hotel_id || "").trim();

    let hotelFilter = "";
    const params = [];

    if (rawHotelId && rawHotelId !== "all" && rawHotelId !== "undefined") {
      params.push(rawHotelId);
      hotelFilter = `AND b.hotel_id::text = $${params.length}`;
    }

    const result = await pool.query(
      `
      SELECT b.id, b.booking_code, b.customer_name, b.guest_phone, b.guest_email, 
             b.checkin_date, b.checkout_date,
             COALESCE(b.checkin_time, '14:00:00'::time) AS checkin_time,
             COALESCE(b.checkout_time, '12:00:00'::time) AS checkout_time,
             COALESCE(b.rental_type, 'DAY') AS rental_type,
             b.adult_total, b.children_total, b.total_price, b.created_at, b.payment_status, b.status, b.room_number, b.hotel_id,
             COALESCE(p.paid_amount, 0) AS paid_amount, 
             COALESCE(b.payment_type, 'FULL') AS payment_type, 
             COALESCE(b.deposit_amount, 0) AS deposit_amount,
             COALESCE(br.room_name, r.name, 'Phòng tiêu chuẩn') AS room_type_name,
             COALESCE(br.room_id, r.id) AS room_type_id
      FROM public.booking b
      LEFT JOIN public.booking_room br ON br.booking_id = b.id
      LEFT JOIN public.room r ON r.id = br.room_id
      LEFT JOIN public.payment p ON p.booking_id = b.id
      WHERE b.status NOT IN ('checked_in', 'checked_out', 'cancelled') 
        AND TRIM(COALESCE(b.room_number, '')) = ''
        AND (b.payment_status IN ('paid', 'partially_paid') OR COALESCE(b.deposit_amount, 0) > 0 OR b.created_at >= NOW() - INTERVAL '15 minutes')
        ${hotelFilter}
      ORDER BY b.created_at DESC LIMIT 50
    `,
      params,
    );

    const enrichedList = (result.rows || []).map((b) => {
      const inD = String(b.checkin_date).slice(0, 10);
      const outD = String(b.checkout_date).slice(0, 10);
      const inT = String(b.checkin_time || "14:00").slice(0, 5);
      const outT = String(b.checkout_time || "12:00").slice(0, 5);

      const diffMs = Math.max(
        0,
        new Date(`${outD}T${outT}:00`).getTime() -
          new Date(`${inD}T${inT}:00`).getTime(),
      );

      let durationLabel = "1 ngày";
      if (b.rental_type === "HOUR") {
        const h = Math.max(1, Math.round(diffMs / (1000 * 60 * 60)));
        durationLabel = `${h} giờ`;
      } else if (b.rental_type === "OVERNIGHT") {
        durationLabel = "1 đêm";
      } else {
        const d = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
        durationLabel = `${d} ngày`;
      }

      return {
        ...b,
        stay_duration: durationLabel,
        duration_label: durationLabel,
      };
    });

    return res.json({ success: true, data: enrichedList });
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

// ─── 5. ĐẶT PHÒNG TẠI QUẦY (ĐÃ DỌN SẠCH BUỔI) ───
async function createWalkInBooking(req, res) {
  const client = await pool.connect();
  try {
    const ownerId = req.user?.id || req.user?.userId || req.auth?.sub;
    const {
      hotel_id,
      room_id,
      room_number,
      customer_name,
      guest_phone,
      total_price,
      customer_paid = 0,
      checkin_date,
      checkout_date,
      checkin_time,
      checkout_time,
      rental_type = "DAY",
      is_check_in_now = true,
      adult_total = 2,
      children_total = 0,
      adults,
      children,
    } = req.body;

    await client.query("BEGIN");

    let targetHotelId = hotel_id;
    if (!targetHotelId && ownerId) {
      const hRes = await client.query(
        `SELECT id FROM public.hotel WHERE owner_id::text = $1 OR id IN (SELECT hotel_id FROM public.hotel_staff WHERE user_id::text = $1) LIMIT 1`,
        [ownerId],
      );
      targetHotelId = hRes.rows[0]?.id;
    }

    if (!targetHotelId && room_id) {
      const rRes = await client.query(
        `SELECT hotel_id FROM public.room WHERE id::text = $1 
         UNION 
         SELECT hotel_id FROM public.room_unit WHERE id::text = $1 OR room_id::text = $1 LIMIT 1`,
        [room_id],
      );
      targetHotelId = rRes.rows[0]?.hotel_id;
    }

    if (!targetHotelId) {
      const firstHotelRes = await client.query(
        `SELECT id FROM public.hotel WHERE status = 'active' ORDER BY created_at DESC LIMIT 1`,
      );
      targetHotelId = firstHotelRes.rows[0]?.id;
    }

    let targetRoomNumber = room_number;
    let targetRoomId = room_id;
    let targetRoomName = "DELUXE";

    if (room_id) {
      const unitRes = await client.query(
        `SELECT ru.room_number, r.id AS room_id, r.name AS room_name 
         FROM public.room r 
         LEFT JOIN public.room_unit ru ON ru.room_id = r.id 
         WHERE ru.id::text = $1 OR r.id::text = $1 OR ru.room_number = $2 LIMIT 1`,
        [room_id, String(room_number || "")],
      );
      if (unitRes.rows.length > 0) {
        targetRoomNumber = targetRoomNumber || unitRes.rows[0].room_number;
        targetRoomId = unitRes.rows[0].room_id || room_id;
        targetRoomName = unitRes.rows[0].room_name || "DELUXE";
      }
    }
    targetRoomNumber = targetRoomNumber || "111";

    let inDate = checkin_date
      ? String(checkin_date).slice(0, 10)
      : toDateStr(new Date());
    let inTime = "14:00:00";
    if (checkin_date && String(checkin_date).includes("T")) {
      inTime = String(checkin_date).split("T")[1].slice(0, 5) + ":00";
    } else if (checkin_time) {
      inTime = checkin_time.length === 5 ? `${checkin_time}:00` : checkin_time;
    }

    let outDate = checkout_date
      ? String(checkout_date).slice(0, 10)
      : toDateStr(new Date(Date.now() + 864e5));
    let outTime = "12:00:00";
    if (checkout_date && String(checkout_date).includes("T")) {
      outTime = String(checkout_date).split("T")[1].slice(0, 5) + ":00";
    } else if (checkout_time) {
      outTime =
        checkout_time.length === 5 ? `${checkout_time}:00` : checkout_time;
    }

    let finalRentalType = "DAY";
    if (rental_type === "Giờ" || rental_type === "HOUR") {
      finalRentalType = "HOUR";
    } else if (rental_type === "Đêm" || rental_type === "OVERNIGHT") {
      finalRentalType = "OVERNIGHT";
    }

    const finalAdults = Number(adult_total ?? adults ?? 2);
    const finalChildren = Number(children_total ?? children ?? 0);
    const finalTotalPrice = Number(total_price || 0);
    const finalCustomerPaid = Number(customer_paid || 0);

    const newBookingId = crypto.randomUUID();
    const newBookingCode = `DP${Math.floor(100000 + Math.random() * 900000)}`;
    const bookingStatus = is_check_in_now ? "checked_in" : "confirmed";

    const insertBooking = await client.query(
      `
      INSERT INTO public.booking (
        id, booking_code, hotel_id, status, payment_status, total_price, 
        checkin_date, checkout_date, checkin_time, checkout_time, rental_type,
        adult_total, children_total, customer_name, guest_email, guest_phone, room_number, subtotal,
        deposit_amount, payment_type,
        receptionist_assigned, confirmed_at, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4::public.booking_status_enum, 
        CASE WHEN $5::numeric >= $6::numeric AND $6::numeric > 0 
             THEN 'paid'::public.booking_payment_status_enum 
             WHEN $5::numeric > 0 
             THEN 'partially_paid'::public.booking_payment_status_enum
             ELSE 'unpaid'::public.booking_payment_status_enum 
        END,
        $6::numeric,
        $7::date, $8::date, $9::time, $10::time, $11,
        $12::int, $13::int, $14, 'walkin@hotel.internal', $15, $16, $17::numeric,
        $18::numeric, 'FULL',
        true, NOW(), NOW(), NOW()
      ) RETURNING *;
    `,
      [
        newBookingId,
        newBookingCode,
        targetHotelId,
        bookingStatus,
        finalCustomerPaid,
        finalTotalPrice,
        inDate,
        outDate,
        inTime,
        outTime,
        finalRentalType,
        finalAdults,
        finalChildren,
        customer_name || "Khách lẻ",
        guest_phone || "",
        targetRoomNumber,
        finalCustomerPaid,
        finalCustomerPaid,
      ],
    );

    const savedBooking = insertBooking.rows[0];

    if (targetRoomId) {
      await client
        .query(
          `
        INSERT INTO public.booking_room (id, booking_id, room_id, room_name, price, quantity, book_date)
        VALUES (gen_random_uuid(), $1, $2, $3, $4, 1, $5::date)
        ON CONFLICT DO NOTHING
      `,
          [
            savedBooking.id,
            targetRoomId,
            targetRoomName,
            finalTotalPrice,
            inDate,
          ],
        )
        .catch(() => {});
    }

    await client.query("COMMIT");
    return res.status(201).json({ success: true, booking: savedBooking });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Lỗi createWalkInBooking:", err);
    return res.status(500).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
}

// ─── 6. CHECK-IN ───
async function handleOwnerCheckIn(req, res) {
  const client = await pool.connect();
  try {
    const bookingId = req.params.id;
    const {
      room_number,
      checkin_date,
      checkout_date,
      adult_total,
      children_total,
      collected_at_counter = 0,
      guests = [],
    } = req.body || {};

    await client.query("BEGIN");

    let inDate = null,
      inTime = null;
    if (checkin_date) {
      inDate = String(checkin_date).slice(0, 10);
      if (String(checkin_date).includes("T")) {
        inTime = String(checkin_date).split("T")[1].slice(0, 5) + ":00";
      } else {
        inTime = "14:00:00";
      }
    }

    let outDate = null,
      outTime = null;
    if (checkout_date) {
      outDate = String(checkout_date).slice(0, 10);
      if (String(checkout_date).includes("T")) {
        outTime = String(checkout_date).split("T")[1].slice(0, 5) + ":00";
      } else {
        outTime = "12:00:00";
      }
    }

    const collectedNow = Number(collected_at_counter || 0);

    const curRes = await client.query(
      `SELECT * FROM public.booking WHERE id::text = $1 OR booking_code = $1 LIMIT 1 FOR UPDATE`,
      [bookingId],
    );
    const booking = curRes.rows[0];
    if (!booking) {
      await client.query("ROLLBACK");
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy đơn đặt phòng." });
    }

    const totalP = Number(booking.total_price || 0);
    const prevDeposit = Number(booking.deposit_amount || 0);
    const newDeposit = prevDeposit + collectedNow;
    const isNowFullyPaid = newDeposit >= totalP;

    const updateRes = await client.query(
      `
      UPDATE public.booking 
      SET status = 'checked_in'::public.booking_status_enum,
          room_number = COALESCE($1, room_number),
          checkin_date = COALESCE($2::date, checkin_date),
          checkout_date = COALESCE($3::date, checkout_date),
          checkin_time = COALESCE($4::time, checkin_time),
          checkout_time = COALESCE($5::time, checkout_time),
          adult_total = COALESCE($6::int, adult_total),
          children_total = COALESCE($7::int, children_total),
          deposit_amount = $8::numeric,
          payment_status = CASE WHEN $9::boolean THEN 'paid'::public.booking_payment_status_enum ELSE payment_status END,
          payment_type = CASE WHEN $9::boolean THEN 'FULL' ELSE payment_type END,
          guest_declarations = CASE WHEN $10::jsonb IS NOT NULL AND jsonb_array_length($10::jsonb) > 0 THEN $10::jsonb ELSE guest_declarations END,
          confirmed_at = NOW(),
          updated_at = NOW()
      WHERE id = $11
      RETURNING *
    `,
      [
        room_number || null,
        inDate,
        outDate,
        inTime,
        outTime,
        adult_total || null,
        children_total !== undefined ? children_total : null,
        newDeposit,
        isNowFullyPaid,
        JSON.stringify(guests || []),
        booking.id,
      ],
    );

    const updatedBooking = updateRes.rows[0];

    if (updatedBooking.room_number && updatedBooking.hotel_id) {
      await client
        .query(
          `UPDATE public.room_unit SET status = 'occupied', updated_at = NOW() WHERE hotel_id = $1 AND room_number = $2`,
          [updatedBooking.hotel_id, updatedBooking.room_number],
        )
        .catch(() => {});
    }

    await client.query("COMMIT");
    return res.json({
      success: true,
      message: `✓ Đã nhận phòng ${updatedBooking.room_number} thành công!`,
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

// ─── 7. TRẢ PHÒNG ───
async function handleOwnerCheckOut(req, res) {
  const client = await pool.connect();
  try {
    const bookingId = req.params.id;
    const {
      late_fee = 0,
      minibar_fee = 0,
      other_fee = 0,
      total_price,
      paid_amount,
    } = req.body || {};

    await client.query("BEGIN");

    const currentBookingRes = await client.query(
      `SELECT * FROM public.booking WHERE id::text = $1 OR booking_code = $1 LIMIT 1 FOR UPDATE`,
      [bookingId],
    );
    const booking = currentBookingRes.rows[0];
    if (!booking) {
      await client.query("ROLLBACK");
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy đơn phòng." });
    }

    const overtimeFee = Number(late_fee || 0);
    const extraTotal =
      overtimeFee + Number(minibar_fee || 0) + Number(other_fee || 0);
    const finalTotalPrice = total_price
      ? Number(total_price)
      : Number(booking.total_price || 0) + extraTotal;

    const updateRes = await client.query(
      `
      UPDATE public.booking 
      SET status = 'checked_out'::public.booking_status_enum, 
          payment_status = 'paid'::public.booking_payment_status_enum,
          total_price = $1::numeric,
          subtotal = $1::numeric,
          updated_at = NOW()
      WHERE id = $2 RETURNING *
    `,
      [finalTotalPrice, booking.id],
    );

    if (booking.room_number && booking.hotel_id) {
      const cleanNum = String(booking.room_number).replace(/[^0-9]/g, "");
      await client.query(
        `UPDATE public.room_unit 
         SET status = 'dirty', updated_at = NOW() 
         WHERE hotel_id = $1 AND (room_number = $2 OR room_number ILIKE $3)`,
        [booking.hotel_id, booking.room_number, `%${cleanNum}%`],
      );
    }

    await client.query("COMMIT");

    pool
      .query(
        `UPDATE public.payment SET paid_amount = $1::numeric, status = 'paid', updated_at = NOW() WHERE booking_id = $2`,
        [finalTotalPrice, booking.id],
      )
      .catch(() => {});

    return res.json({
      success: true,
      message: `✓ Trả phòng ${booking.room_number} thành công!`,
      booking: updateRes.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Lỗi trả phòng:", error);
    return res.status(500).json({ success: false, message: error.message });
  } finally {
    client.release();
  }
}

// ─── 8. ĐỔI PHÒNG ───
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

// ─── 9. BUỒNG PHÒNG DỌN DẸP ───
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

// ─── 10. QUẢN LÝ NHÂN VIÊN LỄ TÂN ───
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
  handleOwnerCheckIn,
  handleOwnerCheckOut,
  markRoomCleaned,
  markRoomDirty,
  handleChangeRoom,
  handleAddBookingService,
  updateOwnerBookingStatus,
  updateHotelInfo,
  getOwnerStaff,
  createOwnerStaff,
  deleteOwnerStaff,
  toggleStaffStatus,
};
