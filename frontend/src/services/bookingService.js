import apiClient from "./apiClient";

export const bookingService = {
  // ─── 1. DÀNH CHO KHÁCH HÀNG (CUSTOMER) ───
  // Tạo đơn đặt phòng mới
  create: (data) => apiClient.post("/bookings", data),
  createBooking: (data) => apiClient.post("/bookings", data),

  // Lấy lịch sử đặt phòng của khách hàng (ĐÚNG ROUTE BACKEND: /api/bookings/my)
  getHistory: async (params) => {
    try {
      // 1. Gọi đúng route Backend: /bookings/my
      const res = await apiClient.get("/bookings/my", { params });
      return res?.data || res?.bookings || res?.booking_list || res || [];
    } catch (err1) {
      try {
        // 2. Fallback sang /bookings/my-bookings
        const res2 = await apiClient.get("/bookings/my-bookings", { params });
        return res2?.data || res2?.bookings || res2 || [];
      } catch (err2) {
        console.warn("Chưa tải được lịch sử đơn hàng:", err2);
        return [];
      }
    }
  },

  getMyBookings: async (params) => {
    return bookingService.getHistory(params);
  },

  // Lấy chi tiết một đơn hàng cụ thể theo ID hoặc BookingCode
  getById: (id) => apiClient.get(`/bookings/${id}`),
  getBookingDetail: (id) => apiClient.get(`/bookings/${id}`),

  // Hủy đơn hàng
  cancel: (id, data) => apiClient.post(`/bookings/${id}/cancel`, data),
  cancelBooking: (id, data) => apiClient.post(`/bookings/${id}/cancel`, data),

  // ─── 2. CƠ CHẾ GIỮ PHÒNG TẠM THỜI (TEMP LOCK) ───
  createTempLock: (data) => apiClient.post("/bookings/temp-lock", data),
  createTemporaryLock: (data) => apiClient.post("/bookings/temp-lock", data),
  releaseTempLock: (lockId) =>
    apiClient.delete(`/bookings/temp-lock/${lockId}`),

  // ─── 3. DÀNH CHO CHỦ KHÁCH SẠN (OWNER) ───
  getOwnerBookings: (hotelId, params) =>
    apiClient.get(`/hotels/${hotelId}/bookings`, { params }),

  confirm: (id) => apiClient.patch(`/bookings/${id}/confirm`),
  checkIn: (id) => apiClient.patch(`/bookings/${id}/check-in`),
  checkOut: (id) => apiClient.patch(`/bookings/${id}/check-out`),

  // ─── 4. DÀNH CHO QUẢN TRỊ VIÊN (ADMIN) ───
  getAll: (params) => apiClient.get("/admin/bookings", { params }),

  // Cập nhật trạng thái đơn hàng (Hỗ trợ cả route /code/:code/status của Backend)
  updateStatus: async (code, data) => {
    try {
      return await apiClient.post(`/bookings/code/${code}/status`, data);
    } catch {
      return await apiClient.put(`/bookings/${code}/status`, data);
    }
  },
  updateBookingStatus: async (code, data) => {
    return bookingService.updateStatus(code, data);
  },

  // ─── 5. THANH TOÁN (PAYMENT) ───
  getPaymentUrl: (id, provider) =>
    apiClient.get(`/bookings/${id}/payment-url`, { params: { provider } }),

  verifyPayment: (params) =>
    apiClient.get("/bookings/verify-payment", { params }),
};

export default bookingService;
