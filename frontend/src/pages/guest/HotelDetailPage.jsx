// src/pages/guest/HotelDetailPage.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
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
  refrigerator: "Tủ lạnh",
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

// Hàm chuẩn hóa mảng tiện ích từ Database (chống lỗi chuỗi JSON)
export const parseAmenities = (amenities) => {
  if (!amenities) return [];
  if (Array.isArray(amenities)) return amenities;
  if (typeof amenities === "string") {
    const cleanStr = amenities.trim();
    try {
      const parsed = JSON.parse(cleanStr);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // Bỏ qua lỗi JSON
    }
    // Gỡ ngoặc nhọn PostgreSQL {wifi,parking} nếu có
    return cleanStr
      .replace(/^\{|\}$/g, "")
      .replace(/["']/g, "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
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

const safeFormat = (date, pattern = "yyyy-MM-dd") => {
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

export default function HotelDetailPage() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  const today = startOfToday();

  // Ngày áp dụng chính thức
  const initialCheckIn = searchParams.get("checkIn")
    ? new Date(searchParams.get("checkIn"))
    : today;
  const initialCheckOut = searchParams.get("checkOut")
    ? new Date(searchParams.get("checkOut"))
    : addDays(today, 1);

  const [appliedCheckIn, setAppliedCheckIn] = useState(initialCheckIn);
  const [appliedCheckOut, setAppliedCheckOut] = useState(initialCheckOut);

  // Ngày tạm thời
  const [tempCheckIn, setTempCheckIn] = useState(initialCheckIn);
  const [tempCheckOut, setTempCheckOut] = useState(initialCheckOut);
  const [hoverDate, setHoverDate] = useState(null);

  const [adults, setAdults] = useState(Number(searchParams.get("adults")) || 2);
  const [tempAdults, setTempAdults] = useState(adults);

  const [searchQuery, setSearchQuery] = useState("");
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isGuestOpen, setIsGuestOpen] = useState(false);
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(today);

  const calendarRef = useRef(null);
  const guestRef = useRef(null);
  const roomsRef = useRef(null);

  const [hotel, setHotel] = useState(null);
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

  const previewNights =
    tempCheckIn && tempCheckOut && isAfter(tempCheckOut, tempCheckIn)
      ? Math.max(1, differenceInDays(tempCheckOut, tempCheckIn))
      : 1;

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
      console.warn("Chưa tải được đánh giá qua endpoint phụ:", err);
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

        const rawRooms = Array.isArray(hotelData.rooms) ? hotelData.rooms : [];
        setAvailableRooms(
          rawRooms.map((r) => {
            const daily = Number(r.base_price || r.sell_price || 650000);
            return {
              ...r,
              daily_price: daily,
              total_price: daily * appliedNights,
              remaining_rooms: r.amount || 4,
              is_available: true,
            };
          }),
        );

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
  }, [id, appliedNights, fetchReviewsOnly]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const applySearchAndRecalculate = (finalIn, finalOut, guestCount) => {
    const newNights = Math.max(1, differenceInDays(finalOut, finalIn));

    setAppliedCheckIn(finalIn);
    setAppliedCheckOut(finalOut);
    setAdults(guestCount);

    setSearchParams({
      checkIn: safeFormat(finalIn, "yyyy-MM-dd"),
      checkOut: safeFormat(finalOut, "yyyy-MM-dd"),
      adults: guestCount.toString(),
    });

    if (hotel?.rooms) {
      const recalculated = hotel.rooms.map((r) => {
        const daily = Number(r.base_price || r.sell_price || 650000);
        return {
          ...r,
          daily_price: daily,
          total_price: daily * newNights,
          remaining_rooms: r.amount || 4,
          is_available: true,
        };
      });
      setAvailableRooms(recalculated);
    }
  };

  const handleDateClick = (date) => {
    if (isBefore(date, today)) return;

    if (!tempCheckIn || (tempCheckIn && tempCheckOut)) {
      setTempCheckIn(date);
      setTempCheckOut(null);
    } else if (tempCheckIn && !tempCheckOut) {
      if (isBefore(date, tempCheckIn) || isSameDay(date, tempCheckIn)) {
        setTempCheckIn(date);
      } else {
        const finalIn = tempCheckIn;
        const finalOut = date;
        setTempCheckOut(finalOut);
        setIsCalendarOpen(false);

        applySearchAndRecalculate(finalIn, finalOut, tempAdults);
      }
    }
  };

  const handleManualUpdate = () => {
    let finalIn = tempCheckIn || today;
    let finalOut = tempCheckOut;

    if (
      !finalOut ||
      isBefore(finalOut, finalIn) ||
      isSameDay(finalOut, finalIn)
    ) {
      finalOut = addDays(finalIn, 1);
      setTempCheckOut(finalOut);
    }

    setIsCalendarOpen(false);
    setIsGuestOpen(false);

    applySearchAndRecalculate(finalIn, finalOut, tempAdults);
    roomsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const dbImages = [];
  if (hotel?.image) {
    const u = parseRealImageUrl(hotel.image);
    if (u && !dbImages.includes(u)) dbImages.push(u);
  }
  if (Array.isArray(hotel?.images) && hotel.images.length > 0) {
    hotel.images.forEach((img) => {
      const u = parseRealImageUrl(img);
      if (u && !dbImages.includes(u)) dbImages.push(u);
    });
  }
  if (Array.isArray(hotel?.rooms)) {
    hotel.rooms.forEach((r) => {
      const rImg =
        r.image || r.thumbnail || (Array.isArray(r.images) && r.images[0]);
      if (rImg) {
        const u = parseRealImageUrl(rImg);
        if (u && !dbImages.includes(u)) dbImages.push(u);
      }
    });
  }
  if (dbImages.length > 0) {
    while (dbImages.length < 3) {
      dbImages.push(dbImages[0]);
    }
  } else {
    const defaultFallbacks = [
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800",
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800",
      "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800",
    ];
    dbImages.push(...defaultFallbacks);
  }

  const getRoomImage = (room, roomIdx) => {
    if (room.image && !room.image.startsWith("blob:")) {
      const u = parseRealImageUrl(room.image);
      if (u) return u;
    }
    if (room.thumbnail) {
      const u = parseRealImageUrl(room.thumbnail);
      if (u) return u;
    }
    if (Array.isArray(room.images) && room.images.length > 0) {
      const u = parseRealImageUrl(room.images[0]);
      if (u) return u;
    }
    if (Array.isArray(hotel?.images)) {
      const matched = hotel.images.find(
        (img) =>
          String(img.room_id || img.roomId || "") === String(room.id || "") &&
          img.room_id,
      );
      if (matched) {
        const u = parseRealImageUrl(matched);
        if (u) return u;
      }
    }
    return dbImages[roomIdx + 1] || dbImages[0];
  };

  const totalReviewsCount =
    reviews.length > 0 ? reviews.length : Number(hotel?.review_count || 0);

  let averageScore = 9.3;
  if (reviews.length > 0) {
    const sum = reviews.reduce((acc, r) => {
      const pt = Number(r.point || r.rating || 10);
      return acc + pt;
    }, 0);
    averageScore = sum / reviews.length;
  } else if (hotel?.average_rating) {
    averageScore = Number(hotel.average_rating);
  }
  averageScore = Math.min(10, Math.max(1, averageScore));

  const getRatingLabel = (score) => {
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

    return (
      <div className="flex-1 min-w-[240px]">
        <div className="text-center font-black text-sm text-slate-900 mb-3">
          {safeFormat(monthDate, "'Tháng' M, yyyy")}
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
            const isStart = tempCheckIn && isSameDay(day, tempCheckIn);
            const isEnd = tempCheckOut && isSameDay(day, tempCheckOut);
            const isInRange =
              tempCheckIn &&
              tempCheckOut &&
              isWithinInterval(day, { start: tempCheckIn, end: tempCheckOut });
            const isHoverRange =
              tempCheckIn &&
              !tempCheckOut &&
              hoverDate &&
              isAfter(hoverDate, tempCheckIn) &&
              isWithinInterval(day, { start: tempCheckIn, end: hoverDate });
            const isWeekend = getDay(day) === 0 || getDay(day) === 6;

            let btnClasses =
              "h-8 w-full flex items-center justify-center text-xs transition-all relative ";
            if (isPast)
              btnClasses += "text-slate-300 font-normal cursor-not-allowed";
            else if (isStart && isEnd)
              btnClasses +=
                "bg-[#006ce4] text-white rounded-lg z-10 font-black shadow-md";
            else if (isStart)
              btnClasses +=
                "bg-[#006ce4] text-white rounded-l-lg z-10 font-black shadow-md " +
                (tempCheckOut ? "rounded-r-none" : "rounded-r-lg");
            else if (isEnd)
              btnClasses +=
                "bg-[#006ce4] text-white rounded-r-lg rounded-l-none z-10 font-black shadow-md";
            else if (isInRange || isHoverRange)
              btnClasses +=
                "bg-[#e8f2ff] text-slate-900 font-bold hover:bg-[#d0e5ff]";
            else
              btnClasses += isWeekend
                ? "text-[#006ce4] font-bold hover:bg-slate-100 rounded-lg cursor-pointer"
                : "text-slate-900 font-semibold hover:bg-slate-100 rounded-lg cursor-pointer";

            return (
              <button
                key={day.toISOString()}
                type="button"
                disabled={isPast}
                onClick={() => handleDateClick(day)}
                onMouseEnter={() => !tempCheckOut && setHoverDate(day)}
                className={btnClasses}
              >
                {safeFormat(day, "d")}
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
    availableRooms.length > 0 ? availableRooms : hotel.rooms || [];

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

        {/* BENTO GALLERY */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 mb-6">
          <div className="lg:col-span-9 grid grid-cols-1 md:grid-cols-12 gap-3.5 h-[340px] md:h-[400px]">
            <div className="md:col-span-7 h-full w-full rounded-2xl overflow-hidden bg-slate-200 shadow-sm relative">
              <img
                src={dbImages[0]}
                alt={hotel.name}
                className="absolute inset-0 w-full h-full object-cover select-none"
              />
            </div>
            <div className="md:col-span-5 grid grid-rows-2 gap-3.5 h-full w-full">
              <div className="h-full w-full rounded-2xl overflow-hidden bg-slate-200 shadow-sm relative">
                <img
                  src={dbImages[1]}
                  alt="Ảnh 2"
                  className="absolute inset-0 w-full h-full object-cover select-none"
                />
              </div>
              <div className="h-full w-full rounded-2xl overflow-hidden bg-slate-200 shadow-sm relative">
                <img
                  src={dbImages[2]}
                  alt="Ảnh 3"
                  className="absolute inset-0 w-full h-full object-cover select-none"
                />
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
                  <div className="bg-[#2e7d32] text-white font-black text-sm px-2.5 py-1 rounded-md shadow-xs">
                    {averageScore.toFixed(1)}
                  </div>
                  <div>
                    <span className="font-black text-[#2e7d32] text-sm block leading-tight">
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
                    : "Khách lưu trú đánh giá cao chất lượng phòng và dịch vụ của chỗ nghỉ."}
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

        {/* THANH TÌM KIẾM */}
        <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-md mb-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center">
            <div className="md:col-span-4 relative flex items-center gap-2.5 px-3.5 h-12 bg-slate-50 rounded-xl border border-slate-200">
              <MapPin size={18} className="text-[#006ce4] shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Nhập tên khách sạn / địa điểm..."
                className="w-full text-xs font-bold text-slate-800 bg-transparent focus:outline-none"
              />
            </div>

            <div
              ref={calendarRef}
              onClick={() => setIsCalendarOpen(!isCalendarOpen)}
              className="md:col-span-4 relative flex items-center justify-between px-3.5 h-12 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200 hover:border-blue-600 cursor-pointer transition select-none"
            >
              <div className="flex items-center gap-2">
                <CalendarIcon size={16} className="text-slate-400" />
                <span className="text-xs font-bold text-slate-800">
                  {safeFormat(tempCheckIn, "dd/MM/yyyy") || "--/--/----"}
                </span>
              </div>
              <span className="text-[11px] font-black text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                {previewNights} <Moon size={10} fill="currentColor" />
              </span>
              <span className="text-xs font-bold text-slate-800">
                {safeFormat(tempCheckOut, "dd/MM/yyyy") || "--/--/----"}
              </span>

              {isCalendarOpen && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute left-0 lg:left-auto lg:right-0 top-full mt-2 z-50 bg-white border border-slate-200 rounded-2xl shadow-2xl p-5 w-[320px] sm:w-[580px] md:w-[620px] animate-in fade-in cursor-default"
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
                      className="p-1.5 rounded-full hover:bg-slate-100 text-slate-700 disabled:opacity-20 cursor-pointer"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <span className="text-xs font-bold text-blue-600">
                      {!tempCheckOut
                        ? "👉 Chọn ngày trả phòng để tính giá ngay"
                        : "✓ Giá phòng đã tự động nhân theo số đêm mới"}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentCalendarMonth((prev) => addMonths(prev, 1))
                      }
                      className="p-1.5 rounded-full hover:bg-slate-100 text-slate-700 cursor-pointer"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-6 sm:divide-x sm:divide-slate-100">
                    {renderMonthCalendar(currentCalendarMonth)}
                    <div className="hidden sm:block sm:pl-6">
                      {renderMonthCalendar(addMonths(currentCalendarMonth, 1))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div
              ref={guestRef}
              onClick={() => setIsGuestOpen(!isGuestOpen)}
              className="md:col-span-2 relative flex items-center gap-2 px-3 h-12 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200 hover:border-blue-600 cursor-pointer transition select-none"
            >
              <Users size={18} className="text-slate-400 shrink-0" />
              <span className="text-xs font-bold text-slate-800 truncate">
                {tempAdults} người lớn
              </span>

              {isGuestOpen && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute left-0 right-0 top-full mt-2 z-50 bg-white border border-slate-200 rounded-xl shadow-2xl p-4 space-y-3 cursor-default"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-700">
                      Người lớn
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const val = Math.max(1, tempAdults - 1);
                          setTempAdults(val);
                          applySearchAndRecalculate(
                            appliedCheckIn,
                            appliedCheckOut,
                            val,
                          );
                        }}
                        className="w-7 h-7 rounded border border-slate-300 font-bold hover:bg-slate-100 cursor-pointer"
                      >
                        -
                      </button>
                      <span className="text-xs font-bold w-4 text-center">
                        {tempAdults}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const val = tempAdults + 1;
                          setTempAdults(val);
                          applySearchAndRecalculate(
                            appliedCheckIn,
                            appliedCheckOut,
                            val,
                          );
                        }}
                        className="w-7 h-7 rounded border border-slate-300 font-bold hover:bg-slate-100 cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsGuestOpen(false)}
                    className="w-full py-1.5 bg-[#003580] text-white text-xs font-bold rounded-lg mt-2 cursor-pointer"
                  >
                    Đóng
                  </button>
                </div>
              )}
            </div>

            <div className="md:col-span-2">
              <button
                type="button"
                onClick={handleManualUpdate}
                disabled={checkingRooms}
                className="w-full h-12 bg-[#003580] hover:bg-blue-900 text-white font-black text-sm rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center cursor-pointer disabled:opacity-50"
              >
                {checkingRooms ? "Đang tải..." : "Cập nhật"}
              </button>
            </div>
          </div>
        </div>

        {/* BẢNG GIÁ VÀ CHI TIẾT CÁC HẠNG PHÒNG */}
        <section ref={roomsRef} className="space-y-4 mb-10">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                Bảng giá các hạng phòng ({displayRooms.length} Loại phòng)
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Đang tính giá cho:{" "}
                <strong className="text-blue-900">
                  {safeFormat(appliedCheckIn, "dd/MM/yyyy")}
                </strong>{" "}
                &rarr;{" "}
                <strong className="text-blue-900">
                  {safeFormat(appliedCheckOut, "dd/MM/yyyy")}
                </strong>{" "}
                (
                <strong className="text-blue-600 font-bold">
                  {appliedNights} đêm
                </strong>
                )
              </p>
            </div>
          </div>

          {displayRooms && displayRooms.length > 0 ? (
            <div className="space-y-4">
              {displayRooms.map((room, idx) => {
                const roomImg = getRoomImage(room, idx);
                const stock =
                  room.remaining_rooms !== undefined
                    ? room.remaining_rooms
                    : room.amount || 4;
                const isSoldOut = stock <= 0 || room.is_available === false;

                const dailyPrice = Number(
                  room.daily_price ||
                    room.base_price ||
                    room.sell_price ||
                    650000,
                );
                const totalRoomPrice = dailyPrice * appliedNights;

                const viewLabel =
                  ROOM_VIEW_MAP[room.room_view] ||
                  (room.type && ROOM_VIEW_MAP[room.type]) ||
                  null;

                // Lấy tiện nghi của phòng
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
                          <img
                            src={roomImg}
                            alt={room.name}
                            className="absolute inset-0 w-full h-full object-cover select-none hover:scale-105 transition duration-300"
                          />
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

                        {/* 👉 HIỂN THỊ TIỆN NGHI PHÒNG TỪ DATABASE */}
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
                            Giá cho {appliedNights} đêm ({formatVND(dailyPrice)}{" "}
                            / đêm)
                          </span>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl font-black text-[#ff6a00]">
                              {formatVND(totalRoomPrice)}
                            </span>
                            <span className="text-xs text-slate-500 font-bold">
                              / {appliedNights} đêm
                            </span>
                          </div>
                        </div>

                        {isSoldOut ? (
                          <button
                            disabled
                            className="w-full sm:w-auto px-8 py-3 bg-slate-200 text-slate-500 font-bold text-sm rounded-xl cursor-not-allowed"
                          >
                            Hết phòng ngày này
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              navigate(
                                `/booking?hotelId=${hotel.id}&roomId=${room.id}&amount=${totalRoomPrice}&checkIn=${safeFormat(
                                  appliedCheckIn,
                                  "yyyy-MM-dd",
                                )}&checkOut=${safeFormat(
                                  appliedCheckOut,
                                  "yyyy-MM-dd",
                                )}&adults=${adults}&nights=${appliedNights}`,
                              )
                            }
                            className="w-full sm:w-auto px-8 py-3 bg-[#003580] hover:bg-blue-900 text-white font-black text-sm rounded-xl shadow-lg transition-all active:scale-95 cursor-pointer"
                          >
                            Đặt ngay ({appliedNights} đêm)
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
