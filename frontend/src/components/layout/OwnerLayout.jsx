// src/components/layout/OwnerLayout.jsx
import React, { useState, useEffect, useRef } from "react";
import { Outlet, useNavigate, useLocation, Link } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  BedDouble,
  CalendarCheck,
  Menu,
  Tags,
  Users,
  ChevronDown,
  LogOut,
  Home,
  User as UserIcon,
} from "lucide-react";

import { useAuthStore } from "@/stores/authStore";
import apiClient from "@/services/apiClient";
import Sidebar from "./Sidebar";
import { cn } from "@/utils/cn";
// 🌟 IMPORT COMPONENT AI CHUYÊN BIỆT CHO OWNER:
import OwnerAiAssistant from "@/components/chat/OwnerAiAssistant";

const OwnerLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const { user: storeUser, logout } = useAuthStore();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

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

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsMenuOpen(false);
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

  const ownerNavItems = [
    {
      path: "/owner/dashboard",
      label: "Dashboard",
      icon: <LayoutDashboard size={18} />,
    },
    {
      path: "/owner/bookings",
      label: "Đơn đặt phòng",
      icon: <CalendarCheck size={18} />,
    },
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
  )}&background=003580&color=fff&bold=true`;

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

  const handleLogout = () => {
    if (logout) logout();
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("auth-storage");
    setIsMenuOpen(false);
    navigate("/");
  };

  return (
    <div className="flex h-screen w-full bg-gray-50/50 overflow-hidden font-sans relative">
      {/* SIDEBAR BÊN TRÁI */}
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
          activeColor="bg-[#003580]"
        />
      </div>

      {/* KHUNG NỘI DUNG CHÍNH */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
        {/* HEADER QUẢN TRỊ THEO CHUẨN GHOSTAY */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0 shadow-xs z-30">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="lg:hidden p-2 rounded-xl hover:bg-gray-100 cursor-pointer text-gray-700"
              onClick={() => setIsMobileOpen(true)}
            >
              <Menu size={20} />
            </button>
            <h2 className="text-base sm:text-lg font-black text-[#0a2540] tracking-tight">
              {currentTab}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {/* NÚT MỞ BÀN TRỰC LỄ TÂN */}
            <button
              type="button"
              onClick={() => navigate("/reception/room-map")}
              className="px-4 py-2 bg-[#003580] hover:bg-blue-900 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer active:scale-95"
              title="Mở sơ đồ phòng và bàn trực lễ tân"
            >
              <span>🛎️</span>
              <span className="hidden sm:inline">Mở Bàn Trực Lễ Tân</span>
            </button>

            {/* DROPDOWN USER PROFILE */}
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
                    {ownerName}
                  </p>
                  <p className="text-[10px] text-[#006ce4] font-black mt-1 uppercase tracking-wider">
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
                  className="w-9 h-9 rounded-full border-2 border-[#003580] object-cover shadow-xs shrink-0 bg-white"
                />

                <ChevronDown
                  size={14}
                  className={cn(
                    "text-gray-400 transition-transform duration-200 hidden sm:block",
                    isMenuOpen && "rotate-180",
                  )}
                />
              </button>

              {isMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-3xl shadow-2xl z-[70] py-2 border border-gray-200 text-gray-800 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-[10px] text-gray-400 uppercase font-black tracking-wider">
                      Tài khoản đối tác
                    </p>
                    <p className="text-xs font-bold truncate mt-0.5 text-[#003580]">
                      {user?.email}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      navigate("/profile");
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-blue-50 hover:text-[#003580] flex items-center gap-2.5 transition cursor-pointer"
                  >
                    <UserIcon size={16} className="text-gray-400" />
                    Hồ sơ cá nhân
                  </button>

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
                    Đăng xuất đối tác
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* NỘI DUNG CHÍNH */}
        <main className="flex-1 overflow-y-auto bg-gray-50/50">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>

        {/* 🌟 TRỢ LÝ AI GHOSTAY PHÂN TÍCH TOÀN HỆ THỐNG */}
        <OwnerAiAssistant />
      </div>
    </div>
  );
};

export default OwnerLayout;
