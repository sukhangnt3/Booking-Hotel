// src/pages/guest/CheckoutPage.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
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
  RefreshCw,
  Copy,
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
  const rawTotalAmount = Number(searchParams.get("totalAmount")) || 0;
  const rawAmount = Number(searchParams.get("amount")) || 0;

  // State lưu thông tin đơn hàng đồng bộ từ API
  const [bookingData, setBookingData] = useState(null);

  const finalPaymentType = bookingData?.payment_type || rawPaymentType;
  const isDeposit = finalPaymentType === "DEPOSIT_30";

  // Ưu tiên số tiền thực từ API, sau đó mới tới param URL
  const totalAmount = Number(
    bookingData?.total_price || rawTotalAmount || rawAmount || 500000,
  );
  const depositAmount = isDeposit
    ? Number(bookingData?.deposit_amount || Math.round(totalAmount * 0.3))
    : 0;
  const remainingAmount = isDeposit ? totalAmount - depositAmount : 0;

  // Số tiền khách cần thanh toán ngay
  const expectedAmount = isDeposit
    ? depositAmount
    : Number(bookingData?.expected_amount || rawAmount || totalAmount);

  // 🌟 THÔNG TIN TÀI KHOẢN CỔNG THANH TOÁN ADMIN (SEPAY)
  const ADMIN_BANK = {
    bankId: "MB",
    bankBin: "970422",
    bankName: "MB Bank",
    accountNumber: "0833404928",
    accountName: "SU TRACH KHANG",
  };

  const [loadingPayment, setLoadingPayment] = useState(true);
  const [isPaidSuccess, setIsPaidSuccess] = useState(false);
  const [copiedField, setCopiedField] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15 * 60);

  const formatVND = (num) => Number(num || 0).toLocaleString("vi-VN") + " ₫";

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // 🌟 1. ĐẾM NGƯỢC THỜI GIAN THEO ĐỒNG HỒ THỰC TẾ (BẢO VỆ CHỐNG HỦY NHẦM ĐƠN ĐÃ TRẢ TIỀN)
  useEffect(() => {
    if (!bookingCode) return;
    const storageKey = `lock_expires_${bookingCode}`;
    let expireTimestamp = Number(localStorage.getItem(storageKey));

    if (!expireTimestamp || isNaN(expireTimestamp)) {
      expireTimestamp = Date.now() + 15 * 60 * 1000;
      localStorage.setItem(storageKey, expireTimestamp.toString());
    }

    const updateTimer = () => {
      // Nếu đã thanh toán thành công thì không đếm ngược hủy nữa
      if (isPaidSuccess) return;

      const remainingSeconds = Math.max(
        0,
        Math.floor((expireTimestamp - Date.now()) / 1000),
      );
      setTimeLeft(remainingSeconds);

      if (remainingSeconds <= 0) {
        localStorage.removeItem(storageKey);

        // Kiểm tra lần cuối với máy chủ trước khi quyết định hủy
        apiClient
          .get(`/payments/status/${bookingCode}`)
          .then((res) => {
            const data = res?.data || res;
            const pStatus = String(
              data?.payment_status || data?.status || "",
            ).toLowerCase();
            const bStatus = String(data?.booking_status || "").toLowerCase();

            if (
              data?.paid === true ||
              ["paid", "partially_paid", "success"].includes(pStatus) ||
              ["confirmed", "paid"].includes(bStatus)
            ) {
              setIsPaidSuccess(true);
              return;
            }

            // Chỉ hủy nếu thật sự chưa thanh toán
            apiClient
              .patch(`/bookings/${bookingCode}/cancel`)
              .catch(() => apiClient.post(`/bookings/${bookingCode}/cancel`))
              .catch(() => {});

            alert(
              "⚠️ Thời gian giữ phòng 15 phút đã hết hạn! Phòng đã được tự động mở lại cho khách khác.",
            );
            navigate("/hotels");
          })
          .catch(() => {
            navigate("/hotels");
          });
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [bookingCode, navigate, isPaidSuccess]);

  // Khởi tạo đơn: Gọi linh hoạt endpoint để lấy đúng thông tin đơn hàng từ Backend
  useEffect(() => {
    if (!bookingCode) return;
    apiClient
      .get(`/bookings/code/${bookingCode}`)
      .catch(() => apiClient.get(`/bookings/${bookingCode}`))
      .then((res) => {
        const data = res?.data?.booking || res?.data?.data || res?.data;
        if (data) setBookingData(data);
      })
      .catch((err) => console.error("Lỗi lấy thông tin đơn:", err))
      .finally(() => setLoadingPayment(false));
  }, [bookingCode]);

  // URL tạo ảnh QR
  const cleanBankCode = encodeURIComponent(ADMIN_BANK.bankId);
  const cleanAccNumber = encodeURIComponent(ADMIN_BANK.accountNumber);
  const cleanBookingCode = encodeURIComponent(bookingCode);
  const cleanAccName = encodeURIComponent(ADMIN_BANK.accountName);
  const qrImageSrc = `https://qr.sepay.vn/img?acc=${cleanAccNumber}&bank=${cleanBankCode}&amount=${expectedAmount}&des=${cleanBookingCode}`;

  const pollingRef = useRef(null);

  // 🌟 2. TỰ ĐỘNG BẮT TRẠNG THÁI THANH TOÁN (SEPAY WEBHOOK)
  const checkPaymentStatus = useCallback(async () => {
    if (!bookingCode || isPaidSuccess) return;

    try {
      const res = await apiClient.get(`/payments/status/${bookingCode}`);
      const data = res?.data || res;

      const pStatus = String(
        data?.status || data?.pay_status || data?.payment?.status || "",
      )
        .trim()
        .toLowerCase();
      const bStatus = String(data?.booking_status || data?.payment_status || "")
        .trim()
        .toLowerCase();

      const isPaid =
        data?.paid === true ||
        ["paid", "success", "partially_paid"].includes(pStatus) ||
        ["confirmed", "paid", "partially_paid"].includes(bStatus);

      if (isPaid) {
        setIsPaidSuccess(true);
        if (pollingRef.current) clearInterval(pollingRef.current);
        localStorage.removeItem(`lock_expires_${bookingCode}`);

        setTimeout(() => {
          navigate(
            `/booking-success?success=true&code=${bookingCode}&amount=${expectedAmount}&totalAmount=${totalAmount}&paymentType=${finalPaymentType}&remainingAmount=${remainingAmount}`,
          );
        }, 500);
      }
    } catch (err) {
      console.warn("Đang lắng nghe thanh toán...", err.message);
    }
  }, [
    bookingCode,
    isPaidSuccess,
    expectedAmount,
    totalAmount,
    finalPaymentType,
    remainingAmount,
    navigate,
  ]);

  useEffect(() => {
    if (!bookingCode || isPaidSuccess) return;

    checkPaymentStatus();
    pollingRef.current = setInterval(checkPaymentStatus, 2000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [bookingCode, isPaidSuccess, checkPaymentStatus]);

  // Hủy đơn khi bấm quay lại (Có kiểm tra trạng thái thanh toán)
  const handleGoBack = async () => {
    if (isPaidSuccess) {
      navigate(-1);
      return;
    }

    const confirmCancel = window.confirm(
      "⚠️ Nếu bạn quay lại bây giờ, phiên giữ phòng sẽ bị HỦY và phòng sẽ được mở lại cho khách khác đặt.\n\nBạn có chắc chắn muốn hủy đơn và quay lại không?",
    );
    if (!confirmCancel) return;

    try {
      setIsCancelling(true);
      await apiClient
        .patch(`/bookings/${bookingCode}/cancel`)
        .catch(() => apiClient.post(`/bookings/${bookingCode}/cancel`));
    } catch (err) {
      console.warn("Lỗi khi hủy đơn:", err);
    } finally {
      setIsCancelling(false);
      localStorage.removeItem(`lock_expires_${bookingCode}`);
      navigate(-1);
    }
  };

  const handleCopy = (text, field) => {
    if (!text) return;
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
      {/* THANH TOPBAR */}
      <div className="bg-white border-b border-slate-200 py-4 shadow-2xs">
        <div className="max-w-4xl mx-auto px-4 flex items-center justify-between">
          <button
            type="button"
            disabled={isCancelling || isPaidSuccess}
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
        {/* BANNER KHI THANH TOÁN THÀNH CÔNG */}
        {isPaidSuccess && (
          <div className="bg-emerald-600 text-white p-6 rounded-3xl shadow-xl flex items-center justify-between animate-in zoom-in-95">
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
          {/* Header Thông tin */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-slate-200 gap-3">
            <div>
              <h2 className="text-2xl font-black text-slate-900">
                {isDeposit
                  ? "Thanh Toán Đặt Cọc 30% Giữ Chỗ"
                  : "Thanh Toán Chuyển Khoản Toàn Bộ"}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Quét mã VietQR bằng App Ngân hàng bất kỳ. Cổng thanh toán tự
                động xác nhận 24/7.
              </p>
            </div>

            {/* Đồng hồ đếm ngược */}
            <div className="bg-amber-50 px-3.5 py-1.5 rounded-2xl border border-amber-200 text-xs font-bold text-amber-800 flex items-center gap-1.5 shrink-0">
              <Clock size={14} className="animate-pulse text-amber-600" />
              <span>
                Thời gian giữ phòng:{" "}
                <strong className="text-amber-900 font-mono text-sm">
                  {formatTime(timeLeft)}
                </strong>
              </span>
            </div>
          </div>

          {/* Banner Cọc 30% */}
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

          {/* KHUNG QUÉT QR & THÔNG TIN CHUYỂN KHOẢN */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center pt-2">
            {/* Cột Trái: Mã QR */}
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
                      Đang khởi tạo mã QR...
                    </span>
                  </div>
                ) : (
                  <>
                    <img
                      src={qrImageSrc}
                      alt="VietQR Cổng Thanh Toán Sàn"
                      className="w-52 h-52 mx-auto object-contain rounded-xl"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = `https://img.vietqr.io/image/${ADMIN_BANK.bankBin}-${cleanAccNumber}-compact2.png?amount=${expectedAmount}&addInfo=${cleanBookingCode}&accountName=${cleanAccName}`;
                      }}
                    />
                    <div className="pt-2 flex items-center justify-center gap-1.5 text-[10px] text-emerald-700 font-black">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      Cổng thanh toán tự động lắng nghe 24/7...
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Cột Phải: Thông tin chuyển khoản */}
            <div className="md:col-span-7 space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border flex justify-between items-center">
                <div>
                  <span className="text-slate-400 block font-medium">
                    Ngân hàng thụ hưởng (Cổng Sàn)
                  </span>
                  <strong className="text-slate-900 font-bold text-sm">
                    {ADMIN_BANK.bankName}
                  </strong>
                </div>
                <span className="font-bold text-blue-700 bg-blue-100 px-2.5 py-1 rounded-md uppercase">
                  {ADMIN_BANK.bankId}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border flex justify-between items-center">
                <div>
                  <span className="text-slate-400 block font-medium">
                    Số tài khoản nhận thanh toán
                  </span>
                  <span className="font-mono font-black text-slate-900 text-base">
                    {ADMIN_BANK.accountNumber}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(ADMIN_BANK.accountNumber, "acc")}
                  className="px-3 py-1 bg-white border rounded-lg font-bold text-blue-600 hover:bg-blue-50 cursor-pointer shadow-2xs flex items-center gap-1"
                >
                  {copiedField === "acc" ? (
                    <Check size={13} className="text-emerald-600" />
                  ) : (
                    <Copy size={13} />
                  )}
                  <span>{copiedField === "acc" ? "Đã chép" : "Sao chép"}</span>
                </button>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border">
                <span className="text-slate-400 block font-medium">
                  Đơn vị thụ hưởng
                </span>
                <strong className="text-slate-900 uppercase font-bold text-sm">
                  {ADMIN_BANK.accountName}
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
                  className="px-3 py-1 bg-white border border-blue-200 rounded-lg font-bold text-blue-700 cursor-pointer shadow-2xs flex items-center gap-1"
                >
                  {copiedField === "amt" ? (
                    <Check size={13} className="text-emerald-600" />
                  ) : (
                    <Copy size={13} />
                  )}
                  <span>{copiedField === "amt" ? "Đã chép" : "Sao chép"}</span>
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
                  className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold cursor-pointer shadow-2xs flex items-center gap-1"
                >
                  {copiedField === "memo" ? (
                    <Check size={13} />
                  ) : (
                    <Copy size={13} />
                  )}
                  <span>{copiedField === "memo" ? "Đã chép" : "Sao chép"}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 justify-center pt-2">
            <ShieldCheck size={16} className="text-emerald-600" />
            <span>
              Giao dịch qua cổng bảo vệ thanh toán. Phòng tự động khóa ngay khi
              nhận tiền.
            </span>
          </div>

          <div className="pt-2 max-w-md mx-auto">
            <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-2xl text-center space-y-1.5 shadow-2xs">
              <div className="flex items-center justify-center gap-2 text-xs font-bold text-[#003580]">
                <RefreshCw size={14} className="animate-spin text-[#003580]" />
                <span>Hệ thống đang tự động kiểm tra giao dịch...</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Sau khi chuyển khoản từ App Ngân hàng, màn hình sẽ{" "}
                <strong>tự động chuyển sang trang Hoàn tất</strong> trong vài
                giây.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
