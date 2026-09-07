// src/routes/OwnerRoutes.jsx
import React, { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { LoadingSpinner } from "@/components/common";

const OwnerRoutes = () => {
  const location = useLocation();
  const { user, isAuthenticated, isLoadingUser, fetchUserProfile } =
    useAuthStore();

  // 1. Tự động phục hồi User từ Cookie khi F5
  useEffect(() => {
    if (!user && isLoadingUser) {
      fetchUserProfile();
    }
  }, [user, isLoadingUser, fetchUserProfile]);

  // 2. 🌟 Đang xác thực -> Chờ, không được đá văng ra Login!
  if (isLoadingUser) {
    return <LoadingSpinner fullPage label="Đang xác thực quyền đối tác..." />;
  }

  // 3. Sau khi xác thực xong mà không đăng nhập -> Mới đá về /login
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 4. Kiểm tra quyền Owner / Admin / Lễ tân
  let extractedRoles = [];
  if (Array.isArray(user.roles)) {
    extractedRoles = user.roles;
  } else if (user.role) {
    extractedRoles = [user.role];
  } else if (user.role_name) {
    extractedRoles = [user.role_name];
  }

  const normalizedRoles = extractedRoles
    .flat()
    .filter(Boolean)
    .map((r) => {
      const roleStr =
        typeof r === "object" ? r.name || r.role_name || r.role || "" : r;
      return String(roleStr).trim().toLowerCase();
    });

  const hasOwnerRole = normalizedRoles.some((r) => {
    return (
      r.includes("owner") ||
      r.includes("manager") ||
      r.includes("admin") ||
      r.includes("staff") ||
      r.includes("receptionist")
    );
  });

  const isAllowed =
    hasOwnerRole ||
    user?.role_id === 1 ||
    user?.role_id === 2 ||
    user?.role_id === 3;

  if (!isAllowed) {
    return <Navigate to="/register-owner" replace />;
  }

  return <Outlet />;
};

export default OwnerRoutes;
