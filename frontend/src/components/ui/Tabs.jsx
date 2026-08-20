import React, { useState, useRef, useEffect } from "react";
import { twMerge } from "tailwind-merge";
import { clsx } from "clsx";

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const Tabs = ({
  tabs = [], // [{ id, label, icon, badge }]
  activeTab,
  onChange,
  variant = "underline", // 'underline' hoặc 'pills'
  className = "",
  contentClassName = "",
}) => {
  const [internalActiveTab, setInternalActiveTab] = useState(tabs[0]?.id);
  const activeId = activeTab || internalActiveTab;
  const tabsRef = useRef(null);

  // Xử lý chuyển tab
  const handleTabClick = (id) => {
    setInternalActiveTab(id);
    if (onChange) onChange(id);
  };

  // Tự động cuộn tab vào giữa màn hình khi click (cho mobile)
  useEffect(() => {
    const activeElement =
      tabsRef.current?.querySelector(`[data-active="true"]`);
    if (activeElement) {
      activeElement.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    }
  }, [activeId]);

  return (
    <div className={cn("w-full", className)}>
      {/* 1. Tab List (Thanh điều hướng) */}
      <div
        className={cn(
          "relative flex overflow-x-auto no-scrollbar border-b border-gray-200",
          variant === "pills" && "border-none gap-2",
        )}
        ref={tabsRef}
      >
        {tabs.map((tab) => {
          const isActive = activeId === tab.id;

          return (
            <button
              key={tab.id}
              data-active={isActive}
              onClick={() => handleTabClick(tab.id)}
              className={cn(
                "relative flex items-center justify-center gap-2 py-3 px-4 text-sm font-semibold transition-all duration-200 whitespace-nowrap cursor-pointer outline-none",

                // Style cho variant "underline" (Giống Booking.com)
                variant === "underline" && [
                  "text-gray-500 hover:text-gray-700 hover:bg-gray-50",
                  isActive &&
                    "text-[#006ce4] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#006ce4]",
                ],

                // Style cho variant "pills" (Hiện đại hơn)
                variant === "pills" && [
                  "rounded-full px-5 py-2 border",
                  isActive
                    ? "bg-[#006ce4] text-white border-[#006ce4] shadow-md shadow-blue-200"
                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-300",
                ],
              )}
            >
              {tab.icon && (
                <span className={isActive ? "animate-pulse" : ""}>
                  {tab.icon}
                </span>
              )}
              {tab.label}

              {/* Badge số lượng (Ví dụ: số lượng Đánh giá) */}
              {tab.badge && (
                <span
                  className={cn(
                    "ml-1 px-1.5 py-0.5 text-[10px] rounded-full",
                    isActive
                      ? "bg-white text-[#006ce4]"
                      : "bg-gray-100 text-gray-500",
                  )}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 2. Tab Content (Hiển thị nội dung) */}
      <div
        className={cn(
          "py-6 animate-in fade-in slide-in-from-top-2 duration-300",
          contentClassName,
        )}
      >
        {tabs.find((tab) => tab.id === activeId)?.content}
      </div>
    </div>
  );
};

export default Tabs;
