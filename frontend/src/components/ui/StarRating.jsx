import React, { useState } from "react";
import { Star, StarHalf } from "lucide-react";
import { twMerge } from "tailwind-merge";
import { clsx } from "clsx";

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const StarRating = ({
  rating = 0,
  maxStars = 5,
  size = 20,
  editable = false,
  onChange,
  className = "",
}) => {
  const [hoverValue, setHoverValue] = useState(null);

  const handleClick = (value) => {
    if (editable && onChange) {
      onChange(value);
    }
  };

  const renderStar = (index) => {
    const starValue = index + 1;
    const isHovered = hoverValue !== null && starValue <= hoverValue;
    const isSelected = rating >= starValue;
    const isHalf = !editable && rating > index && rating < starValue;

    const activeColor = "text-yellow-400 fill-yellow-400";
    const inactiveColor = "text-gray-300 fill-transparent";
    const hoverColor = "text-yellow-500 fill-yellow-500";

    return (
      <div
        key={index}
        className={cn(
          "relative transition-transform duration-150",
          editable ? "cursor-pointer hover:scale-110 active:scale-95" : "",
        )}
        onClick={() => handleClick(starValue)}
        onMouseEnter={() => editable && setHoverValue(starValue)}
        onMouseLeave={() => editable && setHoverValue(null)}
      >
        <Star size={size} className={inactiveColor} />

        <div className="absolute inset-0 overflow-hidden">
          {isHalf ? (
            <StarHalf size={size} className={activeColor} />
          ) : (
            <Star
              size={size}
              className={cn(
                "transition-opacity",
                isHovered ? hoverColor : isSelected ? activeColor : "opacity-0",
              )}
            />
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      className={cn("flex items-center gap-0.5", className)}
      onMouseLeave={() => editable && setHoverValue(null)}
    >
      {[...Array(maxStars)].map((_, index) => renderStar(index))}

      {!editable && rating > 0 && (
        <span className="ml-2 text-sm font-bold text-gray-700">
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
};

export default StarRating;
