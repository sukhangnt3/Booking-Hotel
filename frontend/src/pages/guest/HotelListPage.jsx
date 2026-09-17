// src/pages/guest/HotelListPage.jsx
import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
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
  Clock,
  Sun,
  Hourglass,
  ChevronDown,
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

import { Button } from "@/components/ui";
import { LoadingSpinner, EmptyState, Breadcrumb } from "@/components/common";
import { hotelService } from "@/services";
import { useAuthStore } from "@/stores/authStore";
import apiClient from "@/services/apiClient";

const BACKEND_BASE_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/api\/?$/, "");

const DEFAULT_HOTEL_IMAGE =
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80";

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

const getCityLandmarkImage = (cityName = "") => {
  const norm = cityName
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
  return CITY_LANDMARK_IMAGES[cityName] || DEFAULT_HOTEL_IMAGE;
};

const parseImageUrl = (img) => {
  if (!img) return DEFAULT_HOTEL_IMAGE;
  let raw = String(
    typeof img === "string" ? img : img.url || img.path || "",
  ).trim();
  if (!raw || raw.startsWith("blob:")) return DEFAULT_HOTEL_IMAGE;
  if (
    raw.startsWith("http://") ||
    raw.startsWith("https://") ||
    raw.startsWith("data:image/")
  )
    return raw;
  return `${BACKEND_BASE_URL}${raw.startsWith("/") ? raw : `/${raw}`}`;
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

export default function HotelListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const today = useMemo(() => startOfToday(), []);

  // Đọc params từ URL
  const initialDestination =
    searchParams.get("destination") || searchParams.get("search") || "";
  const initialCheckInStr = searchParams.get("checkIn") || "";
  const initialCheckOutStr = searchParams.get("checkOut") || "";
  const initialRentalType = searchParams.get("rentalType") || "DAY";
  const initialCheckInTime = searchParams.get("checkInTime") || "14:00";
  const initialCheckOutTime = searchParams.get("checkOutTime") || "12:00";
  const initialAdults = Number(searchParams.get("adults")) || 2;
  const initialChildren = Number(searchParams.get("children")) || 0;
  const initialRooms = Number(searchParams.get("rooms")) || 1;
  const initialStars =
    searchParams.get("stars")?.split(",").map(Number).filter(Boolean) || [];
  const sortBy = searchParams.get("sortBy") || "popular";

  // State thanh tìm kiếm
  const [destInput, setDestInput] = useState(initialDestination);
  const [rentalType, setRentalType] = useState(initialRentalType);
  const [checkInTime, setCheckInTime] = useState(initialCheckInTime);
  const [checkOutTime, setCheckOutTime] = useState(initialCheckOutTime);
  const [checkInDate, setCheckInDate] = useState(() =>
    initialCheckInStr ? new Date(initialCheckInStr) : today,
  );
  const [checkOutDate, setCheckOutDate] = useState(() =>
    initialCheckOutStr ? new Date(initialCheckOutStr) : addDays(today, 1),
  );
  const [adults, setAdults] = useState(initialAdults);
  const [children, setChildren] = useState(initialChildren);
  const [rooms, setRooms] = useState(initialRooms);

  // Dropdown states
  const [isDestDropdownOpen, setIsDestDropdownOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarTarget, setCalendarTarget] = useState("checkIn");
  const [isGuestOpen, setIsGuestOpen] = useState(false);
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(today);

  const [trendingDestinations, setTrendingDestinations] = useState([]);
  const destRef = useRef(null);
  const calendarRef = useRef(null);
  const guestRef = useRef(null);

  // Danh sách khách sạn & Bộ lọc
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState({});
  const [searchHotelName, setSearchHotelName] = useState("");
  const [selectedStars, setSelectedStars] = useState(initialStars);
  const [selectedRating, setSelectedRating] = useState(null);
  const [priceBounds, setPriceBounds] = useState({ min: 0, max: 5000000 });
  const [userPriceRange, setUserPriceRange] = useState([0, 5000000]);

  // Click outside handler
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

  // Tải danh sách điểm đến gợi ý (chỉ 1 lần)
  useEffect(() => {
    apiClient
      .get("/hotels/trending-destinations")
      .then((res) => {
        const list = res?.data?.trendingDestinations || res?.data?.data || [];
        if (Array.isArray(list) && list.length) setTrendingDestinations(list);
      })
      .catch(() => {});
  }, []);

  // 🌟 GỌI API TÌM KIẾM KHÁCH SẠN THEO SEARCH PARAMS
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
              rentalType: searchParams.get("rentalType") || "DAY",
              checkInTime: searchParams.get("checkInTime") || "14:00",
              duration: searchParams.get("duration") || "1",
              adults: adQuery,
              sortBy: sortQuery,
            })
          : hotelService.getAll());

        const apiHotels = Array.isArray(res) ? res : res?.data || [];

        const formattedList = apiHotels.map((h) => {
          const hotelId = String(h.id);
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
            image: parseImageUrl(h.image || h.thumbnail || ""),
            salePrice: price,
            min_hourly_price: Number(
              h.min_hourly_price || Math.round(price * 0.25) || 80000,
            ),
            min_overnight_price: Number(h.min_overnight_price || price),
            min_half_day_price: Number(
              h.min_half_day_price || Math.round(price * 0.8) || 250000,
            ),
            star_rating: Number(h.star_rating || 3),
            stars: Number(h.star_rating || 3),
            rating: Number(h.average_rating || 0),
            review_count: Number(h.review_count || 0),
            is_beachfront: Boolean(h.is_beachfront),
            distance_to_center: h.distance_to_center,
          };
        });

        if (formattedList.length > 0) {
          const allPrices = formattedList.map((h) => h.salePrice);
          const realMin = Math.min(...allPrices);
          const realMax = Math.max(...allPrices);
          const roundedMin = Math.floor(realMin / 50000) * 50000;
          const roundedMax = Math.ceil(realMax / 50000) * 50000 || 5000000;
          setPriceBounds({ min: roundedMin, max: roundedMax });
          setUserPriceRange([roundedMin, roundedMax]);
        }

        // Lấy danh sách yêu thích nếu đã đăng nhập
        let favMap = {};
        if (isAuthenticated && hotelService?.getFavorites) {
          try {
            const favs = await hotelService.getFavorites();
            const favList = Array.isArray(favs) ? favs : favs?.data || [];
            favList.forEach((item) => {
              favMap[String(item.id || item.hotel_id)] = true;
            });
          } catch {}
        }

        if (isMounted) {
          setHotels(formattedList);
          setFavorites(favMap);
        }
      } catch (error) {
        console.error("Lỗi khi tải danh sách khách sạn:", error);
      } finally {
        if (isMounted) setLoading(false);
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

  const handleSelectDestination = (destName) => {
    setDestInput(destName);
    setIsDestDropdownOpen(false);
    setIsCalendarOpen(true);
  };

  // Tính số giờ chuẩn xác khi thuê theo Giờ
  const calculatedHours = useMemo(() => {
    if (rentalType !== "HOUR") return 1;
    const inH = parseInt(checkInTime.split(":")[0], 10);
    const outH = parseInt(checkOutTime.split(":")[0], 10);
    const diffDays = Math.max(0, differenceInDays(checkOutDate, checkInDate));
    let total = diffDays * 24 + (outH - inH);
    return Math.max(1, total <= 0 ? total + 24 : total);
  }, [rentalType, checkInTime, checkOutTime, checkInDate, checkOutDate]);

  const durationBadgeLabel = useMemo(() => {
    if (rentalType === "HOUR") return `${calculatedHours} Giờ`;
    if (rentalType === "OVERNIGHT") return "Qua đêm";
    if (rentalType === "HALF_DAY") return "1 Buổi";
    return `${Math.max(1, differenceInDays(checkOutDate, checkInDate))} Ngày`;
  }, [rentalType, calculatedHours, checkInDate, checkOutDate]);

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    const query = {};
    if (destInput.trim()) {
      query.destination = destInput.trim();
      query.search = destInput.trim();
    }
    query.rentalType = rentalType;
    query.checkInTime = checkInTime;
    query.checkOutTime = checkOutTime;
    query.checkIn = format(checkInDate, "yyyy-MM-dd");
    query.checkOut = format(checkOutDate, "yyyy-MM-dd");
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
    setIsCalendarOpen(false);
  };

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

  // Đếm số lượng theo bộ lọc
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

  // Danh sách đã lọc
  const filteredHotels = useMemo(() => {
    return hotels.filter((hotel) => {
      const price = Number(hotel.salePrice || 0);
      const star = Number(hotel.star_rating || 0);
      const score = Number(hotel.rating || 0);

      if (searchHotelName.trim()) {
        const nameSearchKey = removeVietnameseTones(searchHotelName);
        const nameKey = removeVietnameseTones(hotel.name);
        if (!nameKey.includes(nameSearchKey)) return false;
      }
      if (price < userPriceRange[0] || price > userPriceRange[1]) return false;
      if (selectedStars.length > 0 && !selectedStars.includes(star))
        return false;
      if (selectedRating !== null && score < selectedRating) return false;

      return true;
    });
  }, [hotels, searchHotelName, userPriceRange, selectedStars, selectedRating]);

  // Sắp xếp danh sách
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
    if (!isAuthenticated)
      return alert("Vui lòng đăng nhập để lưu khách sạn yêu thích!");
    const hotelId = String(hotel.id);
    const previous = Boolean(favorites[hotelId]);
    setFavorites((prev) => ({ ...prev, [hotelId]: !previous }));
    try {
      if (previous) await hotelService.removeFavorite(hotelId);
      else await hotelService.addFavorite(hotelId);
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

  return (
    <div className="bg-[#f5f7fa] min-h-screen pb-16 font-sans text-gray-800">
      <div className="max-w-7xl mx-auto px-4 pt-4">
        <Breadcrumb items={breadcrumbs} />

        {/* THANH TÌM KIẾM NGANG KÈM 4 TABS */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-md mt-3 mb-6 relative">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center">
            {/* Ô 1: Điểm đến */}
            <div ref={destRef} className="md:col-span-4 relative">
              <div
                onClick={() => setIsDestDropdownOpen(true)}
                className="flex items-center bg-slate-50 rounded-xl px-3.5 h-12 border border-gray-200 focus-within:border-blue-600 focus-within:bg-white transition-colors cursor-pointer"
              >
                <Search size={18} className="text-gray-400 shrink-0 mr-2.5" />
                <input
                  type="text"
                  placeholder="Bạn muốn đi đâu? (Tên khách sạn, TP...)"
                  value={destInput}
                  onFocus={() => setIsDestDropdownOpen(true)}
                  onChange={(e) => {
                    setDestInput(e.target.value);
                    setIsDestDropdownOpen(true);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleSearchSubmit()}
                  className="w-full text-xs md:text-sm font-bold text-gray-800 focus:outline-none placeholder:text-gray-400 bg-transparent"
                />
              </div>

              {/* Dropdown gợi ý */}
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
                          className="flex items-center gap-3 p-2 rounded-xl hover:bg-blue-50/60 cursor-pointer transition group"
                        >
                          <img
                            src={item.image || getCityLandmarkImage(item.name)}
                            alt={item.name}
                            loading="lazy"
                            className="w-11 h-11 rounded-xl object-cover shrink-0 shadow-2xs group-hover:scale-105 transition"
                          />
                          <div className="overflow-hidden">
                            <span className="font-bold text-sm text-gray-900 block group-hover:text-[#006ce4] truncate">
                              {item.name}
                            </span>
                            <span className="text-[11px] text-gray-500 font-medium block truncate">
                              {item.hotelCount || item.hotel_count || 1} chỗ
                              nghỉ
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* Ô 2: Ngày & Giờ */}
            <div
              ref={calendarRef}
              onClick={() => setIsCalendarOpen(!isCalendarOpen)}
              className="relative md:col-span-4 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-gray-200 p-2.5 h-12 cursor-pointer flex items-center justify-between hover:border-blue-600 transition select-none"
            >
              <div className="flex items-center gap-2">
                <CalendarIcon size={16} className="text-gray-400" />
                <div>
                  <span className="text-[10px] font-black text-slate-500 block leading-tight">
                    {rentalType === "HOUR"
                      ? `Giờ (${checkInTime})`
                      : `Nhận (${checkInTime})`}
                  </span>
                  <span className="text-xs font-bold text-gray-800 leading-none">
                    {safeFormatDate(checkInDate, "dd/MM/yyyy")}
                  </span>
                </div>
              </div>

              <div className="text-[11px] font-black text-blue-600 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
                {durationBadgeLabel}
              </div>

              <div className="flex items-center gap-2">
                <CalendarIcon size={16} className="text-gray-400" />
                <div>
                  <span className="text-[10px] font-black text-slate-500 block leading-tight">
                    Trả ({checkOutTime})
                  </span>
                  <span className="text-xs font-bold text-gray-800 leading-none">
                    {safeFormatDate(checkOutDate, "dd/MM/yyyy")}
                  </span>
                </div>
              </div>

              {/* Popup Lịch */}
              {isCalendarOpen && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute left-0 lg:left-auto lg:right-0 top-full mt-2 z-50 bg-white border border-gray-200 rounded-3xl shadow-2xl p-5 w-[330px] sm:w-[500px] animate-in fade-in cursor-default"
                >
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

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 block">
                        Nhận phòng ({checkInTime})
                      </label>
                      <select
                        value={checkInTime}
                        onChange={(e) => setCheckInTime(e.target.value)}
                        className="w-full h-11 px-2.5 bg-white border border-gray-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-[#006ce4]"
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
                      <label className="text-xs font-bold text-slate-700 block">
                        Trả phòng ({checkOutTime})
                      </label>
                      <select
                        value={checkOutTime}
                        onChange={(e) => setCheckOutTime(e.target.value)}
                        className="w-full h-11 px-2.5 bg-white border border-gray-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-[#006ce4]"
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

                  <div className="w-full py-2 bg-blue-50 text-[#006ce4] border border-blue-100 rounded-xl font-black text-center text-xs mb-3">
                    {durationBadgeLabel}
                  </div>

                  {/* Lưới chọn ngày */}
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-[#006ce4]">
                        {calendarTarget === "checkIn"
                          ? "Chọn ngày nhận phòng:"
                          : "Chọn ngày trả phòng:"}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            setCurrentCalendarMonth((p) => subMonths(p, 1))
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
                            setCurrentCalendarMonth((p) => addMonths(p, 1))
                          }
                          className="p-1 hover:bg-white rounded cursor-pointer"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>

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
                          (getDay(startOfMonth(currentCalendarMonth)) + 6) % 7,
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
                            onClick={() => handleSelectDateFromCalendar(d)}
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
                      className="px-5 py-2 bg-[#003580] hover:bg-blue-900 text-white font-bold text-xs rounded-xl shadow cursor-pointer"
                    >
                      Xong
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Ô 3: Khách & Phòng */}
            <div
              ref={guestRef}
              onClick={() => setIsGuestOpen(!isGuestOpen)}
              className="relative md:col-span-2 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-gray-200 p-2.5 h-12 cursor-pointer flex items-center gap-2 hover:border-blue-600 transition select-none"
            >
              <Users size={18} className="text-gray-400 shrink-0" />
              <div className="leading-tight overflow-hidden">
                <span className="text-xs font-bold text-gray-800 block truncate">
                  {rooms} Phòng · {adults} Lớn
                </span>
                <span className="text-[10px] text-slate-500 font-medium block truncate">
                  {children > 0 ? `${children} trẻ em` : "0 trẻ em"}
                </span>
              </div>

              {isGuestOpen && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute left-0 right-0 md:left-auto md:w-72 top-full mt-2 z-50 bg-white border border-gray-200 rounded-2xl shadow-2xl p-4 space-y-3.5 cursor-default"
                >
                  {[
                    { label: "Phòng", val: rooms, set: setRooms, min: 1 },
                    { label: "Người lớn", val: adults, set: setAdults, min: 1 },
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
                      <span className="text-xs font-bold text-gray-800">
                        {g.label}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => g.set((v) => Math.max(g.min, v - 1))}
                          className="w-7 h-7 rounded-lg border border-gray-300 font-bold hover:bg-gray-100 flex items-center justify-center cursor-pointer"
                        >
                          -
                        </button>
                        <span className="text-xs font-black w-5 text-center">
                          {g.val}
                        </span>
                        <button
                          type="button"
                          onClick={() => g.set((v) => v + 1)}
                          className="w-7 h-7 rounded-lg border border-gray-300 font-bold hover:bg-gray-100 flex items-center justify-center cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
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
              className="md:col-span-2 h-12 bg-[#003580] hover:bg-blue-900 text-white font-black text-sm rounded-xl shadow-md transition active:scale-[0.98] flex items-center justify-center cursor-pointer"
            >
              Tìm kiếm
            </button>
          </div>
        </div>

        {/* NỘI DUNG CHÍNH: SIDEBAR VÀ LIST KHÁCH SẠN */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* SIDEBAR BỘ LỌC */}
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

            <div>
              <input
                type="text"
                placeholder="Tìm theo tên chỗ nghỉ..."
                value={searchHotelName}
                onChange={(e) => setSearchHotelName(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:border-[#006ce4] focus:outline-none placeholder:text-gray-400 font-medium"
              />
            </div>

            {/* Ngân sách */}
            <div className="space-y-3 pt-2 border-t border-gray-100">
              <h3 className="text-sm font-extrabold text-gray-900">
                Ngân sách của bạn (mỗi đêm)
              </h3>
              <div className="text-xs font-black text-slate-800">
                {formatVND(userPriceRange[0])} – {formatVND(userPriceRange[1])}
              </div>
              <input
                type="range"
                min={priceBounds.min}
                max={priceBounds.max}
                step={50000}
                value={userPriceRange[1]}
                onChange={(e) =>
                  setUserPriceRange([userPriceRange[0], Number(e.target.value)])
                }
                className="w-full accent-[#006ce4] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                <span>{formatVND(priceBounds.min)}</span>
                <span>{formatVND(priceBounds.max)}</span>
              </div>
            </div>

            {/* Điểm đánh giá */}
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
                ].map((item) => (
                  <label
                    key={item.score}
                    className="flex items-center justify-between text-xs text-gray-700 cursor-pointer group hover:text-[#006ce4]"
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={selectedRating === item.score}
                        onChange={() => handleRatingToggle(item.score)}
                        className="w-4 h-4 rounded border-gray-300 text-[#006ce4] focus:ring-[#006ce4] cursor-pointer"
                      />
                      <span
                        className={
                          selectedRating === item.score
                            ? "font-bold text-[#006ce4]"
                            : ""
                        }
                      >
                        {item.label}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400 font-medium">
                      {filterCounts.ratings[item.score] || 0}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Hạng sao */}
            <div className="space-y-2.5 pt-4 border-t border-gray-100">
              <h3 className="text-sm font-extrabold text-gray-900">
                Hạng sao khách sạn
              </h3>
              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map((star) => (
                  <label
                    key={star}
                    className="flex items-center justify-between text-xs text-gray-700 cursor-pointer group hover:text-[#006ce4]"
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={selectedStars.includes(star)}
                        onChange={() => handleStarToggle(star)}
                        className="w-4 h-4 rounded border-gray-300 text-[#006ce4] focus:ring-[#006ce4] cursor-pointer"
                      />
                      <span className="flex items-center gap-1">
                        <span>{star} sao</span>
                        <span className="text-amber-400">★</span>
                      </span>
                    </div>
                    <span className="text-xs text-gray-400 font-medium">
                      {filterCounts.stars[star] || 0}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </aside>

          {/* MAIN CONTENT */}
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
                  Sắp xếp:
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

                  let displayPrice = hotel.salePrice;
                  let priceLabel = "Giá mỗi đêm từ";
                  let badgeRental = null;

                  if (rentalType === "HOUR") {
                    displayPrice = hotel.min_hourly_price || 80000;
                    priceLabel = "Giá 1 giờ đầu từ";
                    badgeRental = "🕒 Thuê theo giờ";
                  } else if (rentalType === "OVERNIGHT") {
                    displayPrice = hotel.min_overnight_price || hotel.salePrice;
                    priceLabel = "Giá qua đêm từ";
                    badgeRental = "🌙 Thuê qua đêm";
                  } else if (rentalType === "HALF_DAY") {
                    displayPrice = hotel.min_half_day_price || 250000;
                    priceLabel = "Giá 1 buổi từ";
                    badgeRental = "⏳ Thuê theo buổi";
                  }

                  return (
                    <div
                      key={id}
                      onClick={() =>
                        navigate(
                          `/hotel/${id}?checkIn=${format(checkInDate, "yyyy-MM-dd")}&checkOut=${format(checkOutDate, "yyyy-MM-dd")}&rentalType=${rentalType}&checkInTime=${checkInTime}&checkOutTime=${checkOutTime}&adults=${adults}&children=${children}&rooms=${rooms}`,
                        )
                      }
                      className="bg-white rounded-2xl border border-gray-200 p-4 hover:border-[#006ce4] hover:shadow-xl transition duration-300 cursor-pointer group flex flex-col md:flex-row gap-5"
                    >
                      <div className="relative w-full md:w-64 h-52 shrink-0 rounded-xl overflow-hidden bg-gray-100">
                        <img
                          src={hotel.image}
                          alt={hotel.title}
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.src = DEFAULT_HOTEL_IMAGE;
                          }}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-700"
                        />
                        <button
                          type="button"
                          onClick={(e) => toggleFavorite(e, hotel)}
                          className={`absolute top-3 right-3 z-10 w-9 h-9 rounded-full flex items-center justify-center shadow-md transition ${
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

                      <div className="flex-1 flex flex-col justify-between py-1">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-extrabold text-lg text-gray-900 group-hover:text-[#006ce4] transition leading-snug">
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
                            {hotel.distance_to_center && (
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

                          <div className="flex items-center gap-2 pt-1 flex-wrap">
                            {badgeRental && (
                              <span className="inline-flex items-center gap-1 bg-blue-50 border border-blue-200 text-[#006ce4] text-[11px] font-bold px-2 py-0.5 rounded-md shadow-2xs">
                                {badgeRental}
                              </span>
                            )}
                            {hotel.is_beachfront && (
                              <span className="inline-flex items-center gap-1 bg-cyan-50 border border-cyan-200 text-cyan-800 text-[11px] font-bold px-2 py-0.5 rounded-md shadow-2xs">
                                <Waves
                                  size={13}
                                  className="text-cyan-600 shrink-0 stroke-[2.5]"
                                />
                                Giáp biển
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed pt-1">
                            {hotel.description ||
                              "Chỗ nghỉ sở hữu không gian thoáng đãng, tiện nghi hiện đại và dịch vụ tận tâm."}
                          </p>
                        </div>

                        <div className="flex items-end justify-between pt-4 border-t border-gray-100 mt-3">
                          <div className="flex items-center gap-2">
                            <div className="bg-[#003580] text-white font-black text-sm w-9 h-9 rounded-lg flex items-center justify-center shadow-2xs">
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

                          <div className="text-right">
                            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                              {priceLabel}
                            </p>
                            <p className="text-xl font-black text-[#003580]">
                              {formatVND(displayPrice)}
                            </p>
                            <p className="text-[10px] text-gray-400 italic">
                              Đã gồm thuế & phí
                            </p>
                            <button
                              type="button"
                              onClick={() =>
                                navigate(
                                  `/hotel/${id}?checkIn=${format(checkInDate, "yyyy-MM-dd")}&checkOut=${format(checkOutDate, "yyyy-MM-dd")}&rentalType=${rentalType}&checkInTime=${checkInTime}&checkOutTime=${checkOutTime}&adults=${adults}&children=${children}&rooms=${rooms}`,
                                )
                              }
                              className="mt-2 px-4 py-1.5 bg-[#006ce4] hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition cursor-pointer shadow-2xs"
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
