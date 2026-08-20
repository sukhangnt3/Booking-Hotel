import apiClient from "./apiClient";

export const authService = {
  // 1. ĐĂNG NHẬP THỦ CÔNG (EMAIL & PASSWORD)
  login: async (email, password) => {
    return await apiClient.post("/auth/login", { email, password });
  },

  // 2. ĐĂNG KÝ TÀI KHOẢN MỚI
  register: async (userData) => {
    /**
     * userData: { full_name, email, password, phone, role }
     */
    return await apiClient.post("/auth/register", userData);
  },

  // 3. ĐĂNG NHẬP GOOGLE
  googleLogin: async (googleToken, extraData = {}) => {
    // Truyền thêm role nếu là luồng đăng ký Owner bằng Google
    return await apiClient.post("/auth/google-login", {
      token: googleToken,
      ...extraData,
    });
  },

  // 4. LẤY THÔNG TIN TÀI KHOẢN HIỆN TẠI
  getProfile: async () => {
    return await apiClient.get("/auth/profile");
  },

  // 5. CẬP NHẬT THÔNG TIN TÀI KHOẢN
  updateProfile: async (userData) => {
    return await apiClient.put("/auth/profile", userData);
  },

  // 6. ĐỔI MẬT KHẨU
  changePassword: async (oldPassword, newPassword) => {
    return await apiClient.post("/auth/change-password", {
      oldPassword,
      newPassword,
    });
  },

  // 7. QUÊN MẬT KHẨU (Gửi mail reset)
  forgotPassword: async (email) => {
    return await apiClient.post("/auth/forgot-password", { email });
  },

  // 8. ĐĂNG XUẤT (Xử lý phía Server nếu cần)
  logout: async () => {
    try {
      return await apiClient.post("/auth/logout");
    } catch (error) {
      // Ngay cả khi API logout lỗi, chúng ta vẫn nên cho phép FE xoá trắng Store
      console.warn("Server-side logout failed:", error);
    }
  },
};

export default authService;
