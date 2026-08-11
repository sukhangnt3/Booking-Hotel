import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";

export const ProtectedRoute = ({ allowedRoles = [] }) => {
  const { user, token, systemToken } = useAuthStore();

  // 1. Kiểm tra Token linh hoạt (Chấp nhận cả 'token' hoặc 'systemToken')
  const activeToken = token || systemToken;

  // Chưa đăng nhập → chuyển về trang login
  if (!activeToken) {
    console.warn(
      "⚠️ [ProtectedRoute] Từ chối: Chưa có Token đăng nhập -> Về /login",
    );
    return <Navigate to="/login" replace />;
  }

  // 2. Chuyển tất cả Role về chữ thường để so sánh không phân biệt HOA/thường
  const userRole = String(user?.role || user?.role_name || "").toLowerCase();
  const normalizedAllowedRoles = allowedRoles.map((role) =>
    String(role).toLowerCase(),
  );

  // Không có quyền → chuyển về trang chủ
  if (
    normalizedAllowedRoles.length > 0 &&
    !normalizedAllowedRoles.includes(userRole)
  ) {
    console.warn(
      `⚠️ [ProtectedRoute] Từ chối quyền! User Role hiện tại là "${userRole}", nhưng trang này yêu cầu:`,
      normalizedAllowedRoles,
    );
    return <Navigate to="/" replace />;
  }

  // Đủ quyền → cho phép truy cập trang
  return <Outlet />;
};

export default ProtectedRoute;
