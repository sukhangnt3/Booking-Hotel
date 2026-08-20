import React, { useState, useRef } from "react";
import { UploadCloud, X, Image as ImageIcon, FileWarning } from "lucide-react";
import { twMerge } from "tailwind-merge";
import { clsx } from "clsx";

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const Upload = ({
  onUpload, // Callback trả về mảng các file đã chọn
  maxFiles = 5,
  accept = "image/*",
  maxSize = 5, // đơn vị MB
  multiple = true,
  className = "",
}) => {
  const [previews, setPreviews] = useState([]); // Chứa link ảnh để hiển thị (blob)
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Xử lý khi chọn file
  const handleFiles = (files) => {
    const validFiles = Array.from(files).filter((file) => {
      const isValidType = file.type.startsWith("image/");
      const isValidSize = file.size / 1024 / 1024 <= maxSize;
      return isValidType && isValidSize;
    });

    if (validFiles.length + previews.length > maxFiles) {
      alert(`Bạn chỉ được phép tải lên tối đa ${maxFiles} ảnh.`);
      return;
    }

    const newPreviews = validFiles.map((file) => ({
      file,
      url: URL.createObjectURL(file),
      name: file.name,
    }));

    const updatedPreviews = [...previews, ...newPreviews];
    setPreviews(updatedPreviews);

    if (onUpload) {
      onUpload(updatedPreviews.map((p) => p.file));
    }
  };

  // Xử lý kéo thả
  const onDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => setIsDragging(false);

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  // Xóa ảnh đã chọn
  const removeFile = (index) => {
    const updated = [...previews];
    URL.revokeObjectURL(updated[index].url); // Giải phóng bộ nhớ
    updated.splice(index, 1);
    setPreviews(updated);
    if (onUpload) onUpload(updated.map((p) => p.file));
  };

  return (
    <div className={cn("w-full space-y-4", className)}>
      {/* 1. Vùng kéo thả / Click để chọn */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "relative border-2 border-dashed rounded-xl p-8 transition-all cursor-pointer flex flex-col items-center justify-center gap-3",
          isDragging
            ? "border-[#006ce4] bg-blue-50"
            : "border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-gray-400",
        )}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => handleFiles(e.target.files)}
          multiple={multiple}
          accept={accept}
          className="hidden"
        />

        <div className="p-3 bg-white rounded-full shadow-sm text-[#006ce4]">
          <UploadCloud size={32} />
        </div>

        <div className="text-center">
          <p className="text-sm font-semibold text-gray-700">
            Click để tải lên hoặc kéo thả ảnh vào đây
          </p>
          <p className="text-xs text-gray-500 mt-1">
            PNG, JPG, WEBP (Tối đa {maxSize}MB/ảnh)
          </p>
        </div>
      </div>

      {/* 2. Danh sách ảnh xem trước (Preview) */}
      {previews.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {previews.map((item, index) => (
            <div
              key={index}
              className="group relative aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-100 animate-in zoom-in-75"
            >
              <img
                src={item.url}
                alt="preview"
                className="w-full h-full object-cover"
              />
              {/* Nút xóa */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(index);
                }}
                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg cursor-pointer"
              >
                <X size={14} />
              </button>
              {/* Tên file (Tooltip nhẹ) */}
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] px-1 py-0.5 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                {item.name}
              </div>
            </div>
          ))}

          {/* Nút thêm nhanh (nếu chưa đủ maxFiles) */}
          {previews.length < maxFiles && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="aspect-square rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-[#006ce4] hover:text-[#006ce4] transition-all cursor-pointer"
            >
              <ImageIcon size={24} />
              <span className="text-[10px] font-bold mt-1">Thêm ảnh</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default Upload;
