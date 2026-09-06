// src/pages/error/ServerErrorPage.jsx
import React from "react";
import { useRouteError, useNavigate } from "react-router-dom";
import { AlertTriangle, RefreshCw, Home, Building2 } from "lucide-react";

export default function ServerErrorPage() {
  const error = useRouteError();
  const navigate = useNavigate();

  console.error("Lỗi hệ thống:", error);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col justify-between font-sans antialiased">
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
      </header>

      <main className="flex-1 flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white p-8 sm:p-12 rounded-3xl border border-slate-200 shadow-xl space-y-6 animate-in zoom-in-95">
          <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center mx-auto border border-rose-100 shadow-sm">
            <AlertTriangle size={44} strokeWidth={2} />
          </div>

          <div className="space-y-2">
            <span className="text-5xl font-black text-rose-600 tracking-tight block">
              500
            </span>
            <h1 className="text-lg sm:text-xl font-black text-slate-900">
              Đã xảy ra sự cố kỹ thuật
            </h1>
            <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
              Máy chủ phản hồi chậm hoặc tạm thời mất kết nối. Đội ngũ kỹ thuật
              GoStay đang khắc phục.
            </p>
          </div>

          {error?.statusText || error?.message ? (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-600 text-[11px] font-mono text-left overflow-x-auto max-h-24">
              <code>{error.statusText || error.message}</code>
            </div>
          ) : null}

          <div className="pt-2 space-y-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3.5 bg-[#003580] hover:bg-blue-900 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <RefreshCw size={16} /> Thử tải lại trang
            </button>

            <button
              onClick={() => navigate("/")}
              className="w-full py-3 border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Home size={14} /> Về trang chủ
            </button>
          </div>
        </div>
      </main>

      <footer className="text-center text-xs text-slate-400 py-6 border-t border-slate-100 bg-white">
        <p>
          © {new Date().getFullYear()} GoStay™ - Trung tâm hỗ trợ kỹ thuật khách
          hàng 24/7.
        </p>
      </footer>
    </div>
  );
}
