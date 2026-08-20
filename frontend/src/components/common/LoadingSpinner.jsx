import React from "react";
import { cn } from "@/utils/cn";

const LoadingSpinner = ({
  fullPage = false,
  size = "md", // sm, md, lg, xl
  color = "text-[#006ce4]",
  label = "Đang tải dữ liệu...",
  className = "",
}) => {
  // 1. Cấu hình kích thước
  const sizeClasses = {
    sm: "w-5 h-5 border-2",
    md: "w-8 h-8 border-3",
    lg: "w-12 h-12 border-4",
    xl: "w-16 h-16 border-[5px]",
  };

  const spinner = (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3",
        className,
      )}
    >
      {/* Sử dụng SVG để vòng xoay mượt mà hơn */}
      <svg
        className={cn(
          "animate-spin",
          sizeClasses[size] || sizeClasses.md,
          color,
        )}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        role="status"
        aria-label="loading"
      >
        <circle
          className="opacity-20"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-100"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>

      {label && (
        <p
          className={cn(
            "font-bold animate-pulse",
            size === "sm" ? "text-[10px]" : "text-xs text-gray-500",
          )}
        >
          {label}
        </p>
      )}
    </div>
  );

  // 2. Chế độ tràn màn hình (Full Page)
  if (fullPage) {
    return (
      <div className="fixed inset-0 bg-white/60 backdrop-blur-[2px] z-[9999] flex items-center justify-center animate-in fade-in duration-300">
        {spinner}
      </div>
    );
  }

  // 3. Chế độ mặc định (Inline)
  return <div className="py-10 flex justify-center w-full">{spinner}</div>;
};

export default LoadingSpinner;
