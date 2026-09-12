// backend/routes/payment.routes.js
const express = require("express");
const router = express.Router();

const {
  createVietQrPayment,
  confirmManualPayment,
  checkPaymentStatus,
  handleBankWebhook,
} = require("../controllers/payment.controller");

// 1. Tạo thông tin VietQR động (hỗ trợ cả 2 endpoint create-qr và vietqr-init)
router.post("/create-qr", createVietQrPayment);
router.post("/vietqr-init", createVietQrPayment);

// 2. Nút "Tôi đã chuyển khoản xong" (Xác nhận thủ công)
router.post("/confirm-manual", confirmManualPayment);

// 3. Kiểm tra trạng thái thanh toán theo thời gian thực (hỗ trợ cả param lẫn query)
router.get("/status/:bookingCode", checkPaymentStatus);
router.get("/status", checkPaymentStatus);
router.get("/check-status", checkPaymentStatus);

// 4. Webhook ngân hàng tự động (SePay, Casso, MBBank Open API)
router.post("/webhook", handleBankWebhook);

module.exports = router;
