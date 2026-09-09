import React, { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { LoadingSpinner } from "@/components/common";

const ReceptionRoutes = () => {
  const location = useLocation();
  const { user, isAuthenticated, isLoadingUser, fetchUserProfile } =
    useAuthStore();

  useEffect(() => {
    if (!user && isLoadingUser) {
      fetchUserProfile();
    }
  }, [user, isLoadingUser, fetchUserProfile]);

  if (isLoadingUser) {
    return <LoadingSpinner fullPage label="Đang xác thực quyền lễ tân..." />;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

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
      const roleStr =
        typeof r === "object" ? r.name || r.role_name || r.role || "" : r;
      return String(roleStr).trim().toLowerCase();
    });

  const isAllowed =
    normalizedRoles.some((r) =>
      [
        "receptionist",
        "staff",
        "le_tan",
        "letan",
        "owner",
        "admin",
        "manager",
      ].some((validRole) => r.includes(validRole)),
    ) ||
    user?.role_id === 1 ||
    user?.role_id === 2 ||
    user?.role_id === 3 ||
    user?.role_id === 4;

  if (!isAllowed) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default ReceptionRoutes;
