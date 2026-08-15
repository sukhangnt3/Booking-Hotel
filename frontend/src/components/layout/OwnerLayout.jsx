import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";

const OwnerLayout = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    if (window.confirm("Bạn có chắc muốn thoát kênh quản lý chỗ nghỉ?")) {
      if (typeof logout === "function") logout();
      localStorage.removeItem("auth-storage");
      navigate("/", { replace: true });
    }
  };

  const navItems = [
    { path: "/owner/dashboard", label: "Dashboard", icon: "📊" },
    { path: "/owner/hotels", label: "Khách Sạn Của Tôi", icon: "🏨" },
    { path: "/owner/rooms", label: "Loại Phòng", icon: "🛏️" },
    { path: "/owner/room-numbers", label: "Sơ Đồ Số Phòng", icon: "🔑" },
    { path: "/owner/bookings", label: "Quản Lý Đặt Phòng", icon: "📑" },
    { path: "/owner/services", label: "Dịch Vụ Đi Kèm", icon: "☕" },
    { path: "/owner/promotions", label: "Mã Giảm Giá", icon: "🏷️" },
    { path: "/owner/reviews", label: "Đánh Giá Khách Hàng", icon: "⭐" },
    { path: "/owner/payouts", label: "Tài Chính & Rút Tiền", icon: "💳" },
  ];

  return (
    <div className="flex h-screen bg-slate-100 font-sans text-slate-800">
      {/* SIDEBAR OWNER */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col justify-between p-4 flex-shrink-0 shadow-xl">
        <div>
          <div className="flex items-center gap-3 px-3 py-4 mb-4 border-b border-slate-800">
            <div className="bg-emerald-600 p-2 rounded-xl text-white font-black text-lg">🏨</div>
            <div>
              <h1 className="font-extrabold text-white text-base tracking-wider">Owner Hub</h1>
              <p className="text-[11px] text-slate-400">Quản Lý Chỗ Nghỉ</p>
            </div>
          </div>

          <nav className="space-y-1 text-xs font-semibold overflow-y-auto max-h-[calc(100vh-220px)]">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition ${
                    isActive
                      ? "bg-emerald-600 text-white font-bold shadow-lg"
                      : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  }`
                }
              >
                <span className="text-base">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* BOTTOM USER PANEL */}
        <div className="border-t border-slate-800 pt-3 space-y-2">
          <div className="px-3 py-2 bg-slate-800/60 rounded-xl">
            <p className="text-[10px] text-slate-400 font-bold uppercase">Chủ Chỗ Nghỉ:</p>
            <p className="text-xs font-bold text-slate-200 truncate mt-0.5">{user?.email || "Partner Account"}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => navigate("/")}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs py-2 rounded-lg font-bold transition text-center"
            >
              🏠 Web
            </button>
            <button
              onClick={handleLogout}
              className="bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white text-xs py-2 rounded-lg font-bold transition text-center"
            >
              🚪 Thoát
            </button>
          </div>
        </div>
      </aside>

      {/* CONTENT AREA */}
      <main className="flex-1 overflow-y-auto p-8">
        <Outlet />
      </main>
    </div>
  );
};

export default OwnerLayout;