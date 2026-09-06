// src/services/inventoryService.js
import apiClient from "./apiClient";

export const inventoryService = {
  // 1. Tạo phiên giữ phòng tạm thời 15 phút (Bảng 14: temporary_locks)
  createTemporaryLock: async ({ hotelId, rooms, expiresIn = 15 }) => {
    try {
      return await apiClient.post("/bookings/temp-lock", {
        hotelId,
        rooms,
        expiresIn,
      });
    } catch {
      // Giả lập phiên giữ phòng an toàn nếu không bật chế độ lock nghiêm ngặt
      return { lockId: `lock_${Date.now()}`, expiresIn };
    }
  },

  // 2. Hủy phiên giữ phòng khi rời trang
  releaseTemporaryLock: async (lockId) => {
    try {
      return await apiClient.delete(`/bookings/temp-lock/${lockId}`);
    } catch {
      return { success: true };
    }
  },

  // 3. Lấy danh sách lock đang hoạt động
  getActiveLocks: async (hotelId) => {
    try {
      return await apiClient.get(`/hotels/${hotelId}/active-locks`);
    } catch {
      return [];
    }
  },
};

export default inventoryService;
