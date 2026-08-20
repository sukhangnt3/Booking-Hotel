import React, { useState } from "react";
import { Grid2X2, Image as ImageIcon } from "lucide-react";
import { cn } from "@/utils/cn";

const HotelGallery = ({ images = [] }) => {
  const [showAll, setShowAll] = useState(false);

  // Fallback nếu không có ảnh
  if (!images || images.length === 0) {
    return (
      <div className="w-full h-[400px] bg-gray-100 rounded-2xl flex flex-col items-center justify-center text-gray-400 border-2 border-dashed">
        <ImageIcon size={48} strokeWidth={1} />
        <p className="mt-2 font-medium">Chưa có hình ảnh cho chỗ nghỉ này</p>
      </div>
    );
  }

  // Phân loại ảnh: 1 ảnh chính, 4 ảnh phụ để tạo grid 5 ảnh chuẩn
  const mainImage = images.find((img) => img.is_thumbnail) || images[0];
  const displayImages = images
    .filter((img) => img.id !== mainImage.id)
    .slice(0, 4);
  const remainingCount = images.length - 5;

  return (
    <div className="relative group">
      {/* GRID LAYOUT: 1 To - 4 Nhỏ */}
      <div className="grid grid-cols-4 grid-rows-2 gap-2 h-[300px] md:h-[450px] rounded-2xl overflow-hidden shadow-md">
        {/* Ảnh chính (Bên trái) */}
        <div className="col-span-4 md:col-span-2 row-span-2 relative overflow-hidden">
          <img
            src={mainImage?.path}
            alt="Main view"
            className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-700"
            onClick={() => setShowAll(true)}
          />
        </div>

        {/* 4 Ảnh phụ (Bên phải - Chỉ hiện từ màn hình md trở lên) */}
        {displayImages.map((img, idx) => (
          <div
            key={img.id || idx}
            className={cn(
              "hidden md:block relative overflow-hidden",
              // Ảnh cuối cùng có lớp phủ mờ nếu còn dư ảnh
              idx === 3 && remainingCount > 0 && "cursor-pointer",
            )}
            onClick={() => setShowAll(true)}
          >
            <img
              src={img.path}
              alt={`Gallery view ${idx}`}
              className="w-full h-full object-cover cursor-pointer hover:scale-110 transition-transform duration-700"
            />

            {/* Lớp phủ "+X ảnh" ở tấm hình cuối cùng */}
            {idx === 3 && remainingCount > 0 && (
              <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white pointer-events-none">
                <span className="text-xl font-bold">+{remainingCount}</span>
                <span className="text-xs font-medium uppercase tracking-wider">
                  Hình ảnh
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* NÚT XEM TẤT CẢ ẢNH (Góc dưới bên phải) */}
      <button
        onClick={() => setShowAll(true)}
        className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-md text-gray-900 px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 text-sm font-bold hover:bg-white transition-all active:scale-95 border border-gray-200"
      >
        <Grid2X2 size={16} />
        Hiển thị tất cả {images.length} ảnh
      </button>

      {/* Ghi chú: Ở đây bạn có thể tích hợp thêm Lightbox (ví dụ: fslightbox-react) 
          để khi nhấn vào ảnh sẽ hiện slide tràn màn hình */}
    </div>
  );
};

export default HotelGallery;
