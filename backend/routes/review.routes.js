// backend/routes/review.routes.js
const express = require("express");
const {
  createReview,
  listHotelReviews,
  replyReview,
} = require("../controllers/review.controller");
const { requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();

// Middleware hỗ trợ: Tự động map req.auth sang req.user nếu có
router.use((req, res, next) => {
  if (req.auth && !req.user) {
    req.user = { id: req.auth.sub || req.auth.id, ...req.auth };
  }
  next();
});

// ─── 1. XEM DANH SÁCH ĐÁNH GIÁ (HỖ TRỢ MỌI ĐƯỜNG DẪN URL TỪ FRONTEND) ───
// Đón: GET /reviews/hotel/:hotelId
router.get("/hotel/:hotelId", listHotelReviews);

// Đón: GET /reviews/:hotelId
router.get("/:hotelId", listHotelReviews);

// Đón trường hợp route mount ở /api -> GET /api/hotels/:hotelId/reviews
router.get("/hotels/:hotelId/reviews", listHotelReviews);

// ─── 2. KHÁCH HÀNG GỬI ĐÁNH GIÁ MỚI (THANG ĐIỂM 1 - 10) ───
// Đón: POST /reviews (với body chứa hotelId, point 1-10, description)
router.post("/", requireAuth, createReview);

// Đón: POST /reviews/:hotelId
router.post("/:hotelId", requireAuth, createReview);

// Đón: POST /hotels/:hotelId/reviews (Frontend HotelDetailPage thường gọi dạng này)
router.post("/hotels/:hotelId/reviews", requireAuth, createReview);

// ─── 3. CHỦ KHÁCH SẠN PHẢN HỒI ĐÁNH GIÁ ───
router.patch("/:id/reply", requireAuth, replyReview);
router.post("/:id/reply", requireAuth, replyReview);

module.exports = router;
