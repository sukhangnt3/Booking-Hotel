// backend/controllers/owner.controller.js
const crypto = require("crypto");
const pool = require("../config/database");

// Tự động đảm bảo cột room_legs tồn tại trong bảng booking
(async function ensureRoomLegsColumn() {
  try {
    await pool.query(
      `ALTER TABLE public.booking ADD COLUMN IF NOT EXISTS room_legs jsonb DEFAULT '[]'::jsonb;`,
    );
  } catch (err) {
    console.warn("⚠️ Cảnh báo migration room_legs:", err.message);
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

    // 🌟 XÁC ĐỊNH MỐC THỜI GIAN VÀ SỐ NGÀY THỰC TẾ
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
      // this_month
      const firstDay = new Date(currentYear, currentMonth, 1);
      startDate = firstDay.toLocaleDateString("en-CA");
      endDate = now.toLocaleDateString("en-CA");
      dayCount = Math.max(1, todayDateNum);
    }

    // 1. TỔNG SỐ PHÒNG ĐANG HOẠT ĐỘNG
    const roomsRes = await pool.query(
      `SELECT COALESCE(SUM(r.amount), 0)::int AS total_rooms 
       FROM public.room r 
       JOIN public.hotel h ON h.id = r.hotel_id 
       WHERE ${hotelFilter} AND r.is_active = true`,
      baseParams,
    );
    const totalRooms = Number(roomsRes.rows[0]?.total_rooms || 0);

    // 2. CÔNG SUẤT TỨC THỜI HIỆN TẠI (CHỈ TÍNH PHÒNG CHECKED_IN ĐANG CÓ KHÁCH Ở)
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

    // 2.1. SỐ KHÁCH ĐANG Ở HIỆN TẠI
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

    // 2.2. BUỒNG PHÒNG
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

    // 3. TÍNH GIÁ TRỊ ĐẶT PHÒNG THEO KÊNH BÁN (ĐÃ CHUẨN HÓA GROUP BY)
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

    const cancelQuery = await pool.query(
      `SELECT COALESCE(SUM(b.total_price), 0)::bigint AS total_cancel_money,
              COUNT(b.id)::int AS cancel_count
       FROM public.booking b
       JOIN public.hotel h ON h.id = b.hotel_id
       WHERE ${hotelFilter}
         AND b.status = 'cancelled'
         AND (
           (b.created_at::date >= $${pStart}::date AND b.created_at::date <= $${pEnd}::date)
           OR (b.checkin_date >= $${pStart}::date AND b.checkin_date <= $${pEnd}::date)
         )`,
      timeParams,
    );
    const cancelledAmount = Number(
      cancelQuery.rows[0]?.total_cancel_money || 0,
    );
    const cancelledCount = Number(cancelQuery.rows[0]?.cancel_count || 0);

    const totalRevenue = directAmount + onlineAmount;
    const totalOrderCount = directCount + onlineCount;

    const directPercent =
      totalRevenue > 0 ? Math.round((directAmount / totalRevenue) * 100) : 0;
    const onlinePercent =
      totalRevenue > 0 ? Math.round((onlineAmount / totalRevenue) * 100) : 0;

    const channelStats = {
      directAmount,
      directCount,
      directPercent,
      onlineAmount,
      onlineCount,
      onlinePercent,
      cancelledAmount,
      cancelledCount,
      chartData: [
        { name: "Khách đến trực tiếp", booked: directAmount, cancelled: 0 },
        {
          name: "Đặt phòng online",
          booked: onlineAmount,
          cancelled: cancelledAmount,
        },
      ],
    };

    // 4. BẢNG CTE LỌC PHÒNG CÓ KHÁCH TRONG TỪNG NGÀY
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

    // (A) 🌟 ĐÃ SỬA TRIỆT ĐỂ LỖI AGGREGATE FUNCTION IN GROUP BY TẠI ĐÂY:
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

    // (C) Tính công suất theo Khu vực
    const areaOccupancyRes = await pool
      .query(
        ` ${dailyOccupiedCTE}
        SELECT 
          COALESCE(ru.area, 'Tầng 1') AS area_name,
          COUNT(DISTINCT ru.id)::int AS total_units,
          COUNT(dor.day_date)::int AS used_area_days
        FROM public.room_unit ru
        JOIN public.hotel h ON h.id = ru.hotel_id
        LEFT JOIN daily_occupied_rooms dor ON dor.room_num = ru.room_number
        WHERE ${hotelFilter}
        GROUP BY COALESCE(ru.area, 'Tầng 1')
        ORDER BY area_name ASC`,
        timeParams,
      )
      .catch(() => ({ rows: [] }));

    const occupancyByArea = areaOccupancyRes.rows.map((a) => {
      const totalUnits = Number(a.total_units || 1);
      const areaCapacity = totalUnits * dayCount;
      const used = Number(a.used_area_days || 0);
      const rate =
        areaCapacity > 0
          ? Number(Math.min(100, (used / areaCapacity) * 100).toFixed(2))
          : 0;
      return {
        name: a.area_name,
        rate: rate,
      };
    });

    let occupancyTimelineDay = [];
    if (range === "today") {
      const todayFormatted = `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;
      occupancyTimelineDay = [
        { label: todayFormatted, rate: avgOccupancyRate },
      ];
    } else if (range === "yesterday") {
      const yest = new Date(now);
      yest.setDate(now.getDate() - 1);
      const yestFormatted = `${String(yest.getDate()).padStart(2, "0")}/${String(yest.getMonth() + 1).padStart(2, "0")}/${yest.getFullYear()}`;
      occupancyTimelineDay = [{ label: yestFormatted, rate: avgOccupancyRate }];
    } else {
      const timelineSql = `
        ${dailyOccupiedCTE}
        SELECT 
          TO_CHAR(dor.day_date, 'DD/MM/YYYY') AS label,
          COUNT(DISTINCT dor.room_num)::int AS occupied_count
        FROM daily_occupied_rooms dor
        GROUP BY dor.day_date
        ORDER BY dor.day_date ASC
      `;
      const timelineRes = await pool.query(timelineSql, timeParams);

      occupancyTimelineDay = timelineRes.rows
        .map((r) => ({
          label: r.label,
          rate:
            totalRooms > 0
              ? Number(
                  Math.min(
                    100,
                    (Number(r.occupied_count || 0) / totalRooms) * 100,
                  ).toFixed(2),
                )
              : 0,
        }))
        .filter((item) => item.rate > 0);
    }

    let occupancyWeekday = [];
    const weekdayMapNames = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

    if (range === "today") {
      const todayDayOfWeek = weekdayMapNames[now.getDay()];
      occupancyWeekday = [{ label: todayDayOfWeek, rate: avgOccupancyRate }];
    } else if (range === "yesterday") {
      const yest = new Date(now);
      yest.setDate(now.getDate() - 1);
      const yestDayOfWeek = weekdayMapNames[yest.getDay()];
      occupancyWeekday = [{ label: yestDayOfWeek, rate: avgOccupancyRate }];
    } else {
      const weekdaySql = `
        ${dailyOccupiedCTE}
        SELECT 
          EXTRACT(ISODOW FROM dor.day_date)::int AS dow,
          COUNT(DISTINCT dor.room_num)::int AS occupied_count
        FROM daily_occupied_rooms dor
        GROUP BY EXTRACT(ISODOW FROM dor.day_date)
        ORDER BY dow ASC
      `;
      const weekdayRes = await pool
        .query(weekdaySql, timeParams)
        .catch(() => ({ rows: [] }));
      const dowMap = new Map();
      weekdayRes.rows.forEach((r) =>
        dowMap.set(r.dow, Number(r.occupied_count || 0)),
      );

      const dowLabels = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
      occupancyWeekday = dowLabels
        .map((name, idx) => {
          const count = dowMap.get(idx + 1) || 0;
          return {
            label: name,
            rate:
              totalRooms > 0
                ? Number(Math.min(100, (count / totalRooms) * 100).toFixed(2))
                : 0,
          };
        })
        .filter((item) => item.rate > 0);
    }

    // 5. KIỂM TOÁN TÁCH BIỆT
    const auditRes = await pool.query(
      `SELECT 
         b.id,
         COALESCE(b.booking_code, 'BK' || SUBSTRING(b.id::text, 1, 6)) AS booking_code,
         COALESCE(b.room_number, 'Chưa gán') AS room,
         COALESCE(b.customer_name, 'Khách lẻ') AS guest,
         COALESCE(b.guest_phone, '') AS phone,
         b.status::text AS booking_status,
         b.payment_status::text AS payment_status,
         b.checkin_date::text AS checkin_date,
         b.checkout_date::text AS checkout_date,
         COALESCE(b.subtotal, 0)::bigint AS customer_paid,
         COALESCE(
           NULLIF(b.total_price, 0),
           (SELECT br.price FROM public.booking_room br WHERE br.booking_id = b.id LIMIT 1),
           (SELECT r.base_price FROM public.room r WHERE r.hotel_id = b.hotel_id AND r.name ILIKE b.room_number LIMIT 1),
           350000
         )::bigint AS effective_room_price
       FROM public.booking b
       JOIN public.hotel h ON h.id = b.hotel_id
       WHERE ${hotelFilter} AND b.status = 'checked_in'
       ORDER BY b.created_at DESC`,
      baseParams,
    );

    const paymentAlerts = [];
    const leakAlerts = [];
    const todayStr = now.toLocaleDateString("en-CA");

    auditRes.rows.forEach((row) => {
      const isOverstay = row.checkout_date && row.checkout_date < todayStr;
      const roomPrice = Number(row.effective_room_price || 350000);
      const paidAmount = Number(row.customer_paid || 0);

      const isUnpaid = row.payment_status !== "paid" || paidAmount < roomPrice;
      const debtAmount = Math.max(roomPrice - paidAmount, roomPrice);

      if (isOverstay) {
        const checkOutTime = new Date(row.checkout_date).getTime();
        const currentTime = new Date(todayStr).getTime();
        const daysOver = Math.max(
          1,
          Math.floor((currentTime - checkOutTime) / (1000 * 60 * 60 * 24)),
        );
        const lateAmount = roomPrice * daysOver;

        leakAlerts.push({
          id: row.id,
          booking_code: row.booking_code,
          room: row.room.startsWith("P.") ? row.room : `Phòng ${row.room}`,
          guest: row.guest,
          phone: row.phone,
          amount: lateAmount,
          desc: `Quá hạn trả phòng ${daysOver} ngày chưa thanh toán phụ phí`,
          type: "overstay_leak",
        });
      }

      if (isUnpaid && !isOverstay) {
        paymentAlerts.push({
          id: row.id,
          booking_code: row.booking_code,
          room: row.room.startsWith("P.") ? row.room : `Phòng ${row.room}`,
          guest: row.guest,
          phone: row.phone,
          amount: debtAmount,
          desc:
            paidAmount === 0
              ? "Chưa thanh toán tiền phòng/tiền cọc"
              : `Mới cọc ${paidAmount.toLocaleString("vi-VN")} đ, còn thiếu`,
          type: "unpaid_booking",
        });
      }
    });

    const potentialLeakTotal = leakAlerts.reduce((sum, r) => sum + r.amount, 0);
    const totalUnpaidAmount = paymentAlerts.reduce(
      (sum, r) => sum + r.amount,
      0,
    );

    const hasAnyData = totalRevenue > 0 || totalHotelUsedRoomDays > 0;

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
      stayingTotalGuests: totalGuests,
      stayingAdults: stayingAdults,
      stayingChildren: stayingChildren,
      housekeeping: {
        waitingClean: waitingClean,
        occupiedAndWaitingClean: occupiedAndWaitingClean,
      },
      automationSummary: {
        autoReconciledToday: totalOrderCount,
        autoReconciledAmount: totalRevenue,
        paymentAlerts: paymentAlerts,
        leakAlerts: leakAlerts,
        totalUnpaidAmount: totalUnpaidAmount,
        potentialLeakTotal: potentialLeakTotal,
      },
      channelStats,
      occupancyAnalytics: {
        hasData: hasAnyData,
        avgRate: hasAnyData ? avgOccupancyRate : null,
        timelineDay: occupancyTimelineDay,
        timelineWeekday: occupancyWeekday,
        byRoomType: occupancyByRoomType,
        byArea:
          occupancyByArea.length > 0
            ? occupancyByArea
            : [{ name: "Tầng 1", rate: avgOccupancyRate }],
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
    console.error("❌ LỖI GET_OWNER_BOOKINGS:", error);
    return res.json({
      success: true,
      data: [],
      bookings: [],
      error: error.message,
    });
  }
}

// ─── 3. SƠ ĐỒ PHÒNG LỄ TÂN THỜI GIAN THỰC ───
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
           AND b.status IN ('confirmed', 'checked_in')
           AND b.room_number IS NOT NULL 
           AND TRIM(b.room_number) <> ''
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
        room_legs: Array.isArray(b.room_legs) ? b.room_legs : [],
      };

      if (b.status === "checked_in") {
        targetRoom.status = "occupied";
      } else {
        targetRoom.status = "incoming";
      }
    };

    // 🌟 CHỈ GẮN PHÒNG KHI ĐÃ CÓ SỐ PHÒNG TRÙNG KHỚP
    for (const room of roomList) {
      const cleanRoomDigits = String(room.room_number).replace(/[^0-9]/g, "");
      const match = activeBookings.find((b) => {
        if (usedBookingIds.has(b.id) || !b.room_number) return false;
        if (b.status === "pending") return false;

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

// ─── 3.1. LẤY DANH SÁCH ĐƠN ONLINE ĐANG CHỜ LỄ TÂN XẾP PHÒNG ───
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
         COALESCE(p.paid_amount, CASE WHEN b.payment_status = 'paid' THEN b.total_price ELSE 0 END) AS paid_amount,
         COALESCE(br.room_name, r.name, 'Phòng tiêu chuẩn') AS room_type_name,
         COALESCE(br.room_id, r.id) AS room_type_id
       FROM public.booking b
       LEFT JOIN public.booking_room br ON br.booking_id = b.id
       LEFT JOIN public.room r ON r.id = br.room_id
       LEFT JOIN public.payment p ON p.booking_id = b.id
       WHERE b.status NOT IN ('checked_in', 'checked_out', 'cancelled')
         AND (
           b.status = 'pending'
           OR b.room_number IS NULL 
           OR TRIM(b.room_number) = ''
           OR b.room_number ILIKE '%chưa%'
         )
         AND ($1 = '' OR $1 = 'all' OR b.hotel_id::text = $1)
       ORDER BY b.created_at DESC
    `;

    const result = await pool.query(querySql, [rawHotelId]);

    console.log(
      `📋 [LỄ TÂN API]: Tìm thấy ${result.rows.length} đơn đang chờ xếp phòng (hotel_id filter: "${rawHotelId}")`,
    );

    return res.json({
      success: true,
      data: result.rows || [],
    });
  } catch (err) {
    console.error("❌ LỖI GET_PENDING_ONLINE_BOOKINGS:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ─── 3.2. LỄ TÂN CHỌN PHÒNG & XÁC NHẬN ĐƠN ───
async function confirmAndAssignRoom(req, res, next) {
  const client = await pool.connect();
  try {
    const { booking_id, room_number, hotel_id } = req.body;

    if (!booking_id || !room_number) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng chọn số phòng cho khách!",
      });
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
      message: `✓ Đã xác nhận đơn ${booking.booking_code} và xếp vào phòng ${room_number}!`,
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

    const parsedTotalPrice = Number(total_price || 0);
    const parsedCustomerPaid = Number(customer_paid || 0);
    const paymentStatus = "paid";

    const finalAdults = Math.max(
      1,
      Number(
        req.body.guest_count?.adult ??
          req.body.guestCount?.adult ??
          req.body.adult_total ??
          req.body.adults ??
          req.body.adult ??
          1,
      ),
    );

    const finalChildren = Math.max(
      0,
      Number(
        req.body.guest_count?.children ??
          req.body.guestCount?.children ??
          req.body.children_total ??
          req.body.children ??
          req.body.child ??
          0,
      ),
    );

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
        $7::date, $8::date, $9, $10,
        $11, 'walkin@hotel.internal', $12, $13, $14, NOW(), NOW(), NOW()
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
        finalAdults,
        finalChildren,
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

    const cleanNum = String(room_number || "").replace(/[^0-9]/g, "");

    await pool.query(
      `UPDATE public.room_unit 
       SET status = 'available', updated_at = NOW() 
       WHERE hotel_id::text = $1 
         AND (room_number = $2 OR room_number = $3 OR room_number ILIKE $4)`,
      [hotel_id, room_number, `P.${cleanNum}`, `%${cleanNum}%`],
    );

    return res.json({
      success: true,
      message: `Phòng ${room_number} đã được dọn sạch!`,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ─── 6.1. LỄ TÂN BÁO "CẦN DỌN PHÒNG" ───
async function markRoomDirty(req, res, next) {
  try {
    const { hotel_id, room_number } = req.body;
    if (!hotel_id || !room_number) {
      return res.status(400).json({
        success: false,
        message: "hotel_id và room_number là bắt buộc.",
      });
    }

    const cleanNum = String(room_number || "").replace(/[^0-9]/g, "");

    await pool.query(
      `UPDATE public.room_unit 
       SET status = 'dirty', updated_at = NOW() 
       WHERE hotel_id::text = $1 
         AND (room_number = $2 OR room_number = $3 OR room_number ILIKE $4)`,
      [hotel_id, room_number, `P.${cleanNum}`, `%${cleanNum}%`],
    );

    return res.json({
      success: true,
      message: `Phòng ${room_number} đã được chuyển sang trạng thái Cần dọn!`,
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

    const inputAdults =
      req.body.guest_count?.adult ??
      req.body.guestCount?.adult ??
      req.body.adult_total ??
      req.body.adults ??
      null;

    const inputChildren =
      req.body.guest_count?.children ??
      req.body.guestCount?.children ??
      req.body.children_total ??
      req.body.children ??
      null;

    await client.query("BEGIN");

    const updateBookingRes = await client.query(
      `UPDATE public.booking b
       SET status = 'checked_in'::public.booking_status_enum, 
           payment_status = 'paid'::public.booking_payment_status_enum,
           total_price = b.total_price + $1, 
           room_number = COALESCE($2, b.room_number),
           adult_total = COALESCE($5, b.adult_total),
           children_total = COALESCE($6, b.children_total),
           updated_at = NOW()
       FROM public.hotel h
       WHERE b.hotel_id = h.id 
         AND (h.owner_id = $3 OR h.id IN (SELECT hotel_id FROM public.hotel_staff WHERE user_id = $3) OR $3 IS NOT NULL)
         AND (b.id::text = $4 OR b.booking_code = $4)
       RETURNING b.*`,
      [
        Number(early_fee || 0),
        room_number.trim() || null,
        userId,
        id,
        inputAdults !== null ? Number(inputAdults) : null,
        inputChildren !== null ? Number(inputChildren) : null,
      ],
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
