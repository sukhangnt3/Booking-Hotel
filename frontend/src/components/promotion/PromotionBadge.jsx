import React from "react";
import { Tag, Sparkles } from "lucide-react";
import { cn } from "@/utils/cn";

const PromotionBadge = ({
  type = "percentage", // 'percentage' hoặc 'amount'
  value = 0,
  size = "md", // 'sm', 'md', 'lg'
  variant = "danger", // 'danger' (đỏ), 'warning' (cam), 'success' (xanh)
  className = "",
  showIcon = true,
}) => {
  // 1. Định dạng hiển thị nội dung
  const displayValue = () => {
    if (type === "percentage") {
      return `-${value}%`;
    }
    // Định dạng tiền rút gọn (Ví dụ: 100.000 -> 100k)
    const formattedAmount =
      value >= 1000
        ? (value / 1000).toLocaleString() + "k"
        : value.toLocaleString();
    return `-${formattedAmount} ₫`;
  };

  // 2. Cấu hình Kích thước
  const sizeStyles = {
    sm: "px-1.5 py-0.5 text-[9px] gap-1",
    md: "px-2 py-1 text-[11px] gap-1.5",
    lg: "px-3 py-1.5 text-sm gap-2",
  };

  // 3. Cấu hình Màu sắc (Variants)
  const variantStyles = {
    danger: "bg-rose-600 text-white shadow-rose-100",
    warning: "bg-orange-500 text-white shadow-orange-100",
    success: "bg-emerald-500 text-white shadow-emerald-100",
    primary: "bg-blue-600 text-white shadow-blue-100",
  };

  if (!value || value <= 0) return null;

  return (
    <div
      className={cn(
        "inline-flex items-center font-black uppercase tracking-wider rounded-lg shadow-sm animate-in zoom-in duration-300",
        sizeStyles[size],
        variantStyles[variant],
        className,
      )}
    >
      {showIcon && (
        <span className="shrink-0">
          {type === "percentage" ? (
            <Sparkles size={size === "sm" ? 10 : 14} />
          ) : (
            <Tag size={size === "sm" ? 10 : 14} />
          )}
        </span>
      )}
      <span>{displayValue()}</span>
    </div>
  );
};

export default PromotionBadge;
