import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  CalendarDays,
  Users,
  BedDouble,
  ShieldCheck,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
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

// UI Kit & Components
import { Button, Input, Badge, StarRating } from "@/components/ui";
import { LoadingSpinner, Breadcrumb } from "@/components/common";
import { BookingStepper, CountdownTimer } from "@/components/booking";

// Services & Stores
import { hotelService, bookingService } from "@/services";
import { useAuthStore } from "@/stores/authStore";

const BookingConfirmPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const hotelId = searchParams.get("hotelId");
  const roomId = searchParams.get("roomId");

  // ─── 1. STATES ───
  const today = startOfToday();
  const [checkInDate, setCheckInDate] = useState(
    searchParams.get("checkIn") ? new Date(searchParams.get("checkIn")) : today,
  );
  const [checkOutDate, setCheckOutDate] = useState(
    searchParams.get("checkOut")
      ? new Date(searchParams.get("checkOut"))
      : addDays(today, 1),
  );

  // Trạng thái mở Popover Lịch
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(
    checkInDate || today,
  );
  const [hoverDate, setHoverDate] = useState(null);
  const calendarRef = useRef(null);

  const [quantity, setQuantity] = useState(1);
  const [hotel, setHotel] = useState(null);
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form khách hàng
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    specialRequest: "",
  });

  // Tự điền thông tin User
  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        fullName: user.full_name || user.name || user.username || "",
        email: user.email || "",
        phone: user.phone || user.phone_number || "",
      }));
    }
  }, [user]);

  // Fetch thông tin khách sạn & phòng
  useEffect(() => {
    const fetchData = async () => {
      if (!hotelId) return;
      setLoading(true);
      try {
        const data = await hotelService.getById(hotelId);
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

  // Đóng lịch khi click ngoài vùng
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target)) {
        setIsCalendarOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ─── 2. LOGIC CHỌN NGÀY TRÊN LỊCH ───
  const handleDateClick = (date) => {
    if (isBefore(date, today)) return;

    if (!checkInDate || (checkInDate && checkOutDate)) {
      // Bắt đầu chọn ngày nhận mới
      setCheckInDate(date);
      setCheckOutDate(null);
    } else if (checkInDate && !checkOutDate) {
      // Đã có Check-in, chọn tiếp Check-out
      if (isBefore(date, checkInDate) || isSameDay(date, checkInDate)) {
        setCheckInDate(date);
      } else {
        setCheckOutDate(date);
        setIsCalendarOpen(false); // Hoàn thành chọn ➔ đóng lịch
      }
    }
  };

  const totalNights =
    checkInDate && checkOutDate
      ? Math.max(1, differenceInDays(checkOutDate, checkInDate))
      : 1;

  // Format ngày theo phong cách Trip.com: "T7, 29 thg 8- CN, 30 thg 8"
  const formatHeaderDates = () => {
    if (!checkInDate) return "Chọn ngày nhận phòng";
    const inStr = format(checkInDate, "EEE, d 'thg' M", { locale: vi });
    if (!checkOutDate) return `${inStr} - Chọn ngày trả`;
    const outStr = format(checkOutDate, "EEE, d 'thg' M", { locale: vi });
    return `${inStr}- ${outStr}`;
  };

  // ─── 3. TÍNH TOÁN TIỀN TỆ ───
  const basePrice = room?.sell_price || room?.base_price || room?.price || 0;
  const subtotal = basePrice * totalNights * quantity;
  const discountAmount = subtotal * 0.1; // Giảm 10%
  const priceAfterDiscount = subtotal - discountAmount;
  const vatTaxAmount = priceAfterDiscount * 0.08; // 8% VAT
  const totalPrice = priceAfterDiscount + vatTaxAmount;

  const formatVND = (num) => Number(num || 0).toLocaleString("vi-VN") + " ₫";

  // ─── 4. RENDER 1 THÁNG TRONG LỊCH ───
  const renderMonthCalendar = (monthDate) => {
    const start = startOfMonth(monthDate);
    const end = endOfMonth(monthDate);
    const days = eachDayOfInterval({ start, end });

    // Thứ trong tuần: T2 -> CN
    // getDay trả về: 0 = CN, 1 = T2, ..., 6 = T7
    const startDayIndex = (getDay(start) + 6) % 7; // Chuyển để T2 = 0, CN = 6
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
          {format(monthDate, "'tháng' M, yyyy", { locale: vi })}
        </div>

        {/* Tiêu đề thứ */}
        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {weekHeaders.map((w, idx) => (
            <span
              key={idx}
              className={`text-xs font-bold ${
                w.isWeekend ? "text-[#006ce4]" : "text-gray-900"
              }`}
            >
              {w.label}
            </span>
          ))}
        </div>

        {/* Lưới các ngày trong tháng */}
        <div className="grid grid-cols-7 gap-y-1 text-center text-xs">
          {blanks.map((_, i) => (
            <div key={`blank-${i}`} className="h-9" />
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

            const dayOfWeek = getDay(day);
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

            let btnClasses =
              "h-9 w-full flex items-center justify-center font-bold text-xs transition-all relative ";

            if (isPast) {
              btnClasses += "text-gray-300 cursor-not-allowed font-normal";
            } else if (isStart && isEnd) {
              btnClasses += "bg-[#287dfa] text-white rounded-lg z-10 font-bold";
            } else if (isStart) {
              btnClasses +=
                "bg-[#287dfa] text-white rounded-l-lg z-10 font-bold " +
                (checkOutDate ? "rounded-r-none" : "rounded-r-lg");
            } else if (isEnd) {
              btnClasses +=
                "bg-[#287dfa] text-white rounded-r-lg rounded-l-none z-10 font-bold";
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
                {format(day, "d")}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // ─── 5. SUBMIT TẠO BOOKING ───
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!checkInDate || !checkOutDate) {
      alert("Vui lòng chọn ngày nhận và trả phòng hợp lệ!");
      return;
    }
    setSubmitting(true);

    const payload = {
      hotel_id: hotelId,
      room_id: room?.id || roomId,
      checkin_date: format(checkInDate, "yyyy-MM-dd"),
      checkout_date: format(checkOutDate, "yyyy-MM-dd"),
      quantity: quantity,
      customer_name: formData.fullName.trim(),
      guest_email: formData.email.trim(),
      guest_phone: formData.phone.trim(),
      special_require: formData.specialRequest.trim(),
      subtotal: subtotal,
      discount_amount: discountAmount,
      tax_amount: vatTaxAmount,
      total_price: totalPrice,
      status: "pending",
    };

    try {
      const result = await bookingService.create(payload);
      const code =
        result?.booking_code || result?.code || result?.id || result?.bookingId;
      if (code) {
        navigate(`/checkout?code=${code}&amount=${totalPrice}`);
      } else {
        alert("Đặt phòng thành công!");
        navigate("/");
      }
    } catch (err) {
      alert("Đặt phòng thất bại: " + (err.message || "Vui lòng thử lại"));
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
      {/* ─── STEPPER (BƯỚC 2) ─── */}
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
          {/* ─── CỘT TRÁI: FORM ĐIỀN THÔNG TIN (7 COLS) ─── */}
          <div className="lg:col-span-7 space-y-6">
            <CountdownTimer
              initialMinutes={15}
              onExpire={() => alert("Thời gian giữ phòng đã hết!")}
            />

            <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-200 shadow-sm space-y-6">
              <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                <div>
                  <h2 className="text-xl font-black text-gray-900 tracking-tight">
                    Khách lưu trú là ai?
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Tên khách phải khớp với giấy tờ tùy thân hợp lệ sẽ dùng để
                    nhận phòng.
                  </p>
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
                    placeholder="Ví dụ: Phòng tầng cao, 1 giường đôi lớn, nhận phòng muộn..."
                    value={formData.specialRequest}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        specialRequest: e.target.value,
                      })
                    }
                    className="w-full p-3.5 border border-gray-300 rounded-xl text-sm font-medium outline-none focus:border-[#006ce4] focus:ring-4 focus:ring-blue-50 transition-all"
                  />
                </div>
              </div>

              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex items-start gap-3">
                <ShieldCheck
                  className="text-emerald-600 shrink-0 mt-0.5"
                  size={18}
                />
                <p className="text-xs text-emerald-800 leading-relaxed font-medium">
                  Thông tin cá nhân của bạn được bảo mật tuyệt đối theo tiêu
                  chuẩn mã hóa SSL quốc tế.
                </p>
              </div>
            </div>
          </div>

          {/* ─── CỘT PHẢI: TÓM TẮT ĐƠN HÀNG & BỘ LỊCH ĐÔI TRIP.COM (5 COLS) ─── */}
          <div className="lg:col-span-5 space-y-6">
            {/* CARD THÔNG TIN KHÁCH SẠN */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
              <div className="flex gap-4 pb-4 border-b border-gray-100">
                <img
                  src={
                    hotel?.image ||
                    hotel?.images?.[0]?.path ||
                    "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=300&auto=format&fit=crop&q=80"
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
                    {hotel?.name || "Sunrise Airport Hotel"}
                  </h3>
                  <p className="text-xs text-gray-500 line-clamp-1">
                    {hotel?.address}, {hotel?.city}
                  </p>
                </div>
              </div>

              {/* Chi tiết phòng */}
              <div className="space-y-1 text-xs text-gray-600">
                <h4 className="font-bold text-gray-900 text-sm">
                  {room?.name || "Standard Double Room"}
                </h4>
                <p className="text-gray-500">
                  x2 • 1 giường queen • Wi-Fi miễn phí • Cấm hút thuốc • 15 m²
                </p>
              </div>
            </div>

            {/* 🌟 CARD THỜI GIAN LƯU TRÚ & DROPDOWN LỊCH 2 THÁNG TRIP.COM 🌟 */}
            <div
              ref={calendarRef}
              className="relative bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-3"
            >
              <h3 className="text-base font-black text-gray-900 tracking-tight">
                {formatHeaderDates()}
              </h3>

              <div className="text-xs text-gray-600 space-y-0.5">
                <p>Nhận phòng: 14:00–23:00</p>
                <p>Trả phòng: Trước 12:00</p>
              </div>

              {/* THANH ĐIỀU HƯỚNG MỞ LỊCH & SỐ PHÒNG */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs font-bold text-gray-800">
                {/* Nút bấm mở lịch */}
                <button
                  type="button"
                  onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all ${
                    isCalendarOpen
                      ? "border-[#287dfa] text-[#287dfa] bg-blue-50/50"
                      : "border-gray-200 hover:border-gray-400 bg-white"
                  }`}
                >
                  <CalendarDays size={14} className="text-[#287dfa]" />
                  <span>{totalNights} đêm</span>
                  {isCalendarOpen ? (
                    <ChevronUp size={14} className="text-[#287dfa]" />
                  ) : (
                    <ChevronDown size={14} className="text-gray-400" />
                  )}
                </button>

                {/* Điều chỉnh số lượng phòng */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg p-1">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="w-6 h-6 flex items-center justify-center font-black bg-white rounded shadow-sm hover:bg-gray-100 text-gray-700"
                    >
                      -
                    </button>
                    <span className="font-bold text-xs px-1 text-center">
                      {quantity} phòng
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setQuantity((q) => Math.min(room?.stock || 5, q + 1))
                      }
                      className="w-6 h-6 flex items-center justify-center font-black bg-white rounded shadow-sm hover:bg-gray-100 text-gray-700"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* 🌟 DROPDOWN LỊCH ĐÔI 2 THÁNG 🌟 */}
              {isCalendarOpen && (
                <div className="absolute left-0 lg:right-0 lg:left-auto top-full mt-2 z-50 bg-white border border-gray-200 rounded-2xl shadow-2xl p-6 w-full sm:w-[600px] animate-in fade-in zoom-in-95 duration-150">
                  {/* Nút chuyển tháng Next/Prev */}
                  <div className="flex justify-between items-center mb-2 px-2">
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentCalendarMonth((prev) => subMonths(prev, 1))
                      }
                      disabled={isBefore(
                        startOfMonth(currentCalendarMonth),
                        startOfMonth(today),
                      )}
                      className="p-1.5 rounded-full hover:bg-gray-100 text-gray-600 disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                      <ChevronLeft size={18} />
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setCurrentCalendarMonth((prev) => addMonths(prev, 1))
                      }
                      className="p-1.5 rounded-full hover:bg-gray-100 text-gray-600"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>

                  {/* 2 CỘT THÁNG SONG SONG */}
                  <div className="flex flex-col sm:flex-row gap-8">
                    {renderMonthCalendar(currentCalendarMonth)}
                    {renderMonthCalendar(addMonths(currentCalendarMonth, 1))}
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                    <span>
                      * Chọn ngày nhận phòng trước, sau đó chọn ngày trả phòng.
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsCalendarOpen(false)}
                      className="font-bold text-[#006ce4] hover:underline"
                    >
                      Đóng lại
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* BẢNG TÍNH GIÁ CHI TIẾT */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
              <h3 className="font-black text-gray-900 text-base border-b border-gray-100 pb-3">
                Giá Chi Tiết
              </h3>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between text-gray-700">
                  <span>
                    {quantity} phòng × {totalNights} đêm
                  </span>
                  <span>{formatVND(subtotal)}</span>
                </div>

                <div className="flex justify-between text-emerald-600 font-bold bg-emerald-50 p-2.5 rounded-xl">
                  <span className="flex items-center gap-1">
                    <Sparkles size={14} /> Giảm Giá Đặc Biệt (10%)
                  </span>
                  <span>- {formatVND(discountAmount)}</span>
                </div>

                <div className="flex justify-between text-gray-500 font-medium">
                  <span>Thuế VAT & phí dịch vụ (8%)</span>
                  <span>+ {formatVND(vatTaxAmount)}</span>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4 flex justify-between items-center">
                <div>
                  <span className="text-base font-black text-gray-900 block">
                    Tổng
                  </span>
                  <span className="text-[10px] text-gray-400 italic">
                    Đã bao gồm thuế & phí
                  </span>
                </div>
                <span className="text-2xl font-black text-rose-600 tracking-tight">
                  {formatVND(totalPrice)}
                </span>
              </div>

              <Button
                type="submit"
                isLoading={submitting}
                className="w-full h-14 text-base font-black rounded-xl shadow-lg shadow-blue-100 mt-2 bg-[#287dfa] hover:bg-blue-600 text-white"
              >
                Bước cuối cùng
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BookingConfirmPage;
