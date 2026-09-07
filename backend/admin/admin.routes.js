// backend/routes/admin.routes.js
const express = require("express");
const router = express.Router();

// Tự động tìm nạp controller dù bạn để ở controllers/ hay admin/
let adminController;
try {
  adminController = require("../controllers/admin.controller");
} catch (e) {
  try {
    adminController = require("../admin/admin.controller");
  } catch (err) {
    console.error("❌ Không tìm thấy admin.controller.js:", err.message);
  }
}

const { requireAuth, requireRole } = require("../middleware/auth.middleware");

// 1. Kiểm tra đăng nhập
if (typeof requireAuth === "function") {
  router.use(requireAuth);
}

// 2. Chuẩn hóa ID và đồng bộ req.user
router.use((req, res, next) => {
  const resolvedId =
    req.user?.id ||
    req.user?.userId ||
    req.auth?.sub ||
    req.auth?.id ||
    req.auth?.userId;

  if (!req.user) req.user = {};
  if (resolvedId) {
    req.user.id = resolvedId;
    req.user.userId = resolvedId;
  }
  next();
});

// 3. Kiểm tra quyền Admin (Không phân biệt hoa thường 'admin' hay 'ADMIN')
if (typeof requireRole === "function") {
  router.use((req, res, next) => {
    // Nếu middleware requireRole nhận mảng hoặc chuỗi
    requireRole("admin")(req, res, (err) => {
      if (!err) return next();
      // Thử lại với chữ in hoa 'ADMIN'
      requireRole("ADMIN")(req, res, next);
    });
  });
}

// ─── ĐĂNG KÝ CÁC ROUTE ADMIN ───
if (adminController) {
  router.get("/stats", adminController.getStats);

  // Quản lý Users
  router.get("/users", adminController.listUsers);
  router.post("/users", adminController.createUser);
  router.patch("/users/:id/role", adminController.updateUserRole);
  router.patch("/users/:id/status", adminController.toggleUserStatus);

  // Quản lý & Phê duyệt Khách sạn
  router.get("/hotels", adminController.listAdminHotels);
  router.patch("/hotels/:id/status", adminController.updateHotelStatus);

  // Quản lý Đơn đặt phòng
  router.get("/bookings", adminController.listAllBookings);
  router.patch(
    "/bookings/:id/status",
    adminController.updateBookingStatusAdmin,
  );

  // Khuyến mãi & Đánh giá
  router.get("/promotions", adminController.listPromotions);
  router.get("/reviews", adminController.listReviews);
  router.delete("/reviews/:id", adminController.deleteReview);
}

module.exports = router;
