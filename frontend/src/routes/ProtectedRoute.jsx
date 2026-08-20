import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { LoadingSpinner } from "@/components/common";

/**
 * ProtectedRoute: Bọc các route cần đăng nhập và kiểm tra quyền (Role)
 * @param {Array} allowedRoles - Danh sách role được phép truy cập, ví dụ: ['owner', 'admin']
 * @param {String} redirectTo - Đường dẫn chuyển hướng khi chưa đăng nhập (mặc định: '/login')
 */
const ProtectedRoute = ({ allowedRoles = [], redirectTo = "/login" }) => {
  const location = useLocation();
  const { user, token, systemToken, isRehydrated } = useAuthStore();
  const activeToken = token || systemToken;

  // ─── 1. CHỜ ZUSTAND KHÔI PHỤC DỮ LIỆU TỪ LOCALSTORAGE (CHỐNG LỖI F5) ───
  if (isRehydrated === false) {
    return <LoadingSpinner fullPage label="Đang kiểm tra quyền truy cập..." />;
  }

  // ─── 2. CHƯA ĐĂNG NHẬP -> CHUYỂN HƯỚNG VỀ LOGIN ───
  if (!activeToken || !user) {
    console.warn("⚠️ [ProtectedRoute] Chưa đăng nhập -> Chuyển về /login");
    // Lưu vết trang hiện tại vào state để đăng nhập xong quay lại đúng trang này
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // ─── 3. BÓC TÁCH ROLE CỦA USER CHUẨN XÁC ───
  const getRoles = () => {
    const raw = user?.role || user?.role_name || user?.roles || "";
    if (Array.isArray(raw)) return raw.map((r) => String(r).toLowerCase());
    return [String(raw).toLowerCase()];
  };

  const userRoles = getRoles();
  const normalizedAllowedRoles = allowedRoles.map((role) =>
    String(role).toLowerCase(),
  );

  // ─── 4. KIỂM TRA QUYỀN TRUY CẬP ───
  // - Nếu không yêu cầu role cụ thể (allowedRoles rỗng) -> Cho phép qua
  // - Nếu là Admin tối cao -> Luôn luôn cho phép qua (Admin Bypass)
  // - Nếu User có ít nhất 1 role khớp với allowedRoles -> Cho phép qua
  const hasAccess =
    normalizedAllowedRoles.length === 0 ||
    userRoles.includes("admin") ||
    userRoles.includes("role_admin") ||
    user?.role_id === 1 ||
    normalizedAllowedRoles.some((role) => userRoles.includes(role));

  if (!hasAccess) {
    console.warn(
      `⚠️ [ProtectedRoute] Từ chối quyền cho User có role: [${userRoles.join(", ")}]`,
    );
    // Không đủ quyền -> Đẩy về trang chủ
    return <Navigate to="/" replace />;
  }

  // ─── 5. ĐỦ QUYỀN -> RENDER CÁC TRANG CON BÊN TRONG (OUTLET) ───
  return <Outlet />;
};

export default ProtectedRoute;
