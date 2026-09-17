// src/components/auth/RegisterForm/Step3RoomsAndPricing.jsx
import React, { useState, useRef } from "react";
import {
  Plus,
  Trash2,
  ChevronDown,
  Sparkles,
  Check,
  Image as ImageIcon,
  Upload,
  X,
  Loader2,
} from "lucide-react";

export const ROOM_CATEGORIES = [
  {
    id: "double",
    name: "Phòng giường đôi",
    defaultBed: "1 Giường đôi lớn (King/Queen Size)",
    capacity: 2,
  },
  {
    id: "twin",
    name: "Phòng 2 giường đơn",
    defaultBed: "2 Giường đơn (Twin Bed)",
    capacity: 2,
  },
  {
    id: "single",
    name: "Phòng đơn (1 người)",
    defaultBed: "1 Giường đơn",
    capacity: 1,
  },
  {
    id: "family",
    name: "Phòng gia đình",
    defaultBed: "1 Giường đôi + 1 Giường đơn",
    capacity: 3,
  },
  {
    id: "suite",
    name: "Phòng Suite",
    defaultBed: "1 Giường đôi cực lớn (King Bed)",
    capacity: 2,
  },
  {
    id: "dorm",
    name: "Phòng tập thể (Dorm)",
    defaultBed: "Giường tầng",
    capacity: 4,
  },
];

export const SUGGESTED_NAMES_MAP = {
  double: [
    "Phòng Deluxe Giường Đôi",
    "Phòng Tiêu Chuẩn Giường Đôi",
    "Phòng Superior Giường Đôi",
    "Phòng Executive Giường Đôi",
  ],
  twin: [
    "Phòng Tiêu Chuẩn 2 Giường Đơn",
    "Phòng Deluxe 2 Giường Đơn",
    "Phòng Superior 2 Giường Đơn",
  ],
  single: ["Phòng Tiêu Chuẩn Giường Đơn", "Phòng Đơn Nhỏ (Cozy Single)"],
  family: [
    "Phòng Gia Đình Tiêu Chuẩn",
    "Phòng Gia Đình Hướng Biển",
    "Phòng Gia Đình Cao Cấp",
  ],
  suite: [
    "Phòng Suite Executive",
    "Phòng Suite Tân Hôn (Honeymoon Suite)",
    "Phòng Suite Tổng Thống (Presidential Suite)",
  ],
  dorm: ["Phòng Tập Thể 4 Giường", "Phòng Tập Thể 6 Giường"],
};

export const ROOM_VIEWS = [
  { value: "city_view", label: "Hướng thành phố (City View)" },
  { value: "sea_view", label: "Hướng biển (Ocean View)" },
  { value: "pool_view", label: "Hướng hồ bơi (Pool View)" },
  { value: "garden_view", label: "Hướng vườn (Garden View)" },
  { value: "mountain_view", label: "Hướng núi / Đồi" },
  { value: "internal_view", label: "Hướng nội khu" },
];

export const ROOM_AMENITIES_OPTIONS = [
  { id: "air_conditioner", label: "Điều hòa máy lạnh" },
  { id: "tv_smart", label: "Smart TV" },
  { id: "wifi", label: "Wi-Fi miễn phí" },
  { id: "hot_water", label: "Bình nóng lạnh" },
  { id: "bathtub", label: "Bồn tắm nằm" },
  { id: "balcony", label: "Ban công / Sân hiên" },
  { id: "hair_dryer", label: "Máy sấy tóc" },
  { id: "refrigerator", label: "Tủ lạnh / Minibar" },
  { id: "kettle", label: "Ấm đun siêu tốc" },
  { id: "toiletries", label: "Đồ vệ sinh cá nhân" },
];

export const Step3RoomsAndPricing = ({
  data = {},
  onChange = () => {},
  errors = {},
}) => {
  const rooms = data?.rooms || [];
  const hotelImages = data?.hotelImages || [];

  const fileInputRef = useRef(null);
  const activeRoomIdRef = useRef(null);
  const [activeRoomId, setActiveRoomId] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [urlInputs, setUrlInputs] = useState({});

  const compressImageFile = (file) => {
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
          resolve(compressed);
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleAddRoom = () => {
    const nextIdx = rooms.length + 1;
    const initialAmount = 10;
    const autoNumbers = Array.from(
      { length: Math.min(initialAmount, 8) },
      (_, i) => `P.${nextIdx}0${i + 1}`,
    ).join(", ");

    const newRoom = {
      id: `room-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      category: "double",
      name: "Phòng Deluxe Giường Đôi",
      custom_name: "Deluxe Double Room",
      smoking_policy: "non_smoking",
      amount: initialAmount,
      roomNumbersText: autoNumbers,
      type: "Deluxe",
      room_view: "city_view",
      bed_type: "1 Giường đôi lớn (King/Queen Size)",
      room_area: 28,
      capacity: 2,
      base_price: 650000,
      description: "Phòng nghỉ hiện đại, tiện nghi.",
      image: "",
      images: [],
      thumbnail: "",
      roomAmenities: ["air_conditioner", "wifi", "hot_water", "tv_smart"],
    };
    onChange({ rooms: [...rooms, newRoom] });
  };

  const handleUpdateRoom = (roomId, updates) => {
    const updatedRooms = rooms.map((r) => {
      if (r.id !== roomId) return r;
      const merged = { ...r, ...updates };

      if (updates.amount !== undefined) {
        const count = Math.max(1, Number(updates.amount) || 1);
        merged.amount = count;
        if (!r.roomNumbersText || r.roomNumbersText.includes("P.")) {
          merged.roomNumbersText =
            Array.from(
              { length: Math.min(count, 8) },
              (_, i) => `P.10${i + 1}`,
            ).join(", ") + (count > 8 ? `... (+${count - 8} phòng)` : "");
        }
      }

      return merged;
    });

    // 🌟 ĐỒNG BỘ ĐA TẦNG: Lưu cả vào rooms, roomImages map và hotelImages có gắn roomId 🌟
    const payload = { rooms: updatedRooms };

    if (updates.images !== undefined) {
      // Giữ nguyên ảnh cơ sở (không có roomId) và ảnh của phòng khác
      const otherImgs = hotelImages.filter((img) => img.roomId !== roomId);
      const newRoomImgs = updates.images.map((url, i) => ({
        id: `img-${roomId}-${i}-${Date.now()}`,
        url,
        roomId: roomId,
        title: `Ảnh phòng ${roomId}`,
      }));
      payload.hotelImages = [...otherImgs, ...newRoomImgs];

      // Lưu map roomImages để backend đọc trực tiếp
      payload.roomImages = {
        ...(data?.roomImages || {}),
        [roomId]: updates.images,
      };
    }

    onChange(payload);
  };

  const handleCategoryChange = (roomId, newCategory) => {
    const matchedCategory = ROOM_CATEGORIES.find((c) => c.id === newCategory);
    const suggestedNames = SUGGESTED_NAMES_MAP[newCategory] || [
      "Phòng Tiêu Chuẩn",
    ];

    handleUpdateRoom(roomId, {
      category: newCategory,
      name: suggestedNames[0],
      custom_name: suggestedNames[0],
      bed_type: matchedCategory?.defaultBed || "1 Giường đôi",
      capacity: matchedCategory?.capacity || 2,
    });
  };

  const toggleRoomAmenity = (roomId, currentList = [], amenityId) => {
    const exists = currentList.includes(amenityId);
    const updated = exists
      ? currentList.filter((a) => a !== amenityId)
      : [...currentList, amenityId];
    handleUpdateRoom(roomId, { roomAmenities: updated, amenities: updated });
  };

  const handleDeleteRoom = (roomId) => {
    if (rooms.length <= 1) {
      alert("Cơ sở cần tối thiểu 1 loại phòng để sẵn sàng mở bán.");
      return;
    }
    const updatedRooms = rooms.filter((r) => r.id !== roomId);
    const updatedHotelImages = hotelImages.filter(
      (img) => img.roomId !== roomId,
    );
    onChange({ rooms: updatedRooms, hotelImages: updatedHotelImages });
  };

  const triggerComputerUpload = (roomId) => {
    activeRoomIdRef.current = roomId;
    setActiveRoomId(roomId);
    if (fileInputRef.current) {
      fileInputRef.current.value = null;
      fileInputRef.current.click();
    }
  };

  const handleFilesSelected = async (e) => {
    const files = e.target.files;
    const targetId = activeRoomIdRef.current || activeRoomId;
    if (!files || files.length === 0 || !targetId) return;

    setIsProcessing(true);
    try {
      const compressedUrls = await Promise.all(
        Array.from(files).map((f) => compressImageFile(f)),
      );

      const targetRoom = rooms.find((r) => r.id === targetId);
      const currentImgs = Array.isArray(targetRoom?.images)
        ? targetRoom.images
        : targetRoom?.image
          ? [targetRoom.image]
          : [];

      const updated = [...currentImgs, ...compressedUrls];

      // Gán chặt chẽ vào cả 3 trường
      handleUpdateRoom(targetId, {
        images: updated,
        image: updated[0] || "",
        thumbnail: updated[0] || "",
      });
    } catch (err) {
      console.error("Lỗi tải ảnh từ máy tính:", err);
    } finally {
      setIsProcessing(false);
      setActiveRoomId(null);
      activeRoomIdRef.current = null;
    }
  };

  const handleAddImageUrl = (roomId) => {
    const url = (urlInputs[roomId] || "").trim();
    if (!url) return;
    const targetRoom = rooms.find((r) => r.id === roomId);
    const currentImgs = Array.isArray(targetRoom?.images)
      ? targetRoom.images
      : targetRoom?.image
        ? [targetRoom.image]
        : [];
    const updated = [...currentImgs, url];
    handleUpdateRoom(roomId, {
      images: updated,
      image: updated[0],
      thumbnail: updated[0],
    });
    setUrlInputs((prev) => ({ ...prev, [roomId]: "" }));
  };

  const handleRemoveImage = (roomId, indexToRemove) => {
    const targetRoom = rooms.find((r) => r.id === roomId);
    const currentImgs = Array.isArray(targetRoom?.images)
      ? targetRoom.images
      : [];
    const updated = currentImgs.filter((_, idx) => idx !== indexToRemove);
    handleUpdateRoom(roomId, {
      images: updated,
      image: updated[0] || "",
      thumbnail: updated[0] || "",
    });
  };

  return (
    <div className="space-y-6 font-sans text-slate-800 animate-fadeIn">
      <input
        type="file"
        multiple
        accept="image/*"
        ref={fileInputRef}
        onChange={handleFilesSelected}
        className="hidden"
      />

      <div>
        <div className="flex items-center gap-1.5 text-xs font-black text-[#003580] uppercase tracking-wider mb-1">
          <Sparkles size={14} className="text-[#006ce4]" /> Bước 3 / 8: Thiết
          lập phòng & Giá
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Chi tiết hạng phòng & Hình ảnh
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Tải ảnh xe/ảnh phòng thực tế từ máy tính, thiết lập cấu hình giường và
          giá niêm yết.
        </p>
      </div>

      <div className="space-y-6">
        {rooms.map((room, idx) => {
          const currentCat = room.category || "double";
          const nameOptions = SUGGESTED_NAMES_MAP[currentCat] || [room.name];

          const roomImages =
            Array.isArray(room.images) && room.images.length > 0
              ? room.images
              : room.image
                ? [room.image]
                : [];

          return (
            <div
              key={room.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 space-y-5 shadow-xs"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-base font-black text-[#003580] flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-[#003580] text-white text-xs flex items-center justify-center font-black">
                    {idx + 1}
                  </span>
                  {room.name || `Hạng phòng #${idx + 1}`}
                </h3>
                {rooms.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleDeleteRoom(room.id)}
                    className="text-xs font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 size={14} /> Xóa phòng
                  </button>
                )}
              </div>

              {/* ── 1. LOẠI PHÒNG ── */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Loại phòng
                </label>
                <div className="relative">
                  <select
                    value={room.category || "double"}
                    onChange={(e) =>
                      handleCategoryChange(room.id, e.target.value)
                    }
                    className="w-full h-11 px-3.5 text-xs sm:text-sm font-semibold bg-white rounded-xl border border-slate-300 appearance-none cursor-pointer outline-none focus:border-[#006ce4]"
                  >
                    {ROOM_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={18}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  />
                </div>
              </div>

              {/* ── 2. TÊN PHÒNG & TÊN TÙY CHỌN ── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tên phòng
                  </label>
                  <div className="relative">
                    <select
                      value={room.name || nameOptions[0]}
                      onChange={(e) =>
                        handleUpdateRoom(room.id, {
                          name: e.target.value,
                          type: e.target.value.includes("Deluxe")
                            ? "Deluxe"
                            : "Standard",
                        })
                      }
                      className="w-full h-11 px-3.5 text-xs sm:text-sm font-bold bg-white rounded-xl border border-slate-300 appearance-none cursor-pointer outline-none focus:border-[#006ce4]"
                    >
                      {nameOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={18}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-tight">
                    Tên hiển thị công khai trên website cho khách đặt phòng.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tên tùy chọn (không bắt buộc)
                  </label>
                  <input
                    type="text"
                    value={room.custom_name || ""}
                    onChange={(e) =>
                      handleUpdateRoom(room.id, { custom_name: e.target.value })
                    }
                    placeholder="VD: Deluxe Double Room"
                    className="w-full h-11 px-3.5 text-xs sm:text-sm font-medium bg-white rounded-xl border border-slate-300 outline-none focus:border-[#006ce4]"
                  />
                  <p className="text-[11px] text-slate-400 mt-1 leading-tight">
                    Tên nội bộ dùng riêng cho cơ sở lưu trú.
                  </p>
                </div>
              </div>

              {/* ── 3. HÌNH ẢNH RIÊNG CỦA HẠNG PHÒNG NÀY ── */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <ImageIcon size={16} className="text-[#006ce4]" /> Hình
                      ảnh hạng phòng ({roomImages.length} ảnh)
                    </label>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Ảnh này chỉ hiển thị riêng cho hạng phòng này, không bị
                      lẫn vào ảnh cơ sở.
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => triggerComputerUpload(room.id)}
                    className="px-4 py-2 bg-[#003580] hover:bg-blue-900 text-white text-xs font-black rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-sm transition active:scale-95 disabled:opacity-50"
                  >
                    {isProcessing && activeRoomId === room.id ? (
                      <>
                        <Loader2 size={14} className="animate-spin" /> Đang
                        tải...
                      </>
                    ) : (
                      <>
                        <Upload size={14} /> Tải ảnh từ máy tính
                      </>
                    )}
                  </button>
                </div>

                {roomImages.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                    {roomImages.map((imgUrl, imgIdx) => (
                      <div
                        key={imgIdx}
                        className="relative group h-28 rounded-xl overflow-hidden border border-slate-200 bg-white shadow-xs"
                      >
                        <img
                          src={imgUrl}
                          alt={`Ảnh phòng ${imgIdx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        {imgIdx === 0 && (
                          <span className="absolute bottom-1.5 left-1.5 bg-[#003580] text-white text-[9px] font-black px-2 py-0.5 rounded shadow">
                            Ảnh chính phòng
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(room.id, imgIdx)}
                          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-md bg-rose-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer shadow"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    onClick={() => triggerComputerUpload(room.id)}
                    className="h-28 border-2 border-dashed border-slate-300 hover:border-[#006ce4] bg-white rounded-xl flex flex-col items-center justify-center gap-1.5 cursor-pointer transition text-slate-500 hover:text-[#006ce4]"
                  >
                    <Upload size={22} />
                    <span className="text-xs font-bold">
                      Bấm vào đây để chọn ảnh xe/ảnh phòng từ máy tính
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Hỗ trợ định dạng JPG, PNG, WEBP
                    </span>
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <input
                    type="url"
                    placeholder="Hoặc dán link ảnh trực tuyến (https://...)..."
                    value={urlInputs[room.id] || ""}
                    onChange={(e) =>
                      setUrlInputs({ ...urlInputs, [room.id]: e.target.value })
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddImageUrl(room.id);
                      }
                    }}
                    className="flex-1 h-9 px-3 text-xs bg-white rounded-xl border border-slate-300 outline-none focus:border-[#006ce4]"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddImageUrl(room.id)}
                    className="px-3 h-9 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer transition"
                  >
                    <Plus size={14} /> Thêm link
                  </button>
                </div>
              </div>

              {/* ── 4. SỐ PHÒNG (LOẠI NÀY) ── */}
              <div className="w-full sm:w-1/3">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Số phòng (loại này)
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={room.amount || 1}
                  onChange={(e) =>
                    handleUpdateRoom(room.id, {
                      amount: Number(e.target.value),
                    })
                  }
                  className="w-full h-11 px-3.5 text-sm font-black bg-white rounded-xl border border-slate-300 outline-none focus:border-[#006ce4]"
                />
              </div>

              <hr className="border-slate-100 my-2" />

              {/* ── 5. GIÁ, DIỆN TÍCH, HƯỚNG VIEW ── */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-[#e8f2ff]/40 rounded-xl border border-blue-200 p-3">
                  <label className="block text-[11px] font-black text-[#003580] uppercase tracking-wider mb-1">
                    Giá niêm yết / đêm *
                  </label>
                  <div className="flex items-center justify-between">
                    <input
                      type="text"
                      value={Number(room.base_price || 0).toLocaleString(
                        "vi-VN",
                      )}
                      onChange={(e) =>
                        handleUpdateRoom(room.id, {
                          base_price: Number(e.target.value.replace(/\./g, "")),
                        })
                      }
                      className="w-full text-base font-black text-[#ff6a00] bg-transparent outline-none"
                    />
                    <span className="text-xs font-black text-slate-500 shrink-0 ml-1">
                      ₫
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Hướng phòng (View)
                  </label>
                  <div className="relative">
                    <select
                      value={room.room_view || "city_view"}
                      onChange={(e) =>
                        handleUpdateRoom(room.id, { room_view: e.target.value })
                      }
                      className="w-full h-11 px-3 text-xs font-semibold bg-white rounded-xl border border-slate-300 appearance-none cursor-pointer outline-none focus:border-[#006ce4]"
                    >
                      {ROOM_VIEWS.map((v) => (
                        <option key={v.value} value={v.value}>
                          {v.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={16}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Diện tích phòng (m²)
                  </label>
                  <input
                    type="number"
                    value={room.room_area || 28}
                    onChange={(e) =>
                      handleUpdateRoom(room.id, {
                        room_area: Number(e.target.value),
                      })
                    }
                    className="w-full h-11 px-3 text-xs font-bold bg-white rounded-xl border border-slate-300 outline-none focus:border-[#006ce4]"
                  />
                </div>
              </div>

              {/* ── 6. TIỆN NGHI HẠNG PHÒNG ── */}
              <div>
                <label className="block text-[11px] font-black text-slate-600 uppercase tracking-wider mb-2">
                  Tiện nghi có trong hạng phòng:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {ROOM_AMENITIES_OPTIONS.map((am) => {
                    const isChecked = (room.roomAmenities || []).includes(
                      am.id,
                    );
                    return (
                      <div
                        key={am.id}
                        onClick={() =>
                          toggleRoomAmenity(
                            room.id,
                            room.roomAmenities || [],
                            am.id,
                          )
                        }
                        className={`p-2 rounded-lg border text-xs flex items-center gap-2 cursor-pointer transition select-none ${
                          isChecked
                            ? "bg-[#e8f2ff] border-[#006ce4] text-[#003580] font-bold"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${
                            isChecked
                              ? "bg-[#006ce4] text-white"
                              : "border border-slate-300"
                          }`}
                        >
                          {isChecked && <Check size={11} strokeWidth={3} />}
                        </div>
                        <span className="truncate">{am.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div>
        <button
          type="button"
          onClick={handleAddRoom}
          className="px-6 h-11 border-2 border-[#003580] text-[#003580] hover:bg-blue-50 font-black text-xs rounded-xl flex items-center gap-2 cursor-pointer transition active:scale-95 shadow-xs"
        >
          <Plus size={16} /> Thêm hạng phòng
        </button>
      </div>
    </div>
  );
};

export default Step3RoomsAndPricing;
