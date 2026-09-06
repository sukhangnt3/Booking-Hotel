// src/components/hotel/HotelInfo.jsx
import React, { useState } from "react";
import {
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Badge, StarRating } from "../ui";
import { cn } from "@/utils/cn";

export default function HotelInfo({ hotel }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!hotel) return null;

  const descriptionLimit = 350;
  const descriptionText =
    hotel.description ||
    "Tận hưởng kỳ nghỉ dưỡng tuyệt vời với dịch vụ chu đáo và không gian tiện nghi.";
  const shouldTruncate = descriptionText.length > descriptionLimit;
  const displayedDescription = isExpanded
    ? descriptionText
    : descriptionText.slice(0, descriptionLimit) +
      (shouldTruncate ? "..." : "");

  // Đọc trực tiếp từ các cột của bảng hotel trong PostgreSQL
  const checkInTime = hotel.checkin_time
    ? String(hotel.checkin_time).slice(0, 5)
    : "14:00";
  const checkOutTime = hotel.checkout_time
    ? String(hotel.checkout_time).slice(0, 5)
    : "12:00";
  const cancelHours = Number(hotel.cancellation_deadline_hours || 24);

  return (
    <div className="space-y-8 font-sans">
      {/* 1. THÔNG TIN TIÊU ĐỀ */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Badge variant="primary" size="sm">
            Khách sạn
          </Badge>
          {hotel.star_rating > 0 && (
            <StarRating rating={hotel.star_rating} size={14} />
          )}
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
          {hotel.name}
        </h1>

        <div className="flex items-start gap-1 text-gray-500 hover:text-[#006ce4] transition-colors cursor-pointer group">
          <MapPin
            size={16}
            className="shrink-0 mt-0.5 text-[#006ce4] group-hover:scale-110 transition-transform"
          />
          <p className="text-xs sm:text-sm font-medium">
            {hotel.address ? `${hotel.address}, ` : ""}
            {hotel.city || "Việt Nam"} —{" "}
            <span className="text-blue-600 font-bold underline">
              Xem trên bản đồ
            </span>
          </p>
        </div>
      </div>

      {/* 2. MÔ TẢ KHÁCH SẠN */}
      <div className="space-y-3">
        <h3 className="text-base sm:text-lg font-bold text-gray-900">
          Giới thiệu chung
        </h3>
        <div className="relative text-gray-600 leading-relaxed text-xs sm:text-sm text-justify whitespace-pre-line">
          {displayedDescription}

          {shouldTruncate && (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="ml-1.5 text-blue-600 font-bold hover:underline inline-flex items-center gap-0.5 cursor-pointer"
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

      {/* 3. CHÍNH SÁCH CHỖ NGHỈ (BẢNG HOTEL TRONG POSTGRESQL) */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-gray-50/70 px-6 py-4 border-b border-gray-100">
          <h3 className="font-bold text-sm sm:text-base text-gray-900 flex items-center gap-2">
            <CheckCircle2 className="text-emerald-500" size={18} />
            Quy định nhận & trả phòng
          </h3>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Thời gian Nhận/Trả */}
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="p-2.5 bg-blue-50 text-[#003580] rounded-xl h-fit">
                <Clock size={20} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Nhận phòng (Check-in)
                </p>
                <p className="text-sm font-bold text-gray-800 mt-0.5">
                  Từ {checkInTime} chiều
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl h-fit">
                <Clock size={20} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Trả phòng (Check-out)
                </p>
                <p className="text-sm font-bold text-gray-800 mt-0.5">
                  Trước {checkOutTime} trưa
                </p>
              </div>
            </div>
          </div>

          {/* Chính sách hủy phòng & An toàn */}
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3.5 rounded-2xl border border-dashed border-gray-200 bg-emerald-50/40">
              <div className="flex items-center gap-3">
                <AlertCircle className="text-emerald-600 shrink-0" size={20} />
                <span className="text-xs font-semibold text-gray-700">
                  Hủy phòng linh hoạt
                </span>
              </div>
              <span className="text-xs font-bold text-emerald-700">
                Miễn phí hủy trước {cancelHours} giờ
              </span>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-2xl border border-dashed border-gray-200 bg-blue-50/40">
              <div className="flex items-center gap-3">
                <ShieldCheck className="text-blue-600 shrink-0" size={20} />
                <span className="text-xs font-semibold text-gray-700">
                  Xác nhận đặt phòng
                </span>
              </div>
              <span className="text-xs font-bold text-blue-700">
                Tức thì & Đảm bảo giữ phòng
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
