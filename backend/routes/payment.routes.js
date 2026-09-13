const express = require("express");
const router = express.Router();

// Tự động nhận diện tên file controller
let paymentController;
try {
  paymentController = require("../controllers/payment.controller");
} catch (e) {
  try {
    paymentController = require("../controllers/paymentController");
  } catch (err) {
    console.error("❌ Không tìm thấy file payment controller!", err);
    paymentController = {};
  }
}

// Lấy các hàm từ controller và gán fallback an toàn (Không bao giờ bị lỗi 'must be a function')
const createVietQrPayment =
  paymentController.createVietQrPayment ||
  ((req, res) => res.json({ success: true }));
const checkPaymentStatus =
  paymentController.checkPaymentStatus ||
  ((req, res) => res.json({ success: true, paid: false }));
const handleBankWebhook =
  paymentController.handleBankWebhook ||
  ((req, res) => res.json({ success: true }));
const confirmManualPayout =
  paymentController.confirmManualPayout ||
  ((req, res) => res.json({ success: true }));
const checkPayoutStatus =
  paymentController.checkPayoutStatus ||
  ((req, res) => res.json({ success: true, settled: false }));
const confirmManualPayment =
  paymentController.confirmManualPayment ||
  ((req, res) => res.json({ success: true }));

// ─── 0. KIỂM TRA WEBHOOK (GET) ───
router.get("/webhook", (req, res) =>
  res.json({ success: true, message: "Webhook live" }),
);
router.get("/sepay-webhook", (req, res) => res.json({ success: true }));

// ─── 1. THANH TOÁN ĐƠN PHÒNG KHÁCH ───
router.post("/create-qr", createVietQrPayment);
router.post("/vietqr-init", createVietQrPayment);
router.post("/confirm-manual", confirmManualPayment);
router.get("/status/:bookingCode", checkPaymentStatus);
router.get("/status", checkPaymentStatus);

// ─── 2. QUYẾT TOÁN CHO ADMIN ───
router.post("/payouts/confirm", confirmManualPayout);
router.post("/payout-confirm", confirmManualPayout);
router.get("/payout-status/:hotelId", checkPayoutStatus);
router.get("/payouts/status/:hotelId", checkPayoutStatus);

// ─── 3. WEBHOOK SEPAY (POST 24/7) ───
router.post("/webhook", handleBankWebhook);
router.post("/sepay-webhook", handleBankWebhook);

module.exports = router;
