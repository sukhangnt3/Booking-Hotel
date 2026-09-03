// src/components/layout/OwnerLayout.jsx
import React, { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  BedDouble,
  CalendarCheck,
  Menu,
  Sparkles,
  BarChart3,
  UserCheck,
  Users,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import Sidebar from "./Sidebar";
import { cn } from "@/utils/cn";

const OwnerLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Kiểm tra vai trò Lễ tân hay Chủ nhà
  const roleStr = String(user?.role || user?.role_name || "").toLowerCase();
  const isReceptionist = roleStr === "staff" || roleStr === "receptionist";

  // ── 🏨 1. DANH MỤC MENU DÀNH CHO CHỦ KHÁCH SẠN (OWNER / MANAGER) ──
  const ownerNavItems = [
    {
      path: "/owner/dashboard",
      label: "Tổng Quan & Báo Cáo",
      icon: <LayoutDashboard size={19} />,
    },
    {
      path: "/owner/hotels",
      label: "Thông Tin Chỗ Nghỉ",
      icon: <Building2 size={19} />,
    },
    {
      path: "/owner/bookings",
      label: "Quản Lý Đặt Phòng",
      icon: <CalendarCheck size={19} />,
    },
    {
      path: "/owner/rooms",
      label: "Cập Nhật Trạng Thái Phòng",
      icon: <BedDouble size={19} />,
    },
    {
      path: "/owner/housekeeping",
      label: "Giám Sát Buồng Phòng",
      icon: <Sparkles size={19} />,
    },
    {
      path: "/owner/staff",
      label: "Quản Lý Lễ Tân & Nhân Sự", // 👈 ĐÃ BỔ SUNG MỤC CẤP TÀI KHOẢN LỄ TÂN
      icon: <UserCheck size={19} />,
    },
    {
      path: "/owner/guests",
      label: "Hồ Sơ Khách Hàng (CRM)",
      icon: <Users size={19} />,
    },
    {
      path: "/owner/reports",
      label: "Báo Cáo Doanh Thu (CSV)",
      icon: <BarChart3 size={19} />,
    },
  ];

  // ── 🔑 2. DANH MỤC MENU DÀNH RIÊNG CHO LỄ TÂN (FRONT DESK) ──
  const receptionistNavItems = [
    {
      path: "/owner/bookings",
      label: "Xử Lý Đặt Phòng (Check-in/out)",
      icon: <CalendarCheck size={19} />,
    },
    {
      path: "/owner/housekeeping",
      label: "Yêu Cầu Buồng Phòng",
      icon: <Sparkles size={19} />,
    },
    {
      path: "/owner/guests",
      label: "Tra Cứu Khách Hàng",
      icon: <Users size={19} />,
    },
  ];

  const navItems = isReceptionist ? receptionistNavItems : ownerNavItems;
  const currentTab =
    navItems.find((item) => item.path === location.pathname)?.label ||
    "Quản Lý Chỗ Nghỉ";
  const ownerName = user?.full_name || user?.name || "Chủ Chỗ Nghỉ";

  // Bóc tách ảnh đại diện Avatar
  const avatarUrl =
    user?.avatar ||
    user?.picture ||
    localStorage.getItem(`google_avatar_${user?.email}`) ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(ownerName)}&background=059669&color=fff&bold=true`;

  return (
    <div className="flex h-screen w-full bg-[#f8fafc] overflow-hidden font-sans">
      {/* ── SIDEBAR ── */}
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
          items={navItems}
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
          user={user}
          onLogout={() => {
            logout();
            navigate("/");
          }}
          activeColor={isReceptionist ? "bg-amber-600" : "bg-[#059669]"}
        />
      </div>

      {/* ── MAIN CONTENT ── */}
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
              {currentTab}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-black text-slate-800 leading-none">
                {ownerName}
              </p>
              <p className="text-[10px] text-emerald-600 font-bold mt-1 uppercase">
                {isReceptionist
                  ? "Lễ Tân Trực Ca"
                  : "Đối Tác Khách Sạn (Owner)"}
              </p>
            </div>

            <img
              src={avatarUrl}
              alt={ownerName}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(ownerName)}&background=059669&color=fff&bold=true`;
              }}
              className="w-9 h-9 rounded-full border-2 border-emerald-500 object-cover shadow-sm shrink-0"
            />
          </div>
        </header>

        {/* Nội dung trang con */}
        <main className="flex-1 overflow-y-auto p-6 bg-[#f8fafc]">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default OwnerLayout;
