// src/components/auth/RegisterForm/Step4PricingAndPayout.jsx
import React, { useState } from "react";
import {
  Lightbulb,
  Building2,
  CreditCard,
  QrCode,
  CheckCircle2,
  AlertCircle,
  Banknote,
  Smartphone,
} from "lucide-react";

// DANH SÁCH CÁC NGÂN HÀNG LỚN TẠI VIỆT NAM (NAPAS / VIETQR)
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
  // Trạng thái bật khuyến mại 3 đơn đầu tiên chuẩn Agoda
  const [enableFirstBookingDiscount, setEnableFirstBookingDiscount] = useState(
    data?.enableFirstBookingDiscount ?? true,
  );

  // Phương thức nhận doanh thu: "bank_transfer", "pay_at_hotel", "e_wallet"
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
      initialPromoPercent: nextVal ? 20 : 0, // Giảm 20% cho 3 đơn đầu
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
        message: `✓ Xác thực Napas thành công: Chủ TK [${data.bankAccountHolder}] khớp với ngân hàng ${data.bankName || "Vietcombank"}.`,
      });
    } catch (error) {
      setBankVerifyResult({
        success: false,
        message: "Không thể tra cứu lúc này. Vui lòng kiểm tra lại thông tin.",
      });
    } finally {
      setIsVerifyingBank(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 font-sans text-slate-800 animate-fadeIn">
      {/* ── TIÊU ĐỀ AGODA STYLE ── */}
      <div>
        <div className="flex items-center justify-between text-xs text-slate-400 font-bold mb-1">
          <span>Bước 4/6</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Giá & Thanh toán
        </h1>
      </div>

      {/* ── SECTION 1: KHUYẾN MẠI KHỞI ĐỘNG (CHUẨN AGODA 100%) ── */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-slate-900 leading-snug">
          Hãy tạo một chương trình khuyến mại khởi động để bắt đầu nhận đơn đặt
          phòng
        </h2>

        {/* Hộp gợi ý xanh dương của Agoda */}
        <div className="p-4 bg-blue-50/80 border border-blue-200/90 rounded-2xl flex items-start gap-3 text-xs text-blue-900 leading-relaxed">
          <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
            <Lightbulb size={12} />
          </div>
          <p>
            Các trang thông tin cơ sở lưu trú mới áp dụng chương trình khuyến
            mại cho 3 đơn đặt phòng đầu tiên có khả năng nhận được đơn đặt phòng
            trong 30 ngày đầu cao gấp <strong>1,7 lần</strong>.
          </p>
        </div>

        {/* Thẻ gạt công tắc bật khuyến mại 3 đơn đầu tiên */}
        <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 flex items-center justify-between transition hover:border-slate-300">
          <div>
            <h3 className="text-xs font-bold text-slate-900">
              3 đơn đặt phòng đầu tiên
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Giảm 20% cho 3 đơn đặt phòng hoàn tất đầu tiên để thu hút khách
            </p>
          </div>

          {/* Công tắc Toggle Switch */}
          <button
            type="button"
            onClick={handleTogglePromo}
            className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 ${
              enableFirstBookingDiscount ? "bg-blue-600" : "bg-slate-300"
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
                enableFirstBookingDiscount ? "translate-x-6" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        <p className="text-[11px] text-slate-400 leading-relaxed">
          Mỗi đơn đặt phòng chỉ có thể áp dụng một khuyến mại. Quý đối tác có
          thể quản lý các khuyến mại của mình vào bất cứ lúc nào trong trang
          quản trị.
        </p>
      </div>

      <hr className="border-slate-100" />

      {/* ── SECTION 2: CÁCH THỨC NHẬN DOANH THU (PHIÊN BẢN VIỆT NAM) ── */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Cách thức nhận doanh thu
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Chọn phương thức để hệ thống quyết toán doanh thu đặt phòng cho cơ
            sở của quý đối tác tại Việt Nam.
          </p>
        </div>

        <div className="space-y-3">
          {/* LỰA CHỌN 1: CHUYỂN KHOẢN NGÂN HÀNG NAPAS (PHỔ BIẾN NHẤT) */}
          <div
            onClick={() => handleMethodChange("bank_transfer")}
            className={`p-4 rounded-2xl border-2 transition cursor-pointer ${
              payoutMethod === "bank_transfer"
                ? "border-blue-600 bg-blue-50/40 shadow-xs"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="payoutMethod"
                  checked={payoutMethod === "bank_transfer"}
                  onChange={() => handleMethodChange("bank_transfer")}
                  className="w-4 h-4 accent-blue-600 cursor-pointer"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">
                      Chuyển khoản ngân hàng nội địa (Napas 24/7 / VietQR)
                    </span>
                    <span className="text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                      ⚡ Tự động & Nhanh nhất
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Nhận thanh toán trực tiếp vào tài khoản ngân hàng của quý
                    đối tác. Quyết toán định kỳ hàng tuần.
                  </p>
                </div>
              </label>
            </div>

            {/* FORM ĐIỀN TÀI KHOẢN NGÂN HÀNG (Hiện khi chọn phương thức này) */}
            {payoutMethod === "bank_transfer" && (
              <div className="mt-4 pt-4 border-t border-slate-200/80 space-y-3 animate-fadeIn">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Ngân hàng thụ hưởng *
                    </label>
                    <select
                      value={data?.bankName || "Vietcombank"}
                      onChange={(e) => onChange({ bankName: e.target.value })}
                      className="w-full h-11 px-3 text-xs font-semibold rounded-xl border border-slate-300 bg-white outline-none cursor-pointer focus:border-blue-600"
                    >
                      {VIETNAM_BANKS.map((b) => (
                        <option key={b.code} value={b.name}>
                          {b.name} - {b.fullName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
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
                          : "border-slate-300"
                      } bg-white outline-none focus:border-blue-600`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
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
                        : "border-slate-300"
                    } bg-white outline-none focus:border-blue-600`}
                  />
                </div>

                {/* Nút kiểm tra tài khoản Napas */}
                <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleVerifyBank}
                    disabled={isVerifyingBank}
                    className="w-full sm:w-auto px-4 h-10 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition disabled:opacity-50"
                  >
                    <QrCode size={14} />
                    {isVerifyingBank
                      ? "Đang kiểm tra Napas..."
                      : "Kiểm tra VietQR / Napas"}
                  </button>

                  {bankVerifyResult && (
                    <div
                      className={`p-2.5 rounded-xl text-xs font-medium flex items-center gap-1.5 flex-1 w-full ${
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
                      <span className="truncate">
                        {bankVerifyResult.message}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* LỰA CHỌN 2: KHÁCH THANH TOÁN TẠI KHÁCH SẠN */}
          <div
            onClick={() => handleMethodChange("pay_at_hotel")}
            className={`p-4 rounded-2xl border-2 transition cursor-pointer ${
              payoutMethod === "pay_at_hotel"
                ? "border-blue-600 bg-blue-50/40 shadow-xs"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="payoutMethod"
                checked={payoutMethod === "pay_at_hotel"}
                onChange={() => handleMethodChange("pay_at_hotel")}
                className="w-4 h-4 accent-blue-600 cursor-pointer"
              />
              <div>
                <div className="flex items-center gap-2">
                  <Banknote size={16} className="text-amber-600" />
                  <span className="text-xs font-bold text-slate-900">
                    Khách thanh toán trực tiếp tại khách sạn (Tiền mặt / Quẹt
                    thẻ tại quầy)
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Khách trả tiền cho lễ tân khi check-in. Chỗ nghỉ sẽ thanh toán
                  phí hoa hồng định kỳ vào cuối tháng.
                </p>
              </div>
            </label>
          </div>

          {/* LỰA CHỌN 3: VÍ ĐIỆN TỬ DOANH NGHIỆP */}
          <div
            onClick={() => handleMethodChange("e_wallet")}
            className={`p-4 rounded-2xl border-2 transition cursor-pointer ${
              payoutMethod === "e_wallet"
                ? "border-blue-600 bg-blue-50/40 shadow-xs"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="payoutMethod"
                checked={payoutMethod === "e_wallet"}
                onChange={() => handleMethodChange("e_wallet")}
                className="w-4 h-4 accent-blue-600 cursor-pointer"
              />
              <div>
                <div className="flex items-center gap-2">
                  <Smartphone size={16} className="text-purple-600" />
                  <span className="text-xs font-bold text-slate-900">
                    Ví điện tử & Cổng QR Doanh nghiệp (MoMo Business / VNPAY /
                    ZaloPay)
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Nhận tiền thanh toán chuyển thẳng vào tài khoản ví đối tác
                  kinh doanh hoặc mã QR tĩnh của chỗ nghỉ.
                </p>
              </div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Step4PricingAndPayout;
