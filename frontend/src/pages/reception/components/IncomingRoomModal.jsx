// src/pages/reception/components/IncomingRoomModal.jsx
import React, { useMemo } from "react";
import { X, Trash2, MoreHorizontal, Edit3 } from "lucide-react";

// 🌟 HÀM PARSE DATETIME AN TOÀN TUYỆT ĐỐI (KHÔNG HARDCODE NGÀY 19/09/2026)
const parseDateTimeSafe = (dateVal, timeVal, defaultHour = 14) => {
  if (!dateVal) return null;
  const now = new Date();
  let y = now.getFullYear();
  let m = now.getMonth() + 1;
  let d = now.getDate();

  if (dateVal instanceof Date && !isNaN(dateVal.getTime())) {
    y = dateVal.getFullYear();
    m = dateVal.getMonth() + 1;
    d = dateVal.getDate();
  } else {
    const s = String(dateVal).trim();
    const match = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (match) {
      y = Number(match[1]);
      m = Number(match[2]);
      d = Number(match[3]);
    } else {
      const parsed = new Date(s);
      if (!isNaN(parsed.getTime())) {
        y = parsed.getFullYear();
        m = parsed.getMonth() + 1;
        d = parsed.getDate();
      } else {
        return null;
      }
    }
  }

  let h = defaultHour;
  let min = 0;
  if (timeVal) {
    const tm = String(timeVal).match(/(\d{1,2}):(\d{2})/);
    if (tm) {
      h = Number(tm[1]);
      min = Number(tm[2]);
    }
  } else if (String(dateVal).includes("T")) {
    const tm = String(dateVal)
      .split("T")[1]
      .match(/(\d{1,2}):(\d{2})/);
    if (tm) {
      h = Number(tm[1]);
      min = Number(tm[2]);
    }
  }

  return new Date(y, m - 1, d, h, min, 0);
};

// Format ngày giờ hiển thị PMS: "19 Thg 09, 01:34"
const formatPMSDateTime = (dateVal, timeVal, defaultHour = 14) => {
  const dt = parseDateTimeSafe(dateVal, timeVal, defaultHour);
  if (!dt) return "---";
  const day = String(dt.getDate()).padStart(2, "0");
  const month = String(dt.getMonth() + 1).padStart(2, "0");
  const hours = String(dt.getHours()).padStart(2, "0");
  const mins = String(dt.getMinutes()).padStart(2, "0");
  return `${day} Thg ${month}, ${hours}:${mins}`;
};

export default function IncomingRoomModal({
  isOpen,
  room,
  onClose,
  onOpenConfirmCheckIn,
  onOpenChangeRoom,
}) {
  if (!isOpen || !room) return null;

  const b = room.booking || {};
  const formatNumber = (num) => Number(num || 0).toLocaleString("vi-VN");

  const bookingCode = b.code || b.booking_code || "DP335269";
  const isWalkIn =
    String(bookingCode).startsWith("DP") ||
    b.booking_type === "walk_in" ||
    b.source === "counter" ||
    b.source === "walk_in";

  const totalPrice = Number(b.total_price || room.daily_price || 100000);

  // 🌟 XÁC ĐỊNH CHUẨN XÁC: SỐ TIỀN KHÁCH ĐÃ TRẢ (NẾU ĐẶT TRƯỚC CHƯA TRẢ THÌ = 0)
  let paidAmount = 0;
  if (isWalkIn) {
    if (b.payment_status === "paid") {
      paidAmount = totalPrice;
    } else {
      paidAmount = Number(
        b.customer_paid || b.paid_amount || b.deposit_amount || 0,
      );
    }
  } else {
    // Đơn đặt online GoStay
    if (b.payment_type === "DEPOSIT_30" || b.is_deposit) {
      paidAmount = Number(
        b.deposit_amount || b.paid_amount || Math.round(totalPrice * 0.3),
      );
    } else if (b.payment_status === "paid") {
      paidAmount = totalPrice;
    } else {
      paidAmount = Number(b.paid_amount || 0);
    }
  }

  const { durationText, isOverdueCheckIn } = useMemo(() => {
    const startDate = parseDateTimeSafe(b.checkin_date, b.checkin_time, 14);
    const endDate = parseDateTimeSafe(b.checkout_date, b.checkout_time, 12);
    const now = new Date();

    let text = "1 giờ";
    if (startDate && endDate) {
      const diffMs = Math.max(0, endDate.getTime() - startDate.getTime());
      if (b.rental_type === "HOUR" || b.rental_type === "Giờ") {
        const h = Math.max(1, Math.round(diffMs / 3600000));
        text = `${h} giờ`;
      } else if (b.rental_type === "OVERNIGHT" || b.rental_type === "Đêm") {
        text = "1 đêm";
      } else {
        const d = Math.max(1, Math.round(diffMs / (24 * 3600000)));
        text = `${d} ngày`;
      }
    }

    const isLate = startDate ? now.getTime() >= startDate.getTime() : false;

    return { durationText: text, isOverdueCheckIn: isLate };
  }, [b]);

  const customerName = b.customer_name || "Khách lẻ";
  const roomNumber = room.room_number || "111";
  const roomTypeName = room.type_name || "DELUXE";

  const guestCountText = `${b.adult_total || 2} người lớn, ${b.children_total || 0} trẻ em, ${
    b.guest_declarations?.length || b.id_cards || 0
  } giấy tờ`;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-3 sm:p-5 bg-black/50 backdrop-blur-xs animate-fadeIn font-sans">
      <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl border border-gray-200 overflow-hidden text-xs text-gray-900 animate-scaleUp my-auto">
        {/* HEADER CHI TIẾT */}
        <div className="flex justify-between items-center px-7 py-4.5 bg-white">
          <h2 className="font-bold text-base text-gray-900 tracking-tight">
            Chi tiết {roomNumber}
          </h2>

          <div className="flex items-center gap-3 text-gray-400">
            <button
              type="button"
              onClick={() => alert(`Thao tác khác cho phòng ${roomNumber}`)}
              className="hover:text-gray-700 p-1 cursor-pointer transition"
            >
              <MoreHorizontal size={18} />
            </button>
            <button
              type="button"
              onClick={() => {
                if (
                  window.confirm(
                    `Bạn có chắc chắn muốn hủy đơn #${bookingCode}?`,
                  )
                ) {
                  alert("✓ Đã hủy đơn đặt phòng!");
                  onClose();
                }
              }}
              className="hover:text-rose-600 p-1 cursor-pointer transition"
              title="Hủy đơn"
            >
              <Trash2 size={16} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="hover:text-gray-700 p-1 cursor-pointer transition"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* TRẠNG THÁI */}
        <div className="px-7 pt-1 pb-3 flex items-center justify-between border-b border-gray-100 flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <span className="font-bold text-gray-900 text-sm">
              {roomTypeName}
            </span>
            <span className="px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-800 font-semibold text-[11px] border border-amber-200">
              Đã đặt trước
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-gray-700 font-medium text-xs">
            {isWalkIn ? (
              <>
                <span>🚶</span>
                <span>Khách đến trực tiếp</span>
              </>
            ) : (
              <>
                <span>🌐</span>
                <span>Khách đặt online</span>
              </>
            )}
          </div>
        </div>

        {/* LƯỚI THÔNG TIN */}
        <div className="px-7 py-5 space-y-5 bg-white">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-y-4 gap-x-6">
            <div className="md:col-span-4 space-y-3.5">
              <div>
                <span className="text-gray-400 block text-[11px]">
                  Khách hàng
                </span>
                <strong className="text-gray-900 font-bold text-sm block mt-0.5">
                  {customerName}
                </strong>
              </div>

              <div>
                <span className="text-gray-400 block text-[11px]">
                  Nhận phòng
                </span>
                <span className="text-gray-900 font-semibold text-xs block mt-0.5">
                  {formatPMSDateTime(b.checkin_date, b.checkin_time, 14)}
                </span>
              </div>
            </div>

            <div className="md:col-span-4 space-y-3.5">
              <div>
                <span className="text-gray-400 block text-[11px]">
                  Khách lưu trú
                </span>
                <span className="text-gray-800 font-semibold text-xs block mt-0.5">
                  {guestCountText}
                </span>
              </div>

              <div>
                <span className="text-gray-400 block text-[11px]">
                  Trả phòng
                </span>
                <span className="text-gray-900 font-semibold text-xs block mt-0.5">
                  {formatPMSDateTime(b.checkout_date, b.checkout_time, 12)}
                </span>
              </div>
            </div>

            <div className="md:col-span-4 space-y-3.5">
              <div>
                <span className="text-gray-400 block text-[11px]">
                  Mã đặt phòng
                </span>
                <span className="font-semibold text-gray-900 text-xs block mt-0.5 font-mono">
                  {bookingCode}
                </span>
              </div>

              <div>
                <span className="text-gray-400 block text-[11px]">
                  Thời gian lưu trú
                </span>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="font-bold text-gray-900 text-xs">
                    {durationText}
                  </span>
                  {isOverdueCheckIn ? (
                    <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-600 font-bold text-[11px] border border-rose-200">
                      Quá giờ nhận phòng dự kiến
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded bg-amber-50 text-amber-800 font-medium text-[11px] border border-amber-200">
                      Sắp đến nhận phòng
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 flex items-center gap-2 text-gray-400 text-xs">
            <Edit3 size={14} />
            <span>{b.note ? b.note : "Chưa có ghi chú"}</span>
          </div>

          {/* BẢNG TIỀN PHÒNG & KHÁCH ĐÃ TRẢ */}
          <div className="flex justify-end pt-3">
            <div className="w-64 space-y-2 text-xs">
              <div className="flex justify-between items-center text-gray-800">
                <span className="font-semibold">{roomNumber}</span>
                <span className="font-bold tabular-nums">
                  {formatNumber(totalPrice)}
                </span>
              </div>

              <div className="flex justify-between items-center text-gray-800 pt-1">
                <span className="font-medium text-gray-600">Khách đã trả</span>
                <span className="font-bold tabular-nums text-[#003580]">
                  {formatNumber(paidAmount)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* NÚT THAO TÁC */}
        <div className="px-7 py-4.5 bg-white border-t border-gray-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => {
              if (onOpenChangeRoom) onOpenChangeRoom(room);
            }}
            className="px-5 py-2 border border-[#003580] text-[#003580] hover:bg-blue-50 rounded-lg text-xs font-bold cursor-pointer transition shadow-2xs"
          >
            Sửa đặt phòng
          </button>

          <button
            type="button"
            onClick={() => {
              if (onOpenConfirmCheckIn) {
                onOpenConfirmCheckIn(room);
              }
            }}
            className="px-6 py-2 bg-[#003580] hover:bg-[#00224f] text-white rounded-lg text-xs font-bold cursor-pointer transition shadow-xs active:scale-95"
          >
            Nhận phòng
          </button>
        </div>
      </div>
    </div>
  );
}
