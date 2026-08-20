import React, { useState } from "react";
import {
  CreditCard,
  Wallet,
  Building2,
  CheckCircle2,
  ShieldCheck,
  Smartphone,
  ChevronRight,
} from "lucide-react";
import { Badge } from "../ui";
import { cn } from "@/utils/cn";

const METHODS = [
  {
    id: "vnpay",
    title: "Thanh toán qua VNPay",
    description: "Cổng thanh toán hỗ trợ tất cả ngân hàng Việt Nam & Mã QR",
    icon: (
      <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 font-black italic">
        VNP
      </div>
    ),
    recommended: true,
  },
  {
    id: "momo",
    title: "Ví điện tử MoMo",
    description: "Thanh toán nhanh chóng qua ứng dụng MoMo trên điện thoại",
    icon: (
      <div className="w-10 h-10 bg-pink-50 rounded-lg flex items-center justify-center text-pink-600 font-black italic">
        Mo
      </div>
    ),
  },
  {
    id: "card",
    title: "Thẻ Quốc tế Visa / Mastercard",
    description: "Hỗ trợ thẻ tín dụng và thẻ ghi nợ quốc tế",
    icon: <CreditCard className="text-gray-600" size={32} strokeWidth={1.5} />,
  },
  {
    id: "transfer",
    title: "Chuyển khoản ngân hàng",
    description: "Nhận thông tin tài khoản và thực hiện chuyển khoản 24/7",
    icon: <Building2 className="text-gray-600" size={32} strokeWidth={1.5} />,
  },
  {
    id: "at_hotel",
    title: "Thanh toán tại chỗ nghỉ",
    description: "Bạn sẽ trả tiền trực tiếp khi nhận phòng tại khách sạn",
    icon: (
      <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
        <CheckCircle2 size={24} />
      </div>
    ),
  },
];

const PaymentMethodSelector = ({ onSelect, className = "" }) => {
  const [selectedMethod, setSelectedMethod] = useState("vnpay");

  const handleSelect = (id) => {
    setSelectedMethod(id);
    if (onSelect) onSelect(id);
  };

  return (
    <div className={cn("space-y-6", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-gray-900">
          Chọn phương thức thanh toán
        </h3>
        <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-xs uppercase tracking-wider">
          <ShieldCheck size={16} />
          Bảo mật 100%
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {METHODS.map((method) => {
          const isActive = selectedMethod === method.id;

          return (
            <div
              key={method.id}
              onClick={() => handleSelect(method.id)}
              className={cn(
                "group relative flex items-center gap-4 p-5 rounded-2xl border-2 transition-all cursor-pointer",
                isActive
                  ? "border-[#006ce4] bg-blue-50/50 shadow-md ring-1 ring-blue-600/20"
                  : "border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm",
              )}
            >
              {/* Icon Phương thức */}
              <div className="shrink-0 transition-transform group-hover:scale-110">
                {method.icon}
              </div>

              {/* Thông tin chữ */}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-gray-900 text-sm sm:text-base">
                    {method.title}
                  </h4>
                  {method.recommended && (
                    <Badge
                      variant="primary"
                      size="sm"
                      className="text-[9px] px-1.5 py-0 uppercase"
                    >
                      Khuyên dùng
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  {method.description}
                </p>
              </div>

              {/* Radio Button Giả định */}
              <div
                className={cn(
                  "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                  isActive
                    ? "border-[#006ce4] bg-[#006ce4]"
                    : "border-gray-300",
                )}
              >
                {isActive && (
                  <div className="w-2.5 h-2.5 bg-white rounded-full animate-in zoom-in" />
                )}
              </div>

              {/* Mũi tên (Chỉ hiện khi không chọn) */}
              {!isActive && (
                <ChevronRight
                  className="text-gray-300 group-hover:translate-x-1 transition-transform"
                  size={20}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* FOOTER BẢO MẬT */}
      <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-start gap-3">
        <Smartphone className="text-gray-400 mt-0.5 shrink-0" size={18} />
        <p className="text-[11px] text-gray-500 leading-relaxed font-medium">
          Mọi giao dịch thanh toán đều được thực hiện thông qua kết nối mã hóa
          SSL. GoStay không lưu trữ thông tin thẻ của bạn. Bằng cách chọn thanh
          toán, bạn đồng ý với{" "}
          <span className="text-blue-600 underline">Điều khoản dịch vụ</span>.
        </p>
      </div>
    </div>
  );
};

export default PaymentMethodSelector;
