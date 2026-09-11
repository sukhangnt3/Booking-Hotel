import React, { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  CreditCard,
  QrCode,
  AlertTriangle,
  ArrowRightLeft,
  Building2,
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
  // State lưu chi tiết booking được tra cứu trực tiếp từ Database
  const [bookingDetail, setBookingDetail] = useState(room.booking || null);

  // ─── TỰ ĐỘNG TRA CỨU CHI TIẾT ĐƠN ĐỂ LẤY CHÍNH XÁC SỐ TIỀN CỌC 30% ───
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
  const scheduledCheckout = new Date(
    bookingDetail?.checkout_date || room.booking?.checkout_date || now,
  );
  const [defHour, defMin] = String(defaultCheckoutTime)
    .slice(0, 5)
    .split(":")
    .map(Number);
  scheduledCheckout.setHours(defHour || 12, defMin || 0, 0, 0);

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

  // ─── TÍNH TOÁN TIỀN CỌC 30% CHUẨN XÁC, KHÔNG BỊ GÁN NHẦM 100% ───
  const b = bookingDetail || room.booking;

  const paidAmountVal = Number(
    b?.deposit_amount ?? b?.paid_amount ?? b?.customer_paid ?? 0,
  );

  const isDeposit =
    b?.payment_type === "DEPOSIT_30" ||
    (paidAmountVal > 0 && paidAmountVal < baseRoomPrice) ||
    Number(b?.remaining_amount) > 0;

  let customerPaid = 0;
  if (isDeposit) {
    customerPaid =
      paidAmountVal > 0 ? paidAmountVal : Math.round(baseRoomPrice * 0.3);
  } else if (paidAmountVal >= baseRoomPrice) {
    customerPaid = baseRoomPrice;
  } else {
    customerPaid = paidAmountVal;
  }

  // Tiền cần thu nốt tại quầy (70% tiền phòng + phụ thu quá giờ)
  const remainingAmount = Math.max(0, totalBill - customerPaid);

  const [guestPayment, setGuestPayment] = useState(remainingAmount);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [note, setNote] = useState(
    overtimeLabel ? `Phụ thu: ${overtimeLabel}` : "",
  );
  const [paymentAccount, setPaymentAccount] = useState("Quầy lễ tân");

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
    "Khách lẻ";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs animate-fadeIn">
      <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl border border-slate-200 overflow-hidden text-xs font-sans animate-scaleUp max-h-[92vh] flex flex-col">
        <div className="flex justify-between items-center px-6 py-3.5 border-b border-slate-200 bg-white shrink-0">
          <div className="flex items-center gap-3">
            <h3 className="font-extrabold text-base text-slate-900">
              Thanh toán {currentBookingCode} -{" "}
              <span className="text-[#1b6a38]">{currentCustomerName}</span>
            </h3>

            {/* NHÃN HIỂN THỊ RÕ RÀNG NẾU LÀ ĐƠN CỌC 30% */}
            {isDeposit && (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold text-[11px] border border-amber-300 flex items-center gap-1">
                <Building2 size={12} />
                Đã cọc 30% online
              </span>
            )}

            <button
              type="button"
              onClick={() => {
                if (onOpenChangeRoom) onOpenChangeRoom(room);
              }}
              className="flex items-center gap-1.5 px-3 py-1 rounded-md border border-amber-500 bg-amber-50 text-amber-800 font-bold text-[11px] hover:bg-amber-100 cursor-pointer shadow-2xs transition"
            >
              <ArrowRightLeft size={13} className="text-amber-700" />
              <span>Đổi phòng</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-lg font-bold cursor-pointer p-1"
          >
            ✕
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-y-auto flex-1">
          <div className="lg:col-span-7 space-y-4">
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#eef8f2] text-slate-700 border-b text-xs">
                    <th className="py-2.5 px-3 font-bold">
                      Thông tin phòng / Phụ thu
                    </th>
                    <th className="py-2.5 px-3 font-bold text-center">
                      Thời gian
                    </th>
                    <th className="py-2.5 px-3 font-bold text-right">
                      Đơn giá
                    </th>
                    <th className="py-2.5 px-3 font-bold text-right">
                      Thành tiền
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {roomLegs ? (
                    roomLegs.map((leg, idx) => (
                      <tr
                        key={idx}
                        className={
                          leg.is_closed ? "bg-slate-50/80" : "hover:bg-slate-50"
                        }
                      >
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900 text-xs">
                            {leg.type_name || room.type_name}
                          </div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-300 font-bold text-[10px] text-slate-700">
                              {leg.room_number}
                            </span>
                            {leg.is_closed ? (
                              <span className="px-1.5 py-0.2 rounded bg-slate-200 text-slate-600 font-semibold text-[10px]">
                                Đã ở (Chặng 1)
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.2 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold text-[10px]">
                                Đang trả (Chặng 2)
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center font-semibold text-slate-700">
                          {leg.duration_text}
                        </td>
                        <td className="py-3 px-3 text-right font-medium text-slate-600">
                          {formatVND(leg.unit_price)}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-slate-900">
                          {formatVND(leg.amount)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr className="hover:bg-slate-50">
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900 text-xs">
                          {room.type_name}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-300 font-bold text-[10px] text-slate-700">
                            {room.room_number}
                          </span>
                          <span className="px-1.5 py-0.2 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold text-[10px]">
                            Đang trả
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center font-semibold text-slate-700">
                        {b?.stay_duration || "1 Ngày"}
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-slate-600">
                        {formatVND(room.daily_price || baseRoomPrice)}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-slate-900">
                        {formatVND(baseRoomPrice)}
                      </td>
                    </tr>
                  )}

                  {overtimeFee > 0 && (
                    <tr className="bg-amber-50/50 hover:bg-amber-50 text-amber-950 border-t border-amber-200">
                      <td className="py-3 px-3">
                        <div className="font-bold text-xs flex items-center gap-1 text-amber-900">
                          <AlertTriangle size={13} className="text-amber-600" />
                          Phụ thu trả phòng muộn (Quá giờ)
                        </div>
                        <div className="text-[10px] text-amber-700 mt-0.5">
                          {overtimeLabel}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-amber-900">
                        {overtimeDisplayTime}
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-amber-800">
                        {formatVND(firstHourRate)}
                      </td>
                      <td className="py-3 px-3 text-right font-black text-amber-900">
                        +{formatVND(overtimeFee)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="lg:col-span-5 border-l border-slate-200 lg:pl-6 space-y-3.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-slate-600 font-semibold border border-slate-200 rounded-lg px-2 py-1 bg-slate-50">
                <Calendar size={13} className="text-slate-400" />
                <span>{currentDateStr}</span>
                <Clock size={13} className="text-slate-400 ml-1" />
              </div>
            </div>

            <div className="space-y-2 pt-1 border-t border-slate-100">
              <div className="flex justify-between items-center text-slate-700">
                <span>Tiền phòng (Tổng đơn):</span>
                <span className="font-semibold text-slate-900">
                  {formatVND(baseRoomPrice)}
                </span>
              </div>

              {overtimeFee > 0 && (
                <div className="flex justify-between items-center text-amber-800 font-medium">
                  <span>Phụ thu trả muộn:</span>
                  <span className="font-bold">+{formatVND(overtimeFee)}</span>
                </div>
              )}

              <div className="flex justify-between items-center text-slate-700">
                <span>Tổng hoá đơn:</span>
                <span className="font-bold text-slate-900">
                  {formatVND(totalBill)}
                </span>
              </div>

              {/* HIỂN THỊ ĐÚNG SỐ TIỀN CỌC 30% */}
              <div className="flex justify-between items-center text-slate-700">
                <span className="flex items-center gap-1">
                  Khách đã cọc trước:
                  {isDeposit && (
                    <span className="text-[10px] text-emerald-800 font-bold bg-emerald-50 px-1 rounded border border-emerald-200">
                      (Cọc 30% online)
                    </span>
                  )}
                </span>
                <span className="font-bold text-[#1b6a38]">
                  - {formatVND(customerPaid)}
                </span>
              </div>

              {/* CÒN CẦN THU TẠI QUẦY (ĐÚNG 70% CÒN LẠI) */}
              <div className="flex justify-between items-center pt-2 border-t border-slate-200 bg-amber-50/70 p-2.5 rounded-xl border border-amber-200">
                <div>
                  <span className="font-bold text-slate-900 text-xs block">
                    Còn cần thu tại quầy:
                  </span>
                  <span className="text-[10px] text-amber-800 font-medium">
                    {isDeposit
                      ? "(Thu 70% còn lại của khách)"
                      : "(Đã thanh toán đủ)"}
                  </span>
                </div>
                <span className="font-black text-base text-rose-600">
                  {formatVND(remainingAmount)}
                </span>
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                  Khách thanh toán
                  <CreditCard size={14} className="text-emerald-700" />
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
                  className="w-32 text-right border-b-2 border-slate-300 focus:border-[#1b6a38] py-0.5 outline-none font-black text-sm text-slate-900"
                  placeholder="0"
                />
              </div>
            </div>

            {/* CHỈ CÒN 2 LỰA CHỌN: TIỀN MẶT VÀ CHUYỂN KHOẢN (ĐÃ BỎ THẺ) */}
            <div className="flex items-center justify-start gap-6 pt-2 text-slate-700 font-semibold">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="checkout_pay_method"
                  checked={paymentMethod === "cash"}
                  onChange={() => setPaymentMethod("cash")}
                  className="accent-[#1b6a38]"
                />
                <span>Tiền mặt</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="checkout_pay_method"
                  checked={paymentMethod === "transfer"}
                  onChange={() => setPaymentMethod("transfer")}
                  className="accent-[#1b6a38]"
                />
                <span>Chuyển khoản</span>
              </label>
            </div>

            <div className="flex items-center gap-2 flex-wrap pt-1">
              {quickAmounts.map((amt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setGuestPayment(amt)}
                  className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-bold text-[11px] cursor-pointer"
                >
                  {formatVND(amt)}
                </button>
              ))}
            </div>

            <div className="pt-2">
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="✎ Nhập ghi chú..."
                className="w-full border-b border-slate-300 py-1 outline-none text-slate-700 focus:border-[#1b6a38]"
              />
            </div>

            <div className="pt-3 flex items-center gap-3">
              <button
                type="button"
                onClick={() => onCheckOut(currentBookingCode)}
                className="flex-1 py-3 bg-[#1b6a38] hover:bg-[#14532d] text-white font-extrabold rounded-xl shadow-md cursor-pointer transition active:scale-95 text-center text-sm"
              >
                Hoàn thành
              </button>

              <div className="p-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-700 flex items-center justify-center">
                <QrCode size={26} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
