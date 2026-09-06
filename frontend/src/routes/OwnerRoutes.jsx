// src/routes/OwnerRoutes.jsx
import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { LoadingSpinner } from "@/components/common";

const OwnerRoutes = () => {
  const location = useLocation();
  const { user, token, systemToken, isRehydrated } = useAuthStore();
  const activeToken = token || systemToken || localStorage.getItem("token");

  // 1. Chờ khôi phục phiên đăng nhập từ LocalStorage
  if (isRehydrated === false) {
    return <LoadingSpinner fullPage label="Đang xác thực quyền đối tác..." />;
  }

  // 2. Nếu chưa đăng nhập -> Chuyển về trang Login
  if (!activeToken || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. Trích xuất Role an toàn (Hỗ trợ cả String, Array lẫn Object từ Backend)
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
      // 👉 Phòng ngừa: Nếu r là Object { name: 'owner' } thì lấy name, ngược lại lấy chính nó
      const roleStr =
        typeof r === "object" ? r.name || r.role_name || r.role || "" : r;
      return String(roleStr).trim().toLowerCase();
    });

  // 4. Kiểm tra quyền hạn (Chấp nhận Owner, Manager, Admin, Lễ tân...)
  const hasOwnerRole = normalizedRoles.some((r) => {
    return (
      r.includes("owner") ||
      r.includes("manager") ||
      r.includes("admin") ||
      r.includes("staff") ||
      r.includes("receptionist")
    );
  });

  // Hỗ trợ cả kiểm tra qua mã role_id (VD: 1 là Admin, 2 hoặc 3 là Owner trong DB)
  const isAllowed =
    hasOwnerRole ||
    user?.role_id === 1 ||
    user?.role_id === 2 ||
    user?.role_id === 3;

  // 5. Nếu không có quyền -> Chuyển sang trang mời đăng ký làm chủ khách sạn
  if (!isAllowed) {
    return <Navigate to="/register-owner" replace />;
  }

  // 6. Hợp lệ -> Cho phép truy cập vào các trang con (/owner/*)
  return <Outlet />;
};

export default OwnerRoutes;
