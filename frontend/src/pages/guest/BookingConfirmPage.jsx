import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Building2,
  CalendarDays,
  Users,
  BedDouble,
  ShieldCheck,
  Info,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { differenceInDays } from "date-fns";

// UI Kit & Common Components
import { Button, Input, Badge, StarRating } from "@/components/ui";
import { LoadingSpinner, Breadcrumb } from "@/components/common";
import { BookingStepper, CountdownTimer } from "@/components/booking";

// Services & Stores
import { hotelService, bookingService } from "@/services";
import { useAuthStore } from "@/stores/authStore";

const BookingConfirmPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuthStore(); // Lấy thẳng User từ Zustand cực kỳ sạch sẽ

  const hotelId = searchParams.get("hotelId");
  const roomId = searchParams.get("roomId");

  // ─── 1. STATES ───
  const [checkIn, setCheckIn] = useState(
    searchParams.get("checkIn") || new Date().toISOString().split("T")[0],
  );
  const [checkOut, setCheckOut] = useState(
    searchParams.get("checkOut") ||
      new Date(Date.now() + 86400000).toISOString().split("T")[0],
  );
  const [quantity, setQuantity] = useState(1);
  const [hotel, setHotel] = useState(null);
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form thông tin khách hàng
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    specialRequest: "",
  });

  // ─── 2. TỰ ĐỘNG ĐIỀN THÔNG TIN USER TỪ STORE ───
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

  // ─── 3. FETCH HOTEL & ROOM ───
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
        console.error("Lỗi tải thông tin xác nhận:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [hotelId, roomId]);

  // ─── 4. TÍNH TOÁN TIỀN TỆ CHUẨN XÁC ───
  const totalNights = Math.max(
    1,
    differenceInDays(new Date(checkOut), new Date(checkIn)),
  );
  const basePrice = room?.sell_price || room?.base_price || room?.price || 0;
  const subtotal = basePrice * totalNights * quantity;
  const discountAmount = subtotal * 0.1; // Giảm giá 10%
  const priceAfterDiscount = subtotal - discountAmount;
  const vatTaxAmount = priceAfterDiscount * 0.08; // VAT 8%
  const totalPrice = priceAfterDiscount + vatTaxAmount;

  const formatVND = (num) => Number(num || 0).toLocaleString("vi-VN") + " ₫";

  // ─── 5. SUBMIT TẠO BOOKING ───
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const payload = {
      hotel_id: hotelId,
      room_id: room?.id || roomId,
      checkin_date: checkIn,
      checkout_date: checkOut,
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
    <div className="bg-gray-50/60 min-h-screen pb-20 font-sans">
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
            {/* Đồng hồ đếm ngược giữ phòng */}
            <CountdownTimer
              initialMinutes={15}
              onExpire={() => alert("Thời gian giữ phòng đã hết!")}
            />

            {/* Khối thông tin khách hàng */}
            <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-200 shadow-sm space-y-6">
              <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                <div>
                  <h2 className="text-xl font-black text-gray-900 tracking-tight">
                    Thông tin liên hệ
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Chúng tôi sẽ gửi xác nhận đặt phòng tới thông tin này
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
                    Yêu cầu đặc biệt
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Ví dụ: Phòng tầng cao, 1 giường đôi lớn, nhận phòng muộn sau 18:00..."
                    value={formData.specialRequest}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        specialRequest: e.target.value,
                      })
                    }
                    className="w-full p-3.5 border border-gray-300 rounded-xl text-sm font-medium outline-none focus:border-[#006ce4] focus:ring-4 focus:ring-blue-50 transition-all placeholder:text-gray-400 placeholder:italic"
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

          {/* ─── CỘT PHẢI: TÓM TẮT ĐƠN HÀNG (5 COLS) ─── */}
          <div className="lg:col-span-5 space-y-6">
            {/* THÔNG TIN CHỖ NGHỈ & PHÒNG */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5">
              <div className="flex gap-4 pb-5 border-b border-gray-100">
                <img
                  src={
                    hotel?.image ||
                    hotel?.images?.[0]?.path ||
                    "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=300"
                  }
                  alt={hotel?.name}
                  className="w-24 h-24 object-cover rounded-xl shrink-0"
                />
                <div className="space-y-1">
                  <Badge variant="primary" size="sm">
                    Chỗ nghỉ
                  </Badge>
                  <h3 className="font-extrabold text-gray-900 text-base leading-snug line-clamp-1">
                    {hotel?.name}
                  </h3>
                  <div className="flex items-center gap-1">
                    <StarRating rating={hotel?.star_rating || 5} size={12} />
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-1">
                    {hotel?.address}, {hotel?.city}
                  </p>
                </div>
              </div>

              {/* Chi tiết phòng chọn */}
              <div className="bg-blue-50/50 p-4 rounded-xl space-y-2 border border-blue-100">
                <div className="flex justify-between items-start">
                  <h4 className="font-black text-[#006ce4] text-base">
                    {room?.name || "Phòng Tiêu Chuẩn"}
                  </h4>
                  <span className="text-xs text-emerald-600 font-bold bg-white px-2 py-0.5 rounded shadow-sm">
                    ✓ Còn phòng
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-600 font-medium pt-1">
                  <span className="flex items-center gap-1">
                    <Users size={14} /> Tối đa {room?.capacity || 2} khách
                  </span>
                  <span className="flex items-center gap-1">
                    <BedDouble size={14} /> {room?.bed_type || "Giường đôi"}
                  </span>
                </div>
              </div>

              {/* Điều chỉnh số lượng phòng */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs font-bold text-gray-700">
                  Số lượng phòng đặt:
                </span>
                <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg p-1">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-7 h-7 flex items-center justify-center font-black bg-white rounded shadow-sm hover:bg-gray-100"
                  >
                    -
                  </button>
                  <span className="font-bold text-sm min-w-[20px] text-center">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setQuantity((q) => Math.min(room?.stock || 5, q + 1))
                    }
                    className="w-7 h-7 flex items-center justify-center font-black bg-white rounded shadow-sm hover:bg-gray-100"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Thời gian nhận/trả phòng */}
              <div className="border-t border-gray-100 pt-4 space-y-3">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                      Nhận phòng
                    </span>
                    <span className="font-black text-gray-800">{checkIn}</span>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                      Trả phòng
                    </span>
                    <span className="font-black text-gray-800">{checkOut}</span>
                  </div>
                </div>
                <p className="text-xs font-bold text-gray-600 flex items-center gap-1.5">
                  <CalendarDays size={14} className="text-[#006ce4]" /> Tổng
                  thời gian: {totalNights} đêm
                </p>
              </div>
            </div>

            {/* BẢNG TÍNH TOÁN GIÁ TIỀN */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
              <h3 className="font-black text-gray-900 text-base border-b border-gray-100 pb-3">
                Chi tiết giá thanh toán
              </h3>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between text-gray-600 font-medium">
                  <span>
                    {quantity} phòng × {totalNights} đêm ({formatVND(basePrice)}
                    /đêm)
                  </span>
                  <span className="font-bold text-gray-900">
                    {formatVND(subtotal)}
                  </span>
                </div>

                <div className="flex justify-between text-emerald-600 font-bold bg-emerald-50 p-2.5 rounded-xl">
                  <span className="flex items-center gap-1">
                    <Sparkles size={14} /> Ưu đãi đặt sớm (10%)
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
                    Tổng thanh toán
                  </span>
                  <span className="text-[10px] text-gray-400 italic">
                    Đã bao gồm thuế & tất cả các phí
                  </span>
                </div>
                <span className="text-2xl font-black text-rose-600 tracking-tight">
                  {formatVND(totalPrice)}
                </span>
              </div>

              <Button
                type="submit"
                isLoading={submitting}
                className="w-full h-14 text-base font-black rounded-xl shadow-lg shadow-blue-100 mt-2"
              >
                Tiếp tục đến bước thanh toán
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BookingConfirmPage;
