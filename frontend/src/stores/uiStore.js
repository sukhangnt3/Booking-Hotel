import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export const useUIStore = create()(
  persist(
    (set) => ({
      // --- 1. STATE (TRẠNG THÁI GIAO DIỆN) ---

      // Quản lý Sidebar cho Admin/Owner
      sidebarCollapsed: false,
      mobileSidebarOpen: false,

      // Quản lý Loading toàn trang (Dùng khi thanh toán hoặc xử lý tác vụ nặng)
      globalLoading: false,
      loadingText: "Đang xử lý dữ liệu...",

      // Quản lý Modal thông báo nhanh (Global Alert/Modal)
      modal: {
        isOpen: false,
        title: "",
        content: null,
      },

      // --- 2. ACTIONS (HÀNH ĐỘNG) ---

      // Sidebar Actions
      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (value) => set({ sidebarCollapsed: value }),

      toggleMobileSidebar: () =>
        set((state) => ({ mobileSidebarOpen: !state.mobileSidebarOpen })),
      setMobileSidebarOpen: (value) => set({ mobileSidebarOpen: value }),

      // Global Loading Actions
      showLoading: (text = "Đang tải dữ liệu...") =>
        set({
          globalLoading: true,
          loadingText: text,
        }),
      hideLoading: () =>
        set({
          globalLoading: false,
          loadingText: "",
        }),

      // Global Modal Actions
      openModal: (title, content) =>
        set({
          modal: { isOpen: true, title, content },
        }),
      closeModal: () =>
        set({
          modal: { isOpen: false, title: "", content: null },
        }),
    }),
    {
      name: "gostay-ui-preferences",
      storage: createJSONStorage(() => localStorage),
      // QUAN TRỌNG: Chỉ lưu trạng thái Sidebar vào LocalStorage
      // KHÔNG lưu globalLoading để tránh trường hợp F5 trang web bị kẹt trong màn hình xoay mãi mãi
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    },
  ),
);

export default useUIStore;
