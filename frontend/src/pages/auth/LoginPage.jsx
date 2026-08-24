import React from "react";
import LoginForm from "../../components/auth/LoginForm"; // Đảm bảo đường dẫn này đúng với vị trí LoginForm của bạn

const LoginPage = () => {
  return (
    <div className="min-h-screen bg-white flex flex-col justify-between font-sans">
      {/* Header xanh tối giản */}
      <header className="bg-[#003580] text-white px-8 py-4 flex justify-between items-center">
        <a href="/" className="text-2xl font-bold tracking-tight">
          GoAway
        </a>
      </header>

      {/* Form ở giữa */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <LoginForm />
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-gray-500 py-6 border-t border-gray-100">
        <p>Bản quyền (2006 - 2026) - GoAway™</p>
      </footer>
    </div>
  );
};

export default LoginPage;
