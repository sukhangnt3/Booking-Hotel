// src/components/auth/ProtectedRoute.jsx
import React, { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { LoadingSpinner } from "@/components/common";

const ProtectedRoute = ({ allowedRoles = [], redirectTo = "/login" }) => {
  const location = useLocation();
  const { user, token, isAuthenticated, fetchUserProfile } = useAuthStore();

  // Kiểm tra token từ cả store lẫn sessionStorage
  const activeToken = token || sessionStorage.getItem("accessToken");

  // Đồng bộ lại dữ liệu mới nhất từ CSDL khi vào route được bảo vệ
  useEffect(() => {
    if (activeToken && !user) {
      fetchUserProfile();
    }
  }, [activeToken, user, fetchUserProfile]);

  // 1. Nếu hoàn toàn không có token -> Mới chuyển về Login
  if (!activeToken) {
    console.warn("⚠️ [ProtectedRoute] Chưa đăng nhập -> Chuyển về /login");
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // 2. Nếu có token mà user chưa kịp nạp xong -> Hiện loading ngắn thay vì đá văng ra ngoài
  if (!user) {
    return (
      <LoadingSpinner fullPage label="Đang kiểm tra thông tin tài khoản..." />
    );
  }

  // 3. Kiểm tra phân quyền nếu có yêu cầu role
  const getRoles = () => {
    const raw = user?.role || user?.role_name || user?.roles || "";
    if (Array.isArray(raw)) return raw.map((r) => String(r).toLowerCase());
    return [String(raw).toLowerCase()];
  };

  const userRoles = getRoles();
  const normalizedAllowedRoles = allowedRoles.map((role) =>
    String(role).toLowerCase(),
  );

  const hasAccess =
    normalizedAllowedRoles.length === 0 ||
    userRoles.includes("admin") ||
    userRoles.includes("role_admin") ||
    user?.role_id === 1 ||
    normalizedAllowedRoles.some((role) => userRoles.includes(role));

  if (!hasAccess) {
    console.warn(`⚠️ [ProtectedRoute] Từ chối quyền truy cập!`);
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
