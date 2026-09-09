import React, { useState } from "react";
import { Outlet, useNavigate, useLocation, Link } from "react-router-dom";
import {
  Grid3X3,
  CalendarCheck,
  LogOut,
  Building2,
  User,
  Menu,
  X,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { cn } from "@/utils/cn";

export default function ReceptionLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Chỉ hiển thị 2 nghiệp vụ đón khách của Lễ tân
  const receptionNavItems = [
    {
      path: "/reception/room-map",
      label: "Sơ Đồ Phòng & Đặt Phòng Tại Quầy",
      icon: <Grid3X3 size={18} />,
    },
    {
      path: "/reception/bookings",
      label: "Tiếp Nhận Đơn & Check-in / Out",
      icon: <CalendarCheck size={18} />,
    },
  ];

  const currentTab =
    receptionNavItems.find((item) => item.path === location.pathname)?.label ||
    "Bàn Trực Lễ Tân";

  const staffName = user?.full_name || user?.name || "Nhân viên Lễ Tân";

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex h-screen w-full bg-[#f0f2f5] overflow-hidden font-sans">
      {/* SIDEBAR DÀNH RIÊNG CHO LỄ TÂN */}
      <aside
        className={cn(
          "bg-white border-r border-slate-200 flex flex-col justify-between h-full z-50 transition-all shrink-0 select-none",
          "w-64 fixed lg:static inset-y-0 left-0",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div>
          {/* Header Quầy tiếp tân */}
          <div className="h-16 px-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-[#1b6a38] text-white rounded-xl shadow-xs">
                <Building2 size={20} />
              </div>
              <div>
                <span className="font-black text-slate-900 text-sm tracking-tight block leading-tight">
                  GoStay PMS
                </span>
                <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">
                  Bàn Trực Lễ Tân
                </span>
              </div>
            </div>

            <button
              onClick={() => setIsMobileOpen(false)}
              className="lg:hidden p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Menu Lễ tân */}
          <nav className="p-3 space-y-1.5">
            {receptionNavItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold transition",
                    isActive
                      ? "bg-[#1b6a38] text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                  )}
                >
                  <span className="shrink-0">{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Thông tin ca trực & Đăng xuất */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/70 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-800 font-bold text-xs">
              <User size={15} />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-slate-800 truncate">
                {staffName}
              </p>
              <span className="text-[10px] text-emerald-600 font-bold uppercase">
                Nhân viên Lễ Tân
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full py-2 px-3 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl border border-rose-200 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut size={14} />
            <span>Đăng xuất ca trực</span>
          </button>
        </div>
      </aside>

      {/* Backdrop trên mobile */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 bg-black/40 backdrop-blur-2xs z-40 lg:hidden"
        />
      )}

      {/* VÙNG LÀM VIỆC CHÍNH */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 shrink-0 shadow-2xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileOpen(true)}
              className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 cursor-pointer"
            >
              <Menu size={18} />
            </button>
            <h2 className="text-xs sm:text-sm font-bold text-slate-800">
              {currentTab}
            </h2>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-slate-600 hidden sm:inline">
              Ca trực tiếp đón khách
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
