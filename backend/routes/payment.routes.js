const express = require("express");
const router = express.Router();

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
  checkPayoutStatus,
  confirmManualPayout,
} = paymentController;

// ─── 0. KIỂM TRA TRẠNG THÁI WEBHOOK (Dành cho trình duyệt GET) ───
router.get("/webhook", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "✓ Cổng Webhook SePay đang hoạt động bình thường!",
    server_time: new Date().toISOString(),
  });
});
router.get("/sepay-webhook", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "✓ Cổng Webhook SePay đang hoạt động bình thường!",
  });
});

// ─── 1. TẠO THÔNG TIN MÃ QR THANH TOÁN (VỀ STK ADMIN) ───
router.post("/create-qr", createVietQrPayment);
router.post("/vietqr-init", createVietQrPayment);

// ─── 2. NÚT KIỂM TRA NGAY TẠI CHECKOUT ───
router.post("/confirm-manual", confirmManualPayment);

// ─── 3. CHECK TRẠNG THÁI CHO KHÁCH (CHECKOUT AUTO-POLLING) ───
router.get("/status/:bookingCode", checkPaymentStatus);
router.get("/status", checkPaymentStatus);
router.get("/check-status", checkPaymentStatus);

// ─── 4. CHECK TRẠNG THÁI QUYẾT TOÁN CHO ADMIN (ADMIN AUTO-POLLING) ───
router.get("/payout-status/:hotelId", checkPayoutStatus);
router.get("/payouts/status/:hotelId", checkPayoutStatus);

// ─── 5. NÚT XÁC NHẬN QUYẾT TOÁN THỦ CÔNG CỦA ADMIN ───
router.post("/payouts/confirm", confirmManualPayout);
router.post("/payout-confirm", confirmManualPayout);

// ─── 6. WEBHOOK TỰ ĐỘNG NHẬN TÍN HIỆU TỪ SEPAY (POST 24/7) ───
router.post("/webhook", handleBankWebhook);
router.post("/sepay-webhook", handleBankWebhook);

module.exports = router;
