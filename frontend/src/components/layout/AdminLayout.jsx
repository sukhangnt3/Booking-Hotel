
import React from "react";
import { NavLink, Outlet } from "react-router-dom";

const AdminLayout = () => {
  const navItems = [
    { path: "/admin/dashboard", label: "📊 Thống Kê Hệ Thống" },
    { path: "/admin/hotels", label: "🏨 Duyệt Khách Sạn" },
    { path: "/admin/users", label: "👥 Quản Lý Người Dùng" },
    { path: "/admin/bookings", label: "📑 Quản Lý Booking" },
    { path: "/admin/promotions", label: "🏷️ Khuyến Mãi Toàn Cục" },
    { path: "/admin/reviews", label: "🛡️ Kiểm Duyệt Đánh Giá" },
  ];

  return (
    <div className="flex min-h-screen bg-slate-100 font-sans text-slate-800">
      <aside className="w-64 bg-slate-900 text-white flex flex-col shrink-0">
        <div className="p-6 border-b border-slate-800">
          <h2 className="text-xl font-black tracking-wider text-blue-400">ADMIN PORTAL</h2>
          <p className="text-xs text-slate-400 mt-1">Hệ Thống Quản Trị Khách Sạn</p>
        </div>
        <nav className="flex-1 p-4 space-y-1.5 text-sm font-semibold">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `block px-4 py-3 rounded-xl transition ${
                  isActive
                    ? "bg-blue-600 text-white font-bold shadow-md shadow-blue-500/20"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;