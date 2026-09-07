// src/components/auth/RegisterForm/Step3RoomsAndPricing.jsx
import React, { useState } from "react";
import {
  Lightbulb,
  Plus,
  Trash2,
  Minus,
  Key,
  Wand2,
  ChevronDown,
} from "lucide-react";

export const ROOM_TYPES = [
  "Phòng Tiêu Chuẩn (Standard)",
  "Phòng Cao Cấp (Deluxe)",
  "Phòng Suite Sang Trọng",
  "Phòng Studio",
  "Phòng Gia Đình (Family)",
  "Căn Hộ (Apartment)",
  "Biệt Thự (Villa)",
];

export const Step3RoomsAndPricing = ({
  data = {},
  onChange = () => {},
  errors = {},
}) => {
  const rooms = data?.rooms || [];
  const [pricingMode, setPricingMode] = useState("manual"); // "manual" hoặc "channel_manager"

  const handleAddRoom = () => {
    const nextIdx = rooms.length + 1;
    const initialCount = 4;
    const autoNumbers = Array.from(
      { length: initialCount },
      (_, i) => `P.${nextIdx}0${i + 1}`,
    ).join(", ");

    const newRoom = {
      id: `room-${Date.now()}`,
      name: `Phòng Cao Cấp (Deluxe) #${nextIdx}`,
      type: "Deluxe",
      room_view: "city_view",
      bed_type: "1 Giường đôi lớn (King/Queen Size)",
      room_area: 28,
      capacity: 2,
      amount: initialCount,
      roomNumbersText: autoNumbers,
      base_price: 650000,
      description: "Phòng nghỉ hiện đại, tiện nghi.",
      roomAmenities: [
        "air_conditioner",
        "tv_smart",
        "minibar",
        "hot_water_shower",
      ],
    };
    onChange({ rooms: [...rooms, newRoom] });
  };

  const handleUpdateRoom = (roomId, updates) => {
    const updated = rooms.map((r) => {
      if (r.id !== roomId) return r;
      const merged = { ...r, ...updates };

      if (updates.roomNumbersText !== undefined) {
        const count = updates.roomNumbersText
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean).length;
        merged.amount = count > 0 ? count : 1;
      }
      return merged;
    });
    onChange({ rooms: updated });
  };

  const handleCapacityChange = (roomId, currentVal, delta) => {
    const nextVal = Math.max(1, Math.min(10, Number(currentVal || 1) + delta));
    handleUpdateRoom(roomId, { capacity: nextVal });
  };

  const handleDeleteRoom = (roomId) => {
    if (rooms.length <= 1) {
      alert("Cơ sở cần tối thiểu 1 loại phòng để sẵn sàng mở bán.");
      return;
    }
    onChange({ rooms: rooms.filter((r) => r.id !== roomId) });
  };

  const handleAutoGenerateRoomNumbers = (roomId, floorNumber, count) => {
    const generated = Array.from(
      { length: count },
      (_, i) => `P.${floorNumber}0${i + 1}`,
    ).join(", ");
    handleUpdateRoom(roomId, { roomNumbersText: generated, amount: count });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 font-sans text-slate-800 animate-fadeIn">
      {/* ── TIÊU ĐỀ AGODA STYLE ── */}
      <div>
        <div className="flex items-center justify-between text-xs text-slate-400 font-bold mb-1">
          <span>Bước 3/5</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Thiết lập phòng & giá của bạn
        </h1>
      </div>

      {/* ── HỘP MẸO XANH DƯƠNG CHUẨN AGODA (TIP BANNER) ── */}
      <div className="p-4 bg-blue-50/80 border border-blue-200/90 rounded-2xl flex items-start gap-3 text-xs text-blue-900 leading-relaxed">
        <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
          <Lightbulb size={12} />
        </div>
        <p>
          <strong>Mẹo:</strong> Bắt đầu với một phòng riêng lẻ. Dễ dàng thêm
          nhiều phòng hơn sau khi hoàn tất đăng thông tin.
        </p>
      </div>

      {/* ── CÁCH QUÝ ĐỐI TÁC SẼ QUẢN LÝ GIÁ ── */}
      <div className="space-y-3 pt-1">
        <h2 className="text-base font-bold text-slate-900">
          Cách quý đối tác sẽ quản lý giá
        </h2>
        <div className="space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="radio"
              name="pricingMode"
              checked={pricingMode === "manual"}
              onChange={() => setPricingMode("manual")}
              className="w-4 h-4 mt-1 accent-blue-600 cursor-pointer"
            />
            <div className="text-xs">
              <span className="font-bold text-slate-900 block">
                Thiết lập giá theo cách thủ công
              </span>
              <span className="text-slate-500">
                Quản lý trực tiếp giá mỗi đêm thông qua hệ thống.
              </span>
            </div>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="radio"
              name="pricingMode"
              checked={pricingMode === "channel_manager"}
              onChange={() => setPricingMode("channel_manager")}
              className="w-4 h-4 mt-1 accent-blue-600 cursor-pointer"
            />
            <div className="text-xs">
              <span className="font-bold text-slate-900 block">
                Kết nối với bộ quản lý kênh
              </span>
              <span className="text-slate-500">
                Quản lý giá và tình trạng phòng trống thông qua nền tảng bên thứ
                ba.
              </span>
            </div>
          </label>
        </div>
      </div>

      {/* ── DANH SÁCH CÁC CĂN / PHÒNG (ROOM 1, ROOM 2...) ── */}
      <div className="space-y-5">
        {rooms.map((room, idx) => (
          <div
            key={room.id}
            className="rounded-3xl border border-slate-200 bg-slate-50/50 p-6 space-y-4 shadow-xs"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900">
                Room {idx + 1}
              </h3>
              {rooms.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleDeleteRoom(room.id)}
                  className="text-xs font-bold text-rose-500 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 size={13} /> Xóa phòng
                </button>
              )}
            </div>

            {/* Hàng 1: Loại phòng & Kích thước mét vuông */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="relative">
                <select
                  value={room.name || "Phòng Cao Cấp (Deluxe)"}
                  onChange={(e) =>
                    handleUpdateRoom(room.id, {
                      name: e.target.value,
                      type: e.target.value,
                    })
                  }
                  className="w-full h-12 px-4 text-xs font-semibold bg-white rounded-xl border border-slate-300 text-slate-900 appearance-none cursor-pointer outline-none focus:border-blue-600"
                >
                  {ROOM_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={18}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
              </div>

              <div className="relative flex items-center">
                <input
                  type="number"
                  value={room.room_area || 28}
                  onChange={(e) =>
                    handleUpdateRoom(room.id, {
                      room_area: Number(e.target.value),
                    })
                  }
                  placeholder="Kích thước phòng"
                  className="w-full h-12 pl-4 pr-24 text-xs font-semibold bg-white rounded-xl border border-slate-300 text-slate-900 outline-none focus:border-blue-600"
                />
                <span className="absolute right-4 text-xs text-slate-400 pointer-events-none font-medium">
                  mét vuông
                </span>
              </div>
            </div>

            {/* Hàng 2: Cấu hình giường */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Bố trí chỗ ngủ (Loại giường)
              </label>
              <div className="relative">
                <select
                  value={room.bed_type || "1 Giường đôi lớn (King/Queen Size)"}
                  onChange={(e) =>
                    handleUpdateRoom(room.id, { bed_type: e.target.value })
                  }
                  className="w-full h-11 px-3 text-xs font-semibold bg-white rounded-xl border border-slate-300 text-slate-900 appearance-none cursor-pointer outline-none focus:border-blue-600"
                >
                  <option value="1 Giường đôi lớn (King/Queen Size)">
                    1 Giường đôi lớn (King/Queen Size)
                  </option>
                  <option value="2 Giường đơn (Twin Bed)">
                    2 Giường đơn (Twin Bed)
                  </option>
                  <option value="1 Giường đôi + 1 Giường đơn (Family)">
                    1 Giường đôi + 1 Giường đơn (Family)
                  </option>
                </select>
                <ChevronDown
                  size={18}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
              </div>
            </div>

            {/* Hàng 3: Giới hạn khách lưu trú (Bộ đếm [-] N [+]) */}
            <div className="flex items-center justify-between py-2 border-y border-slate-200/70">
              <span className="text-xs font-bold text-slate-800">
                Giới hạn về tổng số khách lưu trú
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    handleCapacityChange(room.id, room.capacity || 2, -1)
                  }
                  className="w-8 h-8 rounded-full border border-slate-300 hover:border-slate-400 bg-white flex items-center justify-center text-slate-600 cursor-pointer shadow-2xs active:scale-95 transition"
                >
                  <Minus size={14} />
                </button>
                <span className="text-sm font-extrabold text-slate-900 w-4 text-center">
                  {room.capacity || 2}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    handleCapacityChange(room.id, room.capacity || 2, 1)
                  }
                  className="w-8 h-8 rounded-full border border-slate-300 hover:border-slate-400 bg-white flex items-center justify-center text-slate-600 cursor-pointer shadow-2xs active:scale-95 transition"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {/* Hàng 4: Giá phòng tối thiểu */}
            <div className="relative bg-white rounded-xl border border-slate-300 p-3.5 focus-within:border-blue-600 transition">
              <label className="block text-[11px] text-slate-500 font-medium mb-0.5">
                Giá phòng tối thiểu
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
                  className="w-full text-base font-bold text-slate-900 bg-transparent outline-none"
                />
                <span className="text-xs font-bold text-slate-400 shrink-0 ml-2">
                  VND / đêm
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Thiết lập giá thấp nhất có thể cho phòng này (không bao gồm
                khuyến mại, thuế và/hoặc phí khác)
              </p>
            </div>

            {/* Danh sách số phòng thực tế (bảng room_unit) */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                  <Key size={14} className="text-blue-600" /> Danh sách số phòng
                  (room_unit):
                </label>
                <button
                  type="button"
                  onClick={() =>
                    handleAutoGenerateRoomNumbers(room.id, idx + 1, 4)
                  }
                  className="text-[11px] font-bold text-blue-600 hover:text-blue-700 cursor-pointer flex items-center gap-1"
                >
                  <Wand2 size={11} /> Tự sinh 4 phòng
                </button>
              </div>
              <input
                type="text"
                value={room.roomNumbersText || ""}
                onChange={(e) =>
                  handleUpdateRoom(room.id, { roomNumbersText: e.target.value })
                }
                placeholder="VD: 101, 102, 103, 104"
                className="w-full h-10 px-3 text-xs font-bold text-blue-900 bg-white rounded-xl border border-slate-300 outline-none focus:border-blue-600"
              />
            </div>
          </div>
        ))}
      </div>

      {/* ── NÚT BẤM + THÊM CĂN CHUẨN AGODA ── */}
      <div>
        <button
          type="button"
          onClick={handleAddRoom}
          className="px-6 h-11 border border-blue-600 text-blue-600 hover:bg-blue-50 font-bold text-xs rounded-full flex items-center gap-2 cursor-pointer transition active:scale-95 shadow-2xs"
        >
          <Plus size={15} /> Thêm căn
        </button>
      </div>

      {/* ── ĐOẠN MÔ TẢ PHÂN PHỐI PHÒNG CỦA AGODA ── */}
      <p className="text-xs text-slate-500 leading-relaxed">
        Số lượng phòng trống cho từng phòng được đặt là 1 trong 90 ngày tới, với
        mức giá tối thiểu mỗi đêm do quý đối tác thiết lập. Quý đối tác có thể
        thay đổi thông tin này tại Trung tâm quản lý phòng trống hoặc trên Lịch
        sau khi hoàn tất đăng trang thông tin cơ sở lưu trú.
      </p>

      {/* ── MỤC BREAKFAST (BỮA SÁNG) CHUẨN AGODA ── */}
      <div className="pt-2 border-t border-slate-200 space-y-2">
        <h3 className="text-sm font-bold text-slate-900">Breakfast</h3>
        <p className="text-xs text-slate-500">
          Cơ sở lưu trú của quý đối tác có cung cấp bữa sáng hay không?
        </p>

        <div className="flex items-center gap-6 pt-1">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-800">
            <input
              type="radio"
              name="hasBreakfast"
              checked={data?.hasBreakfast === "yes"}
              onChange={() => onChange({ hasBreakfast: "yes" })}
              className="w-4 h-4 accent-blue-600 cursor-pointer"
            />
            <span>Có</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-800">
            <input
              type="radio"
              name="hasBreakfast"
              checked={data?.hasBreakfast !== "yes"}
              onChange={() => onChange({ hasBreakfast: "no" })}
              className="w-4 h-4 accent-blue-600 cursor-pointer"
            />
            <span>Không</span>
          </label>
        </div>
      </div>
    </div>
  );
};

export default Step3RoomsAndPricing;
