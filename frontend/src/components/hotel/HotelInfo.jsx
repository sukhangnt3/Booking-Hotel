import React, { useState } from "react";
import {
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  PawPrint,
  XCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Badge, StarRating } from "../ui";
import { cn } from "@/utils/cn";

const HotelInfo = ({ hotel, policy }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Giới hạn độ dài mô tả để hiện nút "Xem thêm"
  const descriptionLimit = 350;
  const shouldTruncate = hotel.description?.length > descriptionLimit;
  const displayedDescription = isExpanded
    ? hotel.description
    : hotel.description?.slice(0, descriptionLimit) + "...";

  return (
    <div className="space-y-8">
      {/* 1. THÔNG TIN TIÊU ĐỀ */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Badge variant="primary" size="sm">
            Khách sạn
          </Badge>
          <StarRating rating={hotel.star_rating} size={14} />
        </div>

        <h1 className="text-3xl font-black text-gray-900 tracking-tight">
          {hotel.name}
        </h1>

        <div className="flex items-start gap-1 text-gray-500 hover:text-[#006ce4] transition-colors cursor-pointer group">
          <MapPin
            size={16}
            className="shrink-0 mt-0.5 group-hover:scale-110 transition-transform"
          />
          <p className="text-sm font-medium">
            {hotel.address}, {hotel.city} —{" "}
            <span className="text-blue-600 font-bold underline">
              Xem trên bản đồ
            </span>
          </p>
        </div>
      </div>

      {/* 2. MÔ TẢ KHÁCH SẠN */}
      <div className="space-y-3">
        <h3 className="text-lg font-bold text-gray-900">Giới thiệu chung</h3>
        <div className="relative text-gray-600 leading-relaxed text-sm text-justify">
          {displayedDescription}

          {shouldTruncate && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="ml-1 text-blue-600 font-bold hover:underline inline-flex items-center gap-0.5"
            >
              {isExpanded ? (
                <>
                  Thu gọn <ChevronUp size={14} />
                </>
              ) : (
                <>
                  Xem thêm <ChevronDown size={14} />
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* 3. CHÍNH SÁCH CHỖ NGHỈ */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <CheckCircle2 className="text-emerald-500" size={18} />
            Quy định chung của chỗ nghỉ
          </h3>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Thời gian Nhận/Trả */}
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg h-fit">
                <Clock size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Nhận phòng
                </p>
                <p className="text-sm font-bold text-gray-700">
                  {policy?.start_checkin_time} —{" "}
                  {policy?.end_checkin_time || "Cả ngày"}
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="p-2 bg-orange-50 text-orange-600 rounded-lg h-fit">
                <Clock size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Trả phòng
                </p>
                <p className="text-sm font-bold text-gray-700">
                  Đến trước {policy?.start_checkout_time}
                </p>
              </div>
            </div>
          </div>

          {/* Các quy định khác */}
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl border border-dashed border-gray-200">
              <div className="flex items-center gap-3">
                <PawPrint
                  className={
                    policy?.animal_allowed
                      ? "text-emerald-500"
                      : "text-gray-400"
                  }
                  size={20}
                />
                <span className="text-sm font-semibold text-gray-600">
                  Vật nuôi
                </span>
              </div>
              <Badge variant={policy?.animal_allowed ? "success" : "default"}>
                {policy?.animal_allowed ? "Cho phép" : "Không cho phép"}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl border border-dashed border-gray-200">
              <div className="flex items-center gap-3">
                <AlertCircle className="text-blue-500" size={20} />
                <span className="text-sm font-semibold text-gray-600">
                  Hủy phòng
                </span>
              </div>
              <span
                className={cn(
                  "text-xs font-bold",
                  policy?.free_cancellation
                    ? "text-emerald-600"
                    : "text-orange-600",
                )}
              >
                {policy?.free_cancellation
                  ? "Miễn phí hủy phòng"
                  : "Có phí khi hủy"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HotelInfo;
