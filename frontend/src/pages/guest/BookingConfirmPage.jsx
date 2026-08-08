import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import hotelService from "../../services/hotelService";
import bookingService from "../../services/bookingService";
import authService from "../../services/authService";
import { LoadingSpinner } from "../../components/common";

const BookingConfirmPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const hotelId = searchParams.get("hotelId");
  const roomId = searchParams.get("roomId");

  // States quản lý ngày & số lượng
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [totalNights, setTotalNights] = useState(1);
  const [quantity, setQuantity] = useState(1);

  const [hotel, setHotel] = useState(null);
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form dữ liệu khách hàng
  const [formData, setFormData] = useState({
    lastName: "",
    firstName: "",
    email: "",
    phone: "",
    specialRequest: "",
  });

  useEffect(() => {
    const initPage = async () => {
      // 1. TỰ ĐỘNG QUÉT VÀ ĐIỀN THÔNG TIN NGƯỜI DÙNG NẾU ĐÃ ĐĂNG NHẬP
      try {
        const savedUserStr =
          localStorage.getItem("user") ||
          localStorage.getItem("userInfo") ||
          localStorage.getItem("currentUser") ||
          localStorage.getItem("auth");

        let user = savedUserStr ? JSON.parse(savedUserStr) : null;

        // Xử lý bóc tách nếu object bị lồng nhiều cấp
        if (user && user.data) user = user.data;
        if (user && user.user) user = user.user;

        if (!user && authService?.getCurrentUser) {
          user = authService.getCurrentUser();
        }

        console.log("Dữ liệu User tìm thấy để tự điền:", user);

        if (user) {
          const fullName = user.full_name || user.fullName || user.name || "";
          const nameParts = fullName.trim().split(" ");
          const firstName = nameParts.length > 1 ? nameParts.pop() : fullName;
          const lastName = nameParts.join(" ");

          setFormData((prev) => ({
            ...prev,
            firstName: firstName || user.firstName || prev.firstName || "",
            lastName: lastName || user.lastName || prev.lastName || "",
            email: user.email || prev.email || "",
            phone:
              user.phone ||
              user.phoneNumber ||
              user.phone_number ||
              prev.phone ||
              "",
          }));
        }
      } catch (err) {
        console.error("Lỗi tự động điền user:", err);
      }

      // 2. Lấy dữ liệu ngày tháng
      const saved = JSON.parse(localStorage.getItem("search_dates") || "{}");
      const finalIn =
        searchParams.get("checkIn") ||
        saved.checkIn ||
        new Date().toISOString().split("T")[0];
      const finalOut =
        searchParams.get("checkOut") ||
        saved.checkOut ||
        new Date(Date.now() + 86400000).toISOString().split("T")[0];

      setCheckIn(finalIn);
      setCheckOut(finalOut);
      calculateNights(finalIn, finalOut);

      // 3. Lấy dữ liệu Khách sạn & Phòng từ API
      if (hotelId) {
        try {
          const data = await hotelService.getHotelById(hotelId);
          setHotel(data);
          setRoom(data.rooms?.find((r) => String(r.id) === String(roomId)));
        } catch (err) {
          console.error("Lỗi tải thông tin:", err);
        }
      }
      setLoading(false);
    };

    initPage();
  }, [hotelId, roomId]);

  const calculateNights = (inDate, outDate) => {
    const diff = Math.ceil(
      (new Date(outDate) - new Date(inDate)) / (1000 * 60 * 60 * 24),
    );
    setTotalNights(diff > 0 ? diff : 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const subtotal = (room?.base_price || 0) * totalNights * quantity;
    const total = subtotal * 1.08;
    const payload = {
      hotel_id: hotelId,
      checkin_date: checkIn,
      checkout_date: checkOut,
      quantity: quantity,
      customer_name: `${formData.lastName} ${formData.firstName}`.trim(),
      guest_email: formData.email,
      guest_phone: formData.phone,
      special_require: formData.specialRequest,
      subtotal: subtotal,
      total_price: total,
      status: "pending",
    };

    try {
      const result = await bookingService.createBooking(payload);
      const code = result?.booking_code || result?.code || result?.id;
      if (code) {
        navigate(`/checkout?code=${code}&amount=${total}`);
      } else {
        alert("Đặt phòng thành công nhưng Server không trả về Mã Đơn Hàng!");
        setSubmitting(false);
      }
    } catch (err) {
      console.error("Lỗi API:", err);
      alert(
        "Đặt phòng thất bại: " + (err.response?.data?.message || err.message),
      );
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-6xl mx-auto p-6 bg-[#f5f5f5] min-h-screen">
      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        {/* CỘT TRÁI: FORM ĐIỀN THÔNG TIN (ĐÃ TỰ ĐỘNG ĐIỀN) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl border shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Thông tin khách hàng</h2>
              {formData.email && (
                <span className="text-xs bg-blue-50 text-blue-600 font-bold px-2.5 py-1 rounded-full border border-blue-200">
                  ✓ Đã tự động điền từ tài khoản
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">
                  Họ *
                </label>
                <input
                  className="border p-3 rounded-lg w-full text-sm font-semibold"
                  placeholder="Họ"
                  value={formData.lastName}
                  required
                  onChange={(e) =>
                    setFormData({ ...formData, lastName: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">
                  Tên *
                </label>
                <input
                  className="border p-3 rounded-lg w-full text-sm font-semibold"
                  placeholder="Tên"
                  value={formData.firstName}
                  required
                  onChange={(e) =>
                    setFormData({ ...formData, firstName: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="text-xs font-bold text-gray-500 mb-1 block">
                Email *
              </label>
              <input
                className="w-full border p-3 rounded-lg text-sm font-semibold"
                type="email"
                placeholder="Email"
                value={formData.email}
                required
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>

            <div className="mt-4">
              <label className="text-xs font-bold text-gray-500 mb-1 block">
                Số điện thoại *
              </label>
              <input
                className="w-full border p-3 rounded-lg text-sm font-semibold"
                type="tel"
                placeholder="Số điện thoại"
                value={formData.phone}
                required
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
              />
            </div>

            <h3 className="font-bold mt-6 mb-2 text-sm">Yêu cầu đặc biệt</h3>
            <textarea
              className="w-full border p-3 rounded-lg text-sm"
              rows="3"
              placeholder="Ví dụ: Giường đôi, nhận phòng muộn..."
              value={formData.specialRequest}
              onChange={(e) =>
                setFormData({ ...formData, specialRequest: e.target.value })
              }
            ></textarea>
          </div>
        </div>

        {/* CỘT PHẢI: TÓM TẮT ĐƠN HÀNG */}
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border shadow-sm">
            <div className="flex gap-4 border-b pb-4 mb-4">
              <img
                src={
                  hotel?.images?.[0]?.path || "https://via.placeholder.com/150"
                }
                className="w-20 h-20 object-cover rounded-xl border"
                alt="hotel"
              />
              <div>
                <h3 className="font-bold text-gray-900 text-sm">
                  {hotel?.name} <span className="text-yellow-400">★</span>
                </h3>
                <div className="text-blue-700 font-bold text-xs">
                  {hotel?.average_rating}/10 Rất tốt
                </div>
              </div>
            </div>

            <h4 className="font-bold text-base text-gray-900">{room?.name}</h4>

            <div className="text-xs text-gray-600 mt-2 space-y-1">
              <p>
                👤 <strong>Sức chứa:</strong> {room?.capacity || 2} người lớn
              </p>
              {room?.bed_type && (
                <p>
                  🛏️ <strong>Giường:</strong> {room?.bed_type}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between mt-4 pt-3 border-t">
              <span className="text-xs font-bold text-gray-700">
                Số lượng phòng:
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="px-2.5 py-0.5 border rounded font-bold hover:bg-gray-100"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                >
                  -
                </button>
                <span className="font-bold text-sm">{quantity}</span>
                <button
                  type="button"
                  className="px-2.5 py-0.5 border rounded font-bold hover:bg-gray-100"
                  onClick={() =>
                    setQuantity((q) => Math.min(room?.amount || 5, q + 1))
                  }
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border shadow-sm">
            <h4 className="font-bold text-sm text-[#003b95] mb-3">
              Thời gian lưu trú
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                  Nhận phòng
                </label>
                <input
                  type="date"
                  value={checkIn}
                  onChange={(e) => {
                    setCheckIn(e.target.value);
                    calculateNights(e.target.value, checkOut);
                  }}
                  className="w-full font-bold text-xs outline-none border p-2 rounded-lg"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                  Trả phòng
                </label>
                <input
                  type="date"
                  value={checkOut}
                  onChange={(e) => {
                    setCheckOut(e.target.value);
                    calculateNights(checkIn, e.target.value);
                  }}
                  className="w-full font-bold text-xs outline-none border p-2 rounded-lg"
                />
              </div>
            </div>
            <p className="text-xs font-bold text-gray-600 mt-3 pt-3 border-t">
              📅 Tổng cộng: {totalNights} đêm
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border shadow-sm">
            <h4 className="font-bold mb-4 text-sm">Giá Chi Tiết</h4>
            <div className="flex justify-between text-xs mb-2">
              <span>
                {quantity} phòng × {totalNights} đêm
              </span>
              <span className="font-bold">
                {(
                  (room?.base_price || 0) *
                  totalNights *
                  quantity
                ).toLocaleString()}
                đ
              </span>
            </div>
            <div className="border-l-2 border-gray-200 pl-3 ml-1 mb-4 text-xs text-teal-600 font-bold">
              Giảm giá đặc biệt: -
              {(
                (room?.base_price || 0) *
                quantity *
                totalNights *
                0.1
              ).toLocaleString()}
              đ
            </div>
            <div className="flex justify-between font-black text-xl pt-3 border-t">
              <span>Tổng</span>
              <span>
                {(
                  (room?.base_price || 0) *
                  totalNights *
                  quantity *
                  1.08
                ).toLocaleString()}
                đ
              </span>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className={`w-full font-bold py-4 rounded-xl mt-6 transition shadow-md ${
                submitting
                  ? "bg-gray-400 cursor-not-allowed text-white"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              {submitting ? "Đang xử lý..." : "Tiếp tục thanh toán"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default BookingConfirmPage;
