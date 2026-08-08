// src/routes/AdminRoutes.jsx
import React from "react";
import { Navigate, Outlet } from "react-router-dom";

const AdminRoutes = () => {
  // 1. Đọc dữ liệu từ localStorage
  const rawData = localStorage.getItem("user") || localStorage.getItem("auth-storage");

  if (!rawData) {
    return <Navigate to="/login" replace />;
  }

  try {
    const parsedData = JSON.parse(rawData);

    // 2. Bóc tách dữ liệu user & token (Hỗ trợ cả dạng bọc `state` lẫn dạng thường)
    const userData = parsedData?.state?.user || parsedData?.user || parsedData;
    const token = parsedData?.state?.token || parsedData?.token || localStorage.getItem("token");

    // 3. Kiểm tra đăng nhập
    if (!token || !userData) {
      return <Navigate to="/login" replace />;
    }

    // 4. Kiểm tra quyền Admin trong mảng `roles`
    const roles = userData?.roles || [];
    const isAdmin = Array.isArray(roles)
      ? roles.some((r) => ["admin", "ADMIN", "ROLE_ADMIN"].includes(r))
      : ["admin", "ADMIN", "ROLE_ADMIN"].includes(userData?.role);

    if (!isAdmin) {
      return <Navigate to="/" replace />;
    }

    // Xác thực thành công -> Mở giao diện Admin
    return <Outlet />;
  } catch (error) {
    console.error("Lỗi đọc dữ liệu xác thực:", error);
    return <Navigate to="/login" replace />;
  }
};

export default AdminRoutes;