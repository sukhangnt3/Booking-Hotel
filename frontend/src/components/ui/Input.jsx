import React, { forwardRef, useId } from "react";
import { twMerge } from "tailwind-merge";
import { clsx } from "clsx";

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const Input = forwardRef(
  (
    {
      label,
      type = "text",
      placeholder,
      value = "",
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
    },
    ref,
  ) => {
    const generatedId = useId(); // Tạo ID duy nhất cho label và input
    const inputId = props.id || generatedId;

    const handleClear = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (onClear) {
        onClear();
      } else if (onChange) {
        onChange({ target: { value: "" } });
      }
    };

    return (
      <div className={cn("w-full flex flex-col gap-1.5", wrapperClassName)}>
        {/* 1. Label */}
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-semibold text-gray-700 select-none w-fit cursor-pointer"
          >
            {label} {required && <span className="text-red-500">*</span>}
          </label>
        )}

        {/* 2. Input Wrapper */}
        <div className="relative group flex items-center">
          {/* Left Icon */}
          {leftIcon && (
            <div className="absolute left-3 flex items-center justify-center text-gray-400 pointer-events-none transition-colors group-focus-within:text-[#006ce4]">
              {leftIcon}
            </div>
          )}

          {/* Input Field */}
          <input
            ref={ref}
            id={inputId}
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className={cn(
              "w-full h-11 bg-white border border-gray-300 rounded-md text-gray-800 text-sm transition-all outline-none",
              "placeholder:text-gray-400",
              "focus:border-[#006ce4] focus:ring-[3px] focus:ring-[#006ce4]/10",
              leftIcon ? "pl-10" : "pl-3",
              clearable || rightIcon ? "pr-10" : "pr-3",
              hasError &&
                "border-red-500 bg-red-50/30 focus:border-red-500 focus:ring-red-500/10",
              "disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed",
              className,
            )}
            {...props}
          />

          {/* Right Icon / Clear Button */}
          <div className="absolute right-3 flex items-center gap-2">
            {clearable && value && !props.disabled && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
                title="Xóa nội dung"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}

            {rightIcon && !clearable && (
              <div className="text-gray-400 pointer-events-none">
                {rightIcon}
              </div>
            )}
          </div>
        </div>

        {/* 3. Error Message */}
        {hasError && errorText && (
          <p className="text-[13px] text-red-500 font-medium animate-in fade-in slide-in-from-top-1">
            {errorText}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";

export default Input;
