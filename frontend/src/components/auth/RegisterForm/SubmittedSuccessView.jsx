import React from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Clock, Printer, Home } from "lucide-react";

export const SubmittedSuccessView = ({
  application = {},
  onReset = () => {},
}) => {
  const navigate = useNavigate();
  const data = application?.data || {};
  const applicationId =
    application?.applicationId || `GST-${Date.now().toString().slice(-6)}`;
  const submittedAt = application?.submittedAt || new Date().toISOString();

  // ════════════════════════════════════════════════════════════════════════════
  // 🟢 VỀ TRANG CHỦ: GIỮ NGUYÊN PHIÊN ĐĂNG NHẬP CỦA TÀI KHOẢN KHÁCH HÀNG
  // ════════════════════════════════════════════════════════════════════════════
  const handleGoHome = () => {
    navigate("/"); // Chuyển về trang chủ bình thường, giữ nguyên đăng nhập
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 space-y-8 animate-fadeIn font-sans text-slate-800">
      {/* SUCCESS HERO CARD */}
      <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-10 shadow-sm text-center relative overflow-hidden">
        <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <span className="text-xs font-bold px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full uppercase tracking-wider">
          Đăng ký thành công • Chờ duyệt
        </span>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-4 mb-2">
          Hồ Sơ Đã Được Tiếp Nhận Vào Hệ Thống!
        </h1>
        <p className="text-sm text-slate-500 max-w-lg mx-auto leading-relaxed">
          Cảm ơn bạn đã đăng ký trở thành Đối tác của GoStay. Ban quản trị hệ
          thống sẽ thẩm định hồ sơ pháp lý và kích hoạt tài khoản của bạn trong
          24h - 48h.
        </p>

        {/* TRACKING CODE */}
        <div className="mt-6 inline-flex flex-col items-center bg-slate-900 text-white px-8 py-4 rounded-xl shadow-sm">
          <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-widest">
            Mã Hồ Sơ Đối Tác (Tracking Code)
          </span>
          <span className="text-xl sm:text-2xl font-mono font-black text-amber-400 tracking-wider my-1">
            {applicationId}
          </span>
          <span className="text-[10px] text-slate-400">
            Thời gian nộp: {new Date(submittedAt).toLocaleString("vi-VN")}
          </span>
        </div>
      </div>

      {/* 4 BƯỚC THẨM ĐỊNH */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
          <Clock className="w-5 h-5 text-blue-600" /> Quy trình 4 Bước Thẩm Định
          & Mở Bán
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 relative">
          {[
            {
              step: 1,
              title: "Tiếp nhận hồ sơ",
              desc: "Hệ thống đã lưu trữ dữ liệu & bộ ảnh",
              status: "completed",
            },
            {
              step: 2,
              title: "Thẩm định pháp lý",
              desc: "Kiểm tra GPKD & Tài khoản ngân hàng",
              status: "active",
            },
            {
              step: 3,
              title: "Ký hợp đồng E-sign",
              desc: "Gửi hợp đồng điện tử qua email",
              status: "pending",
            },
            {
              step: 4,
              title: "Mở bán trên OTA",
              desc: "Kích hoạt tài khoản Owner Portal",
              status: "pending",
            },
          ].map((s) => (
            <div
              key={s.step}
              className={`p-4 rounded-xl border flex flex-col justify-between ${
                s.status === "completed"
                  ? "bg-emerald-50/60 border-emerald-300"
                  : s.status === "active"
                    ? "bg-blue-50/70 border-blue-400 shadow-2xs"
                    : "bg-slate-50 border-slate-200 opacity-60"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      s.status === "completed"
                        ? "bg-emerald-600 text-white"
                        : s.status === "active"
                          ? "bg-blue-600 text-white animate-pulse"
                          : "bg-slate-300 text-slate-700"
                    }`}
                  >
                    {s.status === "completed" ? "✓" : s.step}
                  </span>
                  {s.status === "active" && (
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">
                      Đang xử lý
                    </span>
                  )}
                </div>
                <h4 className="text-xs font-bold text-slate-900">{s.title}</h4>
                <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                  {s.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CÁC NÚT ĐIỀU HƯỚNG */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
        <button
          type="button"
          onClick={handleGoHome}
          className="w-full sm:w-auto px-8 h-11 bg-[#003580] hover:bg-blue-900 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition cursor-pointer shadow-md"
        >
          <Home className="w-4 h-4" /> Về trang chủ GoStay
        </button>

        <button
          type="button"
          onClick={handlePrint}
          className="w-full sm:w-auto px-6 h-11 border border-slate-200 hover:bg-slate-50 rounded-xl font-bold text-xs text-slate-700 flex items-center justify-center gap-2 transition cursor-pointer"
        >
          <Printer className="w-4 h-4" /> In phiếu đăng ký
        </button>
      </div>
    </div>
  );
};

export default SubmittedSuccessView;
