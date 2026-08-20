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

const RoomCard = ({ room, isSelected, onSelect, remainingRooms }) => {
  if (!room) return null;

  // Đọc giá an toàn từ mọi tên cột: base_price, sell_price, price
  const priceNumber = Number(
    room.base_price || room.sell_price || room.price || 0,
  );

  const formattedPrice =
    priceNumber > 0
      ? new Intl.NumberFormat("vi-VN", {
          style: "currency",
          currency: "VND",
        }).format(priceNumber)
      : "Liên hệ";

  // Số lượng phòng còn lại
  const stock =
    remainingRooms !== undefined
      ? remainingRooms
      : room.amount || room.room_count || room.stock || 5;
  const isSoldOut = stock <= 0;

  const image =
    room.image ||
    room.images?.[0]?.path ||
    room.images?.[0] ||
    "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=500&q=80";

  return (
    <div
      onClick={!isSoldOut ? onSelect : undefined}
      className={cn(
        "group p-5 rounded-3xl border-2 transition-all duration-300 relative",
        isSoldOut
          ? "opacity-60 grayscale cursor-not-allowed border-gray-100 bg-gray-50"
          : isSelected
            ? "border-[#006ce4] bg-blue-50/40 shadow-lg shadow-blue-100/50"
            : "border-gray-200 bg-white hover:border-[#006ce4]/40 hover:shadow-md cursor-pointer",
      )}
    >
      <div className="flex flex-col lg:flex-row gap-6">
        {/* 1. ẢNH LOẠI PHÒNG */}
        <div className="w-full lg:w-56 h-40 shrink-0 rounded-2xl overflow-hidden bg-gray-100 relative">
          <img
            src={image}
            alt={room.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
          {room.type && (
            <span className="absolute top-2 left-2 bg-slate-900/80 text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-lg backdrop-blur-sm">
              {room.type}
            </span>
          )}
        </div>

        {/* 2. THÔNG TIN TIỆN NGHI PHÒNG */}
        <div className="flex-1 flex flex-col justify-between py-1">
          <div>
            <div className="flex justify-between items-start">
              <h3 className="font-extrabold text-xl text-gray-900 group-hover:text-[#006ce4] transition-colors leading-snug">
                {room.name}
              </h3>
              {isSelected && (
                <CheckCircle2
                  className="text-[#006ce4] shrink-0 animate-in zoom-in"
                  size={22}
                />
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-2 gap-y-2.5 gap-x-4 mt-3">
              <div className="flex items-center gap-2 text-xs text-gray-600 font-medium">
                <Square size={15} className="text-gray-400 shrink-0" />
                <span>{room.room_area || room.area || 30} m²</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-600 font-medium">
                <Users size={15} className="text-[#006ce4] shrink-0" />
                <span>Tối đa {room.capacity || 2} khách</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-600 font-medium">
                <BedDouble size={15} className="text-gray-400 shrink-0" />
                <span>
                  {room.bed_type || room.bedType || "1 Giường đôi lớn"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-emerald-600 font-bold">
                <Wifi size={15} className="shrink-0" />
                <span>Wifi miễn phí</span>
              </div>
            </div>

            {room.description && (
              <p className="text-xs text-gray-500 mt-3 line-clamp-2 italic">
                {room.description}
              </p>
            )}
          </div>

          {/* Cảnh báo số phòng còn lại */}
          {!isSoldOut && stock <= 3 && (
            <div className="mt-3 flex items-center gap-1.5 text-orange-600 font-bold text-xs animate-pulse">
              <AlertCircle size={14} />
              Chỉ còn {stock} phòng trống với mức giá này!
            </div>
          )}
        </div>

        {/* 3. GIÁ PHÒNG & NÚT CHỌN */}
        <div className="lg:w-56 flex flex-col justify-between items-end lg:border-l border-dashed border-gray-200 lg:pl-6 pt-4 lg:pt-0 border-t lg:border-t-0">
          <div className="text-right">
            <p className="text-[10px] text-gray-400 uppercase font-black tracking-wider mb-0.5">
              Giá mỗi đêm
            </p>
            <p className="text-2xl font-black text-rose-600 tracking-tight">
              {formattedPrice}
            </p>
            <p className="text-[10px] text-gray-400 italic">
              Đã gồm thuế & tất cả phí
            </p>
          </div>

          <div
            className={cn(
              "mt-4 w-full py-3 rounded-2xl text-xs font-black transition-all text-center uppercase tracking-wider",
              isSoldOut
                ? "bg-gray-200 text-gray-500"
                : isSelected
                  ? "bg-[#006ce4] text-white shadow-md shadow-blue-100"
                  : "bg-blue-50 text-[#006ce4] group-hover:bg-[#006ce4] group-hover:text-white",
            )}
          >
            {isSoldOut
              ? "Hết phòng"
              : isSelected
                ? "Đã chọn phòng này"
                : "Chọn phòng"}
          </div>
        </div>
      </div>

      {/* Ribbon khi hết phòng */}
      {isSoldOut && (
        <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center rounded-3xl z-10">
          <span className="bg-slate-900 text-white px-6 py-2 rounded-full font-black text-xs uppercase tracking-widest shadow-xl">
            Đã Hết Phòng
          </span>
        </div>
      )}
    </div>
  );
};

export default RoomCard;
