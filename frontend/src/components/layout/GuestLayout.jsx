import React from 'react';
import { Outlet } from 'react-router-dom'; // Thư viện giúp render trang con
import Header from './Header';
import Footer from './Footer';

const GuestLayout = () => {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* 1. Header luôn nằm cố định ở trên cùng */}
      <Header />

      {/* 2. Phần ruột (Body) thay đổi linh hoạt theo trang */}
      <main className="flex-1 w-full">
        <Outlet /> 
      </main>
      {/* 3. Footer xuất hiện cố định ở mọi trang dưới chân */}
      <Footer />
    </div>
  );
};

export default GuestLayout;