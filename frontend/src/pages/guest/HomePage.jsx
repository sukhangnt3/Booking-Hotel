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
  MapPin,
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

// UI Components
import { Card, Badge, Button } from "@/components/ui";
import { HotelCard } from "@/components/hotel";

// Services & Helpers
import { hotelService } from "@/services";

const toSafeArray = (data) => {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.data)) return data.data;
  if (data && Array.isArray(data.favorites)) return data.favorites;
  if (data && Array.isArray(data.items)) return data.items;
  return [];
};

// 🏝️ LINK ẢNH NỀN RESORT BIỂN NHIỆT ĐỚI
const HERO_BG_IMAGE =
  "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=2000&q=80";

// 🌟 DANH SÁCH 9 ĐỊA ĐIỂM HOT NHẤT (CHUẨN THEO ẢNH)
const HOT_DESTINATIONS = [
  {
    name: "Đà Lạt",
    hotelCount: "1185 khách sạn",
    image:
      "https://images.unsplash.com/photo-1517824806704-9040b037703b?w=150&auto=format&fit=crop&q=80",
  },
  {
    name: "Phan Thiết",
    hotelCount: "426 khách sạn",
    image:
      "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=150&auto=format&fit=crop&q=80",
  },
  {
    name: "Nha Trang",
    hotelCount: "1025 khách sạn",
    image:
      "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=150&auto=format&fit=crop&q=80",
  },
  {
    name: "Phú Quốc",
    hotelCount: "920 khách sạn",
    image:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=150&auto=format&fit=crop&q=80",
  },
  {
    name: "Đà Nẵng",
    hotelCount: "1353 khách sạn",
    image:
      "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=150&auto=format&fit=crop&q=80",
  },
  {
    name: "Vũng Tàu",
    hotelCount: "524 khách sạn",
    image:
      "https://images.unsplash.com/photo-1590523277543-a94d2e4eb00b?w=150&auto=format&fit=crop&q=80",
  },
  {
    name: "Quy Nhơn",
    hotelCount: "326 khách sạn",
    image:
      "https://images.unsplash.com/photo-1544644181-1484b3fdfc62?w=150&auto=format&fit=crop&q=80",
  },
  {
    name: "Vịnh Hạ Long",
    hotelCount: "657 khách sạn",
    image:
      "https://images.unsplash.com/photo-1528127269322-539801943592?w=150&auto=format&fit=crop&q=80",
  },
  {
    name: "Hội An",
    hotelCount: "788 khách sạn",
    image:
      "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=150&auto=format&fit=crop&q=80",
  },
];

const HomePage = () => {
  const navigate = useNavigate();

  // ─── 1. STATES TRANG CHỦ ───
  const [pageData, setPageData] = useState({
    propertyTypes: [],
    trendingDestinations: [],
    uniqueStays: [],
  });
  const [favoriteHotelIds, setFavoriteHotelIds] = useState(new Set());
  const [loading, setLoading] = useState(true);

  // ─── 2. STATES TÌM KIẾM ───
  const today = startOfToday();
  const [destination, setDestination] = useState("");
  const [isDestDropdownOpen, setIsDestDropdownOpen] = useState(false);

  const [checkInDate, setCheckInDate] = useState(today);
  const [checkOutDate, setCheckOutDate] = useState(addDays(today, 1));
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(today);
  const [hoverDate, setHoverDate] = useState(null);

  // Số lượng khách & phòng
  const [rooms, setRooms] = useState(1);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [isGuestOpen, setIsGuestOpen] = useState(false);

  const destRef = useRef(null);
  const calendarRef = useRef(null);
  const guestRef = useRef(null);

  // ─── 3. FETCH DỮ LIỆU KHI MOUNT ───
  useEffect(() => {
    let isMounted = true;

    const fetchHomePageData = async () => {
      setLoading(true);
      try {
        const [typesData, trendingData, staysData, myFavoritesData] =
          await Promise.all([
            hotelService.getPropertyTypes(),
            hotelService.getTrendingDestinations(),
            hotelService.getUniqueStays(),
            hotelService.getFavoriteHotels(),
          ]);

        if (!isMounted) return;

        const favList = toSafeArray(myFavoritesData);
        const favIdsSet = new Set(
          favList.map((item) => String(item.id || item.hotel_id)),
        );
        setFavoriteHotelIds(favIdsSet);

        setPageData({
          propertyTypes: toSafeArray(typesData),
          trendingDestinations: toSafeArray(trendingData),
          uniqueStays: toSafeArray(staysData),
        });
      } catch (error) {
        console.error("Lỗi khi tải dữ liệu Trang chủ:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchHomePageData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Đóng các dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (destRef.current && !destRef.current.contains(e.target)) {
        setIsDestDropdownOpen(false);
      }
      if (calendarRef.current && !calendarRef.current.contains(e.target)) {
        setIsCalendarOpen(false);
      }
      if (guestRef.current && !guestRef.current.contains(e.target)) {
        setIsGuestOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Chọn địa điểm từ danh sách gợi ý
  const handleSelectDestination = (destName) => {
    setDestination(destName);
    setIsDestDropdownOpen(false);
    setIsCalendarOpen(true); // Mở tiếp ô chọn ngày cho tiện
  };

  // ─── 4. LOGIC CHỌN NGÀY TRÊN BỘ LỊCH ĐÔI ───
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

  // Render 1 tháng trong bộ lịch đôi
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
              className={`text-xs font-bold ${
                w.isWeekend ? "text-[#006ce4]" : "text-gray-700"
              }`}
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
                "bg-[#ff5b00] text-white rounded-lg z-10 font-black shadow-md";
            } else if (isStart) {
              btnClasses +=
                "bg-[#ff5b00] text-white rounded-l-lg z-10 font-black shadow-md " +
                (checkOutDate ? "rounded-r-none" : "rounded-r-lg");
            } else if (isEnd) {
              btnClasses +=
                "bg-[#ff5b00] text-white rounded-r-lg rounded-l-none z-10 font-black shadow-md";
            } else if (isInRange || isHoverRange) {
              btnClasses +=
                "bg-[#fff1e8] text-gray-900 font-bold hover:bg-[#ffe3d1]";
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

  // ─── 5. SUBMIT TÌM KIẾM ───
  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    const query = new URLSearchParams();
    if (destination) query.append("destination", destination);
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
      {/* ─── 🌟 HERO BANNER 🌟 ─── */}
      <div
        className="relative w-full min-h-[480px] lg:min-h-[520px] bg-cover bg-center flex items-center overflow-visible"
        style={{
          backgroundImage: `url('${HERO_BG_IMAGE}')`,
          backgroundPosition: "center",
          backgroundSize: "cover",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/35 to-black/10 pointer-events-none" />

        <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* 👈 CỘT TRÁI: TIÊU ĐỀ + BỘ TÌM KIẾM (8 COLS) */}
            <div className="lg:col-span-8 space-y-6">
              <div className="space-y-1.5 drop-shadow-md">
                <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight">
                  Trải nghiệm kỳ nghỉ tuyệt vời
                </h1>
                <p className="text-white/95 text-sm md:text-base font-normal">
                  Combo khách sạn - vé máy bay - đưa đón sân bay giá tốt nhất
                </p>
              </div>

              {/* BỘ LỌC TÌM KIẾM */}
              <div className="space-y-3">
                {/* 1. Ô ĐIỂM ĐẾN VÀ MENU GỢI Ý ĐỊA ĐIỂM HOT */}
                <div ref={destRef} className="relative">
                  <div
                    onClick={() => setIsDestDropdownOpen(true)}
                    className="flex items-center bg-white rounded-xl shadow-lg px-4 h-13 border border-gray-200 cursor-pointer focus-within:border-orange-500 transition-colors"
                  >
                    <Search size={20} className="text-gray-400 shrink-0 mr-3" />
                    <input
                      type="text"
                      placeholder="Bạn muốn đi đâu?"
                      value={destination}
                      onFocus={() => setIsDestDropdownOpen(true)}
                      onChange={(e) => setDestination(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleSearchSubmit()
                      }
                      className="w-full text-sm md:text-base font-bold text-gray-800 focus:outline-none placeholder:text-gray-400 placeholder:font-normal bg-transparent"
                    />
                  </div>

                  {/* 🌟 POPOVER MENU ĐỊA ĐIỂM TRONG NƯỚC HOT NHẤT 🌟 */}
                  {isDestDropdownOpen && (
                    <div className="absolute left-0 top-full mt-2 w-full sm:w-[620px] md:w-[680px] bg-white rounded-2xl shadow-2xl border border-gray-200 p-5 z-50 animate-in fade-in zoom-in-95">
                      <h4 className="font-extrabold text-sm text-gray-900 mb-3.5">
                        Địa điểm trong nước đang HOT nhất
                      </h4>

                      {/* Lưới 3 cột */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {HOT_DESTINATIONS.map((item) => (
                          <div
                            key={item.name}
                            onClick={() => handleSelectDestination(item.name)}
                            className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-orange-50/60 cursor-pointer transition-colors group"
                          >
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-12 h-12 rounded-xl object-cover shrink-0 shadow-sm group-hover:scale-105 transition-transform"
                            />
                            <div className="overflow-hidden">
                              <span className="font-bold text-sm text-gray-900 block leading-tight group-hover:text-[#ff5b00] transition-colors truncate">
                                {item.name}
                              </span>
                              <span className="text-[11px] text-gray-500 font-medium block truncate mt-0.5">
                                {item.hotelCount}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Ngày + Khách + Nút Tìm */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                  {/* Ô CHỌN NGÀY VỚI LỊCH ĐÔI */}
                  <div
                    ref={calendarRef}
                    className="relative md:col-span-7 bg-white rounded-xl shadow-lg border border-gray-200 p-2.5 cursor-pointer flex items-center justify-between hover:border-orange-500 transition-all select-none"
                    onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                  >
                    <div className="flex items-center gap-2.5">
                      <CalendarIcon size={20} className="text-gray-400" />
                      <div>
                        <span className="text-[11px] font-black text-rose-500 block leading-tight">
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
                      <Moon
                        size={12}
                        className="text-amber-500 fill-amber-500"
                      />
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

                    {/* BỘ LỊCH ĐÔI */}
                    {isCalendarOpen && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute left-0 top-full mt-2 z-50 bg-white border border-gray-200 rounded-2xl shadow-2xl p-6 w-[320px] sm:w-[580px] md:w-[620px] animate-in fade-in zoom-in-95 cursor-default"
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
                            className="p-2 rounded-full hover:bg-gray-100 text-gray-700 disabled:opacity-20 transition-colors"
                          >
                            <ChevronLeft size={20} />
                          </button>

                          <span className="text-xs font-bold text-gray-500">
                            {!checkOutDate
                              ? "👉 Nhấp chọn ngày trả phòng"
                              : "✓ Đã chọn ngày"}
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              setCurrentCalendarMonth((prev) =>
                                addMonths(prev, 1),
                              )
                            }
                            className="p-2 rounded-full hover:bg-gray-100 text-gray-700 transition-colors"
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

                        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                          <div className="text-gray-500 font-medium">
                            <span className="text-rose-500 font-bold">*</span>{" "}
                            Chọn ngày nhận phòng rồi chọn ngày trả phòng
                          </div>
                          <button
                            type="button"
                            onClick={() => setIsCalendarOpen(false)}
                            className="px-4 py-1.5 bg-[#ff5b00] hover:bg-[#e05000] text-white font-bold rounded-lg shadow-sm transition-colors"
                          >
                            Xong
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Ô CHỌN PHÒNG & KHÁCH */}
                  <div
                    ref={guestRef}
                    className="relative md:col-span-3 bg-white rounded-xl shadow-lg border border-gray-200 p-2.5 cursor-pointer flex items-center gap-2.5 hover:border-orange-500 transition-all select-none"
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
                              className="w-7 h-7 rounded border border-gray-300 font-bold hover:bg-gray-100"
                            >
                              -
                            </button>
                            <span className="text-xs font-bold w-4 text-center">
                              {rooms}
                            </span>
                            <button
                              type="button"
                              onClick={() => setRooms((r) => r + 1)}
                              className="w-7 h-7 rounded border border-gray-300 font-bold hover:bg-gray-100"
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
                              className="w-7 h-7 rounded border border-gray-300 font-bold hover:bg-gray-100"
                            >
                              -
                            </button>
                            <span className="text-xs font-bold w-4 text-center">
                              {adults}
                            </span>
                            <button
                              type="button"
                              onClick={() => setAdults((a) => a + 1)}
                              className="w-7 h-7 rounded border border-gray-300 font-bold hover:bg-gray-100"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-gray-700">
                            Trẻ em
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setChildren((c) => Math.max(0, c - 1))
                              }
                              className="w-7 h-7 rounded border border-gray-300 font-bold hover:bg-gray-100"
                            >
                              -
                            </button>
                            <span className="text-xs font-bold w-4 text-center">
                              {children}
                            </span>
                            <button
                              type="button"
                              onClick={() => setChildren((c) => c + 1)}
                              className="w-7 h-7 rounded border border-gray-300 font-bold hover:bg-gray-100"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setIsGuestOpen(false)}
                          className="w-full py-1.5 bg-[#ff5b00] text-white text-xs font-bold rounded-lg mt-2"
                        >
                          Áp dụng
                        </button>
                      </div>
                    )}
                  </div>

                  {/* NÚT TÌM MÀU CAM */}
                  <button
                    type="button"
                    onClick={handleSearchSubmit}
                    className="md:col-span-2 h-full min-h-[48px] bg-[#ff5b00] hover:bg-[#e05000] text-white font-black text-base rounded-xl shadow-lg flex items-center justify-center transition-all active:scale-[0.98]"
                  >
                    Tìm
                  </button>
                </div>
              </div>
            </div>

            {/* 👉 CỘT PHẢI: COMBO PROMO WIDGET (4 COLS) */}
            <div className="lg:col-span-4 flex justify-end">
              <div
                onClick={() => handleSearchSubmit()}
                className="w-full max-w-sm bg-white/95 backdrop-blur-md rounded-2xl p-5 shadow-2xl border border-white/50 space-y-2 cursor-pointer hover:bg-white transition-all group"
              >
                <div className="text-xs font-black text-gray-700 uppercase tracking-wide">
                  Combo 3N2Đ
                </div>
                <h3 className="text-lg font-black text-[#0f294d] leading-tight group-hover:text-[#ff5b00] transition-colors">
                  JW MARRIOTT PHU QUOC
                </h3>
                <div className="text-xs text-gray-600 space-y-1">
                  <p>• Bay khứ hồi - 02 đêm phòng Emerald Bay</p>
                  <p>• Ăn sáng - Tặng vé xem show "Kiss Of The Sea"</p>
                </div>
                <div className="pt-2 flex items-center justify-between">
                  <div>
                    <span className="text-xl font-black text-[#ff5b00]">
                      11.299.000
                    </span>
                    <span className="text-xs font-bold text-gray-700">
                      đ/khách
                    </span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-[#0f294d] group-hover:bg-[#ff5b00] text-white flex items-center justify-center transition-colors">
                    <ChevronRight size={16} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── SECTION 1: ĐIỂM ĐẾN ĐANG THỊNH HÀNH ─── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-14">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="text-rose-500" size={24} />
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                Điểm đến đang thịnh hành
              </h2>
            </div>
            <p className="text-gray-500 text-sm mt-1">
              Các lựa chọn phổ biến nhất cho du khách từ Việt Nam
            </p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2].map((n) => (
                <div
                  key={n}
                  className="h-64 bg-gray-200 animate-pulse rounded-2xl"
                />
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="h-60 bg-gray-200 animate-pulse rounded-2xl"
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Hàng 2 ảnh lớn */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pageData.trendingDestinations.slice(0, 2).map((place) => (
                <div
                  key={place.id || place.name}
                  onClick={() =>
                    navigate(`/hotels?destination=${place.title || place.name}`)
                  }
                  className="relative rounded-2xl overflow-hidden group cursor-pointer shadow-md h-64 md:h-72"
                >
                  <img
                    src={place.image}
                    alt={place.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-transparent h-28 pointer-events-none" />
                  <div className="absolute top-4 left-4 text-white flex items-center gap-2 drop-shadow-md">
                    <h3 className="text-xl md:text-2xl font-bold tracking-wide">
                      {place.title || place.name}
                    </h3>
                    <span className="text-lg">
                      {place.countryCode === "TH" ? "🇹🇭" : "🇻🇳"}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Hàng 3 ảnh nhỏ */}
            {pageData.trendingDestinations.length > 2 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {pageData.trendingDestinations.slice(2, 5).map((place) => (
                  <div
                    key={place.id || place.name}
                    onClick={() =>
                      navigate(
                        `/hotels?destination=${place.title || place.name}`,
                      )
                    }
                    className="relative rounded-2xl overflow-hidden group cursor-pointer shadow-md h-56 md:h-64"
                  >
                    <img
                      src={place.image}
                      alt={place.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-transparent h-28 pointer-events-none" />
                    <div className="absolute top-4 left-4 text-white flex items-center gap-2 drop-shadow-md">
                      <h3 className="text-lg md:text-xl font-bold tracking-wide">
                        {place.title || place.name}
                      </h3>
                      <span className="text-base">
                        {place.countryCode === "TH" ? "🇹🇭" : "🇻🇳"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* ─── SECTION 2: CHỖ NGHỈ ĐỘC ĐÁO HÀNG ĐẦU ─── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16">
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <Flame className="text-orange-500" size={24} />
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">
              Lưu trú tại các chỗ nghỉ độc đáo hàng đầu
            </h2>
          </div>
          <p className="text-gray-500 text-sm mt-1">
            Trải nghiệm các khu nghỉ dưỡng, biệt thự và căn hộ được đánh giá cao
            nhất
          </p>
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
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {pageData.uniqueStays.map((stay) => {
              const stayId = String(stay.id || stay.hotel_id || stay._id);
              const isSavedInDb = favoriteHotelIds.has(stayId);

              const computedPrice =
                stay.min_price ||
                stay.base_price ||
                stay.price ||
                stay.sell_price ||
                stay.rooms?.[0]?.base_price;

              return (
                <HotelCard
                  key={stayId}
                  id={stayId}
                  hotel={stay}
                  image={stay.image || stay.stay_image}
                  type={stay.type}
                  title={stay.title || stay.name}
                  location={stay.location || stay.address}
                  rating={stay.average_rating || stay.rating}
                  reviewsCount={stay.review_count || stay.reviewsCount}
                  salePrice={computedPrice}
                  stars={stay.star_rating || stay.stars}
                  isGenius={stay.isGenius}
                  isFavoriteInitial={isSavedInDb || stay.is_favorite}
                  onClick={() => navigate(`/hotel/${stayId}`)}
                />
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default HomePage;
