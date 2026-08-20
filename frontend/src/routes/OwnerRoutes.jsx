import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { LoadingSpinner } from "@/components/common";

const OwnerRoutes = () => {
  const location = useLocation();
  const { user, token, systemToken, isRehydrated } = useAuthStore();
  const activeToken = token || systemToken;

  // ─── 1. CHỜ ZUSTAND KHÔI PHỤC DỮ LIỆU TỪ LOCALSTORAGE (CHỐNG LỖI F5) ───
  if (isRehydrated === false) {
    return (
      <LoadingSpinner fullPage label="Đang xác thực tài khoản Đối tác..." />
    );
  }

  // ─── 2. CHƯA ĐĂNG NHẬP -> CHUYỂN VỀ TRANG LOGIN ───
  if (!activeToken || !user) {
    console.warn("⚠️ [OwnerRoutes] Chưa đăng nhập -> Chuyển về /login");
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // ─── 3. BÓC TÁCH ROLE LINH HOẠT ───
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

  // Cho phép Owner (hoặc Admin tối cao vào hỗ trợ)
  const isOwner = possibleRoles.some((r) => {
    const roleStr = extractRoleString(r);
    return (
      roleStr.includes("owner") ||
      roleStr.includes("partner") ||
      roleStr.includes("admin") || // Admin có quyền truy cập kênh owner
      r === 2 || // Thường ID = 2 là Owner trong DB
      r === 1
    );
  });

  // ─── 4. TỪ CHỐI NẾU LÀ KHÁCH HÀNG THƯỜNG (CHƯA ĐĂNG KÝ OWNER) ───
  if (!isOwner) {
    console.warn(
      "⚠️ [OwnerRoutes] User chưa có quyền Owner -> Chuyển sang đăng ký Owner",
    );
    return <Navigate to="/register-owner" replace />;
  }

  // ─── 5. ĐỦ QUYỀN -> CHO PHÉP HIỂN THỊ (TRẢ VỀ OUTLET ĐỂ KHÔNG BỊ TRÙNG LAYOUT) ───
  return <Outlet />;
};

export default OwnerRoutes;
