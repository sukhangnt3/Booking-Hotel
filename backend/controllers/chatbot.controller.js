// backend/controllers/chatbot.controller.js
const pool = require("../config/database");

const CITY_ALIASES = [
  ["hồ chí minh", "ho chi minh"],
  ["sài gòn", "ho chi minh"],
  ["tphcm", "ho chi minh"],
  ["hcm", "ho chi minh"],
  ["khánh hòa", "khanh hoa"],
  ["cam ranh", "cam ranh"],
  ["đà nẵng", "da nang"],
  ["hà nội", "ha noi"],
  ["nha trang", "nha trang"],
  ["phú quốc", "phu quoc"],
  ["đà lạt", "da lat"],
  ["vũng tàu", "vung tau"],
];

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/\s+/g, " ")
    .trim();
}

function parseDate(value) {
  const match = value.match(/(\d{1,2})[/-](\d{1,2})(?:[/-](\d{4}))?/);
  if (!match) return null;

  const now = new Date();
  const year = Number(match[3] || now.getFullYear());
  const date = new Date(year, Number(match[2]) - 1, Number(match[1]));
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function getThisWeekend() {
  const today = new Date();
  const day = today.getDay();
  const daysUntilSaturday = (6 - day + 7) % 7 || 7;
  const checkIn = new Date(today);
  checkIn.setDate(today.getDate() + daysUntilSaturday);
  const checkOut = new Date(checkIn);
  checkOut.setDate(checkIn.getDate() + 1);
  return {
    checkIn: checkIn.toISOString().slice(0, 10),
    checkOut: checkOut.toISOString().slice(0, 10),
  };
}

function getRelativeDate(daysFromToday) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  return date.toISOString().slice(0, 10);
}

function parseMoney(rawValue, unit = "") {
  const normalizedValue = String(rawValue).replace(",", ".");
  const value = Number(normalizedValue);
  if (!Number.isFinite(value)) return null;
  if (unit === "k" || unit === "nghin" || unit === "ngan")
    return Math.round(value * 1000);
  if (unit === "tr" || unit === "trieu") return Math.round(value * 1000000);
  return Math.round(Number(String(rawValue).replace(/[.,]/g, "")));
}

function extractFilters(text) {
  const filter = {};
  const normalizedText = normalizeText(text);

  // 1. Nhận diện Thành phố
  for (const [displayName, queryName] of CITY_ALIASES) {
    if (
      normalizedText.includes(normalizeText(displayName)) ||
      normalizedText.includes(queryName)
    ) {
      const canonicalCity = ["hcm", "tphcm", "sai gon"].includes(
        normalizeText(displayName),
      )
        ? "hồ chí minh"
        : displayName;
      filter.city = canonicalCity;
      filter.cityQuery = [queryName, canonicalCity];
      break;
    }
  }

  // 2. Nhận diện Sát biển / Giáp biển
  if (
    normalizedText.includes("sat bien") ||
    normalizedText.includes("giap bien") ||
    normalizedText.includes("gan bien") ||
    normalizedText.includes("view bien") ||
    normalizedText.includes("huong bien") ||
    normalizedText.includes("ven bien")
  ) {
    filter.is_beachfront = true;
  }

  // 3. Nhận diện Gần trung tâm
  if (
    normalizedText.includes("gan trung tam") ||
    normalizedText.includes("trung tam") ||
    normalizedText.includes("noi thanh")
  ) {
    filter.near_center = true;
  }

  // 4. Nhận diện Giá tối đa
  const rangeMatch = normalizedText.match(
    /([\d.,]+)\s*(trieu|tr|k|nghin)?\s*(?:den|toi)\s*([\d.,]+)\s*(trieu|tr|k|nghin)?/,
  );
  if (rangeMatch) {
    filter.minPrice = parseMoney(rangeMatch[1], rangeMatch[2] || rangeMatch[4]);
    filter.maxPrice = parseMoney(rangeMatch[3], rangeMatch[4]);
  } else {
    const priceMatch = normalizedText.match(
      /(?:duoi|khong qua|toi da|max|budget|tam|khoang|gia khoang|ngan sach)\s*([\d.,]+)\s*(trieu|tr|k|nghin|ngan)?/,
    );
    if (priceMatch) filter.maxPrice = parseMoney(priceMatch[1], priceMatch[2]);
  }

  if (
    normalizedText.includes("1.5 trieu") ||
    normalizedText.includes("1,5 trieu") ||
    normalizedText.includes("1tr5") ||
    normalizedText.includes("1.5tr")
  ) {
    filter.maxPrice = 1500000;
  } else if (normalizedText.includes("trieu ruoi")) {
    filter.maxPrice = 1500000;
  } else if (
    normalizedText.includes("2 trieu") ||
    normalizedText.includes("2tr")
  ) {
    filter.maxPrice = 2000000;
  } else if (
    normalizedText.includes("1 trieu") ||
    normalizedText.includes("1tr")
  ) {
    filter.maxPrice = 1000000;
  }

  // 5. Nhận diện Thời gian
  const checkIn = parseDate(normalizedText);
  if (checkIn) {
    const date = new Date(`${checkIn}T00:00:00`);
    const nightsMatch = normalizedText.match(/(\d+)\s*(dem|ngay)/);
    date.setDate(date.getDate() + Number(nightsMatch?.[1] || 1));
    filter.checkIn = checkIn;
    filter.checkOut = date.toISOString().slice(0, 10);
  } else if (
    normalizedText.includes("cuoi tuan") ||
    normalizedText.includes("weekend")
  ) {
    Object.assign(filter, getThisWeekend());
  } else if (
    normalizedText.includes("hom nay") ||
    normalizedText.includes("toi nay")
  ) {
    filter.checkIn = getRelativeDate(0);
    filter.checkOut = getRelativeDate(1);
  } else if (normalizedText.includes("ngay mai")) {
    filter.checkIn = getRelativeDate(1);
    filter.checkOut = getRelativeDate(2);
  }

  return filter;
}

// ─── HÀM XỬ LÝ CHATBOT VÀ TRẢ VỀ ĐẦU DÒNG CHUẨN BOOKING.COM ───
async function handleChatMessage(req, res, next) {
  const userId = req.user?.id || req.auth?.sub || null;
  const { message, session_id = "session_default" } = req.body || {};

  if (!message || !message.trim()) {
    return res
      .status(400)
      .json({ message: "Nội dung tin nhắn không được để trống." });
  }

  try {
    const extractedFilter = extractFilters(message.trim());
    const checkIn =
      extractedFilter.checkIn || new Date().toISOString().slice(0, 10);
    const checkOut =
      extractedFilter.checkOut ||
      new Date(Date.now() + 86400000).toISOString().slice(0, 10);

    // Điều kiện Sát biển linh hoạt: cột is_beachfront hoặc các từ khóa thông dụng
    const isBeachfrontCondition = `
      (
        COALESCE(h.is_beachfront, false) = true
        OR h.name ILIKE '%Sóng%'
        OR h.name ILIKE '%Song%'
        OR h.name ILIKE '%Beach%' 
        OR h.name ILIKE '%Sea%' 
        OR h.address ILIKE '%Thùy Vân%' 
        OR h.address ILIKE '%Hạ Long%' 
        OR h.address ILIKE '%Trần Phú%' 
        OR h.address ILIKE '%Phan Văn Trị%'
        OR h.address ILIKE '%Võ Nguyên Giáp%' 
        OR r.room_view = 'sea_view'
      )
    `;

    const queryRooms = async (withBeachfront = true, withNearCenter = true) => {
      const params = [checkIn, checkOut];
      let paramIdx = 3;

      let roomQuery = `
        WITH stay_nights AS (
          SELECT generate_series($1::date, ($2::date - INTERVAL '1 day')::date, INTERVAL '1 day')::date AS night_date
        ), 
        nightly_status AS (
          SELECT r.id AS room_id, sn.night_date,
            r.base_price AS night_price,
            GREATEST(0, r.amount
              - COALESCE((
                  SELECT SUM(br.quantity)::int FROM public.booking_room br
                  JOIN public.booking b ON b.id = br.booking_id
                  WHERE br.room_id = r.id
                    AND b.status::text IN ('confirmed', 'checked_in')
                    AND b.checkin_date <= sn.night_date
                    AND b.checkout_date > sn.night_date
                ), 0)
              - COALESCE((
                  SELECT SUM(tl.quantity)::int FROM public.temporary_locks tl
                  WHERE tl.room_id = r.id 
                    AND tl.lock_date = sn.night_date 
                    AND tl.lock_expires_at > NOW()
                ), 0)
            ) AS available_count
          FROM public.room r
          CROSS JOIN stay_nights sn
          WHERE r.is_active = true
        )
        SELECT 
          r.id AS room_id, 
          r.hotel_id, 
          r.name AS room_name, 
          r.base_price,
          r.capacity, 
          r.room_view,
          h.name AS hotel_name, 
          h.city, 
          h.address, 
          h.star_rating, 
          COALESCE(h.average_rating, 8.5) AS average_rating,
          COALESCE(h.review_count, 120) AS review_count,
          h.description AS hotel_description,
          COALESCE(h.is_beachfront, false) AS is_beachfront,
          COALESCE(h.distance_to_center, 1.2) AS distance_to_center,
          COALESCE(
            (SELECT img.path FROM public.image img WHERE img.hotel_id = h.id ORDER BY img.is_thumbnail DESC, img.created_at ASC LIMIT 1),
            'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600'
          ) AS hotel_image,
          MIN(ns.available_count)::int AS remaining_rooms,
          ROUND(AVG(ns.night_price))::int AS price
        FROM public.room r
        JOIN public.hotel h ON h.id = r.hotel_id
        JOIN nightly_status ns ON ns.room_id = r.id
        WHERE h.status::text IN ('active', 'approved')
      `;

      if (extractedFilter.city) {
        params.push(`%${extractedFilter.cityQuery[0]}%`);
        params.push(`%${extractedFilter.cityQuery[1]}%`);
        roomQuery += ` AND (
          unaccent(lower(h.city)) ILIKE unaccent(lower($${paramIdx}))
          OR unaccent(lower(h.city)) ILIKE unaccent(lower($${paramIdx + 1}))
          OR unaccent(lower(h.address)) ILIKE unaccent(lower($${paramIdx}))
          OR unaccent(lower(h.address)) ILIKE unaccent(lower($${paramIdx + 1}))
        )`;
        paramIdx += 2;
      }

      if (extractedFilter.is_beachfront && withBeachfront) {
        roomQuery += ` AND ${isBeachfrontCondition}`;
      }

      if (extractedFilter.near_center && withNearCenter) {
        roomQuery += ` AND COALESCE(h.distance_to_center, 1.2) <= 2.5`;
      }

      if (extractedFilter.maxPrice) {
        params.push(extractedFilter.maxPrice);
        roomQuery += ` AND r.base_price <= $${paramIdx}`;
        paramIdx++;
      }

      roomQuery += ` 
        GROUP BY r.id, h.id
        HAVING MIN(ns.available_count) > 0
        ORDER BY 
          h.star_rating DESC, 
          h.average_rating DESC, 
          r.base_price ASC
        LIMIT 4;
      `;

      const qRes = await pool.query(roomQuery, params);
      return qRes.rows;
    };

    // 1. Chạy truy vấn với đầy đủ tiêu chí
    let matchedRooms = await queryRooms(true, true);

    // 2. Fallback thông minh: nếu chưa tìm thấy, nới lỏng tiêu chí biển để luôn gợi ý được khách sạn cho khách
    if (matchedRooms.length === 0 && extractedFilter.is_beachfront) {
      matchedRooms = await queryRooms(false, true);
    }
    if (matchedRooms.length === 0) {
      matchedRooms = await queryRooms(false, false);
    }

    // ── TẠO CÂU TRẢ LỜI CHUẨN ĐẦU DÒNG NHƯ BOOKING.COM ──
    let botReply = "";
    if (matchedRooms.length > 0) {
      const cityName = extractedFilter.city
        ? extractedFilter.city.charAt(0).toUpperCase() +
          extractedFilter.city.slice(1)
        : "Vũng Tàu";
      const priceText = extractedFilter.maxPrice
        ? `với giá dưới ${(extractedFilter.maxPrice / 1000000).toLocaleString("vi-VN")} triệu`
        : "hợp lý";

      botReply = `Tôi đã tìm thấy một số lựa chọn tuyệt vời cho bạn ở ${cityName} ${priceText} cho cuối tuần này. Tất cả các khách sạn này đều nằm trong ngân sách của bạn:\n\n`;

      matchedRooms.forEach((r, index) => {
        const ratingScore = Number(r.average_rating).toFixed(1);
        const reviewsNum = r.review_count;
        const priceVND = Number(r.price).toLocaleString("vi-VN") + " VND";

        let comment = "Đây là một lựa chọn hợp lý với mức giá phải chăng.";
        if (Number(ratingScore) >= 8.5) {
          comment =
            "Khách sạn này được đánh giá cao và có nhiều phản hồi tích cực từ khách hàng.";
        } else if (Number(ratingScore) >= 8.0) {
          comment =
            "Đây là một lựa chọn tốt với điểm số cao và dịch vụ chu đáo.";
        }

        botReply += `${index + 1}. **${r.hotel_name}**\n`;
        botReply += `   • Giá: ${priceVND}\n`;
        botReply += `   • Điểm đánh giá: ${ratingScore} từ ${reviewsNum} khách\n`;
        botReply += `   • ${comment}\n\n`;
      });

      botReply += `Tất cả các khách sạn này đều nằm trong ngân sách của bạn và có thể là những lựa chọn tuyệt vời cho chuyến đi của bạn. Bạn có muốn biết thêm thông tin chi tiết về một trong số chúng không?`;
    } else {
      botReply = `Tôi chưa tìm thấy khách sạn nào ở ${extractedFilter.city || "khu vực này"} thỏa mãn mức giá dưới ${(extractedFilter.maxPrice / 1000).toLocaleString("vi-VN")}k cho cuối tuần này. Bạn có muốn thử nâng ngân sách lên một chút không?`;
    }

    // Ghi vết vào bảng chatbot_log
    await pool.query(
      `INSERT INTO public.chatbot_log (
         id, user_id, session_id, role, message, extracted_filter, created_at
       ) VALUES (
         gen_random_uuid(), $1, $2, 'user', $3, $4, NOW()
       )`,
      [userId, session_id, message.trim(), JSON.stringify(extractedFilter)],
    );

    await pool.query(
      `INSERT INTO public.chatbot_log (
         id, user_id, session_id, role, message, extracted_filter, created_at
       ) VALUES (
         gen_random_uuid(), $1, $2, 'assistant', $3, NULL, NOW()
       )`,
      [userId, session_id, botReply],
    );

    return res.json({
      success: true,
      reply: botReply,
      suggestions: matchedRooms,
      filter: {
        ...extractedFilter,
        checkIn,
        checkOut,
      },
    });
  } catch (error) {
    console.error("❌ LỖI CHATBOT:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function getChatHistory(req, res, next) {
  const { session_id = "session_default" } = req.query;
  try {
    const result = await pool.query(
      `SELECT id, role, message, created_at 
       FROM public.chatbot_log 
       WHERE session_id = $1 
       ORDER BY created_at ASC LIMIT 50`,
      [session_id],
    );
    return res.json({ success: true, data: result.rows });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  handleChatMessage,
  getChatHistory,
};
