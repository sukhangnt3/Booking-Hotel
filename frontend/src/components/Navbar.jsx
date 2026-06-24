import React from "react";

const Navbar = () => {
  return (
    <nav className="bg-[#005cb8] text-white px-8 py-3 flex items-center justify-between font-sans shadow-sm">
      {/* Bên trái: Logo / Tên thương hiệu */}
      <div className="text-xl font-bold cursor-pointer select-none">
        Hotel Booking
      </div>

      {/* Bên phải: Cụm nút chức năng */}
      <div className="flex items-center space-x-3 text-sm font-semibold">
        {/* Nút viền trắng */}
        <button className="border border-white text-white px-4 py-2 rounded-md hover:bg-white/10 transition-all duration-200">
          Đăng khách sạn của bạn
        </button>

        {/* Nút Đăng nhập */}
        <button className="bg-white text-[#005cb8] px-4 py-2 rounded-md hover:bg-gray-100 transition-all duration-200">
          Đăng nhập
        </button>

        {/* Nút Đăng ký */}
        <button className="bg-white text-[#005cb8] px-4 py-2 rounded-md hover:bg-gray-100 transition-all duration-200">
          Đăng ký
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
