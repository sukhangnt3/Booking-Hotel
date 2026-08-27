import React from "react";
import { twMerge } from "tailwind-merge";
import { clsx } from "clsx";

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const Badge = ({
  children,
  variant = "default",
  size = "md",
  className = "",
  showDot = false, // Thêm chấm tròn trạng thái
  ...props
}) => {
  // 1. Base Styles
  const baseStyles =
    "inline-flex items-center justify-center font-bold tracking-tight transition-colors border";

  // 2. Variants (Màu sắc & Viền)
  const variants = {
    // Màu mặc định (Gray)
    default: "bg-gray-100 text-gray-600 border-gray-200",

    // Màu thương hiệu (Blue)
    primary: "bg-blue-50 text-[#24a04e] border-blue-100",

    // Trạng thái thành công (Green)
    success: "bg-emerald-50 text-emerald-700 border-emerald-100",

    // Trạng thái cảnh báo (Orange/Yellow)
    warning: "bg-amber-50 text-amber-700 border-amber-100",

    // Trạng thái lỗi/hết phòng (Red)
    danger: "bg-rose-50 text-rose-700 border-rose-100",

    // Dạng viền không nền
    outline: "bg-transparent border-gray-300 text-gray-600",
  };

  // 3. Sizes
  const sizes = {
    sm: "px-2 py-0.5 text-[10px] rounded-md",
    md: "px-2.5 py-0.5 text-[12px] rounded-lg",
    lg: "px-3 py-1 text-[13px] rounded-xl",
  };

  return (
    <span
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {/* Chấm tròn trạng thái (Nếu có) */}
      {showDot && (
        <span
          className={cn(
            "w-1.5 h-1.5 rounded-full mr-1.5 shrink-0 animate-pulse",
            // Tự động đổi màu chấm tròn theo màu chữ của variant
            "bg-current",
          )}
        />
      )}
      {children}
    </span>
  );
};
