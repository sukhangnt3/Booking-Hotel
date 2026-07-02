import React from 'react';
import { Outlet } from 'react-router-dom'; // Thư viện giúp render trang con
import Header from './Header';

const GuestLayout = () => {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* 1. Header luôn nằm cố định ở trên cùng */}
      <Header />

      {/* 2. Phần ruột (Body) thay đổi linh hoạt theo trang */}
      <main className="flex-1 w-full">
        <Outlet /> 
      </main>
    </div>
  );
};

export default GuestLayout;