// backend/routes/index.js
const express = require("express");
const router = express.Router();
const reviewController = require("../controllers/review.controller");
const { requireAuth } = require("../middleware/auth.middleware");

// Thay hàm safeUse cũ bằng hàm này để hiện rõ nguyên nhân:
const safeUse = (mountPath, relativePath) => {
  try {
    const routeModule = require(relativePath);
    router.use(mountPath, routeModule);
    console.log(`✓ Đã nạp thành công route [${mountPath}] từ ${relativePath}`);
  } catch (err) {
    console.error(
      `❌ KHÔNG THỂ nạp route [${mountPath}] từ [${relativePath}]. LỖI THẬT:`,
      err.message,
    );
  }
};

// ─── NẠP CÁC ROUTER HỆ THỐNG ───
safeUse("/users", "./user.routes"); // 👈 ĐÃ BỔ SUNG ĐỂ SỬA HỒ SƠ & FAVORITES LƯU VÀO DATABASE
safeUse("/auth", "./auth.routes");
safeUse("/hotels", "./hotel.routes");
safeUse("/rooms", "./room.routes");
safeUse("/bookings", "./booking.routes");
safeUse("/owner", "./owner.routes");
safeUse("/payments", "./payment.routes");
safeUse("/favorites", "./favorite.routes");
safeUse("/reviews", "./review.routes");
safeUse("/chatbot", "./chatbot.routes");

// 👉 NẠP ROUTE ADMIN
try {
  const adminRoutes = require("./admin.routes");
  router.use("/admin", adminRoutes);
  console.log("✓ Đã nạp thành công route [/admin] từ ./admin.routes");
} catch (e1) {
  try {
    const adminRoutesAlt = require("../admin/admin.routes");
    router.use("/admin", adminRoutesAlt);
    console.log("✓ Đã nạp thành công route [/admin] từ ../admin/admin.routes");
  } catch (e2) {
    console.error("❌ Không tìm thấy file admin.routes:", e1.message);
  }
}

// ─── REVIEW ROUTES TOÀN HỆ THỐNG ───
if (typeof reviewController?.listHotelReviews === "function") {
  router.get("/hotels/:id/reviews", reviewController.listHotelReviews);
  router.get("/hotels/:hotelId/reviews", reviewController.listHotelReviews);
}
if (
  typeof reviewController?.checkCanReview === "function" &&
  typeof requireAuth === "function"
) {
  router.get(
    "/hotels/:id/can-review",
    requireAuth,
    reviewController.checkCanReview,
  );
  router.get(
    "/hotels/:hotelId/can-review",
    requireAuth,
    reviewController.checkCanReview,
  );
}
if (
  typeof reviewController?.createReview === "function" &&
  typeof requireAuth === "function"
) {
  router.post(
    "/hotels/:id/reviews",
    requireAuth,
    reviewController.createReview,
  );
  router.post(
    "/hotels/:hotelId/reviews",
    requireAuth,
    reviewController.createReview,
  );
}

router.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

module.exports = router;
