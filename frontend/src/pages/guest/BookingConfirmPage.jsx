// src/pages/guest/BookingConfirmPage.jsx
import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import hotelService from "../../services/hotelService";
import { LoadingSpinner } from "../../components/common";

const BookingConfirmPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // 1. LẤY THÔNG TIN TRUYỀN TỪ URL
  const hotelId = searchParams.get("hotelId");
  const roomId = searchParams.get("roomId");
  const checkIn = searchParams.get("checkIn") || "2026-08-10";
  const checkOut = searchParams.get("checkOut") || "2026-08-12";
  const adults = searchParams.get("adults") || "2";

  // 2. STATES
  const [hotel, setHotel] = useState(null);
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form thông tin khách
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    specialRequest: "",
    paymentMethod: "pay_at_hotel", // pay_at_hotel | vnpay | momo
  });

  // 3. TÍNH SỐ ĐÊM & TỔNG TIỀN
  const calculateNights = (start, end) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 1;
  };

  const nights = calculateNights(checkIn, checkOut);

  // 4. LẤY DỮ LIỆU KHÁCH SẠN / PHÒNG
  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true);
      try {
        if (!hotelId || hotelId === "undefined") throw new Error("No Hotel ID");
        const data = await hotelService.getHotelById(hotelId);
        if (data) {
          setHotel(data);
          const foundRoom = data.rooms?.find((r) => String(r.id) === String(roomId)) || data.rooms?.[0];
          setRoom(foundRoom);
        } else {
          throw new Error("No Data");
        }
      } catch (err) {
        console.warn("Dùng dữ liệu giả lập cho BookingConfirmPage");
        setHotel({
          id: hotelId || "1",
          name: "Crystal Apartment Hillside Phu Quoc - Sunset Town & Firework",
          address: "Khu pho 6 An Thoi, Phú Quốc, Việt Nam",
          rating: 8.0,
          stars: 4,
          image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80",
        });
        setRoom({
          id: roomId || "r1",
          name: "Phòng Superior Giường Đôi nhìn ra Biển",
          bedType: "1 Giường đôi cực lớn",
          pricePerNight: 1500000,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [hotelId, roomId]);

  const pricePerNight = room?.pricePerNight || room?.price || 1500000;
  const totalPrice = pricePerNight * nights;
  const taxAndFees = Math.round(totalPrice * 0.1); // 10% thuế VAT & phí
  const finalPrice = totalPrice + taxAndFees;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const bookingPayload = {
      hotelId,
      roomId: room?.id,
      checkIn,
      checkOut,
      nights,
      adults,
      customerInfo: formData,
      pricing: {
        pricePerNight,
        totalPrice,
        taxAndFees,
        finalPrice,
      },
    };

    try {
      console.log("Gửi đơn đặt phòng:", bookingPayload);
      // await bookingService.createBooking(bookingPayload);
      
      // Giả lập xử lý thành công
      setTimeout(() => {
        setSubmitting(false);
        alert("Đặt phòng thành công!");
        navigate("/booking-success");
      }, 1000);
    } catch (err) {
      setSubmitting(false);
      alert("Đặt phòng thất bại, vui lòng thử lại!");
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="bg-[#f5f5f5] min-h-screen py-6 font-sans text-gray-800">
      <div className="max-w-5xl mx-auto px-4">
        
        {/* TIÊU ĐỀ BƯỚC THỰC HIỆN */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Nhập thông tin chi tiết của quý khách
          </h1>
          <p className="text-xs text-gray-600 mt-1">
            Hãy đảm bảo tất cả thông tin trên trang này là chính xác trước khi bấm tiếp tục.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* ════════════ CỘT TRÁI: FORM ĐIỀN THÔNG TIN (7 CỘT) ════════════ */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* 1. THÔNG TIN LIÊN HỆ */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
              <h2 className="text-base font-bold text-gray-900 border-b pb-3">
                Nhập thông tin chi tiết của bạn
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Họ (tiếng Việt) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    required
                    value={formData.lastName}
                    onChange={handleChange}
                    placeholder="Nguyễn"
                    className="w-full border border-gray-300 rounded-md p-2.5 text-sm focus:outline-none focus:border-[#006ce4]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Tên (tiếng Việt) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    required
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder="Văn A"
                    className="w-full border border-gray-300 rounded-md p-2.5 text-sm focus:outline-none focus:border-[#006ce4]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Địa chỉ email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="example@gmail.com"
                  className="w-full border border-gray-300 rounded-md p-2.5 text-sm focus:outline-none focus:border-[#006ce4]"
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  Email xác nhận đặt phòng sẽ được gửi đến địa chỉ này.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Số điện thoại <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="0901234567"
                  className="w-full border border-gray-300 rounded-md p-2.5 text-sm focus:outline-none focus:border-[#006ce4]"
                />
              </div>
            </div>

            {/* 2. YÊU CẦU ĐẶC BIỆT */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-3">
              <h2 className="text-base font-bold text-gray-900">
                Các yêu cầu đặc biệt
              </h2>
              <p className="text-xs text-gray-600">
                Các yêu cầu đặc biệt không đảm bảo sẽ được đáp ứng – tuy nhiên, chỗ nghỉ sẽ cố gắng hết sức để sắp xếp cho bạn.
              </p>
              <textarea
                name="specialRequest"
                rows="3"
                value={formData.specialRequest}
                onChange={handleChange}
                placeholder="Ví dụ: Vui lòng cung cấp phòng tầng cao, giường lớn..."
                className="w-full border border-gray-300 rounded-md p-2.5 text-sm focus:outline-none focus:border-[#006ce4]"
              ></textarea>
            </div>

            {/* 3. PHƯƠNG THỨC THANH TOÁN */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-3">
              <h2 className="text-base font-bold text-gray-900 border-b pb-3">
                Chọn phương thức thanh toán
              </h2>

              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="pay_at_hotel"
                    checked={formData.paymentMethod === "pay_at_hotel"}
                    onChange={handleChange}
                    className="w-4 h-4 text-[#006ce4]"
                  />
                  <div>
                    <div className="text-sm font-bold text-gray-800">Thanh toán tại chỗ nghỉ</div>
                    <div className="text-xs text-gray-500">Bạn sẽ thanh toán trực tiếp khi nhận phòng</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="vnpay"
                    checked={formData.paymentMethod === "vnpay"}
                    onChange={handleChange}
                    className="w-4 h-4 text-[#006ce4]"
                  />
                  <div>
                    <div className="text-sm font-bold text-gray-800">Thanh toán qua VNPAY (QR Code/ATM)</div>
                    <div className="text-xs text-gray-500">Thanh toán an toàn qua cổng VNPAY</div>
                  </div>
                </label>
              </div>
            </div>

            {/* NÚT HOÀN TẤT ĐẶT PHÒNG */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="w-full md:w-auto bg-[#006ce4] hover:bg-[#0057b8] text-white font-bold text-sm px-8 py-3.5 rounded-md transition shadow"
              >
                {submitting ? "Đang xử lý..." : "Hoàn tất đặt phòng ➔"}
              </button>
            </div>

          </div>

          {/* ════════════ CỘT PHẢI: TÓM TẮT ĐẶT PHÒNG (5 CỘT) ════════════ */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* CARD THÔNG TIN KHÁCH SẠN */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3">
              <div className="flex gap-3">
                <img
                  src={hotel?.image}
                  alt={hotel?.name}
                  className="w-20 h-20 object-cover rounded-lg shrink-0"
                />
                <div>
                  <div className="flex text-amber-400 text-xs mb-1">
                    {"★".repeat(hotel?.stars || 4)}
                  </div>
                  <h3 className="font-bold text-sm text-gray-900 leading-snug line-clamp-2">
                    {hotel?.name}
                  </h3>
                  <p className="text-[11px] text-gray-500 mt-1 line-clamp-1">
                    📍 {hotel?.address}
                  </p>
                </div>
              </div>

              <div className="border-t pt-3 flex items-center justify-between text-xs">
                <span className="font-bold text-gray-700">Đánh giá</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-gray-800">Rất tốt</span>
                  <span className="bg-[#003580] text-white font-bold px-1.5 py-0.5 rounded text-xs">
                    {hotel?.rating || "8.0"}
                  </span>
                </div>
              </div>
            </div>

            {/* CARD CHI TIẾT ĐẶT PHÒNG */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3 text-xs">
              <h4 className="font-bold text-sm text-gray-900 border-b pb-2">
                Chi tiết chuyến đi của bạn
              </h4>

              <div className="grid grid-cols-2 gap-2 border-b pb-3">
                <div>
                  <span className="text-gray-500 block">Nhận phòng</span>
                  <strong className="text-sm text-gray-800">{checkIn}</strong>
                  <span className="text-[10px] text-gray-400 block">Từ 14:00</span>
                </div>
                <div className="border-l pl-3">
                  <span className="text-gray-500 block">Trả phòng</span>
                  <strong className="text-sm text-gray-800">{checkOut}</strong>
                  <span className="text-[10px] text-gray-400 block">Cho đến 12:00</span>
                </div>
              </div>

              <div>
                <span className="text-gray-500 block">Tổng thời gian lưu trú:</span>
                <strong className="text-gray-800">{nights} đêm, {adults} người lớn</strong>
              </div>

              <div className="border-t pt-2">
                <span className="text-gray-500 block">Phòng đã chọn:</span>
                <strong className="text-gray-800 text-sm">{room?.name}</strong>
                <p className="text-gray-500 text-[11px] mt-0.5">🛏️ {room?.bedType}</p>
              </div>
            </div>

            {/* CARD BẢNG GIÁ & TỔNG TIỀN */}
            <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-200 space-y-2 text-xs text-gray-700">
              <h4 className="font-bold text-sm text-gray-900 border-b border-blue-200 pb-2">
                Tóm tắt giá
              </h4>

              <div className="flex justify-between">
                <span>Giá phòng ({nights} đêm):</span>
                <span>VND {totalPrice.toLocaleString("vi-VN")}</span>
              </div>

              <div className="flex justify-between">
                <span>Thuế & Phí dịch vụ (10%):</span>
                <span>VND {taxAndFees.toLocaleString("vi-VN")}</span>
              </div>

              <div className="border-t border-blue-200 pt-2 flex justify-between items-center text-gray-900 font-bold">
                <span className="text-sm">Tổng cộng:</span>
                <span className="text-lg text-red-600">
                  VND {finalPrice.toLocaleString("vi-VN")}
                </span>
              </div>
              <p className="text-[10px] text-gray-500 text-right">Đã bao gồm thuế và phí</p>
            </div>

          </div>

        </form>
      </div>
    </div>
  );
};

export default BookingConfirmPage;