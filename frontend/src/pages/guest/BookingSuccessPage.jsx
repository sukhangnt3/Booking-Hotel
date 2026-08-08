import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const BookingSuccessPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const bookingCode = searchParams.get("code");

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 max-w-md w-full text-center">
        {/* Icon Success */}
        <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">
          ✓
        </div>

        <h1 className="text-2xl font-black text-gray-900 mb-2">
          Đặt phòng thành công!
        </h1>
        <p className="text-gray-500 mb-6">
          Cảm ơn bạn đã tin tưởng dịch vụ của chúng tôi.
        </p>

        <div className="mb-8">
          <p className="text-sm text-gray-400 uppercase font-bold mb-2">
            Mã xác nhận đơn hàng:
          </p>
          <div className="bg-blue-50 py-3 px-6 rounded-lg border border-dashed border-blue-300">
            <span className="text-2xl font-mono font-bold text-blue-600 tracking-widest">
              {bookingCode || "ĐANG TẢI..."}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => navigate("/")}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition"
          >
            Về trang chủ
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookingSuccessPage;
