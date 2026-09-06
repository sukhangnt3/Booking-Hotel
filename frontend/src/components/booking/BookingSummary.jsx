// src/components/booking/BookingSummary.jsx
import React, { useState } from "react";
import {
  Ticket,
  Info,
  ShieldCheck,
  CalendarDays,
  Users,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Button, Input, Badge } from "../ui";
import { promotionService } from "@/services";
import { cn } from "@/utils/cn";

export default function BookingSummary({
  hotelId,
  hotelName,
  roomName,
  checkIn,
  checkOut,
  nights = 1,
  guests = 2,
  basePrice = 0,
  taxRate = 0.08,
  onApplySuccess,
  className = "",
}) {
  const [promoCode, setPromoCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [isApplied, setIsApplied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const subTotal = basePrice * nights;
  const taxAmount = Math.round((subTotal - discount) * taxRate);
  const finalTotal = Math.max(0, subTotal - discount + taxAmount);

  const formatPrice = (amount) =>
    Number(amount || 0).toLocaleString("vi-VN") + " ₫";

  // Gọi API thật kiểm tra trong PostgreSQL
  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const res = await promotionService.checkCode(
        promoCode.trim().toUpperCase(),
        {
          hotelId: hotelId,
          totalAmount: subTotal,
        },
      );

      const discountVal = Number(res?.discountAmount || 0);
      setDiscount(discountVal);
      setIsApplied(true);
      setSuccessMessage(
        res?.message || `✓ Đã giảm ${formatPrice(discountVal)}!`,
      );

      if (onApplySuccess) {
        onApplySuccess({
          code: promoCode.trim().toUpperCase(),
          discountAmount: discountVal,
          finalAmount: finalTotal,
        });
      }
    } catch (err) {
      setErrorMessage(
        err?.response?.data?.message ||
          err?.message ||
          "Mã ưu đãi không hợp lệ hoặc đã hết hạn.",
      );
      setDiscount(0);
      setIsApplied(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={cn(
        "bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden sticky top-24 font-sans",
        className,
      )}
    >
      <div className="bg-[#003580] p-5 text-white">
        <h3 className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-1">
          Chỗ nghỉ bạn đã chọn
        </h3>
        <h2 className="text-xl font-black leading-tight">
          {hotelName || "Khách sạn GoStay"}
        </h2>
      </div>

      <div className="p-6 space-y-6">
        <div className="space-y-4 pb-6 border-b border-dashed border-gray-200">
          <div className="flex items-center gap-3 text-gray-700">
            <CalendarDays size={18} className="text-[#006ce4]" />
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-gray-400 uppercase">
                Thời gian lưu trú
              </span>
              <span className="text-sm font-bold">
                {nights} đêm ({checkIn} — {checkOut})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-gray-700">
            <Users size={18} className="text-[#006ce4]" />
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-gray-400 uppercase">
                Số khách & Phòng
              </span>
              <span className="text-sm font-bold">
                {guests} người lớn · {roomName || "Phòng tiêu chuẩn"}
              </span>
            </div>
          </div>
        </div>

        {/* Ô NHẬP MÃ GIẢM GIÁ */}
        <div className="space-y-2.5">
          <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
            <Ticket size={16} className="text-orange-500" />
            Mã giảm giá / Ưu đãi
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="VD: GOSTAY10, GIAM50K..."
              value={promoCode}
              onChange={(e) => {
                setPromoCode(e.target.value.toUpperCase());
                setErrorMessage("");
              }}
              disabled={isApplied}
              className="flex-1 h-10 px-3 border border-gray-300 rounded-xl text-xs font-mono font-bold uppercase tracking-wider outline-none focus:border-[#003580]"
            />
            <button
              type="button"
              onClick={handleApplyPromo}
              disabled={!promoCode.trim() || isApplied || loading}
              className="h-10 px-4 bg-[#003580] hover:bg-blue-900 disabled:opacity-40 text-white font-bold text-xs rounded-xl transition cursor-pointer shrink-0 flex items-center gap-1"
            >
              {loading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : isApplied ? (
                "Đã dùng"
              ) : (
                "Áp dụng"
              )}
            </button>
          </div>

          {errorMessage && (
            <p className="text-[11px] font-bold text-rose-600 flex items-center gap-1">
              <AlertCircle size={13} /> {errorMessage}
            </p>
          )}

          {isApplied && (
            <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-1.5">
              <CheckCircle2 size={15} className="text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}
        </div>

        {/* TÍNH TOÁN TIỀN TỆ */}
        <div className="space-y-3 pt-2">
          <div className="flex justify-between text-xs text-gray-600 font-medium">
            <span>Giá phòng ({nights} đêm)</span>
            <span>{formatPrice(subTotal)}</span>
          </div>

          {isApplied && (
            <div className="flex justify-between text-xs text-emerald-600 font-bold">
              <span>Mã giảm giá</span>
              <span>- {formatPrice(discount)}</span>
            </div>
          )}

          <div className="flex justify-between text-xs text-gray-600 font-medium">
            <span>Thuế VAT & phí dịch vụ (8%)</span>
            <span>+ {formatPrice(taxAmount)}</span>
          </div>

          <div className="pt-4 mt-4 border-t border-gray-100">
            <div className="flex justify-between items-end">
              <span className="text-base font-black text-gray-900">
                Tổng thanh toán
              </span>
              <div className="text-right">
                <p className="text-2xl font-black text-[#ff6a00]">
                  {formatPrice(finalTotal)}
                </p>
                <p className="text-[10px] text-gray-400 italic">
                  Đã gồm thuế & phí
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-emerald-50 p-3.5 rounded-xl flex items-start gap-2.5 border border-emerald-100">
          <ShieldCheck className="text-emerald-600 shrink-0 mt-0.5" size={18} />
          <div>
            <p className="text-xs font-bold text-emerald-900">
              Bảo mật thanh toán 100%
            </p>
            <p className="text-[10px] text-emerald-700 leading-relaxed mt-0.5">
              Hệ thống mã hóa chuẩn quốc tế, bảo vệ thông tin đặt phòng an toàn.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 p-4 flex items-center gap-2 border-t border-gray-100">
        <Info size={14} className="text-gray-400" />
        <span className="text-[10px] text-gray-500 font-medium">
          Hỗ trợ hủy phòng miễn phí trước 24 giờ nhận phòng.
        </span>
      </div>
    </div>
  );
}
