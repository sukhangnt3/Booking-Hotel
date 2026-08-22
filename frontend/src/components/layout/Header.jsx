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
  const isOwner = role.includes("owner") || role.includes("partner");

  // ─── 2. TÍNH TOÁN TÊN HIỂN THỊ CHUẨN XÁC ───
  const displayName =
    user?.full_name ||
    user?.fullName ||
    user?.name ||
    user?.username ||
    user?.email?.split("@")[0] ||
    "Khách hàng";

  // Màu Avatar đổi theo Role
  const roleBgColor = isAdmin ? "4F46E5" : isOwner ? "059669" : "006CE4";

  // ─── 3. BÓC TÁCH LINK ẢNH THẬT (LOẠI BỎ PLACEHOLDER VÔ DỤNG) ───
  const getCleanAvatar = () => {
    const rawAvatar =
      user?.avatar || user?.picture || user?.photoURL || user?.image;

    // Nếu là link ảnh thật hợp lệ (không chứa chữ placeholder)
    if (
      rawAvatar &&
      typeof rawAvatar === "string" &&
      rawAvatar.trim() !== "" &&
      !rawAvatar.includes("placeholder") &&
      rawAvatar !== "null"
    ) {
      return rawAvatar;
    }

    // Tự động tạo Avatar màu sắc theo Role và chữ cái tên người dùng
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=${roleBgColor}&color=fff&bold=true`;
  };

  const avatarUrl = getCleanAvatar();

  const handleLogout = () => {
    logout();
    setIsMenuOpen(false);
    navigate("/");
  };

  return (
    <header className="bg-[#003580] text-white sticky top-0 z-[60] shadow-md select-none border-b border-blue-800 font-sans">
      <div className="max-w-7xl mx-auto px-4 h-16 sm:h-20 flex justify-between items-center">
        {/* 1. LOGO */}
        <div
          onClick={() => navigate("/")}
          className="flex items-center gap-2 cursor-pointer group"
        >
          <div className="bg-white text-[#003580] p-1.5 rounded-lg group-hover:scale-110 transition-transform">
            <Building size={24} strokeWidth={3} />
          </div>
          <span className="text-2xl font-black tracking-tighter italic">
            GoStay
          </span>
        </div>

        {/* 2. ACTIONS GÓC PHẢI */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Nút Đăng chỗ nghỉ (Chỉ hiện khi chưa là Admin/Owner) */}
          {!isAdmin && !isOwner && (
            <Button
              variant="text"
              className="text-white hover:bg-white/10 hidden lg:flex items-center gap-2 text-sm font-bold"
              onClick={() => navigate("/register-owner")}
            >
              Đăng chỗ nghỉ của Quý vị
            </Button>
          )}

          {/* Tiền tệ & Ngôn ngữ */}
          <div className="hidden sm:flex items-center">
            <button className="p-2 hover:bg-white/10 rounded-full transition font-bold text-sm">
              VND
            </button>
            <button className="p-2 hover:bg-white/10 rounded-full transition">
              <Globe size={20} />
            </button>
          </div>

          {isAuthenticated ? (
            /* ─── GIAO DIỆN KHI ĐÃ ĐĂNG NHẬP ─── */
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
                {/* 👈 THÊM KEY ĐỂ ÉP REACT TẢI LẠI AVATAR KHI ĐỔI TÀI KHOẢN */}
                <img
                  key={user?.id || user?.email}
                  src={avatarUrl}
                  alt={displayName}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=${roleBgColor}&color=fff&bold=true`;
                  }}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 border-white object-cover shadow-sm shrink-0"
                />

                {/* TÊN & DANH HIỆU */}
                <div className="hidden sm:block text-left mr-1">
                  <p className="text-xs font-bold leading-tight line-clamp-1 max-w-[120px]">
                    {displayName}
                  </p>
                  <p className="text-[10px] text-yellow-400 font-bold uppercase tracking-wider mt-0.5">
                    {isAdmin ? "Admin" : isOwner ? "Chủ nhà" : "Khách hàng"}
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

              {/* ─── MENU THẢ XUỐNG ─── */}
              {isMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-[60]"
                    onClick={() => setIsMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-3 w-64 bg-white rounded-2xl shadow-2xl z-[70] py-2 border border-gray-100 text-gray-800 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">
                        Tài khoản đăng nhập
                      </p>
                      <p className="text-sm font-black truncate mt-0.5 text-blue-900">
                        {user?.email}
                      </p>
                    </div>

                    {/* Link dành cho Admin */}
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

                    {/* Link dành cho Owner */}
                    {isOwner && (
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

                    {/* Hồ sơ cá nhân */}
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        navigate("/UserProfilePage");
                      }}
                      className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 flex items-center gap-3 transition font-semibold cursor-pointer"
                    >
                      <User size={18} className="text-gray-400" /> Quản lý tài
                      khoản
                    </button>

                    <div className="border-t border-gray-100 my-1"></div>

                    {/* Đăng xuất */}
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
            /* ─── KHI CHƯA ĐĂNG NHẬP ─── */
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="bg-white text-blue-900 border-none hover:bg-gray-100 font-extrabold px-4 sm:px-6 h-9 sm:h-10 text-xs sm:text-sm shadow-sm rounded-xl"
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
