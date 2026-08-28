const express = require("express");
const { registerPartner } = require("../controllers/partner.controller");

const router = express.Router();

/**
 * @swagger
 * /partner/register:
 *   post:
 *     summary: Đăng ký đối tác chủ chỗ nghỉ (Tạo tài khoản + Hotel + Phòng)
 *     tags: [Partner]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ownerName: { type: string }
 *               emailContact: { type: string }
 *               password: { type: string }
 *               phoneContact: { type: string }
 *               hotelNameVi: { type: string }
 *               hotelNameEn: { type: string }
 *               province: { type: string }
 *               district: { type: string }
 *               starRating: { type: number }
 *               rooms: { type: array }
 *               taxCode: { type: string }
 *               bankAccount: { type: string }
 *               bankAccountName: { type: string }
 *               bankName: { type: string }
 *               commissionRate: { type: number }
 *     responses:
 *       201:
 *         description: Đăng ký thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 */
router.post("/register", registerPartner);

module.exports = router;
