// backend/routes/owner.routes.js
const express = require("express");
const router = express.Router();
const ownerController = require("../controllers/owner.controller");
const { requireAuth } = require("../middleware/auth.middleware");

// 1. Middleware đăng nhập
if (typeof requireAuth === "function") {
  router.use(requireAuth);
}

// 2. Tự động đồng bộ req.auth sang req.user
router.use((req, res, next) => {
  if (req.auth && !req.user) {
    req.user = { id: req.auth.sub || req.auth.id, ...req.auth };
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

// Đăng ký an toàn tất cả các endpoint của Owner:
safeRoute("get", "/stats", ownerController.getOwnerStats);
safeRoute("get", "/bookings", ownerController.getOwnerBookings);

safeRoute("post", "/bookings/walk-in", ownerController.createWalkInBooking);

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

safeRoute(
  "patch",
  "/bookings/:id/status",
  ownerController.updateOwnerBookingStatus,
);
safeRoute("put", "/hotels/:id", ownerController.updateHotelInfo);

module.exports = router;
