import React, { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Hotel,
  BedDouble,
  CalendarCheck,
  Menu,
  Bell,
  Search,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import Sidebar from "./Sidebar";
import { cn } from "@/utils/cn";

const OwnerLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  // Quản lý trạng thái đóng/mở Sidebar
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // ─── 4 CHỨC NĂNG CỐT LÕI DÀNH CHO CHỦ KHÁCH SẠN ───
  const navItems = [
    {
      path: "/owner/dashboard",
      label: "Thống Kê & Vận Hành",
      icon: <LayoutDashboard size={20} />,
    },
    {
      path: "/owner/hotels",
      label: "Thông Tin Chỗ Nghỉ",
      icon: <Hotel size={20} />,
    },
    {
      path: "/owner/rooms",
      label: "Giá Phòng & Sơ Đồ",
      icon: <BedDouble size={20} />,
    },
    {
      path: "/owner/bookings",
      label: "Xử Lý Đặt Phòng",
      icon: <CalendarCheck size={20} />,
    },
  ];

  // Tìm tên trang hiện tại dựa trên đường dẫn
  const currentTab =
    navItems.find((item) => item.path === location.pathname)?.label ||
    "Quản lý chỗ nghỉ";

  const displayName = user?.full_name || user?.name || "Đối tác GoStay";
  const userInitial = displayName.charAt(0).toUpperCase();

  return (
    <div className="flex h-screen w-full bg-[#f8fafc] overflow-hidden font-sans">
      {/* 1. SIDEBAR CHO CHỦ NHÀ (4 MỤC GỌN GÀNG) */}
      <div
        className={cn(
          "lg:block shrink-0 h-full",
          isMobileOpen ? "block fixed inset-0 z-[100]" : "hidden",
        )}
      >
        {/* Lớp nền mờ khi mở menu trên mobile */}
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
          activeColor="bg-emerald-600" // Màu xanh lá đặc trưng của Đối tác
          roleName="Chủ Chỗ Nghỉ"
        />
      </div>

      {/* 2. KHU VỰC NỘI DUNG CHÍNH */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* TOPBAR */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 shrink-0 z-30 shadow-sm">
          <div className="flex items-center gap-4">
            {/* Nút mở Sidebar trên Mobile */}
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

          <div className="flex items-center gap-4 sm:gap-6">
            {/* Thanh tìm kiếm nhanh */}
            <div className="hidden md:flex items-center bg-slate-100 px-4 py-2 rounded-2xl border border-slate-200">
              <Search size={16} className="text-slate-400 mr-2 shrink-0" />
              <input
                type="text"
                placeholder="Tìm mã đơn, phòng..."
                className="bg-transparent text-xs outline-none w-44 font-semibold"
              />
            </div>

            {/* Thông báo */}
            <div className="relative cursor-pointer text-slate-400 hover:text-emerald-600 transition-colors">
              <Bell size={20} />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
            </div>

            {/* Thông tin User */}
            <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-black text-slate-800 leading-none">
                  {displayName}
                </p>
                <p className="text-[10px] text-emerald-600 font-black mt-1 uppercase tracking-wider">
                  Đối tác tin cậy
                </p>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-emerald-100">
                {userInitial}
              </div>
            </div>
          </div>
        </header>

        {/* NỘI DUNG TỪNG TRANG (OUTLET) */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8 custom-scrollbar bg-slate-50/50">
          <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-3 duration-500">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default OwnerLayout;
