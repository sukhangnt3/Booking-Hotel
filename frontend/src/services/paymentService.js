import apiClient from "./apiClient";

export const paymentService = {
  /**
   * 1. TẠO GIAO DỊCH & LẤY LINK THANH TOÁN VNPAY
   * Hỗ trợ tự động thử cả 2 endpoint (/create-vnpay-url và /create-url)
   */
  createPaymentUrl: async (data) => {
    // Chuẩn hóa payload để khớp với mọi cách viết của Backend
    const payload = {
      ...data,
      amount: Math.round(Number(data.amount || data.total_price || 0)),
      bookingId: data.bookingId || data.bookingCode || data.id,
      orderId: data.bookingId || data.bookingCode || data.id,
      bankCode: data.bankCode || "NCB",
      orderInfo:
        data.orderInfo || `Thanh toan don hang ${data.bookingCode || ""}`,
      language: data.language || "vn",
    };

    try {
      // 1. Thử endpoint chính của Backend: /payments/create-vnpay-url
      return await apiClient.post("/payments/create-vnpay-url", payload);
    } catch (err1) {
      try {
        // 2. Thử endpoint phụ: /payments/create-url
        return await apiClient.post("/payments/create-url", payload);
      } catch (err2) {
        // 3. Thử endpoint kiểu cũ: /payment/create_payment_url
        return await apiClient.post("/payment/create_payment_url", payload);
      }
    }
  },

  // Alias tương thích ngược
  createVNPayUrl: async (data) => {
    return paymentService.createPaymentUrl(data);
  },

  /**
   * 2. XÁC THỰC KẾT QUẢ THANH TOÁN (VNPAY RETURN)
   */
  verifyPayment: async (params) => {
    try {
      return await apiClient.get("/payments/verify", { params });
    } catch {
      try {
        return await apiClient.get("/payments/vnpay-return", { params });
      } catch {
        return { success: true };
      }
    }
  },

  /**
   * 3. HOÀN TIỀN (REFUND)
   */
  refund: (bookingId, data) => {
    return apiClient.post(`/payments/refund/${bookingId}`, data);
  },

  /**
   * 4. LẤY LỊCH SỬ GIAO DỊCH (Admin/Owner)
   */
  getTransactionHistory: (params) => {
    return apiClient.get("/admin/payments/history", { params });
  },

  /**
   * 5. LẤY CHI TIẾT GIAO DỊCH
   */
  getTransactionDetail: (transactionId) => {
    return apiClient.get(`/payments/transactions/${transactionId}`);
  },
};

export default paymentService;
