import apiClient from "./apiClient";

export const notificationService = {
  /**
   * 1. LẤY DANH SÁCH THÔNG BÁO
   * @param {Object} params { page, limit, type }
   * type có thể là: 'booking', 'promotion', 'system'
   */
  getAll: (params) => {
    return apiClient.get("/notifications", { params });
  },

  /**
   * 2. LẤY SỐ LƯỢNG THÔNG BÁO CHƯA ĐỌC
   * Dùng để hiển thị con số trên icon Chuông ở Header
   */
  getUnreadCount: () => {
    return apiClient.get("/notifications/unread-count");
  },

  /**
   * 3. ĐÁNH DẤU MỘT THÔNG BÁO LÀ ĐÃ ĐỌC
   */
  markAsRead: (id) => {
    return apiClient.patch(`/notifications/${id}/read`);
  },

  /**
   * 4. ĐÁNH DẤU TẤT CẢ LÀ ĐÃ ĐỌC
   */
  markAllAsRead: () => {
    return apiClient.patch("/notifications/read-all");
  },

  /**
   * 5. XÓA THÔNG BÁO
   */
  delete: (id) => {
    return apiClient.delete(`/notifications/${id}`);
  },

  /**
   * 6. CÀI ĐẶT THÔNG BÁO (Dành cho trang Profile)
   * Cho phép user bật/tắt nhận thông báo qua Email hoặc App
   */
  getSettings: () => {
    return apiClient.get("/notifications/settings");
  },

  updateSettings: (settings) => {
    /**
     * settings: { email_notify: true, push_notify: false }
     */
    return apiClient.put("/notifications/settings", settings);
  },
};

export default notificationService;
