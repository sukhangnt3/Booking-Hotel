// src/pages/guest/BookingSuccessPage.jsx
import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  Ticket,
  Home,
  Clock,
  ShieldCheck,
  Mail,
  Loader2,
} from "lucide-react";
import apiClient from "@/services/apiClient";
import { useAuthStore } from "@/stores/authStore";

export default function BookingSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const bookingCode = searchParams.get("code") || "";
  const paymentTypeParam = searchParams.get("paymentType") || "FULL";
  const paidAmountParam = Number(searchParams.get("amount")) || 0;
  const totalAmountParam =
    Number(searchParams.get("totalAmount")) || paidAmountParam;
  const remainingAmountParam = Number(searchParams.get("remainingAmount")) || 0;

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(Boolean(bookingCode));

  const formatVND = (num) => Number(num || 0).toLocaleString("vi-VN") + " ₫";

  useEffect(() => {
    if (!bookingCode) {
      setLoading(false);
      return;
    }

    apiClient
      .get(`/bookings/code/${bookingCode}`)
      .then((res) => {
        const b = res?.data?.booking || res?.booking || res?.data || res;
        setBooking(b);
      })
      .catch((err) => {
        console.error("Lỗi lấy thông tin đơn hàng:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [bookingCode]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f7fa] flex flex-col items-center justify-center p-4">
        <Loader2 className="animate-spin text-[#003580] mb-3" size={36} />
        <p className="text-xs font-bold text-slate-600">
          Đang xác thực thông tin giao dịch trong hệ thống...
        </p>
      </div>
    );
  }

  const isDeposit =
    booking?.payment_type === "DEPOSIT_30" || paymentTypeParam === "DEPOSIT_30";

  const totalOrderPrice =
    booking?.total_price || totalAmountParam || paidAmountParam;
  const depositPaid = isDeposit
    ? booking?.deposit_amount ||
      paidAmountParam ||
      Math.round(totalOrderPrice * 0.3)
    : totalOrderPrice;
  const amountToPayAtHotel = isDeposit
    ? booking?.remaining_amount ||
      remainingAmountParam ||
      totalOrderPrice - depositPaid
    : 0;

  const customerName =
    booking?.customer_name || user?.full_name || user?.name || "Quý khách";
  const hotelName = booking?.hotel_name || "GoStay Hotel";
  const roomName = booking?.room_name || "Phòng tiêu chuẩn";

  return (
    <div className="min-h-screen bg-[#f4f7fa] text-slate-800 font-sans antialiased pb-24 pt-10">
      <main className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-xl border border-slate-200 text-center space-y-6 animate-in zoom-in-95">
          <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-3xl flex items-center justify-center mx-auto border border-emerald-100 shadow-md">
            <CheckCircle2 size={44} strokeWidth={2.5} />
          </div>

          <div className="space-y-2">
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold uppercase tracking-wider">
              <ShieldCheck size={14} /> Giao dịch VietQR thành công
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Đặt Phòng Thành Công!
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
              Cảm ơn Quý khách <strong>{customerName}</strong> đã đặt phòng tại{" "}
              <strong>{hotelName}</strong>.
            </p>
          </div>

          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 text-left text-xs space-y-2.5">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <span className="text-slate-500 font-bold uppercase text-[10px]">
                MÃ ĐẶT PHÒNG
              </span>
              <span className="font-mono font-black text-base text-blue-900">
                #{booking?.booking_code || bookingCode || "N/A"}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-500">Khách sạn:</span>
              <strong className="text-slate-900">{hotelName}</strong>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-500">Hạng phòng:</span>
              <span className="font-semibold text-slate-800">{roomName}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-500">Hình thức thanh toán:</span>
              <span className="font-bold text-blue-800">
                {isDeposit
                  ? "Đặt cọc 30% (Thanh toán nốt tại quầy lễ tân)"
                  : "Thanh toán toàn bộ (100%)"}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-500">Tổng giá trị đơn phòng:</span>
              <strong className="text-gray-900 font-bold">
                {formatVND(totalOrderPrice)}
              </strong>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-500">Số tiền đã thanh toán:</span>
              <strong className="text-emerald-600 font-black text-sm">
                {formatVND(depositPaid)}
              </strong>
            </div>

            {isDeposit && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex justify-between items-center mt-2">
                <div>
                  <span className="text-amber-800 font-bold block">
                    Số tiền cần thanh toán tại quầy:
                  </span>
                  <span className="text-[10px] text-amber-600">
                    (Thanh toán khi làm thủ tục nhận phòng)
                  </span>
                </div>
                <strong className="text-rose-600 font-black text-base">
                  {formatVND(amountToPayAtHotel)}
                </strong>
              </div>
            )}

            <div className="flex justify-between items-center pt-2 border-t border-slate-200">
              <span className="text-slate-500">Trạng thái chỗ nghỉ:</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                <Clock size={12} className="animate-pulse" /> Đã lưu vào hệ
                thống & Giữ phòng thành công
              </span>
            </div>
          </div>

          <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl flex items-center gap-3 text-left text-xs text-blue-900">
            <Mail size={20} className="text-blue-600 shrink-0" />
            <p className="leading-relaxed">
              Voucher nhận phòng điện tử đã được kích hoạt trong tài khoản của
              Quý khách. Khi đến khách sạn, Quý khách chỉ cần đọc mã đặt phòng
              để nhận chìa khóa.
            </p>
          </div>

          <div className="pt-2 max-w-sm mx-auto space-y-3">
            <button
              type="button"
              onClick={() => navigate("/profile?tab=trips")}
              className="w-full py-3.5 bg-[#003580] hover:bg-blue-900 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Ticket size={16} /> Xem trong Chuyến đi của tôi
            </button>

            <button
              type="button"
              onClick={() => navigate("/")}
              className="w-full py-3 border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Home size={14} /> Về trang chủ
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
