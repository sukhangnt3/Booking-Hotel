import React from "react";
import { Outlet, Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore"; // Import Zustand Auth Store

const AdminLayout = () => {
  const navigate = useNavigate();

  // Lấy thông tin user và hàm logout từ Zustand Store
  const { user, logout } = useAuthStore();

  // --- XỬ LÝ ĐĂNG XUẤT ---
  const handleLogout = () => {
    if (
      window.confirm("Bạn có chắc chắn muốn đăng xuất khỏi hệ thống Admin?")
    ) {
      // 1. Xóa thông tin đăng nhập trong Zustand Store & LocalStorage
      if (typeof logout === "function") {
        logout();
      }
      localStorage.removeItem("auth-storage");

      // 2. Chuyển hướng người dùng về trang chủ
      window.location.href = "/";
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* ================= SIDEBAR QUẢN TRỊ ================= */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col justify-between p-4 shadow-lg">
        <div>
          {/* Logo / Tiêu đề */}
          <div className="text-xl font-black text-blue-400 mb-8 px-2 flex items-center gap-2">
            ⚡ Admin Portal
          </div>

          {/* Menu Điều Hướng Trang Admin */}
          <nav className="space-y-1">
            <Link
              to="/admin/dashboard"
              className="block px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-800 transition"
            >
              📊 Thống kê (Dashboard)
            </Link>
            <Link
              to="/admin/hotels"
              className="block px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-800 transition"
            >
              🏨 Duyệt khách sạn
            </Link>
            <Link
              to="/admin/users"
              className="block px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-800 transition"
            >
              👥 Quản lý người dùng
            </Link>
            <Link
              to="/admin/bookings"
              className="block px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-800 transition"
            >
              📑 Quản lý đặt phòng
            </Link>
            <Link
              to="/admin/promotions"
              className="block px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-800 transition"
            >
              🏷️ Khuyến mãi hệ thống
            </Link>
            <Link
              to="/admin/reviews"
              className="block px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-800 transition"
            >
              ⭐ Đánh giá hệ thống
            </Link>
          </nav>
        </div>

        {/* ================= KHỐI TÀI KHOẢN VÀ ĐĂNG XUẤT ================= */}
        <div className="border-t border-slate-800 pt-4 space-y-2">
          {/* Hiển thị email Admin */}
          <div className="px-2 text-xs text-slate-400">
            Đăng nhập bởi:{" "}
            <strong className="text-white block truncate">
              {user?.email || "Admin Account"}
            </strong>
          </div>

          {/* 1. NÚT QUAY LẠI TRANG CHỦ (Không Đăng xuất) */}
          <Link
            to="/"
            className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold py-2.5 rounded-lg transition"
          >
            🏠 Xem trang chủ
          </Link>

          {/* 2. NÚT ĐĂNG XUẤT (Thoát hoàn toàn) */}
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
