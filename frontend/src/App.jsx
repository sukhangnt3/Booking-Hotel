import { useState } from "react";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom"; 
import Navbar from "./components/Navbar";
import Login from "./components/Login";
import SearchBar from "./components/SearchBar"; 
import HomeBody from "./components/HomeBody";   

// COMPONENT NỘI DUNG TRANG CHỦ
const HomeContent = ({ onOpenLogin }) => {
  const navigate = useNavigate(); 

  // Luồng xử lý: Nhận cục data từ SearchBar và chuyển sang trang kết quả
  const handleSearchSubmit = (searchParams) => {
    console.log("➡️ App.jsx nhận dữ liệu từ SearchBar:", searchParams);
    navigate('/results', { state: searchParams });
  };

  return (
    <>
      {/* BANNER MÀU XANH CHỨA SEARCHBAR */}
      <div className="bg-[#005cb8] pt-28 pb-16 px-4 md:px-8 text-white">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Khách Sạn.</h1>
          <SearchBar onSearchProtected={handleSearchSubmit} />
        </div>
      </div>

      {/* THÂN TRANG CHỦ */}
      <HomeBody onOpenLogin={onOpenLogin} /> 
    </>
  );
};

// COMPONENT GỐC QUẢN LÝ TOÀN ỨNG DỤNG
function App() {
  // Giữ nguyên bộ State quản lý Login của bạn
  const [user, setUser] = useState(null);
  const [showLogin, setShowLogin] = useState(false); 

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50 text-gray-800">
        
        {/* Navbar nhận user và hàm mở Login */}
        <Navbar user={user} setUser={setUser} onLoginClick={() => setShowLogin(true)} />

        {/* Quản lý chuyển trang */}
        <Routes>
          <Route path="/" element={<HomeContent onOpenLogin={() => setShowLogin(true)} />} />
          <Route 
            path="/results" 
            element={
              <div className="pt-24 text-center font-bold text-gray-500">
                Giao diện hiển thị kết quả tìm kiếm (Sẵn sàng nhận dữ liệu từ SearchBar)
              </div>
            } 
          />
        </Routes>

        {/* Modal Login gốc hiện lên dựa theo điều kiện showLogin */}
        {showLogin && (
          <Login setUser={setUser} onClose={() => setShowLogin(false)} />
        )}
        
      </div>
    </BrowserRouter>
  );
}

export default App;