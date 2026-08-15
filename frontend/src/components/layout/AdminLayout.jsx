import React from "react";
import { Outlet, NavLink, Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";

const AdminLayout = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  // --- XỬ LÝ ĐĂNG XUẤT ---
  const handleLogout = () => {
    if (window.confirm("Bạn có chắc chắn muốn đăng xuất khỏi hệ thống Admin?")) {
      if (typeof logout === "function") {
        logout();
      }
      localStorage.removeItem("auth-storage");
      navigate("/", { replace: true });
    }
  };

  // Danh sách menu quản trị
  const menuItems = [
    { path: "/admin/dashboard", label: "Thống kê (Dashboard)", icon: "📊" },
    { path: "/admin/hotels", label: "Duyệt khách sạn", icon: "🏨" },
    { path: "/admin/users", label: "Quản lý người dùng", icon: "👥" },
    { path: "/admin/bookings", label: "Quản lý đặt phòng", icon: "📑" },
    { path: "/admin/promotions", label: "Khuyến mãi hệ thống", icon: "🏷️" },
    { path: "/admin/reviews", label: "Đánh giá hệ thống", icon: "⭐" },
  ];

  return (
    <div className="flex h-screen bg-slate-100 font-sans text-slate-800">
      {/* ================= SIDEBAR QUẢN TRỊ ================= */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col justify-between p-4 shadow-xl flex-shrink-0">
        <div>
          {/* Logo / Tiêu đề */}
          <div className="flex items-center gap-2 text-xl font-black text-blue-400 mb-8 px-2 py-1">
            <span>⚡</span> Admin Portal
          </div>

          {/* Menu Điều Hướng Trang Admin (Sử dụng NavLink để Highlight trang hiện tại) */}
          <nav className="space-y-1">
            {menuItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition ${
                    isActive
                      ? "bg-blue-600 text-white font-bold shadow-md"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`
                }
              >
                <span className="text-base">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* ================= KHỐI TÀI KHOẢN VÀ ĐĂNG XUẤT ================= */}
        <div className="border-t border-slate-800 pt-4 space-y-3">
          {/* Hiển thị email Admin */}
          <div className="px-2 text-xs text-slate-400">
            <span>Đăng nhập bởi:</span>
            <strong className="text-white block truncate mt-0.5">
              {user?.email || "Admin Account"}
            </strong>
          </div>

          {/* 1. NÚT QUAY LẠI TRANG CHỦ */}
          <Link
            to="/"
            className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold py-2.5 rounded-lg transition"
          >
            🏠 Xem trang chủ
          </Link>

          {/* 2. NÚT ĐĂNG XUẤT */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white text-xs font-bold py-2.5 rounded-lg transition"
          >
            🚪 Đăng xuất
          </button>
        </div>
      </aside>

      {/* ================= HIỂN THỊ NỘI DUNG CÁC TRANG ADMIN ================= */}
      <main className="flex-1 overflow-y-auto p-8">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;