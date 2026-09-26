// src/pages/reception/components/CheckInGuestStayModal.jsx
import React, { useState, useEffect } from "react";
import { ArrowLeft, X, Plus, QrCode, Camera, ChevronDown } from "lucide-react";

// Format ngày giờ PMS: "19 Thg 09, 01:45"
const formatPMSDateTime = (isoStr) => {
  if (!isoStr) return "---";
  const s = String(isoStr).trim();
  const match = s.match(
    /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})[T\s](\d{1,2}):(\d{2})/,
  );
  if (match) {
    const day = String(match[3]).padStart(2, "0");
    const month = String(match[2]).padStart(2, "0");
    const hours = String(match[4]).padStart(2, "0");
    const mins = String(match[5]).padStart(2, "0");
    return `${day} Thg ${month}, ${hours}:${mins}`;
  }

  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return String(isoStr);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");
  return `${day} Thg ${month}, ${hours}:${mins}`;
};

export default function CheckInGuestStayModal({
  isOpen,
  onClose,
  room,
  confirmData,
  guestCount,
  guestList = [],
  setGuestList,
  onOpenGuestDocForm,
  onFinalExecuteCheckIn,
}) {
  if (!isOpen || !room) return null;

  const b = room.booking || {};
  const bookingCode = b.code || b.booking_code || "DP000010";
  const customerName = b.customer_name || "Khách lẻ";
  const roomNumber = confirmData?.room_number || room.room_number || "111";

  const formatNumber = (num) => Number(num || 0).toLocaleString("vi-VN");
  const totalPrice = Number(b.total_price || room.daily_price || 100000);

  // 🌟 XÁC ĐỊNH CHUẨN XÁC: SỐ TIỀN KHÁCH ĐÃ TRẢ THỰC TẾ
  const isWalkIn =
    String(bookingCode).startsWith("DP") ||
    b.source === "counter" ||
    b.booking_type === "walk_in";

  let alreadyPaid = 0;
  if (isWalkIn) {
    // Với đơn đặt tại quầy: nếu chưa thanh toán (unpaid) thì đã trả = 0, chỉ lấy khi có customer_paid > 0 thật sự
    if (b.payment_status === "paid") {
      alreadyPaid = Number(b.customer_paid ?? b.paid_amount ?? totalPrice);
    } else {
      alreadyPaid = Number(
        b.customer_paid || b.paid_amount || b.deposit_amount || 0,
      );
    }
  } else {
    // Đơn đặt online qua GoStay
    if (b.payment_type === "DEPOSIT_30" || b.is_deposit) {
      alreadyPaid = Number(
        b.deposit_amount || b.paid_amount || Math.round(totalPrice * 0.3),
      );
    } else if (b.payment_status === "paid") {
      alreadyPaid = totalPrice;
    } else {
      alreadyPaid = Number(b.paid_amount || 0);
    }
  }

  // Khách thanh toán lúc này (mặc định = Cần trả - Đã trả)
  const remainingNeedToPay = Math.max(0, totalPrice - alreadyPaid);
  const [collectAmount, setCollectAmount] = useState(remainingNeedToPay);
  const [paymentMethod, setPaymentMethod] = useState("Tiền mặt");
  const [stayNote, setStayNote] = useState(b.note || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setCollectAmount(remainingNeedToPay);
  }, [remainingNeedToPay]);

  const handleExecuteDone = async () => {
    setIsSubmitting(true);
    try {
      if (onFinalExecuteCheckIn) {
        await onFinalExecuteCheckIn({
          collected_at_counter: collectAmount,
          note: stayNote,
          payment_method: paymentMethod,
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1010] flex items-center justify-center p-3 sm:p-5 bg-black/50 backdrop-blur-xs font-sans animate-fadeIn">
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl border border-gray-200 overflow-hidden text-xs text-gray-900 animate-scaleUp my-auto flex flex-col max-h-[92vh]">
        {/* HEADER MODAL */}
        <div className="flex justify-between items-center px-6 py-3.5 bg-white border-b border-gray-100">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg cursor-pointer transition"
              title="Quay lại"
            >
              <ArrowLeft size={16} />
            </button>
            <h2 className="font-bold text-base text-gray-900 tracking-tight">
              Thông tin nhận phòng - {bookingCode}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100 cursor-pointer transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* THÂN MODAL */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* KHỐI TÓM TẮT THÔNG TIN NHẬN PHÒNG */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-y-3 gap-x-6 p-4 rounded-xl border border-gray-200 bg-white">
            <div className="space-y-2 border-r border-gray-100 pr-2">
              <div>
                <span className="text-gray-400 block text-[11px]">
                  Khách hàng
                </span>
                <span className="text-[#003580] font-bold text-xs block mt-0.5">
                  {customerName}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block text-[11px]">
                  Nhận phòng
                </span>
                <span className="text-gray-900 font-semibold text-xs block mt-0.5">
                  {formatPMSDateTime(confirmData?.checkin_time)}
                </span>
              </div>
            </div>

            <div className="space-y-2 border-r border-gray-100 pr-2">
              <div>
                <span className="text-gray-400 block text-[11px]">
                  Khách lưu trú
                </span>
                <span className="text-gray-800 font-semibold text-xs block mt-0.5">
                  {guestCount?.adult || 1} người lớn
                  {guestCount?.children > 0
                    ? `, ${guestCount.children} trẻ em`
                    : ""}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block text-[11px]">
                  Trả phòng
                </span>
                <span className="text-gray-900 font-semibold text-xs block mt-0.5">
                  {formatPMSDateTime(confirmData?.checkout_time)}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <div>
                <span className="text-gray-400 block text-[11px]">
                  Phòng nhận
                </span>
                <span className="text-gray-900 font-semibold text-xs block mt-0.5">
                  1 phòng ({roomNumber})
                </span>
              </div>
            </div>
          </div>

          {/* CÁC NÚT ĐỊNH DANH CCCD */}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => onOpenGuestDocForm(null, null)}
              className="p-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 cursor-pointer transition"
              title="Thêm khách thủ công"
            >
              <Plus size={15} />
            </button>
            <button
              type="button"
              onClick={() => onOpenGuestDocForm(null, null)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium cursor-pointer flex items-center gap-1.5 transition text-xs"
            >
              <QrCode size={14} className="text-gray-500" />
              <span>Quét CCCD</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenGuestDocForm(null, null)}
              className="px-3.5 py-1.5 border border-[#003580] text-[#003580] hover:bg-blue-50 rounded-lg font-bold cursor-pointer flex items-center gap-1.5 transition text-xs"
            >
              <Camera size={14} />
              <span>Chụp CCCD / Hộ chiếu</span>
            </button>
          </div>

          {/* BẢNG DANH SÁCH LƯU TRÚ */}
          <div className="border border-blue-100 rounded-xl overflow-hidden bg-white">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-blue-50/70 text-gray-800 text-xs font-bold border-b border-blue-100">
                  <th className="py-2.5 px-4 whitespace-nowrap">Họ và tên</th>
                  <th className="py-2.5 px-4 whitespace-nowrap">
                    Thông tin cá nhân
                  </th>
                  <th className="py-2.5 px-4 whitespace-nowrap">Giấy tờ</th>
                  <th className="py-2.5 px-4 whitespace-nowrap">Phòng</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-gray-100">
                {guestList.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-8 text-center text-gray-400 font-medium"
                    >
                      Chưa có thông tin khách lưu trú
                    </td>
                  </tr>
                ) : (
                  guestList.map((g, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="py-3 px-4 font-bold text-gray-900 whitespace-nowrap">
                        {g.full_name}
                      </td>
                      <td className="py-3 px-4 text-gray-600 whitespace-nowrap">
                        {g.gender === "male" ? "Nam" : "Nữ"} •{" "}
                        {g.birthday || "---"}
                      </td>
                      <td className="py-3 px-4 font-mono text-gray-800 whitespace-nowrap">
                        {g.id_type}: {g.id_number || "---"}
                      </td>
                      <td className="py-3 px-4 font-bold text-[#003580] whitespace-nowrap">
                        {g.room_number || roomNumber}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* GHI CHÚ VÀ BẢNG THANH TOÁN */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-2">
            <div className="md:col-span-6 flex items-center gap-2">
              <span className="font-semibold text-gray-700 shrink-0 whitespace-nowrap">
                Ghi chú
              </span>
              <input
                type="text"
                value={stayNote}
                onChange={(e) => setStayNote(e.target.value)}
                placeholder="Nhập ghi chú đặt phòng"
                className="w-full border-b border-gray-300 py-1 outline-none text-gray-800 text-xs focus:border-[#003580] bg-transparent"
              />
            </div>

            <div className="md:col-span-6 flex justify-end">
              <div className="w-72 bg-gray-50/60 p-3.5 rounded-xl border border-gray-100 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-700 whitespace-nowrap">
                    Khách cần trả
                  </span>
                  <span className="font-bold text-gray-900 tabular-nums whitespace-nowrap">
                    {formatNumber(totalPrice)}
                  </span>
                </div>

                <div className="flex justify-between items-center border-t border-gray-200/60 pt-2">
                  <span className="font-medium text-gray-600 whitespace-nowrap">
                    Khách đã trả
                  </span>
                  <span className="font-semibold text-gray-800 tabular-nums whitespace-nowrap">
                    {formatNumber(alreadyPaid)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-600 whitespace-nowrap">
                    Khách thanh toán
                  </span>
                  <input
                    type="text"
                    value={collectAmount ? formatNumber(collectAmount) : "0"}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, "");
                      setCollectAmount(raw ? Number(raw) : 0);
                    }}
                    className="w-24 text-right border-b border-gray-300 py-0.5 outline-none font-bold text-[#003580] bg-transparent tabular-nums focus:border-[#003580]"
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <div className="relative inline-flex items-center text-[#003580] font-bold cursor-pointer">
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="bg-transparent outline-none cursor-pointer pr-4 appearance-none font-bold"
                    >
                      <option value="Tiền mặt">Tiền mặt</option>
                      <option value="Chuyển khoản QR">Chuyển khoản QR</option>
                      <option value="Thẻ tín dụng">Thẻ tín dụng</option>
                    </select>
                    <ChevronDown
                      size={13}
                      className="absolute right-0 pointer-events-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="px-6 py-3.5 bg-white border-t border-gray-100 flex items-center justify-between gap-3 flex-wrap">
          <div className="text-[11px] text-gray-500">
            Để xem danh sách khai báo lưu trú, vào menu{" "}
            <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-700 font-medium">
              ☰ Nhiều hơn
            </span>{" "}
            chọn{" "}
            <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-700 font-medium">
              👥 Khách lưu trú
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 border border-[#003580] text-[#003580] hover:bg-blue-50 rounded-lg text-xs font-bold cursor-pointer transition shadow-2xs whitespace-nowrap"
            >
              Sửa đặt phòng
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleExecuteDone}
              className="px-6 py-2 bg-[#003580] hover:bg-[#00224f] text-white rounded-lg text-xs font-bold cursor-pointer transition shadow-xs active:scale-95 disabled:opacity-50 whitespace-nowrap"
            >
              {isSubmitting ? "Đang xử lý..." : "Xong"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
