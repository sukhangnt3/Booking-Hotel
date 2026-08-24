const express = require("express");
const { listPromotions } = require("../controllers/promotion.controller");

const router = express.Router();

/**
 * @swagger
 * /promotions:
 *   get:
 *     summary: Lấy danh sách khuyến mãi đang hoạt động
 *     tags: [Promotions]
 *     responses:
 *       200:
 *         description: Danh sách khuyến mãi
 */
router.get("/", listPromotions);

module.exports = router;
