// src/services/paymentService.js
import apiClient from "./apiClient";

const paymentService = {
  createVNPayUrl: async (data) => {
    // Gọi API của Backend để tạo URL
    const response = await apiClient.post("/payments/create-vnpay-url", data);
    return response.data;
  },
};

export default paymentService;
