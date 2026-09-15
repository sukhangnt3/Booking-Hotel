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
  X,
  CalendarCheck,
} from "lucide-react";

export default function IncomingRoomModal({
  isOpen, // 🌟 Bổ sung prop isOpen
  room,
  onClose,
  onOpenConfirmCheckIn,
  onOpenChangeRoom,
  formatDisplayDateTime,
  countdownText,
  formatVND,
}) {
  // Chỉ hiển thị khi isOpen === true và có dữ liệu phòng
  if (!isOpen || !room) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn font-sans">
      <div className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl border border-gray-200 overflow-hidden text-xs text-gray-900 animate-scaleUp my-auto">
        {/* HEADER MODAL */}
        <div className="bg-[#003580] text-white p-5 flex items-center justify-between shadow-xs shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-white shadow-inner">
              <CalendarCheck size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-base text-white tracking-tight leading-none">
                  Phòng {room.room_number}
                </span>
                <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-amber-400 text-gray-950 shadow-xs">
                  Đã đặt trước
                </span>
              </div>
              <p className="text-[11px] text-blue-100/80 font-medium mt-1 leading-none">
                {room.type_name || "Phòng tiêu chuẩn"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
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
              className="p-1.5 hover:bg-white/10 text-white/70 hover:text-rose-300 rounded-xl cursor-pointer transition"
              title="Hủy đặt phòng"
            >
              <Trash2 size={16} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-white/80 hover:text-white rounded-xl hover:bg-white/10 transition cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* NỘI DUNG CHI TIẾT */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1 bg-white">
          <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-2xl flex items-start gap-3">
            <Clock size={16} className="text-[#006ce4] mt-0.5 shrink-0" />
            <div>
              <p className="font-bold text-gray-900 text-xs">
                {formatDisplayDateTime(room.booking?.checkin_date)} -{" "}
                {formatDisplayDateTime(room.booking?.checkout_date)} (1 đêm)
              </p>
              <p className="text-amber-600 font-black text-xs mt-0.5">
                ⏱️ {countdownText}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-gray-700">
            <User size={16} className="text-[#006ce4] shrink-0" />
            <div>
              <span className="font-black text-[#003580] text-xs block">
                {room.booking?.customer_name || "Khách đặt trước"}
              </span>
              <span className="text-[11px] text-gray-500 font-mono">
                {room.booking?.guest_phone || "Chưa có số điện thoại"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-gray-700">
            <Key size={16} className="text-[#006ce4] shrink-0" />
            <span className="text-gray-500">Mã đơn:</span>
            <span className="font-mono font-black text-gray-900 bg-gray-100 px-2 py-0.5 rounded-md border border-gray-200">
              #{room.booking?.code || "DP000008"}
            </span>
          </div>

          <div className="flex items-center gap-3 text-gray-700">
            <Users size={16} className="text-[#006ce4] shrink-0" />
            <span className="font-medium text-gray-800">
              {room.booking?.adult_total || 1} người lớn,{" "}
              {room.booking?.children_total || 0} trẻ em
            </span>
          </div>

          <div className="flex items-center gap-3 text-gray-700">
            <Bed size={16} className="text-[#006ce4] shrink-0" />
            <span className="text-gray-500">Phòng xếp:</span>
            <span className="px-2.5 py-0.5 bg-blue-50 text-[#003580] font-black rounded-lg border border-blue-100">
              Phòng {room.room_number}
            </span>
          </div>

          <div className="flex items-center gap-3 text-gray-500 italic bg-gray-50/50 p-2.5 rounded-xl border border-gray-100">
            <Edit3 size={15} className="text-gray-400 shrink-0" />
            <span>{room.booking?.note || "Không có ghi chú đặc biệt"}</span>
          </div>

          <div className="p-3.5 bg-blue-50/60 border border-blue-200 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt size={18} className="text-[#003580] shrink-0" />
              <div>
                <span className="text-[10px] text-gray-500 font-bold block uppercase">
                  Tổng tiền phòng
                </span>
                <span className="text-[#003580] font-black text-sm tabular-nums">
                  {formatVND(
                    room.booking?.total_price || room.daily_price || 600000,
                  )}
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-gray-500 font-bold block uppercase">
                Đã thanh toán
              </span>
              <span className="font-black text-emerald-700 text-xs tabular-nums">
                {formatVND(room.booking?.customer_paid || 0)}
              </span>
            </div>
          </div>
        </div>

        {/* NÚT THAO TÁC */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-2.5 bg-gray-50/70 shrink-0">
          <button
            type="button"
            onClick={() => alert("Chức năng chỉnh sửa thông tin đơn đặt")}
            className="px-4 py-2.5 border border-gray-200 hover:bg-white text-gray-700 font-bold rounded-xl cursor-pointer transition text-xs shadow-2xs"
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
            className="px-4 py-2.5 border border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100 font-bold rounded-xl cursor-pointer transition text-xs shadow-2xs flex items-center gap-1.5"
          >
            <ArrowRightLeft size={13} />
            <span>Đổi phòng</span>
          </button>

          <button
            type="button"
            onClick={onOpenConfirmCheckIn}
            className="px-6 py-2.5 bg-[#003580] hover:bg-blue-900 text-white font-black rounded-xl shadow-md cursor-pointer transition active:scale-95 text-xs"
          >
            Nhận phòng ngay
          </button>
        </div>
      </div>
    </div>
  );
}
