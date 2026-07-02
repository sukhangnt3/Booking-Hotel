import React from 'react';
// Thao tác gọi trực tiếp từ phần UI qua đây:
import { Button } from '../ui'; 
import HotelFilter from '../hotel/HotelFilter';

const Header = () => {
  return (
    <header className="bg-[#003580] text-white px-4 py-3">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        {/* Logo */}
        <div className="text-2xl font-bold cursor-pointer">Booking.com</div>

        {/* Các nút bấm thao tác góc phải */}
        <div className="flex items-center gap-4">
          <Button variant="text">VND</Button>
          <Button variant="text">🇻🇳</Button>
          
          {/* Nút đăng chỗ nghỉ dạng chữ */}
          <Button variant="text">Đăng chỗ nghỉ của Quý vị</Button>

          {/* Nút Đăng ký / Đăng nhập dạng Viền nền trắng */}
          <Button variant="outline">Đăng ký</Button>
          <Button variant="outline">Đăng nhập</Button>
        </div>
      </div>

      {/* Thanh Menu phụ phía dưới (Lưu trú, Chuyến bay...) */}
      <div className="max-w-7xl mx-auto flex gap-2 mt-4">
        {/* Riêng nút Lưu Trú đang được chọn thì ta có thể đổi màu nền khác đi chút */}
        <Button variant="ghost" className="bg-white/20 border-white">🛏️ Lưu trú</Button>
        <Button variant="text" className="rounded-full">✈️ Chuyến bay</Button>
        <Button variant="text" className="rounded-full">🚗 Thuê xe</Button>
        <Button variant="text" className="rounded-full">🎡 Hoạt động</Button>
        <Button variant="text" className="rounded-full">🚕 Taxi sân bay</Button>
      </div>
      <div className="relative w-full bg-[#003580] text-white">
      {/* Khu vực chữ Banner */}
      <div className="max-w-7xl mx-auto px-4 pt-12 pb-20">
        <h1 className="text-5xl font-extrabold mb-4 tracking-tight">
          Tìm chỗ nghỉ tiếp theo
        </h1>
        <p className="text-2xl font-normal text-white/90">
          Tìm ưu đãi khách sạn, chỗ nghỉ dạng nhà và nhiều hơn nữa...
        </p>
      </div>

      {/* Đẩy thanh tìm kiếm nằm đè lên mép viền dưới của khối màu xanh */}
      <div className="absolute bottom-0 left-0 right-0 transform translate-y-1/2 z-10">
        <HotelFilter />
      </div>
    </div>
    </header>
  );
};

export default Header;