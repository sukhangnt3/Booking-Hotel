const express = require("express");
const {
  createVietQrPayment,
  confirmManualPayment,
  checkPaymentStatus,
} = require("../controllers/payment.controller");
const { requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();

// 1. Tạo thông tin VietQR
router.post("/vietqr-init", createVietQrPayment);

// 2. Nút "Tôi đã chuyển khoản xong" (API BẠN ĐANG THIẾU DÒNG NÀY)
router.post("/confirm-manual", confirmManualPayment);

// 3. Kiểm tra trạng thái
router.get("/check-status", checkPaymentStatus);

module.exports = router;
