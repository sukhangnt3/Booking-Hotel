const express = require("express");
const {
  addFavorite,
  listFavorites,
  removeFavorite,
} = require("../controllers/favorite.controller");
const { requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();

router.use(requireAuth);

/**
 * @swagger
 * /favorites:
 *   get:
 *     summary: Lấy danh sách yêu thích của user
 *     tags: [Favorites]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Danh sách yêu thích
 */
router.get("/", listFavorites);

/**
 * @swagger
 * /favorites/{hotelId}:
 *   post:
 *     summary: Thêm khách sạn vào yêu thích
 *     tags: [Favorites]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: hotelId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       201:
 *         description: Đã thêm yêu thích
 *   delete:
 *     summary: Bỏ yêu thích khách sạn
 *     tags: [Favorites]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: hotelId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Đã bỏ yêu thích
 */
router.post("/:hotelId", addFavorite);
router.delete("/:hotelId", removeFavorite);

module.exports = router;
