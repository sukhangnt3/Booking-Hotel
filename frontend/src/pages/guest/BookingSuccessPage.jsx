// src/pages/guest/BookingSuccessPage.jsx
import React from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  CalendarDays,
  Ticket,
  Home,
  Clock,
  ArrowRight,
  ShieldCheck,
  Building2,
  Mail,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";

export default function BookingSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const bookingCode =
    searchParams.get("code") || `GST-${Date.now().toString().slice(-6)}`;
  const amount = Number(searchParams.get("amount")) || 1250000;
  const formatVND = (num) => Number(num || 0).toLocaleString("vi-VN") + " ₫";

  return (
    <div className="min-h-screen bg-[#f4f7fa] text-slate-800 font-sans antialiased pb-24 pt-10">
      <main className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-xl border border-slate-200 text-center space-y-6 animate-in zoom-in-95">
          {/* Icon thành công */}
          <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-3xl flex items-center justify-center mx-auto border border-emerald-100 shadow-md">
            <CheckCircle2 size={44} strokeWidth={2.5} />
          </div>

          <div className="space-y-2">
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold uppercase tracking-wider">
              <ShieldCheck size={14} /> Giao dịch đã được tiếp nhận
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Đặt Phòng Thành Công!
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
              Cảm ơn Quý khách{" "}
              <strong>{user?.full_name || "Khang Sử Trạch"}</strong> đã lựa chọn{" "}
              <strong>BezTower & Residences</strong>.
            </p>
          </div>

          {/* Hộp thông tin mã đơn hàng */}
          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 text-left text-xs space-y-2.5">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <span className="text-slate-500 font-bold uppercase text-[10px]">
                MÃ ĐẶT PHÒNG (BOOKING CODE)
              </span>
              <span className="font-mono font-black text-base text-blue-900">
                #{bookingCode}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-500">Khách sạn:</span>
              <strong className="text-slate-900">BezTower & Residences</strong>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-500">Hạng phòng:</span>
              <span className="font-semibold text-slate-800">
                Deluxe King Hướng Biển
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-500">Tổng thanh toán:</span>
              <strong className="text-emerald-700 font-black text-sm">
                {formatVND(amount)}
              </strong>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-200">
              <span className="text-slate-500">Trạng thái:</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                <Clock size={12} className="animate-pulse" /> Đã gửi xác thực &
                chờ nhận phòng
              </span>
            </div>
          </div>

          {/* Thông báo gửi email */}
          <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl flex items-center gap-3 text-left text-xs text-blue-900">
            <Mail size={20} className="text-blue-600 shrink-0" />
            <p className="leading-relaxed">
              Thông tin xác nhận và phiếu nhận phòng điện tử (E-Voucher) đã được
              gửi tự động đến email của Quý khách.
            </p>
          </div>

          {/* Các nút điều hướng */}
          <div className="pt-2 max-w-sm mx-auto space-y-3">
            <button
              onClick={() => navigate("/profile")}
              className="w-full py-3.5 bg-[#003580] hover:bg-blue-900 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Ticket size={16} /> Xem trong Chuyến đi của tôi
            </button>

            <button
              onClick={() => navigate("/")}
              className="w-full py-3 border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Home size={14} /> Về trang chủ
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
