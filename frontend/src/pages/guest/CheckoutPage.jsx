// src/pages/guest/CheckoutPage.jsx
import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Clock,
  Check,
  Loader2,
  AlertCircle,
  ShieldCheck,
  Building2,
  Sparkles,
} from "lucide-react";
import apiClient from "@/services/apiClient";

export default function CheckoutPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const bookingCode =
    searchParams.get("code") ||
    searchParams.get("bookingCode") ||
    searchParams.get("booking_code") ||
    "";

  const rawPaymentType = searchParams.get("paymentType") || "FULL";
  const rawTotalAmount = Number(searchParams.get("totalAmount")) || 500000;
  const isDeposit = rawPaymentType === "DEPOSIT_30";

  const totalAmount = rawTotalAmount;
  const depositAmount = Math.round(totalAmount * 0.3);
  const remainingAmount = totalAmount - depositAmount;
  const expectedAmount = isDeposit ? depositAmount : totalAmount;

  // 🌟 THÔNG TIN NGÂN HÀNG CỦA OWNER (MẶC ĐỊNH SẼ ĐƯỢC CẬP NHẬT TỪ API)
  const [bankInfo, setBankInfo] = useState({
    bankId: "MB",
    bankName: "MBBank",
    accountNumber: "0833404928",
    accountName: "GOSTAY PARTNER",
  });

  const [paymentData, setPaymentData] = useState(null);
  const [loadingPayment, setLoadingPayment] = useState(true);
  const [isPaidSuccess, setIsPaidSuccess] = useState(false);
  const [copiedField, setCopiedField] = useState(null);
  const [isManualChecking, setIsManualChecking] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const formatVND = (num) => Number(num || 0).toLocaleString("vi-VN") + " ₫";

  // 1. QUẢN LÝ ĐẾM NGƯỢC 15 PHÚT GIỮ CHỖ DUY NHẤT TẠI ĐÂY
  const getInitialTimeLeft = () => {
    if (!bookingCode) return 15 * 60;
    const storageKey = `lock_expires_${bookingCode}`;
    let expireTimestamp = localStorage.getItem(storageKey);

    if (!expireTimestamp) {
      expireTimestamp = (Date.now() + 15 * 60 * 1000).toString();
      localStorage.setItem(storageKey, expireTimestamp);
    }

    const expireTimeNum = parseInt(expireTimestamp, 10);
    const remainingSeconds = Math.floor((expireTimeNum - Date.now()) / 1000);
    return remainingSeconds > 0 ? remainingSeconds : 0;
  };

  const [timeLeft, setTimeLeft] = useState(getInitialTimeLeft);

  useEffect(() => {
    if (timeLeft <= 0) {
      localStorage.removeItem(`lock_expires_${bookingCode}`);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          localStorage.removeItem(`lock_expires_${bookingCode}`);
          alert(
            "⚠️ Thời gian giữ phòng 15 phút đã hết hạn! Phòng đã được tự động mở lại cho khách khác.",
          );
          navigate("/hotels");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, bookingCode, navigate]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // 2. KHỞI TẠO DỮ LIỆU THANH TOÁN & LẤY THÔNG TIN NGÂN HÀNG OWNER TỪ DATABASE
  useEffect(() => {
    async function initPayment() {
      if (!bookingCode) return;
      try {
        setLoadingPayment(true);

        // Lấy thông tin đơn hàng và tài khoản ngân hàng của Owner khách sạn này
        const resBooking = await apiClient.get(`/bookings/code/${bookingCode}`);
        const bData = resBooking?.data || resBooking;

        if (bData?.bank_info) {
          setBankInfo({
            bankId: bData.bank_info.bankId,
            bankName: bData.bank_info.bankName,
            accountNumber: bData.bank_info.accountNumber,
            accountName: bData.bank_info.accountName,
          });
        }

        setPaymentData(bData);
      } catch (err) {
        console.warn("Lỗi tải thông tin thanh toán:", err);
      } finally {
        setLoadingPayment(false);
      }
    }

    initPayment();
  }, [bookingCode]);

  const qrImageSrc =
    paymentData?.booking?.qr_code ||
    `https://img.vietqr.io/image/${bankInfo.bankId}-${bankInfo.accountNumber}-compact2.png?amount=${expectedAmount}&addInfo=${bookingCode}&accountName=${encodeURIComponent(bankInfo.accountName)}`;

  // 3. POLLING TỰ ĐỘNG MỖI 2.5 GIÂY XÁC NHẬN TIỀN VÀO TÀI KHOẢN
  const pollingRef = useRef(null);

  const checkPaymentStatus = async (isManual = false) => {
    if (!bookingCode || isPaidSuccess) return;
    if (isManual) setIsManualChecking(true);

    try {
      const res = await apiClient.get(`/payments/status/${bookingCode}`);
      const isPaid =
        res?.data?.paid === true ||
        res?.data?.status === "paid" ||
        res?.data?.payment?.status === "paid";

      if (isPaid) {
        setIsPaidSuccess(true);
        if (pollingRef.current) clearInterval(pollingRef.current);

        localStorage.removeItem(`lock_expires_${bookingCode}`);

        setTimeout(() => {
          navigate(
            `/booking-success?success=true&code=${bookingCode}&amount=${expectedAmount}&totalAmount=${totalAmount}&paymentType=${rawPaymentType}&remainingAmount=${remainingAmount}`,
          );
        }, 1000);
      } else if (isManual) {
        alert(
          "Hệ thống đang chờ nhận tiền từ ngân hàng. Quý khách vui lòng đợi trong giây lát!",
        );
      }
    } catch (err) {
      console.error("Lỗi polling status:", err);
    } finally {
      if (isManual) setIsManualChecking(false);
    }
  };

  useEffect(() => {
    if (!bookingCode || isPaidSuccess) return;

    pollingRef.current = setInterval(() => {
      checkPaymentStatus(false);
    }, 2500);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [bookingCode, isPaidSuccess]);

  // 4. XỬ LÝ KHI KHÁCH BẤM "QUAY LẠI": GIẢI PHÓNG PHÒNG NGAY LẬP TỨC
  const handleGoBack = async () => {
    const confirmCancel = window.confirm(
      "⚠️ Nếu bạn quay lại bây giờ, phiên giữ phòng sẽ bị HỦY và phòng sẽ được mở lại cho khách khác đặt.\n\nBạn có chắc chắn muốn hủy đơn và quay lại không?",
    );

    if (!confirmCancel) return;

    try {
      setIsCancelling(true);
      await apiClient.patch(`/bookings/${bookingCode}/cancel`);
    } catch (err) {
      console.warn("Lỗi khi hủy đơn:", err);
    } finally {
      setIsCancelling(false);
      localStorage.removeItem(`lock_expires_${bookingCode}`);
      navigate(-1);
    }
  };

  const handleCopy = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (!bookingCode) {
    return (
      <div className="min-h-screen bg-[#f4f7fa] flex items-center justify-center p-4 font-sans">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center space-y-4 max-w-md shadow-lg">
          <AlertCircle size={44} className="text-amber-500 mx-auto" />
          <h2 className="text-xl font-bold text-slate-900">
            Không tìm thấy mã đơn phòng
          </h2>
          <p className="text-xs text-slate-500">
            Vui lòng chọn phòng và hoàn tất thông tin đặt phòng trước khi thanh
            toán.
          </p>
          <button
            onClick={() => navigate("/hotels")}
            className="px-6 py-2.5 bg-[#003580] text-white font-bold text-xs rounded-xl shadow cursor-pointer"
          >
            Quay lại danh sách khách sạn
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f7fa] text-slate-800 font-sans antialiased pb-24">
      {/* Top Header */}
      <div className="bg-white border-b border-slate-200 py-4 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 flex items-center justify-between">
          <button
            type="button"
            disabled={isCancelling}
            onClick={handleGoBack}
            className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-rose-600 cursor-pointer transition disabled:opacity-50"
          >
            {isCancelling ? (
              <>
                <Loader2 size={18} className="animate-spin text-rose-600" />
                <span>Đang hủy giữ chỗ...</span>
              </>
            ) : (
              <>
                <ArrowLeft size={18} />
                <span>Quay lại (Hủy giữ chỗ)</span>
              </>
            )}
          </button>

          <div className="text-right">
            <span className="text-xs text-slate-400 block font-medium">
              Mã đơn phòng
            </span>
            <span className="font-mono font-black text-sm text-blue-900">
              #{bookingCode}
            </span>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 pt-8 space-y-6">
        {/* Banner khi thanh toán thành công */}
        {isPaidSuccess && (
          <div className="bg-emerald-600 text-white p-6 rounded-3xl shadow-xl flex items-center justify-between animate-bounce">
            <div className="flex items-center gap-3">
              <Check className="w-8 h-8 rounded-full bg-white text-emerald-600 p-1" />
              <div>
                <h3 className="font-black text-lg">
                  Đã nhận được tiền thành công!
                </h3>
                <p className="text-xs opacity-90">
                  Đang chuyển bạn đến hóa đơn đặt phòng...
                </p>
              </div>
            </div>
            <Loader2 className="animate-spin text-white" size={24} />
          </div>
        )}

        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-slate-200 gap-3">
            <div>
              <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                {isDeposit
                  ? "Thanh Toán Đặt Cọc 30% Giữ Chỗ"
                  : "Thanh Toán Chuyển Khoản Toàn Bộ"}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Quét mã VietQR chuyển khoản trực tiếp tới Chủ khách sạn. Hệ
                thống xác nhận sau 2-3 giây.
              </p>
            </div>

            <div className="bg-amber-50 px-3.5 py-1.5 rounded-2xl border border-amber-200 text-xs font-bold text-amber-800 flex items-center gap-1.5">
              <Clock size={14} className="animate-pulse" />
              <span>
                Thời gian giữ phòng: <strong>{formatTime(timeLeft)}</strong>
              </span>
            </div>
          </div>

          {isDeposit && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3 text-xs text-emerald-900">
              <Building2
                className="text-emerald-700 shrink-0 mt-0.5"
                size={18}
              />
              <div className="space-y-1">
                <strong className="text-sm font-bold block text-emerald-800">
                  Phương thức: Cọc trước 30% giữ phòng theo thời gian thực
                </strong>
                <p className="text-emerald-700 leading-relaxed">
                  Bạn chỉ cần chuyển đúng khoản cọc{" "}
                  <strong>{formatVND(depositAmount)}</strong>. Hệ thống khóa
                  phòng chính thức ngay sau khi nhận tiền. Số tiền còn lại{" "}
                  <strong>{formatVND(remainingAmount)}</strong> sẽ thanh toán
                  khi nhận phòng tại quầy lễ tân.
                </p>
              </div>
            </div>
          )}

          {/* Khung thanh toán VietQR động của Owner */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center pt-2">
            <div className="md:col-span-5 bg-slate-50 p-6 rounded-3xl border border-slate-200 text-center space-y-3">
              <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-[#003580]">
                <Sparkles size={14} /> Quét mã để thanh toán tự động
              </div>

              <div className="p-3 bg-white rounded-2xl border shadow-xs inline-block relative">
                {loadingPayment ? (
                  <div className="w-52 h-52 flex flex-col items-center justify-center">
                    <Loader2
                      className="animate-spin text-[#003580] mb-2"
                      size={28}
                    />
                    <span className="text-[11px] text-slate-400 font-bold">
                      Đang lấy thông tin VietQR của Khách sạn...
                    </span>
                  </div>
                ) : (
                  <>
                    <img
                      src={qrImageSrc}
                      alt="VietQR Chủ Khách Sạn"
                      className="w-52 h-52 mx-auto object-contain rounded-xl"
                    />
                    <div className="pt-2 flex items-center justify-center gap-1.5 text-[10px] text-emerald-700 font-black">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      Đang lắng nghe chuyển khoản...
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="md:col-span-7 space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border flex justify-between items-center">
                <div>
                  <span className="text-slate-400 block font-medium">
                    Ngân hàng thụ hưởng của Khách sạn
                  </span>
                  <strong className="text-slate-900 font-bold text-sm">
                    {bankInfo.bankName}
                  </strong>
                </div>
                <span className="font-bold text-blue-700 bg-blue-100 px-2.5 py-1 rounded-md">
                  {bankInfo.bankId}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border flex justify-between items-center">
                <div>
                  <span className="text-slate-400 block font-medium">
                    Số tài khoản Chủ khách sạn
                  </span>
                  <span className="font-mono font-black text-slate-900 text-base">
                    {bankInfo.accountNumber}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(bankInfo.accountNumber, "acc")}
                  className="px-3 py-1 bg-white border rounded-lg font-bold text-blue-600 hover:bg-blue-50 cursor-pointer shadow-2xs"
                >
                  {copiedField === "acc" ? "✓ Đã chép" : "Sao chép"}
                </button>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border">
                <span className="text-slate-400 block font-medium">
                  Tên chủ tài khoản thụ hưởng
                </span>
                <strong className="text-slate-900 uppercase font-bold text-sm">
                  {bankInfo.accountName}
                </strong>
              </div>

              <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200 flex justify-between items-center">
                <div>
                  <span className="text-blue-600 block font-medium">
                    {isDeposit
                      ? "Số tiền cọc cần chuyển (30%)"
                      : "Số tiền thanh toán"}
                  </span>
                  <strong className="text-blue-900 text-base font-black">
                    {formatVND(expectedAmount)}
                  </strong>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(expectedAmount.toString(), "amt")}
                  className="px-3 py-1 bg-white border border-blue-200 rounded-lg font-bold text-blue-700 cursor-pointer shadow-2xs"
                >
                  {copiedField === "amt" ? "✓ Đã chép" : "Sao chép"}
                </button>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex justify-between items-center">
                <div>
                  <span className="text-amber-700 block font-medium">
                    Nội dung chuyển khoản (Bắt buộc giữ nguyên để tự động duyệt)
                  </span>
                  <span className="font-mono font-black text-rose-600 text-base">
                    {bookingCode}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(bookingCode, "memo")}
                  className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold cursor-pointer shadow-2xs"
                >
                  {copiedField === "memo" ? "✓ Đã chép" : "Sao chép"}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 justify-center pt-2">
            <ShieldCheck size={16} className="text-emerald-600" />
            <span>
              Phòng được giữ trong 15 phút và tự động khóa chính thức ngay khi
              quét QR thành công
            </span>
          </div>

          {/* Nút kiểm tra thủ công */}
          <div className="pt-2 max-w-sm mx-auto space-y-2">
            <button
              type="button"
              onClick={() => checkPaymentStatus(true)}
              disabled={isManualChecking}
              className="w-full py-3.5 bg-[#003580] hover:bg-blue-900 text-white font-black text-sm rounded-2xl shadow-lg transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isManualChecking ? (
                <>
                  <Loader2 className="animate-spin" size={18} /> Đang kiểm tra
                  giao dịch...
                </>
              ) : (
                <>
                  <Check size={18} strokeWidth={2.5} /> Tôi đã chuyển khoản -
                  Kiểm tra ngay
                </>
              )}
            </button>
            <p className="text-[11px] text-center text-slate-400">
              ⚡ Hệ thống tự động kiểm tra mỗi 2.5 giây, bạn không cần làm gì
              sau khi chuyển.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
