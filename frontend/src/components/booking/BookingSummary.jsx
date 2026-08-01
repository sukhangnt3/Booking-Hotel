import React from "react";

const BookingSummary = ({ hotel, selectedRoom, onConfirm }) => {
  if (!selectedRoom) return null;

  return (
    <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-lg sticky top-6">
      <h3 className="font-bold text-base text-gray-900 border-b pb-3 mb-4 tracking-tight">
        Chi tiết đặt phòng
      </h3>

      <div className="space-y-4">
        {/* Hotel Small Info */}
        <div className="flex gap-3">
          <img
            src={hotel.image}
            className="w-16 h-16 rounded-lg object-cover"
            alt="mini"
          />
          <div>
            <h4 className="text-xs font-bold line-clamp-2">{hotel.name}</h4>
            <div className="text-yellow-400 text-[10px] mt-1">
              {"★".repeat(hotel.star_rating)}
            </div>
          </div>
        </div>

        <hr className="border-gray-100" />

        <div className="space-y-2 text-[11px]">
          <div className="flex justify-between">
            <span className="text-gray-500 font-medium">Lựa chọn của bạn:</span>
            <span className="font-bold text-gray-900 text-right w-1/2">
              {selectedRoom.name}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 font-medium">Sức chứa:</span>
            <span className="font-bold text-gray-900">
              {selectedRoom.capacity} khách
            </span>
          </div>
        </div>

        <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
          <p className="text-[11px] text-emerald-800 font-bold">
            ✓ Hủy miễn phí bất cứ lúc nào
          </p>
          <p className="text-[10px] text-emerald-600 mt-0.5 italic">
            Không cần thanh toán ngay hôm nay
          </p>
        </div>

        <div className="pt-2">
          <div className="flex justify-between items-end">
            <span className="font-bold text-sm">Tổng cộng:</span>
            <div className="text-right">
              <p className="text-xl font-black text-[#006ce4]">
                {selectedRoom.sell_price?.toLocaleString("vi-VN")} VND
              </p>
              <p className="text-[9px] text-gray-400 uppercase font-bold tracking-tighter">
                Đã bao gồm thuế & phí
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={onConfirm}
          className="w-full bg-[#006ce4] hover:bg-[#0056b3] text-white font-bold py-3.5 rounded-xl text-sm transition-all shadow-md active:scale-95"
        >
          Xác nhận đặt ngay
        </button>
      </div>
    </div>
  );
};

export default BookingSummary;
