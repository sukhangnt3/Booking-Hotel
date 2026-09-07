// src/components/layout/GuestLayout.jsx
import React, { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import ChatbotWidget from "@/components/chat/ChatbotWidget";
import { useAuthStore } from "@/stores/authStore"; // 👈 THÊM IMPORT STORE
import { authService } from "@/services"; // 👈 THÊM IMPORT SERVICE

const GuestLayout = () => {
  const { pathname } = useLocation();
  const { token, user, login, logout } = useAuthStore(); // 👈 LẤY HÀM TỪ STORE

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  // 🎯 TỰ ĐỘNG GỌI API LẤY PROFILE MỚI NHẤT TỪ DATABASE KHI F5 HOẶC MỞ WEB
  useEffect(() => {
    const fetchLatestUserData = async () => {
      // Nếu có token lưu ở localStorage nhưng trong store chưa có user (hoặc sau khi F5)
      if (token && !user) {
        try {
          const res = await authService.getProfile();
          const userData =
            res?.data?.user || res?.data?.data?.user || res?.data || res?.user;

          if (userData) {
            // Nạp lại thông tin mới nhất (bao gồm avatar Cloudinary mới và Role mới) vào store
            login(userData, token);
          }
        } catch (error) {
          console.error(
            "❌ Token hết hạn hoặc không hợp lệ, tiến hành đăng xuất:",
            error,
          );
          logout(); // Xóa token hỏng
        }
      }
    };

    fetchLatestUserData();
  }, [token, user, login, logout]);

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
