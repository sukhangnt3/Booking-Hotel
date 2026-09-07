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
  Check,
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

  // Lọc ảnh cơ sở lưu trú (không gắn room_id) và ảnh phòng (có gắn room_id)
  const propertyPhotos = hotelImages.filter((img) => !img.roomId);

  // ════════════════════════════════════════════════════════════════════════════
  // 📸 NÉN VÀ TẢI NHIỀU ẢNH AN TOÀN BẰNG PROMISE.ALL
  // ════════════════════════════════════════════════════════════════════════════
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
              roomId: targetRoomId, // null: ảnh cơ sở, uuid: ảnh phòng
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

      // Nếu chưa có Main photo thì lấy ảnh đầu tiên làm Main photo
      if (!data?.hotelMainImage && updated.length > 0) {
        updates.hotelMainImage = updated[0].url;
      }

      onChange(updates);
    } catch (err) {
      console.error("Lỗi nén ảnh:", err);
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
    <div className="max-w-3xl mx-auto space-y-8 font-sans text-slate-800 animate-fadeIn">
      {/* ── TIÊU ĐỀ BƯỚC 5 CHUẨN AGODA ── */}
      <div>
        <div className="flex items-center justify-between text-xs text-slate-400 font-bold mb-1">
          <span>Bước 5/6</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Ảnh
        </h1>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          KHU VỰC 1: ẢNH CƠ SỞ LƯU TRÚ (PROPERTY PHOTOS)
      ════════════════════════════════════════════════════════════════════════ */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Ảnh cơ sở lưu trú
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Giới thiệu cơ sở lưu trú của quý đối tác với ảnh chất lượng cao để
            thu hút đơn đặt phòng.
          </p>
        </div>

        {/* Thông báo xanh: "Thêm ít nhất 3 ảnh để tiếp tục" */}
        <div className="p-3.5 bg-blue-50/80 border border-blue-200/90 rounded-2xl flex items-center gap-2.5 text-xs text-blue-900 font-medium">
          <Info size={16} className="text-blue-600 shrink-0" />
          <span>Thêm ít nhất 3 ảnh để tiếp tục</span>
        </div>

        {errors?.hotelImages && (
          <p className="text-xs text-rose-500 font-bold">
            {errors.hotelImages}
          </p>
        )}

        {/* Input file ẩn cho ảnh cơ sở */}
        <input
          type="file"
          multiple
          accept="image/*"
          ref={propertyPhotoInputRef}
          onChange={handlePropertyUpload}
          className="hidden"
        />

        {/* LƯỚI ẢNH CƠ SỞ LƯU TRÚ */}
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
                    ? "border-blue-600 ring-2 ring-blue-600/30"
                    : "border-slate-200 hover:border-slate-400"
                }`}
              >
                <img
                  src={img.url}
                  alt=""
                  className="w-full h-full object-cover"
                />

                {/* Tag "Main photo" chuẩn Agoda */}
                {isMain ? (
                  <span className="absolute top-2.5 left-2.5 bg-white/95 text-slate-900 text-[11px] font-bold px-2.5 py-1 rounded-md shadow-sm flex items-center gap-1">
                    Main photo
                  </span>
                ) : (
                  <span className="absolute top-2.5 left-2.5 bg-black/60 text-white text-[10px] font-medium px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition">
                    Đặt làm ảnh chính
                  </span>
                )}

                {/* Nút xóa ảnh */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeletePhoto(img.id, img.url);
                  }}
                  className="absolute top-2.5 right-2.5 w-7 h-7 bg-rose-600 hover:bg-rose-700 text-white rounded-lg flex items-center justify-center shadow-md transition cursor-pointer opacity-80 hover:opacity-100"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })}

          {/* Ô BỔ SUNG ẢNH (DẠNG NÉT ĐỨT CHUẨN AGODA) */}
          <div
            onClick={() =>
              !isCompressing && propertyPhotoInputRef.current?.click()
            }
            className="h-48 border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50/50 hover:bg-blue-50/30 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition select-none"
          >
            {isCompressing ? (
              <Loader2 size={24} className="animate-spin text-blue-600" />
            ) : (
              <Plus size={24} className="text-blue-600" />
            )}
            <span className="text-xs font-bold text-blue-600">
              {isCompressing ? "Đang xử lý ảnh..." : "Bổ sung ảnh"}
            </span>
          </div>
        </div>

        {/* Link "Need some tips?" chuẩn Agoda */}
        <div>
          <button
            type="button"
            onClick={() => setShowTips(!showTips)}
            className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1.5 cursor-pointer"
          >
            <Lightbulb size={14} /> Need some tips? (Mẹo chụp ảnh đẹp)
          </button>

          {showTips && (
            <div className="mt-2 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-600 space-y-1 animate-fadeIn">
              <p>
                • Chụp vào ban ngày với ánh sáng tự nhiên, góc chụp rộng toàn
                cảnh.
              </p>
              <p>
                • Nên có ảnh mặt tiền, sảnh đón tiếp, quang cảnh bên ngoài và
                tiện ích chung.
              </p>
              <p>
                • Độ phân giải tối thiểu 1280 × 900 pixel để hiển thị sắc nét
                nhất.
              </p>
            </div>
          )}
        </div>
      </div>

      <hr className="border-slate-100" />

      {/* ════════════════════════════════════════════════════════════════════════
          KHU VỰC 2: ẢNH PHÒNG (ROOM PHOTOS - ACCORDION AGODA)
      ════════════════════════════════════════════════════════════════════════ */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Ảnh phòng</h2>
          <p className="text-xs text-slate-500 mt-1">
            Quý đối tác có thể thêm ảnh ngay lúc này hoặc sau khi trang thông
            tin đã được đăng tải.
          </p>
        </div>

        {/* Nút bấm "∨ Bổ sung ảnh" dạng Accordion của Agoda */}
        <button
          type="button"
          onClick={() => setOpenRoomPhotos(!openRoomPhotos)}
          className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1.5 cursor-pointer transition py-1"
        >
          {openRoomPhotos ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          <span>Bổ sung ảnh phòng ({rooms.length} phòng)</span>
        </button>

        {/* Input ẩn cho upload ảnh phòng */}
        <input
          type="file"
          multiple
          accept="image/*"
          ref={roomPhotoInputRef}
          onChange={handleRoomUpload}
          className="hidden"
        />

        {/* DANH SÁCH CÁC PHÒNG ĐỂ TẢI ẢNH RIÊNG */}
        {openRoomPhotos && (
          <div className="space-y-4 pt-1 animate-fadeIn">
            {rooms.map((room, rIdx) => {
              const roomImages = hotelImages.filter(
                (img) => img.roomId === room.id,
              );

              return (
                <div
                  key={room.id || rIdx}
                  className="p-5 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">
                        {room.name || `Phòng #${rIdx + 1}`}
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        {roomImages.length} ảnh đã tải cho phòng này
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => triggerRoomUpload(room.id)}
                      className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-2xs transition"
                    >
                      <Plus size={13} /> Thêm ảnh phòng này
                    </button>
                  </div>

                  {/* Lưới ảnh riêng của phòng này */}
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
                            className="absolute top-1.5 right-1.5 w-6 h-6 bg-rose-600 text-white rounded-md flex items-center justify-center shadow opacity-80 hover:opacity-100 transition cursor-pointer"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic">
                      Chưa có ảnh nào cho phòng này. Bấm "Thêm ảnh phòng này" để
                      tải ảnh phòng ngủ/phòng tắm.
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
