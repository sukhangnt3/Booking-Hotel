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
  CreditCard,
  Building2,
  Check,
  Clock,
  Sun,
  Moon,
  Hourglass,
  AlertCircle,
  Calendar,
  Users,
  Pencil,
  Bed,
} from "lucide-react";
import {
  format,
  isSameDay,
  isBefore,
  startOfToday,
  differenceInDays,
  addDays,
} from "date-fns";
import { vi } from "date-fns/locale";

import { Button, Badge, StarRating } from "@/components/ui";
import { LoadingSpinner, Breadcrumb } from "@/components/common";
import { BookingStepper } from "@/components/booking";
import { hotelService } from "@/services";
import { useAuthStore } from "@/stores/authStore";
import apiClient from "@/services/apiClient";

const BACKEND_BASE_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/api\/?$/, "");

const parseImageUrl = (img) => {
  if (!img)
    return "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600";
  let raw = String(
    typeof img === "string" ? img : img.url || img.path || img.thumbnail || "",
  ).trim();
  if (!raw || raw.startsWith("blob:"))
    return "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600";
  if (
    raw.startsWith("http://") ||
    raw.startsWith("https://") ||
    raw.startsWith("data:image/")
  )
    return raw;
  return `${BACKEND_BASE_URL}${raw.startsWith("/") ? raw : `/${raw}`}`;
};

const safeFormatDisplayDate = (date) => {
  if (!date) return "";
  try {
    const d = new Date(date);
    return isNaN(d.getTime())
      ? ""
      : format(d, "eee, dd 'Thg' MM, yyyy", { locale: vi });
  } catch {
    return "";
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

const isValidPhone = (phone) => {
  const cleanPhone = String(phone || "")
    .replace(/[\s.-]/g, "")
    .trim();
  return (
    /^(0|\+84)(3|5|7|8|9)[0-9]{8}$/.test(cleanPhone) ||
    /^0[0-9]{9}$/.test(cleanPhone)
  );
};

const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
};

export default function BookingConfirmPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const hotelId = searchParams.get("hotelId");
  const roomId = searchParams.get("roomId");
  const today = useMemo(() => startOfToday(), []);

  // 1. DỮ LIỆU CỐ ĐỊNH NHẬN TỪ TRANG CHI TIẾT
  const rentalType = searchParams.get("rentalType") || "DAY";
  const checkInTime = searchParams.get("checkInTime") || "14:00";
  const checkOutTime = searchParams.get("checkOutTime") || "12:00";
  const hoursCount = Number(searchParams.get("hours")) || 2;
  const adults = Number(searchParams.get("adults")) || 1;
  const children = Number(searchParams.get("children")) || 0;
  const quantity = Number(searchParams.get("rooms")) || 1;

  const checkInDate = useMemo(() => {
    return searchParams.get("checkIn")
      ? new Date(searchParams.get("checkIn"))
      : today;
  }, [searchParams, today]);

  const checkOutDate = useMemo(() => {
    return searchParams.get("checkOut")
      ? new Date(searchParams.get("checkOut"))
      : rentalType === "DAY" || rentalType === "OVERNIGHT"
        ? addDays(today, 1)
        : today;
  }, [searchParams, today, rentalType]);

  // 2. DỮ LIỆU KHÁCH SẠN & PHÒNG
  const [hotel, setHotel] = useState(null);
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [paymentOption, setPaymentOption] = useState(
    searchParams.get("paymentType") || "FULL",
  );

  // Kiểm tra tồn phòng
  const [isSlotAvailable, setIsSlotAvailable] = useState(true);
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  // Form thông tin liên hệ
  const contactFormRef = useRef(null);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    specialRequest: "",
  });

  const [formErrors, setFormErrors] = useState({
    fullName: "",
    email: "",
    phone: "",
  });

  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        fullName: user.full_name || user.name || user.fullName || prev.fullName,
        email: user.email || prev.email,
        phone: user.phone || prev.phone,
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

  // 🌟 TÍNH THỜI LƯỢNG LƯU TRÚ VÀ HUY HIỆU
  const durationInfo = useMemo(() => {
    if (rentalType === "HOUR") {
      return {
        badge: `${hoursCount} Giờ`,
        rentalLabel: `Thuê theo giờ (${hoursCount} tiếng)`,
        icon: Clock,
      };
    }
    if (rentalType === "OVERNIGHT") {
      return {
        badge: "1 Đêm",
        rentalLabel: "Thuê qua đêm",
        icon: Moon,
      };
    }
    if (rentalType === "HALF_DAY") {
      return {
        badge: "1 Buổi",
        rentalLabel: "Thuê theo buổi",
        icon: Hourglass,
      };
    }
    const diffDays = Math.max(1, differenceInDays(checkOutDate, checkInDate));
    return {
      badge: `${diffDays} Đêm`,
      rentalLabel: `Theo ngày (${diffDays} đêm lưu trú)`,
      icon: Sun,
    };
  }, [rentalType, hoursCount, checkOutDate, checkInDate]);

  // 🌟 TÍNH TOÁN BẢNG GIÁ CHI TIẾT
  const pricingDetails = useMemo(() => {
    if (!room) return { totalPrice: 0, breakdown: [] };

    const baseDailyPrice = Number(room.base_price || room.sell_price || 650000);
    const firstHourPrice =
      Number(room.hourly_price) > 0
        ? Number(room.hourly_price)
        : Math.round(baseDailyPrice * 0.25);

    const breakdown = [];
    let singleRoomTotal = 0;

    if (rentalType === "HOUR") {
      let hTotal = 0;
      for (let i = 0; i < hoursCount; i++) {
        let curHPrice = firstHourPrice;
        if (Array.isArray(room.hourly_tiers) && room.hourly_tiers.length > 0) {
          const matchedTier = [...room.hourly_tiers]
            .sort((a, b) => b.from_hour - a.from_hour)
            .find((t) => i + 1 >= Number(t.from_hour));
          if (matchedTier) curHPrice = Number(matchedTier.price);
        }
        hTotal += curHPrice;
      }
      breakdown.push({
        label: `Tiền thuê phòng (${hoursCount} giờ)`,
        price: hTotal,
      });
      singleRoomTotal = hTotal;
    } else if (rentalType === "HALF_DAY") {
      const baseHalfPrice = Number(
        room.half_day_price || Math.round(baseDailyPrice * 0.8),
      );
      breakdown.push({
        label: "Tiền thuê theo buổi",
        price: baseHalfPrice,
      });
      singleRoomTotal = baseHalfPrice;
    } else if (rentalType === "OVERNIGHT") {
      const overnightPrice = Number(room.overnight_price || baseDailyPrice);
      breakdown.push({
        label: "Tiền thuê qua đêm",
        price: overnightPrice,
      });
      singleRoomTotal = overnightPrice;
    } else {
      const totalDays = Math.max(
        1,
        differenceInDays(checkOutDate, checkInDate),
      );
      const dayFee = baseDailyPrice * totalDays;
      breakdown.push({
        label: `Tiền thuê ${totalDays} đêm (${formatVND(baseDailyPrice)}/đêm)`,
        price: dayFee,
      });
      singleRoomTotal = dayFee;
    }

    return {
      totalPrice: singleRoomTotal * quantity,
      breakdown,
    };
  }, [room, rentalType, hoursCount, checkOutDate, checkInDate, quantity]);

  const totalPrice = pricingDetails.totalPrice;
  const depositAmount = Math.round(totalPrice * 0.3);
  const remainingAmount = totalPrice - depositAmount;
  const amountToPayNow =
    paymentOption === "DEPOSIT_30" ? depositAmount : totalPrice;

  // 🌟 NÚT QUAY LẠI CHỈNH SỬA THÔNG TIN ĐẶT PHÒNG
  const handleChangeDetails = () => {
    navigate(
      `/hotel/${hotelId}?checkIn=${safeFormatDate(checkInDate, "yyyy-MM-dd")}&checkOut=${safeFormatDate(checkOutDate, "yyyy-MM-dd")}&rentalType=${rentalType}&checkInTime=${checkInTime}&checkOutTime=${checkOutTime}&hours=${hoursCount}&adults=${adults}&children=${children}&rooms=${quantity}`,
    );
  };

  // Kiểm tra tồn phòng thực tế
  const verifyAvailability = useCallback(async () => {
    if (!hotelId || !roomId) return;
    setCheckingAvailability(true);
    try {
      const finalInDateStr = safeFormatDate(checkInDate, "yyyy-MM-dd");
      const finalOutDateStr = safeFormatDate(checkOutDate, "yyyy-MM-dd");

      const res = await apiClient.get(`/hotels/${hotelId}/availability`, {
        params: {
          checkIn: finalInDateStr,
          checkOut: finalOutDateStr,
          checkInTime,
          checkOutTime,
          rentalType,
          room_id: roomId,
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
    quantity,
    adults,
  ]);

  useEffect(() => {
    verifyAvailability();
  }, [verifyAvailability]);

  // Gửi đơn đặt phòng
  const handleSubmit = async (e) => {
    e.preventDefault();

    const errors = {};
    if (!formData.fullName.trim()) {
      errors.fullName = "Vui lòng nhập họ và tên người nhận phòng!";
    } else if (formData.fullName.trim().length < 2) {
      errors.fullName = "Họ và tên người đặt phòng phải có ít nhất 2 ký tự!";
    }

    if (!formData.phone.trim()) {
      errors.phone = "Vui lòng nhập số điện thoại để khách sạn liên hệ!";
    } else if (!isValidPhone(formData.phone)) {
      errors.phone =
        "Số điện thoại không hợp lệ (Ví dụ: 0912345678 hoặc +84912345678)!";
    }

    if (!formData.email.trim()) {
      errors.email =
        "Vui lòng nhập email để nhận thông tin xác nhận đặt phòng!";
    } else if (!isValidEmail(formData.email)) {
      errors.email =
        "Địa chỉ email không đúng định dạng (Ví dụ: example@gmail.com)!";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      contactFormRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      return;
    }

    setFormErrors({ fullName: "", email: "", phone: "" });

    const maxCapacity = Number(room?.max_adults || room?.capacity || 2);
    if (adults > maxCapacity * quantity) {
      return alert(
        `Số lượng khách (${adults} người lớn) vượt quá sức chứa của ${quantity} phòng (tối đa ${maxCapacity * quantity} người). Vui lòng quay lại tăng thêm số phòng!`,
      );
    }

    if (!isSlotAvailable) {
      return alert(
        "Rất tiếc! Khung giờ này phòng đã có khách đặt kín. Vui lòng bấm 'Thay đổi' để chọn khung giờ khác!",
      );
    }

    setSubmitting(true);

    const payload = {
      hotel_id: hotelId,
      room_id: room?.id || roomId,
      rental_type: rentalType,
      rentalType: rentalType,
      checkin_date: safeFormatDate(checkInDate, "yyyy-MM-dd"),
      checkout_date: safeFormatDate(checkOutDate, "yyyy-MM-dd"),
      checkin_time: checkInTime,
      checkout_time: checkOutTime,
      hours: rentalType === "HOUR" ? hoursCount : undefined,
      duration_label: durationInfo.badge,
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

  const RentalIcon = durationInfo.icon;

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
          noValidate
          className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-6"
        >
          {/* CỘT TRÁI: THÔNG TIN LIÊN HỆ & LỰA CHỌN THANH TOÁN */}
          <div className="lg:col-span-7 space-y-6">
            {/* THÔNG TIN LIÊN HỆ */}
            <div
              ref={contactFormRef}
              className="bg-white p-6 md:p-8 rounded-2xl border border-gray-200 shadow-sm space-y-6"
            >
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
                <div>
                  <label className="text-sm font-bold text-gray-800 block mb-1">
                    Họ và tên người đặt <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nhập họ và tên như trên CCCD / Hộ chiếu"
                    value={formData.fullName}
                    onChange={(e) => {
                      setFormData({ ...formData, fullName: e.target.value });
                      if (formErrors.fullName) {
                        setFormErrors((prev) => ({ ...prev, fullName: "" }));
                      }
                    }}
                    className={`w-full h-11 px-3.5 border rounded-xl text-sm font-semibold outline-none transition bg-white ${
                      formErrors.fullName
                        ? "border-rose-500 bg-rose-50/20 focus:border-rose-600"
                        : "border-gray-300 focus:border-[#003580]"
                    }`}
                  />
                  {formErrors.fullName && (
                    <span className="text-xs text-rose-600 font-bold mt-1.5 flex items-center gap-1">
                      <AlertCircle size={13} className="shrink-0" />
                      {formErrors.fullName}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-bold text-gray-800 block mb-1">
                      Địa chỉ Email <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="email@example.com"
                      value={formData.email}
                      onChange={(e) => {
                        setFormData({ ...formData, email: e.target.value });
                        if (formErrors.email) {
                          setFormErrors((prev) => ({ ...prev, email: "" }));
                        }
                      }}
                      className={`w-full h-11 px-3.5 border rounded-xl text-sm font-semibold outline-none transition bg-white ${
                        formErrors.email
                          ? "border-rose-500 bg-rose-50/20 focus:border-rose-600"
                          : "border-gray-300 focus:border-[#003580]"
                      }`}
                    />
                    {formErrors.email && (
                      <span className="text-xs text-rose-600 font-bold mt-1.5 flex items-center gap-1">
                        <AlertCircle size={13} className="shrink-0" />
                        {formErrors.email}
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-bold text-gray-800 block mb-1">
                      Số điện thoại liên hệ{" "}
                      <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="Ví dụ: 0912345678"
                      value={formData.phone}
                      onChange={(e) => {
                        setFormData({ ...formData, phone: e.target.value });
                        if (formErrors.phone) {
                          setFormErrors((prev) => ({ ...prev, phone: "" }));
                        }
                      }}
                      className={`w-full h-11 px-3.5 border rounded-xl text-sm font-semibold outline-none transition bg-white font-mono ${
                        formErrors.phone
                          ? "border-rose-500 bg-rose-50/20 focus:border-rose-600"
                          : "border-gray-300 focus:border-[#003580]"
                      }`}
                    />
                    {formErrors.phone && (
                      <span className="text-xs text-rose-600 font-bold mt-1.5 flex items-center gap-1">
                        <AlertCircle size={13} className="shrink-0" />
                        {formErrors.phone}
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5 pt-2">
                  <label className="text-sm font-bold text-gray-700 block">
                    Yêu cầu đặc biệt (Không bắt buộc)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Ví dụ: Phòng tầng cao, yên tĩnh, chuẩn bị trước chìa khóa..."
                    value={formData.specialRequest}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        specialRequest: e.target.value,
                      })
                    }
                    className="w-full p-3.5 border border-gray-300 rounded-xl text-sm font-medium outline-none focus:border-[#003580] transition"
                  />
                </div>
              </div>

              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex items-start gap-3">
                <ShieldCheck
                  className="text-emerald-600 shrink-0 mt-0.5"
                  size={18}
                />
                <p className="text-xs text-emerald-800 leading-relaxed font-medium">
                  Thông tin đặt phòng được bảo mật an toàn tuyệt đối theo tiêu
                  chuẩn mã hóa SSL.
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
                  Chọn hình thức thanh toán thuận tiện nhất cho chuyến đi của
                  bạn.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                {/* 100% */}
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
                      <p className="text-xs text-gray-500 leading-relaxed">
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

                {/* CỌC 30% */}
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
                      <p className="text-xs text-gray-500 leading-relaxed">
                        Cọc trước 30% để chắc chắn giữ chỗ. 70% còn lại thanh
                        toán trực tiếp khi nhận phòng.
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
                      Tiền cọc trả ngay:
                    </span>
                    <span className="font-black text-emerald-700 text-base">
                      {formatVND(depositAmount)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-3.5 bg-blue-50 rounded-xl border border-blue-200 text-blue-900 text-xs flex items-start gap-2.5">
                <Building2
                  size={16}
                  className="shrink-0 mt-0.5 text-[#003580]"
                />
                <p className="leading-relaxed">
                  {paymentOption === "DEPOSIT_30" ? (
                    <>
                      Đặt cọc 30% (<strong>{formatVND(depositAmount)}</strong>)
                      giúp chỗ nghỉ khóa giữ phòng cho bạn. Số tiền còn lại{" "}
                      <strong>{formatVND(remainingAmount)}</strong> sẽ thanh
                      toán tại quầy lễ tân khi nhận phòng.
                    </>
                  ) : (
                    <>
                      Thanh toán trọn gói 100% (
                      <strong>{formatVND(totalPrice)}</strong>). Khi đến nơi,
                      bạn chỉ cần đọc mã đặt phòng để nhận chìa khóa ngay mà
                      không cần rút ví.
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* CỘT PHẢI: 🌟 THẺ TÓM TẮT CHUYẾN ĐI (CHUẨN BOOKING.COM / AGODA) 🌟 */}
          <div className="lg:col-span-5 space-y-5">
            {/* THẺ 1: THÔNG TIN KHÁCH SẠN & PHÒNG */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
              <div className="flex gap-3.5 pb-4 border-b border-gray-100">
                <img
                  src={parseImageUrl(hotel?.image)}
                  alt={hotel?.name}
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.src =
                      "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=300";
                  }}
                  className="w-20 h-20 object-cover rounded-xl shrink-0 shadow-2xs"
                />
                <div className="space-y-1 overflow-hidden">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge variant="primary" size="sm">
                      Khách sạn
                    </Badge>
                    <StarRating rating={hotel?.star_rating || 3} size={12} />
                  </div>
                  <h3 className="font-black text-gray-900 text-base leading-tight truncate">
                    {hotel?.name}
                  </h3>
                  <p className="text-xs text-gray-500 line-clamp-1">
                    {hotel?.address}, {hotel?.city}
                  </p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-gray-900 text-sm">
                  <Bed size={15} className="text-[#003580] shrink-0" />
                  <span>{room?.name || "Phòng tiêu chuẩn"}</span>
                </div>
                <p className="text-gray-500 text-[11px] pl-5">
                  {room?.bed_type || "1 Giường đôi"} • {room?.room_area || 25}{" "}
                  m² • Miễn phí Wi-Fi • Sức chứa:{" "}
                  {room?.max_adults || room?.capacity || 2} người lớn/phòng
                </p>
              </div>
            </div>

            {/* THẺ 2: TÓM TẮT CHI TIẾT CHUYẾN ĐI CÓ NÚT THAY ĐỔI */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <h4 className="font-black text-sm text-gray-900 flex items-center gap-2">
                  <Calendar size={16} className="text-[#003580]" />
                  <span>Thông tin chuyến đi</span>
                </h4>
                <button
                  type="button"
                  onClick={handleChangeDetails}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#006ce4] hover:underline cursor-pointer bg-blue-50 px-2 py-1 rounded-lg border border-blue-200 transition"
                  title="Thay đổi ngày giờ hoặc số lượng phòng"
                >
                  <Pencil size={12} />
                  <span>Thay đổi</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                {/* Khối Nhận phòng */}
                <div className="p-3 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Nhận phòng:
                  </span>
                  <strong className="text-sm font-black text-slate-900 block">
                    {checkInTime}
                  </strong>
                  <span className="text-slate-600 block text-[11px] font-semibold">
                    {safeFormatDisplayDate(checkInDate)}
                  </span>
                </div>

                {/* Khối Trả phòng */}
                <div className="p-3 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Trả phòng:
                  </span>
                  <strong className="text-sm font-black text-slate-900 block">
                    {checkOutTime}
                  </strong>
                  <span className="text-slate-600 block text-[11px] font-semibold">
                    {safeFormatDisplayDate(checkOutDate)}
                  </span>
                </div>
              </div>

              {/* Thông tin hình thức thuê & Số lượng khách */}
              <div className="space-y-2 pt-1 border-t border-slate-100 text-xs">
                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-500 font-medium flex items-center gap-1.5">
                    <RentalIcon size={14} className="text-[#003580]" />
                    <span>Hình thức lưu trú:</span>
                  </span>
                  <span className="font-bold text-slate-900 bg-blue-50 border border-blue-200 text-[#003580] px-2 py-0.5 rounded-md text-[11px]">
                    {durationInfo.rentalLabel}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-500 font-medium flex items-center gap-1.5">
                    <Users size={14} className="text-[#003580]" />
                    <span>Khách & Phòng:</span>
                  </span>
                  <strong className="text-slate-900 font-bold">
                    {quantity} phòng • {adults} người lớn
                    {children > 0 ? `, ${children} trẻ em` : ""}
                  </strong>
                </div>
              </div>
            </div>

            {/* CẢNH BÁO NẾU PHÒNG BỊ ĐẶT KÍN */}
            {!isSlotAvailable && !checkingAvailability && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-bold flex items-center gap-2.5">
                <AlertCircle size={16} className="shrink-0 text-rose-600" />
                <span>
                  Khung giờ này vừa có khách đặt kín. Vui lòng bấm{" "}
                  <strong>"Thay đổi"</strong> để chọn giờ khác!
                </span>
              </div>
            )}

            {/* THẺ 3: BẢNG CHI TIẾT GIÁ PHÒNG & NÚT THANH TOÁN */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
              <h3 className="font-black text-gray-900 text-base border-b border-gray-100 pb-3">
                Chi tiết giá phòng
              </h3>
              <div className="space-y-2 text-xs">
                {pricingDetails.breakdown.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-gray-700">
                    <span>{item.label}:</span>
                    <span className="font-semibold text-gray-900">
                      {formatVND(item.price)}
                    </span>
                  </div>
                ))}

                <div className="flex justify-between text-gray-700 pt-1 border-t border-gray-100">
                  <span>Số lượng phòng:</span>
                  <span>{quantity} phòng</span>
                </div>

                <div className="flex justify-between text-gray-900 font-bold pt-2 border-t border-gray-100">
                  <span>Tổng tiền phòng:</span>
                  <span className="text-sm text-[#003580]">
                    {formatVND(totalPrice)}
                  </span>
                </div>

                {paymentOption === "DEPOSIT_30" && (
                  <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 space-y-1.5 mt-2">
                    <div className="flex justify-between text-emerald-700 font-black">
                      <span>Tiền cọc thanh toán ngay (30%):</span>
                      <span>{formatVND(depositAmount)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600 font-medium">
                      <span>Thanh toán tại quầy lễ tân:</span>
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
                      ? "Tiền cọc trả ngay"
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
