import apiClient from "./apiClient";

const bookingService = {
  // 1. Tạo khóa phòng tạm thời (Sử dụng cho Table 10 trong DB)
  // Giúp giữ phòng trong 15-20 phút khi khách đang điền thông tin
  createTemporaryLock: async (lockData) => {
    // lockData: { room_id, checkIn, checkOut, quantity }
    const response = await apiClient.post("/bookings/temp-lock", lockData);
    return response.data;
  },

  // 2. Tạo đơn đặt phòng chính thức (Table 16)
  createBooking: async (bookingData) => {
    const response = await apiClient.post("/bookings", bookingData);
    return response.data;
  },

  // 3. Lấy chi tiết đơn hàng (Sử dụng cho trang Booking Success/Profile)
  getBookingDetail: async (bookingId) => {
    const response = await apiClient.get(`/bookings/${bookingId}`);
    return response.data;
  },

  // 4. Hủy đơn hàng
  cancelBooking: async (bookingId, reason) => {
    const response = await apiClient.post(`/bookings/${bookingId}/cancel`, {
      reason,
    });
    return response.data;
  },

  // 5. Cập nhật trạng thái đơn hàng (ĐƯỢC THÊM MỚI VÀO ĐÂY)
  // statusData: { status: "confirmed", payment_status: "unpaid" }
  updateBookingStatus: async (bookingCode, statusData) => {
    const response = await apiClient.put(
      `/bookings/${bookingCode}/status`,
      statusData,
    );
    return response.data;
  },
};

// QUAN TRỌNG: Dòng này để sửa lỗi "does not provide an export named 'default'"
export default bookingService;
