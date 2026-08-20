import React, { useState } from "react";
import {
  Wifi,
  Car,
  Waves,
  Utensils,
  Wind,
  Tv,
  Coffee,
  Dumbbell,
  CheckCircle2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Snowflake,
  ShieldCheck,
  Palmtree,
} from "lucide-react";
import { cn } from "@/utils/cn";

// 1. Bản đồ ánh xạ Tên tiện ích -> Icon tương ứng
const AMENITY_MAP = {
  wifi: <Wifi size={18} />,
  internet: <Wifi size={18} />,
  "hồ bơi": <Waves size={18} />,
  "bể bơi": <Waves size={18} />,
  "bãi đậu xe": <Car size={18} />,
  "đỗ xe": <Car size={18} />,
  "nhà hàng": <Utensils size={18} />,
  "ăn uống": <Utensils size={18} />,
  "điều hòa": <Wind size={18} />,
  "máy lạnh": <Snowflake size={18} />,
  tivi: <Tv size={18} />,
  "truyền hình": <Tv size={18} />,
  "bữa sáng": <Coffee size={18} />,
  "phòng gym": <Dumbbell size={18} />,
  "thể hình": <Dumbbell size={18} />,
  "an ninh": <ShieldCheck size={18} />,
  biển: <Palmtree size={18} />,
};

// Hàm lấy icon dựa trên tên (không phân biệt hoa thường)
const getAmenityIcon = (name) => {
  const lowerName = name.toLowerCase();
  // Tìm key trong bản đồ có xuất hiện trong tên tiện ích
  const key = Object.keys(AMENITY_MAP).find((k) => lowerName.includes(k));
  return (
    AMENITY_MAP[key] || <CheckCircle2 size={18} className="text-gray-400" />
  );
};

const AmenityList = ({
  amenities = [],
  title = "Tiện nghi hàng đầu",
  columns = "grid-cols-2 md:grid-cols-3",
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Mặc định chỉ hiện 6 tiện ích đầu tiên
  const limit = 6;
  const hasMore = amenities.length > limit;
  const displayItems = isExpanded ? amenities : amenities.slice(0, limit);

  if (amenities.length === 0) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
        <Sparkles className="text-blue-600" size={20} />
        {title}
      </h3>

      <div className={cn("grid gap-y-4 gap-x-8", columns)}>
        {displayItems.map((item, index) => {
          const name = typeof item === "string" ? item : item.name;
          return (
            <div
              key={index}
              className="flex items-center gap-3 text-gray-600 animate-in fade-in slide-in-from-left-2 duration-300"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="text-emerald-600 shrink-0">
                {getAmenityIcon(name)}
              </div>
              <span className="text-sm font-medium">{name}</span>
            </div>
          );
        })}
      </div>

      {hasMore && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-2 text-blue-600 text-sm font-bold flex items-center gap-1 hover:underline transition-all"
        >
          {isExpanded ? (
            <>
              Thu gọn tiện nghi <ChevronUp size={16} />
            </>
          ) : (
            <>
              Xem tất cả {amenities.length} tiện nghi <ChevronDown size={16} />
            </>
          )}
        </button>
      )}
    </div>
  );
};

export default AmenityList;
