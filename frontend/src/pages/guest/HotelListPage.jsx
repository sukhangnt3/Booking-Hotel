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
  Plus,
  Minus,
  Building,
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
  const currentRealHour = useMemo(() => new Date().getHours(), []);

  // Đọc params từ URL
  const initialDestination =
    searchParams.get("destination") || searchParams.get("search") || "";
  const initialCheckInStr = searchParams.get("checkIn") || "";
  const initialCheckOutStr = searchParams.get("checkOut") || "";
  const initialRentalType = searchParams.get("rentalType") || "DAY";
  const initialCheckInTime = searchParams.get("checkInTime") || "14:00";
  const initialCheckOutTime = searchParams.get("checkOutTime") || "12:00";
  const initialHours = Number(searchParams.get("hours")) || 2;
  const initialAdults = Number(searchParams.get("adults")) || 1;
  const initialChildren = Number(searchParams.get("children")) || 0;
  const initialRooms = Number(searchParams.get("rooms")) || 1;
  const initialStars =
    searchParams.get("stars")?.split(",").map(Number).filter(Boolean) || [];
  const sortBy = searchParams.get("sortBy") || "popular";

  // Đọc tham số giáp biển & gần trung tâm từ URL
  const initialBeachfront = searchParams.get("beachfront") === "true";
  const [onlyBeachfront, setOnlyBeachfront] = useState(initialBeachfront);

  const initialNearCenter = searchParams.get("nearCenter") === "true";
  const [onlyNearCenter, setOnlyNearCenter] = useState(initialNearCenter);

  useEffect(() => {
    setOnlyBeachfront(searchParams.get("beachfront") === "true");
    setOnlyNearCenter(searchParams.get("nearCenter") === "true");
  }, [searchParams]);

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
  const [hoursCount, setHoursCount] = useState(initialHours);
  const [adults, setAdults] = useState(initialAdults);
  const [children, setChildren] = useState(initialChildren);
  const [rooms, setRooms] = useState(initialRooms);

  // Dropdown states
  const [isDestDropdownOpen, setIsDestDropdownOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(today);

  const [trendingDestinations, setTrendingDestinations] = useState([]);
  const destRef = useRef(null);
  const calendarRef = useRef(null);

  // Danh sách khách sạn & Bộ lọc
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState({});
  const [searchHotelName, setSearchHotelName] = useState("");
  const [selectedStars, setSelectedStars] = useState(initialStars);
  const [selectedRating, setSelectedRating] = useState(null);
  const [priceBounds, setPriceBounds] = useState({ min: 0, max: 5000000 });
  const [userPriceRange, setUserPriceRange] = useState([0, 5000000]);

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

  useEffect(() => {
    apiClient
      .get("/hotels/trending-destinations")
      .then((res) => {
        const list = res?.data?.trendingDestinations || res?.data?.data || [];
        if (Array.isArray(list) && list.length) setTrendingDestinations(list);
      })
      .catch(() => {});
  }, []);

  // GỌI API TÌM KIẾM KHÁCH SẠN VÀ ĐỒNG BỘ DỮ LIỆU PHÒNG THỰC TẾ
  useEffect(() => {
    let isMounted = true;
    const fetchHotelsAndFavorites = async () => {
      setLoading(true);
      try {
        const destQuery =
          searchParams.get("destination") || searchParams.get("search") || "";
        const inQuery = searchParams.get("checkIn") || "";
        const outQuery = searchParams.get("checkOut") || "";
        const adQuery = searchParams.get("adults") || "1";
        const sortQuery = searchParams.get("sortBy") || "popular";
        const curRental = searchParams.get("rentalType") || rentalType || "DAY";

        const res = await (hotelService.searchHotels
          ? hotelService.searchHotels({
              destination: destQuery,
              checkIn: inQuery,
              checkOut: outQuery,
              rentalType: curRental,
              checkInTime: searchParams.get("checkInTime") || checkInTime,
              duration: searchParams.get("hours") || hoursCount.toString(),
              adults: adQuery,
              sortBy: sortQuery,
            })
          : hotelService.getAll());

        const apiHotels = Array.isArray(res) ? res : res?.data || [];

        const enrichedHotels = await Promise.all(
          apiHotels.map(async (h) => {
            let roomList = Array.isArray(h.rooms)
              ? h.rooms
              : Array.isArray(h.Rooms)
                ? h.Rooms
                : [];

            if (roomList.length === 0) {
              try {
                const roomRes = await apiClient.get(
                  `/rooms?hotel_id=${h.id}&_t=${Date.now()}`,
                );
                const rList = roomRes?.data || roomRes?.rooms || roomRes || [];
                if (Array.isArray(rList) && rList.length > 0) {
                  roomList = rList;
                }
              } catch (e) {}
            }
            return { ...h, rooms: roomList };
          }),
        );

        const formattedList = enrichedHotels.map((h) => {
          const hotelId = String(h.id);
          const rawPrice = Number(h.min_price ?? h.price ?? h.base_price ?? 0);
          const roomList = Array.isArray(h.rooms) ? h.rooms : [];

          let roomHourlyList = [];
          let roomOvernightList = [];
          let roomHalfDayList = [];
          let roomDailyList = [];

          roomList.forEach((r) => {
            const rh = Number(
              r.hourly_price ??
                r.min_hourly_price ??
                r.hourlyPrice ??
                r.first_hour_price ??
                0,
            );
            if (rh > 0) roomHourlyList.push(rh);

            const ro = Number(
              r.overnight_price ??
                r.min_overnight_price ??
                r.overnightPrice ??
                0,
            );
            if (ro > 0) roomOvernightList.push(ro);

            const rhd = Number(
              r.half_day_price ?? r.min_half_day_price ?? r.halfDayPrice ?? 0,
            );
            if (rhd > 0) roomHalfDayList.push(rhd);

            const rd = Number(r.base_price ?? r.sell_price ?? r.price ?? 0);
            if (rd > 0) roomDailyList.push(rd);
          });

          let finalHourly = 0;
          if (roomHourlyList.length > 0) {
            finalHourly = Math.min(...roomHourlyList);
          } else if (Number(h.hourly_price) > 0) {
            finalHourly = Number(h.hourly_price);
          } else if (Number(h.min_hourly_price) > 0) {
            finalHourly = Number(h.min_hourly_price);
          } else if (curRental === "HOUR" && rawPrice > 0) {
            finalHourly = rawPrice;
          } else {
            finalHourly = rawPrice > 0 ? rawPrice : 80000;
          }

          let finalHalfDay = 0;
          if (roomHalfDayList.length > 0) {
            finalHalfDay = Math.min(...roomHalfDayList);
          } else if (Number(h.half_day_price) > 0) {
            finalHalfDay = Number(h.half_day_price);
          } else if (Number(h.min_half_day_price) > 0) {
            finalHalfDay = Number(h.min_half_day_price);
          } else if (curRental === "HALF_DAY" && rawPrice > 0) {
            finalHalfDay = rawPrice;
          } else {
            finalHalfDay = rawPrice > 0 ? rawPrice : 250000;
          }

          let finalOvernight = 0;
          if (roomOvernightList.length > 0) {
            finalOvernight = Math.min(...roomOvernightList);
          } else if (Number(h.overnight_price) > 0) {
            finalOvernight = Number(h.overnight_price);
          } else if (Number(h.min_overnight_price) > 0) {
            finalOvernight = Number(h.min_overnight_price);
          } else if (curRental === "OVERNIGHT" && rawPrice > 0) {
            finalOvernight = rawPrice;
          } else {
            finalOvernight = rawPrice > 0 ? rawPrice : 500000;
          }

          const finalDaily =
            roomDailyList.length > 0
              ? Math.min(...roomDailyList)
              : rawPrice > 0
                ? rawPrice
                : 650000;

          const formatTime = (timeStr, defaultTime) => {
            if (!timeStr) return defaultTime;
            return String(timeStr).trim().slice(0, 5);
          };

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
            salePrice: finalDaily,
            min_hourly_price: finalHourly,
            min_overnight_price: finalOvernight,
            min_half_day_price: finalHalfDay,
            star_rating: Number(h.star_rating || 3),
            stars: Number(h.star_rating || 3),
            rating: Number(h.average_rating || 0),
            review_count: Number(h.review_count || 0),
            is_beachfront: Boolean(h.is_beachfront),
            distance_to_center: h.distance_to_center
              ? Number(h.distance_to_center)
              : 1.2,
            rooms: roomList,
            checkin_time: formatTime(h.checkin_time, "14:00"),
            checkout_time: formatTime(h.checkout_time, "12:00"),
            overnight_checkin_time: formatTime(
              h.overnight_checkin_time,
              "22:00",
            ),
            overnight_checkout_time: formatTime(
              h.overnight_checkout_time,
              "11:00",
            ),
            hourly_start_time: formatTime(h.hourly_start_time, "08:00"),
            hourly_end_time: formatTime(h.hourly_end_time, "22:00"),
          };
        });

        if (formattedList.length > 0) {
          const allPrices = formattedList.map((h) => {
            if (curRental === "HOUR") return h.min_hourly_price;
            if (curRental === "OVERNIGHT") return h.min_overnight_price;
            if (curRental === "HALF_DAY") return h.min_half_day_price;
            return h.salePrice;
          });
          const realMin = Math.min(...allPrices);
          const realMax = Math.max(...allPrices);
          const roundedMin = Math.floor(realMin / 50000) * 50000;
          const roundedMax = Math.ceil(realMax / 50000) * 50000 || 5000000;
          setPriceBounds({ min: roundedMin, max: roundedMax });
          setUserPriceRange([roundedMin, roundedMax]);
        }

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
  }, [searchParams, isAuthenticated, rentalType, checkInTime, hoursCount]);

  const updateUrlParams = (newParams) => {
    const current = Object.fromEntries(searchParams.entries());
    const updated = { ...current, ...newParams };
    Object.keys(updated).forEach((key) => {
      if (!updated[key] || updated[key] === "0") delete updated[key];
    });
    setSearchParams(updated);
  };

  // 🌟 CHUYỂN TAB CHUẨN THỜI GIAN THỰC & KHÔNG CHỌN GIỜ Ở THEO NGÀY
  const handleTabChange = (type) => {
    setRentalType(type);
    if (type === "HOUR") {
      const nextH = Math.min(23, currentRealHour + 1);
      setCheckInTime(`${String(nextH).padStart(2, "0")}:00`);
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

  const handleSelectDestination = (destName) => {
    setDestInput(destName);
    setIsDestDropdownOpen(false);
    setIsCalendarOpen(true);
  };

  // 🌟 TÍNH TOÁN DỰ KIẾN TRẢ PHÒNG CHUẨN GO2JOY
  const durationSummary = useMemo(() => {
    const [inH, inM] = checkInTime.split(":").map(Number);
    const inDateTime = new Date(checkInDate);
    inDateTime.setHours(inH || 14, inM || 0, 0, 0);

    let outDateTime = new Date(checkOutDate);
    let outTimeStr = checkOutTime;

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

    if (rentalType === "OVERNIGHT") {
      // Nhận rạng sáng (00h - 06h): trả 11h sáng CÙNG NGÀY
      if ((inH || 0) >= 0 && (inH || 0) <= 6) {
        outDateTime = new Date(checkInDate);
      } else {
        // Nhận ca tối (20h - 23h): trả 11h sáng NGÀY HÔM SAU
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

    // THEO NGÀY (DAY): Cố định trả lúc 12:00
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

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    const query = {};
    if (destInput.trim()) {
      query.destination = destInput.trim();
      query.search = destInput.trim();
    }
    query.rentalType = rentalType;
    query.checkInTime = checkInTime;
    query.checkOutTime =
      rentalType === "HOUR" ? durationSummary.outTimeStr : checkOutTime;
    query.checkIn = format(checkInDate, "yyyy-MM-dd");
    query.checkOut = format(
      rentalType === "HOUR" ? durationSummary.outDateTime : checkOutDate,
      "yyyy-MM-dd",
    );
    query.hours = hoursCount.toString();
    query.adults = adults.toString();
    query.children = children.toString();
    query.rooms = rooms.toString();
    if (selectedStars.length > 0) query.stars = selectedStars.join(",");
    if (onlyBeachfront) query.beachfront = "true";
    if (onlyNearCenter) query.nearCenter = "true";
    query.sortBy = sortBy;

    setIsDestDropdownOpen(false);
    setIsCalendarOpen(false);
    setSearchParams(query);
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
    setOnlyBeachfront(false);
    setOnlyNearCenter(false);
    setUserPriceRange([priceBounds.min, priceBounds.max]);
    updateUrlParams({ stars: "", beachfront: "", nearCenter: "" });
  };

  const filterCounts = useMemo(() => {
    const counts = {
      stars: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      ratings: { 9: 0, 8: 0, 7: 0, 6: 0 },
      beachfront: 0,
      nearCenter: 0,
    };
    hotels.forEach((h) => {
      const star = Math.round(h.star_rating);
      if (counts.stars[star] !== undefined) counts.stars[star]++;
      if (h.rating >= 9.0) counts.ratings[9]++;
      if (h.rating >= 8.0) counts.ratings[8]++;
      if (h.rating >= 7.0) counts.ratings[7]++;
      if (h.rating >= 6.0) counts.ratings[6]++;
      if (h.is_beachfront) counts.beachfront++;
      if (h.distance_to_center && Number(h.distance_to_center) <= 2.5) {
        counts.nearCenter++;
      }
    });
    return counts;
  }, [hotels]);

  const filteredHotels = useMemo(() => {
    return hotels.filter((hotel) => {
      const star = Number(hotel.star_rating || 0);
      const score = Number(hotel.rating || 0);

      if (onlyBeachfront && !hotel.is_beachfront) {
        return false;
      }

      if (
        onlyNearCenter &&
        (!hotel.distance_to_center || Number(hotel.distance_to_center) > 2.5)
      ) {
        return false;
      }

      if (searchHotelName.trim()) {
        const nameSearchKey = removeVietnameseTones(searchHotelName);
        const nameKey = removeVietnameseTones(hotel.name);
        if (!nameKey.includes(nameSearchKey)) return false;
      }

      let currentComparePrice = hotel.salePrice;
      if (rentalType === "HOUR") {
        currentComparePrice = hotel.min_hourly_price;
      } else if (rentalType === "OVERNIGHT") {
        currentComparePrice = hotel.min_overnight_price;
      } else if (rentalType === "HALF_DAY") {
        currentComparePrice = hotel.min_half_day_price;
      }

      if (
        currentComparePrice < userPriceRange[0] ||
        currentComparePrice > userPriceRange[1]
      ) {
        return false;
      }

      if (selectedStars.length > 0 && !selectedStars.includes(star))
        return false;
      if (selectedRating !== null && score < selectedRating) return false;

      if (rentalType === "HOUR") {
        const hStart = (hotel.hourly_start_time || "08:00").slice(0, 5);
        const hEnd = (hotel.hourly_end_time || "22:00").slice(0, 5);
        const inTime = (checkInTime || "12:00").slice(0, 5);

        if (inTime < hStart || inTime > hEnd) {
          return false;
        }
      }

      if (rentalType === "OVERNIGHT") {
        const oIn = (hotel.overnight_checkin_time || "22:00").slice(0, 5);
        const inTime = (checkInTime || "22:00").slice(0, 5);
        const inHourNum = parseInt(inTime.slice(0, 2), 10);
        const oInHourNum = parseInt(oIn.slice(0, 2), 10);

        if (inHourNum > 6 && inHourNum < oInHourNum) {
          return false;
        }
      }

      return true;
    });
  }, [
    hotels,
    onlyBeachfront,
    onlyNearCenter,
    searchHotelName,
    userPriceRange,
    selectedStars,
    selectedRating,
    rentalType,
    checkInTime,
  ]);

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
    Number(price || 0).toLocaleString("vi-VN") + " đ";

  const breadcrumbs = [
    { label: "Trang chủ", link: "/" },
    { label: "Khách sạn", link: "/hotels" },
    {
      label: initialDestination
        ? `Chỗ nghỉ tại ${initialDestination}`
        : "Tất cả chỗ nghỉ",
    },
  ];

  // 🌟 KHÓA GIỜ THEO THỜI GIAN THỰC (REAL-TIME LOCK)
  const isTimeSlotDisabled = (timeStr) => {
    const hourNum = parseInt(timeStr.slice(0, 2), 10);
    const isToday = isSameDay(checkInDate, today);

    // Nếu chọn ngày hôm nay: Khóa bất kỳ giờ nào nhỏ hơn hoặc bằng giờ hiện tại
    if (isToday) {
      if (hourNum <= currentRealHour) return true;
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

  return (
    <div className="bg-[#f5f7fa] min-h-screen pb-16 font-sans text-gray-800">
      <div className="max-w-7xl mx-auto px-4 pt-4">
        <Breadcrumb items={breadcrumbs} />

        {/* THANH TÌM KIẾM NGANG */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-md mt-3 mb-6 relative">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center">
            {/* Ô 1: Điểm đến */}
            <div ref={destRef} className="md:col-span-3 relative">
              <div
                onClick={() => setIsDestDropdownOpen(true)}
                className="flex items-center bg-slate-50 rounded-xl px-3.5 h-12 border border-gray-200 focus-within:border-blue-600 focus-within:bg-white transition-colors cursor-pointer"
              >
                <Search size={18} className="text-gray-400 shrink-0 mr-2.5" />
                <input
                  type="text"
                  placeholder="Bạn muốn đi đâu? (Tên KS, TP...)"
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

            {/* Ô 2: Ô Lịch mở Popup */}
            <div ref={calendarRef} className="relative md:col-span-7">
              <div
                onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                className="bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-gray-200 px-3 py-2 h-12 cursor-pointer flex items-center justify-between hover:border-[#006ce4] transition select-none gap-2 flex-wrap sm:flex-nowrap"
              >
                {/* KHỐI 1: NHẬN PHÒNG */}
                <div className="flex items-center gap-2 shrink-0">
                  <CalendarIcon size={16} className="text-[#003580] shrink-0" />
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
                  <CalendarIcon size={16} className="text-[#003580] shrink-0" />
                  <div>
                    <span className="text-[10px] font-black text-slate-500 block leading-tight">
                      {rentalType === "DAY"
                        ? "Trả phòng"
                        : `Trả (${durationSummary.outTimeStr})`}
                    </span>
                    <span className="text-xs font-black text-gray-900 leading-none">
                      {safeFormatDate(
                        rentalType === "HOUR"
                          ? durationSummary.outDateTime
                          : checkOutDate,
                        "dd/MM/yyyy",
                      )}
                    </span>
                  </div>
                </div>

                {/* KHỐI 4: KHÁCH & PHÒNG */}
                <div className="flex items-center gap-2 shrink-0 border-l border-gray-200 pl-2">
                  <Users size={16} className="text-[#003580] shrink-0" />
                  <div>
                    <span className="text-[10px] font-black text-gray-500 block leading-tight">
                      Khách & Phòng
                    </span>
                    <span className="text-xs font-black text-gray-900 leading-none truncate">
                      {adults} Lớn{children > 0 ? `, ${children} Trẻ` : ""} ·{" "}
                      {rooms} P
                    </span>
                  </div>
                </div>
              </div>

              {/* 🌟 POPUP CHỌN GIỜ & PHÒNG 2 CỘT CHUẨN THỜI GIAN THỰC 🌟 */}
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
                    <Lightbulb size={15} className="text-[#006ce4] shrink-0" />
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
                    {/* CỘT TRÁI: LỊCH THÁNG TRỰC QUAN */}
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
                          const isSelectedIn = isSameDay(dayItem, checkInDate);
                          const isSelectedOut =
                            rentalType === "DAY" &&
                            isSameDay(dayItem, checkOutDate);
                          const isInRange =
                            rentalType === "DAY" &&
                            !isPast &&
                            isBefore(checkInDate, dayItem) &&
                            isBefore(dayItem, checkOutDate);

                          return (
                            <button
                              key={dayItem.toISOString()}
                              type="button"
                              disabled={isPast}
                              onClick={() => {
                                if (rentalType === "DAY") {
                                  if (
                                    isSameDay(dayItem, checkInDate) ||
                                    isBefore(dayItem, checkInDate)
                                  ) {
                                    setCheckInDate(dayItem);
                                    setCheckOutDate(addDays(dayItem, 1));
                                  } else {
                                    setCheckOutDate(dayItem);
                                  }
                                } else {
                                  setCheckInDate(dayItem);
                                  if (
                                    rentalType === "HOUR" ||
                                    rentalType === "HALF_DAY"
                                  ) {
                                    setCheckOutDate(dayItem);
                                  } else {
                                    setCheckOutDate(addDays(dayItem, 1));
                                  }
                                }
                              }}
                              className={`h-7 w-full flex items-center justify-center rounded-xl font-bold text-[11px] transition cursor-pointer ${
                                isPast
                                  ? "text-slate-300 cursor-not-allowed"
                                  : isSelectedIn || isSelectedOut
                                    ? "bg-[#003580] text-white shadow-xs font-black"
                                    : isInRange
                                      ? "bg-blue-100 text-blue-900 font-bold"
                                      : "hover:bg-blue-50 text-slate-800"
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
                      {/* 🌟 1. NẾU LÀ THEO NGÀY: KHÔNG CÓ CHỌN GIỜ 🌟 */}
                      {rentalType === "DAY" ? (
                        <div className="space-y-3 pt-1">
                          <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-2xl text-xs space-y-1">
                            <div className="flex justify-between font-bold text-slate-700">
                              <span>Nhận phòng:</span>
                              <strong className="text-blue-900">
                                14:00,{" "}
                                {safeFormatDate(checkInDate, "dd/MM/yyyy")}
                              </strong>
                            </div>
                            <div className="flex justify-between font-bold text-slate-700">
                              <span>Trả phòng:</span>
                              <strong className="text-blue-900">
                                12:00,{" "}
                                {safeFormatDate(checkOutDate, "dd/MM/yyyy")}
                              </strong>
                            </div>
                            <div className="pt-1.5 border-t border-blue-200 flex justify-between font-black text-[#003580] text-sm">
                              <span>Thời gian lưu trú:</span>
                              <span>{durationSummary.badge}</span>
                            </div>
                          </div>
                        </div>
                      ) : rentalType === "OVERNIGHT" ? (
                        /* 🌟 2. NẾU LÀ QUA ĐÊM: CHIA 2 CA SÁNG / TỐI 🌟 */
                        <div className="space-y-3">
                          <div>
                            <label className="text-xs font-black text-slate-800 flex items-center gap-1.5 mb-1.5">
                              <Moon size={13} className="text-indigo-600" />
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
                              <span>Ca Sáng sớm (Trả 11h sáng cùng ngày)</span>
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
                        /* 🌟 3. NẾU LÀ THEO GIỜ: MỞ 1 - 10 GIỜ 🌟 */
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

            {/* Ô 3: Nút tìm kiếm */}
            <button
              type="button"
              onClick={handleSearchSubmit}
              className="md:col-span-2 h-12 bg-[#003580] hover:bg-blue-900 text-white font-black text-sm rounded-xl shadow-md transition active:scale-[0.98] flex items-center justify-center cursor-pointer"
            >
              Tìm kiếm
            </button>
          </div>
        </div>

        {/* NỘI DUNG CHÍNH */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* SIDEBAR BỘ LỌC */}
          <aside className="lg:col-span-4 xl:col-span-3 bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-4 sticky top-20">
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

            {/* BỘ LỌC CHỖ NGHỈ GIÁP BIỂN */}
            <div className="pt-2 border-t border-gray-100">
              <label className="flex items-center justify-between text-xs text-gray-800 cursor-pointer group p-2.5 rounded-xl hover:bg-cyan-50/60 border border-cyan-100 transition">
                <div className="flex items-center gap-2 font-bold text-cyan-950">
                  <input
                    type="checkbox"
                    checked={onlyBeachfront}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setOnlyBeachfront(checked);
                      updateUrlParams({ beachfront: checked ? "true" : "" });
                    }}
                    className="w-4 h-4 rounded border-gray-300 text-[#006ce4] focus:ring-[#006ce4] cursor-pointer"
                  />
                  <span className="flex items-center gap-1">
                    <Waves size={15} className="text-cyan-600 stroke-[2.5]" />
                    Chỗ nghỉ giáp biển
                  </span>
                </div>
                <span className="text-[10px] bg-cyan-100 text-cyan-800 font-black px-1.5 py-0.5 rounded">
                  {filterCounts.beachfront}
                </span>
              </label>
            </div>

            {/* BỘ LỌC KHOẢNG CÁCH GẦN TRUNG TÂM */}
            <div>
              <label className="flex items-center justify-between text-xs text-gray-800 cursor-pointer group p-2.5 rounded-xl hover:bg-amber-50/60 border border-amber-200 transition">
                <div className="flex items-center gap-2 font-bold text-amber-950">
                  <input
                    type="checkbox"
                    checked={onlyNearCenter}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setOnlyNearCenter(checked);
                      updateUrlParams({ nearCenter: checked ? "true" : "" });
                    }}
                    className="w-4 h-4 rounded border-gray-300 text-[#006ce4] focus:ring-[#006ce4] cursor-pointer"
                  />
                  <span className="flex items-center gap-1">
                    <Navigation
                      size={15}
                      className="text-amber-600 stroke-[2.5]"
                    />
                    Gần trung tâm (&le; 2.5 km)
                  </span>
                </div>
                <span className="text-[10px] bg-amber-100 text-amber-800 font-black px-1.5 py-0.5 rounded">
                  {filterCounts.nearCenter}
                </span>
              </label>
            </div>

            {/* Ngân sách */}
            <div className="space-y-3 pt-2 border-t border-gray-100">
              <h3 className="text-sm font-extrabold text-gray-900">
                Ngân sách của bạn (
                {rentalType === "HOUR" ? "mỗi giờ" : "mỗi đêm"})
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
                <LoadingSpinner
                  size="lg"
                  label="Đang đồng bộ dữ liệu phòng..."
                />
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
                    displayPrice = hotel.min_hourly_price;
                    priceLabel = "Giá 1 giờ đầu từ";
                    badgeRental = "🕒 Thuê theo giờ";
                  } else if (rentalType === "OVERNIGHT") {
                    displayPrice = hotel.min_overnight_price;
                    priceLabel = "Giá qua đêm từ";
                    badgeRental = "🌙 Thuê qua đêm";
                  } else if (rentalType === "HALF_DAY") {
                    displayPrice = hotel.min_half_day_price;
                    priceLabel = "Giá 1 buổi từ";
                    badgeRental = "⏳ Thuê theo buổi";
                  }

                  const roomCount = Array.isArray(hotel.rooms)
                    ? hotel.rooms.length
                    : 0;

                  return (
                    <div
                      key={id}
                      onClick={() =>
                        navigate(
                          `/hotel/${id}?checkIn=${format(checkInDate, "yyyy-MM-dd")}&checkOut=${format(rentalType === "HOUR" ? durationSummary.outDateTime : checkOutDate, "yyyy-MM-dd")}&rentalType=${rentalType}&checkInTime=${checkInTime}&checkOutTime=${rentalType === "HOUR" ? durationSummary.outTimeStr : checkOutTime}&hours=${hoursCount}&adults=${adults}&children=${children}&rooms=${rooms}`,
                        )
                      }
                      className="bg-white rounded-2xl border border-gray-200 p-4 hover:border-[#006ce4] hover:shadow-xl transition duration-300 cursor-pointer group flex flex-col md:flex-row gap-5"
                    >
                      <div className="relative w-full md:w-64 h-56 shrink-0 rounded-xl overflow-hidden bg-gray-100">
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
                        <div className="space-y-2">
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

                          <div className="flex items-center gap-1.5 text-xs text-gray-500 flex-wrap">
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
                                <span className="text-amber-800 font-semibold flex items-center gap-1 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                  <Navigation
                                    size={11}
                                    className="text-amber-600 shrink-0"
                                  />{" "}
                                  Cách trung tâm {hotel.distance_to_center} km
                                </span>
                              </>
                            )}
                          </div>

                          <div
                            className="flex items-center gap-1.5 flex-wrap pt-1 text-[11px]"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => handleTabChange("HOUR")}
                              className={`px-2.5 py-1 rounded-lg border font-bold flex items-center gap-1 transition cursor-pointer ${
                                rentalType === "HOUR"
                                  ? "bg-blue-50 border-[#006ce4] text-[#006ce4] shadow-2xs scale-105"
                                  : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                              }`}
                            >
                              <span>🕒 Giờ:</span>
                              <b className="text-gray-900">
                                {formatVND(hotel.min_hourly_price)}
                              </b>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleTabChange("HALF_DAY")}
                              className={`px-2.5 py-1 rounded-lg border font-bold flex items-center gap-1 transition cursor-pointer ${
                                rentalType === "HALF_DAY"
                                  ? "bg-blue-50 border-[#006ce4] text-[#006ce4] shadow-2xs scale-105"
                                  : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                              }`}
                            >
                              <span>⏳ Buổi:</span>
                              <b className="text-gray-900">
                                {formatVND(hotel.min_half_day_price)}
                              </b>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleTabChange("OVERNIGHT")}
                              className={`px-2.5 py-1 rounded-lg border font-bold flex items-center gap-1 transition cursor-pointer ${
                                rentalType === "OVERNIGHT"
                                  ? "bg-blue-50 border-[#006ce4] text-[#006ce4] shadow-2xs scale-105"
                                  : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                              }`}
                            >
                              <span>🌙 Đêm:</span>
                              <b className="text-gray-900">
                                {formatVND(hotel.min_overnight_price)}
                              </b>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleTabChange("DAY")}
                              className={`px-2.5 py-1 rounded-lg border font-bold flex items-center gap-1 transition cursor-pointer ${
                                rentalType === "DAY"
                                  ? "bg-blue-50 border-[#006ce4] text-[#006ce4] shadow-2xs scale-105"
                                  : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                              }`}
                            >
                              <span>☀️ Ngày:</span>
                              <b className="text-gray-900">
                                {formatVND(hotel.salePrice)}
                              </b>
                            </button>
                          </div>

                          <div className="flex items-center gap-2 pt-0.5 flex-wrap">
                            {badgeRental && (
                              <span className="inline-flex items-center gap-1 bg-blue-50 border border-blue-200 text-[#006ce4] text-[10.5px] font-bold px-2 py-0.5 rounded-md shadow-2xs">
                                {badgeRental}
                              </span>
                            )}
                            {hotel.is_beachfront && (
                              <span className="inline-flex items-center gap-1 bg-cyan-50 border border-cyan-200 text-cyan-800 text-[10.5px] font-bold px-2 py-0.5 rounded-md shadow-2xs">
                                <Waves
                                  size={12}
                                  className="text-cyan-600 shrink-0 stroke-[2.5]"
                                />
                                Giáp biển
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed pt-0.5">
                            {hotel.description ||
                              "Chỗ nghỉ sở hữu không gian thoáng đãng, tiện nghi hiện đại và dịch vụ tận tâm."}
                          </p>
                        </div>

                        <div className="flex items-end justify-between pt-3 border-t border-gray-100 mt-2">
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
                            {roomCount > 0 && (
                              <p className="text-[10.5px] font-bold text-[#006ce4] mt-0.5 flex items-center justify-end gap-1">
                                <Building size={12} /> Có {roomCount} loại phòng
                              </p>
                            )}
                            <button
                              type="button"
                              onClick={() =>
                                navigate(
                                  `/hotel/${id}?checkIn=${format(checkInDate, "yyyy-MM-dd")}&checkOut=${format(rentalType === "HOUR" ? durationSummary.outDateTime : checkOutDate, "yyyy-MM-dd")}&rentalType=${rentalType}&checkInTime=${checkInTime}&checkOutTime=${rentalType === "HOUR" ? durationSummary.outTimeStr : checkOutTime}&hours=${hoursCount}&adults=${adults}&children=${children}&rooms=${rooms}`,
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
