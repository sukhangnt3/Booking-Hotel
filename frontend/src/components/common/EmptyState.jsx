import React from "react";
import { SearchX, RefreshCcw, Home } from "lucide-react";
import { Button } from "../ui";
import { cn } from "@/utils/cn";

const EmptyState = ({
  title = "Không tìm thấy kết quả",
  description = "Rất tiếc, chúng tôi không tìm thấy dữ liệu phù hợp với yêu cầu của bạn. Hãy thử thay đổi bộ lọc hoặc tìm kiếm lại.",
  icon: Icon = SearchX, // Cho phép truyền React Component (Lucide Icon)
  actionLabel, // Nhãn của nút bấm (ví dụ: "Xóa bộ lọc")
  onAction, // Hàm xử lý khi bấm nút
  showHomeButton = false, // Hiện nút quay về trang chủ
  className = "",
}) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-20 px-6 text-center bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-200 animate-in fade-in zoom-in-95 duration-500",
        className,
      )}
    >
      {/* 1. ICON CONTAINER */}
      <div className="relative mb-6">
        <div className="w-24 h-24 bg-white rounded-full shadow-xl shadow-gray-200/50 flex items-center justify-center text-gray-300">
          <Icon size={48} strokeWidth={1.5} />
        </div>
        {/* Trang trí nhỏ */}
        <div className="absolute -top-1 -right-1 w-6 h-6 bg-blue-100 rounded-full animate-bounce" />
      </div>

      {/* 2. TEXT CONTENT */}
      <div className="max-w-sm space-y-2">
        <h3 className="text-xl font-extrabold text-gray-900 tracking-tight">
          {title}
        </h3>
        <p className="text-sm text-gray-500 leading-relaxed font-medium">
          {description}
        </p>
      </div>

      {/* 3. ACTION BUTTONS */}
      <div className="mt-8 flex flex-col sm:flex-row gap-3">
        {actionLabel && onAction && (
          <Button
            onClick={onAction}
            className="px-8 h-11 font-bold shadow-lg shadow-blue-100"
            leftIcon={<RefreshCcw size={16} />}
          >
            {actionLabel}
          </Button>
        )}

        {showHomeButton && (
          <Button
            variant="outline"
            className="px-8 h-11 font-bold bg-white"
            onClick={() => (window.location.href = "/")}
            leftIcon={<Home size={16} />}
          >
            Về trang chủ
          </Button>
        )}
      </div>
    </div>
  );
};

export default EmptyState;
