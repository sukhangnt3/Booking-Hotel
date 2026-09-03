// src/routes/OwnerRoutes.jsx
import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { LoadingSpinner } from "@/components/common";

const OwnerRoutes = () => {
  const location = useLocation();
  const { user, token, systemToken, isRehydrated } = useAuthStore();
  const activeToken = token || systemToken || localStorage.getItem("token");

  // 1. Chờ khôi phục xong phiên đăng nhập của người dùng từ LocalStorage / Zustand
  if (isRehydrated === false) {
    return <LoadingSpinner fullPage label="Đang xác thực quyền đối tác..." />;
  }

  // 2. Nếu chưa đăng nhập -> Chuyển hướng an toàn về trang /login
  if (!activeToken || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. Kiểm tra vai trò (Role): Cho phép Admin, Owner, Manager, Lễ tân vào trang quản trị
  const roleStr = String(user?.role || user?.role_name || "").toLowerCase();
  const isAllowed =
    roleStr.includes("owner") ||
    roleStr.includes("manager") ||
    roleStr.includes("staff") ||
    roleStr.includes("receptionist") ||
    roleStr.includes("admin") ||
    user?.role_id === 1;

  // Nếu là tài khoản khách hàng thông thường (Customer) -> Đưa về trang đăng ký cơ sở
  if (!isAllowed) {
    return <Navigate to="/register-owner" replace />;
  }

  // 4. 🛑 CHO PHÉP CHỦ NHÀ VÀO THẲNG TRANG QUẢN TRỊ (/owner/*)
  // Trạng thái từng khách sạn (Đang bán, Chờ duyệt, Bị từ chối) sẽ hiển thị riêng biệt trong mục Quản lý chỗ nghỉ
  return <Outlet />;
};

export default OwnerRoutes;
