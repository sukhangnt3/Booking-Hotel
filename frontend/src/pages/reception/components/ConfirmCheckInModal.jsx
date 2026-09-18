// src/pages/reception/components/ConfirmCheckInModal.jsx
import React, { useMemo } from "react";
import {
  User,
  Users,
  X,
  CheckCircle2,
  Key,
  AlertCircle,
  Calendar,
  Clock,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

// Hàm trích xuất ngày an toàn tuyệt đối (Chống lỗi Sat Sep 19)
const safeExtractDateISO = (val) => {
  if (!val) return "";
  if (val instanceof Date && !isNaN(val.getTime())) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, "0");
    const d = String(val.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const s = String(val).trim();
  const match = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;

  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  return "";
};

// Hàm trích xuất giờ an toàn (Chống lỗi NaN)
const safeExtractTimeHM = (val, defaultTime = "14:00") => {
  if (!val) return defaultTime;
  const s = String(val).trim();
  const match = s.match(/(\d{1,2}):(\d{2})/);
  if (match) {
    return `${match[1].padStart(2, "0")}:${match[2]}`;
  }
  return defaultTime;
};

export default function ConfirmCheckInModal({
  isOpen,
  onClose,
  room,
  confirmData,
  setConfirmData,
  onOpenGuestStay,
  onFinalExecuteCheckIn,
  guestCount,
  guestList,
  toDatetimeLocal,
}) {
  if (!isOpen || !room) return null;

  const b = room.booking || {};
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

  const remainingToCollect = Math.max(0, totalPrice - paidAmount);

  // Tính toán thời gian không bao giờ ra NaN
  const recalculateDuration = (inTimeStr, outTimeStr) => {
    if (!inTimeStr || !outTimeStr) return "1 đêm";
    const startMs = new Date(inTimeStr).getTime();
    const endMs = new Date(outTimeStr).getTime();

    if (isNaN(startMs) || isNaN(endMs)) return "1 đêm";
    const diffMs = Math.max(0, endMs - startMs);

    if (b.rental_type === "HOUR" || diffMs <= 24 * 60 * 60 * 1000) {
      const hours = Math.max(1, Math.round(diffMs / (1000 * 60 * 60)));
      if (hours < 24) return `${hours} giờ`;
    }
    const days = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
    return `${days} ngày`;
  };

  const handleSetModeCurrent = () => {
    const now = new Date();
    const newIn = toDatetimeLocal(now);

    let newOut = confirmData.checkout_time;
    const origIn = new Date(confirmData.checkin_time || now);
    const origOut = new Date(confirmData.checkout_time || now);
    const origHours =
      !isNaN(origIn.getTime()) && !isNaN(origOut.getTime())
        ? Math.max(1, Math.round((origOut - origIn) / (1000 * 60 * 60)))
        : b.rental_type === "HOUR"
          ? 2
          : 24;

    const outD = new Date(now);
    outD.setHours(outD.getHours() + origHours);
    newOut = toDatetimeLocal(outD);

    setConfirmData((prev) => ({
      ...prev,
      checkin_mode: "Hiện tại",
      checkin_time: newIn,
      checkout_time: newOut,
      duration_label: recalculateDuration(newIn, newOut),
    }));
  };

  const handleSetModeBooked = () => {
    const inDate =
      safeExtractDateISO(b.checkin_date) || safeExtractDateISO(new Date());
    const outDate = safeExtractDateISO(b.checkout_date) || inDate;
    const inTime = safeExtractTimeHM(b.checkin_time, "14:00");
    const outTime = safeExtractTimeHM(b.checkout_time, "12:00");

    const bookedIn = `${inDate}T${inTime}`;
    const bookedOut = `${outDate}T${outTime}`;

    setConfirmData((prev) => ({
      ...prev,
      checkin_mode: "Giờ đặt",
      checkin_time: bookedIn,
      checkout_time: bookedOut,
      duration_label: recalculateDuration(bookedIn, bookedOut),
    }));
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-3 sm:p-5 bg-black/65 backdrop-blur-xs animate-fadeIn font-sans">
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl border border-gray-200 overflow-hidden text-xs text-gray-900 animate-scaleUp my-auto">
        {/* ─── 1. HEADER MODAL XANH GOSTAY ─── */}
        <div className="bg-[#003580] text-white px-7 py-4.5 flex items-center justify-between shadow-xs shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-white shadow-inner">
              <Key size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="font-black text-lg tracking-tight leading-none text-white">
                  Xác Nhận Nhận Phòng
                </h3>
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-white/20 text-white font-bold border border-white/15">
                  #{b.code || b.booking_code || "BK19802931"}
                </span>
              </div>
              <p className="text-[11px] text-blue-100/80 font-medium mt-1 leading-none">
                Phòng {room.room_number} •{" "}
                {room.type_name || "Phòng tiêu chuẩn"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white rounded-xl hover:bg-white/10 transition cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* ─── 2. NỘI DUNG CHÍNH (THIẾT KẾ CARD RỘNG RÃI, KHÔNG BỊ TRÀN) ─── */}
        <div className="p-7 space-y-5 overflow-y-auto flex-1 bg-white">
          {/* THANH THÔNG TIN KHÁCH HÀNG & PHÒNG */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-7 bg-blue-50/70 p-4 rounded-2xl border border-blue-200/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs">
                  <User size={18} />
                </div>
                <div>
                  <span className="font-black text-[#003580] text-sm block">
                    {b.customer_name || "Khách lẻ tại quầy"}
                  </span>
                  <span className="text-[11px] text-gray-500 font-mono mt-0.5 block">
                    Điện thoại: {b.guest_phone || "Chưa cập nhật SĐT"}
                  </span>
                </div>
              </div>
              <span className="px-3 py-1 rounded-xl bg-white border border-blue-200 font-black text-[#003580] text-xs">
                Phòng {room.room_number}
              </span>
            </div>

            <div className="md:col-span-5 bg-gray-50 p-4 rounded-2xl border border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-700 font-bold">
                <Users size={16} className="text-[#006ce4]" />
                <span>Số khách lưu trú:</span>
              </div>
              <span className="font-black text-gray-900 bg-white px-3 py-1 rounded-xl border border-gray-200 shadow-2xs">
                {guestCount.adult} lớn, {guestCount.children} trẻ
              </span>
            </div>
          </div>

          {/* CẢNH BÁO TIỀN CỌC 30% */}
          {isDeposit && remainingToCollect > 0 && (
            <div className="p-4 bg-amber-50/90 border border-amber-300 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-amber-900 font-bold">
                <AlertCircle size={18} className="text-amber-600 shrink-0" />
                <div>
                  <span className="text-xs font-black block">
                    Khách cọc online 30%. Cần thu nốt tại quầy:
                  </span>
                  <span className="text-[11px] text-amber-700 font-medium">
                    (Vui lòng thu đủ số tiền còn lại trước khi bàn giao chìa
                    khóa)
                  </span>
                </div>
              </div>
              <span className="font-black text-rose-600 text-base tabular-nums">
                {Number(remainingToCollect).toLocaleString("vi-VN")} ₫
              </span>
            </div>
          )}

          {/* 🌟 THIẾT KẾ MỚI: 2 HỘP LỊCH CHỌN NGÀY GIỜ CỰC KỲ RỘNG RÃI */}
          <div className="bg-gray-50/70 p-5.5 rounded-3xl border border-gray-200 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-gray-200/80">
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-[#003580]" />
                <span className="font-black text-gray-900 text-xs uppercase tracking-wider">
                  Thời Gian Nhận & Trả Phòng
                </span>
              </div>

              {/* Nút chuyển chế độ Hiện tại / Giờ đặt */}
              <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-gray-200 shadow-2xs">
                <button
                  type="button"
                  onClick={handleSetModeCurrent}
                  className={`px-3 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                    confirmData.checkin_mode === "Hiện tại"
                      ? "bg-[#003580] text-white shadow-xs"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Hiện tại (Check-in ngay)
                </button>
                <button
                  type="button"
                  onClick={handleSetModeBooked}
                  className={`px-3 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                    confirmData.checkin_mode === "Giờ đặt"
                      ? "bg-[#003580] text-white shadow-xs"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Theo giờ khách đặt
                </button>
              </div>
            </div>

            {/* GRID 2 CỘT: KHÔNG BAO GIỜ BỊ SQUEEZE HAY TRÀN RA NGOÀI */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* HỘP 1: NHẬN PHÒNG */}
              <div className="space-y-2 bg-white p-4.5 rounded-2xl border border-gray-200 shadow-2xs">
                <label className="font-black text-gray-800 text-xs flex items-center gap-1.5">
                  <Clock size={14} className="text-[#006ce4]" />
                  <span>Thời gian Nhận phòng:</span>
                </label>
                <input
                  type="datetime-local"
                  value={confirmData.checkin_time}
                  onChange={(e) => {
                    const newIn = e.target.value;
                    setConfirmData((prev) => ({
                      ...prev,
                      checkin_time: newIn,
                      duration_label: recalculateDuration(
                        newIn,
                        prev.checkout_time,
                      ),
                    }));
                  }}
                  className="w-full h-11 px-3.5 border border-gray-300 rounded-xl outline-none font-bold text-gray-900 bg-gray-50/50 focus:bg-white focus:border-[#003580] transition text-xs shadow-inner"
                />
              </div>

              {/* HỘP 2: TRẢ PHÒNG */}
              <div className="space-y-2 bg-white p-4.5 rounded-2xl border border-gray-200 shadow-2xs">
                <label className="font-black text-gray-800 text-xs flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Clock size={14} className="text-emerald-600" />
                    Thời gian Trả phòng dự kiến:
                  </span>
                  <span className="px-2.5 py-0.5 rounded-lg bg-blue-50 text-[#003580] font-black border border-blue-200 text-[11px]">
                    {confirmData.duration_label}
                  </span>
                </label>
                <input
                  type="datetime-local"
                  value={confirmData.checkout_time}
                  onChange={(e) => {
                    const newOut = e.target.value;
                    setConfirmData((prev) => ({
                      ...prev,
                      checkout_time: newOut,
                      duration_label: recalculateDuration(
                        prev.checkin_time,
                        newOut,
                      ),
                    }));
                  }}
                  className="w-full h-11 px-3.5 border border-gray-300 rounded-xl outline-none font-bold text-gray-900 bg-gray-50/50 focus:bg-white focus:border-[#003580] transition text-xs shadow-inner"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ─── 3. FOOTER NÚT THAO TÁC RỘNG RÃI ─── */}
        <div className="px-7 py-4.5 border-t border-gray-100 flex items-center justify-between bg-gray-50/80 shrink-0">
          <button
            type="button"
            onClick={onOpenGuestStay}
            className="px-5 py-2.5 border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 font-bold rounded-xl cursor-pointer transition text-xs shadow-2xs flex items-center gap-1.5"
          >
            <ShieldCheck size={16} className="text-[#006ce4]" />
            <span>Khai báo CCCD / Khách đi cùng ({guestList.length})</span>
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-bold rounded-xl cursor-pointer transition text-xs shadow-2xs"
            >
              Bỏ qua
            </button>
            <button
              type="button"
              onClick={onFinalExecuteCheckIn}
              className="px-7 py-2.5 bg-[#003580] hover:bg-blue-900 text-white font-black rounded-xl shadow-md cursor-pointer transition active:scale-95 text-xs flex items-center gap-2"
            >
              <CheckCircle2 size={16} />
              <span>
                {isDeposit && remainingToCollect > 0
                  ? `Đã thu ${Number(remainingToCollect).toLocaleString("vi-VN")} ₫ & Giao phòng`
                  : "Xác nhận giao phòng"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
