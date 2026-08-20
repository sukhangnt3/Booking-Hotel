import React, { forwardRef } from "react";
import { twMerge } from "tailwind-merge";
import { clsx } from "clsx";

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const Button = forwardRef(
  (
    {
      children,
      variant = "primary",
      size = "md",
      type = "button",
      className = "",
      disabled = false,
      isLoading = false,
      leftIcon = null, // 👈 Bóc tách riêng để không bị truyền vào thẻ <button>
      rightIcon = null, // 👈 Bóc tách riêng để không bị truyền vào thẻ <button>
      ...props
    },
    ref,
  ) => {
    // 1. Base Styles
    const baseStyles =
      "inline-flex items-center justify-center font-bold transition-all duration-200 select-none outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#006ce4]/40 active:scale-[0.98] cursor-pointer";

    // 2. Variants (Màu sắc)
    const variants = {
      primary:
        "bg-[#006ce4] text-white hover:bg-[#0052b4] border border-transparent shadow-sm",
      outline:
        "bg-white text-[#006ce4] border border-[#006ce4] hover:bg-[#f0f6ff]",
      text: "bg-transparent text-[#006ce4] hover:bg-[#f0f6ff]",
      ghost:
        "bg-transparent text-white border border-white/40 hover:bg-white/20",
      danger:
        "bg-rose-600 text-white hover:bg-rose-700 border border-transparent shadow-sm",
      success:
        "bg-emerald-600 text-white hover:bg-emerald-700 border border-transparent shadow-sm",
    };

    // 3. Sizes (Kích thước)
    const sizes = {
      sm: "px-3 py-1.5 text-xs rounded-xl gap-1.5",
      md: "px-5 py-2.5 text-sm rounded-xl gap-2",
      lg: "px-8 py-3.5 text-base rounded-2xl gap-2.5",
    };

    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        className={cn(
          baseStyles,
          variants[variant] || variants.primary,
          sizes[size] || sizes.md,
          isDisabled &&
            "opacity-50 cursor-not-allowed pointer-events-none active:scale-100 shadow-none",
          className,
        )}
        {...props}
      >
        {/* 1. Loading Spinner (Ưu tiên hiện khi isLoading = true) */}
        {isLoading ? (
          <svg
            className="animate-spin text-current h-4 w-4 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          /* 2. Left Icon (Nếu có) */
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}

        {/* 3. Text Content */}
        <span className={cn(isLoading && "opacity-90")}>{children}</span>

        {/* 4. Right Icon (Nếu có và không đang loading) */}
        {!isLoading && rightIcon && (
          <span className="shrink-0">{rightIcon}</span>
        )}
      </button>
    );
  },
);

Button.displayName = "Button";

export default Button;
