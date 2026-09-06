// backend/controllers/chatbot.controller.js
const crypto = require("crypto");
const pool = require("../config/database");

// Trợ lý gợi ý khách sạn thông minh và ghi log vào bảng 21: chatbot_log
async function handleChatMessage(req, res, next) {
  const userId = req.user?.id || req.auth?.sub || null;
  const { message, session_id = "session_default" } = req.body || {};

  if (!message || !message.trim()) {
    return res
      .status(400)
      .json({ message: "Nội dung tin nhắn không được để trống." });
  }

  try {
    const text = message.trim().toLowerCase();
    const extractedFilter = {};

    // 1. Phân tích ngữ nghĩa tìm thành phố
    const cities = [
      "đà nẵng",
      "hồ chí minh",
      "hà nội",
      "nha trang",
      "phú quốc",
      "đà lạt",
      "vũng tàu",
    ];
    for (const city of cities) {
      if (text.includes(city)) {
        extractedFilter.city = city;
        break;
      }
    }

    // 2. Phân tích giá tiền
    if (
      text.includes("dưới 1 triệu") ||
      text.includes("dưới 1tr") ||
      text.includes("rẻ")
    ) {
      extractedFilter.maxPrice = 1000000;
    } else if (text.includes("2 triệu") || text.includes("2tr")) {
      extractedFilter.maxPrice = 2000000;
    }

    // 3. Tìm khách sạn phù hợp trong cơ sở dữ liệu
    let hotelQuery = `
      SELECT h.id, h.name, h.city, h.address, h.star_rating, h.average_rating,
        COALESCE((SELECT MIN(base_price) FROM public.room WHERE hotel_id = h.id AND is_active = true), 500000) AS price
      FROM public.hotel h
      WHERE h.status = 'active'
    `;
    const params = [];

    if (extractedFilter.city) {
      params.push(`%${extractedFilter.city}%`);
      hotelQuery += ` AND h.city ILIKE $${params.length}`;
    }

    hotelQuery += ` ORDER BY h.average_rating DESC LIMIT 3;`;
    const hotelResult = await pool.query(hotelQuery, params);
    const matchedHotels = hotelResult.rows;

    // 4. Tạo câu trả lời thông minh
    let botReply = "";
    if (matchedHotels.length > 0) {
      const hotelListText = matchedHotels
        .map(
          (h) =>
            `🏨 **${h.name}** (${h.city}) - Giá từ: ${Number(h.price).toLocaleString("vi-VN")} ₫/đêm (⭐ ${h.star_rating} sao)`,
        )
        .join("\n");
      botReply = `GoStay gợi ý cho bạn một số chỗ nghỉ tuyệt vời:\n${hotelListText}\n\nBạn có muốn xem chi tiết cơ sở nào không?`;
    } else {
      botReply = `Dạ hiện tại GoStay chưa tìm thấy khách sạn nào khớp chính xác với yêu cầu của bạn. Bạn hãy thử tìm theo thành phố như Đà Nẵng, Nha Trang, Phú Quốc, hoặc Đà Lạt nhé!`;
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
      suggestions: matchedHotels,
      filter: extractedFilter,
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
