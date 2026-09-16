// src/pages/guest/BookingConfirmPage.jsx
import React, { useState, useEffect, useRef, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  CalendarDays,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Building2,
  Check,
  Clock,
  Sun,
  Moon,
  Hourglass,
  Users,
  Calendar as CalendarIcon,
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

import { Button, Input, Badge, StarRating } from "@/components/ui";
import { LoadingSpinner, Breadcrumb } from "@/components/common";
import { BookingStepper } from "@/components/booking";

import { hotelService } from "@/services";
import { useAuthStore } from "@/stores/authStore";
import apiClient from "@/services/apiClient";

// Hàm format an toàn chống lỗi Unescaped character của date-fns
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

export default function BookingConfirmPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const hotelId = searchParams.get("hotelId");
  const roomId = searchParams.get("roomId");

  const today = startOfToday();

  // ─── 1. THÊM STATE HÌNH THỨC THUÊ: GIỜ / NGÀY / ĐÊM / BUỔI ───
  // "HOUR" | "DAY" | "OVERNIGHT" | "HALF_DAY"
  const [rentalType, setRentalType] = useState(
    searchParams.get("rentalType") || "DAY",
  );

  // Giờ nhận phòng
  const [checkInTime, setCheckInTime] = useState(
    searchParams.get("checkInTime") || "14:00",
  );

  // Thời gian lưu trú (Giờ / Ngày / Đêm)
  const [stayDuration, setStayDuration] = useState(
    Number(searchParams.get("duration")) || (rentalType === "HOUR" ? 1 : 1),
  );

  // Số lượng người lớn & trẻ em
  const [adults, setAdults] = useState(Number(searchParams.get("adults")) || 2);
  const [children, setChildren] = useState(
    Number(searchParams.get("children")) || 0,
  );

  // Ngày nhận / trả phòng
  const [checkInDate, setCheckInDate] = useState(
    searchParams.get("checkIn") ? new Date(searchParams.get("checkIn")) : today,
  );
  const [checkOutDate, setCheckOutDate] = useState(
    searchParams.get("checkOut")
      ? new Date(searchParams.get("checkOut"))
      : addDays(today, 1),
  );

  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(
    checkInDate || today,
  );
  const [hoverDate, setHoverDate] = useState(null);
  const calendarRef = useRef(null);

  const [quantity, setQuantity] = useState(
    Number(searchParams.get("rooms")) || 1,
  );
  const [hotel, setHotel] = useState(null);
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // 'FULL' (100%) hoặc 'DEPOSIT_30' (Cọc trước 30%)
  const [paymentOption, setPaymentOption] = useState("FULL");

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    specialRequest: "",
  });

  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        fullName: user.full_name || user.name || user.fullName || "",
        email: user.email || "",
        phone: user.phone || "",
      }));
    }
  }, [user]);

  useEffect(() => {
    const fetchData = async () => {
      if (!hotelId) return;
      setLoading(true);
      try {
        const res = await hotelService.getById(hotelId);
        const data = res?.data?.hotel || res?.data?.data || res?.data || res;
        setHotel(data);
        const selectedRoom =
          data.rooms?.find((r) => String(r.id) === String(roomId)) ||
          data.rooms?.[0];
        setRoom(selectedRoom);
      } catch (err) {
        console.error("Lỗi tải thông tin:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [hotelId, roomId]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target)) {
        setIsCalendarOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDateClick = (date) => {
    if (isBefore(date, today)) return;

    if (
      rentalType === "HOUR" ||
      rentalType === "OVERNIGHT" ||
      rentalType === "HALF_DAY"
    ) {
      setCheckInDate(date);
      setIsCalendarOpen(false);
      return;
    }

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

  // ─── TÍNH TOÁN THỜI GIAN LƯU TRÚ VÀ NGÀY GIỜ TRẢ PHÒNG ───
  const { calculatedCheckOutDate, calculatedCheckOutTime, durationLabelText } =
    useMemo(() => {
      if (rentalType === "HOUR") {
        const [hoursStr, minsStr] = (checkInTime || "14:00").split(":");
        const startHour = parseInt(hoursStr, 10) || 0;
        const startMin = parseInt(minsStr, 10) || 0;

        const totalHours = startHour + Number(stayDuration);
        const endHour = totalHours % 24;
        const extraDays = Math.floor(totalHours / 24);

        const outDate = addDays(checkInDate, extraDays);
        const outTime = `${String(endHour).padStart(2, "0")}:${String(startMin).padStart(2, "0")}`;

        return {
          calculatedCheckOutDate: outDate,
          calculatedCheckOutTime: outTime,
          durationLabelText: `${stayDuration} Giờ`,
        };
      }

      if (rentalType === "OVERNIGHT") {
        const outDate = addDays(checkInDate, 1);
        return {
          calculatedCheckOutDate: outDate,
          calculatedCheckOutTime: "12:00",
          durationLabelText: "Qua đêm",
        };
      }

      if (rentalType === "HALF_DAY") {
        return {
          calculatedCheckOutDate: checkInDate,
          calculatedCheckOutTime: "18:00",
          durationLabelText: "1 Buổi",
        };
      }

      // Thuê theo Ngày
      const nights =
        checkInDate && checkOutDate
          ? Math.max(1, differenceInDays(checkOutDate, checkInDate))
          : 1;

      return {
        calculatedCheckOutDate: checkOutDate || addDays(checkInDate, 1),
        calculatedCheckOutTime: "12:00",
        durationLabelText: `${nights} đêm`,
      };
    }, [rentalType, checkInTime, stayDuration, checkInDate, checkOutDate]);

  // ─── TÍNH TOÁN GIÁ TIỀN CHUẨN XÁC THEO HÌNH THỨC THUÊ ───
  const baseDayPrice = Number(room?.sell_price || room?.base_price || 500000);
  const hourlyUnitPrice =
    Number(room?.hourly_price) > 0
      ? Number(room?.hourly_price)
      : Math.round(baseDayPrice * 0.25);
  const overnightUnitPrice =
    Number(room?.overnight_price) > 0
      ? Number(room?.overnight_price)
      : baseDayPrice;
  const halfDayUnitPrice =
    Number(room?.half_day_price) > 0
      ? Number(room?.half_day_price)
      : Math.round(baseDayPrice * 0.8);

  const totalPrice = useMemo(() => {
    let unit = baseDayPrice;
    if (rentalType === "HOUR") {
      unit = hourlyUnitPrice * Number(stayDuration);
    } else if (rentalType === "OVERNIGHT") {
      unit = overnightUnitPrice;
    } else if (rentalType === "HALF_DAY") {
      unit = halfDayUnitPrice;
    } else {
      const nights =
        checkInDate && checkOutDate
          ? Math.max(1, differenceInDays(checkOutDate, checkInDate))
          : 1;
      unit = baseDayPrice * nights;
    }
    return Math.max(0, unit * quantity);
  }, [
    rentalType,
    stayDuration,
    baseDayPrice,
    hourlyUnitPrice,
    overnightUnitPrice,
    halfDayUnitPrice,
    checkInDate,
    checkOutDate,
    quantity,
  ]);

  const depositAmount = Math.round(totalPrice * 0.3);
  const remainingAmount = totalPrice - depositAmount;
  const amountToPayNow =
    paymentOption === "DEPOSIT_30" ? depositAmount : totalPrice;

  const formatVND = (num) => Number(num || 0).toLocaleString("vi-VN") + " ₫";

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
      <div className="flex-1 min-w-[260px]">
        <div className="text-center font-bold text-sm text-gray-900 mb-4">
          {safeFormatDate(monthDate, "'tháng' M, yyyy")}
        </div>
        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {weekHeaders.map((w, idx) => (
            <span
              key={idx}
              className={`text-xs font-bold ${w.isWeekend ? "text-[#006ce4]" : "text-gray-900"}`}
            >
              {w.label}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-1 text-center text-xs">
          {blanks.map((_, i) => (
            <div key={`blank-${i}`} className="h-9" />
          ))}
          {days.map((day) => {
            const isPast = isBefore(day, today);
            const isStart = checkInDate && isSameDay(day, checkInDate);
            const isEnd =
              rentalType === "DAY" &&
              checkOutDate &&
              isSameDay(day, checkOutDate);
            const isInRange =
              rentalType === "DAY" &&
              checkInDate &&
              checkOutDate &&
              isWithinInterval(day, { start: checkInDate, end: checkOutDate });

            const isHoverRange =
              rentalType === "DAY" &&
              checkInDate &&
              !checkOutDate &&
              hoverDate &&
              isAfter(hoverDate, checkInDate) &&
              isWithinInterval(day, { start: checkInDate, end: hoverDate });

            const isWeekend = getDay(day) === 0 || getDay(day) === 6;

            let btnClasses =
              "h-9 w-full flex items-center justify-center font-bold text-xs transition-all relative ";
            if (isPast) {
              btnClasses += "text-gray-300 cursor-not-allowed font-normal";
            } else if (isStart && (isEnd || rentalType !== "DAY")) {
              btnClasses += "bg-[#006ce4] text-white rounded-lg z-10 font-bold";
            } else if (isStart) {
              btnClasses +=
                "bg-[#006ce4] text-white rounded-l-lg z-10 font-bold " +
                (checkOutDate ? "rounded-r-none" : "rounded-r-lg");
            } else if (isEnd) {
              btnClasses +=
                "bg-[#006ce4] text-white rounded-r-lg rounded-l-none z-10 font-bold";
            } else if (isInRange || isHoverRange) {
              btnClasses += "bg-blue-50 text-[#006ce4]";
            } else {
              btnClasses += isWeekend
                ? "text-[#006ce4] hover:bg-gray-100 rounded-lg cursor-pointer"
                : "text-gray-900 hover:bg-gray-100 rounded-lg cursor-pointer";
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
                {safeFormatDate(day, "d")}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!checkInDate) {
      alert("Vui lòng chọn ngày nhận phòng hợp lệ!");
      return;
    }
    setSubmitting(true);

    const payload = {
      hotel_id: hotelId,
      room_id: room?.id || roomId,
      rental_type: rentalType,
      checkin_date: safeFormatDate(checkInDate, "yyyy-MM-dd"),
      checkout_date: safeFormatDate(calculatedCheckOutDate, "yyyy-MM-dd"),
      checkin_time: checkInTime,
      checkout_time: calculatedCheckOutTime,
      stay_duration: stayDuration,
      duration_label: durationLabelText,
      quantity: quantity,
      adult_total: adults,
      children_total: children,
      adults: adults,
      children: children,
      customer_name: formData.fullName.trim(),
      guest_email: formData.email.trim(),
      guest_phone: formData.phone.trim(),
      special_require: formData.specialRequest.trim(),
      total_price: totalPrice,
      payment_type: paymentOption,
      deposit_amount: paymentOption === "DEPOSIT_30" ? depositAmount : 0,
      remaining_amount: paymentOption === "DEPOSIT_30" ? remainingAmount : 0,
      expected_amount: amountToPayNow,
    };

    try {
      const res = await apiClient.post("/bookings", payload);
      const data = res?.data || res;
      const code = data?.booking_code || data?.code || data?.id;

      if (code) {
        const expireTime = Date.now() + 15 * 60 * 1000;
        localStorage.setItem(`lock_expires_${code}`, expireTime.toString());

        navigate(
          `/checkout?code=${code}&amount=${amountToPayNow}&totalAmount=${totalPrice}&paymentType=${paymentOption}&remainingAmount=${remainingAmount}&hotelId=${hotelId}`,
        );
      } else {
        navigate("/profile?tab=trips");
      }
    } catch (err) {
      alert(
        err.response?.data?.message ||
          err.message ||
          "Không thể tạo đơn đặt phòng. Vui lòng thử lại!",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner fullPage label="Đang chuẩn bị đơn đặt phòng..." />;
  }

  const breadcrumbs = [
    { label: "Khách sạn", link: "/hotels" },
    { label: hotel?.name || "Chi tiết", link: `/hotel/${hotelId}` },
    { label: "Xác nhận đặt phòng" },
  ];

  return (
    <div className="bg-[#f5f7fa] min-h-screen pb-20 font-sans text-gray-800">
      <div className="bg-white border-b border-gray-200 py-3 mb-6">
        <div className="max-w-7xl mx-auto px-4">
          <BookingStepper currentStep={2} />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4">
        <Breadcrumb items={breadcrumbs} />

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-6"
        >
          {/* CỘT TRÁI: THÔNG TIN KHÁCH VÀ PHƯƠNG THỨC THANH TOÁN */}
          <div className="lg:col-span-7 space-y-6">
            {/* Thông tin khách hàng */}
            <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-200 shadow-sm space-y-6">
              <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                <div>
                  <h2 className="text-xl font-black text-gray-900 tracking-tight">
                    Thông tin liên hệ
                  </h2>
                </div>
                {user && (
                  <Badge variant="success" size="sm" showDot>
                    Đã điền tự động
                  </Badge>
                )}
              </div>

              <div className="space-y-4">
                <Input
                  label="Họ và tên người đặt *"
                  required
                  placeholder="Nhập tên như trên CCCD / Hộ chiếu"
                  value={formData.fullName}
                  onChange={(e) =>
                    setFormData({ ...formData, fullName: e.target.value })
                  }
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Địa chỉ Email *"
                    type="email"
                    required
                    placeholder="email@example.com"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                  />

                  <Input
                    label="Số điện thoại liên hệ *"
                    type="tel"
                    required
                    placeholder="Ví dụ: 0912 345 678"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-1.5 pt-2">
                  <label className="text-sm font-bold text-gray-700 block">
                    Yêu cầu đặc biệt (Không bắt buộc)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Ví dụ: Phòng tầng cao, yên tĩnh..."
                    value={formData.specialRequest}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        specialRequest: e.target.value,
                      })
                    }
                    className="w-full p-3.5 border border-gray-300 rounded-xl text-sm font-medium outline-none focus:border-[#006ce4] transition-all"
                  />
                </div>
              </div>

              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex items-start gap-3">
                <ShieldCheck
                  className="text-emerald-600 shrink-0 mt-0.5"
                  size={18}
                />
                <p className="text-xs text-emerald-800 leading-relaxed font-medium">
                  Thông tin đặt phòng được bảo mật an toàn tuyệt đối.
                </p>
              </div>
            </div>

            {/* LỰA CHỌN THANH TOÁN */}
            <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-200 shadow-sm space-y-4">
              <div>
                <h3 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
                  <CreditCard size={20} className="text-[#003580]" /> Lựa chọn
                  thanh toán
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Chọn phương thức thanh toán phù hợp trước khi sang bước thanh
                  toán.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                <div
                  onClick={() => setPaymentOption("FULL")}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                    paymentOption === "FULL"
                      ? "border-[#003580] bg-blue-50/40 shadow-xs"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <span className="font-bold text-sm text-gray-900 block">
                        Thanh toán toàn bộ (100%)
                      </span>
                      <p className="text-xs text-gray-500">
                        Thanh toán trực tuyến trọn gói, làm thủ tục nhận phòng
                        nhanh chóng không cần thanh toán thêm tại quầy.
                      </p>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                        paymentOption === "FULL"
                          ? "border-[#003580] bg-[#003580] text-white"
                          : "border-gray-300 bg-white"
                      }`}
                    >
                      {paymentOption === "FULL" && (
                        <Check size={12} strokeWidth={3} />
                      )}
                    </div>
                  </div>
                  <div className="pt-4 font-black text-[#003580] text-base">
                    {formatVND(totalPrice)}
                  </div>
                </div>

                <div
                  onClick={() => setPaymentOption("DEPOSIT_30")}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                    paymentOption === "DEPOSIT_30"
                      ? "border-emerald-600 bg-emerald-50/40 shadow-xs"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm text-gray-900 block">
                          Thanh toán tại quầy
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
                          Cọc trước 30%
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        Chuyển khoản cọc 30% để chắc chắn giữ phòng (chống đơn
                        ảo). 70% còn lại thanh toán tại quầy khi nhận phòng.
                      </p>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                        paymentOption === "DEPOSIT_30"
                          ? "border-emerald-600 bg-emerald-600 text-white"
                          : "border-gray-300 bg-white"
                      }`}
                    >
                      {paymentOption === "DEPOSIT_30" && (
                        <Check size={12} strokeWidth={3} />
                      )}
                    </div>
                  </div>
                  <div className="pt-4">
                    <span className="text-[11px] text-gray-500 block">
                      Tiền cọc thanh toán ngay:
                    </span>
                    <span className="font-black text-emerald-700 text-base">
                      {formatVND(depositAmount)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
                <Building2
                  size={16}
                  className="shrink-0 mt-0.5 text-amber-700"
                />
                <p className="leading-relaxed">
                  {paymentOption === "DEPOSIT_30" ? (
                    <>
                      Chính sách cọc 30% (
                      <strong>{formatVND(depositAmount)}</strong>) giúp hệ thống
                      khóa phòng thực tế cho Quý khách. Số tiền còn lại{" "}
                      <strong>{formatVND(remainingAmount)}</strong> sẽ được thu
                      trực tiếp khi nhận phòng tại quầy lễ tân.
                    </>
                  ) : (
                    <>
                      Quý khách thanh toán 100% trọn gói (
                      <strong>{formatVND(totalPrice)}</strong>). Khi đến khách
                      sạn chỉ cần cung cấp mã đơn là có thể nhận chìa khóa phòng
                      ngay.
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* CỘT PHẢI: CHI TIẾT PHÒNG, BỘ CHỌN THỜI GIAN VÀ TÍNH GIÁ */}
          <div className="lg:col-span-5 space-y-6">
            {/* THẺ TÓM TẮT PHÒNG VÀ KHÁCH SẠN */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
              <div className="flex gap-4 pb-4 border-b border-gray-100">
                <img
                  src={
                    hotel?.image ||
                    "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=300"
                  }
                  alt={hotel?.name}
                  className="w-20 h-20 object-cover rounded-xl shrink-0"
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <Badge variant="primary" size="sm">
                      Khách sạn
                    </Badge>
                    <StarRating rating={hotel?.star_rating || 3} size={12} />
                  </div>
                  <h3 className="font-black text-gray-900 text-base leading-tight">
                    {hotel?.name}
                  </h3>
                  <p className="text-xs text-gray-500 line-clamp-1">
                    {hotel?.address}, {hotel?.city}
                  </p>
                </div>
              </div>

              <div className="space-y-1 text-xs text-gray-600">
                <h4 className="font-bold text-gray-900 text-sm">
                  {room?.name || "Phòng tiêu chuẩn"}
                </h4>
                <p className="text-gray-500">
                  {room?.bed_type || "1 Giường đôi"} • Wi-Fi miễn phí •{" "}
                  {room?.room_area || 25} m²
                </p>
              </div>
            </div>

            {/* 🌟 BỘ CHỌN HÌNH THỨC THUÊ: GIỜ / NGÀY / ĐÊM / BUỔI 🌟 */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
              {/* 1. HÀNG TABS: GIỜ, NGÀY, ĐÊM, BUỔI */}
              <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setRentalType("HOUR");
                    setStayDuration(1);
                  }}
                  className={`py-2 px-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition cursor-pointer ${
                    rentalType === "HOUR"
                      ? "bg-[#006ce4] text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Clock size={14} /> <span>Giờ</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRentalType("DAY");
                  }}
                  className={`py-2 px-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition cursor-pointer ${
                    rentalType === "DAY"
                      ? "bg-[#006ce4] text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Sun size={14} /> <span>Ngày</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRentalType("OVERNIGHT");
                  }}
                  className={`py-2 px-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition cursor-pointer ${
                    rentalType === "OVERNIGHT"
                      ? "bg-[#006ce4] text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Moon size={14} /> <span>Đêm</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRentalType("HALF_DAY");
                  }}
                  className={`py-2 px-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition cursor-pointer ${
                    rentalType === "HALF_DAY"
                      ? "bg-[#006ce4] text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Hourglass size={14} /> <span>Buổi</span>
                </button>
              </div>

              {/* 2. NHẬN PHÒNG: CHỌN GIỜ & CHỌN NGÀY */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Nhận phòng
                </label>
                <div className="grid grid-cols-12 gap-2">
                  {/* Dropdown chọn giờ nhận */}
                  <div className="col-span-5">
                    <select
                      value={checkInTime}
                      onChange={(e) => setCheckInTime(e.target.value)}
                      className="w-full h-11 px-2.5 bg-white border border-gray-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-[#006ce4] cursor-pointer"
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

                  {/* Nút mở Lịch chọn ngày nhận */}
                  <div ref={calendarRef} className="col-span-7 relative">
                    <button
                      type="button"
                      onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                      className="w-full h-11 px-3 bg-white border border-gray-300 rounded-xl text-xs font-bold text-slate-800 flex items-center justify-between hover:border-[#006ce4] cursor-pointer transition"
                    >
                      <span className="truncate">
                        {safeFormatDate(checkInDate, "eee, dd 'Thg' M, yyyy")}
                      </span>
                      <ChevronDown
                        size={14}
                        className="text-gray-400 shrink-0 ml-1"
                      />
                    </button>

                    {/* POPUP LỊCH DATEPICKER */}
                    {isCalendarOpen && (
                      <div className="absolute right-0 top-full mt-2 z-50 bg-white border border-gray-200 rounded-2xl shadow-2xl p-5 w-[300px] sm:w-[580px] animate-in fade-in">
                        <div className="flex justify-between items-center mb-2 px-1">
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
                            className="p-1.5 rounded-full hover:bg-gray-100 text-gray-600 disabled:opacity-30"
                          >
                            <ChevronLeft size={18} />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setCurrentCalendarMonth((prev) =>
                                addMonths(prev, 1),
                              )
                            }
                            className="p-1.5 rounded-full hover:bg-gray-100 text-gray-600"
                          >
                            <ChevronRight size={18} />
                          </button>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-6">
                          {renderMonthCalendar(currentCalendarMonth)}
                          <div className="hidden sm:block">
                            {renderMonthCalendar(
                              addMonths(currentCalendarMonth, 1),
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 3. THỜI GIAN LƯU TRÚ (BỘ ĐẾM SỐ GIỜ HOẶC SỐ NGÀY) */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                  <span>Thời gian lưu trú</span>
                </div>
                <div className="flex items-center justify-between border border-gray-300 rounded-xl h-11 px-3 bg-white">
                  <button
                    type="button"
                    onClick={() => {
                      if (rentalType === "HOUR") {
                        setStayDuration((d) => Math.max(1, d - 1));
                      }
                    }}
                    disabled={rentalType !== "HOUR" || stayDuration <= 1}
                    className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-base hover:bg-slate-100 text-slate-700 disabled:opacity-30 cursor-pointer"
                  >
                    -
                  </button>
                  <span className="font-bold text-xs text-slate-900">
                    {durationLabelText}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (rentalType === "HOUR") {
                        setStayDuration((d) => Math.min(12, d + 1));
                      }
                    }}
                    disabled={rentalType !== "HOUR" || stayDuration >= 12}
                    className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-base hover:bg-slate-100 text-slate-700 disabled:opacity-30 cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* 4. NGƯỜI LỚN & TRẺ EM & SỐ PHÒNG */}
              <div className="space-y-2 pt-1 border-t border-gray-100">
                {/* Người lớn */}
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-700">
                    Người lớn
                  </span>
                  <div className="flex items-center gap-2 border border-gray-300 rounded-lg p-1 bg-white">
                    <button
                      type="button"
                      onClick={() => setAdults((a) => Math.max(1, a - 1))}
                      className="w-6 h-6 rounded flex items-center justify-center font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                    >
                      -
                    </button>
                    <span className="font-bold text-xs w-5 text-center">
                      {adults}
                    </span>
                    <button
                      type="button"
                      onClick={() => setAdults((a) => a + 1)}
                      className="w-6 h-6 rounded flex items-center justify-center font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Trẻ em */}
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-700">
                    Trẻ em
                  </span>
                  <div className="flex items-center gap-2 border border-gray-300 rounded-lg p-1 bg-white">
                    <button
                      type="button"
                      onClick={() => setChildren((c) => Math.max(0, c - 1))}
                      className="w-6 h-6 rounded flex items-center justify-center font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                    >
                      -
                    </button>
                    <span className="font-bold text-xs w-5 text-center">
                      {children}
                    </span>
                    <button
                      type="button"
                      onClick={() => setChildren((c) => c + 1)}
                      className="w-6 h-6 rounded flex items-center justify-center font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Số lượng phòng */}
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-700">
                    Số lượng phòng
                  </span>
                  <div className="flex items-center gap-2 border border-gray-300 rounded-lg p-1 bg-white">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="w-6 h-6 rounded flex items-center justify-center font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                    >
                      -
                    </button>
                    <span className="font-bold text-xs w-5 text-center">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setQuantity((q) => Math.min(room?.amount || 5, q + 1))
                      }
                      className="w-6 h-6 rounded flex items-center justify-center font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* 🌟 HỘP HIỂN THỊ "BẠN ĐÃ CHỌN" 🌟 */}
              <div className="p-3.5 bg-blue-50/70 rounded-xl border border-blue-200 text-xs space-y-2">
                <div className="text-slate-500 font-bold text-[11px] flex items-center gap-1.5">
                  <Building2 size={13} className="text-[#006ce4]" />
                  <span>
                    {hotel?.name || "Khách sạn"} — {hotel?.city || "Việt Nam"}
                  </span>
                </div>
                <div className="space-y-1 text-slate-700">
                  <p>
                    👥 <strong>{quantity} phòng</strong> • {adults} người lớn
                    {children > 0 ? `, ${children} trẻ em` : ""}
                  </p>
                  <p>
                    📅 Nhận phòng:{" "}
                    <strong>
                      {checkInTime}{" "}
                      {safeFormatDate(checkInDate, "dd 'Thg' MM, yyyy")}
                    </strong>
                  </p>
                  <p>
                    🚪 Trả phòng:{" "}
                    <strong>
                      {calculatedCheckOutTime}{" "}
                      {safeFormatDate(
                        calculatedCheckOutDate,
                        "dd 'Thg' MM, yyyy",
                      )}
                    </strong>
                  </p>
                  <p>
                    ⏳ Thời gian lưu trú:{" "}
                    <strong className="text-[#006ce4]">
                      {durationLabelText}
                    </strong>
                  </p>
                </div>
              </div>
            </div>

            {/* BẢNG TÍNH GIÁ CHI TIẾT */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
              <h3 className="font-black text-gray-900 text-base border-b border-gray-100 pb-3">
                Chi tiết giá phòng
              </h3>
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between text-gray-700">
                  <span>Đơn giá ({durationLabelText}):</span>
                  <span>
                    {formatVND(
                      rentalType === "HOUR"
                        ? hourlyUnitPrice * stayDuration
                        : rentalType === "OVERNIGHT"
                          ? overnightUnitPrice
                          : rentalType === "HALF_DAY"
                            ? halfDayUnitPrice
                            : baseDayPrice,
                    )}
                  </span>
                </div>

                <div className="flex justify-between text-gray-700">
                  <span>Số lượng:</span>
                  <span>
                    {quantity} phòng × {durationLabelText}
                  </span>
                </div>

                <div className="flex justify-between text-gray-900 font-bold pt-2 border-t border-gray-100">
                  <span>Tổng tiền phòng:</span>
                  <span className="text-sm">{formatVND(totalPrice)}</span>
                </div>

                {paymentOption === "DEPOSIT_30" && (
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-1.5 mt-2">
                    <div className="flex justify-between text-emerald-700 font-black">
                      <span>Tiền cọc giữ phòng (30%):</span>
                      <span>{formatVND(depositAmount)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600 font-medium">
                      <span>Cần trả tại quầy lễ tân:</span>
                      <span className="font-bold text-gray-800">
                        {formatVND(remainingAmount)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-100 pt-4 flex justify-between items-center">
                <div>
                  <span className="text-sm font-black text-gray-900 block">
                    {paymentOption === "DEPOSIT_30"
                      ? "Tiền cọc thanh toán ngay"
                      : "Tổng thanh toán"}
                  </span>
                  <span className="text-[10px] text-gray-400 italic">
                    {paymentOption === "DEPOSIT_30"
                      ? "Đặt cọc 30% để chắc chắn giữ chỗ"
                      : "Thanh toán trọn gói 100%"}
                  </span>
                </div>
                <span className="text-2xl font-black text-[#ff6a00]">
                  {formatVND(amountToPayNow)}
                </span>
              </div>

              <Button
                type="submit"
                isLoading={submitting}
                className="w-full h-14 text-base font-black rounded-xl shadow-lg mt-2 bg-[#003580] hover:bg-blue-900 text-white cursor-pointer"
              >
                Tiến hành thanh toán &rarr;
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
