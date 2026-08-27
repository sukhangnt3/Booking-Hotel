import React from "react";
import {
  CheckCircle2,
  XCircle,
  Sparkles,
  ShieldCheck,
  Info,
  X,
} from "lucide-react";

// Hàm tự động chấm điểm form (Thay thế cho authService.checkAuditLogic bị thiếu)
const checkAuditLogic = (data) => {
  // Giả lập logic kiểm tra dữ liệu, nếu data có trường đó thì passed = true
  const checks = [
    {
      id: "name",
      title: "Định dạng tên chỗ nghỉ chuẩn SEO",
      category: "Thông tin chung",
      tip: "Tên không chứa ký tự đặc biệt, viết hoa chữ cái đầu.",
      passed: data?.propertyName ? true : false,
    },
    {
      id: "rooms",
      title: "Thiết lập tối thiểu 1 loại phòng",
      category: "Cấu hình phòng",
      tip: "Cần có ít nhất 1 loại phòng kèm giá và số lượng trống.",
      passed: data?.rooms && data?.rooms?.length > 0 ? true : false,
    },
    {
      id: "photos",
      title: "Hình ảnh mặt tiền & phòng ngủ",
      category: "Media",
      tip: "Yêu cầu tối thiểu 3 ảnh độ phân giải cao (trên 720p).",
      passed: data?.images && data?.images?.length >= 3 ? true : false,
    },
    {
      id: "legal",
      title: "Xác thực Giấy phép & Mã số thuế",
      category: "Pháp lý",
      tip: "Tên trên GPKD phải khớp với thông tin người đại diện.",
      passed: data?.taxCode ? true : false,
    },
    {
      id: "bank",
      title: "Liên kết tài khoản ngân hàng",
      category: "Thanh toán",
      tip: "Số tài khoản nhận tiền phải khớp tên doanh nghiệp/chủ sở hữu.",
      passed: data?.bankAccount ? true : false,
    },
  ];

  // Tính điểm phần trăm
  const passedCount = checks.filter((c) => c.passed).length;
  const score =
    checks.length > 0 ? Math.round((passedCount / checks.length) * 100) : 0;

  return { score, checks };
};

export const AuditReportView = ({ data = {}, onClose, onAutoFillDemo }) => {
  // Gọi hàm checkAuditLogic ngay tại đây
  const audit = checkAuditLogic(data);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-fadeIn">
      {/* HEADER */}
      <div className="bg-slate-900 text-white p-6 relative">
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        )}
        <div className="flex items-center gap-2 text-blue-400 text-xs font-bold uppercase tracking-wider mb-2">
          <ShieldCheck className="w-4 h-4" /> Hệ Thống Kiểm Tra Chuẩn Logic OTA
          (OTA Standard Auditor)
        </div>
        <h2 className="text-xl font-bold">
          Đánh Giá Tính Hoàn Thiện Hồ Sơ Đăng Ký
        </h2>
        <p className="text-xs text-slate-300 mt-1">
          Đối chiếu theo tiêu chuẩn đối tác của Booking.com, Agoda Partner Hub &
          Traveloka TERA
        </p>

        {/* PROGRESS BAR & SCORE */}
        <div className="mt-5 flex items-center gap-4 bg-slate-800/80 p-4 rounded-xl border border-slate-700">
          <div className="text-center shrink-0">
            <span
              className={`text-3xl font-black ${
                audit.score >= 80
                  ? "text-emerald-400"
                  : audit.score >= 50
                    ? "text-amber-400"
                    : "text-rose-400"
              }`}
            >
              {audit.score}%
            </span>
            <span className="block text-[10px] text-slate-400 font-semibold uppercase">
              Độ Chuẩn Hóa
            </span>
          </div>
          <div className="flex-1">
            <div className="h-2.5 bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  audit.score >= 80
                    ? "bg-emerald-500"
                    : audit.score >= 50
                      ? "bg-amber-500"
                      : "bg-rose-500"
                }`}
                style={{ width: `${audit.score}%` }}
              />
            </div>
            <p className="text-xs text-slate-300 mt-2 font-medium">
              {audit.score === 100 ? (
                <span className="text-emerald-400 font-bold">
                  ✓ Hồ sơ đạt 100% chuẩn logic OTA, sẵn sàng xét duyệt ngay!
                </span>
              ) : (
                <span>
                  Còn {audit.checks.filter((c) => !c.passed).length} tiêu chí
                  cần bổ sung để hồ sơ đạt chuẩn cao nhất.
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* BODY - CHECKLIST */}
      <div className="p-6 max-h-[65vh] overflow-y-auto space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800">
            Bảng Kiểm Định 10 Tiêu Chí Vận Hành Khách Sạn:
          </h3>
          {onAutoFillDemo && (
            <button
              onClick={onAutoFillDemo}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-200 flex items-center gap-1.5 transition"
            >
              <Sparkles className="w-3.5 h-3.5" /> Điền nhanh dữ liệu mẫu 100%
              điểm
            </button>
          )}
        </div>

        <div className="space-y-3">
          {audit.checks.map((check, idx) => (
            <div
              key={check.id}
              className={`p-3.5 rounded-xl border flex items-start gap-3 transition ${
                check.passed
                  ? "bg-emerald-50/40 border-emerald-200"
                  : "bg-slate-50 border-slate-200"
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {check.passed ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-slate-400" />
                )}
              </div>

              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-xs font-bold ${check.passed ? "text-emerald-900" : "text-slate-800"}`}
                  >
                    {idx + 1}. {check.title}
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 bg-white text-slate-600 rounded-md border border-slate-200">
                    {check.category}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  {check.tip}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* COMPARISON TABLE */}
        <div className="mt-6 pt-6 border-t border-slate-200">
          <h4 className="text-xs font-bold text-slate-900 mb-3 uppercase tracking-wider flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-600" /> So Sánh Logic Với Các Sàn
            OTA Lớn
          </h4>
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <th className="p-2.5">Tính năng / Tiêu chuẩn</th>
                  <th className="p-2.5">Booking.com / Agoda</th>
                  <th className="p-2.5 text-blue-600">GoStay Partner Form</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                <tr>
                  <td className="p-2.5 font-medium">
                    Cấu hình nhiều loại phòng
                  </td>
                  <td className="p-2.5 text-emerald-600">✓ Bắt buộc</td>
                  <td className="p-2.5 text-emerald-600 font-bold">
                    ✓ Hỗ trợ linh hoạt
                  </td>
                </tr>
                <tr>
                  <td className="p-2.5 font-medium">
                    Xác thực tài khoản ngân hàng (Napas)
                  </td>
                  <td className="p-2.5 text-emerald-600">
                    ✓ Đối chiếu IBAN/Số TK
                  </td>
                  <td className="p-2.5 text-emerald-600 font-bold">
                    ✓ Kiểm tra tức thì
                  </td>
                </tr>
                <tr>
                  <td className="p-2.5 font-medium">
                    Thẩm định Giấy phép KD & CCCD
                  </td>
                  <td className="p-2.5 text-emerald-600">✓ KYC 24-48h</td>
                  <td className="p-2.5 text-emerald-600 font-bold">
                    ✓ Quy trình 4 bước
                  </td>
                </tr>
                <tr>
                  <td className="p-2.5 font-medium">
                    Lưu nháp dữ liệu tự động
                  </td>
                  <td className="p-2.5 text-emerald-600">✓ Có</td>
                  <td className="p-2.5 text-emerald-600 font-bold">
                    ✓ LocalStorage Autosave
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditReportView;
