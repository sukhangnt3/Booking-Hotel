// src/pages/reception/components/IncomingRoomModal.jsx
import React, { useMemo } from "react";
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

  const totalPrice = Number(b.total_price || room.daily_price || 0);

  const isDeposit =
    b.payment_type === "DEPOSIT_30" ||
    Boolean(room.is_deposit) ||
    (Number(b.deposit_amount) > 0 && Number(b.deposit_amount) < totalPrice) ||
    (Number(b.paid_amount) > 0 && Number(b.paid_amount) < totalPrice);

  const paidAmount = isDeposit
    ? Number(
        b.deposit_amount ||
          b.paid_amount ||
          b.customer_paid ||
          Math.round(totalPrice * 0.3),
      )
    : totalPrice;

  const remainingAmount = Math.max(0, totalPrice - paidAmount);

  // 🌟 TÍNH THỜI GIAN LƯU TRÚ CHUẨN XÁC (KHÔNG BỊ LỖI "0 PHÚT GIỜ")
  const durationDisplay = useMemo(() => {
    const inDate = String(b.checkin_date || "").slice(0, 10);
    const outDate = String(b.checkout_date || inDate).slice(0, 10);
    const inTime = String(b.checkin_time || "14:00").slice(0, 5);
    const outTime = String(b.checkout_time || "12:00").slice(0, 5);

    if (inDate && outDate) {
      const startMs = new Date(`${inDate}T${inTime}:00`).getTime();
      const endMs = new Date(`${outDate}T${outTime}:00`).getTime();
      const diffMs = Math.max(0, endMs - startMs);

      if (b.rental_type === "HOUR") {
        const hours = Math.max(1, Math.round(diffMs / (1000 * 60 * 60)));
        return `${hours} giờ`;
      }
      if (b.rental_type === "OVERNIGHT") return "1 đêm";
      const days = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
      return `${days} ngày`;
    }

    return b.rental_type === "HOUR" ? "2 giờ" : "1 đêm";
  }, [b]);

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
              <span className="px-2.5 py-0.5 rounded-md bg-amber-400 text-gray-950 font-black text-[11px] shadow-xs">
                Cọc 30% Online
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (
                  window.confirm(
                    `Bạn có chắc chắn muốn hủy đơn #${b.code || b.booking_code}?`,
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
                  {formatDisplayDateTime(b.checkin_date, b.checkin_time)}
                </strong>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-[11px] text-gray-400 font-semibold block">
                  Khách lưu trú
                </span>
                <strong className="text-gray-800 font-bold block mt-0.5">
                  {b.adult_total || 1} người lớn, {b.children_total || 0} trẻ em
                </strong>
              </div>

              <div>
                <span className="text-[11px] text-gray-400 font-semibold block">
                  Trả phòng
                </span>
                <strong className="text-gray-900 font-bold block mt-0.5">
                  {formatDisplayDateTime(b.checkout_date, b.checkout_time)}
                </strong>
              </div>
            </div>
          </div>

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
                <span className="font-bold text-gray-900 text-sm">
                  {durationDisplay}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 font-bold text-[11px] border border-amber-200 flex items-center gap-1">
                  <Clock size={12} className="text-amber-600" />
                  {countdownText || "Sắp đến nhận phòng"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-gray-600 bg-gray-50/70 p-3 rounded-xl border border-gray-100">
            <Edit3 size={14} className="text-gray-400 shrink-0" />
            <span className="text-xs">
              {b.note
                ? b.note
                : `Đặt phòng online: ${b.customer_name || "Quý khách"}`}
            </span>
          </div>

          <div className="bg-gray-50/80 border border-gray-200 rounded-2xl p-4 space-y-2.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-600 font-bold">
                Tổng tiền phòng ({room.room_number}):
              </span>
              <span className="font-black text-[#003580] text-sm tabular-nums">
                {formatVND(totalPrice)} ₫
              </span>
            </div>

            <div className="flex justify-between items-center text-xs pt-2 border-t border-gray-200">
              <span className="text-gray-600 font-bold">
                {isDeposit
                  ? "Khách đã cọc trước qua sàn (30%):"
                  : "Khách đã trả đủ qua sàn (100%):"}
              </span>
              <span className="font-black text-emerald-700 text-sm tabular-nums">
                {formatVND(paidAmount)} ₫
              </span>
            </div>

            {isDeposit && remainingAmount > 0 && (
              <div className="flex justify-between items-center text-xs pt-2 border-t border-dashed border-rose-200 bg-rose-50/70 -mx-4 -mb-4 p-3 rounded-b-2xl">
                <div>
                  <span className="text-rose-700 font-extrabold flex items-center gap-1.5">
                    <AlertCircle size={14} />
                    Còn lại cần thu tại quầy:
                  </span>
                  <span className="text-[10px] text-rose-500 font-medium block mt-0.5">
                    (Yêu cầu thu 70% còn lại trước khi giao chìa khóa)
                  </span>
                </div>
                <span className="font-black text-rose-600 text-base tabular-nums">
                  {formatVND(remainingAmount)} ₫
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ─── 3. FOOTER ─── */}
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
            onClick={onOpenConfirmCheckIn}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-md cursor-pointer transition active:scale-95 text-xs flex items-center gap-1.5"
          >
            <CheckCircle2 size={15} />
            <span>
              {isDeposit && remainingAmount > 0
                ? `Thu ${formatVND(remainingAmount)} ₫ & Nhận phòng`
                : "Nhận phòng ngay"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
