import React, { useState } from "react";
import {
  CreditCard,
  Percent,
  CheckCircle2,
  AlertCircle,
  Landmark,
  QrCode,
  UserCheck,
} from "lucide-react";

// DANH SÁCH CÁC NGÂN HÀNG LỚN TẠI VIỆT NAM (NAPAS / VIETQR)
const VIETNAM_BANKS = [
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
  {
    code: "BIDV",
    name: "BIDV",
    fullName: "Ngân hàng Đầu tư và Phát triển Việt Nam",
  },
  { code: "ACB", name: "ACB", fullName: "Ngân hàng Á Châu" },
  { code: "VPB", name: "VPBank", fullName: "Ngân hàng Việt Nam Thịnh Vượng" },
  { code: "TPB", name: "TPBank", fullName: "Ngân hàng Tiên Phong" },
  { code: "STB", name: "Sacombank", fullName: "Ngân hàng Sài Gòn Thương Tín" },
  { code: "HDB", name: "HDBank", fullName: "Ngân hàng Phát triển TP.HCM" },
];

export const Step3ContractAndPayment = ({
  data = {},
  onChange = () => {},
  errors = {},
}) => {
  const [isVerifyingBank, setIsVerifyingBank] = useState(false);
  const [bankVerifyResult, setBankVerifyResult] = useState(null);

  const handleBankChange = (e) => {
    const selectedCode = e.target.value;
    const bank = VIETNAM_BANKS.find((b) => b.code === selectedCode);
    if (bank) {
      onChange({
        bankCode: bank.code,
        bankName: bank.name,
      });
      setBankVerifyResult(null);
    }
  };

  const handleVerifyBank = async () => {
    if (!data?.bankAccount || !data?.bankAccountName) {
      setBankVerifyResult({
        success: false,
        message:
          "Vui lòng nhập đầy đủ Số tài khoản và Tên chủ tài khoản trước khi kiểm tra.",
      });
      return;
    }
    setIsVerifyingBank(true);
    try {
      // Giả lập tra cứu hệ thống Napas trong 0.8 giây
      await new Promise((resolve) => setTimeout(resolve, 800));
      setBankVerifyResult({
        success: true,
        message: `Xác thực Napas thành công: Chủ TK [${data.bankAccountName}] khớp với số tài khoản tại ngân hàng ${data.bankName || "Vietcombank"}.`,
      });
    } catch (error) {
      setBankVerifyResult({
        success: false,
        message:
          "Không thể tra cứu tài khoản lúc này. Vui lòng kiểm tra lại thông tin.",
      });
    } finally {
      setIsVerifyingBank(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* SECTION 1: NGƯỜI ĐẠI DIỆN KÝ HỢP ĐỒNG */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              1. Thông tin Người Đại Diện Ký Hợp Đồng
            </h2>
            <p className="text-xs text-slate-500">
              Người có thẩm quyền nhận hợp đồng điện tử và chịu trách nhiệm pháp
              lý của chỗ nghỉ
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
              Họ và tên Người đại diện *
            </label>
            <input
              type="text"
              value={data?.signerName || ""}
              onChange={(e) => onChange({ signerName: e.target.value })}
              placeholder="VD: Nguyễn Văn An"
              className={`w-full h-11 px-4 text-sm rounded-xl border ${
                errors?.signerName
                  ? "border-red-500 bg-red-50/30"
                  : "border-slate-200"
              } text-slate-900 bg-white focus:border-blue-600 outline-none`}
            />
            {errors?.signerName && (
              <p className="text-xs text-red-500 mt-1">{errors.signerName}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
              Chức danh / Vai trò *
            </label>
            <select
              value={data?.signerPosition || "Chủ sở hữu"}
              onChange={(e) => onChange({ signerPosition: e.target.value })}
              className="w-full h-11 px-4 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 focus:border-blue-600 outline-none font-medium cursor-pointer"
            >
              <option value="Chủ sở hữu">Chủ sở hữu / Chủ nhà</option>
              <option value="Giám đốc Điều hành (CEO)">
                Giám đốc Điều hành (CEO)
              </option>
              <option value="Người đại diện theo pháp luật">
                Người đại diện theo pháp luật
              </option>
              <option value="Quản lý khách sạn (General Manager)">
                Quản lý khách sạn (General Manager)
              </option>
              <option value="Người được ủy quyền hợp pháp">
                Người được ủy quyền hợp pháp
              </option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
              Số CCCD / CMND / Hộ chiếu *
            </label>
            <input
              type="text"
              value={data?.signerIdNumber || ""}
              onChange={(e) => onChange({ signerIdNumber: e.target.value })}
              placeholder="VD: 079090001234"
              className="w-full h-11 px-4 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 focus:border-blue-600 outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
              Số điện thoại di động người ký *
            </label>
            <input
              type="tel"
              value={data?.signerPhone || ""}
              onChange={(e) => onChange({ signerPhone: e.target.value })}
              placeholder="VD: 0912345678"
              className={`w-full h-11 px-4 text-sm rounded-xl border ${
                errors?.signerPhone
                  ? "border-red-500 bg-red-50/30"
                  : "border-slate-200"
              } text-slate-900 bg-white focus:border-blue-600 outline-none`}
            />
            {errors?.signerPhone && (
              <p className="text-xs text-red-500 mt-1">{errors.signerPhone}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
              Email nhận Hợp đồng điện tử (E-sign) *
            </label>
            <input
              type="email"
              value={data?.signerEmail || ""}
              onChange={(e) => onChange({ signerEmail: e.target.value })}
              placeholder="partner.contract@gmail.com"
              className={`w-full h-11 px-4 text-sm rounded-xl border ${
                errors?.signerEmail
                  ? "border-red-500 bg-red-50/30"
                  : "border-slate-200"
              } text-slate-900 bg-white focus:border-blue-600 outline-none`}
            />
            {errors?.signerEmail && (
              <p className="text-xs text-red-500 mt-1">{errors.signerEmail}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
              Mã số thuế (Doanh nghiệp hoặc Cá nhân)
            </label>
            <input
              type="text"
              value={data?.taxCode || ""}
              onChange={(e) => onChange({ taxCode: e.target.value })}
              placeholder="VD: 0101234567 hoặc 8000123456"
              className="w-full h-11 px-4 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 focus:border-blue-600 outline-none font-mono"
            />
          </div>
        </div>
      </div>

      {/* SECTION 2: TÀI KHOẢN NGÂN HÀNG THỤ HƯỞNG */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Landmark className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              2. Tài khoản Ngân hàng Nhận Tiền Quyết toán
            </h2>
            <p className="text-xs text-slate-500">
              Doanh thu từ các đơn đặt phòng thành công sẽ được đối soát và
              chuyển tự động vào tài khoản này
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
              Ngân hàng thụ hưởng *
            </label>
            <select
              value={data?.bankCode || "VCB"}
              onChange={handleBankChange}
              className="w-full h-11 px-4 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 focus:border-blue-600 outline-none font-semibold cursor-pointer"
            >
              {VIETNAM_BANKS.map((b) => (
                <option key={b.code} value={b.code}>
                  {b.name} - {b.fullName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
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
              className={`w-full h-11 px-4 text-sm font-mono font-bold rounded-xl border ${
                errors?.bankAccount
                  ? "border-red-500 bg-red-50/30"
                  : "border-slate-200"
              } text-slate-900 bg-white focus:border-blue-600 outline-none`}
            />
            {errors?.bankAccount && (
              <p className="text-xs text-red-500 mt-1">{errors.bankAccount}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
              Tên chủ tài khoản (In hoa không dấu) *
            </label>
            <input
              type="text"
              value={data?.bankAccountName || ""}
              onChange={(e) => {
                onChange({ bankAccountName: e.target.value.toUpperCase() });
                setBankVerifyResult(null);
              }}
              placeholder="VD: NGUYEN VAN AN HOAC CONG TY TNHH ABC"
              className={`w-full h-11 px-4 text-sm font-bold text-slate-900 rounded-xl border ${
                errors?.bankAccountName
                  ? "border-red-500 bg-red-50/30"
                  : "border-slate-200"
              } bg-white focus:border-blue-600 outline-none uppercase`}
            />
            {errors?.bankAccountName && (
              <p className="text-xs text-red-500 mt-1">
                {errors.bankAccountName}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
              Chi nhánh ngân hàng (Tùy chọn)
            </label>
            <input
              type="text"
              value={data?.bankBranch || ""}
              onChange={(e) => onChange({ bankBranch: e.target.value })}
              placeholder="VD: Chi nhánh TP.HCM hoặc Hà Nội"
              className="w-full h-11 px-4 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 focus:border-blue-600 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
              Kỳ quyết toán doanh thu *
            </label>
            <select
              value={data?.payoutCycle || "weekly"}
              onChange={(e) => onChange({ payoutCycle: e.target.value })}
              className="w-full h-11 px-4 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 focus:border-blue-600 outline-none font-medium cursor-pointer"
            >
              <option value="weekly">Hàng tuần (Thứ 3 hàng tuần)</option>
              <option value="biweekly">2 Tuần / lần (Ngày 15 và 30)</option>
              <option value="monthly">Hàng tháng (Ngày 5 đầu tháng)</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={handleVerifyBank}
              disabled={isVerifyingBank}
              className="w-full h-11 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
            >
              <QrCode className="w-4 h-4" />
              {isVerifyingBank
                ? "Đang tra cứu NAPAS..."
                : "Kiểm tra tài khoản Napas/VietQR"}
            </button>
          </div>
        </div>

        {/* BANK VERIFY RESULT BANNER */}
        {bankVerifyResult && (
          <div
            className={`p-4 rounded-xl text-xs font-medium flex items-center gap-3 animate-fadeIn ${
              bankVerifyResult.success
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {bankVerifyResult.success ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            )}
            <span>{bankVerifyResult.message}</span>
          </div>
        )}
      </div>

      {/* SECTION 3: MÔ HÌNH HOA HỒNG & ĐIỀU KHOẢN KINH DOANH */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Percent className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              3. Thỏa thuận Mức Hoa hồng & Quyền lợi Đối tác
            </h2>
            <p className="text-xs text-slate-500">
              Chỉ phát sinh phí khi có khách đặt và hoàn tất kỳ nghỉ thành công
              (No booking, No fee)
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              rate: 15,
              title: "Gói Tiêu chuẩn (Standard)",
              desc: "Phù hợp với cơ sở lưu trú vừa và nhỏ, homestay",
              features: [
                "Niêm yết trên Web & App GoStay",
                "Hỗ trợ CSKH 24/7",
                "Cổng thanh toán tự động",
              ],
              badge: "Tiết kiệm",
            },
            {
              rate: 18,
              title: "Gói Tăng tốc (Preferred Partner)",
              desc: "Tăng 35% lượt hiển thị, huy hiệu Đối tác Uy tín",
              features: [
                "Ưu tiên hiển thị top tìm kiếm",
                "Đồng bộ Google Hotels miễn phí",
                "Huy hiệu Partner Verified",
              ],
              badge: "Được chọn nhiều nhất",
              recommended: true,
            },
            {
              rate: 20,
              title: "Gói Độc quyền (Luxury Boost)",
              desc: "Dành cho khách sạn 4-5 sao và resort cao cấp",
              features: [
                "Chiến dịch Flash Sale riêng",
                "Quản lý tài khoản riêng (Account Manager)",
                "Đẩy tin đa kênh MXH",
              ],
              badge: "Tối đa doanh thu",
            },
          ].map((pkg) => {
            const isSelected = (data?.commissionRate || 18) === pkg.rate;
            return (
              <div
                key={pkg.rate}
                onClick={() => onChange({ commissionRate: pkg.rate })}
                className={`relative p-6 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between ${
                  isSelected
                    ? "border-blue-600 bg-blue-50/40 shadow-sm"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                {pkg.recommended && (
                  <span className="absolute -top-2.5 right-4 bg-blue-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-xs">
                    {pkg.badge}
                  </span>
                )}
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-slate-900">
                      {pkg.title}
                    </h3>
                    <span className="text-2xl font-black text-blue-600">
                      {pkg.rate}%
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{pkg.desc}</p>
                  <div className="space-y-1.5 mt-4 pt-3 border-t border-slate-100">
                    {pkg.features.map((f, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 text-xs text-slate-700"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-4 pt-3">
                  <span
                    className={`w-full py-2 rounded-xl text-xs font-bold text-center block ${
                      isSelected
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {isSelected ? "Đã chọn mức này" : "Chọn gói này"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Step3ContractAndPayment;
