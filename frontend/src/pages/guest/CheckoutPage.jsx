// src/pages/guest/CheckoutPage.jsx
import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  QrCode,
  CheckCircle2,
  Copy,
  Clock,
  ShieldCheck,
  Check,
  Building2,
  Sparkles,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";

function CheckoutPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const bookingCode =
    searchParams.get("code") ||
    searchParams.get("bookingCode") ||
    `GST-${Date.now().toString().slice(-6)}`;
  const urlAmount = Number(searchParams.get("amount")) || 1250000;
  const hotelId = searchParams.get("hotelId") || "HT-101";

  // CẤU HÌNH TÀI KHOẢN NGÂN HÀNG VIETQR
  const MY_BANK = {
    bankId: "MB",
    bankName: "Ngân hàng Quân Đội (MBBank)",
    accountNumber: "0833404928",
    accountName: "SU TRACH KHANG",
  };

  // URL MÃ VIETQR ĐỘNG TỰ ĐỘNG THEO SỐ TIỀN & MÃ ĐƠN
  const vietQrUrl = `https://img.vietqr.io/image/${MY_BANK.bankId}-${MY_BANK.accountNumber}-compact2.png?amount=${urlAmount}&addInfo=${bookingCode}&accountName=${encodeURIComponent(MY_BANK.accountName)}`;

  const [copiedField, setCopiedField] = useState(null);
  const [timeLeft, setTimeLeft] = useState(15 * 60); // Đếm ngược 15 phút giữ phòng

  const formatVND = (num) => Number(num || 0).toLocaleString("vi-VN") + " ₫";

  const handleCopy = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Đếm ngược thời gian
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

  // Xử lý xác nhận thanh toán & lưu đơn vào hệ thống
  const handleConfirmPaid = () => {
    const newBooking = {
      id: bookingCode,
      code: bookingCode,
      hotel_id: hotelId,
      hotel_name: "BezTower & Residences",
      room_name: "Deluxe King Hướng Biển",
      customer_name: user?.full_name || user?.name || "Khang Sử Trạch",
      customer_email: user?.email || "customer@gmail.com",
      customer_phone: user?.phone || "0833404928",
      total_price: urlAmount,
      payment_method: "VietQR 24/7",
      payment_status: "paid",
      status: "confirmed",
      check_in: new Date().toISOString().split("T")[0],
      check_out: new Date(Date.now() + 86400000).toISOString().split("T")[0],
      created_at: new Date().toISOString(),
    };

    const allBookings = JSON.parse(
      localStorage.getItem("all_bookings") || "[]",
    );
    allBookings.unshift(newBooking);
    localStorage.setItem("all_bookings", JSON.stringify(allBookings));

    navigate(
      `/booking-success?code=${bookingCode}&amount=${urlAmount}&method=qr`,
    );
  };

  return (
    <div className="min-h-screen bg-[#f4f7fa] text-slate-800 font-sans antialiased pb-24">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 py-4 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-blue-600 cursor-pointer"
          >
            <ArrowLeft size={18} /> Quay lại
          </button>
          <div className="text-right">
            <span className="text-xs text-slate-400 block font-medium">
              Mã đơn đặt phòng
            </span>
            <span className="font-mono font-black text-sm text-blue-900">
              {bookingCode}
            </span>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 pt-8 space-y-6">
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-slate-200 gap-3">
            <div>
              <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                <QrCode className="text-blue-600" /> Thanh toán tự động qua
                VietQR 24/7
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                Hệ thống tự động xác nhận giao dịch trong 1 - 3 giây...
              </p>
            </div>
            <div className="bg-amber-50 px-3.5 py-1.5 rounded-2xl border border-amber-200 text-xs font-bold text-amber-800 flex items-center gap-1.5">
              <Clock size={14} className="animate-pulse" />
              <span>
                Thời gian giữ phòng: <strong>{formatTime(timeLeft)}</strong>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center pt-2">
            {/* Khung QR Code */}
            <div className="md:col-span-5 bg-slate-50 p-6 rounded-3xl border border-slate-200 text-center space-y-3">
              <span className="text-xs font-bold text-slate-700 block">
                Mở App ngân hàng để quét mã
              </span>
              <div className="p-3 bg-white rounded-2xl border shadow-sm inline-block">
                <img
                  src={vietQrUrl}
                  alt="VietQR MBBank"
                  className="w-48 h-48 mx-auto object-contain rounded-xl"
                />
                <p className="text-[10px] text-slate-400 font-bold italic pt-1">
                  Scan to Pay 24/7
                </p>
              </div>
            </div>

            {/* Chi tiết chuyển khoản */}
            <div className="md:col-span-7 space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border flex justify-between items-center">
                <div>
                  <span className="text-slate-400 block font-medium">
                    Ngân hàng thụ hưởng
                  </span>
                  <strong className="text-slate-900 font-bold">
                    {MY_BANK.bankName}
                  </strong>
                </div>
                <span className="font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                  MB
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border flex justify-between items-center">
                <div>
                  <span className="text-slate-400 block font-medium">
                    Số tài khoản
                  </span>
                  <span className="font-mono font-black text-slate-900 text-base">
                    {MY_BANK.accountNumber}
                  </span>
                </div>
                <button
                  onClick={() => handleCopy(MY_BANK.accountNumber, "acc")}
                  className="px-3 py-1 bg-white border rounded-lg font-bold text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                >
                  {copiedField === "acc" ? "✓ Đã chép" : "Sao chép"}
                </button>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border">
                <span className="text-slate-400 block font-medium">
                  Chủ tài khoản
                </span>
                <strong className="text-slate-900 uppercase font-bold">
                  {MY_BANK.accountName}
                </strong>
              </div>

              <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200 flex justify-between items-center">
                <div>
                  <span className="text-blue-600 block font-medium">
                    Số tiền chính xác
                  </span>
                  <strong className="text-blue-900 text-base font-black">
                    {formatVND(urlAmount)}
                  </strong>
                </div>
                <button
                  onClick={() => handleCopy(urlAmount.toString(), "amt")}
                  className="px-3 py-1 bg-white border border-blue-200 rounded-lg font-bold text-blue-700 cursor-pointer"
                >
                  {copiedField === "amt" ? "✓ Đã chép" : "Sao chép"}
                </button>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex justify-between items-center">
                <div>
                  <span className="text-amber-700 block font-medium">
                    Nội dung chuyển khoản (Bắt buộc)
                  </span>
                  <span className="font-mono font-black text-rose-600 text-sm">
                    {bookingCode}
                  </span>
                </div>
                <button
                  onClick={() => handleCopy(bookingCode, "memo")}
                  className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold cursor-pointer"
                >
                  {copiedField === "memo" ? "✓ Đã chép" : "Sao chép"}
                </button>
              </div>
            </div>
          </div>

          <div className="pt-4 max-w-sm mx-auto space-y-3">
            <button
              onClick={handleConfirmPaid}
              className="w-full py-4 bg-[#ff6a00] hover:bg-[#e55f00] text-white font-black text-base rounded-2xl shadow-lg transition active:scale-95 cursor-pointer flex items-center justify-center gap-2"
            >
              <Check size={20} strokeWidth={3} />
              Tôi đã chuyển khoản xong
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

// 🛑 ĐẢM BẢO CÓ DÒNG EXPORT DEFAULT NÀY ĐỂ TRÁNH LỖI MÀN HÌNH TRẮNG
export default CheckoutPage;
