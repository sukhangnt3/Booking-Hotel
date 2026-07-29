const pool = require("../config/database");
const { formatNotification } = require("../utils/formatters");

async function listNotifications(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT id, title, content, type, link, read_at, created_at
       FROM notification
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.auth.sub],
    );

    return res.json({
      notifications: result.rows.map(formatNotification),
      unreadCount: result.rows.filter((item) => !item.read_at).length,
    });
  } catch (error) {
    return next(error);
  }
}

async function markNotificationAsRead(req, res, next) {
  try {
    const result = await pool.query(
      `UPDATE notification
       SET read_at = COALESCE(read_at, NOW())
       WHERE id = $1 AND user_id = $2
       RETURNING id, title, content, type, link, read_at, created_at`,
      [req.params.id, req.auth.sub],
    );

    if (!result.rows[0]) {
      return res.status(404).json({ message: "Không tìm thấy thông báo." });
    }

    return res.json({
      notification: formatNotification(result.rows[0]),
    });
  } catch (error) {
    return next(error);
  }
}

async function markAllNotificationsAsRead(req, res, next) {
  try {
    await pool.query(
      `UPDATE notification
       SET read_at = COALESCE(read_at, NOW())
       WHERE user_id = $1 AND read_at IS NULL`,
      [req.auth.sub],
    );

    return res.json({ message: "Đã đọc tất cả thông báo." });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
};
