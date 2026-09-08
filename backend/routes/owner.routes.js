// backend/routes/owner.routes.js
const express = require("express");
const router = express.Router();
const ownerController = require("../controllers/owner.controller");
const { requireAuth } = require("../middleware/auth.middleware");

// 1. Bắt buộc đăng nhập
if (typeof requireAuth === "function") {
  router.use(requireAuth);
}

// 2. Chuẩn hóa ID
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

// Chốt chặn an toàn
const safeRoute = (method, path, handler) => {
  if (typeof handler === "function") {
    router[method](path, handler);
  } else {
    console.warn(`⚠️ Cảnh báo: Chưa export [${method.toUpperCase()} ${path}]`);
  }
};

// ─── CÁC API SƠ ĐỒ PHÒNG LỄ TÂN ───
// 1. Lấy sơ đồ phòng
safeRoute("get", "/room-map", ownerController.getRoomMapData);

// 2. Nhận phòng / Đặt phòng tại quầy
safeRoute("post", "/bookings/walk-in", ownerController.createWalkInBooking);
safeRoute("post", "/bookings/walkin", ownerController.createWalkInBooking);

// 3. Trả phòng & thanh toán (Chuyển phòng sang Chưa dọn)
safeRoute(
  "post",
  "/bookings/:id/checkout",
  ownerController.handleOwnerCheckOut,
);

// 4. Lễ tân xác nhận Đã dọn phòng
safeRoute("post", "/rooms/mark-cleaned", ownerController.markRoomCleaned);

// 5. Đổi phòng cho khách
safeRoute(
  "post",
  "/bookings/:id/change-room",
  ownerController.handleChangeRoom,
);

// 6. Thêm dịch vụ / phụ thu
safeRoute(
  "post",
  "/bookings/:id/services",
  ownerController.handleAddBookingService,
);

// ─── CÁC API KHÁC ───
safeRoute("get", "/stats", ownerController.getOwnerStats);
safeRoute("get", "/bookings", ownerController.getOwnerBookings);
safeRoute("post", "/bookings/:id/checkin", ownerController.handleOwnerCheckIn);
safeRoute(
  "patch",
  "/bookings/:id/status",
  ownerController.updateOwnerBookingStatus,
);
safeRoute("put", "/hotels/:id", ownerController.updateHotelInfo);

module.exports = router;
