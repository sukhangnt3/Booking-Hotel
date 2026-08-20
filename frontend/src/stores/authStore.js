import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export const useAuthStore = create()(
  persist(
    (set, get) => ({
      // --- STATE ---
      user: null, // Thông tin người dùng {id, name, email, role, avatar...}
      token: null, // Access Token (JWT)
      refreshToken: null, // Token để làm mới phiên đăng nhập
      isAuthenticated: false,
      isRehydrated: false, // Trạng thái đã khôi phục xong dữ liệu từ localStorage chưa

      // --- ACTIONS ---

      /**
       * Lưu thông tin đăng nhập
       * @param {Object} user
       * @param {String} token
       * @param {String} refreshToken
       */
      login: (user, token, refreshToken = null) => {
        set({
          user,
          token,
          refreshToken,
          isAuthenticated: true,
        });
      },

      /**
       * Đăng xuất - Xoá sạch trắng dữ liệu
       */
      logout: () => {
        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
        });
        // Có thể clear thêm các store khác nếu cần (ví dụ: bookingStore)
      },

      /**
       * Cập nhật thông tin User (dùng khi sửa Profile, đổi Avatar)
       */
      updateUser: (userData) => {
        const currentUser = get().user;
        set({
          user: { ...currentUser, ...userData },
        });
      },

      /**
       * Cập nhật Token mới (dùng cho cơ chế Refresh Token)
       */
      setToken: (newToken) => set({ token: newToken }),

      /**
       * Kiểm tra Role nhanh
       */
      checkRole: (roleName) => {
        const user = get().user;
        if (!user) return false;
        const currentRole = String(
          user.role || user.role_name || "",
        ).toLowerCase();
        return currentRole === roleName.toLowerCase();
      },
    }),
    {
      name: "auth-storage", // Tên key trong LocalStorage
      storage: createJSONStorage(() => localStorage),
      // Khi dữ liệu được khôi phục từ localStorage thành công
      onRehydrateStorage: () => (state) => {
        state.isRehydrated = true;
      },
    },
  ),
);

export default useAuthStore;
