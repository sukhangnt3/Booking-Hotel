import React from "react";

const LoadingSpinner = ({ fullPage = false }) => {
  const spinner = (
    <div className="flex flex-col items-center justify-center gap-3">
      {/* Vòng xoay CSS Tailwind */}
      <div className="w-10 h-10 border-4 border-gray-200 border-t-[#006ce4] rounded-full animate-spin"></div>
      <p className="text-xs font-bold text-gray-500 animate-pulse">
        Đang tải dữ liệu...
      </p>
    </div>
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-[9999] flex items-center justify-center">
        {spinner}
      </div>
    );
  }

  return <div className="py-10 flex justify-center w-full">{spinner}</div>;
};

// QUAN TRỌNG: Phải có dòng này để index.js không báo lỗi
export default LoadingSpinner;
