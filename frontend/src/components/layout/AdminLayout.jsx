import React, { useState } from "react";
import { cn } from "@/utils/cn";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  Users,
  ClipboardList,
  Tag,
  MessageSquareText,
  Menu,
  Bell,
  Search,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import Sidebar from "./Sidebar";

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const menuItems = [
    {
      path: "/admin/dashboard",
      label: "Dashboard",
      icon: <LayoutDashboard size={20} />,
    },
    {
      path: "/admin/hotels",
      label: "Duyệt khách sạn",
      icon: <Building2 size={20} />,
    },
    { path: "/admin/users", label: "Người dùng", icon: <Users size={20} /> },
    {
      path: "/admin/bookings",
      label: "Đặt phòng",
      icon: <ClipboardList size={20} />,
    },
    { path: "/admin/promotions", label: "Khuyến mãi", icon: <Tag size={20} /> },
    {
      path: "/admin/reviews",
      label: "Đánh giá",
      icon: <MessageSquareText size={20} />,
    },
  ];

  const currentTab =
    menuItems.find((item) => item.path === location.pathname)?.label ||
    "Quản trị";

  return (
    // CHIỀU CAO H-SCREEN VÀ OVERFLOW-HIDDEN LÀ BẮT BUỘC Ở ĐÂY
    <div className="flex h-screen w-full bg-[#f8fafc] overflow-hidden font-sans">
      {/* 1. SIDEBAR */}
      <div
        className={cn(
          "lg:block shrink-0 h-full",
          isMobileOpen ? "block fixed inset-0 z-[100]" : "hidden",
        )}
      >
        {isMobileOpen && (
          <div
            className="fixed inset-0 bg-black/50 lg:hidden"
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
          activeColor="bg-blue-600"
          roleName="Hệ thống Admin"
        />
      </div>

      {/* 2. NỘI DUNG CHÍNH (PHẢI CÓ FLEX-COL VÀ H-FULL) */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* TOPBAR */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 shrink-0 z-30 shadow-sm">
          <div className="flex items-center gap-4">
            <button
              className="lg:hidden p-2 hover:bg-slate-100 rounded-lg"
              onClick={() => setIsMobileOpen(true)}
            >
              <Menu size={22} />
            </button>
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">
              {currentTab}
            </h2>
          </div>

          <div className="flex items-center gap-5">
            <div className="hidden md:flex items-center bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
              <Search size={16} className="text-slate-400 mr-2" />
              <input
                type="text"
                placeholder="Tìm kiếm..."
                className="bg-transparent text-xs outline-none w-40"
              />
            </div>
            <div className="relative cursor-pointer text-slate-400 hover:text-blue-600 transition-colors">
              <Bell size={20} />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </div>
            <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-slate-800 leading-none">
                  Admin
                </p>
                <p className="text-[10px] text-blue-600 font-bold mt-1 uppercase">
                  Online
                </p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                AD
              </div>
            </div>
          </div>
        </header>

        {/* PHẦN CUỘN NỘI DUNG (OVERFLOW-Y-AUTO) */}
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
