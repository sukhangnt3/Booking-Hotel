import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  PhoneCall,
  ChevronDown,
  MapPin,
  CheckCircle2,
  Receipt,
  Home,
  Clock,
  Building2,
  CalendarDays,
  ExternalLink,
} from "lucide-react";

import { useAuthStore } from "@/stores/authStore";
import { bookingService } from "@/services";

export default function BookingSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const bookingCode =
    searchParams.get("code") ||
    searchParams.get("bookingCode") ||
    "IVIVU2016515";
  const paymentMethod = searchParams.get("method") || "office"; // 'office' | 'at_hotel' | 'qr' | 'online'
  const isOfficeOrHotel =
    paymentMethod === "office" || paymentMethod === "at_hotel";

  const expireTime = "15:44 ngày 31/08/2026";
  const officeAddress =
    "Tầng 2, Tòa nhà Anh Đăng, 215 Nam Kỳ Khởi Nghĩa, Phường Xuân Hòa, TP.Hồ Chí Minh";

  useEffect(() => {
    // Tự động dọn giỏ hàng & cập nhật database
    const syncStatus = async () => {
      try {
        if (bookingService?.updateStatus) {
          await bookingService.updateStatus(bookingCode, {
            status: "confirmed",
            payment_method: paymentMethod,
            payment_status: isOfficeOrHotel ? "at_hotel" : "paid",
          });
        }
      } catch (e) {
        console.warn("Sync status:", e);
      }
    };
    syncStatus();
  }, [bookingCode, paymentMethod, isOfficeOrHotel]);

  return (
    <div className="min-h-screen bg-[#f4f7fa] text-slate-800 font-sans antialiased pb-24">
      {/* ─── 1. HEADER CHUẨN iVIVU ─── */}
      <header className="bg-[#003580] text-white sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/")}
              className="p-2 hover:bg-white/10 rounded-full transition cursor-pointer"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-base font-bold leading-tight">Thanh toán</h1>
              <p className="text-[11px] text-blue-200">Đặt phòng khách sạn</p>
            </div>
          </div>

          <div className="hidden md:block text-center">
            <p className="text-xs text-blue-200">Mã đơn hàng</p>
            <p className="font-mono font-black text-sm tracking-wider text-white">
              {bookingCode}
            </p>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 cursor-pointer">
              <img
                src={
                  user?.avatar ||
                  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100"
                }
                alt=""
                className="w-8 h-8 rounded-full border-2 border-white object-cover"
              />
              <span className="text-sm font-bold hidden sm:inline">
                {user?.full_name || "Khang Su"}
              </span>
              <ChevronDown size={16} />
            </div>

            <div className="hidden lg:flex items-center gap-2 border-l border-white/20 pl-6">
              <PhoneCall className="text-[#ff6a00]" size={20} />
              <div>
                <p className="text-base font-black text-[#ff6a00] leading-none">
                  1900 1870
                </p>
                <p className="text-[10px] text-slate-300 mt-0.5">
                  🕒 7h30 &rarr; 21h
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ─── 2. NỘI DUNG CHÍNH (CARD TRUNG TÂM THEO ẢNH CHỤP) ─── */}
      <main className="max-w-2xl mx-auto px-4 pt-10 sm:pt-14">
        {isOfficeOrHotel ? (
          /* ══════════ TRƯỜNG HỢP: GIỮ CHỖ THANH TOÁN TẠI VĂN PHÒNG / KHÁCH SẠN ══════════ */
          <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-xl border border-slate-200 text-center space-y-6 animate-in zoom-in-95 duration-300">
            {/* TIÊU ĐỀ XANH CYAN */}
            <h2 className="text-2xl sm:text-3xl font-black text-[#00a89d] tracking-tight">
              Xác nhận giữ chỗ thành công!
            </h2>

            {/* HÌNH MINH HỌA MÁY BAY GIẤY */}
            <div className="py-2 flex justify-center">
              <div className="relative w-60 h-40 flex items-center justify-center">
                {/* Vector máy bay giấy nghệ thuật */}
                <svg
                  viewBox="0 0 500 350"
                  className="w-full h-full drop-shadow-md"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
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
                  {/* Nhân vật thư giãn */}
                  <circle cx="280" cy="110" r="14" fill="#003580" />
                  <path
                    d="M265 140 C270 125, 295 125, 305 140 L320 160 L260 160 Z"
                    fill="#004b87"
                  />
                </svg>
              </div>
            </div>

            {/* NỘI DUNG HƯỚNG DẪN */}
            <div className="space-y-4 text-slate-700 text-sm sm:text-base leading-relaxed max-w-lg mx-auto">
              <p>
                Quý khách đã giữ chỗ thành công! Vui lòng đến{" "}
                <strong className="text-slate-900 font-bold">
                  Văn phòng TP.HCM
                </strong>{" "}
                thanh toán trước{" "}
                <span className="text-[#ff6a00] font-black">{expireTime}</span>{" "}
                để hoàn tất đặt phòng.
              </p>

              {/* ĐỊA CHỈ */}
              <div className="text-xs sm:text-sm text-slate-600 flex items-start justify-center gap-1.5 pt-1">
                <MapPin size={16} className="text-slate-400 shrink-0 mt-0.5" />
                <span className="text-left">
                  {officeAddress}{" "}
                  <a
                    href="https://maps.google.com"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#006ce4] hover:underline font-bold"
                  >
                    (Xem bản đồ)
                  </a>
                </span>
              </div>

              <p className="text-sm font-bold text-slate-800 pt-2">
                Mã đơn hàng:{" "}
                <span className="font-mono font-black text-slate-900">
                  {bookingCode}
                </span>
              </p>
            </div>

            {/* NÚT VỀ TRANG CHỦ MÀU CAM VIỀN RỖNG (CHUẨN iVIVU) */}
            <div className="pt-4 max-w-xs mx-auto space-y-3">
              <button
                onClick={() => navigate("/")}
                className="w-full py-3 px-6 rounded-xl border-2 border-[#ff6a00] text-[#ff6a00] hover:bg-orange-50 font-black text-sm transition active:scale-95 cursor-pointer shadow-sm"
              >
                Về trang chủ
              </button>

              <button
                onClick={() => navigate("/profile")}
                className="w-full py-2.5 text-xs text-slate-500 hover:text-[#006ce4] font-bold transition cursor-pointer"
              >
                Xem chi tiết đơn trong Tài khoản &rarr;
              </button>
            </div>
          </div>
        ) : (
          /* ══════════ TRƯỜNG HỢP: ĐÃ THANH TOÁN ONLINE (E-VOUCHER) ══════════ */
          <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-xl border border-slate-200 text-center space-y-6 animate-in zoom-in-95">
            <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-100">
              <CheckCircle2 size={48} strokeWidth={2.5} />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
                Thanh toán thành công!
              </h2>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                Hệ thống đã nhận thanh toán cho mã đơn{" "}
                <strong>{bookingCode}</strong>. Vé điện tử (E-Voucher) đã được
                gửi tới email của bạn.
              </p>
            </div>

            <div className="pt-4 max-w-xs mx-auto space-y-3">
              <button
                onClick={() => navigate("/profile")}
                className="w-full py-3.5 bg-[#006ce4] hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md transition"
              >
                Xem vé điện tử trong Profile
              </button>
              <button
                onClick={() => navigate("/")}
                className="w-full py-3 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-sm rounded-xl transition"
              >
                Về trang chủ
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
