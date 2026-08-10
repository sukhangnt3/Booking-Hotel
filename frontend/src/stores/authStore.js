import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null, // Thông tin người dùng
      token: null, // JWT token
      isAuthenticated: false, // Đã đăng nhập chưa?

      // Lưu thông tin sau khi Google Login thành công
      login: (userData, token) =>
        set({
          user: userData,
          token: token,
          isAuthenticated: true,
        }),

      // Xóa thông tin đăng nhập
      logout: () =>
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        }),
    }),

    {
      name: "auth-storage", // Lưu trạng thái đăng nhập vào localStorage
    },
  ),
);
