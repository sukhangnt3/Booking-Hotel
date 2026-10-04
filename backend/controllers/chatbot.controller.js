// backend/controllers/chatbot.controller.js
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
require("dotenv").config();

const pool = require("../config/database");
const { GoogleGenAI } = require("@google/genai");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
  ? process.env.GEMINI_API_KEY.trim()
  : null;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";

let genai = null;
if (GEMINI_API_KEY) {
  try {
    genai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  } catch (err) {
    console.warn("⚠️ Chưa có GoogleGenAI SDK:", err.message);
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

// 🛡️ HÀM GỌI GEMINI - ĐÃ TẮT SUY NGHĨ NGẦM ĐỂ DÀNH TRỌN TOKEN CHO CÂU TRẢ LỜI
async function callGemini(prompt, config = {}) {
  if (!genai || !GEMINI_API_KEY) return null;

  try {
    const res = await genai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 }, // 👈 Tắt suy nghĩ ngầm để tránh tốn token
        maxOutputTokens: 1000, // 👈 1000 tokens đảm bảo viết trọn vẹn câu
        ...config,
      },
    });
    if (res && res.text) return res.text.trim();
  } catch (err) {
    if (err.status === 429 || err.code === 429) {
      console.log(
        `ℹ️ [GoStay AI] Model ${GEMINI_MODEL} đã chạm hạn mức miễn phí trong ngày (20/20).`,
      );
    }
  }

  return null;
}

// ============================================================
// BƯỚC 1: AI ĐỌC TIN NHẮN & PHÂN TÍCH TIÊU CHÍ (100% AI)
// ============================================================
async function aiAnalyzeRequest(userMessage, conversationHistory) {
  const prompt = `
Bạn là GoStay AI. Đọc lịch sử trò chuyện và tin nhắn mới nhất để phân loại yêu cầu.
Lịch sử:
${conversationHistory || "Chưa có"}

Tin nhắn: "${userMessage}"

QUY TẮC:
1. Nếu khách hỏi kiến thức/địa lý/thời tiết (Sài Gòn có biển không, Đà Lạt ăn gì):
   - isSearch: false
   - directReply: Tự viết câu trả lời đầy đủ, thân thiện, dí dỏm.
2. Nếu tìm phòng:
   - isSearch: true
   - city: Tên thành phố chuẩn ('Hồ Chí Minh', 'Vũng Tàu', 'Đà Nẵng'...). Nếu khách nói 'ở đâu cũng được', 'sao cũng được' thì để null.
   - rentalType: 'HOUR', 'OVERNIGHT', hoặc 'DAY'.
   - maxPrice: Số tiền tối đa (VND) hoặc null.
   - isBeachfront: true nếu muốn gần biển.
   - nearCenter: true nếu muốn gần trung tâm.

Trả về DUY NHẤT một chuỗi JSON hợp lệ (không markdown backticks):
{
  "isSearch": boolean,
  "city": string | null,
  "rentalType": "DAY" | "HOUR" | "OVERNIGHT",
  "maxPrice": number | null,
  "isBeachfront": boolean,
  "nearCenter": boolean,
  "directReply": string | null
}
`;

  const rawJson = await callGemini(prompt, {
    responseMimeType: "application/json",
    temperature: 0.2,
  });

  if (rawJson) {
    try {
      let clean = rawJson
        .replace(/^```json/i, "")
        .replace(/^```/, "")
        .replace(/```$/, "")
        .trim();
      return JSON.parse(clean);
    } catch (e) {}
  }

  // Dự phòng an toàn nếu Google nghẽn mạng
  const norm = removeAccents(userMessage);
  let city = null;
  if (
    norm.includes("sai gon") ||
    norm.includes("ho chi minh") ||
    norm.includes("hcm")
  )
    city = "Hồ Chí Minh";
  if (norm.includes("vung tau")) city = "Vũng Tàu";
  if (norm.includes("da nang")) city = "Đà Nẵng";
  if (norm.includes("ha noi")) city = "Hà Nội";
  if (norm.includes("da lat")) city = "Đà Lạt";

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

  return {
    isSearch: !norm.includes("co bien ko"),
    city,
    rentalType: norm.includes("gio")
      ? "HOUR"
      : norm.includes("qua dem")
        ? "OVERNIGHT"
        : "DAY",
    maxPrice,
    isBeachfront: norm.includes("bien"),
    nearCenter: norm.includes("trung tam"),
    directReply: norm.includes("co bien ko")
      ? "Dạ Sài Gòn (TP.HCM) cơ bản không có bãi biển du lịch tắm được bạn nhé (chỉ có biển Cần Giờ là bãi phù sa rừng ngập mặn). Nếu bạn muốn tắm biển gần Sài Gòn nhất, GoStay gợi ý bạn nên ghé Vũng Tàu hoặc Hồ Tràm nè! 🌊"
      : null,
  };
}

// ============================================================
// BƯỚC 2: AI ĐỌC DATABASE & TỰ VIẾT CÂU TRẢ LỜI ĐẦY ĐỦ 100%
// ============================================================
async function aiGenerateResponse(userMessage, hotels, filterParams) {
  let context = "";
  if (hotels.length > 0) {
    context =
      "Dữ liệu khách sạn thực tế tìm thấy từ Database:\n" +
      hotels
        .map((h, i) => {
          const details = [
            h.city ? `Thành phố: ${h.city}` : null,
            `Phòng: ${h.room_name}`,
            `Giá: ${Number(h.price).toLocaleString("vi-VN")} đ`,
            h.distance_to_center
              ? `Cách trung tâm: ${h.distance_to_center} km`
              : null,
            h.is_beachfront ? "Sát biển" : null,
            `${h.star_rating || 3} sao`,
          ]
            .filter(Boolean)
            .join(" | ");

          return `${i + 1}. ${h.hotel_name} (${details})`;
        })
        .join("\n");
  } else {
    context = "Không có khách sạn nào trong hệ thống khớp với tiêu chí.";
  }

  const prompt = `
Bạn là GoStay AI. Khách hàng vừa hỏi: "${userMessage}".
Tiêu chí tìm kiếm: ${JSON.stringify(filterParams)}
${context}

YÊU CẦU QUAN TRỌNG:
1. Đọc dữ liệu trên và tự viết câu trả lời tự nhiên 100%:
   - Nếu khách hỏi thuê theo giờ / giá rẻ: Hãy nêu rõ mức giá khởi điểm thấp nhất tìm thấy (Ví dụ: "chỉ từ 80.000 đ/giờ"). Luôn viết ĐẦY ĐỦ số tiền và đơn vị tính (đ/giờ hoặc đ/đêm), tuyệt đối không bỏ dở giữa chừng.
   - Nếu khách hỏi gần trung tâm: Khen vị trí đắc địa (nêu số km thực tế cách trung tâm).
   - Nếu khách nói ở đâu cũng được: Chào đón và giới thiệu danh sách tiêu biểu.
2. Nếu không có phòng: Gợi ý khách nâng nhẹ giá hoặc đổi ngày.
3. Viết trọn vẹn 2-3 câu súc tích, hoàn chỉnh ngữ pháp, có emoji sinh động, mời khách xem các thẻ phòng bên dưới.
`;

  const aiReply = await callGemini(prompt, {
    thinkingConfig: { thinkingBudget: 0 },
    temperature: 0.7,
    maxOutputTokens: 1000, // 👈 Đảm bảo không bao giờ bị cắt ngắn giữa câu
  });

  if (aiReply) return aiReply;

  // Dự phòng an toàn nếu mất mạng
  if (hotels.length > 0) {
    if (filterParams.nearCenter) {
      return `Dạ GoStay gợi ý cho bạn các khách sạn nằm ngay sát trung tâm thành phố (chỉ cách từ ${hotels[0].distance_to_center} km) cực kỳ thuận tiện đi lại ăn uống nè! Mời bạn tham khảo bên dưới nhé 👇`;
    }
    const lowestPrice = Number(hotels[0].price).toLocaleString("vi-VN");
    const rentalSuffix =
      filterParams.rentalType === "HOUR" ? " đ/giờ" : " đ/đêm";
    return `GoStay đã tìm thấy các phòng phù hợp với mức giá cực tốt, chỉ từ **${lowestPrice}${rentalSuffix}** thôi nè! Mời bạn xem chi tiết các phòng bên dưới nhé 👇`;
  }

  return "Dạ hiện tại hệ thống chưa tìm thấy phòng nào phù hợp hoàn toàn tiêu chí này. Bạn thử điều chỉnh nhẹ mức giá hoặc đổi ngày xem sao nhé! 😊";
}

// ============================================================
// CONTROLLER CHÍNH
// ============================================================
async function handleChatMessage(req, res) {
  const userId = req.user?.id || req.auth?.sub || null;
  const { message = "", session_id = "session_default" } = req.body || {};

  if (!message.trim()) {
    return res.json({
      success: true,
      reply: "Bạn cần GoStay hỗ trợ gì nè? 😊",
      suggestions: [],
    });
  }

  try {
    const rawMsg = message.trim();

    // 1. LẤY LỊCH SỬ CHAT ĐỂ CÓ BỘ NHỚ LIÊN TỤC
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

    // 2. PHÂN TÍCH NHU CẦU
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

    // 3. TRUY VẤN DATABASE LẤY PHÒNG THỰC TẾ
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
        WHERE 1=1
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

      if (analysis.maxPrice && Number(analysis.maxPrice) > 0) {
        params.push(analysis.maxPrice);
        sql += ` AND ${priceColumn} <= $${params.length}`;
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
          ${analysis.city ? `WHERE ${cityFilter.sql}` : ""}
          ORDER BY h.distance_to_center ASC LIMIT 4
        `;
        const expandRes = await pool.query(
          expandSql,
          analysis.city ? cityFilter.params : [],
        );
        hotels = expandRes.rows;
      }
    } catch (dbErr) {
      console.error("❌ Lỗi Query Database:", dbErr.message);
    }

    // 4. AI ĐỌC DỮ LIỆU DATABASE VÀ TỰ VIẾT CÂU TRẢ LỜI 100%
    const aiFinalReply = await aiGenerateResponse(rawMsg, hotels, analysis);

    logTurnBackground(userId, session_id, rawMsg, analysis, aiFinalReply);

    return res.json({
      success: true,
      reply: aiFinalReply,
      suggestions: hotels,
      filter: analysis,
    });
  } catch (error) {
    console.error("❌ Lỗi Tổng Chatbot Controller:", error);
    return res.json({
      success: true,
      reply: "Dạ GoStay có thể hỗ trợ gì cho bạn nè? 😊",
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
  getChatHistory,
};
