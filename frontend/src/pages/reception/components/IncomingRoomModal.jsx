// src/pages/reception/components/IncomingRoomModal.jsx
import React from "react";
import {
  Clock,
  User,
  Key,
  Users,
  Bed,
  Receipt,
  Trash2,
  ArrowRightLeft,
  X,
  Globe,
  Edit3,
  CalendarCheck,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

export default function IncomingRoomModal({
  isOpen,
  room,
  onClose,
  onOpenConfirmCheckIn,
  onOpenChangeRoom,
  formatDisplayDateTime,
  countdownText,
  formatVND,
}) {
  if (!isOpen || !room) return null;

  const b = room.booking || {};
  const isOnline =
    b.source === "online" ||
    b.booking_type === "online" ||
    String(b.code || b.booking_code || "").startsWith("BK") ||
    !String(b.code || b.booking_code || "").startsWith("DP");

  // 🌟 XỬ LÝ CHÍNH XÁC ĐƠN CỌC 30% VS ĐƠN TRẢ ĐỦ 100%
  const totalPrice = Number(b.total_price || room.daily_price || 0);

  const isDeposit =
    b.payment_type === "DEPOSIT_30" ||
    (Number(b.deposit_amount) > 0 && Number(b.deposit_amount) < totalPrice) ||
    (Number(b.paid_amount) > 0 && Number(b.paid_amount) < totalPrice) ||
    (Number(b.customer_paid) > 0 && Number(b.customer_paid) < totalPrice);

  // Số tiền khách thực tế đã trả (Cọc 30% hoặc 100%)
  const paidAmount = isDeposit
    ? Number(
        b.deposit_amount ||
          b.paid_amount ||
          b.customer_paid ||
          Math.round(totalPrice * 0.3),
      )
    : Number(
        b.paid_amount !== undefined
          ? b.paid_amount
          : b.customer_paid !== undefined
            ? b.customer_paid
            : totalPrice,
      );

  // Số tiền còn lại cần thu tại quầy
  const remainingAmount = Math.max(0, totalPrice - paidAmount);

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn font-sans">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden text-xs text-gray-900 animate-scaleUp my-auto">
        {/* ─── 1. HEADER ─── */}
        <div className="px-6 py-4 bg-white border-b border-gray-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="font-black text-lg text-gray-900 tracking-tight">
              Chi tiết {room.room_number}
            </h3>
            <span className="px-2.5 py-0.5 rounded-md bg-gray-100 text-gray-700 font-bold text-[11px] border border-gray-200">
              {room.type_name || "DELUXE"}
            </span>
            <span className="px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-800 font-black text-[11px] border border-amber-200 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
              Đã đặt trước
            </span>
            {isOnline && (
              <span className="px-2.5 py-0.5 rounded-md bg-blue-50 text-[#003580] font-bold text-[11px] border border-blue-200 flex items-center gap-1">
                <Globe size={12} className="text-[#006ce4]" />
                Đặt phòng online
              </span>
            )}
            {isDeposit && (
              <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-bold text-[11px] border border-emerald-200">
                Đã cọc 30%
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (
                  window.confirm(
                    `Bạn có chắc chắn muốn xóa/hủy đơn #${b.code || b.booking_code}?`,
                  )
                ) {
                  alert("Đã hủy đơn đặt phòng!");
                  onClose();
                }
              }}
              className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-gray-100 transition cursor-pointer"
              title="Hủy đơn đặt phòng"
            >
              <Trash2 size={16} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ─── 2. THÂN CHI TIẾT ─── */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 bg-white">
          {/* Lưới 2 cột thông tin */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-xs">
            <div className="space-y-3">
              <div>
                <span className="text-[11px] text-gray-400 font-semibold block">
                  Khách hàng
                </span>
                <span className="font-bold text-gray-900 text-sm block mt-0.5">
                  {b.customer_name || "Khách đặt trước"}
                </span>
                {b.guest_phone && (
                  <span className="text-gray-500 font-mono text-[11px]">
                    {b.guest_phone}
                  </span>
                )}
              </div>

              <div>
                <span className="text-[11px] text-gray-400 font-semibold block">
                  Nhận phòng
                </span>
                <strong className="text-gray-900 font-bold block mt-0.5">
                  {formatDisplayDateTime(b.checkin_date)}
                </strong>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-[11px] text-gray-400 font-semibold block">
                  Khách lưu trú
                </span>
                <strong className="text-gray-800 font-bold block mt-0.5">
                  {b.adult_total || 1} người lớn, {b.children_total || 0} trẻ
                  em, 0 giấy tờ
                </strong>
              </div>

              <div>
                <span className="text-[11px] text-gray-400 font-semibold block">
                  Trả phòng
                </span>
                <strong className="text-gray-900 font-bold block mt-0.5">
                  {formatDisplayDateTime(b.checkout_date)}
                </strong>
              </div>
            </div>
          </div>

          {/* Dòng mã đơn & Thời gian lưu trú */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 pt-3 border-t border-gray-100">
            <div>
              <span className="text-[11px] text-gray-400 font-semibold block">
                Mã đặt phòng
              </span>
              <span className="font-mono font-bold text-sm text-[#003580] mt-0.5 block">
                #{b.code || b.booking_code || "DP000005"}
              </span>
            </div>

            <div>
              <span className="text-[11px] text-gray-400 font-semibold block">
                Thời gian lưu trú
              </span>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="font-bold text-gray-900">
                  {b.rental_type === "HOUR"
                    ? `${b.stay_duration || 1} giờ`
                    : "1 đêm"}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 font-bold text-[11px] border border-amber-200 flex items-center gap-1">
                  <Clock size={12} className="text-amber-600" />
                  {countdownText || "Sắp đến nhận phòng"}
                </span>
              </div>
            </div>
          </div>

          {/* Ghi chú */}
          <div className="flex items-center gap-2 text-gray-600 bg-gray-50/70 p-3 rounded-xl border border-gray-100">
            <Edit3 size={14} className="text-gray-400 shrink-0" />
            <span className="text-xs">
              {b.note
                ? b.note
                : `Đặt phòng online: ${b.customer_name || "Quý khách"}`}
            </span>
          </div>

          {/* 🌟 HỘP QUYẾT TOÁN TÀI CHÍNH (ĐÃ TÁCH RÕ TIỀN CỌC 30% VÀ SỐ TIỀN CẦN THU TẠI QUẦY) */}
          <div className="bg-gray-50/80 border border-gray-200 rounded-2xl p-4 space-y-2.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-600 font-bold">
                Tổng tiền phòng ({room.room_number}):
              </span>
              <span className="font-black text-[#003580] text-sm tabular-nums">
                {formatVND(totalPrice)}
              </span>
            </div>

            <div className="flex justify-between items-center text-xs pt-2 border-t border-gray-200">
              <span className="text-gray-600 font-bold">
                {isDeposit
                  ? "Khách đã cọc trước (30%):"
                  : "Khách đã trả (100%):"}
              </span>
              <span className="font-black text-emerald-700 text-sm tabular-nums">
                {formatVND(paidAmount)}
              </span>
            </div>

            {/* Hiển thị rõ số tiền còn thiếu phải thu tại quầy nếu là đơn cọc 30% */}
            {isDeposit && remainingAmount > 0 && (
              <div className="flex justify-between items-center text-xs pt-2 border-t border-dashed border-rose-200 bg-rose-50/60 -mx-4 -mb-4 p-3 rounded-b-2xl">
                <span className="text-rose-700 font-extrabold flex items-center gap-1.5">
                  <AlertCircle size={14} />
                  Còn lại cần thu tại quầy:
                </span>
                <span className="font-black text-rose-600 text-sm tabular-nums">
                  {formatVND(remainingAmount)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ─── 3. FOOTER NÚT THAO TÁC ─── */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3 bg-gray-50/50 shrink-0">
          <button
            type="button"
            onClick={() => {
              if (onOpenChangeRoom) onOpenChangeRoom(room);
            }}
            className="px-4 py-2.5 border border-gray-200 hover:bg-white text-gray-700 font-bold rounded-xl cursor-pointer transition text-xs flex items-center gap-1.5 shadow-2xs"
          >
            <ArrowRightLeft size={13} />
            <span>Đổi phòng</span>
          </button>

          <button
            type="button"
            onClick={() => alert("Chức năng chỉnh sửa thông tin đặt phòng")}
            className="px-5 py-2.5 border border-gray-200 hover:bg-white text-gray-700 font-bold rounded-xl cursor-pointer transition text-xs shadow-2xs"
          >
            Sửa đặt phòng
          </button>

          <button
            type="button"
            onClick={onOpenConfirmCheckIn}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-md cursor-pointer transition active:scale-95 text-xs flex items-center gap-1.5"
          >
            <CheckCircle2 size={15} />
            <span>
              {isDeposit && remainingAmount > 0
                ? `Thu ${formatVND(remainingAmount)} & Nhận phòng`
                : "Nhận phòng"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
