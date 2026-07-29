import apiClient from "./apiClient";

export const authService = {
  // 1. Gọi API Đăng nhập thông thường (đã có)
  login: async (email, password) => {
    return await apiClient.post("/auth/login", { email, password });
  },

  // 2. Gọi API Đăng ký (đã có)
  register: async (userData) => {
    return await apiClient.post("/auth/register", userData);
  },

  // 3. THÊM MỚI: Gọi API Đăng nhập Google
  googleLogin: async (googleToken) => {
    // Gửi token nhận được từ Google sang cho Backend xử lý
    return await apiClient.post("/auth/google-login", { token: googleToken });
  },
};

export default authService;
