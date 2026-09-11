const express = require("express");
const router = express.Router();
const bookingController = require("../controllers/booking.controller");
const { requireAuth, optionalAuth } = require("../middleware/auth.middleware");

// 1. Xác nhận thanh toán VietQR (Công khai)
router.post("/confirm-payment", bookingController.confirmPayment);

// 2. Tạo đơn đặt phòng mới (cho phép cả khách vãng lai lẫn khách có tài khoản)
router.post("/", optionalAuth, bookingController.createBooking);

// 3. Tra cứu thông tin đơn bằng mã booking_code (Đã JOIN bảng payment)
router.get("/code/:code", bookingController.getBookingByCode);

// 4. Lấy lịch sử đặt phòng của người dùng đăng nhập (Đã JOIN bảng payment lấy số tiền cọc)
router.get("/my-bookings", requireAuth, bookingController.getMyBookings);
router.get("/my", requireAuth, bookingController.getMyBookings);

// 5. Hủy đơn đặt phòng
router.patch("/:id/cancel", requireAuth, bookingController.cancelBooking);

module.exports = router;
