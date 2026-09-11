// src/components/auth/RegisterForm/AuditReportView.jsx
import React from "react";
import { CheckCircle2, XCircle, Sparkles, ShieldCheck, X } from "lucide-react";

const checkAuditLogic = (data) => {
  const checks = [
    {
      id: "name",
      title: "Định dạng tên chỗ nghỉ chuẩn SEO",
      category: "Định danh",
      tip: "Tên cơ sở lưu trú rõ ràng, viết hoa chữ cái đầu và đúng chính tả.",
      passed: Boolean(data?.hotelName?.trim() && data.hotelName.length >= 3),
    },
    {
      id: "location",
      title: "Tọa độ GPS & Địa chỉ hành chính",
      category: "Vị trí",
      tip: "Có đầy đủ số nhà, tên đường, thuộc 1 trong 63 tỉnh thành và có tọa độ GPS.",
      passed: Boolean(
        data?.address?.trim() &&
        data?.city &&
        data?.latitude &&
        data?.longitude,
      ),
    },
    {
      id: "rooms",
      title: "Thiết lập tối thiểu 1 loại phòng & giá bán",
      category: "Phòng ốc",
      tip: "Cần ít nhất 1 loại phòng có giá bán, sức chứa và danh sách số phòng.",
      passed: Boolean(
        data?.rooms?.length > 0 &&
        data.rooms[0]?.name &&
        Number(data.rooms[0]?.base_price) > 0,
      ),
    },
    {
      id: "photos",
      title: "Hình ảnh mặt tiền & phòng ngủ",
      category: "Hình ảnh",
      tip: "Yêu cầu tối thiểu 3 ảnh chất lượng cao (có chỉ định ảnh bìa chính).",
      passed: Boolean(
        (data?.hotelImages?.length >= 3 || data?.images?.length >= 3) &&
        data?.hotelMainImage,
      ),
    },
    {
      id: "bank",
      title: "Liên kết tài khoản ngân hàng thụ hưởng (Napas)",
      category: "Thanh toán",
      tip: "Số tài khoản ngân hàng và tên chủ tài khoản khớp với người thụ hưởng.",
      passed: Boolean(
        data?.bankAccount?.trim() && data?.bankAccountHolder?.trim(),
      ),
    },
    {
      id: "cancellation",
      title: "Chính sách hủy phòng minh bạch",
      category: "Chính sách",
      tip: "Thiết lập rõ ràng thời hạn hủy phòng miễn phí.",
      passed: data?.cancellation_deadline_hours !== undefined,
    },
    {
      id: "amenities",
      title: "Tiện ích chung của chỗ nghỉ",
      category: "Dịch vụ",
      tip: "Chọn tối thiểu 3 tiện ích thiết yếu (Wi-Fi, Bãi đỗ xe, Lễ tân...).",
      passed: Boolean(data?.propertyAmenities?.length >= 3),
    },
    {
      id: "legal",
      title: "Cam kết điều khoản hoạt động GoStay",
      category: "Pháp lý",
      tip: "Xác nhận đồng ý với Quy chế hoạt động và tính chính xác của hồ sơ.",
      passed: Boolean(data?.acceptedTerms),
    },
  ];

  const passedCount = checks.filter((c) => c.passed).length;
  const score = Math.round((passedCount / checks.length) * 100);

  return { score, checks };
};

export const AuditReportView = ({ data = {}, onClose, onAutoFillDemo }) => {
  const audit = checkAuditLogic(data);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden animate-fadeIn font-sans text-slate-800 max-w-2xl w-full mx-auto">
      {/* HEADER ĐỒNG BỘ */}
      <div className="bg-[#003580] text-white p-6 relative">
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-1.5 rounded-xl transition cursor-pointer"
          >
            <X size={18} />
          </button>
        )}
        <div className="flex items-center gap-2 text-blue-200 text-xs font-black uppercase tracking-wider mb-1">
          <ShieldCheck size={16} /> Kiểm Định Tiêu Chuẩn Mở Bán OTA
        </div>
        <h2 className="text-xl font-black tracking-tight">
          Báo Cáo Đánh Giá Tính Hoàn Thiện Hồ Sơ
        </h2>

        {/* TIẾN ĐỘ ĐIỂM */}
        <div className="mt-4 flex items-center gap-4 bg-white/10 backdrop-blur-xs p-4 rounded-2xl border border-white/20">
          <div className="text-center shrink-0">
            <span
              className={`text-3xl font-black ${
                audit.score >= 80
                  ? "text-emerald-300"
                  : audit.score >= 50
                    ? "text-amber-300"
                    : "text-rose-300"
              }`}
            >
              {audit.score}%
            </span>
            <span className="block text-[10px] text-blue-100 font-bold uppercase tracking-wider">
              Chuẩn Hóa
            </span>
          </div>
          <div className="flex-1">
            <div className="h-2.5 bg-black/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-400 transition-all duration-500 rounded-full"
                style={{ width: `${audit.score}%` }}
              />
            </div>
            <p className="text-xs text-blue-100 mt-2 font-medium">
              {audit.score === 100 ? (
                <span className="text-emerald-300 font-bold">
                  ✓ Hồ sơ đạt 100% tiêu chuẩn, sẵn sàng kích hoạt mở bán ngay!
                </span>
              ) : (
                <span>
                  Còn {audit.checks.filter((c) => !c.passed).length} tiêu chí
                  cần bổ sung để tối ưu lượng khách đặt phòng.
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* CHECKLIST TIÊU CHÍ */}
      <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
            Chi Tiết {audit.checks.length} Tiêu Chí Vận Hành:
          </h3>
          {onAutoFillDemo && (
            <button
              onClick={onAutoFillDemo}
              className="text-xs font-bold text-[#006ce4] bg-[#e8f2ff] hover:bg-blue-100 px-3 py-1.5 rounded-xl border border-blue-200 flex items-center gap-1.5 transition cursor-pointer"
            >
              <Sparkles size={13} /> Điền mẫu đạt 100%
            </button>
          )}
        </div>

        <div className="space-y-2.5">
          {audit.checks.map((check, idx) => (
            <div
              key={check.id}
              className={`p-3.5 rounded-2xl border flex items-start gap-3 transition ${
                check.passed
                  ? "bg-emerald-50/60 border-emerald-200"
                  : "bg-slate-50 border-slate-200"
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {check.passed ? (
                  <CheckCircle2 size={18} className="text-emerald-600" />
                ) : (
                  <XCircle size={18} className="text-slate-400" />
                )}
              </div>

              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-xs font-bold ${
                      check.passed ? "text-emerald-950" : "text-slate-800"
                    }`}
                  >
                    {idx + 1}. {check.title}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-white text-slate-600 rounded-md border border-slate-200">
                    {check.category}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  {check.tip}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AuditReportView;
