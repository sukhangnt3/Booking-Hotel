const express = require("express");
const authRoutes = require("./auth.routes");
const bookingRoutes = require("./booking.routes");
const favoriteRoutes = require("./favorite.routes");
const healthRoutes = require("./health.routes");
const hotelRoutes = require("./hotel.routes");
const notificationRoutes = require("./notification.routes");
const promotionRoutes = require("./promotion.routes");
const reviewRoutes = require("./review.routes");
const roomRoutes = require("./room.routes");
const { login, register } = require("../controllers/auth.controller");

const router = express.Router();

router.use(healthRoutes);
router.use("/auth", authRoutes);
router.use("/bookings", bookingRoutes);
router.use("/favorites", favoriteRoutes);
router.use("/hotels", hotelRoutes);
router.use("/notifications", notificationRoutes);
router.use("/promotions", promotionRoutes);
router.use("/reviews", reviewRoutes);
router.use("/rooms", roomRoutes);

// Backward compatibility for older frontend components.
router.post("/register", register);
router.post("/login", login);

module.exports = router;
