// src/pages/reception/components/OccupiedRoomModal.jsx
import React, { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  CreditCard,
  QrCode,
  Paperclip,
  AlertTriangle,
} from "lucide-react";

export default function OccupiedRoomModal({
  room,
  onClose,
  onCheckOut,
  formatVND,
}) {
  if (!room) return null;

  // 1. Tải cấu hình cài đặt thời gian từ trang RoomTimeSettingsPage
  const hotelId = room.hotel_id || localStorage.getItem("selected_hotel_id");
  const timeSettings = JSON.parse(
    localStorage.getItem(`hotel_time_settings_${hotelId}`) || "{}",
  );
  const graceMinutes = timeSettings.hourly_grace_minutes || 30; // Quá 30p tính 1h
  const graceHoursDaily = timeSettings.daily_grace_hours || 6; // Quá 6h tính 1 ngày

  // 2. Tải bảng giá từ trang RoomPricingPage (nếu có)
  const priceBooks = JSON.parse(
    localStorage.getItem(`price_books_${hotelId}`) || "[]",
  );
  const activePriceBook = priceBooks.find((b) => b.is_active);
  const customRoomPrice = activePriceBook?.room_prices?.find(
    (rp) => rp.room_id === room.room_type_id || rp.name === room.type_name,
  );

  // Đơn giá giờ (lấy từ bảng giá mới, nếu không có thì lấy giá mặc định của phòng)
  const hourlyRate =
    customRoomPrice?.hourly_tiers?.[0]?.price ||
    room.hourly_price ||
    Math.round((room.daily_price || 200000) * 0.25);

  // 🌟 3. TÍNH TOÁN QUÁ GIỜ THỰC TẾ
  const now = new Date();
  const scheduledCheckout = new Date(room.booking?.checkout_date || now);
  // Nếu ngày trả phòng chỉ có YYYY-MM-DD thì gán giờ trả quy định (VD: 12:00)
  const defaultCheckoutTime = timeSettings.daily_checkout || "12:00";
  const [defHour, defMin] = defaultCheckoutTime.split(":").map(Number);
  scheduledCheckout.setHours(defHour || 12, defMin || 0, 0, 0);

  // Tính số phút trễ
  const diffLateMs = now.getTime() - scheduledCheckout.getTime();
  let lateMinutes = Math.max(0, Math.floor(diffLateMs / (1000 * 60)));

  let overtimeHours = 0;
  let overtimeFee = 0;
  let overtimeLabel = "";
  let overtimeDisplayTime = "0 giờ"; // 🌟 Hiển thị cột thời gian
  let overtimeDisplayRate = hourlyRate; // 🌟 Hiển thị cột đơn giá

  if (lateMinutes > 0) {
    const rawHours = Math.floor(lateMinutes / 60);
    const remainingMins = lateMinutes % 60;

    // Nếu số phút lẻ vượt quá mốc ân hạn (VD: > 30p) thì tính thêm 1 giờ
    overtimeHours = rawHours + (remainingMins >= graceMinutes ? 1 : 0);

    // 🌟 TRƯỜNG HỢP 1: Quá mốc giờ ngày (VD: >= 6 tiếng) tính tròn 1 ngày phòng
    if (overtimeHours >= graceHoursDaily) {
      overtimeFee = Number(room.daily_price || 200000);
      overtimeDisplayTime = "1 Ngày (Tròn ngày)"; // Cột thời gian ghi 1 Ngày
      overtimeDisplayRate = overtimeFee; // Đơn giá là 200.000 để 1 x 200k = 200k khớp chuẩn
      overtimeLabel = `Quá ${rawHours}h${remainingMins}p (Đã áp dụng mức giá tròn 1 ngày)`;
    }
    // 🌟 TRƯỜNG HỢP 2: Dưới 6 tiếng -> Tính theo số giờ x giá mỗi giờ
    else if (overtimeHours > 0) {
      overtimeFee = overtimeHours * hourlyRate;
      overtimeDisplayTime = `${overtimeHours} giờ`;
      overtimeDisplayRate = hourlyRate;
      overtimeLabel = `Quá ${rawHours}h${remainingMins}p (${overtimeHours} giờ x ${formatVND(hourlyRate)})`;
    }
  }

  // ─── TÍNH TỔNG TIỀN THANH TOÁN ───
  const baseRoomPrice = Number(
    room.booking?.total_price || room.daily_price || 0,
  );
  const totalBill = baseRoomPrice + overtimeFee; // Tiền phòng + Phụ thu quá giờ
  const customerPaid = Number(room.booking?.customer_paid || 0);
  const remainingAmount = Math.max(0, totalBill - customerPaid);

  // State thanh toán
  const [guestPayment, setGuestPayment] = useState(remainingAmount);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [note, setNote] = useState(
    overtimeLabel ? `Phụ thu: ${overtimeLabel}` : "",
  );
  const [paymentAccount, setPaymentAccount] = useState("Chưa xác định");

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs animate-fadeIn">
      <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl border border-slate-200 overflow-hidden text-xs font-sans animate-scaleUp max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-3.5 border-b border-slate-200 bg-white shrink-0">
          <div className="flex items-center gap-3">
            <h3 className="font-extrabold text-base text-slate-900">
              Thanh toán {room.booking?.code || "DP000010"} -{" "}
              <span className="text-[#1b6a38]">
                {room.booking?.customer_name || "Khách lẻ"}
              </span>
            </h3>
            <button
              type="button"
              className="px-2.5 py-1 rounded-md border border-[#1b6a38] text-[#1b6a38] font-semibold text-[11px] hover:bg-emerald-50 cursor-pointer shadow-2xs"
            >
              Tạo hoá đơn một phần
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

        {/* Body 2 cột */}
        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-y-auto flex-1">
          {/* CỘT TRÁI: BẢNG THÔNG TIN PHÒNG & PHỤ THU QUÁ GIỜ */}
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
                  {/* 1. Dòng tiền phòng gốc */}
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
                      {room.booking?.stay_duration || "1 Ngày"}
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-slate-600">
                      {formatVND(room.daily_price || baseRoomPrice)}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900">
                      {formatVND(baseRoomPrice)}
                    </td>
                  </tr>

                  {/* 🌟 2. Dòng tự động tính phụ thu quá giờ - HIỂN THỊ CHUẨN XÁC PHÉP NHÂN */}
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

                      {/* Cột thời gian: "1 Ngày (Tròn ngày)" hoặc "X giờ" */}
                      <td className="py-3 px-3 text-center font-bold text-amber-900">
                        {overtimeDisplayTime}
                      </td>

                      {/* Cột đơn giá: đúng 200.000 (nếu tròn ngày) hoặc giá giờ */}
                      <td className="py-3 px-3 text-right font-medium text-amber-800">
                        {formatVND(overtimeDisplayRate)}
                      </td>

                      {/* Cột thành tiền */}
                      <td className="py-3 px-3 text-right font-black text-amber-900">
                        +{formatVND(overtimeFee)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-slate-300 text-slate-600 hover:bg-slate-50 cursor-pointer text-xs"
              >
                <Paperclip size={13} />
                <span>Chọn file tải lên</span>
              </button>
            </div>
          </div>

          {/* CỘT PHẢI: KHUNG TÍNH TOÁN & HOÀN THÀNH */}
          <div className="lg:col-span-5 border-l border-slate-200 lg:pl-6 space-y-3.5">
            <div className="flex items-center justify-between gap-2">
              <select
                value={paymentAccount}
                onChange={(e) => setPaymentAccount(e.target.value)}
                className="border border-slate-300 rounded-lg px-2 py-1 outline-none text-slate-700 bg-white cursor-pointer"
              >
                <option value="Chưa xác định">Chưa xác định</option>
                <option value="Quầy lễ tân">Quầy lễ tân</option>
                <option value="Tài khoản công ty">Tài khoản công ty</option>
              </select>

              <div className="flex items-center gap-1.5 text-slate-600 font-semibold border border-slate-200 rounded-lg px-2 py-1 bg-slate-50">
                <Calendar size={13} className="text-slate-400" />
                <span>{currentDateStr}</span>
                <Clock size={13} className="text-slate-400 ml-1" />
              </div>
            </div>

            <div className="space-y-2 pt-1 border-t border-slate-100">
              <div className="flex justify-between items-center text-slate-700">
                <span>Tiền phòng gốc:</span>
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
                <span>Tổng tiền hàng:</span>
                <span className="font-bold text-slate-900">
                  {formatVND(totalBill)}
                </span>
              </div>

              <div className="flex justify-between items-center text-slate-700">
                <span>Khách đã trả trước:</span>
                <span className="font-bold text-[#1b6a38]">
                  - {formatVND(customerPaid)}
                </span>
              </div>

              {/* CÒN CẦN TRẢ */}
              <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                <span className="font-bold text-slate-800 text-xs">
                  Còn cần trả
                </span>
                <span className="font-black text-base text-[#1b6a38]">
                  {formatVND(remainingAmount)}
                </span>
              </div>

              {/* KHÁCH THANH TOÁN */}
              <div className="flex justify-between items-center pt-2">
                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                  Khách thanh toán (F8)
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

            {/* Phương thức thanh toán */}
            <div className="flex items-center justify-between pt-2 text-slate-700 font-semibold">
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
                  checked={paymentMethod === "card"}
                  onChange={() => setPaymentMethod("card")}
                  className="accent-[#1b6a38]"
                />
                <span>Thẻ</span>
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

            {/* Nút tiền nhanh */}
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

            {/* Nút Hoàn thành */}
            <div className="pt-3 flex items-center gap-3">
              <button
                type="button"
                onClick={() => onCheckOut(room.booking?.code)}
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
