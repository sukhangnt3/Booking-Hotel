import React from "react";

const RoomCard = ({ room, isSelected, onSelect }) => {
  return (
    <div
      onClick={onSelect}
      className={`p-5 rounded-xl border-2 transition-all cursor-pointer ${
        isSelected
          ? "border-[#006ce4] bg-blue-50/40 shadow-md"
          : "border-gray-200 bg-white hover:border-gray-300"
      }`}
    >
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div className="flex-1">
          <h3 className="font-bold text-base text-[#006ce4]">{room.name}</h3>
          <div className="grid grid-cols-2 gap-y-2 mt-3 text-[11px] text-gray-600">
            <span className="flex items-center gap-1.5">
              📐 {room.room_area} m²
            </span>
            <span className="flex items-center gap-1.5">
              👤 Tối đa {room.capacity} người
            </span>
            <span className="flex items-center gap-1.5">
              🛏️ {room.bed_type}
            </span>
            <span className="text-emerald-600 font-bold">✓ Miễn phí Wifi</span>
          </div>
        </div>

        <div className="text-right flex flex-col justify-between items-end min-w-[150px]">
          <div>
            <span className="text-[10px] text-gray-400 block uppercase font-bold">
              Giá mỗi đêm
            </span>
            {/* Giá lấy từ sell_price của Room Inventory */}
            <span className="text-xl font-extrabold text-gray-900">
              {room.sell_price?.toLocaleString("vi-VN")} VND
            </span>
          </div>

          <div
            className={`mt-2 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
              isSelected ? "border-[#006ce4] bg-[#006ce4]" : "border-gray-300"
            }`}
          >
            {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomCard;
