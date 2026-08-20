import { useState, useCallback } from "react";
import { useAuthStore } from "@/stores/authStore";
import { authService } from "@/services/authService";

export const useAuth = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Lấy dữ liệu và actions từ Zustand Store
  const {
    user,
    token,
    isAuthenticated,
    login: loginStore,
    logout: logoutStore,
  } = useAuthStore();

  // --- 1. LOGIC KIỂM TRA ROLE (Rất quan trọng cho dự án của bạn) ---
  const role = user?.role || user?.role_name || "";
  const isAdmin = role.toLowerCase().includes("admin");
  const isOwner =
    role.toLowerCase().includes("owner") ||
    role.toLowerCase().includes("partner");

  // --- 2. HÀM ĐĂNG NHẬP ---
  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const response = await authService.login(email, password);

      // Bóc tách dữ liệu từ API (Tùy cấu trúc Backend của bạn)
      const userData = response.user || response.data?.user;
      const userToken = response.token || response.data?.token;

      if (userToken) {
        // CẬP NHẬT VÀO ZUSTAND (Nó sẽ tự lưu vào localStorage nếu bạn dùng persist)
        loginStore(userData, userToken);
      }
      return response;
    } catch (err) {
      const msg = err.response?.data?.message || "Đăng nhập thất bại";
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  // --- 3. HÀM ĐĂNG KÝ ---
  const register = async (payload) => {
    setLoading(true);
    setError(null);
    try {
      const response = await authService.register(payload);
      // Sau khi đăng ký, thường API trả về luôn token để đăng nhập ngay
      if (response.token) {
        loginStore(response.user, response.token);
      }
      return response;
    } catch (err) {
      const msg = err.response?.data?.message || "Đăng ký thất bại";
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  // --- 4. HÀM ĐĂNG XUẤT ---
  const logout = useCallback(() => {
    logoutStore();
    // Có thể điều hướng về trang chủ ở đây nếu muốn
    window.location.href = "/login";
  }, [logoutStore]);

  return {
    // Dữ liệu người dùng
    user,
    token,
    isAuthenticated,
    // Phân quyền nhanh
    isAdmin,
    isOwner,
    role,
    // Trạng thái xử lý
    loading,
    error,
    // Các hàm hành động
    login,
    register,
    logout,
    setError,
  };
};

export default useAuth;
