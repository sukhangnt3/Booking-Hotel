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
} = paymentController;

// Kiểm tra Webhook
router.get("/webhook", (req, res) =>
  res.json({ success: true, message: "Webhook is live" }),
);
router.get("/sepay-webhook", (req, res) => res.json({ success: true }));

// Khách tạo QR thanh toán
router.post("/create-qr", createVietQrPayment);
router.post("/vietqr-init", createVietQrPayment);
router.post("/confirm-manual", confirmManualPayment);
router.get("/status/:bookingCode", checkPaymentStatus);
router.get("/status", checkPaymentStatus);

// 🌟 API ĐỐI SOÁT QUYẾT TOÁN CHO ADMIN (TỰ ĐỘNG 100%)
router.get("/payout-status/:hotelId", checkPayoutStatus);
router.get("/payouts/status/:hotelId", checkPayoutStatus);

// Webhook SePay lắng nghe
router.post("/webhook", handleBankWebhook);
router.post("/sepay-webhook", handleBankWebhook);

module.exports = router;
