import apiClient from "./apiClient";

export const promotionService = {
  // 1. DÀNH CHO KHÁCH HÀNG (CHECKOUT)
  /**
   * Kiểm tra mã giảm giá và tính toán số tiền giảm
   * @param {String} code - Mã code người dùng nhập
   * @param {Object} context - { hotelId, totalAmount, roomTypeId }
   */
  checkCode: (code, context) => {
    /**
     * Backend sẽ trả về: {
     *   isValid: true,
     *   discountAmount: 200000,
     *   finalAmount: 1800000,
     *   message: "Áp dụng thành công"
     * }
     */
    return apiClient.post("/promotions/check", { code, ...context });
  },

  /**
   * Lấy danh sách ưu đãi đang có hiệu lực của một khách sạn cụ thể
   */
  getAvailableByHotel: (hotelId) => {
    return apiClient.get(`/hotels/${hotelId}/promotions`);
  },

  /**
   * Lấy danh sách mã giảm giá toàn sàn (Global Coupons) dành cho người dùng
   */
  getGlobalDeals: () => {
    return apiClient.get("/promotions/global");
  },

  // 2. DÀNH CHO CHỦ KHÁCH SẠN (OWNER)
  /**
   * Lấy danh sách khuyến mãi của riêng khách sạn đó
   */
  getOwnerPromotions: (params) => {
    return apiClient.get("/owner/promotions", { params });
  },

  create: (data) => {
    /**
     * data: { code, discount_type, value, min_order_value, start_date, end_date, hotel_id }
     */
    return apiClient.post("/promotions", data);
  },

  update: (id, data) => {
    return apiClient.put(`/promotions/${id}`, data);
  },

  delete: (id) => {
    return apiClient.delete(`/promotions/${id}`);
  },

  // 3. DÀNH CHO QUẢN TRỊ VIÊN (ADMIN)
  /**
   * Lấy danh sách toàn bộ mã giảm giá để quản lý
   */
  getAll: (params) => {
    return apiClient.get("/admin/promotions", { params });
  },

  /**
   * Bật/Tắt mã giảm giá (Duyệt hoặc Khóa)
   */
  toggleStatus: (id, isActive) => {
    return apiClient.patch(`/promotions/${id}/status`, { isActive });
  },
};

export default promotionService;
