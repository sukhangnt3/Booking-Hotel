import React from "react";
import Header from "./Header";

const GuestLayout = ({ user, onAuthClick, onLogout, children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 font-sans">
      {/* Gọi Header chung duy nhất quản lý cả Thanh tìm kiếm */}
      <Header user={user} onAuthClick={onAuthClick} onLogout={onLogout} />

      {/* Vùng hiển thị nội dung chính bên dưới */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-8 py-8">
        {children}
      </main>

      <footer className="py-4 text-center text-sm text-gray-400 border-t border-gray-200 bg-white">
        © 2026 Hotel Booking. All rights reserved.
      </footer>
    </div>
  );
};

export default GuestLayout;