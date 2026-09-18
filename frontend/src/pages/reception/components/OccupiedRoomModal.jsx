// src/pages/reception/components/OccupiedRoomModal.jsx
import React, { useState, useEffect, useMemo } from "react";
import {
  Calendar,
  Clock,
  CreditCard,
  QrCode,
  AlertTriangle,
  ArrowRightLeft,
  Building2,
  Banknote,
  CheckCircle2,
  X,
  Receipt,
  AlertCircle,
} from "lucide-react";
import apiClient from "@/services/apiClient";

export default function OccupiedRoomModal({
  room,
  onClose,
  onCheckOut,
  onOpenChangeRoom,
  formatVND,
}) {
  if (!room) return null;

  const [hotelSettings, setHotelSettings] = useState(
    room.hotel_settings || null,
  );
  const [bookingDetail, setBookingDetail] = useState(room.booking || null);

  // ─── TỰ ĐỘNG TRA CỨU CHI TIẾT ĐƠN TỪ DATABASE ───
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

  useEffect(() => {
    if (hotelSettings || !room.hotel_id) return;
    apiClient
      .get(`/hotels/${room.hotel_id}`)
      .then((res) => {
        const h = res?.data?.hotel || res?.data || {};
        setHotelSettings({
          hourly_grace_minutes: Number(h.hourly_grace_minutes ?? 30),
          daily_grace_hours: Number(h.daily_grace_hours ?? 6),
          checkout_time: h.checkout_time || "12:00:00",
        });
      })
      .catch(() => {
        setHotelSettings({
          hourly_grace_minutes: 30,
          checkout_time: "12:00:00",
        });
      });
  }, [room.hotel_id, hotelSettings]);

  const graceMinutes = Number(
    hotelSettings?.hourly_grace_minutes ??
      room.hotel?.hourly_grace_minutes ??
      30,
  );
  const defaultCheckoutTime =
    hotelSettings?.checkout_time ?? room.hotel?.checkout_time ?? "12:00:00";

  const hourlyTiers = room.hourly_tiers || [];
  const firstHourRate = Number(
    hourlyTiers[0]?.price || room.hourly_price || room.daily_price || 100000,
  );

  const now = new Date();

  // 🌟 TÍNH TOÁN THỜI GIAN ĐÃ Ở THỰC TẾ
  const actualStayDuration = useMemo(() => {
    const b = bookingDetail || room.booking;
    const checkinSource =
      b?.confirmed_at ||
      b?.created_at ||
      room?.booking?.created_at ||
      b?.checkin_date ||
      room?.booking?.checkin_date;

    if (!checkinSource) {
      return room.booking?.stay_duration || "Vừa nhận phòng";
    }

    const checkinTime = new Date(checkinSource);
    if (isNaN(checkinTime.getTime())) {
      return room.booking?.stay_duration || "Vừa nhận phòng";
    }

    const diffMs = Math.max(0, now.getTime() - checkinTime.getTime());
    const totalMinutes = Math.floor(diffMs / (1000 * 60));
    const totalHours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;
    const days = Math.floor(totalHours / 24);
    const remainingHours = totalHours % 24;

    if (totalMinutes < 1) {
      return "Vừa nhận phòng";
    }
    if (totalHours < 1) {
      return `${totalMinutes} phút`;
    }
    if (days < 1) {
      return `${totalHours} giờ ${remainingMinutes > 0 ? `${remainingMinutes} phút` : ""}`.trim();
    }
    return `${days} ngày ${remainingHours > 0 ? `${remainingHours} giờ` : ""}`.trim();
  }, [bookingDetail, room.booking, now]);

  // 🌟 TÍNH CHÍNH XÁC GIỜ TRẢ DỰ KIẾN (THEO GIỜ HOẶC THEO NGÀY)
  const scheduledCheckout = useMemo(() => {
    const b = bookingDetail || room.booking;
    const outDateStr = b?.checkout_date
      ? String(b.checkout_date).slice(0, 10)
      : "";
    const outTimeStr = b?.checkout_time
      ? String(b.checkout_time).slice(0, 5)
      : String(defaultCheckoutTime).slice(0, 5);

    if (outDateStr && outTimeStr) {
      const d = new Date(`${outDateStr}T${outTimeStr}:00`);
      if (!isNaN(d.getTime())) return d;
    }

    const dFallback = new Date(b?.checkout_date || now);
    const [defH, defM] = String(defaultCheckoutTime)
      .slice(0, 5)
      .split(":")
      .map(Number);
    dFallback.setHours(defH || 12, defM || 0, 0, 0);
    return dFallback;
  }, [bookingDetail, room.booking, defaultCheckoutTime, now]);

  const diffLateMs = now.getTime() - scheduledCheckout.getTime();
  let lateMinutes = Math.max(0, Math.floor(diffLateMs / (1000 * 60)));

  let overtimeHours = 0;
  let overtimeFee = 0;
  let overtimeLabel = "";
  let overtimeDisplayTime = "0 giờ";

  if (lateMinutes > 0) {
    const rawHours = Math.floor(lateMinutes / 60);
    const remMins = lateMinutes % 60;
    overtimeHours = rawHours + (remMins >= graceMinutes ? 1 : 0);

    if (hourlyTiers.length > 0) {
      const sortedTiers = [...hourlyTiers].sort(
        (a, b) => Number(a.from_hour) - Number(b.from_hour),
      );
      let totalTierFee = 0;
      for (let h = 1; h <= overtimeHours; h++) {
        let applied = sortedTiers[0];
        for (let i = sortedTiers.length - 1; i >= 0; i--) {
          if (h >= Number(sortedTiers[i].from_hour)) {
            applied = sortedTiers[i];
            break;
          }
        }
        totalTierFee += Number(applied.price || 0);
      }
      overtimeFee = totalTierFee;
      overtimeDisplayTime = `${overtimeHours} giờ`;
      overtimeLabel = `Quá ${rawHours}h${remMins}p (${overtimeHours} giờ)`;
    } else {
      overtimeFee = overtimeHours * firstHourRate;
      overtimeDisplayTime = `${overtimeHours} giờ`;
      overtimeLabel = `Quá ${rawHours}h${remMins}p (${overtimeHours} giờ x ${formatVND(firstHourRate)})`;
    }
  }

  const roomLegs =
    Array.isArray(bookingDetail?.room_legs || room.booking?.room_legs) &&
    (bookingDetail?.room_legs || room.booking?.room_legs).length > 0
      ? bookingDetail?.room_legs || room.booking?.room_legs
      : null;

  const baseRoomPrice = Number(
    bookingDetail?.total_price ||
      room.booking?.total_price ||
      room.daily_price ||
      0,
  );
  const totalBill = baseRoomPrice + overtimeFee;

  // ─── 🌟 XỬ LÝ CHUẨN XÁC NGUỒN KHÁCH VÀ TIỀN PHÒNG (KHÔNG BỊ THẤT THOÁT 70%) ───
  const b = bookingDetail || room.booking;

  const isWalkInGuest =
    b?.booking_type === "walk_in" ||
    b?.booking_type === "counter" ||
    b?.source === "counter" ||
    b?.source === "walk_in" ||
    String(b?.booking_code || b?.code || "").startsWith("DP");

  const isDepositOnline =
    !isWalkInGuest &&
    (b?.payment_type === "DEPOSIT_30" ||
      (Number(b?.deposit_amount) > 0 &&
        Number(b?.deposit_amount) < baseRoomPrice) ||
      (Number(b?.paid_amount) > 0 && Number(b?.paid_amount) < baseRoomPrice) ||
      (Number(b?.customer_paid) > 0 &&
        Number(b?.customer_paid) < baseRoomPrice));

  const isPaidFullOnline = !isWalkInGuest && !isDepositOnline;

  let customerPaid = 0;
  let paymentLabel = "Đã thanh toán trước:";
  let paymentSubLabel = "";

  if (isWalkInGuest) {
    customerPaid = Number(b?.customer_paid || baseRoomPrice);
    paymentLabel = "Đã thanh toán lúc nhận phòng:";
    paymentSubLabel = "(Khách thanh toán trực tiếp tại quầy)";
  } else if (isDepositOnline) {
    customerPaid = Number(
      b?.deposit_amount ||
        b?.paid_amount ||
        b?.customer_paid ||
        Math.round(baseRoomPrice * 0.3),
    );
    paymentLabel = "Khách đã cọc online qua sàn:";
    paymentSubLabel = "(Đã cọc trước 30% qua GoStay)";
  } else if (isPaidFullOnline) {
    customerPaid = baseRoomPrice;
    paymentLabel = "Đã thanh toán online qua sàn:";
    paymentSubLabel = "(Đã trả đủ 100% qua GoStay)";
  } else {
    customerPaid = baseRoomPrice;
  }

  // Số tiền còn thiếu thực tế cần thu tại quầy
  const remainingAmount = Math.max(0, totalBill - customerPaid);

  const [guestPayment, setGuestPayment] = useState(remainingAmount);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [note, setNote] = useState(
    overtimeLabel ? `Phụ thu: ${overtimeLabel}` : "",
  );

  useEffect(() => {
    setGuestPayment(remainingAmount);
  }, [remainingAmount]);

  const quickAmounts = [
    remainingAmount,
    Math.ceil(remainingAmount / 10000) * 10000,
    Math.ceil(remainingAmount / 50000) * 50000,
    remainingAmount + 100000,
  ]
    .filter((v, i, a) => v > 0 && a.indexOf(v) === i)
    .slice(0, 4);

  const currentDateStr = `${String(now.getDate()).padStart(2, "0")}/${String(
    now.getMonth() + 1,
  ).padStart(2, "0")}/${now.getFullYear()} ${String(now.getHours()).padStart(
    2,
    "0",
  )}:${String(now.getMinutes()).padStart(2, "0")}`;

  const currentBookingCode =
    bookingDetail?.booking_code ||
    b?.code ||
    b?.booking_code ||
    room.booking?.code ||
    "DP000010";

  const currentCustomerName =
    bookingDetail?.customer_name ||
    b?.customer_name ||
    room.booking?.customer_name ||
    "Khách lẻ tại quầy";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn font-sans">
      <div className="bg-white rounded-3xl w-full max-w-5xl shadow-2xl border border-gray-200 overflow-hidden text-xs font-sans animate-scaleUp max-h-[92vh] flex flex-col text-gray-900">
        {/* ─── HEADER MODAL ─── */}
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

            {/* BADGE PHÂN LOẠI NGUỒN ĐẶT */}
            {isWalkInGuest ? (
              <span className="px-3 py-1 rounded-full bg-white/20 text-white font-black text-[10px] border border-white/30 flex items-center gap-1">
                <Banknote size={12} />
                Khách tại quầy (0% hoa hồng)
              </span>
            ) : isDepositOnline ? (
              <span className="px-3 py-1 rounded-full bg-amber-400 text-gray-950 font-black text-[10px] flex items-center gap-1 shadow-xs">
                <Building2 size={12} />
                Cọc 30% online GoStay
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full bg-emerald-500 text-white font-black text-[10px] flex items-center gap-1 shadow-xs">
                <CheckCircle2 size={12} />
                Đã thanh toán 100% GoStay
              </span>
            )}

            {/* NÚT ĐỔI PHÒNG */}
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

        {/* ─── NỘI DUNG TÍNH TIỀN CHI TIẾT ─── */}
        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-y-auto flex-1 bg-white">
          {/* CỘT TRÁI: BẢNG TIỀN PHÒNG & PHỤ PHÍ */}
          <div className="lg:col-span-7 space-y-4">
            <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 border-b border-gray-200 text-xs font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Thông tin phòng / Dịch vụ</th>
                    <th className="py-3 px-4 text-center">Thời gian đã ở</th>
                    <th className="py-3 px-4 text-right">Đơn giá</th>
                    <th className="py-3 px-4 text-right">Thành tiền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {roomLegs ? (
                    roomLegs.map((leg, idx) => (
                      <tr
                        key={idx}
                        className={
                          leg.is_closed
                            ? "bg-gray-50/80"
                            : "hover:bg-blue-50/40 transition"
                        }
                      >
                        <td className="py-3 px-4">
                          <div className="font-bold text-gray-900 text-xs">
                            {leg.type_name || room.type_name}
                          </div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="px-2 py-0.5 rounded-md bg-blue-50 border border-blue-100 font-bold text-[10px] text-[#003580]">
                              P.{leg.room_number}
                            </span>
                            {leg.is_closed ? (
                              <span className="px-2 py-0.5 rounded-md bg-gray-200 text-gray-700 font-semibold text-[10px]">
                                Đã ở (Chặng 1)
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold text-[10px]">
                                Đang trả (Chặng 2)
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-[#003580]">
                          {leg.duration_text || actualStayDuration}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-gray-600 tabular-nums">
                          {formatVND(leg.unit_price)}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-gray-900 tabular-nums">
                          {formatVND(leg.amount)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr className="hover:bg-blue-50/40 transition">
                      <td className="py-3 px-4">
                        <div className="font-bold text-gray-900 text-xs">
                          {room.type_name}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="px-2 py-0.5 rounded-md bg-blue-50 border border-blue-100 font-bold text-[10px] text-[#003580]">
                            P.{room.room_number}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold text-[10px]">
                            Đang trả phòng
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-[#003580]">
                        {actualStayDuration}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-gray-600 tabular-nums">
                        {formatVND(room.daily_price || baseRoomPrice)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-gray-900 tabular-nums">
                        {formatVND(baseRoomPrice)}
                      </td>
                    </tr>
                  )}

                  {/* PHỤ THU TRẢ MUỘN */}
                  {overtimeFee > 0 && (
                    <tr className="bg-amber-50/60 hover:bg-amber-50 text-amber-950 border-t border-amber-200">
                      <td className="py-3 px-4">
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
                      <td className="py-3 px-4 text-center font-bold text-amber-900">
                        {overtimeDisplayTime}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-amber-800 tabular-nums">
                        {formatVND(firstHourRate)}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-rose-600 tabular-nums">
                        +{formatVND(overtimeFee)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* CỘT PHẢI: BẢNG QUYẾT TOÁN TIỀN */}
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
                <span>Tiền phòng (Tổng đơn):</span>
                <span className="font-bold text-gray-900 tabular-nums">
                  {formatVND(baseRoomPrice)}
                </span>
              </div>

              {overtimeFee > 0 && (
                <div className="flex justify-between items-center text-amber-800 font-medium">
                  <span>Phụ thu trả muộn:</span>
                  <span className="font-bold tabular-nums">
                    +{formatVND(overtimeFee)}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center text-gray-700 font-bold">
                <span>Tổng hoá đơn quyết toán:</span>
                <span className="font-black text-[#0a2540] tabular-nums">
                  {formatVND(totalBill)}
                </span>
              </div>

              {/* TIỀN ĐÃ THU TRƯỚC */}
              <div className="flex justify-between items-center text-gray-700">
                <div>
                  <span className="block font-medium text-gray-800">
                    {paymentLabel}
                  </span>
                  {paymentSubLabel && (
                    <span className="text-[10px] text-gray-400 block">
                      {paymentSubLabel}
                    </span>
                  )}
                </div>
                <span className="font-black text-[#003580] tabular-nums">
                  {customerPaid > 0 ? `- ${formatVND(customerPaid)}` : "0 ₫"}
                </span>
              </div>

              {/* SỐ TIỀN CÒN CẦN THU (CẢNH BÁO RÕ RÀNG NẾU LÀ CỌC 30%) */}
              <div className="flex justify-between items-center pt-2.5 border-t border-gray-200 bg-amber-50/70 p-3 rounded-2xl border border-amber-200">
                <div>
                  <span className="font-black text-gray-900 text-xs block uppercase tracking-wider">
                    Còn cần thu tại quầy:
                  </span>
                  <span className="text-[10px] text-amber-800 font-medium">
                    {remainingAmount === 0
                      ? "(Hóa đơn đã thanh toán đủ 100%)"
                      : isDepositOnline
                        ? `(Thu 70% còn lại: ${formatVND(baseRoomPrice - customerPaid)}${overtimeFee > 0 ? ` + Phụ thu: ${formatVND(overtimeFee)}` : ""})`
                        : "(Khách thanh toán nốt phụ phí / tiền phòng)"}
                  </span>
                </div>
                <span className="font-black text-base text-rose-600 tabular-nums">
                  {formatVND(remainingAmount)}
                </span>
              </div>

              {/* TRẠNG THÁI THANH TOÁN */}
              {remainingAmount === 0 ? (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-center space-y-1 mt-2 shadow-2xs">
                  <div className="font-black text-xs flex items-center justify-center gap-1.5 text-emerald-800">
                    <CheckCircle2 size={16} className="text-emerald-600" />
                    <span>Hóa đơn đã thanh toán đủ 100%</span>
                  </div>
                  <p className="text-[11px] text-emerald-700 font-medium">
                    Không phát sinh phụ phí. Bấm nút bên dưới để nhận lại chìa
                    khóa và hoàn tất trả phòng!
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 pt-2">
                  <div className="flex justify-between items-center">
                    <span className="font-black text-[#0a2540] flex items-center gap-1.5">
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
                        checked={paymentMethod === "cash"}
                        onChange={() => setPaymentMethod("cash")}
                        className="accent-[#003580] cursor-pointer"
                      />
                      <span>Tiền mặt</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="checkout_pay_method"
                        checked={paymentMethod === "transfer"}
                        onChange={() => setPaymentMethod("transfer")}
                        className="accent-[#003580] cursor-pointer"
                      />
                      <span>Chuyển khoản QR</span>
                    </label>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap pt-1">
                    {quickAmounts.map((amt, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setGuestPayment(amt)}
                        className="px-3 py-1 rounded-xl bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-800 font-bold text-[11px] cursor-pointer transition shadow-2xs"
                      >
                        {formatVND(amt)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* GHI CHÚ */}
            <div className="pt-2">
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="✎ Nhập ghi chú hóa đơn trả phòng..."
                className="w-full border-b border-gray-300 py-1 outline-none text-gray-800 focus:border-[#003580] text-xs bg-transparent"
              />
            </div>

            {/* NÚT HOÀN THÀNH TRẢ PHÒNG */}
            <div className="pt-3 flex items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  onCheckOut(currentBookingCode, {
                    paidAmount: remainingAmount === 0 ? 0 : guestPayment,
                    paymentMethod: paymentMethod,
                    note: note,
                  })
                }
                className="flex-1 py-3 bg-[#003580] hover:bg-blue-900 text-white font-black rounded-xl shadow-md cursor-pointer transition active:scale-95 text-center text-sm"
              >
                Hoàn thành & Trả phòng
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
