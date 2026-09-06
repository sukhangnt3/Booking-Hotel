// src/components/layout/GuestLayout.jsx
import React, { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import ChatbotWidget from "@/components/chat/ChatbotWidget"; // 👈 BỔ SUNG IMPORT

const GuestLayout = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900 font-sans relative">
      <header className="sticky top-0 z-40 w-full shadow-sm">
        <Header />
      </header>

      <main className="flex-1 w-full">
        <Outlet />
      </main>

      <footer className="bg-white border-t border-gray-200">
        <Footer />
      </footer>

      {/* 👈 TRỢ LÝ ẢO TÌM PHÒNG TƯƠNG TÁC VỚI BẢNG 21: CHATBOT_LOG */}
      <ChatbotWidget />
    </div>
  );
};

export default GuestLayout;
