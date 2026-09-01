import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  QrCode,
  CreditCard,
  Building2,
  MapPin,
  Check,
  Calendar,
  Clock,
  Copy,
  RotateCcw,
  RefreshCw,
  XCircle,
  Sparkles,
  Ticket,
} from "lucide-react";

import { bookingService } from "@/services";
import { useAuthStore } from "@/stores/authStore";

export default function CheckoutPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const bookingCode =
    searchParams.get("code") ||
    searchParams.get("bookingCode") ||
    `GST-${Date.now().toString().slice(-6)}`;
  const urlAmount = searchParams.get("amount");
  const hotelId = searchParams.get("hotelId");
  const roomId = searchParams.get("roomId");
  const checkIn = searchParams.get("checkIn");
  const checkOut = searchParams.get("checkOut");

  // ════════════════════════════════════════════════════════════════════════════
  // 🏦 1. CẤU HÌNH NGÂN HÀNG & SEPAY
  // ════════════════════════════════════════════════════════════════════════════
  const MY_BANK = {
    bankId: "MB",
    bankName: "MBBANK - NGÂN HÀNG QUÂN ĐỘI",
    bankFullName: "Ngân hàng Thương mại Cổ phần Quân đội (MBBank)",
    accountNumber: "0833404928",
    accountName: "SU TRACH KHANG",
  };

  const SEPAY_API_KEY = "DIEN_SEPAY_API_KEY_CUA_BAN_VAO_DAY";
  const rawPrice = Number(urlAmount) > 0 ? Number(urlAmount) : 650000;

  // ─── STATES ───
  const [currentStep, setCurrentStep] = useState("step_select_method");
  const [selectedMethod, setSelectedMethod] = useState("qr");
  const [saveCreditCard, setSaveCreditCard] = useState(false);
  const [saveAtmCard, setSaveAtmCard] = useState(false);
  const [copiedField, setCopiedField] = useState(null);
  const [openHotelInfo, setOpenHotelInfo] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [isPaymentCompleted, setIsPaymentCompleted] = useState(false);

  const bookingData = {
    code: bookingCode,
    hotelName: "Khách sạn nghỉ dưỡng GoStay",
    stars: 5,
    rating: "9.4",
    reviewText: "Tuyệt vời",
    reviewCount: "1,083",
    address: "Việt Nam",
    checkinTime: checkIn ? `${checkIn} (từ 14:00)` : "Hôm nay (từ 14:00)",
    checkoutTime: checkOut
      ? `${checkOut} (trước 12:00)`
      : "Ngày mai (trước 12:00)",
    nights: 1,
    roomsCount: 1,
    guestsCount: 2,
    roomType: "Phòng Tiêu Chuẩn",
    included: "Gồm ăn sáng",
    adults: 2,
    price: rawPrice,
    expireTime: "24 giờ kể từ thời điểm đặt",
    officeAddress:
      "Tầng 2, Tòa nhà GoStay, 215 Nam Kỳ Khởi Nghĩa, Quận 3, TP.Hồ Chí Minh",
  };

  const formatVND = (num) => Number(num || 0).toLocaleString("vi-VN") + " ₫";

  const vietQrUrl = `https://img.vietqr.io/image/${MY_BANK.bankId}-${MY_BANK.accountNumber}-compact2.png?amount=${bookingData.price}&addInfo=${bookingData.code}&accountName=${encodeURIComponent(MY_BANK.accountName)}`;

  const handleCopy = (text, fieldName) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // ════════════════════════════════════════════════════════════════════════════
  // 💾 LƯU ĐƠN ĐẶT PHÒNG VÀO HỆ THỐNG
  // ════════════════════════════════════════════════════════════════════════════
  const saveBookingToSystem = async (
    paymentMethod,
    paymentStatus = "unpaid",
    status = "pending",
  ) => {
    const newBookingObj = {
      id: bookingData.code,
      booking_code: bookingData.code,
      code: bookingData.code,
      hotel_id: hotelId || "HT-1",
      hotel_name: bookingData.hotelName,
      room_id: roomId || "room-1",
      customer_name: user?.full_name || user?.name || "Khách hàng",
      customer_email: user?.email || "customer@gmail.com",
      customer_phone: user?.phone || "0901234567",
      total_price: bookingData.price,
      amount: bookingData.price,
      payment_method: paymentMethod,
      payment_status: paymentStatus,
      status: status,
      check_in: checkIn || new Date().toISOString().split("T")[0],
      check_out:
        checkOut || new Date(Date.now() + 86400000).toISOString().split("T")[0],
      created_at: new Date().toISOString(),
    };

    try {
      if (bookingService?.create) {
        await bookingService.create(newBookingObj);
      }
    } catch (e) {}

    const allBookings = JSON.parse(
      localStorage.getItem("all_bookings") || "[]",
    );
    allBookings.unshift(newBookingObj);
    localStorage.setItem("all_bookings", JSON.stringify(allBookings));

    if (paymentStatus === "paid") {
      const paidCache = JSON.parse(
        localStorage.getItem("paid_bookings") || "[]",
      );
      if (!paidCache.includes(bookingData.code)) {
        paidCache.push(bookingData.code);
        localStorage.setItem("paid_bookings", JSON.stringify(paidCache));
      }
    }
  };

  // ════════════════════════════════════════════════════════════════════════════
  // 🔍 2. KIỂM TRA SEPAY BIẾN ĐỘNG SỐ DƯ
  // ════════════════════════════════════════════════════════════════════════════
  const checkRealBankTransaction = useCallback(async () => {
    if (currentStep !== "step_qr_view" || isPaymentCompleted) return;
    if (
      !SEPAY_API_KEY ||
      SEPAY_API_KEY === "DIEN_SEPAY_API_KEY_CUA_BAN_VAO_DAY"
    )
      return;

    try {
      const response = await fetch(
        `https://my.sepay.vn/userapi/transactions/list?account_number=${MY_BANK.accountNumber}&limit=15`,
        {
          headers: {
            Authorization: `Bearer ${SEPAY_API_KEY}`,
            "Content-Type": "application/json",
          },
        },
      );

      const resData = await response.json();

      if (resData && Array.isArray(resData.transactions)) {
        const matchingTx = resData.transactions.find((tx) => {
          const content = (
            tx.transaction_content ||
            tx.description ||
            ""
          ).toUpperCase();
          const amount = Number(tx.amount_in || 0);
          return (
            content.includes(bookingData.code.toUpperCase()) &&
            amount >= bookingData.price
          );
        });

        if (matchingTx) {
          setIsPaymentCompleted(true);
          await saveBookingToSystem("qr", "paid", "confirmed");

          setTimeout(() => {
            navigate(
              `/booking-success?code=${bookingData.code}&amount=${bookingData.price}&method=qr&success=true`,
            );
          }, 1000);
        }
      }
    } catch (err) {}
  }, [
    currentStep,
    isPaymentCompleted,
    bookingData.code,
    bookingData.price,
    MY_BANK.accountNumber,
    SEPAY_API_KEY,
    navigate,
  ]);

  useEffect(() => {
    if (currentStep !== "step_qr_view" || isPaymentCompleted) return;
    const timer = setInterval(() => checkRealBankTransaction(), 3000);
    return () => clearInterval(timer);
  }, [currentStep, isPaymentCompleted, checkRealBankTransaction]);

  // 🔘 XÁC NHẬN CHUYỂN KHOẢN QR
  const handleVerifyPayment = async () => {
    setIsChecking(true);
    setPaymentError("");

    if (
      !SEPAY_API_KEY ||
      SEPAY_API_KEY === "DIEN_SEPAY_API_KEY_CUA_BAN_VAO_DAY"
    ) {
      setTimeout(async () => {
        setIsChecking(false);
        await saveBookingToSystem("qr", "paid", "confirmed");
        setIsPaymentCompleted(true);
        navigate(
          `/booking-success?code=${bookingData.code}&amount=${bookingData.price}&method=qr&success=true`,
        );
      }, 1000);
      return;
    }

    try {
      const response = await fetch(
        `https://my.sepay.vn/userapi/transactions/list?account_number=${MY_BANK.accountNumber}&limit=10`,
        {
          headers: {
            Authorization: `Bearer ${SEPAY_API_KEY}`,
            "Content-Type": "application/json",
          },
        },
      );
      const resData = await response.json();
      const matchingTx = resData?.transactions?.find((tx) => {
        const content = (
          tx.transaction_content ||
          tx.description ||
          ""
        ).toUpperCase();
        const amount = Number(tx.amount_in || 0);
        return (
          content.includes(bookingData.code.toUpperCase()) &&
          amount >= bookingData.price
        );
      });

      setIsChecking(false);

      if (matchingTx) {
        setIsPaymentCompleted(true);
        await saveBookingToSystem("qr", "paid", "confirmed");
        navigate(
          `/booking-success?code=${bookingData.code}&amount=${bookingData.price}&method=qr&success=true`,
        );
      } else {
        setPaymentError(
          `Đã tra cứu sao kê MBBank: Chưa nhận được giao dịch ${formatVND(bookingData.price)} với nội dung "${bookingData.code}". Quý khách vui lòng chuyển tiền trên App trước!`,
        );
      }
    } catch (err) {
      setIsChecking(false);
      setPaymentError(
        "Lỗi kết nối kiểm tra sao kê ngân hàng. Vui lòng thử lại sau giây lát.",
      );
    }
  };

  // 🔘 XỬ LÝ KHI BẤM NÚT XÁC NHẬN CHỌN PHƯƠNG THỨC
  const handleProceedPayment = async () => {
    if (selectedMethod === "qr") {
      await saveBookingToSystem("qr", "unpaid", "pending");
      setCurrentStep("step_qr_view");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (selectedMethod === "office") {
      await saveBookingToSystem("office", "unpaid", "pending_office");
      setCurrentStep("step_office_view");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      alert(`Đang kết nối cổng thanh toán ${selectedMethod.toUpperCase()}...`);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f7fa] text-slate-800 font-sans antialiased pb-24">
      {/* ─── HEADER ─── */}
      <div className="bg-white border-b border-slate-200 py-3.5 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
          <button
            onClick={() => {
              if (currentStep !== "step_select_method")
                setCurrentStep("step_select_method");
              else navigate(-1);
            }}
            className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-[#003580] transition cursor-pointer"
          >
            <ArrowLeft size={18} />
            <span>Quay lại</span>
          </button>

          <div className="text-right">
            <span className="text-xs text-slate-400 block font-medium">
              Mã đơn đặt phòng
            </span>
            <span className="font-mono font-black text-sm text-[#003580] tracking-wider">
              {bookingData.code}
            </span>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════════
          BƯỚC 2A: MÀN HÌNH CHUYỂN KHOẢN QR
      ═══════════════════════════════════════════════════════════════════════════ */}
      {currentStep === "step_qr_view" && (
        <main className="max-w-4xl mx-auto px-4 pt-8 space-y-6 animate-in fade-in duration-300">
          {paymentError && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-2xl flex items-start gap-3 animate-in fade-in">
              <XCircle size={18} className="shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-extrabold text-sm">
                  Chưa nhận được thanh toán!
                </p>
                <p className="font-medium leading-relaxed">{paymentError}</p>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden p-6 sm:p-10 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center pb-4 border-b border-slate-200 gap-2">
              <div>
                <h2 className="text-2xl font-black text-slate-900">
                  Thông tin chuyển khoản
                </h2>
                <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  Hệ thống đang tự động kiểm tra giao dịch mỗi 3 giây...
                </p>
              </div>
              <div className="text-sm text-slate-600 font-medium sm:text-right">
                Hạn thanh toán:{" "}
                <span className="text-[#ff6a00] font-black text-base">
                  {bookingData.expireTime}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center pt-2">
              <div className="md:col-span-5 bg-slate-50 p-6 rounded-2xl border border-slate-200 text-center space-y-3">
                <p className="text-xs font-bold text-slate-700">
                  Quét mã QR để thanh toán nhanh
                </p>

                <div className="relative p-3 bg-white rounded-xl border border-slate-200 shadow-sm inline-block">
                  <img
                    src={vietQrUrl}
                    alt="VietQR Napas MBBank"
                    className="w-48 h-48 mx-auto object-contain rounded-lg"
                  />
                  <p className="text-[9px] font-bold text-slate-400 italic pt-1 text-center">
                    Scan to Pay 24/7
                  </p>
                </div>
              </div>

              <div className="md:col-span-7 space-y-4 text-sm">
                <div>
                  <span className="text-xs text-slate-400 block font-medium">
                    Ngân hàng
                  </span>
                  <p className="font-extrabold text-slate-900 text-sm">
                    {MY_BANK.bankName}
                  </p>
                </div>

                <div>
                  <span className="text-xs text-slate-400 block font-medium">
                    Số tài khoản
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-xl font-mono font-black text-slate-900">
                      {MY_BANK.accountNumber}
                    </span>
                    <button
                      onClick={() => handleCopy(MY_BANK.accountNumber, "stk")}
                      className="text-xs text-[#006ce4] hover:underline font-bold cursor-pointer"
                    >
                      {copiedField === "stk" ? "✓ Đã sao chép" : "Sao chép"}
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-xs text-slate-400 block font-medium">
                    Người thụ hưởng
                  </span>
                  <p className="font-bold text-slate-900 uppercase">
                    {MY_BANK.accountName}
                  </p>
                </div>

                <div>
                  <span className="text-xs text-slate-400 block font-medium">
                    Số tiền
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-xl font-black text-slate-900">
                      {formatVND(bookingData.price)}
                    </span>
                    <button
                      onClick={() =>
                        handleCopy(bookingData.price.toString(), "amount")
                      }
                      className="text-xs text-[#006ce4] hover:underline font-bold cursor-pointer"
                    >
                      {copiedField === "amount" ? "✓ Đã sao chép" : "Sao chép"}
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-xs text-slate-400 block font-medium">
                    Nội dung chuyển khoản
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-mono font-black text-slate-900">
                      {bookingData.code}
                    </span>
                    <button
                      onClick={() => handleCopy(bookingData.code, "memo")}
                      className="text-xs text-[#006ce4] hover:underline font-bold cursor-pointer"
                    >
                      {copiedField === "memo" ? "✓ Đã sao chép" : "Sao chép"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center space-y-3 max-w-sm mx-auto">
            <button
              onClick={handleVerifyPayment}
              disabled={isChecking}
              className="w-full py-4 bg-[#ff6a00] hover:bg-[#e55f00] text-white font-black text-base rounded-2xl shadow-lg shadow-orange-500/20 transition active:scale-95 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isChecking ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  Đang kiểm tra giao dịch...
                </>
              ) : (
                "Tôi đã chuyển khoản"
              )}
            </button>

            <button
              onClick={() => setCurrentStep("step_select_method")}
              className="flex items-center justify-center gap-1.5 text-sm font-bold text-[#006ce4] hover:underline mx-auto cursor-pointer"
            >
              <RotateCcw size={16} /> Đổi hình thức thanh toán khác
            </button>
          </div>
        </main>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════
          BƯỚC 2B: MÀN HÌNH GIỮ CHỖ VĂN PHÒNG (ĐIỀU HƯỚNG VỀ /profile CHUẨN XÁC)
      ═══════════════════════════════════════════════════════════════════════════ */}
      {currentStep === "step_office_view" && (
        <main className="max-w-2xl mx-auto px-4 pt-10 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-xl border border-slate-200 text-center space-y-6">
            <h2 className="text-2xl sm:text-3xl font-black text-[#00a89d]">
              Xác nhận giữ chỗ thành công!
            </h2>

            <div className="py-2 flex justify-center">
              <svg
                viewBox="0 0 500 350"
                className="w-56 h-36 drop-shadow-md"
                fill="none"
              >
                <path
                  d="M50 180 C120 120, 280 120, 420 160"
                  stroke="#e2e8f0"
                  strokeWidth="4"
                  strokeDasharray="8 8"
                />
                <polygon
                  points="250,60 460,150 180,260 230,170"
                  fill="#70d6ff"
                />
                <polygon points="250,60 380,210 230,170" fill="#38b6ff" />
                <polygon points="230,170 280,250 260,200" fill="#0096c7" />
                <circle cx="280" cy="110" r="14" fill="#003580" />
                <path
                  d="M265 140 C270 125, 295 125, 305 140 L320 160 L260 160 Z"
                  fill="#004b87"
                />
              </svg>
            </div>

            <div className="space-y-3 text-slate-700 text-sm leading-relaxed max-w-md mx-auto">
              <p>
                Quý khách đã giữ chỗ thành công! Vui lòng đến{" "}
                <strong className="text-slate-900">Văn phòng GoStay</strong> để
                thanh toán tiền mặt trước{" "}
                <span className="text-[#ff6a00] font-black">
                  {bookingData.expireTime}
                </span>
                .
              </p>
              <div className="text-xs text-slate-600 flex items-start justify-center gap-1.5 pt-1">
                <MapPin size={16} className="text-slate-400 shrink-0 mt-0.5" />
                <span>{bookingData.officeAddress}</span>
              </div>
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 mt-2">
                <p className="text-xs text-blue-900 font-bold">
                  Mã đơn hàng:{" "}
                  <span className="font-mono font-black text-base">
                    {bookingData.code}
                  </span>
                </p>
                <p className="text-[11px] text-blue-700 mt-0.5">
                  Số tiền cần thanh toán:{" "}
                  <strong>{formatVND(bookingData.price)}</strong>
                </p>
              </div>
            </div>

            {/* CỤM NÚT ĐIỀU HƯỚNG: ĐƯA VỀ /profile TRANG CÁ NHÂN CỦA KHÁCH */}
            <div className="pt-4 max-w-sm mx-auto space-y-3">
              <button
                type="button"
                onClick={() => navigate("/profile")}
                className="w-full py-3.5 px-6 rounded-xl bg-[#003580] hover:bg-blue-900 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Ticket size={16} /> Xem trong Lịch sử đặt phòng
              </button>

              <button
                type="button"
                onClick={() => navigate("/")}
                className="w-full py-3 px-6 rounded-xl border-2 border-slate-300 text-slate-700 hover:bg-slate-50 font-bold text-xs transition cursor-pointer"
              >
                Về trang chủ
              </button>
            </div>
          </div>
        </main>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════
          BƯỚC 1: CHỌN PHƯƠNG THỨC THANH TOÁN
      ═══════════════════════════════════════════════════════════════════════════ */}
      {currentStep === "step_select_method" && (
        <main className="max-w-7xl mx-auto px-4 pt-6 space-y-6 animate-in fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* CỘT TRÁI: CÁC PHƯƠNG THỨC */}
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5">
                <div className="flex items-center gap-2 text-slate-800 font-extrabold text-base border-b border-slate-100 pb-4">
                  <ShieldCheck size={20} className="text-[#006ce4]" />
                  <span>Chọn hình thức thanh toán</span>
                </div>

                <div className="space-y-3">
                  {/* 1. Chuyển khoản QR */}
                  <div
                    onClick={() => setSelectedMethod("qr")}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-4 ${
                      selectedMethod === "qr"
                        ? "border-[#006ce4] bg-blue-50/20 shadow-sm"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedMethod === "qr" ? "border-[#006ce4]" : "border-slate-300"}`}
                    >
                      {selectedMethod === "qr" && (
                        <div className="w-2.5 h-2.5 bg-[#006ce4] rounded-full" />
                      )}
                    </div>
                    <div className="w-9 h-9 bg-[#00c5c8] text-white rounded-lg flex items-center justify-center font-black">
                      <QrCode size={22} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-slate-900 text-sm">
                        Chuyển khoản QR (MBBank 24/7)
                      </h4>
                      <p className="text-xs text-slate-500">
                        Quét mã QR tự động xác nhận tức thì
                      </p>
                    </div>
                  </div>

                  {/* 2. Thẻ tín dụng */}
                  <div
                    onClick={() => setSelectedMethod("credit")}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-4 ${
                      selectedMethod === "credit"
                        ? "border-[#006ce4] bg-blue-50/20 shadow-sm"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedMethod === "credit" ? "border-[#006ce4]" : "border-slate-300"}`}
                    >
                      {selectedMethod === "credit" && (
                        <div className="w-2.5 h-2.5 bg-[#006ce4] rounded-full" />
                      )}
                    </div>
                    <div className="w-9 h-9 bg-[#009ee2] text-white rounded-lg flex items-center justify-center">
                      <CreditCard size={22} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-slate-900 text-sm">
                        Thẻ tín dụng Quốc tế
                      </h4>
                      <p className="text-xs text-slate-500">
                        Visa, MasterCard, JCB
                      </p>
                    </div>
                  </div>

                  {/* 3. Tại văn phòng */}
                  <div
                    onClick={() => setSelectedMethod("office")}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-4 ${
                      selectedMethod === "office"
                        ? "border-[#006ce4] bg-blue-50/20 shadow-sm"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedMethod === "office" ? "border-[#006ce4]" : "border-slate-300"}`}
                    >
                      {selectedMethod === "office" && (
                        <div className="w-2.5 h-2.5 bg-[#006ce4] rounded-full" />
                      )}
                    </div>
                    <div className="w-9 h-9 bg-[#00b2a9] text-white rounded-lg flex items-center justify-center">
                      <MapPin size={22} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-slate-900 text-sm">
                        Thanh toán tại văn phòng (Giữ chỗ trước)
                      </h4>
                      <p className="text-xs text-slate-500">
                        Đến văn phòng GoStay thanh toán tiền mặt
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={handleProceedPayment}
                className="w-full py-4 bg-[#ff6a00] hover:bg-[#e55f00] text-white font-black text-base rounded-2xl shadow-lg shadow-orange-500/20 transition active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
              >
                <Check size={20} strokeWidth={3} />
                Xác nhận đặt phòng • {formatVND(bookingData.price)}
              </button>
            </div>

            {/* CỘT PHẢI: TÓM TẮT ĐƠN ĐẶT */}
            <div className="lg:col-span-5 space-y-4 sticky top-20">
              <div className="bg-[#003580] text-white rounded-2xl p-6 shadow-md space-y-2">
                <p className="text-xs text-blue-200">
                  Mã đơn: {bookingData.code}
                </p>
                <p className="text-xs text-blue-200">Tổng thanh toán</p>
                <h2 className="text-2xl sm:text-3xl font-black text-[#ffb700] tracking-tight">
                  {formatVND(bookingData.price)}
                </h2>
                <p className="text-xs text-blue-200 pt-1">
                  1 phòng • {bookingData.checkinTime} đến{" "}
                  {bookingData.checkoutTime}
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 shadow-sm text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Tiền phòng</span>
                  <span>{formatVND(bookingData.price)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Thuế & Phí dịch vụ</span>
                  <span className="text-emerald-600 font-bold">Đã bao gồm</span>
                </div>
                <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-sm font-bold">
                  <span className="font-extrabold text-slate-900">
                    Tổng thanh toán
                  </span>
                  <span className="font-black text-[#ff6a00] text-lg">
                    {formatVND(bookingData.price)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </main>
      )}
    </div>
  );
}
