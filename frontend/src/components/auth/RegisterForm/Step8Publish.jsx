// src/components/auth/RegisterForm/Step8Publish.jsx
import React, { useRef } from "react";
import {
  MapPin,
  Building2,
  Upload,
  FileCheck,
  AlertCircle,
  Sparkles,
  ShieldCheck,
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
    <div className="space-y-6 font-sans text-slate-800 animate-fadeIn">
      <div>
        <div className="flex items-center gap-1.5 text-xs font-black text-[#003580] uppercase tracking-wider mb-1">
          <Sparkles size={14} className="text-[#006ce4]" /> Bước 8 / 8: Kiểm
          duyệt & Kích hoạt mở bán
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Hoàn tất hồ sơ & Đăng tải
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Xem lại bản xem trước của khách sạn trên GoStay trước khi gửi duyệt
          chính thức.
        </p>
      </div>

      {/* THẺ TÓM TẮT CHỖ NGHỈ */}
      <div className="p-4 rounded-2xl bg-[#e8f2ff]/40 border border-blue-200 flex items-center gap-4">
        <div className="w-24 h-20 sm:w-28 sm:h-24 rounded-xl overflow-hidden bg-slate-200 shrink-0 border border-slate-300">
          <img
            src={coverImage}
            alt="Property Cover"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="space-y-1 overflow-hidden">
          <h3 className="font-black text-base text-[#003580] truncate">
            {data?.hotelName || "Tên cơ sở lưu trú"}
          </h3>
          <p className="text-xs text-slate-600 flex items-center gap-1.5 truncate">
            <MapPin size={14} className="text-[#006ce4] shrink-0" />
            <span className="truncate">
              {data?.address ? `${data.address}, ` : ""}
              {data?.city || "Việt Nam"}
            </span>
          </p>
          <span className="text-xs font-bold text-amber-500 block">
            {"⭐".repeat(data?.starRating || 3)} ({data?.starRating || 3} sao)
          </span>
        </div>
      </div>

      {/* HỒ SƠ PHÁP LÝ & MÃ SỐ THUẾ */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-3">
        <div className="flex items-center gap-2 text-xs font-black text-slate-900 uppercase tracking-wider">
          <FileCheck size={16} className="text-[#006ce4]" />
          <span>Thông tin Thuế & Giấy phép đăng ký kinh doanh</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Mã số thuế (Doanh nghiệp hoặc Hộ KD cá thể)
            </label>
            <input
              type="text"
              value={data?.taxCode || ""}
              onChange={(e) => onChange({ taxCode: e.target.value })}
              placeholder="VD: 0101234567"
              className="w-full h-11 px-3.5 text-xs font-mono font-bold bg-slate-50 rounded-xl border border-slate-300 outline-none focus:border-[#006ce4]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Bản chụp GPKD (business_license)
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
              className="w-full h-11 px-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-300 text-[#003580] text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition"
            >
              <Upload size={14} />
              <span className="truncate">
                {data?.businessLicenseUrl
                  ? "✓ Đã đính kèm tệp giấy phép"
                  : "Tải lên tài liệu PDF / Ảnh"}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ĐIỀU KHOẢN */}
      <div className="space-y-3 pt-2">
        <label className="flex items-start gap-3 p-4 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 cursor-pointer transition select-none">
          <input
            type="checkbox"
            checked={data?.acceptedTerms || false}
            onChange={(e) => onChange({ acceptedTerms: e.target.checked })}
            className="w-5 h-5 mt-0.5 accent-[#006ce4] rounded cursor-pointer shrink-0"
          />
          <div className="text-xs text-slate-700 leading-relaxed font-medium">
            Tôi xác nhận đã đọc và cam kết tuân thủ{" "}
            <span className="text-[#006ce4] font-black hover:underline">
              Quy chế hoạt động sàn TMĐT GoStay
            </span>
            , chịu trách nhiệm pháp lý về tính trung thực của các thông tin giá,
            phòng và hình ảnh cơ sở đã khai báo.
          </div>
        </label>
        {errors?.acceptedTerms && (
          <p className="text-xs text-rose-500 font-black flex items-center gap-1">
            <AlertCircle size={14} /> {errors.acceptedTerms}
          </p>
        )}
      </div>
    </div>
  );
};

export default Step8Publish;
