// src/components/auth/RegisterForm/Step3RoomsAndPricing.jsx
import React, { useState } from "react";
import {
  Plus,
  Trash2,
  ChevronDown,
  Sparkles,
  Check,
  Image as ImageIcon,
  Upload,
  X,
} from "lucide-react";

// DANH MỤC PHÂN LOẠI THEO CHUẨN BOOKING.COM
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

// GỢI Ý TÊN PHÒNG CHUẨN THEO LOẠI
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

// Danh sách ảnh mẫu nhanh tiện lợi khi đăng ký
const SAMPLE_ROOM_IMAGES = [
  "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800",
  "https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800",
  "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800",
  "https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800",
  "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=800",
];

export const Step3RoomsAndPricing = ({
  data = {},
  onChange = () => {},
  errors = {},
}) => {
  const rooms = data?.rooms || [];
  const [urlInputs, setUrlInputs] = useState({});

  const handleAddRoom = () => {
    const nextIdx = rooms.length + 1;
    const initialAmount = 10;
    const autoNumbers = Array.from(
      { length: Math.min(initialAmount, 8) },
      (_, i) => `P.${nextIdx}0${i + 1}`,
    ).join(", ");

    const defaultImg =
      SAMPLE_ROOM_IMAGES[(nextIdx - 1) % SAMPLE_ROOM_IMAGES.length];

    const newRoom = {
      id: `room-${Date.now()}`,
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
      image: defaultImg,
      images: [defaultImg],
      roomAmenities: ["air_conditioner", "wifi", "hot_water", "tv_smart"],
    };
    onChange({ rooms: [...rooms, newRoom] });
  };

  const handleUpdateRoom = (roomId, updates) => {
    const updated = rooms.map((r) => {
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
    onChange({ rooms: updated });
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
    onChange({ rooms: rooms.filter((r) => r.id !== roomId) });
  };

  // Thêm ảnh vào hạng phòng
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

  const handlePickSampleImage = (roomId, sampleUrl) => {
    const targetRoom = rooms.find((r) => r.id === roomId);
    const currentImgs = Array.isArray(targetRoom?.images)
      ? targetRoom.images
      : [];
    if (!currentImgs.includes(sampleUrl)) {
      const updated = [...currentImgs, sampleUrl];
      handleUpdateRoom(roomId, {
        images: updated,
        image: updated[0],
        thumbnail: updated[0],
      });
    }
  };

  return (
    <div className="space-y-6 font-sans text-slate-800 animate-fadeIn">
      <div>
        <div className="flex items-center gap-1.5 text-xs font-black text-[#003580] uppercase tracking-wider mb-1">
          <Sparkles size={14} className="text-[#006ce4]" /> Bước 3 / 8: Thiết
          lập phòng & Giá
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Chi tiết hạng phòng & Hình ảnh
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Thiết lập cấu hình phòng chuẩn, tiện nghi và hình ảnh thực tế cho từng
          loại phòng.
        </p>
      </div>

      <div className="space-y-6">
        {rooms.map((room, idx) => {
          const currentCat = room.category || "double";
          const nameOptions = SUGGESTED_NAMES_MAP[currentCat] || [room.name];
          const roomImages = Array.isArray(room.images)
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

              {/* ── 3. HÌNH ẢNH HẠNG PHÒNG (MỚI ĐẦY ĐỦ) ── */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <ImageIcon size={16} className="text-[#006ce4]" /> Hình ảnh
                    hạng phòng ({roomImages.length} ảnh)
                  </label>
                  <span className="text-[11px] text-blue-600 font-semibold">
                    * Ảnh đầu tiên làm ảnh đại diện
                  </span>
                </div>

                {/* Danh sách ảnh đã chọn */}
                {roomImages.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {roomImages.map((imgUrl, imgIdx) => (
                      <div
                        key={imgIdx}
                        className="relative group h-24 rounded-xl overflow-hidden border border-slate-200 bg-white"
                      >
                        <img
                          src={imgUrl}
                          alt="Ảnh phòng"
                          className="w-full h-full object-cover"
                        />
                        {imgIdx === 0 && (
                          <span className="absolute bottom-1 left-1 bg-[#003580] text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow">
                            Ảnh chính
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(room.id, imgIdx)}
                          className="absolute top-1 right-1 w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer shadow"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Nhập link ảnh */}
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="Dán đường dẫn link ảnh phòng (https://...)..."
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
                    className="flex-1 h-10 px-3 text-xs bg-white rounded-xl border border-slate-300 outline-none focus:border-[#006ce4]"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddImageUrl(room.id)}
                    className="px-4 h-10 bg-[#003580] hover:bg-blue-900 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition shadow-xs"
                  >
                    <Plus size={15} /> Thêm ảnh
                  </button>
                </div>

                {/* Gợi ý ảnh phòng đẹp có sẵn */}
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Hoặc chọn nhanh ảnh mẫu có sẵn:
                  </span>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {SAMPLE_ROOM_IMAGES.map((sampleUrl, sIdx) => (
                      <button
                        key={sIdx}
                        type="button"
                        onClick={() =>
                          handlePickSampleImage(room.id, sampleUrl)
                        }
                        className="relative w-16 h-12 rounded-lg overflow-hidden border border-slate-200 shrink-0 hover:border-blue-500 transition cursor-pointer group"
                      >
                        <img
                          src={sampleUrl}
                          alt="sample"
                          className="w-full h-full object-cover group-hover:scale-110 transition"
                        />
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent" />
                      </button>
                    ))}
                  </div>
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
                {/* Giá tiền */}
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

                {/* Hướng nhìn (View) */}
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

                {/* Diện tích */}
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
