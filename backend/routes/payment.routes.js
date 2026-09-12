// backend/routes/payment.routes.js
const express = require("express");
const router = express.Router();

// Tự động nhận diện cả 2 kiểu đặt tên file: payment.controller.js hoặc paymentController.js
let paymentController;
try {
  paymentController = require("../controllers/payment.controller");
} catch (e) {
  paymentController = require("../controllers/paymentController");
}

const {
  createVietQrPayment,
  confirmManualPayment,
  checkPaymentStatus,
  handleBankWebhook,
} = paymentController;

// 1. Tạo thông tin VietQR động theo tài khoản ngân hàng của Owner khách sạn
router.post("/create-qr", createVietQrPayment);
router.post("/vietqr-init", createVietQrPayment);

// 2. Nút "Tôi đã chuyển khoản - Kiểm tra ngay" (Đối soát SePay thực tế trước khi lưu)
router.post("/confirm-manual", confirmManualPayment);

// 3. Kiểm tra trạng thái thanh toán theo thời gian thực (Polling mỗi 2.5 giây)
router.get("/status/:bookingCode", checkPaymentStatus);
router.get("/status", checkPaymentStatus);
router.get("/check-status", checkPaymentStatus);

// 4. Webhook ngân hàng tự động nhận từ SePay (Cấu hình trên my.sepay.vn)
router.post("/webhook", handleBankWebhook);
router.post("/sepay-webhook", handleBankWebhook);

module.exports = router;
