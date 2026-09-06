// backend/routes/review.routes.js
const express = require("express");
const {
  createReview,
  listHotelReviews,
  replyReview,
} = require("../controllers/review.controller");
const { requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();

// 1. Xem danh sách đánh giá theo khách sạn
router.get("/hotel/:hotelId", listHotelReviews);

// 2. Khách hàng gửi đánh giá mới
router.post("/", requireAuth, createReview);

// 3. Chủ khách sạn phản hồi đánh giá của khách (Cột reply trong bảng review)
router.patch("/:id/reply", requireAuth, replyReview);

module.exports = router;
