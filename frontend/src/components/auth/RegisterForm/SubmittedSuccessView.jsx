// src/components/auth/RegisterForm/SubmittedSuccessView.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  Clock,
  Printer,
  Building2,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

export const SubmittedSuccessView = ({
  application = {},
  onReset = () => {},
}) => {
  const navigate = useNavigate();
  const data = application?.data || {};
  const applicationId =
    application?.applicationId || `AGD-${Date.now().toString().slice(-6)}`;
  const submittedAt = application?.submittedAt || new Date().toISOString();

  // 👉 Chuyển về trang Quản trị cơ sở lưu trú của Owner
  const handleGoToOwnerHotels = () => {
    navigate("/owner/hotels");
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 space-y-6 animate-fadeIn font-sans text-slate-800">
      {/* ── THẺ THÔNG BÁO THÀNH CÔNG CHÍNH ── */}
      <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-10 shadow-xs text-center relative overflow-hidden space-y-4">
        <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-xs">
          <CheckCircle2 size={32} />
        </div>

        <span className="inline-block text-[11px] font-black uppercase tracking-wider px-3.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
          Đăng ký thành công • Đang chờ duyệt mở bán
        </span>

        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Hồ Sơ Chỗ Nghỉ Đã Được Tiếp Nhận!
        </h1>
        <p className="text-xs text-slate-500 max-w-lg mx-auto leading-relaxed">
          Cảm ơn quý đối tác đã hoàn tất đăng tải cơ sở lưu trú. Ban quản trị hệ
          thống sẽ thẩm định hồ sơ pháp lý và kích hoạt trạng thái mở bán trong
          vòng 24 giờ.
        </p>

        {/* MÃ TRACKING HỒ SƠ */}
        <div className="mt-4 inline-flex flex-col items-center bg-slate-900 text-white px-8 py-3.5 rounded-2xl shadow-sm">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            Mã Hồ Sơ Đối Tác (Tracking Code)
          </span>
          <span className="text-2xl font-mono font-black text-amber-400 tracking-wider my-0.5">
            {applicationId}
          </span>
          <span className="text-[10px] text-slate-400">
            Thời gian nộp: {new Date(submittedAt).toLocaleString("vi-VN")}
          </span>
        </div>
      </div>

      {/* ── QUY TRÌNH 4 BƯỚC THẨM ĐỊNH HỒ SƠ ── */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-5">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
          <Clock size={16} className="text-blue-600" /> Quy trình thẩm định & mở
          bán cơ sở
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          {[
            {
              step: 1,
              title: "Tiếp nhận hồ sơ",
              desc: "Dữ liệu & hình ảnh đã lưu",
              status: "completed",
            },
            {
              step: 2,
              title: "Thẩm định pháp lý",
              desc: "Đối soát GPKD & STK Ngân hàng",
              status: "active",
            },
            {
              step: 3,
              title: "Ký hợp đồng OTA",
              desc: "Gửi hợp đồng qua email",
              status: "pending",
            },
            {
              step: 4,
              title: "Mở bán trực tuyến",
              desc: "Kích hoạt trên cổng tìm kiếm",
              status: "pending",
            },
          ].map((s) => (
            <div
              key={s.step}
              className={`p-3.5 rounded-2xl border flex flex-col justify-between ${
                s.status === "completed"
                  ? "bg-emerald-50/60 border-emerald-300"
                  : s.status === "active"
                    ? "bg-blue-50/70 border-blue-400 shadow-2xs ring-1 ring-blue-400"
                    : "bg-slate-50 border-slate-200 opacity-60"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      s.status === "completed"
                        ? "bg-emerald-600 text-white"
                        : s.status === "active"
                          ? "bg-blue-600 text-white animate-pulse"
                          : "bg-slate-300 text-slate-600"
                    }`}
                  >
                    {s.status === "completed" ? "✓" : s.step}
                  </span>
                  {s.status === "active" && (
                    <span className="text-[9px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">
                      Đang xử lý
                    </span>
                  )}
                </div>
                <h4 className="font-bold text-slate-900">{s.title}</h4>
                <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                  {s.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── CÁC NÚT ĐIỀU HƯỚNG CHUẨN OWNER PORTAL ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        {/* Nút chính: Đưa chủ cơ sở về trang Quản trị chỗ nghỉ của họ */}
        <button
          type="button"
          onClick={handleGoToOwnerHotels}
          className="w-full sm:w-auto px-8 h-12 bg-[#003580] hover:bg-blue-900 text-white font-bold text-xs rounded-full flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-95 transition"
        >
          <Building2 size={16} /> Quản lý danh sách cơ sở chỗ nghỉ{" "}
          <ArrowRight size={14} />
        </button>

        <button
          type="button"
          onClick={handlePrint}
          className="w-full sm:w-auto px-6 h-12 border border-slate-300 hover:bg-slate-50 rounded-full font-bold text-xs text-slate-700 flex items-center justify-center gap-2 cursor-pointer transition"
        >
          <Printer size={15} /> In phiếu tiếp nhận hồ sơ
        </button>
      </div>
    </div>
  );
};

export default SubmittedSuccessView;
