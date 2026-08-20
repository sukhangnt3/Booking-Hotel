import React, { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/utils/cn";

const RATING_LABELS = {
  1: { label: "Rất tệ", color: "text-red-500" },
  2: { label: "Không hài lòng", color: "text-orange-500" },
  3: { label: "Bình thường", color: "text-yellow-600" },
  4: { label: "Rất tốt", color: "text-emerald-500" },
  5: { label: "Tuyệt vời xuất sắc", color: "text-blue-600" },
};

const StarRatingInput = ({
  value = 0,
  onChange,
  maxStars = 5,
  size = 32,
  disabled = false,
  className = "",
}) => {
  const [hoverValue, setHoverValue] = useState(null);

  // Giá trị hiện tại để hiển thị (ưu tiên giá trị đang hover)
  const activeValue = hoverValue !== null ? hoverValue : value;

  const handleSelect = (val) => {
    if (!disabled && onChange) {
      onChange(val);
    }
  };

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      {/* 1. DÃY SAO TƯƠNG TÁC */}
      <div
        className="flex items-center gap-1"
        onMouseLeave={() => setHoverValue(null)}
      >
        {[...Array(maxStars)].map((_, index) => {
          const starValue = index + 1;
          const isSelected = activeValue >= starValue;

          return (
            <button
              key={index}
              type="button"
              disabled={disabled}
              onClick={() => handleSelect(starValue)}
              onMouseEnter={() => !disabled && setHoverValue(starValue)}
              className={cn(
                "relative transition-all duration-150 outline-none",
                !disabled
                  ? "cursor-pointer hover:scale-125 active:scale-90"
                  : "cursor-default",
              )}
            >
              <Star
                size={size}
                className={cn(
                  "transition-colors duration-200",
                  isSelected
                    ? "fill-yellow-400 text-yellow-400"
                    : "fill-gray-100 text-gray-300",
                )}
                strokeWidth={isSelected ? 1 : 2}
              />

              {/* Hiệu ứng tỏa sáng khi chọn 5 sao */}
              {starValue === 5 && isSelected && !disabled && (
                <span className="absolute inset-0 animate-ping bg-yellow-400/20 rounded-full -z-10" />
              )}
            </button>
          );
        })}
      </div>

      {/* 2. NHÃN MÔ TẢ (DYNAMIC LABEL) */}
      <div className="h-6 flex items-center justify-center">
        {activeValue > 0 ? (
          <p
            className={cn(
              "text-sm font-black uppercase tracking-widest animate-in fade-in slide-in-from-top-1",
              RATING_LABELS[activeValue].color,
            )}
          >
            {RATING_LABELS[activeValue].label}
          </p>
        ) : (
          <p className="text-xs text-gray-400 font-medium italic">
            Vui lòng chọn mức độ hài lòng của bạn
          </p>
        )}
      </div>
    </div>
  );
};

export default StarRatingInput;
