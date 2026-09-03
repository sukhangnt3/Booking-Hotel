// src/components/layout/Sidebar.jsx
import React from "react";
import { NavLink, Link } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  LogOut,
  Home,
  LayoutDashboard,
  Building2,
  Users,
  BedDouble,
  CalendarCheck,
  Receipt,
  Sparkles,
  BarChart3,
  UserCheck,
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
        "flex flex-col bg-white text-slate-400 transition-all duration-300 relative border-r border-slate-200 h-screen shrink-0 z-50 select-none",
        isCollapsed ? "w-20" : "w-72",
      )}
    >
      {/* Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-10 z-[60] bg-slate-100 text-slate-700 rounded-full p-1.5 border border-slate-300 hover:bg-slate-200 transition-all shadow-xl hidden lg:block cursor-pointer"
      >
        {isCollapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
      </button>

      {/* Brand */}
      <div
        className={cn(
          "h-20 flex items-center px-6 mb-2 shrink-0 border-b border-slate-100",
          isCollapsed ? "justify-center px-0" : "justify-start",
        )}
      >
        <Link to="/" className="flex items-center gap-3">
          <div
            className={cn("p-2 rounded-2xl text-white shadow-md", activeColor)}
          >
            <Building2 size={22} />
          </div>
          {!isCollapsed && (
            <span className="font-black text-slate-900 text-xl tracking-tight">
              GoStay
            </span>
          )}
        </Link>
      </div>

      {/* Menu List */}
      <nav className="flex-1 px-3 space-y-1.5 overflow-y-auto no-scrollbar py-3">
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-4 rounded-2xl transition-all duration-200",
                isCollapsed
                  ? "justify-center h-12 w-12 mx-auto"
                  : "px-4 py-3.5",
                isActive
                  ? `${activeColor} text-white shadow-md font-bold`
                  : "hover:bg-slate-100 text-slate-700 font-semibold",
              )
            }
          >
            <span className="shrink-0">{item.icon}</span>
            {!isCollapsed && (
              <span className="text-xs truncate tracking-wide">
                {item.label}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer Actions */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/70 shrink-0 flex gap-2">
        <Link
          to="/"
          className={cn(
            "flex items-center justify-center bg-slate-900 hover:bg-black text-white rounded-2xl",
            isCollapsed ? "w-11 h-11" : "flex-1 py-3 text-xs font-bold gap-2",
          )}
        >
          <Home size={16} />
          {!isCollapsed && "Trang chủ"}
        </Link>
        <button
          onClick={onLogout}
          className={cn(
            "flex items-center justify-center bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-2xl border border-rose-200 cursor-pointer",
            isCollapsed ? "w-11 h-11" : "flex-1 py-3 text-xs font-bold gap-2",
          )}
        >
          <LogOut size={16} />
          {!isCollapsed && "Đăng xuất"}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
