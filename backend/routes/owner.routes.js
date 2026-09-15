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

// ─── 1. CÁC API SƠ ĐỒ PHÒNG LỄ TÂN & CHỜ XÁC NHẬN ───
// Lấy sơ đồ phòng
safeRoute("get", "/room-map", ownerController.getRoomMapData);

// API Lấy danh sách các đơn đặt online đang chờ lễ tân xếp phòng
safeRoute(
  "get",
  "/bookings/pending-online",
  ownerController.getPendingOnlineBookings,
);

// API Lễ tân chọn số phòng thực tế và xác nhận đơn
safeRoute(
  "post",
  "/bookings/confirm-assign-room",
  ownerController.confirmAndAssignRoom,
);

// Nhận phòng / Đặt phòng tại quầy (Walk-in)
safeRoute("post", "/bookings/walk-in", ownerController.createWalkInBooking);
safeRoute("post", "/bookings/walkin", ownerController.createWalkInBooking);

// Trả phòng & thanh toán (Chuyển phòng sang Chưa dọn)
safeRoute(
  "post",
  "/bookings/:id/checkout",
  ownerController.handleOwnerCheckOut,
);

// Lễ tân xác nhận ĐÃ DỌN PHÒNG (Cleaned)
safeRoute("post", "/rooms/mark-cleaned", ownerController.markRoomCleaned);

// Lễ tân báo CẦN DỌN PHÒNG (Dirty)
safeRoute("post", "/rooms/mark-dirty", ownerController.markRoomDirty);

// Đổi phòng cho khách
safeRoute(
  "post",
  "/bookings/:id/change-room",
  ownerController.handleChangeRoom,
);

// Thêm dịch vụ / phụ thu
safeRoute(
  "post",
  "/bookings/:id/services",
  ownerController.handleAddBookingService,
);

// ─── 2. CÁC API QUẢN LÝ NHÂN VIÊN LỄ TÂN ───
safeRoute("get", "/staff", ownerController.getOwnerStaff);
safeRoute("post", "/staff", ownerController.createOwnerStaff);
safeRoute("delete", "/staff/:id", ownerController.deleteOwnerStaff);
safeRoute("patch", "/staff/:id/status", ownerController.toggleStaffStatus);

// ─── 3. CÁC API QUẢN TRỊ OWNER KHÁC ───
safeRoute("get", "/stats", ownerController.getOwnerStats);
safeRoute("get", "/bookings", ownerController.getOwnerBookings);
safeRoute("post", "/bookings/:id/checkin", ownerController.handleOwnerCheckIn);
safeRoute(
  "patch",
  "/bookings/:id/status",
  ownerController.updateOwnerBookingStatus,
);
safeRoute(
  "put",
  "/bookings/:id/status",
  ownerController.updateOwnerBookingStatus,
);
safeRoute("put", "/hotels/:id", ownerController.updateHotelInfo);

module.exports = router;
