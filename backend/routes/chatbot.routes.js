// backend/routes/chatbot.routes.js
const express = require("express");
const {
  handleChatMessage,
  getChatHistory,
} = require("../controllers/chatbot.controller");
const { optionalAuth } = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/message", optionalAuth, handleChatMessage);
router.get("/history", optionalAuth, getChatHistory);

module.exports = router;
