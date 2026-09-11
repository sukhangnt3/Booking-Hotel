// src/components/auth/RegisterForm/Step3RoomsAndPricing.jsx
import React from "react";
import {
  Plus,
  Trash2,
  Minus,
  Key,
  Wand2,
  ChevronDown,
  Sparkles,
  Eye,
  Check,
  CigaretteOff,
  Bed,
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

export const Step3RoomsAndPricing = ({
  data = {},
  onChange = () => {},
  errors = {},
}) => {
  const rooms = data?.rooms || [];

  const handleAddRoom = () => {
    const nextIdx = rooms.length + 1;
    const initialAmount = 10;
    const autoNumbers = Array.from(
      { length: Math.min(initialAmount, 8) },
      (_, i) => `P.${nextIdx}0${i + 1}`,
    ).join(", ");

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
      roomAmenities: [
        "air_conditioner",
        "tv_smart",
        "wifi",
        "hot_water",
        "hair_dryer",
        "toiletries",
      ],
    };
    onChange({ rooms: [...rooms, newRoom] });
  };

  const handleUpdateRoom = (roomId, updates) => {
    const updated = rooms.map((r) => {
      if (r.id !== roomId) return r;
      const merged = { ...r, ...updates };

      // Khi người dùng thay đổi Số phòng (loại này) -> tự sinh danh sách số phòng thực tế
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

  // Đổi loại phòng -> tự động cập nhật gợi ý tên phòng & số giường mặc định
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
    handleUpdateRoom(roomId, { roomAmenities: updated });
  };

  const handleDeleteRoom = (roomId) => {
    if (rooms.length <= 1) {
      alert("Cơ sở cần tối thiểu 1 loại phòng để sẵn sàng mở bán.");
      return;
    }
    onChange({ rooms: rooms.filter((r) => r.id !== roomId) });
  };

  return (
    <div className="space-y-6 font-sans text-slate-800 animate-fadeIn">
      <div>
        <div className="flex items-center gap-1.5 text-xs font-black text-[#003580] uppercase tracking-wider mb-1">
          <Sparkles size={14} className="text-[#006ce4]" /> Bước 3 / 8: Thiết
          lập phòng & Giá
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Chi tiết hạng phòng của bạn
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Thiết lập cấu hình phòng theo tiêu chuẩn hiển thị của Booking.com &
          Agoda.
        </p>
      </div>

      <div className="space-y-6">
        {rooms.map((room, idx) => {
          const currentCat = room.category || "double";
          const nameOptions = SUGGESTED_NAMES_MAP[currentCat] || [room.name];

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

              {/* ── 1. LOẠI PHÒNG (ROOM CATEGORY) ── */}
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

              {/* ── 2. TÊN PHÒNG & TÊN TÙY CHỌN (KHỚP 100% ẢNH CHỤP) ── */}
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
                    Đây là tên mà khách sẽ thấy trên trang web GoStay /
                    Booking.com.
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
                    Tạo tên tùy chọn cho riêng Quý vị tham khảo (không bắt
                    buộc).
                  </p>
                </div>
              </div>

              {/* ── 3. CHÍNH SÁCH VỀ HÚT THUỐC (KHỚP 100% ẢNH CHỤP) ── */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Chính sách về hút thuốc
                </label>
                <div className="relative">
                  <select
                    value={room.smoking_policy || "non_smoking"}
                    onChange={(e) =>
                      handleUpdateRoom(room.id, {
                        smoking_policy: e.target.value,
                      })
                    }
                    className="w-full h-11 px-3.5 text-xs sm:text-sm font-semibold bg-white rounded-xl border border-slate-300 appearance-none cursor-pointer outline-none focus:border-[#006ce4]"
                  >
                    <option value="non_smoking">Không hút thuốc</option>
                    <option value="smoking_allowed">Được phép hút thuốc</option>
                  </select>
                  <ChevronDown
                    size={18}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  />
                </div>
              </div>

              {/* ── 4. SỐ PHÒNG (LOẠI NÀY) (KHỚP 100% ẢNH CHỤP) ── */}
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

              {/* ── 5. CÁC TRƯỜNG THIẾT YẾU CHO HOTEL DETAIL CỦA GOSTAY (GIÁ, DIỆN TÍCH, VIEW) ── */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Giá tiền */}
                <div className="bg-[#e8f2ff]/40 rounded-xl border border-blue-200 p-3">
                  <label className="block text-[11px] font-black text-[#003580] uppercase tracking-wider mb-1">
                    Giá niêm yết / đêm *
                  </label>
                  <div className="flex items-center justify-between">
                    <input
                      type="number"
                      step="10000"
                      value={room.base_price || 0}
                      onChange={(e) =>
                        handleUpdateRoom(room.id, {
                          base_price: Number(e.target.value),
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

              {/* Tiện nghi phòng */}
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
          <Plus size={16} /> Thêm hạng phòng khác
        </button>
      </div>
    </div>
  );
};

export default Step3RoomsAndPricing;
