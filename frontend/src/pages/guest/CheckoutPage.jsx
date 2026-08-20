import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  CreditCard,
  ShieldCheck,
  Building2,
  CalendarDays,
  Users,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Lock,
} from "lucide-react";

// UI Kit & Components
import { Button, Badge } from "@/components/ui";
import { LoadingSpinner, Breadcrumb } from "@/components/common";
import { BookingStepper } from "@/components/booking";
import { PaymentMethodSelector } from "@/components/payment";

// Services & Stores
import { bookingService, paymentService } from "@/services";
import { useAuthStore } from "@/stores/authStore";

const CheckoutPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const bookingCode =
    searchParams.get("code") || searchParams.get("bookingCode");
  const urlAmount = searchParams.get("amount");

  // ─── 1. STATES ───
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMethod, setSelectedMethod] = useState("vnpay");
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const formatVND = (num) => Number(num || 0).toLocaleString("vi-VN") + " ₫";

  // ─── 2. FETCH CHI TIẾT ĐƠN HÀNG ───
  useEffect(() => {
    const fetchBooking = async () => {
      if (!bookingCode) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await bookingService.getById(bookingCode);
        setBooking(res?.data || res);
      } catch (err) {
        console.error("Lỗi lấy thông tin đơn thanh toán:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [bookingCode]);

  const finalAmount =
    Number(urlAmount) > 0
      ? Number(urlAmount)
      : Number(booking?.total_price || booking?.totalPrice || 0);

  // ─── 3. XỬ LÝ THANH TOÁN (SUBMIT) ───
  const handlePayment = async () => {
    setIsProcessing(true);
    setErrorMsg("");

    try {
      // TRƯỜNG HỢP A: THANH TOÁN TẠI KHÁCH SẠN (POST-PAID)
      if (selectedMethod === "at_hotel") {
        if (bookingService.updateStatus) {
          await bookingService.updateStatus(bookingCode, {
            payment_status: "unpaid",
            payment_method: "at_hotel",
            status: "confirmed",
          });
        }
        navigate(
          `/booking-success?code=${bookingCode}&amount=${finalAmount}&success=true`,
        );
        return;
      }

      // TRƯỜNG HỢP B: CỔNG THANH TOÁN ONLINE (VNPAY / MOMO)
      const payload = {
        bookingId: booking?.id || bookingCode,
        bookingCode: bookingCode,
        amount: Math.round(finalAmount), // VNPay yêu cầu số nguyên VND
        bankCode: "NCB", // Ngân hàng test quốc dân của VNPay Sandbox
        orderInfo: `Thanh toan don dat phong ${bookingCode}`,
        orderType: "billpayment",
        language: "vn",
      };

      console.log("👉 [VNPAY PAYLOAD]:", payload);

      // Gọi service tạo URL thanh toán
      const res = await paymentService.createPaymentUrl(payload);

      // Bóc tách URL thanh toán từ phản hồi của Backend
      const paymentUrl =
        res?.paymentUrl ||
        res?.url ||
        res?.data?.paymentUrl ||
        res?.data?.url ||
        (typeof res === "string" && res.startsWith("http") ? res : null);

      console.log("🔗 [VNPAY URL NHẬN ĐƯỢC]:", paymentUrl);

      // Nếu nhận được link VNPay -> Chuyển hướng sang VNPay ngay!
      if (paymentUrl) {
        sessionStorage.setItem(`booking_amount_${bookingCode}`, finalAmount);
        window.location.href = paymentUrl;
      } else {
        throw new Error("Server không trả về đường dẫn thanh toán VNPay!");
      }
    } catch (err) {
      console.error("❌ Lỗi thanh toán VNPay:", err);
      const message =
        err?.message ||
        err?.data?.message ||
        "Quá trình kết nối thanh toán gặp sự cố. Vui lòng thử lại.";
      setErrorMsg(message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading)
    return <LoadingSpinner fullPage label="Đang kết nối cổng thanh toán..." />;

  const breadcrumbs = [
    { label: "Khách sạn", link: "/hotels" },
    { label: "Xác nhận đặt phòng", link: -1 },
    { label: "Thanh toán an toàn" },
  ];

  return (
    <div className="bg-gray-50/60 min-h-screen pb-20 font-sans text-gray-800">
      {/* STEPPER BƯỚC 3: THANH TOÁN */}
      <div className="bg-white border-b border-gray-200 py-3 mb-6">
        <div className="max-w-7xl mx-auto px-4">
          <BookingStepper currentStep={3} />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4">
        <Breadcrumb items={breadcrumbs} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-6">
          {/* ─── CỘT TRÁI (7 COLS): CHỌN PHƯƠNG THỨC THANH TOÁN ─── */}
          <div className="lg:col-span-7 space-y-6">
            {/* Hộp thông báo lỗi nếu có */}
            {errorMsg && (
              <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-2xl flex items-center gap-2 animate-in fade-in">
                <AlertCircle size={16} className="shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Component chọn phương thức thanh toán */}
            <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-200 shadow-sm space-y-6">
              <PaymentMethodSelector
                onSelect={(methodId) => setSelectedMethod(methodId)}
              />
            </div>

            {/* Cam kết bảo mật */}
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-start gap-3">
              <ShieldCheck
                className="text-emerald-600 shrink-0 mt-0.5"
                size={20}
              />
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-emerald-900">
                  Bảo mật giao dịch tiêu chuẩn quốc tế
                </p>
                <p className="text-[11px] text-emerald-700 leading-relaxed font-medium">
                  Mọi thông tin thanh toán của bạn đều được mã hóa bằng chuẩn
                  SSL 256-bit cao cấp nhất.
                </p>
              </div>
            </div>
          </div>

          {/* ─── CỘT PHẢI (5 COLS): TÓM TẮT ĐƠN HÀNG ─── */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-6 sticky top-24">
              <div className="border-b border-gray-100 pb-4 flex justify-between items-center">
                <div>
                  <h3 className="font-black text-gray-900 text-lg">
                    Tóm Tắt Đơn Hàng
                  </h3>
                  <p className="text-xs text-gray-400 font-mono font-bold mt-0.5">
                    Mã đơn: #{bookingCode || "N/A"}
                  </p>
                </div>
                <Badge variant="primary" size="sm">
                  Đang giữ phòng
                </Badge>
              </div>

              {/* Thông tin phòng & khách sạn */}
              <div className="space-y-3 text-xs">
                {booking?.hotel_name && (
                  <div className="flex items-center gap-2 font-bold text-gray-900 text-sm">
                    <Building2 size={16} className="text-[#006ce4]" />
                    <span>{booking.hotel_name}</span>
                  </div>
                )}

                {booking?.room_name && (
                  <p className="text-gray-600 font-medium pl-6">
                    {booking.room_name} ({booking.quantity || 1} phòng)
                  </p>
                )}

                {booking?.checkin_date && (
                  <div className="flex items-center gap-2 text-gray-500 pl-6">
                    <CalendarDays size={14} className="text-gray-400" />
                    <span>
                      {booking.checkin_date} ➔ {booking.checkout_date}
                    </span>
                  </div>
                )}
              </div>

              {/* Tổng tiền thanh toán */}
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
                <div className="flex justify-between items-center text-xs text-gray-500">
                  <span>Phương thức đã chọn:</span>
                  <strong className="uppercase text-blue-900 font-bold">
                    {selectedMethod}
                  </strong>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-gray-200 text-gray-900">
                  <span className="text-sm font-black">Tổng số tiền:</span>
                  <span className="text-2xl font-black text-rose-600 tracking-tight">
                    {formatVND(finalAmount)}
                  </span>
                </div>
                <p className="text-[10px] text-gray-400 italic text-right">
                  Đã bao gồm thuế & tất cả các phí
                </p>
              </div>

              {/* Nút bấm Thanh toán */}
              <Button
                isLoading={isProcessing}
                onClick={handlePayment}
                className="w-full h-14 text-base font-black rounded-2xl bg-[#006ce4] hover:bg-blue-700 text-white shadow-xl shadow-blue-100"
                leftIcon={<Lock size={18} />}
              >
                {selectedMethod === "at_hotel"
                  ? "Xác Nhận Đặt Phòng"
                  : `Thanh Toán ${formatVND(finalAmount)}`}
              </Button>

              <p className="text-[10px] text-center text-gray-400 leading-relaxed italic">
                Bằng cách bấm nút trên, bạn đồng ý với{" "}
                <span className="text-blue-600 underline">
                  Điều khoản dịch vụ
                </span>{" "}
                của GoStay.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
