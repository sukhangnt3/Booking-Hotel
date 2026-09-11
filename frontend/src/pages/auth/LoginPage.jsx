// src/pages/auth/LoginPage.jsx
import React from "react";
import { Link } from "react-router-dom";
import { Building, HelpCircle } from "lucide-react";
import LoginForm from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between font-sans selection:bg-amber-500 selection:text-white">
      {/* =====================================================
          HEADER ĐỒNG BỘ 100% VỚI HEADER GỐC CỦA GOSTAY
      ===================================================== */}
      <header className="bg-[#0a2540] text-white sticky top-0 z-[60] shadow-2xl backdrop-blur-xl border-b border-amber-500/20 font-sans select-none transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-18 sm:h-20 flex justify-between items-center">
          {/* LOGO GOSTAY (BẤM VÀO TỰ ĐỘNG VỀ TRANG CHỦ) */}
          <Link to="/" className="flex items-center gap-3 cursor-pointer group">
            <div className="bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-[#0a2540] p-2 rounded-xl shadow-md group-hover:scale-105 transition-all duration-300">
              <Building size={22} strokeWidth={2.5} />
            </div>

            <span className="text-2xl sm:text-3xl font-serif tracking-wide font-black bg-gradient-to-r from-white via-slate-100 to-amber-200 bg-clip-text text-transparent">
              GoStay
            </span>
          </Link>

          {/* KHẨU HIỆU THƯƠNG HIỆU */}
          <div className="flex items-center">
            <span className="text-xs sm:text-sm text-amber-200/90 hidden sm:inline font-medium tracking-wide">
              Hệ thống đặt phòng trực tuyến hàng đầu
            </span>
          </div>
        </div>
      </header>

      {/* =====================================================
          NỘI DUNG FORM ĐĂNG NHẬP
      ===================================================== */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-md bg-white p-6 sm:p-8 rounded-3xl shadow-xl border border-slate-200">
          <LoginForm />
        </div>
      </main>

      {/* =====================================================
          FOOTER CHÂN TRANG
      ===================================================== */}
      <footer className="text-center text-xs text-slate-500 py-6 border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>
            © {new Date().getFullYear()} GoStay™ - Bản quyền thuộc về nền tảng
            GoStay.
          </p>
          <div className="flex items-center gap-4 text-slate-400">
            <Link to="/" className="hover:text-slate-600 transition">
              Điều khoản
            </Link>
            <span>•</span>
            <Link to="/" className="hover:text-slate-600 transition">
              Chính sách bảo mật
            </Link>
            <span>•</span>
            <Link
              to="/"
              className="hover:text-slate-600 transition flex items-center gap-1"
            >
              <HelpCircle size={14} />
              Trợ giúp
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
