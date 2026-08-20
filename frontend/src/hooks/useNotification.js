import { useState, useCallback, useEffect, useMemo } from "react";
import notificationService from "@/services/notificationService"; // Giả sử bạn có service này
import { useAuthStore } from "@/stores/authStore";

export const useNotification = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { isAuthenticated } = useAuthStore();

  // --- 1. LẤY DANH SÁCH THÔNG BÁO ---
  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;

    setLoading(true);
    try {
      const response = await notificationService.getAll();
      // Giả sử API trả về mảng các thông báo: [{id, title, message, is_read, createdAt}, ...]
      setNotifications(response.data || []);
    } catch (err) {
      setError("Không thể tải thông báo");
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Tự động tải thông báo khi mount (chỉ khi đã đăng nhập)
  useEffect(() => {
    fetchNotifications();

    // Tùy chọn: Bạn có thể set interval để tự động kiểm tra thông báo mới sau mỗi 2 phút
    const interval = setInterval(fetchNotifications, 120000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // --- 2. TÍNH TOÁN SỐ LƯỢNG CHƯA ĐỌC (DERIVED STATE) ---
  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.is_read).length;
  }, [notifications]);

  // --- 3. ĐÁNH DẤU MỘT THÔNG BÁO LÀ ĐÃ ĐỌC ---
  const markAsRead = async (id) => {
    // Optimistic UI: Cập nhật giao diện trước
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
    );

    try {
      await notificationService.markAsRead(id);
    } catch (err) {
      // Nếu API lỗi, bạn có thể fetch lại để đồng bộ hoặc giữ nguyên (silent fail)
      console.error("Lỗi đánh dấu đã đọc:", err);
    }
  };

  // --- 4. ĐÁNH DẤU TẤT CẢ LÀ ĐÃ ĐỌC ---
  const markAllAsRead = async () => {
    const previousNotifications = [...notifications];
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));

    try {
      await notificationService.markAllAsRead();
    } catch (err) {
      setNotifications(previousNotifications); // Hoàn tác nếu lỗi
      alert("Không thể cập nhật trạng thái thông báo");
    }
  };

  // --- 5. XÓA THÔNG BÁO ---
  const deleteNotification = async (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      await notificationService.delete(id);
    } catch (err) {
      fetchNotifications(); // Đồng bộ lại nếu lỗi
    }
  };

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh: fetchNotifications,
  };
};

export default useNotification;
