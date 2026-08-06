import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import hotelService from "../../services/hotelService";
import bookingService from "../../services/bookingService";
import { LoadingSpinner } from "../../components/common";

const BookingConfirmPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const hotelId = searchParams.get("hotelId");
  const roomId = searchParams.get("roomId");
  const checkIn = searchParams.get("checkIn");
  const checkOut = searchParams.get("checkOut");

  const [hotel, setHotel] = useState(null);
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form khớp bảng 16: booking (customer_name, guest_email, guest_phone)
  const [formData, setFormData] = useState({
    lastName: "",
    firstName: "",
    email: "",
    phone: "",
    specialRequest: "",
    paymentMethod: "VNPay",
  });

  useEffect(() => {
    const initPage = async () => {
      if (!hotelId || !roomId) return;
      try {
        setLoading(true);
        // 1. Lấy dữ liệu khách sạn & phòng
        const data = await hotelService.getHotelById(hotelId);
        setHotel(data);
        const r = data.rooms?.find((room) => room.id === roomId);
        setRoom(r);

        // 2. Khóa phòng tạm thời (Bảng 10: temporary_locks)
        await bookingService.createTemporaryLock({
          room_id: roomId,
          lock_date: checkIn, // Khóa từ ngày check-in
          quantity: 1,
          // session_id hoặc user_id sẽ được BE lấy từ token/cookie
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    initPage();
  }, [hotelId, roomId, checkIn]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    // Payload khớp hoàn toàn bảng 16: booking
    const bookingPayload = {
      hotel_id: hotelId,
      checkin_date: checkIn,
      checkout_date: checkOut,
      customer_name: `${formData.lastName} ${formData.firstName}`,
      guest_email: formData.email,
      guest_phone: formData.phone,
      special_require: formData.specialRequest, // special_require từ DB
      subtotal: room.base_price, // base_price từ bảng room
      total_price: room.base_price,
      payment_method: formData.paymentMethod, // Dùng cho bảng 20: payment
      adult_total: 2, // Mặc định hoặc lấy từ query
      status: "pending",
    };

    try {
      const result = await bookingService.createBooking(bookingPayload);
      if (result) navigate("/booking-success");
    } catch (err) {
      alert("Lỗi khi đặt phòng.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-5xl mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* FORM THÔNG TIN (Bảng 16) */}
        <div className="lg:col-span-2 space-y-6">
          <form
            onSubmit={handleSubmit}
            className="bg-white p-6 rounded-xl shadow-sm border"
          >
            <h2 className="text-xl font-bold mb-4">Thông tin khách hàng</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <input
                type="text"
                placeholder="Họ"
                required
                className="border p-3 rounded-lg text-sm"
                onChange={(e) =>
                  setFormData({ ...formData, lastName: e.target.value })
                }
              />
              <input
                type="text"
                placeholder="Tên"
                required
                className="border p-3 rounded-lg text-sm"
                onChange={(e) =>
                  setFormData({ ...formData, firstName: e.target.value })
                }
              />
            </div>
            <input
              type="email"
              placeholder="Email"
              required
              className="w-full border p-3 rounded-lg text-sm mb-4"
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
            />
            <input
              type="tel"
              placeholder="Số điện thoại"
              required
              className="w-full border p-3 rounded-lg text-sm mb-4"
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
            />

            <h3 className="font-bold mt-6 mb-2">
              Yêu cầu đặc biệt (Bảng 16: special_require)
            </h3>
            <textarea
              className="w-full border p-3 rounded-lg text-sm"
              rows="3"
              onChange={(e) =>
                setFormData({ ...formData, specialRequest: e.target.value })
              }
            ></textarea>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl mt-6 shadow-lg"
            >
              {submitting ? "Đang xử lý..." : "Xác nhận đặt phòng"}
            </button>
          </form>
        </div>

        {/* TÓM TẮT ĐƠN HÀNG */}
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-xl border shadow-sm">
            <h3 className="font-bold text-gray-800 mb-2">{hotel?.name}</h3>
            <p className="text-xs text-gray-500 mb-4">{hotel?.address}</p>
            <div className="border-t pt-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span>Check-in:</span>
                <strong>{checkIn}</strong>
              </div>
              <div className="flex justify-between">
                <span>Check-out:</span>
                <strong>{checkOut}</strong>
              </div>
              <div className="flex justify-between text-blue-600 font-bold">
                <span>Phòng:</span>
                <span>{room?.name}</span>
              </div>
            </div>
          </div>

          <div className="bg-blue-600 text-white p-5 rounded-xl shadow-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm">Tổng cộng (VND)</span>
              <span className="text-2xl font-black">
                {room?.base_price?.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingConfirmPage;
