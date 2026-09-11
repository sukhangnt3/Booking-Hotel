import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Clock,
  Check,
  Loader2,
  AlertCircle,
  ShieldCheck,
  Copy,
  Building2,
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

  // Đọc hình thức thanh toán và tổng tiền
  const rawPaymentType = searchParams.get("paymentType") || "FULL";
  const rawTotalAmount = Number(searchParams.get("totalAmount")) || 500000;
  const isDeposit = rawPaymentType === "DEPOSIT_30";

  // ─── CÔNG THỨC TOÁN HỌC KHÓA CHUẨN: 30% CỌC VÀ 70% CÒN LẠI ───
  const totalAmount = rawTotalAmount;
  const depositAmount = Math.round(totalAmount * 0.3); // Luôn đúng 30% (Ví dụ: 30.000₫)
  const remainingAmount = totalAmount - depositAmount; // Luôn đúng 70% (Ví dụ: 70.000₫)
  const amountToPay = isDeposit ? depositAmount : totalAmount; // Số tiền VietQR cần quét

  // Thông tin ngân hàng MBBank
  const bankInfo = {
    bankId: "MB",
    bankName: "Ngân hàng TMCP Quân Đội (MBBank)",
    accountNumber: "0833404928",
    accountName: "SU TRACH KHANG",
  };

  // Link VietQR tự động điền đúng số tiền cọc 30% (30.000₫) và mã đơn
  const activeQrUrl = `https://img.vietqr.io/image/${bankInfo.bankId}-${bankInfo.accountNumber}-compact2.png?amount=${amountToPay}&addInfo=${bookingCode}&accountName=${encodeURIComponent(bankInfo.accountName)}`;

  const [copiedField, setCopiedField] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const formatVND = (num) => Number(num || 0).toLocaleString("vi-VN") + " ₫";

  // ─── ĐẾM NGƯỢC 15 PHÚT GIỮ CHỖ CỐ ĐỊNH (F5 KHÔNG BỊ RESET) ───
  const getInitialTimeLeft = () => {
    if (!bookingCode) return 15 * 60;
    const storageKey = `lock_expires_${bookingCode}`;
    let expireTimestamp = localStorage.getItem(storageKey);

    if (!expireTimestamp) {
      expireTimestamp =
        sessionStorage.getItem("booking_session_lock_temp") ||
        (Date.now() + 15 * 60 * 1000).toString();
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
            "⚠️ Thời gian giữ phòng tạm thời (15 phút) đã hết hạn! Phòng đã được giải phóng cho khách khác.",
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

  const handleCopy = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Nút xác nhận thanh toán
  const handleConfirmPaid = async () => {
    if (!bookingCode) return;
    setIsProcessing(true);

    try {
      const res = await apiClient.post("/payments/confirm-manual", {
        bookingCode: bookingCode,
        amount: amountToPay,
        paymentType: rawPaymentType,
      });

      const data = res?.data || res;
      if (data?.success || data?.paid || res?.status === 200) {
        localStorage.removeItem(`lock_expires_${bookingCode}`);
        sessionStorage.clear();

        navigate(
          `/booking-success?success=true&code=${bookingCode}&amount=${amountToPay}&totalAmount=${totalAmount}&paymentType=${rawPaymentType}&remainingAmount=${remainingAmount}`,
        );
      } else {
        alert(
          data?.message || "Không thể xác nhận thanh toán. Vui lòng thử lại!",
        );
      }
    } catch (err) {
      console.error("Lỗi xác nhận:", err);
      alert("Lỗi xác nhận: " + (err.response?.data?.message || err.message));
    } finally {
      setIsProcessing(false);
    }
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
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-blue-600 cursor-pointer"
          >
            <ArrowLeft size={18} /> Quay lại
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
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-xl space-y-6">
          {/* Tiêu đề & Countdown */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-slate-200 gap-3">
            <div>
              <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                {isDeposit
                  ? "Thanh Toán Đặt Cọc 30% Giữ Chỗ"
                  : "Thanh Toán Chuyển Khoản Toàn Bộ"}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Quét mã VietQR bằng App Ngân hàng bất kỳ để đảm bảo phòng được
                giữ tức thì.
              </p>
            </div>

            <div className="bg-amber-50 px-3.5 py-1.5 rounded-2xl border border-amber-200 text-xs font-bold text-amber-800 flex items-center gap-1.5">
              <Clock size={14} className="animate-pulse" />
              <span>
                Thời gian giữ phòng: <strong>{formatTime(timeLeft)}</strong>
              </span>
            </div>
          </div>

          {/* Banner thông báo cọc 30% chuẩn xác */}
          {isDeposit && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3 text-xs text-emerald-900">
              <Building2
                className="text-emerald-700 shrink-0 mt-0.5"
                size={18}
              />
              <div className="space-y-1">
                <strong className="text-sm font-bold block text-emerald-800">
                  Phương thức: Cọc trước 30% giữ phòng (Tránh book ảo)
                </strong>
                <p className="text-emerald-700 leading-relaxed">
                  Bạn chỉ cần chuyển khoản khoản cọc{" "}
                  <strong>{formatVND(depositAmount)}</strong> ngay bây giờ. Số
                  tiền còn lại <strong>{formatVND(remainingAmount)}</strong> bạn
                  sẽ thanh toán trực tiếp khi làm thủ tục check-in tại quầy lễ
                  tân.
                </p>
              </div>
            </div>
          )}

          {/* KHUNG THANH TOÁN VIETQR */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center pt-2">
            {/* Cột trái: Mã QR Code */}
            <div className="md:col-span-5 bg-slate-50 p-6 rounded-3xl border border-slate-200 text-center space-y-3">
              <span className="text-xs font-bold text-slate-700 block">
                Mở App Ngân hàng quét mã QR
              </span>

              <div className="p-3 bg-white rounded-2xl border shadow-xs inline-block">
                <img
                  src={activeQrUrl}
                  alt="VietQR"
                  className="w-52 h-52 mx-auto object-contain rounded-xl"
                />
                <p className="text-[10px] text-slate-400 font-bold italic pt-1">
                  VietQR Tự Động Điền Số Tiền: {formatVND(amountToPay)}
                </p>
              </div>
            </div>

            {/* Cột phải: Chi tiết chuyển khoản */}
            <div className="md:col-span-7 space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border flex justify-between items-center">
                <div>
                  <span className="text-slate-400 block font-medium">
                    Ngân hàng thụ hưởng
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
                    Số tài khoản thụ hưởng
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
                  Chủ tài khoản
                </span>
                <strong className="text-slate-900 uppercase font-bold text-sm">
                  {bankInfo.accountName}
                </strong>
              </div>

              {/* KHUNG SỐ TIỀN CỌC 30% ĐƯỢC TÍNH TOÁN CHÍNH XÁC */}
              <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200 flex justify-between items-center">
                <div>
                  <span className="text-blue-600 block font-medium">
                    {isDeposit
                      ? "Số tiền cọc cần chuyển ngay (30%)"
                      : "Số tiền thanh toán"}
                  </span>
                  <strong className="text-blue-900 text-base font-black">
                    {formatVND(amountToPay)}
                  </strong>
                  {isDeposit && (
                    <span className="text-[10px] text-gray-500 block">
                      Tổng tiền phòng: {formatVND(totalAmount)}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(amountToPay.toString(), "amt")}
                  className="px-3 py-1 bg-white border border-blue-200 rounded-lg font-bold text-blue-700 cursor-pointer shadow-2xs"
                >
                  {copiedField === "amt" ? "✓ Đã chép" : "Sao chép"}
                </button>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex justify-between items-center">
                <div>
                  <span className="text-amber-700 block font-medium">
                    Nội dung chuyển khoản (Bắt buộc giữ nguyên)
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

          {/* Cam kết an toàn */}
          <div className="flex items-center gap-2 text-xs text-slate-500 justify-center pt-2">
            <ShieldCheck size={16} className="text-emerald-600" />
            <span>
              Giao dịch an toàn được xác thực và lưu trữ tự động vào cơ sở dữ
              liệu
            </span>
          </div>

          {/* Nút bấm xác nhận */}
          <div className="pt-2 max-w-sm mx-auto">
            <button
              type="button"
              onClick={handleConfirmPaid}
              disabled={isProcessing}
              className="w-full py-4 bg-[#003580] hover:bg-blue-900 text-white font-black text-base rounded-2xl shadow-lg transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="animate-spin" size={20} /> Đang lưu giao
                  dịch...
                </>
              ) : (
                <>
                  <Check size={20} strokeWidth={3} /> Tôi đã chuyển khoản xong
                </>
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
