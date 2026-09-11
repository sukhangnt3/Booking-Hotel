// src/components/layout/OwnerLayout.jsx
import React, { useState, useEffect, useRef, useMemo } from "react";
import { Outlet, useNavigate, useLocation, Link } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  BedDouble,
  CalendarCheck,
  Menu,
  Clock,
  Tags,
  Users,
  Bell,
  Check,
  ChevronDown,
  LogOut,
  Home,
  User as UserIcon,
} from "lucide-react";

import { useAuthStore } from "@/stores/authStore";
import apiClient from "@/services/apiClient";
import Sidebar from "./Sidebar";
import { cn } from "@/utils/cn";

const OwnerLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const { user: storeUser, logout } = useAuthStore();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Trạng thái Dropdown Avatar & Chuông thông báo
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const menuRef = useRef(null);
  const notifRef = useRef(null);

  // Đảm bảo dữ liệu user luôn sẵn sàng khi F5
  const localUser = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  })();

  const authStorageUser = (() => {
    try {
      return JSON.parse(localStorage.getItem("auth-storage") || "{}")?.state
        ?.user;
    } catch {
      return null;
    }
  })();

  const user = storeUser || localUser || authStorageUser;

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setIsNotifOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  let extractedRoles = [];
  if (Array.isArray(user?.roles)) {
    extractedRoles = user.roles;
  } else if (user?.role) {
    extractedRoles = [user.role];
  } else if (user?.role_name) {
    extractedRoles = [user.role_name];
  }

  const normalizedRoles = extractedRoles
    .flat()
    .filter(Boolean)
    .map((r) => String(r).trim().toUpperCase());

  const isOwner =
    normalizedRoles.includes("HOTEL_OWNER") ||
    normalizedRoles.includes("OWNER") ||
    normalizedRoles.includes("ADMIN") ||
    user?.role_id === 2 ||
    user?.role_id === 1;

  // Danh mục menu đã được rút gọn súc tích và phân nhóm khoa học
  const ownerNavItems = [
    // NHÓM 1: BÁO CÁO & KINH DOANH
    {
      path: "/owner/dashboard",
      label: "Tổng quan & Báo cáo",
      icon: <LayoutDashboard size={18} />,
    },
    {
      path: "/owner/bookings",
      label: "Đơn đặt phòng",
      icon: <CalendarCheck size={18} />,
    },

    // NHÓM 2: PHÒNG & CHÍNH SÁCH GIÁ
    {
      path: "/owner/rooms",
      label: "Hạng phòng & Phòng",
      icon: <BedDouble size={18} />,
    },
    {
      path: "/owner/pricing",
      label: "Bảng giá & Giờ nhận / trả",
      icon: <Tags size={18} />,
    },
    // NHÓM 3: QUẢN LÝ CƠ SỞ & CON NGƯỜI
    {
      path: "/owner/hotels",
      label: "Cơ sở lưu trú",
      icon: <Building2 size={18} />,
    },
    {
      path: "/owner/staff",
      label: "Nhân viên lễ tân",
      icon: <Users size={18} />,
    },
  ];

  const currentTab =
    ownerNavItems.find((item) => item.path === location.pathname)?.label ||
    "Quản Lý Cơ Sở";

  const ownerName = user?.full_name || user?.name || "Chủ Cơ Sở";

  const fallbackOwnerAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    ownerName,
  )}&background=059669&color=fff&bold=true`;

  // XỬ LÝ ĐƯỜNG DẪN ẢNH (ĐỒNG BỘ VỚI HEADER)
  const resolveAvatarUrl = (url) => {
    if (!url) return "";
    if (
      url.startsWith("http://") ||
      url.startsWith("https://") ||
      url.startsWith("data:") ||
      url.startsWith("blob:")
    ) {
      return url;
    }
    const cleanPath = url.replace(/\\/g, "/").replace(/^\/+/, "");
    const backendBase =
      apiClient.defaults?.baseURL?.replace(/\/api\/?$/, "") ||
      import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, "") ||
      "http://localhost:5000";

    return `${backendBase}/${cleanPath}`;
  };

  const raw =
    user?.avatar ||
    user?.picture ||
    user?.photoURL ||
    user?.avatar_url ||
    user?.image ||
    (user?.email
      ? localStorage.getItem(`google_avatar_${user.email}`)
      : null) ||
    "";

  const avatarUrl = raw ? resolveAvatarUrl(raw) : fallbackOwnerAvatar;

  // XỬ LÝ LOGOUT ĐỒNG BỘ DỌN SẠCH STORAGE
  const handleLogout = () => {
    if (logout) logout();
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("auth-storage");
    setIsMenuOpen(false);
    navigate("/");
  };

  return (
    <div className="flex h-screen w-full bg-[#f8fafc] overflow-hidden font-sans">
      <div
        className={cn(
          "lg:block shrink-0 h-full",
          isMobileOpen ? "block fixed inset-0 z-[100]" : "hidden",
        )}
      >
        {isMobileOpen && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs lg:hidden"
            onClick={() => setIsMobileOpen(false)}
          />
        )}
        <Sidebar
          items={ownerNavItems}
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
          user={user}
          onLogout={handleLogout}
          activeColor="bg-[#059669]"
        />
      </div>

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* HEADER TOPBAR CỦA OWNER */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 shadow-xs z-30">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-2 rounded-xl hover:bg-slate-100 cursor-pointer text-slate-700"
              onClick={() => setIsMobileOpen(true)}
            >
              <Menu size={20} />
            </button>
            <h2 className="text-base font-black text-slate-800 tracking-tight">
              {currentTab}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {/* NÚT BẤM MỞ BÀN TRỰC LỄ TÂN */}
            <button
              onClick={() => navigate("/reception/room-map")}
              className="px-3.5 py-2 bg-[#1b6a38] hover:bg-[#14532d] text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
              title="Mở sơ đồ phòng và bàn trực lễ tân"
            >
              <span>🛎️</span>
              <span className="hidden sm:inline">Mở Bàn Trực Lễ Tân</span>
            </button>

            {/* AVATAR PROFILE & DROPDOWN MENU */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className={cn(
                  "flex items-center gap-3 p-1.5 rounded-2xl transition cursor-pointer border border-transparent",
                  isMenuOpen
                    ? "bg-slate-100 border-slate-200"
                    : "hover:bg-slate-50",
                )}
              >
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-black text-slate-800 leading-none">
                    {ownerName}
                  </p>
                  <p className="text-[10px] text-emerald-600 font-bold mt-1 uppercase">
                    {isOwner ? "Owner" : "Đối Tác Quản Trị"}
                  </p>
                </div>

                <img
                  key={avatarUrl}
                  src={avatarUrl}
                  alt={ownerName}
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = fallbackOwnerAvatar;
                  }}
                  className="w-9 h-9 rounded-full border-2 border-emerald-500 object-cover shadow-xs shrink-0 bg-white"
                />

                <ChevronDown
                  size={14}
                  className={cn(
                    "text-slate-400 transition-transform duration-200 hidden sm:block",
                    isMenuOpen && "rotate-180",
                  )}
                />
              </button>

              {/* MENU DROPDOWN CỦA OWNER */}
              {isMenuOpen && (
                <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-2xl z-[70] py-2 border border-slate-100 text-slate-800 animate-in fade-in zoom-in-95 duration-200">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                      Tài khoản đối tác
                    </p>
                    <p className="text-xs font-black truncate mt-0.5 text-emerald-900">
                      {user?.email}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      navigate("/profile");
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition cursor-pointer"
                  >
                    <UserIcon size={16} className="text-slate-400" />
                    Hồ sơ cá nhân
                  </button>

                  <Link
                    to="/"
                    onClick={() => setIsMenuOpen(false)}
                    className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition cursor-pointer"
                  >
                    <Home size={16} className="text-slate-400" />
                    Về trang chủ GoStay
                  </Link>

                  <div className="border-t border-slate-100 my-1" />

                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2.5 text-xs text-rose-600 font-bold hover:bg-rose-50 flex items-center gap-2.5 transition cursor-pointer"
                  >
                    <LogOut size={16} />
                    Đăng xuất đối tác
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#f8fafc]">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default OwnerLayout;
