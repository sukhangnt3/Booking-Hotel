// src/components/hotel/HotelGallery.jsx
import React, { useState } from "react";
import { Grid2X2, Image as ImageIcon, X } from "lucide-react";
import { cn } from "@/utils/cn";

export default function HotelGallery({ images = [] }) {
  const [showAll, setShowAll] = useState(false);

  if (!images || images.length === 0) {
    return (
      <div className="w-full h-[320px] md:h-[400px] bg-gray-100 rounded-3xl flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200">
        <ImageIcon size={44} strokeWidth={1.5} />
        <p className="mt-2 text-xs font-medium">
          Chưa có hình ảnh cho chỗ nghỉ này
        </p>
      </div>
    );
  }

  // Chuẩn hóa định dạng danh sách ảnh
  const formattedImages = images.map((img) =>
    typeof img === "string"
      ? { path: img }
      : { path: img.path || img.url || "" },
  );

  const mainImage = formattedImages[0];
  const subImages = formattedImages.slice(1, 5);
  const remainingCount = Math.max(0, formattedImages.length - 5);

  return (
    <div className="relative group font-sans select-none">
      {/* 1. LƯỚI BENTO BOX 5 ẢNH */}
      <div className="grid grid-cols-4 grid-rows-2 gap-2.5 h-[300px] sm:h-[380px] md:h-[440px] rounded-3xl overflow-hidden shadow-md">
        {/* Ảnh chính to bên trái */}
        <div
          onClick={() => setShowAll(true)}
          className="col-span-4 md:col-span-2 row-span-2 relative overflow-hidden cursor-pointer"
        >
          <img
            src={mainImage?.path}
            alt="Ảnh chính"
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-700 select-none"
          />
        </div>

        {/* 4 Ảnh phụ bên phải */}
        {subImages.map((img, idx) => (
          <div
            key={idx}
            onClick={() => setShowAll(true)}
            className={cn(
              "hidden md:block relative overflow-hidden cursor-pointer",
            )}
          >
            <img
              src={img.path}
              alt={`Ảnh phụ ${idx + 1}`}
              className="w-full h-full object-cover hover:scale-110 transition-transform duration-700 select-none"
            />

            {/* Lớp phủ +X ảnh ở tấm cuối */}
            {idx === 3 && remainingCount > 0 && (
              <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white pointer-events-none">
                <span className="text-xl font-black">+{remainingCount}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  Hình ảnh
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* NÚT MỞ XEM TOÀN BỘ ẢNH */}
      <button
        type="button"
        onClick={() => setShowAll(true)}
        className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-md text-slate-800 px-4 py-2 rounded-xl shadow-lg flex items-center gap-2 text-xs font-bold hover:bg-white transition-all active:scale-95 border border-gray-200 cursor-pointer"
      >
        <Grid2X2 size={16} className="text-[#006ce4]" />
        Xem tất cả {formattedImages.length} ảnh
      </button>

      {/* 2. MODAL LIGHTBOX XEM TOÀN BỘ ẢNH PHÓNG TO */}
      {showAll && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex flex-col p-4 sm:p-8 animate-in fade-in duration-200">
          <div className="flex justify-between items-center text-white pb-4 max-w-5xl mx-auto w-full">
            <span className="text-sm font-bold">
              Tất cả hình ảnh chỗ nghỉ ({formattedImages.length})
            </span>
            <button
              onClick={() => setShowAll(false)}
              className="p-2 hover:bg-white/10 rounded-full text-white cursor-pointer transition"
            >
              <X size={22} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto max-w-5xl mx-auto w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 custom-scrollbar pb-10">
            {formattedImages.map((img, index) => (
              <div
                key={index}
                className="aspect-[4/3] rounded-2xl overflow-hidden bg-slate-800 shadow-md"
              >
                <img
                  src={img.path}
                  alt={`Ảnh ${index + 1}`}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-500 select-none"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
