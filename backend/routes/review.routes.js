const express = require("express");
const {
  createReview,
  listHotelReviews,
} = require("../controllers/review.controller");
const { requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();

/**
 * @swagger
 * /reviews/hotel/{hotelId}:
 *   get:
 *     summary: Lấy danh sách đánh giá theo khách sạn
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: hotelId
 *         required: true
 *         schema: { type: string }
 *         description: ID khách sạn
 *     responses:
 *       200:
 *         description: Danh sách đánh giá
 */
router.get("/hotel/:hotelId", listHotelReviews);

/**
 * @swagger
 * /reviews:
 *   post:
 *     summary: Tạo đánh giá mới
 *     tags: [Reviews]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               hotelId:
 *                 type: string
 *                 description: ID khách sạn
 *               point:
 *                 type: number
 *                 description: Số sao (1-5)
 *               bookingId:
 *                 type: string
 *                 description: ID đơn đặt (không bắt buộc)
 *               description:
 *                 type: string
 *                 description: Nội dung đánh giá
 *     responses:
 *       201:
 *         description: Đánh giá thành công
 */
router.post("/", requireAuth, createReview);

module.exports = router;
