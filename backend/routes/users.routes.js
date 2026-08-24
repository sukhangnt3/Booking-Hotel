const express = require("express");
const { listUserFavorites } = require("../controllers/favorite.controller");
const { requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();

router.use(requireAuth);

/**
 * @swagger
 * /users/favorites:
 *   get:
 *     summary: Lấy danh sách yêu thích của user hiện tại
 *     tags: [Favorites]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Danh sách yêu thích
 */
router.get("/favorites", listUserFavorites);

module.exports = router;