// src/stores/authStore.js
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/**
 * Tự động phân giải vai trò chuẩn xác từ mảng roles của PostgreSQL
 * (ADMIN, HOTEL_OWNER, CUSTOMER, RECEPTIONIST)
 */
const resolveEffectiveUser = (user) => {
  if (!user) return null;

  let rolesList = [];

  // 1. Trích xuất danh sách roles từ Backend
  if (Array.isArray(user.roles)) {
    rolesList = user.roles.map((r) =>
      typeof r === "object"
        ? String(r.name || "").toUpperCase()
        : String(r).toUpperCase(),
    );
  } else if (user.role) {
    rolesList = [String(user.role).toUpperCase()];
  } else if (user.role_name) {
    rolesList = [String(user.role_name).toUpperCase()];
  }

  // 2. Xác định vai trò ưu tiên cao nhất
  let primaryRole = "customer";

  if (rolesList.some((r) => r.includes("ADMIN")) || user.role_id === 1) {
    primaryRole = "admin";
  } else if (
    rolesList.some((r) => r.includes("OWNER") || r.includes("HOTEL_OWNER")) ||
    user.role_id === 2 ||
    user.role_id === 3
  ) {
    primaryRole = "owner";
  } else if (
    rolesList.some((r) => r.includes("STAFF") || r.includes("RECEPTIONIST"))
  ) {
    primaryRole = "staff";
  }

  return {
    ...user,
    role: primaryRole,
    role_name: primaryRole,
    roles: rolesList.length > 0 ? rolesList : [primaryRole.toUpperCase()],
  };
};

export const useAuthStore = create()(
  persist(
    (set, get) => ({
      user: null, // Sẽ tự động reset thành null khi F5, buộc GuestLayout gọi lại API
      token: null,
      isAuthenticated: false,
      isRehydrated: false,

      // Đăng nhập
      login: (userData, token) => {
        set({
          user: resolveEffectiveUser(userData),
          token,
          isAuthenticated: true,
        });
      },

      // Đăng xuất và xóa trắng trạng thái
      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });
        localStorage.removeItem("auth-storage");
      },

      // Cập nhật profile đồng bộ
      updateUser: (userData) => {
        const currentUser = get().user;
        const mergedUser = { ...currentUser, ...userData };
        set({
          user: resolveEffectiveUser(mergedUser),
        });
      },

      setToken: (newToken) => set({ token: newToken }),

      // Kiểm tra role nhanh trong components
      checkRole: (roleName) => {
        const currentUser = get().user;
        if (!currentUser) return false;
        const target = String(roleName).toLowerCase();
        return String(currentUser.role).toLowerCase() === target;
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage),
      // 🚀 BÍ QUYẾT: CHỈ LƯU TOKEN XUỐNG MÁY, TUYỆT ĐỐI KHÔNG LƯU USER
      partialize: (state) => ({
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isRehydrated = true;
        }
      },
    },
  ),
);

export default useAuthStore;
