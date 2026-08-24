const express = require("express");
const {
  listNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} = require("../controllers/notification.controller");
const { requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();

router.use(requireAuth);

/**
 * @swagger
 * /notifications:
 *   get:
 *     summary: Lấy danh sách thông báo của user
 *     tags: [Notifications]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Danh sách thông báo
 */
router.get("/", listNotifications);

/**
 * @swagger
 * /notifications/read-all:
 *   patch:
 *     summary: Đánh dấu tất cả thông báo đã đọc
 *     tags: [Notifications]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Đã đánh dấu
 */
router.patch("/read-all", markAllNotificationsAsRead);

/**
 * @swagger
 * /notifications/{id}/read:
 *   patch:
 *     summary: Đánh dấu một thông báo đã đọc
 *     tags: [Notifications]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Đã đánh dấu
 */
router.patch("/:id/read", markNotificationAsRead);

module.exports = router;
