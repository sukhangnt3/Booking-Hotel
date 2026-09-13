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
  checkPaymentStatus,
  handleBankWebhook,
  checkPayoutStatus,
} = paymentController;

// Webhook
router.get("/webhook", (req, res) =>
  res.json({ success: true, message: "Webhook is live" }),
);
router.post("/webhook", handleBankWebhook);
router.post("/sepay-webhook", handleBankWebhook);

// Checkout
router.post("/create-qr", createVietQrPayment);
router.get("/status/:bookingCode", checkPaymentStatus);

// 🌟 API ĐỐI SOÁT REAL-TIME QUYẾT TOÁN (GẮN CẢ 2 KIỂU URL ĐỂ KHÔNG BAO GIỜ 404)
router.get("/payout-status/:hotelId", checkPayoutStatus);
router.get("/payouts/status/:hotelId", checkPayoutStatus);

module.exports = router;
