// src/components/layout/ReceptionLayout.jsx
import React, { useState, useMemo } from "react";
import { Outlet, useNavigate, useLocation, Link } from "react-router-dom";
import {
  Grid3X3,
  CalendarCheck,
  LogOut,
  Building2,
  Menu,
  X,
  Home,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import apiClient from "@/services/apiClient";
import { cn } from "@/utils/cn";

export default function ReceptionLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user: storeUser, logout } = useAuthStore();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Đảm bảo dữ liệu user luôn sẵn sàng khi F5
  const user = useMemo(() => {
    if (storeUser) return storeUser;
    try {
      const localUser = JSON.parse(localStorage.getItem("user") || "null");
      const authStorageUser = JSON.parse(
        localStorage.getItem("auth-storage") || "{}",
      )?.state?.user;
      return localUser || authStorageUser || null;
    } catch {
      return null;
    }
  }, [storeUser]);

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

  const staffName =
    user?.full_name || user?.name || user?.username || "Nhân viên Lễ Tân";

  const fallbackStaffAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    staffName,
  )}&background=1b6a38&color=fff&bold=true`;

  const staffAvatarUrl = useMemo(() => {
    const raw =
      user?.avatar ||
      user?.picture ||
      user?.photoURL ||
      user?.avatar_url ||
      user?.image ||
      (user?.email
        ? localStorage.getItem(`google_avatar_${user.email}`)
        : null);

    if (
      !raw ||
      typeof raw !== "string" ||
      raw.trim() === "" ||
      raw === "null" ||
      raw === "undefined"
    ) {
      return fallbackStaffAvatar;
    }

    if (
      raw.startsWith("http://") ||
      raw.startsWith("https://") ||
      raw.startsWith("data:") ||
      raw.startsWith("blob:")
    ) {
      return raw;
    }

    const cleanPath = raw.replace(/\\/g, "/").replace(/^\/+/, "");
    const backendBase =
      apiClient.defaults?.baseURL?.replace(/\/api\/?$/, "") ||
      import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, "") ||
      "http://localhost:5000";

    return `${backendBase}/${cleanPath}`;
  }, [user, fallbackStaffAvatar]);

  const handleLogout = () => {
    if (logout) logout();
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("auth-storage");
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

        {/* Thông tin ca trực, Avatar & Đăng xuất */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/70 space-y-3">
          <div className="flex items-center gap-2.5">
            <img
              key={staffAvatarUrl}
              src={staffAvatarUrl}
              alt={staffName}
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = fallbackStaffAvatar;
              }}
              className="w-9 h-9 rounded-full border border-emerald-500 object-cover bg-white shrink-0"
            />
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-slate-800 truncate">
                {staffName}
              </p>
              <span className="text-[10px] text-emerald-600 font-bold uppercase">
                Nhân viên Lễ Tân
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <Link
              to="/"
              className="flex-1 py-2 px-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 transition flex items-center justify-center gap-1.5"
            >
              <Home size={14} />
              <span>Trang chủ</span>
            </Link>

            <button
              onClick={handleLogout}
              className="flex-1 py-2 px-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl border border-rose-200 transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <LogOut size={14} />
              <span>Đăng xuất</span>
            </button>
          </div>
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
