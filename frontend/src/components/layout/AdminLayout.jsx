// src/components/layout/AdminLayout.jsx
import React, { useState, useEffect, useRef, useMemo } from "react";
import { Outlet, useNavigate, useLocation, Link } from "react-router-dom";
import {
  Activity,
  Building2,
  Users,
  Menu,
  ChevronDown,
  LogOut,
  Home,
  User as UserIcon,
} from "lucide-react";

import { useAuthStore } from "@/stores/authStore";
import apiClient from "@/services/apiClient";
import Sidebar from "./Sidebar";
import { cn } from "@/utils/cn";

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const { user: storeUser, logout } = useAuthStore();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [pendingHotelCount, setPendingHotelCount] = useState(0);

  // Trạng thái Dropdown Avatar & Chuông thông báo
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const menuRef = useRef(null);

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

  // Đếm số lượng hồ sơ khách sạn chờ duyệt THỰC TẾ từ Database PostgreSQL
  useEffect(() => {
    apiClient
      .get("/admin/stats")
      .then((res) => {
        const data = res?.data || res || {};
        setPendingHotelCount(Number(data.pendingHotels || 0));
      })
      .catch((err) => {
        console.error("Lỗi lấy số lượng pending:", err);
        setPendingHotelCount(0);
      });
  }, [location.pathname]);

  // 3 MỤC QUẢN TRỊ CỐT LÕI
  const menuItems = [
    {
      path: "/admin/dashboard",
      label: "Dashboard",
      icon: <Activity size={19} />,
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
      path: "/admin/users",
      label: "Người Dùng & Phân Quyền",
      icon: <Users size={19} />,
    },
  ];

  const currentTab =
    menuItems.find((item) => item.path === location.pathname)?.label ||
    "Quản Trị Hệ Thống";

  const adminName =
    user?.full_name ||
    user?.name ||
    user?.username ||
    user?.email?.split("@")[0] ||
    "Super Admin";

  const defaultAdminFallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    adminName,
  )}&background=003580&color=fff&bold=true`;

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

  const adminAvatarUrl = raw ? resolveAvatarUrl(raw) : defaultAdminFallback;

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
          onLogout={handleLogout}
          activeColor="bg-[#003580]"
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Topbar Header */}
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
                    {adminName}
                  </p>
                  <p className="text-[10px] text-blue-700 font-bold mt-1 uppercase">
                    Admin
                  </p>
                </div>

                <img
                  key={adminAvatarUrl}
                  src={adminAvatarUrl}
                  alt={adminName}
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = defaultAdminFallback;
                  }}
                  className="w-9 h-9 rounded-full border-2 border-[#003580] object-cover shadow-sm shrink-0 bg-white"
                />

                <ChevronDown
                  size={14}
                  className={cn(
                    "text-slate-400 transition-transform duration-200 hidden sm:block",
                    isMenuOpen && "rotate-180",
                  )}
                />
              </button>

              {/* MENU DROPDOWN CỦA ADMIN */}
              {isMenuOpen && (
                <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-2xl z-[70] py-2 border border-slate-100 text-slate-800 animate-in fade-in zoom-in-95 duration-200">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                      Hệ Thống Quản Trị
                    </p>
                    <p className="text-xs font-black truncate mt-0.5 text-blue-900">
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
                    Về trang chủ khách
                  </Link>

                  <div className="border-t border-slate-100 my-1" />

                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2.5 text-xs text-rose-600 font-bold hover:bg-rose-50 flex items-center gap-2.5 transition cursor-pointer"
                  >
                    <LogOut size={16} />
                    Đăng xuất quản trị
                  </button>
                </div>
              )}
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
