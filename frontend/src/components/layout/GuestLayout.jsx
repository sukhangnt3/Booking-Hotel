import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import { useEffect } from "react";

const GuestLayout = () => {
  const { pathname } = useLocation();

  // Tự động cuộn lên đầu trang mỗi khi chuyển trang (Quan trọng cho SPA)
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900 font-sans">
      {/* 
         Header nên có z-index cao và có thể thêm sticky ở đây 
         nếu file Header.jsx của bạn chưa có 
      */}
      <header className="sticky top-0 z-40 w-full shadow-sm">
        <Header />
      </header>

      {/* 
         Phần nội dung chính 
         max-w-7xl (~1280px) là chuẩn chung cho các trang như Booking.com 
      */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200">
        <Footer />
      </footer>
    </div>
  );
};

export default GuestLayout;
