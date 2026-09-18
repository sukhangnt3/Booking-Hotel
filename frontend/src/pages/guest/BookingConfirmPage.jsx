// src/pages/guest/BookingConfirmPage.jsx
import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Building2,
  Check,
  Clock,
  Sun,
  Moon,
  Hourglass,
  Minus,
  Plus,
  AlertCircle,
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

import { Button, Input, Badge, StarRating } from "@/components/ui";
import { LoadingSpinner, Breadcrumb } from "@/components/common";
import { BookingStepper } from "@/components/booking";
import { hotelService } from "@/services";
import { useAuthStore } from "@/stores/authStore";
import apiClient from "@/services/apiClient";

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

const formatVND = (num) => Number(num || 0).toLocaleString("vi-VN") + " ₫";

const NumberCounter = ({ label, value, min = 0, max = 99, onChange }) => (
  <div className="flex justify-between items-center">
    <span className="text-xs font-bold text-slate-700">{label}</span>
    <div className="flex items-center gap-2 border border-gray-300 rounded-xl p-1 bg-white">
      <button
        type="button"
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
      >
        -
      </button>
      <span className="font-bold text-xs w-6 text-center">{value}</span>
      <button
        type="button"
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
      >
        +
      </button>
    </div>
  </div>
);

export default function BookingConfirmPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const hotelId = searchParams.get("hotelId");
  const roomId = searchParams.get("roomId");
  const today = useMemo(() => startOfToday(), []);

  // 1. STATE THUÊ PHÒNG
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

  const [checkInDate, setCheckInDate] = useState(() =>
    searchParams.get("checkIn") ? new Date(searchParams.get("checkIn")) : today,
  );
  const [checkOutDate, setCheckOutDate] = useState(() =>
    searchParams.get("checkOut")
      ? new Date(searchParams.get("checkOut"))
      : rentalType === "DAY" || rentalType === "OVERNIGHT"
        ? addDays(today, 1)
        : today,
  );

  // Lịch popup
  const [calendarTarget, setCalendarTarget] = useState(null);
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(today);
  const calendarRef = useRef(null);

  // Số lượng khách & phòng
  const [adults, setAdults] = useState(Number(searchParams.get("adults")) || 1);
  const [children, setChildren] = useState(
    Number(searchParams.get("children")) || 0,
  );
  const [quantity, setQuantity] = useState(
    Number(searchParams.get("rooms")) || 1,
  );

  // Dữ liệu khách sạn & phòng
  const [hotel, setHotel] = useState(null);
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [paymentOption, setPaymentOption] = useState("FULL");

  // 🌟 STATE KIỂM TRA PHÒNG TRỐNG TỨC THÌ KHI ĐỔI GIỜ
  const [isSlotAvailable, setIsSlotAvailable] = useState(true);
  const [checkingAvailability, setCheckingAvailability] = useState(false);

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
    if (!hotelId) return;
    const fetchData = async () => {
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
        console.error("Lỗi tải thông tin khách sạn:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [hotelId, roomId]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target)) {
        setCalendarTarget(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 🌟 TÍNH TOÁN THỜI GIAN VÀ CHỐNG LỖI CÙNG NGÀY CHO THUÊ THEO GIỜ
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
      badge = totalHours > 9 ? `1 Buổi ${totalHours - 9} Giờ` : "1 Buổi";
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

  // 🌟 HÀM TỰ ĐỘNG KIỂM TRA PHÒNG TRỐNG MỖI KHI ĐỔI GIỜ TẠI TRANG NÀY
  const verifyAvailability = useCallback(async () => {
    if (!hotelId || !roomId) return;
    setCheckingAvailability(true);
    try {
      const finalInDateStr = safeFormatDate(checkInDate, "yyyy-MM-dd");
      const finalOutDateStr =
        rentalType === "HOUR"
          ? safeFormatDate(checkOutInfo.outDateTime, "yyyy-MM-dd")
          : safeFormatDate(checkOutDate, "yyyy-MM-dd");

      const res = await apiClient.get(`/hotels/${hotelId}/availability`, {
        params: {
          checkIn: finalInDateStr,
          checkOut: finalOutDateStr,
          checkInTime: checkInTime,
          checkOutTime:
            rentalType === "HOUR" ? checkOutInfo.outTimeStr : checkOutTime,
          rentalType: rentalType,
          adults,
        },
      });

      const list = res?.data?.rooms || res?.data || [];
      const currentRoom = list.find((r) => String(r.id) === String(roomId));
      if (currentRoom) {
        const availableStock = Number(
          currentRoom.amount ?? currentRoom.remaining_rooms ?? 1,
        );
        setIsSlotAvailable(availableStock >= quantity);
      } else {
        setIsSlotAvailable(true);
      }
    } catch {
      setIsSlotAvailable(true);
    } finally {
      setCheckingAvailability(false);
    }
  }, [
    hotelId,
    roomId,
    checkInDate,
    checkOutDate,
    checkInTime,
    checkOutTime,
    rentalType,
    checkOutInfo,
    quantity,
    adults,
  ]);

  useEffect(() => {
    verifyAvailability();
  }, [verifyAvailability]);

  // Đổi hình thức thuê
  const handleTabChange = (type) => {
    setRentalType(type);
    setCalendarTarget(null);
    if (type === "HOUR") {
      setCheckInTime("12:00");
      setHoursCount(2);
      setCheckOutDate(checkInDate);
    } else if (type === "DAY") {
      setCheckInTime(String(hotel?.checkin_time || "14:00").slice(0, 5));
      setCheckOutTime(String(hotel?.checkout_time || "12:00").slice(0, 5));
      setCheckOutDate(addDays(checkInDate, 1));
    } else if (type === "OVERNIGHT") {
      setCheckInTime(
        String(hotel?.overnight_checkin_time || "22:00").slice(0, 5),
      );
      setCheckOutTime(
        String(hotel?.overnight_checkout_time || "12:00").slice(0, 5),
      );
      setCheckOutDate(addDays(checkInDate, 1));
    } else if (type === "HALF_DAY") {
      setCheckInTime(
        String(hotel?.halfday_checkin_time || "12:00").slice(0, 5),
      );
      setCheckOutTime(
        String(hotel?.halfday_checkout_time || "21:00").slice(0, 5),
      );
      setCheckOutDate(addDays(checkInDate, 1));
    }
  };

  // Chọn ngày từ lịch
  const handleSelectDateFromCalendar = (date) => {
    if (isBefore(date, today)) return;

    if (calendarTarget === "checkIn") {
      setCheckInDate(date);
      if (rentalType === "HOUR") {
        setCheckOutDate(date);
      } else {
        if (isBefore(checkOutDate, date) || isSameDay(checkOutDate, date)) {
          setCheckOutDate(addDays(date, 1));
        }
      }
    } else if (calendarTarget === "checkOut") {
      if (isBefore(date, checkInDate)) {
        setCheckInDate(date);
        setCheckOutDate(addDays(date, 1));
      } else {
        setCheckOutDate(date);
      }
    }
    setCalendarTarget(null);
  };

  // Tính tiền
  const baseDayPrice = Number(room?.sell_price || room?.base_price || 500000);
  const firstHourPrice =
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
      let hTotal = 0;
      for (let i = 0; i < hoursCount; i++) {
        let curHPrice = firstHourPrice;
        if (
          Array.isArray(room?.hourly_tiers) &&
          room?.hourly_tiers.length > 0
        ) {
          const matchedTier = [...room.hourly_tiers]
            .sort((a, b) => b.from_hour - a.from_hour)
            .find((t) => i + 1 >= Number(t.from_hour));
          if (matchedTier) curHPrice = Number(matchedTier.price);
        }
        hTotal += curHPrice;
      }
      unit = hTotal;
    } else if (rentalType === "OVERNIGHT") {
      unit = overnightUnitPrice;
    } else if (rentalType === "HALF_DAY") {
      unit = halfDayUnitPrice;
    } else {
      const nights = Math.max(
        1,
        differenceInDays(checkOutInfo.outDateTime, checkOutInfo.inDateTime),
      );
      unit = baseDayPrice * nights;
    }
    return Math.max(0, unit * quantity);
  }, [
    rentalType,
    hoursCount,
    checkOutInfo,
    baseDayPrice,
    firstHourPrice,
    overnightUnitPrice,
    halfDayUnitPrice,
    room,
    quantity,
  ]);

  const depositAmount = Math.round(totalPrice * 0.3);
  const remainingAmount = totalPrice - depositAmount;
  const amountToPayNow =
    paymentOption === "DEPOSIT_30" ? depositAmount : totalPrice;

  // Render popup lịch
  const renderCalendar = () => {
    const start = startOfMonth(currentCalendarMonth);
    const end = endOfMonth(currentCalendarMonth);
    const days = eachDayOfInterval({ start, end });
    const blanks = Array.from({ length: (getDay(start) + 6) % 7 });
    const activeDate =
      calendarTarget === "checkIn" ? checkInDate : checkOutDate;
    const weekHeaders = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

    return (
      <div className="flex-1 min-w-[260px]">
        <div className="text-center font-bold text-sm text-gray-900 mb-4">
          {safeFormatDate(currentCalendarMonth, "'tháng' M, yyyy")}
        </div>
        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {weekHeaders.map((w, idx) => (
            <span
              key={w}
              className={`text-xs font-bold ${idx >= 5 ? "text-[#006ce4]" : "text-gray-900"}`}
            >
              {w}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-1 text-center text-xs">
          {blanks.map((_, i) => (
            <div key={`blank-${i}`} className="h-9" />
          ))}
          {days.map((day) => {
            const isPast = isBefore(day, today);
            const isSelected = activeDate && isSameDay(day, activeDate);
            const isWeekend = getDay(day) === 0 || getDay(day) === 6;

            return (
              <button
                key={day.toISOString()}
                type="button"
                disabled={isPast}
                onClick={() => handleSelectDateFromCalendar(day)}
                className={`h-9 w-full flex items-center justify-center font-bold text-xs transition rounded-lg ${
                  isPast
                    ? "text-gray-300 cursor-not-allowed font-normal"
                    : isSelected
                      ? "bg-[#006ce4] text-white shadow-xs"
                      : isWeekend
                        ? "text-[#006ce4] hover:bg-gray-100 cursor-pointer"
                        : "text-gray-900 hover:bg-gray-100 cursor-pointer"
                }`}
              >
                {safeFormatDate(day, "d")}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // Gửi đơn hàng
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!checkInDate) return alert("Vui lòng chọn ngày nhận phòng hợp lệ!");
    if (!isSlotAvailable) {
      return alert(
        "Rất tiếc! Khung giờ bạn vừa chọn đã có khách đặt kín phòng. Vui lòng chọn khung giờ khác!",
      );
    }

    setSubmitting(true);

    const finalInDateStr = safeFormatDate(checkInDate, "yyyy-MM-dd");
    let finalOutDateStr = safeFormatDate(checkOutDate, "yyyy-MM-dd");

    if (rentalType === "HOUR") {
      finalOutDateStr = safeFormatDate(checkOutInfo.outDateTime, "yyyy-MM-dd");
    }

    const payload = {
      hotel_id: hotelId,
      room_id: room?.id || roomId,
      rental_type: rentalType,
      rentalType: rentalType,
      checkin_date: finalInDateStr,
      checkout_date: finalOutDateStr,
      checkin_time: checkInTime,
      checkout_time:
        rentalType === "HOUR" ? checkOutInfo.outTimeStr : checkOutTime,
      hours: rentalType === "HOUR" ? hoursCount : undefined,
      duration_label: checkOutInfo.badge,
      quantity,
      adult_total: adults,
      children_total: children,
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
      const code =
        res?.data?.booking_code ||
        res?.booking_code ||
        res?.data?.code ||
        res?.id;
      if (code) {
        localStorage.setItem(
          `lock_expires_${code}`,
          (Date.now() + 15 * 60 * 1000).toString(),
        );
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

  if (loading)
    return <LoadingSpinner fullPage label="Đang chuẩn bị đơn đặt phòng..." />;

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
          {/* CỘT TRÁI: THÔNG TIN LIÊN HỆ & PHƯƠNG THỨC THANH TOÁN */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-200 shadow-sm space-y-6">
              <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                <h2 className="text-xl font-black text-gray-900 tracking-tight">
                  Thông tin liên hệ
                </h2>
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
                    className="w-full p-3.5 border border-gray-300 rounded-xl text-sm font-medium outline-none focus:border-[#006ce4] transition"
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
                  className={`p-4 rounded-xl border-2 cursor-pointer transition flex flex-col justify-between ${
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
                        Thanh toán trọn gói, nhận phòng nhanh chóng không cần
                        trả thêm tại quầy.
                      </p>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${paymentOption === "FULL" ? "border-[#003580] bg-[#003580] text-white" : "border-gray-300 bg-white"}`}
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
                  className={`p-4 rounded-xl border-2 cursor-pointer transition flex flex-col justify-between ${
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
                        Chuyển khoản cọc 30% giữ phòng. 70% còn lại thanh toán
                        tại quầy khi nhận phòng.
                      </p>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${paymentOption === "DEPOSIT_30" ? "border-emerald-600 bg-emerald-600 text-white" : "border-gray-300 bg-white"}`}
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
                      Cọc 30% (<strong>{formatVND(depositAmount)}</strong>) giúp
                      hệ thống khóa phòng thực tế. Số tiền{" "}
                      <strong>{formatVND(remainingAmount)}</strong> sẽ được thu
                      tại quầy khi nhận phòng.
                    </>
                  ) : (
                    <>
                      Thanh toán trọn gói 100% (
                      <strong>{formatVND(totalPrice)}</strong>). Khi đến khách
                      sạn, Quý khách chỉ cần đọc mã đặt phòng để nhận chìa khóa
                      ngay.
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* CỘT PHẢI: BỘ CHỌN HÌNH THỨC THUÊ & CHI TIẾT GIÁ */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
              <div className="flex gap-4 pb-4 border-b border-gray-100">
                <img
                  src={
                    hotel?.image ||
                    "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=300"
                  }
                  alt={hotel?.name}
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.src =
                      "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=300";
                  }}
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

            {/* BỘ CHỌN HÌNH THỨC THUÊ */}
            <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6 space-y-4 relative">
              <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-2xl">
                {[
                  { id: "HOUR", label: "Giờ", icon: Clock },
                  { id: "DAY", label: "Ngày", icon: Sun },
                  { id: "OVERNIGHT", label: "Đêm", icon: Moon },
                  { id: "HALF_DAY", label: "Buổi", icon: Hourglass },
                ].map((t) => {
                  const Icon = t.icon;
                  const active = rentalType === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleTabChange(t.id)}
                      className={`py-2 px-1 rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition cursor-pointer ${
                        active
                          ? "bg-[#006ce4] text-white shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <Icon size={14} /> <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Hàng Nhận phòng */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Nhận phòng
                </label>
                <div className="grid grid-cols-12 gap-2.5">
                  <div className="col-span-4">
                    <select
                      value={checkInTime}
                      onChange={(e) => setCheckInTime(e.target.value)}
                      className="w-full h-11 px-2.5 bg-white border border-[#006ce4] rounded-xl text-xs font-bold text-slate-800 outline-none cursor-pointer"
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
                  <div className="col-span-8 relative">
                    <button
                      type="button"
                      onClick={() =>
                        setCalendarTarget(
                          calendarTarget === "checkIn" ? null : "checkIn",
                        )
                      }
                      className="w-full h-11 px-3 bg-white border border-gray-300 rounded-xl text-xs font-bold text-slate-800 flex items-center justify-between hover:border-[#006ce4] cursor-pointer transition"
                    >
                      <span className="truncate">
                        {safeFormatDisplayDate(checkInDate)}
                      </span>
                      <ChevronDown
                        size={14}
                        className="text-gray-400 shrink-0 ml-1"
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Nếu là Tab Giờ */}
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
                /* Tab Ngày / Đêm / Buổi */
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">
                    Trả phòng
                  </label>
                  <div className="grid grid-cols-12 gap-2.5">
                    <div className="col-span-4">
                      <select
                        value={checkOutTime}
                        onChange={(e) => setCheckOutTime(e.target.value)}
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
                    <div className="col-span-8 relative">
                      <button
                        type="button"
                        onClick={() =>
                          setCalendarTarget(
                            calendarTarget === "checkOut" ? null : "checkOut",
                          )
                        }
                        className="w-full h-11 px-3 bg-white border border-gray-300 rounded-xl text-xs font-bold text-slate-800 flex items-center justify-between hover:border-[#006ce4] cursor-pointer transition"
                      >
                        <span className="truncate">
                          {safeFormatDisplayDate(checkOutDate)}
                        </span>
                        <ChevronDown
                          size={14}
                          className="text-gray-400 shrink-0 ml-1"
                        />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="w-full py-2.5 bg-blue-50/90 text-[#006ce4] border border-blue-100 rounded-xl font-black text-center text-sm shadow-2xs">
                {checkOutInfo.badge}
              </div>

              {/* BỘ ĐẾM */}
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <NumberCounter
                  label="Người lớn"
                  value={adults}
                  min={1}
                  onChange={setAdults}
                />
                <NumberCounter
                  label="Trẻ em"
                  value={children}
                  min={0}
                  onChange={setChildren}
                />
                <NumberCounter
                  label="Số phòng"
                  value={quantity}
                  min={1}
                  max={room?.amount || 5}
                  onChange={setQuantity}
                />
              </div>

              {/* Popup Lịch */}
              {calendarTarget && (
                <div
                  ref={calendarRef}
                  className="absolute right-4 left-4 top-20 z-50 bg-white border border-gray-200 rounded-2xl shadow-2xl p-5 animate-in fade-in"
                >
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-black text-[#006ce4]">
                      {calendarTarget === "checkIn"
                        ? "👉 Chọn ngày nhận phòng"
                        : "👉 Chọn ngày trả phòng"}
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
                        className="p-1 rounded-full hover:bg-gray-100 text-gray-600 disabled:opacity-20 cursor-pointer"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setCurrentCalendarMonth((p) => addMonths(p, 1))
                        }
                        className="p-1 rounded-full hover:bg-gray-100 text-gray-600 cursor-pointer"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>

                  {renderCalendar()}

                  <div className="mt-3 pt-2 border-t flex justify-end">
                    <button
                      type="button"
                      onClick={() => setCalendarTarget(null)}
                      className="px-4 py-1.5 bg-[#003580] text-white text-xs font-bold rounded-lg cursor-pointer"
                    >
                      Xong
                    </button>
                  </div>
                </div>
              )}

              {/* CẢNH BÁO NẾU KHUNG GIỜ VỪA ĐỔI BỊ HẾT PHÒNG */}
              {!isSlotAvailable && !checkingAvailability && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0 text-rose-600" />
                  <span>
                    Rất tiếc! Khung giờ bạn vừa chọn đã hết phòng trống. Vui
                    lòng chọn lại giờ khác!
                  </span>
                </div>
              )}

              {/* Hộp tóm tắt lựa chọn */}
              <div className="p-3.5 bg-blue-50/70 rounded-2xl border border-blue-200 text-xs space-y-2">
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
                      {rentalType === "HOUR"
                        ? checkOutInfo.outTimeStr
                        : checkOutTime}{" "}
                      {safeFormatDate(
                        rentalType === "HOUR"
                          ? checkOutInfo.outDateTime
                          : checkOutDate,
                        "dd 'Thg' MM, yyyy",
                      )}
                    </strong>
                  </p>
                  <p>
                    ⏳ Thời gian lưu trú:{" "}
                    <strong className="text-[#006ce4]">
                      {checkOutInfo.badge}
                    </strong>
                  </p>
                </div>
              </div>
            </div>

            {/* BẢNG CHI TIẾT GIÁ */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
              <h3 className="font-black text-gray-900 text-base border-b border-gray-100 pb-3">
                Chi tiết giá phòng
              </h3>
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between text-gray-700">
                  <span>Đơn giá ({checkOutInfo.badge}):</span>
                  <span>
                    {formatVND(
                      rentalType === "HOUR"
                        ? firstHourPrice
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
                    {quantity} phòng × {checkOutInfo.badge}
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
                disabled={
                  !isSlotAvailable || checkingAvailability || submitting
                }
                isLoading={submitting}
                className={`w-full h-14 text-base font-black rounded-xl shadow-lg mt-2 cursor-pointer transition ${
                  !isSlotAvailable
                    ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                    : "bg-[#003580] hover:bg-blue-900 text-white"
                }`}
              >
                {!isSlotAvailable
                  ? "Hết phòng trong khung giờ này"
                  : "Tiến hành thanh toán →"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
