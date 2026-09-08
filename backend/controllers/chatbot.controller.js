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

const ROOM_TYPES = [
  ["phòng gia đình", "family"],
  ["gia đình", "family"],
  ["family", "family"],
  ["suite", "suite"],
  ["deluxe", "deluxe"],
  ["cao cấp", "deluxe"],
  ["superior", "superior"],
  ["standard", "standard"],
  ["tiêu chuẩn", "standard"],
  ["villa", "villa"],
];

const AMENITY_ALIASES = [
  ["biển", ["bien", "sea", "ocean", "beach"]],
  ["hồ bơi", ["ho boi", "pool"]],
  ["ban công", ["ban cong", "balcony"]],
  ["wifi", ["wifi", "wi-fi"]],
  ["bữa sáng", ["bua sang", "breakfast"]],
  ["bãi đỗ xe", ["bai do xe", "parking"]],
  ["điều hòa", ["dieu hoa", "air", "conditioner"]],
  ["minibar", ["minibar", "tu lanh"]],
  ["bồn tắm", ["bon tam", "bathtub"]],
];

const PROPERTY_ALIASES = [
  ["khu nghi duong", "resort"],
  ["resort", "resort"],
  ["homestay", "homestay"],
  ["villa", "villa"],
  ["khach san", "hotel"],
];

const BED_ALIASES = [
  ["giuong king", "king"],
  ["king", "king"],
  ["giuong queen", "queen"],
  ["queen", "queen"],
  ["giuong doi", "doi"],
  ["giuong don", "don"],
  ["giuong tang", "tang"],
  ["phong doi", "doi"],
  ["phong don", "don"],
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
  const daysUntilFriday = (5 - day + 7) % 7 || 7;
  const checkIn = new Date(today);
  checkIn.setDate(today.getDate() + daysUntilFriday);
  const checkOut = new Date(checkIn);
  checkOut.setDate(checkIn.getDate() + 2);
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
  if (unit === "k" || unit === "nghin") return Math.round(value * 1000);
  if (unit === "tr" || unit === "trieu") return Math.round(value * 1000000);
  return Math.round(Number(String(rawValue).replace(/[.,]/g, "")));
}

function extractFilters(text) {
  const filter = {};
  const normalizedText = normalizeText(text);

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

  if (!filter.city) {
    const locationMatch = normalizedText.match(
      /(?:\bo\b|\btai\b|\bkhu vuc\b|\bden\b)\s+(.+?)(?=\s+(?:gia|duoi|toi da|khong qua|cho|voi|co|có|tu|tren|ngay|dem|cuoi tuan)\b|$)/,
    );
    const location = locationMatch?.[1]
      ?.replace(/^(khach san|phong|cho toi|tim phong)\s+/, "")
      .trim();
    if (location && location.length >= 2) {
      filter.locationText = location;
    }
  }

  const rangeMatch = normalizedText.match(
    /([\d.,]+)\s*(trieu|tr|k|nghin)?\s*(?:den|toi)\s*([\d.,]+)\s*(trieu|tr|k|nghin)?/,
  );
  if (rangeMatch) {
    filter.minPrice = parseMoney(rangeMatch[1], rangeMatch[2] || rangeMatch[5]);
    filter.maxPrice = parseMoney(rangeMatch[3], rangeMatch[4] || rangeMatch[5]);
  } else {
    const priceMatch = normalizedText.match(
      /(?:duoi|khong qua|toi da|max|budget|tam|khoang|gia khoang|ngan sach)\s*([\d.,]+)\s*(trieu|tr|k|nghin)?/,
    );
    if (priceMatch) filter.maxPrice = parseMoney(priceMatch[1], priceMatch[2]);
  }
  if (normalizedText.includes("trieu ruoi")) filter.maxPrice = 1500000;
  if (/(?:^|\s)(?:re|gia re|tiet kiem|binh dan)(?:\s|$)/.test(normalizedText) && !filter.maxPrice) {
    filter.maxPrice = 1000000;
  }

  const checkIn = parseDate(normalizedText);
  if (checkIn) {
    const date = new Date(`${checkIn}T00:00:00`);
    const nightsMatch = normalizedText.match(/(\d+)\s*(dem|ngay)/);
    date.setDate(date.getDate() + Number(nightsMatch?.[1] || 1));
    filter.checkIn = checkIn;
    filter.checkOut = date.toISOString().slice(0, 10);
  } else if (normalizedText.includes("hom nay")) {
    filter.checkIn = getRelativeDate(0);
    filter.checkOut = getRelativeDate(1);
  } else if (normalizedText.includes("ngay mai")) {
    filter.checkIn = getRelativeDate(1);
    filter.checkOut = getRelativeDate(2);
  } else if (normalizedText.includes("toi nay")) {
    filter.checkIn = getRelativeDate(0);
    filter.checkOut = getRelativeDate(1);
  } else if (normalizedText.includes("cuoi tuan") || normalizedText.includes("weekend")) {
    Object.assign(filter, getThisWeekend());
    const nightsMatch = normalizedText.match(/(\d+)\s*(dem|ngay)/);
    if (nightsMatch) {
      const date = new Date(`${filter.checkIn}T00:00:00`);
      date.setDate(date.getDate() + Number(nightsMatch[1]));
      filter.checkOut = date.toISOString().slice(0, 10);
    }
  }

  const guestMatch = normalizedText.match(/(\d+)\s*(nguoi|khach|adult|adults|nguoi lon)/);
  if (guestMatch) filter.guests = Number(guestMatch[1]);
  const childrenMatch = normalizedText.match(/(\d+)\s*(tre em|tre|children|child)/);
  if (childrenMatch) filter.children = Number(childrenMatch[1]);
  if (filter.children) {
    filter.guests = (filter.guests || 0) + filter.children;
  }
  const roomCountMatch = normalizedText.match(/(\d+)\s*(phong|room)/);
  if (roomCountMatch) filter.rooms = Number(roomCountMatch[1]);
  if (normalizedText.includes("gia dinh")) filter.guests = Math.max(filter.guests || 0, 4);

  filter.roomTypes = ROOM_TYPES.filter(([label]) => normalizedText.includes(normalizeText(label)))
    .map(([, type]) => type)
    .filter((type, index, types) => types.indexOf(type) === index);
  filter.propertyTypes = PROPERTY_ALIASES.filter(([label]) =>
    normalizedText.includes(label),
  ).map(([, type]) => type);
  filter.propertyTypes = [
    ...new Set(filter.propertyTypes),
  ];
  if (filter.propertyTypes.some((type) => type !== "hotel")) {
    filter.propertyTypes = filter.propertyTypes.filter((type) => type !== "hotel");
  }
  filter.bedTypes = BED_ALIASES.filter(([label]) =>
    normalizedText.includes(label),
  ).map(([, type]) => type).filter((type, index, types) => types.indexOf(type) === index);

  filter.amenities = AMENITY_ALIASES.filter(([label]) =>
    normalizedText.includes(normalizeText(label)),
  ).map(([label, aliases]) => [...aliases, label]);
  filter.removeAmenities = AMENITY_ALIASES.filter(([label]) =>
    new RegExp(`(?:khong can|khong muon|bo|loai)\\s+.*${normalizeText(label)}`).test(
      normalizedText,
    ),
  ).map(([label, aliases]) => [...aliases, label]);

  const starMatch = normalizedText.match(/(\d+)\s*sao/);
  if (starMatch) {
    const starValue = Number(starMatch[1]);
    const isMinimumStars = /(?:tu|it nhat|tro len|trở lên|minimum)/.test(
      normalizedText,
    );
    if (isMinimumStars) filter.minStars = starValue;
    else filter.exactStars = starValue;
  }

  const areaMatch = normalizedText.match(/(?:tu|tren|hon)\s*(\d+)\s*m(?:2|²)/);
  if (areaMatch) filter.minArea = Number(areaMatch[1]);

  if (normalizedText.includes("gan trung tam") || normalizedText.includes("trung tam")) {
    filter.locationKeyword = "trung tam";
  }

  if (
    normalizedText.includes("gan bien") ||
    normalizedText.includes("view bien") ||
    normalizedText.includes("sat bien") ||
    normalizedText.includes("ven bien")
  ) {
    filter.amenities.push(["bien", "sea", "ocean", "beach", "biển"]);
  }

  if (normalizedText.includes("re hon") || normalizedText.includes("tiet kiem")) {
    filter.sortBy = "price";
  }

  if (
    (normalizedText.includes("view bien") || normalizedText.includes("sat bien")) &&
    !filter.amenities.some((aliases) => aliases.includes("biển"))
  ) {
    filter.amenities.push(["bien", "sea", "ocean", "biển"]);
  }

  if (filter.removeAmenities.length > 0) {
    filter.amenities = filter.amenities.filter(
      (item) =>
        !filter.removeAmenities.some((removed) =>
          removed.some((alias) => item.includes(alias)),
        ),
    );
  }

    filter.amenities = filter.amenities.filter(
      (aliases, index, list) =>
        list.findIndex((item) => item.join("|") === aliases.join("|")) === index,
    );

  return filter;
}

function isResetRequest(normalizedText) {
  return /(?:bat dau lai|tim lai|xoa bo loc|bo het bo loc|lam moi tim kiem|tim tu dau|yeu cau moi)/.test(
    normalizedText,
  );
}

function mergeSessionFilters(previous, current, normalizedText) {
  if (!previous || typeof previous !== "object") return current;
  const followUp = /(re hon|them|nhu tren|nhu vay|tu van them|goi y them|cung khu vuc|o do|tai do|doi sang|chuyen sang)/.test(
    normalizedText,
  );
  if (!followUp) return current;

  const merged = { ...previous, ...current };
  const hasNewLocation = Boolean(current.city || current.locationText);
  if (hasNewLocation) {
    if (current.city) {
      merged.city = current.city;
      merged.cityQuery = current.cityQuery;
      delete merged.locationText;
    } else {
      merged.locationText = current.locationText;
      delete merged.city;
      delete merged.cityQuery;
    }
  } else {
    merged.cityQuery = current.cityQuery || previous.cityQuery;
  }
  const replaceRoomType = /(?:doi sang|chuyen sang|chi can|chi muon)/.test(
    normalizedText,
  );
  merged.roomTypes = replaceRoomType
    ? current.roomTypes || []
    : [
        ...new Set([...(previous.roomTypes || []), ...(current.roomTypes || [])]),
      ];
  merged.propertyTypes = current.propertyTypes?.length
    ? current.propertyTypes
    : previous.propertyTypes || [];
  merged.bedTypes = current.bedTypes?.length
    ? current.bedTypes
    : previous.bedTypes || [];
  if (current.rooms) merged.rooms = current.rooms;
  if (current.guests) merged.guests = current.guests;
  if (current.children !== undefined) merged.children = current.children;
  if (current.exactStars || current.minStars) {
    delete merged.exactStars;
    delete merged.minStars;
    if (current.exactStars) merged.exactStars = current.exactStars;
    if (current.minStars) merged.minStars = current.minStars;
  }
  if (current.minPrice || current.maxPrice) {
    delete merged.minPrice;
    delete merged.maxPrice;
    if (current.minPrice) merged.minPrice = current.minPrice;
    if (current.maxPrice) merged.maxPrice = current.maxPrice;
  }
  merged.amenities = [
    ...(previous.amenities || []),
    ...(current.amenities || []),
  ].filter(
    (aliases, index, list) =>
      list.findIndex((item) => item.join("|") === aliases.join("|")) === index,
  );
  if (current.removeAmenities?.length) {
    merged.amenities = merged.amenities.filter(
      (item) =>
        !current.removeAmenities.some((removed) =>
          removed.some((alias) => item.includes(alias)),
        ),
    );
  }
  if (current.sortBy === "price" && previous.maxPrice) {
    merged.maxPrice = Math.round(previous.maxPrice * 0.8);
  }
  return merged;
}

// Trợ lý tìm phòng theo ngôn ngữ tự nhiên và ghi log vào chatbot_log.
async function handleChatMessage(req, res, next) {
  const userId = req.user?.id || req.auth?.sub || null;
  const { message, session_id = "session_default" } = req.body || {};

  if (!message || !message.trim()) {
    return res
      .status(400)
      .json({ message: "Nội dung tin nhắn không được để trống." });
  }

  try {
    const normalizedText = normalizeText(message.trim());
    const currentFilter = extractFilters(message.trim());
    if (isResetRequest(normalizedText)) {
      currentFilter.reset = true;
    }
    let previousFilter = null;
    if (session_id) {
      const previousMessage = await pool
        .query(
          `SELECT extracted_filter
           FROM public.chatbot_log
           WHERE session_id = $1 AND role = 'user' AND extracted_filter IS NOT NULL
           ORDER BY created_at DESC LIMIT 1`,
          [session_id],
        )
        .catch(() => ({ rows: [] }));
      previousFilter = previousMessage.rows[0]?.extracted_filter || null;
    }

    const extractedFilter = currentFilter.reset
      ? currentFilter
      : mergeSessionFilters(previousFilter, currentFilter, normalizedText);
    const params = [
      extractedFilter.checkIn || new Date().toISOString().slice(0, 10),
      extractedFilter.checkOut ||
        new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    ];

    let roomQuery = `
      WITH stay_nights AS (
        SELECT generate_series($1::date, ($2::date - INTERVAL '1 day')::date, INTERVAL '1 day')::date AS night_date
      ), nightly_status AS (
        SELECT r.id AS room_id, sn.night_date,
          COALESCE(ri.sell_price, r.base_price) AS night_price,
          COALESCE(ri.status::text, 'active') AS day_status,
          GREATEST(0, COALESCE(ri.available_count, r.amount)
            - COALESCE((SELECT SUM(br.quantity)::int FROM public.booking_room br
              JOIN public.booking b ON b.id = br.booking_id
              WHERE br.room_id = r.id
                AND b.status::text IN ('confirmed', 'checked_in', 'pending')
                AND b.checkin_date <= sn.night_date
                AND b.checkout_date > sn.night_date), 0)
            - COALESCE((SELECT SUM(tl.quantity)::int FROM public.temporary_locks tl
              WHERE tl.room_id = r.id AND tl.lock_date = sn.night_date AND tl.expires_at > NOW()), 0)
          ) AS available_count
        FROM public.room r
        CROSS JOIN stay_nights sn
        LEFT JOIN public.room_inventory ri ON ri.room_id = r.id AND ri.inventory_date = sn.night_date
        WHERE r.is_active = true
      )
      SELECT r.id AS room_id, r.hotel_id, r.name AS room_name, r.base_price,
        r.capacity, r.type, r.bed_type, r.room_area, r.description AS room_description,
        h.name AS hotel_name, h.city, h.address, h.star_rating, h.average_rating,
        h.description AS hotel_description,
        MIN(ns.available_count)::int AS remaining_rooms,
        ROUND(AVG(ns.night_price))::int AS price,
        SUM(ns.night_price)::int AS total_price,
        COALESCE((SELECT json_agg(a.name) FROM public.room_amenity ra
          JOIN public.amenity a ON a.id = ra.amenity_id WHERE ra.room_id = r.id), '[]'::json) AS amenities
      FROM public.room r
      JOIN public.hotel h ON h.id = r.hotel_id
      JOIN nightly_status ns ON ns.room_id = r.id
      WHERE h.status::text IN ('active', 'approved')
    `;

    if (extractedFilter.city) {
      params.push(`%${extractedFilter.cityQuery[0]}%`);
      const asciiCityParam = params.length;
      params.push(`%${extractedFilter.cityQuery[1]}%`);
      const accentedCityParam = params.length;
      roomQuery += ` AND (unaccent(lower(h.city)) ILIKE unaccent(lower($${asciiCityParam}))
        OR unaccent(lower(h.city)) ILIKE unaccent(lower($${accentedCityParam}))
        OR unaccent(lower(h.address)) ILIKE unaccent(lower($${asciiCityParam}))
        OR unaccent(lower(h.address)) ILIKE unaccent(lower($${accentedCityParam})))`;
    }

    if (extractedFilter.locationText) {
      params.push(`%${extractedFilter.locationText}%`);
      const locationParam = params.length;
      roomQuery += ` AND (
        unaccent(lower(h.city)) ILIKE unaccent(lower($${locationParam}))
        OR unaccent(lower(h.address)) ILIKE unaccent(lower($${locationParam}))
        OR unaccent(lower(h.name)) ILIKE unaccent(lower($${locationParam}))
        OR unaccent(lower(h.description)) ILIKE unaccent(lower($${locationParam}))
      )`;
    }

    if (extractedFilter.maxPrice) {
      params.push(extractedFilter.maxPrice);
      roomQuery += ` AND COALESCE(ns.night_price, r.base_price) <= $${params.length}`;
    }

    if (extractedFilter.minPrice) {
      params.push(extractedFilter.minPrice);
      roomQuery += ` AND COALESCE(ns.night_price, r.base_price) >= $${params.length}`;
    }

    if (extractedFilter.guests) {
      params.push(extractedFilter.guests);
      roomQuery += ` AND r.capacity >= $${params.length}`;
    }

    if (extractedFilter.rooms) {
      params.push(extractedFilter.rooms);
      roomQuery += ` AND r.amount >= $${params.length}`;
    }

    if (extractedFilter.minArea) {
      params.push(extractedFilter.minArea);
      roomQuery += ` AND r.room_area >= $${params.length}`;
    }

    if (extractedFilter.minStars) {
      params.push(extractedFilter.minStars);
      roomQuery += ` AND h.star_rating >= $${params.length}`;
    }

    if (extractedFilter.exactStars) {
      params.push(extractedFilter.exactStars);
      roomQuery += ` AND h.star_rating = $${params.length}`;
    }

    for (const roomType of extractedFilter.roomTypes || []) {
      params.push(`%${roomType}%`);
      roomQuery += ` AND (LOWER(r.type) LIKE $${params.length} OR LOWER(r.name) LIKE $${params.length})`;
    }

    for (const propertyType of extractedFilter.propertyTypes || []) {
      params.push(`%${propertyType}%`);
      roomQuery += ` AND LOWER(h.property_type::text) LIKE $${params.length}`;
    }

    for (const bedType of extractedFilter.bedTypes || []) {
      params.push(`%${bedType}%`);
      roomQuery += ` AND unaccent(lower(r.bed_type)) LIKE unaccent(lower($${params.length}))`;
    }

    for (const aliases of extractedFilter.amenities || []) {
      params.push(aliases.map((alias) => `%${alias}%`));
      roomQuery += ` AND (
        EXISTS (
        SELECT 1
        FROM public.room_amenity ra
        JOIN public.amenity a ON a.id = ra.amenity_id
        WHERE ra.room_id = r.id AND unaccent(lower(a.name)) LIKE ANY($${params.length}::text[])
        ) OR unaccent(lower(r.name)) LIKE ANY($${params.length}::text[])
        OR unaccent(lower(r.description)) LIKE ANY($${params.length}::text[])
        OR unaccent(lower(h.name)) LIKE ANY($${params.length}::text[])
        OR unaccent(lower(h.description)) LIKE ANY($${params.length}::text[])
      )`;
    }

    if (extractedFilter.locationKeyword) {
      params.push("%trung tam%");
      roomQuery += ` AND (LOWER(h.address) LIKE $${params.length}
        OR LOWER(h.description) LIKE $${params.length}
        OR LOWER(h.name) LIKE $${params.length})`;
    }

    roomQuery += ` GROUP BY r.id, h.id
      HAVING MIN(ns.available_count) > 0
        AND BOOL_AND(ns.day_status = 'active')
      ORDER BY CASE WHEN $${params.length + 1}::text = 'price'
          THEN ROUND(AVG(ns.night_price)) END ASC NULLS LAST,
        h.average_rating DESC NULLS LAST,
        ROUND(AVG(ns.night_price)) ASC LIMIT 6;`;
    params.push(extractedFilter.sortBy || "relevance");
    const roomResult = await pool.query(roomQuery, params);
    const matchedRooms = roomResult.rows;

    // 4. Tạo câu trả lời thông minh
    let botReply = "";
    if (matchedRooms.length > 0) {
      const roomListText = matchedRooms
        .map(
          (room) =>
            `🏨 **${room.room_name} - ${room.hotel_name}** (${room.city}) - ${Number(room.price).toLocaleString("vi-VN")} ₫/đêm, còn ${room.remaining_rooms} phòng`,
        )
        .join("\n");
      botReply = `GoStay tìm được các phòng phù hợp:\n${roomListText}\n\nBạn có muốn xem chi tiết khách sạn nào không?`;
    } else {
      const conditions = [];
      if (extractedFilter.city) conditions.push(`khu vực ${extractedFilter.city}`);
      if (extractedFilter.locationText) {
        conditions.push(`địa điểm ${extractedFilter.locationText}`);
      }
      if (extractedFilter.maxPrice) {
        conditions.push(`ngân sách tối đa ${Number(extractedFilter.maxPrice).toLocaleString("vi-VN")}đ`);
      }
      if (extractedFilter.guests) conditions.push(`${extractedFilter.guests} khách`);
      if (extractedFilter.amenities?.length) conditions.push("tiện nghi đã chọn");
      botReply = `Dạ hiện tại GoStay chưa tìm thấy phòng ${conditions.length ? `đúng với ${conditions.join(", ")}` : "phù hợp"}. Bạn thử nới ngân sách, giảm số khách hoặc đổi ngày lưu trú nhé. Tôi cũng có thể tìm theo Đà Nẵng, Nha Trang, Phú Quốc, Đà Lạt hoặc Vũng Tàu.`;
    }

    // 5. ── GHI VÀO BẢNG 21: CHATBOT_LOG ──
    // Ghi tin nhắn của User
    await pool.query(
      `INSERT INTO public.chatbot_log (
         id, user_id, session_id, role, message, extracted_filter, created_at
       ) VALUES (
         gen_random_uuid(), $1, $2, 'user', $3, $4, NOW()
       )`,
      [userId, session_id, message.trim(), JSON.stringify(extractedFilter)],
    );

    // Ghi phản hồi của Bot
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
      filter: extractedFilter,
      explanation:
        matchedRooms.length > 0
          ? "Kết quả được lọc theo yêu cầu, tình trạng còn phòng và sắp xếp theo đánh giá rồi giá."
          : "Không có phòng thỏa tất cả điều kiện hiện tại.",
    });
  } catch (error) {
    console.error("❌ LỖI CHATBOT:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// Lấy lịch sử chat của session
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
