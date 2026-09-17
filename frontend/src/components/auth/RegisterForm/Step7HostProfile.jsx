// src/components/auth/RegisterForm/Step7HostProfile.jsx
import React, { useState } from "react";
import { Lock, Sparkles, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";

export const Step7HostProfile = ({
  data = {},
  onChange = () => {},
  errors = {},
}) => {
  const { user, isAuthenticated } = useAuthStore();
  const isExistingOwner = Boolean(isAuthenticated && user && user.email);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="space-y-6 font-sans text-slate-800 animate-in fade-in">
      <div>
        <div className="flex items-center gap-1.5 text-xs font-black text-[#003580] uppercase tracking-wider mb-1">
          <Sparkles size={14} className="text-[#006ce4]" /> Bước 7 / 8: Hồ sơ
          đối tác quản trị
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Thông tin chủ sở hữu & Quản trị viên
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Thông tin dùng để ký kết hợp đồng điện tử và nhận thông báo đặt phòng
          tức thì qua SMS/Email.
        </p>
      </div>

      {isExistingOwner && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-800 font-bold">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>
            Hồ sơ cơ sở lưu trú này sẽ được liên kết trực tiếp với tài khoản đối
            tác đang đăng nhập.
          </span>
        </div>
      )}

      <div className="p-5 sm:p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 shadow-2xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Họ và tên người đại diện *
            </label>
            <input
              type="text"
              value={data?.ownerName || ""}
              onChange={(e) => onChange({ ownerName: e.target.value })}
              placeholder="VD: Nguyễn Văn An"
              className={`w-full h-11 px-3.5 text-xs sm:text-sm font-bold bg-white rounded-xl border ${
                errors?.ownerName
                  ? "border-rose-500 bg-rose-50/20"
                  : "border-slate-300 focus:border-[#006ce4]"
              } outline-none transition`}
            />
            {errors?.ownerName && (
              <p className="text-xs text-rose-500 font-bold mt-1.5">
                {errors.ownerName}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Số điện thoại di động *
            </label>
            <input
              type="tel"
              value={data?.phoneContact || ""}
              onChange={(e) => onChange({ phoneContact: e.target.value })}
              placeholder="VD: 0909123456"
              className={`w-full h-11 px-3.5 text-xs sm:text-sm font-bold bg-white rounded-xl border ${
                errors?.phoneContact
                  ? "border-rose-500 bg-rose-50/20"
                  : "border-slate-300 focus:border-[#006ce4]"
              } outline-none transition`}
            />
            {errors?.phoneContact && (
              <p className="text-xs text-rose-500 font-bold mt-1.5">
                {errors.phoneContact}
              </p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Email nhận thông báo đặt phòng *
          </label>
          <input
            type="email"
            value={data?.emailContact || ""}
            onChange={(e) => onChange({ emailContact: e.target.value })}
            placeholder="partner@example.com"
            className="w-full h-11 px-3.5 text-xs sm:text-sm font-bold bg-white rounded-xl border border-slate-300 focus:border-[#006ce4] outline-none"
          />
          <p className="text-[11px] text-slate-400 mt-1">
            Thông báo đơn phòng mới và biến động doanh thu sẽ gửi về email này.
          </p>
        </div>

        {!isExistingOwner && (
          <div className="pt-3 border-t border-slate-200">
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Lock size={14} className="text-[#006ce4]" /> Mật khẩu đăng nhập
              cổng đối tác Extranet *
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={data?.password || ""}
                onChange={(e) => onChange({ password: e.target.value })}
                placeholder="Tối thiểu 6 ký tự bảo mật"
                className="w-full h-11 pl-3.5 pr-10 text-xs sm:text-sm font-bold bg-white rounded-xl border border-slate-300 focus:border-[#006ce4] outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Step7HostProfile;
