import React from 'react';
import { Outlet } from 'react-router-dom'; // Khóa chính ở đây!
import Header from './Header';
import Footer from './Footer';

const GuestLayout = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      {/* Thẻ này quyết định các trang con như HomePage có được hiển thị hay không */}
      <main className="flex-grow bg-gray-50">
        <Outlet /> 
      </main>
      
      <Footer />
    </div>
  );
};

export default GuestLayout;