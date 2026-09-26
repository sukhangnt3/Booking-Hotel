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
  Plus,
  Minus,
  Lightbulb,
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
  addHours,
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
  const currentRealHour = useMemo(() => new Date().getHours(), []);

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

  // 🌟 HÌNH THỨC THUÊ
  const [rentalType, setRentalType] = useState("DAY");

  // 🌟 ĐÃ SỬA: MẶC ĐỊNH CHỌN NGAY KHUNG GIỜ HIỆN TẠI (VD 16:00 KHI ĐANG LÀ 16H17)
  const defaultHourTime = useMemo(() => {
    return `${String(currentRealHour).padStart(2, "0")}:00`;
  }, [currentRealHour]);

  const [checkInTime, setCheckInTime] = useState("14:00");
  const [checkOutTime, setCheckOutTime] = useState("12:00");
  const [checkInDate, setCheckInDate] = useState(today);
  const [checkOutDate, setCheckOutDate] = useState(addDays(today, 1));

  // 🌟 SỐ GIỜ SỬ DỤNG: Mở rộng lên tới 10 giờ
  const [hoursCount, setHoursCount] = useState(2);

  // Calendar Popup & Tháng hiển thị
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(today);

  // Khách & Phòng
  const [rooms, setRooms] = useState(1);
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);

  const destRef = useRef(null);
  const calendarRef = useRef(null);

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

  // Live Search
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

  // 🌟 CHUYỂN TAB MƯỢT MÀ CHUẨN GO2JOY
  const handleTabChange = (type) => {
    setRentalType(type);
    if (type === "HOUR") {
      setCheckInTime(defaultHourTime);
      setHoursCount(2);
      setCheckOutDate(checkInDate);
    } else if (type === "DAY") {
      setCheckInTime("14:00");
      setCheckOutTime("12:00");
      if (
        isSameDay(checkInDate, checkOutDate) ||
        isBefore(checkOutDate, checkInDate)
      ) {
        setCheckOutDate(addDays(checkInDate, 1));
      }
    } else if (type === "OVERNIGHT") {
      setCheckInTime("22:00");
      setCheckOutTime("11:00");
      setCheckOutDate(addDays(checkInDate, 1));
    } else if (type === "HALF_DAY") {
      setCheckInTime("12:00");
      setCheckOutTime("21:00");
      setCheckOutDate(checkInDate);
    }
  };

  // 🌟 TÍNH TOÁN THỜI GIAN TRẢ PHÒNG CHUẨN THỜI GIAN THỰC (TỰ ĐỘNG SANG HÔM SAU NẾU QUA NỬA ĐÊM)
  const durationSummary = useMemo(() => {
    const [inH, inM] = checkInTime.split(":").map(Number);
    const inDateTime = new Date(checkInDate);
    inDateTime.setHours(inH || 14, inM || 0, 0, 0);

    let outDateTime = new Date(checkOutDate);
    let outTimeStr = checkOutTime;

    // 1. THEO GIỜ (VÍ DỤ 22H + 2 TIẾNG = 00:00 NGÀY 27/09)
    if (rentalType === "HOUR") {
      outDateTime = addHours(inDateTime, hoursCount);
      outTimeStr = `${String(outDateTime.getHours()).padStart(2, "0")}:${String(outDateTime.getMinutes()).padStart(2, "0")}`;
      return {
        badge: `${hoursCount} Giờ`,
        inDateTime,
        outDateTime,
        outTimeStr,
      };
    }

    // 2. QUA ĐÊM (CHIA 2 CA SÁNG / TỐI CHUẨN GO2JOY)
    if (rentalType === "OVERNIGHT") {
      if ((inH || 0) >= 0 && (inH || 0) <= 6) {
        outDateTime = new Date(checkInDate);
      } else {
        outDateTime = addDays(new Date(checkInDate), 1);
      }
      outDateTime.setHours(11, 0, 0, 0);
      return {
        badge: "1 Đêm",
        inDateTime,
        outDateTime,
        outTimeStr: "11:00",
      };
    }

    // 3. THEO BUỔI
    if (rentalType === "HALF_DAY") {
      outDateTime = new Date(checkInDate);
      outDateTime.setHours(21, 0, 0, 0);
      return {
        badge: "1 Buổi",
        inDateTime,
        outDateTime,
        outTimeStr: "21:00",
      };
    }

    // 4. THEO NGÀY
    const diffDays = Math.max(1, differenceInDays(checkOutDate, checkInDate));
    outDateTime = new Date(checkOutDate);
    outDateTime.setHours(12, 0, 0, 0);

    return {
      badge: `${diffDays} Đêm`,
      inDateTime,
      outDateTime,
      outTimeStr: "12:00",
    };
  }, [
    rentalType,
    checkInTime,
    checkOutTime,
    checkInDate,
    checkOutDate,
    hoursCount,
  ]);

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

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (destRef.current && !destRef.current.contains(e.target))
        setIsDestDropdownOpen(false);
      if (calendarRef.current && !calendarRef.current.contains(e.target)) {
        setIsCalendarOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    const query = new URLSearchParams();
    if (destination.trim()) {
      query.append("destination", destination.trim());
      query.append("search", destination.trim());
    }
    query.append("rentalType", rentalType);
    query.append("checkInTime", checkInTime);
    query.append("checkOutTime", durationSummary.outTimeStr);
    query.append("checkIn", format(checkInDate, "yyyy-MM-dd"));
    query.append("checkOut", format(durationSummary.outDateTime, "yyyy-MM-dd"));
    query.append("hours", hoursCount.toString());
    query.append("adults", adults.toString());
    query.append("children", children.toString());
    query.append("rooms", rooms.toString());

    setIsCalendarOpen(false);
    navigate(`/hotels?${query.toString()}`);
  };

  // 🌟 ĐÃ SỬA: DÙNG DẤU "<" THAY VÌ "<=" ĐỂ KHUNG 16H VẪN ĐƯỢC CHỌN KHI ĐANG LÀ 16H17!
  const isTimeSlotDisabled = (timeStr) => {
    const hourNum = parseInt(timeStr.slice(0, 2), 10);
    const isToday = isSameDay(checkInDate, today);

    // Chỉ khóa các giờ hoàn toàn trong quá khứ (< currentRealHour)
    if (isToday) {
      if (hourNum < currentRealHour) return true;
    }

    return false;
  };

  const ALL_HOURS = Array.from(
    { length: 24 },
    (_, i) => `${String(i).padStart(2, "0")}:00`,
  );
  const OVERNIGHT_MORNING_HOURS = [
    "00:00",
    "01:00",
    "02:00",
    "03:00",
    "04:00",
    "05:00",
    "06:00",
  ];
  const OVERNIGHT_EVENING_HOURS = ["20:00", "21:00", "22:00", "23:00"];
  const HOURLY_DURATIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

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
                {/* Ô TÌM ĐIỂM ĐẾN */}
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

                  {/* DROPDOWN GỢI Ý ĐIỂM ĐẾN */}
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

                {/* HÀNG BỘ LỌC NGÀY VÀ GIỜ */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                  <div ref={calendarRef} className="relative md:col-span-9">
                    <div
                      onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                      className="bg-white rounded-xl shadow-lg border border-gray-200 px-3 py-2 h-13 cursor-pointer flex items-center justify-between hover:border-blue-600 transition select-none gap-2 flex-wrap sm:flex-nowrap"
                    >
                      {/* KHỐI 1: NHẬN PHÒNG */}
                      <div className="flex items-center gap-2 shrink-0">
                        <CalendarIcon
                          size={17}
                          className="text-[#003580] shrink-0"
                        />
                        <div>
                          <span className="text-[10px] font-black text-slate-500 block leading-tight">
                            {rentalType === "DAY"
                              ? "Nhận phòng"
                              : `Nhận (${checkInTime})`}
                          </span>
                          <span className="text-xs font-black text-gray-900 leading-none">
                            {safeFormatDate(checkInDate, "dd/MM/yyyy")}
                          </span>
                        </div>
                      </div>

                      {/* KHỐI 2: HUY HIỆU THỜI LƯỢNG */}
                      <div className="text-[11px] font-black text-[#003580] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full shrink-0">
                        {durationSummary.badge}
                      </div>

                      {/* KHỐI 3: TRẢ PHÒNG */}
                      <div className="flex items-center gap-2 shrink-0">
                        <CalendarIcon
                          size={17}
                          className="text-[#003580] shrink-0"
                        />
                        <div>
                          <span className="text-[10px] font-black text-slate-500 block leading-tight">
                            {rentalType === "DAY"
                              ? "Trả phòng"
                              : `Trả (${durationSummary.outTimeStr})`}
                          </span>
                          <span className="text-xs font-black text-gray-900 leading-none">
                            {safeFormatDate(
                              durationSummary.outDateTime,
                              "dd/MM/yyyy",
                            )}
                          </span>
                        </div>
                      </div>

                      {/* KHỐI 4: KHÁCH & PHÒNG */}
                      <div className="flex items-center gap-2 shrink-0 border-l border-gray-200 pl-2">
                        <Users size={17} className="text-[#003580] shrink-0" />
                        <div>
                          <span className="text-[10px] font-black text-gray-500 block leading-tight">
                            Khách & Phòng
                          </span>
                          <span className="text-xs font-black text-gray-900 leading-none truncate">
                            {adults} Lớn
                            {children > 0 ? `, ${children} Trẻ` : ""} · {rooms}{" "}
                            P
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 🌟 POPUP CHỌN GIỜ & PHÒNG CHUẨN GO2JOY (BÔI MÀU CẢ 2 NGÀY NẾU QUA NỬA ĐÊM) 🌟 */}
                    {isCalendarOpen && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute left-0 top-full mt-2 z-50 bg-white rounded-3xl shadow-2xl border border-slate-200 p-5 w-full sm:w-[680px] space-y-4 animate-in fade-in cursor-default"
                      >
                        {/* 4 TABS HÌNH THỨC THUÊ */}
                        <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-2xl">
                          <button
                            type="button"
                            onClick={() => handleTabChange("HOUR")}
                            className={`py-2 px-1 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
                              rentalType === "HOUR"
                                ? "bg-[#003580] text-white shadow-xs"
                                : "text-slate-600 hover:text-slate-900"
                            }`}
                          >
                            <Clock size={14} /> <span>Theo giờ</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleTabChange("OVERNIGHT")}
                            className={`py-2 px-1 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
                              rentalType === "OVERNIGHT"
                                ? "bg-[#003580] text-white shadow-xs"
                                : "text-slate-600 hover:text-slate-900"
                            }`}
                          >
                            <Moon size={14} /> <span>Qua đêm</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleTabChange("DAY")}
                            className={`py-2 px-1 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
                              rentalType === "DAY"
                                ? "bg-[#003580] text-white shadow-xs"
                                : "text-slate-600 hover:text-slate-900"
                            }`}
                          >
                            <Sun size={14} /> <span>Theo ngày</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleTabChange("HALF_DAY")}
                            className={`py-2 px-1 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
                              rentalType === "HALF_DAY"
                                ? "bg-[#003580] text-white shadow-xs"
                                : "text-slate-600 hover:text-slate-900"
                            }`}
                          >
                            <Hourglass size={14} /> <span>Theo buổi</span>
                          </button>
                        </div>

                        {/* HỘP MẸO BÓNG ĐÈN */}
                        <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-200/60 text-blue-900 text-xs font-semibold flex items-center gap-1.5">
                          <Lightbulb
                            size={15}
                            className="text-[#006ce4] shrink-0"
                          />
                          <span>
                            {rentalType === "HOUR" &&
                              "Phù hợp nghỉ ngơi nhanh từ 1 đến 10 giờ trong ngày."}
                            {rentalType === "OVERNIGHT" &&
                              "Phù hợp nhận phòng buổi tối hoặc rạng sáng và trả phòng trưa hôm sau."}
                            {rentalType === "DAY" &&
                              "Lưu trú theo ngày đêm tiêu chuẩn (Nhận 14:00 - Trả 12:00 trưa)."}
                            {rentalType === "HALF_DAY" &&
                              "Phù hợp lưu trú nửa ngày (Tối đa 9 tiếng trong ngày)."}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 pt-1">
                          {/* CỘT TRÁI: LỊCH THÁNG TRỰC QUAN (TỰ ĐỘNG BÔI MÀU CẢ 2 NGÀY NẾU QUA NỬA ĐÊM) */}
                          <div
                            className={`${rentalType === "DAY" ? "sm:col-span-7" : "sm:col-span-6"} space-y-2 border-r border-slate-100 pr-0 sm:pr-4`}
                          >
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs font-black text-slate-800">
                                {rentalType === "DAY"
                                  ? "Chọn Ngày Nhận & Trả: "
                                  : "Chọn ngày nhận: "}
                                {format(calendarMonth, "'Tháng' MM, yyyy", {
                                  locale: vi,
                                })}
                              </span>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setCalendarMonth((p) => subMonths(p, 1))
                                  }
                                  disabled={isBefore(
                                    startOfMonth(calendarMonth),
                                    startOfMonth(today),
                                  )}
                                  className="p-1 hover:bg-slate-100 rounded disabled:opacity-20 cursor-pointer"
                                >
                                  <ChevronLeft size={16} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setCalendarMonth((p) => addMonths(p, 1))
                                  }
                                  className="p-1 hover:bg-slate-100 rounded cursor-pointer"
                                >
                                  <ChevronRight size={16} />
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-7 gap-1 text-center text-[10px]">
                              {["CN", "T2", "T3", "T4", "T5", "T6", "T7"].map(
                                (d, idx) => (
                                  <span
                                    key={d}
                                    className={`font-bold py-0.5 ${idx === 0 || idx === 6 ? "text-blue-600" : "text-slate-500"}`}
                                  >
                                    {d}
                                  </span>
                                ),
                              )}
                              {Array.from({
                                length: getDay(startOfMonth(calendarMonth)),
                              }).map((_, i) => (
                                <div key={`blank-${i}`} className="h-7" />
                              ))}
                              {eachDayOfInterval({
                                start: startOfMonth(calendarMonth),
                                end: endOfMonth(calendarMonth),
                              }).map((dayItem) => {
                                const isPast = isBefore(dayItem, today);

                                // 🌟 TỰ ĐỘNG BÔI MÀU CẢ 2 NGÀY NẾU QUA NỬA ĐÊM HOẶC QUA ĐÊM CHUẨN GO2JOY
                                const isStartDay = isSameDay(
                                  dayItem,
                                  checkInDate,
                                );
                                const isEndDay =
                                  isSameDay(
                                    dayItem,
                                    durationSummary.outDateTime,
                                  ) &&
                                  !isSameDay(
                                    checkInDate,
                                    durationSummary.outDateTime,
                                  );
                                const isInBetweenRange =
                                  !isPast &&
                                  isBefore(checkInDate, dayItem) &&
                                  isBefore(
                                    dayItem,
                                    durationSummary.outDateTime,
                                  );

                                return (
                                  <button
                                    key={dayItem.toISOString()}
                                    type="button"
                                    disabled={isPast}
                                    onClick={() => {
                                      if (rentalType === "DAY") {
                                        // Theo ngày: Bấm lần 1 chọn nhận, lần 2 chọn trả
                                        if (
                                          isSameDay(dayItem, checkInDate) ||
                                          isBefore(dayItem, checkInDate)
                                        ) {
                                          setCheckInDate(dayItem);
                                          setCheckOutDate(addDays(dayItem, 1));
                                        } else {
                                          setCheckOutDate(dayItem);
                                        }
                                      } else if (rentalType === "OVERNIGHT") {
                                        // Qua đêm: Bấm ngày nào tự động chọn ngày hôm sau
                                        setCheckInDate(dayItem);
                                        setCheckOutDate(addDays(dayItem, 1));
                                      } else {
                                        // Theo giờ / Buổi
                                        setCheckInDate(dayItem);
                                        setCheckOutDate(dayItem);
                                      }
                                    }}
                                    className={`h-7 w-full flex items-center justify-center font-bold text-[11px] transition cursor-pointer select-none ${
                                      isPast
                                        ? "text-slate-300 cursor-not-allowed"
                                        : isStartDay
                                          ? "bg-[#003580] text-white font-black shadow-xs rounded-l-xl rounded-r-xs"
                                          : isEndDay
                                            ? "bg-[#003580] text-white font-black shadow-xs rounded-r-xl rounded-l-xs"
                                            : isInBetweenRange
                                              ? "bg-blue-100 text-blue-900 font-bold rounded-none"
                                              : "hover:bg-blue-50 text-slate-800 rounded-xl"
                                    }`}
                                  >
                                    {format(dayItem, "d")}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* CỘT PHẢI: XỬ LÝ THEO TỪNG HÌNH THỨC */}
                          <div
                            className={`${rentalType === "DAY" ? "sm:col-span-5" : "sm:col-span-6"} space-y-3.5`}
                          >
                            {/* 1. NẾU LÀ THEO NGÀY: TÓM TẮT THỜI GIAN */}
                            {rentalType === "DAY" ? (
                              <div className="space-y-3 pt-1">
                                <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-2xl text-xs space-y-1">
                                  <div className="flex justify-between font-bold text-slate-700">
                                    <span>Nhận phòng:</span>
                                    <strong className="text-blue-900">
                                      14:00,{" "}
                                      {safeFormatDate(
                                        checkInDate,
                                        "dd/MM/yyyy",
                                      )}
                                    </strong>
                                  </div>
                                  <div className="flex justify-between font-bold text-slate-700">
                                    <span>Trả phòng:</span>
                                    <strong className="text-blue-900">
                                      12:00,{" "}
                                      {safeFormatDate(
                                        checkOutDate,
                                        "dd/MM/yyyy",
                                      )}
                                    </strong>
                                  </div>
                                  <div className="pt-1.5 border-t border-blue-200 flex justify-between font-black text-[#003580] text-sm">
                                    <span>Thời gian lưu trú:</span>
                                    <span>{durationSummary.badge}</span>
                                  </div>
                                </div>
                              </div>
                            ) : rentalType === "OVERNIGHT" ? (
                              /* 2. NẾU LÀ QUA ĐÊM: CHIA 2 CA SÁNG / TỐI */
                              <div className="space-y-3">
                                <div>
                                  <label className="text-xs font-black text-slate-800 flex items-center gap-1.5 mb-1.5">
                                    <Moon
                                      size={13}
                                      className="text-indigo-600"
                                    />
                                    <span>Ca Tối (Trả 11h sáng hôm sau)</span>
                                  </label>
                                  <div className="flex gap-1.5 overflow-x-auto pb-1">
                                    {OVERNIGHT_EVENING_HOURS.map((t) => {
                                      const disabled = isTimeSlotDisabled(t);
                                      const active = checkInTime === t;
                                      return (
                                        <button
                                          key={t}
                                          type="button"
                                          disabled={disabled}
                                          onClick={() => setCheckInTime(t)}
                                          className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${
                                            disabled
                                              ? "bg-slate-100 text-slate-300 cursor-not-allowed border border-slate-100"
                                              : active
                                                ? "bg-blue-50 border-2 border-[#006ce4] text-[#006ce4] font-black"
                                                : "bg-slate-50 border border-slate-200 text-slate-700 hover:border-slate-300 cursor-pointer"
                                          }`}
                                        >
                                          {t}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>

                                <div>
                                  <label className="text-xs font-black text-slate-800 flex items-center gap-1.5 mb-1.5">
                                    <Sun size={13} className="text-amber-500" />
                                    <span>
                                      Ca Sáng sớm (Trả 11h sáng cùng ngày)
                                    </span>
                                  </label>
                                  <div className="flex gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
                                    {OVERNIGHT_MORNING_HOURS.map((t) => {
                                      const disabled = isTimeSlotDisabled(t);
                                      const active = checkInTime === t;
                                      return (
                                        <button
                                          key={t}
                                          type="button"
                                          disabled={disabled}
                                          onClick={() => setCheckInTime(t)}
                                          className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition ${
                                            disabled
                                              ? "bg-slate-100 text-slate-300 cursor-not-allowed border border-slate-100"
                                              : active
                                                ? "bg-blue-50 border-2 border-[#006ce4] text-[#006ce4] font-black"
                                                : "bg-slate-50 border border-slate-200 text-slate-700 hover:border-slate-300 cursor-pointer"
                                          }`}
                                        >
                                          {t}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              /* 3. NẾU LÀ THEO GIỜ: MỞ 1 - 10 GIỜ */
                              <div className="space-y-3">
                                <div>
                                  <div className="flex items-center justify-between mb-1.5">
                                    <label className="text-xs font-black text-slate-800 block">
                                      Giờ nhận phòng (24h)
                                    </label>
                                    <span className="text-[10px] text-slate-400 font-semibold">
                                      Lướt ngang &rarr;
                                    </span>
                                  </div>
                                  <div className="flex gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
                                    {ALL_HOURS.map((t) => {
                                      const disabled = isTimeSlotDisabled(t);
                                      const active = checkInTime === t;
                                      return (
                                        <button
                                          key={t}
                                          type="button"
                                          disabled={disabled}
                                          onClick={() => setCheckInTime(t)}
                                          className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition ${
                                            disabled
                                              ? "bg-slate-100 text-slate-300 cursor-not-allowed border border-slate-100"
                                              : active
                                                ? "bg-blue-50 border-2 border-[#006ce4] text-[#006ce4] font-black"
                                                : "bg-slate-50 border border-slate-200 text-slate-700 hover:border-slate-300 cursor-pointer"
                                          }`}
                                        >
                                          {t}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>

                                <div>
                                  <label className="text-xs font-black text-slate-800 block mb-1.5">
                                    Số giờ sử dụng (1 - 10 giờ)
                                  </label>
                                  <div className="flex gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
                                    {HOURLY_DURATIONS.map((h) => {
                                      const active = hoursCount === h;
                                      return (
                                        <button
                                          key={h}
                                          type="button"
                                          onClick={() => setHoursCount(h)}
                                          className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition cursor-pointer ${
                                            active
                                              ? "bg-blue-50 border-2 border-[#006ce4] text-[#006ce4] font-black"
                                              : "bg-slate-50 border border-slate-200 text-slate-700 hover:border-slate-300"
                                          }`}
                                        >
                                          {h} giờ
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* THẺ TÓM TẮT TRẢ PHÒNG (Ngoại trừ tab Ngày) */}
                            {rentalType !== "DAY" && (
                              <div className="p-2.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between text-xs">
                                <span className="text-slate-500 font-semibold">
                                  Dự kiến trả phòng:
                                </span>
                                <strong className="text-slate-900 font-black">
                                  {durationSummary.outTimeStr},{" "}
                                  {safeFormatDate(
                                    durationSummary.outDateTime,
                                    "dd/MM/yyyy",
                                  )}
                                </strong>
                              </div>
                            )}

                            {/* BỘ ĐẾM: NGƯỜI LỚN, TRẺ EM, SỐ PHÒNG */}
                            <div className="space-y-2 pt-1 border-t border-slate-100">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-700">
                                  Người lớn:
                                </span>
                                <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden h-8">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setAdults((p) => Math.max(1, p - 1))
                                    }
                                    className="px-2.5 hover:bg-slate-100 text-slate-600 cursor-pointer"
                                  >
                                    -
                                  </button>
                                  <span className="px-2.5 font-bold text-xs select-none">
                                    {adults}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setAdults((p) => p + 1)}
                                    className="px-2.5 hover:bg-slate-100 text-slate-600 cursor-pointer"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>

                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-700">
                                  Trẻ em:
                                </span>
                                <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden h-8">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setChildren((p) => Math.max(0, p - 1))
                                    }
                                    className="px-2.5 hover:bg-slate-100 text-slate-600 cursor-pointer"
                                  >
                                    -
                                  </button>
                                  <span className="px-2.5 font-bold text-xs select-none">
                                    {children}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setChildren((p) => p + 1)}
                                    className="px-2.5 hover:bg-slate-100 text-slate-600 cursor-pointer"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>

                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-700">
                                  Số phòng:
                                </span>
                                <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden h-8">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setRooms((p) => Math.max(1, p - 1))
                                    }
                                    className="px-2.5 hover:bg-slate-100 text-slate-600 cursor-pointer"
                                  >
                                    -
                                  </button>
                                  <span className="px-2.5 font-bold text-xs select-none">
                                    {rooms}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setRooms((p) => p + 1)}
                                    className="px-2.5 hover:bg-slate-100 text-slate-600 cursor-pointer"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                            </div>

                            <div className="pt-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setIsCalendarOpen(false);
                                  handleSearchSubmit();
                                }}
                                className="w-full h-11 bg-[#003580] hover:bg-blue-900 text-white font-black text-sm rounded-2xl shadow-md transition active:scale-98 cursor-pointer"
                              >
                                Áp dụng
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* NÚT TÌM KIẾM TRÊN BANNER */}
                  <button
                    type="button"
                    onClick={handleSearchSubmit}
                    className="md:col-span-3 h-full min-h-[48px] bg-[#003580] hover:bg-blue-900 text-white font-black text-base rounded-xl shadow-lg flex items-center justify-center transition active:scale-[0.98] cursor-pointer"
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

      {/* SECTION 2: CHỖ NGHỈ MỚI NHẤT */}
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
