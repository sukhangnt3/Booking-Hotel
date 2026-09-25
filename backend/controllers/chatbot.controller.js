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
  ["hạ long", "ha long"],
  ["quảng ninh", "quang ninh"],
  ["phan thiết", "phan thiet"],
  ["mũi né", "mui ne"],
  ["quy nhơn", "quy nhon"],
  ["bình định", "binh dinh"],
  ["huế", "hue"],
  ["hội an", "hoi an"],
  ["sa pa", "sa pa"],
  ["sapa", "sa pa"],
  ["cần thơ", "can tho"],
  ["ninh bình", "ninh binh"],
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

function getNowVN() {
  const now = new Date();
  const utcOffsetMs = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utcOffsetMs + 7 * 3600000);
}

function getRelativeDateVN(daysFromToday) {
  const d = getNowVN();
  d.setDate(d.getDate() + daysFromToday);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getThisWeekendVN() {
  const today = getNowVN();
  const dayOfWeek = today.getDay();
  const daysUntilSaturday = (6 - dayOfWeek + 7) % 7 || 7;

  const checkInDate = new Date(today);
  checkInDate.setDate(today.getDate() + daysUntilSaturday);

  const checkOutDate = new Date(checkInDate);
  checkOutDate.setDate(checkInDate.getDate() + 1);

  const fmt = (d) => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  return {
    checkIn: fmt(checkInDate),
    checkOut: fmt(checkOutDate),
  };
}

function parseDate(value) {
  const match = value.match(/(\d{1,2})[/-](\d{1,2})(?:[/-](\d{4}))?/);
  if (!match) return null;

  const now = getNowVN();
  const year = Number(match[3] || now.getFullYear());
  const date = new Date(year, Number(match[2]) - 1, Number(match[1]));
  if (Number.isNaN(date.getTime())) return null;

  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
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

function formatTitleCase(str) {
  if (!str) return "";
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function checkAmenityExists(rawSource, targetKey) {
  if (!rawSource) return false;
  let text = "";
  try {
    if (typeof rawSource === "object") {
      text = normalizeText(JSON.stringify(rawSource));
    } else {
      text = normalizeText(String(rawSource));
    }
  } catch {
    text = normalizeText(String(rawSource));
  }

  if (targetKey === "wifi") {
    return (
      text.includes("wifi") ||
      text.includes("wi-fi") ||
      text.includes("internet") ||
      text.includes("toc do cao")
    );
  }
  if (targetKey === "air_conditioner") {
    return (
      text.includes("dieu hoa") ||
      text.includes("may lanh") ||
      text.includes("air")
    );
  }
  if (targetKey === "parking") {
    return (
      text.includes("do xe") ||
      text.includes("de xe") ||
      text.includes("bai xe") ||
      text.includes("parking")
    );
  }
  if (targetKey === "elevator") {
    return text.includes("thang may") || text.includes("elevator");
  }
  if (targetKey === "bathtub") {
    return (
      text.includes("bon tam") ||
      text.includes("bathtub") ||
      text.includes("bon_tam")
    );
  }
  if (targetKey === "pool") {
    return (
      text.includes("ho boi") ||
      text.includes("be boi") ||
      text.includes("pool")
    );
  }
  if (targetKey === "hot_water") {
    return text.includes("nong lanh") || text.includes("hot water");
  }
  if (targetKey === "breakfast") {
    return (
      text.includes("an sang") ||
      text.includes("bua sang") ||
      text.includes("buffet")
    );
  }
  return false;
}

function extractFilters(text) {
  const normalizedText = normalizeText(text);

  let intent = null;
  let checkAmenityKey = null;
  let checkAmenityLabel = null;

  if (
    normalizedText.includes("thanh toan") ||
    normalizedText.includes("tra tien") ||
    normalizedText.includes("phuong thuc thanh toan")
  ) {
    intent = "FAQ_PAYMENT";
  } else if (
    normalizedText.includes("huy phong") ||
    normalizedText.includes("doi phong") ||
    normalizedText.includes("chinh sach huy")
  ) {
    intent = "FAQ_CANCELLATION";
  } else if (
    normalizedText.includes("tong dai") ||
    normalizedText.includes("hotline") ||
    normalizedText.includes("cskh") ||
    normalizedText.includes("nhan vien tu van") ||
    normalizedText.includes("gap nhan vien")
  ) {
    intent = "FAQ_SUPPORT";
  } else if (
    /^(cam on|cảm ơn|thank|tks|cam on bot|ok bot|oke bot)\b/.test(
      normalizedText,
    )
  ) {
    intent = "THANKS";
  } else if (
    /^(tam biet|tạm biệt|bye|goodbye|hen gap lai)\b/.test(normalizedText)
  ) {
    intent = "GOODBYE";
  } else if (/^(chao|xin chao|hello|hi|helo|alo|hey)\b/.test(normalizedText)) {
    intent = "GREETING";
  }

  // Nhận diện tiện ích
  if (
    normalizedText.includes("dieu hoa") ||
    normalizedText.includes("may lanh") ||
    normalizedText.includes("air conditioner")
  ) {
    checkAmenityKey = "air_conditioner";
    checkAmenityLabel = "điều hòa máy lạnh";
  } else if (
    normalizedText.includes("wifi") ||
    normalizedText.includes("mang")
  ) {
    checkAmenityKey = "wifi";
    checkAmenityLabel = "Wi-Fi tốc độ cao";
  } else if (
    /\b(bai do xe|cho do xe|cho de xe|bai xe|xe hoi|o to)\b/.test(
      normalizedText,
    )
  ) {
    checkAmenityKey = "parking";
    checkAmenityLabel = "bãi đỗ xe ô tô";
  } else if (
    normalizedText.includes("thang may") ||
    normalizedText.includes("elevator")
  ) {
    checkAmenityKey = "elevator";
    checkAmenityLabel = "thang máy di chuyển";
  } else if (
    normalizedText.includes("bon tam") ||
    normalizedText.includes("bathtub")
  ) {
    checkAmenityKey = "bathtub";
    checkAmenityLabel = "bồn tắm nằm thư giãn";
  } else if (
    normalizedText.includes("ho boi") ||
    normalizedText.includes("be boi") ||
    normalizedText.includes("pool")
  ) {
    checkAmenityKey = "pool";
    checkAmenityLabel = "hồ bơi";
  } else if (
    normalizedText.includes("an sang") ||
    normalizedText.includes("bua sang") ||
    normalizedText.includes("buffet")
  ) {
    checkAmenityKey = "breakfast";
    checkAmenityLabel = "bữa sáng";
  }

  // Nhận diện hỏi vị trí
  if (
    normalizedText.includes("o dau") ||
    normalizedText.includes("dia chi") ||
    normalizedText.includes("vi tri") ||
    normalizedText.includes("cho nao") ||
    normalizedText.includes("cach trung tam")
  ) {
    intent = "CHECK_LOCATION";
  }

  // Nhận diện hỏi giá
  if (
    normalizedText.includes("gia bao nhieu") ||
    normalizedText.includes("gia phong") ||
    normalizedText.includes("bao nhieu tien") ||
    normalizedText.includes("gia thue") ||
    normalizedText.includes("gia gio") ||
    normalizedText.includes("gia dem")
  ) {
    intent = "CHECK_PRICE";
  }

  const filter = {
    intent,
    checkAmenityKey,
    checkAmenityLabel,
    rentalType: null,
    hours: 2,
    adults: 1,
    rawText: normalizedText,
  };

  if (
    normalizedText.includes("theo gio") ||
    normalizedText.includes("tieng") ||
    normalizedText.includes("gio") ||
    normalizedText.includes("nghi trua") ||
    normalizedText.includes("nghi nhanh")
  ) {
    filter.rentalType = "HOUR";
    const hourMatch = normalizedText.match(/(\d+)\s*(?:tieng|gio|h)/);
    if (hourMatch) {
      filter.hours = Math.max(1, Math.min(24, Number(hourMatch[1])));
    }
  } else if (
    normalizedText.includes("qua dem") ||
    normalizedText.includes("ngu dem") ||
    normalizedText.includes("overnight")
  ) {
    filter.rentalType = "OVERNIGHT";
  } else if (
    normalizedText.includes("buoi") ||
    normalizedText.includes("nua ngay") ||
    normalizedText.includes("half day")
  ) {
    filter.rentalType = "HALF_DAY";
  }

  // Gán cờ tiện ích để câu SQL tìm kiếm
  if (checkAmenityKey === "pool") filter.amenity_pool = true;
  if (checkAmenityKey === "bathtub") filter.amenity_bathtub = true;
  if (checkAmenityKey === "air_conditioner") filter.amenity_ac = true;

  const guestMatch = normalizedText.match(/(\d+)\s*(?:nguoi|khach|adults|ban)/);
  if (guestMatch) {
    filter.adults = Math.max(1, Number(guestMatch[1]));
    filter.capacity = Math.min(4, filter.adults);
    if (filter.adults > 4) {
      filter.isGroupBooking = true;
    }
  }

  // Bóc tách thành phố
  let foundCity = null;
  let foundCityQuery = null;
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
      foundCity = canonicalCity;
      foundCityQuery = [queryName, canonicalCity];
      break;
    }
  }

  if (foundCity) {
    filter.city = foundCity;
    filter.cityQuery = foundCityQuery;
    filter.hasExplicitCity = true;
  }

  // Bóc tách view biển
  if (
    normalizedText.includes("sat bien") ||
    normalizedText.includes("giap bien") ||
    normalizedText.includes("gan bien") ||
    normalizedText.includes("view bien") ||
    normalizedText.includes("huong bien") ||
    normalizedText.includes("ven bien") ||
    /\bbien\b/.test(normalizedText)
  ) {
    filter.is_beachfront = true;
  }

  // Bóc tách gần trung tâm
  if (
    normalizedText.includes("gan trung tam") ||
    normalizedText.includes("trung tam") ||
    normalizedText.includes("noi thanh")
  ) {
    filter.near_center = true;
  }

  // Bóc tách tìm giá rẻ
  if (
    normalizedText.includes("gia re") ||
    normalizedText.includes("re nhat") ||
    normalizedText.includes("tiet kiem")
  ) {
    filter.sortByCheapest = true;
  }

  const rangeMatch = normalizedText.match(
    /([\d.,]+)\s*(trieu|tr|k|nghin)?\s*(?:den|toi)\s*([\d.,]+)\s*(trieu|tr|k|nghin)?/,
  );
  if (rangeMatch) {
    filter.minPrice = parseMoney(rangeMatch[1], rangeMatch[2] || rangeMatch[4]);
    filter.maxPrice = parseMoney(rangeMatch[3], rangeMatch[4]);
  } else {
    const priceMatch = normalizedText.match(
      /(?:duoi|khong qua|toi da|max|budget|tam|khoang|gia khoang|ngan sach|gia)\s*([\d.,]+)\s*(trieu|tr|k|nghin|ngan)?/,
    );
    if (priceMatch) filter.maxPrice = parseMoney(priceMatch[1], priceMatch[2]);
  }

  if (
    normalizedText.includes("1.5 trieu") ||
    normalizedText.includes("1,5 trieu") ||
    normalizedText.includes("1tr5") ||
    normalizedText.includes("1.5tr") ||
    normalizedText.includes("trieu ruoi")
  ) {
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

  const checkIn = parseDate(normalizedText);
  if (checkIn) {
    const date = new Date(`${checkIn}T00:00:00`);
    const nightsMatch = normalizedText.match(/(\d+)\s*(dem|ngay)/);
    date.setDate(date.getDate() + Number(nightsMatch?.[1] || 1));
    filter.checkIn = checkIn;
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    filter.checkOut = `${date.getFullYear()}-${m}-${d}`;
  } else if (
    normalizedText.includes("cuoi tuan") ||
    normalizedText.includes("weekend")
  ) {
    Object.assign(filter, getThisWeekendVN());
  } else if (
    normalizedText.includes("hom nay") ||
    normalizedText.includes("toi nay")
  ) {
    filter.checkIn = getRelativeDateVN(0);
    filter.checkOut =
      filter.rentalType === "HOUR"
        ? getRelativeDateVN(0)
        : getRelativeDateVN(1);
  } else if (normalizedText.includes("ngay mai")) {
    filter.checkIn = getRelativeDateVN(1);
    filter.checkOut =
      filter.rentalType === "HOUR"
        ? getRelativeDateVN(1)
        : getRelativeDateVN(2);
  }

  const hasHotelKeyword =
    normalizedText.includes("phong") ||
    normalizedText.includes("khach san") ||
    normalizedText.includes("cho nghi") ||
    normalizedText.includes("resort") ||
    normalizedText.includes("homestay") ||
    normalizedText.includes("thue") ||
    normalizedText.includes("dat");

  // 🌟 NGUYÊN TẮC: Cứ có thành phố HOẶC hình thức thuê HOẶC từ tìm phòng -> 100% SEARCH_HOTEL
  if (
    Boolean(filter.city) ||
    Boolean(filter.rentalType) ||
    hasHotelKeyword ||
    Boolean(filter.is_beachfront)
  ) {
    filter.intent = "SEARCH_HOTEL";
  } else if (
    checkAmenityKey &&
    (normalizedText.includes("co ") || normalizedText.includes("khong"))
  ) {
    filter.intent = "CHECK_AMENITY";
  } else if (!filter.intent && hasHotelKeyword) {
    filter.intent = "SEARCH_HOTEL";
  } else if (!filter.intent) {
    filter.intent = "UNKNOWN";
  }

  if (!filter.rentalType) {
    filter.rentalType = "DAY";
  }

  return filter;
}

async function getMergedContext(sessionId, currentFilter) {
  try {
    const historyRes = await pool.query(
      `SELECT extracted_filter 
       FROM public.chatbot_log 
       WHERE session_id = $1 AND role = 'user' AND extracted_filter IS NOT NULL 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [sessionId],
    );

    if (historyRes.rows.length === 0 || !historyRes.rows[0].extracted_filter) {
      return currentFilter;
    }

    const previousFilter =
      typeof historyRes.rows[0].extracted_filter === "string"
        ? JSON.parse(historyRes.rows[0].extracted_filter)
        : historyRes.rows[0].extracted_filter;

    if (currentFilter.intent === "UNKNOWN") {
      return currentFilter;
    }

    // 1. Xóa giá cũ nếu câu mới không nhắc giá
    if (!currentFilter.maxPrice && !currentFilter.minPrice) {
      delete previousFilter.maxPrice;
      delete previousFilter.minPrice;
    }

    // 2. Xác định nếu câu này là một câu tìm kiếm độc lập mới
    const isNewExplicitSearch =
      Boolean(currentFilter.hasExplicitCity) ||
      Boolean(currentFilter.maxPrice) ||
      Boolean(currentFilter.sortByCheapest) ||
      (currentFilter.rawText &&
        (currentFilter.rawText.includes("khach san") ||
          currentFilter.rawText.includes("tim phong") ||
          currentFilter.rawText.includes("cho nghi")));

    // 🌟 XÓA TOÀN BỘ TIỆN ÍCH CŨ NẾU CÂU TÌM KIẾM MỚI KHÔNG NHẮC LẠI
    if (isNewExplicitSearch) {
      if (!currentFilter.is_beachfront) delete previousFilter.is_beachfront;
      if (!currentFilter.near_center) delete previousFilter.near_center;
      if (!currentFilter.amenity_pool) delete previousFilter.amenity_pool;
      if (!currentFilter.amenity_bathtub) delete previousFilter.amenity_bathtub;
      if (!currentFilter.amenity_ac) delete previousFilter.amenity_ac;
      delete previousFilter.checkAmenityKey;
      delete previousFilter.checkAmenityLabel;
    }

    // 3. Nếu chuyển thành phố mới -> XÓA toàn bộ thông tin khách sạn cũ và tiện ích cũ
    if (
      currentFilter.city &&
      previousFilter.city &&
      normalizeText(currentFilter.city) !== normalizeText(previousFilter.city)
    ) {
      delete previousFilter.lastHotelId;
      delete previousFilter.lastHotelName;
      delete previousFilter.is_beachfront;
      delete previousFilter.near_center;
      delete previousFilter.amenity_pool;
      delete previousFilter.amenity_bathtub;
      delete previousFilter.amenity_ac;
      delete previousFilter.checkAmenityKey;
      delete previousFilter.checkAmenityLabel;
    }

    const merged = {
      ...previousFilter,
      ...currentFilter,
      intent: currentFilter.intent || previousFilter.intent || "SEARCH_HOTEL",
      lastHotelId:
        currentFilter.lastHotelId || previousFilter.lastHotelId || null,
      lastHotelName:
        currentFilter.lastHotelName || previousFilter.lastHotelName || null,
    };

    if (currentFilter.is_beachfront && !currentFilter.hasExplicitCity) {
      delete merged.city;
      delete merged.cityQuery;
    }

    return merged;
  } catch (err) {
    console.warn("Context merge warning:", err.message);
    return currentFilter;
  }
}

async function handleChatMessage(req, res, next) {
  const userId = req.user?.id || req.auth?.sub || null;
  const { message, session_id = "session_default" } = req.body || {};

  if (!message || !message.trim()) {
    return res.status(400).json({
      success: false,
      message: "Nội dung tin nhắn không được để trống.",
    });
  }

  try {
    const rawFilter = extractFilters(message.trim());
    const extractedFilter = await getMergedContext(session_id, rawFilter);
    const normMsg = normalizeText(message.trim());

    if (extractedFilter.intent === "UNKNOWN") {
      const unknownReply =
        "Dạ mình chưa hiểu rõ yêu cầu của bạn nè. Bạn có thể cho mình biết bạn muốn tìm phòng ở thành phố nào (VD: Sài Gòn, Vũng Tàu, Đà Nẵng...) hoặc cần thuê theo giờ hay qua đêm để mình hỗ trợ nhé! 😊";
      await logTurn(
        userId,
        session_id,
        message.trim(),
        extractedFilter,
        unknownReply,
      );
      return res.json({
        success: true,
        reply: unknownReply,
        suggestions: [],
        filter: extractedFilter,
      });
    }

    // 1. Quét tìm khách sạn từ database
    const allHotelsRes = await pool.query(
      `SELECT h.id, h.name, h.address, h.city, h.phone, h.star_rating, 
              COALESCE(h.average_rating, 0) AS average_rating, 
              COALESCE(h.review_count, 0) AS review_count, 
              h.description,
              COALESCE(h.distance_to_center, 1.2) AS distance_to_center,
              COALESCE(h.is_beachfront, false) AS is_beachfront,
              COALESCE(
                (SELECT img.path FROM public.image img WHERE img.hotel_id = h.id ORDER BY img.is_thumbnail DESC, img.created_at ASC LIMIT 1),
                'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600'
              ) AS hotel_image
       FROM public.hotel h WHERE h.status::text IN ('active', 'approved')`,
    );

    let specificHotel = null;

    // A. Quét theo tên khách sạn trong tin nhắn
    for (const h of allHotelsRes.rows) {
      const normHName = normalizeText(h.name);
      if (normMsg.includes(normHName)) {
        specificHotel = h;
        extractedFilter.lastHotelId = h.id;
        extractedFilter.lastHotelName = h.name;
        break;
      }
    }

    // B. Gắn khách sạn đang xem nếu người dùng dùng từ quy chiếu
    const isReferringToCurrentHotel =
      normMsg.includes("khach san nay") ||
      normMsg.includes("o day") ||
      normMsg.includes("cho nay") ||
      normMsg.includes("phong nay") ||
      normMsg.includes("noi nay") ||
      normMsg.includes("dia chi o dau") ||
      normMsg.includes("o dau vay") ||
      (extractedFilter.intent === "CHECK_LOCATION" &&
        extractedFilter.lastHotelId) ||
      (extractedFilter.intent === "CHECK_AMENITY" &&
        extractedFilter.lastHotelId);

    if (
      !specificHotel &&
      extractedFilter.lastHotelId &&
      isReferringToCurrentHotel
    ) {
      specificHotel = allHotelsRes.rows.find(
        (h) => String(h.id) === String(extractedFilter.lastHotelId),
      );
    }

    // ─────────────────────────────────────────────────────────────
    // NHÁNH 1: KHÁCH HỎI VỀ TIỆN ÍCH
    // ─────────────────────────────────────────────────────────────
    if (
      extractedFilter.intent === "CHECK_AMENITY" &&
      extractedFilter.checkAmenityKey
    ) {
      let replyText = "";
      const amenityLabel = extractedFilter.checkAmenityLabel;
      let matchedSuggestions = [];

      if (specificHotel) {
        let hotelHasAmenity = false;
        try {
          if (
            checkAmenityExists(
              specificHotel.description,
              extractedFilter.checkAmenityKey,
            )
          ) {
            hotelHasAmenity = true;
          }

          const roomsData = await pool.query(
            `SELECT * FROM public.room WHERE hotel_id = $1`,
            [specificHotel.id],
          );

          for (const r of roomsData.rows) {
            if (
              checkAmenityExists(
                r.amenities,
                extractedFilter.checkAmenityKey,
              ) ||
              checkAmenityExists(r.name, extractedFilter.checkAmenityKey) ||
              checkAmenityExists(r.description, extractedFilter.checkAmenityKey)
            ) {
              hotelHasAmenity = true;
              break;
            }
            if (
              extractedFilter.checkAmenityKey === "pool" &&
              r.room_view === "pool_view"
            ) {
              hotelHasAmenity = true;
              break;
            }
            if (
              extractedFilter.checkAmenityKey === "bathtub" &&
              (r.room_view === "bathtub" ||
                checkAmenityExists(r.amenities, "bathtub"))
            ) {
              hotelHasAmenity = true;
              break;
            }
          }

          matchedSuggestions = roomsData.rows.slice(0, 3).map((r) => ({
            hotel_id: specificHotel.id,
            room_id: r.id,
            hotel_name: specificHotel.name,
            room_name: r.name,
            city: specificHotel.city,
            address: specificHotel.address,
            star_rating: specificHotel.star_rating,
            average_rating: specificHotel.average_rating,
            review_count: specificHotel.review_count,
            hotel_image: specificHotel.hotel_image,
            is_beachfront: specificHotel.is_beachfront,
            distance_to_center: specificHotel.distance_to_center,
            price: Number(r.hourly_price || r.base_price),
            base_price: Number(r.base_price || 650000),
          }));
        } catch (e) {
          hotelHasAmenity = false;
        }

        if (hotelHasAmenity) {
          replyText = `Dạ có bạn nhé! **${specificHotel.name}** được trang bị đầy đủ **${amenityLabel}** phục vụ khách lưu trú. Bạn có thể bấm vào thẻ bên dưới để xem chi tiết và đặt phòng nhé!`;
        } else {
          replyText = `Dạ hiện tại **${specificHotel.name}** chưa có tiện ích **${amenityLabel}** bạn nha. Tuy nhiên, chỗ nghỉ vẫn có vị trí rất đẹp và nhiều dịch vụ tiện nghi khác phục vụ bạn chu đáo!`;
        }
      } else {
        if (extractedFilter.checkAmenityKey === "wifi") {
          replyText = `Dạ 100% tất cả các khách sạn trên hệ thống GoStay đều cung cấp **Wi-Fi tốc độ cao miễn phí** toàn khuôn viên bạn nhé!`;
        } else if (extractedFilter.checkAmenityKey === "air_conditioner") {
          replyText = `Dạ có bạn ơi! Hầu hết tất cả các khách sạn trên GoStay đều được trang bị đầy đủ **điều hòa máy lạnh 2 chiều** mát lạnh và bình nóng lạnh. Bạn đang tìm phòng ở thành phố nào để mình gợi ý nhé?`;
        } else if (extractedFilter.checkAmenityKey === "pool") {
          replyText = `Dạ trên GoStay có các resort và khách sạn có **hồ bơi ngoài trời / vô cực** view rất đẹp. Bạn đang dự định đi du lịch ở thành phố nào ạ?`;
        } else if (extractedFilter.checkAmenityKey === "bathtub") {
          replyText = `Dạ trên GoStay có các khách sạn có phòng trang bị **bồn tắm nằm thư giãn** rất tiện nghi. Bạn đang tìm phòng ở thành phố nào để mình hỗ trợ nhé!`;
        } else {
          replyText = `Dạ có bạn nhé! Nhiều khách sạn trên GoStay có hỗ trợ **${amenityLabel}**. Bạn muốn tìm phòng ở thành phố nào để mình lọc cho bạn nhé!`;
        }
      }

      await logTurn(
        userId,
        session_id,
        message.trim(),
        extractedFilter,
        replyText,
      );
      return res.json({
        success: true,
        reply: replyText,
        suggestions: matchedSuggestions,
        filter: extractedFilter,
      });
    }

    // ─────────────────────────────────────────────────────────────
    // NHÁNH 2: KHÁCH HỎI VỀ ĐỊA CHỈ / VỊ TRÍ
    // ─────────────────────────────────────────────────────────────
    if (extractedFilter.intent === "CHECK_LOCATION") {
      if (specificHotel) {
        let locReply = `📍 **${specificHotel.name}** tọa lạc tại: **${specificHotel.address || ""}, ${specificHotel.city || "Việt Nam"}**.\n\n`;
        locReply += `• Vị trí cách trung tâm thành phố khoảng **${specificHotel.distance_to_center} km**, rất thuận tiện đi lại ăn uống và mua sắm.\n`;
        if (specificHotel.is_beachfront) {
          locReply += `• Đặc biệt, khách sạn nằm **sát biển**, chỉ vài bước chân là ra đến bãi tắm!\n`;
        }
        locReply += `Bạn có thể bấm vào thẻ bên dưới để xem đường đi và thông tin phòng nhé!`;

        await logTurn(
          userId,
          session_id,
          message.trim(),
          extractedFilter,
          locReply,
        );
        return res.json({
          success: true,
          reply: locReply,
          suggestions: [],
          filter: extractedFilter,
        });
      }
    }

    // ─────────────────────────────────────────────────────────────
    // NHÁNH 3: KHÁCH HỎI VỀ GIÁ PHÒNG
    // ─────────────────────────────────────────────────────────────
    if (extractedFilter.intent === "CHECK_PRICE" && specificHotel) {
      let priceReply = `💰 **Bảng giá phòng tham khảo tại ${specificHotel.name}:**\n\n`;
      try {
        const priceRooms = await pool.query(
          `SELECT name, base_price, hourly_price FROM public.room WHERE hotel_id = $1 ORDER BY base_price ASC`,
          [specificHotel.id],
        );
        priceRooms.rows.forEach((r) => {
          const hourText = r.hourly_price
            ? `từ **${Number(r.hourly_price).toLocaleString("vi-VN")} đ / giờ**`
            : "Chỉ nhận theo ngày đêm";
          const dayP = Number(r.base_price).toLocaleString("vi-VN");
          priceReply += `• **${r.name}:**\n  - Thuê theo giờ: ${hourText}\n  - Thuê ngày đêm: từ **${dayP} đ / đêm**\n`;
        });
      } catch {
        priceReply += `• Thuê ngày đêm: từ **650.000 đ / đêm**\n`;
      }
      priceReply += `\nGiá trên đã bao gồm thuế và tất cả các phí dịch vụ bạn nhé!`;

      await logTurn(
        userId,
        session_id,
        message.trim(),
        extractedFilter,
        priceReply,
      );
      return res.json({
        success: true,
        reply: priceReply,
        suggestions: [],
        filter: extractedFilter,
      });
    }

    // ─────────────────────────────────────────────────────────────
    // NHÁNH 4: CÁC CÂU HỎI FAQ
    // ─────────────────────────────────────────────────────────────
    if (extractedFilter.intent === "FAQ_PAYMENT") {
      const payReply =
        "💳 **GoStay hỗ trợ các phương thức thanh toán linh hoạt sau:**\n\n" +
        "1. **Thanh toán tại chỗ nghỉ (Tiền mặt):** Nhận phòng xong thanh toán trực tiếp cho Lễ tân.\n" +
        "2. **Chuyển khoản Ngân hàng (Mã VietQR):** Quét mã QR thanh toán tức thì.\n" +
        "3. **Ví điện tử & Thẻ quốc tế:** Hỗ trợ MoMo, VNPAY, Thẻ ATM và Visa/MasterCard.";
      await logTurn(
        userId,
        session_id,
        message.trim(),
        extractedFilter,
        payReply,
      );
      return res.json({
        success: true,
        reply: payReply,
        suggestions: [],
        filter: extractedFilter,
      });
    }

    if (extractedFilter.intent === "FAQ_CANCELLATION") {
      const cancelReply =
        "📝 **Chính sách hủy phòng trên hệ thống GoStay:**\n\n" +
        "• **Miễn phí hủy phòng:** Đa số các chỗ nghỉ trên GoStay đều hỗ trợ miễn phí hủy trước từ 24h đến 48h so với giờ nhận phòng quy định.\n" +
        "• Bạn có thể xem hạn hủy cụ thể tại phần mô tả từng phòng trước khi bấm Đặt phòng nhé!";
      await logTurn(
        userId,
        session_id,
        message.trim(),
        extractedFilter,
        cancelReply,
      );
      return res.json({
        success: true,
        reply: cancelReply,
        suggestions: [],
        filter: extractedFilter,
      });
    }

    if (extractedFilter.intent === "FAQ_SUPPORT") {
      const supportReply =
        "📞 **Kênh hỗ trợ khách hàng của GoStay:**\n\n" +
        "• **Tổng đài CSKH GoStay:** **1900 8888** (Phục vụ 8:00 - 22:00 hàng ngày)\n" +
        "• **Email hỗ trợ sự cố:** **support@gostay.vn**\n\n" +
        "Nếu bạn cần hỏi riêng dịch vụ của từng khách sạn, bạn có thể bấm nút **'Đặt câu hỏi'** trên thẻ phòng đó để lấy số điện thoại lễ tân cơ sở nhé!";
      await logTurn(
        userId,
        session_id,
        message.trim(),
        extractedFilter,
        supportReply,
      );
      return res.json({
        success: true,
        reply: supportReply,
        suggestions: [],
        filter: extractedFilter,
      });
    }

    if (extractedFilter.intent === "THANKS") {
      const thanksReply =
        "Dạ không có gì ạ! Rất vui được hỗ trợ bạn. Chúc bạn tìm được chỗ nghỉ ưng ý và có kỳ nghỉ tuyệt vời cùng GoStay! 😊";
      await logTurn(
        userId,
        session_id,
        message.trim(),
        extractedFilter,
        thanksReply,
      );
      return res.json({
        success: true,
        reply: thanksReply,
        suggestions: [],
        filter: extractedFilter,
      });
    }

    if (extractedFilter.intent === "GOODBYE") {
      const byeReply =
        "Tạm biệt bạn nhé! Chúc bạn một ngày tốt lành. Bất cứ khi nào cần tìm phòng khách sạn giá tốt, GoStay AI luôn sẵn sàng hỗ trợ 24/7! 👋";
      await logTurn(
        userId,
        session_id,
        message.trim(),
        extractedFilter,
        byeReply,
      );
      return res.json({
        success: true,
        reply: byeReply,
        suggestions: [],
        filter: extractedFilter,
      });
    }

    if (
      extractedFilter.intent === "GREETING" &&
      !extractedFilter.city &&
      !extractedFilter.maxPrice
    ) {
      const greetingReply =
        "Xin chào! Tôi là trợ lý du lịch ảo GoStay. Tôi có thể giúp bạn tìm phòng theo giờ, qua đêm hoặc theo ngày với giá tốt nhất giữa các cơ sở lưu trú. Bạn dự định đi đâu?";
      await logTurn(
        userId,
        session_id,
        message.trim(),
        extractedFilter,
        greetingReply,
      );
      return res.json({
        success: true,
        reply: greetingReply,
        suggestions: [],
        filter: extractedFilter,
      });
    }

    // ─────────────────────────────────────────────────────────────
    // NHÁNH 5: HỎI CHI TIẾT 1 KHÁCH SẠN CỤ THỂ
    // ─────────────────────────────────────────────────────────────
    if (
      specificHotel &&
      (normMsg.includes("thong tin") ||
        normMsg.includes("chi tiet") ||
        normMsg.includes("co gi") ||
        normMsg.includes("cho toi biet") ||
        normMsg.includes("khach san"))
    ) {
      const roomsRes = await pool.query(
        `SELECT r.*,
           r.hourly_price AS hourly_p,
           r.base_price AS daily_p
         FROM public.room r
         WHERE r.hotel_id = $1
         ORDER BY r.base_price ASC`,
        [specificHotel.id],
      );

      const roomCount = roomsRes.rows.length;
      const hourRooms = roomsRes.rows.filter(
        (r) => r.hourly_p && r.hourly_p > 0,
      );
      const minHourPrice =
        hourRooms.length > 0
          ? Math.min(...hourRooms.map((r) => r.hourly_p))
          : null;
      const minDailyPrice =
        roomCount > 0
          ? Math.min(...roomsRes.rows.map((r) => r.daily_p))
          : 650000;

      let detailReply = `🏨 **Thông tin cơ sở lưu trú: ${specificHotel.name}**\n\n`;
      detailReply += `📍 **Địa chỉ:** ${specificHotel.address || ""}, ${specificHotel.city || "Việt Nam"} (Cách trung tâm ${specificHotel.distance_to_center} km)\n`;
      detailReply += `⭐ **Tiêu chuẩn:** ${specificHotel.star_rating || 3} sao\n`;
      detailReply += `📞 **Hotline Lễ tân:** **${specificHotel.phone || "Quầy lễ tân phục vụ khi đến"}** (Hỗ trợ nhận phòng sớm, gửi đồ...)\n`;
      detailReply += `🛏️ **Hạng phòng:** Hiện có ${roomCount} loại phòng đang mở bán trực tuyến.\n`;
      detailReply += `💰 **Giá tham khảo:**\n`;
      if (minHourPrice) {
        detailReply += `   • Theo giờ: từ **${Number(minHourPrice).toLocaleString("vi-VN")} đ / giờ**\n`;
      } else {
        detailReply += `   • Theo giờ: Không áp dụng (chỉ bán ngày đêm)\n`;
      }
      detailReply += `   • Theo ngày đêm: từ **${Number(minDailyPrice).toLocaleString("vi-VN")} đ / đêm**\n\n`;

      if (specificHotel.description) {
        detailReply += `📝 **Mô tả:** ${specificHotel.description}\n\n`;
      }
      detailReply += `Mời bạn xem chi tiết các hạng phòng của **${specificHotel.name}** bên dưới nhé:`;

      const hotelSuggestions = roomsRes.rows.slice(0, 3).map((r) => ({
        hotel_id: specificHotel.id,
        room_id: r.id,
        hotel_name: specificHotel.name,
        room_name: r.name,
        city: specificHotel.city,
        address: specificHotel.address,
        star_rating: specificHotel.star_rating,
        average_rating: specificHotel.average_rating,
        review_count: specificHotel.review_count,
        hotel_image: specificHotel.hotel_image,
        is_beachfront: specificHotel.is_beachfront,
        distance_to_center: specificHotel.distance_to_center,
        price: r.hourly_p || r.daily_p,
        base_price: r.daily_p,
      }));

      await logTurn(
        userId,
        session_id,
        message.trim(),
        extractedFilter,
        detailReply,
      );
      return res.json({
        success: true,
        reply: detailReply,
        suggestions: hotelSuggestions,
        filter: extractedFilter,
      });
    }

    // ─────────────────────────────────────────────────────────────
    // NHÁNH 6: TÌM KIẾM PHÒNG (SEARCH_HOTEL)
    // ─────────────────────────────────────────────────────────────

    // Nếu khách không cung cấp thành phố và không tìm biển
    if (!extractedFilter.city && !extractedFilter.is_beachfront) {
      const guestText =
        extractedFilter.adults > 1
          ? ` cho **${extractedFilter.adults} người**`
          : "";
      const askCityReply = `Dạ bạn muốn tìm phòng${guestText} ở **thành phố nào** ạ (VD: Sài Gòn, Vũng Tàu, Đà Nẵng, Nha Trang, Đà Lạt...)? Bạn cho mình biết thêm ngày nhận phòng để mình lọc giá tốt nhất cho bạn nhé! 😊`;

      await logTurn(
        userId,
        session_id,
        message.trim(),
        extractedFilter,
        askCityReply,
      );
      return res.json({
        success: true,
        reply: askCityReply,
        suggestions: [],
        filter: extractedFilter,
      });
    }

    const cityName = extractedFilter.city
      ? formatTitleCase(extractedFilter.city)
      : extractedFilter.is_beachfront
        ? "gần biển"
        : "toàn hệ thống";

    // 🌟 KIỂM TRA THÔNG MINH: Thành phố này đã có khách sạn nào trong DB chưa?
    if (extractedFilter.city && extractedFilter.cityQuery) {
      const cityCheckRes = await pool.query(
        `SELECT 1 FROM public.hotel h 
         WHERE h.status::text IN ('active', 'approved') 
           AND (LOWER(h.city) LIKE LOWER($1) OR LOWER(h.city) LIKE LOWER($2) OR LOWER(h.address) LIKE LOWER($1) OR LOWER(h.address) LIKE LOWER($2)) 
         LIMIT 1`,
        [
          `%${extractedFilter.cityQuery[0]}%`,
          `%${extractedFilter.cityQuery[1]}%`,
        ],
      );

      // Nếu trong DB chưa có khách sạn nào ở thành phố này
      if (cityCheckRes.rows.length === 0) {
        const noPartnerReply = `Dạ hiện tại hệ thống GoStay chưa có cơ sở lưu trú đối tác nào tại **${cityName}** ạ. Bạn có muốn tham khảo các khách sạn giá tốt đang mở bán tại **Vũng Tàu** hoặc **Hồ Chí Minh** không? 😊`;
        await logTurn(
          userId,
          session_id,
          message.trim(),
          extractedFilter,
          noPartnerReply,
        );
        return res.json({
          success: true,
          reply: noPartnerReply,
          suggestions: [],
          filter: extractedFilter,
        });
      }
    }

    const checkIn = extractedFilter.checkIn || getRelativeDateVN(0);
    const checkOut =
      extractedFilter.checkOut ||
      (extractedFilter.rentalType === "HOUR" ? checkIn : getRelativeDateVN(1));

    const isBeachfrontCondition = `
      (
        COALESCE(h.is_beachfront, false) = true
        OR ar.room_view = 'sea_view'
        OR LOWER(h.name) LIKE '%song%' OR LOWER(h.name) LIKE '%sóng%'
        OR LOWER(h.name) LIKE '%beach%' OR LOWER(h.name) LIKE '%sea%' 
        OR LOWER(h.address) LIKE '%thuy van%' OR LOWER(h.address) LIKE '%thùy vân%' 
        OR LOWER(h.address) LIKE '%ha long%' OR LOWER(h.address) LIKE '%hạ long%' 
        OR LOWER(h.address) LIKE '%tran phu%' OR LOWER(h.address) LIKE '%trần phú%' 
        OR LOWER(h.address) LIKE '%vo nguyen giap%' OR LOWER(h.address) LIKE '%võ nguyên giáp%'
      )
    `;

    const poolCondition = `
      (
        ar.room_view = 'pool_view'
        OR LOWER(ar.name) LIKE '%ho boi%' OR LOWER(ar.name) LIKE '%pool%'
        OR LOWER(h.description) LIKE '%ho boi%' OR LOWER(h.description) LIKE '%hồ bơi%'
        OR LOWER(h.name) LIKE '%pool%' OR LOWER(h.name) LIKE '%resort%'
      )
    `;

    const bathtubCondition = `
      (
        ar.room_view = 'bathtub'
        OR LOWER(ar.name) LIKE '%bon tam%' OR LOWER(ar.name) LIKE '%bồn tắm%'
        OR LOWER(ar.name) LIKE '%bathtub%'
        OR LOWER(ar.description) LIKE '%bon tam%' OR LOWER(ar.description) LIKE '%bồn tắm%'
        OR LOWER(ar.amenities::text) LIKE '%bathtub%' 
        OR LOWER(ar.amenities::text) LIKE '%bon_tam%' 
        OR LOWER(ar.amenities::text) LIKE '%bon tam%'
      )
    `;

    let priceColumnFormula = "r.base_price";
    let extraRoomCondition = "AND COALESCE(r.base_price, 0) > 0";

    if (extractedFilter.rentalType === "HOUR") {
      priceColumnFormula = "r.hourly_price";
      extraRoomCondition +=
        " AND r.hourly_price IS NOT NULL AND r.hourly_price > 0";
    } else if (extractedFilter.rentalType === "OVERNIGHT") {
      priceColumnFormula = "COALESCE(r.overnight_price, r.base_price)";
    } else if (extractedFilter.rentalType === "HALF_DAY") {
      priceColumnFormula =
        "COALESCE(r.half_day_price, ROUND(r.base_price * 0.8)::int)";
    }

    const queryRooms = async (
      withBeach = true,
      withCenter = true,
      withPool = true,
      withBathtub = true,
    ) => {
      const params = [checkIn, checkOut];
      let paramIdx = 3;

      let roomQuery = `
        WITH stay_nights AS (
          SELECT generate_series(
            $1::date, 
            GREATEST($1::date, ($2::date - INTERVAL '1 day')::date), 
            INTERVAL '1 day'
          )::date AS night_date
        ), 
        nightly_status AS (
          SELECT r.id AS room_id, sn.night_date,
            ${priceColumnFormula} AS calculated_price,
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
          WHERE 1=1 ${extraRoomCondition}
        ),
        available_rooms AS (
          SELECT 
            r.id AS room_id, 
            r.hotel_id, 
            r.name AS room_name, 
            r.base_price,
            r.hourly_price,
            r.overnight_price,
            r.half_day_price,
            r.capacity, 
            r.room_view,
            r.description,
            r.amenities,
            MIN(ns.available_count)::int AS remaining_rooms,
            ROUND(AVG(ns.calculated_price))::int AS price
          FROM public.room r
          JOIN nightly_status ns ON ns.room_id = r.id
          GROUP BY r.id
          HAVING MIN(ns.available_count) > 0
        ),
        ranked_hotels AS (
          SELECT 
            ar.*,
            h.name AS hotel_name, 
            h.city, 
            h.address, 
            h.phone,
            h.star_rating, 
            COALESCE(h.average_rating, 0) AS average_rating,
            COALESCE(h.review_count, 0) AS review_count,
            h.description AS hotel_description,
            COALESCE(h.is_beachfront, false) AS is_beachfront,
            COALESCE(h.distance_to_center, 1.2) AS distance_to_center,
            COALESCE(
              (SELECT img.path FROM public.image img WHERE img.hotel_id = h.id ORDER BY img.is_thumbnail DESC, img.created_at ASC LIMIT 1),
              'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600'
            ) AS hotel_image,
            ROW_NUMBER() OVER(PARTITION BY h.id ORDER BY ar.price ASC, ar.base_price ASC) as rn
          FROM available_rooms ar
          JOIN public.hotel h ON h.id = ar.hotel_id
          WHERE h.status::text IN ('active', 'approved')
      `;

      if (extractedFilter.capacity && extractedFilter.capacity > 1) {
        params.push(extractedFilter.capacity);
        roomQuery += ` AND ar.capacity >= $${paramIdx}`;
        paramIdx++;
      }

      if (extractedFilter.city && extractedFilter.cityQuery) {
        params.push(`%${extractedFilter.cityQuery[0]}%`);
        params.push(`%${extractedFilter.cityQuery[1]}%`);
        roomQuery += ` AND (
          LOWER(h.city) LIKE LOWER($${paramIdx})
          OR LOWER(h.city) LIKE LOWER($${paramIdx + 1})
          OR LOWER(h.address) LIKE LOWER($${paramIdx})
          OR LOWER(h.address) LIKE LOWER($${paramIdx + 1})
        )`;
        paramIdx += 2;
      }

      if (extractedFilter.is_beachfront && withBeach) {
        roomQuery += ` AND ${isBeachfrontCondition}`;
      }

      if (extractedFilter.amenity_pool && withPool) {
        roomQuery += ` AND ${poolCondition}`;
      }

      if (extractedFilter.amenity_bathtub && withBathtub) {
        roomQuery += ` AND ${bathtubCondition}`;
      }

      if (extractedFilter.near_center && withCenter) {
        roomQuery += ` AND COALESCE(h.distance_to_center, 1.2) <= 3.5`;
      }

      if (extractedFilter.maxPrice && Number(extractedFilter.maxPrice) > 0) {
        params.push(extractedFilter.maxPrice);
        roomQuery += ` AND ar.price <= $${paramIdx}`;
        paramIdx++;
      }

      const orderClause = extractedFilter.sortByCheapest
        ? "ORDER BY price ASC, star_rating DESC"
        : "ORDER BY star_rating DESC, price ASC";

      roomQuery += ` 
        )
        SELECT * FROM ranked_hotels 
        WHERE rn = 1
        ${orderClause}
        LIMIT 4;
      `;

      try {
        const qRes = await pool.query(roomQuery, params);
        return qRes.rows;
      } catch (err) {
        console.error("SQL Query error:", err.message);
        return [];
      }
    };

    let matchedRooms = await queryRooms(true, true, true, true);
    let fallbackBathtub = false;

    // Nếu tìm phòng có bồn tắm mà không có, tự động nới lỏng lấy phòng đẹp khác tại thành phố đó
    if (matchedRooms.length === 0 && extractedFilter.amenity_bathtub) {
      matchedRooms = await queryRooms(true, true, true, false);
      if (matchedRooms.length > 0) {
        fallbackBathtub = true;
      }
    }

    if (matchedRooms.length === 0 && extractedFilter.amenity_pool) {
      matchedRooms = await queryRooms(true, true, false, false);
    }
    if (matchedRooms.length === 0 && extractedFilter.near_center) {
      matchedRooms = await queryRooms(true, false, false, false);
    }

    let fallbackWithoutBeach = false;

    if (
      matchedRooms.length === 0 &&
      extractedFilter.is_beachfront &&
      extractedFilter.city
    ) {
      matchedRooms = await queryRooms(false, false, false, false);
      if (matchedRooms.length > 0) {
        fallbackWithoutBeach = true;
      }
    }

    if (matchedRooms.length > 0) {
      extractedFilter.lastHotelId = matchedRooms[0].hotel_id;
      extractedFilter.lastHotelName = matchedRooms[0].hotel_name;
    }

    // ─────────────────────────────────────────────────────────────
    // XÂY DỰNG CÂU TRẢ LỜI TỰ ĐỘNG BIẾN HÓA THEO ĐÚNG NGỮ CẢNH
    // ─────────────────────────────────────────────────────────────
    const contextFeatures = [];
    if (extractedFilter.is_beachfront && extractedFilter.near_center) {
      contextFeatures.push("vừa sát biển vừa gần trung tâm");
    } else if (extractedFilter.is_beachfront) {
      contextFeatures.push("sát biển view đẹp");
    } else if (extractedFilter.near_center) {
      contextFeatures.push("có vị trí thuận tiện gần trung tâm");
    }

    if (extractedFilter.amenity_pool) {
      contextFeatures.push("có hồ bơi");
    }
    if (extractedFilter.amenity_bathtub && !fallbackBathtub) {
      contextFeatures.push("có bồn tắm thư giãn");
    }

    const featureDesc =
      contextFeatures.length > 0 ? ` ${contextFeatures.join(", ")}` : "";

    const rentalDesc =
      extractedFilter.rentalType === "HOUR"
        ? `thuê theo giờ (${extractedFilter.hours || 2} tiếng)`
        : extractedFilter.rentalType === "OVERNIGHT"
          ? "thuê qua đêm"
          : extractedFilter.rentalType === "HALF_DAY"
            ? "thuê theo buổi"
            : "theo ngày đêm";

    const priceDesc = extractedFilter.sortByCheapest
      ? "với mức giá rẻ nhất"
      : extractedFilter.maxPrice && Number(extractedFilter.maxPrice) > 0
        ? `với giá dưới ${(extractedFilter.maxPrice >= 1000000 ? extractedFilter.maxPrice / 1000000 : extractedFilter.maxPrice / 1000).toLocaleString("vi-VN")}${extractedFilter.maxPrice >= 1000000 ? " triệu" : "k"}`
        : "giá tốt nhất";

    let botReply = "";

    if (fallbackBathtub) {
      botReply = `Dạ hiện tại ở **${cityName}** chưa có phòng trang bị bồn tắm nằm còn trống, nhưng mình gợi ý cho bạn **${matchedRooms.length} chỗ nghỉ có phòng đẹp, giá tốt nhất** tại ${cityName} ${rentalDesc} ${priceDesc} nhé 👇`;
    } else if (fallbackWithoutBeach) {
      botReply = `Dạ hiện tại ở **${cityName}** chưa có chỗ nghỉ sát biển trống phù hợp, nhưng mình đã chọn lọc cho bạn **${matchedRooms.length} chỗ nghỉ có vị trí đẹp, giá tốt nhất** tại ${cityName} ${rentalDesc} ${priceDesc} nhé 👇`;
    } else if (extractedFilter.is_beachfront && matchedRooms.length === 0) {
      const targetArea = extractedFilter.city ? `tại ${cityName}` : "gần biển";
      const otherCities = ["Vũng Tàu", "Đà Nẵng", "Nha Trang", "Phú Quốc"]
        .filter(
          (c) => normalizeText(c) !== normalizeText(extractedFilter.city || ""),
        )
        .join(", ");

      botReply = `Dạ hiện tại hệ thống chưa tìm thấy chỗ nghỉ giáp biển nào ${targetArea} còn phòng trống phù hợp yêu cầu. Bạn có muốn thử tìm phòng tại các thành phố biển khác như **${otherCities}** không? 🌊`;

      await logTurn(
        userId,
        session_id,
        message.trim(),
        extractedFilter,
        botReply,
      );
      return res.json({
        success: true,
        reply: botReply,
        suggestions: [],
        filter: extractedFilter,
      });
    } else if (matchedRooms.length > 0) {
      let groupAdvice = "";
      if (extractedFilter.isGroupBooking) {
        groupAdvice = `\n*(💡 Mẹo: Với đoàn ${extractedFilter.adults} người, bạn có thể tham khảo đặt từ 2 - 3 phòng để lưu trú thoải mái nhất nhé!)*\n`;
      }

      botReply = `Mình vừa tìm thấy **${matchedRooms.length} chỗ nghỉ tiêu biểu${featureDesc}** tại ${cityName} ${rentalDesc} ${priceDesc}.${groupAdvice} Mời bạn lướt xem các gợi ý bên dưới nhé 👇`;
    } else {
      const criteriaFailed =
        contextFeatures.length > 0 ? ` ${contextFeatures.join(", ")}` : "";
      botReply = `Hiện tại mình chưa tìm thấy phòng nào${criteriaFailed} còn trống tại ${cityName || "khu vực này"} ${rentalDesc} ${priceDesc}. Bạn có muốn thử nâng ngân sách lên một chút hoặc đổi ngày không?`;
    }

    await logTurn(
      userId,
      session_id,
      message.trim(),
      extractedFilter,
      botReply,
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
    console.error("❌ CHATBOT ERROR:", error);
    return res.json({
      success: true,
      reply:
        "Dạ tôi đã ghi nhận yêu cầu của bạn. Bạn có thể thử tìm theo thành phố (VD: Sài Gòn, Vũng Tàu, Đà Nẵng) hoặc bấm vào các gợi ý bên dưới nhé!",
      suggestions: [],
      filter: {},
    });
  }
}

async function logTurn(userId, sessionId, userMsg, filterObj, botMsg) {
  try {
    await pool.query(
      `INSERT INTO public.chatbot_log (
         id, user_id, session_id, role, message, extracted_filter, created_at
       ) VALUES (
         gen_random_uuid(), $1, $2, 'user', $3, $4, NOW()
       )`,
      [userId, sessionId, userMsg, JSON.stringify(filterObj)],
    );

    await pool.query(
      `INSERT INTO public.chatbot_log (
         id, user_id, session_id, role, message, extracted_filter, created_at
       ) VALUES (
         gen_random_uuid(), $1, $2, 'assistant', $3, NULL, NOW()
       )`,
      [userId, sessionId, botMsg],
    );
  } catch (e) {
    console.warn("Could not log chat turn:", e.message);
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
