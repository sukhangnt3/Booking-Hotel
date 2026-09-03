// src/components/layout/AdminLayout.jsx
import React, { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  Users,
  Menu,
  BarChart3,
  Settings,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import Sidebar from "./Sidebar";
import { cn } from "@/utils/cn";

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user: storeUser, logout } = useAuthStore();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [pendingHotelCount, setPendingHotelCount] = useState(0);

  // Đảm bảo dữ liệu user luôn sẵn sàng khi F5
  const localUser = JSON.parse(localStorage.getItem("user") || "null");
  const authStorageUser = JSON.parse(
    localStorage.getItem("auth-storage") || "{}",
  )?.state?.user;
  const user = storeUser || localUser || authStorageUser;

  useEffect(() => {
    try {
      const localApps = JSON.parse(
        localStorage.getItem("pending_partner_applications") || "[]",
      );
      const approvedIds = JSON.parse(
        localStorage.getItem("approved_hotel_ids") || "[]",
      ).map(String);
      const rejectedIds = JSON.parse(
        localStorage.getItem("rejected_hotel_ids") || "[]",
      ).map(String);

      const pending = localApps.filter(
        (h) =>
          !approvedIds.includes(String(h.id || h.applicationId)) &&
          !rejectedIds.includes(String(h.id || h.applicationId)) &&
          h.status !== "approved",
      );
      setPendingHotelCount(pending.length);
    } catch (e) {
      console.error(e);
    }
  }, [location.pathname]);

  const menuItems = [
    {
      path: "/admin/dashboard",
      label: "Tổng Quan PMS",
      icon: <LayoutDashboard size={19} />,
    },
    {
      path: "/admin/hotels",
      label:
        pendingHotelCount > 0
          ? `Phê Duyệt Đối Tác (${pendingHotelCount})`
          : "Phê Duyệt Đối Tác",
      icon: <Building2 size={19} />,
    },
    {
      path: "/admin/reports",
      label: "Báo Cáo Doanh Thu (CSV)",
      icon: <BarChart3 size={19} />,
    },
    {
      path: "/admin/users",
      label: "Người Dùng & Phân Quyền",
      icon: <Users size={19} />,
    },
    {
      path: "/admin/settings",
      label: "Cài Đặt Hệ Thống",
      icon: <Settings size={19} />,
    },
  ];

  const adminName =
    user?.full_name ||
    user?.name ||
    user?.username ||
    user?.email?.split("@")[0] ||
    "Super Admin";

  const defaultAdminFallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    adminName,
  )}&background=003580&color=fff&bold=true`;

  // 🎯 BÓC TÁCH AVATAR GOOGLE & DATABASE
  const getAdminAvatar = () => {
    const raw =
      user?.avatar ||
      user?.picture ||
      user?.photoURL ||
      user?.avatar_url ||
      (user?.email
        ? localStorage.getItem(`google_avatar_${user.email}`)
        : null);

    if (
      raw &&
      typeof raw === "string" &&
      raw.trim() !== "" &&
      raw !== "null" &&
      raw !== "undefined" &&
      !raw.includes("placeholder")
    ) {
      return raw;
    }
    return defaultAdminFallback;
  };

  const adminAvatarUrl = getAdminAvatar();

  return (
    <div className="flex h-screen w-full bg-[#f8fafc] overflow-hidden font-sans">
      {/* Sidebar Admin */}
      <div
        className={cn(
          "lg:block shrink-0 h-full",
          isMobileOpen ? "block fixed inset-0 z-[100]" : "hidden",
        )}
      >
        {isMobileOpen && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setIsMobileOpen(false)}
          />
        )}
        <Sidebar
          items={menuItems}
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
          user={user}
          onLogout={() => {
            logout();
            navigate("/");
          }}
          activeColor="bg-[#003580]"
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Topbar Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-2 rounded-xl hover:bg-slate-100 cursor-pointer"
              onClick={() => setIsMobileOpen(true)}
            >
              <Menu size={20} />
            </button>
            <h2 className="text-base font-black text-slate-800 tracking-tight">
              Hệ Thống BezTower & Residences PMS
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-black text-slate-800 leading-none">
                {adminName}
              </p>
              <p className="text-[10px] text-blue-700 font-bold mt-1 uppercase">
                Quản Trị Viên (Super Admin)
              </p>
            </div>

            {/* AVATAR ADMIN CÓ CHỐNG CHẶN GOOGLE */}
            <img
              key={adminAvatarUrl}
              src={adminAvatarUrl}
              alt={adminName}
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = defaultAdminFallback;
              }}
              className="w-9 h-9 rounded-full border-2 border-[#003580] object-cover shadow-sm shrink-0 bg-white"
            />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 bg-[#f8fafc]">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
