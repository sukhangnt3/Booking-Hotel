import { useState, useEffect } from "react";

const SearchBar = ({ onSearchProtected }) => {
  const [destination, setDestination] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState({ rooms: 1, adults: 1, children: 0 });
  
  // Các trạng thái ẩn/hiện bảng Dropdown
  const [showDestinationDropdown, setShowDestinationDropdown] = useState(false);
  const [showGuestDropdown, setShowGuestDropdown] = useState(false);

  // 🕒 State quản lý danh sách Tìm kiếm gần đây (Lấy dữ liệu cũ từ localStorage khi load trang)
  const [recentSearches, setRecentSearches] = useState([]);

  useEffect(() => {
    const savedHistory = localStorage.getItem("recentSearches");
    if (savedHistory) {
      setRecentSearches(JSON.parse(savedHistory));
    }
  }, []);

  const popularDestinations = [
    "TP. Hồ Chí Minh", "Đà Nẵng", "Hà Nội", "Nha Trang",
    "Vũng Tàu", "Đà Lạt", "Phan Thiết", "Phú Quốc"
  ];

  // 🔥 XỬ LÝ KHI BẤM NÚT KÍNH LÚP 🔍
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const cleanDestination = destination.trim();

    if (!cleanDestination) {
      alert("📍 Vui lòng nhập địa điểm cần đến!");
      return;
    }

    // 1. Định dạng gói dữ liệu lịch sử mới
    const newSearchItem = {
      city: cleanDestination,
      date: checkIn && checkOut ? `${checkIn.split('-').reverse().slice(0,2).join('/')} - ${checkOut.split('-').reverse().slice(0,2).join('/')}` : "Chưa chọn ngày",
      detail: `${guests.rooms} phòng, ${guests.adults} Người Lớn`
    };

    // 2. Cập nhật mảng lịch sử (Loại bỏ trùng lặp nếu tìm lại địa điểm cũ và giới hạn tối đa 3 mục gần nhất)
    const filteredHistory = recentSearches.filter(item => item.city.toLowerCase() !== cleanDestination.toLowerCase());
    const updatedHistory = [newSearchItem, ...filteredHistory].slice(0, 3);

    // 3. Lưu vào State và ghi vào bộ nhớ trình duyệt localStorage
    setRecentSearches(updatedHistory);
    localStorage.setItem("recentSearches", JSON.stringify(updatedHistory));

    // 4. Đóng dropdown và đẩy dữ liệu lên App.jsx chuyển trang như cũ
    setShowDestinationDropdown(false);
    if (onSearchProtected) {
      onSearchProtected({ destination: cleanDestination, checkIn, checkOut, ...guests });
    }
  };

  // Hàm xóa sạch lịch sử tìm kiếm gần đây
  const clearHistory = (e) => {
    e.stopPropagation(); // Ngăn sự kiện click làm ẩn dropdown
    setRecentSearches([]);
    localStorage.removeItem("recentSearches");
  };

  const updateGuests = (type, operation) => {
    setGuests((prev) => {
      const newValue = operation === "+" ? prev[type] + 1 : prev[type] - 1;
      if (type === "rooms" && newValue < 1) return prev;
      if (type === "adults" && newValue < 1) return prev;
      if (type === "children" && newValue < 0) return prev;
      return { ...prev, [type]: newValue };
    });
  };

  return (
    <div className="w-full relative z-30 text-gray-800">
      <form onSubmit={handleSearchSubmit} className="bg-white p-2 rounded-xl shadow-xl grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
        
        {/* 📍 Ô NƠI ĐẾN */}
        <div className="md:col-span-4 flex flex-col px-3 py-1 border-b md:border-b-0 md:border-r border-gray-200 relative">
          <label className="text-[10px] font-bold uppercase text-gray-400">Nơi đến</label>
          <input 
            type="text" 
            value={destination} 
            onChange={(e) => setDestination(e.target.value)} 
            onFocus={() => {
              setShowDestinationDropdown(true);
              setShowGuestDropdown(false);
            }}
            placeholder="Thành phố, khách sạn..." 
            className="w-full text-xs font-bold outline-none mt-0.5" 
          />

          {/* DROPDOWN GỢI Ý & LỊCH SỬ ĐỘNG */}
          {showDestinationDropdown && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowDestinationDropdown(false)}></div>
              
              <div className="absolute top-full left-0 w-[450px] md:w-[500px] mt-3 bg-white border border-gray-200 rounded-xl p-5 shadow-2xl z-20 space-y-5 text-left text-xs">
                
                {/* HIỂN THỊ LỊCH SỬ TÌM KIẾM THỰC TẾ */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-gray-900 text-sm">Tìm kiếm gần đây</h4>
                    {recentSearches.length > 0 && (
                      <button type="button" onClick={clearHistory} className="text-[11px] text-red-500 hover:underline cursor-pointer">Xóa tất cả</button>
                    )}
                  </div>
                  
                  {recentSearches.length > 0 ? (
                    recentSearches.map((item, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => {
                          setDestination(item.city);
                          setShowDestinationDropdown(false);
                        }}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer text-gray-600 transition-colors"
                      >
                        <span className="text-gray-400">🕒</span>
                        <span className="font-bold text-gray-800">{item.city}</span>
                        <span className="text-gray-400 ml-4 text-[11px]">{item.date}</span>
                        <span className="text-gray-400 border-l pl-3 border-gray-200 text-[11px]">{item.detail}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-400 text-[11px] italic pl-2 py-1">Chưa có lịch sử tìm kiếm gần đây.</p>
                  )}
                </div>

                <hr className="border-gray-100" />

                {/* ĐIỂM ĐẾN PHỔ BIẾN */}
                <div className="space-y-3">
                  <h4 className="font-bold text-gray-900 text-sm">Điểm đến phổ biến</h4>
                  <div className="grid grid-cols-5 gap-y-3 gap-x-2">
                    {popularDestinations.map((city, idx) => (
                      <div 
                        key={idx}
                        onClick={() => {
                          setDestination(city);
                          setShowDestinationDropdown(false);
                        }}
                        className="p-1 text-gray-700 hover:text-blue-600 font-medium cursor-pointer transition-colors whitespace-nowrap overflow-hidden text-ellipsis"
                        title={city}
                      >
                        {city}
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </>
          )}
        </div>

        {/* 📅 NGÀY NHẬN PHÒNG */}
        <div className="md:col-span-2 flex flex-col px-3 py-1 border-b md:border-b-0 md:border-r border-gray-200">
          <label className="text-[10px] font-bold uppercase text-gray-400">Nhận phòng</label>
          <input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className="w-full text-xs font-bold outline-none mt-0.5 cursor-pointer" />
        </div>

        {/* 📅 NGÀY TRẢ PHÒNG */}
        <div className="md:col-span-2 flex flex-col px-3 py-1 border-b md:border-b-0 md:border-r border-gray-200">
          <label className="text-[10px] font-bold uppercase text-gray-400">Trả phòng</label>
          <input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className="w-full text-xs font-bold outline-none mt-0.5 cursor-pointer" />
        </div>

        {/* 👥 KHÁCH & PHÒNG */}
        <div className="md:col-span-3 flex flex-col px-3 py-1 relative border-b md:border-b-0">
          <label className="text-[10px] font-bold uppercase text-gray-400">Khách & Phòng</label>
          <div onClick={() => {
            setShowGuestDropdown(!showGuestDropdown);
            setShowDestinationDropdown(false);
          }} className="w-full text-xs font-bold mt-0.5 cursor-pointer select-none truncate">
            {guests.rooms} phòng, {guests.adults} người lớn {guests.children > 0 && `, ${guests.children} trẻ em`}
          </div>
          {showGuestDropdown && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowGuestDropdown(false)}></div>
              <div className="absolute top-full left-0 right-0 mt-3 bg-white border border-gray-200 rounded-xl p-4 shadow-xl z-20 space-y-3 text-xs">
                {["rooms", "adults", "children"].map((type) => (
                  <div key={type} className="flex justify-between items-center capitalize">
                    <span className="font-bold text-gray-600">{type === "rooms" ? "Số phòng" : type === "adults" ? "Người lớn" : "Trẻ em"}</span>
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={() => updateGuests(type, "-")} className="w-6 h-6 border rounded-full flex items-center justify-center font-bold">-</button>
                      <span className="font-bold w-4 text-center">{guests[type]}</span>
                      <button type="button" onClick={() => updateGuests(type, "+")} className="w-6 h-6 border rounded-full flex items-center justify-center font-bold">+</button>
                    </div>
                  </div>
                ))}
                <button type="button" onClick={() => setShowGuestDropdown(false)} className="w-full py-1.5 bg-blue-50 text-blue-600 font-bold rounded-lg text-center mt-2 border border-blue-100">Xong</button>
              </div>
            </>
          )}
        </div>

        {/* 🔍 NÚT TÌM KIẾM KHỞI ĐỘNG LƯU LỊCH SỬ */}
        <div className="md:col-span-1 w-full h-full flex items-center justify-center pt-2 md:pt-0">
          <button type="submit" className="w-full md:w-12 h-12 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold flex items-center justify-center shadow-md cursor-pointer">🔍</button>
        </div>
      </form>
    </div>
  );
};

export default SearchBar;