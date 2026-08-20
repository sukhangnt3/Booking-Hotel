import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import {
  CheckCircle2,
  XCircle,
  Home,
  RotateCcw,
  Receipt,
  CalendarDays,
  MapPin,
  Download,
  Building2,
  ExternalLink,
} from "lucide-react";

// UI Kit & Components
import { Button, Badge } from "@/components/ui";
import { LoadingSpinner } from "@/components/common";
import { BookingStepper } from "@/components/booking";
import { PaymentStatusBadge } from "@/components/payment";

// Services & Stores
import { bookingService } from "@/services";
import { useCartStore } from "@/stores/cartStore";

const BookingSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { clearCart } = useCartStore(); // Xóa sạch giỏ hàng khi đặt thành công

  // Tham số URL
  const successParam = searchParams.get("success");
  const bookingCode =
    searchParams.get("code") || searchParams.get("bookingCode");
  const urlAmount = searchParams.get("amount");

  // Xác định thành công: nếu không truyền success=false thì mặc định xem là thành công khi có code
  const isSuccess = successParam !== "false";

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  const formatVND = (num) => Number(num || 0).toLocaleString("vi-VN") + " ₫";

  useEffect(() => {
    if (bookingCode) {
      bookingService
        .getById(bookingCode)
        .then((data) => {
          const detail = data?.data || data;
          setBooking(detail);
        })
        .catch((err) => {
          console.error("Lỗi lấy chi tiết đơn đặt phòng:", err);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }

    // Nếu đặt phòng thành công, tự động dọn sạch giỏ hàng
    if (isSuccess) {
      clearCart();
    }
  }, [bookingCode, isSuccess, clearCart]);

  const finalAmount =
    Number(urlAmount) > 0
      ? Number(urlAmount)
      : Number(booking?.total_price || booking?.totalPrice || 0);

  // ─── TRƯỜNG HỢP 1: THANH TOÁN BỊ HỦY / THẤT BẠI ───
  if (!isSuccess) {
    return (
      <div className="min-h-screen bg-gray-50/60 py-12 px-4 flex items-center justify-center font-sans">
        <div className="bg-white p-8 md:p-10 rounded-3xl shadow-xl border border-gray-100 max-w-lg w-full text-center space-y-6 animate-in zoom-in-95">
          <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-rose-100">
            <XCircle size={44} strokeWidth={2} />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
              Thanh toán không thành công
            </h1>
            <p className="text-sm text-gray-500 leading-relaxed font-medium">
              Giao dịch đã bị hủy hoặc cổng thanh toán gặp sự cố kết nối. Đừng
              lo, tiền của bạn chưa bị trừ.
            </p>
          </div>

          {bookingCode && (
            <div className="bg-gray-50 p-5 rounded-2xl text-left border border-gray-200 space-y-2">
              <div className="flex justify-between items-center text-xs text-gray-500">
                <span>Mã đơn đặt phòng:</span>
                <span className="font-mono font-black text-gray-900 text-sm">
                  {bookingCode}
                </span>
              </div>
              {finalAmount > 0 && (
                <div className="flex justify-between items-center text-xs pt-2 border-t border-gray-200">
                  <span>Số tiền cần thanh toán:</span>
                  <span className="font-black text-rose-600 text-base">
                    {formatVND(finalAmount)}
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="space-y-3 pt-2">
            {bookingCode && (
              <Button
                onClick={() =>
                  navigate(
                    `/checkout?code=${bookingCode}&amount=${finalAmount}`,
                  )
                }
                className="w-full h-12 text-sm font-black bg-[#006ce4] shadow-md shadow-blue-100"
                leftIcon={<RotateCcw size={16} />}
              >
                Thử thanh toán lại
              </Button>
            )}

            <Button
              variant="outline"
              onClick={() => navigate("/")}
              className="w-full h-12 text-sm font-bold border-gray-200 bg-white"
              leftIcon={<Home size={16} />}
            >
              Về trang chủ
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ─── TRƯỜNG HỢP 2: ĐẶT PHÒNG THÀNH CÔNG (SUCCESS) ───
  return (
    <div className="min-h-screen bg-gray-50/60 pb-20 font-sans">
      {/* STEPPER BƯỚC 3: HOÀN TẤT */}
      <div className="bg-white border-b border-gray-200 py-3 mb-8">
        <div className="max-w-7xl mx-auto px-4">
          <BookingStepper currentStep={3} />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white p-8 md:p-10 rounded-3xl shadow-xl border border-gray-100 text-center space-y-6 animate-in zoom-in-95">
          {/* ICON TICK XANH */}
          <div className="relative w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-xl shadow-emerald-100">
            <CheckCircle2 size={48} strokeWidth={2.5} />
            <div className="absolute inset-0 rounded-full border-4 border-emerald-200 animate-ping opacity-25" />
          </div>

          <div className="space-y-2">
            <Badge variant="success" size="sm">
              Giao dịch hoàn tất
            </Badge>
            <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
              Đặt phòng thành công!
            </h1>
            <p className="text-sm text-gray-500 max-w-md mx-auto leading-relaxed">
              Cảm ơn bạn đã lựa chọn GoStay. Chúng tôi đã gửi xác nhận và
              E-voucher qua email của bạn.
            </p>
          </div>

          {/* KHỐI TÓM TẮT ĐƠN HÀNG */}
          <div className="bg-gray-50/80 p-6 rounded-2xl text-left border border-gray-200/80 space-y-4">
            {/* Mã xác nhận */}
            <div className="flex justify-between items-center pb-4 border-b border-gray-200">
              <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                  Mã xác nhận đơn
                </p>
                <p className="font-mono font-black text-emerald-700 text-xl tracking-wider">
                  {loading ? "Đang tải..." : bookingCode || "N/A"}
                </p>
              </div>
              <PaymentStatusBadge status={booking?.payment_status || "paid"} />
            </div>

            {/* Thông tin khách sạn & ngày nếu có */}
            {booking?.hotel && (
              <div className="space-y-2 text-xs text-gray-600">
                <div className="flex items-center gap-2 font-bold text-gray-900 text-sm">
                  <Building2 size={16} className="text-[#006ce4]" />
                  <span>{booking.hotel.name}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-500">
                  <MapPin size={14} className="text-gray-400" />
                  <span>
                    {booking.hotel.address}, {booking.hotel.city}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-gray-500 pt-1">
                  <CalendarDays size={14} className="text-[#006ce4]" />
                  <span>
                    {booking.checkin_date} — {booking.checkout_date}
                  </span>
                </div>
              </div>
            )}

            {/* Tổng tiền */}
            <div className="pt-3 border-t border-gray-200 flex justify-between items-center">
              <span className="text-xs font-bold text-gray-600">
                Tổng thanh toán:
              </span>
              <span className="text-xl font-black text-gray-900">
                {formatVND(finalAmount)}
              </span>
            </div>
          </div>

          {/* CÁC NÚT HÀNH ĐỘNG */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <Button
              onClick={() => navigate("/UserProfilePage")}
              className="w-full h-12 text-sm font-black bg-[#006ce4] shadow-lg shadow-blue-100"
              leftIcon={<Receipt size={18} />}
            >
              Xem đơn đặt phòng
            </Button>

            <Button
              variant="outline"
              onClick={() => navigate("/")}
              className="w-full h-12 text-sm font-bold border-gray-200 bg-white"
              leftIcon={<Home size={18} />}
            >
              Về trang chủ
            </Button>
          </div>

          <p className="text-[11px] text-gray-400 italic">
            * Bạn có thể xuất trình mã đơn hàng này tại quầy lễ tân để làm thủ
            tục nhận phòng nhanh.
          </p>
        </div>
      </div>
    </div>
  );
};

export default BookingSuccessPage;
