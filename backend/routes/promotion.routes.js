// backend/routes/promotion.routes.js
const express = require("express");
const {
  listPromotions,
  getGlobalDeals,
  checkPromotionCode,
  createPromotion,
  deletePromotion,
} = require("../controllers/promotion.controller");
const { requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();

// 1. Công khai: Lấy danh sách ưu đãi
router.get("/", listPromotions);

// 2. Công khai: Lấy danh sách ưu đãi cho trang PromotionPage
router.get("/global", getGlobalDeals);

// 3. Công khai: Kiểm tra mã giảm giá khi đặt phòng
router.post("/check", checkPromotionCode);

// 4. Quản trị: Tạo mã khuyến mãi mới
router.post("/", requireAuth, createPromotion);

// 5. Quản trị: Xóa mã khuyến mãi
router.delete("/:id", requireAuth, deletePromotion);

module.exports = router;
