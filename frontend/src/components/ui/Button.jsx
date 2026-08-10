import React from "react";

const Button = ({
  children,
  variant = "primary",
  type = "button",
  className = "",
  disabled = false,
  isLoading = false,
  ...props
}) => {
  // Style chung
  const baseStyles =
    "inline-flex items-center justify-center font-medium text-sm transition-all duration-200 select-none outline-none focus:outline-none";

  // 4 kiểu button
  const variants = {
    // 1. Primary: Nút chính
    primary:
      "bg-[#006ce4] text-white hover:bg-[#0052b4] active:bg-[#004394] rounded-md px-6 py-3",

    // 2. Outline: Nút phụ, có viền
    outline:
      "bg-white text-[#006ce4] border border-[#006ce4] hover:bg-[#f0f6ff] active:bg-[#e0efff] rounded-md px-6 py-3",

    // 3. Text: Chỉ có chữ, không nền/viền
    text: "bg-transparent text-[#006ce4] hover:bg-[#f0f6ff] active:bg-[#e0efff] rounded-md px-4 py-2",

    // 4. Ghost: Dùng trên Header/nền màu
    ghost:
      "bg-transparent text-white border border-white/40 hover:bg-white/20 active:bg-white/30 rounded-full px-5 py-2",
  };

  // Disabled hoặc Loading
  const disabledStyles =
    disabled || isLoading
      ? "opacity-50 cursor-not-allowed pointer-events-none"
      : "cursor-pointer";

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      className={`${baseStyles} ${variants[variant]} ${disabledStyles} ${className}`}
      {...props}
    >
      {isLoading ? (
        <>
          {/* Loading spinner */}
          <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          Đang tải...
        </>
      ) : (
        children
      )}
    </button>
  );
};

export default Button;
