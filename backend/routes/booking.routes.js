// backend/routes/booking.routes.js
const express = require("express");
const router = express.Router();
const bookingController = require("../controllers/booking.controller");
const { requireAuth, optionalAuth } = require("../middleware/auth.middleware");

// 1. Tạo đơn đặt phòng mới & giữ phòng 15 phút
router.post("/", optionalAuth, bookingController.createBooking);

// 2. Tra cứu thông tin đơn bằng mã booking_code
router.get("/code/:code", bookingController.getBookingByCode);

// 3. Lấy lịch sử đặt phòng của người dùng
router.get("/my-bookings", requireAuth, bookingController.getMyBookings);
router.get("/my", requireAuth, bookingController.getMyBookings);

// 4. Hủy đơn đặt phòng và giải phóng temporary_locks (Hỗ trợ cả guest và user)
router.patch("/:id/cancel", optionalAuth, bookingController.cancelBooking);
router.post("/:id/cancel", optionalAuth, bookingController.cancelBooking);

// 5. Xác nhận thanh toán
router.post("/confirm-payment", bookingController.confirmPayment);

module.exports = router;
