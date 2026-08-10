import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";

export const ProtectedRoute = ({ allowedRoles = [] }) => {
  const { user, token } = useAuthStore();

  // Chưa đăng nhập → chuyển về trang login
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Không có quyền → chuyển về trang chủ
  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/" replace />;
  }

  // Đủ quyền → cho phép truy cập trang
  return <Outlet />;
};
