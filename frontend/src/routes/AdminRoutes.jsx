// src/routes/AdminRoutes.jsx
import React, { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { LoadingSpinner } from "@/components/common";

const AdminRoutes = () => {
  const location = useLocation();
  const { user, isAuthenticated, isLoadingUser, fetchUserProfile } =
    useAuthStore();

  // 1. Khi F5 mà chưa có user, tự động gọi lấy lại thông tin user từ Cookie
  useEffect(() => {
    if (!user && isLoadingUser) {
      fetchUserProfile();
    }
  }, [user, isLoadingUser, fetchUserProfile]);

  // 2. 🌟 QUAN TRỌNG: Đang tải lại profile từ Cookie -> Hiện spinner, KHÔNG ĐƯỢC REDIRECT!
  if (isLoadingUser) {
    return <LoadingSpinner fullPage label="Đang xác thực quyền Admin..." />;
  }

  // 3. Sau khi tải xong mà thực sự không có user / chưa đăng nhập -> Mới chuyển về /login
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 4. Kiểm tra quyền Admin
  const extractRoleString = (roleVal) => {
    if (!roleVal) return "";
    if (typeof roleVal === "string") return roleVal.toLowerCase();
    if (typeof roleVal === "object")
      return String(
        roleVal.name || roleVal.role_name || roleVal.role || "",
      ).toLowerCase();
    return String(roleVal).toLowerCase();
  };

  const possibleRoles = [
    ...(Array.isArray(user?.roles) ? user.roles : []),
    user?.role,
    user?.role_name,
    user?.role_id,
  ].filter(Boolean);

  const isAdmin = possibleRoles.some((r) => {
    const roleStr = extractRoleString(r);
    return roleStr.includes("admin") || r === 1 || r === "1";
  });

  if (!isAdmin) {
    alert("Tài khoản của bạn không có quyền Quản trị viên (Admin).");
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default AdminRoutes;
