// backend/controllers/chatbot.controller.js
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
require("dotenv").config();

const pool = require("../config/database");
const { GoogleGenAI } = require("@google/genai");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
  ? process.env.GEMINI_API_KEY.trim()
  : null;

// 🌟 DANH SÁCH CÁC MODEL GEMINI DỰ PHÒNG TỰ ĐỘNG CHUYỂN KHI BỊ 503 QUÁ TẢI
const CANDIDATE_MODELS = [
  process.env.GEMINI_MODEL || "gemini-1.5-flash",
  "gemini-1.5-flash-8b",
  "gemini-2.0-flash",
  "gemini-1.5-pro",
];

let genai = null;
if (GEMINI_API_KEY) {
  try {
    genai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  } catch (err) {
    console.warn("⚠️ Chưa thể khởi tạo GoogleGenAI SDK:", err.message);
  }
}

function removeAccents(str) {
  return String(str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .trim();
}

function buildCityQuery(cityName, startIdx = 1) {
  if (!cityName) return { sql: "1=1", params: [] };

  const norm = removeAccents(cityName);
  const terms = new Set([cityName.trim().toLowerCase(), norm]);

  if (
    norm.includes("ho chi minh") ||
    norm.includes("sai gon") ||
    norm.includes("hcm")
  ) {
    terms.add("hồ chí minh");
    terms.add("ho chi minh");
    terms.add("sài gòn");
    terms.add("sai gon");
    terms.add("tphcm");
    terms.add("hcm");
  } else if (norm.includes("vung tau")) {
    terms.add("vũng tàu");
    terms.add("vung tau");
  } else if (norm.includes("da nang")) {
    terms.add("đà nẵng");
    terms.add("da nang");
  } else if (norm.includes("ha noi")) {
    terms.add("hà nội");
    terms.add("ha noi");
  } else if (norm.includes("da lat")) {
    terms.add("đà lạt");
    terms.add("da lat");
  } else if (norm.includes("nha trang")) {
    terms.add("nha trang");
  }

  const params = Array.from(terms).map((t) => `%${t}%`);
  const clauses = params.map(
    (_, i) =>
      `(LOWER(h.city) LIKE $${startIdx + i} OR LOWER(h.address) LIKE $${startIdx + i})`,
  );

  return { sql: `(${clauses.join(" OR ")})`, params };
}

// 🌟 HÀM GỌI GEMINI THÔNG MINH: TỰ ĐỘNG CHUYỂN MODEL KHI BỊ 503 (OVERLOAD) HOẶC 429
async function callGemini(prompt, config = {}) {
  if (!genai || !GEMINI_API_KEY) return null;

  for (const modelName of CANDIDATE_MODELS) {
    try {
      const res = await genai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          thinkingConfig: { thinkingBudget: 0 },
          maxOutputTokens: 1000,
          ...config,
        },
      });

      if (res && res.text) {
        return res.text.trim();
      }
    } catch (err) {
      const errStr = JSON.stringify(err);
      const isOverloaded =
        err.status === 503 ||
        err.code === 503 ||
        errStr.includes("503") ||
        errStr.includes("high demand") ||
        errStr.includes("UNAVAILABLE");

      if (isOverloaded) {
        console.warn(
          `⚠️ Model [${modelName}] của Google đang quá tải (503). Tự động chuyển sang model tiếp theo...`,
        );
        // Đợi 300ms rồi thử model tiếp theo trong danh sách
        await new Promise((r) => setTimeout(r, 300));
        continue;
      }

      if (err.status === 429 || err.code === 429) {
        console.warn(
          `⚠️ Model [${modelName}] chạm rate-limit. Đang thử model khác...`,
        );
        continue;
      }

      console.error(`❌ Lỗi tại model [${modelName}]:`, err.message);
    }
  }

  console.warn(
    "⚠️ Tất cả các model Gemini đều đang bận. Kích hoạt chế độ dự phòng nội bộ!",
  );
  return null;
}

// ============================================================
// 1. PHÂN TÍCH TRUY VẤN PHỨC TẠP BẰNG GEMINI NLU
// ============================================================
async function aiAnalyzeRequest(userMessage, conversationHistory) {
  const prompt = `
Bạn là GoStay AI - Trợ lý tìm kiếm phòng khách sạn thông minh. Nhiệm vụ của bạn là phân tích tin nhắn người dùng và trích xuất TOÀN BỘ các điều kiện tìm kiếm phức tạp.
Lịch sử trò chuyện:
${conversationHistory || "Chưa có"}

Tin nhắn mới: "${userMessage}"

QUY TẮC BÓC TÁCH THÔNG TIN:
1. Nếu khách hỏi thông tin địa lý, du lịch, hỏi thăm thông thường:
   - isSearch: false
   - directReply: Tự viết câu trả lời thân thiện, dí dỏm, đầy đủ.
2. Nếu khách có nhu cầu tìm phòng (hỗ trợ câu truy vấn phức tạp nhiều ràng buộc):
   - isSearch: true
   - city: Tên thành phố chuẩn ('Hồ Chí Minh', 'Vũng Tàu', 'Đà Nẵng', 'Hà Nội', 'Đà Lạt', 'Nha Trang') hoặc null nếu khách không chỉ định.
   - rentalType: 'HOUR', 'OVERNIGHT', hoặc 'DAY'.
   - maxPrice: Mức giá trần dạng số nguyên VND (ví dụ: 1500000) hoặc null.
   - isBeachfront: true nếu yêu cầu sát biển, view biển, gần bãi tắm.
   - nearCenter: true nếu yêu cầu gần trung tâm thành phố.
   - minStars: Số sao tối thiểu (từ 1 đến 5) hoặc null nếu không đề cập.
   - requiredAmenities: Mảng danh sách các tiện nghi được yêu cầu (ví dụ: ["bathtub", "pool_outdoor", "wifi", "parking", "restaurant"]) hoặc [].

TRẢ VỀ DUY NHẤT MỘT ĐỐI TƯỢNG JSON HỢP LỆ (KHÔNG KÈM KÝ TỰ MARKDOWN BACKTICKS):
{
  "isSearch": boolean,
  "city": string | null,
  "rentalType": "DAY" | "HOUR" | "OVERNIGHT",
  "maxPrice": number | null,
  "isBeachfront": boolean,
  "nearCenter": boolean,
  "minStars": number | null,
  "requiredAmenities": string[],
  "directReply": string | null
}
`;

  const rawJson = await callGemini(prompt, {
    responseMimeType: "application/json",
    temperature: 0.1,
  });

  if (rawJson) {
    try {
      let clean = rawJson
        .replace(/^```json/i, "")
        .replace(/^```/, "")
        .replace(/```$/, "")
        .trim();
      return JSON.parse(clean);
    } catch (e) {
      console.warn(
        "⚠️ Không thể parse JSON từ Gemini, chuyển sang fallback regex",
      );
    }
  }

  // Fallback Rule-based dự phòng nếu Google nghẽn
  const norm = removeAccents(userMessage);
  let city = null;
  if (
    norm.includes("sai gon") ||
    norm.includes("ho chi minh") ||
    norm.includes("hcm")
  ) {
    city = "Hồ Chí Minh";
  }
  if (norm.includes("vung tau")) city = "Vũng Tàu";
  if (norm.includes("da nang")) city = "Đà Nẵng";
  if (norm.includes("ha noi")) city = "Hà Nội";
  if (norm.includes("da lat")) city = "Đà Lạt";
  if (norm.includes("nha trang")) city = "Nha Trang";

  let maxPrice = null;
  const priceMatch = norm.match(
    /(?:duoi|tam|khoang|gia)\s*(\d+(?:[.,]\d+)?)\s*(k|tr|trieu)?/,
  );
  if (priceMatch) {
    let num = parseFloat(priceMatch[1].replace(",", "."));
    if (priceMatch[2] === "k") num *= 1000;
    if (priceMatch[2] === "tr" || priceMatch[2] === "trieu") num *= 1000000;
    if (num > 10000) maxPrice = Math.round(num);
  }

  const amenities = [];
  if (norm.includes("ho boi") || norm.includes("be boi"))
    amenities.push("pool_outdoor");
  if (norm.includes("bon tam")) amenities.push("bathtub");
  if (norm.includes("do xe") || norm.includes("bai xe"))
    amenities.push("parking");

  let minStars = null;
  const starMatch = norm.match(/(\d)\s*sao/);
  if (starMatch) minStars = parseInt(starMatch[1], 10);

  return {
    isSearch: !norm.includes("co bien ko") && !norm.includes("thoi tiet"),
    city,
    rentalType: norm.includes("gio")
      ? "HOUR"
      : norm.includes("qua dem")
        ? "OVERNIGHT"
        : "DAY",
    maxPrice,
    isBeachfront: norm.includes("bien"),
    nearCenter: norm.includes("trung tam"),
    minStars,
    requiredAmenities: amenities,
    directReply: norm.includes("co bien ko")
      ? "Sài Gòn (TP.HCM) không có bãi biển du lịch tắm được (chỉ có bãi bùn phù sa Cần Giờ). Nếu bạn muốn tắm biển, GoStay gợi ý bạn nên ghé Vũng Tàu hoặc Long Hải nhé! 🌊"
      : null,
  };
}

// ============================================================
// 2. SINH CÂU TRẢ LỜI TỰ NHIÊN DỰA TRÊN DỮ LIỆU THỰC TẾ
// ============================================================
async function aiGenerateResponse(userMessage, hotels, filterParams) {
  let context = "";
  if (hotels.length > 0) {
    context =
      "Danh sách phòng thực tế tìm thấy trong cơ sở dữ liệu:\n" +
      hotels
        .map((h, i) => {
          const details = [
            h.city ? `TP: ${h.city}` : null,
            `Hạng phòng: ${h.room_name}`,
            `Giá: ${Number(h.price).toLocaleString("vi-VN")} đ`,
            h.distance_to_center
              ? `Cách trung tâm: ${h.distance_to_center} km`
              : null,
            h.is_beachfront ? "Sát bờ biển" : null,
            `${h.star_rating || 3} sao`,
          ]
            .filter(Boolean)
            .join(" | ");

          return `${i + 1}. ${h.hotel_name} (${details})`;
        })
        .join("\n");
  } else {
    context =
      "Không có khách sạn nào khớp chính xác với tất cả các tiêu chí trên.";
  }

  const prompt = `
Bạn là GoStay AI. Khách hàng đã gửi yêu cầu: "${userMessage}".
Tiêu chí tìm kiếm: ${JSON.stringify(filterParams)}
${context}

HƯỚNG DẪN TRẢ LỜI:
1. Trả lời súc tích, văn phong lịch sự, nhiệt tình, có gắn emoji.
2. Nếu tìm thấy phòng: Nêu bật các ưu điểm (giá khởi điểm tốt nhất, vị trí sát biển hoặc gần trung tâm) và mời khách tham khảo các thẻ phòng chi tiết bên dưới.
3. Nếu không tìm thấy: Đưa ra lời khuyên nới lỏng ngân sách hoặc chọn ngày khác.
`;

  const aiReply = await callGemini(prompt, {
    temperature: 0.7,
    maxOutputTokens: 1000,
  });

  if (aiReply) return aiReply;

  // Fallback phản hồi ngay cả khi toàn bộ AI của Google quá tải
  if (hotels.length > 0) {
    const lowestPrice = Number(hotels[0].price).toLocaleString("vi-VN");
    const rentalSuffix =
      filterParams.rentalType === "HOUR" ? " đ/giờ" : " đ/đêm";
    return `GoStay đã tìm thấy ${hotels.length} lựa chọn phù hợp nhất với yêu cầu của bạn, giá chỉ từ **${lowestPrice}${rentalSuffix}**. Mời bạn tham khảo danh sách bên dưới nhé! 👇`;
  }

  return "Rất tiếc hiện tại hệ thống chưa tìm thấy phòng nào phù hợp hoàn toàn với tất cả tiêu chí của bạn. Bạn hãy thử nới lỏng ngân sách hoặc đổi ngày lưu trú xem sao nhé! 😊";
}

// ============================================================
// 3. AN TOÀN BẢO MẬT: BỘ LỌC DỮ LIỆU TÀI CHÍNH (DATA MASKING)
// ============================================================
function sanitizeFinancialDataForPrompt(rawFinancialData) {
  if (!rawFinancialData) return {};

  return {
    period: rawFinancialData.period || "this_month",
    totalRevenue: Number(
      rawFinancialData.revenueTotal || rawFinancialData.totalRevenue || 0,
    ),
    occupancyRate: `${rawFinancialData.occupancyCurrent?.rate || 0}%`,
    totalOccupiedRooms: rawFinancialData.occupancyCurrent?.occupied || 0,
    totalAvailableRooms: rawFinancialData.occupancyCurrent?.vacant || 0,
    unpaidBookingCount: Array.isArray(
      rawFinancialData.automationSummary?.paymentAlerts,
    )
      ? rawFinancialData.automationSummary.paymentAlerts.length
      : 0,
    totalUnpaidAmount: Number(
      rawFinancialData.automationSummary?.totalUnpaidAmount || 0,
    ),
    potentialLeakCount: Array.isArray(
      rawFinancialData.automationSummary?.leakAlerts,
    )
      ? rawFinancialData.automationSummary.leakAlerts.length
      : 0,
    potentialLeakAmount: Number(
      rawFinancialData.automationSummary?.potentialLeakTotal || 0,
    ),
  };
}

// ============================================================
// 4. API TƯ VẤN TÀI CHÍNH DÀNH CHO QUẢN TRỊ VIÊN / CHỦ KHÁCH SẠN
// ============================================================
async function handleOwnerFinancialAdvice(req, res) {
  const { question, statsData } = req.body || {};

  if (!question || !question.trim()) {
    return res.status(400).json({
      success: false,
      message: "Vui lòng nhập câu hỏi cần tư vấn tài chính.",
    });
  }

  try {
    const sanitizedStats = sanitizeFinancialDataForPrompt(statsData);

    const prompt = `
Bạn là Cố vấn Tài chính Khách sạn cấp cao của nền tảng GoStay.
Dưới đây là số liệu kinh doanh tổng hợp đã được khử định danh (bảo vệ quyền riêng tư):
${JSON.stringify(sanitizedStats, null, 2)}

Câu hỏi của chủ cơ sở: "${question}"

YÊU CẦU:
1. Đưa ra phân tích chuyên sâu dựa trên các số liệu thực tế trên (doanh thu, tỷ lệ lấp đầy, công nợ chưa thu, phụ phí thất thoát).
2. Đưa ra từ 2 - 3 giải pháp hành động cụ thể nhằm tối ưu hóa dòng tiền và kiểm soát thất thoát.
3. Tuyệt đối không suy đoán các thông tin cá nhân khách hàng.
`;

    const advice = await callGemini(prompt, {
      temperature: 0.3,
      maxOutputTokens: 1200,
    });

    return res.json({
      success: true,
      advice:
        advice ||
        `Hệ thống ghi nhận tổng doanh thu kỳ này là ${sanitizedStats.totalRevenue.toLocaleString("vi-VN")} đ với công suất ${sanitizedStats.occupancyRate}. Bạn nên rà soát lại ${sanitizedStats.unpaidBookingCount} phòng chưa hoàn tất thanh toán để tối ưu dòng tiền.`,
    });
  } catch (error) {
    console.error("❌ Lỗi tư vấn tài chính AI:", error.message);
    return res.status(500).json({
      success: false,
      message: "Không thể phân tích dữ liệu tài chính lúc này.",
    });
  }
}

// ============================================================
// 5. CONTROLLER TÌM KIẾM PHÒNG KHÁCH HÀNG
// ============================================================
async function handleChatMessage(req, res) {
  const userId = req.user?.id || req.auth?.sub || null;
  const { message = "", session_id = "session_default" } = req.body || {};

  if (!message.trim()) {
    return res.json({
      success: true,
      reply: "Bạn cần GoStay hỗ trợ tìm kiếm phòng như thế nào nè? 😊",
      suggestions: [],
    });
  }

  try {
    const rawMsg = message.trim();

    let conversationHistory = "";
    try {
      const historyRes = await pool.query(
        `SELECT role, message FROM public.chatbot_log 
         WHERE session_id = $1 
         ORDER BY created_at DESC LIMIT 6`,
        [session_id],
      );
      if (historyRes.rows.length > 0) {
        conversationHistory = historyRes.rows
          .reverse()
          .map((r) => `${r.role === "user" ? "Khách" : "GoStay"}: ${r.message}`)
          .join("\n");
      }
    } catch (e) {}

    const analysis = await aiAnalyzeRequest(rawMsg, conversationHistory);

    if (!analysis.isSearch && analysis.directReply) {
      logTurnBackground(
        userId,
        session_id,
        rawMsg,
        analysis,
        analysis.directReply,
      );
      return res.json({
        success: true,
        reply: analysis.directReply,
        suggestions: [],
        filter: analysis,
      });
    }

    let hotels = [];
    try {
      let priceColumn =
        analysis.rentalType === "HOUR"
          ? "COALESCE(r.hourly_price, ROUND(r.base_price * 0.25)::int)"
          : analysis.rentalType === "OVERNIGHT"
            ? "COALESCE(r.overnight_price, r.base_price)"
            : "r.base_price";

      const cityFilter = buildCityQuery(analysis.city, 1);
      const params = [...cityFilter.params];

      let sql = `
        SELECT 
          r.id AS room_id, r.hotel_id, r.name AS room_name, 
          ${priceColumn} AS price,
          h.name AS hotel_name, h.city, h.address, 
          COALESCE(h.star_rating, 3) AS star_rating,
          COALESCE(h.is_beachfront, false) AS is_beachfront,
          COALESCE(h.distance_to_center, 1.2) AS distance_to_center,
          COALESCE(
            (SELECT img.path FROM public.image img WHERE img.hotel_id = h.id ORDER BY img.is_thumbnail DESC, img.created_at ASC LIMIT 1),
            'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600'
          ) AS hotel_image
        FROM public.room r
        JOIN public.hotel h ON h.id = r.hotel_id
        WHERE COALESCE(r.is_active, true) = true AND h.status = 'active'
      `;

      if (analysis.city) {
        sql += ` AND ${cityFilter.sql}`;
      }

      if (analysis.isBeachfront) {
        sql += ` AND COALESCE(h.is_beachfront, false) = true`;
      }

      if (analysis.nearCenter) {
        sql += ` AND COALESCE(h.distance_to_center, 1.2) <= 3.5`;
      }

      if (analysis.minStars && Number(analysis.minStars) > 0) {
        params.push(analysis.minStars);
        sql += ` AND h.star_rating >= $${params.length}`;
      }

      if (analysis.maxPrice && Number(analysis.maxPrice) > 0) {
        params.push(analysis.maxPrice);
        sql += ` AND ${priceColumn} <= $${params.length}`;
      }

      if (
        Array.isArray(analysis.requiredAmenities) &&
        analysis.requiredAmenities.length > 0
      ) {
        for (const amenityKey of analysis.requiredAmenities) {
          params.push(`%${amenityKey}%`);
          sql += ` AND EXISTS (
            SELECT 1 FROM public.room_amenity ra 
            JOIN public.amenity a ON a.id = ra.amenity_id 
            WHERE ra.room_id = r.id AND LOWER(a.name) LIKE $${params.length}
          )`;
        }
      }

      if (analysis.nearCenter) {
        sql += ` ORDER BY h.distance_to_center ASC, ${priceColumn} ASC LIMIT 4`;
      } else if (analysis.rentalType === "HOUR") {
        sql += ` ORDER BY r.hourly_price ASC NULLS LAST, price ASC LIMIT 4`;
      } else {
        sql += ` ORDER BY ${priceColumn} ASC LIMIT 4`;
      }

      const dbRes = await pool.query(sql, params);
      hotels = dbRes.rows;

      if (hotels.length === 0 && analysis.nearCenter) {
        const expandSql = `
          SELECT r.id AS room_id, r.hotel_id, r.name AS room_name, 
                 ${priceColumn} AS price, h.name AS hotel_name, h.city, h.address, 
                 COALESCE(h.star_rating, 3) AS star_rating,
                 COALESCE(h.is_beachfront, false) AS is_beachfront,
                 COALESCE(h.distance_to_center, 1.2) AS distance_to_center,
                 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600' AS hotel_image
          FROM public.room r
          JOIN public.hotel h ON h.id = r.hotel_id
          WHERE COALESCE(r.is_active, true) = true AND h.status = 'active'
          ${analysis.city ? `AND ${cityFilter.sql}` : ""}
          ORDER BY h.distance_to_center ASC LIMIT 4
        `;
        const expandRes = await pool.query(
          expandSql,
          analysis.city ? cityFilter.params : [],
        );
        hotels = expandRes.rows;
      }
    } catch (dbErr) {
      console.error("❌ Lỗi truy vấn cơ sở dữ liệu:", dbErr.message);
    }

    const aiFinalReply = await aiGenerateResponse(rawMsg, hotels, analysis);

    logTurnBackground(userId, session_id, rawMsg, analysis, aiFinalReply);

    return res.json({
      success: true,
      reply: aiFinalReply,
      suggestions: hotels,
      filter: analysis,
    });
  } catch (error) {
    console.error("❌ Lỗi tổng quan Chatbot Controller:", error);
    return res.json({
      success: true,
      reply: "GoStay có thể hỗ trợ gì cho kế hoạch du lịch của bạn nè? 😊",
      suggestions: [],
      filter: {},
    });
  }
}

function logTurnBackground(userId, sessionId, userMsg, filterObj, botMsg) {
  pool
    .query(
      `INSERT INTO public.chatbot_log (id, user_id, session_id, role, message, extracted_filter, created_at)
     VALUES (gen_random_uuid(), $1, $2, 'user', $3, $4, NOW())`,
      [userId, sessionId, userMsg, JSON.stringify(filterObj)],
    )
    .catch(() => {});

  pool
    .query(
      `INSERT INTO public.chatbot_log (id, user_id, session_id, role, message, created_at)
     VALUES (gen_random_uuid(), $1, $2, 'assistant', $3, NOW())`,
      [userId, sessionId, botMsg],
    )
    .catch(() => {});
}

async function getChatHistory(req, res) {
  const { session_id = "session_default" } = req.query;
  try {
    const result = await pool.query(
      `SELECT id, role, message, created_at FROM public.chatbot_log WHERE session_id = $1 ORDER BY created_at ASC LIMIT 50`,
      [session_id],
    );
    return res.json({ success: true, data: result.rows });
  } catch (error) {
    return res.json({ success: true, data: [] });
  }
}

module.exports = {
  handleChatMessage,
  handleOwnerFinancialAdvice,
  getChatHistory,
};
