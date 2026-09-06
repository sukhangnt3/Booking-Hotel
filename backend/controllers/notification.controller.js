// backend/controllers/notification.controller.js
const pool = require("../config/database");
const { formatNotification } = require("../utils/formatters");

// ─── 1. LẤY DANH SÁCH THÔNG BÁO CỦA NGƯỜI DÙNG ───
async function listNotifications(req, res, next) {
  try {
    const userId = req.user?.id || req.auth?.sub || req.auth?.id;
    if (!userId) {
      return res.json({ success: true, notifications: [], unreadCount: 0 });
    }

    const result = await pool.query(
      `SELECT id, title, content, type, link, read_at, created_at
       FROM public.notification
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [userId],
    );

    const formatted = result.rows.map((r) =>
      typeof formatNotification === "function" ? formatNotification(r) : r,
    );
    const unreadCount = result.rows.filter((item) => !item.read_at).length;

    return res.json({
      success: true,
      notifications: formatted,
      unreadCount,
    });
  } catch (error) {
    console.warn("Lưu ý (bảng notification):", error.message);
    return res.json({ success: true, notifications: [], unreadCount: 0 });
  }
}

// ─── 2. LẤY RIÊNG SỐ LƯỢNG THÔNG BÁO CHƯA ĐỌC CHO ICON CHUÔNG Ở HEADER ───
async function getUnreadCount(req, res, next) {
  try {
    const userId = req.user?.id || req.auth?.sub || req.auth?.id;
    if (!userId) {
      return res.json({ success: true, unreadCount: 0 });
    }

    const result = await pool.query(
      `SELECT COUNT(*)::int AS count
       FROM public.notification
       WHERE user_id = $1 AND read_at IS NULL`,
      [userId],
    );

    return res.json({
      success: true,
      unreadCount: result.rows[0]?.count || 0,
    });
  } catch (error) {
    return res.json({ success: true, unreadCount: 0 });
  }
}

// ─── 3. ĐÁNH DẤU MỘT THÔNG BÁO LÀ ĐÃ ĐỌC ───
async function markNotificationAsRead(req, res, next) {
  try {
    const userId = req.user?.id || req.auth?.sub || req.auth?.id;
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE public.notification
       SET read_at = COALESCE(read_at, NOW())
       WHERE id::text = $1 AND user_id = $2
       RETURNING id, title, content, type, link, read_at, created_at`,
      [id, userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy thông báo." });
    }

    const formatted =
      typeof formatNotification === "function"
        ? formatNotification(result.rows[0])
        : result.rows[0];

    return res.json({
      success: true,
      notification: formatted,
    });
  } catch (error) {
    return next(error);
  }
}

// ─── 4. ĐÁNH DẤU TẤT CẢ LÀ ĐÃ ĐỌC ───
async function markAllNotificationsAsRead(req, res, next) {
  try {
    const userId = req.user?.id || req.auth?.sub || req.auth?.id;

    await pool.query(
      `UPDATE public.notification
       SET read_at = COALESCE(read_at, NOW())
       WHERE user_id = $1 AND read_at IS NULL`,
      [userId],
    );

    return res.json({ success: true, message: "Đã đọc tất cả thông báo." });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listNotifications,
  getUnreadCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
};
