import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import bookingService from "../../services/bookingService";
import paymentService from "../../services/paymentService";

const CheckoutPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Lấy tham số từ URL
  const bookingCode = searchParams.get("code");
  const rawAmount = searchParams.get("amount");

  // ĐỌC VÀ LƯU SỐ TIỀN VÀO SESSION STORAGE (Để không bao giờ bị mất)
  const [amount, setAmount] = useState(() => {
    if (rawAmount && Number(rawAmount) > 0) {
      if (bookingCode) {
        sessionStorage.setItem(`booking_amount_${bookingCode}`, rawAmount);
      }
      return rawAmount;
    }
    // Nếu URL không có amount, tự lấy từ sessionStorage ra
    return bookingCode
      ? sessionStorage.getItem(`booking_amount_${bookingCode}`) || "0"
      : "0";
  });

  useEffect(() => {
    if (rawAmount && Number(rawAmount) > 0 && bookingCode) {
      sessionStorage.setItem(`booking_amount_${bookingCode}`, rawAmount);
      setAmount(rawAmount);
    }
  }, [rawAmount, bookingCode]);

  const [loading, setLoading] = useState(false);

  // 1. Xử lý Thanh toán tại khách sạn
  const handlePayAtHotel = async () => {
    if (!bookingCode) {
      alert("Thiếu mã đơn đặt phòng trên URL!");
      return;
    }

    try {
      setLoading(true);
      await bookingService.updateBookingStatus(bookingCode, {
        status: "confirmed",
        payment_status: "unpaid",
      });

      navigate(
        `/booking-success?success=true&code=${bookingCode}&amount=${amount}`,
      );
    } catch (err) {
      console.error("Lỗi xác nhận đặt phòng:", err);
      alert("Không thể xác nhận đặt phòng. Vui lòng thử lại!");
    } finally {
      setLoading(false);
    }
  };

  // 2. Xử lý Thanh toán Online (VNPay)
  const handlePayVNPay = async () => {
    if (!bookingCode || !amount || Number(amount) <= 0) {
      alert("Thông tin số tiền thanh toán không hợp lệ!");
      return;
    }

    try {
      setLoading(true);
      const response = await paymentService.createVNPayUrl({
        bookingCode: bookingCode,
        amount: Number(amount),
      });

      console.log("[CheckoutPage] Response từ paymentService:", response);

      let redirectUrl = null;
      if (typeof response === "string" && response.startsWith("http")) {
        redirectUrl = response;
      } else if (response && typeof response === "object") {
        redirectUrl =
          response.vnpayUrl ||
          response.paymentUrl ||
          response.data?.vnpayUrl ||
          response.data?.paymentUrl;
      }

      if (redirectUrl) {
        window.location.href = redirectUrl;
      } else {
        alert("Không thể lấy liên kết thanh toán VNPay từ máy chủ!");
      }
    } catch (err) {
      console.error("Lỗi chi tiết từ Backend:", err.response?.data);
      const errorMessage =
        err.response?.data?.errorDetail ||
        err.response?.data?.message ||
        err.message;

      alert("⚠️ LỖI TỪ MÁY CHỦ BACKEND:\n\n" + errorMessage);
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
            {bookingCode || "Không tìm thấy mã đơn"}
          </span>
        </p>

        {/* Khối hiển thị số tiền */}
        <div className="bg-blue-50 py-4 rounded-xl mb-8 border border-blue-100">
          <span className="text-xs text-gray-500 uppercase font-bold block mb-1">
            Tổng số tiền thanh toán
          </span>
          <span className="text-3xl font-black text-blue-700">
            {Number(amount) > 0
              ? `${Number(amount).toLocaleString("vi-VN")}đ`
              : "0đ"}
          </span>
        </div>

        {/* Các nút lựa chọn */}
        <div className="space-y-4">
          <button
            onClick={handlePayAtHotel}
            disabled={loading || !bookingCode}
            className={`w-full font-bold py-4 rounded-xl transition shadow-md flex items-center justify-center gap-2 ${
              loading || !bookingCode
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-emerald-600 hover:bg-emerald-700 text-white"
            }`}
          >
            {loading ? "Đang xử lý..." : "🏨 Thanh toán tại khách sạn"}
          </button>

          <button
            onClick={handlePayVNPay}
            disabled={loading || !bookingCode || Number(amount) <= 0}
            className={`w-full font-bold py-4 rounded-xl transition shadow-md flex items-center justify-center gap-2 ${
              loading || !bookingCode || Number(amount) <= 0
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
