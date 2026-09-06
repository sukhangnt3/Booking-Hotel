// src/services/promotionService.js
import apiClient from "./apiClient";

export const promotionService = {
  // 1. Kiểm tra mã và tính số tiền giảm thật từ database
  checkCode: (code, context = {}) => {
    return apiClient.post("/promotions/check", { code, ...context });
  },

  // 2. Lấy danh sách ưu đãi toàn sàn
  getGlobalDeals: () => {
    return apiClient.get("/promotions/global");
  },

  // 3. Lấy ưu đãi theo khách sạn
  getAvailableByHotel: (hotelId) => {
    return apiClient.get("/promotions", { params: { hotelId } });
  },

  // 4. Lấy tất cả ưu đãi (dành cho Admin)
  getAll: (params) => {
    return apiClient.get("/promotions", { params });
  },
};

export default promotionService;
