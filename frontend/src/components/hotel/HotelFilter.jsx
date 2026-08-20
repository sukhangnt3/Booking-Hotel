import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  MapPin,
  Calendar as CalendarIcon,
  Users,
  Search,
  Plus,
  Minus,
  X,
} from "lucide-react";
import { Button, Input, DatePicker } from "../ui";
import hotelService from "@/services/hotelService";
import { cn } from "@/utils/cn";

const HotelFilter = ({ onSearch, className = "" }) => {
  const navigate = useNavigate();
  const filterRef = useRef(null);

  // 1. STATE QUẢN LÝ
  const [destination, setDestination] = useState("");
  const [destinations, setDestinations] = useState([]);
  const [dateRange, setDateRange] = useState([null, null]);
  const [startDate, endDate] = dateRange;
  const [guests, setGuests] = useState({ adults: 2, children: 0, rooms: 1 });
  const [activeTab, setActiveTab] = useState(null); // 'dest' | 'date' | 'guest'
  const [loadingDest, setLoadingDest] = useState(false);

  // 2. CLICK OUTSIDE: Đóng menu khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setActiveTab(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 3. DEBOUNCE TÌM KIẾM ĐỊA ĐIỂM
  useEffect(() => {
    if (destination.length < 2) {
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
      return val < min ? prev : { ...prev, [field]: val };
    });
  };

  const handleFinalSearch = (e) => {
    if (e) e.preventDefault();
    const params = {
      destination: destination.trim(),
      checkIn: startDate?.toISOString(),
      checkOut: endDate?.toISOString(),
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
    <div
      ref={filterRef}
      className={cn("w-full max-w-7xl mx-auto relative z-[100]", className)}
    >
      <form
        onSubmit={handleFinalSearch}
        className="bg-[#ffb700] p-1 rounded-xl shadow-2xl grid grid-cols-1 lg:grid-cols-12 gap-1"
      >
        {/* SECTION 1: ĐỊA ĐIỂM */}
        <div className="lg:col-span-4 relative">
          <Input
            placeholder="Bạn muốn đến đâu?"
            value={destination}
            onChange={(e) => {
              setDestination(e.target.value);
              setActiveTab("dest");
            }}
            onFocus={() => setActiveTab("dest")}
            leftIcon={<MapPin className="text-gray-400" size={20} />}
            className="border-none h-14 rounded-lg focus:ring-0"
            clearable
            onClear={() => setDestination("")}
          />

          {/* Dropdown gợi ý địa điểm */}
          {activeTab === "dest" && destinations.length > 0 && (
            <div className="absolute top-[110%] left-0 w-full bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95">
              {destinations.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setDestination(item.name);
                    setActiveTab(null);
                  }}
                  className="px-4 py-3 hover:bg-gray-50 flex items-center gap-3 cursor-pointer border-b last:border-0"
                >
                  <MapPin size={16} className="text-gray-400" />
                  <span className="text-sm font-bold text-gray-700">
                    {item.name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SECTION 2: NGÀY THÁNG */}
        <div className="lg:col-span-4 bg-white rounded-lg h-14 flex items-center relative">
          <DatePicker
            startDate={startDate}
            endDate={endDate}
            onChange={(update) => setDateRange(update)}
            placeholderText="Ngày nhận - Ngày trả"
            className="h-full border-none"
          />
        </div>

        {/* SECTION 3: KHÁCH & PHÒNG */}
        <div className="lg:col-span-3 relative">
          <div
            onClick={() => setActiveTab(activeTab === "guest" ? null : "guest")}
            className="h-14 bg-white rounded-lg flex items-center px-4 cursor-pointer hover:bg-gray-50 transition-colors"
          >
            <Users className="text-gray-400 mr-3 shrink-0" size={20} />
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-400 font-bold uppercase leading-none mb-1">
                Số khách & Phòng
              </span>
              <span className="text-sm font-bold text-gray-800 truncate">
                {guests.adults} lớn · {guests.children} trẻ · {guests.rooms}{" "}
                phòng
              </span>
            </div>
          </div>

          {activeTab === "guest" && (
            <div className="absolute top-[110%] right-0 w-72 bg-white rounded-xl shadow-2xl p-6 border border-gray-100 animate-in fade-in zoom-in-95">
              {[
                { label: "Người lớn", key: "adults" },
                { label: "Trẻ em", key: "children" },
                { label: "Phòng", key: "rooms" },
              ].map((item) => (
                <div
                  key={item.key}
                  className="flex justify-between items-center mb-5 last:mb-0"
                >
                  <span className="font-bold text-gray-700">{item.label}</span>
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => handleGuestChange(item.key, -1)}
                      className="w-8 h-8 rounded-full border border-blue-600 text-blue-600 flex items-center justify-center hover:bg-blue-50 disabled:opacity-30 transition-colors"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="font-bold text-sm w-4 text-center">
                      {guests[item.key]}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleGuestChange(item.key, 1)}
                      className="w-8 h-8 rounded-full border border-blue-600 text-blue-600 flex items-center justify-center hover:bg-blue-50 transition-colors"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              ))}
              <Button
                variant="outline"
                className="w-full mt-6 h-10 text-xs font-black uppercase tracking-wider"
                onClick={() => setActiveTab(null)}
              >
                Xong
              </Button>
            </div>
          )}
        </div>

        {/* SECTION 4: NÚT TÌM KIẾM */}
        <div className="lg:col-span-1">
          <Button type="submit" className="w-full h-14 rounded-lg shadow-lg">
            <Search size={24} className="lg:hidden mr-2" />
            <span className="lg:text-lg">Tìm</span>
          </Button>
        </div>
      </form>
    </div>
  );
};

export default HotelFilter;
