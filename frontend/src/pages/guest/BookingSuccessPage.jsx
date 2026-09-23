// src/pages/guest/BookingSuccessPage.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  Ticket,
  Home,
  ShieldCheck,
  Mail,
  Loader2,
  Copy,
  Check,
  Calendar,
  Clock,
  Printer,
  AlertCircle,
  Hourglass,
  Sun,
  Moon,
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
  const [copied, setCopied] = useState(false);

  const formatVND = (num) => Number(num || 0).toLocaleString("vi-VN") + " ₫";

  const formatDate = (d) => {
    if (!d) return "";
    try {
      const dt = new Date(d);
      return isNaN(dt.getTime()) ? d : dt.toLocaleDateString("vi-VN");
    } catch {
      return d;
    }
  };

  const formatTime = (timeStr, defaultTime = "12:00") => {
    if (!timeStr) return defaultTime;
    return String(timeStr).trim().slice(0, 5);
  };

  useEffect(() => {
    if (!bookingCode) {
      setLoading(false);
      return;
    }

    // 🌟 XÓA BỘ ĐẾM NGƯỢC GIỮ PHÒNG VÌ ĐƠN ĐÃ ĐƯỢC XÁC NHẬN THÀNH CÔNG
    try {
      localStorage.removeItem(`lock_expires_${bookingCode}`);
    } catch {}

    // Hỗ trợ cả 2 endpoint tra cứu để tránh lỗi 404
    apiClient
      .get(`/bookings/code/${bookingCode}`)
      .catch(() => apiClient.get(`/bookings/${bookingCode}`))
      .then((res) => {
        const b = res?.data?.booking || res?.booking || res?.data || res;
        if (b) setBooking(b);
      })
      .catch((err) => {
        console.error("Lỗi lấy thông tin đơn hàng:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [bookingCode]);

  const handleCopyCode = () => {
    const code = booking?.booking_code || bookingCode;
    if (code) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

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

  if (!bookingCode && !booking) {
    return (
      <div className="min-h-screen bg-[#f4f7fa] flex items-center justify-center p-4 font-sans">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center space-y-4 max-w-md shadow-lg">
          <AlertCircle size={44} className="text-amber-500 mx-auto" />
          <h2 className="text-xl font-bold text-slate-900">
            Không tìm thấy thông tin đơn phòng
          </h2>
          <p className="text-xs text-slate-500">
            Vui lòng kiểm tra lại mã đặt phòng trong mục Chuyến đi của bạn.
          </p>
          <button
            onClick={() => navigate("/profile?tab=trips")}
            className="px-6 py-2.5 bg-[#003580] text-white font-bold text-xs rounded-xl shadow cursor-pointer"
          >
            Xem lịch sử chuyến đi
          </button>
        </div>
      </div>
    );
  }

  const isDeposit =
    booking?.payment_type === "DEPOSIT_30" || paymentTypeParam === "DEPOSIT_30";
  const totalOrderPrice = Number(
    booking?.total_price || totalAmountParam || paidAmountParam || 0,
  );
  const depositPaid = isDeposit
    ? Number(
        booking?.deposit_amount ||
          paidAmountParam ||
          Math.round(totalOrderPrice * 0.3),
      )
    : totalOrderPrice;
  const amountToPayAtHotel = isDeposit
    ? Number(
        booking?.remaining_amount ||
          remainingAmountParam ||
          Math.max(0, totalOrderPrice - depositPaid),
      )
    : 0;

  const customerName =
    booking?.customer_name || user?.full_name || user?.name || "Quý khách";
  const hotelName = booking?.hotel_name || "Khách sạn GoStay";
  const roomName = booking?.room_name || "Phòng tiêu chuẩn";

  // Huy hiệu hình thức thuê phòng
  const rentalType = booking?.rental_type || "DAY";
  const renderRentalBadge = () => {
    if (rentalType === "HOUR") {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#006ce4] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
          <Clock size={12} /> Thuê theo giờ
        </span>
      );
    }
    if (rentalType === "OVERNIGHT") {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
          <Moon size={12} /> Thuê qua đêm
        </span>
      );
    }
    if (rentalType === "HALF_DAY") {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
          <Hourglass size={12} /> Thuê theo buổi
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
        <Sun size={12} /> Thuê theo ngày
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#f4f7fa] text-slate-800 font-sans antialiased pb-24 pt-8">
      <main className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-xl border border-slate-200 text-center space-y-6 animate-in zoom-in-95">
          {/* Icon Thành công */}
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-50 text-emerald-500 rounded-3xl flex items-center justify-center mx-auto border border-emerald-100 shadow-md">
            <CheckCircle2 size={40} strokeWidth={2.5} />
          </div>

          {/* Tiêu đề */}
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold uppercase tracking-wider">
              <ShieldCheck size={14} /> Giao dịch thanh toán thành công
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Đặt Phòng Thành Công!
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
              Cảm ơn Quý khách <strong>{customerName}</strong> đã tin tưởng lựa
              chọn <strong>{hotelName}</strong>.
            </p>
          </div>

          {/* THẺ VÉ XÁC NHẬN CHI TIẾT */}
          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 text-left text-xs space-y-3">
            {/* Hàng Mã Đặt Phòng + Nút Copy */}
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <div>
                <span className="text-slate-400 font-bold uppercase text-[10px] block">
                  MÃ ĐẶT PHÒNG
                </span>
                <span className="font-mono font-black text-lg text-blue-900">
                  #{booking?.booking_code || bookingCode || "N/A"}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyCode}
                className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-300 hover:border-blue-500 rounded-lg text-slate-700 font-bold text-[11px] transition shadow-2xs cursor-pointer"
              >
                {copied ? (
                  <Check size={13} className="text-emerald-600" />
                ) : (
                  <Copy size={13} />
                )}
                <span>{copied ? "Đã chép!" : "Sao chép mã"}</span>
              </button>
            </div>

            {/* Thông tin phòng & khách sạn */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <div>
                <span className="text-slate-400 block text-[11px]">
                  Khách sạn:
                </span>
                <strong className="text-slate-900 text-sm">{hotelName}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">
                  Hạng phòng:
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-bold text-slate-800 text-sm">
                    {roomName}
                  </span>
                  {renderRentalBadge()}
                </div>
              </div>
            </div>

            {/* Thời gian nhận / trả phòng */}
            {(booking?.checkin_date || booking?.checkout_date) && (
              <div className="p-3 bg-white rounded-xl border border-slate-200 grid grid-cols-2 gap-3">
                <div className="flex items-start gap-2">
                  <Calendar
                    size={15}
                    className="text-[#006ce4] shrink-0 mt-0.5"
                  />
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">
                      Nhận phòng
                    </span>
                    <strong className="text-slate-800 text-xs">
                      {formatTime(booking?.checkin_time, "14:00")},{" "}
                      {formatDate(booking?.checkin_date)}
                    </strong>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Clock size={15} className="text-[#006ce4] shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">
                      Trả phòng
                    </span>
                    <strong className="text-slate-800 text-xs">
                      {formatTime(booking?.checkout_time, "12:00")},{" "}
                      {formatDate(booking?.checkout_date)}
                    </strong>
                  </div>
                </div>
              </div>
            )}

            {/* Chi tiết thanh toán */}
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-500">Hình thức thanh toán:</span>
                <span className="font-bold text-blue-800">
                  {isDeposit
                    ? "Đặt cọc trước 30%"
                    : "Thanh toán toàn bộ (100%)"}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-500">Tổng giá trị đơn phòng:</span>
                <strong className="text-gray-900">
                  {formatVND(totalOrderPrice)}
                </strong>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-500">
                  Số tiền đã thanh toán trực tuyến:
                </span>
                <strong className="text-emerald-600 font-black text-sm">
                  {formatVND(depositPaid)}
                </strong>
              </div>

              {isDeposit && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex justify-between items-center mt-2">
                  <div>
                    <span className="text-amber-800 font-bold block">
                      Cần thanh toán tại quầy lễ tân:
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
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-200">
              <span className="text-slate-500">Trạng thái phòng:</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <CheckCircle2 size={12} className="text-emerald-600" /> Đã xác
                nhận & Giữ phòng chính thức
              </span>
            </div>
          </div>

          {/* Thông báo Voucher */}
          <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl flex items-center gap-3 text-left text-xs text-blue-900">
            <Mail size={20} className="text-blue-600 shrink-0" />
            <p className="leading-relaxed">
              Voucher nhận phòng điện tử đã được kích hoạt trong tài khoản của
              Quý khách. Khi đến khách sạn, Quý khách chỉ cần đọc mã đặt phòng
              để nhận chìa khóa phòng.
            </p>
          </div>

          {/* Cụm nút hành động */}
          <div className="pt-2 max-w-sm mx-auto space-y-2.5">
            <button
              type="button"
              onClick={() => navigate("/profile?tab=trips")}
              className="w-full py-3.5 bg-[#003580] hover:bg-blue-900 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Ticket size={16} /> Xem trong Chuyến đi của tôi
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="py-2.5 border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Printer size={14} /> In vé xác nhận
              </button>

              <button
                type="button"
                onClick={() => navigate("/")}
                className="py-2.5 border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Home size={14} /> Về trang chủ
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
