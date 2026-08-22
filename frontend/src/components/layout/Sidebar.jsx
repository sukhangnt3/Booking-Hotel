import React from "react";
import { NavLink, Link } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  LogOut,
  Home,
  LayoutDashboard,
} from "lucide-react";
import { cn } from "@/utils/cn";

const Sidebar = ({
  items = [],
  isCollapsed,
  setIsCollapsed,
  onLogout,
  activeColor = "bg-blue-600",
}) => {
  return (
    <aside
      className={cn(
        "flex flex-col bg-[#030712] text-slate-400 transition-all duration-300 relative border-r border-slate-800 h-screen shrink-0 z-50 select-none",
        isCollapsed ? "w-20" : "w-72",
      )}
    >
      {/* NÚT THU GỌN */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-10 z-[60] bg-slate-800 text-white rounded-full p-1.5 border border-slate-700 hover:bg-blue-600 transition-all shadow-xl hidden lg:block cursor-pointer"
      >
        {isCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>

      {/* LOGO GOSTAY */}
      <div
        className={cn(
          "h-20 flex items-center px-6 mb-2 shrink-0 border-b border-slate-800/60",
          isCollapsed ? "justify-center px-0" : "justify-start",
        )}
      >
        <Link to="/" className="flex items-center gap-3 group">
          <div
            className={cn(
              "p-2 rounded-2xl text-white shadow-lg shrink-0 transition-transform group-hover:scale-105",
              activeColor,
            )}
          >
            <LayoutDashboard size={22} />
          </div>
          {!isCollapsed && (
            <span className="font-black text-white text-xl tracking-tight animate-in fade-in duration-500">
              GoStay<span className="text-blue-500">.</span>
            </span>
          )}
        </Link>
      </div>

      {/* DANH SÁCH MENU CHÍNH */}
      <nav className="flex-1 px-3 space-y-1.5 overflow-y-auto no-scrollbar py-4">
        {!isCollapsed && (
          <p className="px-4 mb-3 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
            Menu quản trị
          </p>
        )}
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-4 rounded-2xl transition-all duration-200 group relative",
                isCollapsed
                  ? "justify-center h-12 w-12 mx-auto"
                  : "px-4 py-3.5",
                isActive
                  ? `${activeColor} text-white shadow-lg shadow-blue-900/40 font-bold`
                  : "hover:bg-slate-800/50 hover:text-white font-semibold text-slate-400",
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={cn(
                    "shrink-0 transition-colors",
                    isActive
                      ? "text-white"
                      : "text-slate-500 group-hover:text-white",
                  )}
                >
                  {item.icon}
                </span>

                {!isCollapsed && (
                  <span className="text-sm truncate tracking-wide">
                    {item.label}
                  </span>
                )}

                {isCollapsed && isActive && (
                  <div className="absolute -left-1.5 w-1 h-8 bg-blue-500 rounded-r-full" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* ─── ĐÁY SIDEBAR: CHỈ GIỮ 2 NÚT THAO TÁC GỌN GÀNG ─── */}
      <div className="p-4 border-t border-slate-800/60 bg-slate-950/40 shrink-0">
        <div
          className={cn(
            "flex gap-2",
            isCollapsed ? "flex-col items-center" : "flex-row",
          )}
        >
          <Link
            to="/"
            title="Về trang chủ khách hàng"
            className={cn(
              "flex items-center justify-center bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition-all rounded-2xl border border-slate-800",
              isCollapsed ? "w-11 h-11" : "flex-1 py-3 text-xs font-bold gap-2",
            )}
          >
            <Home size={16} />
            {!isCollapsed && "Trang chủ"}
          </Link>

          <button
            onClick={onLogout}
            title="Đăng xuất khỏi hệ thống"
            className={cn(
              "flex items-center justify-center bg-rose-500/10 text-rose-500 hover:bg-rose-600 hover:text-white transition-all rounded-2xl border border-rose-500/20 cursor-pointer",
              isCollapsed
                ? "w-11 h-11"
                : "flex-1 py-3 text-xs font-black gap-2",
            )}
          >
            <LogOut size={16} />
            {!isCollapsed && "Đăng xuất"}
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
