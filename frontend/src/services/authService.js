import apiClient from "./apiClient";

export const authService = {
  // 1: Gọi API Đăng nhập Google
  googleLogin: async (googleToken) => {
    return await apiClient.post("/auth/google-login", { token: googleToken });
  },

  // 2: Lấy thông tin Profile chính xác từ Backend (GET /auth/profile)
  getProfile: async () => {
    try {
      const response = await apiClient.get("/auth/profile");
      return response;
    } catch (error) {
      console.error("Lỗi lấy thông tin Profile:", error);
      throw error;
    }
  },

  // 3: Cập nhật thông tin Profile chính xác vào Database (PUT /auth/profile)
  updateProfile: async (userData) => {
    try {
      const response = await apiClient.put("/auth/profile", userData);
      return response;
    } catch (error) {
      console.error("Lỗi cập nhật Profile:", error);
      throw error;
    }
  },

  // 4: Đổi mật khẩu (POST /auth/change-password)
  changePassword: async (passwordData) => {
    try {
      const response = await apiClient.post(
        "/auth/change-password",
        passwordData,
      );
      return response;
    } catch (error) {
      console.error("Lỗi đổi mật khẩu:", error);
      throw error;
    }
  },
};

export default authService;
