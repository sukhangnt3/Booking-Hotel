// src/routes/ProtectedRoute.jsx
import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { Loader2 } from "lucide-react";

const ProtectedRoute = ({ allowedRoles = [], redirectTo = "/login" }) => {
  const { user, token, systemToken, isRehydrated } = useAuthStore();
  const location = useLocation();

  // 1. Kiểm tra Token (Hỗ trợ fallback từ localStorage khi F5 trang)
  const activeToken =
    token ||
    systemToken ||
    localStorage.getItem("token") ||
    localStorage.getItem("access_token");

  // 2. Chờ Zustand nạp xong dữ liệu (Persist Rehydration)
  if (isRehydrated === false) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center gap-2 font-sans text-slate-600">
        <Loader2 className="animate-spin text-[#003580]" size={36} />
        <p className="text-xs font-bold">Đang kiểm tra quyền truy cập...</p>
      </div>
    );
  }

  // 3. Nếu chưa đăng nhập -> Chuyển về trang login kèm đường dẫn gốc để quay lại
  if (!activeToken) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // 4. 🌟 TRÍCH XUẤT ROLE AN TOÀN (HỖ TRỢ CẢ STRING, ARRAY STRING & ARRAY OBJECT)
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

  const getRoles = () => {
    const raw = user?.roles || user?.role || user?.role_name || [];
    const roleList = Array.isArray(raw) ? raw : [raw];
    const rolesSet = new Set(roleList.map(normalizeRole).filter(Boolean));

    // Đồng hóa các role tương đương để phân quyền không bao giờ bị lệch
    if (rolesSet.has("hotel_owner")) rolesSet.add("owner");
    if (rolesSet.has("owner")) rolesSet.add("hotel_owner");
    if (rolesSet.has("receptionist")) rolesSet.add("staff");
    if (rolesSet.has("staff")) rolesSet.add("receptionist");

    return Array.from(rolesSet);
  };

  const userRoles = getRoles();
  const normalizedAllowedRoles = allowedRoles.map((r) => normalizeRole(r));

  // 5. Kiểm tra quyền truy cập:
  // - Nếu không yêu cầu role cụ thể (allowedRoles rỗng) -> Cho qua
  // - Nếu là Admin -> Bypass cho qua tất cả
  // - Nếu khớp bất kỳ role nào trong allowedRoles -> Cho qua
  const isAdmin =
    userRoles.includes("admin") ||
    userRoles.includes("role_admin") ||
    userRoles.includes("superadmin");

  const hasAccess =
    normalizedAllowedRoles.length === 0 ||
    isAdmin ||
    normalizedAllowedRoles.some((role) => userRoles.includes(role));

  if (!hasAccess) {
    console.warn("⚠️ [ProtectedRoute] Từ chối truy cập cho roles:", userRoles);
    return <Navigate to="/" replace />;
  }

  // 6. Đủ quyền hợp lệ -> Render giao diện
  return <Outlet />;
};

export default ProtectedRoute;
