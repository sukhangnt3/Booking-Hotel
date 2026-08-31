import React, { useState, useEffect, useRef } from "react";
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
  Coins,
  Zap,
  Image as ImageIcon,
  ShieldCheck,
  Info,
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

// Components
import { Button, Badge } from "@/components/ui";
import { Breadcrumb, LoadingSpinner } from "@/components/common";
import { ReviewList, ReviewForm } from "@/components/review";

// Services & Stores
import { hotelService } from "@/services";
import { useAuthStore } from "@/stores/authStore";

const HOT_DESTINATIONS = [
  { name: "Đà Nẵng", count: "Khách sạn & Resort" },
  { name: "Nha Trang", count: "Khách sạn ven biển" },
  { name: "Phú Quốc", count: "Khu nghỉ dưỡng cao cấp" },
  { name: "Đà Lạt", count: "Homestay & Khách sạn" },
  { name: "Vũng Tàu", count: "Khách sạn & Biệt thự" },
  { name: "Hà Nội", count: "Khách sạn trung tâm" },
];

const HotelDetailPage = () => {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  const today = startOfToday();

  // ─── 1. STATES NGÀY & KHÁCH ───
  const [searchQuery, setSearchQuery] = useState("");
  const [isDestDropdownOpen, setIsDestDropdownOpen] = useState(false);

  const [checkInDate, setCheckInDate] = useState(
    searchParams.get("checkIn") ? new Date(searchParams.get("checkIn")) : today,
  );
  const [checkOutDate, setCheckOutDate] = useState(
    searchParams.get("checkOut")
      ? new Date(searchParams.get("checkOut"))
      : addDays(today, 1),
  );
  const [adults, setAdults] = useState(Number(searchParams.get("adults")) || 2);
  const [roomsCount, setRoomsCount] = useState(1);

  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isGuestOpen, setIsGuestOpen] = useState(false);
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(
    checkInDate || today,
  );
  const [hoverDate, setHoverDate] = useState(null);

  const destRef = useRef(null);
  const calendarRef = useRef(null);
  const guestRef = useRef(null);
  const roomsRef = useRef(null);

  const [hotel, setHotel] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);

  // ─── 2. FETCH DATA THẬT TỪ DATABASE ───
  const fetchAllData = async () => {
    if (!id) return;
    setLoading(true);

    try {
      const hotelRes = await hotelService.getById(id);
      const hotelData = hotelRes?.data || hotelRes;
      setHotel(hotelData);
      setSearchQuery(hotelData?.name || "");
      setIsFavorite(Boolean(hotelData?.is_favorite || hotelData?.isFavorite));
    } catch (err) {
      console.error("Lỗi tải thông tin khách sạn:", err);
    }

    try {
      if (hotelService?.getReviews) {
        const reviewsRes = await hotelService.getReviews(id);
        const reviewsData = Array.isArray(reviewsRes)
          ? reviewsRes
          : reviewsRes?.data?.data || reviewsRes?.data || [];
        setReviews(reviewsData);
      }
    } catch {
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [id]);

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

  // ─── 3. LOGIC LỊCH ĐÔI 2 THÁNG ───
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
        <div className="text-center font-black text-sm text-gray-900 mb-3">
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
            <div key={`blank-${i}`} className="h-8" />
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
              "h-8 w-full flex items-center justify-center text-xs transition-all relative ";

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

  // ─── 4. CẬP NHẬT TÌM KIẾM ───
  const handleUpdateSearch = () => {
    const inStr = checkInDate ? format(checkInDate, "yyyy-MM-dd") : "";
    const outStr = checkOutDate ? format(checkOutDate, "yyyy-MM-dd") : "";
    const trimmedQuery = (searchQuery || "").trim();
    const currentHotelName = (hotel?.name || "").trim();

    if (
      trimmedQuery &&
      trimmedQuery.toLowerCase() !== currentHotelName.toLowerCase()
    ) {
      navigate(
        `/hotels?destination=${encodeURIComponent(
          trimmedQuery,
        )}&checkIn=${inStr}&checkOut=${outStr}&adults=${adults}`,
      );
      return;
    }

    if (inStr && outStr) {
      setSearchParams({
        checkIn: inStr,
        checkOut: outStr,
        adults: adults.toString(),
      });
    }

    roomsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // ─── 5. YÊU THÍCH THẬT ───
  const handleToggleFavorite = async () => {
    if (!isAuthenticated) {
      alert("Vui lòng đăng nhập để lưu khách sạn yêu thích!");
      return;
    }
    const previous = isFavorite;
    setIsFavorite(!previous);
    try {
      if (previous) {
        if (hotelService?.removeFavorite) await hotelService.removeFavorite(id);
      } else {
        if (hotelService?.addFavorite) await hotelService.addFavorite(id);
      }
    } catch {
      setIsFavorite(previous);
    }
  };

  const formatVND = (price) =>
    Number(price || 0).toLocaleString("vi-VN") + " ₫";

  if (loading)
    return <LoadingSpinner fullPage label="Đang tải thông tin khách sạn..." />;

  if (!hotel) {
    return (
      <div className="py-24 text-center space-y-4 font-sans">
        <h2 className="text-2xl font-bold text-gray-800">
          Không tìm thấy thông tin chỗ nghỉ
        </h2>
        <Button onClick={() => navigate("/hotels")}>Quay lại danh sách</Button>
      </div>
    );
  }

  // ─── 6. BÓC TÁCH HÌNH ẢNH THẬT TỪ DATABASE ───
  const getImageUrl = (item) => {
    if (!item) return "";
    if (typeof item === "string") return item;
    return item.url || item.path || item.image_url || item.src || "";
  };

  const dbImages = [];
  if (Array.isArray(hotel.images) && hotel.images.length > 0) {
    hotel.images.forEach((img) => {
      const u = getImageUrl(img);
      if (u) dbImages.push(u);
    });
  }
  if (dbImages.length === 0 && hotel.image) {
    const u = getImageUrl(hotel.image);
    if (u) dbImages.push(u);
  }

  // ─── 7. BÓC TÁCH TIỆN NGHI THẬT ───
  let realAmenities = [];
  if (Array.isArray(hotel.amenities)) {
    realAmenities = hotel.amenities.map((a) =>
      typeof a === "string" ? a : a.name || a.title || "",
    );
  } else if (typeof hotel.amenities === "string") {
    realAmenities = hotel.amenities.split(",").map((s) => s.trim());
  }

  if (realAmenities.length === 0) {
    realAmenities = [
      "Wi-Fi miễn phí",
      "Điều hòa nhiệt độ",
      "Dịch vụ phòng",
      "Lễ tân phục vụ 24/7",
    ];
  }

  // ════════════════════════════════════════════════════════════════════════════
  // 🌟 8. TÍNH TOÁN ĐỒNG BỘ ĐIỂM & ĐÁNH GIÁ THẬT (KHÔNG BỊ MÂU THUẪN)
  // ════════════════════════════════════════════════════════════════════════════
  const totalReviewsCount =
    reviews.length > 0 ? reviews.length : Number(hotel.review_count || 0);

  const averageScore =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + Number(r.rating || r.score || 10), 0) /
        reviews.length
      : Number(hotel.average_rating || hotel.rating || 0);

  const hasReviews = totalReviewsCount > 0 && averageScore > 0;
  const firstReview = reviews && reviews.length > 0 ? reviews[0] : null;

  const getRatingLabel = (score) => {
    if (score >= 9) return "Tuyệt vời";
    if (score >= 8) return "Rất tốt";
    if (score >= 7) return "Tốt";
    return "Hài lòng";
  };

  const breadcrumbs = [
    { label: "Trang chủ", link: "/" },
    { label: "Khách sạn", link: "/hotels" },
    {
      label: hotel.city || "Việt Nam",
      link: `/hotels?destination=${encodeURIComponent(hotel.city || "")}`,
    },
    { label: hotel.name },
  ];

  return (
    <div className="bg-[#f5f7fa] min-h-screen pb-20 font-sans text-gray-800">
      <div className="max-w-7xl mx-auto px-4 pt-3">
        {/* BREADCRUMB */}
        <Breadcrumb items={breadcrumbs} />

        {/* ─── HEADER: TÊN KHÁCH SẠN + ĐỊA CHỈ + NÚT ĐẶT ─── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-2 mb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
                {hotel.name}
              </h1>
              {hotel.star_rating > 0 && (
                <div className="flex text-amber-400">
                  {[...Array(Number(hotel.star_rating || 5))].map((_, i) => (
                    <Star key={i} size={15} fill="currentColor" />
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-xs text-gray-600">
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
                Xem bản đồ
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={handleToggleFavorite}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                isFavorite
                  ? "bg-rose-50 border-rose-200 text-rose-500"
                  : "bg-white border-gray-200 text-gray-400 hover:text-rose-500"
              }`}
            >
              <Heart size={18} fill={isFavorite ? "currentColor" : "none"} />
            </button>

            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                alert("Đã sao chép liên kết khách sạn!");
              }}
              className="p-2.5 rounded-xl border border-gray-200 bg-white text-gray-500 hover:text-[#006ce4] transition cursor-pointer"
            >
              <Share2 size={18} />
            </button>

            <button
              onClick={() =>
                roomsRef.current?.scrollIntoView({ behavior: "smooth" })
              }
              className="bg-[#ff5b00] hover:bg-[#e05000] text-white font-black px-7 py-2.5 rounded-xl shadow-md text-sm transition-transform active:scale-95 cursor-pointer"
            >
              Đặt ngay
            </button>
          </div>
        </div>

        {/* ─── 1. BENTO BOX GALLERY ẢNH THẬT TỪ DATABASE ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 mb-5">
          {/* CỤM ẢNH BÊN TRÁI (9 COLS) */}
          <div className="lg:col-span-9 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 h-[320px] md:h-[380px]">
              {/* Ảnh 1: Lớn */}
              <div className="md:col-span-8 rounded-2xl overflow-hidden bg-gray-200 relative flex items-center justify-center shadow-sm">
                {dbImages[0] ? (
                  <img
                    src={dbImages[0]}
                    alt={hotel.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-gray-400 flex flex-col items-center gap-2">
                    <ImageIcon size={32} />
                    <span className="text-xs font-semibold">Chưa có ảnh</span>
                  </div>
                )}
              </div>

              {/* Cột giữa: 2 ảnh xếp tầng */}
              <div className="md:col-span-4 grid grid-rows-2 gap-3 h-full">
                <div className="rounded-2xl overflow-hidden bg-gray-200 flex items-center justify-center shadow-sm">
                  {dbImages[1] ? (
                    <img
                      src={dbImages[1]}
                      alt="Ảnh 2"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-gray-400 text-xs font-medium">
                      Chưa có ảnh
                    </span>
                  )}
                </div>
                <div className="rounded-2xl overflow-hidden bg-gray-200 flex items-center justify-center shadow-sm">
                  {dbImages[2] ? (
                    <img
                      src={dbImages[2]}
                      alt="Ảnh 3"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-gray-400 text-xs font-medium">
                      Chưa có ảnh
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Hàng dưới: Ảnh phụ */}
            {dbImages.length > 3 && (
              <div className="grid grid-cols-5 gap-3 h-[90px] md:h-[105px]">
                {[3, 4, 5, 6, 7].map((slotIdx, i) => (
                  <div
                    key={slotIdx}
                    className="rounded-xl overflow-hidden bg-gray-200 relative flex items-center justify-center shadow-sm"
                  >
                    {dbImages[slotIdx] ? (
                      <img
                        src={dbImages[slotIdx]}
                        alt={`Ảnh ${slotIdx}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-gray-300 text-[10px]">Trống</span>
                    )}

                    {i === 4 && dbImages.length > 8 && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-black text-xs md:text-sm">
                        +{dbImages.length - 7} hình
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* CỤM BÊN PHẢI: BẢN ĐỒ + ĐÁNH GIÁ ĐỒNG BỘ (3 COLS) */}
          <div className="lg:col-span-3 flex flex-col gap-3">
            <div
              onClick={() =>
                window.open(
                  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    hotel.name + " " + (hotel.address || ""),
                  )}`,
                  "_blank",
                )
              }
              className="h-[180px] rounded-2xl overflow-hidden border border-gray-200 shadow-sm cursor-pointer relative bg-[#e5e3df] flex items-center justify-center group"
            >
              <div className="flex flex-col items-center justify-center gap-1">
                <MapPin
                  size={34}
                  className="text-red-600 fill-red-600 animate-bounce"
                />
                <span className="text-xs font-bold text-gray-800">
                  {hotel.city || "Xem vị trí"}
                </span>
                <span className="text-[10px] text-gray-500 underline">
                  Mở Google Maps
                </span>
              </div>
            </div>

            {/* 🌟 THẺ ĐÁNH GIÁ ĐỒNG BỘ LOGIC 100% 🌟 */}
            <div className="flex-1 bg-white rounded-2xl border border-gray-200 p-4 shadow-sm flex flex-col justify-between space-y-3">
              {hasReviews ? (
                /* TRƯỜNG HỢP: ĐÃ CÓ ĐÁNH GIÁ */
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="bg-[#2ea843] text-white font-black text-xs px-2 py-0.5 rounded">
                      {averageScore.toFixed(1)}
                    </span>
                    <span className="font-bold text-[#2ea843] text-sm">
                      {getRatingLabel(averageScore)}
                    </span>
                    <span className="text-xs text-gray-500">
                      ({totalReviewsCount} đánh giá)
                    </span>
                  </div>

                  <div
                    onClick={() =>
                      document
                        .getElementById("reviews-section")
                        ?.scrollIntoView({ behavior: "smooth" })
                    }
                    className="flex items-start justify-between gap-1 cursor-pointer group"
                  >
                    <p className="text-xs text-gray-700 line-clamp-3 leading-relaxed group-hover:text-[#006ce4] transition-colors">
                      {firstReview?.comment
                        ? `"${firstReview.comment}"`
                        : "Khách lưu trú đánh giá cao chất lượng phòng và dịch vụ tại đây."}
                    </p>
                    <ChevronRight
                      size={16}
                      className="text-gray-400 shrink-0 group-hover:text-[#006ce4] mt-1"
                    />
                  </div>

                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                    <span className="font-bold text-gray-800 truncate">
                      {firstReview?.user_name ||
                        firstReview?.user?.name ||
                        "Khách lưu trú"}
                    </span>
                    <button
                      onClick={() =>
                        document
                          .getElementById("reviews-section")
                          ?.scrollIntoView({ behavior: "smooth" })
                      }
                      className="text-xs text-[#006ce4] font-semibold hover:underline cursor-pointer"
                    >
                      Xem đánh giá &rarr;
                    </button>
                  </div>
                </div>
              ) : (
                /* TRƯỜNG HỢP: CHƯA CÓ ĐÁNH GIÁ NÀO */
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="bg-[#006ce4] text-white font-black text-xs px-2 py-0.5 rounded">
                      Mới
                    </span>
                    <span className="font-bold text-[#006ce4] text-sm">
                      Chỗ nghỉ mới
                    </span>
                    <span className="text-xs text-gray-400">(0 đánh giá)</span>
                  </div>

                  <p className="text-xs text-gray-500 leading-relaxed pt-1">
                    Chưa có nhận xét nào từ khách lưu trú. Hãy là người đầu tiên
                    đặt phòng và trải nghiệm!
                  </p>

                  <div className="pt-2 border-t border-gray-100">
                    <button
                      onClick={() =>
                        document
                          .getElementById("reviews-section")
                          ?.scrollIntoView({ behavior: "smooth" })
                      }
                      className="text-xs text-[#006ce4] font-semibold hover:underline cursor-pointer"
                    >
                      Viết đánh giá đầu tiên &rarr;
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ─── 2. THANH CHỌN NGÀY & SỐ KHÁCH ─── */}
        <div className="bg-white rounded-2xl p-3 border border-gray-200 shadow-sm mb-6 flex flex-col lg:flex-row items-center justify-between gap-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 w-full lg:flex-1">
            {/* Tên khách sạn / địa điểm */}
            <div ref={destRef} className="relative">
              <div
                onClick={() => setIsDestDropdownOpen(true)}
                className="flex items-center gap-2.5 px-3 py-2 bg-gray-50 hover:bg-orange-50/50 rounded-xl border border-gray-200 hover:border-orange-500 cursor-pointer transition"
              >
                <MapPin size={18} className="text-[#006ce4] shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onFocus={() => setIsDestDropdownOpen(true)}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleUpdateSearch()}
                  placeholder="Nhập tên khách sạn / địa điểm..."
                  className="w-full text-xs font-bold text-gray-900 bg-transparent focus:outline-none placeholder:font-normal placeholder:text-gray-400"
                />
              </div>

              {isDestDropdownOpen && (
                <div className="absolute left-0 top-full mt-2 w-full sm:w-[480px] bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 z-50 animate-in fade-in">
                  <h4 className="font-extrabold text-xs text-gray-900 mb-3">
                    Điểm đến phổ biến
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {HOT_DESTINATIONS.map((d) => (
                      <div
                        key={d.name}
                        onClick={() => {
                          setSearchQuery(d.name);
                          setIsDestDropdownOpen(false);
                          navigate(
                            `/hotels?destination=${encodeURIComponent(
                              d.name,
                            )}&checkIn=${format(
                              checkInDate,
                              "yyyy-MM-dd",
                            )}&checkOut=${format(
                              checkOutDate,
                              "yyyy-MM-dd",
                            )}&adults=${adults}`,
                          );
                        }}
                        className="p-2 rounded-xl hover:bg-orange-50 cursor-pointer transition"
                      >
                        <span className="text-xs font-bold text-gray-900 block">
                          {d.name}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {d.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Chọn ngày nhận / trả phòng */}
            <div
              ref={calendarRef}
              onClick={() => setIsCalendarOpen(!isCalendarOpen)}
              className="relative flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-orange-50/50 rounded-xl border border-gray-200 hover:border-orange-500 cursor-pointer transition select-none"
            >
              <div className="flex items-center gap-2">
                <CalendarIcon size={16} className="text-gray-400" />
                <span className="text-xs font-bold text-gray-900">
                  {checkInDate
                    ? format(checkInDate, "dd/MM/yyyy")
                    : "--/--/----"}
                </span>
              </div>

              <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                {totalNights} <Moon size={10} fill="currentColor" />
              </span>

              <span className="text-xs font-bold text-gray-900">
                {checkOutDate
                  ? format(checkOutDate, "dd/MM/yyyy")
                  : "--/--/----"}
              </span>

              {/* Lịch đôi 2 tháng */}
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
                        ? "👉 Nhấp chọn ngày trả phòng"
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

                  <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                    <span className="text-gray-500 font-medium">
                      * Chọn ngày nhận rồi chọn ngày trả
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsCalendarOpen(false)}
                      className="px-3.5 py-1.5 bg-[#ff5b00] text-white font-bold rounded-lg shadow-sm cursor-pointer"
                    >
                      Xong
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Số khách & phòng */}
            <div
              ref={guestRef}
              onClick={() => setIsGuestOpen(!isGuestOpen)}
              className="relative flex items-center gap-2.5 px-3 py-2 bg-gray-50 hover:bg-orange-50/50 rounded-xl border border-gray-200 hover:border-orange-500 cursor-pointer transition select-none"
            >
              <Users size={18} className="text-gray-400 shrink-0" />
              <span className="text-xs font-bold text-gray-900">
                {adults} người lớn, {roomsCount} phòng
              </span>

              {isGuestOpen && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute left-0 right-0 top-full mt-2 z-50 bg-white border border-gray-200 rounded-xl shadow-2xl p-4 space-y-3 cursor-default"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-700">
                      Người lớn
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setAdults((a) => Math.max(1, a - 1))}
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

                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-700">
                      Số phòng
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setRoomsCount((r) => Math.max(1, r - 1))}
                        className="w-7 h-7 rounded border border-gray-300 font-bold hover:bg-gray-100 cursor-pointer"
                      >
                        -
                      </button>
                      <span className="text-xs font-bold w-4 text-center">
                        {roomsCount}
                      </span>
                      <button
                        type="button"
                        onClick={() => setRoomsCount((r) => r + 1)}
                        className="w-7 h-7 rounded border border-gray-300 font-bold hover:bg-gray-100 cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsGuestOpen(false)}
                    className="w-full py-1.5 bg-[#ff5b00] text-white text-xs font-bold rounded-lg mt-2 cursor-pointer"
                  >
                    Áp dụng
                  </button>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleUpdateSearch}
            className="w-full lg:w-auto px-7 py-2.5 bg-[#ff5b00] hover:bg-[#e05000] text-white font-extrabold text-xs rounded-xl shadow-md transition active:scale-95 shrink-0 cursor-pointer"
          >
            Cập nhật
          </button>
        </div>

        {/* ─── 3. BẢNG GIÁ CÁC HẠNG PHÒNG THẬT TỪ DATABASE ─── */}
        <section ref={roomsRef} className="space-y-4 mb-10">
          <h2 className="text-xl font-black text-gray-900 tracking-tight">
            Bảng giá các hạng phòng
          </h2>

          {hotel.rooms && hotel.rooms.length > 0 ? (
            <div className="space-y-4">
              {hotel.rooms.map((room) => {
                const roomImg = getImageUrl(room.image || room.images?.[0]);
                const roomPricePerNight = Number(
                  room.base_price || room.sell_price || room.price || 0,
                );
                const totalRoomPrice = roomPricePerNight * totalNights;
                const points = Math.floor(totalRoomPrice / 100000);

                return (
                  <div
                    key={room.id}
                    className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden grid grid-cols-1 lg:grid-cols-12"
                  >
                    {/* THÔNG TIN PHÒNG */}
                    <div className="lg:col-span-4 p-5 bg-gray-50/50 border-r border-gray-100 flex flex-col justify-between space-y-4">
                      <div className="space-y-3">
                        <div className="w-full h-44 rounded-xl overflow-hidden bg-gray-200 flex items-center justify-center">
                          {roomImg ? (
                            <img
                              src={roomImg}
                              alt={room.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="text-gray-400 flex flex-col items-center gap-1">
                              <ImageIcon size={24} />
                              <span className="text-[11px]">
                                Chưa có ảnh phòng
                              </span>
                            </div>
                          )}
                        </div>
                        <div>
                          <h3 className="font-extrabold text-base text-gray-900">
                            {room.name || "Phòng nghỉ"}
                          </h3>
                          <div className="text-xs text-gray-500 space-y-1 mt-1.5 font-medium">
                            <p>🛏️ {room.bed_type || "1 giường đôi lớn"}</p>
                            <p>🌿 {room.view || "Hướng thành phố / vườn"}</p>
                            <p>
                              📐 Diện tích:{" "}
                              {room.size ? `${room.size} m²` : "Tiêu chuẩn"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* DỊCH VỤ & GIÁ TIỀN */}
                    <div className="lg:col-span-8 p-5 flex flex-col justify-between space-y-4">
                      <div className="space-y-3">
                        <div className="inline-flex items-center gap-1.5 bg-blue-50 text-[#006ce4] px-2.5 py-1 rounded-md text-[11px] font-black border border-blue-100">
                          <Sparkles size={13} />
                          <span>Ưu đãi tốt nhất hôm nay</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-700 pt-1">
                          <div className="flex items-center gap-2">
                            <Check
                              size={14}
                              className="text-emerald-600 shrink-0"
                            />
                            <span className="font-bold">
                              {room.breakfast_included ||
                              room.included_breakfast
                                ? "Gồm bữa ăn sáng"
                                : "Không gồm ăn sáng"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Check
                              size={14}
                              className="text-emerald-600 shrink-0"
                            />
                            <span>Wi-Fi miễn phí tốc độ cao</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Check
                              size={14}
                              className="text-emerald-600 shrink-0"
                            />
                            <span>Đã bao gồm thuế & tất cả các phí</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-500">
                            <Info size={14} className="shrink-0" />
                            <span>Miễn phí hủy phòng trước 48h</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-end justify-between pt-4 border-t border-gray-100 gap-3">
                        <div>
                          <span className="text-[11px] text-gray-400 block">
                            Giá {totalNights} đêm / 1 phòng
                          </span>
                          <span className="text-2xl font-black text-[#ff5b00]">
                            {totalRoomPrice > 0
                              ? formatVND(totalRoomPrice)
                              : "Liên hệ"}
                          </span>
                          {points > 0 && (
                            <span className="flex items-center gap-1 text-[11px] text-amber-600 font-bold mt-0.5">
                              <Coins size={12} /> Tích lũy {points} điểm
                            </span>
                          )}
                        </div>

                        <div className="space-y-1.5 text-right">
                          <button
                            onClick={() =>
                              navigate(
                                `/checkout?hotelId=${id}&roomId=${room.id}&amount=${totalRoomPrice}&checkIn=${format(
                                  checkInDate,
                                  "yyyy-MM-dd",
                                )}&checkOut=${format(
                                  checkOutDate,
                                  "yyyy-MM-dd",
                                )}&adults=${adults}`,
                              )
                            }
                            className="w-full sm:w-auto px-8 py-3 bg-[#ff5b00] hover:bg-[#e05000] text-white font-black text-sm rounded-xl shadow-lg transition active:scale-95 cursor-pointer"
                          >
                            Đặt ngay
                          </button>
                          <div className="flex items-center justify-end gap-1 text-[11px] text-emerald-600 font-bold">
                            <Zap size={13} />
                            <span>Xác nhận tức thì</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-gray-400">
              Hiện chưa có phòng trống cho chỗ nghỉ này.
            </div>
          )}
        </section>

        {/* ─── TIỆN NGHI THỰC TẾ TỪ DATABASE ─── */}
        <section className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm space-y-4 mb-8">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">
            Tiện nghi & Dịch vụ của chỗ nghỉ
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-y-3 gap-x-6 text-xs text-gray-700">
            {realAmenities.map((facility, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Check size={14} className="text-[#006ce4] shrink-0" />
                <span>{facility}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ─── QUY ĐỊNH THỰC TẾ CỦA CHỖ NGHỈ ─── */}
        <section className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm space-y-4 mb-8">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">
            Quy định nhận / trả phòng
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-700">
            <div className="flex items-start gap-2.5">
              <Clock size={16} className="text-[#006ce4] shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Thời gian quy định</span>
                <span>
                  Nhận phòng: từ {hotel.checkin_time || "14:00"} | Trả phòng:
                  trước {hotel.checkout_time || "12:00"}
                </span>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <ShieldCheck
                size={16}
                className="text-[#006ce4] shrink-0 mt-0.5"
              />
              <div>
                <span className="font-bold block">Giấy tờ tùy thân</span>
                <span>
                  Yêu cầu xuất trình CMND/CCCD hoặc Hộ chiếu khi làm thủ tục
                  nhận phòng.
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ─── ĐÁNH GIÁ THỰC TẾ ─── */}
        <section id="reviews-section" className="space-y-6">
          <ReviewList
            reviews={reviews}
            ratingSummary={{
              average_rating: averageScore,
              total_reviews: totalReviewsCount,
              star_counts: hotel.star_counts || {},
            }}
          />

          <ReviewForm
            hotelId={hotel.id}
            hotelName={hotel.name}
            onSubmitSuccess={fetchAllData}
          />
        </section>
      </div>
    </div>
  );
};

export default HotelDetailPage;
