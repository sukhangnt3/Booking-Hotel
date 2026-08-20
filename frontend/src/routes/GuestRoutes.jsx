import React, { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";

const GuestLayout = () => {
  const { pathname } = useLocation();

  // Tự động cuộn lên đầu trang mỗi khi chuyển Route (Trang mới)
  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant", // Cuộn lên đầu ngay lập tức
    });
  }, [pathname]);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50/50 font-sans text-gray-900 selection:bg-blue-100 selection:text-blue-900">
      {/* 1. HEADER (Cố định ở trên cùng) */}
      <Header />

      {/* 2. MAIN CONTENT (Tự động giãn hết chiều cao còn lại) */}
      <main className="flex-1 w-full flex flex-col">
        <Outlet />
      </main>

      {/* 3. FOOTER */}
      <Footer />
    </div>
  );
};

export default GuestLayout;
