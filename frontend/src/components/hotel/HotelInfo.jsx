import React from "react";

const HotelInfo = ({ hotel, policy }) => {
  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div>
        <div className="flex items-center gap-2">
          <span className="bg-[#003580] text-white text-[10px] font-bold px-2 py-0.5 rounded">
            Khách sạn
          </span>
          <span className="text-amber-400 text-sm">
            {"★".repeat(hotel.star_rating)}
          </span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">{hotel.name}</h1>
        <p className="text-xs text-gray-500 mt-1">
          📍 {hotel.address}, {hotel.city}
        </p>
      </div>

      {/* Description */}
      <div className="text-sm text-gray-600 leading-relaxed">
        {hotel.description}
      </div>

      {/* Chính sách - Policy (Table 6) */}
      <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200">
        <h3 className="font-bold text-sm mb-4 tracking-wide uppercase">
          Quy định chung
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="flex flex-col gap-1">
            <span className="font-bold text-gray-500">Nhận phòng:</span>
            <span className="font-semibold">
              {policy?.start_checkin_time} - {policy?.end_checkin_time}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="font-bold text-gray-500">Trả phòng:</span>
            <span className="font-semibold">
              {policy?.start_checkout_time} - {policy?.end_checkout_time}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-500">Vật nuôi:</span>
            <span
              className={
                policy?.animal_allowed
                  ? "text-emerald-600 font-bold"
                  : "text-red-500 font-bold"
              }
            >
              {policy?.animal_allowed ? "Cho phép" : "Không cho phép"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-500">Hủy phòng:</span>
            <span className="text-emerald-600 font-bold">
              {policy?.free_cancellation ? "Miễn phí hủy" : "Có phí khi hủy"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HotelInfo;
