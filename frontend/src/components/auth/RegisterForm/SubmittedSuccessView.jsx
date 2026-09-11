// src/components/auth/RegisterForm/SubmittedSuccessView.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  Clock,
  Printer,
  Building2,
  ArrowRight,
} from "lucide-react";

export const SubmittedSuccessView = ({
  application = {},
  onReset = () => {},
}) => {
  const navigate = useNavigate();
  const applicationId =
    application?.applicationId || `GST-${Date.now().toString().slice(-6)}`;
  const submittedAt = application?.submittedAt || new Date().toISOString();

  return (
    <div className="max-w-3xl mx-auto py-12 px-4 space-y-6 animate-fadeIn font-sans text-slate-800">
      <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-10 shadow-sm text-center relative overflow-hidden space-y-4">
        <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
          <CheckCircle2 size={36} />
        </div>

        <span className="inline-block text-[11px] font-black uppercase tracking-wider px-3.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
          Hồ sơ đã tiếp nhận • Sẵn sàng mở bán
        </span>

        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Chúc Mừng! Cơ Sở Lưu Trú Đã Được Đăng Tải
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto leading-relaxed">
          Hồ sơ chỗ nghỉ của quý đối tác đã được ghi nhận vào cơ sở dữ liệu
          GoStay và đang được kích hoạt lên hệ thống tìm kiếm trực tuyến.
        </p>

        <div className="mt-4 inline-flex flex-col items-center bg-[#003580] text-white px-8 py-3.5 rounded-2xl shadow-md">
          <span className="text-[10px] text-blue-200 font-black uppercase tracking-widest">
            Mã định danh chỗ nghỉ (Hotel ID)
          </span>
          <span className="text-2xl font-mono font-black text-amber-400 tracking-wider my-0.5">
            {applicationId}
          </span>
          <span className="text-[10px] text-blue-100 font-medium">
            Thời gian tạo: {new Date(submittedAt).toLocaleString("vi-VN")}
          </span>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-5">
        <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
          <Clock size={16} className="text-[#006ce4]" /> Lộ trình xử lý mở bán
          trên sàn
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          {[
            { step: 1, title: "Tiếp nhận dữ liệu", status: "completed" },
            { step: 2, title: "Đồng bộ hình ảnh", status: "completed" },
            { step: 3, title: "Kích hoạt giá phòng", status: "active" },
            { step: 4, title: "Mở bán tìm kiếm", status: "pending" },
          ].map((s) => (
            <div
              key={s.step}
              className={`p-3.5 rounded-2xl border flex flex-col justify-between ${
                s.status === "completed"
                  ? "bg-emerald-50/60 border-emerald-300"
                  : s.status === "active"
                    ? "bg-[#e8f2ff] border-[#006ce4] ring-1 ring-[#006ce4]"
                    : "bg-slate-50 border-slate-200 opacity-60"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                    s.status === "completed"
                      ? "bg-emerald-600 text-white"
                      : s.status === "active"
                        ? "bg-[#003580] text-white animate-pulse"
                        : "bg-slate-300 text-slate-600"
                  }`}
                >
                  {s.status === "completed" ? "✓" : s.step}
                </span>
                {s.status === "active" && (
                  <span className="text-[9px] font-black text-[#006ce4]">
                    Đang xử lý
                  </span>
                )}
              </div>
              <h4 className="font-black text-slate-900">{s.title}</h4>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={() => navigate("/owner/hotels")}
          className="w-full sm:w-auto px-8 h-12 bg-[#003580] hover:bg-blue-900 text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-[0.98] transition"
        >
          <Building2 size={16} /> Về Trung tâm quản lý chỗ nghỉ{" "}
          <ArrowRight size={14} />
        </button>

        <button
          type="button"
          onClick={() => window.print()}
          className="w-full sm:w-auto px-6 h-12 border border-slate-300 hover:bg-slate-50 rounded-xl font-bold text-xs text-slate-700 flex items-center justify-center gap-2 cursor-pointer transition"
        >
          <Printer size={15} /> In giấy xác nhận
        </button>
      </div>
    </div>
  );
};

export default SubmittedSuccessView;
