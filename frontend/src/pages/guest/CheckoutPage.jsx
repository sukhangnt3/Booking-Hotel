import React, { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import bookingService from "../../services/bookingService";
import paymentService from "../../services/paymentService"; // Đảm bảo bạn có file service này

const CheckoutPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Lấy tham số từ URL
  const bookingCode = searchParams.get("code");
  const amount = searchParams.get("amount") || 0;

  const [loading, setLoading] = useState(false);

  // 1. Xử lý Thanh toán tại khách sạn
  const handlePayAtHotel = async () => {
    try {
      setLoading(true);
      // Gọi API cập nhật trạng thái đơn thành 'confirmed' (xác nhận)
      await bookingService.updateBookingStatus(bookingCode, {
        status: "confirmed",
        payment_status: "unpaid", // Chưa trả tiền, sẽ trả tại KS
      });

      // Chuyển sang trang đặt phòng thành công
      navigate(`/booking-success?code=${bookingCode}`);
    } catch (err) {
      console.error("Lỗi xác nhận đặt phòng:", err);
      alert("Không thể xác nhận đặt phòng. Vui lòng thử lại!");
    } finally {
      setLoading(false);
    }
  };

  // 2. Xử lý Thanh toán Online (VNPay)
  const handlePayVNPay = async () => {
    try {
      setLoading(true);
      // Gọi API Backend để tạo URL thanh toán VNPay
      const response = await paymentService.createVNPayUrl({
        bookingCode: bookingCode,
        amount: Number(amount),
      });

      // Backend trả về vnpayUrl -> Chuyển hướng người dùng sang cổng VNPay
      if (response && response.vnpayUrl) {
        window.location.href = response.vnpayUrl;
      } else {
        alert("Không thể tạo liên kết thanh toán VNPay!");
      }
    } catch (err) {
      console.error("Lỗi kết nối VNPay:", err);
      alert("Lỗi kết nối cổng thanh toán. Hãy thử phương thức khác!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-gray-100 text-center">
        <h2 className="text-2xl font-black text-gray-900 mb-2">Thanh toán</h2>
        <p className="text-sm text-gray-500 mb-6">
          Mã đơn:{" "}
          <span className="font-mono font-bold text-blue-600">
            {bookingCode}
          </span>
        </p>

        {/* Khối hiển thị số tiền */}
        <div className="bg-blue-50 py-4 rounded-xl mb-8 border border-blue-100">
          <span className="text-xs text-gray-500 uppercase font-bold block mb-1">
            Tổng số tiền thanh toán
          </span>
          <span className="text-3xl font-black text-blue-700">
            {Number(amount).toLocaleString()}đ
          </span>
        </div>

        {/* Các nút lựa chọn */}
        <div className="space-y-4">
          <button
            onClick={handlePayAtHotel}
            disabled={loading}
            className={`w-full font-bold py-4 rounded-xl transition shadow-md flex items-center justify-center gap-2 ${
              loading
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-emerald-600 hover:bg-emerald-700 text-white"
            }`}
          >
            {loading ? "Đang xử lý..." : "🏨 Thanh toán tại khách sạn"}
          </button>

          <button
            onClick={handlePayVNPay}
            disabled={loading}
            className={`w-full font-bold py-4 rounded-xl transition shadow-md flex items-center justify-center gap-2 ${
              loading
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
          >
            {loading ? "Đang xử lý..." : "💳 Thanh toán Online (VNPay)"}
          </button>
        </div>

        <p className="text-xs text-gray-400 mt-6 italic">
          Bằng việc tiếp tục, bạn đồng ý với các điều khoản đặt phòng của chúng
          tôi.
        </p>
      </div>
    </div>
  );
};

export default CheckoutPage;
