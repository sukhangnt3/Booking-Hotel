// src/components/auth/RegisterForm/Step7HostProfile.jsx
import React, { useState, useEffect } from "react";
import { ChevronDown, Info, Lock } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";

export const Step7HostProfile = ({
  data = {},
  onChange = () => {},
  errors = {},
}) => {
  const { user, isAuthenticated } = useAuthStore();
  const isExistingOwner = Boolean(isAuthenticated && user && user.email);

  // Tách Họ và Tên từ ownerName nếu có sẵn
  const [firstName, setFirstName] = useState(data?.firstName || "");
  const [lastName, setLastName] = useState(data?.lastName || "");

  useEffect(() => {
    if (data?.ownerName && !firstName && !lastName) {
      const parts = data.ownerName.trim().split(" ");
      if (parts.length > 1) {
        setLastName(parts[0]);
        setFirstName(parts.slice(1).join(" "));
      } else {
        setFirstName(parts[0] || "");
      }
    }
  }, [data?.ownerName]);

  const handleFirstNameChange = (e) => {
    const val = e.target.value;
    setFirstName(val);
    const fullName = `${lastName} ${val}`.trim();
    onChange({ firstName: val, ownerName: fullName, signerName: fullName });
  };

  const handleLastNameChange = (e) => {
    const val = e.target.value;
    setLastName(val);
    const fullName = `${val} ${firstName}`.trim();
    onChange({ lastName: val, ownerName: fullName, signerName: fullName });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-7 font-sans text-slate-800 animate-fadeIn">
      {/* ── TIÊU ĐỀ BƯỚC 7 CHUẨN AGODA ── */}
      <div>
        <div className="flex items-center justify-between text-xs text-slate-400 font-bold mb-1">
          <span>Bước 7/8</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Hồ sơ
        </h1>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          KHU VỰC 1: THÔNG TIN CHI TIẾT TÀI KHOẢN (KHUNG XÁM AGODA)
      ════════════════════════════════════════════════════════════════════════ */}
      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Thông tin chi tiết tài khoản
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed mt-0.5">
            Vui lòng cung cấp tên hợp pháp đầy đủ của quý đối tác tại đây để lập
            hợp đồng với hệ thống. Chúng tôi sẽ liên hệ nếu cần thêm thông tin
            để đăng cơ sở lưu trú của quý đối tác.
          </p>
        </div>

        {/* Khung xám thông tin cá nhân */}
        <div className="p-5 rounded-3xl bg-slate-50 border border-slate-200 space-y-4 shadow-2xs">
          <div>
            <span className="text-xs font-bold text-slate-800 block mb-2">
              Thông tin cá nhân
            </span>

            {/* Hàng Tên & Họ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                  Tên *
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={handleFirstNameChange}
                  placeholder="VD: Khang"
                  className={`w-full h-11 px-3.5 text-xs font-semibold bg-white rounded-xl border ${
                    errors?.ownerName
                      ? "border-rose-500 bg-rose-50/20"
                      : "border-slate-300"
                  } outline-none focus:border-blue-600 transition`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                  Họ *
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={handleLastNameChange}
                  placeholder="VD: Su"
                  className={`w-full h-11 px-3.5 text-xs font-semibold bg-white rounded-xl border ${
                    errors?.ownerName
                      ? "border-rose-500 bg-rose-50/20"
                      : "border-slate-300"
                  } outline-none focus:border-blue-600 transition`}
                />
              </div>
            </div>
          </div>

          {/* Quốc tịch */}
          <div className="relative">
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              Quốc tịch
            </label>
            <select
              value={data?.nationality || "Việt Nam"}
              onChange={(e) => onChange({ nationality: e.target.value })}
              className="w-full h-11 px-3.5 text-xs font-semibold bg-white rounded-xl border border-slate-300 text-slate-900 appearance-none cursor-pointer outline-none focus:border-blue-600"
            >
              <option value="Việt Nam">Việt Nam</option>
              <option value="Hoa Kỳ">Hoa Kỳ</option>
              <option value="Hàn Quốc">Hàn Quốc</option>
              <option value="Nhật Bản">Nhật Bản</option>
              <option value="Khác">Quốc tịch khác</option>
            </select>
            <ChevronDown
              size={16}
              className="absolute right-3.5 top-8 text-slate-400 pointer-events-none"
            />
          </div>

          {/* Ngày sinh (Cột dob trong bảng users) */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              Ngày sinh (Cột dob)
            </label>
            <input
              type="date"
              value={data?.dob || "1995-01-01"}
              onChange={(e) => onChange({ dob: e.target.value })}
              className="w-full h-11 px-3.5 text-xs font-semibold bg-white rounded-xl border border-slate-300 text-slate-900 outline-none focus:border-blue-600 cursor-pointer"
            />
          </div>

          {/* Thông tin cư trú */}
          <div className="pt-2 border-t border-slate-200/70">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-xs font-bold text-slate-800">
                Thông tin cư trú
              </span>
              <Info size={13} className="text-slate-400" />
            </div>

            <div className="relative">
              <select
                value={data?.residenceCountry || "Việt Nam"}
                onChange={(e) => onChange({ residenceCountry: e.target.value })}
                className="w-full h-11 px-3.5 text-xs font-semibold bg-white rounded-xl border border-slate-300 text-slate-900 appearance-none cursor-pointer outline-none focus:border-blue-600"
              >
                <option value="Việt Nam">Việt Nam</option>
              </select>
              <ChevronDown
                size={16}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          KHU VỰC 2: THÔNG TIN LIÊN LẠC CHI TIẾT (KHUNG XÁM AGODA)
      ════════════════════════════════════════════════════════════════════════ */}
      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Thông tin liên lạc chi tiết
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed mt-0.5">
            Hệ thống sẽ liên hệ với quý đối tác bằng ngôn ngữ yêu thích của quý
            đối tác và cung cấp số điện thoại cho khách sau khi họ đặt phòng.
          </p>
        </div>

        {/* Khung xám thông tin liên lạc */}
        <div className="p-5 rounded-3xl bg-slate-50 border border-slate-200 space-y-4 shadow-2xs">
          {/* Ngôn ngữ yêu thích */}
          <div className="relative">
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              Ngôn ngữ yêu thích
            </label>
            <select
              value={data?.preferredLanguage || "Tiếng Việt"}
              onChange={(e) => onChange({ preferredLanguage: e.target.value })}
              className="w-full h-11 px-3.5 text-xs font-semibold bg-white rounded-xl border border-slate-300 text-slate-900 appearance-none cursor-pointer outline-none focus:border-blue-600"
            >
              <option value="Tiếng Việt">Tiếng Việt (Vietnamese)</option>
              <option value="English">English</option>
            </select>
            <ChevronDown
              size={16}
              className="absolute right-3.5 top-8 text-slate-400 pointer-events-none"
            />
          </div>

          {/* Mã quốc gia & Số điện thoại */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              Số điện thoại liên hệ *
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
              <div className="relative">
                <select
                  disabled
                  value="+84"
                  className="w-full h-11 px-2.5 text-xs font-bold bg-slate-100 rounded-xl border border-slate-300 text-slate-700 appearance-none cursor-not-allowed outline-none"
                >
                  <option value="+84">+84 (VN)</option>
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
              </div>

              <div className="col-span-2 sm:col-span-3">
                <input
                  type="tel"
                  value={data?.phoneContact || ""}
                  onChange={(e) => onChange({ phoneContact: e.target.value })}
                  placeholder="Số điện thoại di động"
                  className={`w-full h-11 px-3.5 text-xs font-semibold bg-white rounded-xl border ${
                    errors?.phoneContact
                      ? "border-rose-500 bg-rose-50/20"
                      : "border-slate-300"
                  } outline-none focus:border-blue-600 transition`}
                />
              </div>
            </div>
            {errors?.phoneContact && (
              <p className="text-xs text-rose-500 mt-1">
                {errors.phoneContact}
              </p>
            )}
          </div>

          {/* Hộp Email màu xanh nhạt (Chuẩn ảnh Agoda) */}
          <div className="p-3.5 rounded-2xl bg-blue-50/80 border border-blue-100 space-y-1">
            <label className="block text-[11px] font-medium text-slate-500">
              Email
            </label>
            {isExistingOwner ? (
              <p className="text-xs font-bold text-slate-900 font-mono">
                {user?.email || data?.emailContact}
              </p>
            ) : (
              <input
                type="email"
                value={data?.emailContact || ""}
                onChange={(e) => onChange({ emailContact: e.target.value })}
                placeholder="vidu@gmail.com"
                className="w-full h-9 px-3 text-xs font-bold text-slate-900 bg-white rounded-lg border border-slate-300 outline-none focus:border-blue-600 font-mono"
              />
            )}
          </div>

          {/* Mật khẩu nếu chưa đăng nhập */}
          {!isExistingOwner && (
            <div className="pt-2 border-t border-slate-200/70">
              <label className="block text-[11px] font-medium text-slate-500 mb-1 flex items-center gap-1">
                <Lock size={12} className="text-blue-600" /> Mật khẩu đăng nhập
                Extranet *
              </label>
              <input
                type="password"
                value={data?.password || ""}
                onChange={(e) => onChange({ password: e.target.value })}
                placeholder="Tối thiểu 6 ký tự"
                className={`w-full h-11 px-3.5 text-xs font-semibold bg-white rounded-xl border ${
                  errors?.password
                    ? "border-rose-500 bg-rose-50/20"
                    : "border-slate-300"
                } outline-none focus:border-blue-600`}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Step7HostProfile;
