// src/components/auth/RegisterForm/Step5PhotoGallery.jsx
import React, { useRef, useState, useMemo } from "react";
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Camera,
  Loader2,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Upload,
} from "lucide-react";

export const Step5PhotoGallery = ({
  data = {},
  onChange = () => {},
  errors = {},
}) => {
  const propertyPhotoInputRef = useRef(null);
  const roomPhotoInputRef = useRef(null);
  const selectedRoomIdRef = useRef(null);

  const [isCompressing, setIsCompressing] = useState(false);
  const [openRoomPhotos, setOpenRoomPhotos] = useState(true);
  const [selectedRoomIdForUpload, setSelectedRoomIdForUpload] = useState(null);

  const hotelImages = data?.hotelImages || [];
  const rooms = data?.rooms || [];

  // Helper trích xuất link ảnh an toàn
  const getImageSrc = (img) => {
    if (!img) return "";
    return typeof img === "string" ? img : img.url || img.path || "";
  };

  // Gom toàn bộ ảnh của tất cả các phòng để loại trừ khỏi ảnh cơ sở
  const allRoomImageUrls = useMemo(() => {
    const set = new Set();
    rooms.forEach((r) => {
      if (r.image) set.add(getImageSrc(r.image));
      if (Array.isArray(r.images)) {
        r.images.forEach((img) => set.add(getImageSrc(img)));
      }
    });
    return set;
  }, [rooms]);

  // 🌟 LỌC RIÊNG ẢNH CƠ SỞ: Loại bỏ ảnh trùng và loại bỏ hoàn toàn ảnh phòng
  const propertyPhotos = useMemo(() => {
    const uniqueList = [];
    const seen = new Set();

    hotelImages.forEach((img) => {
      const src = getImageSrc(img);
      if (!src) return;

      // 1. Nếu là ảnh của phòng -> LOẠI BỎ
      if (img.roomId || img.room_id || allRoomImageUrls.has(src)) return;

      // 2. Nếu đã có trong danh sách -> LOẠI BỎ (Chống trùng lặp)
      if (seen.has(src)) return;

      seen.add(src);
      uniqueList.push(img);
    });

    return uniqueList;
  }, [hotelImages, allRoomImageUrls]);

  // Nén ảnh bằng Canvas trước khi lưu vào State
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
              path: compressed,
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

      if (targetRoomId) {
        // TẢI ẢNH CHO PHÒNG CỤ THỂ
        const updatedRooms = rooms.map((r) => {
          if (r.id === targetRoomId) {
            const currentImgs = Array.isArray(r.images) ? r.images : [];
            const addedUrls = newImages.map((img) => img.url);
            const combined = [...currentImgs, ...addedUrls];
            return {
              ...r,
              images: combined,
              image: combined[0] || "",
              thumbnail: combined[0] || "",
            };
          }
          return r;
        });
        onChange({ rooms: updatedRooms });
      } else {
        // TẢI ẢNH CƠ SỞ (ĐÃ KHỬ TRÙNG LẶP)
        const currentSrcs = new Set(propertyPhotos.map((p) => getImageSrc(p)));
        const filteredNew = newImages.filter(
          (img) => !currentSrcs.has(img.url),
        );

        const updatedImages = [...propertyPhotos, ...filteredNew];
        const updates = { hotelImages: updatedImages };

        if (!data?.hotelMainImage && updatedImages.length > 0) {
          updates.hotelMainImage = getImageSrc(updatedImages[0]);
        }
        onChange(updates);
      }
    } catch (err) {
      console.error("Lỗi tải ảnh:", err);
    } finally {
      setIsCompressing(false);
      selectedRoomIdRef.current = null;
      setSelectedRoomIdForUpload(null);
    }
  };

  const handlePropertyUpload = (e) => {
    processAndUploadFiles(e.target.files, null);
    e.target.value = null;
  };

  const handleRoomUpload = (e) => {
    const targetRoomId = selectedRoomIdRef.current || selectedRoomIdForUpload;
    if (targetRoomId) {
      processAndUploadFiles(e.target.files, targetRoomId);
    }
    e.target.value = null;
  };

  const triggerRoomUpload = (roomId) => {
    selectedRoomIdRef.current = roomId;
    setSelectedRoomIdForUpload(roomId);
    setTimeout(() => roomPhotoInputRef.current?.click(), 50);
  };

  const handleSetMainCover = (imgUrl) => {
    onChange({ hotelMainImage: imgUrl });
  };

  const handleDeletePropertyPhoto = (imgItem, imgUrl) => {
    const updatedImages = propertyPhotos.filter((img) => {
      const src = getImageSrc(img);
      return src !== imgUrl;
    });

    const updates = { hotelImages: updatedImages };
    if (data?.hotelMainImage === imgUrl) {
      updates.hotelMainImage = getImageSrc(updatedImages[0]) || "";
    }
    onChange(updates);
  };

  const handleDeleteRoomPhoto = (roomId, imgUrl) => {
    const updatedRooms = rooms.map((r) => {
      if (r.id === roomId) {
        const currentImgs = Array.isArray(r.images) ? r.images : [];
        const remaining = currentImgs.filter(
          (url) => getImageSrc(url) !== imgUrl,
        );
        return {
          ...r,
          images: remaining,
          image: remaining[0] || "",
          thumbnail: remaining[0] || "",
        };
      }
      return r;
    });
    onChange({ rooms: updatedRooms });
  };

  const hasEnoughPropertyPhotos = propertyPhotos.length >= 3;

  return (
    <div className="space-y-6 font-sans text-slate-800 animate-in fade-in">
      <div>
        <div className="flex items-center gap-1.5 text-xs font-black text-[#003580] uppercase tracking-wider mb-1">
          <Sparkles size={14} className="text-[#006ce4]" /> Bước 5 / 8: Bộ sưu
          tập hình ảnh
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Hình ảnh cơ sở & Các hạng phòng
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Tải ảnh toàn cảnh khách sạn/homestay và kiểm tra ảnh các hạng phòng đã
          tạo ở Bước 3.
        </p>
      </div>

      {/* BANNER THÔNG BÁO TIÊU CHUẨN 3 ẢNH */}
      <div
        className={`p-4 rounded-2xl border flex items-center justify-between gap-3 text-xs transition ${
          hasEnoughPropertyPhotos
            ? "bg-emerald-50 border-emerald-200 text-emerald-900"
            : "bg-amber-50 border-amber-200 text-amber-900"
        }`}
      >
        <div className="flex items-center gap-2.5">
          {hasEnoughPropertyPhotos ? (
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle size={18} className="text-amber-600 shrink-0" />
          )}
          <span>
            <strong>Quy định ảnh cơ sở:</strong> Tải tối thiểu 3 hình ảnh sắc
            nét về mặt tiền, sảnh lễ tân hoặc khuôn viên.
          </span>
        </div>

        <div className="shrink-0 font-black px-3 py-1 bg-white rounded-xl border text-xs shadow-2xs">
          Đã tải:{" "}
          <span
            className={
              hasEnoughPropertyPhotos ? "text-emerald-600" : "text-amber-600"
            }
          >
            {propertyPhotos.length} / 3 ảnh
          </span>
        </div>
      </div>

      {errors?.hotelImages && (
        <p className="text-xs text-rose-500 font-black">{errors.hotelImages}</p>
      )}

      {/* INPUT ẨN */}
      <input
        type="file"
        multiple
        accept="image/*"
        ref={propertyPhotoInputRef}
        onChange={handlePropertyUpload}
        className="hidden"
      />
      <input
        type="file"
        multiple
        accept="image/*"
        ref={roomPhotoInputRef}
        onChange={handleRoomUpload}
        className="hidden"
      />

      {/* 1. KHU VỰC ẢNH CƠ SỞ LƯU TRÚ */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <Camera size={16} className="text-[#006ce4]" /> Ảnh khuôn viên & Mặt
            tiền cơ sở ({propertyPhotos.length} ảnh)
          </h3>
          <span className="text-[11px] text-slate-500 font-semibold">
            * Bấm vào ảnh để chọn làm Ảnh bìa chính
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {propertyPhotos.map((img, idx) => {
            const imgUrl = getImageSrc(img);
            const isMain =
              data?.hotelMainImage === imgUrl ||
              (!data?.hotelMainImage && idx === 0);

            return (
              <div
                key={img.id || idx}
                onClick={() => handleSetMainCover(imgUrl)}
                className={`group relative h-48 rounded-2xl overflow-hidden border-2 bg-slate-100 cursor-pointer shadow-2xs transition ${
                  isMain
                    ? "border-[#006ce4] ring-4 ring-blue-100"
                    : "border-slate-200 hover:border-slate-400"
                }`}
              >
                <img
                  src={imgUrl}
                  alt="Ảnh cơ sở"
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
                    handleDeletePropertyPhoto(img, imgUrl);
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
            className="h-48 border-2 border-dashed border-slate-300 hover:border-[#006ce4] bg-slate-50/60 hover:bg-[#e8f2ff]/30 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition select-none"
          >
            {isCompressing ? (
              <Loader2 size={26} className="animate-spin text-[#006ce4]" />
            ) : (
              <Upload size={26} className="text-[#006ce4]" />
            )}
            <span className="text-xs font-bold text-[#006ce4]">
              {isCompressing ? "Đang nén ảnh..." : "Tải ảnh cơ sở từ máy tính"}
            </span>
            <span className="text-[10px] text-slate-400">
              Mặt tiền, sảnh, nhà hàng, hồ bơi...
            </span>
          </div>
        </div>
      </div>

      {/* 2. BỘ SƯU TẬP ẢNH TỪNG HẠNG PHÒNG */}
      <div className="pt-6 border-t border-slate-200 space-y-4">
        <button
          type="button"
          onClick={() => setOpenRoomPhotos(!openRoomPhotos)}
          className="w-full flex items-center justify-between text-xs font-black text-[#003580] hover:text-[#006ce4] p-3.5 bg-slate-100 rounded-xl cursor-pointer transition"
        >
          <span className="flex items-center gap-2">
            <Camera size={16} /> Bộ sưu tập ảnh riêng cho từng hạng phòng (
            {rooms.length} phòng)
          </span>
          {openRoomPhotos ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {openRoomPhotos && (
          <div className="space-y-4 animate-in fade-in">
            {rooms.map((room, rIdx) => {
              const roomImages =
                Array.isArray(room.images) && room.images.length > 0
                  ? room.images
                  : room.image
                    ? [room.image]
                    : [];

              return (
                <div
                  key={room.id || rIdx}
                  className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-black text-slate-900 flex items-center gap-2">
                        <span className="w-5 h-5 bg-[#003580] text-white text-[10px] font-black rounded flex items-center justify-center">
                          {rIdx + 1}
                        </span>
                        {room.name || `Hạng phòng #${rIdx + 1}`}
                      </h4>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                        {roomImages.length} ảnh phòng thực tế
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={isCompressing}
                      onClick={() => triggerRoomUpload(room.id)}
                      className="px-3.5 py-1.5 bg-[#003580] hover:bg-blue-900 text-white text-xs font-black rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs transition active:scale-95 disabled:opacity-50"
                    >
                      <Plus size={13} /> Thêm ảnh phòng
                    </button>
                  </div>

                  {roomImages.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {roomImages.map((imgUrl, iIdx) => (
                        <div
                          key={iIdx}
                          className="group relative h-28 rounded-xl overflow-hidden border border-slate-200 bg-white shadow-2xs"
                        >
                          <img
                            src={getImageSrc(imgUrl)}
                            alt="Ảnh phòng"
                            className="w-full h-full object-cover"
                          />
                          {iIdx === 0 && (
                            <span className="absolute bottom-1 left-1 bg-[#003580] text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                              Ảnh đại diện phòng
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteRoomPhoto(
                                room.id,
                                getImageSrc(imgUrl),
                              )
                            }
                            className="absolute top-1.5 right-1.5 w-6 h-6 bg-rose-600 text-white rounded-md flex items-center justify-center shadow cursor-pointer opacity-0 group-hover:opacity-100 transition"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div
                      onClick={() => triggerRoomUpload(room.id)}
                      className="h-20 border-2 border-dashed border-slate-200 hover:border-[#006ce4] bg-white rounded-xl flex items-center justify-center gap-2 cursor-pointer transition text-slate-400 hover:text-[#006ce4]"
                    >
                      <Upload size={16} />
                      <span className="text-xs font-semibold">
                        Chưa có ảnh riêng. Bấm vào đây để tải ảnh từ máy tính.
                      </span>
                    </div>
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
