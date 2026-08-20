import React, { useState } from "react";
import { Ticket, X, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button, Input } from "../ui";
import { cn } from "@/utils/cn";

const PromotionCodeInput = ({
  onApply, // Callback khi nhấn áp dụng (code) => Promise
  onRemove, // Callback khi nhấn gỡ bỏ mã
  isLoading = false,
  error = "", // Thông báo lỗi từ API truyền vào
  className = "",
}) => {
  const [code, setCode] = useState("");
  const [appliedCode, setAppliedCode] = useState(null); // Lưu mã đã áp dụng thành công

  const handleApply = async () => {
    if (!code.trim()) return;

    // Gọi callback và đợi kết quả
    const success = await onApply(code.trim().toUpperCase());
    if (success) {
      setAppliedCode(code.trim().toUpperCase());
    }
  };

  const handleRemove = () => {
    setAppliedCode(null);
    setCode("");
    if (onRemove) onRemove();
  };

  return (
    <div className={cn("space-y-3", className)}>
      <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
        <Ticket size={18} className="text-blue-600" />
        Mã giảm giá / Ưu đãi
      </label>

      {!appliedCode ? (
        /* CHẾ ĐỘ NHẬP MÃ */
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Ví dụ: GOSTAY100"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                disabled={isLoading}
                className={cn(
                  "w-full h-11 pl-4 pr-4 bg-white border rounded-xl text-sm font-bold tracking-widest outline-none transition-all",
                  error
                    ? "border-red-500 focus:ring-4 focus:ring-red-100"
                    : "border-gray-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100",
                )}
              />
            </div>
            <Button
              onClick={handleApply}
              disabled={!code.trim() || isLoading}
              className="h-11 px-6 rounded-xl font-bold shadow-md shrink-0"
            >
              {isLoading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                "Áp dụng"
              )}
            </Button>
          </div>

          {/* HIỂN THỊ LỖI */}
          {error && (
            <div className="flex items-center gap-1.5 text-red-600 text-xs font-bold px-1 animate-in slide-in-from-top-1">
              <AlertCircle size={14} />
              {error}
            </div>
          )}
        </div>
      ) : (
        /* CHẾ ĐỘ ĐÃ ÁP DỤNG THÀNH CÔNG */
        <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-xl animate-in zoom-in duration-300">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500 text-white p-1.5 rounded-full shadow-sm">
              <CheckCircle2 size={16} />
            </div>
            <div>
              <p className="text-[10px] text-emerald-600 font-bold uppercase leading-none">
                Mã đã áp dụng
              </p>
              <p className="text-sm font-black text-emerald-800 tracking-wider">
                {appliedCode}
              </p>
            </div>
          </div>
          <button
            onClick={handleRemove}
            className="p-2 text-emerald-400 hover:text-red-500 transition-colors"
            title="Gỡ bỏ mã"
          >
            <X size={20} />
          </button>
        </div>
      )}

      {/* GỢI Ý MÃ (Tùy chọn) */}
      {!appliedCode && !isLoading && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
          {["GOSTAY2024", "WELCOME50"].map((hint) => (
            <button
              key={hint}
              onClick={() => setCode(hint)}
              className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md border border-blue-100 whitespace-nowrap hover:bg-blue-100 transition-colors"
            >
              #{hint}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default PromotionCodeInput;
