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
  Building2,
  Palmtree,
  ClipboardList,
  Compass,
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
  airport_shuttle: "Xe đưa đón sân bay",
  bbq: "Khu vực nướng BBQ",
  kids_club: "Khu vui chơi trẻ em",
  tennis: "Sân Tennis",
  golf: "Sân Golf",
  jacuzzi: "Bồn tắm sục Jacuzzi",
  air_conditioner: "Điều hòa máy lạnh",
  tv_smart: "Smart TV màn hình phẳng",
};

const formatAmenityName = (item) => {
  if (!item) return "";
  if (typeof item === "object") {
    return item.label || item.name || item.title || "";
  }
  return AMENITY_MAP[item] || String(item).replace(/_/g, " ");
};

const formatCancellation = (policy) => {
  if (policy === "flexible_24h")
    return "Miễn phí hủy phòng trước 24 giờ nhận phòng";
  if (policy === "flexible_48h")
    return "Miễn phí hủy phòng trước 48 giờ nhận phòng";
  if (policy === "strict_7d") return "Hủy trước 7 ngày để được hoàn tiền";
  if (policy === "non_refundable") return "Không hoàn tiền khi hủy phòng";
  return "Hỗ trợ hủy phòng linh hoạt theo quy định chỗ nghỉ";
};

const HOT_DESTINATIONS = [
  { name: "Đà Nẵng", count: "Khách sạn & Resort" },
  { name: "Nha Trang", count: "Khách sạn ven biển" },
  { name: "Phú Quốc", count: "Khu nghỉ dưỡng cao cấp" },
  { name: "Đà Lạt", count: "Homestay & Khách sạn" },
  { name: "Vũng Tàu", count: "Khách sạn & Biệt thự" },
  { name: "Hà Nội", count: "Khách sạn trung tâm" },
];

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
      : item.url ||
        item.path ||
        item.image_url ||
        item.file_path ||
        item.preview ||
        item.src ||
        "";
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

const HotelDetailPage = () => {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  const today = startOfToday();

  // ─── 1. STATES ───
  const [searchQuery, setSearchQuery] = useState("");
  const [isDestDropdownOpen, setIsDestDropdownOpen] = useState(false);

  const initialCheckIn = searchParams.get("checkIn")
    ? new Date(searchParams.get("checkIn"))
    : today;
  const initialCheckOut = searchParams.get("checkOut")
    ? new Date(searchParams.get("checkOut"))
    : addDays(today, 1);

  const [checkInDate, setCheckInDate] = useState(initialCheckIn);
  const [checkOutDate, setCheckOutDate] = useState(initialCheckOut);
  const [adults, setAdults] = useState(Number(searchParams.get("adults")) || 2);
  const [roomsCount, setRoomsCount] = useState(1);

  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isGuestOpen, setIsGuestOpen] = useState(false);
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(today);
  const [hoverDate, setHoverDate] = useState(null);

  const destRef = useRef(null);
  const calendarRef = useRef(null);
  const guestRef = useRef(null);
  const roomsRef = useRef(null);

  const [hotel, setHotel] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);

  const formatVND = (price) =>
    Number(price || 0).toLocaleString("vi-VN") + " ₫";

  // ════════════════════════════════════════════════════════════════════════════
  // 🔍 2. FETCH TOÀN BỘ DỮ LIỆU
  // ════════════════════════════════════════════════════════════════════════════
  const fetchAllData = async () => {
    if (!id) return;
    setLoading(true);

    try {
      let hotelData = null;
      const cleanId = String(id).trim();

      const isDbId =
        /^[0-9a-fA-F-]{36}$/.test(cleanId) || /^\d+$/.test(cleanId);
      if (isDbId) {
        try {
          const hotelRes = await hotelService.getById(cleanId);
          hotelData = hotelRes?.data || hotelRes;
        } catch (e) {}
      }

      const localApps = JSON.parse(
        localStorage.getItem("pending_partner_applications") || "[]",
      );

      const foundApp = localApps.find((a) => {
        const aId = String(a.id || a.hotel_id || a.applicationId || "")
          .trim()
          .toLowerCase();
        const aName = String(a.name || a.hotelNameVi || "")
          .trim()
          .toLowerCase();
        return aId === cleanId.toLowerCase() || aName === cleanId.toLowerCase();
      });

      if (!hotelData || !hotelData.name) {
        if (foundApp) {
          hotelData = {
            id: foundApp.id || foundApp.applicationId || cleanId,
            name: foundApp.hotelNameVi || foundApp.name || "Khách sạn mới",
            address: foundApp.streetAddress || foundApp.address || "",
            city: foundApp.province || foundApp.city || "Việt Nam",
            star_rating: Number(foundApp.starRating) || 5,

            description: foundApp.description || "",
            policies: foundApp.policies || foundApp.customPolicies || [],
            experiences:
              foundApp.experiences || foundApp.nearbyExperiences || [],
            cancellationPolicy: foundApp.cancellationPolicy || "flexible_24h",
            checkin_time: foundApp.checkInFrom || "14:00",
            checkout_time: foundApp.checkOutTo || "12:00",

            amenities: foundApp.propertyAmenities || foundApp.amenities || [],
            image: foundApp.image || foundApp.hotelImages?.[0]?.url || "",
            images: foundApp.hotelImages || foundApp.images || [],
            rooms: foundApp.rooms || foundApp.roomTypes || [],
            average_rating: 0,
            review_count: 0,
          };
        }
      }

      if (hotelData) {
        const cleanHotelId = String(hotelData.id || "").trim();
        const cleanHotelName = String(hotelData.name || "")
          .trim()
          .toLowerCase();

        let allFoundRooms = [];
        const candidateKeys = [
          `hotel_rooms_${cleanId.toLowerCase()}`,
          `hotel_rooms_${cleanHotelId}`,
          `hotel_rooms_${cleanHotelName}`,
        ];

        if (foundApp) {
          if (foundApp.id)
            candidateKeys.push(`hotel_rooms_${String(foundApp.id).trim()}`);
          if (foundApp.applicationId)
            candidateKeys.push(
              `hotel_rooms_${String(foundApp.applicationId).trim()}`,
            );
        }

        for (const key of candidateKeys) {
          const saved = JSON.parse(localStorage.getItem(key) || "[]");
          if (Array.isArray(saved) && saved.length > allFoundRooms.length) {
            allFoundRooms = saved;
          }
        }

        if (allFoundRooms.length === 0) {
          for (let i = 0; i < localStorage.length; i++) {
            const storageKey = localStorage.key(i);
            if (storageKey && storageKey.startsWith("hotel_rooms_")) {
              const subKey = storageKey
                .replace("hotel_rooms_", "")
                .trim()
                .toLowerCase();
              if (
                subKey === cleanId.toLowerCase() ||
                subKey === cleanHotelId.toLowerCase() ||
                subKey === cleanHotelName
              ) {
                const parsed = JSON.parse(
                  localStorage.getItem(storageKey) || "[]",
                );
                if (
                  Array.isArray(parsed) &&
                  parsed.length > allFoundRooms.length
                ) {
                  allFoundRooms = parsed;
                }
              }
            }
          }
        }

        if (allFoundRooms.length === 0) {
          if (
            foundApp &&
            Array.isArray(foundApp.rooms) &&
            foundApp.rooms.length > 0
          ) {
            allFoundRooms = foundApp.rooms;
          } else if (
            Array.isArray(hotelData.rooms) &&
            hotelData.rooms.length > 0
          ) {
            allFoundRooms = hotelData.rooms;
          }
        }

        const normalizedRooms = allFoundRooms.map((r, idx) => ({
          id: r.id || `room-${idx + 1}`,
          name: r.name || r.roomName || `Phòng Hạng ${idx + 1}`,
          bed_type:
            r.bed_type || r.bedType || "1 Giường đôi lớn (King/Queen Size)",
          view: r.view || "Hướng thành phố / vườn",
          size: Number(r.room_area || r.size || r.roomSize || 28),
          base_price: Number(
            r.sell_price || r.weekdayPrice || r.price || r.base_price || 650000,
          ),
          sell_price: Number(
            r.sell_price || r.weekdayPrice || r.price || r.base_price || 650000,
          ),
          image: r.image || r.roomImages?.[0]?.url || r.roomImages?.[0] || "",
          breakfast_included: true,
        }));

        hotelData.rooms = normalizedRooms;
      }

      setHotel(hotelData);
      setSearchQuery(hotelData?.name || "");
      setIsFavorite(Boolean(hotelData?.is_favorite || hotelData?.isFavorite));
    } catch (err) {
      console.error("Lỗi xử lý khách sạn:", err);
    }

    try {
      if (
        hotelService?.getReviews &&
        (/^[0-9a-fA-F-]{36}$/.test(id) || /^\d+$/.test(id))
      ) {
        const reviewsRes = await hotelService.getReviews(id);
        const reviewsData = Array.isArray(reviewsRes)
          ? reviewsRes
          : reviewsRes?.data?.data || reviewsRes?.data || [];
        setReviews(reviewsData);
      } else {
        setReviews([]);
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

  // ─── 3. LOGIC LỊCH ĐÔI CHỌN NGÀY ───
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
    checkInDate && checkOutDate && isAfter(checkOutDate, checkInDate)
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
            if (isPast)
              btnClasses += "text-slate-300 font-normal cursor-not-allowed";
            else if (isStart && isEnd)
              btnClasses +=
                "bg-[#ff5b00] text-white rounded-lg z-10 font-black shadow-md";
            else if (isStart)
              btnClasses +=
                "bg-[#ff5b00] text-white rounded-l-lg z-10 font-black shadow-md " +
                (checkOutDate ? "rounded-r-none" : "rounded-r-lg");
            else if (isEnd)
              btnClasses +=
                "bg-[#ff5b00] text-white rounded-r-lg rounded-l-none z-10 font-black shadow-md";
            else if (isInRange || isHoverRange)
              btnClasses +=
                "bg-[#fff1e8] text-slate-900 font-bold hover:bg-[#ffe3d1]";
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
                onMouseEnter={() => !checkOutDate && setHoverDate(day)}
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

  // ════════════════════════════════════════════════════════════════════════════
  // ⚡ 4. HÀM CẬP NHẬT TÌM KIẾM (ĐÃ FIX: CHỈ CHUYỂN TRANG KHI BẤM CẬP NHẬT)
  // ════════════════════════════════════════════════════════════════════════════
  const handleUpdateSearch = () => {
    let activeIn = checkInDate || today;
    let activeOut = checkOutDate;

    if (
      !activeOut ||
      isBefore(activeOut, activeIn) ||
      isSameDay(activeOut, activeIn)
    ) {
      activeOut = addDays(activeIn, 1);
      setCheckOutDate(activeOut);
    }

    const inStr = safeFormat(activeIn, "yyyy-MM-dd");
    const outStr = safeFormat(activeOut, "yyyy-MM-dd");
    const trimmedQuery = (searchQuery || "").trim();
    const currentHotelName = (hotel?.name || "").trim();

    setIsCalendarOpen(false);
    setIsGuestOpen(false);
    setIsDestDropdownOpen(false);

    // 🛑 CHỈ KHI BẤM "CẬP NHẬT" VÀ TÊN KHÁC KHÁCH SẠN HIỆN TẠI MỚI CHUYỂN TRANG
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

    // Nếu cùng khách sạn, cập nhật URL params và cuộn xuống phòng
    setSearchParams({
      checkIn: inStr,
      checkOut: outStr,
      adults: adults.toString(),
    });

    roomsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

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

  if (loading)
    return <LoadingSpinner fullPage label="Đang tải thông tin khách sạn..." />;
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

  // ─── BỘ ẢNH ───
  const dbImages = [];
  if (Array.isArray(hotel.images) && hotel.images.length > 0) {
    hotel.images.forEach((img) => {
      const u = parseRealImageUrl(img);
      if (u && !dbImages.includes(u)) dbImages.push(u);
    });
  }
  if (hotel.image) {
    const u = parseRealImageUrl(hotel.image);
    if (u && !dbImages.includes(u)) dbImages.unshift(u);
  }
  if (Array.isArray(hotel.rooms)) {
    hotel.rooms.forEach((r) => {
      const rImg = parseRealImageUrl(r.image || r.images?.[0]);
      if (rImg && !dbImages.includes(rImg)) dbImages.push(rImg);
    });
  }

  const defaultFallbacks = [
    "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800",
    "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800",
    "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800",
  ];
  while (dbImages.length < 3) {
    dbImages.push(defaultFallbacks[dbImages.length]);
  }

  // ─── TIỆN NGHI ───
  let realAmenities = [];
  if (Array.isArray(hotel.amenities) && hotel.amenities.length > 0) {
    realAmenities = hotel.amenities.map((a) => {
      if (typeof a === "object") return a.label || a.name || a.title || "";
      return a;
    });
  }
  if (realAmenities.length === 0) {
    realAmenities = ["wifi", "parking", "24h_front_desk", "air_conditioner"];
  }

  const dynamicPolicies =
    Array.isArray(hotel.policies) && hotel.policies.length > 0
      ? hotel.policies
      : [];

  const dynamicExperiences =
    Array.isArray(hotel.experiences) && hotel.experiences.length > 0
      ? hotel.experiences
      : [];

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
    <div className="bg-[#f5f7fa] min-h-screen pb-20 font-sans text-slate-800">
      <div className="max-w-7xl mx-auto px-4 pt-3">
        <Breadcrumb items={breadcrumbs} />

        {/* ─── HEADER ─── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-2 mb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
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
                    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hotel.name + " " + (hotel.address || ""))}`,
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
              className={`p-2.5 rounded-xl border transition-all cursor-pointer ${isFavorite ? "bg-rose-50 border-rose-200 text-rose-500" : "bg-white border-slate-200 text-slate-400 hover:text-rose-500"}`}
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
              onClick={() =>
                roomsRef.current?.scrollIntoView({ behavior: "smooth" })
              }
              className="bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-stone-700 font-black px-7 py-2.5 rounded-xl shadow-md shadow-amber-500/20 text-sm transition-all active:scale-95 cursor-pointer"
            >
              Đặt ngay
            </button>
          </div>
        </div>

        {/* ─── 1. BENTO BOX GALLERY ─── */}
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
                  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hotel.name + " " + (hotel.address || ""))}`,
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
              {hasReviews ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="bg-[#2ea843] text-white font-black text-xs px-2 py-0.5 rounded">
                      {averageScore.toFixed(1)}
                    </span>
                    <span className="font-bold text-[#2ea843] text-sm">
                      {getRatingLabel(averageScore)}
                    </span>
                    <span className="text-xs text-slate-500">
                      ({totalReviewsCount} đánh giá)
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 line-clamp-3 leading-relaxed">
                    {firstReview?.comment
                      ? `"${firstReview.comment}"`
                      : "Khách lưu trú đánh giá cao chất lượng phòng và dịch vụ tại đây."}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="bg-[#006ce4] text-white font-black text-xs px-2 py-0.5 rounded">
                      Mới
                    </span>
                    <span className="font-bold text-[#006ce4] text-sm">
                      Chỗ nghỉ mới
                    </span>
                    <span className="text-xs text-slate-400">(0 đánh giá)</span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed pt-1">
                    Chưa có nhận xét nào từ khách lưu trú. Hãy là người đầu tiên
                    đặt phòng!
                  </p>
                </div>
              )}
              <div className="pt-2 border-t border-slate-100">
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
          </div>
        </div>

        {/* ─── 2. THANH TÌM KIẾM ĐỒNG BỘ ─── */}
        <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-md mb-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center">
            {/* Tên khách sạn */}
            <div ref={destRef} className="md:col-span-4 relative">
              <div
                onClick={() => setIsDestDropdownOpen(true)}
                className="flex items-center gap-2.5 px-3.5 h-12 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200 hover:border-orange-500 cursor-pointer transition"
              >
                <MapPin size={18} className="text-[#006ce4] shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onFocus={() => setIsDestDropdownOpen(true)}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleUpdateSearch()}
                  placeholder="Nhập tên khách sạn / địa điểm..."
                  className="w-full text-xs font-bold text-slate-800 bg-transparent focus:outline-none placeholder:font-normal placeholder:text-slate-400"
                />
              </div>

              {/* 🛑 KHI NHẤP ĐIỂM ĐẾN PHỔ BIẾN: CHỈ ĐIỀN CHỮ VÀO Ô, KHÔNG CHUYỂN TRANG NGAY */}
              {isDestDropdownOpen && (
                <div className="absolute left-0 top-full mt-2 w-full sm:w-[480px] bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 z-50 animate-in fade-in">
                  <h4 className="font-extrabold text-xs text-slate-900 mb-3">
                    Điểm đến phổ biến
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {HOT_DESTINATIONS.map((d) => (
                      <div
                        key={d.name}
                        onClick={() => {
                          setSearchQuery(d.name);
                          setIsDestDropdownOpen(false); // 👈 Đóng menu lại và chờ bấm nút Cập nhật
                        }}
                        className="p-2 rounded-xl hover:bg-orange-50 cursor-pointer transition"
                      >
                        <span className="text-xs font-bold text-slate-900 block">
                          {d.name}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {d.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Lịch đôi */}
            <div
              ref={calendarRef}
              onClick={() => setIsCalendarOpen(!isCalendarOpen)}
              className="md:col-span-4 relative flex items-center justify-between px-3.5 h-12 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200 hover:border-orange-500 cursor-pointer transition select-none"
            >
              <div className="flex items-center gap-2">
                <CalendarIcon size={16} className="text-slate-400" />
                <span className="text-xs font-bold text-slate-800">
                  {safeFormat(checkInDate, "dd/MM/yyyy") || "--/--/----"}
                </span>
              </div>
              <span className="text-[11px] font-black text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                {totalNights} <Moon size={10} fill="currentColor" />
              </span>
              <span className="text-xs font-bold text-slate-800">
                {safeFormat(checkOutDate, "dd/MM/yyyy") || "--/--/----"}
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

                    <span className="text-xs font-bold text-slate-500">
                      {!checkOutDate
                        ? "👉 Nhấp chọn ngày trả phòng"
                        : "✓ Đã chọn xong ngày"}
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

                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">
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

            {/* Khách & Phòng */}
            <div
              ref={guestRef}
              onClick={() => setIsGuestOpen(!isGuestOpen)}
              className="md:col-span-2 relative flex items-center gap-2 px-3 h-12 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200 hover:border-orange-500 cursor-pointer transition select-none"
            >
              <Users size={18} className="text-slate-400 shrink-0" />
              <span className="text-xs font-bold text-slate-800 truncate">
                {adults} khách, {roomsCount} phòng
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
                        onClick={() => setAdults((a) => Math.max(1, a - 1))}
                        className="w-7 h-7 rounded border border-slate-300 font-bold hover:bg-slate-100 cursor-pointer"
                      >
                        -
                      </button>
                      <span className="text-xs font-bold w-4 text-center">
                        {adults}
                      </span>
                      <button
                        type="button"
                        onClick={() => setAdults((a) => a + 1)}
                        className="w-7 h-7 rounded border border-slate-300 font-bold hover:bg-slate-100 cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-700">
                      Số phòng
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setRoomsCount((r) => Math.max(1, r - 1))}
                        className="w-7 h-7 rounded border border-slate-300 font-bold hover:bg-slate-100 cursor-pointer"
                      >
                        -
                      </button>
                      <span className="text-xs font-bold w-4 text-center">
                        {roomsCount}
                      </span>
                      <button
                        type="button"
                        onClick={() => setRoomsCount((r) => r + 1)}
                        className="w-7 h-7 rounded border border-slate-300 font-bold hover:bg-slate-100 cursor-pointer"
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

            {/* Nút Cập nhật */}
            <div className="md:col-span-2">
              <button
                type="button"
                onClick={handleUpdateSearch}
                className="w-full h-12 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-stone-700 font-black text-sm rounded-xl shadow-md shadow-amber-500/20 transition-all active:scale-95 flex items-center justify-center cursor-pointer"
              >
                Cập nhật
              </button>
            </div>
          </div>
        </div>

        {/* ─── 3. BẢNG GIÁ CÁC HẠNG PHÒNG ─── */}
        <section ref={roomsRef} className="space-y-4 mb-10">
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Bảng giá các hạng phòng ({hotel.rooms?.length || 0} Loại phòng)
          </h2>

          {hotel.rooms && hotel.rooms.length > 0 ? (
            <div className="space-y-4">
              {hotel.rooms.map((room, idx) => {
                const roomImg =
                  parseRealImageUrl(room.image || room.images?.[0]) ||
                  dbImages[idx] ||
                  dbImages[0];
                const roomPricePerNight = Number(
                  room.base_price || room.sell_price || room.price || 0,
                );
                const totalRoomPrice = roomPricePerNight * totalNights;
                const points = Math.floor(totalRoomPrice / 100000);

                return (
                  <div
                    key={room.id || idx}
                    className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden grid grid-cols-1 lg:grid-cols-12 hover:border-[#006ce4] transition-all"
                  >
                    <div className="lg:col-span-4 p-5 bg-slate-50/50 border-r border-slate-100 flex flex-col justify-between space-y-4">
                      <div className="space-y-3">
                        <div className="w-full h-44 rounded-xl overflow-hidden bg-slate-200 relative shadow-xs">
                          {roomImg ? (
                            <img
                              src={roomImg}
                              alt={room.name}
                              className="absolute inset-0 w-full h-full object-cover select-none"
                            />
                          ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-1">
                              <ImageIcon size={24} />
                              <span className="text-[11px]">Chưa có ảnh</span>
                            </div>
                          )}
                        </div>
                        <div>
                          <h3 className="font-extrabold text-base text-slate-900">
                            {room.name}
                          </h3>
                          <div className="text-xs text-slate-500 space-y-1 mt-1.5 font-medium">
                            <p>🛏️ {room.bed_type}</p>
                            <p>🌿 {room.view || "Hướng thành phố / vườn"}</p>
                            <p>📐 Diện tích: {room.size} m²</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="lg:col-span-8 p-5 flex flex-col justify-between space-y-4">
                      <div className="space-y-3">
                        <div className="inline-flex items-center gap-1.5 bg-blue-50 text-[#006ce4] px-2.5 py-1 rounded-md text-[11px] font-black border border-blue-100">
                          <Sparkles size={13} />
                          <span>Ưu đãi tốt nhất hôm nay</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-700 pt-1">
                          <div className="flex items-center gap-2">
                            <Check
                              size={14}
                              className="text-emerald-600 shrink-0"
                            />
                            <span className="font-bold">
                              {room.breakfast_included
                                ? "Gồm bữa ăn sáng"
                                : "Chưa gồm ăn sáng"}
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
                            <span>
                              {formatCancellation(hotel.cancellationPolicy)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-end justify-between pt-4 border-t border-slate-100 gap-3">
                        <div>
                          <span className="text-[11px] text-slate-400 block">
                            Giá {totalNights} đêm / 1 phòng
                          </span>
                          <span className="text-2xl font-black text-green-500">
                            {formatVND(totalRoomPrice)}
                          </span>
                         
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            navigate(
                              `/checkout?hotelId=${hotel.id}&roomId=${room.id}&amount=${totalRoomPrice}&checkIn=${safeFormat(checkInDate, "yyyy-MM-dd")}&checkOut=${safeFormat(checkOutDate, "yyyy-MM-dd")}&adults=${adults}`,
                            )
                          }
                          className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-stone-700 font-black text-sm rounded-xl shadow-lg shadow-amber-500/20 transition-all active:scale-95 cursor-pointer"
                        >
                          Đặt ngay
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400">
              Hiện chưa có phòng trống.
            </div>
          )}
        </section>

        {/* ─── 4. TIỆN NGHI ─── */}
        <section className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4 mb-8">
          <div className="flex items-center gap-2">
            <Palmtree className="text-slate-700" size={20} />
            <h2 className="text-lg font-black text-slate-900 tracking-tight">
              Tiện nghi & cơ sở vật chất
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-3.5 gap-x-6 text-xs text-slate-700 font-medium">
            {realAmenities.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2.5">
                <Check
                  size={15}
                  className="text-cyan-500 shrink-0 stroke-[2.5]"
                />
                <span>{formatAmenityName(item)}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ─── 5. THÔNG TIN KHÁCH SẠN ─── */}
        <section className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-3.5 mb-8">
          <div className="flex items-center gap-2">
            <Building2 className="text-slate-700" size={20} />
            <h2 className="text-lg font-black text-slate-900 tracking-tight">
              Thông tin khách sạn
            </h2>
          </div>

          <div className="text-xs sm:text-sm text-slate-700 leading-relaxed space-y-3 whitespace-pre-line">
            {typeof hotel.description === "string" && hotel.description ? (
              hotel.description
            ) : (
              <p>
                Tận hưởng kỳ nghỉ dưỡng tuyệt vời tại{" "}
                <strong>{hotel.name}</strong> tọa lạc tại{" "}
                {hotel.address ? `${hotel.address}, ` : ""}
                {hotel.city || "trung tâm thành phố"}. Cơ sở sở hữu không gian
                thoáng mát, tiện nghi đầy đủ và phong cách phục vụ chu đáo 24/7.
              </p>
            )}
          </div>
        </section>

        {/* ─── 6. QUY ĐỊNH CỦA CHỖ NGHỈ ─── */}
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
                  Từ {hotel.checkin_time || "14:00"}
                </strong>
              </div>
              <div className="flex items-center gap-3">
                <Clock size={16} className="text-slate-400 shrink-0" />
                <span className="w-44 font-semibold text-slate-500">
                  Thời gian trả phòng:
                </span>
                <strong className="text-slate-900 font-bold">
                  Trước {hotel.checkout_time || "12:00"}
                </strong>
              </div>
            </div>

            {dynamicPolicies.map((pol, idx) => {
              const pTitle =
                typeof pol === "object"
                  ? pol.title || `Quy định ${idx + 1}`
                  : `Quy định ${idx + 1}`;
              const pContent =
                typeof pol === "object" ? pol.content || "" : String(pol);
              return (
                <div
                  key={idx}
                  className="py-3.5 flex flex-col sm:flex-row items-start gap-3"
                >
                  <div className="flex items-center gap-2 w-44 shrink-0 font-semibold text-slate-500">
                    <Check
                      size={16}
                      className="text-cyan-500 shrink-0 stroke-[2.5]"
                    />
                    <span>{pTitle}</span>
                  </div>
                  <div className="flex-1 text-slate-700 leading-relaxed whitespace-pre-line">
                    {pContent}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ─── 7. TRẢI NGHIỆM PHẢI THỬ ─── */}
        {dynamicExperiences.length > 0 && (
          <section className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4 mb-8">
            <div className="flex items-center gap-2">
              <Compass className="text-slate-700" size={20} />
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                Trải nghiệm phải thử gần chỗ nghỉ
              </h2>
            </div>

            <div className="space-y-4 text-xs sm:text-sm text-slate-700 leading-relaxed">
              {dynamicExperiences.map((exp, idx) => {
                const eTitle =
                  typeof exp === "object"
                    ? exp.title || `Địa điểm ${idx + 1}`
                    : `Địa điểm ${idx + 1}`;
                const eContent =
                  typeof exp === "object" ? exp.content || "" : String(exp);
                return (
                  <div key={idx} className="space-y-1">
                    <h4 className="font-extrabold text-slate-900 text-sm">
                      {eTitle}
                    </h4>
                    <p className="text-slate-600 whitespace-pre-line leading-relaxed">
                      {eContent}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ─── 8. ĐÁNH GIÁ ─── */}
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
