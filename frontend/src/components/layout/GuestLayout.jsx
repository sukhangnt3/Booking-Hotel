import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';

const GuestLayout = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header cũ của bạn sẽ hiển thị ở MỌI trang */}
      <Header />

      {/* Outlet là nơi chứa nội dung thay đổi của từng trang (HomePage, HotelListPage...) */}
      <main className="flex-1">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
};

export default GuestLayout;