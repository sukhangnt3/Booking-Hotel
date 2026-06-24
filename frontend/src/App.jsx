import React, { useState } from "react";
import Navbar from "./components/Navbar";
import Login from "./components/Login"; // 1. Import component Login vào đây

const App = () => {
  // 2. Tạo State để quản lý ẩn/hiện Form Đăng nhập (Mặc định ban đầu là false - ẩn)
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f0f4f9]">
      {/* 3. Truyền hàm mở form xuống cho Navbar thông qua thuộc tính onOpenLogin */}
      <Navbar onOpenLogin={() => setIsLoginOpen(true)} />

      {/* Nội dung chính của trang web */}
      <main className="pt-24 text-center">
        <h1 className="text-2xl font-bold text-gray-800 mt-10">
          Hệ thống Đặt Phòng Hotel Booking
        </h1>
        <p className="text-gray-500 text-sm mt-2">
          Bấm vào nút "Đăng nhập" hoặc "Đăng ký" trên thanh điều hướng để thử nghiệm.
        </p>
      </main>

      {/* 4. Điều kiện hiển thị: Nếu lệnh isLoginOpen bằng true thì mới mở Form Login */}
      {isLoginOpen && (
        <Login isOpen={true} onClose={() => setIsLoginOpen(false)} />
      )}
    </div>
  );
};

export default App;