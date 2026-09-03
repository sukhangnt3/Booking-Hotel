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
  const { user, logout } = useAuthStore();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const [pendingHotelCount, setPendingHotelCount] = useState(0);

  useEffect(() => {
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
  }, [location.pathname]);

  // 👑 5 MỤC QUẢN TRỊ TỐI CAO CỦA SUPER ADMIN (CỰC KỲ GỌN GÀNG)
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
    user?.full_name || user?.name || user?.username || "Super Admin";

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
            <span className="text-xs font-bold text-slate-600 hidden sm:inline">
              {adminName}
            </span>
            <div className="w-8 h-8 rounded-full bg-[#003580] text-white font-bold flex items-center justify-center text-xs shadow-sm">
              {adminName.charAt(0)}
            </div>
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
