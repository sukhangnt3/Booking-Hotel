// src/components/auth/RegisterForm/Step5PhotoGallery.jsx
import React, { useRef, useState } from "react";
import {
  Plus,
  Trash2,
  Info,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Camera,
  Loader2,
  Sparkles,
} from "lucide-react";

export const Step5PhotoGallery = ({
  data = {},
  onChange = () => {},
  errors = {},
}) => {
  const propertyPhotoInputRef = useRef(null);
  const roomPhotoInputRef = useRef(null);

  const [isCompressing, setIsCompressing] = useState(false);
  const [showTips, setShowTips] = useState(false);
  const [openRoomPhotos, setOpenRoomPhotos] = useState(true);
  const [selectedRoomIdForUpload, setSelectedRoomIdForUpload] = useState(null);

  const hotelImages = data?.hotelImages || [];
  const rooms = data?.rooms || [];

  const propertyPhotos = hotelImages.filter((img) => !img.roomId);

  const processAndUploadFiles = async (files, targetRoomId = null) => {
    if (!files || files.length === 0) return;
    setIsCompressing(true);

    const compressSingleImage = (file, index) => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
            const maxWidth = 1200;
            const scale = Math.min(maxWidth / img.width, 1);
            canvas.width = img.width * scale;
            canvas.height = img.height * scale;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            const compressed = canvas.toDataURL("image/jpeg", 0.85);

            resolve({
              id: `img-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
              url: compressed,
              roomId: targetRoomId,
              title: file.name.replace(/\.[^/.]+$/, ""),
            });
          };
          img.src = event.target.result;
        };
        reader.readAsDataURL(file);
      });
    };

    try {
      const newImages = await Promise.all(
        Array.from(files).map((f, i) => compressSingleImage(f, i)),
      );

      const updated = [...hotelImages, ...newImages];
      const updates = { hotelImages: updated };

      if (!data?.hotelMainImage && updated.length > 0) {
        updates.hotelMainImage = updated[0].url;
      }

      onChange(updates);
    } catch (err) {
      console.error("Lỗi tải ảnh:", err);
    } finally {
      setIsCompressing(false);
    }
  };

  const handlePropertyUpload = (e) => {
    processAndUploadFiles(e.target.files, null);
    e.target.value = null;
  };

  const handleRoomUpload = (e) => {
    if (selectedRoomIdForUpload) {
      processAndUploadFiles(e.target.files, selectedRoomIdForUpload);
    }
    e.target.value = null;
  };

  const triggerRoomUpload = (roomId) => {
    setSelectedRoomIdForUpload(roomId);
    setTimeout(() => roomPhotoInputRef.current?.click(), 50);
  };

  const handleSetMainCover = (imgUrl) => {
    onChange({ hotelMainImage: imgUrl });
  };

  const handleDeletePhoto = (id, imgUrl) => {
    const updated = hotelImages.filter((img) => img.id !== id);
    const updates = { hotelImages: updated };
    if (data?.hotelMainImage === imgUrl) {
      updates.hotelMainImage = updated[0]?.url || "";
    }
    onChange(updates);
  };

  return (
    <div className="space-y-6 font-sans text-slate-800 animate-fadeIn">
      <div>
        <div className="flex items-center gap-1.5 text-xs font-black text-[#003580] uppercase tracking-wider mb-1">
          <Sparkles size={14} className="text-[#006ce4]" /> Bước 5 / 8: Bộ sưu
          tập hình ảnh
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Hình ảnh cơ sở & Các hạng phòng
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Ảnh bìa chính sẽ hiển thị trực tiếp trên thẻ khách sạn ở Trang chủ và
          trang Danh sách.
        </p>
      </div>

      <div className="p-3.5 bg-[#e8f2ff] border border-blue-200 rounded-2xl flex items-center gap-2.5 text-xs text-[#003580] font-bold">
        <Info size={16} className="text-[#006ce4] shrink-0" />
        <span>
          Vui lòng đăng tải tối thiểu 3 hình ảnh sắc nét về cơ sở lưu trú.
        </span>
      </div>

      {errors?.hotelImages && (
        <p className="text-xs text-rose-500 font-black">{errors.hotelImages}</p>
      )}

      <input
        type="file"
        multiple
        accept="image/*"
        ref={propertyPhotoInputRef}
        onChange={handlePropertyUpload}
        className="hidden"
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
        {propertyPhotos.map((img, idx) => {
          const isMain =
            data?.hotelMainImage === img.url ||
            (!data?.hotelMainImage && idx === 0);

          return (
            <div
              key={img.id || idx}
              onClick={() => handleSetMainCover(img.url)}
              className={`group relative h-48 rounded-2xl overflow-hidden border-2 bg-slate-100 cursor-pointer shadow-xs transition ${
                isMain
                  ? "border-[#006ce4] ring-4 ring-blue-100"
                  : "border-slate-200 hover:border-slate-400"
              }`}
            >
              <img
                src={img.url}
                alt=""
                className="w-full h-full object-cover"
              />

              {isMain ? (
                <span className="absolute top-2.5 left-2.5 bg-[#003580] text-white text-[11px] font-black px-2.5 py-1 rounded-lg shadow-sm flex items-center gap-1">
                  ★ Ảnh bìa chính
                </span>
              ) : (
                <span className="absolute top-2.5 left-2.5 bg-black/70 text-white text-[10px] font-bold px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition">
                  Đặt làm ảnh bìa
                </span>
              )}

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeletePhoto(img.id, img.url);
                }}
                className="absolute top-2.5 right-2.5 w-7 h-7 bg-rose-600 hover:bg-rose-700 text-white rounded-lg flex items-center justify-center shadow transition cursor-pointer"
              >
                <Trash2 size={13} />
              </button>
            </div>
          );
        })}

        <div
          onClick={() =>
            !isCompressing && propertyPhotoInputRef.current?.click()
          }
          className="h-48 border-2 border-dashed border-slate-300 hover:border-[#006ce4] bg-slate-50/50 hover:bg-[#e8f2ff]/30 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition select-none"
        >
          {isCompressing ? (
            <Loader2 size={24} className="animate-spin text-[#006ce4]" />
          ) : (
            <Plus size={24} className="text-[#006ce4]" />
          )}
          <span className="text-xs font-bold text-[#006ce4]">
            {isCompressing ? "Đang xử lý ảnh..." : "Tải thêm ảnh cơ sở"}
          </span>
        </div>
      </div>

      {/* ẢNH CỤ THỂ CHO TỪNG HẠNG PHÒNG */}
      <div className="pt-4 border-t border-slate-100 space-y-4">
        <button
          type="button"
          onClick={() => setOpenRoomPhotos(!openRoomPhotos)}
          className="text-xs font-black text-[#003580] hover:text-[#006ce4] flex items-center gap-1.5 cursor-pointer"
        >
          {openRoomPhotos ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          <span>
            Bộ sưu tập ảnh riêng cho từng hạng phòng ({rooms.length} phòng)
          </span>
        </button>

        <input
          type="file"
          multiple
          accept="image/*"
          ref={roomPhotoInputRef}
          onChange={handleRoomUpload}
          className="hidden"
        />

        {openRoomPhotos && (
          <div className="space-y-4 animate-fadeIn">
            {rooms.map((room, rIdx) => {
              const roomImages = hotelImages.filter(
                (img) => img.roomId === room.id,
              );

              return (
                <div
                  key={room.id || rIdx}
                  className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black text-slate-900">
                        {room.name || `Hạng phòng #${rIdx + 1}`}
                      </h4>
                      <p className="text-[11px] text-slate-500 font-medium">
                        {roomImages.length} ảnh đã gán cho hạng phòng này
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => triggerRoomUpload(room.id)}
                      className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-[#003580] text-xs font-black rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs transition"
                    >
                      <Plus size={13} /> Thêm ảnh phòng
                    </button>
                  </div>

                  {roomImages.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {roomImages.map((img) => (
                        <div
                          key={img.id}
                          className="group relative h-28 rounded-xl overflow-hidden border border-slate-200 bg-white"
                        >
                          <img
                            src={img.url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => handleDeletePhoto(img.id, img.url)}
                            className="absolute top-1.5 right-1.5 w-6 h-6 bg-rose-600 text-white rounded-md flex items-center justify-center shadow cursor-pointer"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic">
                      Chưa có ảnh riêng cho phòng này. Bấm nút để tải ảnh phòng
                      ngủ/phòng tắm.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Step5PhotoGallery;
