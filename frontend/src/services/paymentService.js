import apiClient from "./apiClient";

const paymentService = {
  // Sử dụng apiClient để tự động gắn Bearer Token đăng nhập
  createVNPayUrl: async (paymentData) => {
    const response = await apiClient.post(
      "/payments/create-vnpay-url",
      paymentData,
    );
    // apiClient interceptor đã tự động trả về response.data
    return response;
  },
};

export default paymentService;
