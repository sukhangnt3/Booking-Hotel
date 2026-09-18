// src/pages/reception/components/OccupiedRoomModal.jsx
import React, { useState, useEffect, useMemo } from "react";
import {
  Calendar,
  Clock,
  CreditCard,
  QrCode,
  AlertTriangle,
  ArrowRightLeft,
  Banknote,
  CheckCircle2,
  X,
  Receipt,
} from "lucide-react";
import apiClient from "@/services/apiClient";

// 🌟 HÀM BÓC TÁCH NGÀY CHUẨN XÁC: TỰ ĐỘNG CỘNG LẠI MÚI GIỜ ĐỊA PHƯƠNG CHỐNG TỤT VỀ NGÀY HÔM QUA
const parseLocalDateString = (val) => {
  if (!val) {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  }

  if (
    val instanceof Date ||
    String(val).includes("T") ||
    String(val).includes("Z")
  ) {
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    }
  }

  const s = String(val).trim();
  const match = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (match) {
    return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
  }

  return s.slice(0, 10);
};

export default function OccupiedRoomModal({
  room,
  onClose,
  onCheckOut,
  onOpenChangeRoom,
  formatVND,
}) {
  if (!room) return null;

  const [bookingDetail, setBookingDetail] = useState(room.booking || null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const code =
      room.booking?.code || room.booking?.booking_code || room.booking?.id;
    if (!code) return;

    apiClient
      .get(`/bookings/code/${code}`)
      .then((res) => {
        const b = res?.data?.booking || res?.booking || res?.data || res;
        if (b) {
          setBookingDetail(b);
        }
      })
      .catch((err) => {
        console.warn("Không lấy được chi tiết đơn phòng:", err);
      });
  }, [room.booking?.code, room.booking?.booking_code, room.booking?.id]);

  const b = bookingDetail || room.booking || {};
  const hourlyRate = Number(
    room.hourly_price || Math.round((room.daily_price || 162500) * 0.25),
  );

  const now = new Date();

  // 🌟 TÍNH THỜI GIAN ĐÃ Ở THỰC TẾ
  const actualStayDuration = useMemo(() => {
    const checkinSource = b.confirmed_at || b.created_at || b.checkin_date;
    if (!checkinSource) return "Vừa nhận phòng";

    const checkinTime = new Date(checkinSource);
    if (isNaN(checkinTime.getTime())) return "Vừa nhận phòng";

    const diffMs = Math.max(0, now.getTime() - checkinTime.getTime());
    const totalMinutes = Math.floor(diffMs / 60000);
    const totalHours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;

    if (totalMinutes < 1) return "Vừa nhận phòng";
    if (totalHours < 1) return `${totalMinutes} phút`;
    return `${totalHours} giờ ${remainingMinutes > 0 ? `${remainingMinutes} phút` : ""}`.trim();
  }, [b, now]);

  // 🌟 TÍNH CHÍNH XÁC GIỜ TRẢ DỰ KIẾN: KHÔNG BAO GIỜ BỊ LỆCH MÚI GIỜ VỀ NGÀY HÔM QUA
  const scheduledCheckout = useMemo(() => {
    const isHourly = b.rental_type === "HOUR" || b.rental_type === "Giờ";

    if (isHourly) {
      const inDStr = parseLocalDateString(
        b.checkin_date || b.confirmed_at || b.created_at,
      );
      let inTStr = "14:00";
      if (b.checkin_time) {
        inTStr = String(b.checkin_time).slice(0, 5);
      } else if (b.confirmed_at) {
        const d = new Date(b.confirmed_at);
        inTStr = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
      }

      const inDateObj = new Date(`${inDStr}T${inTStr}:00`);
      let hoursToAdd = 1;
      if (b.stay_duration) {
        const m = String(b.stay_duration).match(/(\d+)\s*gi/);
        if (m) hoursToAdd = Number(m[1]);
      }

      if (!isNaN(inDateObj.getTime())) {
        return new Date(inDateObj.getTime() + hoursToAdd * 3600000);
      }
    }

    const outDStr = parseLocalDateString(b.checkout_date);
    let outTStr = "12:00";
    if (b.checkout_time) {
      outTStr = String(b.checkout_time).slice(0, 5);
    }

    const d = new Date(`${outDStr}T${outTStr}:00`);
    return !isNaN(d.getTime()) ? d : new Date(now.getTime() + 3600000);
  }, [b, now]);

  // CHỈ TÍNH QUÁ HẠN KHI GIỜ HIỆN TẠI THỰC SỰ VƯỢT QUÁ GIỜ TRẢ DỰ KIẾN TRÊN 15 PHÚT
  const diffLateMs = now.getTime() - scheduledCheckout.getTime();
  const lateMinutes = Math.max(0, Math.floor(diffLateMs / 60000));

  let overtimeHours = 0;
  let overtimeFee = 0;
  let overtimeLabel = "";
  let overtimeDisplayTime = "0 giờ";

  if (lateMinutes > 15) {
    overtimeHours = Math.ceil(lateMinutes / 60);
    overtimeFee = overtimeHours * hourlyRate;
    overtimeDisplayTime = `${overtimeHours} giờ`;
    overtimeLabel = `Quá ${lateMinutes} phút (${overtimeHours} giờ x ${formatVND(hourlyRate)})`;
  }

  const baseRoomPrice = Number(b.total_price || room.daily_price || 162500);
  const totalBill = baseRoomPrice + overtimeFee;

  const isWalkInGuest =
    String(b.code || b.booking_code || "").startsWith("DP") ||
    b.booking_type === "walk_in" ||
    b.source === "counter";

  let customerPaid = 0;
  if (isWalkInGuest) {
    customerPaid =
      b.payment_status === "paid"
        ? baseRoomPrice
        : Number(b.customer_paid || b.deposit_amount || 0);
  } else {
    customerPaid =
      b.payment_status === "paid"
        ? baseRoomPrice
        : Number(b.deposit_amount || b.paid_amount || 0);
  }

  const remainingAmount = Math.max(0, totalBill - customerPaid);

  const [guestPayment, setGuestPayment] = useState(remainingAmount);
  const [paymentMethod, setPaymentMethod] = useState("Tiền mặt");
  const [note, setNote] = useState(
    overtimeLabel ? `Phụ thu: ${overtimeLabel}` : "",
  );

  useEffect(() => {
    setGuestPayment(remainingAmount);
  }, [remainingAmount]);

  const currentDateStr = `${String(now.getDate()).padStart(2, "0")}/${String(
    now.getMonth() + 1,
  ).padStart(2, "0")}/${now.getFullYear()} ${String(now.getHours()).padStart(
    2,
    "0",
  )}:${String(now.getMinutes()).padStart(2, "0")}`;

  const currentBookingCode = b.code || b.booking_code || "DP918121";
  const currentCustomerName = b.customer_name || "Khách lẻ";

  const handleExecuteCheckOut = async () => {
    setIsSubmitting(true);
    try {
      if (onCheckOut) {
        await onCheckOut(currentBookingCode, {
          overtimeFee: overtimeFee,
          totalBill: totalBill,
          paidAmount: remainingAmount === 0 ? 0 : guestPayment,
          paymentMethod: paymentMethod,
          note: note,
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn font-sans">
      <div className="bg-white rounded-3xl w-full max-w-5xl shadow-2xl border border-gray-200 overflow-hidden text-xs font-sans animate-scaleUp max-h-[92vh] flex flex-col text-gray-900">
        {/* HEADER MODAL */}
        <div className="flex justify-between items-center px-6 py-4 bg-[#003580] text-white shadow-xs shrink-0 flex-wrap gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="w-10 h-10 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-white shadow-inner">
              <Receipt size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base text-white tracking-tight leading-none">
                  Thanh Toán & Trả Phòng #{currentBookingCode}
                </h3>
                <span className="text-[11px] text-blue-200 font-bold">
                  • {currentCustomerName}
                </span>
              </div>
              <p className="text-[11px] text-blue-100/80 font-medium mt-1 leading-none">
                Phòng {room.room_number} • {room.type_name || "Tiêu chuẩn"}
              </p>
            </div>

            {isWalkInGuest ? (
              <span className="px-3 py-1 rounded-full bg-white/20 text-white font-black text-[10px] border border-white/30 flex items-center gap-1">
                <Banknote size={12} />
                Khách tại quầy (0% hoa hồng)
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full bg-emerald-500 text-white font-black text-[10px] flex items-center gap-1 shadow-xs">
                <CheckCircle2 size={12} />
                Đơn online GoStay
              </span>
            )}

            <button
              type="button"
              onClick={() => {
                if (onOpenChangeRoom) onOpenChangeRoom(room);
              }}
              className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-[11px] border border-white/20 cursor-pointer transition"
            >
              <ArrowRightLeft size={13} />
              <span>Đổi phòng</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white transition p-1.5 rounded-xl hover:bg-white/10 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* NỘI DUNG TÍNH TIỀN */}
        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-y-auto flex-1 bg-white">
          {/* CỘT TRÁI: BẢNG TIỀN PHÒNG */}
          <div className="lg:col-span-7 space-y-4">
            <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 border-b border-gray-200 text-xs font-bold uppercase tracking-wider">
                    <th className="py-3 px-4 whitespace-nowrap">
                      Thông tin phòng / Dịch vụ
                    </th>
                    <th className="py-3 px-4 text-center whitespace-nowrap">
                      Thời gian đã ở
                    </th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">
                      Đơn giá
                    </th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">
                      Thành tiền
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  <tr className="hover:bg-blue-50/40 transition">
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-bold text-gray-900 text-xs">
                        {room.type_name}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 border border-blue-100 font-bold text-[10px] text-[#003580]">
                          Phòng {room.room_number}
                        </span>

                        {/* 🌟 ĐÃ ĐỔI THÀNH "Đang sử dụng phòng" THEO YÊU CẦU CỦA BẠN */}
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-[#003580] font-bold text-[10px]">
                          Đang sử dụng phòng
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-[#003580] whitespace-nowrap">
                      {actualStayDuration}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-gray-600 tabular-nums whitespace-nowrap">
                      {formatVND(baseRoomPrice)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-gray-900 tabular-nums whitespace-nowrap">
                      {formatVND(baseRoomPrice)}
                    </td>
                  </tr>

                  {overtimeFee > 0 && (
                    <tr className="bg-amber-50/60 text-amber-950 border-t border-amber-200">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-bold text-xs flex items-center gap-1.5 text-amber-900">
                          <AlertTriangle
                            size={14}
                            className="text-amber-600 shrink-0"
                          />
                          Phụ thu trả phòng muộn (Quá giờ)
                        </div>
                        <div className="text-[10px] text-amber-700 mt-0.5 font-medium">
                          {overtimeLabel}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-amber-900 whitespace-nowrap">
                        {overtimeDisplayTime}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-amber-800 tabular-nums whitespace-nowrap">
                        {formatVND(hourlyRate)}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-rose-600 tabular-nums whitespace-nowrap">
                        +{formatVND(overtimeFee)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* CỘT PHẢI: QUYẾT TOÁN TIỀN */}
          <div className="lg:col-span-5 border-l border-gray-200 lg:pl-6 space-y-3.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-gray-600 font-bold border border-gray-200 rounded-xl px-3 py-1.5 bg-gray-50 text-xs">
                <Calendar size={13} className="text-[#006ce4]" />
                <span>{currentDateStr}</span>
                <Clock size={13} className="text-gray-400 ml-1" />
              </div>
            </div>

            <div className="space-y-2.5 pt-2 border-t border-gray-100">
              <div className="flex justify-between items-center text-gray-600 font-medium">
                <span className="whitespace-nowrap">
                  Tiền phòng (Tổng đơn):
                </span>
                <span className="font-bold text-gray-900 tabular-nums whitespace-nowrap">
                  {formatVND(baseRoomPrice)}
                </span>
              </div>

              {overtimeFee > 0 && (
                <div className="flex justify-between items-center text-amber-800 font-medium">
                  <span className="whitespace-nowrap">Phụ thu trả muộn:</span>
                  <span className="font-bold tabular-nums whitespace-nowrap">
                    +{formatVND(overtimeFee)}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center text-gray-700 font-bold">
                <span className="whitespace-nowrap">
                  Tổng hoá đơn quyết toán:
                </span>
                <span className="font-black text-[#0a2540] tabular-nums whitespace-nowrap">
                  {formatVND(totalBill)}
                </span>
              </div>

              <div className="flex justify-between items-center text-gray-700">
                <span className="font-medium text-gray-800 whitespace-nowrap">
                  Đã thanh toán trước:
                </span>
                <span className="font-black text-[#003580] tabular-nums whitespace-nowrap">
                  {customerPaid > 0 ? `- ${formatVND(customerPaid)}` : "0 ₫"}
                </span>
              </div>

              <div className="flex justify-between items-center pt-2.5 border-t border-gray-200 bg-amber-50/70 p-3 rounded-2xl border border-amber-200">
                <div>
                  <span className="font-black text-gray-900 text-xs block uppercase tracking-wider whitespace-nowrap">
                    Còn cần thu tại quầy:
                  </span>
                  <span className="text-[10px] text-amber-800 font-medium">
                    {remainingAmount === 0
                      ? "(Hóa đơn đã thanh toán đủ 100%)"
                      : "(Khách thanh toán nốt tiền phòng / phụ phí)"}
                  </span>
                </div>
                <span className="font-black text-base text-rose-600 tabular-nums whitespace-nowrap">
                  {formatVND(remainingAmount)}
                </span>
              </div>

              {remainingAmount > 0 && (
                <div className="space-y-2.5 pt-2">
                  <div className="flex justify-between items-center">
                    <span className="font-black text-[#0a2540] flex items-center gap-1.5 whitespace-nowrap">
                      Lễ tân thu số tiền còn lại:
                      <CreditCard size={14} className="text-[#006ce4]" />
                    </span>
                    <input
                      type="text"
                      value={
                        guestPayment
                          ? Number(guestPayment).toLocaleString("vi-VN")
                          : ""
                      }
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, "");
                        setGuestPayment(raw ? Number(raw) : 0);
                      }}
                      className="w-32 text-right border-b-2 border-gray-300 focus:border-[#003580] py-0.5 outline-none font-black text-sm text-gray-900 bg-transparent"
                      placeholder="0"
                    />
                  </div>

                  <div className="flex items-center justify-start gap-6 pt-1 text-gray-700 font-bold">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="checkout_pay_method"
                        checked={paymentMethod === "Tiền mặt"}
                        onChange={() => setPaymentMethod("Tiền mặt")}
                        className="accent-[#003580] cursor-pointer"
                      />
                      <span>Tiền mặt</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="checkout_pay_method"
                        checked={paymentMethod === "Chuyển khoản QR"}
                        onChange={() => setPaymentMethod("Chuyển khoản QR")}
                        className="accent-[#003580] cursor-pointer"
                      />
                      <span>Chuyển khoản QR</span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2">
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="✎ Nhập ghi chú hóa đơn trả phòng..."
                className="w-full border-b border-gray-300 py-1 outline-none text-gray-800 focus:border-[#003580] text-xs bg-transparent"
              />
            </div>

            {/* NÚT HOÀN THÀNH & TRẢ PHÒNG */}
            <div className="pt-3 flex items-center gap-3">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleExecuteCheckOut}
                className="flex-1 py-3 bg-[#003580] hover:bg-blue-900 disabled:opacity-50 text-white font-black rounded-xl shadow-md cursor-pointer transition active:scale-95 text-center text-sm"
              >
                {isSubmitting ? "Đang xử lý..." : "Hoàn thành & Trả phòng"}
              </button>

              <div className="p-2 border border-gray-200 rounded-xl bg-gray-50 text-gray-700 flex items-center justify-center">
                <QrCode size={26} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
