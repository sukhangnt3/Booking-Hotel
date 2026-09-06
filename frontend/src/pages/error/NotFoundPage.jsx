// src/pages/error/NotFoundPage.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { Home, ArrowLeft, SearchX, Building2 } from "lucide-react";

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col justify-between font-sans antialiased">
      {/* Header tối giản */}
      <header className="bg-[#003580] text-white px-6 py-4 flex justify-between items-center shadow-sm">
        <div
          onClick={() => navigate("/")}
          className="flex items-center gap-2.5 cursor-pointer"
        >
          <div className="bg-white/15 p-1.5 rounded-xl">
            <Building2 size={22} />
          </div>
          <span className="text-xl font-black tracking-tight">GoStay</span>
        </div>
        <button
          onClick={() => navigate("/")}
          className="text-xs text-blue-200 hover:text-white font-bold cursor-pointer"
        >
          Trang chủ
        </button>
      </header>

      {/* Nội dung 404 */}
      <main className="flex-1 flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white p-8 sm:p-12 rounded-3xl border border-slate-200 shadow-xl space-y-6 animate-in zoom-in-95">
          <div className="w-20 h-20 bg-blue-50 text-[#003580] rounded-3xl flex items-center justify-center mx-auto border border-blue-100 shadow-sm">
            <SearchX size={44} strokeWidth={2} />
          </div>

          <div className="space-y-2">
            <span className="text-5xl font-black text-slate-900 tracking-tight block">
              404
            </span>
            <h1 className="text-lg sm:text-xl font-black text-slate-800">
              Không tìm thấy trang này
            </h1>
            <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
              Đường dẫn bạn vừa truy cập không tồn tại hoặc chỗ nghỉ này đã được
              chuyển sang địa chỉ khác.
            </p>
          </div>

          <div className="pt-2 space-y-3">
            <button
              onClick={() => navigate("/")}
              className="w-full py-3.5 bg-[#003580] hover:bg-blue-900 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <Home size={16} /> Về trang chủ GoStay
            </button>

            <button
              onClick={() => navigate(-1)}
              className="w-full py-3 border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft size={14} /> Quay lại trang trước
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-slate-400 py-6 border-t border-slate-100 bg-white">
        <p>
          © {new Date().getFullYear()} GoStay™ - Nền tảng đặt phòng nghỉ dưỡng
          hàng đầu.
        </p>
      </footer>
    </div>
  );
}
