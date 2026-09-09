// src/pages/guest/CheckoutPage.jsx
import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  QrCode,
  Clock,
  Check,
  Loader2,
  AlertCircle,
  ShieldCheck,
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
  const hotelId = searchParams.get("hotelId") || "";
  const initialAmount = Number(searchParams.get("amount")) || 650000;

  const [totalAmount, setTotalAmount] = useState(initialAmount);
  const [bankInfo, setBankInfo] = useState({
    bankId: "MB",
    bankName: "Ngân hàng TMCP Quân Đội (MBBank)",
    accountNumber: "0833404928",
    accountName: "SU TRACH KHANG",
  });

  const [copiedField, setCopiedField] = useState(null);
  const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 phút giữ chỗ
  const [isProcessing, setIsProcessing] = useState(false);

  const formatVND = (num) => Number(num || 0).toLocaleString("vi-VN") + " ₫";

  // Lấy thông tin tài khoản ngân hàng từ khách sạn trong Database
  useEffect(() => {
    if (!hotelId) return;

    apiClient
      .get(`/hotels/${hotelId}`)
      .then((res) => {
        const h = res?.data || res?.hotel || res;
        if (h && h.bank_account && h.bank_name) {
          setBankInfo({
            bankId: h.bank_name.includes("MB") ? "MB" : "VCB",
            bankName: h.bank_name,
            accountNumber: h.bank_account,
            accountName: h.bank_account_holder || h.name || "CHỦ KHÁCH SẠN",
          });
        }
      })
      .catch(() => {});
  }, [hotelId]);

  // Đếm ngược thời gian giữ giá 15 phút
  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

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

  // Nút "Tôi đã chuyển khoản xong"
  const handleConfirmPaidVietQR = async () => {
    if (!bookingCode) return;
    setIsProcessing(true);
    try {
      await apiClient.post("/bookings/confirm-payment", {
        booking_code: bookingCode,
      });
      alert("✓ Xác nhận thanh toán thành công! Phòng của bạn đã được đảm bảo.");
      navigate(`/booking-success?code=${bookingCode}&amount=${totalAmount}`);
    } catch (err) {
      alert("Lỗi xác nhận: " + (err.response?.data?.message || err.message));
    } finally {
      setIsProcessing(false);
    }
  };

  // Tạo URL mã VietQR chuẩn động
  const vietQrUrl = `https://img.vietqr.io/image/${bankInfo.bankId}-${bankInfo.accountNumber}-compact2.png?amount=${totalAmount}&addInfo=${bookingCode}&accountName=${encodeURIComponent(bankInfo.accountName)}`;

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
          {/* Tiêu đề & Đồng hồ đếm ngược */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-slate-200 gap-3">
            <div>
              <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                Thanh Toán Chuyển Khoản VietQR
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Quét mã QR bằng ứng dụng ngân hàng bất kỳ để giữ chỗ tức thì
              </p>
            </div>

            <div className="bg-amber-50 px-3.5 py-1.5 rounded-2xl border border-amber-200 text-xs font-bold text-amber-800 flex items-center gap-1.5">
              <Clock size={14} className="animate-pulse" />
              <span>
                Thời gian giữ phòng: <strong>{formatTime(timeLeft)}</strong>
              </span>
            </div>
          </div>

          {/* KHUNG THANH TOÁN VIETQR DUY NHẤT */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center pt-2">
            {/* Cột trái: Mã QR Code */}
            <div className="md:col-span-5 bg-slate-50 p-6 rounded-3xl border border-slate-200 text-center space-y-3">
              <span className="text-xs font-bold text-slate-700 block">
                Mở App Ngân hàng quét mã QR
              </span>
              <div className="p-3 bg-white rounded-2xl border shadow-xs inline-block">
                <img
                  src={vietQrUrl}
                  alt="VietQR"
                  className="w-52 h-52 mx-auto object-contain rounded-xl"
                />
                <p className="text-[10px] text-slate-400 font-bold italic pt-1">
                  VietQR Chuẩn Quốc Gia - Tự động điền số tiền
                </p>
              </div>
            </div>

            {/* Cột phải: Thông tin chuyển khoản chi tiết */}
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

              <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200 flex justify-between items-center">
                <div>
                  <span className="text-blue-600 block font-medium">
                    Số tiền thanh toán
                  </span>
                  <strong className="text-blue-900 text-base font-black">
                    {formatVND(totalAmount)}
                  </strong>
                </div>
                <button
                  onClick={() => handleCopy(totalAmount.toString(), "amt")}
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
              Giao dịch bảo mật 100% qua hệ thống ngân hàng liên minh Napas &
              VietQR
            </span>
          </div>

          {/* Nút hành động duy nhất */}
          <div className="pt-2 max-w-sm mx-auto">
            <button
              type="button"
              onClick={handleConfirmPaidVietQR}
              disabled={isProcessing}
              className="w-full py-4 bg-[#003580] hover:bg-blue-900 text-white font-black text-base rounded-2xl shadow-lg transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="animate-spin" size={20} /> Đang kiểm tra
                  giao dịch...
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
