const express = require("express");
const {
  getStats,
  listUsers,
  updateUserRole,
  toggleUserStatus,
  listAllBookings,
  updateBookingStatusAdmin,
  listAdminHotels,
  updateHotelStatus,
  listPromotions,
  createPromotion,
  updatePromotion,
  deletePromotion,
  listReviews,
  deleteReview,
} = require("./admin.controller");
const { requireAuth, requireRole } = require("../middleware/auth.middleware");

const router = express.Router();

// ─── TẤT CẢ ROUTE ADMIN ĐỀU CẦN: ĐĂNG NHẬP + ROLE ADMIN ───
router.use(requireAuth);
router.use(requireRole("admin"));

// Dashboard
router.get("/stats", getStats);

// Users
router.get("/users", listUsers);
router.patch("/users/:id/role", updateUserRole);
router.patch("/users/:id/status", toggleUserStatus);

// Bookings
router.get("/bookings", listAllBookings);
router.patch("/bookings/:id/status", updateBookingStatusAdmin);

// Hotels
router.get("/hotels", listAdminHotels);
router.patch("/hotels/:id/status", updateHotelStatus);

// Promotions
router.get("/promotions", listPromotions);
router.post("/promotions", createPromotion);
router.put("/promotions/:id", updatePromotion);
router.delete("/promotions/:id", deletePromotion);

// Reviews
router.get("/reviews", listReviews);
router.delete("/reviews/:id", deleteReview);

module.exports = router;