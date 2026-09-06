// backend/routes/index.js
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
const ownerRoutes = require("./owner.routes");
const chatbotRoutes = require("./chatbot.routes");
const uploadRoutes = require("./upload.routes"); // 👈 BỔ SUNG ROUTE UPLOAD

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
router.use("/admin", adminRoutes);
router.use("/owner", ownerRoutes);
router.use("/chatbot", chatbotRoutes);
router.use("/uploads", uploadRoutes); // 👈 GẮN VÀO /api/uploads

module.exports = router;
