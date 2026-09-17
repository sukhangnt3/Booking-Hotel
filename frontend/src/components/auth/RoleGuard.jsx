// src/components/auth/RoleGuard.jsx
import React, { useMemo } from "react";
import { useAuthStore } from "@/stores/authStore";

/**
 * Helper chuẩn hóa tên Role (hỗ trợ String, Object { name, role, id })
 */
const normalizeRole = (r) => {
  if (!r) return "";
  if (typeof r === "string") return r.toLowerCase().trim();
  if (typeof r === "object") {
    return String(r.name || r.role || r.role_name || r.id || "")
      .toLowerCase()
      .trim();
  }
  return String(r).toLowerCase().trim();
};

/**
 * RoleGuard: Hiển thị / Ẩn nội dung dựa trên quyền hạn của người dùng.
 * @param {Array} allowedRoles - Danh sách role được phép xem (VD: ['admin', 'owner'])
 * @param {ReactNode} children - Nội dung hiển thị nếu CÓ quyền
 * @param {ReactNode} fallback - Nội dung hiển thị nếu KHÔNG có quyền (mặc định: null)
 * @param {Boolean} adminBypass - Cho phép Admin xem tất cả (mặc định: true)
 */
export const RoleGuard = ({
  allowedRoles = [],
  children,
  fallback = null,
  adminBypass = true,
}) => {
  const { user, isAuthenticated } = useAuthStore();

  // 1. Nếu chưa đăng nhập -> Trả về fallback
  if (!isAuthenticated || !user) {
    return fallback;
  }

  // 2. 🌟 TRÍCH XUẤT VÀ ĐỒNG HÓA CÁC ROLE TƯƠNG ĐƯƠNG
  const userRoles = useMemo(() => {
    const raw = user?.roles || user?.role || user?.role_name || [];
    const roleList = Array.isArray(raw) ? raw : [raw];
    const rolesSet = new Set(roleList.map(normalizeRole).filter(Boolean));

    // Đồng hóa các role tương đương để phân quyền luôn chính xác
    if (rolesSet.has("hotel_owner")) rolesSet.add("owner");
    if (rolesSet.has("owner")) rolesSet.add("hotel_owner");
    if (rolesSet.has("receptionist")) rolesSet.add("staff");
    if (rolesSet.has("staff")) rolesSet.add("receptionist");

    return Array.from(rolesSet);
  }, [user]);

  const normalizedAllowedRoles = useMemo(() => {
    return allowedRoles.map(normalizeRole).filter(Boolean);
  }, [allowedRoles]);

  // 3. Logic kiểm tra quyền
  const isSystemAdmin =
    userRoles.includes("admin") ||
    userRoles.includes("role_admin") ||
    userRoles.includes("superadmin");

  const hasAccess =
    (adminBypass && isSystemAdmin) || // Admin luôn được xem
    normalizedAllowedRoles.length === 0 || // Không yêu cầu role cụ thể
    normalizedAllowedRoles.some((role) => userRoles.includes(role)); // Khớp role

  // 4. Trả về kết quả hiển thị
  if (hasAccess) {
    return <>{children}</>;
  }

  return fallback;
};

export default RoleGuard;
