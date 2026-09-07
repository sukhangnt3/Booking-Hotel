import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import {
  ShieldCheck,
  LogOut,
  ChevronDown,
  LayoutDashboard,
  Building,
  CalendarCheck,
  Bell,
  Check,
  Ticket,
} from "lucide-react";

import { Button } from "../ui";
import { useAuthStore } from "@/stores/authStore";
import { useNotification } from "@/hooks/useNotification";
import { authService } from "@/services";
import apiClient from "@/services/apiClient";
import { cn } from "@/utils/cn";

export default function Header() {
  const navigate = useNavigate();

  const { user: storeUser, isAuthenticated, logout } = useAuthStore();

  const { notifications, unreadCount, markAsRead, markAllAsRead } =
    useNotification();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const menuRef = useRef(null);
  const notifRef = useRef(null);

  const user = storeUser || null;

  // =====================================================
  // ĐÓNG MENU KHI CLICK RA NGOÀI
  // =====================================================
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

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // =====================================================
  // LẤY PROFILE MỚI NHẤT TỪ DATABASE
  // =====================================================
  useEffect(() => {
    const token = localStorage.getItem("token");

    if (token && (user?.id || user?.email || isAuthenticated)) {
      authService
        .getProfile()
        .then((res) => {
          const u =
            res?.data?.user ||
            res?.data?.data?.user ||
            res?.data?.data ||
            (res?.data && typeof res.data === "object" && res.data.id
              ? res.data
              : null) ||
            res?.user;

          if (u) {
            const dbAvatar =
              u.avatar || u.avatar_url || u.picture || u.image || "";

            const mergedUser = {
              ...user,
              ...u,
              avatar: dbAvatar,
              avatar_url: dbAvatar,
              picture: dbAvatar,
            };

            // Cập nhật Zustand
            useAuthStore.setState({
              user: mergedUser,
            });

            // Cập nhật localStorage
            try {
              const cur = JSON.parse(localStorage.getItem("user") || "{}");

              localStorage.setItem(
                "user",
                JSON.stringify({
                  ...cur,
                  ...mergedUser,
                }),
              );
            } catch (e) {
              console.error("Không thể cập nhật localStorage:", e);
            }
          }
        })
        .catch((err) => {
          console.error("Không thể lấy profile:", err);
        });
    }
  }, []);

  // =====================================================
  // ROLE
  // =====================================================
  const role = String(user?.role || user?.role_name || "").toLowerCase();

  const isAdmin = role.includes("admin") || user?.role_id === 1;

  const isOwner = role.includes("owner") || role.includes("hotel_owner");

  const isStaff = role.includes("staff") || role.includes("receptionist");

  // =====================================================
  // TÊN HIỂN THỊ
  // =====================================================
  const displayName =
    user?.full_name ||
    user?.name ||
    user?.username ||
    user?.email?.split("@")[0] ||
    "Khách hàng";

  // =====================================================
  // ROLE BADGE
  // =====================================================
  const roleBadgeText = isAdmin
    ? "Admin"
    : isStaff
      ? "Lễ tân"
      : isOwner
        ? "Chủ nhà"
        : "Khách hàng";

  // =====================================================
  // ẢNH DỰ PHÒNG
  // =====================================================
  const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    displayName,
  )}&background=003580&color=fff&bold=true`;

  // =====================================================
  // XỬ LÝ LINK ẢNH
  // =====================================================
  const resolveAvatarUrl = (url) => {
    if (!url) return "";

    // Link đầy đủ
    if (
      url.startsWith("http://") ||
      url.startsWith("https://") ||
      url.startsWith("data:") ||
      url.startsWith("blob:")
    ) {
      return url;
    }

    // Chuẩn hóa đường dẫn
    const cleanPath = url.replace(/\\/g, "/").replace(/^\/+/, "");

    // Lấy URL backend
    const backendBase =
      apiClient.defaults?.baseURL?.replace(/\/api\/?$/, "") ||
      import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, "") ||
      "http://localhost:5000";

    return `${backendBase}/${cleanPath}`;
  };

  // =====================================================
  // LẤY AVATAR TỪ DATABASE
  // =====================================================
  const rawAvatar =
    user?.avatar || user?.avatar_url || user?.picture || user?.image || "";

  const avatarUrl = rawAvatar ? resolveAvatarUrl(rawAvatar) : fallbackAvatar;

  // =====================================================
  // LOGOUT
  // =====================================================
  const handleLogout = () => {
    if (logout) logout();

    localStorage.removeItem("token");
    localStorage.removeItem("user");

    setIsMenuOpen(false);

    navigate("/");
  };

  // =====================================================
  // KIỂM TRA ĐĂNG NHẬP
  // =====================================================
  const isUserLoggedIn = Boolean(
    user && (user.id || user.email || isAuthenticated),
  );

  return (
    <header className="bg-[#0a2540] text-white sticky top-0 z-[60] shadow-2xl backdrop-blur-xl border-b border-amber-500/20 font-sans select-none transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-18 sm:h-20 flex justify-between items-center">
        {/* =====================================================
            1. LOGO
        ===================================================== */}
        <div
          onClick={() => navigate("/")}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-[#0a2540] p-2 rounded-xl shadow-md group-hover:scale-105 transition-all duration-300">
            <Building size={22} strokeWidth={2.5} />
          </div>

          <span className="text-2xl sm:text-3xl font-serif tracking-wide font-black bg-gradient-to-r from-white via-slate-100 to-amber-200 bg-clip-text text-transparent">
            GoStay
          </span>
        </div>

        {/* =====================================================
            2. ACTIONS & THÔNG BÁO
        ===================================================== */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* KÊNH LỄ TÂN */}
          {isStaff && (
            <button
              onClick={() => navigate("/owner/bookings")}
              className="bg-amber-400 hover:bg-amber-300 text-amber-950 px-3.5 py-2 rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 transition cursor-pointer"
            >
              <CalendarCheck size={16} />
              Kênh Lễ Tân
            </button>
          )}

          {/* ĐĂNG CHỖ NGHỈ */}
          {!isAdmin && !isOwner && !isStaff && (
            <Button
              variant="text"
              className="text-white hover:bg-white/10 hidden lg:flex items-center gap-2 text-xs font-bold cursor-pointer"
              onClick={() => navigate("/register-owner")}
            >
              Đăng chỗ nghỉ của Quý vị
            </Button>
          )}

          {/* =====================================================
              CHUÔNG THÔNG BÁO
          ===================================================== */}
          {isUserLoggedIn && (
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="p-2.5 rounded-full hover:bg-white/10 text-white relative transition cursor-pointer"
                title="Thông báo"
              >
                <Bell size={20} />

                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] bg-rose-500 text-white rounded-full text-[10px] font-black flex items-center justify-center px-1 border-2 border-[#0a2540] animate-pulse">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {/* HỘP THÔNG BÁO */}
              {isNotifOpen && (
                <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl z-[70] border border-gray-100 text-gray-800 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
                  <div className="p-4 bg-[#003580] text-white flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-sm">Thông báo</h4>

                      <p className="text-[10px] text-blue-200">
                        {unreadCount} thông báo mới
                      </p>
                    </div>

                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-[11px] text-blue-200 hover:text-white font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Check size={13} />
                        Đã đọc tất cả
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 text-xs">
                    {notifications.length > 0 ? (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => {
                            markAsRead(n.id);

                            if (n.link) {
                              navigate(n.link);
                            }
                          }}
                          className={`p-3.5 hover:bg-slate-50 transition cursor-pointer space-y-1 ${
                            !n.read_at && !n.readAt ? "bg-blue-50/50" : ""
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <strong className="font-bold text-slate-900 block line-clamp-1">
                              {n.title}
                            </strong>

                            {!n.read_at && !n.readAt && (
                              <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-1" />
                            )}
                          </div>

                          <p className="text-slate-600 line-clamp-2 leading-relaxed font-normal">
                            {n.content}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="py-8 text-center text-slate-400 space-y-1">
                        <Bell
                          size={28}
                          className="mx-auto text-slate-300 mb-1"
                        />

                        <p className="font-medium text-xs">
                          Không có thông báo nào
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =====================================================
              AVATAR PROFILE
          ===================================================== */}
          {isUserLoggedIn ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className={cn(
                  "flex items-center gap-2.5 p-1.5 rounded-full transition-all border border-transparent cursor-pointer",
                  isMenuOpen
                    ? "bg-white/20 border-white/30"
                    : "hover:bg-white/10",
                )}
              >
                {/* AVATAR */}
                <img
                  key={avatarUrl}
                  src={avatarUrl}
                  alt={displayName}
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = fallbackAvatar;
                  }}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 border-white object-cover shadow-sm bg-white shrink-0"
                />

                {/* TÊN + ROLE */}
                <div className="hidden sm:block text-left mr-1">
                  <p className="text-xs font-bold leading-tight line-clamp-1 max-w-[120px]">
                    {displayName}
                  </p>

                  <p
                    className={`text-[10px] font-black uppercase tracking-wider mt-0.5 ${
                      isStaff
                        ? "text-amber-300"
                        : isOwner
                          ? "text-emerald-300"
                          : isAdmin
                            ? "text-indigo-300"
                            : "text-yellow-400"
                    }`}
                  >
                    {roleBadgeText}
                  </p>
                </div>

                <ChevronDown
                  size={16}
                  className={cn(
                    "transition-transform duration-200",
                    isMenuOpen && "rotate-180",
                  )}
                />
              </button>

              {/* =====================================================
                  MENU DROPDOWN
              ===================================================== */}
              {isMenuOpen && (
                <div className="absolute right-0 mt-3 w-64 bg-white rounded-2xl shadow-2xl z-[70] py-2 border border-gray-100 text-gray-800 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">
                      Tài khoản ({roleBadgeText})
                    </p>

                    <p className="text-sm font-black truncate mt-0.5 text-blue-900">
                      {user?.email}
                    </p>
                  </div>

                  {/* KÊNH LỄ TÂN */}
                  {isStaff && (
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        navigate("/owner/bookings");
                      }}
                      className="w-full text-left px-4 py-3 text-sm bg-amber-50 text-amber-900 font-black hover:bg-amber-100 flex items-center gap-3 transition cursor-pointer"
                    >
                      <CalendarCheck size={18} className="text-amber-600" />
                      Kênh Lễ Tân
                    </button>
                  )}

                  {/* ADMIN */}
                  {isAdmin && (
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        navigate("/admin/dashboard");
                      }}
                      className="w-full text-left px-4 py-3 text-sm bg-blue-50 text-[#006ce4] font-bold hover:bg-blue-100 flex items-center gap-3 transition cursor-pointer"
                    >
                      <ShieldCheck size={18} />
                      Quản trị hệ thống
                    </button>
                  )}

                  {/* OWNER */}
                  {isOwner && !isStaff && (
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        navigate("/owner/dashboard");
                      }}
                      className="w-full text-left px-4 py-3 text-sm bg-emerald-50 text-emerald-700 font-bold hover:bg-emerald-100 flex items-center gap-3 transition cursor-pointer"
                    >
                      <LayoutDashboard size={18} />
                      Kênh Chủ chỗ nghỉ
                    </button>
                  )}

                  {/* CHUYẾN ĐI */}
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      navigate("/profile?tab=trips");
                    }}
                    className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 flex items-center gap-3 transition font-semibold cursor-pointer"
                  >
                    <Ticket size={18} className="text-gray-400" />
                    Chuyến đi của tôi
                  </button>

                  <div className="border-t border-gray-100 my-1" />

                  {/* ĐĂNG XUẤT */}
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-3 text-sm text-rose-600 font-bold hover:bg-rose-50 flex items-center gap-3 transition cursor-pointer"
                  >
                    <LogOut size={18} />
                    Đăng xuất
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* =====================================================
               CHƯA ĐĂNG NHẬP
            ===================================================== */
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="bg-white text-blue-900 border-none hover:bg-gray-100 font-extrabold px-4 sm:px-6 h-9 sm:h-10 text-xs sm:text-sm shadow-sm rounded-xl cursor-pointer"
                onClick={() => navigate("/login")}
              >
                Đăng nhập / Đăng ký
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
