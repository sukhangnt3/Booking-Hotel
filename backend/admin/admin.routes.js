const express = require("express");
const {
  getStats,
  listUsers,
  createUser,
  updateUserRole,
  toggleUserStatus,
  listAdminHotels,
  updateHotelStatus,
  listAllBookings,
  updateBookingStatusAdmin,
  listPromotions,
  listReviews,
  deleteReview,
} = require("./admin.controller");

// Sử dụng chính xác middleware chuẩn trong auth.middleware.js
const { requireAuth, requireRole } = require("../middleware/auth.middleware");

const router = express.Router();

// 1. Kiểm tra đăng nhập (tạo req.auth từ token)
router.use(requireAuth);

// 2. Tương thích: sao chép req.auth sang req.user và req.userId cho các controller
router.use((req, res, next) => {
  if (req.auth) {
    req.user = {
      id: req.auth.sub || req.auth.id,
      email: req.auth.email,
      ...req.auth,
    };
    req.userId = req.auth.sub || req.auth.id;
  }
  next();
});

// 3. Kiểm tra quyền Admin (truy vấn DB thật theo req.auth.sub của middleware)
router.use(requireRole("admin"));

// ─── CÁC ROUTE ADMIN ───
router.get("/stats", getStats);
router.get("/users", listUsers);
router.post("/users", createUser);
router.patch("/users/:id/role", updateUserRole);
router.patch("/users/:id/status", toggleUserStatus);
router.get("/hotels", listAdminHotels);
router.patch("/hotels/:id/status", updateHotelStatus);
router.get("/bookings", listAllBookings);
router.patch("/bookings/:id/status", updateBookingStatusAdmin);
router.get("/promotions", listPromotions);
router.get("/reviews", listReviews);
router.delete("/reviews/:id", deleteReview);

module.exports = router;
