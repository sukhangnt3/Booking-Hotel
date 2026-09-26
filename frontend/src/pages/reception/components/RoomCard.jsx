// src/pages/reception/components/RoomCard.jsx
import React, { useMemo } from "react";
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
  isDeposit,
  remainingAmount,
}) {
  const isOccupied =
    room.status === "occupied" || room.status === "checkout_soon";
  const isIncoming = room.status === "incoming";

  const isDirty =
    room.status === "dirty" ||
    room.unit_status === "dirty" ||
    Boolean(room.is_dirty);

  const isOccupiedAndDirty = isOccupied && isDirty;

  const b = room.booking;
  const rentalType = b?.rental_type || "DAY";

  // 🌟 SỬA TRIỆT ĐỂ LỖI P.P.106: LOẠI BỎ TẤT CẢ CHỮ P TRÙNG LẶP
  const displayRoomNumber = useMemo(() => {
    let raw = String(room.room_number || "101").trim();
    while (
      raw.toLowerCase().startsWith("p.") ||
      raw.toLowerCase().startsWith("p")
    ) {
      if (raw.toLowerCase().startsWith("p.")) {
        raw = raw.slice(2).trim();
      } else if (raw.toLowerCase().startsWith("p")) {
        raw = raw.slice(1).trim();
      }
    }
    return `P.${raw}`;
  }, [room.room_number]);

  // 🌟 ĐÃ SỬA TRIỆT ĐỂ: TÍNH CHÍNH XÁC THỜI GIAN ĐÃ Ở THỰC TẾ (GHÉP CẢ NGÀY + GIỜ ĐỂ KHÔNG BỊ TỤT VỀ 7H SÁNG)
  const actualStayDurationText = useMemo(() => {
    if (!b) return "1 ngày";

    let startTime = null;
    const realTime = b.confirmed_at || b.actual_checkin_time || b.created_at;

    // 1. Ưu tiên thời điểm thực tế bấm check-in
    if (realTime && !isNaN(new Date(realTime).getTime())) {
      startTime = new Date(realTime);
    } else {
      // 2. Nếu chỉ có checkin_date, BẮT BUỘC ghép với checkin_time (tránh bị lệch UTC về 7h sáng)
      const datePart = String(b.checkin_date || "").slice(0, 10);
      const timePart = String(b.checkin_time || "14:00").slice(0, 5);
      if (datePart) {
        startTime = new Date(`${datePart}T${timePart}:00`);
      }
    }

    if (!startTime || isNaN(startTime.getTime())) {
      return b.stay_duration || "Vừa nhận phòng";
    }

    const diffMs = Math.max(0, Date.now() - startTime.getTime());
    const totalMinutes = Math.floor(diffMs / 60000);
    const totalHours = Math.floor(totalMinutes / 60);
    const remMins = totalMinutes % 60;

    if (totalMinutes < 1) return "Vừa nhận phòng";
    if (totalMinutes < 60) return `${totalMinutes} phút`;
    if (totalHours < 24) {
      return `${totalHours} giờ ${remMins > 0 ? `${remMins}p` : ""}`.trim();
    }
    const days = Math.floor(totalHours / 24);
    return `${days} ngày`;
  }, [b]);

  const getPriceBadge = () => {
    if (b) {
      return `${formatVND(b.total_price)} ₫`;
    }
    if (rentalType === "HOUR") {
      return `${formatVND(room.hourly_price || Math.round(room.daily_price * 0.25))} ₫/h`;
    }
    if (rentalType === "OVERNIGHT") {
      return `${formatVND(room.overnight_price || room.daily_price)} ₫/đêm`;
    }
    return `${formatVND(room.daily_price)} ₫/ngày`;
  };

  return (
    <div
      onClick={onClick}
      className={`rounded-2xl border transition-all duration-200 hover:shadow-md relative select-none p-3.5 flex flex-col justify-between cursor-pointer min-h-[135px] font-sans text-xs ${
        isIncoming
          ? "bg-amber-50/60 border-amber-300 shadow-2xs"
          : isOccupiedAndDirty
            ? "bg-gradient-to-br from-blue-50/90 via-white to-amber-50/80 border-amber-400 ring-2 ring-amber-300/70 shadow-md"
            : isOccupied
              ? "bg-blue-50/60 border-blue-200 shadow-2xs"
              : isDirty
                ? "bg-orange-50/80 border-orange-300 shadow-2xs"
                : "bg-white border-gray-200 hover:border-[#003580]"
      }`}
    >
      {/* HEADER THẺ PHÒNG */}
      <div className="flex items-center justify-between relative">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className={`px-2.5 py-0.5 rounded-lg text-xs font-black tracking-wide ${
              isIncoming
                ? "bg-amber-500 text-white shadow-2xs"
                : isOccupied
                  ? "bg-[#003580] text-white shadow-2xs"
                  : isDirty
                    ? "bg-orange-500 text-white"
                    : "bg-gray-700 text-white"
            }`}
          >
            {displayRoomNumber}
          </span>

          {isOccupiedAndDirty && (
            <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-amber-500 text-white shadow-2xs animate-pulse">
              🧹 Cần dọn
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 relative">
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

      {/* NỘI DUNG THẺ */}
      {isIncoming ? (
        <div className="my-2 space-y-1">
          <div className="font-black text-gray-900 text-xs truncate flex items-center justify-between">
            <span>{b?.customer_name || "Khách đặt trước"}</span>
            <span className="text-[10px] text-[#003580] font-mono font-bold">
              {getPriceBadge()}
            </span>
          </div>

          <div className="text-[11px] text-gray-500 font-mono">
            {b?.guest_phone || "---"}
          </div>

          <div className="pt-0.5">
            <span className="inline-block px-2 py-0.5 bg-amber-100/80 border border-amber-200 rounded-md text-[10px] text-amber-900 font-bold">
              ⏱️ {countdownText}
            </span>
          </div>
        </div>
      ) : isOccupied ? (
        <div className="my-2 space-y-1">
          <div className="font-black text-[#0a2540] text-xs truncate flex items-center justify-between">
            <span>{b?.customer_name || "Khách lẻ"}</span>
            <span className="text-[10px] text-[#003580] font-mono font-bold">
              {getPriceBadge()}
            </span>
          </div>

          <div className="text-[11px] font-bold text-[#003580] flex items-center gap-1 pt-0.5">
            <Clock size={11} className="text-[#006ce4]" /> Đã ở:{" "}
            {actualStayDurationText}
          </div>
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
            {getPriceBadge()}
          </div>
        </div>
      )}
    </div>
  );
}
