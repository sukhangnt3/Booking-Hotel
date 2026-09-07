// backend/routes/owner.routes.js
const express = require("express");
const router = express.Router();
const ownerController = require("../controllers/owner.controller");
const { requireAuth } = require("../middleware/auth.middleware");

// 1. Middleware bắt buộc đăng nhập
if (typeof requireAuth === "function") {
  router.use(requireAuth);
}

// 2. Chuẩn hóa triệt để id của Owner từ JWT token (req.user & req.auth)
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

// 🛡️ CHỐT CHẶN AN TOÀN TUYỆT ĐỐI: CHỈ ĐĂNG KÝ KHI HÀM TỒN TẠI (CHỐNG SẬP 100%)
const safeRoute = (method, path, handler) => {
  if (typeof handler === "function") {
    router[method](path, handler);
  } else {
    console.warn(
      `⚠️ Cảnh báo: Hàm xử lý cho [${method.toUpperCase()} ${path}] chưa được export trong owner.controller.js`,
    );
  }
};

// ─── THỐNG KÊ & DANH SÁCH ĐƠN HÀNG ───
safeRoute("get", "/stats", ownerController.getOwnerStats);
safeRoute("get", "/bookings", ownerController.getOwnerBookings);

// ─── ĐẶT PHÒNG TẠI QUẦY (WALK-IN) ───
safeRoute("post", "/bookings/walk-in", ownerController.createWalkInBooking);

// ─── CHECK-IN / CHECK-OUT ───
safeRoute("post", "/bookings/:id/checkin", ownerController.handleOwnerCheckIn);
safeRoute("patch", "/bookings/:id/checkin", ownerController.handleOwnerCheckIn);

safeRoute(
  "post",
  "/bookings/:id/checkout",
  ownerController.handleOwnerCheckOut,
);
safeRoute(
  "patch",
  "/bookings/:id/checkout",
  ownerController.handleOwnerCheckOut,
);

// ─── CẬP NHẬT TRẠNG THÁI ĐƠN ───
safeRoute(
  "patch",
  "/bookings/:id/status",
  ownerController.updateOwnerBookingStatus,
);

// ─── CẬP NHẬT CƠ SỞ CHỖ NGHỈ (HỖ TRỢ CẢ 2 ĐƯỜNG DẪN ĐỂ KHÔNG BAO GIỜ BỊ 404) ───
// Trường hợp 1: Router được mount ở app.use("/api/owner", ...) -> đón URL: /api/owner/hotels/:id
safeRoute("put", "/hotels/:id", ownerController.updateHotelInfo);
safeRoute("patch", "/hotels/:id", ownerController.updateHotelInfo);

// Trường hợp 2: Router được mount ở app.use("/api", ...) -> đón URL: /api/owner/hotels/:id
safeRoute("put", "/owner/hotels/:id", ownerController.updateHotelInfo);
safeRoute("patch", "/owner/hotels/:id", ownerController.updateHotelInfo);

module.exports = router;
