const express = require("express");
const authRoutes = require("./auth.routes");
const bookingRoutes = require("./booking.routes");
const favoriteRoutes = require("./favorite.routes");
const healthRoutes = require("./health.routes");
const hotelRoutes = require("./hotel.routes");
const notificationRoutes = require("./notification.routes");
const paymentRoutes = require("./payment.routes");
const promotionRoutes = require("./promotion.routes");
const reviewRoutes = require("./review.routes");
const roomRoutes = require("./room.routes");
const usersRoutes = require("./users.routes");
const adminRoutes = require("../admin/admin.routes");

const router = express.Router();

router.use(healthRoutes);
router.use("/auth", authRoutes);
router.use("/bookings", bookingRoutes);
router.use("/favorites", favoriteRoutes);
router.use("/hotels", hotelRoutes);
router.use("/notifications", notificationRoutes);
router.use("/payments", paymentRoutes);
router.use("/promotions", promotionRoutes);
router.use("/reviews", reviewRoutes);
router.use("/rooms", roomRoutes);
router.use("/users", usersRoutes);
// ─── ADMIN - Yêu cầu role 'admin' (bảo vệ trong admin.routes.js) ───
router.use("/admin", adminRoutes);

module.exports = router;
