const express = require("express");
const { createVnpayUrl, vnpayReturn } = require("../controllers/payment.controller");
const { requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();

/**
 * @swagger
 * /payments/create-vnpay-url:
 *   post:
 *     summary: Tạo URL thanh toán VNPay
 *     tags: [Payments]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               bookingCode:
 *                 type: string
 *                 description: Mã đơn đặt phòng
 *               amount:
 *                 type: number
 *                 description: Số tiền thanh toán
 *               orderInfo:
 *                 type: string
 *                 description: Thông tin đơn hàng (không bắt buộc)
 *     responses:
 *       200:
 *         description: URL thanh toán VNPay
 */
router.post("/create-vnpay-url", requireAuth, createVnpayUrl);

/**
 * @swagger
 * /payments/vnpay-return:
 *   get:
 *     summary: Xử lý kết quả thanh toán VNPay trả về
 *     tags: [Payments]
 *     parameters:
 *       - in: query
 *         name: vnp_ResponseCode
 *         schema: { type: string }
 *         description: Mã phản hồi từ VNPay
 *       - in: query
 *         name: vnp_TxnRef
 *         schema: { type: string }
 *         description: Mã giao dịch tham chiếu
 *     responses:
 *       200:
 *         description: Kết quả thanh toán
 */
router.get("/vnpay-return", vnpayReturn);

module.exports = router;