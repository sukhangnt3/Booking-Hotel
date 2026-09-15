// src/pages/reception/components/RoomCard.jsx
import React from "react";
import { Sparkles, MoreVertical, Clock, AlertTriangle } from "lucide-react";

export default function RoomCard({
  room,
  onClick,
  activeCleaningMenuId,
  setActiveCleaningMenuId,
  onMarkCleaned,
  onMarkDirty,
  formatVND,
  countdownText,
  occupiedInfo,
}) {
  const isOccupied =
    room.status === "occupied" || room.status === "checkout_soon";
  const isIncoming = room.status === "incoming";

  // 🌟 Nhận diện trạng thái bẩn/cần dọn kể cả khi phòng ĐANG CÓ KHÁCH Ở
  const isDirty =
    room.status === "dirty" ||
    room.unit_status === "dirty" ||
    Boolean(room.is_dirty);

  const isOccupiedAndDirty = isOccupied && isDirty;
  const isOverdue = isOccupied && occupiedInfo?.isOverdue;

  return (
    <div
      onClick={onClick}
      className={`rounded-2xl border transition-all duration-200 hover:shadow-md relative select-none p-3.5 flex flex-col justify-between cursor-pointer min-h-[130px] font-sans text-xs ${
        isIncoming
          ? "bg-amber-50/60 border-amber-300 shadow-2xs"
          : isOverdue
            ? "bg-rose-50/70 border-rose-300 shadow-2xs"
            : isOccupiedAndDirty
              ? "bg-gradient-to-br from-blue-50/90 via-white to-amber-50/80 border-amber-400 ring-2 ring-amber-300/70 shadow-md"
              : isOccupied
                ? "bg-blue-50/60 border-blue-200 shadow-2xs"
                : isDirty
                  ? "bg-orange-50/80 border-orange-300 shadow-2xs"
                  : "bg-white border-gray-200 hover:border-[#003580]"
      }`}
    >
      {/* ─── HEADER THẺ PHÒNG ─── */}
      <div className="flex items-center justify-between relative">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className={`px-2.5 py-0.5 rounded-lg text-xs font-black tracking-wide ${
              isIncoming
                ? "bg-amber-500 text-white shadow-2xs"
                : isOverdue
                  ? "bg-rose-600 text-white shadow-2xs"
                  : isOccupied
                    ? "bg-[#003580] text-white shadow-2xs"
                    : isDirty
                      ? "bg-orange-500 text-white"
                      : "bg-gray-700 text-white"
            }`}
          >
            P.{room.room_number}
          </span>

          {isOverdue && (
            <span className="flex items-center gap-1 text-[10px] font-black text-rose-700 bg-rose-100 border border-rose-200 px-1.5 py-0.5 rounded-md">
              <AlertTriangle size={11} /> Quá giờ
            </span>
          )}

          {/* 🌟 Huy hiệu cảnh báo khi phòng Đang có khách mà yêu cầu dọn phòng */}
          {isOccupiedAndDirty && (
            <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-amber-500 text-white shadow-2xs animate-pulse">
              🧹 Cần dọn
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 relative">
          {/* Nút trạng thái dọn dẹp */}
          {isDirty ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onMarkCleaned(room);
              }}
              className="px-2 py-0.5 rounded-md bg-amber-100 hover:bg-emerald-100 text-amber-900 hover:text-emerald-800 border border-amber-300 text-[10px] font-bold flex items-center gap-0.5 transition cursor-pointer shadow-2xs"
              title="Bấm để xác nhận Đã dọn xong"
            >
              🧹 Chưa dọn
            </button>
          ) : (
            <span className="text-emerald-700 font-bold text-[11px] flex items-center gap-1 select-none">
              <Sparkles size={12} className="text-emerald-600" /> Sạch
            </span>
          )}

          {/* Nút ba chấm mở menu thao tác dọn phòng */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActiveCleaningMenuId(
                activeCleaningMenuId === room.id ? null : room.id,
              );
            }}
            className="text-gray-400 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 transition cursor-pointer"
          >
            <MoreVertical size={14} />
          </button>

          {/* Menu popup */}
          {activeCleaningMenuId === room.id && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 top-7 z-30 bg-white border border-gray-200 rounded-2xl shadow-xl py-1.5 w-40 text-xs text-gray-700 animate-fadeIn"
            >
              {isDirty ? (
                <button
                  type="button"
                  onClick={() => onMarkCleaned(room)}
                  className="w-full text-left px-3.5 py-2 hover:bg-emerald-50 text-emerald-700 font-bold flex items-center gap-2 cursor-pointer transition"
                >
                  <Sparkles size={13} className="text-emerald-600" />
                  <span>Xác nhận đã dọn</span>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => onMarkCleaned(room)}
                    className="w-full text-left px-3.5 py-2 hover:bg-emerald-50 text-emerald-700 font-semibold flex items-center gap-2 cursor-pointer transition"
                  >
                    <Sparkles size={13} className="text-emerald-600" />
                    <span>Xác nhận sạch</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onMarkDirty(room)}
                    className="w-full text-left px-3.5 py-2 hover:bg-amber-50 text-amber-800 font-semibold flex items-center gap-2 cursor-pointer transition border-t border-gray-100"
                  >
                    <span>🧹 Báo cần dọn</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ─── NỘI DUNG THẺ THEO TỪNG TRẠNG THÁI ─── */}
      {isIncoming ? (
        <div className="my-2 space-y-1">
          <div className="font-black text-gray-900 text-xs truncate">
            {room.booking?.customer_name || "Khách đặt trước"}
          </div>
          <div className="text-[11px] text-gray-500 font-mono">
            {room.booking?.guest_phone || "---"}
          </div>
          <div className="pt-1">
            <span className="inline-block px-2 py-0.5 bg-amber-100/80 border border-amber-200 rounded-md text-[10px] text-amber-900 font-bold">
              ⏱️ {countdownText}
            </span>
          </div>
        </div>
      ) : isOccupied ? (
        <div className="my-2 space-y-1">
          <div className="font-black text-[#0a2540] text-xs truncate">
            {room.booking?.customer_name || "Khách lẻ"}
          </div>

          {/* Dòng hiển thị trạng thái đặc biệt khi khách đang ở gọi dọn phòng */}
          {isOccupiedAndDirty && (
            <div className="text-[10px] font-bold text-amber-800 bg-amber-100/80 border border-amber-200 px-2 py-0.5 rounded-md flex items-center gap-1 w-fit">
              <span>🧹 Khách yêu cầu dọn phòng</span>
            </div>
          )}

          {isOverdue ? (
            <div className="space-y-0.5 pt-0.5">
              <div className="text-[11px] font-black text-rose-600 flex items-center gap-1">
                <Clock size={11} /> {occupiedInfo.overdueText}
              </div>
              <div className="text-[10px] text-gray-500 font-medium">
                Ở thực tế: {occupiedInfo.stayText}
              </div>
            </div>
          ) : (
            <div className="text-[11px] font-bold text-[#003580] flex items-center gap-1 pt-0.5">
              <Clock size={11} className="text-[#006ce4]" /> Đã ở:{" "}
              {occupiedInfo?.stayText ||
                room.booking?.stay_duration ||
                "1 ngày"}
            </div>
          )}
        </div>
      ) : isDirty ? (
        <div className="my-2 space-y-1">
          <div className="font-black text-xs text-orange-800">
            Cần vệ sinh phòng
          </div>
          <div className="text-[10px] text-gray-500">
            Khách đã trả phòng • Chờ buồng phòng dọn
          </div>
        </div>
      ) : (
        <div className="my-2 space-y-0.5">
          <div className="font-bold text-gray-800 text-xs truncate">
            {room.type_name || "Tiêu chuẩn"}
          </div>
          <div className="text-xs font-black text-[#003580] tabular-nums">
            {formatVND(room.daily_price)} ₫/ngày
          </div>
        </div>
      )}
    </div>
  );
}
