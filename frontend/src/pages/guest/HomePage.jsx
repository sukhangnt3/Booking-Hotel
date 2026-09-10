// src/pages/guest/HomePage.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp,
  ChevronRight,
  ChevronLeft,
  Flame,
  Search,
  Calendar as CalendarIcon,
  Moon,
  Users,
} from "lucide-react";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  isSameDay,
  isBefore,
  isAfter,
  startOfToday,
  differenceInDays,
  addDays,
  isWithinInterval,
} from "date-fns";
import { vi } from "date-fns/locale";

import { HotelCard } from "@/components/hotel";
import { hotelService } from "@/services";

const HERO_BG_IMAGE =
  "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=2000&q=80";

const BACKEND_BASE_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/api\/?$/, "");

const CITY_LANDMARK_IMAGES = {
  "Hồ Chí Minh":
    "https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=800",
  "TP. Hồ Chí Minh":
    "https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=800",
  "Hà Nội":
    "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800",
  "Đà Nẵng": "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=800",
  "Nha Trang":
    "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=800",
  "Phú Quốc":
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800",
  "Đà Lạt":
    "https://images.unsplash.com/photo-1517824806704-9040b037703b?w=800",
  "Vũng Tàu":
    "https://images.unsplash.com/photo-1590523277543-a94d2e4eb00b?w=800",
};

const DEFAULT_LANDMARK =
  "https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=800";

const parseImageUrl = (img) => {
  if (!img)
    return "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600";
  let raw = typeof img === "string" ? img : img.url || img.path || "";
  raw = String(raw).trim();
  if (!raw || raw.startsWith("blob:"))
    return "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600";
  if (
    raw.startsWith("http://") ||
    raw.startsWith("https://") ||
    raw.startsWith("data:image/")
  )
    return raw;
  const cleanPath = raw.startsWith("/") ? raw : `/${raw}`;
  return `${BACKEND_BASE_URL}${cleanPath}`;
};

export default function HomePage() {
  const navigate = useNavigate();

  const [trendingDestinations, setTrendingDestinations] = useState([]);
  const [uniqueStays, setUniqueStays] = useState([]);
  const [favoriteHotelIds, setFavoriteHotelIds] = useState(new Set());
  const [loading, setLoading] = useState(true);

  // State vị trí trượt Carousel (chỉ hiển thị 4 cái)
  const [newestIndex, setNewestIndex] = useState(0);
  const VISIBLE_COUNT = 4;

  const today = startOfToday();
  const [destination, setDestination] = useState("");
  const [isDestDropdownOpen, setIsDestDropdownOpen] = useState(false);

  const [checkInDate, setCheckInDate] = useState(today);
  const [checkOutDate, setCheckOutDate] = useState(addDays(today, 1));
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(today);
  const [hoverDate, setHoverDate] = useState(null);

  const [rooms, setRooms] = useState(1);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [isGuestOpen, setIsGuestOpen] = useState(false);

  const destRef = useRef(null);
  const calendarRef = useRef(null);
  const guestRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    const fetchRealData = async () => {
      setLoading(true);
      try {
        let apiHotels = [];
        try {
          const res = await hotelService.getAll();
          apiHotels = Array.isArray(res) ? res : res?.data || [];
        } catch (e) {
          console.error("Lỗi lấy danh sách khách sạn:", e);
        }

        const formattedHotels = apiHotels.map((h) => {
          const hotelId = String(h.id);
          const rawImg = h.image || h.thumbnail || "";
          const price = Number(h.min_price || h.base_price || 500000);

          return {
            ...h,
            id: hotelId,
            title: h.name || "Khách sạn nghỉ dưỡng",
            name: h.name || "Khách sạn nghỉ dưỡng",
            city: h.city || "Việt Nam",
            location: h.address
              ? `${h.address}, ${h.city}`
              : h.city || "Việt Nam",
            image: parseImageUrl(rawImg),
            salePrice: price,
            min_price: price,
            star_rating: Number(h.star_rating || 3),
            stars: Number(h.star_rating || 3),
            rating: Number(h.average_rating || 9.0),
            review_count: Number(h.review_count || 0),
          };
        });

        // SẮP XẾP MỚI NHẤT LÊN ĐẦU
        formattedHotels.sort((a, b) => {
          const dateA = new Date(a.created_at || a.createdAt || 0).getTime();
          const dateB = new Date(b.created_at || b.createdAt || 0).getTime();
          if (dateB !== dateA) return dateB - dateA;
          return (Number(b.id) || 0) - (Number(a.id) || 0);
        });

        const cityStatsMap = new Map();
        formattedHotels.forEach((h) => {
          const cityName = h.city || "Hồ Chí Minh";
          if (!cityStatsMap.has(cityName)) {
            cityStatsMap.set(cityName, {
              name: cityName,
              hotelCount: 0,
              image: CITY_LANDMARK_IMAGES[cityName] || DEFAULT_LANDMARK,
            });
          }
          cityStatsMap.get(cityName).hotelCount += 1;
        });

        const validTrendingCities = Array.from(cityStatsMap.values())
          .filter((c) => c.hotelCount > 0)
          .sort((a, b) => b.hotelCount - a.hotelCount)
          .map((c, index) => ({
            ...c,
            rank: index + 1,
            countText: `${c.hotelCount} cơ sở lưu trú`,
            isTop1: index === 0,
          }));

        let favIdsSet = new Set();
        try {
          if (hotelService?.getFavorites) {
            const myFavs = await hotelService.getFavorites();
            const favList = Array.isArray(myFavs) ? myFavs : myFavs?.data || [];
            favIdsSet = new Set(
              favList.map((item) => String(item.id || item.hotel_id)),
            );
          }
        } catch (e) {}

        if (!isMounted) return;

        setUniqueStays(formattedHotels);
        setTrendingDestinations(validTrendingCities);
        setFavoriteHotelIds(favIdsSet);
      } catch (error) {
        console.error("Lỗi tải trang chủ:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchRealData();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (destRef.current && !destRef.current.contains(e.target))
        setIsDestDropdownOpen(false);
      if (calendarRef.current && !calendarRef.current.contains(e.target))
        setIsCalendarOpen(false);
      if (guestRef.current && !guestRef.current.contains(e.target))
        setIsGuestOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectDestination = (destName) => {
    setDestination(destName);
    setIsDestDropdownOpen(false);
    setIsCalendarOpen(true);
  };

  const handleDateClick = (date) => {
    if (isBefore(date, today)) return;
    if (!checkInDate || (checkInDate && checkOutDate)) {
      setCheckInDate(date);
      setCheckOutDate(null);
    } else if (checkInDate && !checkOutDate) {
      if (isBefore(date, checkInDate) || isSameDay(date, checkInDate)) {
        setCheckInDate(date);
      } else {
        setCheckOutDate(date);
        setIsCalendarOpen(false);
      }
    }
  };

  const totalNights =
    checkInDate && checkOutDate
      ? Math.max(1, differenceInDays(checkOutDate, checkInDate))
      : 1;

  const maxNewestIndex = Math.max(0, uniqueStays.length - VISIBLE_COUNT);

  const handlePrevNewest = () => {
    setNewestIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNextNewest = () => {
    setNewestIndex((prev) => Math.min(maxNewestIndex, prev + 1));
  };

  const renderMonthCalendar = (monthDate) => {
    const start = startOfMonth(monthDate);
    const end = endOfMonth(monthDate);
    const days = eachDayOfInterval({ start, end });
    const startDayIndex = (getDay(start) + 6) % 7;
    const blanks = Array.from({ length: startDayIndex });

    const weekHeaders = [
      { label: "T2", isWeekend: false },
      { label: "T3", isWeekend: false },
      { label: "T4", isWeekend: false },
      { label: "T5", isWeekend: false },
      { label: "T6", isWeekend: false },
      { label: "T7", isWeekend: true },
      { label: "CN", isWeekend: true },
    ];

    return (
      <div className="flex-1 min-w-[260px]">
        <div className="text-center font-black text-sm text-gray-900 mb-4 tracking-tight">
          {format(monthDate, "'Tháng' M, yyyy", { locale: vi })}
        </div>
        <div className="grid grid-cols-7 gap-1 text-center mb-2 pb-1 border-b border-gray-100">
          {weekHeaders.map((w, idx) => (
            <span
              key={idx}
              className={`text-xs font-bold ${w.isWeekend ? "text-[#006ce4]" : "text-gray-700"}`}
            >
              {w.label}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-1 text-center text-xs">
          {blanks.map((_, i) => (
            <div key={`blank-${i}`} className="h-9" />
          ))}
          {days.map((day) => {
            const isPast = isBefore(day, today);
            const isStart = checkInDate && isSameDay(day, checkInDate);
            const isEnd = checkOutDate && isSameDay(day, checkOutDate);
            const isInRange =
              checkInDate &&
              checkOutDate &&
              isWithinInterval(day, { start: checkInDate, end: checkOutDate });

            const isHoverRange =
              checkInDate &&
              !checkOutDate &&
              hoverDate &&
              isAfter(hoverDate, checkInDate) &&
              isWithinInterval(day, { start: checkInDate, end: hoverDate });

            const isWeekend = getDay(day) === 0 || getDay(day) === 6;

            let btnClasses =
              "h-9 w-full flex items-center justify-center text-xs transition-all relative ";

            if (isPast) {
              btnClasses += "text-gray-300 font-normal cursor-not-allowed";
            } else if (isStart && isEnd) {
              btnClasses +=
                "bg-[#006ce4] text-white rounded-lg z-10 font-black shadow-md";
            } else if (isStart) {
              btnClasses +=
                "bg-[#006ce4] text-white rounded-l-lg z-10 font-black shadow-md " +
                (checkOutDate ? "rounded-r-none" : "rounded-r-lg");
            } else if (isEnd) {
              btnClasses +=
                "bg-[#006ce4] text-white rounded-r-lg rounded-l-none z-10 font-black shadow-md";
            } else if (isInRange || isHoverRange) {
              btnClasses +=
                "bg-blue-50 text-blue-900 font-bold hover:bg-blue-100";
            } else {
              btnClasses += isWeekend
                ? "text-[#006ce4] font-bold hover:bg-gray-100 rounded-lg cursor-pointer"
                : "text-gray-900 font-semibold hover:bg-gray-100 rounded-lg cursor-pointer";
            }

            return (
              <button
                key={day.toISOString()}
                type="button"
                disabled={isPast}
                onClick={() => handleDateClick(day)}
                onMouseEnter={() => !checkOutDate && setHoverDate(day)}
                className={btnClasses}
              >
                {format(day, "d")}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    const query = new URLSearchParams();
    if (destination) {
      query.append("destination", destination);
      query.append("search", destination);
    }
    if (checkInDate) query.append("checkIn", format(checkInDate, "yyyy-MM-dd"));
    if (checkOutDate)
      query.append("checkOut", format(checkOutDate, "yyyy-MM-dd"));
    query.append("adults", adults);
    query.append("children", children);
    query.append("rooms", rooms);

    navigate(`/hotels?${query.toString()}`);
  };

  return (
    <div className="w-full pb-24 bg-gray-50/50 font-sans">
      {/* HERO BANNER */}
      <div
        className="relative w-full min-h-[480px] lg:min-h-[520px] bg-cover bg-center flex items-center overflow-visible"
        style={{
          backgroundImage: `url('${HERO_BG_IMAGE}')`,
          backgroundPosition: "center",
          backgroundSize: "cover",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-black/10 pointer-events-none" />

        <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 space-y-6">
              <div className="space-y-1.5 drop-shadow-md">
                <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight">
                  Trải nghiệm kỳ nghỉ tuyệt vời
                </h1>
                <p className="text-white/95 text-sm md:text-base font-normal">
                  Khám phá các khách sạn & resort sang trọng giá tốt nhất
                </p>
              </div>

              {/* BỘ LỌC TÌM KIẾM */}
              <div className="space-y-3">
                <div ref={destRef} className="relative">
                  <div
                    onClick={() => setIsDestDropdownOpen(true)}
                    className="flex items-center bg-white rounded-xl shadow-lg px-4 h-13 border border-gray-200 cursor-pointer focus-within:border-blue-600 transition-colors"
                  >
                    <Search size={20} className="text-gray-400 shrink-0 mr-3" />
                    <input
                      type="text"
                      placeholder="Bạn muốn đi đâu? (Nhập tên khách sạn hoặc thành phố...)"
                      value={destination}
                      onFocus={() => setIsDestDropdownOpen(true)}
                      onChange={(e) => setDestination(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleSearchSubmit()
                      }
                      className="w-full text-sm md:text-base font-bold text-gray-800 focus:outline-none placeholder:text-gray-400 placeholder:font-normal bg-transparent"
                    />
                  </div>

                  {isDestDropdownOpen && trendingDestinations.length > 0 && (
                    <div className="absolute left-0 top-full mt-2 w-full sm:w-[620px] bg-white rounded-2xl shadow-2xl border border-gray-200 p-5 z-50 animate-in fade-in zoom-in-95">
                      <h4 className="font-extrabold text-sm text-gray-900 mb-3.5 flex items-center gap-1.5">
                        <Flame size={16} className="text-orange-500" />
                        Điểm đến có chỗ nghỉ đang mở bán
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {trendingDestinations.map((item) => (
                          <div
                            key={item.name}
                            onClick={() => handleSelectDestination(item.name)}
                            className="flex items-center gap-3 p-2 rounded-xl hover:bg-blue-50/60 cursor-pointer transition-colors group"
                          >
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-11 h-11 rounded-xl object-cover shrink-0 shadow-sm group-hover:scale-105 transition-transform"
                            />
                            <div className="overflow-hidden">
                              <span className="font-bold text-sm text-gray-900 block group-hover:text-[#006ce4] transition-colors truncate">
                                {item.name}
                              </span>
                              <span className="text-[11px] text-gray-500 font-medium block truncate">
                                {item.countText}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* NGÀY & KHÁCH */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                  <div
                    ref={calendarRef}
                    className="relative md:col-span-7 bg-white rounded-xl shadow-lg border border-gray-200 p-2.5 cursor-pointer flex items-center justify-between hover:border-blue-600 transition-all select-none"
                    onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                  >
                    <div className="flex items-center gap-2.5">
                      <CalendarIcon size={20} className="text-gray-400" />
                      <div>
                        <span className="text-[11px] font-black text-slate-500 block leading-tight">
                          {checkInDate
                            ? format(checkInDate, "EEEE", { locale: vi })
                            : "Thứ ?"}
                        </span>
                        <span className="text-xs md:text-sm font-black text-gray-900 leading-none">
                          {checkInDate
                            ? format(checkInDate, "dd-MM-yyyy")
                            : "--/--/----"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-[11px] font-black text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
                      <span>{totalNights}</span>
                      <Moon size={12} className="text-blue-600" />
                    </div>

                    <div className="flex items-center gap-2.5">
                      <CalendarIcon size={20} className="text-gray-400" />
                      <div>
                        <span className="text-[11px] font-black text-gray-600 block leading-tight">
                          {checkOutDate
                            ? format(checkOutDate, "EEEE", { locale: vi })
                            : "Thứ ?"}
                        </span>
                        <span className="text-xs md:text-sm font-black text-gray-900 leading-none">
                          {checkOutDate
                            ? format(checkOutDate, "dd-MM-yyyy")
                            : "--/--/----"}
                        </span>
                      </div>
                    </div>

                    {isCalendarOpen && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute left-0 top-full mt-2 z-50 bg-white border border-gray-200 rounded-2xl shadow-2xl p-6 w-[320px] sm:w-[580px] md:w-[620px] animate-in fade-in cursor-default"
                      >
                        <div className="flex justify-between items-center mb-3 px-1">
                          <button
                            type="button"
                            onClick={() =>
                              setCurrentCalendarMonth((prev) =>
                                subMonths(prev, 1),
                              )
                            }
                            disabled={isBefore(
                              startOfMonth(currentCalendarMonth),
                              startOfMonth(today),
                            )}
                            className="p-2 rounded-full hover:bg-gray-100 text-gray-700 disabled:opacity-20 transition-colors cursor-pointer"
                          >
                            <ChevronLeft size={20} />
                          </button>

                          <span className="text-xs font-bold text-gray-500">
                            {!checkOutDate
                              ? "👉 Chọn ngày trả phòng"
                              : "✓ Đã chọn xong ngày"}
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              setCurrentCalendarMonth((prev) =>
                                addMonths(prev, 1),
                              )
                            }
                            className="p-2 rounded-full hover:bg-gray-100 text-gray-700 transition-colors cursor-pointer"
                          >
                            <ChevronRight size={20} />
                          </button>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-6 sm:divide-x sm:divide-gray-100">
                          {renderMonthCalendar(currentCalendarMonth)}
                          <div className="hidden sm:block sm:pl-6">
                            {renderMonthCalendar(
                              addMonths(currentCalendarMonth, 1),
                            )}
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-end text-xs">
                          <button
                            type="button"
                            onClick={() => setIsCalendarOpen(false)}
                            className="px-5 py-2 bg-[#003580] text-white font-bold rounded-xl shadow cursor-pointer"
                          >
                            Xong
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div
                    ref={guestRef}
                    className="relative md:col-span-3 bg-white rounded-xl shadow-lg border border-gray-200 p-2.5 cursor-pointer flex items-center gap-2.5 hover:border-blue-600 transition-all select-none"
                    onClick={() => setIsGuestOpen(!isGuestOpen)}
                  >
                    <Users size={20} className="text-gray-400 shrink-0" />
                    <div className="leading-tight overflow-hidden">
                      <span className="text-xs font-bold text-gray-800 block">
                        {rooms} Phòng
                      </span>
                      <span className="text-[11px] text-gray-500 font-medium truncate block">
                        {adults} người lớn, {children} trẻ em
                      </span>
                    </div>

                    {isGuestOpen && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute left-0 right-0 md:left-auto md:w-64 top-full mt-2 z-50 bg-white border border-gray-200 rounded-xl shadow-2xl p-4 space-y-3 cursor-default"
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-gray-700">
                            Phòng
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setRooms((r) => Math.max(1, r - 1))
                              }
                              className="w-7 h-7 rounded border border-gray-300 font-bold hover:bg-gray-100 cursor-pointer"
                            >
                              -
                            </button>
                            <span className="text-xs font-bold w-4 text-center">
                              {rooms}
                            </span>
                            <button
                              type="button"
                              onClick={() => setRooms((r) => r + 1)}
                              className="w-7 h-7 rounded border border-gray-300 font-bold hover:bg-gray-100 cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-gray-700">
                            Người lớn
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setAdults((a) => Math.max(1, a - 1))
                              }
                              className="w-7 h-7 rounded border border-gray-300 font-bold hover:bg-gray-100 cursor-pointer"
                            >
                              -
                            </button>
                            <span className="text-xs font-bold w-4 text-center">
                              {adults}
                            </span>
                            <button
                              type="button"
                              onClick={() => setAdults((a) => a + 1)}
                              className="w-7 h-7 rounded border border-gray-300 font-bold hover:bg-gray-100 cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setIsGuestOpen(false)}
                          className="w-full py-2 bg-[#003580] text-white text-xs font-bold rounded-lg mt-2 cursor-pointer"
                        >
                          Áp dụng
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleSearchSubmit}
                    className="md:col-span-2 h-full min-h-[48px] bg-[#003580] hover:bg-blue-900 text-white font-black text-base rounded-xl shadow-lg flex items-center justify-center transition-all active:scale-[0.98] cursor-pointer"
                  >
                    Tìm kiếm
                  </button>
                </div>
              </div>
            </div>

            {/* COMBO PROMO */}
            <div className="lg:col-span-4 h-full flex items-end">
              <div
                onClick={() => handleSearchSubmit()}
                className="w-full max-w-sm bg-white/95 backdrop-blur-md rounded-2xl p-5 shadow-2xl border border-white/50 space-y-2 cursor-pointer hover:bg-white transition-all group"
              >
                <div className="text-xs font-black text-blue-700 uppercase tracking-wide">
                  Hệ thống GoStay
                </div>
                <h3 className="text-lg font-black text-[#0a2540] leading-tight group-hover:text-blue-600 transition-colors">
                  ĐẶT PHÒNG TRỰC TUYẾN 24/7
                </h3>
                <div className="text-xs text-gray-600 space-y-1">
                  <p>
                    • {uniqueStays.length} cơ sở lưu trú đang sẵn sàng đón khách
                  </p>
                  <p>• Xác nhận tức thì - Đảm bảo giá tốt nhất</p>
                </div>
                <div className="pt-2 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    Khám phá ngay &rarr;
                  </span>
                  <div className="w-8 h-8 rounded-full bg-[#0a2540] group-hover:bg-blue-600 text-white flex items-center justify-center transition-all">
                    <ChevronRight size={16} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 1: ĐIỂM ĐẾN THỊNH HÀNH */}
      {trendingDestinations.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-14">
          <div className="mb-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="text-rose-500" size={24} />
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                Điểm đến đang thịnh hành
              </h2>
            </div>
            <p className="text-gray-500 text-sm mt-1">
              Các thành phố có cơ sở lưu trú đang mở bán được du khách lựa chọn
              nhiều nhất
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {trendingDestinations.map((place) => (
              <div
                key={place.name}
                onClick={() =>
                  navigate(
                    `/hotels?destination=${encodeURIComponent(place.name)}`,
                  )
                }
                className="relative rounded-2xl overflow-hidden group cursor-pointer shadow-md hover:shadow-xl transition-all duration-300 h-64 sm:h-72"
              >
                <img
                  src={place.image}
                  alt={place.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 select-none"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent pointer-events-none" />

                <div className="absolute bottom-5 left-5 text-white drop-shadow-md">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="text-2xl font-black tracking-tight">
                      {place.name}
                    </h3>
                    {place.isTop1 && (
                      <span className="bg-amber-400 text-slate-900 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full">
                        🔥 Top 1 Thịnh Hành
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-bold text-white/90">
                    {place.countText}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* SECTION 2: CHỖ NGHỈ NỔI BẬT & MỚI NHẤT */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 select-none">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Flame className="text-orange-500" size={24} />
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                Chỗ nghỉ nổi bật & Mới nhất
              </h2>
            </div>
            <p className="text-gray-500 text-sm mt-1">
              Các cơ sở lưu trú thực tế đang mở bán trên hệ thống GoStay
            </p>
          </div>

          {/* NÚT MŨI TÊN ĐIỀU HƯỚNG TRƯỢT */}
          {uniqueStays.length > VISIBLE_COUNT && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrevNewest}
                disabled={newestIndex === 0}
                className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all ${
                  newestIndex === 0
                    ? "border-gray-200 text-gray-300 cursor-not-allowed bg-gray-50"
                    : "border-gray-300 text-gray-700 hover:bg-[#003580] hover:text-white hover:border-[#003580] shadow-sm active:scale-95 cursor-pointer"
                }`}
                title="Xem khách sạn trước"
              >
                <ChevronLeft size={20} />
              </button>

              <button
                type="button"
                onClick={handleNextNewest}
                disabled={newestIndex >= maxNewestIndex}
                className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all ${
                  newestIndex >= maxNewestIndex
                    ? "border-gray-200 text-gray-300 cursor-not-allowed bg-gray-50"
                    : "border-gray-300 text-gray-700 hover:bg-[#003580] hover:text-white hover:border-[#003580] shadow-sm active:scale-95 cursor-pointer"
                }`}
                title="Xem thêm khách sạn tiếp theo"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="h-80 bg-gray-200 animate-pulse rounded-3xl"
              />
            ))}
          </div>
        ) : uniqueStays.length > 0 ? (
          <div className="overflow-hidden py-2 -my-2">
            <div
              className="flex flex-nowrap transition-transform duration-500 ease-out -mx-3"
              style={{
                transform: `translateX(-${newestIndex * 25}%)`,
              }}
            >
              {uniqueStays.map((stay) => {
                const stayId = String(stay.id);
                const isSavedInDb = favoriteHotelIds.has(stayId);

                return (
                  <div
                    key={stayId}
                    className="w-full sm:w-1/2 lg:w-1/4 shrink-0 px-3"
                  >
                    <HotelCard
                      id={stayId}
                      hotel={stay}
                      image={stay.image}
                      type={stay.type || "Khách sạn"}
                      title={stay.title || stay.name}
                      location={stay.location || stay.address}
                      rating={stay.rating || 9.0}
                      reviewsCount={stay.review_count || 0}
                      salePrice={stay.salePrice || stay.min_price || 650000}
                      stars={stay.star_rating || 3}
                      isFavoriteInitial={isSavedInDb}
                      onClick={() => navigate(`/hotel/${stayId}`)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="bg-white p-12 text-center rounded-3xl border border-slate-200 text-slate-400">
            Hiện chưa có cơ sở lưu trú nào được mở bán.
          </div>
        )}
      </section>
    </div>
  );
}
