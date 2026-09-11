// src/components/auth/RegisterForm/Step4PricingAndPayout.jsx
import React, { useState } from "react";
import {
  Lightbulb,
  CheckCircle2,
  AlertCircle,
  Banknote,
  QrCode,
  Sparkles,
} from "lucide-react";

export const VIETNAM_BANKS = [
  {
    code: "VCB",
    name: "Vietcombank",
    fullName: "Ngân hàng Ngoại thương Việt Nam",
  },
  { code: "MB", name: "MB Bank", fullName: "Ngân hàng Quân đội" },
  {
    code: "TCB",
    name: "Techcombank",
    fullName: "Ngân hàng Kỹ thương Việt Nam",
  },
  {
    code: "CTG",
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
  const [enableFirstBookingDiscount, setEnableFirstBookingDiscount] = useState(
    data?.enableFirstBookingDiscount ?? true,
  );

  const [payoutMethod, setPayoutMethod] = useState(
    data?.payoutMethod || "bank_transfer",
  );

  const [isVerifyingBank, setIsVerifyingBank] = useState(false);
  const [bankVerifyResult, setBankVerifyResult] = useState(null);

  const handleTogglePromo = () => {
    const nextVal = !enableFirstBookingDiscount;
    setEnableFirstBookingDiscount(nextVal);
    onChange({
      enableFirstBookingDiscount: nextVal,
      initialPromoPercent: nextVal ? 20 : 0,
    });
  };

  const handleMethodChange = (method) => {
    setPayoutMethod(method);
    onChange({ payoutMethod: method });
  };

  const handleVerifyBank = async () => {
    if (!data?.bankAccount || !data?.bankAccountHolder) {
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
        message: `✓ Khớp dữ liệu Napas: Chủ TK [${data.bankAccountHolder}] sẵn sàng nhận doanh thu.`,
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
          <Sparkles size={14} className="text-[#006ce4]" /> Bước 4 / 8: Quyết
          toán doanh thu & Khuyến mại
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Phương thức nhận tiền doanh thu
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          GoStay sẽ tự động đối soát và chuyển doanh thu đặt phòng vào tài khoản
          thụ hưởng theo chu kỳ hàng tuần.
        </p>
      </div>

      {/* CHƯƠNG TRÌNH KHỞI ĐỘNG */}
      <div className="p-4 sm:p-5 rounded-2xl border border-blue-200 bg-[#e8f2ff]/60 flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-black text-[#003580]">
              Khuyến mại khởi động (Giảm 20% cho 3 đơn đầu)
            </h3>
            <span className="text-[10px] font-black uppercase bg-[#006ce4] text-white px-2 py-0.5 rounded-full">
              Khuyên dùng
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
            Giúp cơ sở của bạn có ngay những đánh giá đầu tiên từ khách hàng,
            tăng 1.7 lần lượt đặt phòng trong tháng đầu.
          </p>
        </div>

        <button
          type="button"
          onClick={handleTogglePromo}
          className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 shrink-0 ${
            enableFirstBookingDiscount ? "bg-[#006ce4]" : "bg-slate-300"
          }`}
        >
          <div
            className={`bg-white w-4 h-4 rounded-full shadow transform transition-transform duration-300 ${
              enableFirstBookingDiscount ? "translate-x-6" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {/* CÁC PHƯƠNG THỨC NHẬN TIỀN */}
      <div className="space-y-3">
        <div
          onClick={() => handleMethodChange("bank_transfer")}
          className={`p-4 rounded-2xl border-2 transition cursor-pointer ${
            payoutMethod === "bank_transfer"
              ? "border-[#006ce4] bg-[#e8f2ff]/30 shadow-sm"
              : "border-slate-200 bg-white hover:border-slate-300"
          }`}
        >
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="payoutMethod"
              checked={payoutMethod === "bank_transfer"}
              onChange={() => handleMethodChange("bank_transfer")}
              className="w-4 h-4 accent-[#006ce4] cursor-pointer"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-900">
                  Chuyển khoản ngân hàng trực tiếp (Napas 24/7 / VietQR)
                </span>
                <span className="text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
                  Tự động & Phổ biến nhất
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Tiền thanh toán của khách sẽ được giải ngân thẳng vào số tài
                khoản ngân hàng của bạn.
              </p>
            </div>
          </label>

          {payoutMethod === "bank_transfer" && (
            <div className="mt-4 pt-4 border-t border-slate-200 space-y-3 animate-fadeIn">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Ngân hàng thụ hưởng *
                  </label>
                  <select
                    value={data?.bankName || "Vietcombank"}
                    onChange={(e) => onChange({ bankName: e.target.value })}
                    className="w-full h-11 px-3 text-xs font-bold rounded-xl border border-slate-300 bg-white outline-none cursor-pointer focus:border-[#006ce4]"
                  >
                    {VIETNAM_BANKS.map((b) => (
                      <option key={b.code} value={b.name}>
                        {b.name} - {b.fullName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Số tài khoản ngân hàng *
                  </label>
                  <input
                    type="text"
                    value={data?.bankAccount || ""}
                    onChange={(e) => {
                      onChange({ bankAccount: e.target.value });
                      setBankVerifyResult(null);
                    }}
                    placeholder="VD: 0071001234567"
                    className={`w-full h-11 px-3 text-xs font-mono font-bold rounded-xl border ${
                      errors?.bankAccount
                        ? "border-rose-500 bg-rose-50/20"
                        : "border-slate-300 focus:border-[#006ce4]"
                    } bg-white outline-none`}
                  />
                  {errors?.bankAccount && (
                    <p className="text-xs text-rose-500 font-bold mt-1">
                      {errors.bankAccount}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Tên chủ tài khoản (In hoa không dấu) *
                </label>
                <input
                  type="text"
                  value={data?.bankAccountHolder || ""}
                  onChange={(e) => {
                    onChange({
                      bankAccountHolder: e.target.value.toUpperCase(),
                    });
                    setBankVerifyResult(null);
                  }}
                  placeholder="VD: NGUYEN VAN AN"
                  className={`w-full h-11 px-3 text-xs font-bold uppercase rounded-xl border ${
                    errors?.bankAccountHolder
                      ? "border-rose-500 bg-rose-50/20"
                      : "border-slate-300 focus:border-[#006ce4]"
                  } bg-white outline-none`}
                />
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleVerifyBank}
                  disabled={isVerifyingBank}
                  className="w-full sm:w-auto px-4 h-10 bg-[#003580] hover:bg-blue-900 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition disabled:opacity-50"
                >
                  <QrCode size={14} />
                  {isVerifyingBank
                    ? "Đang xác thực..."
                    : "Kiểm tra VietQR / Napas"}
                </button>

                {bankVerifyResult && (
                  <div
                    className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 flex-1 w-full ${
                      bankVerifyResult.success
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : "bg-rose-50 text-rose-800 border border-rose-200"
                    }`}
                  >
                    {bankVerifyResult.success ? (
                      <CheckCircle2
                        size={15}
                        className="text-emerald-600 shrink-0"
                      />
                    ) : (
                      <AlertCircle
                        size={15}
                        className="text-rose-600 shrink-0"
                      />
                    )}
                    <span className="truncate">{bankVerifyResult.message}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div
          onClick={() => handleMethodChange("pay_at_hotel")}
          className={`p-4 rounded-2xl border-2 transition cursor-pointer ${
            payoutMethod === "pay_at_hotel"
              ? "border-[#006ce4] bg-[#e8f2ff]/30 shadow-sm"
              : "border-slate-200 bg-white hover:border-slate-300"
          }`}
        >
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="payoutMethod"
              checked={payoutMethod === "pay_at_hotel"}
              onChange={() => handleMethodChange("pay_at_hotel")}
              className="w-4 h-4 accent-[#006ce4] cursor-pointer"
            />
            <div>
              <div className="flex items-center gap-2">
                <Banknote size={16} className="text-amber-600" />
                <span className="text-xs font-black text-slate-900">
                  Khách thanh toán trực tiếp tại khách sạn (Tiền mặt / Quẹt thẻ
                  quầy)
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Khách thanh toán khi check-in. Đối tác sẽ nộp phí hoa hồng định
                kỳ vào cuối tháng.
              </p>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
};

export default Step4PricingAndPayout;
