import React from "react";

const EmptyState = ({
  title = "Không tìm thấy dữ liệu",
  description = "Vui lòng thử lại với các điều kiện lọc khác.",
  icon = "🔍",
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-white rounded-2xl border border-dashed border-gray-300">
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="text-lg font-bold text-gray-900">{title}</h3>
      <p className="text-sm text-gray-500 mt-2 max-w-xs mx-auto">
        {description}
      </p>
    </div>
  );
};

export default EmptyState;
