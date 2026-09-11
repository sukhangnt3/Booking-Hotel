// src/components/auth/RegisterForm/Step1HotelInfo.jsx
import React from "react";
import {
  UserPlus,
  Building2,
  MapPin,
  ChevronDown,
  Sparkles,
  Lock,
  Mail,
  Phone,
  User,
  CheckCircle2,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";

export const Step1HotelInfo = ({
  data = {},
  onChange = () => {},
  errors = {},
}) => {
  const { user, isAuthenticated } = useAuthStore();

  return (
    <div className="space-y-6 font-sans text-slate-800 animate-fadeIn">
      {/* ── TIÊU ĐỀ BƯỚC 1 ── */}
      <div>
        <div className="flex items-center gap-1.5 text-xs font-black text-[#003580] uppercase tracking-wider mb-1">
          <Sparkles size={14} className="text-[#006ce4]" /> Bước 1 / 8: Tạo tài
          khoản & Thông tin chỗ nghỉ
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Bắt đầu đăng ký cơ sở lưu trú của bạn
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Thiết lập tài khoản quản trị và điền địa chỉ để mở bán phòng trên
          GoStay.
        </p>
      </div>

      {/* ── KHỐI 1: TẠO TÀI KHOẢN ĐỐI TÁC (NẰM NGAY TẠI BƯỚC 1) ── */}
      {!isAuthenticated ? (
        <div className="p-5 sm:p-7 bg-[#e8f2ff]/50 border border-blue-200 rounded-2xl space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black text-[#003580] uppercase tracking-wider flex items-center gap-2">
              <UserPlus size={16} className="text-[#006ce4]" /> 1. Tạo tài khoản
              đối tác quản trị
            </h2>
            <span className="text-[11px] font-bold text-slate-500">
              Chưa có tài khoản
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Họ và tên */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Họ và tên chủ cơ sở *
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={data?.ownerName || ""}
                  onChange={(e) => onChange({ ownerName: e.target.value })}
                  placeholder="VD: Nguyễn Văn An"
                  className={`w-full h-11 sm:h-12 pl-10 pr-4 text-xs sm:text-sm font-bold bg-white rounded-xl border ${
                    errors?.ownerName
                      ? "border-rose-500 bg-rose-50/20"
                      : "border-slate-300 focus:border-[#006ce4] focus:ring-2 focus:ring-blue-100"
                  } outline-none transition shadow-2xs`}
                />
                <User
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
              </div>
              {errors?.ownerName && (
                <p className="text-xs text-rose-500 font-bold mt-1.5">
                  {errors.ownerName}
                </p>
              )}
            </div>

            {/* Số điện thoại */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Số điện thoại liên hệ *
              </label>
              <div className="relative">
                <input
                  type="tel"
                  value={data?.phoneContact || ""}
                  onChange={(e) => onChange({ phoneContact: e.target.value })}
                  placeholder="VD: 0901234567"
                  className={`w-full h-11 sm:h-12 pl-10 pr-4 text-xs sm:text-sm font-bold bg-white rounded-xl border ${
                    errors?.phoneContact
                      ? "border-rose-500 bg-rose-50/20"
                      : "border-slate-300 focus:border-[#006ce4] focus:ring-2 focus:ring-blue-100"
                  } outline-none transition shadow-2xs`}
                />
                <Phone
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
              </div>
              {errors?.phoneContact && (
                <p className="text-xs text-rose-500 font-bold mt-1.5">
                  {errors.phoneContact}
                </p>
              )}
            </div>

            {/* Email đăng nhập */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Email đăng nhập quản trị *
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={data?.emailContact || ""}
                  onChange={(e) => onChange({ emailContact: e.target.value })}
                  placeholder="partner@example.com"
                  className={`w-full h-11 sm:h-12 pl-10 pr-4 text-xs sm:text-sm font-bold bg-white rounded-xl border ${
                    errors?.emailContact
                      ? "border-rose-500 bg-rose-50/20"
                      : "border-slate-300 focus:border-[#006ce4] focus:ring-2 focus:ring-blue-100"
                  } outline-none transition shadow-2xs`}
                />
                <Mail
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
              </div>
              {errors?.emailContact && (
                <p className="text-xs text-rose-500 font-bold mt-1.5">
                  {errors.emailContact}
                </p>
              )}
            </div>

            {/* Mật khẩu */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Mật khẩu (≥ 6 ký tự) *
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={data?.password || ""}
                  onChange={(e) => onChange({ password: e.target.value })}
                  placeholder="Tối thiểu 6 ký tự"
                  className={`w-full h-11 sm:h-12 pl-10 pr-4 text-xs sm:text-sm font-bold bg-white rounded-xl border ${
                    errors?.password
                      ? "border-rose-500 bg-rose-50/20"
                      : "border-slate-300 focus:border-[#006ce4] focus:ring-2 focus:ring-blue-100"
                  } outline-none transition shadow-2xs`}
                />
                <Lock
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
              </div>
              {errors?.password && (
                <p className="text-xs text-rose-500 font-bold mt-1.5">
                  {errors.password}
                </p>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* NẾU ĐÃ ĐĂNG NHẬP SẴN */
        <div className="p-4 sm:p-5 bg-emerald-50/60 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">
                Đang đăng ký bằng tài khoản
              </span>
              <span className="text-sm font-black text-slate-900">
                {user?.full_name || "Chủ cơ sở"} ({user?.email})
              </span>
            </div>
          </div>
          <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-lg">
            Đã đăng nhập
          </span>
        </div>
      )}

      {/* ── KHỐI 2: TÊN CHỖ NGHỈ & LOẠI HÌNH ── */}
      <div className="p-5 sm:p-7 bg-slate-50/80 border border-slate-200 rounded-2xl space-y-4 shadow-xs">
        <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <Building2 size={16} className="text-[#006ce4]" /> 2. Thông tin cơ sở
          lưu trú
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Tên cơ sở lưu trú / Khách sạn *
            </label>
            <input
              type="text"
              value={data?.hotelName || ""}
              onChange={(e) => onChange({ hotelName: e.target.value })}
              placeholder="Ví dụ: Khách sạn Grand Sài Gòn, Sun Boutique Villa..."
              className={`w-full h-11 sm:h-12 px-4 text-xs sm:text-sm font-bold bg-white rounded-xl border ${
                errors?.hotelName
                  ? "border-rose-500 bg-rose-50/20"
                  : "border-slate-300 focus:border-[#006ce4] focus:ring-2 focus:ring-blue-100"
              } outline-none transition shadow-2xs`}
            />
            {errors?.hotelName && (
              <p className="text-xs text-rose-500 font-bold mt-1.5">
                {errors.hotelName}
              </p>
            )}
            <span className="text-[11px] text-slate-400 mt-1 block">
              Tên chính thức hiển thị trên kết quả tìm kiếm của GoStay.
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Loại hình chỗ nghỉ *
            </label>
            <div className="relative">
              <select
                value={data?.propertyType || "hotel"}
                onChange={(e) => onChange({ propertyType: e.target.value })}
                className="w-full h-11 sm:h-12 px-3.5 text-xs sm:text-sm font-bold bg-white rounded-xl border border-slate-300 appearance-none cursor-pointer outline-none focus:border-[#006ce4] focus:ring-2 focus:ring-blue-100 shadow-2xs pr-10"
              >
                <option value="hotel">Khách sạn (Hotel)</option>
                <option value="resort">Khu nghỉ dưỡng (Resort)</option>
                <option value="homestay">Homestay</option>
                <option value="villa">Biệt thự (Villa)</option>
                <option value="apartment">Căn hộ dịch vụ (Apartment)</option>
              </select>
              <ChevronDown
                size={18}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── KHỐI 3: ĐỊA CHỈ (KHỚP 100% ẢNH MẪU BOOKING.COM) ── */}
      <div className="p-5 sm:p-7 bg-slate-50/80 border border-slate-200 rounded-2xl space-y-4 shadow-xs">
        <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <MapPin size={16} className="text-[#006ce4]" /> 3. Chỗ nghỉ tọa lạc ở
          đâu?
        </h2>

        {/* 1. ĐỊA CHỈ PHỐ */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Địa chỉ phố *
          </label>
          <input
            type="text"
            value={data?.address || ""}
            onChange={(e) => onChange({ address: e.target.value })}
            placeholder="Ví dụ: 123 Điện Biên Phủ"
            className={`w-full h-11 sm:h-12 px-4 text-xs sm:text-sm font-semibold bg-white rounded-xl border ${
              errors?.address
                ? "border-rose-500 bg-rose-50/20"
                : "border-slate-300 focus:border-[#006ce4] focus:ring-2 focus:ring-blue-100"
            } outline-none transition shadow-2xs`}
          />
          {errors?.address && (
            <p className="text-xs text-rose-500 font-bold mt-1.5">
              {errors.address}
            </p>
          )}
        </div>

        {/* 2. DÒNG ĐỊA CHỈ 2 */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Dòng địa chỉ 2
          </label>
          <input
            type="text"
            value={data?.buildingInfo || ""}
            onChange={(e) => onChange({ buildingInfo: e.target.value })}
            placeholder="Số nhà, tầng, tòa nhà, v.v..."
            className="w-full h-11 sm:h-12 px-4 text-xs sm:text-sm font-medium bg-white rounded-xl border border-slate-300 focus:border-[#006ce4] focus:ring-2 focus:ring-blue-100 outline-none transition shadow-2xs"
          />
        </div>

        {/* 3. VÙNG/QUỐC GIA & 4. THÀNH PHỐ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Vùng/quốc gia
            </label>
            <div className="relative">
              <select
                value={data?.residenceCountry || "Việt Nam"}
                onChange={(e) => onChange({ residenceCountry: e.target.value })}
                className="w-full h-11 sm:h-12 px-4 text-xs sm:text-sm font-bold bg-white rounded-xl border border-slate-300 appearance-none cursor-pointer outline-none focus:border-[#006ce4] focus:ring-2 focus:ring-blue-100 shadow-2xs pr-10"
              >
                <option value="Việt Nam">Việt Nam</option>
                <option value="Thái Lan">Thái Lan</option>
                <option value="Singapore">Singapore</option>
                <option value="Malaysia">Malaysia</option>
              </select>
              <ChevronDown
                size={18}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Thành phố *
            </label>
            <input
              type="text"
              value={data?.city || ""}
              onChange={(e) =>
                onChange({
                  city: e.target.value,
                  province: e.target.value,
                })
              }
              placeholder="v.d: Hồ Chí Minh, Hà Nội, Đà Nẵng..."
              className={`w-full h-11 sm:h-12 px-4 text-xs sm:text-sm font-bold bg-white rounded-xl border ${
                errors?.city
                  ? "border-rose-500 bg-rose-50/20"
                  : "border-slate-300 focus:border-[#006ce4] focus:ring-2 focus:ring-blue-100"
              } outline-none transition shadow-2xs`}
            />
            {errors?.city && (
              <p className="text-xs text-rose-500 font-bold mt-1.5">
                {errors.city}
              </p>
            )}
          </div>
        </div>

        {/* 5. MÃ BƯU CHÍNH */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Mã bưu chính
          </label>
          <input
            type="text"
            value={data?.zipCode || ""}
            onChange={(e) => onChange({ zipCode: e.target.value })}
            placeholder="700000"
            className="w-40 sm:w-44 h-11 sm:h-12 px-4 text-xs sm:text-sm font-semibold bg-white rounded-xl border border-slate-300 focus:border-[#006ce4] focus:ring-2 focus:ring-blue-100 outline-none transition shadow-2xs"
          />
        </div>
      </div>
    </div>
  );
};

export default Step1HotelInfo;
