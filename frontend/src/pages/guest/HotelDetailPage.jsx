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
  differenceInHours,
  addDays,
  addHours,
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

  // 1. STATE BỘ LỌC TÌM KIẾM
  const [rentalType, setRentalType] = useState(
    searchParams.get("rentalType") || "HOUR",
  );
  const [checkInTime, setCheckInTime] = useState(
    searchParams.get("checkInTime") || "12:00",
  );
  const [checkOutTime, setCheckOutTime] = useState(
    searchParams.get("checkOutTime") || "14:00",
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
  const [activeDatePicker, setActiveDatePicker] = useState(null);
  const [calendarMonth, setCalendarMonth] = useState(today);

  // Tooltip chi tiết giá từng giờ
  const [hoveredPriceRoomId, setHoveredPriceRoomId] = useState(null);

  const calendarRef = useRef(null);
  const datePickerPopupRef = useRef(null);
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

  // Giờ quy định khách sạn
  const hotelPolicies = useMemo(() => {
    return {
      dailyIn: String(hotel?.checkin_time || "14:00").slice(0, 5),
      dailyOut: String(hotel?.checkout_time || "12:00").slice(0, 5),
      overnightIn: String(
        hotel?.overnight_checkin_time || hotel?.overnight_checkin || "22:00",
      ).slice(0, 5),
      overnightOut: String(
        hotel?.overnight_checkout_time || hotel?.overnight_checkout || "12:00",
      ).slice(0, 5),
      halfdayIn: String(
        hotel?.halfday_checkin_time || hotel?.halfday_checkin || "12:00",
      ).slice(0, 5),
      halfdayOut: String(
        hotel?.halfday_checkout_time || hotel?.halfday_checkout || "21:00",
      ).slice(0, 5),
    };
  }, [hotel]);

  // Tính toán thời gian nhận và trả
  const checkOutInfo = useMemo(() => {
    const [hStr, mStr] = checkInTime.split(":");
    const inHour = parseInt(hStr || "12", 10);
    const inMinute = parseInt(mStr || "00", 10);

    const inDateTime = new Date(checkInDate);
    inDateTime.setHours(inHour, inMinute, 0, 0);

    let outDateTime = new Date(checkOutDate);
    let outTimeStr = checkOutTime;

    if (rentalType === "HOUR") {
      outDateTime = addHours(inDateTime, hoursCount);
      outTimeStr = `${String(outDateTime.getHours()).padStart(2, "0")}:${String(outDateTime.getMinutes()).padStart(2, "0")}`;
      return {
        badge: `${hoursCount} Giờ`,
        displayRange: `${checkInTime}, ${format(inDateTime, "dd 'Thg' MM", { locale: vi })} - ${outTimeStr}, ${format(outDateTime, "dd 'Thg' MM", { locale: vi })}`,
        inDateTime,
        outDateTime,
        outTimeStr,
      };
    }

    const [outH, outM] = checkOutTime.split(":").map(Number);
    outDateTime.setHours(outH || 12, outM || 0, 0, 0);

    const diffDays = Math.max(0, differenceInDays(outDateTime, inDateTime));
    const totalHours = Math.max(0, differenceInHours(outDateTime, inDateTime));

    let badge = `${Math.max(1, diffDays)} Ngày`;
    if (rentalType === "OVERNIGHT") {
      badge = diffDays > 1 ? `${diffDays} Đêm` : "1 Đêm";
    } else if (rentalType === "HALF_DAY") {
      if (totalHours > 9) {
        const extraH = totalHours - 9;
        badge = `1 Buổi ${extraH} Giờ`;
      } else {
        badge = "1 Buổi";
      }
    }

    return {
      badge,
      displayRange: `${checkInTime}, ${format(inDateTime, "dd 'Thg' MM", { locale: vi })} - ${checkOutTime}, ${format(outDateTime, "dd 'Thg' MM", { locale: vi })}`,
      inDateTime,
      outDateTime,
      outTimeStr,
      totalHours,
      diffDays,
    };
  }, [
    rentalType,
    checkInTime,
    checkOutTime,
    checkInDate,
    checkOutDate,
    hoursCount,
  ]);

  const durationSummary = checkOutInfo;

  const handleTabChange = useCallback(
    (type) => {
      setRentalType(type);
      if (type === "HOUR") {
        setCheckInTime("12:00");
        setHoursCount(2);
        setCheckOutDate(checkInDate);
      } else if (type === "DAY") {
        setCheckInTime(hotelPolicies.dailyIn || "14:00");
        setCheckOutTime(hotelPolicies.dailyOut || "12:00");
        setCheckOutDate(addDays(checkInDate, 1));
      } else if (type === "OVERNIGHT") {
        setCheckInTime(hotelPolicies.overnightIn || "22:00");
        setCheckOutTime(hotelPolicies.overnightOut || "12:00");
        setCheckOutDate(addDays(checkInDate, 1));
      } else if (type === "HALF_DAY") {
        setCheckInTime(hotelPolicies.halfdayIn || "12:00");
        setCheckOutTime(hotelPolicies.halfdayOut || "21:00");
        setCheckOutDate(addDays(checkInDate, 1));
      }
    },
    [checkInDate, hotelPolicies],
  );

  const fetchRoomAvailability = useCallback(
    async (cIn, cOut, adCount) => {
      if (!id) return;
      setCheckingRooms(true);
      try {
        const res = await apiClient.get(`/hotels/${id}/availability`, {
          params: {
            checkIn: safeFormatDate(cIn, "yyyy-MM-dd"),
            checkOut: safeFormatDate(cOut, "yyyy-MM-dd"),
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
        setIsFavorite(Boolean(hotelData.is_favorite));

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
  }, [id]);

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
        setActiveDatePicker(null);
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
    setActiveDatePicker(null);

    setSearchParams({
      checkIn: safeFormatDate(finalIn, "yyyy-MM-dd"),
      checkOut: safeFormatDate(finalOut, "yyyy-MM-dd"),
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

  // TÍNH GIÁ PHÒNG
  const calculateRoomPricing = useCallback(
    (room) => {
      const baseDailyPrice = Number(
        room.base_price || room.sell_price || 650000,
      );
      const firstHourPrice =
        Number(room.hourly_price) > 0
          ? Number(room.hourly_price)
          : Math.round(baseDailyPrice * 0.25);

      // 1. THEO GIỜ
      if (rentalType === "HOUR") {
        const hourlyBreakdown = [];
        let total = 0;

        for (let i = 0; i < hoursCount; i++) {
          const curHDate = addHours(checkOutInfo.inDateTime, i);
          const hourLabel = `${format(curHDate, "HH:mm, dd 'Thg' MM", { locale: vi })}`;
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

          hourlyBreakdown.push({
            label: hourLabel,
            price: curHPrice,
          });
          total += curHPrice;
        }

        return {
          totalPrice: total * rooms,
          unitPrice: total,
          hourlyBreakdown,
          label: `${hoursCount} Giờ`,
        };
      }

      const isAutoSurcharge =
        room.auto_surcharge !== undefined ? Boolean(room.auto_surcharge) : true;
      const surchargeType = room.surcharge_type || "tiered";

      const earlyFixedRate =
        Number(room.early_checkin_fee) > 0
          ? Number(room.early_checkin_fee)
          : Number(room.hourly_price) > 0
            ? Number(room.hourly_price)
            : 200000;

      const lateFixedRate =
        Number(room.late_checkout_fee) > 0
          ? Number(room.late_checkout_fee)
          : Number(room.hourly_price) > 0
            ? Number(room.hourly_price)
            : 200000;

      const earlyTiers = (
        Array.isArray(room.early_surcharge_tiers) &&
        room.early_surcharge_tiers.length > 0
          ? room.early_surcharge_tiers
          : [
              { hours: 1, percent: 10 },
              { hours: 2, percent: 30 },
            ]
      ).sort((a, b) => Number(a.hours) - Number(b.hours));

      const lateTiers = (
        Array.isArray(room.late_surcharge_tiers) &&
        room.late_surcharge_tiers.length > 0
          ? room.late_surcharge_tiers
          : [
              { hours: 1, percent: 10 },
              { hours: 2, percent: 30 },
            ]
      ).sort((a, b) => Number(a.hours) - Number(b.hours));

      const calcFee = (extraHours, type) => {
        if (!isAutoSurcharge || extraHours <= 0) return 0;
        if (surchargeType === "hourly") {
          const rate = type === "early" ? earlyFixedRate : lateFixedRate;
          return extraHours * rate;
        }

        if (surchargeType === "tiered") {
          const tiers = type === "early" ? earlyTiers : lateTiers;
          const maxTier = tiers[tiers.length - 1];

          if (maxTier && extraHours > Number(maxTier.hours)) {
            const baseTierFee = Math.round(
              (baseDailyPrice * Number(maxTier.percent)) / 100,
            );
            const extraRemainingHours = extraHours - Number(maxTier.hours);
            const rate = type === "early" ? earlyFixedRate : lateFixedRate;
            return baseTierFee + extraRemainingHours * rate;
          }

          const exactMatch = [...tiers]
            .reverse()
            .find((t) => extraHours >= Number(t.hours));
          if (exactMatch) {
            return Math.round(
              (baseDailyPrice * Number(exactMatch.percent)) / 100,
            );
          }
        }

        const rate = type === "early" ? earlyFixedRate : lateFixedRate;
        return extraHours * rate;
      };

      // 2. THEO BUỔI
      if (rentalType === "HALF_DAY") {
        const baseHalfPrice = Number(
          room.half_day_price || Math.round(baseDailyPrice * 0.8),
        );
        const hourlyBreakdown = [];

        const dayLabel = `${format(checkOutInfo.inDateTime, "eeee, dd 'Thg' MM", { locale: vi })}`;
        hourlyBreakdown.push({
          label: dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1),
          price: baseHalfPrice,
        });

        let total = baseHalfPrice;

        const stdHalfIn = parseInt(hotelPolicies.halfdayIn.slice(0, 2), 10);
        const stdHalfOut = parseInt(hotelPolicies.halfdayOut.slice(0, 2), 10);

        const actualInHour = parseInt(checkInTime.slice(0, 2), 10);
        const actualOutHour = parseInt(checkOutTime.slice(0, 2), 10);

        if (actualInHour < stdHalfIn) {
          const earlyHours = stdHalfIn - actualInHour;
          const earlyFee = calcFee(earlyHours, "early");
          if (earlyFee > 0) {
            hourlyBreakdown.push({
              label: `Nhận sớm ${earlyHours} giờ`,
              price: earlyFee,
            });
            total += earlyFee;
          }
        }

        const diffDays = differenceInDays(
          checkOutInfo.outDateTime,
          checkOutInfo.inDateTime,
        );

        let lateHours = 0;
        if (diffDays === 0) {
          if (actualOutHour > stdHalfOut) {
            lateHours = actualOutHour - stdHalfOut;
          }
        } else {
          lateHours = 24 - stdHalfOut + actualOutHour + (diffDays - 1) * 24;
        }

        if (lateHours > 0) {
          const lateFee = calcFee(lateHours, "late");
          if (lateFee > 0) {
            hourlyBreakdown.push({
              label: `Trả muộn ${lateHours} giờ`,
              price: lateFee,
            });
            total += lateFee;
          }
        }

        return {
          totalPrice: total * rooms,
          unitPrice: total,
          hourlyBreakdown,
          label: checkOutInfo.badge,
        };
      }

      // 3. QUA ĐÊM
      if (rentalType === "OVERNIGHT") {
        const overnightPrice = Number(room.overnight_price || baseDailyPrice);
        const hourlyBreakdown = [];

        const dayLabel = `${format(checkOutInfo.inDateTime, "eeee, dd 'Thg' MM", { locale: vi })}`;
        hourlyBreakdown.push({
          label: dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1),
          price: overnightPrice,
        });

        let total = overnightPrice;

        const stdInHour = parseInt(hotelPolicies.overnightIn.slice(0, 2), 10);
        const stdOutHour = parseInt(hotelPolicies.overnightOut.slice(0, 2), 10);

        const actualInHour = parseInt(checkInTime.slice(0, 2), 10);
        const actualOutHour = parseInt(checkOutTime.slice(0, 2), 10);

        if (actualInHour < stdInHour) {
          const earlyHours = stdInHour - actualInHour;
          const earlyFee = calcFee(earlyHours, "early");
          if (earlyFee > 0) {
            hourlyBreakdown.push({
              label: `Nhận sớm ${earlyHours} giờ`,
              price: earlyFee,
            });
            total += earlyFee;
          }
        }

        const diffDays = differenceInDays(
          checkOutInfo.outDateTime,
          checkOutInfo.inDateTime,
        );

        let lateHours = 0;
        if (diffDays <= 1) {
          if (actualOutHour > stdOutHour) {
            lateHours = actualOutHour - stdOutHour;
          }
        } else {
          lateHours = actualOutHour - stdOutHour + (diffDays - 1) * 24;
        }

        if (lateHours > 0) {
          const lateFee = calcFee(lateHours, "late");
          if (lateFee > 0) {
            hourlyBreakdown.push({
              label: `Trả muộn ${lateHours} giờ`,
              price: lateFee,
            });
            total += lateFee;
          }
        }

        return {
          totalPrice: total * rooms,
          unitPrice: total,
          hourlyBreakdown,
          label: "Qua đêm",
        };
      }

      // 4. THEO NGÀY
      const stdDailyIn = parseInt(hotelPolicies.dailyIn.slice(0, 2), 10);
      const stdDailyOut = parseInt(hotelPolicies.dailyOut.slice(0, 2), 10);

      const actualInHour = parseInt(checkInTime.slice(0, 2), 10);
      const actualOutHour = parseInt(checkOutTime.slice(0, 2), 10);

      const totalDays = Math.max(
        1,
        differenceInDays(checkOutInfo.outDateTime, checkOutInfo.inDateTime),
      );
      const totalDaysPrice = baseDailyPrice * totalDays;
      const hourlyBreakdown = [];

      const dayLabel = `${format(checkOutInfo.inDateTime, "eeee, dd 'Thg' MM", { locale: vi })}`;
      hourlyBreakdown.push({
        label: `${dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1)} (${totalDays} ngày)`,
        price: totalDaysPrice,
      });

      let total = totalDaysPrice;

      if (actualInHour < stdDailyIn) {
        const earlyHours = stdDailyIn - actualInHour;
        const earlyFee = calcFee(earlyHours, "early");
        if (earlyFee > 0) {
          hourlyBreakdown.push({
            label: `Nhận sớm ${earlyHours} giờ`,
            price: earlyFee,
          });
          total += earlyFee;
        }
      }

      if (actualOutHour > stdDailyOut) {
        const lateHours = actualOutHour - stdDailyOut;
        const lateFee = calcFee(lateHours, "late");
        if (lateFee > 0) {
          hourlyBreakdown.push({
            label: `Trả muộn ${lateHours} giờ`,
            price: lateFee,
          });
          total += lateFee;
        }
      }

      return {
        totalPrice: total * rooms,
        unitPrice: total,
        hourlyBreakdown,
        label: `${totalDays} Ngày`,
      };
    },
    [
      rentalType,
      hoursCount,
      checkOutInfo,
      checkInTime,
      checkOutTime,
      hotelPolicies,
      rooms,
    ],
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
    if (!isAuthenticated)
      return alert("Vui lòng đăng nhập để lưu khách sạn yêu thích!");
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

        {/* BENTO GALLERY NGUYÊN BẢN */}
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

        {/* 🌟 THANH TÌM KIẾM NGANG ĐÃ ĐƯỢC MỞ RỘNG BỀ NGANG THÊNH THANG: md:col-span-7 🌟 */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-md mb-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center">
            {/* Ô 1: Nhập tên chỗ nghỉ (Gọn gàng md:col-span-3) */}
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

            {/* Ô 2: Ô LỊCH MỞ RỘNG RÃI md:col-span-7 (HIỂN THỊ ĐỦ CẢ NHẬN VÀ TRẢ) */}
            <div ref={calendarRef} className="relative md:col-span-7">
              <div
                onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                className="bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200 px-3 py-2 h-12 cursor-pointer flex items-center justify-between hover:border-[#003580] transition select-none gap-2"
              >
                {/* 1. KHỐI NHẬN */}
                <div className="flex items-center gap-2 shrink-0">
                  <CalendarIcon size={16} className="text-[#003580] shrink-0" />
                  <div>
                    <span className="text-[10px] font-black text-slate-500 block leading-tight whitespace-nowrap">
                      {rentalType === "HOUR"
                        ? `Bắt đầu (${checkInTime})`
                        : `Nhận (${checkInTime})`}
                    </span>
                    <span className="text-xs font-black text-slate-900 leading-none whitespace-nowrap">
                      {safeFormatDate(checkInDate, "dd/MM/yyyy")}
                    </span>
                  </div>
                </div>

                {/* 2. HUY HIỆU THỜI LƯỢNG */}
                <div className="text-[11px] font-black text-[#003580] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap">
                  {checkOutInfo.badge}
                </div>

                {/* 3. KHỐI TRẢ (HIỆN RÕ RÀNG KHÔNG BỊ CẮT CHỮ NỮA) */}
                <div className="flex items-center gap-2 shrink-0">
                  <CalendarIcon size={16} className="text-[#003580] shrink-0" />
                  <div>
                    <span className="text-[10px] font-black text-slate-500 block leading-tight whitespace-nowrap">
                      {rentalType === "HOUR"
                        ? `Kết thúc (${checkOutInfo.outTimeStr})`
                        : `Trả (${checkOutTime})`}
                    </span>
                    <span className="text-xs font-black text-slate-900 leading-none whitespace-nowrap">
                      {safeFormatDate(
                        rentalType === "HOUR"
                          ? checkOutInfo.outDateTime
                          : checkOutDate,
                        "dd/MM/yyyy",
                      )}
                    </span>
                  </div>
                </div>

                {/* 4. KHỐI KHÁCH & PHÒNG */}
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

              {/* POPUP CHỌN GIỜ & PHÒNG */}
              {isCalendarOpen && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute left-0 top-full mt-2 z-50 bg-white rounded-3xl shadow-2xl border border-slate-200 p-5 w-[340px] sm:w-[370px] space-y-4 animate-in fade-in cursor-default"
                >
                  <div className="grid grid-cols-4 gap-1 p-1 bg-[#eef1f6] rounded-2xl">
                    <button
                      type="button"
                      onClick={() => handleTabChange("HOUR")}
                      className={`py-2 px-1 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
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
                      className={`py-2 px-1 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
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
                      className={`py-2 px-1 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
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
                      className={`py-2 px-1 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
                        rentalType === "HALF_DAY"
                          ? "bg-[#006ce4] text-white shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <Hourglass size={14} /> <span>Buổi</span>
                    </button>
                  </div>

                  {/* NHẬN PHÒNG */}
                  <div className="space-y-1.5 pt-1">
                    <label className="text-xs font-bold text-slate-800 block">
                      Nhận phòng
                    </label>
                    <div className="grid grid-cols-12 gap-2">
                      <div className="col-span-4 relative">
                        <select
                          value={checkInTime}
                          onChange={(e) => setCheckInTime(e.target.value)}
                          className="w-full h-11 px-3 bg-white border border-[#006ce4] rounded-xl text-xs font-semibold text-slate-800 outline-none appearance-none cursor-pointer"
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
                        <ChevronDown
                          size={15}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
                        />
                      </div>

                      <div className="col-span-8 relative">
                        <button
                          type="button"
                          onClick={() =>
                            setActiveDatePicker(
                              activeDatePicker === "checkIn" ? null : "checkIn",
                            )
                          }
                          className="w-full h-11 px-3 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 flex items-center justify-between outline-none cursor-pointer hover:border-slate-400"
                        >
                          <span className="truncate">
                            {format(checkInDate, "eee, dd 'Thg' M, yyyy", {
                              locale: vi,
                            })}
                          </span>
                          <ChevronDown
                            size={15}
                            className="text-slate-500 shrink-0 ml-1"
                          />
                        </button>
                      </div>
                    </div>
                  </div>

                  {rentalType === "HOUR" ? (
                    <div className="space-y-1.5 pt-1">
                      <label className="text-xs font-bold text-slate-800 block">
                        Thời gian lưu trú
                      </label>
                      <div className="flex items-stretch border border-slate-300 rounded-xl h-11 overflow-hidden bg-white">
                        <button
                          type="button"
                          onClick={() =>
                            setHoursCount((prev) => Math.max(1, prev - 1))
                          }
                          className="w-12 flex items-center justify-center text-slate-600 hover:bg-slate-50 border-r border-slate-300 active:bg-slate-100 cursor-pointer transition select-none"
                        >
                          <Minus size={16} />
                        </button>

                        <div className="flex-1 flex items-center justify-center font-extrabold text-xs text-slate-900 select-none">
                          {hoursCount} Giờ
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setHoursCount((prev) => Math.min(24, prev + 1))
                          }
                          className="w-12 flex items-center justify-center text-slate-600 hover:bg-slate-50 border-l border-slate-300 active:bg-slate-100 cursor-pointer transition select-none"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-1.5 pt-1">
                        <label className="text-xs font-bold text-slate-800 block">
                          Trả phòng
                        </label>
                        <div className="grid grid-cols-12 gap-2">
                          <div className="col-span-4 relative">
                            <select
                              value={checkOutTime}
                              onChange={(e) => setCheckOutTime(e.target.value)}
                              className="w-full h-11 px-3 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 outline-none appearance-none cursor-pointer"
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
                            <ChevronDown
                              size={15}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
                            />
                          </div>

                          <div className="col-span-8 relative">
                            <button
                              type="button"
                              onClick={() =>
                                setActiveDatePicker(
                                  activeDatePicker === "checkOut"
                                    ? null
                                    : "checkOut",
                                )
                              }
                              className="w-full h-11 px-3 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 flex items-center justify-between outline-none cursor-pointer hover:border-slate-400"
                            >
                              <span className="truncate">
                                {format(checkOutDate, "eee, dd 'Thg' M, yyyy", {
                                  locale: vi,
                                })}
                              </span>
                              <ChevronDown
                                size={15}
                                className="text-slate-500 shrink-0 ml-1"
                              />
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="w-full py-2.5 bg-[#eef5ff] text-[#006ce4] font-black text-xs text-center rounded-xl select-none">
                        {checkOutInfo.badge}
                      </div>
                    </>
                  )}

                  {/* POPUP LỊCH THÁNG */}
                  {activeDatePicker && (
                    <div
                      ref={datePickerPopupRef}
                      className="p-3.5 bg-white border border-slate-200 rounded-2xl shadow-xl animate-fadeIn"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-[#006ce4]">
                          {activeDatePicker === "checkIn"
                            ? "Chọn ngày nhận:"
                            : "Chọn ngày trả:"}{" "}
                          {format(calendarMonth, "'Tháng' MM/yyyy", {
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
                            <ChevronLeft size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setCalendarMonth((p) => addMonths(p, 1))
                            }
                            className="p-1 hover:bg-slate-100 rounded cursor-pointer"
                          >
                            <ChevronRight size={15} />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-7 gap-1 text-center text-[10px]">
                        {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map(
                          (d, idx) => (
                            <span
                              key={d}
                              className={`font-bold py-0.5 ${idx >= 5 ? "text-blue-600" : "text-slate-600"}`}
                            >
                              {d}
                            </span>
                          ),
                        )}
                        {Array.from({
                          length: (getDay(startOfMonth(calendarMonth)) + 6) % 7,
                        }).map((_, i) => (
                          <div key={`blank-${i}`} className="h-6" />
                        ))}
                        {eachDayOfInterval({
                          start: startOfMonth(calendarMonth),
                          end: endOfMonth(calendarMonth),
                        }).map((dayItem) => {
                          const isPast = isBefore(dayItem, today);
                          const isSelected = isSameDay(
                            dayItem,
                            activeDatePicker === "checkIn"
                              ? checkInDate
                              : checkOutDate,
                          );
                          return (
                            <button
                              key={dayItem.toISOString()}
                              type="button"
                              disabled={isPast}
                              onClick={() => {
                                if (activeDatePicker === "checkIn") {
                                  setCheckInDate(dayItem);
                                  if (isBefore(checkOutDate, dayItem)) {
                                    setCheckOutDate(addDays(dayItem, 1));
                                  }
                                } else {
                                  if (isBefore(dayItem, checkInDate)) {
                                    setCheckInDate(dayItem);
                                    setCheckOutDate(addDays(dayItem, 1));
                                  } else {
                                    setCheckOutDate(dayItem);
                                  }
                                }
                                setActiveDatePicker(null);
                              }}
                              className={`h-6 w-full flex items-center justify-center rounded font-bold text-[10px] transition ${
                                isPast
                                  ? "text-slate-300 cursor-not-allowed"
                                  : isSelected
                                    ? "bg-[#006ce4] text-white shadow"
                                    : "hover:bg-slate-100 text-slate-800"
                              }`}
                            >
                              {format(dayItem, "d")}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* NGƯỜI LỚN */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs font-bold text-slate-800">
                      Người lớn
                    </span>
                    <div className="flex items-stretch border border-slate-300 rounded-xl h-10 w-32 overflow-hidden bg-white">
                      <button
                        type="button"
                        onClick={() =>
                          setAdults((prev) => Math.max(1, prev - 1))
                        }
                        className="w-10 flex items-center justify-center text-slate-600 hover:bg-slate-50 border-r border-slate-300 active:bg-slate-100 cursor-pointer transition select-none"
                      >
                        <Minus size={14} />
                      </button>
                      <div className="flex-1 flex items-center justify-center font-bold text-xs text-slate-900 select-none">
                        {adults}
                      </div>
                      <button
                        type="button"
                        onClick={() => setAdults((prev) => prev + 1)}
                        className="w-10 flex items-center justify-center text-slate-600 hover:bg-slate-50 border-l border-slate-300 active:bg-slate-100 cursor-pointer transition select-none"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>

                  {/* TRẺ EM */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">
                      Trẻ em
                    </span>
                    <div className="flex items-stretch border border-slate-300 rounded-xl h-10 w-32 overflow-hidden bg-white">
                      <button
                        type="button"
                        onClick={() =>
                          setChildren((prev) => Math.max(0, prev - 1))
                        }
                        className="w-10 flex items-center justify-center text-slate-600 hover:bg-slate-50 border-r border-slate-300 active:bg-slate-100 cursor-pointer transition select-none"
                      >
                        <Minus size={14} />
                      </button>
                      <div className="flex-1 flex items-center justify-center font-bold text-xs text-slate-900 select-none">
                        {children}
                      </div>
                      <button
                        type="button"
                        onClick={() => setChildren((prev) => prev + 1)}
                        className="w-10 flex items-center justify-center text-slate-600 hover:bg-slate-50 border-l border-slate-300 active:bg-slate-100 cursor-pointer transition select-none"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>

                  {/* SỐ PHÒNG */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">
                      Số phòng
                    </span>
                    <div className="flex items-stretch border border-slate-300 rounded-xl h-10 w-32 overflow-hidden bg-white">
                      <button
                        type="button"
                        onClick={() =>
                          setRooms((prev) => Math.max(1, prev - 1))
                        }
                        className="w-10 flex items-center justify-center text-slate-600 hover:bg-slate-50 border-r border-slate-300 active:bg-slate-100 cursor-pointer transition select-none"
                      >
                        <Minus size={14} />
                      </button>
                      <div className="flex-1 flex items-center justify-center font-bold text-xs text-slate-900 select-none">
                        {rooms}
                      </div>
                      <button
                        type="button"
                        onClick={() => setRooms((prev) => prev + 1)}
                        className="w-10 flex items-center justify-center text-slate-600 hover:bg-slate-50 border-l border-slate-300 active:bg-slate-100 cursor-pointer transition select-none"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>

                  {/* NÚT TÌM PHÒNG */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCalendarOpen(false);
                        handleApplySearch();
                      }}
                      className="w-full h-11 bg-[#006ce4] hover:bg-blue-600 text-white font-black text-sm rounded-xl shadow-md transition active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Search size={16} strokeWidth={2.5} />
                      <span>Tìm phòng</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Ô 3: Nút Cập nhật (Gọn gàng md:col-span-2) */}
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
                {rentalType === "HOUR" ? (
                  <>
                    Nhận - Trả phòng:{" "}
                    <strong className="text-blue-900">
                      {checkOutInfo.displayRange}
                    </strong>{" "}
                    (
                    <strong className="text-blue-600 font-bold">
                      {hoursCount} Giờ
                    </strong>
                    ) · {adults} người lớn
                    {children > 0 ? ` · ${children} trẻ em` : ""} · {rooms}{" "}
                    phòng
                  </>
                ) : (
                  <>
                    Nhận - Trả phòng:{" "}
                    <strong className="text-blue-900">
                      {checkOutInfo.displayRange}
                    </strong>{" "}
                    (
                    <strong className="text-blue-600 font-bold">
                      {checkOutInfo.badge}
                    </strong>
                    ) · {adults} người lớn
                    {children > 0 ? ` · ${children} trẻ em` : ""} · {rooms}{" "}
                    phòng
                  </>
                )}
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
                      isSoldOut
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
                          {isSoldOut && (
                            <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] flex items-center justify-center">
                              <span className="bg-rose-600 text-white font-black text-xs px-3 py-1.5 rounded-lg uppercase tracking-wider shadow">
                                {stock > 0
                                  ? `Chỉ còn ${stock} phòng`
                                  : "Hết phòng ngày này"}
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

                      {!isSoldOut && (
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

                            {/* TOOLTIP CHI TIẾT GIÁ */}
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
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              navigate(
                                `/booking?hotelId=${hotel.id}&roomId=${room.id}&amount=${pricing.totalPrice}&checkIn=${safeFormatDate(
                                  checkOutInfo.inDateTime,
                                  "yyyy-MM-dd",
                                )}&checkOut=${safeFormatDate(
                                  checkOutInfo.outDateTime,
                                  "yyyy-MM-dd",
                                )}&rentalType=${rentalType}&checkInTime=${checkInTime}&checkOutTime=${checkOutInfo.outTimeStr}&hours=${hoursCount}&adults=${adults}&children=${children}&rooms=${rooms}`,
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
                  Từ {String(hotel.checkin_time || "14:00").slice(0, 5)}
                </strong>
              </div>
              <div className="flex items-center gap-3">
                <Clock size={16} className="text-slate-400 shrink-0" />
                <span className="w-44 font-semibold text-slate-500">
                  Thời gian trả phòng:
                </span>
                <strong className="text-slate-900 font-bold">
                  Trước {String(hotel.checkout_time || "12:00").slice(0, 5)}
                </strong>
              </div>
            </div>
          </div>
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
