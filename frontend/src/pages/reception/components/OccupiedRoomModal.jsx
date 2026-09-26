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
  Sunrise,
  Sunset,
} from "lucide-react";
import apiClient from "@/services/apiClient";

// Hàm bóc tách ngày chuẩn địa phương YYYY-MM-DD
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

  // 1. TÍNH TOÁN THỜI GIAN THỰC TẾ ĐÃ LƯU TRÚ
  const actualStayDuration = useMemo(() => {
    let checkinTime = null;
    const datePart = String(b.checkin_date || "").slice(0, 10);
    const timePart = b.checkin_time
      ? String(b.checkin_time).slice(0, 5)
      : "14:00";

    if (datePart && timePart) {
      checkinTime = new Date(`${datePart}T${timePart}:00`);
    }

    if (!checkinTime || isNaN(checkinTime.getTime())) {
      const fallback = b.actual_checkin_time || b.confirmed_at || b.created_at;
      if (fallback) checkinTime = new Date(fallback);
    }

    if (!checkinTime || isNaN(checkinTime.getTime())) return "Vừa nhận phòng";

    const diffMs = Math.max(0, now.getTime() - checkinTime.getTime());
    const totalMinutes = Math.floor(diffMs / 60000);
    const totalHours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;

    if (totalMinutes < 1) return "Vừa nhận phòng";
    if (totalMinutes < 60) return `${totalMinutes} phút`;
    if (totalHours < 24) {
      return `${totalHours} giờ ${remainingMinutes > 0 ? `${remainingMinutes}p` : ""}`.trim();
    }
    const days = Math.floor(totalHours / 24);
    return `${days} ngày`;
  }, [b, now]);

  // 2. 🌟 TÍNH TOÁN PHỤ THU: TÁCH BIỆT RÕ RÀNG NHẬN SỚM VÀ TRẢ MUỘN 🌟
  const surchargeDetails = useMemo(() => {
    const isHourly = b.rental_type === "HOUR" || b.rental_type === "Giờ";
    const isOvernight =
      b.rental_type === "OVERNIGHT" || b.rental_type === "Đêm";

    // ─── A. PHỤ THU NHẬN SỚM (EARLY CHECK-IN) ───
    let earlyHours = 0;
    let earlyFee = 0;
    let earlyLabel = "";

    if (!isHourly) {
      const inDateStr = parseLocalDateString(
        b.checkin_date || b.confirmed_at || b.created_at,
      );
      const standardInTimeStr = isOvernight ? "22:00" : "14:00";
      const standardCheckinDate = new Date(
        `${inDateStr}T${standardInTimeStr}:00`,
      );

      let actualCheckinDate = null;
      if (b.checkin_time) {
        actualCheckinDate = new Date(
          `${inDateStr}T${String(b.checkin_time).slice(0, 5)}:00`,
        );
      } else if (b.confirmed_at) {
        actualCheckinDate = new Date(b.confirmed_at);
      }

      if (
        actualCheckinDate &&
        !isNaN(actualCheckinDate.getTime()) &&
        actualCheckinDate < standardCheckinDate
      ) {
        const diffEarlyMs =
          standardCheckinDate.getTime() - actualCheckinDate.getTime();
        const diffEarlyMins = Math.floor(diffEarlyMs / 60000);

        if (diffEarlyMins > 15) {
          // Quá 15 phút ân hạn mới tính
          earlyHours = Math.ceil(diffEarlyMins / 60);
          earlyFee = earlyHours * hourlyRate;
          earlyLabel = `Nhận sớm ${earlyHours} giờ (Quy định: ${standardInTimeStr})`;
        }
      }
    }

    // ─── B. PHỤ THU TRẢ MUỘN (LATE CHECK-OUT) ───
    let lateHours = 0;
    let lateFee = 0;
    let lateLabel = "";

    let scheduledCheckoutDate = null;

    if (isHourly) {
      const inDStr = parseLocalDateString(
        b.checkin_date || b.confirmed_at || b.created_at,
      );
      const inTStr = b.checkin_time
        ? String(b.checkin_time).slice(0, 5)
        : "14:00";
      const inDateObj = new Date(`${inDStr}T${inTStr}:00`);
      let hoursToAdd = 1;
      if (b.stay_duration) {
        const m = String(b.stay_duration).match(/(\d+)\s*gi/);
        if (m) hoursToAdd = Number(m[1]);
      }
      scheduledCheckoutDate = new Date(
        inDateObj.getTime() + hoursToAdd * 3600000,
      );
    } else {
      const outDStr = parseLocalDateString(b.checkout_date);
      const outTStr = b.checkout_time
        ? String(b.checkout_time).slice(0, 5)
        : "12:00";
      scheduledCheckoutDate = new Date(`${outDStr}T${outTStr}:00`);
    }

    if (scheduledCheckoutDate && !isNaN(scheduledCheckoutDate.getTime())) {
      const diffLateMs = now.getTime() - scheduledCheckoutDate.getTime();
      const diffLateMins = Math.floor(diffLateMs / 60000);

      if (diffLateMins > 15) {
        // Quá 15 phút ân hạn mới tính
        lateHours = Math.ceil(diffLateMins / 60);
        lateFee = lateHours * hourlyRate;
        lateLabel = `Quá giờ ${diffLateMins} phút (${lateHours} giờ x ${hourlyRate.toLocaleString("vi-VN")} ₫)`;
      }
    }

    return {
      earlyHours,
      earlyFee,
      earlyLabel,
      lateHours,
      lateFee,
      lateLabel,
      totalExtraFee: earlyFee + lateFee,
    };
  }, [b, now, hourlyRate]);

  const baseRoomPrice = Number(b.total_price || room.daily_price || 162500);
  const totalBill = baseRoomPrice + surchargeDetails.totalExtraFee;

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

  // Ghi chú chi tiết tự động tách dòng
  const autoNote = useMemo(() => {
    const notes = [];
    if (surchargeDetails.earlyFee > 0) notes.push(surchargeDetails.earlyLabel);
    if (surchargeDetails.lateFee > 0) notes.push(surchargeDetails.lateLabel);
    return notes.join(" | ");
  }, [surchargeDetails]);

  const [note, setNote] = useState(autoNote);

  useEffect(() => {
    setGuestPayment(remainingAmount);
    setNote(autoNote);
  }, [remainingAmount, autoNote]);

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
          earlyFee: surchargeDetails.earlyFee,
          overtimeFee: surchargeDetails.lateFee,
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
          {/* CỘT TRÁI: BẢNG CHI TIẾT CÁC KHOẢN TIỀN (GỒM TIỀN PHÒNG, NHẬN SỚM, TRẢ MUỘN) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 border-b border-gray-200 text-xs font-bold uppercase tracking-wider">
                    <th className="py-3 px-4 whitespace-nowrap">
                      Thông tin phòng / Phụ thu phát sinh
                    </th>
                    <th className="py-3 px-4 text-center whitespace-nowrap">
                      Thời gian
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
                  {/* 1. TIỀN PHÒNG GỐC */}
                  <tr className="hover:bg-blue-50/40 transition">
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-bold text-gray-900 text-xs">
                        {room.type_name}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 border border-blue-100 font-bold text-[10px] text-[#003580]">
                          Phòng {room.room_number}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-[#003580] font-bold text-[10px]">
                          Tiền phòng lưu trú
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

                  {/* 2. 🌟 DÒNG PHỤ THU NHẬN SỚM (NẾU CÓ) 🌟 */}
                  {surchargeDetails.earlyFee > 0 && (
                    <tr className="bg-amber-50/50 text-amber-950 border-t border-amber-200">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-bold text-xs flex items-center gap-1.5 text-amber-900">
                          <Sunrise
                            size={15}
                            className="text-amber-600 shrink-0"
                          />
                          Phụ thu nhận phòng sớm
                        </div>
                        <div className="text-[10px] text-amber-700 mt-0.5 font-medium">
                          {surchargeDetails.earlyLabel}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-amber-900 whitespace-nowrap">
                        {surchargeDetails.earlyHours} giờ
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-amber-800 tabular-nums whitespace-nowrap">
                        {formatVND(hourlyRate)}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-rose-600 tabular-nums whitespace-nowrap">
                        +{formatVND(surchargeDetails.earlyFee)}
                      </td>
                    </tr>
                  )}

                  {/* 3. 🌟 DÒNG PHỤ THU TRẢ MUỘN (NẾU CÓ) 🌟 */}
                  {surchargeDetails.lateFee > 0 && (
                    <tr className="bg-orange-50/50 text-orange-950 border-t border-orange-200">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-bold text-xs flex items-center gap-1.5 text-orange-900">
                          <Sunset
                            size={15}
                            className="text-orange-600 shrink-0"
                          />
                          Phụ thu trả phòng muộn (Quá giờ)
                        </div>
                        <div className="text-[10px] text-orange-700 mt-0.5 font-medium">
                          {surchargeDetails.lateLabel}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-orange-900 whitespace-nowrap">
                        {surchargeDetails.lateHours} giờ
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-orange-800 tabular-nums whitespace-nowrap">
                        {formatVND(hourlyRate)}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-rose-600 tabular-nums whitespace-nowrap">
                        +{formatVND(surchargeDetails.lateFee)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* CỘT PHẢI: QUYẾT TOÁN TIỀN MINH BẠCH */}
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
                <span className="whitespace-nowrap">Tiền phòng gốc:</span>
                <span className="font-bold text-gray-900 tabular-nums whitespace-nowrap">
                  {formatVND(baseRoomPrice)}
                </span>
              </div>

              {surchargeDetails.earlyFee > 0 && (
                <div className="flex justify-between items-center text-amber-800 font-medium">
                  <span className="whitespace-nowrap">
                    Phụ thu nhận sớm ({surchargeDetails.earlyHours}h):
                  </span>
                  <span className="font-bold tabular-nums whitespace-nowrap text-rose-600">
                    +{formatVND(surchargeDetails.earlyFee)}
                  </span>
                </div>
              )}

              {surchargeDetails.lateFee > 0 && (
                <div className="flex justify-between items-center text-orange-800 font-medium">
                  <span className="whitespace-nowrap">
                    Phụ thu trả muộn ({surchargeDetails.lateHours}h):
                  </span>
                  <span className="font-bold tabular-nums whitespace-nowrap text-rose-600">
                    +{formatVND(surchargeDetails.lateFee)}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center text-gray-700 font-bold border-t border-gray-100 pt-2">
                <span className="whitespace-nowrap">
                  Tổng hoá đơn thanh toán:
                </span>
                <span className="font-black text-[#0a2540] text-sm tabular-nums whitespace-nowrap">
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
                      : "(Bao gồm tiền phòng còn lại + phụ phí)"}
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
