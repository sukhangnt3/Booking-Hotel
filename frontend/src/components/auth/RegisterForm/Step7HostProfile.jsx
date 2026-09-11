// src/components/auth/RegisterForm/Step7HostProfile.jsx
import React from "react";
import { Lock, Sparkles, UserCheck } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";

export const Step7HostProfile = ({
  data = {},
  onChange = () => {},
  errors = {},
}) => {
  const { user, isAuthenticated } = useAuthStore();
  const isExistingOwner = Boolean(isAuthenticated && user && user.email);

  return (
    <div className="space-y-6 font-sans text-slate-800 animate-fadeIn">
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

      <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Họ và tên người đại diện *
            </label>
            <input
              type="text"
              value={data?.ownerName || ""}
              onChange={(e) => onChange({ ownerName: e.target.value })}
              placeholder="VD: Nguyễn Văn An"
              className={`w-full h-11 px-3.5 text-xs font-bold bg-white rounded-xl border ${
                errors?.ownerName
                  ? "border-rose-500 bg-rose-50/20"
                  : "border-slate-300 focus:border-[#006ce4]"
              } outline-none transition`}
            />
            {errors?.ownerName && (
              <p className="text-xs text-rose-500 font-bold mt-1">
                {errors.ownerName}
              </p>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Số điện thoại di động *
            </label>
            <input
              type="tel"
              value={data?.phoneContact || ""}
              onChange={(e) => onChange({ phoneContact: e.target.value })}
              placeholder="VD: 0909123456"
              className={`w-full h-11 px-3.5 text-xs font-bold bg-white rounded-xl border ${
                errors?.phoneContact
                  ? "border-rose-500 bg-rose-50/20"
                  : "border-slate-300 focus:border-[#006ce4]"
              } outline-none transition`}
            />
            {errors?.phoneContact && (
              <p className="text-xs text-rose-500 font-bold mt-1">
                {errors.phoneContact}
              </p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1">
            Email nhận thông báo đặt phòng *
          </label>
          <input
            type="email"
            value={data?.emailContact || ""}
            onChange={(e) => onChange({ emailContact: e.target.value })}
            placeholder="partner@example.com"
            className="w-full h-11 px-3.5 text-xs font-bold bg-white rounded-xl border border-slate-300 focus:border-[#006ce4] outline-none"
          />
        </div>

        {!isExistingOwner && (
          <div className="pt-2 border-t border-slate-200">
            <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
              <Lock size={12} className="text-[#006ce4]" /> Mật khẩu đăng nhập
              cổng đối tác Extranet *
            </label>
            <input
              type="password"
              value={data?.password || ""}
              onChange={(e) => onChange({ password: e.target.value })}
              placeholder="Tối thiểu 6 ký tự bảo mật"
              className="w-full h-11 px-3.5 text-xs font-bold bg-white rounded-xl border border-slate-300 focus:border-[#006ce4] outline-none"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Step7HostProfile;
