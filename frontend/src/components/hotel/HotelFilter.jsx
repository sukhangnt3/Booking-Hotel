import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import hotelService from "../../services/hotelService";

const HotelFilter = ({ onSearch }) => {
  const navigate = useNavigate();
  const filterRef = useRef(null);

  const today = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];

  const [destination, setDestination] = useState("");
  const [destinations, setDestinations] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);

  const [checkInDate, setCheckInDate] = useState(() => {
    const saved = localStorage.getItem("search_dates");
    return saved ? JSON.parse(saved).checkIn : today;
  });
  const [checkOutDate, setCheckOutDate] = useState(() => {
    const saved = localStorage.getItem("search_dates");
    return saved ? JSON.parse(saved).checkOut : tomorrow;
  });

  const [guests, setGuests] = useState({ adults: 2, children: 0, rooms: 1 });
  const [isBusiness, setIsBusiness] = useState(false);
  const [hasPets, setHasPets] = useState(false);
  const [activeTab, setActiveTab] = useState(null);
  const [loadingDest, setLoadingDest] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("recent_searches");
    if (saved) setRecentSearches(JSON.parse(saved));
  }, []);

  useEffect(() => {
    if (!destination.trim() || destination.length < 2) {
      setDestinations([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoadingDest(true);
      try {
        const data = await hotelService.searchDestinations(destination);
        setDestinations(data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingDest(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [destination]);

  const handleGuestChange = (field, delta) => {
    setGuests((prev) => {
      const val = prev[field] + delta;
      const min = field === "children" ? 0 : 1;
      if (val < min) return prev;
      return { ...prev, [field]: val };
    });
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (destination.trim()) {
      const updated = [
        destination.trim(),
        ...recentSearches.filter((i) => i !== destination.trim()),
      ].slice(0, 5);
      setRecentSearches(updated);
      localStorage.setItem("recent_searches", JSON.stringify(updated));
    }
    localStorage.setItem(
      "search_dates",
      JSON.stringify({ checkIn: checkInDate, checkOut: checkOutDate }),
    );

    const params = {
      destination: destination.trim(),
      checkIn: checkInDate,
      checkOut: checkOutDate,
      adults: guests.adults,
      children: guests.children,
      rooms: guests.rooms,
    };
    if (onSearch) {
      onSearch(params);
    } else {
      navigate(`/hotels?${new URLSearchParams(params).toString()}`);
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
              placeholder="Nhập địa điểm..."
              value={destination}
              onChange={(e) => {
                setDestination(e.target.value);
                setActiveTab("dest");
              }}
              onFocus={() => setActiveTab("dest")}
              className="w-full font-bold outline-none text-sm text-gray-800"
            />
          </div>
        </div>

        {/* 2. NGÀY NHẬN / TRẢ PHÒNG */}
        <div
          className="relative md:col-span-4 bg-white rounded flex items-center px-4 py-2.5 cursor-pointer"
          onClick={() => setActiveTab(activeTab === "date" ? null : "date")}
        >
          <span className="mr-3 text-lg">📅</span>
          <div className="w-full">
            <span className="text-[10px] text-gray-400 block font-bold uppercase">
              Ngày nhận — Ngày trả
            </span>
            <div className="text-sm font-bold text-gray-800">
              {checkInDate} — {checkOutDate}
            </div>
          </div>
          {activeTab === "date" && (
            <div
              className="absolute top-[110%] left-0 bg-white border rounded-xl shadow-2xl p-5 z-[100] w-72"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="date"
                  value={checkInDate}
                  onChange={(e) => setCheckInDate(e.target.value)}
                  className="w-full border-b font-bold text-sm outline-none"
                />
                <input
                  type="date"
                  value={checkOutDate}
                  onChange={(e) => setCheckOutDate(e.target.value)}
                  className="w-full border-b font-bold text-sm outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => setActiveTab(null)}
                className="w-full bg-[#006ce4] text-white py-2 rounded mt-4 font-bold text-xs uppercase"
              >
                Xác nhận
              </button>
            </div>
          )}
        </div>

        {/* 3. KHÁCH & PHÒNG */}
        <div
          className="relative md:col-span-3 bg-white rounded flex items-center px-4 py-2.5 cursor-pointer"
          onClick={() => setActiveTab(activeTab === "guest" ? null : "guest")}
        >
          <span className="mr-3 text-lg">👤</span>
          <div className="w-full">
            <span className="text-[10px] text-gray-400 block font-bold uppercase">
              Số lượng
            </span>
            <div className="text-sm font-bold text-gray-800 truncate">
              {guests.adults} lớn · {guests.children} trẻ · {guests.rooms} phòng
            </div>
          </div>
          {activeTab === "guest" && (
            <div
              className="absolute top-[110%] right-0 bg-white border rounded-xl shadow-2xl p-5 z-[100] w-72"
              onClick={(e) => e.stopPropagation()}
            >
              {["adults", "children", "rooms"].map((type) => (
                <div
                  key={type}
                  className="flex justify-between items-center mb-4"
                >
                  <span className="capitalize font-bold text-sm">
                    {type === "adults"
                      ? "Người lớn"
                      : type === "children"
                        ? "Trẻ em"
                        : "Số phòng"}
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleGuestChange(type, -1)}
                      className="w-8 h-8 border border-[#006ce4] text-[#006ce4] rounded font-bold"
                    >
                      -
                    </button>
                    <span className="font-bold w-4 text-center">
                      {guests[type]}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleGuestChange(type, 1)}
                      className="w-8 h-8 border border-[#006ce4] text-[#006ce4] rounded font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setActiveTab(null)}
                className="w-full bg-white border-2 border-[#006ce4] text-[#006ce4] py-2 rounded font-extrabold text-xs uppercase mt-2"
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
            className="w-full h-full bg-[#006ce4] hover:bg-blue-700 text-white font-bold rounded text-base transition-all shadow-lg"
          >
            Tìm
          </button>
        </div>
      </form>
    </div>
  );
};

export default HotelFilter;
