// src/hooks/useNotification.js
import { useState, useCallback, useEffect } from "react";
import notificationService from "@/services/notificationService";
import { useAuthStore } from "@/stores/authStore";

export const useNotification = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { isAuthenticated } = useAuthStore();

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    setLoading(true);
    try {
      const res = await notificationService.getAll();
      const list = Array.isArray(res)
        ? res
        : res?.notifications || res?.data || [];
      setNotifications(list);
      setUnreadCount(
        Number(
          res?.unreadCount ||
            list.filter((n) => !n.readAt && !n.read_at).length,
        ),
      );
    } catch (err) {
      console.warn("Lỗi tải thông báo:", err);
      setError("Không thể tải thông báo");
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = async (id) => {
    setNotifications((prev) =>
      prev.map((n) =>
        String(n.id) === String(id) ? { ...n, read_at: new Date() } : n,
      ),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      await notificationService.markAsRead(id);
    } catch (err) {
      console.warn("Lỗi đánh dấu đã đọc:", err);
    }
  };

  const markAllAsRead = async () => {
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read_at: new Date() })),
    );
    setUnreadCount(0);

    try {
      await notificationService.markAllAsRead();
    } catch (err) {
      fetchNotifications();
    }
  };

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    refresh: fetchNotifications,
  };
};

export default useNotification;
