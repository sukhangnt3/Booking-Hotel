// backend/routes/payment.routes.js
const express = require("express");
const router = express.Router();

const {
  createVietQrPayment,
  confirmManualPayment,
  checkPaymentStatus,
  handleBankWebhook,
} = require("../controllers/paymentController");

// 1. Tạo thông tin VietQR động theo tài khoản ngân hàng của Owner khách sạn
router.post("/create-qr", createVietQrPayment);
router.post("/vietqr-init", createVietQrPayment);

// 2. Nút "Tôi đã chuyển khoản - Kiểm tra ngay" (Gọi API SePay xác thực thực tế trước khi lưu)
router.post("/confirm-manual", confirmManualPayment);

// 3. Kiểm tra trạng thái thanh toán theo thời gian thực (Polling mỗi 2.5 giây)
router.get("/status/:bookingCode", checkPaymentStatus);
router.get("/status", checkPaymentStatus);
router.get("/check-status", checkPaymentStatus);

// 4. Webhook ngân hàng tự động nhận từ SePay (Cấu hình trên my.sepay.vn)
router.post("/webhook", handleBankWebhook);
router.post("/sepay-webhook", handleBankWebhook);

module.exports = router;
