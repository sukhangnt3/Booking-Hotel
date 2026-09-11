// src/pages/reception/components/IncomingRoomModal.jsx
import React from "react";
import {
  Clock,
  User,
  Key,
  Users,
  Bed,
  Edit3,
  Receipt,
  Trash2,
  ArrowRightLeft,
} from "lucide-react";

export default function IncomingRoomModal({
  room,
  onClose,
  onOpenConfirmCheckIn,
  onOpenChangeRoom,
  formatDisplayDateTime,
  countdownText,
  formatVND,
}) {
  if (!room) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-2xs animate-fadeIn">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden text-xs font-sans animate-scaleUp">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <span className="font-black text-base text-slate-900">
              {room.room_number}
            </span>
            <span className="px-2.5 py-0.5 bg-[#fef3c7] text-[#b45309] font-bold rounded-md text-[11px]">
              Đã đặt trước
            </span>
          </div>

          <div className="flex items-center gap-2 text-slate-400">
            <button
              type="button"
              onClick={() => {
                if (
                  window.confirm("Bạn có chắc chắn muốn hủy đơn đặt phòng này?")
                ) {
                  alert("Đã hủy đơn đặt phòng!");
                  onClose();
                }
              }}
              className="p-1 hover:text-rose-600 text-slate-400 cursor-pointer transition"
              title="Hủy đặt phòng"
            >
              <Trash2 size={16} />
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 text-base font-bold p-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Nội dung chi tiết */}
        <div className="p-6 space-y-4">
          <h4 className="font-extrabold text-slate-900 text-sm">
            {room.type_name || "Phòng 01 giường đơn"}
          </h4>

          <div className="flex items-start gap-3 text-slate-700">
            <Clock size={16} className="text-slate-400 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-slate-800">
                {formatDisplayDateTime(room.booking?.checkin_date)} -{" "}
                {formatDisplayDateTime(room.booking?.checkout_date)} (1 đêm)
              </p>
              <p className="text-[#d97706] font-bold text-xs mt-0.5">
                {countdownText}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-slate-700">
            <User size={16} className="text-slate-400 shrink-0" />
            <span className="font-bold text-[#1b6a38] text-xs">
              {room.booking?.customer_name || "Khách đặt trước"} -{" "}
              {room.booking?.guest_phone || "---"}
            </span>
          </div>

          <div className="flex items-center gap-3 text-slate-700">
            <Key size={16} className="text-slate-400 shrink-0" />
            <span className="font-mono font-bold text-slate-800">
              {room.booking?.code || "DP000008"}
            </span>
          </div>

          <div className="flex items-center gap-3 text-slate-700">
            <Users size={16} className="text-slate-400 shrink-0" />
            <span className="font-medium text-slate-700">
              {room.booking?.adult_total || 1} người lớn &{" "}
              {room.booking?.children_total || 0} trẻ em & 0 giấy tờ
            </span>
          </div>

          <div className="flex items-center gap-3 text-slate-700">
            <Bed size={16} className="text-slate-400 shrink-0" />
            <span className="px-2.5 py-0.5 bg-[#fef3c7] text-[#b45309] font-bold rounded-md">
              {room.room_number}
            </span>
          </div>

          <div className="flex items-center gap-3 text-slate-500 italic">
            <Edit3 size={16} className="text-slate-400 shrink-0" />
            <span>{room.booking?.note || "Chưa có ghi chú"}</span>
          </div>

          <div className="flex items-center gap-3 text-slate-700 pt-1">
            <Receipt size={16} className="text-slate-400 shrink-0" />
            <div className="flex items-center gap-1.5 font-bold">
              <span className="text-[#1b6a38] text-sm">
                {formatVND(
                  room.booking?.total_price || room.daily_price || 600000,
                )}
              </span>
              <span className="text-slate-600 font-normal">
                - Khách đã trả: {formatVND(room.booking?.customer_paid || 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-2.5 bg-white">
          <button
            type="button"
            onClick={() => alert("Chức năng chỉnh sửa đơn")}
            className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-lg cursor-pointer transition text-xs shadow-2xs"
          >
            Chỉnh sửa
          </button>

          <button
            type="button"
            onClick={() => {
              if (onOpenChangeRoom) {
                onOpenChangeRoom(room);
              }
            }}
            className="px-4 py-2 border border-amber-600 text-amber-700 hover:bg-amber-50 font-bold rounded-lg cursor-pointer transition text-xs shadow-2xs flex items-center gap-1.5"
          >
            <ArrowRightLeft size={13} />
            <span>Đổi phòng</span>
          </button>

          <button
            type="button"
            onClick={onOpenConfirmCheckIn}
            className="px-5 py-2 bg-[#1b6a38] hover:bg-[#14532d] text-white font-bold rounded-lg shadow-sm cursor-pointer transition active:scale-95 text-xs"
          >
            Nhận phòng
          </button>
        </div>
      </div>
    </div>
  );
}
