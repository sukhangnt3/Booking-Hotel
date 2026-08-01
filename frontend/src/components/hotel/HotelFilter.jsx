import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import hotelService from "../../services/hotelService";

const HotelFilter = ({ onSearch }) => {
  const navigate = useNavigate();
  const filterRef = useRef(null);

  // 1. Cấu hình ngày mặc định (Hôm nay & Ngày mai)
  const today = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];

  // 2. States cho các trường nhập liệu
  const [destination, setDestination] = useState("");
  const [destinations, setDestinations] = useState([]); // Kết quả từ API
  const [recentSearches, setRecentSearches] = useState([]); // Lịch sử từ LocalStorage
  const [checkInDate, setCheckInDate] = useState(today);
  const [checkOutDate, setCheckOutDate] = useState(tomorrow);
  const [guests, setGuests] = useState({ adults: 2, children: 0, rooms: 1 });
  const [isBusiness, setIsBusiness] = useState(false);
  const [hasPets, setHasPets] = useState(false);

  // States quản lý UI
  const [activeTab, setActiveTab] = useState(null); // 'dest' | 'date' | 'guest' | null
  const [loadingDest, setLoadingDest] = useState(false);

  // 3. Khởi tạo: Lấy lịch sử tìm kiếm từ LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem("recent_searches");
    if (saved) setRecentSearches(JSON.parse(saved));
  }, []);

  // 4. Debounce gọi API tìm địa điểm (Khi người dùng gõ từ khóa)
  useEffect(() => {
    if (!destination.trim() || destination.length < 2) {
      setDestinations([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoadingDest(true);
      try {
        // Gọi API gợi ý địa điểm (Sẽ query DISTINCT city trong Table 5: Hotel)
        const data = await hotelService.searchDestinations(destination);
        setDestinations(data || []);
      } catch (e) {
        console.error("Lỗi search destination:", e);
      } finally {
        setLoadingDest(false);
      }
    }, 400); // Đợi 400ms sau khi ngừng gõ mới gọi API
    return () => clearTimeout(timer);
  }, [destination]);

  // 5. Đóng Popups khi click ra ngoài
  useEffect(() => {
    const handleOutside = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setActiveTab(null);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  // 6. Xử lý tăng giảm số lượng khách/phòng
  const handleGuestChange = (field, delta) => {
    setGuests((prev) => {
      const val = prev[field] + delta;
      const min = field === "children" ? 0 : 1;
      if (val < min) return prev;
      return { ...prev, [field]: val };
    });
  };

  // 7. Thực hiện Tìm kiếm
  const handleSearch = (e) => {
    e.preventDefault();

    // Lưu vào lịch sử tìm kiếm
    if (destination.trim()) {
      const updated = [
        destination.trim(),
        ...recentSearches.filter((i) => i !== destination.trim()),
      ].slice(0, 5);
      setRecentSearches(updated);
      localStorage.setItem("recent_searches", JSON.stringify(updated));
    }

    // Đóng gói dữ liệu gửi đi (Đồng bộ với HotelListPage params)
    const params = {
      destination: destination.trim(),
      checkIn: checkInDate,
      checkOut: checkOutDate,
      adults: guests.adults,
      children: guests.children,
      rooms: guests.rooms,
      isBusiness,
      hasPets,
    };

    if (onSearch) {
      onSearch(params); // Nếu dùng ở HomePage
    } else {
      navigate(`/hotels?${new URLSearchParams(params).toString()}`); // Nếu dùng ở các trang khác
    }
    setActiveTab(null);
  };

  return (
    <div ref={filterRef} className="w-full relative">
      <form
        onSubmit={handleSearch}
        className="bg-[#ffb700] p-1 rounded-lg shadow-xl grid grid-cols-1 md:grid-cols-12 gap-1"
      >
        {/* 1. Ô ĐỊA ĐIỂM */}
        <div className="relative md:col-span-4 bg-white rounded flex items-center px-4 py-2.5">
          <span className="mr-3 text-lg">🛏️</span>
          <div className="flex-1">
            <span className="text-[10px] text-gray-400 block font-bold uppercase">
              Bạn muốn đến đâu?
            </span>
            <input
              type="text"
              placeholder="Nhập thành phố, điểm đến..."
              value={destination}
              onChange={(e) => {
                setDestination(e.target.value);
                setActiveTab("dest");
              }}
              onFocus={() => setActiveTab("dest")}
              className="w-full font-bold outline-none text-sm text-gray-800 placeholder-gray-300"
            />
          </div>
          {destination && (
            <button
              type="button"
              onClick={() => setDestination("")}
              className="text-gray-300 hover:text-gray-600 font-bold px-1 text-sm"
            >
              ✕
            </button>
          )}

          {/* Popup Dropdown Địa Điểm */}
          {activeTab === "dest" && (
            <div className="absolute top-[110%] left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-2xl z-[100] overflow-hidden animate-in fade-in zoom-in duration-200">
              {/* Lịch sử tìm kiếm gần đây */}
              {!destination && recentSearches.length > 0 && (
                <div className="p-2 border-b border-gray-100">
                  <span className="text-[10px] font-bold text-gray-400 px-3 uppercase">
                    Tìm kiếm gần đây
                  </span>
                  {recentSearches.map((item, i) => (
                    <div
                      key={i}
                      onClick={() => {
                        setDestination(item);
                        setActiveTab(null);
                      }}
                      className="px-3 py-2.5 hover:bg-gray-50 cursor-pointer flex items-center gap-3 text-sm font-semibold text-gray-700"
                    >
                      <span>🕒</span> {item}
                    </div>
                  ))}
                </div>
              )}

              {/* Kết quả từ API */}
              <div className="max-h-64 overflow-y-auto">
                {loadingDest ? (
                  <div className="p-4 text-center text-xs text-gray-400 font-medium">
                    Đang tìm địa điểm...
                  </div>
                ) : destinations.length > 0 ? (
                  destinations.map((item, i) => (
                    <div
                      key={i}
                      onClick={() => {
                        setDestination(item.name || item);
                        setActiveTab(null);
                      }}
                      className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-50 flex items-center gap-3 group"
                    >
                      <span className="text-gray-400 group-hover:text-[#006ce4]">
                        📍
                      </span>
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-800 text-sm">
                          {item.name || item}
                        </span>
                        <span className="text-[9px] text-gray-400 uppercase font-bold tracking-wider">
                          Thành phố / Điểm đến
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  destination.length >= 2 && (
                    <div className="p-4 text-center text-xs text-gray-400">
                      Không tìm thấy địa điểm này
                    </div>
                  )
                )}
              </div>
            </div>
          )}
        </div>

        {/* 2. NGÀY NHẬN / TRẢ PHÒNG */}
        <div
          className="relative md:col-span-4 bg-white rounded flex items-center px-4 py-2.5 cursor-pointer hover:bg-gray-50"
          onClick={() => setActiveTab(activeTab === "date" ? null : "date")}
        >
          <span className="mr-3 text-lg">📅</span>
          <div className="w-full">
            <span className="text-[10px] text-gray-400 block font-bold uppercase">
              Ngày nhận — Ngày trả
            </span>
            <div className="text-sm font-bold text-gray-800 truncate">
              {checkInDate} — {checkOutDate}
            </div>
          </div>

          {activeTab === "date" && (
            <div
              className="absolute top-[110%] left-0 bg-white border border-gray-200 rounded-xl shadow-2xl p-5 z-[100] w-72 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase">
                    Ngày nhận
                  </label>
                  <input
                    type="date"
                    min={today}
                    value={checkInDate}
                    onChange={(e) => setCheckInDate(e.target.value)}
                    className="w-full border-b-2 border-gray-100 py-1 outline-none focus:border-[#006ce4] font-bold text-sm"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase">
                    Ngày trả
                  </label>
                  <input
                    type="date"
                    min={checkInDate}
                    value={checkOutDate}
                    onChange={(e) => setCheckOutDate(e.target.value)}
                    className="w-full border-b-2 border-gray-100 py-1 outline-none focus:border-[#006ce4] font-bold text-sm"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab(null)}
                className="w-full bg-[#006ce4] text-white py-2 rounded-lg font-bold text-xs uppercase shadow-md"
              >
                Xác nhận ngày
              </button>
            </div>
          )}
        </div>

        {/* 3. KHÁCH & PHÒNG */}
        <div
          className="relative md:col-span-3 bg-white rounded flex items-center px-4 py-2.5 cursor-pointer hover:bg-gray-50"
          onClick={() => setActiveTab(activeTab === "guest" ? null : "guest")}
        >
          <span className="mr-3 text-lg">👤</span>
          <div className="w-full">
            <span className="text-[10px] text-gray-400 block font-bold uppercase">
              Chọn số lượng
            </span>
            <div className="text-sm font-bold text-gray-800 truncate tracking-tight">
              {guests.adults} người lớn · {guests.children} trẻ em ·{" "}
              {guests.rooms} phòng
            </div>
          </div>

          {activeTab === "guest" && (
            <div
              className="absolute top-[110%] right-0 bg-white border border-gray-200 rounded-xl shadow-2xl p-5 z-[100] w-72 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              {["adults", "children", "rooms"].map((type) => (
                <div key={type} className="flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="capitalize font-bold text-gray-700 text-sm">
                      {type === "adults"
                        ? "Người lớn"
                        : type === "children"
                          ? "Trẻ em"
                          : "Số phòng"}
                    </span>
                    <span className="text-[10px] text-gray-400 font-medium">
                      {type === "adults"
                        ? "Từ 13 tuổi trở lên"
                        : type === "children"
                          ? "0-12 tuổi"
                          : "Số lượng phòng đặt"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleGuestChange(type, -1)}
                      className="w-8 h-8 flex items-center justify-center text-[#006ce4] border border-[#006ce4] rounded-md hover:bg-blue-50 transition-colors font-bold text-lg"
                    >
                      -
                    </button>
                    <span className="font-bold text-sm w-4 text-center text-gray-800">
                      {guests[type]}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleGuestChange(type, 1)}
                      className="w-8 h-8 flex items-center justify-center text-[#006ce4] border border-[#006ce4] rounded-md hover:bg-blue-50 transition-colors font-bold text-lg"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}

              <div className="pt-4 border-t border-gray-100 space-y-3">
                <label className="flex justify-between items-center cursor-pointer group">
                  <span className="text-xs font-bold text-gray-600 group-hover:text-[#006ce4]">
                    Bạn đi công tác?
                  </span>
                  <input
                    type="checkbox"
                    checked={isBusiness}
                    onChange={(e) => setIsBusiness(e.target.checked)}
                    className="w-4 h-4 accent-[#006ce4]"
                  />
                </label>
                <label className="flex justify-between items-center cursor-pointer group">
                  <span className="text-xs font-bold text-gray-600 group-hover:text-[#006ce4]">
                    Mang theo thú cưng?
                  </span>
                  <input
                    type="checkbox"
                    checked={hasPets}
                    onChange={(e) => setHasPets(e.target.checked)}
                    className="w-4 h-4 accent-[#006ce4]"
                  />
                </label>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab(null)}
                className="w-full bg-white border-2 border-[#006ce4] text-[#006ce4] py-2 rounded-lg font-extrabold text-xs uppercase hover:bg-blue-50 transition-colors mt-2"
              >
                Xong
              </button>
            </div>
          )}
        </div>

        {/* 4. NÚT TÌM KIẾM */}
        <div className="md:col-span-1">
          <button
            type="submit"
            className="w-full h-full bg-[#006ce4] hover:bg-blue-700 text-white font-bold py-3 md:py-0 rounded text-base transition-all active:scale-95 shadow-lg"
          >
            Tìm
          </button>
        </div>
      </form>
    </div>
  );
};

export default HotelFilter;
