// src/pages/auth/LoginPage.jsx
import React from "react";
import { Link } from "react-router-dom";
import { Building2 } from "lucide-react";
import LoginForm from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between font-sans">
      {/* Header thương hiệu GoStay */}
      <header className="bg-[#0a2540] text-white px-6 sm:px-10 py-4 flex justify-between items-center shadow-md">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-[#0a2540] p-2 rounded-xl shadow-md group-hover:scale-105 transition-all duration-300">
            <Building2 size={24} />
          </div>
          
          <span className="text-2xl sm:text-3xl font-serif tracking-wide font-black bg-gradient-to-r from-white via-slate-100 to-amber-200 bg-clip-text text-transparent">
            GoStay
          </span>
        </Link>
        <span className="text-xs text-white hidden sm:inline font-medium">
          Hệ thống đặt phòng trực tuyến hàng đầu
        </span>
      </header>

      {/* Form đăng nhập */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md bg-white p-6 sm:p-8 rounded-3xl shadow-xl border border-slate-200">
          <LoginForm />
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-slate-500 py-6 border-t border-slate-200 bg-white">
        <p>
          © {new Date().getFullYear()} GoStay™ - Bản quyền thuộc về nền tảng
          GoStay.
        </p>
      </footer>
    </div>
  );
}
