import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";

const ProtectedRoute = ({ allowedRoles = [], redirectTo = "/login" }) => {
  const { user, token, systemToken, isRehydrated } = useAuthStore();
  const location = useLocation();

  // 1. Kiểm tra Token
  const activeToken = token || systemToken;

  // 2. Chờ Zustand khôi phục dữ liệu từ localStorage (nếu có dùng persist)
  // Nếu bạn không dùng persist, có thể bỏ qua check isRehydrated
  if (isRehydrated === false) {
    return (
      <div className="h-screen flex items-center justify-center">
        Đang xác thực...
      </div>
    );
  }

  // 3. Nếu chưa đăng nhập -> Chuyển về trang login
  // Lưu lại vị trí hiện tại (from) để sau khi login xong có thể quay lại trang này
  if (!activeToken) {
    console.warn("⚠️ [ProtectedRoute] Chưa đăng nhập -> Redirect to login");
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // 4. Lấy Role của User (Hỗ trợ cả String và Array)
  const getRoles = () => {
    const raw = user?.role || user?.role_name || user?.roles || "";
    if (Array.isArray(raw)) return raw.map((r) => String(r).toLowerCase());
    return [String(raw).toLowerCase()];
  };

  const userRoles = getRoles();
  const normalizedAllowedRoles = allowedRoles.map((role) =>
    String(role).toLowerCase(),
  );

  // 5. Kiểm tra quyền
  // - Nếu không yêu cầu role cụ thể (allowedRoles rỗng) -> Cho qua
  // - Nếu User là admin -> Luôn luôn cho qua (Admin bypass)
  // - Nếu role của User nằm trong danh sách allowedRoles -> Cho qua
  const hasAccess =
    normalizedAllowedRoles.length === 0 ||
    userRoles.includes("admin") ||
    userRoles.includes("role_admin") ||
    normalizedAllowedRoles.some((role) => userRoles.includes(role));

  if (!hasAccess) {
    console.warn(`⚠️ [ProtectedRoute] Từ chối quyền cho roles:`, userRoles);
    // Nếu không có quyền, thường ta trả về trang chủ hoặc trang 403
    return <Navigate to="/" replace />;
  }

  // 6. Đủ quyền -> Render nội dung bên trong
  return <Outlet />;
};

export default ProtectedRoute;
