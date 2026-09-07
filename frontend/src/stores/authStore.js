// src/stores/authStore.js
import { create } from "zustand";
import apiClient from "@/services/apiClient";

const resolveEffectiveUser = (user) => {
  if (!user) return null;

  let rolesList = [];

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

export const useAuthStore = create((set, get) => ({
  // Khi F5, khôi phục tạm từ sessionStorage để không bị văng ra
  user: JSON.parse(sessionStorage.getItem("authUser") || "null"),
  token: sessionStorage.getItem("accessToken") || null,
  isAuthenticated: Boolean(sessionStorage.getItem("accessToken")),
  isLoadingUser: false,

  // Đăng nhập
  login: (userData, token) => {
    const effectiveUser = resolveEffectiveUser(userData);
    const finalToken = token || get().token;

    if (finalToken) {
      sessionStorage.setItem("accessToken", finalToken);
    }
    if (effectiveUser) {
      sessionStorage.setItem("authUser", JSON.stringify(effectiveUser));
    }

    set({
      user: effectiveUser,
      token: finalToken,
      isAuthenticated: true,
      isLoadingUser: false,
    });
  },

  // Đăng xuất
  logout: () => {
    sessionStorage.removeItem("accessToken");
    sessionStorage.removeItem("authUser");
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoadingUser: false,
    });
  },

  // Cập nhật thông tin profile
  updateUser: (userData) => {
    const currentUser = get().user;
    const mergedUser = resolveEffectiveUser({ ...currentUser, ...userData });
    sessionStorage.setItem("authUser", JSON.stringify(mergedUser));
    set({ user: mergedUser });
  },

  // Lấy dữ liệu mới nhất từ database
  fetchUserProfile: async () => {
    const token = get().token || sessionStorage.getItem("accessToken");
    if (!token) {
      get().logout();
      return;
    }

    try {
      const res = await apiClient.get(`/auth/profile?_t=${Date.now()}`);
      const userData = res?.data?.user || res?.data?.data?.user || res?.data;

      if (userData) {
        const effectiveUser = resolveEffectiveUser(userData);
        sessionStorage.setItem("authUser", JSON.stringify(effectiveUser));
        set({
          user: effectiveUser,
          isAuthenticated: true,
        });
      }
    } catch (err) {
      if (err?.status === 401 || err?.response?.status === 401) {
        get().logout();
      }
    }
  },

  checkRole: (roleName) => {
    const currentUser = get().user;
    if (!currentUser) return false;
    const target = String(roleName).toLowerCase();
    return String(currentUser.role).toLowerCase() === target;
  },
}));

export default useAuthStore;
