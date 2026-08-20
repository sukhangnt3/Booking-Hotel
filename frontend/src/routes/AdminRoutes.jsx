import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { LoadingSpinner } from "@/components/common";

const AdminRoutes = () => {
  const location = useLocation();
  const { user, token, systemToken, isRehydrated } = useAuthStore();
  const activeToken = token || systemToken;

  // 1. Chờ nạp xong dữ liệu từ LocalStorage
  if (isRehydrated === false) {
    return <LoadingSpinner fullPage label="Đang xác thực quyền Admin..." />;
  }

  // 2. Chưa đăng nhập -> Chuyển về login
  if (!activeToken || !user) {
    console.warn("⚠️ [AdminRoutes] Chưa có Token -> Chuyển về /login");
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. BÓC TÁCH ROLE SIÊU LINH HOẠT (Hỗ trợ mọi kiểu Backend)
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
    user?.roleId,
    user?.user_metadata?.role,
  ].filter(Boolean);

  // Kiểm tra quyền Admin (Chấp nhận role chứa chữ 'admin' hoặc id === 1)
  const isAdmin = possibleRoles.some((r) => {
    const roleStr = extractRoleString(r);
    return roleStr.includes("admin") || r === 1 || r === "1";
  });

  console.log("👉 [DEBUG ROLE CỦA BẠN]:", {
    email: user.email,
    rawRoles: possibleRoles,
    isAdminMatched: isAdmin,
  });

  // 4. Nếu không phải Admin -> Đẩy về trang chủ
  if (!isAdmin) {
    console.warn(
      "⚠️ [AdminRoutes] Tài khoản này không phải Admin! Role hiện tại:",
      possibleRoles,
    );
    alert("Tài khoản của bạn không có quyền Quản trị viên (Admin).");
    return <Navigate to="/" replace />;
  }

  // 5. Đủ quyền Admin -> Cho phép hiển thị
  return <Outlet />;
};

export default AdminRoutes;
