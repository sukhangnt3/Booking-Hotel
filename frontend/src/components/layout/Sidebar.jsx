import React from "react";
import { NavLink, Link } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  LogOut,
  Home,
  ShieldCheck,
  LayoutDashboard,
} from "lucide-react";
import { cn } from "@/utils/cn";

const Sidebar = ({
  items = [],
  isCollapsed,
  setIsCollapsed,
  user,
  onLogout,
  roleName = "Administrator",
  activeColor = "bg-blue-600",
}) => {
  return (
    <aside
      className={cn(
        "flex flex-col bg-[#030712] text-slate-400 transition-all duration-300 relative border-r border-slate-800 h-screen shrink-0 z-50",
        isCollapsed ? "w-20" : "w-72",
      )}
    >
      {/* NÚT THU GỌN - Đã sửa lại vị trí cực chuẩn */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-10 z-[60] bg-slate-800 text-white rounded-full p-1.5 border border-slate-700 hover:bg-blue-600 transition-all shadow-xl hidden lg:block"
      >
        {isCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>

      {/* LOGO */}
      <div
        className={cn(
          "h-20 flex items-center px-6 mb-2 shrink-0",
          isCollapsed ? "justify-center px-0" : "justify-start",
        )}
      >
        <Link to="/" className="flex items-center gap-3">
          <div
            className={cn(
              "p-2 rounded-xl text-white shadow-lg shrink-0",
              activeColor,
            )}
          >
            <LayoutDashboard size={24} />
          </div>
          {!isCollapsed && (
            <span className="font-bold text-white text-xl tracking-tight animate-in fade-in duration-500">
              GoStay<span className="text-blue-500">.</span>
            </span>
          )}
        </Link>
      </div>

      {/* MENU LIST */}
      <nav className="flex-1 px-3 space-y-1.5 overflow-y-auto no-scrollbar py-4">
        {!isCollapsed && (
          <p className="px-4 mb-4 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
            Menu chính
          </p>
        )}
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-4 rounded-xl transition-all duration-200 group relative",
                isCollapsed
                  ? "justify-center h-12 w-12 mx-auto"
                  : "px-4 py-3.5",
                isActive
                  ? `${activeColor} text-white shadow-lg shadow-blue-900/40`
                  : "hover:bg-slate-800/50 hover:text-white",
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
                  <span className="text-sm font-semibold truncate tracking-wide">
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

      {/* USER PANEL - Dưới đáy Sidebar */}
      <div className="p-4 bg-slate-900/30 border-t border-slate-800 shrink-0">
        {!isCollapsed && (
          <div className="mb-4 px-4 py-3 rounded-2xl bg-slate-800/40 border border-slate-700/50">
            <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-1">
              {roleName}
            </p>
            <p className="text-xs font-bold text-slate-300 truncate">
              {user?.email || "admin@gostay.com"}
            </p>
          </div>
        )}

        <div
          className={cn(
            "flex gap-2",
            isCollapsed ? "flex-col items-center" : "flex-row",
          )}
        >
          <Link
            to="/"
            title="Trang chủ"
            className={cn(
              "flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all rounded-xl",
              isCollapsed
                ? "w-12 h-12"
                : "flex-1 py-3 text-[11px] font-bold gap-2",
            )}
          >
            <Home size={16} />
            {!isCollapsed && "Web"}
          </Link>

          <button
            onClick={onLogout}
            title="Đăng xuất"
            className={cn(
              "flex items-center justify-center bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all rounded-xl",
              isCollapsed
                ? "w-12 h-12"
                : "flex-1 py-3 text-[11px] font-bold gap-2",
            )}
          >
            <LogOut size={16} />
            {!isCollapsed && "Thoát"}
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
