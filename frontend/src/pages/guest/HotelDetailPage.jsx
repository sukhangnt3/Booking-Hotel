// src/pages/guest/HotelDetailPage.jsx
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import {
  MapPin,
  Heart,
  Share2,
  Calendar as CalendarIcon,
  Moon,
  Users,
  Check,
  Clock,
  Sparkles,
  Star,
  Image as ImageIcon,
  Info,
  Building2,
  Palmtree,
  ClipboardList,
  AlertCircle,
  Eye,
  Sun,
  Hourglass,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Plus,
  Minus,
  Search,
  ShieldCheck,
  FileText,
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
import { Breadcrumb, LoadingSpinner } from "@/components/common";
import { ReviewList, ReviewForm } from "@/components/review";
import NewestHotelsSlider from "@/components/hotel/NewestHotelsSlider";
import apiClient from "@/services/apiClient";
import { hotelService } from "@/services";
import { useAuthStore } from "@/stores/authStore";

const BACKEND_BASE_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/api\/?$/, "");

const AMENITY_MAP = {
  wifi: "Wi-Fi miễn phí toàn khuôn viên",
  parking: "Bãi đỗ xe ô tô tại chỗ nghỉ",
  "24h_front_desk": "Lễ tân phục vụ 24/7",
  pool_outdoor: "Hồ bơi ngoài trời / Vô cực",
  pool_indoor: "Hồ bơi trong nhà / Nước ấm",
  restaurant: "Nhà hàng & Khu ẩm thực",
  bar: "Quầy Bar / Lounge",
  private_beach: "Bãi biển riêng",
  spa: "Dịch vụ Spa & Massage",
  gym: "Phòng tập thể dục / Gym",
  elevator: "Thang máy di chuyển",
  room_service: "Dịch vụ phòng",
  air_conditioner: "Điều hòa máy lạnh",
  tv_smart: "Smart TV màn hình phẳng",
  hot_water: "Bình nóng lạnh",
  hair_dryer: "Máy sấy tóc",
  refrigerator: "Tủ lạnh / Minibar",
  balcony: "Ban công / Sân hiên",
  bathtub: "Bồn tắm nằm",
  kettle: "Ấm đun nước siêu tốc",
  toiletries: "Đồ vệ sinh cá nhân miễn phí",
};

const ROOM_VIEW_MAP = {
  sea_view: "Hướng biển (Ocean View)",
  city_view: "Hướng thành phố (City View)",
  pool_view: "Hướng hồ bơi (Pool View)",
  garden_view: "Hướng vườn (Garden View)",
  mountain_view: "Hướng núi / Đồi",
  internal_view: "Hướng nội khu",
};

export const parseAmenities = (amenities) => {
  if (!amenities) return [];
  if (Array.isArray(amenities)) {
    return amenities.filter(
      (item) =>
        item && !["null", "undefined", "{}", "[]"].includes(String(item)),
    );
  }
  if (typeof amenities === "string") {
    const clean = amenities.trim();
    if (!clean || ["{}", "[]", "null"].includes(clean)) return [];
    try {
      const parsed = JSON.parse(clean);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch {}
    return clean
      .replace(/^\{|\}$/g, "")
      .replace(/["']/g, "")
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s && s !== "null" && s !== "undefined");
  }
  return [];
};

const formatAmenityName = (item) => {
  if (!item) return "";
  if (typeof item === "object")
    return item.label || item.name || item.title || "";
  return AMENITY_MAP[item] || String(item).replace(/_/g, " ");
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

const parseRealImageUrl = (item) => {
  if (!item) return "";
  let raw = String(
    typeof item === "string"
      ? item
      : item.url || item.path || item.image_url || item.thumbnail || "",
  ).trim();
  if (!raw || raw.startsWith("blob:")) return "";
  if (
    raw.startsWith("http://") ||
    raw.startsWith("https://") ||
    raw.startsWith("data:image/")
  )
    return raw;
  return `${BACKEND_BASE_URL}${raw.startsWith("/") ? raw : `/${raw}`}`;
};

export default function HotelDetailPage() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const today = useMemo(() => startOfToday(), []);
  const currentRealHour = useMemo(() => new Date().getHours(), []);

  // 1. STATE BỘ LỌC TÌM KIẾM
  const [rentalType, setRentalType] = useState(
    searchParams.get("rentalType") || "DAY",
  );
  const [checkInTime, setCheckInTime] = useState(
    searchParams.get("checkInTime") || "14:00",
  );
  const [checkOutTime, setCheckOutTime] = useState(
    searchParams.get("checkOutTime") || "12:00",
  );
  const [hoursCount, setHoursCount] = useState(
    Number(searchParams.get("hours")) || 2,
  );

  const [appliedCheckIn, setAppliedCheckIn] = useState(() =>
    searchParams.get("checkIn") ? new Date(searchParams.get("checkIn")) : today,
  );
  const [appliedCheckOut, setAppliedCheckOut] = useState(() =>
    searchParams.get("checkOut")
      ? new Date(searchParams.get("checkOut"))
      : addDays(today, 1),
  );

  const [checkInDate, setCheckInDate] = useState(appliedCheckIn);
  const [checkOutDate, setCheckOutDate] = useState(appliedCheckOut);

  // GUESTS & ROOMS
  const [rooms, setRooms] = useState(Number(searchParams.get("rooms")) || 1);
  const [adults, setAdults] = useState(Number(searchParams.get("adults")) || 1);
  const [children, setChildren] = useState(
    Number(searchParams.get("children")) || 0,
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(today);

  const [hoveredPriceRoomId, setHoveredPriceRoomId] = useState(null);

  const calendarRef = useRef(null);
  const roomsRef = useRef(null);

  // 2. DỮ LIỆU CƠ SỞ & PHÒNG
  const [hotel, setHotel] = useState(null);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [checkingRooms, setCheckingRooms] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);

  const formatNumberWithDots = (num) =>
    Number(num || 0).toLocaleString("vi-VN");

  const appliedNights = Math.max(
    1,
    differenceInDays(appliedCheckOut, appliedCheckIn),
  );

  // Đọc quy định khung giờ của khách sạn từ Database
  const hotelPolicies = useMemo(() => {
    const formatTime = (timeStr, defaultTime = "") => {
      if (!timeStr) return defaultTime;
      const s = String(timeStr).trim();
      return s.length >= 5 ? s.slice(0, 5) : s;
    };

    return {
      dailyIn: formatTime(hotel?.checkin_time, "14:00"),
      dailyOut: formatTime(hotel?.checkout_time, "12:00"),
      overnightIn: formatTime(
        hotel?.overnight_checkin_time || hotel?.overnight_checkin,
        "22:00",
      ),
      overnightOut: formatTime(
        hotel?.overnight_checkout_time || hotel?.overnight_checkout,
        "11:00",
      ),
      halfdayIn: formatTime(
        hotel?.halfday_checkin_time || hotel?.half_day_checkin_time,
        "12:00",
      ),
      halfdayOut: formatTime(
        hotel?.halfday_checkout_time || hotel?.half_day_checkout_time,
        "21:00",
      ),
      hourlyStart: formatTime(
        hotel?.hourly_start_time || hotel?.hourly_checkin_time,
        "08:00",
      ),
      hourlyEnd: formatTime(
        hotel?.hourly_end_time || hotel?.hourly_checkout_time,
        "22:00",
      ),
      hourlyGraceMinutes: Number(hotel?.hourly_grace_minutes || 15),
      cancellationHours: Number(hotel?.cancellation_deadline_hours || 24),
    };
  }, [hotel]);

  // 🌟 TÍNH TOÁN DỰ KIẾN TRẢ PHÒNG CHUẨN THỜI GIAN THỰC
  const checkOutInfo = useMemo(() => {
    const [hStr, mStr] = checkInTime.split(":");
    const inHour = parseInt(hStr || "14", 10);
    const inMinute = parseInt(mStr || "00", 10);

    const inDateTime = new Date(checkInDate);
    inDateTime.setHours(inHour, inMinute, 0, 0);

    let outDateTime = new Date(checkOutDate);
    let outTimeStr = checkOutTime;

    // 1. THEO GIỜ
    if (rentalType === "HOUR") {
      outDateTime = addHours(inDateTime, hoursCount);
      outTimeStr = `${String(outDateTime.getHours()).padStart(2, "0")}:${String(outDateTime.getMinutes()).padStart(2, "0")}`;
      return {
        badge: `${hoursCount} Giờ`,
        displayRange: `${checkInTime}, ${format(inDateTime, "dd/MM")} - ${outTimeStr}, ${format(outDateTime, "dd/MM")}`,
        inDateTime,
        outDateTime,
        outTimeStr,
        finalOutDateStr: safeFormatDate(outDateTime, "yyyy-MM-dd"),
      };
    }

    // 2. QUA ĐÊM (CHIA 2 CA SÁNG / TỐI)
    if (rentalType === "OVERNIGHT") {
      const [oH, oM] = hotelPolicies.overnightOut.split(":").map(Number);
      if (inHour >= 0 && inHour <= 6) {
        outDateTime = new Date(checkInDate);
      } else {
        outDateTime = addDays(new Date(checkInDate), 1);
      }
      outDateTime.setHours(oH || 11, oM || 0, 0, 0);
      outTimeStr = hotelPolicies.overnightOut;
      return {
        badge: "1 Đêm",
        displayRange: `${checkInTime}, ${format(inDateTime, "dd/MM")} - ${outTimeStr}, ${format(outDateTime, "dd/MM")}`,
        inDateTime,
        outDateTime,
        outTimeStr,
        finalOutDateStr: safeFormatDate(outDateTime, "yyyy-MM-dd"),
      };
    }

    // 3. THEO BUỔI
    if (rentalType === "HALF_DAY") {
      outDateTime = new Date(checkInDate);
      const [hOutH, hOutM] = hotelPolicies.halfdayOut.split(":").map(Number);
      outDateTime.setHours(hOutH || 21, hOutM || 0, 0, 0);
      outTimeStr = hotelPolicies.halfdayOut;
      return {
        badge: "1 Buổi",
        displayRange: `${checkInTime}, ${format(inDateTime, "dd/MM")} - ${outTimeStr}, ${format(outDateTime, "dd/MM")}`,
        inDateTime,
        outDateTime,
        outTimeStr,
        finalOutDateStr: safeFormatDate(outDateTime, "yyyy-MM-dd"),
      };
    }

    // 4. THEO NGÀY (CỐ ĐỊNH TRẢ TRƯA 12:00)
    const [outH, outM] = hotelPolicies.dailyOut.split(":").map(Number);
    outDateTime = new Date(checkOutDate);
    outDateTime.setHours(outH || 12, outM || 0, 0, 0);
    const diffDays = Math.max(1, differenceInDays(checkOutDate, checkInDate));

    return {
      badge: `${diffDays} Đêm`,
      displayRange: `${hotelPolicies.dailyIn}, ${format(checkInDate, "dd/MM")} - ${hotelPolicies.dailyOut}, ${format(checkOutDate, "dd/MM")}`,
      inDateTime,
      outDateTime,
      outTimeStr: hotelPolicies.dailyOut,
      diffDays,
      finalOutDateStr: safeFormatDate(outDateTime, "yyyy-MM-dd"),
    };
  }, [
    rentalType,
    checkInTime,
    checkOutTime,
    checkInDate,
    checkOutDate,
    hoursCount,
    hotelPolicies,
  ]);

  // 🌟 CHUYỂN TAB CHUẨN THỜI GIAN THỰC
  const handleTabChange = useCallback(
    (type) => {
      setRentalType(type);
      if (type === "HOUR") {
        const nextH = Math.min(23, currentRealHour + 1);
        setCheckInTime(`${String(nextH).padStart(2, "0")}:00`);
        setHoursCount(2);
        setCheckOutDate(checkInDate);
      } else if (type === "DAY") {
        // Cố định 14:00 - 12:00, không chọn giờ
        setCheckInTime(hotelPolicies.dailyIn || "14:00");
        setCheckOutTime(hotelPolicies.dailyOut || "12:00");
        if (
          isSameDay(checkInDate, checkOutDate) ||
          isBefore(checkOutDate, checkInDate)
        ) {
          setCheckOutDate(addDays(checkInDate, 1));
        }
      } else if (type === "OVERNIGHT") {
        setCheckInTime(hotelPolicies.overnightIn || "22:00");
        setCheckOutTime(hotelPolicies.overnightOut || "11:00");
        setCheckOutDate(addDays(checkInDate, 1));
      } else if (type === "HALF_DAY") {
        setCheckInTime(hotelPolicies.halfdayIn || "12:00");
        setCheckOutTime(hotelPolicies.halfdayOut || "21:00");
        setCheckOutDate(checkInDate);
      }
    },
    [checkInDate, checkOutDate, currentRealHour, hotelPolicies],
  );

  const fetchRoomAvailability = useCallback(
    async (cIn, cOut, adCount) => {
      if (!id) return;
      setCheckingRooms(true);
      try {
        const finalInDateStr = safeFormatDate(cIn, "yyyy-MM-dd");
        const finalOutDateStr = checkOutInfo.finalOutDateStr;

        const res = await apiClient.get(`/hotels/${id}/availability`, {
          params: {
            checkIn: finalInDateStr,
            checkOut: finalOutDateStr,
            adults: adCount,
            checkInTime: checkInTime,
            checkOutTime:
              rentalType === "HOUR" ? checkOutInfo.outTimeStr : checkOutTime,
            rentalType: rentalType,
          },
        });
        const raw = res?.data;
        const list = Array.isArray(raw)
          ? raw
          : raw?.rooms || raw?.data || res?.rooms || [];
        if (list.length) setAvailableRooms(list);
      } catch (err) {
        console.warn("Lỗi kiểm tra phòng:", err.message);
      } finally {
        setCheckingRooms(false);
      }
    },
    [id, checkInTime, checkOutTime, rentalType, checkOutInfo],
  );

  const fetchAllData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [hotelRes, revRes] = await Promise.all([
        apiClient.get(`/hotels/${id}`),
        apiClient.get(`/hotels/${id}/reviews`).catch(() => ({ data: [] })),
      ]);

      const hotelData =
        hotelRes?.data?.hotel ||
        hotelRes?.data?.data ||
        hotelRes?.data ||
        hotelRes;
      if (hotelData) {
        setHotel(hotelData);
        setSearchQuery(hotelData.name || "");

        let isFav = Boolean(hotelData.is_favorite);
        if (isAuthenticated) {
          try {
            const favRes = await (hotelService?.getFavorites
              ? hotelService.getFavorites()
              : apiClient.get("/favorites"));
            const favList = Array.isArray(favRes)
              ? favRes
              : favRes?.data || favRes?.favorites || [];
            if (
              favList.some(
                (item) => String(item.id || item.hotel_id) === String(id),
              )
            ) {
              isFav = true;
            }
          } catch {}
        }
        setIsFavorite(isFav);

        if (Array.isArray(hotelData.rooms) && hotelData.rooms.length) {
          setAvailableRooms(hotelData.rooms);
        }

        const rList =
          revRes?.data?.reviews || revRes?.data?.data || revRes?.data || [];
        setReviews(Array.isArray(rList) ? rList : hotelData.reviews || []);
      }
    } catch (err) {
      console.error("Lỗi tải thông tin:", err);
    } finally {
      setLoading(false);
    }
  }, [id, isAuthenticated]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  useEffect(() => {
    fetchRoomAvailability(appliedCheckIn, appliedCheckOut, adults);
  }, [fetchRoomAvailability, appliedCheckIn, appliedCheckOut, adults]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target)) {
        setIsCalendarOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleApplySearch = () => {
    let finalIn = checkInDate || today;
    let finalOut =
      rentalType === "HOUR" ? checkOutInfo.outDateTime : checkOutDate;
    if (rentalType === "DAY") {
      if (
        !finalOut ||
        isBefore(finalOut, finalIn) ||
        isSameDay(finalOut, finalIn)
      ) {
        finalOut = addDays(finalIn, 1);
        setCheckOutDate(finalOut);
      }
    }

    setAppliedCheckIn(finalIn);
    setAppliedCheckOut(finalOut);
    setIsCalendarOpen(false);

    setSearchParams({
      checkIn: safeFormatDate(finalIn, "yyyy-MM-dd"),
      checkOut: checkOutInfo.finalOutDateStr,
      rentalType,
      checkInTime,
      checkOutTime:
        rentalType === "HOUR" ? checkOutInfo.outTimeStr : checkOutTime,
      hours: hoursCount.toString(),
      rooms: rooms.toString(),
      adults: adults.toString(),
      children: children.toString(),
    });

    fetchRoomAvailability(finalIn, finalOut, adults);
    roomsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Tính giá phòng chi tiết (hỗ trợ tới 10 giờ)
  const calculateRoomPricing = useCallback(
    (room) => {
      const baseDailyPrice = Number(
        room.base_price || room.sell_price || 650000,
      );
      const firstHourPrice =
        Number(room.hourly_price) > 0
          ? Number(room.hourly_price)
          : Math.round(baseDailyPrice * 0.25);

      if (rentalType === "HOUR") {
        const hourlyBreakdown = [];
        let total = 0;

        for (let i = 0; i < hoursCount; i++) {
          const curHDate = addHours(checkOutInfo.inDateTime, i);
          const hourLabel = `${format(curHDate, "HH:mm, dd/MM")}`;
          let curHPrice = firstHourPrice;

          if (
            Array.isArray(room.hourly_tiers) &&
            room.hourly_tiers.length > 0
          ) {
            const matchedTier = [...room.hourly_tiers]
              .sort((a, b) => b.from_hour - a.from_hour)
              .find((t) => i + 1 >= Number(t.from_hour));
            if (matchedTier) curHPrice = Number(matchedTier.price);
          }

          hourlyBreakdown.push({ label: hourLabel, price: curHPrice });
          total += curHPrice;
        }

        return {
          totalPrice: total * rooms,
          unitPrice: total,
          hourlyBreakdown,
          label: `${hoursCount} Giờ`,
        };
      }

      if (rentalType === "HALF_DAY") {
        const baseHalfPrice = Number(
          room.half_day_price || Math.round(baseDailyPrice * 0.8),
        );
        return {
          totalPrice: baseHalfPrice * rooms,
          unitPrice: baseHalfPrice,
          hourlyBreakdown: [
            { label: "1 Buổi (Nửa ngày)", price: baseHalfPrice },
          ],
          label: "1 Buổi",
        };
      }

      if (rentalType === "OVERNIGHT") {
        const overnightPrice = Number(room.overnight_price || baseDailyPrice);
        return {
          totalPrice: overnightPrice * rooms,
          unitPrice: overnightPrice,
          hourlyBreakdown: [{ label: "Qua đêm", price: overnightPrice }],
          label: "Qua đêm",
        };
      }

      const totalDays = Math.max(
        1,
        differenceInDays(checkOutInfo.outDateTime, checkOutInfo.inDateTime),
      );
      const totalDaysPrice = baseDailyPrice * totalDays;

      return {
        totalPrice: totalDaysPrice * rooms,
        unitPrice: totalDaysPrice,
        hourlyBreakdown: [
          { label: `${totalDays} ngày đêm`, price: totalDaysPrice },
        ],
        label: `${totalDays} Đêm`,
      };
    },
    [rentalType, hoursCount, checkOutInfo, rooms],
  );

  const hotelGalleryImages = useMemo(() => {
    if (!hotel) return [];
    const list = [];
    const seenPaths = new Set();

    const addUnique = (item) => {
      const u = parseRealImageUrl(item);
      if (!u) return;
      const cleanKey = u.split("?")[0].trim().toLowerCase();
      if (!seenPaths.has(cleanKey)) {
        seenPaths.add(cleanKey);
        list.push(u);
      }
    };

    if (hotel.image) addUnique(hotel.image);
    if (hotel.hotelMainImage) addUnique(hotel.hotelMainImage);

    const sourceImages = Array.isArray(hotel.hotelImages)
      ? hotel.hotelImages
      : Array.isArray(hotel.images)
        ? hotel.images
        : [];

    sourceImages.forEach((img) => {
      if (img && typeof img === "object" && (img.roomId || img.room_id)) return;
      addUnique(img);
    });

    return list;
  }, [hotel]);

  const getRoomImage = useCallback((room) => {
    if (!room) return "";
    const u = parseRealImageUrl(room.image || room.thumbnail);
    if (u) return u;
    if (Array.isArray(room.images) && room.images.length) {
      const first = parseRealImageUrl(room.images[0]);
      if (first) return first;
    }
    return "";
  }, []);

  const totalReviewsCount =
    reviews.length > 0 ? reviews.length : Number(hotel?.review_count || 0);
  const averageScore = useMemo(() => {
    if (reviews.length > 0) {
      const sum = reviews.reduce(
        (acc, r) => acc + Number(r.point || r.rating || 0),
        0,
      );
      return Math.min(10, Math.max(0, sum / reviews.length));
    }
    return Math.min(10, Math.max(0, Number(hotel?.average_rating || 0)));
  }, [reviews, hotel]);

  const getRatingLabel = (score) => {
    if (totalReviewsCount === 0 || score === 0) return "Chưa có đánh giá";
    if (score >= 9.0) return "Tuyệt vời";
    if (score >= 8.0) return "Rất tốt";
    if (score >= 7.0) return "Hài lòng";
    return "Được đánh giá tốt";
  };

  const handleToggleFavorite = async () => {
    if (!isAuthenticated) {
      alert("Vui lòng đăng nhập để lưu khách sạn yêu thích!");
      return;
    }
    const prev = isFavorite;
    setIsFavorite(!prev);
    try {
      if (prev) {
        if (hotelService?.removeFavorite) {
          await hotelService.removeFavorite(id);
        } else {
          await apiClient.delete(`/favorites/${id}`);
        }
      } else {
        if (hotelService?.addFavorite) {
          await hotelService.addFavorite(id);
        } else {
          await apiClient.post(`/favorites`, { hotelId: id, hotel_id: id });
        }
      }
    } catch (err) {
      console.error("Lỗi cập nhật yêu thích:", err);
      setIsFavorite(prev);
    }
  };

  // Khóa giờ theo quy định riêng của khách sạn & giờ quá khứ hôm nay
  const isTimeSlotDisabled = (timeStr) => {
    const hourNum = parseInt(timeStr.slice(0, 2), 10);

    if (isSameDay(checkInDate, today)) {
      if (hourNum <= currentRealHour) return true;
    }

    if (rentalType === "HOUR") {
      const startH = parseInt(hotelPolicies.hourlyStart.slice(0, 2), 10) || 8;
      const endH = parseInt(hotelPolicies.hourlyEnd.slice(0, 2), 10) || 22;
      return hourNum < startH || hourNum > endH;
    }

    if (rentalType === "OVERNIGHT") {
      const oInH = parseInt(hotelPolicies.overnightIn.slice(0, 2), 10) || 22;
      return hourNum > 6 && hourNum < oInH;
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

  if (loading)
    return (
      <LoadingSpinner
        fullPage
        label="Đang đồng bộ thông tin khách sạn từ Database..."
      />
    );
  if (!hotel) {
    return (
      <div className="py-24 text-center space-y-4 font-sans">
        <h2 className="text-2xl font-bold text-slate-800">
          Không tìm thấy thông tin chỗ nghỉ
        </h2>
        <Button onClick={() => navigate("/hotels")}>Quay lại danh sách</Button>
      </div>
    );
  }

  const breadcrumbs = [
    { label: "Trang chủ", link: "/" },
    { label: "Khách sạn", link: "/hotels" },
    {
      label: hotel.city || "Việt Nam",
      link: `/hotels?destination=${encodeURIComponent(hotel.city || "")}`,
    },
    { label: hotel.name },
  ];

  const displayRooms =
    availableRooms.length > 0 ? availableRooms : hotel.rooms || [];

  return (
    <div className="bg-[#f5f7fa] min-h-screen pb-20 font-sans text-slate-800">
      <div className="max-w-7xl mx-auto px-4 pt-3">
        <Breadcrumb items={breadcrumbs} />

        {/* HEADER KHÁCH SẠN */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-2 mb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                {hotel.name}
              </h1>
              {hotel.star_rating > 0 && (
                <div className="flex text-amber-400">
                  {[...Array(Number(hotel.star_rating || 5))].map((_, i) => (
                    <Star key={i} size={16} fill="currentColor" />
                  ))}
                </div>
              )}
              {hotel.property_type && (
                <span className="text-[10px] font-bold uppercase bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                  {hotel.property_type}
                </span>
              )}
              {hotel.is_beachfront && (
                <span className="text-[11px] font-bold bg-cyan-50 border border-cyan-200 text-cyan-800 px-2.5 py-0.5 rounded-lg flex items-center gap-1 shadow-2xs">
                  <Palmtree size={13} className="text-cyan-600" />
                  Chỗ nghỉ giáp biển
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <MapPin size={14} className="text-[#006ce4] shrink-0" />
              <span>
                {hotel.address ? `${hotel.address}, ` : ""}
                {hotel.city || "Việt Nam"}
              </span>
              <span>-</span>
              <button
                onClick={() =>
                  window.open(
                    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${hotel.name} ${hotel.address || ""}`)}`,
                    "_blank",
                  )
                }
                className="text-[#006ce4] font-semibold hover:underline cursor-pointer"
              >
                Xem vị trí trên bản đồ
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={handleToggleFavorite}
              title={isFavorite ? "Bỏ lưu yêu thích" : "Lưu vào yêu thích"}
              className={`p-2.5 rounded-xl border transition cursor-pointer ${
                isFavorite
                  ? "bg-rose-50 border-rose-200 text-rose-500"
                  : "bg-white border-slate-200 text-slate-400 hover:text-rose-500"
              }`}
            >
              <Heart size={18} fill={isFavorite ? "currentColor" : "none"} />
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                alert("Đã sao chép liên kết khách sạn!");
              }}
              className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-[#006ce4] transition cursor-pointer"
            >
              <Share2 size={18} />
            </button>
            <button
              type="button"
              onClick={() =>
                roomsRef.current?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                })
              }
              className="w-full sm:w-auto px-8 py-3 bg-[#003580] hover:bg-blue-900 text-white font-black text-sm rounded-xl shadow-lg transition active:scale-95 cursor-pointer"
            >
              Chọn phòng ngay
            </button>
          </div>
        </div>

        {/* BENTO GALLERY */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 mb-6">
          <div className="lg:col-span-9 h-[340px] md:h-[400px]">
            {hotelGalleryImages.length >= 3 ? (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 h-full w-full">
                <div className="md:col-span-7 h-full w-full rounded-2xl overflow-hidden bg-slate-200 shadow-sm relative">
                  <img
                    src={hotelGalleryImages[0]}
                    alt={hotel.name}
                    className="absolute inset-0 w-full h-full object-cover select-none"
                  />
                </div>
                <div className="md:col-span-5 grid grid-rows-2 gap-3.5 h-full w-full">
                  <div className="h-full w-full rounded-2xl overflow-hidden bg-slate-200 shadow-sm relative">
                    <img
                      src={hotelGalleryImages[1]}
                      alt="Ảnh cơ sở 2"
                      className="absolute inset-0 w-full h-full object-cover select-none"
                    />
                  </div>
                  <div className="h-full w-full rounded-2xl overflow-hidden bg-slate-200 shadow-sm relative">
                    <img
                      src={hotelGalleryImages[2]}
                      alt="Ảnh cơ sở 3"
                      className="absolute inset-0 w-full h-full object-cover select-none"
                    />
                  </div>
                </div>
              </div>
            ) : hotelGalleryImages.length === 2 ? (
              <div className="grid grid-cols-2 gap-3.5 h-full w-full">
                <div className="h-full w-full rounded-2xl overflow-hidden bg-slate-200 shadow-sm relative">
                  <img
                    src={hotelGalleryImages[0]}
                    alt={hotel.name}
                    className="absolute inset-0 w-full h-full object-cover select-none"
                  />
                </div>
                <div className="h-full w-full rounded-2xl overflow-hidden bg-slate-200 shadow-sm relative">
                  <img
                    src={hotelGalleryImages[1]}
                    alt="Ảnh cơ sở 2"
                    className="absolute inset-0 w-full h-full object-cover select-none"
                  />
                </div>
              </div>
            ) : hotelGalleryImages.length === 1 ? (
              <div className="h-full w-full rounded-2xl overflow-hidden bg-slate-200 shadow-sm relative">
                <img
                  src={hotelGalleryImages[0]}
                  alt={hotel.name}
                  className="absolute inset-0 w-full h-full object-cover select-none"
                />
              </div>
            ) : (
              <div className="h-full w-full rounded-2xl border-2 border-dashed border-slate-300 bg-slate-100 flex flex-col items-center justify-center gap-2 text-slate-400">
                <ImageIcon size={48} strokeWidth={1.5} />
                <span className="text-xs font-bold">
                  Cơ sở chưa đăng tải hình ảnh khuôn viên
                </span>
              </div>
            )}
          </div>

          <div className="lg:col-span-3 flex flex-col gap-3.5 h-[340px] md:h-[400px]">
            <div
              onClick={() =>
                window.open(
                  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${hotel.name} ${hotel.address || ""}`)}`,
                  "_blank",
                )
              }
              className="h-[180px] rounded-2xl overflow-hidden border border-slate-200 shadow-sm cursor-pointer relative bg-[#e5e3df] flex items-center justify-center shrink-0"
            >
              <div className="flex flex-col items-center justify-center gap-1">
                <MapPin
                  size={32}
                  className="text-red-600 fill-red-600 animate-bounce"
                />
                <span className="text-xs font-bold text-slate-800">
                  {hotel.city || "Xem vị trí"}
                </span>
                <span className="text-[10px] text-slate-500 underline">
                  Mở Google Maps
                </span>
              </div>
            </div>

            <div className="flex-1 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between overflow-hidden">
              <div className="space-y-2">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`font-black text-sm px-2.5 py-1 rounded-md shadow-2xs ${totalReviewsCount > 0 ? "bg-[#2e7d32] text-white" : "bg-slate-200 text-slate-700"}`}
                  >
                    {averageScore.toFixed(1)}
                  </div>
                  <div>
                    <span
                      className={`font-black text-sm block leading-tight ${totalReviewsCount > 0 ? "text-[#2e7d32]" : "text-slate-700"}`}
                    >
                      {getRatingLabel(averageScore)}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {totalReviewsCount} đánh giá từ du khách
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-700 line-clamp-3 leading-relaxed pt-1">
                  {reviews[0]?.description
                    ? `"${reviews[0].description}"`
                    : totalReviewsCount > 0
                      ? "Khách lưu trú đánh giá cao chất lượng phòng và dịch vụ của chỗ nghỉ."
                      : "Chỗ nghỉ này hiện chưa có đánh giá nào từ du khách."}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <button
                  onClick={() =>
                    document
                      .getElementById("reviews-section")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                  className="text-xs text-[#006ce4] font-semibold hover:underline cursor-pointer"
                >
                  Xem tất cả đánh giá &rarr;
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* THANH TÌM KIẾM NGANG */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-md mb-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center">
            {/* Ô 1: Nhập tên chỗ nghỉ */}
            <div className="md:col-span-3 relative flex items-center gap-2.5 px-3.5 h-12 bg-slate-50 rounded-xl border border-slate-200">
              <MapPin size={18} className="text-[#003580] shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Nhập tên khách sạn..."
                className="w-full text-xs font-bold text-slate-800 bg-transparent focus:outline-none truncate"
              />
            </div>

            {/* Ô 2: Lịch mở Popup */}
            <div ref={calendarRef} className="relative md:col-span-7">
              <div
                onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                className="bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200 px-3 py-2 h-12 cursor-pointer flex items-center justify-between hover:border-[#003580] transition select-none gap-2"
              >
                {/* KHỐI NHẬN */}
                <div className="flex items-center gap-2 shrink-0">
                  <CalendarIcon size={16} className="text-[#003580] shrink-0" />
                  <div>
                    <span className="text-[10px] font-black text-slate-500 block leading-tight whitespace-nowrap">
                      {rentalType === "DAY"
                        ? "Nhận phòng"
                        : `Nhận (${checkInTime})`}
                    </span>
                    <span className="text-xs font-black text-slate-900 leading-none whitespace-nowrap">
                      {safeFormatDate(checkInDate, "dd/MM/yyyy")}
                    </span>
                  </div>
                </div>

                {/* HUY HIỆU THỜI LƯỢNG */}
                <div className="text-[11px] font-black text-[#003580] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap">
                  {checkOutInfo.badge}
                </div>

                {/* KHỐI TRẢ */}
                <div className="flex items-center gap-2 shrink-0">
                  <CalendarIcon size={16} className="text-[#003580] shrink-0" />
                  <div>
                    <span className="text-[10px] font-black text-slate-500 block leading-tight whitespace-nowrap">
                      {rentalType === "DAY"
                        ? "Trả phòng"
                        : `Trả (${checkOutInfo.outTimeStr})`}
                    </span>
                    <span className="text-xs font-black text-slate-900 leading-none whitespace-nowrap">
                      {safeFormatDate(checkOutInfo.outDateTime, "dd/MM/yyyy")}
                    </span>
                  </div>
                </div>

                {/* KHỐI KHÁCH & PHÒNG */}
                <div className="flex items-center gap-2 shrink-0 border-l border-slate-200 pl-2">
                  <Users size={16} className="text-[#003580] shrink-0" />
                  <div>
                    <span className="text-[10px] font-black text-gray-500 block leading-tight whitespace-nowrap">
                      Khách & Phòng
                    </span>
                    <span className="text-xs font-black text-slate-900 leading-none whitespace-nowrap truncate">
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
                      {/* 1. NẾU LÀ THEO NGÀY: KHÔNG CHỌN GIỜ */}
                      {rentalType === "DAY" ? (
                        <div className="space-y-3 pt-1">
                          <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-2xl text-xs space-y-1">
                            <div className="flex justify-between font-bold text-slate-700">
                              <span>Nhận phòng:</span>
                              <strong className="text-blue-900">
                                {hotelPolicies.dailyIn},{" "}
                                {safeFormatDate(checkInDate, "dd/MM/yyyy")}
                              </strong>
                            </div>
                            <div className="flex justify-between font-bold text-slate-700">
                              <span>Trả phòng:</span>
                              <strong className="text-blue-900">
                                {hotelPolicies.dailyOut},{" "}
                                {safeFormatDate(checkOutDate, "dd/MM/yyyy")}
                              </strong>
                            </div>
                            <div className="pt-1.5 border-t border-blue-200 flex justify-between font-black text-[#003580] text-sm">
                              <span>Thời gian lưu trú:</span>
                              <span>{checkOutInfo.badge}</span>
                            </div>
                          </div>
                        </div>
                      ) : rentalType === "OVERNIGHT" ? (
                        /* 2. NẾU LÀ QUA ĐÊM: CHIA 2 CA SÁNG / TỐI */
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
                            {checkOutInfo.outTimeStr},{" "}
                            {safeFormatDate(
                              checkOutInfo.outDateTime,
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
                            handleApplySearch();
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

            {/* Ô 3: Nút Cập nhật */}
            <div className="md:col-span-2">
              <button
                type="button"
                onClick={handleApplySearch}
                disabled={checkingRooms}
                className="w-full h-12 bg-[#003580] hover:bg-blue-900 text-white font-black text-sm rounded-xl shadow-md transition active:scale-95 flex items-center justify-center cursor-pointer disabled:opacity-50 whitespace-nowrap"
              >
                {checkingRooms ? "Đang kiểm tra..." : "Cập nhật"}
              </button>
            </div>
          </div>
        </div>

        {/* BẢNG GIÁ CÁC HẠNG PHÒNG */}
        <section ref={roomsRef} className="space-y-4 mb-10">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                Bảng giá các hạng phòng ({displayRooms.length} Loại phòng)
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Nhận - Trả phòng:{" "}
                <strong className="text-blue-900">
                  {checkOutInfo.displayRange}
                </strong>{" "}
                (
                <strong className="text-[#006ce4] font-bold">
                  {checkOutInfo.badge}
                </strong>
                ) · {adults} người lớn
                {children > 0 ? ` · ${children} trẻ em` : ""} · {rooms} phòng
              </p>
            </div>
          </div>

          {displayRooms.length > 0 ? (
            <div className="space-y-4">
              {displayRooms.map((room, idx) => {
                const roomImg = getRoomImage(room);
                const stock = Number(
                  room.amount ??
                    room.total_rooms ??
                    room.quantity ??
                    room.room_count ??
                    4,
                );
                const maxRoomCapacity = Number(
                  room.max_adults || room.capacity || 2,
                );
                const isOverCapacity = adults > maxRoomCapacity * rooms;
                const isSoldOut = stock < rooms || room.is_available === false;
                const pricing = calculateRoomPricing(room);
                const isHovered = hoveredPriceRoomId === (room.id || idx);

                const viewLabel =
                  ROOM_VIEW_MAP[room.room_view] ||
                  (room.type && ROOM_VIEW_MAP[room.type]) ||
                  null;
                const roomAmenities = parseAmenities(room.amenities);

                return (
                  <div
                    key={room.id || idx}
                    className={`bg-white rounded-2xl border transition-all overflow-hidden grid grid-cols-1 lg:grid-cols-12 ${
                      isSoldOut || isOverCapacity
                        ? "border-slate-200 opacity-60 bg-slate-50/50"
                        : "border-slate-200 hover:border-[#006ce4] shadow-sm"
                    }`}
                  >
                    <div className="lg:col-span-4 p-5 bg-slate-50/50 border-r border-slate-100 flex flex-col justify-between space-y-4">
                      <div className="space-y-3">
                        <div className="w-full h-44 rounded-xl overflow-hidden bg-slate-200 relative shadow-2xs">
                          {roomImg ? (
                            <img
                              src={roomImg}
                              alt={room.name}
                              className="absolute inset-0 w-full h-full object-cover select-none hover:scale-105 transition duration-300"
                            />
                          ) : (
                            <div className="w-full h-full bg-slate-200 flex flex-col items-center justify-center text-slate-400 gap-1.5">
                              <ImageIcon size={32} />
                              <span className="text-[10px] font-bold">
                                Chưa có ảnh phòng
                              </span>
                            </div>
                          )}
                          {isSoldOut ? (
                            <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] flex items-center justify-center">
                              <span className="bg-rose-600 text-white font-black text-xs px-3 py-1.5 rounded-lg uppercase tracking-wider shadow">
                                {stock > 0
                                  ? `Chỉ còn ${stock} phòng`
                                  : "Hết phòng ngày này"}
                              </span>
                            </div>
                          ) : isOverCapacity ? (
                            <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] flex items-center justify-center">
                              <span className="bg-amber-600 text-white font-black text-xs px-3 py-1.5 rounded-lg uppercase tracking-wider shadow text-center">
                                Quá sức chứa (Tối đa {maxRoomCapacity * rooms}{" "}
                                người)
                              </span>
                            </div>
                          ) : null}
                        </div>

                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-bold text-blue-700 uppercase bg-blue-50 px-2 py-0.5 rounded">
                              {room.type || "Tiêu chuẩn"}
                            </span>
                            {viewLabel && (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded flex items-center gap-1">
                                <Eye size={11} /> {viewLabel}
                              </span>
                            )}
                          </div>

                          <h3 className="font-extrabold text-base text-slate-900 mt-1">
                            {room.name}
                          </h3>

                          <div className="text-xs text-slate-500 space-y-1 mt-1.5 font-medium">
                            <p>
                              🛏️{" "}
                              {room.bed_type || "1 Giường đôi lớn (King/Queen)"}
                            </p>
                            <p>📐 Diện tích: {room.room_area || 28} m²</p>
                            <p>
                              👥 Sức chứa: {maxRoomCapacity} Người lớn/phòng
                            </p>
                          </div>
                        </div>
                      </div>

                      {!isSoldOut && !isOverCapacity && (
                        <div className="text-rose-600 font-bold text-xs flex items-center gap-1">
                          <AlertCircle size={14} /> Còn {stock} phòng trống
                        </div>
                      )}
                    </div>

                    <div className="lg:col-span-8 p-5 flex flex-col justify-between space-y-4">
                      <div className="space-y-3.5">
                        <div className="inline-flex items-center gap-1.5 bg-blue-50 text-[#006ce4] px-2.5 py-1 rounded-md text-[11px] font-black border border-blue-100">
                          <Sparkles size={13} />
                          <span>Giá tốt nhất trên hệ thống GoStay</span>
                        </div>

                        {roomAmenities.length > 0 && (
                          <div className="pt-1">
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                              Tiện nghi hạng phòng:
                            </span>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-2 gap-x-2 text-xs text-slate-700">
                              {roomAmenities.map((amenity, aIdx) => (
                                <div
                                  key={aIdx}
                                  className="flex items-center gap-1.5"
                                >
                                  <Check
                                    size={13}
                                    className="text-emerald-600 shrink-0 stroke-[2.5]"
                                  />
                                  <span className="font-semibold text-slate-800 truncate">
                                    {formatAmenityName(amenity)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-700 pt-2 border-t border-slate-100">
                          <div className="flex items-center gap-2">
                            <Check
                              size={14}
                              className="text-emerald-600 shrink-0"
                            />
                            <span>Đã bao gồm thuế & tất cả phí</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-500">
                            <Info size={14} className="shrink-0" />
                            <span>
                              {hotel.cancellation_deadline_hours
                                ? `Miễn phí hủy trước ${hotel.cancellation_deadline_hours} giờ`
                                : "Chính sách hủy linh hoạt"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-end justify-between pt-4 border-t border-slate-100 gap-3">
                        <div className="relative">
                          <span className="text-[11px] text-slate-500 block font-semibold">
                            {rentalType === "HOUR"
                              ? `Giá cho ${rooms} phòng × ${hoursCount} giờ lưu trú`
                              : rentalType === "OVERNIGHT"
                                ? `Giá cho ${rooms} phòng qua đêm`
                                : rentalType === "HALF_DAY"
                                  ? `Giá cho ${rooms} phòng theo buổi`
                                  : `Giá cho ${rooms} phòng × ${appliedNights} đêm`}
                          </span>

                          <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl font-black text-[#ff6a00]">
                              {formatNumberWithDots(pricing.totalPrice)} đ
                            </span>

                            <div
                              onMouseEnter={() =>
                                setHoveredPriceRoomId(room.id || idx)
                              }
                              onMouseLeave={() => setHoveredPriceRoomId(null)}
                              className="relative cursor-pointer text-[#006ce4] p-0.5 inline-block"
                            >
                              <Info size={16} />
                              {isHovered && (
                                <div className="absolute left-0 bottom-full mb-2 w-72 bg-white border border-blue-200 rounded-2xl shadow-2xl p-3.5 z-50 text-left animate-fadeIn">
                                  <h4 className="font-extrabold text-xs text-slate-900 mb-2 border-b border-slate-100 pb-1.5">
                                    Chi tiết giá ({rooms} phòng)
                                  </h4>
                                  <div className="space-y-1.5 text-xs">
                                    {pricing.hourlyBreakdown.map(
                                      (item, bIdx) => (
                                        <div
                                          key={bIdx}
                                          className="flex items-center justify-between text-slate-700 font-medium"
                                        >
                                          <span>• {item.label}</span>
                                          <b className="text-slate-900 tabular-nums">
                                            {formatNumberWithDots(
                                              item.price * rooms,
                                            )}{" "}
                                            đ
                                          </b>
                                        </div>
                                      ),
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {isSoldOut ? (
                          <button
                            disabled
                            type="button"
                            className="w-full sm:w-auto px-8 py-3 bg-slate-200 text-slate-400 font-bold text-sm rounded-xl cursor-not-allowed select-none"
                          >
                            {stock > 0 ? "Không đủ số phòng" : "Đã hết phòng"}
                          </button>
                        ) : isOverCapacity ? (
                          <button
                            disabled
                            type="button"
                            className="w-full sm:w-auto px-8 py-3 bg-slate-200 text-slate-400 font-bold text-sm rounded-xl cursor-not-allowed select-none"
                          >
                            Quá sức chứa (Tối đa {maxRoomCapacity * rooms}{" "}
                            người)
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              navigate(
                                `/booking?hotelId=${hotel.id}&roomId=${room.id}&amount=${pricing.totalPrice}&checkIn=${safeFormatDate(
                                  checkOutInfo.inDateTime,
                                  "yyyy-MM-dd",
                                )}&checkOut=${checkOutInfo.finalOutDateStr}&rentalType=${rentalType}&checkInTime=${checkInTime}&checkOutTime=${checkOutInfo.outTimeStr}&hours=${hoursCount}&adults=${adults}&children=${children}&rooms=${rooms}`,
                              )
                            }
                            className="w-full sm:w-auto px-8 py-3 bg-[#003580] hover:bg-blue-900 text-white font-black text-sm rounded-xl shadow-lg transition active:scale-95 cursor-pointer"
                          >
                            Đặt ngay ({rooms} phòng - {checkOutInfo.badge})
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400">
              Hiện chưa có phòng trống trong thời gian này.
            </div>
          )}
        </section>

        {/* TIỆN NGHI CHỖ NGHỈ */}
        {(() => {
          const hotelAmenities = parseAmenities(hotel.amenities);
          return (
            <section className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4 mb-8">
              <div className="flex items-center gap-2">
                <Palmtree className="text-slate-700" size={20} />
                <h2 className="text-lg font-black text-slate-900 tracking-tight">
                  Tiện nghi & cơ sở vật chất
                </h2>
              </div>
              {hotelAmenities.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-3.5 gap-x-6 text-xs text-slate-700 font-medium">
                  {hotelAmenities.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2.5">
                      <Check
                        size={15}
                        className="text-emerald-600 shrink-0 stroke-[2.5]"
                      />
                      <span>{formatAmenityName(item)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-slate-400 italic py-2">
                  Chỗ nghỉ chưa cập nhật tiện nghi & cơ sở vật chất.
                </div>
              )}
            </section>
          );
        })()}

        {/* THÔNG TIN CHỖ NGHỈ */}
        <section className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-3.5 mb-8">
          <div className="flex items-center gap-2">
            <Building2 className="text-slate-700" size={20} />
            <h2 className="text-lg font-black text-slate-900 tracking-tight">
              Thông tin chỗ nghỉ
            </h2>
          </div>
          <div className="text-xs sm:text-sm text-slate-700 leading-relaxed space-y-3 whitespace-pre-line">
            {hotel.description ? (
              <p>{hotel.description}</p>
            ) : (
              <p>
                Tận hưởng kỳ nghỉ dưỡng tuyệt vời tại{" "}
                <strong>{hotel.name}</strong> tọa lạc tại{" "}
                {hotel.address ? `${hotel.address}, ` : ""}
                {hotel.city || "trung tâm thành phố"}.
              </p>
            )}
          </div>
        </section>

        {/* CHÍNH SÁCH NHẬN - TRẢ PHÒNG ĐỒNG BỘ VỚI DATABASE */}
        <section className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4 mb-8">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <ClipboardList className="text-[#003580]" size={20} />
              Chính sách nhận - trả phòng
            </h2>
            <span className="text-[11px] font-bold text-[#003580] bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
              Quy định riêng tại {hotel.name}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-xs pt-1">
            <div className="space-y-1">
              <span className="font-bold text-slate-500 block">Theo giờ</span>
              <strong className="text-slate-900 font-black text-sm block">
                {hotelPolicies.hourlyStart} – {hotelPolicies.hourlyEnd}
              </strong>
              <span className="text-[11px] text-slate-500 block">
                Linh hoạt các giờ trong ngày (ân hạn +
                {hotelPolicies.hourlyGraceMinutes} phút)
              </span>
            </div>

            <div className="space-y-1">
              <span className="font-bold text-slate-500 block">Qua đêm</span>
              <strong className="text-slate-900 font-black text-sm block">
                {hotelPolicies.overnightIn} – {hotelPolicies.overnightOut}
              </strong>
              <span className="text-[11px] text-slate-500 block">
                Nhận tối và trả trước trưa hôm sau (hoặc nhận rạng sáng)
              </span>
            </div>

            <div className="space-y-1">
              <span className="font-bold text-slate-500 block">
                Theo ngày (Ngày đêm)
              </span>
              <strong className="text-slate-900 font-black text-sm block">
                {hotelPolicies.dailyIn} – {hotelPolicies.dailyOut}
              </strong>
              <span className="text-[11px] text-slate-500 block">
                Tiêu chuẩn 1 đêm lưu trú
              </span>
            </div>

            <div className="space-y-1">
              <span className="font-bold text-slate-500 block">
                Theo buổi (Nửa ngày)
              </span>
              <strong className="text-slate-900 font-black text-sm block">
                {hotelPolicies.halfdayIn} – {hotelPolicies.halfdayOut}
              </strong>
              <span className="text-[11px] text-slate-500 block">
                Lưu trú trong ngày (tối đa 9 tiếng)
              </span>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 italic pt-2 border-t border-slate-100">
            Lưu ý: Miễn phí hủy phòng trước {hotelPolicies.cancellationHours}{" "}
            giờ. Việc nhận phòng sớm hoặc trả phòng trễ sẽ áp dụng phụ thu theo
            quy định riêng của từng hạng phòng.
          </p>
        </section>

        {/* SLIDER KHÁCH SẠN GỢI Ý */}
        <NewestHotelsSlider excludeHotelId={hotel.id} />

        {/* KHU VỰC ĐÁNH GIÁ */}
        <section id="reviews-section" className="space-y-6 pt-2">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7 xl:col-span-8">
              <ReviewList
                hotelName={hotel.name}
                reviews={reviews}
                ratingSummary={{
                  average_rating: averageScore,
                  total_reviews: totalReviewsCount,
                  scale: 10,
                }}
              />
            </div>
            <div className="lg:col-span-5 xl:col-span-4 sticky top-6">
              <ReviewForm
                hotelId={hotel.id}
                hotelName={hotel.name}
                onSubmitSuccess={() => fetchAllData()}
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
