import React from "react";
import {
  Users,
  Square,
  BedDouble,
  Wifi,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Badge } from "../ui";
import { cn } from "@/utils/cn";

const RoomCard = ({ room, isSelected, onSelect, remainingRooms = 5 }) => {
  // Định dạng giá tiền
  const formattedPrice = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(room.sell_price || 0);

  const isSoldOut = remainingRooms <= 0;

  return (
    <div
      onClick={!isSoldOut ? onSelect : undefined}
      className={cn(
        "group p-4 rounded-2xl border-2 transition-all duration-300 relative",
        isSoldOut
          ? "opacity-60 grayscale cursor-not-allowed border-gray-100 bg-gray-50"
          : isSelected
            ? "border-[#006ce4] bg-blue-50/50 shadow-lg shadow-blue-100"
            : "border-gray-200 bg-white hover:border-[#006ce4]/30 hover:shadow-md cursor-pointer",
      )}
    >
      <div className="flex flex-col lg:flex-row gap-5">
        {/* 1. ẢNH LOẠI PHÒNG (Thumbnail nhỏ) */}
        <div className="w-full lg:w-48 h-32 shrink-0 rounded-xl overflow-hidden bg-gray-100">
          <img
            src={room.image || "https://placehold.co/400x300?text=Room+Image"}
            alt={room.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
        </div>

        {/* 2. THÔNG TIN PHÒNG */}
        <div className="flex-1 flex flex-col justify-between py-1">
          <div>
            <div className="flex justify-between items-start">
              <h3 className="font-bold text-lg text-gray-900 group-hover:text-[#006ce4] transition-colors">
                {room.name}
              </h3>
              {isSelected && (
                <CheckCircle2
                  className="text-[#006ce4] animate-in zoom-in"
                  size={20}
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-y-2.5 mt-3">
              <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                <Square size={14} className="text-gray-400" />
                <span>{room.room_area} m²</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                <Users size={14} className="text-gray-400" />
                <span>Tối đa {room.capacity} người</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                <BedDouble size={14} className="text-gray-400" />
                <span>{room.bed_type}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-emerald-600 font-bold">
                <Wifi size={14} />
                <span>Wifi miễn phí</span>
              </div>
            </div>
          </div>

          {/* Cảnh báo số lượng phòng còn lại */}
          {!isSoldOut && remainingRooms <= 3 && (
            <div className="mt-3 flex items-center gap-1.5 text-orange-600 font-bold text-[11px] animate-pulse">
              <AlertCircle size={14} />
              Chỉ còn {remainingRooms} phòng trống với giá này!
            </div>
          )}
        </div>

        {/* 3. GIÁ & TRẠNG THÁI CHỌN */}
        <div className="lg:w-48 flex flex-col justify-center items-end lg:border-l border-dashed border-gray-200 lg:pl-5">
          <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1">
            Giá mỗi đêm
          </p>
          <p className="text-xl font-black text-[#006ce4]">{formattedPrice}</p>
          <p className="text-[10px] text-gray-400 mt-1 italic">
            Đã bao gồm thuế & phí
          </p>

          <div
            className={cn(
              "mt-4 px-5 py-2 rounded-lg text-xs font-bold transition-all",
              isSoldOut
                ? "bg-gray-200 text-gray-500"
                : isSelected
                  ? "bg-[#006ce4] text-white shadow-md"
                  : "bg-blue-50 text-[#006ce4] group-hover:bg-[#006ce4] group-hover:text-white",
            )}
          >
            {isSoldOut ? "Hết phòng" : isSelected ? "Đã chọn" : "Chọn phòng"}
          </div>
        </div>
      </div>

      {/* Ribbon Hết phòng (Overlay) */}
      {isSoldOut && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="bg-gray-900/80 text-white px-6 py-2 rounded-full font-bold text-sm rotate-[-5deg] shadow-xl">
            HẾT PHÒNG
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomCard;
