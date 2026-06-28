import React, { useState, useRef, useEffect } from "react";

const Header = ({ user, onAuthClick, onLogout }) => {
  const [destination, setDestination] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Đóng dropdown khi click ra ngoài vùng tìm kiếm
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const popularDestinations = [
    "TP. Hồ Chí Minh", "Đà Nẵng", "Hà Nội", "Băng Cốc", "Nha Trang",
    "Vũng Tàu", "Thượng Hải", "Đà Lạt", "Phan Thiết", "Đảo Phú Quốc"
  ];

  const handleSearch = (e) => {
    e.preventDefault();
    console.log("Đang tìm kiếm vùng:", destination);
  };

  return (
    <header className="bg-[#005cb8] text-white px-8 pt-4 pb-5 font-sans shadow-md w-full relative z-50">
      {/* HÀNG 1: LOGO & BUTTONS */}
      <div className="max-w-7xl mx-auto flex items-center justify-between mb-4">
        {/* Bên trái: Logo */}
        <div className="text-2xl font-bold cursor-pointer select-none tracking-tight">
          Hotel Booking
        </div>

        {/* Bên phải: Nút chức năng */}
        <div className="flex items-center space-x-3 text-sm font-semibold">
          <button className="border border-white text-white px-4 py-2 rounded-md hover:bg-white/10 transition-all duration-200">
            Đăng khách sạn của bạn
          </button>

          {user ? (
            <div className="flex items-center space-x-3">
              <span className="text-sm">Xin chào, <b>{user.name}</b></span>
              <button onClick={onLogout} className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition-all duration-200">
                Đăng xuất
              </button>
            </div>
          ) : (
            <>
              <button 
                onClick={() => onAuthClick("login")} 
                className="bg-white text-[#005cb8] px-4 py-2 rounded-md hover:bg-blue-50 transition-all duration-200"
              >
                Đăng nhập
              </button>
              <button 
                onClick={() => onAuthClick("register")} 
                className="bg-white text-[#005cb8] px-4 py-2 rounded-md hover:bg-blue-50 transition-all duration-200"
              >
                Đăng ký
              </button>
            </>
          )}
        </div>
      </div>

      {/* HÀNG 2: THANH TÌM KIẾM CHUNG TRONG HEADER */}
      <div className="max-w-7xl mx-auto relative" ref={dropdownRef}>
        <form 
          onSubmit={handleSearch}
          className="bg-white p-1 rounded-xl shadow-lg flex flex-col md:flex-row items-center gap-1 text-gray-800"
        >
          {/* Ô 1: Điểm đến + Menu Gợi Ý */}
          <div className="relative flex-1 w-full">
            <div 
              className="flex items-center gap-2 bg-gray-50/80 px-4 py-2.5 rounded-lg cursor-pointer hover:bg-gray-100 transition-all"
              onClick={() => setShowDropdown(true)}
            >
              <span className="text-gray-400 text-base">📍</span>
              <input
                type="text"
                placeholder="Bạn muốn đến đâu?"
                className="outline-none text-sm w-full bg-transparent font-medium text-gray-800 placeholder-gray-400"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
              />
              {destination && (
                <button 
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setDestination(""); }} 
                  className="text-gray-400 hover:text-gray-600 text-xs px-1"
                >
                  ✕
                </button>
              )}
            </div>

            {/* DROPDOWN MENU GỢI Ý KHI NHẢY RA */}
            {showDropdown && (
              <div className="absolute left-0 top-[115%] w-full md:w-[550px] bg-white rounded-xl shadow-2xl border border-gray-100 p-5 z-50 text-gray-800">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2.5">Tìm kiếm gần đây</p>
                <div className="space-y-2 mb-3.5 text-sm">
                  <div 
                    className="flex items-center gap-3 cursor-pointer hover:text-blue-600 text-gray-600 transition-colors" 
                    onClick={() => { setDestination("Đà Nẵng"); setShowDropdown(false); }}
                  >
                    <span className="text-gray-400">🕒</span> 
                    <span className="font-medium">Đà Nẵng</span> 
                    <span className="text-xs text-gray-400 ml-auto">26/06 - 27/06 · 1 phòng, 1 người lớn</span>
                  </div>
                </div>

                <hr className="border-gray-100 mb-3" />
                
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2.5">Điểm đến phổ biến</p>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-y-3 gap-x-2 text-xs font-semibold">
                  {popularDestinations.map((dest, idx) => (
                    <div 
                      key={idx} 
                      className="cursor-pointer hover:text-blue-600 text-gray-700 transition-colors truncate"
                      onClick={() => { setDestination(dest); setShowDropdown(false); }}
                    >
                      {dest}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Ô 2: Chọn Ngày */}
          <div className="flex items-center gap-2 bg-gray-50/80 px-4 py-2.5 rounded-lg flex-1 w-full hover:bg-gray-100 cursor-pointer transition-all">
            <span className="text-gray-400 text-base">📅</span>
            <span className="text-sm font-medium text-gray-700 truncate">CN, 28 thg 6 - T2, 29 thg 6</span>
            <span className="bg-gray-200/60 text-gray-600 text-[10px] font-bold px-1.5 py-0.5 rounded ml-auto">1 đêm</span>
          </div>

          {/* Ô 3: Số Hành Khách */}
          <div className="flex items-center justify-between gap-2 bg-gray-50/80 px-4 py-2.5 rounded-lg flex-1 w-full hover:bg-gray-100 cursor-pointer transition-all">
            <div className="flex items-center gap-2 truncate">
              <span className="text-gray-400 text-base">👤</span>
              <span className="text-sm font-medium text-gray-700 truncate">1 phòng, 1 Người Lớn, 0 Trẻ Em</span>
            </div>
            <span className="text-[10px] text-gray-400">▼</span>
          </div>

          {/* Nút Tìm Kiếm màu xanh */}
          <button 
            type="submit" 
            className="bg-[#005cb8] text-white font-bold px-7 py-2.5 rounded-lg hover:bg-[#004ba0] transition-all w-full md:w-auto text-sm flex items-center justify-center gap-1.5 shadow-sm"
          >
            🔍 Tìm
          </button>
        </form>
      </div>
    </header>
  );
};

export default Header;