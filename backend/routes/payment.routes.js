const express = require("express");
const router = express.Router();

// Tự động nhận diện cả 2 kiểu đặt tên file controller
let paymentController;
try {
  paymentController = require("../controllers/paymentController");
} catch (e) {
  paymentController = require("../controllers/payment.controller");
}

const {
  createVietQrPayment,
  confirmManualPayment,
  checkPaymentStatus,
  handleBankWebhook,
} = paymentController;

// ─── 0. KIỂM TRA TRẠNG THÁI WEBHOOK (Dành cho trình duyệt GET) ───
// Giúp bạn mở link trên trình duyệt không bị lỗi "Không tìm thấy API"
router.get("/webhook", (req, res) => {
  return res.status(200).json({
    success: true,
    message:
      "✓ Cổng Webhook SePay đang hoạt động bình thường (Sẵn sàng nhận POST từ SePay)!",
    server_time: new Date().toISOString(),
  });
});
router.get("/sepay-webhook", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "✓ Cổng Webhook SePay đang hoạt động bình thường!",
  });
});

// ─── 1. TẠO THÔNG TIN MÃ QR THANH TOÁN ───
router.post("/create-qr", createVietQrPayment);
router.post("/vietqr-init", createVietQrPayment);

// ─── 2. NÚT "TÔI ĐÃ CHUYỂN KHOẢN - KIỂM TRA NGAY" (Đối soát trực tiếp SePay API) ───
router.post("/confirm-manual", confirmManualPayment);

// ─── 3. CHECK TRẠNG THÁI CHO FRONTEND AUTO-POLLING (Mỗi 2.5 giây) ───
router.get("/status/:bookingCode", checkPaymentStatus);
router.get("/status", checkPaymentStatus);
router.get("/check-status", checkPaymentStatus);

// ─── 4. WEBHOOK TỰ ĐỘNG NHẬN TÍN HIỆU TỪ SEPAY (POST 24/7) ───
router.post("/webhook", handleBankWebhook);
router.post("/sepay-webhook", handleBankWebhook);

module.exports = router;
