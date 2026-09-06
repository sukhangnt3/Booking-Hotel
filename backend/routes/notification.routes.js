// backend/routes/notification.routes.js
const express = require("express");
const {
  listNotifications,
  getUnreadCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} = require("../controllers/notification.controller");
const { requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();

router.use(requireAuth);

// 1. Lấy danh sách thông báo: GET /api/notifications
router.get("/", listNotifications);

// 2. Lấy số lượng thông báo chưa đọc cho chuông Header: GET /api/notifications/unread-count
router.get("/unread-count", getUnreadCount);

// 3. Đánh dấu tất cả đã đọc: PATCH /api/notifications/read-all
router.patch("/read-all", markAllNotificationsAsRead);

// 4. Đánh dấu 1 thông báo cụ thể: PATCH /api/notifications/:id/read
router.patch("/:id/read", markNotificationAsRead);

module.exports = router;
