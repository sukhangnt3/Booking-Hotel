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
  ChevronRight,
  ChevronLeft,
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
  ChevronDown,
  Search,
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
import { Breadcrumb, LoadingSpinner } from "@/components/common";
import { ReviewList, ReviewForm } from "@/components/review";
import NewestHotelsSlider from "@/components/hotel/NewestHotelsSlider";

import apiClient from "@/services/apiClient";
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
  iron: "Bàn ủi / Bàn là",
  safe_box: "Két an toàn",
  slippers: "Dép đi trong phòng",
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
        item &&
        item !== "null" &&
        item !== "undefined" &&
        item !== "{}" &&
        item !== "[]",
    );
  }
  if (typeof amenities === "string") {
    const cleanStr = amenities.trim();
    if (
      !cleanStr ||
      cleanStr === "{}" ||
      cleanStr === "[]" ||
      cleanStr === "null"
    ) {
      return [];
    }
    try {
      const parsed = JSON.parse(cleanStr);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch {}
    return cleanStr
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
  if (typeof item === "object") {
    return item.label || item.name || item.title || "";
  }
  return AMENITY_MAP[item] || String(item).replace(/_/g, " ");
};

const safeFormatDisplayDate = (date) => {
  if (!date) return "Chọn ngày";
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return "Chọn ngày";
    return format(d, "eee, dd 'Thg' M, yyyy", { locale: vi });
  } catch {
    return "Chọn ngày";
  }
};

const safeFormatDate = (date, pattern = "dd/MM/yyyy") => {
  if (!date) return "";
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";
    return format(d, pattern, { locale: vi });
  } catch {
    return "";
  }
};

const parseRealImageUrl = (item) => {
  if (!item) return "";
  let raw =
    typeof item === "string"
      ? item
      : item.url || item.path || item.image_url || item.thumbnail || "";
  raw = String(raw).trim();
  if (!raw || raw.startsWith("blob:")) return "";
  if (
    raw.startsWith("http://") ||
    raw.startsWith("https://") ||
    raw.startsWith("data:image/")
  ) {
    return raw;
  }
  const cleanPath = raw.startsWith("/") ? raw : `/${raw}`;
  return `${BACKEND_BASE_URL}${cleanPath}`;
};

const parseImagesList = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return [raw];
    }
  }
  return [];
};

export default function HotelDetailPage() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  const today = startOfToday();

  const initialCheckInStr = searchParams.get("checkIn") || "";
  const initialCheckOutStr = searchParams.get("checkOut") || "";
  const initialRentalType = searchParams.get("rentalType") || "DAY";
  const initialCheckInTime = searchParams.get("checkInTime") || "14:00";
  const initialCheckOutTime = searchParams.get("checkOutTime") || "12:00";

  const [rentalType, setRentalType] = useState(initialRentalType);
  const [checkInTime, setCheckInTime] = useState(initialCheckInTime);
  const [checkOutTime, setCheckOutTime] = useState(initialCheckOutTime);

  const [appliedCheckIn, setAppliedCheckIn] = useState(
    initialCheckInStr ? new Date(initialCheckInStr) : today,
  );
  const [appliedCheckOut, setAppliedCheckOut] = useState(
    initialCheckOutStr ? new Date(initialCheckOutStr) : addDays(today, 1),
  );

  const [checkInDate, setCheckInDate] = useState(appliedCheckIn);
  const [checkOutDate, setCheckOutDate] = useState(appliedCheckOut);

  const [rooms, setRooms] = useState(Number(searchParams.get("rooms")) || 1);
  const [adults, setAdults] = useState(Number(searchParams.get("adults")) || 2);
  const [children, setChildren] = useState(
    Number(searchParams.get("children")) || 0,
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarTarget, setCalendarTarget] = useState("checkIn");
  const [isGuestOpen, setIsGuestOpen] = useState(false);
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(today);

  const calendarRef = useRef(null);
  const guestRef = useRef(null);
  const roomsRef = useRef(null);

  const [hotel, setHotel] = useState(null);
  const [fallbackRooms, setFallbackRooms] = useState([]);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [checkingRooms, setCheckingRooms] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);

  const formatVND = (price) =>
    Number(price || 0).toLocaleString("vi-VN") + " ₫";

  const appliedNights = Math.max(
    1,
    differenceInDays(appliedCheckOut, appliedCheckIn),
  );

  const durationBadgeLabel = useMemo(() => {
    if (rentalType === "HOUR") {
      const inH = parseInt((checkInTime || "00:00").split(":")[0], 10);
      const outH = parseInt((checkOutTime || "01:00").split(":")[0], 10);
      const diffDays = Math.max(0, differenceInDays(checkOutDate, checkInDate));
      const totalHours = diffDays * 24 + (outH - inH);
      return `${Math.max(1, totalHours)} Giờ`;
    }
    if (rentalType === "OVERNIGHT") return "Qua đêm";
    if (rentalType === "HALF_DAY") return "1 Buổi";
    const nights = Math.max(1, differenceInDays(checkOutDate, checkInDate));
    return `${nights} Ngày`;
  }, [rentalType, checkInTime, checkOutTime, checkInDate, checkOutDate]);

  const handleTabChange = (type) => {
    setRentalType(type);
    if (type === "HOUR") {
      setCheckInTime("00:00");
      setCheckOutTime("01:00");
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

  const fetchRoomAvailability = useCallback(
    async (cIn, cOut, adCount) => {
      if (!id) return;
      setCheckingRooms(true);
      try {
        const inStr = safeFormat(cIn, "yyyy-MM-dd");
        const outStr = safeFormat(cOut, "yyyy-MM-dd");
        const res = await apiClient.get(`/hotels/${id}/availability`, {
          params: {
            checkIn: inStr,
            checkOut: outStr,
            adults: adCount,
          },
        });

        const rawData = res?.data;
        let list = [];
        if (Array.isArray(rawData)) {
          list = rawData;
        } else if (Array.isArray(rawData?.rooms)) {
          list = rawData.rooms;
        } else if (Array.isArray(rawData?.data)) {
          list = rawData.data;
        } else if (Array.isArray(res?.rooms)) {
          list = res.rooms;
        }

        if (Array.isArray(list) && list.length > 0) {
          setAvailableRooms(list);
        }
      } catch (err) {
        console.warn("Lỗi kiểm tra phòng trống:", err);
      } finally {
        setCheckingRooms(false);
      }
    },
    [id],
  );

  const fetchDirectRooms = useCallback(async () => {
    if (!id) return;
    try {
      const res = await apiClient.get(`/hotels/${id}/rooms`);
      const list = res?.data || res?.rooms || [];
      if (Array.isArray(list) && list.length > 0) {
        setFallbackRooms(list);
      }
    } catch (err) {
      console.warn("Chưa tải được /hotels/:id/rooms:", err);
    }
  }, [id]);

  const fetchReviewsOnly = useCallback(async () => {
    if (!id) return;
    try {
      const revRes = await apiClient.get(
        `/hotels/${id}/reviews?_t=${Date.now()}`,
      );
      const list =
        revRes?.data?.reviews ||
        revRes?.data?.data ||
        revRes?.data ||
        revRes?.reviews ||
        [];
      if (Array.isArray(list)) {
        setReviews(list);
      }
    } catch (err) {
      console.warn("Chưa tải được đánh giá:", err);
    }
  }, [id]);

  const fetchAllData = useCallback(async () => {
    if (!id) return;
    setLoading(true);

    try {
      const res = await apiClient.get(`/hotels/${id}?_t=${Date.now()}`);
      const hotelData = res?.data?.hotel || res?.data?.data || res?.data || res;

      if (hotelData) {
        setHotel(hotelData);
        setSearchQuery(hotelData.name || "");
        setIsFavorite(Boolean(hotelData.is_favorite));

        await Promise.all([
          fetchRoomAvailability(appliedCheckIn, appliedCheckOut, adults),
          fetchDirectRooms(),
        ]);

        if (Array.isArray(hotelData.reviews) && hotelData.reviews.length > 0) {
          setReviews(hotelData.reviews);
        } else {
          await fetchReviewsOnly();
        }
      }
    } catch (err) {
      console.error("Lỗi tải thông tin chi tiết khách sạn:", err);
    } finally {
      setLoading(false);
    }
  }, [
    id,
    appliedCheckIn,
    appliedCheckOut,
    adults,
    fetchRoomAvailability,
    fetchDirectRooms,
    fetchReviewsOnly,
  ]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  useEffect(() => {
    const handleClickOutside = (e) => {
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

  const handleApplySearch = () => {
    let finalIn = checkInDate || today;
    let finalOut = checkOutDate;

    if (
      !finalOut ||
      isBefore(finalOut, finalIn) ||
      isSameDay(finalOut, finalIn)
    ) {
      finalOut = rentalType === "DAY" ? addDays(finalIn, 1) : finalIn;
      setCheckOutDate(finalOut);
    }

    setAppliedCheckIn(finalIn);
    setAppliedCheckOut(finalOut);

    setIsCalendarOpen(false);
    setIsGuestOpen(false);

    setSearchParams({
      checkIn: safeFormatDate(finalIn, "yyyy-MM-dd"),
      checkOut: safeFormatDate(finalOut, "yyyy-MM-dd"),
      rentalType,
      checkInTime,
      checkOutTime,
      rooms: rooms.toString(),
      adults: adults.toString(),
      children: children.toString(),
    });

    fetchRoomAvailability(finalIn, finalOut, adults);
    roomsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // ── 1. BENTO GALLERY ĐẦU TRANG: LẤY ĐẦY ĐỦ TOÀN BỘ ẢNH CỦA CƠ SỞ ĐÃ CHỌN Ở BƯỚC 5 ──
  const hotelGalleryImages = [];
  if (Array.isArray(hotel?.images) && hotel.images.length > 0) {
    hotel.images.forEach((img) => {
      const u = parseRealImageUrl(img);
      if (u && !hotelGalleryImages.includes(u)) hotelGalleryImages.push(u);
    });
  }
  if (hotel?.image) {
    const u = parseRealImageUrl(hotel.image);
    if (u && !hotelGalleryImages.includes(u)) hotelGalleryImages.unshift(u);
  }

  // ── 2. HẠNG PHÒNG: LẤY ĐÚNG ẢNH CỦA HẠNG PHÒNG ĐÃ CHỌN Ở BƯỚC 3 ──
  const getRoomImage = (room) => {
    if (!room) return "";

    if (room.image && !room.image.startsWith("blob:")) {
      const u = parseRealImageUrl(room.image);
      if (u) return u;
    }

    if (room.thumbnail && !room.thumbnail.startsWith("blob:")) {
      const u = parseRealImageUrl(room.thumbnail);
      if (u) return u;
    }

    const rImgs = parseImagesList(room.images);
    if (rImgs.length > 0) {
      for (const item of rImgs) {
        const u = parseRealImageUrl(item);
        if (u) return u;
      }
    }

    return "";
  };

  const totalReviewsCount =
    reviews.length > 0 ? reviews.length : Number(hotel?.review_count || 0);

  let averageScore = 0;
  if (reviews.length > 0) {
    const sum = reviews.reduce(
      (acc, r) => acc + Number(r.point || r.rating || 0),
      0,
    );
    averageScore = sum / reviews.length;
  } else if (hotel?.average_rating && Number(hotel.average_rating) > 0) {
    averageScore = Number(hotel.average_rating);
  }

  if (totalReviewsCount === 0) {
    averageScore = 0;
  } else {
    averageScore = Math.min(10, Math.max(0, averageScore));
  }

  const getRatingLabel = (score) => {
    if (totalReviewsCount === 0 || score === 0) return "Chưa có đánh giá";
    if (score >= 9.0) return "Tuyệt vời";
    if (score >= 8.0) return "Rất tốt";
    if (score >= 7.0) return "Hài lòng";
    return "Được đánh giá tốt";
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

    const targetDate =
      calendarTarget === "checkIn" ? checkInDate : checkOutDate;

    return (
      <div className="flex-1 min-w-[260px]">
        <div className="text-center font-black text-sm text-gray-900 mb-3 tracking-tight">
          {safeFormatDate(monthDate, "'Tháng' M, yyyy")}
        </div>
        <div className="grid grid-cols-7 gap-1 text-center mb-2 pb-1 border-b border-slate-100">
          {weekHeaders.map((w, idx) => (
            <span
              key={idx}
              className={`text-xs font-bold ${w.isWeekend ? "text-[#006ce4]" : "text-slate-700"}`}
            >
              {w.label}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-1 text-center text-xs">
          {blanks.map((_, i) => (
            <div key={`blank-${i}`} className="h-8" />
          ))}
          {days.map((day) => {
            const isPast = isBefore(day, today);
            const isSelected = targetDate && isSameDay(day, targetDate);
            const isWeekend = getDay(day) === 0 || getDay(day) === 6;

            let btnClasses =
              "h-8 w-full flex items-center justify-center text-xs transition-all rounded-lg ";

            if (isPast) {
              btnClasses += "text-slate-300 font-normal cursor-not-allowed";
            } else if (isSelected) {
              btnClasses += "bg-[#006ce4] text-white font-black shadow-md";
            } else {
              btnClasses += isWeekend
                ? "text-[#006ce4] font-bold hover:bg-slate-100 cursor-pointer"
                : "text-slate-900 font-semibold hover:bg-slate-100 cursor-pointer";
            }

            return (
              <button
                key={day.toISOString()}
                type="button"
                disabled={isPast}
                onClick={() => handleSelectDateFromCalendar(day)}
                className={btnClasses}
              >
                {safeFormatDate(day, "d")}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const handleToggleFavorite = async () => {
    if (!isAuthenticated) {
      alert("Vui lòng đăng nhập để lưu khách sạn yêu thích!");
      return;
    }
    const prev = isFavorite;
    setIsFavorite(!prev);
    try {
      if (prev) await apiClient.delete(`/favorites/${id}`);
      else await apiClient.post(`/favorites`, { hotelId: id });
    } catch {
      setIsFavorite(prev);
    }
  };

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
    Array.isArray(availableRooms) && availableRooms.length > 0
      ? availableRooms
      : Array.isArray(hotel.rooms) && hotel.rooms.length > 0
        ? hotel.rooms
        : Array.isArray(fallbackRooms) && fallbackRooms.length > 0
          ? fallbackRooms
          : [];

  return (
    <div className="bg-[#f5f7fa] min-h-screen pb-20 font-sans text-slate-800">
      <div className="max-w-7xl mx-auto px-4 pt-3">
        <Breadcrumb items={breadcrumbs} />

        {/* HEADER */}
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
                    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      hotel.name + " " + (hotel.address || ""),
                    )}`,
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
              className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
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
              className="w-full sm:w-auto px-8 py-3 bg-[#003580] hover:bg-blue-900 text-white font-black text-sm rounded-xl shadow-lg transition-all active:scale-95 cursor-pointer"
            >
              Chọn phòng ngay
            </button>
          </div>
        </div>

        {/* ── BENTO GALLERY: HIỂN THỊ ĐÚNG CÁC ẢNH CƠ SỞ ĐÃ CHỌN Ở BƯỚC 5 ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 mb-6">
          <div className="lg:col-span-9 grid grid-cols-1 md:grid-cols-12 gap-3.5 h-[340px] md:h-[400px]">
            <div className="md:col-span-7 h-full w-full rounded-2xl overflow-hidden bg-slate-200 shadow-sm relative">
              {hotelGalleryImages[0] ? (
                <img
                  src={hotelGalleryImages[0]}
                  alt={hotel.name}
                  className="absolute inset-0 w-full h-full object-cover select-none"
                />
              ) : (
                <div className="w-full h-full bg-slate-200 flex items-center justify-center text-slate-400">
                  <ImageIcon size={32} />
                </div>
              )}
            </div>
            <div className="md:col-span-5 grid grid-rows-2 gap-3.5 h-full w-full">
              <div className="h-full w-full rounded-2xl overflow-hidden bg-slate-200 shadow-sm relative">
                {hotelGalleryImages[1] ? (
                  <img
                    src={hotelGalleryImages[1]}
                    alt="Ảnh cơ sở 2"
                    className="absolute inset-0 w-full h-full object-cover select-none"
                  />
                ) : (
                  <div className="w-full h-full bg-slate-200 flex items-center justify-center text-slate-400">
                    <ImageIcon size={24} />
                  </div>
                )}
              </div>
              <div className="h-full w-full rounded-2xl overflow-hidden bg-slate-200 shadow-sm relative">
                {hotelGalleryImages[2] ? (
                  <img
                    src={hotelGalleryImages[2]}
                    alt="Ảnh cơ sở 3"
                    className="absolute inset-0 w-full h-full object-cover select-none"
                  />
                ) : (
                  <div className="w-full h-full bg-slate-200 flex items-center justify-center text-slate-400">
                    <ImageIcon size={24} />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-3 flex flex-col gap-3.5 h-[340px] md:h-[400px]">
            <div
              onClick={() =>
                window.open(
                  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    hotel.name + " " + (hotel.address || ""),
                  )}`,
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
                    className={`font-black text-sm px-2.5 py-1 rounded-md shadow-xs ${
                      totalReviewsCount > 0
                        ? "bg-[#2e7d32] text-white"
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {averageScore.toFixed(1)}
                  </div>
                  <div>
                    <span
                      className={`font-black text-sm block leading-tight ${
                        totalReviewsCount > 0
                          ? "text-[#2e7d32]"
                          : "text-slate-700"
                      }`}
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

        {/* ─── THANH TÌM KIẾM ĐỒNG BỘ 100% VỚI HOMEPAGE & HOTELLIST (4 TABS GIỜ, NGÀY, ĐÊM, BUỔI) ─── */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-md mb-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center">
            {/* Ô 1: Tên chỗ nghỉ / Địa điểm */}
            <div className="md:col-span-3 relative flex items-center gap-2.5 px-3.5 h-12 bg-slate-50 rounded-xl border border-slate-200">
              <MapPin size={18} className="text-[#006ce4] shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Nhập tên khách sạn / địa điểm..."
                className="w-full text-xs font-bold text-slate-800 bg-transparent focus:outline-none"
              />
            </div>

            {/* Ô 2: Bộ chọn Ngày / Giờ kèm 4 Tabs */}
            <div
              ref={calendarRef}
              onClick={() => setIsCalendarOpen(!isCalendarOpen)}
              className="relative md:col-span-4 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200 p-2.5 h-12 cursor-pointer flex items-center justify-between hover:border-blue-600 transition-all select-none"
            >
              <div className="flex items-center gap-2">
                <CalendarIcon size={16} className="text-slate-400" />
                <div>
                  <span className="text-[10px] font-black text-slate-500 block leading-tight">
                    {rentalType === "HOUR"
                      ? `Giờ (${checkInTime})`
                      : rentalType === "OVERNIGHT"
                        ? `Đêm (${checkInTime})`
                        : rentalType === "HALF_DAY"
                          ? `Buổi (${checkInTime})`
                          : `Ngày (${checkInTime})`}
                  </span>
                  <span className="text-xs font-bold text-slate-800 leading-none">
                    {safeFormatDate(checkInDate, "dd/MM/yyyy")}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 text-[11px] font-black text-blue-600 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
                <span>{durationBadgeLabel}</span>
              </div>

              <div className="flex items-center gap-2">
                <CalendarIcon size={16} className="text-slate-400" />
                <div>
                  <span className="text-[10px] font-black text-slate-500 block leading-tight">
                    Trả ({checkOutTime})
                  </span>
                  <span className="text-xs font-bold text-slate-800 leading-none">
                    {safeFormatDate(checkOutDate, "dd/MM/yyyy")}
                  </span>
                </div>
              </div>

              {isCalendarOpen && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute left-0 lg:left-auto lg:right-0 top-full mt-2 z-50 bg-white border border-slate-200 rounded-3xl shadow-2xl p-5 w-[330px] sm:w-[500px] animate-in fade-in cursor-default"
                >
                  <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-2xl mb-4">
                    <button
                      type="button"
                      onClick={() => handleTabChange("HOUR")}
                      className={`py-2 px-1 rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition cursor-pointer ${
                        rentalType === "HOUR"
                          ? "bg-[#006ce4] text-white shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <Clock size={14} /> <span>Giờ</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleTabChange("DAY")}
                      className={`py-2 px-1 rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition cursor-pointer ${
                        rentalType === "DAY"
                          ? "bg-[#006ce4] text-white shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <Sun size={14} /> <span>Ngày</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleTabChange("OVERNIGHT")}
                      className={`py-2 px-1 rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition cursor-pointer ${
                        rentalType === "OVERNIGHT"
                          ? "bg-[#006ce4] text-white shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <Moon size={14} /> <span>Đêm</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleTabChange("HALF_DAY")}
                      className={`py-2 px-1 rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition cursor-pointer ${
                        rentalType === "HALF_DAY"
                          ? "bg-[#006ce4] text-white shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <Hourglass size={14} /> <span>Buổi</span>
                    </button>
                  </div>

                  <div className="space-y-1 mb-3">
                    <label className="text-xs font-bold text-slate-700 block">
                      Nhận phòng
                    </label>
                    <div className="grid grid-cols-12 gap-2">
                      <div className="col-span-4">
                        <select
                          value={checkInTime}
                          onChange={(e) => setCheckInTime(e.target.value)}
                          className="w-full h-11 px-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-[#006ce4] cursor-pointer"
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

                      <div className="col-span-8">
                        <button
                          type="button"
                          onClick={() => setCalendarTarget("checkIn")}
                          className={`w-full h-11 px-3 bg-white border rounded-xl text-xs font-bold text-slate-800 flex items-center justify-between cursor-pointer ${
                            calendarTarget === "checkIn"
                              ? "border-[#006ce4] ring-2 ring-blue-100"
                              : "border-slate-300"
                          }`}
                        >
                          <span className="truncate">
                            {safeFormatDisplayDate(checkInDate)}
                          </span>
                          <ChevronDown size={14} className="text-slate-400" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1 mb-3">
                    <label className="text-xs font-bold text-slate-700 block">
                      Trả phòng
                    </label>
                    <div className="grid grid-cols-12 gap-2">
                      <div className="col-span-4">
                        <select
                          value={checkOutTime}
                          onChange={(e) => setCheckOutTime(e.target.value)}
                          className="w-full h-11 px-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-[#006ce4] cursor-pointer"
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

                      <div className="col-span-8">
                        <button
                          type="button"
                          onClick={() => setCalendarTarget("checkOut")}
                          className={`w-full h-11 px-3 bg-white border rounded-xl text-xs font-bold text-slate-800 flex items-center justify-between cursor-pointer ${
                            calendarTarget === "checkOut"
                              ? "border-[#006ce4] ring-2 ring-blue-100"
                              : "border-slate-300"
                          }`}
                        >
                          <span className="truncate">
                            {safeFormatDisplayDate(checkOutDate)}
                          </span>
                          <ChevronDown size={14} className="text-slate-400" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="w-full py-2 bg-blue-50 text-[#006ce4] border border-blue-100 rounded-xl font-black text-center text-xs mb-3">
                    {durationBadgeLabel}
                  </div>

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
                            setCurrentCalendarMonth((prev) =>
                              subMonths(prev, 1),
                            )
                          }
                          disabled={isBefore(
                            startOfMonth(currentCalendarMonth),
                            startOfMonth(today),
                          )}
                          className="p-1 hover:bg-white rounded"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setCurrentCalendarMonth((prev) =>
                              addMonths(prev, 1),
                            )
                          }
                          className="p-1 hover:bg-white rounded"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                    {renderMonthCalendar(currentCalendarMonth)}
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

            {/* Ô 3: Người lớn, Trẻ em, Phòng */}
            <div
              ref={guestRef}
              onClick={() => setIsGuestOpen(!isGuestOpen)}
              className="relative md:col-span-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200 p-2.5 h-12 cursor-pointer flex items-center gap-2.5 hover:border-blue-600 transition-all select-none"
            >
              <Users size={18} className="text-slate-400 shrink-0" />
              <div className="leading-tight overflow-hidden">
                <span className="text-xs font-bold text-slate-800 block truncate">
                  {rooms} Phòng · {adults} Lớn
                </span>
                <span className="text-[10px] text-slate-500 font-medium block truncate">
                  {children > 0 ? `${children} trẻ em` : "0 trẻ em"}
                </span>
              </div>

              {isGuestOpen && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute left-0 right-0 md:left-auto md:w-72 top-full mt-2 z-50 bg-white border border-slate-200 rounded-2xl shadow-2xl p-4 space-y-3.5 cursor-default"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-800 block">
                      Phòng
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setRooms((r) => Math.max(1, r - 1))}
                        className="w-7 h-7 rounded-lg border border-slate-300 font-bold hover:bg-slate-100 flex items-center justify-center cursor-pointer"
                      >
                        -
                      </button>
                      <span className="text-xs font-black w-5 text-center">
                        {rooms}
                      </span>
                      <button
                        type="button"
                        onClick={() => setRooms((r) => r + 1)}
                        className="w-7 h-7 rounded-lg border border-slate-300 font-bold hover:bg-slate-100 flex items-center justify-center cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-800 block">
                      Người lớn
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setAdults((a) => Math.max(1, a - 1))}
                        className="w-7 h-7 rounded-lg border border-slate-300 font-bold hover:bg-slate-100 flex items-center justify-center cursor-pointer"
                      >
                        -
                      </button>
                      <span className="text-xs font-black w-5 text-center">
                        {adults}
                      </span>
                      <button
                        type="button"
                        onClick={() => setAdults((a) => a + 1)}
                        className="w-7 h-7 rounded-lg border border-slate-300 font-bold hover:bg-slate-100 flex items-center justify-center cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-800 block">
                      Trẻ em
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setChildren((c) => Math.max(0, c - 1))}
                        className="w-7 h-7 rounded-lg border border-slate-300 font-bold hover:bg-slate-100 flex items-center justify-center cursor-pointer"
                      >
                        -
                      </button>
                      <span className="text-xs font-black w-5 text-center">
                        {children}
                      </span>
                      <button
                        type="button"
                        onClick={() => setChildren((c) => c + 1)}
                        className="w-7 h-7 rounded-lg border border-slate-300 font-bold hover:bg-slate-100 flex items-center justify-center cursor-pointer"
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
                    Xong
                  </button>
                </div>
              )}
            </div>

            {/* Ô 4: Nút cập nhật tìm kiếm */}
            <div className="md:col-span-2">
              <button
                type="button"
                onClick={handleApplySearch}
                disabled={checkingRooms}
                className="w-full h-12 bg-[#003580] hover:bg-blue-900 text-white font-black text-sm rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center cursor-pointer disabled:opacity-50"
              >
                {checkingRooms ? "Đang kiểm tra..." : "Cập nhật"}
              </button>
            </div>
          </div>
        </div>

        {/* ─── BẢNG GIÁ VÀ CHI TIẾT CÁC HẠNG PHÒNG ─── */}
        <section ref={roomsRef} className="space-y-4 mb-10">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                Bảng giá các hạng phòng ({displayRooms.length} Loại phòng)
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Đang tính giá cho:{" "}
                <strong className="text-blue-900">
                  {safeFormatDate(appliedCheckIn, "dd/MM/yyyy")}
                </strong>{" "}
                &rarr;{" "}
                <strong className="text-blue-900">
                  {safeFormatDate(appliedCheckOut, "dd/MM/yyyy")}
                </strong>{" "}
                (
                <strong className="text-blue-600 font-bold">
                  {durationBadgeLabel}
                </strong>
                ) · {rooms} phòng · {adults} người lớn
                {children > 0 ? ` · ${children} trẻ em` : ""}
              </p>
            </div>
          </div>

          {displayRooms && displayRooms.length > 0 ? (
            <div className="space-y-4">
              {displayRooms.map((room, idx) => {
                const roomImg = getRoomImage(room);

                const stock =
                  room.remaining_rooms !== undefined
                    ? Number(room.remaining_rooms)
                    : room.amount !== undefined
                      ? Number(room.amount)
                      : 4;

                const isSoldOut = stock <= 0 || room.is_available === false;

                const dailyPrice = Number(
                  room.avg_price_per_night ||
                    room.daily_price ||
                    room.base_price ||
                    room.sell_price ||
                    650000,
                );

                let totalRoomPrice = dailyPrice * appliedNights;
                if (rentalType === "HOUR") {
                  totalRoomPrice = Number(
                    room.hourly_price || Math.round(dailyPrice * 0.25) || 80000,
                  );
                } else if (rentalType === "OVERNIGHT") {
                  totalRoomPrice = Number(room.overnight_price || dailyPrice);
                } else if (rentalType === "HALF_DAY") {
                  totalRoomPrice = Number(
                    room.half_day_price ||
                      Math.round(dailyPrice * 0.8) ||
                      250000,
                  );
                }

                const viewLabel =
                  ROOM_VIEW_MAP[room.room_view] ||
                  (room.type && ROOM_VIEW_MAP[room.type]) ||
                  null;

                const roomAmenities = parseAmenities(room.amenities);

                return (
                  <div
                    key={room.id || idx}
                    className={`bg-white rounded-2xl border transition-all overflow-hidden grid grid-cols-1 lg:grid-cols-12 ${
                      isSoldOut
                        ? "border-slate-200 opacity-60 bg-slate-50/50"
                        : "border-slate-200 hover:border-[#006ce4] shadow-sm"
                    }`}
                  >
                    <div className="lg:col-span-4 p-5 bg-slate-50/50 border-r border-slate-100 flex flex-col justify-between space-y-4">
                      <div className="space-y-3">
                        <div className="w-full h-44 rounded-xl overflow-hidden bg-slate-200 relative shadow-xs">
                          {roomImg ? (
                            <img
                              src={roomImg}
                              alt={room.name}
                              className="absolute inset-0 w-full h-full object-cover select-none hover:scale-105 transition duration-300"
                            />
                          ) : (
                            <div className="w-full h-full bg-slate-200 flex items-center justify-center text-slate-400">
                              <ImageIcon size={32} />
                            </div>
                          )}
                          {isSoldOut && (
                            <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] flex items-center justify-center">
                              <span className="bg-rose-600 text-white font-black text-xs px-3 py-1.5 rounded-lg uppercase tracking-wider shadow">
                                Hết phòng ngày này
                              </span>
                            </div>
                          )}
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
                            <p>👥 Sức chứa: {room.capacity || 2} Người lớn</p>
                          </div>
                        </div>
                      </div>

                      {!isSoldOut && stock <= 3 && (
                        <div className="text-orange-600 font-bold text-xs flex items-center gap-1">
                          <AlertCircle size={14} /> Chỉ còn {stock} phòng trống
                          cho kỳ nghỉ này!
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
                        <div>
                          <span className="text-[11px] text-slate-500 block font-semibold">
                            {rentalType === "HOUR"
                              ? "Giá thuê theo giờ"
                              : rentalType === "OVERNIGHT"
                                ? "Giá thuê qua đêm"
                                : rentalType === "HALF_DAY"
                                  ? "Giá thuê theo buổi"
                                  : `Giá cho ${appliedNights} đêm (${formatVND(dailyPrice)} / đêm)`}
                          </span>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl font-black text-[#ff6a00]">
                              {formatVND(totalRoomPrice)}
                            </span>
                            <span className="text-xs text-slate-500 font-bold">
                              / {durationBadgeLabel}
                            </span>
                          </div>
                        </div>

                        {isSoldOut ? (
                          <button
                            disabled
                            type="button"
                            className="w-full sm:w-auto px-8 py-3 bg-slate-200 text-slate-400 font-bold text-sm rounded-xl cursor-not-allowed select-none"
                          >
                            Đã hết phòng
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              navigate(
                                `/booking?hotelId=${hotel.id}&roomId=${room.id}&amount=${totalRoomPrice}&checkIn=${safeFormatDate(
                                  appliedCheckIn,
                                  "yyyy-MM-dd",
                                )}&checkOut=${safeFormatDate(
                                  appliedCheckOut,
                                  "yyyy-MM-dd",
                                )}&rentalType=${rentalType}&checkInTime=${checkInTime}&checkOutTime=${checkOutTime}&rooms=${rooms}&adults=${adults}&children=${children}&nights=${appliedNights}`,
                              )
                            }
                            className="w-full sm:w-auto px-8 py-3 bg-[#003580] hover:bg-blue-900 text-white font-black text-sm rounded-xl shadow-lg transition-all active:scale-95 cursor-pointer"
                          >
                            Đặt ngay ({durationBadgeLabel})
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

        {/* QUY ĐỊNH CHỖ NGHỈ */}
        <section className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4 mb-8">
          <div className="flex items-center gap-2">
            <ClipboardList className="text-slate-700" size={20} />
            <h2 className="text-lg font-black text-slate-900 tracking-tight">
              Quy định của chỗ nghỉ
            </h2>
          </div>
          <div className="divide-y divide-slate-100 text-xs text-slate-700">
            <div className="py-3.5 space-y-2">
              <div className="flex items-center gap-3">
                <Clock size={16} className="text-slate-400 shrink-0" />
                <span className="w-44 font-semibold text-slate-500">
                  Thời gian nhận phòng:
                </span>
                <strong className="text-slate-900 font-bold">
                  Từ{" "}
                  {String(
                    hotel.checkin_time || hotel.check_in_time || "14:00",
                  ).slice(0, 5)}
                </strong>
              </div>
              <div className="flex items-center gap-3">
                <Clock size={16} className="text-slate-400 shrink-0" />
                <span className="w-44 font-semibold text-slate-500">
                  Thời gian trả phòng:
                </span>
                <strong className="text-slate-900 font-bold">
                  Trước{" "}
                  {String(
                    hotel.checkout_time || hotel.check_out_time || "12:00",
                  ).slice(0, 5)}
                </strong>
              </div>
            </div>
          </div>
        </section>

        {/* CHỖ NGHỈ NỔI BẬT & MỚI NHẤT */}
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
                onSubmitSuccess={() => {
                  fetchReviewsOnly();
                  fetchAllData();
                }}
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
