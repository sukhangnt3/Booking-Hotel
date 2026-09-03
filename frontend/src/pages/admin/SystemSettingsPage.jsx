// src/pages/admin/SystemSettingsPage.jsx
import React, { useState, useEffect } from "react";
import {
  Settings,
  Building2,
  Mail,
  CreditCard,
  ShieldCheck,
  Save,
  CheckCircle2,
  HardDrive,
  Globe,
  Bell,
  Lock,
} from "lucide-react";

export default function SystemSettingsPage() {
  const [activeTab, setActiveTab] = useState("general"); // general | mail | payment | security
  const [savedSuccess, setSavedSuccess] = useState(false);

  const [settings, setSettings] = useState({
    // 1. Thông tin khách sạn
    hotelName: "BezTower & Residences",
    hotelEmail: "contact@beztower.com",
    hotelPhone: "1900 1870",
    hotelAddress: "215 Nam Kỳ Khởi Nghĩa, Quận 3, TP. Hồ Chí Minh",
    starRating: 5,

    // 2. Cấu hình Mail SMTP (.env settings)
    mailDriver: "smtp",
    mailHost: "smtp.gmail.com",
    mailPort: 587,
    mailUsername: "noreply@beztower.com",
    mailPassword: "••••••••••••",
    mailEncryption: "tls",
    mailFromName: "BezTower and Residences",

    // 3. Cấu hình Thanh toán VietQR & Thuế
    bankId: "MB",
    bankName: "Ngân hàng Quân Đội (MBBank)",
    accountNumber: "0833404928",
    accountName: "SU TRACH KHANG",
    vatRate: 8,
    bookingHoldMinutes: 15,

    // 4. Giới hạn hệ thống
    maxUploadSizeMB: 5,
    allowAutoConfirmPayment: true,
  });

  useEffect(() => {
    const saved = JSON.parse(
      localStorage.getItem("pms_system_settings") || "null",
    );
    if (saved) setSettings(saved);
  }, []);

  const handleSave = (e) => {
    e.preventDefault();
    localStorage.setItem("pms_system_settings", JSON.stringify(settings));
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 font-sans pb-16 text-slate-800">
      {/* Toast thông báo lưu */}
      {savedSuccess && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-5 py-3.5 rounded-2xl shadow-2xl text-white font-bold text-sm bg-slate-900 animate-in slide-in-from-bottom-5">
          <CheckCircle2 size={18} className="text-emerald-400" />
          <span>✓ Đã lưu toàn bộ cấu hình hệ thống thành công!</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider mb-1">
            <Settings size={16} /> Cấu Hình Hệ Thống (System Settings & Config)
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Thiết Lập Quản Trị Hệ Thống PMS
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Cấu hình thông tin chỗ nghỉ, máy chủ gửi Mail SMTP, tài khoản VietQR
            và hạn mức tải file 5MB
          </p>
        </div>

        <button
          onClick={handleSave}
          className="px-6 py-3 bg-[#003580] hover:bg-blue-900 text-white font-bold text-xs rounded-2xl shadow-md transition flex items-center gap-2 cursor-pointer active:scale-95"
        >
          <Save size={16} /> Lưu Cấu Hình
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-3 overflow-x-auto">
        {[
          { id: "general", label: "Thông Tin Chỗ Nghỉ", icon: Building2 },
          { id: "mail", label: "Cấu Hình Mail (SMTP)", icon: Mail },
          { id: "payment", label: "Thanh Toán & VietQR", icon: CreditCard },
          { id: "security", label: "Giới Hạn & Bảo Mật", icon: ShieldCheck },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                activeTab === tab.id
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-white text-slate-600 hover:bg-slate-50 border"
              }`}
            >
              <Icon size={15} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Nội dung cấu hình */}
      <form
        onSubmit={handleSave}
        className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-2xs space-y-6 text-xs"
      >
        {/* 1. THÔNG TIN CHUNG */}
        {activeTab === "general" && (
          <div className="space-y-4 animate-in fade-in">
            <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
              <Building2 size={16} className="text-blue-600" /> Thông Tin Cơ Sở
              Lưu Trú
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Tên khách sạn / Tòa nhà *
                </label>
                <input
                  value={settings.hotelName}
                  onChange={(e) =>
                    setSettings({ ...settings, hotelName: e.target.value })
                  }
                  className="w-full p-2.5 border rounded-xl font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Số hotline hỗ trợ *
                </label>
                <input
                  value={settings.hotelPhone}
                  onChange={(e) =>
                    setSettings({ ...settings, hotelPhone: e.target.value })
                  }
                  className="w-full p-2.5 border rounded-xl font-mono font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Email liên hệ lễ tân *
                </label>
                <input
                  type="email"
                  value={settings.hotelEmail}
                  onChange={(e) =>
                    setSettings({ ...settings, hotelEmail: e.target.value })
                  }
                  className="w-full p-2.5 border rounded-xl font-mono"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Địa chỉ chỗ nghỉ *
                </label>
                <input
                  value={settings.hotelAddress}
                  onChange={(e) =>
                    setSettings({ ...settings, hotelAddress: e.target.value })
                  }
                  className="w-full p-2.5 border rounded-xl"
                />
              </div>
            </div>
          </div>
        )}

        {/* 2. CẤU HÌNH MAIL SMTP */}
        {activeTab === "mail" && (
          <div className="space-y-4 animate-in fade-in">
            <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
              <Mail size={16} className="text-emerald-600" /> Cấu Hình Máy Chủ
              Gửi Mail Tự Động (SMTP Mailer)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  MAIL_MAILER
                </label>
                <input
                  value={settings.mailDriver}
                  disabled
                  className="w-full p-2.5 border rounded-xl bg-slate-50 font-mono"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  MAIL_HOST
                </label>
                <input
                  value={settings.mailHost}
                  onChange={(e) =>
                    setSettings({ ...settings, mailHost: e.target.value })
                  }
                  className="w-full p-2.5 border rounded-xl font-mono"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  MAIL_PORT
                </label>
                <input
                  type="number"
                  value={settings.mailPort}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      mailPort: Number(e.target.value),
                    })
                  }
                  className="w-full p-2.5 border rounded-xl font-mono"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  MAIL_USERNAME (Email gửi)
                </label>
                <input
                  value={settings.mailUsername}
                  onChange={(e) =>
                    setSettings({ ...settings, mailUsername: e.target.value })
                  }
                  className="w-full p-2.5 border rounded-xl font-mono"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  MAIL_PASSWORD (App Password)
                </label>
                <input
                  type="password"
                  value={settings.mailPassword}
                  onChange={(e) =>
                    setSettings({ ...settings, mailPassword: e.target.value })
                  }
                  className="w-full p-2.5 border rounded-xl font-mono"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  MAIL_FROM_NAME (Tên hiển thị)
                </label>
                <input
                  value={settings.mailFromName}
                  onChange={(e) =>
                    setSettings({ ...settings, mailFromName: e.target.value })
                  }
                  className="w-full p-2.5 border rounded-xl font-bold"
                />
              </div>
            </div>
          </div>
        )}

        {/* 3. THANH TOÁN & VIETQR */}
        {activeTab === "payment" && (
          <div className="space-y-4 animate-in fade-in">
            <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
              <CreditCard size={16} className="text-blue-600" /> Cấu Hình Tài
              Khoản Nhận Tiền VietQR 24/7
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Ngân hàng thụ hưởng
                </label>
                <input
                  value={settings.bankName}
                  onChange={(e) =>
                    setSettings({ ...settings, bankName: e.target.value })
                  }
                  className="w-full p-2.5 border rounded-xl font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Số tài khoản nhận tiền
                </label>
                <input
                  value={settings.accountNumber}
                  onChange={(e) =>
                    setSettings({ ...settings, accountNumber: e.target.value })
                  }
                  className="w-full p-2.5 border rounded-xl font-mono font-bold text-blue-900 text-sm"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Tên chủ tài khoản (In hoa)
                </label>
                <input
                  value={settings.accountName}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      accountName: e.target.value.toUpperCase(),
                    })
                  }
                  className="w-full p-2.5 border rounded-xl font-bold uppercase"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Thuế VAT áp dụng (%)
                </label>
                <input
                  type="number"
                  value={settings.vatRate}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      vatRate: Number(e.target.value),
                    })
                  }
                  className="w-full p-2.5 border rounded-xl font-bold"
                />
              </div>
            </div>
          </div>
        )}

        {/* 4. GIỚI HẠN & BẢO MẬT */}
        {activeTab === "security" && (
          <div className="space-y-4 animate-in fade-in">
            <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
              <ShieldCheck size={16} className="text-purple-600" /> Hạn Mức Tải
              Lên & An Ninh Hệ Thống
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl border space-y-1">
                <label className="block font-bold text-slate-700">
                  Dung lượng tối đa mỗi ảnh (upload_max_filesize)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={settings.maxUploadSizeMB}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        maxUploadSizeMB: Number(e.target.value),
                      })
                    }
                    className="w-24 p-2 border rounded-xl font-bold text-center"
                  />
                  <span className="font-bold text-slate-600">
                    MB (Mặc định 5MB)
                  </span>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border space-y-1">
                <label className="block font-bold text-slate-700">
                  Thời gian giữ phòng tạm thời khi quét QR
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={settings.bookingHoldMinutes}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        bookingHoldMinutes: Number(e.target.value),
                      })
                    }
                    className="w-24 p-2 border rounded-xl font-bold text-center"
                  />
                  <span className="font-bold text-slate-600">Phút</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="pt-4 border-t flex justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 bg-[#003580] hover:bg-blue-900 text-white font-bold rounded-xl shadow-md cursor-pointer"
          >
            Lưu Thay Đổi
          </button>
        </div>
      </form>
    </div>
  );
}
