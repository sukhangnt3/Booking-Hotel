// backend/routes/chatbot.routes.js
const express = require("express");
const {
  handleChatMessage,
  handleOwnerFinancialAdvice,
  getChatHistory,
} = require("../controllers/chatbot.controller");
const { optionalAuth } = require("../middleware/auth.middleware");

const router = express.Router();

// 1. Route tìm kiếm và tư vấn phòng khách hàng (Gemini NLU đa điều kiện)
router.post("/message", optionalAuth, handleChatMessage);

// 2. Route tư vấn tài chính cá nhân hóa & bảo mật dữ liệu doanh thu cho chủ cơ sở (Gemini Grounded Privacy Advice)
router.post("/financial-advice", optionalAuth, handleOwnerFinancialAdvice);

// 3. Lấy lịch sử hội thoại
router.get("/history", optionalAuth, getChatHistory);

module.exports = router;
