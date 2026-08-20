import React from "react";
import {
  CheckCircle2,
  Clock,
  XCircle,
  RotateCcw,
  AlertCircle,
  CreditCard,
} from "lucide-react";
import { cn } from "@/utils/cn";

// 1. Cấu hình trạng thái: Màu sắc, Icon và Nhãn hiển thị
const STATUS_CONFIG = {
  unpaid: {
    label: "Chưa thanh toán",
    color: "bg-amber-50 text-amber-700 border-amber-200",
    icon: <Clock size={14} />,
  },
  pending: {
    label: "Đang xử lý",
    color: "bg-blue-50 text-blue-700 border-blue-200",
    icon: <CreditCard size={14} />,
  },
  paid: {
    label: "Đã thanh toán",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: <CheckCircle2 size={14} />,
  },
  partially_paid: {
    label: "Thanh toán một phần",
    color: "bg-indigo-50 text-indigo-700 border-indigo-200",
    icon: <AlertCircle size={14} />,
  },
  refunded: {
    label: "Đã hoàn tiền",
    color: "bg-purple-50 text-purple-700 border-purple-200",
    icon: <RotateCcw size={14} />,
  },
  failed: {
    label: "Thanh toán lỗi",
    color: "bg-rose-50 text-rose-700 border-rose-200",
    icon: <XCircle size={14} />,
  },
  cancelled: {
    label: "Đã hủy",
    color: "bg-gray-100 text-gray-600 border-gray-200",
    icon: <XCircle size={14} />,
  },
};

const PaymentStatusBadge = ({ status = "unpaid", className = "" }) => {
  // Chuẩn hóa status về chữ thường để tránh lỗi lệch data
  const normalizedStatus = status.toLowerCase();
  const config = STATUS_CONFIG[normalizedStatus] || STATUS_CONFIG.unpaid;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border transition-all duration-300 shadow-sm",
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
