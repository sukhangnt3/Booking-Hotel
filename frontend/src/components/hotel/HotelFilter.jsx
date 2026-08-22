import React, { useState, useRef, useEffect, forwardRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bed,
  Calendar as CalendarIcon,
  Users,
  Search,
  Plus,
  Minus,
  History,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import DatePicker, { registerLocale } from "react-datepicker";
import { vi } from "date-fns/locale/vi";

import { Button } from "../ui";
import hotelService from "@/services/hotelService";
import { cn } from "@/utils/cn";

import "react-datepicker/dist/react-datepicker.css";

// Đăng ký tiếng Việt cho lịch
registerLocale("vi", vi);

const POPULAR_DESTINATIONS = [
  "Đà Nẵng",
  "TP. Hồ Chí Minh",
  "Hà Nội",
  "Băng Cốc",
  "Nha Trang",
  "Thượng Hải",
  "Đà Lạt",
  "Phan Thiết",
  "Vũng Tàu",
  "Đảo Phú Quốc",
];

const formatDateShort = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}`;
};

const formatDateVN = (date) => {
  if (!date) return "";
  const days = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
  return `${days[date.getDay()]}, ${date.getDate()} thg ${date.getMonth() + 1}`;
};

const HotelFilter = ({ onSearch, className = "" }) => {
  const navigate = useNavigate();
  const filterRef = useRef(null);

  const [destination, setDestination] = useState("");
  const [destinations, setDestinations] = useState([]);
  const [dateRange, setDateRange] = useState([null, null]);
  const [startDate, endDate] = dateRange;
  const [guests, setGuests] = useState({ adults: 2, children: 0, rooms: 1 });
  const [activeTab, setActiveTab] = useState(null); // 'dest' | 'date' | 'guest'
  const [loadingDest, setLoadingDest] = useState(false);

  const [recentSearches, setRecentSearches] = useState(() => {
    try {
      const saved = localStorage.getItem("booking_recent_searches");
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed.slice(0, 3) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setActiveTab(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const saveToRecent = (searchObj) => {
    if (!searchObj.destination || !searchObj.destination.trim()) return;

    let finalStart = searchObj.startDate;
    let finalEnd = searchObj.endDate;

    if (!finalStart || !finalEnd) {
      const today = new Date();
      const tomorrow = new Date();
      tomorrow.setDate(today.getDate() + 1);
      finalStart = today.toISOString();
      finalEnd = tomorrow.toISOString();
    }

    const newItem = {
      id: Date.now(),
      destination: searchObj.destination.trim(),
      startDate: finalStart,
      endDate: finalEnd,
      adults: searchObj.adults || 1,
      children: searchObj.children || 0,
      rooms: searchObj.rooms || 1,
    };

    const filtered = recentSearches.filter(
      (item) => item.destination.toLowerCase() !== newItem.destination.toLowerCase()
    );

    const updated = [newItem, ...filtered].slice(0, 3);
    setRecentSearches(updated);
    localStorage.setItem("booking_recent_searches", JSON.stringify(updated));
  };

  const handleSelectRecent = (item) => {
    setDestination(item.destination);
    if (item.startDate && item.endDate) {
      setDateRange([new Date(item.startDate), new Date(item.endDate)]);
    }
    setGuests({
      adults: item.adults,
      children: item.children,
      rooms: item.rooms,
    });
    setActiveTab(null);
  };

  const handleGuestChange = (field, delta) => {
    setGuests((prev) => {
      const val = prev[field] + delta;
      const min = field === "children" ? 0 : 1;
      return val < min ? prev : { ...prev, [field]: val };
    });
  };

  const handleFinalSearch = (e) => {
    if (e) e.preventDefault();

    if (destination) {
      saveToRecent({
        destination,
        startDate: startDate ? startDate.toISOString() : null,
        endDate: endDate ? endDate.toISOString() : null,
        adults: guests.adults,
        children: guests.children,
        rooms: guests.rooms,
      });
    }

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

  const renderDateText = (item) => {
    const start = formatDateShort(item.startDate);
    const end = formatDateShort(item.endDate);
    if (start && end) return `${start} - ${end}`;
    if (start) return `${start} -`;
    return "";
  };

  const nightCount =
    startDate && endDate
      ? Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24))
      : 0;

  return (
    <div
      ref={filterRef}
      className={cn("w-full max-w-7xl mx-auto relative z-[100]", className)}
    >
      <form
        onSubmit={handleFinalSearch}
        className="bg-[#ffb700] p-1 rounded-xl shadow-2xl grid grid-cols-1 lg:grid-cols-12 gap-1"
      >
        {/* SECTION 1: NHẬP ĐỊA ĐIỂM */}
        <div className="lg:col-span-4 relative">
          <div
            onClick={() => setActiveTab("dest")}
            className={cn(
              "h-14 bg-white rounded-lg flex items-center px-3 cursor-pointer border-2 transition-all",
              activeTab === "dest" ? "border-yellow-500" : "border-transparent"
            )}
          >
            <Bed className="text-gray-500 mr-3 shrink-0" size={24} />
            <div className="flex flex-col w-full overflow-hidden">
              <span className="text-[11px] text-blue-600 font-medium leading-none mb-1">
                Nhập điểm đến
              </span>
              <input
                type="text"
                placeholder="Bạn muốn đến đâu?"
                value={destination}
                onChange={(e) => {
                  setDestination(e.target.value);
                  setActiveTab("dest");
                }}
                className="w-full text-sm font-bold text-gray-800 placeholder-gray-500 outline-none bg-transparent p-0 border-none focus:ring-0"
              />
            </div>
            {destination && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setDestination("");
                }}
                className="text-gray-400 hover:text-gray-600 ml-1"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {activeTab === "dest" && (
            <div className="absolute top-[110%] left-0 w-[550px] max-w-[90vw] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 z-50 p-5">
              {destination.length < 2 && recentSearches.length > 0 && (
                <div className="mb-4">
                  <div className="text-base font-bold text-gray-900 mb-3">
                    Tìm kiếm gần đây
                  </div>
                  <div className="space-y-2">
                    {recentSearches.slice(0, 3).map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleSelectRecent(item)}
                        className="flex items-center justify-between hover:bg-gray-50 p-2 rounded-lg cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <History size={18} className="text-gray-800 shrink-0" />
                          <span className="text-sm font-bold text-gray-900">
                            {item.destination}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-slate-500 font-medium">
                          {renderDateText(item) && (
                            <span>{renderDateText(item)}</span>
                          )}
                          <span>|</span>
                          <span>
                            {item.rooms || 1} phòng, {item.adults || 1} Người Lớn, {item.children || 0} Trẻ Em
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {destination.length < 2 && recentSearches.length > 0 && (
                <hr className="border-gray-200 my-4" />
              )}

              {destination.length < 2 && (
                <div>
                  <div className="text-base font-bold text-gray-900 mb-4">
                    Điểm đến phổ biến
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-y-4 gap-x-2">
                    {POPULAR_DESTINATIONS.map((city, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          setDestination(city);
                          setActiveTab(null);
                        }}
                        className="text-sm font-semibold text-gray-800 hover:text-blue-600 cursor-pointer transition-colors"
                      >
                        {city}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {destination.length >= 2 && destinations.length > 0 && (
                <div className="space-y-1">
                  {destinations.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setDestination(item.name);
                        setActiveTab(null);
                      }}
                      className="px-3 py-2.5 hover:bg-gray-50 rounded-lg flex items-center gap-3 cursor-pointer"
                    >
                      <Bed size={18} className="text-gray-400" />
                      <span className="text-sm font-bold text-gray-800">
                        {item.name}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {loadingDest && (
                <div className="p-3 text-center text-xs text-gray-400 font-medium">
                  Đang tìm kiếm...
                </div>
              )}
            </div>
          )}
        </div>

        {/* SECTION 2: NGÀY THÁNG  */}
        <div className="lg:col-span-4 relative">
          <div
            onClick={() => setActiveTab(activeTab === "date" ? null : "date")}
            className={cn(
              "h-14 bg-white rounded-lg flex items-center px-3 cursor-pointer border-2 transition-all",
              activeTab === "date" ? "border-yellow-500" : "border-transparent"
            )}
          >
            <CalendarIcon className="text-gray-500 mr-3 shrink-0" size={24} />
            <div className="flex flex-col flex-1 overflow-hidden">
              <span className="text-[11px] text-blue-600 font-medium leading-none mb-1">
                Ngày nhận phòng — Ngày trả phòng
              </span>
              <span className="text-sm font-bold text-gray-800 truncate">
                {startDate && endDate
                  ? `${formatDateVN(startDate)} – ${formatDateVN(endDate)}`
                  : "Chọn ngày nhận & trả phòng"}
              </span>
            </div>
            {(startDate || endDate) && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setDateRange([null, null]);
                }}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {activeTab === "date" && (
            <div className="absolute top-[110%] left-0 bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 z-50 animate-in fade-in zoom-in-95">
              <DatePicker
                inline
                calendarClassName="booking-datepicker"
                selectsRange={true}
                startDate={startDate}
                endDate={endDate}
                onChange={(update) => {
                  setDateRange(update);
                  if (update[0] && update[1]) {
                    setActiveTab(null);
                  }
                }}
                monthsShown={2}
                minDate={new Date()}
                locale="vi"
                renderCustomHeader={({
                  monthDate,
                  customHeaderCount,
                  decreaseMonth,
                  increaseMonth,
                  prevMonthButtonDisabled,
                  nextMonthButtonDisabled,
                }) => (
                  <div className="flex items-center justify-between px-2 py-1 bg-white">
                    {customHeaderCount === 0 ? (
                      <button
                        type="button"
                        onClick={decreaseMonth}
                        disabled={prevMonthButtonDisabled}
                        className="p-1.5 hover:bg-gray-100 rounded-full disabled:opacity-20 text-gray-700"
                      >
                        <ChevronLeft size={20} />
                      </button>
                    ) : (
                      <div className="w-8" />
                    )}

                    <span className="text-base font-bold text-gray-900 capitalize">
                      tháng {monthDate.getMonth() + 1}, {monthDate.getFullYear()}
                    </span>

                    {customHeaderCount === 1 ? (
                      <button
                        type="button"
                        onClick={increaseMonth}
                        disabled={nextMonthButtonDisabled}
                        className="p-1.5 hover:bg-gray-100 rounded-full disabled:opacity-20 text-gray-700"
                      >
                        <ChevronRight size={20} />
                      </button>
                    ) : (
                      <div className="w-8" />
                    )}
                  </div>
                )}
              />

              <div className="border-t border-gray-100 pt-3 mt-2 flex items-center justify-between text-xs text-gray-500 px-2">
                <span>• Chọn khoảng thời gian lưu trú của bạn</span>
                <div className="text-right">
                  {startDate && endDate ? (
                    <div className="text-sm font-bold text-gray-900">
                      {formatDateVN(startDate)} – {formatDateVN(endDate)}{" "}
                      <span className="text-blue-600">({nightCount} đêm)</span>
                    </div>
                  ) : (
                    <div>Chọn ngày nhận và trả phòng</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 3: KHÁCH & PHÒNG */}
        <div className="lg:col-span-3 relative">
          <div
            onClick={() => setActiveTab(activeTab === "guest" ? null : "guest")}
            className={cn(
              "h-14 bg-white rounded-lg flex items-center px-4 cursor-pointer border-2 transition-all",
              activeTab === "guest" ? "border-yellow-500" : "border-transparent"
            )}
          >
            <Users className="text-gray-400 mr-3 shrink-0" size={20} />
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-400 font-bold uppercase leading-none mb-1">
                Số khách & Phòng
              </span>
              <span className="text-sm font-bold text-gray-800 truncate">
                {guests.adults} lớn · {guests.children} trẻ · {guests.rooms} phòng
              </span>
            </div>
          </div>

          {activeTab === "guest" && (
            <div className="absolute top-[110%] right-0 w-72 bg-white rounded-xl shadow-2xl p-6 border border-gray-100 animate-in fade-in zoom-in-95 z-50">
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