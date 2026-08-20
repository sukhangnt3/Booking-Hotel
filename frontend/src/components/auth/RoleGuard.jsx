import React from 'react";
import { useAuthStore } from "@/stores/authStore";

/**
 * RoleGuard: Hiển thị nội dung dựa trên quyền hạn.
 * @param {Array} allowedRoles - Danh sách các role được phép xem (ví dụ: ['admin', 'owner'])
 * @param {ReactNode} children - Nội dung hiển thị nếu có quyền
 * @param {ReactNode} fallback - Nội dung hiển thị nếu KHÔNG có quyền (mặc định là null)
 * @param {Boolean} adminBypass - Admin có được xem mọi thứ không (mặc định là true)
 */
const RoleGuard = ({ 
  allowedRoles = [], 
  children, 
  fallback = null,
  adminBypass = true 
}) => {
  const { user, isAuthenticated } = useAuthStore();

  // 1. Nếu chưa đăng nhập -> Trả về fallback ngay lập tức
  if (!isAuthenticated || !user) {
    return fallback;
  }

  // 2. Lấy Role hiện tại (Hỗ trợ nhiều định dạng từ Backend)
  const getRoles = () => {
    const raw = user?.role || user?.role_name || user?.roles || "";
    if (Array.isArray(raw)) return raw.map(r => String(r).toLowerCase());
    return [String(raw).toLowerCase()];
  };

  const userRoles = getRoles();
  const normalizedAllowedRoles = allowedRoles.map(role => String(role).toLowerCase());

  // 3. Logic kiểm tra quyền
  const isSystemAdmin = userRoles.includes("admin") || userRoles.includes("role_admin");
  
  const hasAccess = 
    (adminBypass && isSystemAdmin) || // Admin xem được tất cả
    normalizedAllowedRoles.length === 0 || // Không yêu cầu role cụ thể
    normalizedAllowedRoles.some(role => userRoles.includes(role)); // Khớp role

  // 4. Trả về kết quả
  if (hasAccess) {
    return <>{children}</>;
  }

  return fallback;
};

export default RoleGuard;