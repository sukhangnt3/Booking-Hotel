// src/pages/guest/HomePage.jsx
import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
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
  Clock,
  Sun,
  Hourglass,
  ChevronDown,
  Building,
  MapPin,
  Loader2,
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
  startOfToday,
  differenceInDays,
  addDays,
} from "date-fns";
import { vi } from "date-fns/locale";

import { HotelCard } from "@/components/hotel";
import { hotelService } from "@/services";
import apiClient from "@/services/apiClient";

const HERO_BG_IMAGE =
  "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=2000&q=80";

const BACKEND_BASE_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/api\/?$/, "");

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
  const norm = (cityName || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .trim();

  if (norm.includes("khanh hoa") || norm.includes("nha trang"))
    return CITY_LANDMARK_IMAGES["Khánh Hòa"];
  if (
    norm.includes("ho chi minh") ||
    norm.includes("sai gon") ||
    norm.includes("hcm")
  )
    return CITY_LANDMARK_IMAGES["Hồ Chí Minh"];
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
    return "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600";
  let raw = String(
    typeof img === "string" ? img : img.url || img.path || "",
  ).trim();
  if (!raw || raw.startsWith("blob:"))
    return "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600";
  if (
    raw.startsWith("http://") ||
    raw.startsWith("https://") ||
    raw.startsWith("data:image/")
  )
    return raw;
  return `${BACKEND_BASE_URL}${raw.startsWith("/") ? raw : `/${raw}`}`;
};

const safeFormatDisplayDate = (date) => {
  if (!date) return "Chọn ngày";
  try {
    const d = new Date(date);
    return isNaN(d.getTime())
      ? "Chọn ngày"
      : format(d, "eee, dd 'Thg' M, yyyy", { locale: vi });
  } catch {
    return "Chọn ngày";
  }
};

const safeFormatDate = (date, pattern = "dd/MM/yyyy") => {
  if (!date) return "";
  try {
    const d = new Date(date);
    return isNaN(d.getTime()) ? "" : format(d, pattern, { locale: vi });
  } catch {
    return "";
  }
};

export default function HomePage() {
  const navigate = useNavigate();
  const today = useMemo(() => startOfToday(), []);

  const [trendingDestinations, setTrendingDestinations] = useState([]);
  const [uniqueStays, setUniqueStays] = useState([]);
  const [favoriteHotelIds, setFavoriteHotelIds] = useState(new Set());
  const [loading, setLoading] = useState(true);

  // Carousel
  const [newestIndex, setNewestIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(4);
  const MAX_DISPLAY_STAYS = 12;

  // Search States
  const [destination, setDestination] = useState("");
  const [isDestDropdownOpen, setIsDestDropdownOpen] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [isSearchingDest, setIsSearchingDest] = useState(false);

  // Rental Type & Times
  const [rentalType, setRentalType] = useState("DAY");
  const [checkInTime, setCheckInTime] = useState("14:00");
  const [checkOutTime, setCheckOutTime] = useState("12:00");
  const [checkInDate, setCheckInDate] = useState(today);
  const [checkOutDate, setCheckOutDate] = useState(addDays(today, 1));

  // Calendar Popup
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarTarget, setCalendarTarget] = useState("checkIn");
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(today);

  // Guests & Rooms
  const [rooms, setRooms] = useState(1);
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [isGuestOpen, setIsGuestOpen] = useState(false);

  const destRef = useRef(null);
  const calendarRef = useRef(null);
  const guestRef = useRef(null);
  const touchStartX = useRef(0);

  // Responsive Carousel
  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      if (w < 640) setVisibleCount(1);
      else if (w < 1024) setVisibleCount(2);
      else setVisibleCount(4);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const maxNewestIndex = Math.max(0, uniqueStays.length - visibleCount);

  // 🌟 LIVE SEARCH AUTOCOMPLETE VỚI DEBOUNCE 300MS
  useEffect(() => {
    if (!destination.trim()) {
      setSearchSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingDest(true);
      try {
        const res = await apiClient.get(
          `/hotels/destinations?q=${encodeURIComponent(destination.trim())}`,
        );
        const list =
          res?.data?.data || res?.data?.destinations || res?.data || [];
        setSearchSuggestions(Array.isArray(list) ? list : []);
      } catch (err) {
        console.warn("Lỗi tìm kiếm gợi ý:", err.message);
      } finally {
        setIsSearchingDest(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [destination]);

  // Tab switching
  const handleTabChange = (type) => {
    setRentalType(type);
    if (type === "HOUR") {
      setCheckInTime("00:00");
      setCheckOutTime("02:00");
      setCheckOutDate(checkInDate);
    } else if (type === "DAY") {
      setCheckInTime("14:00");
      setCheckOutTime("12:00");
      setCheckOutDate(addDays(checkInDate, 1));
    } else if (type === "OVERNIGHT") {
      setCheckInTime("22:00");
      setCheckOutTime("12:00");
      setCheckOutDate(addDays(checkInDate, 1));
    } else if (type === "HALF_DAY") {
      setCheckInTime("12:00");
      setCheckOutTime("21:00");
      setCheckOutDate(checkInDate);
    }
  };

  // Duration Badge Label
  const durationBadgeLabel = useMemo(() => {
    if (rentalType === "HOUR") {
      const inH = parseInt(checkInTime.split(":")[0], 10);
      const outH = parseInt(checkOutTime.split(":")[0], 10);
      const diffDays = Math.max(0, differenceInDays(checkOutDate, checkInDate));
      let total = diffDays * 24 + (outH - inH);
      return `${Math.max(1, total <= 0 ? total + 24 : total)} Giờ`;
    }
    if (rentalType === "OVERNIGHT") return "Qua đêm";
    if (rentalType === "HALF_DAY") return "1 Buổi";
    return `${Math.max(1, differenceInDays(checkOutDate, checkInDate))} Ngày`;
  }, [rentalType, checkInTime, checkOutTime, checkInDate, checkOutDate]);

  // Fetch initial home data
  useEffect(() => {
    let isMounted = true;
    const fetchRealData = async () => {
      setLoading(true);
      try {
        const [hotelsRes, trendingRes] = await Promise.all([
          hotelService.getAll().catch(() => []),
          apiClient
            .get("/hotels/trending-destinations")
            .catch(() => ({ data: [] })),
        ]);

        const apiHotels = Array.isArray(hotelsRes)
          ? hotelsRes
          : hotelsRes?.data || [];
        const formattedHotels = apiHotels.map((h) => ({
          ...h,
          id: String(h.id),
          title: h.name || "Khách sạn nghỉ dưỡng",
          name: h.name || "Khách sạn nghỉ dưỡng",
          city: h.city || "Việt Nam",
          location: h.address
            ? `${h.address}, ${h.city}`
            : h.city || "Việt Nam",
          image: parseImageUrl(h.image || h.thumbnail || ""),
          salePrice: Number(h.min_price || h.base_price || 500000),
          star_rating: Number(h.star_rating || 3),
          rating: Number(h.average_rating || 9.0),
          review_count: Number(h.review_count || 0),
        }));

        let trendingList =
          trendingRes?.data?.trendingDestinations ||
          trendingRes?.data?.data ||
          [];
        if (!trendingList.length) {
          const map = new Map();
          formattedHotels.forEach((h) => {
            const c = h.city ? h.city.trim() : "Hồ Chí Minh";
            map.set(c, (map.get(c) || 0) + 1);
          });
          trendingList = Array.from(map.entries()).map(([name, count]) => ({
            name,
            hotelCount: count,
            image: getCityLandmarkImage(name),
          }));
        }

        if (isMounted) {
          setUniqueStays(formattedHotels.slice(0, MAX_DISPLAY_STAYS));
          setTrendingDestinations(trendingList);
        }
      } catch (err) {
        console.error("Lỗi tải trang chủ:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchRealData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Click Outside
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

  const handleSelectDateFromCalendar = (date) => {
    if (isBefore(date, today)) return;
    if (calendarTarget === "checkIn") {
      setCheckInDate(date);
      if (isBefore(checkOutDate, date)) {
        setCheckOutDate(rentalType === "DAY" ? addDays(date, 1) : date);
      }
    } else {
      if (isBefore(date, checkInDate)) {
        setCheckInDate(date);
        setCheckOutDate(rentalType === "DAY" ? addDays(date, 1) : date);
      } else {
        setCheckOutDate(date);
      }
    }
  };

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    const query = new URLSearchParams();
    if (destination.trim()) {
      query.append("destination", destination.trim());
      query.append("search", destination.trim());
    }
    query.append("rentalType", rentalType);
    query.append("checkInTime", checkInTime);
    query.append("checkOutTime", checkOutTime);
    query.append("checkIn", format(checkInDate, "yyyy-MM-dd"));
    query.append("checkOut", format(checkOutDate, "yyyy-MM-dd"));
    query.append("adults", adults.toString());
    query.append("children", children.toString());
    query.append("rooms", rooms.toString());

    navigate(`/hotels?${query.toString()}`);
  };

  const cardTranslatePercentage = 100 / visibleCount;

  return (
    <div className="w-full pb-24 bg-gray-50/50 font-sans">
      {/* HERO BANNER */}
      <div
        className="relative w-full min-h-[480px] lg:min-h-[520px] bg-cover bg-center flex items-center overflow-visible"
        style={{ backgroundImage: `url('${HERO_BG_IMAGE}')` }}
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

              {/* KHUNG TÌM KIẾM CHÍNH */}
              <div className="space-y-3">
                {/* Ô TÌM ĐIỂM ĐẾN / KHÁCH SẠN */}
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
                    {isSearchingDest && (
                      <Loader2
                        size={16}
                        className="animate-spin text-blue-600 ml-2"
                      />
                    )}
                  </div>

                  {/* DROPDOWN GỢI Ý ĐIỂM ĐẾN (LIVE SEARCH HOẶC TOP TRENDING) */}
                  {isDestDropdownOpen && (
                    <div className="absolute left-0 top-full mt-2 w-full sm:w-[580px] bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 z-50 animate-in fade-in zoom-in-95 max-h-[380px] overflow-y-auto">
                      {searchSuggestions.length > 0 ? (
                        <div className="space-y-1">
                          <h4 className="font-extrabold text-xs text-gray-400 uppercase mb-2">
                            Kết quả tìm kiếm
                          </h4>
                          {searchSuggestions.map((item, idx) => (
                            <div
                              key={idx}
                              onClick={() => {
                                setDestination(item.name);
                                setIsDestDropdownOpen(false);
                                setIsCalendarOpen(true);
                              }}
                              className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-blue-50/70 cursor-pointer transition"
                            >
                              {item.type === "city" ? (
                                <MapPin
                                  size={18}
                                  className="text-blue-600 shrink-0"
                                />
                              ) : (
                                <Building
                                  size={18}
                                  className="text-amber-600 shrink-0"
                                />
                              )}
                              <div className="overflow-hidden">
                                <span className="font-bold text-sm text-gray-900 block truncate">
                                  {item.name}
                                </span>
                                <span className="text-xs text-gray-500 block truncate">
                                  {item.type === "city"
                                    ? `${item.hotel_count || 1} chỗ nghỉ`
                                    : "Khách sạn"}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : trendingDestinations.length > 0 ? (
                        <div>
                          <h4 className="font-extrabold text-sm text-gray-900 mb-3 flex items-center gap-1.5">
                            <Flame size={16} className="text-orange-500" />
                            Điểm đến phổ biến
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            {trendingDestinations.slice(0, 6).map((item) => (
                              <div
                                key={item.name}
                                onClick={() => {
                                  setDestination(item.name);
                                  setIsDestDropdownOpen(false);
                                  setIsCalendarOpen(true);
                                }}
                                className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-blue-50/60 cursor-pointer transition group"
                              >
                                <img
                                  src={
                                    item.image ||
                                    getCityLandmarkImage(item.name)
                                  }
                                  alt={item.name}
                                  loading="lazy"
                                  className="w-10 h-10 rounded-xl object-cover shrink-0 shadow-2xs group-hover:scale-105 transition-transform"
                                />
                                <div className="overflow-hidden">
                                  <span className="font-bold text-xs text-gray-900 block group-hover:text-[#006ce4] truncate">
                                    {item.name}
                                  </span>
                                  <span className="text-[10px] text-gray-500 block truncate">
                                    {item.hotelCount || item.hotel_count || 1}{" "}
                                    chỗ nghỉ
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>

                {/* HÀNG BỘ LỌC NGÀY & KHÁCH */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                  {/* Ô CHỌN NGÀY & HÌNH THỨC THUÊ */}
                  <div
                    ref={calendarRef}
                    className="relative md:col-span-7 bg-white rounded-xl shadow-lg border border-gray-200 p-2.5 cursor-pointer flex items-center justify-between hover:border-blue-600 transition select-none"
                    onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                  >
                    <div className="flex items-center gap-2">
                      <CalendarIcon size={18} className="text-gray-400" />
                      <div>
                        <span className="text-[10px] font-black text-slate-500 block leading-tight">
                          {rentalType === "HOUR"
                            ? `Giờ (${checkInTime})`
                            : `Nhận (${checkInTime})`}
                        </span>
                        <span className="text-xs md:text-sm font-black text-gray-900 leading-none">
                          {safeFormatDate(checkInDate, "dd-MM-yyyy")}
                        </span>
                      </div>
                    </div>

                    <div className="text-[11px] font-black text-blue-600 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
                      {durationBadgeLabel}
                    </div>

                    <div className="flex items-center gap-2">
                      <CalendarIcon size={18} className="text-gray-400" />
                      <div>
                        <span className="text-[10px] font-black text-gray-600 block leading-tight">
                          Trả ({checkOutTime})
                        </span>
                        <span className="text-xs md:text-sm font-black text-gray-900 leading-none">
                          {safeFormatDate(checkOutDate, "dd-MM-yyyy")}
                        </span>
                      </div>
                    </div>

                    {/* POPUP 4 TABS LỊCH THUÊ PHÒNG */}
                    {isCalendarOpen && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute left-0 top-full mt-2 z-50 bg-white border border-gray-200 rounded-3xl shadow-2xl p-5 w-[330px] sm:w-[500px] animate-in fade-in cursor-default"
                      >
                        {/* 4 Tabs: Giờ, Ngày, Đêm, Buổi */}
                        <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-2xl mb-4">
                          {[
                            { id: "HOUR", label: "Giờ", icon: Clock },
                            { id: "DAY", label: "Ngày", icon: Sun },
                            { id: "OVERNIGHT", label: "Đêm", icon: Moon },
                            { id: "HALF_DAY", label: "Buổi", icon: Hourglass },
                          ].map((t) => {
                            const Icon = t.icon;
                            return (
                              <button
                                key={t.id}
                                type="button"
                                onClick={() => handleTabChange(t.id)}
                                className={`py-2 px-1 rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition cursor-pointer ${
                                  rentalType === t.id
                                    ? "bg-[#006ce4] text-white shadow-xs"
                                    : "text-slate-600 hover:text-slate-900"
                                }`}
                              >
                                <Icon size={14} /> <span>{t.label}</span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Dropdown giờ nhận & Trả */}
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-700 block">
                              Nhận phòng ({checkInTime})
                            </label>
                            <select
                              value={checkInTime}
                              onChange={(e) => setCheckInTime(e.target.value)}
                              className="w-full h-10 px-2 bg-white border border-gray-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-[#006ce4]"
                            >
                              {[...Array(24)].map((_, i) => {
                                const t = `${String(i).padStart(2, "0")}:00`;
                                return (
                                  <option key={t} value={t}>
                                    {t}
                                  </option>
                                );
                              })}
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-700 block">
                              Trả phòng ({checkOutTime})
                            </label>
                            <select
                              value={checkOutTime}
                              onChange={(e) => setCheckOutTime(e.target.value)}
                              className="w-full h-10 px-2 bg-white border border-gray-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-[#006ce4]"
                            >
                              {[...Array(24)].map((_, i) => {
                                const t = `${String(i).padStart(2, "0")}:00`;
                                return (
                                  <option key={t} value={t}>
                                    {t}
                                  </option>
                                );
                              })}
                            </select>
                          </div>
                        </div>

                        {/* Chọn nhanh mục tiêu: Ngày nhận hay Ngày trả */}
                        <div className="flex gap-2 mb-3">
                          <button
                            type="button"
                            onClick={() => setCalendarTarget("checkIn")}
                            className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold text-left transition ${
                              calendarTarget === "checkIn"
                                ? "border-[#006ce4] bg-blue-50/50 text-[#006ce4]"
                                : "border-gray-200"
                            }`}
                          >
                            <span className="text-[10px] text-gray-500 block font-normal">
                              Ngày nhận:
                            </span>
                            {safeFormatDisplayDate(checkInDate)}
                          </button>

                          <button
                            type="button"
                            onClick={() => setCalendarTarget("checkOut")}
                            className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold text-left transition ${
                              calendarTarget === "checkOut"
                                ? "border-[#006ce4] bg-blue-50/50 text-[#006ce4]"
                                : "border-gray-200"
                            }`}
                          >
                            <span className="text-[10px] text-gray-500 block font-normal">
                              Ngày trả:
                            </span>
                            {safeFormatDisplayDate(checkOutDate)}
                          </button>
                        </div>

                        {/* Lưới lịch */}
                        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-bold text-[#006ce4]">
                              {calendarTarget === "checkIn"
                                ? "👉 Chọn ngày nhận"
                                : "👉 Chọn ngày trả"}
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  setCurrentCalendarMonth((p) =>
                                    subMonths(p, 1),
                                  )
                                }
                                disabled={isBefore(
                                  startOfMonth(currentCalendarMonth),
                                  startOfMonth(today),
                                )}
                                className="p-1 hover:bg-white rounded disabled:opacity-20 cursor-pointer"
                              >
                                <ChevronLeft size={16} />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setCurrentCalendarMonth((p) =>
                                    addMonths(p, 1),
                                  )
                                }
                                className="p-1 hover:bg-white rounded cursor-pointer"
                              >
                                <ChevronRight size={16} />
                              </button>
                            </div>
                          </div>

                          {/* Grid tháng */}
                          <div className="grid grid-cols-7 gap-1 text-center text-xs">
                            {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map(
                              (w, idx) => (
                                <span
                                  key={w}
                                  className={`font-bold py-1 ${idx >= 5 ? "text-blue-600" : "text-gray-600"}`}
                                >
                                  {w}
                                </span>
                              ),
                            )}
                            {Array.from({
                              length:
                                (getDay(startOfMonth(currentCalendarMonth)) +
                                  6) %
                                7,
                            }).map((_, i) => (
                              <div key={`blank-${i}`} className="h-8" />
                            ))}
                            {eachDayOfInterval({
                              start: startOfMonth(currentCalendarMonth),
                              end: endOfMonth(currentCalendarMonth),
                            }).map((d) => {
                              const isPast = isBefore(d, today);
                              const target =
                                calendarTarget === "checkIn"
                                  ? checkInDate
                                  : checkOutDate;
                              const isSelected = isSameDay(d, target);
                              return (
                                <button
                                  key={d.toISOString()}
                                  type="button"
                                  disabled={isPast}
                                  onClick={() =>
                                    handleSelectDateFromCalendar(d)
                                  }
                                  className={`h-8 w-full flex items-center justify-center rounded-lg font-bold text-xs transition ${
                                    isPast
                                      ? "text-gray-300 cursor-not-allowed"
                                      : isSelected
                                        ? "bg-[#006ce4] text-white shadow"
                                        : "hover:bg-white text-gray-800"
                                  }`}
                                >
                                  {format(d, "d")}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="mt-3 pt-2 border-t flex justify-end">
                          <button
                            type="button"
                            onClick={() => setIsCalendarOpen(false)}
                            className="px-5 py-2 bg-[#003580] text-white font-bold rounded-xl text-xs cursor-pointer"
                          >
                            Xong
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Ô CHỌN SỐ LƯỢNG PHÒNG & KHÁCH */}
                  <div
                    ref={guestRef}
                    className="relative md:col-span-3 bg-white rounded-xl shadow-lg border border-gray-200 p-2.5 cursor-pointer flex items-center gap-2.5 hover:border-blue-600 transition select-none"
                    onClick={() => setIsGuestOpen(!isGuestOpen)}
                  >
                    <Users size={20} className="text-gray-400 shrink-0" />
                    <div className="leading-tight overflow-hidden">
                      <span className="text-xs font-bold text-gray-800 block truncate">
                        {rooms} Phòng · {adults} Lớn
                      </span>
                      <span className="text-[11px] text-gray-500 font-medium truncate block">
                        {children > 0 ? `${children} trẻ em` : "0 trẻ em"}
                      </span>
                    </div>

                    {isGuestOpen && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute left-0 right-0 md:left-auto md:w-64 top-full mt-2 z-50 bg-white border border-gray-200 rounded-2xl shadow-2xl p-4 space-y-3 cursor-default"
                      >
                        {[
                          {
                            label: "Số phòng",
                            val: rooms,
                            set: setRooms,
                            min: 1,
                          },
                          {
                            label: "Người lớn",
                            val: adults,
                            set: setAdults,
                            min: 1,
                          },
                          {
                            label: "Trẻ em",
                            val: children,
                            set: setChildren,
                            min: 0,
                          },
                        ].map((g) => (
                          <div
                            key={g.label}
                            className="flex justify-between items-center"
                          >
                            <span className="text-xs font-bold text-gray-700">
                              {g.label}
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  g.set((v) => Math.max(g.min, v - 1))
                                }
                                className="w-7 h-7 rounded border border-gray-300 font-bold hover:bg-gray-100 cursor-pointer"
                              >
                                -
                              </button>
                              <span className="text-xs font-bold w-4 text-center">
                                {g.val}
                              </span>
                              <button
                                type="button"
                                onClick={() => g.set((v) => v + 1)}
                                className="w-7 h-7 rounded border border-gray-300 font-bold hover:bg-gray-100 cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => setIsGuestOpen(false)}
                          className="w-full py-2 bg-[#003580] text-white text-xs font-bold rounded-lg cursor-pointer"
                        >
                          Áp dụng
                        </button>
                      </div>
                    )}
                  </div>

                  {/* NÚT TÌM KIẾM */}
                  <button
                    type="button"
                    onClick={handleSearchSubmit}
                    className="md:col-span-2 h-full min-h-[48px] bg-[#003580] hover:bg-blue-900 text-white font-black text-base rounded-xl shadow-lg flex items-center justify-center transition active:scale-[0.98] cursor-pointer"
                  >
                    Tìm kiếm
                  </button>
                </div>
              </div>
            </div>

            {/* BANNER PROMO */}
            <div className="lg:col-span-4 h-full flex items-end">
              <div
                onClick={handleSearchSubmit}
                className="w-full max-w-sm bg-white/95 backdrop-blur-md rounded-2xl p-5 shadow-2xl border border-white/50 space-y-2 cursor-pointer hover:bg-white transition group"
              >
                <div className="text-xs font-black text-blue-700 uppercase tracking-wide">
                  Hệ thống GoStay
                </div>
                <h3 className="text-lg font-black text-[#0a2540] leading-tight group-hover:text-blue-600 transition">
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
                  <div className="w-8 h-8 rounded-full bg-[#0a2540] group-hover:bg-blue-600 text-white flex items-center justify-center transition">
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
              Các thành phố có cơ sở lưu trú đang mở bán được lựa chọn nhiều
              nhất
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
                  src={place.image || getCityLandmarkImage(place.name)}
                  alt={place.name}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 select-none"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent pointer-events-none" />
                <div className="absolute bottom-5 left-5 text-white drop-shadow-md">
                  <h3 className="text-2xl font-black tracking-tight mb-1">
                    {place.name}
                  </h3>
                  <p className="text-xs font-bold text-white/90">
                    {place.hotelCount || place.hotel_count || 1} chỗ nghỉ
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* SECTION 2: CHỖ NGHỈ MỚI NHẤT (CAROUSEL) */}
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
              Cơ sở lưu trú đang mở bán trên hệ thống ({uniqueStays.length} chỗ
              nghỉ)
            </p>
          </div>

          {uniqueStays.length > visibleCount && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setNewestIndex((p) => Math.max(0, p - 1))}
                disabled={newestIndex === 0}
                className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center hover:bg-[#003580] hover:text-white disabled:opacity-30 cursor-pointer transition shadow-2xs"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                type="button"
                onClick={() =>
                  setNewestIndex((p) => Math.min(maxNewestIndex, p + 1))
                }
                disabled={newestIndex >= maxNewestIndex}
                className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center hover:bg-[#003580] hover:text-white disabled:opacity-30 cursor-pointer transition shadow-2xs"
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
                transform: `translateX(-${newestIndex * cardTranslatePercentage}%)`,
              }}
            >
              {uniqueStays.map((stay) => (
                <div
                  key={stay.id}
                  className="w-full sm:w-1/2 lg:w-1/4 shrink-0 px-3"
                >
                  <HotelCard
                    id={stay.id}
                    hotel={stay}
                    image={stay.image}
                    type={stay.type || "Khách sạn"}
                    title={stay.title || stay.name}
                    location={stay.location || stay.address}
                    rating={stay.rating || 9.0}
                    reviewsCount={stay.review_count || 0}
                    salePrice={stay.salePrice || stay.min_price || 650000}
                    stars={stay.star_rating || 3}
                    isFavoriteInitial={favoriteHotelIds.has(stay.id)}
                    onClick={() => navigate(`/hotel/${stay.id}`)}
                  />
                </div>
              ))}
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
