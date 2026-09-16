// src/pages/guest/HotelListPage.jsx
import React, { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  MapPin,
  Heart,
  Calendar as CalendarIcon,
  Moon,
  Users,
  Search,
  ArrowUpDown,
  Waves,
  Navigation,
  Star,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Flame,
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

import { Button } from "@/components/ui";
import { LoadingSpinner, EmptyState, Breadcrumb } from "@/components/common";

import { hotelService } from "@/services";
import { useAuthStore } from "@/stores/authStore";

const BACKEND_BASE_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/api\/?$/, "");

// Bản đồ ảnh riêng biệt cho từng thành phố
const CITY_LANDMARK_IMAGES = {
  "Hồ Chí Minh":
    "https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=800",
  "Khánh Hòa":
    "https://images.unsplash.com/photo-1575986767340-5d17ae767ab0?w=800",
  "Nha Trang":
    "https://images.unsplash.com/photo-1575986767340-5d17ae767ab0?w=800",
  "Hà Nội":
    "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800",
  "Đà Nẵng": "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=800",
  "Phú Quốc":
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800",
  "Đà Lạt":
    "https://images.unsplash.com/photo-1517824806704-9040b037703b?w=800",
  "Vũng Tàu":
    "https://images.unsplash.com/photo-1590523277543-a94d2e4eb00b?w=800",
  "Đồng Tháp":
    "https://images.unsplash.com/photo-1528127269322-539801943592?w=800",
};

const DEFAULT_LANDMARK =
  "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800";

const getCityLandmarkImage = (cityName = "") => {
  const norm = cityName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .trim();

  if (norm.includes("khanh hoa") || norm.includes("nha trang")) {
    return CITY_LANDMARK_IMAGES["Khánh Hòa"];
  }
  if (
    norm.includes("ho chi minh") ||
    norm.includes("sai gon") ||
    norm.includes("hcm")
  ) {
    return CITY_LANDMARK_IMAGES["Hồ Chí Minh"];
  }
  if (norm.includes("dong thap")) return CITY_LANDMARK_IMAGES["Đồng Tháp"];
  if (norm.includes("ha noi")) return CITY_LANDMARK_IMAGES["Hà Nội"];
  if (norm.includes("da nang")) return CITY_LANDMARK_IMAGES["Đà Nẵng"];
  if (norm.includes("phu quoc")) return CITY_LANDMARK_IMAGES["Phú Quốc"];
  if (norm.includes("da lat")) return CITY_LANDMARK_IMAGES["Đà Lạt"];
  if (norm.includes("vung tau")) return CITY_LANDMARK_IMAGES["Vũng Tàu"];

  return CITY_LANDMARK_IMAGES[cityName] || DEFAULT_LANDMARK;
};

const parseImageUrl = (img) => {
  if (!img)
    return "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80";
  let raw = typeof img === "string" ? img : img.url || img.path || "";
  raw = String(raw).trim();
  if (!raw || raw.startsWith("blob:"))
    return "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80";
  if (
    raw.startsWith("http://") ||
    raw.startsWith("https://") ||
    raw.startsWith("data:image/")
  )
    return raw;
  const cleanPath = raw.startsWith("/") ? raw : `/${raw}`;
  return `${BACKEND_BASE_URL}${cleanPath}`;
};

const removeVietnameseTones = (str) => {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
};

export default function HotelListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  const today = startOfToday();

  // Đọc params từ URL
  const initialDestination =
    searchParams.get("destination") || searchParams.get("search") || "";
  const initialCheckInStr = searchParams.get("checkIn") || "";
  const initialCheckOutStr = searchParams.get("checkOut") || "";
  const initialAdults = Number(searchParams.get("adults")) || 2;
  const initialChildren = Number(searchParams.get("children")) || 0;
  const initialRooms = Number(searchParams.get("rooms")) || 1;
  const initialStars =
    searchParams.get("stars")?.split(",").map(Number).filter(Boolean) || [];
  const sortBy = searchParams.get("sortBy") || "popular";

  // State cho thanh tìm kiếm ngang
  const [destInput, setDestInput] = useState(initialDestination);
  const [checkInDate, setCheckInDate] = useState(
    initialCheckInStr ? new Date(initialCheckInStr) : today,
  );
  const [checkOutDate, setCheckOutDate] = useState(
    initialCheckOutStr ? new Date(initialCheckOutStr) : addDays(today, 1),
  );
  const [adults, setAdults] = useState(initialAdults);
  const [children, setChildren] = useState(initialChildren);
  const [rooms, setRooms] = useState(initialRooms);

  // Dropdown popup state
  const [isDestDropdownOpen, setIsDestDropdownOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isGuestOpen, setIsGuestOpen] = useState(false);
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(today);
  const [hoverDate, setHoverDate] = useState(null);

  // Danh sách các điểm đến đang mở bán (giống hệt Homepage)
  const [trendingDestinations, setTrendingDestinations] = useState([]);

  const destRef = useRef(null);
  const calendarRef = useRef(null);
  const guestRef = useRef(null);

  // State dữ liệu danh sách khách sạn
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState({});

  const [searchHotelName, setSearchHotelName] = useState("");
  const [selectedStars, setSelectedStars] = useState(initialStars);
  const [selectedRating, setSelectedRating] = useState(null);

  // Khoảng giá tự động quét theo giá thực tế
  const [priceBounds, setPriceBounds] = useState({ min: 0, max: 5000000 });
  const [userPriceRange, setUserPriceRange] = useState([0, 5000000]);

  // Đóng dropdown khi click bên ngoài
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

  // Lấy toàn bộ danh sách khách sạn để thống kê điểm đến đang mở bán
  useEffect(() => {
    let isMounted = true;

    const fetchAllHotelsForDestinations = async () => {
      try {
        const res = await hotelService.getAll();
        const allList = Array.isArray(res) ? res : res?.data || [];

        const cityStatsMap = new Map();
        allList.forEach((h) => {
          const cityName = h.city ? h.city.trim() : "Hồ Chí Minh";
          if (!cityStatsMap.has(cityName)) {
            cityStatsMap.set(cityName, {
              name: cityName,
              hotelCount: 0,
              image: getCityLandmarkImage(cityName),
            });
          }
          cityStatsMap.get(cityName).hotelCount += 1;
        });

        const validTrending = Array.from(cityStatsMap.values())
          .filter((c) => c.hotelCount > 0)
          .sort((a, b) => b.hotelCount - a.hotelCount)
          .map((c) => ({
            ...c,
            countText: `${c.hotelCount} cơ sở lưu trú`,
          }));

        if (isMounted) {
          setTrendingDestinations(validTrending);
        }
      } catch (e) {
        console.warn("Lỗi tải điểm đến mở bán:", e);
      }
    };

    fetchAllHotelsForDestinations();

    return () => {
      isMounted = false;
    };
  }, []);

  // Gọi API lấy khách sạn mỗi khi URL Params thay đổi
  useEffect(() => {
    let isMounted = true;

    const fetchHotelsAndFavorites = async () => {
      setLoading(true);
      try {
        const destQuery =
          searchParams.get("destination") || searchParams.get("search") || "";
        const inQuery = searchParams.get("checkIn") || "";
        const outQuery = searchParams.get("checkOut") || "";
        const adQuery = searchParams.get("adults") || "2";
        const sortQuery = searchParams.get("sortBy") || "popular";

        const res = await (hotelService.searchHotels
          ? hotelService.searchHotels({
              destination: destQuery,
              checkIn: inQuery,
              checkOut: outQuery,
              adults: adQuery,
              sortBy: sortQuery,
            })
          : hotelService.getAll());
        const apiHotels = Array.isArray(res) ? res : res?.data || [];

        const formattedList = apiHotels.map((h) => {
          const hotelId = String(h.id);
          const rawImg = h.image || h.thumbnail || "";
          const price = Number(h.min_price || h.base_price || 650000);

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
            star_rating: Number(h.star_rating || 3),
            stars: Number(h.star_rating || 3),
            rating: Number(h.average_rating || 0),
            review_count: Number(h.review_count || 0),
            is_beachfront: Boolean(h.is_beachfront),
            distance_to_center: h.distance_to_center,
          };
        });

        // Tính min max tự động theo giá thực tế
        if (formattedList.length > 0) {
          const allPrices = formattedList.map((h) => h.salePrice);
          const realMin = Math.min(...allPrices);
          const realMax = Math.max(...allPrices);

          const roundedMin = Math.floor(realMin / 50000) * 50000;
          const roundedMax = Math.ceil(realMax / 50000) * 50000 || 5000000;

          setPriceBounds({ min: roundedMin, max: roundedMax });
          setUserPriceRange([roundedMin, roundedMax]);
        } else {
          setPriceBounds({ min: 0, max: 5000000 });
          setUserPriceRange([0, 5000000]);
        }

        let favMap = {};
        if (isAuthenticated && hotelService?.getFavorites) {
          try {
            const favs = await hotelService.getFavorites();
            const favList = Array.isArray(favs) ? favs : favs?.data || [];
            favList.forEach((item) => {
              favMap[String(item.id || item.hotel_id)] = true;
            });
          } catch (e) {}
        }

        if (!isMounted) return;
        setHotels(formattedList);
        setFavorites(favMap);
      } catch (error) {
        console.error("Lỗi khi tải danh sách khách sạn:", error);
      } finally {
        if (!isMounted) return;
        setLoading(false);
      }
    };

    fetchHotelsAndFavorites();

    return () => {
      isMounted = false;
    };
  }, [searchParams, isAuthenticated]);

  const updateUrlParams = (newParams) => {
    const current = Object.fromEntries(searchParams.entries());
    const updated = { ...current, ...newParams };
    Object.keys(updated).forEach((key) => {
      if (!updated[key] || updated[key] === "0") delete updated[key];
    });
    setSearchParams(updated);
  };

  // Xử lý khi chọn nhanh điểm đến từ Dropdown
  const handleSelectDestination = (destName) => {
    setDestInput(destName);
    setIsDestDropdownOpen(false);
    setIsCalendarOpen(true); // Tự động mở tiếp Datepicker chọn ngày
  };

  // Xử lý bấm nút Tìm kiếm
  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    const query = {};
    if (destInput.trim()) {
      query.destination = destInput.trim();
      query.search = destInput.trim();
    }
    if (checkInDate) query.checkIn = format(checkInDate, "yyyy-MM-dd");
    if (checkOutDate) query.checkOut = format(checkOutDate, "yyyy-MM-dd");
    query.adults = adults.toString();
    query.children = children.toString();
    query.rooms = rooms.toString();
    if (selectedStars.length > 0) query.stars = selectedStars.join(",");
    query.sortBy = sortBy;

    setIsDestDropdownOpen(false);
    setIsCalendarOpen(false);
    setIsGuestOpen(false);
    setSearchParams(query);
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

  const handleStarToggle = (star) => {
    const newStars = selectedStars.includes(star)
      ? selectedStars.filter((s) => s !== star)
      : [...selectedStars, star];
    setSelectedStars(newStars);
    updateUrlParams({ stars: newStars.join(",") });
  };

  const handleRatingToggle = (minScore) => {
    setSelectedRating((prev) => (prev === minScore ? null : minScore));
  };

  const handleResetAllFilters = () => {
    setSearchHotelName("");
    setSelectedStars([]);
    setSelectedRating(null);
    setUserPriceRange([priceBounds.min, priceBounds.max]);
    updateUrlParams({ stars: "" });
  };

  // Đếm số lượng khách sạn hiển thị bên cạnh bộ lọc
  const filterCounts = useMemo(() => {
    const counts = {
      stars: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      ratings: { 9: 0, 8: 0, 7: 0, 6: 0 },
    };

    hotels.forEach((h) => {
      const star = Math.round(h.star_rating);
      if (counts.stars[star] !== undefined) counts.stars[star]++;

      if (h.rating >= 9.0) counts.ratings[9]++;
      if (h.rating >= 8.0) counts.ratings[8]++;
      if (h.rating >= 7.0) counts.ratings[7]++;
      if (h.rating >= 6.0) counts.ratings[6]++;
    });

    return counts;
  }, [hotels]);

  // Bộ lọc dữ liệu
  const filteredHotels = useMemo(() => {
    return hotels.filter((hotel) => {
      const price = Number(hotel.salePrice || 0);
      const star = Number(hotel.star_rating || 0);
      const score = Number(hotel.rating || 0);

      // 1. Tìm nhanh theo tên khách sạn
      if (searchHotelName.trim()) {
        const nameSearchKey = removeVietnameseTones(searchHotelName);
        const nameKey = removeVietnameseTones(hotel.name);
        if (!nameKey.includes(nameSearchKey)) return false;
      }

      // 2. Lọc theo khoảng giá Min - Max thực tế
      if (price < userPriceRange[0] || price > userPriceRange[1]) {
        return false;
      }

      // 3. Lọc theo số sao
      if (selectedStars.length > 0 && !selectedStars.includes(star)) {
        return false;
      }

      // 4. Lọc theo điểm đánh giá của khách (1 - 10 điểm)
      if (selectedRating !== null && score < selectedRating) {
        return false;
      }

      return true;
    });
  }, [hotels, searchHotelName, userPriceRange, selectedStars, selectedRating]);

  const sortedHotels = useMemo(() => {
    const list = [...filteredHotels];
    if (sortBy === "price_asc") list.sort((a, b) => a.salePrice - b.salePrice);
    else if (sortBy === "price_desc")
      list.sort((a, b) => b.salePrice - a.salePrice);
    else if (sortBy === "rating") list.sort((a, b) => b.rating - a.rating);
    return list;
  }, [filteredHotels, sortBy]);

  const toggleFavorite = async (e, hotel) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      alert("Vui lòng đăng nhập để lưu khách sạn yêu thích!");
      return;
    }

    const hotelId = String(hotel.id);
    const previous = Boolean(favorites[hotelId]);
    setFavorites((prev) => ({ ...prev, [hotelId]: !previous }));

    try {
      if (previous) {
        await hotelService.removeFavorite(hotelId);
      } else {
        await hotelService.addFavorite(hotelId);
      }
    } catch {
      setFavorites((prev) => ({ ...prev, [hotelId]: previous }));
    }
  };

  const formatVND = (price) =>
    "VND " + Number(price || 0).toLocaleString("vi-VN");

  const breadcrumbs = [
    { label: "Trang chủ", link: "/" },
    { label: "Khách sạn", link: "/hotels" },
    {
      label: initialDestination
        ? `Chỗ nghỉ tại ${initialDestination}`
        : "Tất cả chỗ nghỉ",
    },
  ];

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

  return (
    <div className="bg-[#f5f7fa] min-h-screen pb-16 font-sans text-gray-800">
      <div className="max-w-7xl mx-auto px-4 pt-4">
        <Breadcrumb items={breadcrumbs} />

        {/* ─── THANH TÌM KIẾM NGANG KÈM DROPDOWN GỢI Ý ĐIỂM ĐẾN MỞ BÁN (CHUẨN 100% NHƯ HOMEPAGE) ─── */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-md mt-3 mb-6 relative">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center">
            {/* Ô 1: Điểm đến (Có Dropdown lưới 3 cột có ảnh như ảnh bạn gửi) */}
            <div ref={destRef} className="md:col-span-4 relative">
              <div
                onClick={() => setIsDestDropdownOpen(true)}
                className="flex items-center bg-slate-50 rounded-xl px-3.5 h-12 border border-gray-200 focus-within:border-blue-600 focus-within:bg-white transition-colors cursor-pointer"
              >
                <Search size={18} className="text-gray-400 shrink-0 mr-2.5" />
                <input
                  type="text"
                  placeholder="Bạn muốn đi đâu? (Nhập tên khách sạn hoặc thành phố...)"
                  value={destInput}
                  onFocus={() => setIsDestDropdownOpen(true)}
                  onChange={(e) => {
                    setDestInput(e.target.value);
                    setIsDestDropdownOpen(true);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleSearchSubmit()}
                  className="w-full text-xs md:text-sm font-bold text-gray-800 focus:outline-none placeholder:text-gray-400 placeholder:font-normal bg-transparent"
                />
              </div>

              {/* 🌟 DROPDOWN GỢI Ý ĐIỂM ĐẾN CÓ CHỖ NGHỈ ĐANG MỞ BÁN GIỐNG 100% NHƯ ẢNH 🌟 */}
              {isDestDropdownOpen && trendingDestinations.length > 0 && (
                <div className="absolute left-0 top-full mt-2 w-full sm:w-[620px] bg-white rounded-2xl shadow-2xl border border-gray-200 p-5 z-50 animate-in fade-in zoom-in-95">
                  <h4 className="font-extrabold text-sm text-gray-900 mb-3.5 flex items-center gap-1.5">
                    <Flame size={16} className="text-orange-500" />
                    Điểm đến có chỗ nghỉ đang mở bán
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {trendingDestinations
                      .filter((item) =>
                        destInput.trim()
                          ? removeVietnameseTones(item.name).includes(
                              removeVietnameseTones(destInput),
                            )
                          : true,
                      )
                      .map((item) => (
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

            {/* Ô 2: Ngày nhận / trả phòng */}
            <div
              ref={calendarRef}
              onClick={() => setIsCalendarOpen(!isCalendarOpen)}
              className="relative md:col-span-4 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-gray-200 p-2.5 h-12 cursor-pointer flex items-center justify-between hover:border-blue-600 transition-all select-none"
            >
              <div className="flex items-center gap-2">
                <CalendarIcon size={16} className="text-gray-400" />
                <span className="text-xs font-bold text-gray-800">
                  {checkInDate
                    ? format(checkInDate, "dd/MM/yyyy")
                    : "--/--/----"}
                </span>
              </div>

              <div className="flex items-center gap-1 text-[11px] font-black text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                <span>{totalNights}</span>
                <Moon size={10} fill="currentColor" />
              </div>

              <div className="flex items-center gap-2">
                <CalendarIcon size={16} className="text-gray-400" />
                <span className="text-xs font-bold text-gray-800">
                  {checkOutDate
                    ? format(checkOutDate, "dd/MM/yyyy")
                    : "--/--/----"}
                </span>
              </div>

              {isCalendarOpen && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute left-0 lg:left-auto lg:right-0 top-full mt-2 z-50 bg-white border border-gray-200 rounded-2xl shadow-2xl p-5 w-[320px] sm:w-[580px] md:w-[620px] animate-in fade-in cursor-default"
                >
                  <div className="flex justify-between items-center mb-3 px-1">
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentCalendarMonth((prev) => subMonths(prev, 1))
                      }
                      disabled={isBefore(
                        startOfMonth(currentCalendarMonth),
                        startOfMonth(today),
                      )}
                      className="p-1.5 rounded-full hover:bg-gray-100 text-gray-700 disabled:opacity-20 cursor-pointer"
                    >
                      <ChevronLeft size={18} />
                    </button>

                    <span className="text-xs font-bold text-gray-500">
                      {!checkOutDate
                        ? "👉 Chọn ngày trả phòng"
                        : "✓ Đã chọn xong ngày"}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        setCurrentCalendarMonth((prev) => addMonths(prev, 1))
                      }
                      className="p-1.5 rounded-full hover:bg-gray-100 text-gray-700 cursor-pointer"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-6 sm:divide-x sm:divide-gray-100">
                    {renderMonthCalendar(currentCalendarMonth)}
                    <div className="hidden sm:block sm:pl-6">
                      {renderMonthCalendar(addMonths(currentCalendarMonth, 1))}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-end text-xs">
                    <button
                      type="button"
                      onClick={() => setIsCalendarOpen(false)}
                      className="px-5 py-2 bg-[#003580] hover:bg-blue-900 text-white font-bold rounded-xl shadow cursor-pointer"
                    >
                      Xong
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Ô 3: Bộ chọn Phòng, Người lớn, Trẻ em */}
            <div
              ref={guestRef}
              onClick={() => setIsGuestOpen(!isGuestOpen)}
              className="relative md:col-span-2 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-gray-200 p-2.5 h-12 cursor-pointer flex items-center gap-2 hover:border-blue-600 transition-all select-none"
            >
              <Users size={18} className="text-gray-400 shrink-0" />
              <div className="leading-tight overflow-hidden">
                <span className="text-xs font-bold text-gray-800 block truncate">
                  {rooms} Phòng · {adults} Lớn
                </span>
                <span className="text-[10px] text-gray-500 font-medium block truncate">
                  {children > 0 ? `${children} trẻ em` : "0 trẻ em"}
                </span>
              </div>

              {isGuestOpen && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute left-0 right-0 md:left-auto md:w-72 top-full mt-2 z-50 bg-white border border-gray-200 rounded-2xl shadow-2xl p-4 space-y-3.5 cursor-default"
                >
                  {/* Chọn số phòng */}
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-xs font-bold text-gray-800 block">
                        Phòng
                      </span>
                      <span className="text-[10px] text-gray-400">
                        Số lượng phòng
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setRooms((r) => Math.max(1, r - 1))}
                        className="w-7 h-7 rounded-lg border border-gray-300 font-bold hover:bg-gray-100 flex items-center justify-center cursor-pointer"
                      >
                        -
                      </button>
                      <span className="text-xs font-black w-5 text-center">
                        {rooms}
                      </span>
                      <button
                        type="button"
                        onClick={() => setRooms((r) => r + 1)}
                        className="w-7 h-7 rounded-lg border border-gray-300 font-bold hover:bg-gray-100 flex items-center justify-center cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Chọn số người lớn */}
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-xs font-bold text-gray-800 block">
                        Người lớn
                      </span>
                      <span className="text-[10px] text-gray-400">
                        Từ 12 tuổi trở lên
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setAdults((a) => Math.max(1, a - 1))}
                        className="w-7 h-7 rounded-lg border border-gray-300 font-bold hover:bg-gray-100 flex items-center justify-center cursor-pointer"
                      >
                        -
                      </button>
                      <span className="text-xs font-black w-5 text-center">
                        {adults}
                      </span>
                      <button
                        type="button"
                        onClick={() => setAdults((a) => a + 1)}
                        className="w-7 h-7 rounded-lg border border-gray-300 font-bold hover:bg-gray-100 flex items-center justify-center cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Chọn số trẻ em */}
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-xs font-bold text-gray-800 block">
                        Trẻ em
                      </span>
                      <span className="text-[10px] text-gray-400">
                        Từ 0 - 11 tuổi
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setChildren((c) => Math.max(0, c - 1))}
                        className="w-7 h-7 rounded-lg border border-gray-300 font-bold hover:bg-gray-100 flex items-center justify-center cursor-pointer"
                      >
                        -
                      </button>
                      <span className="text-xs font-black w-5 text-center">
                        {children}
                      </span>
                      <button
                        type="button"
                        onClick={() => setChildren((c) => c + 1)}
                        className="w-7 h-7 rounded-lg border border-gray-300 font-bold hover:bg-gray-100 flex items-center justify-center cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsGuestOpen(false)}
                    className="w-full py-2 bg-[#003580] hover:bg-blue-900 text-white text-xs font-bold rounded-xl mt-2 cursor-pointer shadow-sm transition"
                  >
                    Áp dụng
                  </button>
                </div>
              )}
            </div>

            {/* Ô 4: Nút tìm kiếm */}
            <button
              type="button"
              onClick={handleSearchSubmit}
              className="md:col-span-2 h-12 bg-[#003580] hover:bg-blue-900 text-white font-black text-sm rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center justify-center cursor-pointer"
            >
              Tìm kiếm
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ─── SIDEBAR BỘ LỌC CHUẨN GIAO DIỆN BOOKING.COM ─── */}
          <aside className="lg:col-span-4 xl:col-span-3 bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-6 sticky top-20">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h2 className="font-extrabold text-base text-gray-900 flex items-center gap-1.5">
                <SlidersHorizontal size={16} /> Chọn lọc theo:
              </h2>
              <button
                type="button"
                onClick={handleResetAllFilters}
                className="text-xs text-[#006ce4] hover:underline font-bold cursor-pointer"
              >
                Xóa tất cả
              </button>
            </div>

            {/* Ô tìm nhanh theo tên chỗ nghỉ */}
            <div>
              <input
                type="text"
                placeholder="Tìm theo tên chỗ nghỉ..."
                value={searchHotelName}
                onChange={(e) => setSearchHotelName(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:border-[#006ce4] focus:outline-none placeholder:text-gray-400 font-medium"
              />
            </div>

            {/* BỘ LỌC 1: NGÂN SÁCH CỦA BẠN (MỖI ĐÊM) THEO DẢI MIN-MAX THỰC TẾ */}
            <div className="space-y-3 pt-2 border-t border-gray-100">
              <h3 className="text-sm font-extrabold text-gray-900">
                Ngân sách của bạn (mỗi đêm)
              </h3>

              <div className="text-xs font-black text-slate-800">
                {formatVND(userPriceRange[0])} – {formatVND(userPriceRange[1])}
              </div>

              {/* Biểu đồ tần suất giá mô phỏng Booking.com */}
              <div className="flex items-end gap-1 h-9 px-1 pt-2">
                {[20, 45, 80, 60, 100, 75, 40, 90, 50, 30, 15].map((h, i) => (
                  <div
                    key={i}
                    style={{ height: `${h}%` }}
                    className="flex-1 bg-slate-200 rounded-t-xs"
                  />
                ))}
              </div>

              {/* Thanh trượt dải giá */}
              <div className="space-y-2">
                <input
                  type="range"
                  min={priceBounds.min}
                  max={priceBounds.max}
                  step={50000}
                  value={userPriceRange[1]}
                  onChange={(e) =>
                    setUserPriceRange([
                      userPriceRange[0],
                      Number(e.target.value),
                    ])
                  }
                  className="w-full accent-[#006ce4] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                  <span>{formatVND(priceBounds.min)}</span>
                  <span>{formatVND(priceBounds.max)}</span>
                </div>
              </div>
            </div>

            {/* BỘ LỌC 2: ĐIỂM ĐÁNH GIÁ CỦA KHÁCH (1 - 10 ĐIỂM) KÈM SỐ LƯỢNG */}
            <div className="space-y-2.5 pt-4 border-t border-gray-100">
              <h3 className="text-sm font-extrabold text-gray-900">
                Điểm đánh giá của khách
              </h3>
              <div className="space-y-2">
                {[
                  { score: 9, label: "Xuất sắc: 9 điểm trở lên" },
                  { score: 8, label: "Rất tốt: 8 điểm trở lên" },
                  { score: 7, label: "Tốt: 7 điểm trở lên" },
                  { score: 6, label: "Dễ chịu: 6 điểm trở lên" },
                ].map((item) => {
                  const count = filterCounts.ratings[item.score] || 0;
                  const isChecked = selectedRating === item.score;

                  return (
                    <label
                      key={item.score}
                      className="flex items-center justify-between text-xs text-gray-700 cursor-pointer group hover:text-[#006ce4]"
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleRatingToggle(item.score)}
                          className="w-4 h-4 rounded border-gray-300 text-[#006ce4] focus:ring-[#006ce4] cursor-pointer"
                        />
                        <span
                          className={
                            isChecked ? "font-bold text-[#006ce4]" : ""
                          }
                        >
                          {item.label}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400 font-medium group-hover:text-gray-600">
                        {count}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* BỘ LỌC 3: HẠNG SAO KHÁCH SẠN */}
            <div className="space-y-2.5 pt-4 border-t border-gray-100">
              <h3 className="text-sm font-extrabold text-gray-900">
                Hạng sao khách sạn
              </h3>
              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = filterCounts.stars[star] || 0;
                  const isChecked = selectedStars.includes(star);

                  return (
                    <label
                      key={star}
                      className="flex items-center justify-between text-xs text-gray-700 cursor-pointer group hover:text-[#006ce4]"
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleStarToggle(star)}
                          className="w-4 h-4 rounded border-gray-300 text-[#006ce4] focus:ring-[#006ce4] cursor-pointer"
                        />
                        <span className="flex items-center gap-1">
                          <span>{star} sao</span>
                          <span className="text-amber-400">★</span>
                        </span>
                      </div>
                      <span className="text-xs text-gray-400 font-medium group-hover:text-gray-600">
                        {count}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </aside>

          {/* ─── MAIN: DANH SÁCH CÁC CHỖ NGHỈ ─── */}
          <main className="lg:col-span-8 xl:col-span-9 space-y-4">
            <div className="bg-white px-5 py-3 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between flex-wrap gap-3">
              <span className="text-xs font-bold text-gray-600">
                Tìm thấy{" "}
                <span className="text-[#006ce4] font-black">
                  {sortedHotels.length}
                </span>{" "}
                chỗ nghỉ phù hợp
              </span>

              <div className="flex items-center gap-2">
                <ArrowUpDown size={14} className="text-gray-400" />
                <span className="text-xs text-gray-500 font-medium">
                  Sắp xếp theo:
                </span>
                <select
                  value={sortBy}
                  onChange={(e) => updateUrlParams({ sortBy: e.target.value })}
                  className="text-xs font-bold bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 outline-none cursor-pointer"
                >
                  <option value="popular">Phổ biến nhất</option>
                  <option value="price_asc">Giá: Thấp đến Cao</option>
                  <option value="price_desc">Giá: Cao đến Thấp</option>
                  <option value="rating">Điểm đánh giá cao nhất</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="py-20 flex justify-center bg-white rounded-2xl border border-gray-200 shadow-sm">
                <LoadingSpinner size="lg" label="Đang tìm kiếm chỗ nghỉ..." />
              </div>
            ) : sortedHotels.length > 0 ? (
              <div className="space-y-4">
                {sortedHotels.map((hotel) => {
                  const id = hotel.id;
                  const isFav = Boolean(favorites[id]);
                  const score = Number(hotel.rating || 0);

                  const getRatingLabel = (pt) => {
                    if (pt >= 9.0) return "Xuất sắc";
                    if (pt >= 8.0) return "Rất tốt";
                    if (pt >= 7.0) return "Tốt";
                    if (pt >= 6.0) return "Dễ chịu";
                    return "Điểm đánh giá";
                  };

                  return (
                    <div
                      key={id}
                      onClick={() =>
                        navigate(
                          `/hotel/${id}?checkIn=${format(checkInDate, "yyyy-MM-dd")}&checkOut=${format(checkOutDate, "yyyy-MM-dd")}&adults=${adults}&children=${children}&rooms=${rooms}`,
                        )
                      }
                      className="bg-white rounded-2xl border border-gray-200 p-4 hover:border-[#006ce4] hover:shadow-xl transition-all duration-300 cursor-pointer group flex flex-col md:flex-row gap-5"
                    >
                      {/* ẢNH ĐẠI DIỆN */}
                      <div className="relative w-full md:w-64 h-52 shrink-0 rounded-xl overflow-hidden bg-gray-100">
                        <img
                          src={hotel.image}
                          alt={hotel.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        />
                        <button
                          type="button"
                          onClick={(e) => toggleFavorite(e, hotel)}
                          className={`absolute top-3 right-3 z-10 w-9 h-9 rounded-full flex items-center justify-center shadow-md transition-all ${
                            isFav
                              ? "bg-white text-rose-500"
                              : "bg-black/30 text-white hover:bg-white hover:text-rose-500"
                          }`}
                        >
                          <Heart
                            size={18}
                            fill={isFav ? "currentColor" : "none"}
                          />
                        </button>
                      </div>

                      {/* THÔNG TIN CHI TIẾT */}
                      <div className="flex-1 flex flex-col justify-between py-1">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-extrabold text-lg text-gray-900 group-hover:text-[#006ce4] transition-colors leading-snug">
                              {hotel.title}
                            </h3>
                            {hotel.stars > 0 && (
                              <div className="flex text-amber-400">
                                {[...Array(hotel.stars)].map((_, i) => (
                                  <Star key={i} size={13} fill="currentColor" />
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Vị trí & Khoảng cách */}
                          <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1 flex-wrap">
                            <div className="flex items-center gap-1">
                              <MapPin
                                size={13}
                                className="text-[#006ce4] shrink-0"
                              />
                              <span className="line-clamp-1">
                                {hotel.location}
                              </span>
                            </div>
                            {hotel.distance_to_center !== undefined &&
                              hotel.distance_to_center !== null && (
                                <>
                                  <span>•</span>
                                  <span className="text-slate-600 font-semibold flex items-center gap-1">
                                    <Navigation
                                      size={11}
                                      className="text-amber-600"
                                    />{" "}
                                    Cách trung tâm {hotel.distance_to_center} km
                                  </span>
                                </>
                              )}
                          </div>

                          {/* Huy hiệu giáp biển */}
                          {hotel.is_beachfront && (
                            <div className="pt-1">
                              <span className="inline-flex items-center gap-1 bg-cyan-50 border border-cyan-200 text-cyan-800 text-[11px] font-bold px-2 py-0.5 rounded-md shadow-2xs">
                                <Waves
                                  size={13}
                                  className="text-cyan-600 shrink-0 stroke-[2.5]"
                                />
                                Giáp biển
                              </span>
                            </div>
                          )}

                          <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed pt-1">
                            {hotel.description ||
                              "Chỗ nghỉ sở hữu không gian thoáng đãng, tiện nghi hiện đại và dịch vụ tận tâm."}
                          </p>
                        </div>

                        {/* PHẦN GIÁ VÀ ĐIỂM ĐÁNH GIÁ CHUẨN BOOKING.COM */}
                        <div className="flex items-end justify-between pt-4 border-t border-gray-100 mt-3">
                          {/* Điểm đánh giá bên trái */}
                          <div className="flex items-center gap-2">
                            <div className="bg-[#003580] text-white font-black text-sm w-9 h-9 rounded-lg flex items-center justify-center shadow-xs">
                              {score > 0 ? score.toFixed(1) : "---"}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-gray-900 leading-none">
                                {getRatingLabel(score)}
                              </p>
                              <p className="text-[11px] text-gray-400 mt-0.5">
                                {hotel.review_count > 0
                                  ? `${hotel.review_count} đánh giá`
                                  : "Chưa có đánh giá"}
                              </p>
                            </div>
                          </div>

                          {/* Giá phòng bên phải */}
                          <div className="text-right">
                            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                              Giá mỗi đêm từ
                            </p>
                            <p className="text-xl font-black text-[#003580]">
                              {formatVND(hotel.salePrice)}
                            </p>
                            <p className="text-[10px] text-gray-400 italic">
                              Đã gồm thuế & phí
                            </p>

                            <button
                              type="button"
                              onClick={() =>
                                navigate(
                                  `/hotel/${id}?checkIn=${format(checkInDate, "yyyy-MM-dd")}&checkOut=${format(checkOutDate, "yyyy-MM-dd")}&adults=${adults}&children=${children}&rooms=${rooms}`,
                                )
                              }
                              className="mt-2 px-4 py-1.5 bg-[#006ce4] hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-xs"
                            >
                              Xem chỗ trống &rarr;
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                title="Không tìm thấy chỗ nghỉ nào phù hợp"
                description="Hãy thử xóa bớt bộ lọc hoặc chọn mức ngân sách rộng hơn."
                actionLabel="Xóa tất cả bộ lọc"
                onAction={handleResetAllFilters}
              />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
