import React, { useState } from "react";
import {
  CreditCard,
  Building2,
  CheckCircle2,
  ShieldCheck,
  Smartphone,
  ChevronRight,
  Sparkles,
  QrCode,
} from "lucide-react";
import { cn } from "@/utils/cn";

const PaymentMethodSelector = ({
  onSelect,
  allowPayAtHotel = true, // Cho phép khách sạn quyết định có hỗ trợ trả sau hay không
  className = "",
}) => {
  const [selectedMethod, setSelectedMethod] = useState("transfer");

  const handleSelect = (id) => {
    setSelectedMethod(id);
    if (onSelect) onSelect(id);
  };

  const ONLINE_METHODS = [
    {
      id: "transfer",
      title: "Chuyển khoản VietQR 24/7 (Khuyên dùng)",
      description:
        "Quét mã QR tự động xác nhận trong 3 giây. Hỗ trợ tất cả ngân hàng.",
      icon: (
        <div className="w-10 h-10 bg-blue-50 text-[#006ce4] rounded-xl flex items-center justify-center font-bold">
          <QrCode size={22} />
        </div>
      ),
      badge: "Ưu đãi giá tốt nhất",
      badgeColor: "bg-blue-100 text-blue-700",
    },
    {
      id: "vnpay",
      title: "Cổng thanh toán VNPAY",
      description: "Hỗ trợ quét VNPAY-QR, thẻ ATM nội địa và Internet Banking",
      icon: (
        <div className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center font-black italic text-xs">
          VNPAY
        </div>
      ),
    },
    {
      id: "card",
      title: "Thẻ Quốc tế Visa / Mastercard / JCB",
      description: "Thanh toán an toàn với mã hóa bảo mật SSL 256-bit",
      icon: (
        <div className="w-10 h-10 bg-slate-50 text-slate-700 rounded-xl flex items-center justify-center">
          <CreditCard size={22} />
        </div>
      ),
    },
  ];

  return (
    <div className={cn("space-y-6", className)}>
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <h3 className="text-lg font-black text-slate-900">
          Chọn hình thức thanh toán
        </h3>
        <div className="flex items-center gap-1 text-emerald-600 font-bold text-xs">
          <ShieldCheck size={16} />
          Bảo mật 100%
        </div>
      </div>

      {/* ─── NHÓM 1: THANH TOÁN ONLINE (TRẢ TRƯỚC) ─── */}
      <div className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Thanh toán trực tuyến (Xác nhận giữ phòng ngay)
        </p>

        {ONLINE_METHODS.map((method) => {
          const isActive = selectedMethod === method.id;
          return (
            <div
              key={method.id}
              onClick={() => handleSelect(method.id)}
              className={cn(
                "group relative flex items-center gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer",
                isActive
                  ? "border-[#006ce4] bg-blue-50/40 shadow-sm ring-1 ring-blue-600/20"
                  : "border-slate-200 bg-white hover:border-slate-300",
              )}
            >
              <div className="shrink-0">{method.icon}</div>

              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-bold text-slate-900 text-sm">
                    {method.title}
                  </h4>
                  {method.badge && (
                    <span
                      className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase",
                        method.badgeColor,
                      )}
                    >
                      {method.badge}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {method.description}
                </p>
              </div>

              <div
                className={cn(
                  "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                  isActive
                    ? "border-[#006ce4] bg-[#006ce4]"
                    : "border-slate-300",
                )}
              >
                {isActive && <div className="w-2 h-2 bg-white rounded-full" />}
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── NHÓM 2: THANH TOÁN TẠI KHÁCH SẠN (TRẢ SAU) ─── */}
      {allowPayAtHotel && (
        <div className="space-y-3 pt-2">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Thanh toán tại chỗ nghỉ (Trả sau)
          </p>

          <div
            onClick={() => handleSelect("at_hotel")}
            className={cn(
              "group relative flex items-center gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer",
              selectedMethod === "at_hotel"
                ? "border-emerald-600 bg-emerald-50/40 shadow-sm ring-1 ring-emerald-600/20"
                : "border-slate-200 bg-white hover:border-slate-300",
            )}
          >
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-bold">
              <Building2 size={22} />
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-slate-900 text-sm">
                  Thanh toán tại khách sạn khi nhận phòng
                </h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-emerald-100 text-emerald-800">
                  Linh hoạt
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Bạn không cần trả trước. Thanh toán bằng tiền mặt hoặc thẻ tại
                quầy lễ tân khi check-in.
              </p>
            </div>

            <div
              className={cn(
                "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                selectedMethod === "at_hotel"
                  ? "border-emerald-600 bg-emerald-600"
                  : "border-slate-300",
              )}
            >
              {selectedMethod === "at_hotel" && (
                <div className="w-2 h-2 bg-white rounded-full" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentMethodSelector;
