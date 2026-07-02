import React, { useState } from 'react';
// Gọi trực tiếp các nút và ô nhập từ thư mục UI
import { Button, Input, DatePicker } from '../ui'; 

const HotelFilter = () => {
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  const handleSearch = (e) => {
    e.preventDefault();
    console.log("Tìm kiếm:", { destination, startDate, endDate });
    // Thao tác logic chuyển trang hoặc lọc dữ liệu ở đây
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4">
      {/* Khung viền vàng bao bọc bên ngoài */}
      <form 
        onSubmit={handleSearch}
        className="bg-[#ffb700] p-1 rounded-lg shadow-lg flex flex-col lg:flex-row items-center gap-1 w-full"
      >
        {/* 1. Ô nhập Điểm đến - Dùng Input từ UI */}
        <div className="w-full lg:flex-[1.5] bg-white rounded-md flex items-center px-3 py-1 h-[52px]">
          <span className="text-gray-500 text-xl select-none">🛏️</span>
          <Input
            type="text"
            placeholder="Bạn muốn đến đâu?"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            className="w-full border-none focus:outline-none focus:ring-0 text-black placeholder-gray-500 font-normal pl-2"
          />
        </div>

        {/* 2. Ô chọn Ngày - Dùng DatePicker từ UI */}
        <div className="w-full lg:flex-[1.2] bg-white rounded-md flex items-center px-3 py-1 h-[52px]">
          <span className="text-gray-500 text-xl select-none">📅</span>
          <DatePicker
            selected={startDate}
            onChange={(date) => setStartDate(date)}
            placeholderText="Nhận phòng — Trả phòng"
            className="w-full border-none focus:outline-none focus:ring-0 text-black cursor-pointer pl-2 font-normal"
          />
        </div>

        {/* 3. Ô chọn Hành khách (Số người / Phòng) */}
        <div className="w-full lg:flex-[1.3] bg-white rounded-md flex items-center justify-between px-4 text-black cursor-pointer select-none h-[52px]">
          <div className="flex items-center gap-2">
            <span className="text-gray-500 text-xl">👤</span>
            <span className="text-sm font-normal text-gray-800">
              2 người lớn · 0 trẻ em · 1 phòng
            </span>
          </div>
          <span className="text-xs text-gray-400">▼</span>
        </div>

        {/* 4. Nút Tìm kiếm - Dùng Button từ UI */}
        <Button
          type="submit"
          className="w-full lg:w-auto bg-[#006ce4] hover:bg-blue-700 text-white font-medium text-lg px-8 h-[52px] rounded-md transition-colors flex items-center justify-center"
        >
          Tìm
        </Button>
      </form>
    </div>
  );
};

export default HotelFilter;