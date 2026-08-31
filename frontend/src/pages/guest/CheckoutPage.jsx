import React, { useState } from "react";
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
} from "lucide-react";

export default function CheckoutPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const bookingCode =
    searchParams.get("code") ||
    searchParams.get("bookingCode") ||
    "IVIVU2016535";
  const urlAmount = searchParams.get("amount");

  // ════════════════════════════════════════════════════════════════════════════
  // 🏦 1. CẤU HÌNH TÀI KHOẢN MBBANK CỦA BẠN
  // ════════════════════════════════════════════════════════════════════════════
  const MY_BANK = {
    bankId: "MB",
    bankName: "MBBANK - NGÂN HÀNG QUÂN ĐỘI",
    bankFullName: "Ngân hàng Thương mại Cổ phần Quân đội (MBBank)",
    accountNumber: "0833404928", // 👈 Điền Số tài khoản MB của bạn
    accountName: "SU TRACH KHANG", // 👈 Tên của bạn viết hoa không dấu
  };

  // ⚙️ ĐƠN GIÁ TEST SANDBOX 1.000 ĐỒNG
  const rawPrice = Number(urlAmount) > 0 ? Number(urlAmount) : 1000;

  // ─── STATES ───
  const [currentStep, setCurrentStep] = useState("step_select_method");
  const [selectedMethod, setSelectedMethod] = useState("qr");
  const [saveCreditCard, setSaveCreditCard] = useState(false);
  const [saveAtmCard, setSaveAtmCard] = useState(false);
  const [copiedField, setCopiedField] = useState(null);
  const [openHotelInfo, setOpenHotelInfo] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const [paymentError, setPaymentError] = useState("");

  const bookingData = {
    code: bookingCode,
    hotelName: "Khu nghỉ dưỡng Centara Mirage Mũi Né",
    stars: 5,
    rating: "9.4",
    reviewText: "Tuyệt vời",
    reviewCount: "1,083",
    address: "Huỳnh Thúc Kháng, Mũi Né, Phan Thiết",
    checkinTime: "15:00 02 tháng 09, 2026",
    checkoutTime: "12:00 12 tháng 09, 2026",
    nights: 10,
    roomsCount: 1,
    guestsCount: 2,
    roomType: "1 x Deluxe Twin (Phòng Test Demo)",
    included: "Gồm ăn sáng",
    adults: 2,
    price: rawPrice,
    expireTime: "16:09 ngày 31/08/2026",
    officeAddress:
      "Tầng 2, Tòa nhà Anh Đăng, 215 Nam Kỳ Khởi Nghĩa, Phường Xuân Hòa, TP.Hồ Chí Minh",
  };

  const formatVND = (num) => Number(num || 0).toLocaleString("vi-VN") + " đ";

  // URL tạo VietQR MBBank động chuẩn Napas 247
  const vietQrUrl = `https://img.vietqr.io/image/${MY_BANK.bankId}-${MY_BANK.accountNumber}-compact2.png?amount=${bookingData.price}&addInfo=${bookingData.code}&accountName=${encodeURIComponent(MY_BANK.accountName)}`;

  const handleCopy = (text, fieldName) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleProceedPayment = () => {
    if (selectedMethod === "qr") {
      setCurrentStep("step_qr_view");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (selectedMethod === "office") {
      setCurrentStep("step_office_view");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      alert(`Đang kết nối cổng thanh toán ${selectedMethod.toUpperCase()}...`);
    }
  };

  const handleVerifyPayment = () => {
    setIsChecking(true);
    setPaymentError("");

    setTimeout(() => {
      setIsChecking(false);
      setPaymentError(
        `Hệ thống chưa nhận được khoản thanh toán ${formatVND(bookingData.price)} cho mã đơn #${bookingData.code}. Quý khách vui lòng quét mã QR MBBank hoặc bấm nút [Demo] bên dưới.`,
      );
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#f4f7fa] text-slate-800 font-sans antialiased pb-24">
      {/* ─── THANH ĐIỀU HƯỚNG TRANG CON (KHÔNG BỊ TRÙNG HEADER) ─── */}
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
          TRƯỜNG HỢP 2A: MÀN HÌNH CHUYỂN KHOẢN DUY NHẤT 1 TÀI KHOẢN MBBANK
      ═══════════════════════════════════════════════════════════════════════════ */}
      {currentStep === "step_qr_view" && (
        <main className="max-w-4xl mx-auto px-4 pt-8 space-y-6 animate-in fade-in duration-300">
          {paymentError && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-2xl flex items-center gap-3 animate-in fade-in">
              <XCircle size={18} className="shrink-0" />
              <span>{paymentError}</span>
            </div>
          )}

          {/* CARD THÔNG TIN CHUYỂN KHOẢN */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden p-6 sm:p-10 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center pb-4 border-b border-slate-200 gap-2">
              <div>
                <h2 className="text-2xl font-black text-slate-900">
                  Thông tin chuyển khoản
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Quý khách sẽ nhận xác nhận đặt phòng qua Email/SMS sau khi
                  thanh toán
                </p>
              </div>
              <div className="text-sm text-slate-600 font-medium sm:text-right">
                Thanh toán trước{" "}
                <span className="text-[#ff6a00] font-black text-base">
                  {bookingData.expireTime}
                </span>
              </div>
            </div>

            {/* BODY: QR TRÁI - CHI TIẾT PHẢI (CHỈ 1 NGÂN HÀNG MBBANK) */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center pt-2">
              {/* KHUNG MÃ QR BÊN TRÁI */}
              <div className="md:col-span-5 bg-slate-50 p-6 rounded-2xl border border-slate-200 text-center space-y-3">
                <p className="text-xs font-bold text-slate-700">
                  Quét mã QR để thanh toán nhanh
                </p>

                <div className="relative p-3 bg-white rounded-xl border border-slate-200 shadow-sm inline-block">
                  <div className="flex items-center justify-between px-2 pb-2 text-[10px] font-black text-slate-500 border-b border-slate-100 mb-2">
                    <span className="text-[#003580] font-black italic">
                      iVIVU
                    </span>
                    <span className="text-emerald-600 font-bold">
                      napas 247
                    </span>
                    <span className="text-[#002fbe] font-bold">MBBank</span>
                  </div>
                  <img
                    src={vietQrUrl}
                    alt="VietQR Napas MBBank"
                    className="w-48 h-48 mx-auto object-contain rounded-lg"
                  />
                  <p className="text-[9px] font-bold text-slate-400 italic pt-1 text-center">
                    Scan to Pay
                  </p>
                </div>
              </div>

              {/* THÔNG TIN CHI TIẾT BÊN PHẢI (MBBANK) */}
              <div className="md:col-span-7 space-y-4 text-sm">
                <div>
                  <span className="text-xs text-slate-400 block font-medium">
                    Ngân hàng
                  </span>
                  <p className="font-extrabold text-slate-900 text-sm">
                    {MY_BANK.bankName}
                  </p>
                  <p className="text-xs text-slate-500">
                    ({MY_BANK.bankFullName})
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
                    Nội dung
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

                <p className="text-xs text-slate-500 italic pt-2">
                  * Giao dịch sẽ tự động xác nhận nếu bạn chuyển đúng số tiền và
                  nội dung. *
                </p>
              </div>
            </div>
          </div>

          {/* CỤM NÚT BẤM */}
          <div className="text-center space-y-3 max-w-sm mx-auto">
            <button
              onClick={handleVerifyPayment}
              disabled={isChecking}
              className="w-full py-4 bg-[#ff6a00] hover:bg-[#e55f00] text-white font-black text-base rounded-2xl shadow-lg shadow-orange-500/20 transition active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {isChecking
                ? "Đang kiểm tra giao dịch MBBank..."
                : "Tôi đã chuyển khoản"}
            </button>

            <button
              onClick={() => setCurrentStep("step_select_method")}
              className="flex items-center justify-center gap-1.5 text-sm font-bold text-[#006ce4] hover:underline mx-auto cursor-pointer"
            >
              <RotateCcw size={16} /> Đổi hình thức thanh toán khác
            </button>

            {/* DEMO TEST CHO ĐỒ ÁN */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() =>
                  navigate(
                    `/booking-success?code=${bookingData.code}&amount=${bookingData.price}&method=qr&success=true`,
                  )
                }
                className="text-[11px] text-slate-400 hover:text-emerald-600 underline"
              >
                [Chế độ Demo: Giả lập đã nhận tiền để chuyển trang thành công]
              </button>
            </div>
          </div>
        </main>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════
          TRƯỜNG HỢP 2B: MÀN HÌNH GIỮ CHỖ VĂN PHÒNG (MÁY BAY GIẤY)
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
                <strong className="text-slate-900">Văn phòng TP.HCM</strong>{" "}
                thanh toán trước{" "}
                <span className="text-[#ff6a00] font-black">
                  {bookingData.expireTime}
                </span>{" "}
                để hoàn tất đặt phòng.
              </p>
              <div className="text-xs text-slate-600 flex items-start justify-center gap-1.5 pt-1">
                <MapPin size={16} className="text-slate-400 shrink-0 mt-0.5" />
                <span>
                  {bookingData.officeAddress}{" "}
                  <a href="#" className="text-[#006ce4] font-bold underline">
                    (Xem bản đồ)
                  </a>
                </span>
              </div>
              <p className="font-bold text-slate-800 pt-2">
                Mã đơn hàng:{" "}
                <span className="font-mono font-black">{bookingData.code}</span>
              </p>
            </div>

            <div className="pt-4 max-w-xs mx-auto space-y-3">
              <button
                onClick={() => navigate("/")}
                className="w-full py-3 px-6 rounded-xl border-2 border-[#ff6a00] text-[#ff6a00] hover:bg-orange-50 font-black text-sm transition"
              >
                Về trang chủ
              </button>
            </div>
          </div>
        </main>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════
          BƯỚC 1: TRANG CHỌN PHƯƠNG THỨC (ĐẦY ĐỦ CẢ 6 PHƯƠNG THỨC)
      ═══════════════════════════════════════════════════════════════════════════ */}
      {currentStep === "step_select_method" && (
        <main className="max-w-7xl mx-auto px-4 pt-6 space-y-6 animate-in fade-in">
          <div className="bg-[#fff9e6] border border-[#ffe58f] rounded-2xl p-4 flex items-center gap-2 text-slate-700 text-sm font-medium shadow-sm">
            <Clock size={18} className="text-[#d48806] shrink-0" />
            <span>
              Thanh toán trước{" "}
              <strong className="text-[#d48806] font-extrabold">
                {bookingData.expireTime}
              </strong>
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* CỘT TRÁI: ĐẦY ĐỦ 6 PHƯƠNG THỨC */}
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
                        Chuyển khoản QR
                      </h4>
                      <p className="text-xs text-slate-500">
                        Quét mã QR MBBank để chuyển khoản
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
                        Thẻ tín dụng
                      </h4>
                      <p className="text-xs text-slate-500">
                        Visa, Master, JCB
                      </p>
                    </div>
                  </div>
                  {selectedMethod === "credit" && (
                    <div className="mt-2 pl-9">
                      <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={saveCreditCard}
                          onChange={(e) => setSaveCreditCard(e.target.checked)}
                          className="rounded border-slate-300 text-[#006ce4]"
                        />
                        <span>Lưu thẻ để thanh toán nhanh hơn lần sau</span>
                      </label>
                    </div>
                  )}

                  {/* 3. Ví MoMo */}
                  <div
                    onClick={() => setSelectedMethod("momo")}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-4 ${
                      selectedMethod === "momo"
                        ? "border-[#006ce4] bg-blue-50/20 shadow-sm"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedMethod === "momo" ? "border-[#006ce4]" : "border-slate-300"}`}
                    >
                      {selectedMethod === "momo" && (
                        <div className="w-2.5 h-2.5 bg-[#006ce4] rounded-full" />
                      )}
                    </div>
                    <div className="w-9 h-9 bg-[#a50064] text-white rounded-lg flex items-center justify-center font-bold text-xs">
                      MoMo
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-slate-900 text-sm">
                        Ví điện tử MoMo
                      </h4>
                      <p className="text-xs text-slate-500">
                        Thanh toán qua ví MoMo
                      </p>
                    </div>
                  </div>

                  {/* 4. Thẻ ATM */}
                  <div
                    onClick={() => setSelectedMethod("atm")}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-4 ${
                      selectedMethod === "atm"
                        ? "border-[#006ce4] bg-blue-50/20 shadow-sm"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedMethod === "atm" ? "border-[#006ce4]" : "border-slate-300"}`}
                    >
                      {selectedMethod === "atm" && (
                        <div className="w-2.5 h-2.5 bg-[#006ce4] rounded-full" />
                      )}
                    </div>
                    <div className="w-9 h-9 bg-[#00a887] text-white rounded-lg flex items-center justify-center">
                      <Building2 size={22} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-slate-900 text-sm">
                        Thẻ ATM
                      </h4>
                      <p className="text-xs text-slate-500">
                        Thẻ ghi nợ nội địa
                      </p>
                    </div>
                  </div>
                  {selectedMethod === "atm" && (
                    <div className="mt-2 pl-9">
                      <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={saveAtmCard}
                          onChange={(e) => setSaveAtmCard(e.target.checked)}
                          className="rounded border-slate-300 text-[#006ce4]"
                        />
                        <span>Lưu thẻ để thanh toán nhanh hơn lần sau</span>
                      </label>
                    </div>
                  )}

                  {/* 5. Trả góp 0% */}
                  <div
                    onClick={() => setSelectedMethod("installment")}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-4 ${
                      selectedMethod === "installment"
                        ? "border-[#006ce4] bg-blue-50/20 shadow-sm"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedMethod === "installment" ? "border-[#006ce4]" : "border-slate-300"}`}
                    >
                      {selectedMethod === "installment" && (
                        <div className="w-2.5 h-2.5 bg-[#006ce4] rounded-full" />
                      )}
                    </div>
                    <div className="w-9 h-9 bg-[#00b5ad] text-white rounded-lg flex items-center justify-center">
                      <Calendar size={22} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-slate-900 text-sm">
                        Trả góp 0% lãi suất
                      </h4>
                      <p className="text-xs text-slate-500">
                        Trả góp qua thẻ tín dụng
                      </p>
                    </div>
                  </div>

                  {/* 6. Tại văn phòng */}
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
                        Tại văn phòng
                      </h4>
                      <p className="text-xs text-slate-500">
                        Thanh toán trực tiếp
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* NÚT BẤM CHUYỂN SANG BƯỚC 2 */}
              <button
                onClick={handleProceedPayment}
                className="w-full py-4 bg-[#ff6a00] hover:bg-[#e55f00] text-white font-black text-base rounded-2xl shadow-lg shadow-orange-500/20 transition active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
              >
                <Check size={20} strokeWidth={3} />
                Xác nhận thanh toán {formatVND(bookingData.price)}
              </button>
            </div>

            {/* CỘT PHẢI: TÓM TẮT ĐƠN HÀNG */}
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
                  {bookingData.roomsCount} phòng • {bookingData.nights} đêm •{" "}
                  {bookingData.guestsCount} khách
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <button
                  onClick={() => setOpenHotelInfo(!openHotelInfo)}
                  className="w-full p-4 flex justify-between items-center bg-slate-50/70 border-b border-slate-100 font-bold text-sm text-slate-800"
                >
                  <div className="flex items-center gap-2">
                    <Building2 size={16} className="text-[#006ce4]" />
                    <span>Thông tin khách sạn</span>
                  </div>
                  {openHotelInfo ? (
                    <ChevronUp size={18} />
                  ) : (
                    <ChevronDown size={18} />
                  )}
                </button>

                {openHotelInfo && (
                  <div className="p-5 space-y-4 text-xs animate-in fade-in">
                    <div>
                      <h3 className="font-black text-slate-900 text-sm">
                        {bookingData.hotelName}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-amber-500 font-bold">
                          ⭐⭐⭐⭐⭐
                        </span>
                        <span className="bg-[#1877f2] text-white font-bold px-1.5 py-0.5 rounded text-[10px]">
                          {bookingData.rating}
                        </span>
                        <span className="font-bold text-[#1877f2]">
                          {bookingData.reviewText}
                        </span>
                        <span className="text-slate-400">
                          ({bookingData.reviewCount})
                        </span>
                      </div>
                      <p className="text-slate-400 flex items-center gap-1 mt-1.5">
                        <MapPin size={13} className="shrink-0" />{" "}
                        {bookingData.address}
                      </p>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-xl space-y-2 border border-slate-100">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-slate-400 block text-[10px]">
                            Nhận phòng
                          </span>
                          <strong className="text-slate-800 font-bold">
                            {bookingData.checkinTime}
                          </strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">
                            Trả phòng
                          </span>
                          <strong className="text-slate-800 font-bold">
                            {bookingData.checkoutTime}
                          </strong>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* CHI TIẾT GIÁ */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 shadow-sm text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Giá phòng</span>
                  <span>{formatVND(bookingData.price)}</span>
                </div>
                <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-sm font-bold">
                  <span className="font-extrabold text-slate-900">
                    Tổng cộng
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
