import React, { useState } from "react";
import {
  Ticket,
  Info,
  ShieldCheck,
  CalendarDays,
  Users,
  ArrowRight,
} from "lucide-react";
import { Button, Input, Badge } from "../ui";
import { cn } from "@/utils/cn";

const BookingSummary = ({
  hotelName,
  roomName,
  checkIn,
  checkOut,
  nights = 1,
  guests = 2,
  basePrice = 0,
  taxRate = 0.1, // 10% VAT
  className = "",
}) => {
  const [promoCode, setPromoCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [isApplied, setIsApplied] = useState(false);

  // 1. Tính toán con số
  const subTotal = basePrice * nights;
  const taxAmount = subTotal * taxRate;
  const totalBeforeDiscount = subTotal + taxAmount;
  const finalTotal = totalBeforeDiscount - discount;

  const formatPrice = (amount) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);

  // 2. Xử lý mã giảm giá (Giả lập)
  const handleApplyPromo = () => {
    if (promoCode.toUpperCase() === "GOSTAY2024") {
      setDiscount(200000); // Giảm 200k
      setIsApplied(true);
    } else {
      alert("Mã giảm giá không hợp lệ!");
    }
  };

  return (
    <div
      className={cn(
        "bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden sticky top-24",
        className,
      )}
    >
      {/* HEADER: Tên khách sạn */}
      <div className="bg-[#003580] p-5 text-white">
        <h3 className="text-[11px] font-bold uppercase tracking-widest opacity-80 mb-1">
          Bạn đang đặt tại
        </h3>
        <h2 className="text-xl font-black leading-tight">{hotelName}</h2>
      </div>

      <div className="p-6 space-y-6">
        {/* CHI TIẾT LƯU TRÚ */}
        <div className="space-y-4 pb-6 border-b border-dashed border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-gray-700">
              <CalendarDays size={18} className="text-blue-600" />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-gray-400 uppercase">
                  Thời gian
                </span>
                <span className="text-sm font-bold">
                  {nights} đêm ({checkIn} — {checkOut})
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 text-gray-700">
            <Users size={18} className="text-blue-600" />
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-gray-400 uppercase">
                Số khách & Phòng
              </span>
              <span className="text-sm font-bold">
                {guests} người lớn · {roomName}
              </span>
            </div>
          </div>
        </div>

        {/* MÃ GIẢM GIÁ */}
        <div className="space-y-3">
          <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
            <Ticket size={16} className="text-orange-500" />
            Mã giảm giá
          </label>
          <div className="flex gap-2">
            <Input
              placeholder="Nhập mã..."
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
              className="h-10 text-xs"
              disabled={isApplied}
            />
            <Button
              variant={isApplied ? "outline" : "primary"}
              className="h-10 px-4 text-xs shrink-0"
              onClick={handleApplyPromo}
              disabled={!promoCode || isApplied}
            >
              {isApplied ? "Đã dùng" : "Áp dụng"}
            </Button>
          </div>
          {isApplied && (
            <Badge
              variant="success"
              className="w-full justify-center py-1.5 animate-in zoom-in"
            >
              Tiết kiệm được {formatPrice(discount)}
            </Badge>
          )}
        </div>

        {/* TỔNG KẾT GIÁ */}
        <div className="space-y-3 pt-2">
          <div className="flex justify-between text-sm text-gray-600 font-medium">
            <span>Giá phòng ({nights} đêm)</span>
            <span>{formatPrice(subTotal)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600 font-medium">
            <span>Thuế & phí dịch vụ (10%)</span>
            <span>{formatPrice(taxAmount)}</span>
          </div>
          {isApplied && (
            <div className="flex justify-between text-sm text-emerald-600 font-bold">
              <span>Giảm giá</span>
              <span>-{formatPrice(discount)}</span>
            </div>
          )}

          <div className="pt-4 mt-4 border-t border-gray-100">
            <div className="flex justify-between items-end">
              <span className="text-base font-bold text-gray-900">
                Tổng tiền
              </span>
              <div className="text-right">
                <p className="text-2xl font-black text-[#003580]">
                  {formatPrice(finalTotal)}
                </p>
                <p className="text-[10px] text-gray-400 font-medium mt-1">
                  Đã bao gồm VAT & phí
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* THÔNG TIN BẢO MẬT */}
        <div className="bg-emerald-50 p-4 rounded-xl flex items-start gap-3 border border-emerald-100">
          <ShieldCheck className="text-emerald-600 shrink-0" size={20} />
          <div>
            <p className="text-xs font-bold text-emerald-800">
              Thanh toán an toàn
            </p>
            <p className="text-[10px] text-emerald-600 leading-relaxed mt-0.5">
              Thông tin của bạn được mã hóa và bảo mật tuyệt đối theo tiêu chuẩn
              quốc tế.
            </p>
          </div>
        </div>
      </div>

      {/* FOOTER: Quy định hủy */}
      <div className="bg-gray-50 p-4 flex items-center gap-2 border-t border-gray-100">
        <Info size={14} className="text-gray-400" />
        <span className="text-[10px] text-gray-500 font-medium">
          Hủy miễn phí trước 24h khi nhận phòng.
        </span>
      </div>
    </div>
  );
};

export default BookingSummary;
