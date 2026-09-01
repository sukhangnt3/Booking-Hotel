import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/**
 * Tự động đồng bộ quyền Admin, Owner, Staff (Lễ tân)
 */
const resolveEffectiveUser = (user) => {
  if (!user || !user.email) return user;

  const currentRole = String(user.role || user.role_name || "").toLowerCase();
  if (currentRole === "admin") return user;

  const userEmail = String(user.email).toLowerCase().trim();

  try {
    // 1. Kiểm tra danh sách STAFF (Lễ tân)
    const staffEmails = JSON.parse(
      localStorage.getItem("staff_emails") || "[]",
    ).map((e) => String(e).toLowerCase().trim());

    if (
      staffEmails.includes(userEmail) ||
      currentRole === "staff" ||
      currentRole === "receptionist"
    ) {
      return { ...user, role: "staff", role_name: "staff" };
    }

    // 2. Kiểm tra danh sách OWNER (Chủ nhà)
    const approvedEmails = JSON.parse(
      localStorage.getItem("approved_owner_emails") || "[]",
    ).map((e) => String(e).toLowerCase().trim());

    if (approvedEmails.includes(userEmail) || currentRole === "owner") {
      return { ...user, role: "owner", role_name: "owner" };
    }
  } catch (e) {
    console.warn("Lỗi đồng bộ role:", e);
  }

  return user;
};

export const useAuthStore = create()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isRehydrated: false,

      login: (user, token, refreshToken = null) => {
        const effectiveUser = resolveEffectiveUser(user);
        set({
          user: effectiveUser,
          token,
          refreshToken,
          isAuthenticated: true,
        });
      },

      logout: () => {
        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
        });
      },

      updateUser: (userData) => {
        const currentUser = get().user;
        const mergedUser = { ...currentUser, ...userData };
        set({
          user: resolveEffectiveUser(mergedUser),
        });
      },

      setToken: (newToken) => set({ token: newToken }),

      checkRole: (roleName) => {
        const user = resolveEffectiveUser(get().user);
        if (!user) return false;
        const currentRole = String(
          user.role || user.role_name || "",
        ).toLowerCase();
        return currentRole === String(roleName).toLowerCase();
      },

      syncRole: () => {
        const currentUser = get().user;
        if (!currentUser) return;
        set({
          user: resolveEffectiveUser(currentUser),
        });
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isRehydrated = true;
          if (state.user) {
            state.user = resolveEffectiveUser(state.user);
          }
        }
      },
    },
  ),
);

export default useAuthStore;
