// src/components/auth/RegisterForm/Step8Publish.jsx
import React, { useRef } from "react";
import {
  MapPin,
  Building2,
  Upload,
  FileCheck,
  CheckSquare,
  Square,
  AlertCircle,
} from "lucide-react";

export const Step8Publish = ({
  data = {},
  onChange = () => {},
  errors = {},
}) => {
  const licenseInputRef = useRef(null);

  const handleLicenseUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      onChange({ businessLicenseUrl: event.target.result });
    };
    reader.readAsDataURL(file);
    e.target.value = null;
  };

  const coverImage =
    data?.hotelMainImage ||
    data?.hotelImages?.[0]?.url ||
    "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600";

  return (
    <div className="max-w-2xl mx-auto space-y-7 font-sans text-slate-800 animate-fadeIn">
      {/* ── TIÊU ĐỀ BƯỚC 8 CHUẨN AGODA ── */}
      <div>
        <div className="flex items-center justify-between text-xs text-slate-400 font-bold mb-1">
          <span>Bước 8/8</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Đăng tải
        </h1>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          KHU VỰC 1: THẺ TÓM TẮT CHỖ NGHỈ (PREVIEW CARD CHUẨN AGODA)
      ════════════════════════════════════════════════════════════════════════ */}
      <div className="p-4 rounded-3xl bg-slate-50 border border-slate-200/90 flex items-center gap-4 shadow-2xs">
        {/* Ảnh đại diện chính */}
        <div className="w-24 h-20 sm:w-28 sm:h-22 rounded-2xl overflow-hidden bg-slate-200 shrink-0 border border-slate-300">
          <img
            src={coverImage}
            alt="Property Cover"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Tên và vị trí */}
        <div className="space-y-1 overflow-hidden">
          <h3 className="font-extrabold text-base text-slate-900 truncate">
            {data?.hotelName || "Tên cơ sở lưu trú"}
          </h3>
          <p className="text-xs text-slate-600 flex items-center gap-1.5 truncate">
            <MapPin size={14} className="text-blue-600 shrink-0" />
            <span className="truncate">
              {data?.address ? `${data.address}, ` : ""}
              {data?.city || "Việt Nam"}
            </span>
          </p>
          <span className="text-[11px] font-bold text-amber-500 block">
            {"⭐".repeat(data?.starRating || 3)} ({data?.starRating || 3} sao)
          </span>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          KHU VỰC 2: PHÁP LÝ & MÃ SỐ THUẾ (KHỚP DATABASE POSTGRESQL)
      ════════════════════════════════════════════════════════════════════════ */}
      <div className="p-5 rounded-3xl bg-white border border-slate-200 space-y-4 shadow-2xs">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
          <FileCheck size={16} className="text-blue-600" />
          <span>Hồ sơ pháp lý & Thuế cơ sở lưu trú</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              Mã số thuế (Doanh nghiệp hoặc Hộ KD)
            </label>
            <input
              type="text"
              value={data?.taxCode || ""}
              onChange={(e) => onChange({ taxCode: e.target.value })}
              placeholder="VD: 0101234567"
              className="w-full h-11 px-3.5 text-xs font-mono font-semibold bg-white rounded-xl border border-slate-300 outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              Giấy phép ĐKKD (business_license_url)
            </label>
            <input
              type="file"
              ref={licenseInputRef}
              accept="image/*,application/pdf"
              onChange={handleLicenseUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => licenseInputRef.current?.click()}
              className="w-full h-11 px-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition"
            >
              <Upload size={14} />
              <span className="truncate">
                {data?.businessLicenseUrl
                  ? "✓ Đã đính kèm tài liệu"
                  : "Tải bản chụp GPKD"}
              </span>
            </button>
          </div>
        </div>
      </div>

      <hr className="border-slate-100" />

      {/* ════════════════════════════════════════════════════════════════════════
          KHU VỰC 3: CHẤP NHẬN CÁC ĐIỀU KHOẢN VÀ ĐIỀU KIỆN (CHUẨN AGODA)
      ════════════════════════════════════════════════════════════════════════ */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-slate-900">
          Chấp nhận các Điều khoản và Điều kiện
        </h2>

        {/* Ô Checkbox cam kết chuẩn Agoda */}
        <label className="flex items-start gap-3 p-4 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 cursor-pointer transition select-none">
          <input
            type="checkbox"
            checked={data?.acceptedTerms || false}
            onChange={(e) => onChange({ acceptedTerms: e.target.checked })}
            className="w-5 h-5 mt-0.5 accent-blue-600 rounded cursor-pointer shrink-0"
          />
          <div className="text-xs text-slate-700 leading-relaxed">
            Tôi công nhận rằng mình đã đọc và đồng ý với{" "}
            <span className="text-blue-600 font-bold hover:underline">
              Điều khoản và Điều kiện
            </span>{" "}
            và{" "}
            <span className="text-blue-600 font-bold hover:underline">
              Chính sách Quyền riêng tư
            </span>{" "}
            của hệ thống. Ngoài ra, tôi xác nhận tuân theo tất cả{" "}
            <span className="text-blue-600 font-bold hover:underline">
              điều lệ và luật pháp địa phương
            </span>{" "}
            liên quan.
          </div>
        </label>
        {errors?.acceptedTerms && (
          <p className="text-xs text-rose-500 font-bold flex items-center gap-1">
            <AlertCircle size={13} /> {errors.acceptedTerms}
          </p>
        )}

        {/* Đoạn mô tả pháp lý chuẩn Agoda */}
        <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
          Xin lưu ý, các thông tin cơ sở lưu trú của quý đối tác sẽ được hội
          đồng quản trị thẩm định pháp lý và kích hoạt mở bán trên sàn TMĐT. Quý
          đối tác xác nhận các thông tin về giá, phòng và quyền sở hữu là hoàn
          toàn chính xác.
        </p>
      </div>
    </div>
  );
};

export default Step8Publish;
