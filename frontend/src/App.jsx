import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GoogleOAuthProvider } from "@react-oauth/google";

// Routes & Styles
import AppRoutes from "./routes";
import "./index.css";

// Stores & Common Components
import { useUIStore } from "@/stores/uiStore";
import { LoadingSpinner, ErrorBoundary } from "@/components/common";

// ─── 1. KHỞI TẠO QUERY CLIENT VỚI CẤU HÌNH TỐI ƯU CỰC XỊN ───
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // Dữ liệu được coi là mới trong 5 phút (tránh gọi API lại liên tục)
      gcTime: 1000 * 60 * 30, // Giữ bộ nhớ đệm (Cache) trong 30 phút
      retry: 1, // Thử lại 1 lần nếu API bị lỗi mạng
      refetchOnWindowFocus: false, // Không tự gọi lại API khi người dùng chuyển qua lại các Tab trình duyệt
    },
  },
});

function App() {
  // Client ID của Google OAuth từ biến môi trường .env
  const clientId =
    import.meta.env.VITE_GOOGLE_CLIENT_ID ||
    "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com";

  // Lắng nghe trạng thái Loading toàn trang từ Zustand UI Store
  const { globalLoading, loadingText } = useUIStore();

  return (
    // 1. Lớp bảo vệ chống lỗi sập trang JavaScript
    <ErrorBoundary>
      {/* 2. Bộ cung cấp Cache & Quản lý API của React Query */}
      <QueryClientProvider client={queryClient}>
        {/* 3. Bộ cung cấp xác thực Google OAuth */}
        <GoogleOAuthProvider clientId={clientId}>
          {/* Màn hình chờ phủ mờ toàn trang khi có tác vụ nặng */}
          {globalLoading && <LoadingSpinner fullPage label={loadingText} />}

          {/* 4. Toàn bộ hệ thống Router (createBrowserRouter & RouterProvider) */}
          <AppRoutes />
        </GoogleOAuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
