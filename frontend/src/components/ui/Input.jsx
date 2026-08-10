import React from "react";

const Input = ({
  label,
  type = "text",
  placeholder,
  value = "", // Khắc phục 1: Luôn đặt mặc định là string rỗng tránh lỗi uncontrolled input
  onChange,
  onClear,
  clearable = false,
  required = false,
  hasError = false,
  errorText,
  leftIcon,
  rightIcon,
  className = "",
  wrapperClassName = "",
  ...props
}) => {
  // Xử lý sự kiện bấm nút Xóa
  const handleClear = (e) => {
    e.stopPropagation();
    if (onClear) {
      onClear();
    } else if (onChange) {
      // Giả lập event onChange chuẩn
      onChange({ target: { value: "" } });
    }
  };

  // Render Icon bên phải hoặc Nút Clear
  const renderRightIcon = () => {
    if (clearable && Boolean(value)) {
      return (
        <button
          type="button"
          onClick={handleClear}
          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200/60 rounded-full transition-colors outline-none cursor-pointer pointer-events-auto z-10"
          title="Xoá nội dung"
          aria-label="Clear input"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      );
    }
    return rightIcon;
  };

  const activeRightIcon = renderRightIcon();

  return (
    <div className="w-full flex flex-col justify-center">
      {/* 1. Hiển thị Label */}
      {label && (
        <label className="block text-sm font-semibold text-gray-700 mb-1 select-none">
          {label}
        </label>
      )}

      {/* 2. Ô nhập liệu */}
      <div className={`relative flex items-center w-full ${wrapperClassName}`}>
        {/* Left Icon (Thêm pointer-events-none để click xuyên qua input) */}
        {leftIcon && (
          <div className="absolute left-3 flex items-center justify-center text-gray-500 pointer-events-none z-10">
            {leftIcon}
          </div>
        )}

        {/* Input Field */}
        <input
          type={type}
          placeholder={placeholder}
          required={required}
          value={value}
          onChange={onChange}
          className={`w-full bg-transparent text-gray-800 text-sm outline-none transition-all placeholder-gray-400 ${
            leftIcon ? "pl-9" : "pl-3"
          } ${activeRightIcon ? "pr-9" : "pr-3"} ${
            hasError ? "border-red-500 bg-red-50 focus:border-red-500" : ""
          } ${className}`}
          {...props}
        />

        {/* Right Icon (Khắc phục 2: Kiểm tra nếu không phải nút clear thì ngắt pointer events) */}
        {activeRightIcon && (
          <div className="absolute right-3 flex items-center justify-center text-gray-500 z-10 pointer-events-none">
            {activeRightIcon}
          </div>
        )}
      </div>

      {/* 3. Dòng chữ báo lỗi */}
      {hasError && errorText && (
        <span className="text-xs text-red-500 mt-1 select-none font-medium">
          {errorText}
        </span>
      )}
    </div>
  );
};

export default Input;
