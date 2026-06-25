import React, { useState } from "react";
import Navbar from "./components/Navbar";
import Login from "./components/Login";

function App() {
  const [user, setUser] = useState(null);
  const [showLogin, setShowLogin] = useState(false); // Quản lý ẩn hiện form Login

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Truyền hàm mở login vào Navbar */}
      <Navbar user={user} setUser={setUser} onLoginClick={() => setShowLogin(true)} />

      {/* Nội dung chính của trang web */}
      <main className="p-8 text-center">
        <h1 className="text-3xl font-bold text-gray-800 mt-10">Chào mừng đến với Hotel Booking</h1>
        <p className="text-gray-600 mt-2">Tìm kiếm và đặt phòng khách sạn giá tốt nhất.</p>
      </main>

      {/* Nếu showLogin bằng true thì mới hiển thị Form đè lên giao diện */}
      {showLogin && (
        <Login setUser={setUser} onClose={() => setShowLogin(false)} />
      )}
    </div>
  );
}

export default App;