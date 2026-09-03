// src/components/layout/Header.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  User,
  ShieldCheck,
  LogOut,
  ChevronDown,
  Globe,
  LayoutDashboard,
  Building,
  CalendarCheck,
} from "lucide-react";
import { Button } from "../ui";
import { useAuthStore } from "@/stores/authStore";
import { cn } from "@/utils/cn";

const Header = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // ─── 1. BÓC TÁCH ROLE ───
  const getRole = () => {
    const rawRole =
      user?.role ||
      user?.role_name ||
      (Array.isArray(user?.roles) ? user.roles[0] : "");
    return String(rawRole).toLowerCase();
  };

  const role = getRole();
  const isAdmin = role.includes("admin") || user?.role_id === 1;

  // Kiểm tra Lễ tân
  const staffEmails = JSON.parse(
    localStorage.getItem("staff_emails") || "[]",
  ).map((e) => String(e).toLowerCase().trim());
  const isStaff =
    role === "staff" ||
    role === "receptionist" ||
    (user?.email && staffEmails.includes(user.email.toLowerCase().trim()));

  // Kiểm tra Chủ nhà
  const approvedEmails = JSON.parse(
    localStorage.getItem("approved_owner_emails") || "[]",
  );
  const isApprovedByAdmin =
    user?.email && approvedEmails.includes(user.email.toLowerCase().trim());
  const isApprovedOwner =
    !isStaff &&
    (role.includes("owner") ||
      isApprovedByAdmin ||
      user?.status === "approved");

  const displayName =
    user?.full_name ||
    user?.fullName ||
    user?.name ||
    user?.username ||
    user?.email?.split("@")[0] ||
    "Khách hàng";

  // Màu sắc & Nhãn chức danh
  const roleBadgeText = isAdmin
    ? "Admin"
    : isStaff
      ? "Lễ tân"
      : isApprovedOwner
        ? "Chủ nhà"
        : "Khách hàng";

  const roleBgColor = isAdmin
    ? "4F46E5"
    : isStaff
      ? "D97706"
      : isApprovedOwner
        ? "059669"
        : "006CE4";

  // ─── 2. LOGIC LẤY AVATAR CHUẨN (ĐỒNG BỘ VỚI OWNERLAYOUT) ───
  const defaultFallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    displayName,
  )}&background=${roleBgColor}&color=fff&bold=true`;

  const getCleanAvatar = () => {
    // Ưu tiên 1: Link ảnh từ user object
    const rawAvatar =
      user?.avatar ||
      user?.avatar_url ||
      user?.picture ||
      user?.photoURL ||
      user?.image;

    if (
      rawAvatar &&
      typeof rawAvatar === "string" &&
      rawAvatar.trim() !== "" &&
      !rawAvatar.includes("placeholder") &&
      rawAvatar !== "null"
    ) {
      return rawAvatar;
    }

    // Ưu tiên 2: Avatar lưu trong localStorage (Google Login)
    if (user?.email) {
      const googleAvatar = localStorage.getItem(`google_avatar_${user.email}`);
      if (googleAvatar) return googleAvatar;
    }

    // Ưu tiên 3: Fallback chữ cái
    return defaultFallbackAvatar;
  };

  const avatarUrl = getCleanAvatar();

  const handleLogout = () => {
    if (logout) logout();
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("auth-storage");
    sessionStorage.clear();
    setIsMenuOpen(false);
    navigate("/");
  };

  // ─── 3. KIỂM TRA ĐĂNG NHẬP LINH HOẠT ───
  // Nếu user tồn tại HOẶC isAuthenticated = true thì đều tính là đã đăng nhập
  const isUserLoggedIn = Boolean(
    user && (user.id || user.email || isAuthenticated),
  );

  return (
    <header className="bg-[#0a2540]/95 text-white sticky top-0 z-[60] shadow-2xl backdrop-blur-xl border-b border-amber-500/20 font-sans select-none transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-18 sm:h-20 flex justify-between items-center">
        {/* 1. LOGO */}
        <div
          onClick={() => navigate("/")}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-[#0a2540] p-2 rounded-xl shadow-md group-hover:scale-105 group-hover:shadow-amber-500/30 transition-all duration-300">
            <Building size={22} strokeWidth={2.5} />
          </div>
          <div className="flex flex-col">
            <span className="text-2xl sm:text-3xl font-serif tracking-wide font-black bg-gradient-to-r from-white via-slate-100 to-amber-200 bg-clip-text text-transparent">
              GoStay
            </span>
          </div>
        </div>

        {/* 2. ACTIONS */}
        <div className="flex items-center gap-2 sm:gap-4">
          {isStaff && (
            <button
              onClick={() => navigate("/owner/bookings")}
              className="bg-amber-400 hover:bg-amber-300 text-amber-950 px-4 py-2 rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 transition cursor-pointer"
            >
              <CalendarCheck size={16} /> Kênh Lễ Tân (Xử Lý Đặt Phòng)
            </button>
          )}

          {!isAdmin && !isApprovedOwner && !isStaff && (
            <Button
              variant="text"
              className="text-white hover:bg-white/10 hidden lg:flex items-center gap-2 text-sm font-bold cursor-pointer"
              onClick={() => navigate("/register-owner")}
            >
              Đăng chỗ nghỉ của Quý vị
            </Button>
          )}

          <div className="hidden sm:flex items-center">
            <button className="p-2 hover:bg-white/10 rounded-full transition font-bold text-sm">
              VND
            </button>
            <button className="p-2 hover:bg-white/10 rounded-full transition">
              <Globe size={20} />
            </button>
          </div>

          {/* 4. AVATAR PROFILE (Đã sửa điều kiện hiển thị & thêm onError fallback) */}
          {isUserLoggedIn ? (
            <div className="relative">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className={cn(
                  "flex items-center gap-3 p-1.5 rounded-full transition-all border border-transparent cursor-pointer",
                  isMenuOpen
                    ? "bg-white/20 border-white/30"
                    : "hover:bg-white/10",
                )}
              >
                <img
                  key={user?.id || user?.email || avatarUrl}
                  src={avatarUrl}
                  alt={displayName}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = defaultFallbackAvatar;
                  }}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 border-white object-cover shadow-sm shrink-0"
                />

                <div className="hidden sm:block text-left mr-1">
                  <p className="text-xs font-bold leading-tight line-clamp-1 max-w-[120px]">
                    {displayName}
                  </p>
                  <p
                    className={`text-[10px] font-black uppercase tracking-wider mt-0.5 ${
                      isStaff
                        ? "text-amber-300"
                        : isApprovedOwner
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

              {/* MENU THẢ XUỐNG */}
              {isMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-[60]"
                    onClick={() => setIsMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-3 w-64 bg-white rounded-2xl shadow-2xl z-[70] py-2 border border-gray-100 text-gray-800 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">
                        Tài khoản ({roleBadgeText})
                      </p>
                      <p className="text-sm font-black truncate mt-0.5 text-blue-900">
                        {user?.email}
                      </p>
                    </div>

                    {isStaff && (
                      <button
                        onClick={() => {
                          setIsMenuOpen(false);
                          navigate("/owner/bookings");
                        }}
                        className="w-full text-left px-4 py-3 text-sm bg-amber-50 text-amber-900 font-black hover:bg-amber-100 flex items-center gap-3 transition cursor-pointer"
                      >
                        <CalendarCheck size={18} className="text-amber-600" />{" "}
                        Kênh Lễ Tân (Xử Lý Đặt Phòng)
                      </button>
                    )}

                    {isAdmin && (
                      <button
                        onClick={() => {
                          setIsMenuOpen(false);
                          navigate("/admin/dashboard");
                        }}
                        className="w-full text-left px-4 py-3 text-sm bg-blue-50 text-[#006ce4] font-bold hover:bg-blue-100 flex items-center gap-3 transition cursor-pointer"
                      >
                        <ShieldCheck size={18} /> Quản trị hệ thống
                      </button>
                    )}

                    {isApprovedOwner && !isStaff && (
                      <button
                        onClick={() => {
                          setIsMenuOpen(false);
                          navigate("/owner/dashboard");
                        }}
                        className="w-full text-left px-4 py-3 text-sm bg-emerald-50 text-emerald-700 font-bold hover:bg-emerald-100 flex items-center gap-3 transition cursor-pointer"
                      >
                        <LayoutDashboard size={18} /> Kênh Chủ chỗ nghỉ
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        navigate("/profile");
                      }}
                      className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 flex items-center gap-3 transition font-semibold cursor-pointer"
                    >
                      <User size={18} className="text-gray-400" /> Quản lý tài
                      khoản
                    </button>

                    <div className="border-t border-gray-100 my-1"></div>

                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-3 text-sm text-rose-600 font-bold hover:bg-rose-50 flex items-center gap-3 transition cursor-pointer"
                    >
                      <LogOut size={18} /> Đăng xuất
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
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
};

export default Header;
