import React, { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import bookingService from "../../services/bookingService";

const BookingSuccessPage = () => {
  const [searchParams] = useSearchParams();

  // Lấy tham số từ URL
  const successParam = searchParams.get("success"); // 'true' hoặc 'false'
  const bookingCode = searchParams.get("code");
  const urlAmount = searchParams.get("amount");
  const isSuccess = successParam === "true";

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  // LẤY SỐ TIỀN TỪ URL HOẶC TỪ SESSION STORAGE
  const savedAmount = bookingCode
    ? sessionStorage.getItem(`booking_amount_${bookingCode}`)
    : null;

  const finalAmount =
    Number(urlAmount) > 0
      ? Number(urlAmount)
      : Number(savedAmount) > 0
        ? Number(savedAmount)
        : Number(booking?.total_price) || Number(booking?.totalPrice) || 0;

  useEffect(() => {
    if (bookingCode) {
      bookingService
        .getBookingDetail(bookingCode)
        .then((data) => {
          setBooking(data?.data || data);
        })
        .catch((err) => {
          console.error("Lỗi lấy chi tiết đơn đặt phòng:", err);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [bookingCode]);

  // --- TRƯỜNG HỢP 1: THANH TOÁN BỊ HỦY / THẤT BẠI ---
  if (!isSuccess && successParam === "false") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-gray-100">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl font-bold">
            ✕
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">
            Thanh toán không thành công
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            Bạn đã hủy giao dịch hoặc quá trình thanh toán VNPay gặp sự cố.
          </p>

          {bookingCode && (
            <div className="bg-gray-50 p-4 rounded-xl mb-6 text-left border border-gray-200">
              <p className="text-xs text-gray-400 mb-1">Mã đơn đặt phòng:</p>
              <p className="font-mono font-bold text-gray-800 text-lg mb-2">
                {bookingCode}
              </p>

              {finalAmount > 0 && (
                <p className="text-sm text-gray-600 border-t pt-2 mt-2">
                  Số tiền:{" "}
                  <strong className="text-red-600">
                    {finalAmount.toLocaleString("vi-VN")}đ
                  </strong>
                </p>
              )}
            </div>
          )}

          <div className="space-y-3">
            {bookingCode && (
              <Link
                to={`/checkout?code=${bookingCode}&amount=${finalAmount}`}
                className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition shadow-md"
              >
                🔄 Thử thanh toán lại
              </Link>
            )}
            <Link
              to="/"
              className="block w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-xl transition"
            >
              🏠 Về trang chủ
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // --- TRƯỜNG HỢP 2: THANH TOÁN HOẶC ĐẶT PHÒNG THÀNH CÔNG ---
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-gray-100">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl font-bold">
          ✓
        </div>
        <h2 className="text-2xl font-black text-gray-900 mb-2">
          Đặt phòng thành công!
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          Cảm ơn bạn đã tin tưởng dịch vụ của chúng tôi.
        </p>

        <div className="bg-emerald-50 p-4 rounded-xl mb-6 text-left border border-emerald-100">
          <p className="text-xs text-emerald-600 font-bold mb-1 uppercase">
            Mã xác nhận đơn hàng:
          </p>
          <p className="font-mono font-bold text-emerald-900 text-xl">
            {loading ? "ĐANG TẢI..." : bookingCode || "N/A"}
          </p>

          <div className="mt-3 pt-3 border-t border-emerald-200/60 text-xs text-emerald-800 space-y-1">
            <p>
              Tổng tiền: <strong>{finalAmount.toLocaleString("vi-VN")}đ</strong>
            </p>
            <p>
              Trạng thái thanh toán:{" "}
              <span className="font-bold text-emerald-700">
                {booking?.payment_status === "paid"
                  ? "Đã thanh toán Online"
                  : "Thanh toán tại khách sạn"}
              </span>
            </p>
          </div>
        </div>

        <Link
          to="/"
          className="block w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition shadow-md"
        >
          🏠 Về trang chủ
        </Link>
      </div>
    </div>
  );
};

export default BookingSuccessPage;
