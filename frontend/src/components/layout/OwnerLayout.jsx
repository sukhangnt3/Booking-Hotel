// src/components/layout/OwnerLayout.jsx
import React, { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  BedDouble,
  CalendarCheck,
  Menu,
  Clock,
  Tags,
  Grid3X3, // 👉 Icon Sơ đồ phòng Lễ tân
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import Sidebar from "./Sidebar";
import { cn } from "@/utils/cn";

const OwnerLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user: storeUser, logout } = useAuthStore();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Lấy thông tin user an toàn từ store hoặc cache
  const localUser = JSON.parse(localStorage.getItem("user") || "null");
  const authStorageUser = JSON.parse(
    localStorage.getItem("auth-storage") || "{}",
  )?.state?.user;
  const user = storeUser || localUser || authStorageUser;

  // Đọc role từ mảng roles của PostgreSQL
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
    normalizedRoles.includes("ADMIN");

  // Danh mục Menu bên trái (ĐÃ BỔ SUNG MỤC LỄ TÂN)
  const ownerNavItems = [
    {
      path: "/owner/dashboard",
      label: "Tổng Quan & Báo Cáo Doanh Thu",
      icon: <LayoutDashboard size={19} />,
    },
    // 👉 1. MỤC SƠ ĐỒ PHÒNG LỄ TÂN (KIOTVIET STYLE)
    {
      path: "/owner/reception-map",
      label: "Sơ Đồ Phòng & Lễ Tân",
      icon: <Grid3X3 size={19} />,
    },
    {
      path: "/owner/hotels",
      label: "Hồ Sơ Doanh Nghiệp & Chỗ Nghỉ",
      icon: <Building2 size={19} />,
    },
    {
      path: "/owner/rooms",
      label: "Hạng Phòng & Phòng",
      icon: <BedDouble size={19} />,
    },
    {
      path: "/owner/pricing",
      label: "Bảng Giá Phòng",
      icon: <Tags size={19} />,
    },
    {
      path: "/owner/room-time-settings",
      label: "Cấu Hình Giờ Nhận & Trả Phòng",
      icon: <Clock size={19} />,
    },
    {
      path: "/owner/bookings",
      label: "Tiếp Nhận & Xử Lý Đơn Đặt",
      icon: <CalendarCheck size={19} />,
    },
  ];

  const currentTab =
    ownerNavItems.find((item) => item.path === location.pathname)?.label ||
    "Quản Lý Cơ Sở";
  const ownerName = user?.full_name || user?.name || "Chủ Cơ Sở";

  const fallbackOwnerAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    ownerName,
  )}&background=059669&color=fff&bold=true`;

  const getOwnerAvatar = () => {
    const raw =
      user?.avatar ||
      user?.picture ||
      user?.photoURL ||
      user?.avatar_url ||
      (user?.email
        ? localStorage.getItem(`google_avatar_${user.email}`)
        : null);

    if (
      raw &&
      typeof raw === "string" &&
      raw.trim() !== "" &&
      raw !== "null" &&
      raw !== "undefined" &&
      !raw.includes("placeholder")
    ) {
      return raw;
    }
    return fallbackOwnerAvatar;
  };

  const avatarUrl = getOwnerAvatar();

  return (
    <div className="flex h-screen w-full bg-[#f8fafc] overflow-hidden font-sans">
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
          onLogout={() => {
            logout();
            navigate("/");
          }}
          activeColor="bg-[#059669]"
        />
      </div>

      {/* KHÔNG GIAN LÀM VIỆC CHÍNH */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* HEADER TOPBAR */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-2 rounded-xl hover:bg-slate-100 cursor-pointer"
              onClick={() => setIsMobileOpen(true)}
            >
              <Menu size={20} />
            </button>
            <h2 className="text-base font-black text-slate-800 tracking-tight">
              {currentTab}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-black text-slate-800 leading-none">
                {ownerName}
              </p>
              <p className="text-[10px] text-emerald-600 font-bold mt-1 uppercase">
                {isOwner
                  ? "Chủ Doanh Nghiệp Lưu Trú (Owner)"
                  : "Đối Tác Quản Trị"}
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
          </div>
        </header>

        {/* NỘI DUNG TỪNG TRANG CON */}
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
