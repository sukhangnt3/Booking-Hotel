import apiClient from "./apiClient";

export const reviewService = {
  // 1. DÀNH CHO KHÁCH HÀNG & TRANG CHI TIẾT
  /**
   * Lấy danh sách đánh giá của một khách sạn
   * @param {String} hotelId
   * @param {Object} params { page, limit, rating }
   */
  getByHotelId: (hotelId, params) => {
    return apiClient.get(`/hotels/${hotelId}/reviews`, { params });
  },

  /**
   * Gửi đánh giá mới
   * Lưu ý: Thường yêu cầu bookingId để đảm bảo khách đã thực sự ở đây (Verified Review)
   */
  create: (data) => {
    /**
     * data: { hotelId, bookingId, rating, comment, images }
     */
    return apiClient.post("/reviews", data);
  },

  /**
   * Đánh dấu một nhận xét là "Hữu ích" (Like)
   */
  toggleHelpful: (reviewId) => {
    return apiClient.post(`/reviews/${reviewId}/helpful`);
  },

  // 2. DÀNH CHO CHỦ KHÁCH SẠN (OWNER)
  /**
   * Lấy tất cả đánh giá của các khách sạn thuộc sở hữu của chủ nhà
   */
  getOwnerReviews: (params) => {
    return apiClient.get("/owner/reviews", { params });
  },

  /**
   * Phản hồi lại đánh giá của khách
   */
  reply: (reviewId, replyText) => {
    return apiClient.post(`/reviews/${reviewId}/reply`, { content: replyText });
  },

  // 3. DÀNH CHO QUẢN TRỊ VIÊN (ADMIN)
  /**
   * Admin xóa đánh giá nếu vi phạm tiêu chuẩn cộng đồng
   */
  delete: (reviewId) => {
    return apiClient.delete(`/reviews/${reviewId}`);
  },

  /**
   * Lấy thống kê đánh giá toàn hệ thống
   */
  getStats: () => {
    return apiClient.get("/admin/reviews/stats");
  },
};

export default reviewService;
