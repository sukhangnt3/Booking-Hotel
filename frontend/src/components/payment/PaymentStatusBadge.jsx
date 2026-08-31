import React from "react";
import {
  CheckCircle2,
  Clock,
  XCircle,
  RotateCcw,
  AlertCircle,
  CreditCard,
  Building2,
} from "lucide-react";
import { cn } from "@/utils/cn";

const STATUS_CONFIG = {
  unpaid: {
    label: "Chờ thanh toán",
    color: "bg-amber-50 text-amber-700 border-amber-200",
    icon: <Clock size={13} />,
  },
  at_hotel: {
    label: "Thanh toán khi nhận phòng",
    color: "bg-blue-50 text-blue-700 border-blue-200",
    icon: <Building2 size={13} />,
  },
  paid: {
    label: "Đã thanh toán",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: <CheckCircle2 size={13} />,
  },
  cancelled: {
    label: "Đã hủy đơn",
    color: "bg-slate-100 text-slate-600 border-slate-200",
    icon: <XCircle size={13} />,
  },
  refunded: {
    label: "Đã hoàn tiền",
    color: "bg-purple-50 text-purple-700 border-purple-200",
    icon: <RotateCcw size={13} />,
  },
};

const PaymentStatusBadge = ({ status = "unpaid", className = "" }) => {
  const normalizedStatus = String(status || "unpaid").toLowerCase();
  const config = STATUS_CONFIG[normalizedStatus] || STATUS_CONFIG.unpaid;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border shadow-sm select-none",
        config.color,
        className,
      )}
    >
      <span className="shrink-0">{config.icon}</span>
      {config.label}
    </span>
  );
};

export default PaymentStatusBadge;
