import React, { useRef } from "react";
import {
  MapPin,
  Building2,
  Upload,
  FileCheck,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  Percent,
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

  const commissionRate = Number(data?.commissionRate || 18.0);

  return (
    <div className="space-y-6 font-sans text-slate-800 animate-fadeIn">
      <div>
        <div className="flex items-center gap-1.5 text-xs font-black text-[#003580] uppercase tracking-wider mb-1">
          <Sparkles size={14} className="text-[#006ce4]" /> Bước 8 / 8: Kiểm
          duyệt hợp đồng & Kích hoạt mở bán
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Xác nhận điều khoản hợp tác & Mở bán
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Quý đối tác vui lòng kiểm tra lại thông tin cơ sở và biểu phí hoa hồng
          trước khi gửi hồ sơ lên hệ thống.
        </p>
      </div>

      {/* THẺ TÓM TẮT CHỖ NGHỈ & HOA HỒNG SÀN */}
      <div className="p-5 rounded-3xl bg-[#e8f2ff]/50 border border-blue-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-slate-200 shrink-0 border border-slate-300">
            <img
              src={coverImage}
              alt="Property Cover"
              className="w-full h-full object-cover"
            />
          </div>

          <div className="space-y-1">
            <h3 className="font-black text-base text-[#003580]">
              {data?.hotelName || "Tên cơ sở lưu trú"}
            </h3>
            <p className="text-xs text-slate-600 flex items-center gap-1.5">
              <MapPin size={14} className="text-[#006ce4] shrink-0" />
              <span>
                {data?.address ? `${data.address}, ` : ""}
                {data?.city || "Việt Nam"}
              </span>
            </p>
            <span className="text-xs font-bold text-amber-500 block">
              {"⭐".repeat(data?.starRating || 3)} ({data?.starRating || 3} sao
              tiêu chuẩn)
            </span>
          </div>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-blue-200 shrink-0 w-full sm:w-auto text-left sm:text-right">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Hoa hồng sàn áp dụng
          </span>
          <span className="text-xl font-black text-blue-700 block my-0.5">
            {commissionRate}% / đơn
          </span>
          <span className="text-[10px] text-emerald-600 font-bold block">
            ✓ Đối tác nhận: {100 - commissionRate}%
          </span>
        </div>
      </div>

      {/* HỒ SƠ PHÁP LÝ & MÃ SỐ THUẾ */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200 space-y-4 shadow-xs">
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

      {/* 🌟 ĐIỀU KHOẢN VÀ CAM KẾT HOA HỒNG RÕ RÀNG */}
      <div className="space-y-3 pt-2">
        <label className="flex items-start gap-3.5 p-4 sm:p-5 rounded-3xl bg-white border-2 border-slate-200 hover:border-blue-300 cursor-pointer transition select-none shadow-xs">
          <input
            type="checkbox"
            checked={data?.acceptedTerms || false}
            onChange={(e) => onChange({ acceptedTerms: e.target.checked })}
            className="w-5 h-5 mt-0.5 accent-[#003580] rounded cursor-pointer shrink-0"
          />
          <div className="text-xs text-slate-700 leading-relaxed space-y-1">
            <p className="font-bold text-slate-900">
              Tôi xác nhận chấp thuận mức chiết khấu hoa hồng nền tảng là{" "}
              <span className="text-[#006ce4] font-black">
                {commissionRate}%
              </span>{" "}
              và cam kết tuân thủ Quy chế hoạt động sàn TMĐT GoStay.
            </p>
            <p className="text-slate-500 font-normal">
              Chủ cơ sở chịu trách nhiệm pháp lý về tính trung thực của các
              thông tin giá bán, hình ảnh và tài khoản ngân hàng thụ hưởng đã
              khai báo.
            </p>
          </div>
        </label>

        {errors?.acceptedTerms && (
          <p className="text-xs text-rose-500 font-black flex items-center gap-1 pl-2">
            <AlertCircle size={14} /> {errors.acceptedTerms}
          </p>
        )}
      </div>
    </div>
  );
};

export default Step8Publish;
