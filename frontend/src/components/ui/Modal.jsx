import React, { useEffect } from "react";
import { X } from "lucide-react";

export const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  footer, // 👈 Thêm prop footer chứa các nút hành động (tùy chọn)
  maxWidth = "max-w-lg",
  closeOnOverlayClick = true, // 👈 Cho phép bật/tắt đóng khi click ra ngoài
}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.body.style.overflow = ""; // Trả về style mặc định an toàn hơn
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    /* 1. Lớp nền Backdrop - Thêm onClick={onClose} để đóng khi click ra ngoài */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn"
      onClick={closeOnOverlayClick ? onClose : undefined}
    >
      {/* 2. Khung Modal chính - e.stopPropagation() ngăn sự kiện click lan ra ngoài */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={`bg-white rounded-xl shadow-xl w-full ${maxWidth} overflow-hidden transform transition-all flex flex-col max-h-[90vh]`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h3 id="modal-title" className="text-lg font-semibold text-gray-900">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors outline-none cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body (Tự động cuộn nếu nội dung dài) */}
        <div className="p-6 overflow-y-auto flex-1">{children}</div>

        {/* Footer (Nếu có) */}
        {footer && (
          <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
