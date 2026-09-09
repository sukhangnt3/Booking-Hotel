// src/pages/reception/components/RoomCard.jsx
import React from "react";
import { Sparkles, MoreVertical } from "lucide-react";

export default function RoomCard({
  room,
  onClick,
  activeCleaningMenuId,
  setActiveCleaningMenuId,
  onMarkCleaned,
  onMarkDirty,
  formatVND,
  countdownText,
}) {
  const isOccupied =
    room.status === "occupied" || room.status === "checkout_soon";
  const isIncoming = room.status === "incoming";
  const isDirty = room.status === "dirty";

  return (
    <div
      onClick={onClick}
      className={`rounded-2xl border transition hover:shadow-md relative select-none p-3.5 flex flex-col justify-between cursor-pointer min-h-[125px] ${
        isIncoming
          ? "bg-[#fff9f1] border-[#fbd38d] shadow-xs"
          : isOccupied
            ? "bg-[#eafaf1] border-emerald-300 shadow-2xs"
            : isDirty
              ? "bg-amber-50 border-amber-300"
              : "bg-white border-slate-200 hover:border-slate-300"
      }`}
    >
      {/* Header thẻ phòng */}
      <div className="flex items-center justify-between relative">
        <span
          className={`px-2.5 py-0.5 rounded-lg text-xs font-black tracking-wide ${
            isIncoming
              ? "bg-[#ea580c] text-white"
              : isOccupied
                ? "bg-[#1b6a38] text-white"
                : isDirty
                  ? "bg-amber-600 text-white"
                  : "bg-slate-600 text-white"
          }`}
        >
          {room.room_number}
        </span>

        <div className="flex items-center gap-1 relative">
          {isDirty ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onMarkCleaned(room);
              }}
              className="px-2 py-0.5 rounded bg-amber-100 hover:bg-emerald-100 text-amber-800 hover:text-emerald-800 border border-amber-300 text-[11px] font-bold flex items-center gap-0.5 transition cursor-pointer"
              title="Bấm để xác nhận Đã dọn xong"
            >
              🧹 Chưa dọn
            </button>
          ) : (
            <span className="text-emerald-700 font-bold text-xs flex items-center gap-0.5 select-none">
              <Sparkles size={12} className="text-emerald-600" /> Sạch
            </span>
          )}

          {/* Nút 3 chấm mở menu dọn phòng */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActiveCleaningMenuId(
                activeCleaningMenuId === room.id ? null : room.id,
              );
            }}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-full hover:bg-slate-100 transition cursor-pointer"
          >
            <MoreVertical size={14} />
          </button>

          {/* Menu thả xuống */}
          {activeCleaningMenuId === room.id && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 top-7 z-30 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 w-36 text-xs text-slate-700 animate-fadeIn"
            >
              {isDirty ? (
                <button
                  type="button"
                  onClick={() => onMarkCleaned(room)}
                  className="w-full text-left px-3 py-2 hover:bg-emerald-50 text-[#1b6a38] font-bold flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles size={13} />
                  <span>Đã dọn xong</span>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => onMarkCleaned(room)}
                    className="w-full text-left px-3 py-1.5 hover:bg-emerald-50 text-emerald-700 font-semibold flex items-center gap-2 cursor-pointer"
                  >
                    <Sparkles size={13} />
                    <span>Xác nhận sạch</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onMarkDirty(room)}
                    className="w-full text-left px-3 py-1.5 hover:bg-amber-50 text-amber-800 font-semibold flex items-center gap-2 cursor-pointer"
                  >
                    <span>🧹 Báo cần dọn</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Nội dung bên trong thẻ */}
      {isIncoming ? (
        <div className="my-2 space-y-1">
          <div className="font-extrabold text-slate-900 text-xs truncate">
            {room.booking?.customer_name || "Khách đặt trước"}
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            {room.booking?.guest_phone || "---"}
          </div>
          <div className="pt-1">
            <span className="inline-block px-2 py-0.5 bg-slate-100/90 border border-slate-200/80 rounded-md text-[10px] text-slate-600 font-medium">
              {countdownText}
            </span>
          </div>
        </div>
      ) : isOccupied ? (
        <div className="my-2 space-y-1">
          <div className="font-bold text-slate-800 text-xs truncate">
            {room.booking?.customer_name || "Khách lẻ"}
          </div>
          <div className="text-[11px] font-bold text-emerald-700">
            {room.booking?.stay_duration || "1 ngày"}
          </div>
        </div>
      ) : isDirty ? (
        <div className="my-2 space-y-1">
          <div className="font-bold text-xs text-amber-800">Chưa dọn</div>
        </div>
      ) : (
        <div className="my-2 space-y-0.5">
          <div className="font-bold text-slate-700 text-xs truncate">
            {room.type_name}
          </div>
          <div className="text-[10px] text-slate-500">
            {formatVND(room.daily_price)}/Ngày
          </div>
        </div>
      )}
    </div>
  );
}
