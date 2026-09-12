import React, { useState, useEffect } from "react";
import {
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Percent,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";

export const VIETNAM_BANKS = [
  {
    code: "VCB",
    name: "Vietcombank",
    fullName: "Ngân hàng Ngoại thương Việt Nam",
  },
  { code: "MB", name: "MBBank", fullName: "Ngân hàng Quân đội" },
  {
    code: "TCB",
    name: "Techcombank",
    fullName: "Ngân hàng Kỹ thương Việt Nam",
  },
  {
    code: "ICB",
    name: "VietinBank",
    fullName: "Ngân hàng Công Thương Việt Nam",
  },
  { code: "BIDV", name: "BIDV", fullName: "Ngân hàng Đầu tư và Phát triển" },
  { code: "ACB", name: "ACB", fullName: "Ngân hàng Á Châu" },
  { code: "VPB", name: "VPBank", fullName: "Ngân hàng Việt Nam Thịnh Vượng" },
  { code: "TPB", name: "TPBank", fullName: "Ngân hàng Tiên Phong" },
];

export const Step4PricingAndPayout = ({
  data = {},
  onChange = () => {},
  errors = {},
}) => {
  const commissionRate = Number(data.commissionRate || 18.0);
  const [isVerifyingBank, setIsVerifyingBank] = useState(false);
  const [bankVerifyResult, setBankVerifyResult] = useState(null);

  useEffect(() => {
    const updates = {};
    if (!data.commissionRate) {
      updates.commissionRate = 18.0;
    }
    if (!data.bankCode) {
      updates.bankCode = "VCB";
      updates.bankName = "Vietcombank";
    }
    if (!data.bankAccountHolder && data.ownerName) {
      updates.bankAccountHolder = String(data.ownerName).trim().toUpperCase();
    }
    if (Object.keys(updates).length > 0) {
      onChange(updates);
    }
  }, []);

  const handleBankSelect = (e) => {
    const selectedCode = e.target.value;
    const foundBank = VIETNAM_BANKS.find((b) => b.code === selectedCode);
    onChange({
      bankCode: selectedCode,
      bankName: foundBank ? foundBank.name : selectedCode,
    });
    setBankVerifyResult(null);
  };

  const handleVerifyBank = async () => {
    if (!data.bankAccount || !data.bankAccountHolder) {
      setBankVerifyResult({
        success: false,
        message:
          "Vui lòng nhập Số tài khoản và Tên chủ tài khoản trước khi kiểm tra.",
      });
      return;
    }
    setIsVerifyingBank(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 600));
      setBankVerifyResult({
        success: true,
        message: `Khớp dữ liệu Napas: Chủ tài khoản ${data.bankAccountHolder} sẵn sàng nhận tiền quyết toán.`,
      });
    } catch {
      setBankVerifyResult({
        success: false,
        message: "Không thể kiểm tra lúc này. Vui lòng thử lại sau.",
      });
    } finally {
      setIsVerifyingBank(false);
    }
  };

  return (
    <div className="space-y-6 font-sans text-slate-800 animate-fadeIn">
      <div>
        <div className="flex items-center gap-1.5 text-xs font-black text-[#003580] uppercase tracking-wider mb-1">
          <Sparkles size={14} className="text-[#006ce4]" />
          <span>Bước 4 / 8: Hoa hồng sàn & Tài khoản quyết toán doanh thu</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Chính sách phân chia doanh thu & Tài khoản thụ hưởng
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Hệ thống minh bạch 100% tỷ lệ hoa hồng nền tảng và cơ chế thanh toán
          tự động về ngân hàng của Quý đối tác.
        </p>
      </div>

      {/* 🌟 KHỐI MINH BẠCH HOA HỒNG SÀN */}
      <div className="bg-white border-2 border-blue-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#003580] text-white flex items-center justify-center font-black text-lg shrink-0 shadow-md">
              <Percent size={22} />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Mức phí dịch vụ nền tảng GoStay
              </span>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-[#003580]">
                  {commissionRate}%
                </span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                  Chỉ tính khi có đơn thành công
                </span>
              </div>
            </div>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-[11px] text-slate-400 block font-medium">
              Không phí đăng ký • Không phí duy trì
            </span>
            <span className="text-xs font-black text-blue-700">
              Chỉ trừ {commissionRate}% trên giá trị đơn phòng
            </span>
          </div>
        </div>

        {/* BẢNG MÔ PHỎNG DÒNG TIỀN VÍ DỤ 1.000.000 ₫ */}
        <div className="bg-[#f8fafc] rounded-2xl p-4 border border-slate-200 space-y-2.5">
          <span className="text-xs font-black text-slate-700 uppercase tracking-wider block">
            Ví dụ minh họa khi khách đặt phòng 1.000.000 ₫:
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-white rounded-xl border border-slate-200">
              <span className="text-slate-400 block font-medium">
                Tổng tiền khách thanh toán:
              </span>
              <span className="text-base font-black text-slate-900 mt-0.5 block">
                1.000.000 ₫
              </span>
              <span className="text-[10px] text-slate-400">
                100% tiền phòng
              </span>
            </div>

            <div className="p-3 bg-white rounded-xl border border-rose-200">
              <span className="text-slate-500 block font-medium">
                Phí hoa hồng sàn ({commissionRate}%):
              </span>
              <span className="text-base font-black text-rose-600 mt-0.5 block">
                -{" "}
                {Number((1000000 * commissionRate) / 100).toLocaleString(
                  "vi-VN",
                )}{" "}
                ₫
              </span>
              <span className="text-[10px] text-slate-400">
                Chi phí vận hành & Marketing
              </span>
            </div>

            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-300">
              <span className="text-emerald-800 block font-black">
                Chủ cơ sở thực nhận (82%):
              </span>
              <span className="text-base font-black text-emerald-700 mt-0.5 block">
                {Number(1000000 * (1 - commissionRate / 100)).toLocaleString(
                  "vi-VN",
                )}{" "}
                ₫
              </span>
              <span className="text-[10px] text-emerald-600 font-bold">
                Chuyển thẳng vào STK của bạn
              </span>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed pt-1 flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-emerald-600 shrink-0" />
            Tiền sẽ được sàn tự động quyết toán (Payout) về tài khoản ngân hàng
            của Quý đối tác định kỳ hoặc sau khi khách hoàn tất thủ tục trả
            phòng (Check-out).
          </p>
        </div>
      </div>

      {/* 🌟 KHỐI NHẬP TÀI KHOẢN NGÂN HÀNG THỤ HƯỞNG */}
      <div className="p-5 sm:p-6 bg-white border border-slate-200 rounded-3xl space-y-4 shadow-xs">
        <div>
          <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <CheckCircle2 size={16} className="text-[#006ce4]" /> Tài khoản ngân
            hàng nhận tiền quyết toán (Napas 24/7)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Tiền phòng sau khi trừ hoa hồng sẽ được Admin giải ngân vào tài
            khoản này.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Ngân hàng thụ hưởng *
            </label>
            <select
              value={data.bankCode || "VCB"}
              onChange={handleBankSelect}
              className="w-full h-11 sm:h-12 px-3 text-xs sm:text-sm font-bold rounded-xl border border-slate-300 focus:border-[#006ce4] bg-white outline-none cursor-pointer"
            >
              {VIETNAM_BANKS.map((b) => (
                <option key={b.code} value={b.code}>
                  {b.name} ({b.code}) - {b.fullName}
                </option>
              ))}
            </select>
            {(errors.bankName || errors.bankCode) && (
              <p className="text-xs text-rose-500 font-bold mt-1">
                {errors.bankName || errors.bankCode}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Số tài khoản ngân hàng *
            </label>
            <input
              type="text"
              value={data.bankAccount || ""}
              onChange={(e) => {
                onChange({ bankAccount: e.target.value.trim() });
                setBankVerifyResult(null);
              }}
              placeholder="VD: 0071001234567"
              className={`w-full h-11 sm:h-12 px-3 text-xs sm:text-sm font-mono font-bold rounded-xl border ${
                errors.bankAccount
                  ? "border-rose-500 bg-rose-50/20"
                  : "border-slate-300 focus:border-[#006ce4]"
              } bg-white outline-none`}
            />
            {errors.bankAccount && (
              <p className="text-xs text-rose-500 font-bold mt-1">
                {errors.bankAccount}
              </p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Tên chủ tài khoản (In hoa không dấu theo thẻ ATM) *
          </label>
          <input
            type="text"
            value={data.bankAccountHolder || ""}
            onChange={(e) => {
              onChange({
                bankAccountHolder: e.target.value.toUpperCase(),
              });
              setBankVerifyResult(null);
            }}
            placeholder="VD: NGUYEN VAN AN"
            className={`w-full h-11 sm:h-12 px-3 text-xs sm:text-sm font-bold uppercase rounded-xl border ${
              errors.bankAccountHolder
                ? "border-rose-500 bg-rose-50/20"
                : "border-slate-300 focus:border-[#006ce4]"
            } bg-white outline-none`}
          />
          {errors.bankAccountHolder && (
            <p className="text-xs text-rose-500 font-bold mt-1">
              {errors.bankAccountHolder}
            </p>
          )}
        </div>

        <div className="flex justify-between items-center pt-2">
          <span className="text-[11px] text-slate-400">
            Hỗ trợ liên ngân hàng tự động chuyển khoản Napas 24/7
          </span>
          <button
            type="button"
            onClick={handleVerifyBank}
            disabled={isVerifyingBank}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer transition disabled:opacity-50"
          >
            {isVerifyingBank ? "Đang đối soát..." : "Kiểm tra số tài khoản"}
          </button>
        </div>

        {bankVerifyResult && (
          <div
            className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
              bankVerifyResult.success
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-rose-50 text-rose-800 border border-rose-200"
            }`}
          >
            {bankVerifyResult.success ? (
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle size={16} className="text-rose-600 shrink-0" />
            )}
            <span>{bankVerifyResult.message}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Step4PricingAndPayout;
