import React from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/utils/cn";

const Breadcrumb = ({ items = [], className = "" }) => {
  if (!items || items.length === 0) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn(
        "flex items-center py-4 overflow-x-auto no-scrollbar",
        className,
      )}
    >
      <ol className="flex items-center whitespace-nowrap">
        {/* 1. MẶC ĐỊNH LUÔN CÓ ICON TRANG CHỦ */}
        <li className="flex items-center">
          <Link
            to="/"
            className="text-gray-400 hover:text-[#006ce4] transition-colors flex items-center gap-1.5"
          >
            <Home size={14} />
            <span className="sr-only">Trang chủ</span>
          </Link>
        </li>

        {/* 2. DUYỆT QUA CÁC MỤC TRUYỀN VÀO */}
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={index} className="flex items-center text-[13px]">
              {/* Dấu phân cách dùng Chevron thay vì / */}
              <ChevronRight size={14} className="mx-2 text-gray-300 shrink-0" />

              {item.link && !isLast ? (
                <Link
                  to={item.link}
                  className="text-gray-500 font-medium hover:text-[#006ce4] hover:underline transition-all"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={cn(
                    "font-bold truncate max-w-[150px] sm:max-w-[300px]",
                    isLast ? "text-gray-900" : "text-gray-500",
                  )}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumb;
