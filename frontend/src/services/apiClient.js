// src/services/apiClient.js
import axios from "axios";
import { useAuthStore } from "@/stores/authStore";

const apiClient = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL}/api`,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
  withCredentials: true,
});

// ─── 1. REQUEST INTERCEPTOR: GẮN TOKEN KỂ CẢ KHI VỪA F5 ───
apiClient.interceptors.request.use(
  (config) => {
    // Lấy token từ Zustand Store, nếu F5 Store bị reset thì lấy từ sessionStorage
    const token =
      useAuthStore.getState().token ||
      useAuthStore.getState().systemToken ||
      sessionStorage.getItem("accessToken");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ─── 2. RESPONSE INTERCEPTOR ───
apiClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const customError = {
      status: error.response?.status,
      message: error.response?.data?.message || "Đã có lỗi xảy ra từ máy chủ",
      data: error.response?.data,
    };

    return Promise.reject(customError);
  },
);

export default apiClient;
