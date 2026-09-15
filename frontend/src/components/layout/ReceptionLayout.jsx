// src/components/layout/ReceptionLayout.jsx
import React, { useState, useMemo, useRef, useEffect } from "react";
import { Outlet, useNavigate, useLocation, Link } from "react-router-dom";
import {
  Grid3X3,
  CalendarCheck,
  LogOut,
  Building2,
  Menu,
  X,
  Home,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import apiClient from "@/services/apiClient";
import { cn } from "@/utils/cn";

export default function ReceptionLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user: storeUser, logout } = useAuthStore();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

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

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
    "Sơ Đồ Phòng & Đặt Phòng";

  const staffName =
    user?.full_name || user?.name || user?.username || "Nhân viên Lễ Tân";

  const fallbackStaffAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    staffName,
  )}&background=003580&color=fff&bold=true`;

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
    setIsMenuOpen(false);
    navigate("/login");
  };

  return (
    <div className="flex h-screen w-full bg-gray-50/50 overflow-hidden font-sans text-gray-900">
      {/* ─── SIDEBAR LỄ TÂN ─── */}
      <aside
        className={cn(
          "bg-white border-r border-gray-200 flex flex-col justify-between h-full z-30 transition-all duration-300 ease-in-out shrink-0 select-none shadow-xs relative",
          "fixed lg:static inset-y-0 left-0",
          isCollapsed ? "lg:w-20" : "lg:w-64",
          "w-64",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        {/* Nút kéo vào / kéo ra chuẩn mép viền */}
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden lg:flex absolute -right-3.5 top-5 z-40 w-7 h-7 bg-white border border-gray-200 rounded-full shadow-md items-center justify-center text-gray-500 hover:text-[#003580] hover:border-[#003580] transition-all cursor-pointer active:scale-95"
          title={isCollapsed ? "Mở rộng thanh bên" : "Thu gọn thanh bên"}
        >
          {isCollapsed ? (
            <ChevronRight size={14} strokeWidth={2.5} />
          ) : (
            <ChevronLeft size={14} strokeWidth={2.5} />
          )}
        </button>

        <div>
          {/* LOGO BẤM VỀ TRANG CHỦ */}
          <div
            className={cn(
              "h-16 border-b border-gray-100 flex items-center justify-between transition-all",
              isCollapsed ? "px-3 justify-center" : "px-5",
            )}
          >
            <Link
              to="/"
              className={cn(
                "flex items-center gap-3 group transition cursor-pointer overflow-hidden",
                isCollapsed && "justify-center",
              )}
              title="Nhấn để về trang chủ GoStay"
            >
              <div className="p-2 bg-[#003580] text-white rounded-xl shadow-xs group-hover:bg-blue-900 transition shrink-0">
                <Building2 size={20} />
              </div>
              {!isCollapsed && (
                <div className="overflow-hidden">
                  <span className="font-black text-[#0a2540] text-sm tracking-tight block leading-tight group-hover:text-[#003580] transition truncate">
                    GoStay PMS
                  </span>
                  <span className="text-[10px] text-[#006ce4] font-black uppercase tracking-wider block mt-0.5 truncate">
                    Bàn Trực Lễ Tân
                  </span>
                </div>
              )}
            </Link>

            <button
              type="button"
              onClick={() => setIsMobileOpen(false)}
              className="lg:hidden p-1 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* DANH MỤC ĐIỀU HƯỚNG */}
          <nav className="p-3 space-y-1.5">
            {receptionNavItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 py-3 rounded-xl text-xs font-bold transition",
                    isCollapsed ? "justify-center px-0" : "px-3.5",
                    isActive
                      ? "bg-[#003580] text-white shadow-xs"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
                  )}
                  title={isCollapsed ? item.label : undefined}
                >
                  <span className="shrink-0">{item.icon}</span>
                  {!isCollapsed && (
                    <span className="truncate">{item.label}</span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Backdrop trên mobile */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 lg:hidden"
        />
      )}

      {/* ─── VÙNG LÀM VIỆC CHÍNH ─── */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* HEADER QUẢN TRỊ */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0 shadow-xs z-20">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMobileOpen(true)}
              className="lg:hidden p-2 rounded-xl hover:bg-gray-100 text-gray-700 cursor-pointer"
            >
              <Menu size={18} />
            </button>
            <h2 className="text-base sm:text-lg font-black text-[#0a2540] tracking-tight">
              {currentTab}
            </h2>
          </div>

          {/* AVATAR & DROPDOWN LỄ TÂN */}
          <div className="flex items-center gap-3">
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className={cn(
                  "flex items-center gap-3 p-1.5 rounded-2xl transition cursor-pointer border border-transparent",
                  isMenuOpen
                    ? "bg-gray-100 border-gray-200"
                    : "hover:bg-gray-50",
                )}
              >
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-bold text-gray-900 leading-none">
                    {staffName}
                  </p>
                  <p className="text-[10px] text-[#006ce4] font-black uppercase tracking-wider mt-1">
                    Nhân viên Lễ Tân
                  </p>
                </div>

                <img
                  key={staffAvatarUrl}
                  src={staffAvatarUrl}
                  alt={staffName}
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = fallbackStaffAvatar;
                  }}
                  className="w-9 h-9 rounded-full border-2 border-[#003580] object-cover bg-white shrink-0 shadow-xs"
                />

                <ChevronDown
                  size={14}
                  className={cn(
                    "text-gray-400 transition-transform duration-200 hidden sm:block",
                    isMenuOpen && "rotate-180",
                  )}
                />
              </button>

              {/* DROPDOWN MENU */}
              {isMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-3xl shadow-2xl z-50 py-2 border border-gray-200 text-gray-800 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-[10px] text-gray-400 uppercase font-black tracking-wider">
                      Ca trực hiện tại
                    </p>
                    <p className="text-xs font-bold truncate mt-0.5 text-[#003580]">
                      {user?.email || staffName}
                    </p>
                  </div>

                  <Link
                    to="/"
                    onClick={() => setIsMenuOpen(false)}
                    className="w-full text-left px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-blue-50 hover:text-[#003580] flex items-center gap-2.5 transition cursor-pointer"
                  >
                    <Home size={16} className="text-gray-400" />
                    Về trang chủ GoStay
                  </Link>

                  <div className="border-t border-gray-100 my-1" />

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2.5 text-xs text-rose-600 font-bold hover:bg-rose-50 flex items-center gap-2.5 transition cursor-pointer"
                  >
                    <LogOut size={16} />
                    Đăng xuất ca trực
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* 🌟 THẺ MAIN HOÀN TOÀN KHÔNG CÓ RELATIVE Z-10 ĐỂ MODAL NỔI TRỌN VẸN 🌟 */}
        <main className="flex-1 overflow-y-auto bg-gray-50/50">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
