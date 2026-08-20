import axios from "axios";
import { useAuthStore } from "@/stores/authStore";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

// Biến hỗ trợ cơ chế Refresh Token
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

// ─── 1. REQUEST INTERCEPTOR: GẮN TOKEN ───
apiClient.interceptors.request.use(
  (config) => {
    const token =
      useAuthStore.getState().token || useAuthStore.getState().systemToken;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ─── 2. RESPONSE INTERCEPTOR: XỬ LÝ DATA & REFRESH TOKEN AN TOÀN ───
apiClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;

    // Chỉ xử lý 401 nếu request này chưa từng thử lại
    if (error.response?.status === 401 && !originalRequest._retry) {
      const currentToken =
        useAuthStore.getState().token || useAuthStore.getState().systemToken;
      const refreshToken = useAuthStore.getState().refreshToken;

      // 👈 QUAN TRỌNG: Nếu KHÔNG CÓ token hoặc KHÔNG CÓ refreshToken (Khách vãng lai)
      // thì KHÔNG ĐƯỢC CHUYỂN HƯỚNG sang login, chỉ reject lỗi bình thường!
      if (!currentToken || !refreshToken) {
        return Promise.reject({
          status: 401,
          message: error.response?.data?.message || "Chưa đăng nhập",
          data: error.response?.data,
        });
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // GỌI API REFRESH TOKEN KHI THỰC SỰ CÓ REFRESH TOKEN
        const res = await axios.post(
          `${apiClient.defaults.baseURL}/auth/refresh`,
          { refreshToken },
        );

        const { token, user } = res.data;

        // Cập nhật lại Zustand Store
        useAuthStore.getState().login(user, token, refreshToken);

        processQueue(null, token);

        originalRequest.headers.Authorization = `Bearer ${token}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        useAuthStore.getState().logout();

        // Chỉ đá về login nếu người dùng đang ở trong trang cần đăng nhập
        const isPublicPage = [
          "/",
          "/hotels",
          "/login",
          "/register",
          "/promotions",
        ].some(
          (p) =>
            window.location.pathname === p ||
            window.location.pathname.startsWith("/hotel/"),
        );

        if (!isPublicPage) {
          window.location.href = "/login?session_expired=true";
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Xử lý các lỗi khác (500, 403, 404...)
    const customError = {
      status: error.response?.status,
      message: error.response?.data?.message || "Đã có lỗi xảy ra từ máy chủ",
      data: error.response?.data,
    };

    return Promise.reject(customError);
  },
);

export default apiClient;
