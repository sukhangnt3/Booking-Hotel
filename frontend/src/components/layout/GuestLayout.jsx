import React, { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";

const GuestLayout = () => {
  const { pathname } = useLocation();

  // Tự động cuộn lên đầu trang mỗi khi chuyển trang
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full shadow-sm">
        <Header />
      </header>

      {/* 
        👉 ĐÃ SỬA: Bỏ max-w-7xl & padding ở đây để các banner có thể tràn toàn màn hình 
      */}
      <main className="flex-1 w-full">
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
