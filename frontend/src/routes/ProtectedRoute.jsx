import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { LoadingSpinner } from "@/components/common";

const ProtectedRoute = ({ allowedRoles = [], redirectTo = "/login" }) => {
  const location = useLocation();
  const { user, token, systemToken, isRehydrated } = useAuthStore();

  // Kiểm tra token từ cả store lẫn localStorage
  const activeToken =
    token ||
    systemToken ||
    localStorage.getItem("token") ||
    localStorage.getItem("access_token");
  const storedUser = user || JSON.parse(localStorage.getItem("user") || "null");

  // 1. Chờ khôi phục dữ liệu
  if (isRehydrated === false) {
    return <LoadingSpinner fullPage label="Đang kiểm tra quyền truy cập..." />;
  }

  // 2. CHƯA ĐĂNG NHẬP -> Chuyển về /login
  if (!activeToken) {
    console.warn("⚠️ [ProtectedRoute] Chưa đăng nhập -> Chuyển về /login");
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // 3. BÓC TÁCH ROLE
  const getRoles = () => {
    const raw =
      storedUser?.role || storedUser?.role_name || storedUser?.roles || "";
    if (Array.isArray(raw)) return raw.map((r) => String(r).toLowerCase());
    return [String(raw).toLowerCase()];
  };

  const userRoles = getRoles();
  const normalizedAllowedRoles = allowedRoles.map((role) =>
    String(role).toLowerCase(),
  );

  // 4. KIỂM TRA QUYỀN (Nếu không yêu cầu role thì ai đăng nhập cũng vào được)
  const hasAccess =
    normalizedAllowedRoles.length === 0 ||
    userRoles.includes("admin") ||
    userRoles.includes("role_admin") ||
    storedUser?.role_id === 1 ||
    normalizedAllowedRoles.some((role) => userRoles.includes(role));

  if (!hasAccess) {
    console.warn(`⚠️ [ProtectedRoute] Từ chối quyền truy cập!`);
    return <Navigate to="/" replace />;
  }

  // 5. ĐỦ QUYỀN -> Render trang con
  return <Outlet />;
};

export default ProtectedRoute;
