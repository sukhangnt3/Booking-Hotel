import React from "react";

const Navbar = ({ onOpenLogin }) => {
  return (
    <nav className="bg-[#005cb8] text-white px-8 py-3 flex items-center justify-between font-sans shadow-sm fixed top-0 left-0 w-full z-50">
      
      <div className="text-xl font-bold cursor-pointer select-none">
        Hotel Booking
      </div>

      <div className="flex items-center space-x-3 text-sm font-semibold">
        <button className="border border-white text-white px-4 py-2 rounded-md hover:bg-white/10 transition-all duration-200 cursor-pointer">
          Đăng khách sạn của bạn
        </button>

        <button 
          onClick={onOpenLogin} 
          className="bg-white text-[#005cb8] px-4 py-2 rounded-md hover:bg-gray-100 transition-all duration-200 cursor-pointer"
        >
          Đăng nhập/đăng ký
        </button>

       
      </div>
    </nav>
  );
};

export default Navbar;