// src/routes/AdminRoutes.jsx
import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";

const AdminRoutes = () => {
  const { user, token, systemToken } = useAuthStore();
  const activeToken = token || systemToken;

  // 1. Kiểm tra đăng nhập
  if (!activeToken || !user) {
    console.warn("⚠️ [AdminRoutes] Chưa có Token -> Chuyển về /login");
    return <Navigate to="/login" replace />;
  }

  // 2. Hàm bóc tách Role linh hoạt (Hỗ trợ String, Object, Số ID)
  const extractRoleString = (roleVal) => {
    if (!roleVal) return "";
    if (typeof roleVal === "string") return roleVal.toLowerCase();
    if (typeof roleVal === "object")
      return String(roleVal.name || roleVal.role_name || "").toLowerCase();
    return String(roleVal).toLowerCase();
  };

  // Tạo mảng tất cả các trường có thể chứa role
  const possibleRoles = [
    ...(Array.isArray(user?.roles) ? user.roles : []),
    user?.role,
    user?.role_name,
    user?.role_id,
  ].filter(Boolean);

  // 3. Kiểm tra xem có quyền Admin không (Chấp nhận 'admin', 'role_admin', hoặc ID = 1)
  const isAdmin = possibleRoles.some((r) => {
    const roleStr = extractRoleString(r);
    return roleStr === "admin" || roleStr === "role_admin" || r === 1;
  });

  console.log("=== [DEBUG ADMIN ROUTES] ===");
  console.log("User Data:", user);
  console.log("Quyền Admin:", isAdmin);

  // 4. Nếu không phải Admin -> Đẩy về trang chủ
  if (!isAdmin) {
    console.warn("⚠️ [AdminRoutes] User không có quyền Admin -> Về /");
    return <Navigate to="/" replace />;
  }

  // 5. Là Admin -> Cho phép hiển thị AdminLayout và các trang con
  return <Outlet />;
};

export default AdminRoutes;
