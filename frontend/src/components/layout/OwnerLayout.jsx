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
  Users,
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

  const localUser = JSON.parse(localStorage.getItem("user") || "null");
  const authStorageUser = JSON.parse(
    localStorage.getItem("auth-storage") || "{}",
  )?.state?.user;
  const user = storeUser || localUser || authStorageUser;

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
      label: "Bảng giá phòng",
      icon: <Tags size={18} />,
    },
    {
      path: "/owner/room-time-settings",
      label: "Thiết lập giờ nhận / trả",
      icon: <Clock size={18} />,
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

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* HEADER TOPBAR CỦA OWNER */}
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
            {/* 👉 NÚT BẤM MỞ BÀN TRỰC LỄ TÂN NGAY TRÊN HEADER */}
            <button
              onClick={() => navigate("/reception/room-map")}
              className="px-3.5 py-2 bg-[#1b6a38] hover:bg-[#14532d] text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
              title="Mở sơ đồ phòng và bàn trực lễ tân"
            >
              <span>🛎️</span>
              <span className="hidden sm:inline">Mở Bàn Trực Lễ Tân</span>
            </button>

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
