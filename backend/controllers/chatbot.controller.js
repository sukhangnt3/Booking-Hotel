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
    return text.includes("bon tam") || text.includes("bathtub");
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

  if (
    normalizedText.includes("dieu hoa") ||
    normalizedText.includes("may lanh") ||
    normalizedText.includes("air conditioner")
  ) {
    checkAmenityKey = "air_conditioner";
    checkAmenityLabel = "điều hòa máy lạnh";
    if (
      normalizedText.includes("co") ||
      normalizedText.includes("khong") ||
      normalizedText.includes("k")
    ) {
      intent = "CHECK_AMENITY";
    }
  } else if (
    normalizedText.includes("wifi") ||
    normalizedText.includes("mang")
  ) {
    checkAmenityKey = "wifi";
    checkAmenityLabel = "Wi-Fi tốc độ cao";
    if (
      normalizedText.includes("co") ||
      normalizedText.includes("khong") ||
      normalizedText.includes("k")
    ) {
      intent = "CHECK_AMENITY";
    }
  } else if (
    /\b(bai do xe|cho do xe|cho de xe|bai xe|xe hoi|o to)\b/.test(
      normalizedText,
    )
  ) {
    checkAmenityKey = "parking";
    checkAmenityLabel = "bãi đỗ xe ô tô";
    if (
      normalizedText.includes("co") ||
      normalizedText.includes("khong") ||
      normalizedText.includes("k")
    ) {
      intent = "CHECK_AMENITY";
    }
  } else if (
    normalizedText.includes("thang may") ||
    normalizedText.includes("elevator")
  ) {
    checkAmenityKey = "elevator";
    checkAmenityLabel = "thang máy di chuyển";
    if (normalizedText.includes("co") || normalizedText.includes("khong")) {
      intent = "CHECK_AMENITY";
    }
  } else if (
    normalizedText.includes("bon tam") ||
    normalizedText.includes("bathtub")
  ) {
    checkAmenityKey = "bathtub";
    checkAmenityLabel = "bồn tắm nằm thư giãn";
    if (normalizedText.includes("co") || normalizedText.includes("khong")) {
      intent = "CHECK_AMENITY";
    }
  } else if (
    normalizedText.includes("ho boi") ||
    normalizedText.includes("be boi") ||
    normalizedText.includes("pool")
  ) {
    checkAmenityKey = "pool";
    checkAmenityLabel = "hồ bơi";
    if (normalizedText.includes("co") || normalizedText.includes("khong")) {
      intent = "CHECK_AMENITY";
    }
  } else if (
    normalizedText.includes("an sang") ||
    normalizedText.includes("bua sang") ||
    normalizedText.includes("buffet")
  ) {
    checkAmenityKey = "breakfast";
    checkAmenityLabel = "bữa sáng";
    if (normalizedText.includes("co") || normalizedText.includes("khong")) {
      intent = "CHECK_AMENITY";
    }
  }

  if (
    normalizedText.includes("o dau") ||
    normalizedText.includes("dia chi") ||
    normalizedText.includes("vi tri") ||
    normalizedText.includes("cach trung tam")
  ) {
    intent = "CHECK_LOCATION";
  }

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

  if (checkAmenityKey === "pool") filter.amenity_pool = true;
  if (checkAmenityKey === "bathtub") filter.amenity_bathtub = true;
  if (checkAmenityKey === "air_conditioner") filter.amenity_ac = true;

  const guestMatch = normalizedText.match(/(\d+)\s*(?:nguoi|khach|adults|ban)/);
  if (guestMatch) {
    filter.adults = Math.max(1, Number(guestMatch[1]));
    filter.capacity = filter.adults;
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

  // Bóc tách yêu cầu view biển
  if (
    normalizedText.includes("sat bien") ||
    normalizedText.includes("giap bien") ||
    normalizedText.includes("gan bien") ||
    normalizedText.includes("view bien") ||
    normalizedText.includes("huong bien") ||
    normalizedText.includes("ven bien") ||
    normalizedText.includes("bien")
  ) {
    filter.is_beachfront = true;
  }

  if (
    normalizedText.includes("gan trung tam") ||
    normalizedText.includes("trung tam") ||
    normalizedText.includes("noi thanh")
  ) {
    filter.near_center = true;
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
    filter.checkOut =
      filter.rentalType === "HOUR" ? getRelativeDate(0) : getRelativeDate(1);
  } else if (normalizedText.includes("ngay mai")) {
    filter.checkIn = getRelativeDate(1);
    filter.checkOut =
      filter.rentalType === "HOUR" ? getRelativeDate(1) : getRelativeDate(2);
  }

  const hasHotelKeyword =
    normalizedText.includes("phong") ||
    normalizedText.includes("khach san") ||
    normalizedText.includes("cho nghi") ||
    normalizedText.includes("resort") ||
    normalizedText.includes("homestay") ||
    normalizedText.includes("thue") ||
    normalizedText.includes("dat");

  const hasSearchSlot =
    Boolean(filter.city) ||
    Boolean(filter.rentalType) ||
    Boolean(filter.maxPrice) ||
    Boolean(filter.is_beachfront) ||
    Boolean(filter.near_center) ||
    Boolean(filter.checkIn) ||
    hasHotelKeyword;

  if (!filter.intent && hasSearchSlot) {
    filter.intent = "SEARCH_HOTEL";
  }

  if (!filter.intent && !hasSearchSlot) {
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

    const merged = {
      ...previousFilter,
      ...currentFilter,
      intent: currentFilter.intent || previousFilter.intent || "SEARCH_HOTEL",
      lastHotelId:
        currentFilter.lastHotelId || previousFilter.lastHotelId || null,
      lastHotelName:
        currentFilter.lastHotelName || previousFilter.lastHotelName || null,
    };

    // Nếu câu mới khách tìm biển mà không nhắc thành phố thì bỏ thành phố cũ không có biển (như Sài Gòn/Hà Nội)
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

/**
 * CONTROLLER CHÍNH XỬ LÝ CHATBOT
 */
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

    // 1. Quét tìm khách sạn được nhắc đến
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
    for (const h of allHotelsRes.rows) {
      const normHName = normalizeText(h.name);
      if (normMsg.includes(normHName)) {
        specificHotel = h;
        extractedFilter.lastHotelId = h.id;
        extractedFilter.lastHotelName = h.name;
        break;
      }
    }

    if (!specificHotel && extractedFilter.lastHotelId) {
      if (
        normMsg.includes("khach san nay") ||
        normMsg.includes("o day") ||
        normMsg.includes("cho nay") ||
        normMsg.includes("phong nay")
      ) {
        specificHotel = allHotelsRes.rows.find(
          (h) => String(h.id) === String(extractedFilter.lastHotelId),
        );
      }
    }

    // ─────────────────────────────────────────────────────────────
    // NHÁNH 1: KHÁCH HỎI VỀ TIỆN ÍCH ("CÓ WIFI KHÔNG?", "CÓ ĐIỀU HÒA KHÔNG?")
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
          }

          if (!hotelHasAmenity && specificHotel.description) {
            hotelHasAmenity = checkAmenityExists(
              specificHotel.description,
              extractedFilter.checkAmenityKey,
            );
          }

          if (
            extractedFilter.checkAmenityKey === "wifi" ||
            extractedFilter.checkAmenityKey === "air_conditioner"
          ) {
            hotelHasAmenity = true;
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
            price: Number(r.hourly_price || Math.round(r.base_price * 0.25)),
            base_price: Number(r.base_price || 650000),
          }));
        } catch (e) {
          hotelHasAmenity = true;
        }

        if (hotelHasAmenity) {
          replyText = `Dạ có bạn nhé! Khách sạn **${specificHotel.name}** được trang bị đầy đủ **${amenityLabel}** miễn phí tại các phòng. Bạn có thể bấm vào thẻ bên dưới để xem chi tiết từng hạng phòng và đặt ngay nhé!`;
        } else {
          replyText = `Dạ hiện tại khách sạn **${specificHotel.name}** chưa trang bị **${amenityLabel}** bạn nha. Tuy nhiên, các phòng ở đây đều sạch sẽ, thoáng mát và có giá rất tốt đó ạ!`;
        }
      } else {
        if (extractedFilter.checkAmenityKey === "wifi") {
          replyText = `Dạ 100% tất cả các khách sạn trên hệ thống GoStay đều cung cấp **Wi-Fi tốc độ cao miễn phí** toàn khuôn viên bạn nhé!`;
        } else if (extractedFilter.checkAmenityKey === "air_conditioner") {
          replyText = `Dạ có bạn ơi! Hầu hết tất cả các khách sạn trên GoStay đều được trang bị đầy đủ **điều hòa máy lạnh 2 chiều** mát lạnh và bình nóng lạnh. Bạn đang tìm phòng ở thành phố nào để mình gợi ý nhé?`;
        } else if (extractedFilter.checkAmenityKey === "pool") {
          replyText = `Dạ trên GoStay có các resort và khách sạn có **hồ bơi ngoài trời / vô cực** view rất đẹp. Bạn đang dự định đi du lịch ở thành phố nào ạ?`;
        } else {
          replyText = `Dạ có bạn nhé! Nhiều khách sạn trên GoStay có hỗ trợ **${amenityLabel}**. Bạn muốn tìm phòng ở khu vực nào để mình lọc cho bạn nhé!`;
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
    if (extractedFilter.intent === "CHECK_LOCATION" && specificHotel) {
      let locReply = `📍 Khách sạn **${specificHotel.name}** tọa lạc tại: **${specificHotel.address || ""}, ${specificHotel.city || "Việt Nam"}**.\n\n`;
      locReply += `• Vị trí cách trung tâm khoảng **${specificHotel.distance_to_center} km**, rất thuận tiện đi lại ăn uống và mua sắm.\n`;
      if (specificHotel.is_beachfront) {
        locReply += `• Đặc biệt, khách sạn nằm **sát biển**, chỉ vài bước chân là ra đến bãi tắm!\n`;
      }
      locReply += `Bạn có thể xem thêm chi tiết phòng ở thẻ bên dưới nhé!`;

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
          const hourP = Number(
            r.hourly_price || Math.round(r.base_price * 0.25),
          ).toLocaleString("vi-VN");
          const dayP = Number(r.base_price).toLocaleString("vi-VN");
          priceReply += `• **${r.name}:**\n  - Thuê theo giờ: từ **${hourP} đ / giờ**\n  - Thuê ngày đêm: từ **${dayP} đ / đêm**\n`;
        });
      } catch {
        priceReply += `• Thuê theo giờ: từ **100.000 đ / giờ**\n• Thuê ngày đêm: từ **650.000 đ / đêm**\n`;
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
    // NHÁNH 4: CÁC CÂU HỎI VỀ SÀN GOSTAY & GIAO TIẾP
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
           COALESCE(r.hourly_price, ROUND(r.base_price * 0.25)::int) AS hourly_p,
           r.base_price AS daily_p
         FROM public.room r
         WHERE r.hotel_id = $1
         ORDER BY r.base_price ASC`,
        [specificHotel.id],
      );

      const roomCount = roomsRes.rows.length;
      const minHourPrice =
        roomCount > 0
          ? Math.min(...roomsRes.rows.map((r) => r.hourly_p))
          : 100000;
      const minDailyPrice =
        roomCount > 0
          ? Math.min(...roomsRes.rows.map((r) => r.daily_p))
          : 650000;

      let detailReply = `🏨 **Thông tin cơ sở lưu trú: ${specificHotel.name}**\n\n`;
      detailReply += `📍 **Địa chỉ:** ${specificHotel.address || ""}, ${specificHotel.city || "Việt Nam"}\n`;
      detailReply += `⭐ **Tiêu chuẩn:** ${specificHotel.star_rating || 3} sao\n`;
      detailReply += `📞 **Hotline Lễ tân:** **${specificHotel.phone || "Quầy lễ tân phục vụ khi đến"}** (Hỗ trợ nhận phòng sớm, gửi đồ...)\n`;
      detailReply += `🛏️ **Hạng phòng:** Hiện có ${roomCount} loại phòng đang mở bán trực tuyến.\n`;
      detailReply += `💰 **Giá tham khảo:**\n`;
      detailReply += `   • Theo giờ: từ **${Number(minHourPrice).toLocaleString("vi-VN")} đ / giờ**\n`;
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
        price: r.hourly_p,
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
    // NHÁNH 6: TÌM KIẾM PHÒNG (MỖI KHÁCH SẠN 1 PHÒNG RẺ NHẤT DUY NHẤT)
    // ─────────────────────────────────────────────────────────────
    const checkIn =
      extractedFilter.checkIn || new Date().toISOString().slice(0, 10);
    const checkOut =
      extractedFilter.checkOut ||
      (extractedFilter.rentalType === "HOUR"
        ? checkIn
        : new Date(Date.now() + 86400000).toISOString().slice(0, 10));

    // Điều kiện giáp biển
    const isBeachfrontCondition = `
      (
        COALESCE(h.is_beachfront, false) = true
        OR r.room_view = 'sea_view'
        OR h.name ILIKE '%Sóng%'
        OR h.name ILIKE '%Beach%' 
        OR h.name ILIKE '%Sea%' 
        OR h.address ILIKE '%Thùy Vân%' 
        OR h.address ILIKE '%Hạ Long%' 
        OR h.address ILIKE '%Trần Phú%' 
        OR h.address ILIKE '%Võ Nguyên Giáp%'
      )
    `;

    const poolCondition = `
      (
        r.room_view = 'pool_view'
        OR r.amenities::text ILIKE '%hồ bơi%'
        OR r.amenities::text ILIKE '%pool%'
        OR h.description ILIKE '%hồ bơi%'
        OR h.description ILIKE '%bể bơi%'
        OR h.name ILIKE '%pool%'
        OR h.name ILIKE '%resort%'
      )
    `;

    let priceColumnFormula = "r.base_price";
    if (extractedFilter.rentalType === "HOUR") {
      priceColumnFormula =
        "COALESCE(r.hourly_price, ROUND(r.base_price * 0.25)::int)";
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
          unaccent(lower(h.city)) ILIKE unaccent(lower($${paramIdx}))
          OR unaccent(lower(h.city)) ILIKE unaccent(lower($${paramIdx + 1}))
          OR unaccent(lower(h.address)) ILIKE unaccent(lower($${paramIdx}))
          OR unaccent(lower(h.address)) ILIKE unaccent(lower($${paramIdx + 1}))
        )`;
        paramIdx += 2;
      }

      if (extractedFilter.is_beachfront && withBeach) {
        roomQuery += ` AND ${isBeachfrontCondition}`;
      }

      if (extractedFilter.amenity_pool && withPool) {
        roomQuery += ` AND ${poolCondition}`;
      }

      if (extractedFilter.near_center && withCenter) {
        roomQuery += ` AND COALESCE(h.distance_to_center, 1.2) <= 2.5`;
      }

      if (extractedFilter.maxPrice && Number(extractedFilter.maxPrice) > 0) {
        params.push(extractedFilter.maxPrice);
        roomQuery += ` AND ar.price <= $${paramIdx}`;
        paramIdx++;
      }

      roomQuery += ` 
        )
        SELECT * FROM ranked_hotels 
        WHERE rn = 1
        ORDER BY star_rating DESC, price ASC
        LIMIT 4;
      `;

      try {
        const qRes = await pool.query(roomQuery, params);
        return qRes.rows;
      } catch (err) {
        console.warn("SQL Query error:", err.message);
        return [];
      }
    };

    // 1. Tìm phòng đáp ứng đầy đủ điều kiện (kể cả biển nếu có yêu cầu)
    let matchedRooms = await queryRooms(true, true, true);
    if (matchedRooms.length === 0 && extractedFilter.amenity_pool) {
      matchedRooms = await queryRooms(true, true, false);
    }
    if (matchedRooms.length === 0 && extractedFilter.near_center) {
      matchedRooms = await queryRooms(true, false, false);
    }

    let fallbackWithoutBeach = false;

    // 🌟 NẾU KHÁCH TÌM THÀNH PHỐ CỤ THỂ (như Nha Trang, Vũng Tàu)
    // Nhưng thành phố đó không có phòng giáp biển -> Tự động nới lỏng lấy các khách sạn tốt nhất tại thành phố đó
    if (
      matchedRooms.length === 0 &&
      extractedFilter.is_beachfront &&
      extractedFilter.city
    ) {
      matchedRooms = await queryRooms(false, false, false);
      if (matchedRooms.length > 0) {
        fallbackWithoutBeach = true; // Đánh dấu đã nới lỏng điều kiện biển
      }
    }

    let botReply = "";
    const rentalLabel =
      extractedFilter.rentalType === "HOUR"
        ? `theo giờ (${extractedFilter.hours || 2} giờ)`
        : extractedFilter.rentalType === "OVERNIGHT"
          ? "qua đêm"
          : extractedFilter.rentalType === "HALF_DAY"
            ? "theo buổi"
            : "theo ngày đêm";

    const priceText =
      extractedFilter.maxPrice && Number(extractedFilter.maxPrice) > 0
        ? `với giá dưới ${(extractedFilter.maxPrice >= 1000000 ? extractedFilter.maxPrice / 1000000 : extractedFilter.maxPrice / 1000).toLocaleString("vi-VN")}${extractedFilter.maxPrice >= 1000000 ? " triệu" : "k"}`
        : "giá tốt nhất";

    // Trường hợp 1: Có fallback vì không có khách sạn giáp biển nhưng có khách sạn đẹp khác tại thành phố đó
    if (fallbackWithoutBeach) {
      const cityName =
        extractedFilter.city.charAt(0).toUpperCase() +
        extractedFilter.city.slice(1);
      botReply = `Dạ hiện tại ở **${cityName}** chưa có chỗ nghỉ sát biển trống phù hợp, nhưng mình gợi ý cho bạn **${matchedRooms.length} chỗ nghỉ có vị trí đẹp, giá tốt nhất** tại ${cityName} ${rentalLabel} ${priceText} nhé 👇`;
    }
    // Trường hợp 2: Hoàn toàn không có khách sạn giáp biển và cũng không có phòng nào
    else if (extractedFilter.is_beachfront && matchedRooms.length === 0) {
      const targetArea = extractedFilter.city
        ? `tại ${extractedFilter.city}`
        : "gần biển";

      // Loại bỏ chính thành phố mà khách vừa tìm ra khỏi danh sách gợi ý
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
    }
    // Trường hợp 3: Tìm thấy kết quả bình thường
    else if (matchedRooms.length > 0) {
      const cityName = extractedFilter.city
        ? extractedFilter.city.charAt(0).toUpperCase() +
          extractedFilter.city.slice(1)
        : extractedFilter.is_beachfront
          ? "gần biển"
          : "toàn hệ thống";

      botReply = `Mình vừa tìm thấy **${matchedRooms.length} chỗ nghỉ tiêu biểu** tại ${cityName} ${rentalLabel} ${priceText}. Mời bạn lướt xem các gợi ý bên dưới nhé 👇`;
    }
    // Trường hợp 4: Không tìm thấy phòng nào theo yêu cầu chung
    else {
      const priceFailText =
        extractedFilter.maxPrice && Number(extractedFilter.maxPrice) > 0
          ? `thỏa mãn mức giá dưới ${(extractedFilter.maxPrice >= 1000000 ? extractedFilter.maxPrice / 1000000 : extractedFilter.maxPrice / 1000).toLocaleString("vi-VN")}${extractedFilter.maxPrice >= 1000000 ? " triệu" : "k"}`
          : "";

      botReply = `Hiện tại mình chưa tìm thấy phòng nào còn trống tại ${extractedFilter.city || "khu vực này"} ${priceFailText} ${rentalLabel}. Bạn có muốn thử nâng ngân sách lên một chút hoặc đổi ngày không?`;
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
