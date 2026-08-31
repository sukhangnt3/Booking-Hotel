import React, { useState, useEffect, useCallback } from "react";
import {
  QrCode,
  Copy,
  Check,
  RefreshCw,
  AlertTriangle,
  Download,
  Building,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
} from "lucide-react";
import PaymentStatusBadge from "./PaymentStatusBadge";
import { cn } from "@/utils/cn";

/**
 * Component Thanh toán tự động bằng Mã QR Động
 * @param {Object} paymentData - Dữ liệu đơn hàng
 * @param {string} paymentData.orderId - Mã đơn hàng (VD: "GST-8921")
 * @param {number} paymentData.amount - Số tiền cần thanh toán
 * @param {string} paymentData.memo - Nội dung chuyển khoản duy nhất
 * @param {number} paymentData.timeoutMinutes - Thời gian hết hạn QR (phút)
 * @param {Object} bankConfig - Cấu hình ngân hàng thụ hưởng
 * @param {function} onPaymentSuccess - Callback khi nhận tiền thành công
 * @param {function} onExpired - Callback khi hết hạn QR
 */
const DynamicQRPayment = ({
  paymentData = {
    orderId: "GST-89214",
    amount: 1450000,
    memo: "GST89214",
    timeoutMinutes: 15,
  },
  bankConfig = {
    bankId: "MB", // Mã ngân hàng: MB, VCB, TCB, ACB, TPB,...
    bankName: "Ngân hàng TMCP Quân Đội (MBBank)",
    accountNumber: "0987654321",
    accountName: "CONG TY DU LICH GOSTAY VIET NAM",
    template: "compact2", // Giao diện QR: compact, compact2, qr_only, print
  },
  onPaymentSuccess,
  onExpired,
  className = "",
}) => {
  const [timeLeft, setTimeLeft] = useState(paymentData.timeoutMinutes * 60);
  const [status, setStatus] = useState("pending"); // pending, paid, expired, failed
  const [copiedField, setCopiedField] = useState(null);
  const [isChecking, setIsChecking] = useState(false);

  // Link tạo mã VietQR Động tiêu chuẩn
  const qrImageUrl = `https://img.vietqr.io/image/${bankConfig.bankId}-${bankConfig.accountNumber}-${bankConfig.template}.png?amount=${paymentData.amount}&addInfo=${encodeURIComponent(paymentData.memo)}&accountName=${encodeURIComponent(bankConfig.accountName)}`;

  // 1. Đếm ngược thời gian thanh toán
  useEffect(() => {
    if (status === "paid" || status === "expired") return;

    if (timeLeft <= 0) {
      setStatus("expired");
      if (onExpired) onExpired();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, status, onExpired]);

  // 2. Cơ chế tự động kiểm tra trạng thái thanh toán (Auto-Polling)
  const checkPaymentStatus = useCallback(async () => {
    try {
      setIsChecking(true);
      // Giả lập API gọi backend kiểm tra Webhook (Casso/SePay/VietinBank/MB...)
      // const response = await fetch(`/api/payments/verify/${paymentData.orderId}`);
      // const data = await response.json();
      // if (data.status === 'PAID') { setStatus('paid'); onPaymentSuccess?.(); }

      // --- MÔ PHỎNG: Click hoặc chạy ngầm để test thành công ---
      // Trong thực tế, bạn chỉ cần mở comment đoạn fetch trên
    } catch (error) {
      console.error("Lỗi kiểm tra thanh toán:", error);
    } finally {
      setIsChecking(false);
    }
  }, [paymentData.orderId]);

  useEffect(() => {
    if (status !== "pending") return;

    // Tự động kiểm tra mỗi 4 giây
    const pollingInterval = setInterval(() => {
      checkPaymentStatus();
    }, 4000);

    return () => clearInterval(pollingInterval);
  }, [status, checkPaymentStatus]);

  // Copy thông tin vào Clipboard
  const handleCopy = (text, fieldName) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Định dạng thời gian mm:ss
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Định dạng tiền tệ VND
  const formatCurrency = (val) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(val);
  };

  // TRẠNG THÁI: THANH TOÁN THÀNH CÔNG
  if (status === "paid") {
    return (
      <div className="bg-white rounded-3xl p-8 border border-emerald-100 shadow-xl text-center max-w-lg mx-auto animate-in zoom-in-95 duration-300">
        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner">
          <CheckCircle2 size={44} className="animate-bounce" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
          Thanh toán thành công!
        </h3>
        <p className="text-gray-600 text-sm mb-6">
          Hệ thống đã nhận được{" "}
          <strong className="text-gray-900">
            {formatCurrency(paymentData.amount)}
          </strong>{" "}
          cho mã đơn <strong>{paymentData.orderId}</strong>.
        </p>
        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 mb-6 text-left space-y-2 text-xs">
          <div className="flex justify-between text-gray-500">
            <span>Mã giao dịch:</span>
            <span className="font-bold text-gray-800">
              {paymentData.orderId}
            </span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>Thời gian:</span>
            <span className="font-medium text-gray-800">
              {new Date().toLocaleString("vi-VN")}
            </span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>Trạng thái:</span>
            <PaymentStatusBadge status="paid" />
          </div>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="w-full py-3.5 bg-[#006ce4] hover:bg-blue-700 text-white font-bold rounded-xl transition shadow-lg shadow-blue-500/20"
        >
          Tiếp tục trải nghiệm
        </button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden max-w-4xl mx-auto",
        className,
      )}
    >
      {/* HEADER */}
      <div className="p-6 bg-gradient-to-r from-blue-900 via-[#006ce4] to-blue-700 text-white flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={18} className="text-amber-300" />
            <h3 className="text-lg font-bold">Thanh toán chuyển khoản 24/7</h3>
          </div>
          <p className="text-xs text-blue-100">
            Mã đơn hàng:{" "}
            <span className="font-mono font-bold">{paymentData.orderId}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <PaymentStatusBadge status={status} />
          {status === "pending" && (
            <div className="flex items-center gap-1.5 bg-black/20 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-xs font-mono font-bold text-amber-300">
              <Clock size={14} className="animate-pulse" />
              {formatTime(timeLeft)}
            </div>
          )}
        </div>
      </div>

      {/* BODY */}
      <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
        {/* CỘT TRÁI: MÃ QR ĐỘNG */}
        <div className="md:col-span-5 flex flex-col items-center justify-center text-center border-b md:border-b-0 md:border-r border-gray-100 pb-8 md:pb-0 md:pr-6">
          <div className="relative group p-3 bg-white border-2 border-dashed border-blue-200 rounded-3xl shadow-sm hover:border-blue-500 transition-all">
            {status === "expired" ? (
              <div className="w-[220px] h-[220px] bg-gray-50 rounded-2xl flex flex-col items-center justify-center p-4">
                <AlertTriangle className="text-rose-500 mb-2" size={36} />
                <p className="text-xs font-bold text-gray-700">
                  Mã QR đã hết hạn
                </p>
                <button
                  onClick={() => setTimeLeft(paymentData.timeoutMinutes * 60)}
                  className="mt-3 flex items-center gap-1 text-xs text-blue-600 font-bold hover:underline"
                >
                  <RefreshCw size={12} /> Tạo lại mã
                </button>
              </div>
            ) : (
              <>
                <img
                  src={qrImageUrl}
                  alt="Dynamic VietQR"
                  className="w-[220px] h-[220px] object-contain rounded-2xl"
                />
                {/* Tia quét hiệu ứng Radar */}
                <div className="absolute inset-x-3 top-3 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-75 animate-pulse" />
              </>
            )}
          </div>

          <p className="mt-3 text-xs text-gray-500 flex items-center gap-1.5 font-medium">
            <QrCode size={14} className="text-[#006ce4]" />
            Mở app ngân hàng bất kỳ để quét mã
          </p>

          {/* Nút giả lập thanh toán test (Dành cho Dev/Demo) */}
          <button
            onClick={() => {
              setStatus("paid");
              onPaymentSuccess?.();
            }}
            className="mt-4 text-[11px] text-gray-400 hover:text-blue-600 underline"
          >
            [Demo: Bấm để giả lập đã thanh toán]
          </button>
        </div>

        {/* CỘT PHẢI: CHI TIẾT TÀI KHOẢN */}
        <div className="md:col-span-7 space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400">
            <Building size={14} /> Thông tin chuyển khoản thủ công
          </div>

          <div className="space-y-3">
            {/* Tên ngân hàng */}
            <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100 flex justify-between items-center">
              <div>
                <span className="text-[11px] text-gray-400 block font-medium">
                  Ngân hàng thụ hưởng
                </span>
                <span className="text-sm font-bold text-gray-800">
                  {bankConfig.bankName}
                </span>
              </div>
              <span className="text-xs font-black text-blue-600 bg-blue-100/60 px-2.5 py-1 rounded-lg">
                {bankConfig.bankId}
              </span>
            </div>

            {/* Số tài khoản */}
            <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100 flex justify-between items-center">
              <div>
                <span className="text-[11px] text-gray-400 block font-medium">
                  Số tài khoản
                </span>
                <span className="text-base font-mono font-black text-gray-900 tracking-wider">
                  {bankConfig.accountNumber}
                </span>
              </div>
              <button
                onClick={() => handleCopy(bankConfig.accountNumber, "account")}
                className="flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-gray-100 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 transition"
              >
                {copiedField === "account" ? (
                  <Check size={14} className="text-emerald-600" />
                ) : (
                  <Copy size={14} />
                )}
                {copiedField === "account" ? "Đã chép" : "Sao chép"}
              </button>
            </div>

            {/* Chủ tài khoản */}
            <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100">
              <span className="text-[11px] text-gray-400 block font-medium">
                Chủ tài khoản
              </span>
              <span className="text-sm font-bold text-gray-800 uppercase">
                {bankConfig.accountName}
              </span>
            </div>

            {/* Số tiền */}
            <div className="p-3.5 bg-blue-50/60 rounded-2xl border border-blue-100 flex justify-between items-center">
              <div>
                <span className="text-[11px] text-blue-600 block font-medium">
                  Số tiền chính xác
                </span>
                <span className="text-lg font-black text-blue-700">
                  {formatCurrency(paymentData.amount)}
                </span>
              </div>
              <button
                onClick={() =>
                  handleCopy(paymentData.amount.toString(), "amount")
                }
                className="flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-blue-100/50 border border-blue-200 rounded-xl text-xs font-bold text-blue-700 transition"
              >
                {copiedField === "amount" ? (
                  <Check size={14} className="text-emerald-600" />
                ) : (
                  <Copy size={14} />
                )}
                {copiedField === "amount" ? "Đã chép" : "Sao chép"}
              </button>
            </div>

            {/* Nội dung bắt buộc */}
            <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 flex justify-between items-center">
              <div>
                <div className="flex items-center gap-1 text-[11px] text-amber-800 font-bold">
                  <AlertTriangle size={12} /> Nội dung chuyển khoản (Bắt buộc)
                </div>
                <span className="text-base font-mono font-black text-amber-900 tracking-wider">
                  {paymentData.memo}
                </span>
              </div>
              <button
                onClick={() => handleCopy(paymentData.memo, "memo")}
                className="flex items-center gap-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
              >
                {copiedField === "memo" ? (
                  <Check size={14} />
                ) : (
                  <Copy size={14} />
                )}
                {copiedField === "memo" ? "Đã chép" : "Sao chép"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER BẢO MẬT & AUTO-CHECK STATUS */}
      <div className="p-4 bg-gray-50 border-t border-gray-100 flex flex-wrap items-center justify-between text-xs text-gray-500 gap-3">
        <div className="flex items-center gap-2">
          {isChecking ? (
            <RefreshCw size={14} className="text-blue-600 animate-spin" />
          ) : (
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          )}
          <span>Hệ thống đang tự động kiểm tra giao dịch mỗi 4 giây...</span>
        </div>
        <div className="flex items-center gap-1 text-emerald-700 font-medium">
          <ShieldCheck size={16} /> Xác nhận tức thì (Instant Webhook)
        </div>
      </div>
    </div>
  );
};

export default DynamicQRPayment;
