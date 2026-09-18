// src/pages/reception/components/ConfirmCheckInModal.jsx
import React from "react";
import { User, Users, X, CheckCircle2, Key, AlertCircle } from "lucide-react";

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
    ? Number(b.deposit_amount || b.paid_amount || Math.round(totalPrice * 0.3))
    : totalPrice;

  const remainingToCollect = Math.max(0, totalPrice - paidAmount);

  // Hàm tính lại số giờ/ngày khi thay đổi thời gian
  const recalculateDuration = (inTimeStr, outTimeStr) => {
    if (!inTimeStr || !outTimeStr) return "1 đêm";
    const startMs = new Date(inTimeStr).getTime();
    const endMs = new Date(outTimeStr).getTime();
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

    // Nếu là thuê giờ, tự động cộng thêm số giờ đã đặt
    let newOut = confirmData.checkout_time;
    if (b.rental_type === "HOUR") {
      const origIn = new Date(confirmData.checkin_time || now);
      const origOut = new Date(confirmData.checkout_time || now);
      const origHours =
        Math.max(1, Math.round((origOut - origIn) / (1000 * 60 * 60))) || 2;

      const outD = new Date(now);
      outD.setHours(outD.getHours() + origHours);
      newOut = toDatetimeLocal(outD);
    }

    setConfirmData((prev) => ({
      ...prev,
      checkin_mode: "Hiện tại",
      checkin_time: newIn,
      checkout_time: newOut,
      duration_label: recalculateDuration(newIn, newOut),
    }));
  };

  const handleSetModeBooked = () => {
    const inDate = String(b.checkin_date || "").slice(0, 10);
    const outDate = String(b.checkout_date || inDate).slice(0, 10);
    const inTime = String(b.checkin_time || "14:00").slice(0, 5);
    const outTime = String(b.checkout_time || "12:00").slice(0, 5);

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
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn font-sans">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl border border-gray-200 overflow-hidden text-xs text-gray-900 animate-scaleUp my-auto">
        <div className="bg-[#003580] text-white p-5 flex items-center justify-between shadow-xs shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-white shadow-inner">
              <Key size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base tracking-tight leading-none text-white">
                  Xác Nhận Nhận Phòng
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/20 text-white font-bold">
                  #{b.code || b.booking_code || "DP000008"}
                </span>
              </div>
              <p className="text-[11px] text-blue-100/80 font-medium mt-1 leading-none">
                Kiểm tra mốc thời gian nhận - trả phòng trước khi giao chìa khóa
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white rounded-xl hover:bg-white/10 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto flex-1 bg-white">
          <div className="flex items-center justify-between text-gray-800 bg-blue-50/60 p-3.5 rounded-2xl border border-blue-200/80 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-100 text-[#003580] flex items-center justify-center">
                <User size={15} />
              </div>
              <div>
                <span className="font-black text-[#003580] text-xs block">
                  {b.customer_name || "Khách lẻ"}
                </span>
                <span className="text-[11px] text-gray-500 font-mono">
                  {b.guest_phone || "Chưa có số điện thoại"}
                </span>
              </div>
            </div>

            <div className="text-xs font-bold text-gray-700 flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-blue-100 shadow-2xs">
              <Users size={14} className="text-[#006ce4]" />
              <span>
                {guestCount.adult} người lớn, {guestCount.children} trẻ em
                {guestList.length > 0 && ` (${guestList.length} CCCD)`}
              </span>
            </div>
          </div>

          {isDeposit && remainingToCollect > 0 && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold">
                <AlertCircle size={16} className="text-rose-600 shrink-0" />
                <span>Lưu ý: Khách mới cọc 30%. Cần thu 70% tại quầy:</span>
              </div>
              <span className="font-black text-rose-600 text-sm tabular-nums">
                {Number(remainingToCollect).toLocaleString("vi-VN")} ₫
              </span>
            </div>
          )}

          <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 border-b border-gray-200 text-xs uppercase font-bold tracking-wider">
                  <th className="py-3 px-4">Hạng phòng</th>
                  <th className="py-3 px-4">Phòng</th>
                  <th className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span>Nhận phòng</span>
                      <button
                        type="button"
                        onClick={handleSetModeCurrent}
                        className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black cursor-pointer transition ${
                          confirmData.checkin_mode === "Hiện tại"
                            ? "bg-[#003580] text-white shadow-2xs"
                            : "border border-gray-200 text-gray-600 bg-white hover:bg-gray-100"
                        }`}
                      >
                        Hiện tại
                      </button>
                      <button
                        type="button"
                        onClick={handleSetModeBooked}
                        className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black cursor-pointer transition ${
                          confirmData.checkin_mode === "Giờ đặt"
                            ? "bg-[#003580] text-white shadow-2xs"
                            : "border border-gray-200 text-gray-600 bg-white hover:bg-gray-100"
                        }`}
                      >
                        Giờ đặt
                      </button>
                    </div>
                  </th>
                  <th className="py-3 px-4">Trả phòng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                <tr>
                  <td className="py-3.5 px-4 font-bold text-gray-900">
                    {room.type_name}
                  </td>
                  <td className="py-3.5 px-4 font-black text-[#003580]">
                    P.{room.room_number}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
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
                        className="border border-gray-200 rounded-xl px-2.5 py-1.5 outline-none text-gray-900 font-bold bg-white focus:border-[#003580]"
                      />
                      <span className="text-[#006ce4] font-black whitespace-nowrap bg-blue-50 px-2 py-1 rounded-md border border-blue-100 text-[11px]">
                        {confirmData.duration_label}
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
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
                      className="border border-gray-200 rounded-xl px-2.5 py-1.5 outline-none text-gray-900 font-bold bg-white focus:border-[#003580]"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3 bg-gray-50/70 shrink-0">
          <button
            type="button"
            onClick={onOpenGuestStay}
            className="px-5 py-2.5 border border-gray-200 text-gray-800 hover:bg-white font-bold rounded-xl cursor-pointer transition text-xs shadow-2xs"
          >
            Thêm thông tin khách
          </button>

          <button
            type="button"
            onClick={onFinalExecuteCheckIn}
            className="px-6 py-2.5 bg-[#003580] hover:bg-blue-900 text-white font-black rounded-xl shadow-md cursor-pointer transition active:scale-95 text-xs flex items-center gap-2"
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
  );
}
