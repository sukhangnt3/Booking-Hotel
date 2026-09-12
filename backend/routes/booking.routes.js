// backend/routes/booking.routes.js
const express = require("express");
const router = express.Router();

const bookingController = require("../controllers/booking.controller");
const { requireAuth, optionalAuth } = require("../middleware/auth.middleware");

// 1. Tạo đơn đặt phòng mới & giữ phòng 15 phút vào temporary_locks (hỗ trợ cả khách vãng lai và đã login)
router.post("/", optionalAuth, bookingController.createBooking);

// 2. Tra cứu thông tin đơn bằng mã booking_code (Đã JOIN bảng payment)
router.get("/code/:code", bookingController.getBookingByCode);

// 3. Lấy lịch sử đặt phòng của người dùng đăng nhập
router.get("/my-bookings", requireAuth, bookingController.getMyBookings);
router.get("/my", requireAuth, bookingController.getMyBookings);

// 4. Hủy đơn đặt phòng và giải phóng temporary_locks
router.patch("/:id/cancel", requireAuth, bookingController.cancelBooking);
router.post("/:id/cancel", requireAuth, bookingController.cancelBooking);

// 5. Route fallback xác nhận thanh toán qua bookings
router.post("/confirm-payment", bookingController.confirmPayment);

module.exports = router;
