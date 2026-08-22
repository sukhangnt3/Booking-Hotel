import React, { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  Users,
  Menu,
  Bell,
  Search,
  ShieldCheck,
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

  // ─── 3 NHIỆM VỤ QUẢN TRỊ CỐT LÕI CỦA SÀN ───
  const menuItems = [
    {
      path: "/admin/dashboard",
      label: "Giám Sát Lưu Lượng Sàn",
      icon: <LayoutDashboard size={20} />,
    },
    {
      path: "/admin/hotels",
      label: "Phê Duyệt Đối Tác",
      icon: <Building2 size={20} />,
    },
    {
      path: "/admin/users",
      label: "Quản Lý Người Dùng & Role",
      icon: <Users size={20} />,
    },
  ];

  const currentTab =
    menuItems.find((item) => item.path === location.pathname)?.label ||
    "Quản trị sàn";

  const adminName =
    user?.full_name || user?.name || user?.username || "Super Admin";

  // 👈 BÓC TÁCH AVATAR GOOGLE THẬT
  const savedGoogleAvatar = user?.email
    ? localStorage.getItem(`google_avatar_${user.email}`)
    : null;
  const avatarUrl =
    user?.avatar ||
    user?.picture ||
    user?.photoURL ||
    savedGoogleAvatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(adminName)}&background=4F46E5&color=fff&bold=true`;

  return (
    <div className="flex h-screen w-full bg-[#f8fafc] overflow-hidden font-sans">
      {/* 1. SIDEBAR QUẢN TRỊ */}
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
          activeColor="bg-[#006ce4]"
          roleName="Quản Trị Tối Cao"
        />
      </div>

      {/* 2. KHU VỰC NỘI DUNG CHÍNH */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* TOPBAR */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 shrink-0 z-30 shadow-sm">
          <div className="flex items-center gap-4">
            <button
              className="lg:hidden p-2 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              onClick={() => setIsMobileOpen(true)}
            >
              <Menu size={22} className="text-slate-600" />
            </button>
            <h2 className="text-lg font-black text-slate-800 tracking-tight">
              {currentTab}
            </h2>
          </div>

          <div className="flex items-center gap-5">
            {/* Thanh tìm kiếm */}
            <div className="hidden md:flex items-center bg-slate-100 px-4 py-2 rounded-2xl border border-slate-200">
              <Search size={16} className="text-slate-400 mr-2 shrink-0" />
              <input
                type="text"
                placeholder="Tra cứu hệ thống..."
                className="bg-transparent text-xs outline-none w-44 font-semibold"
              />
            </div>

            {/* Thông báo */}
            <div className="relative cursor-pointer text-slate-400 hover:text-blue-600 transition-colors">
              <Bell size={20} />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </div>

            {/* 👈 HIỂN THỊ AVATAR THẬT CỦA ADMIN */}
            <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-black text-slate-800 leading-none">
                  {adminName}
                </p>
                <p className="text-[10px] text-blue-600 font-black mt-1 uppercase tracking-wider">
                  Admin Portal
                </p>
              </div>

              <img
                key={user?.id || user?.email}
                src={avatarUrl}
                alt={adminName}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(adminName)}&background=4F46E5&color=fff&bold=true`;
                }}
                className="w-10 h-10 rounded-2xl object-cover border-2 border-blue-500 shadow-md shadow-blue-100 shrink-0"
              />
            </div>
          </div>
        </header>

        {/* NỘI DUNG TỪNG TRANG ADMIN (OUTLET) */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8 custom-scrollbar bg-[#f8fafc]">
          <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-500">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
