import React from "react";
import { twMerge } from "tailwind-merge";
import { clsx } from "clsx";

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const Card = ({
  image,
  title,
  subTitle,
  onClick,
  className = "",
  aspectRatio = "aspect-[4/3]", // Cho phép đổi thành aspect-video hoặc aspect-square
  children, // Thêm children để có thể chèn thêm Badge, Giá tiền, Rating...
  ...props
}) => {
  // Xử lý khi nhấn phím Enter hoặc Space (tốt cho SEO và người dùng khuyết tật)
  const handleKeyDown = (e) => {
    if (onClick && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={onClick ? "button" : "article"}
      tabIndex={onClick ? 0 : undefined}
      className={cn(
        "group flex flex-col overflow-hidden rounded-xl transition-all duration-300",
        "hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#006ce4]/50",
        onClick ? "cursor-pointer" : "",
        className,
      )}
      {...props}
    >
      {/* Khung chứa ảnh */}
      <div
        className={cn(
          "relative w-full overflow-hidden bg-gray-100",
          aspectRatio,
        )}
      >
        {image ? (
          <img
            src={image}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
            onError={(e) => {
              e.target.src = "https://placehold.co/600x400?text=No+Image"; // Ảnh fallback khi lỗi
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <svg
              className="w-12 h-12"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1"
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}

        {/* Slot cho Badge (Ví dụ: "Giảm giá", "Yêu thích") */}
        <div className="absolute top-2 left-2">
          {children &&
            React.Children.map(children, (child) =>
              child.type?.name === "CardBadge" ? child : null,
            )}
        </div>
      </div>

      {/* Phần nội dung */}
      <div className="pt-3 pb-2 flex flex-col flex-1">
        <h3 className="text-base font-bold text-gray-900 group-hover:text-[#006ce4] transition-colors line-clamp-1">
          {title}
        </h3>

        {subTitle && (
          <p className="text-[13px] text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">
            {subTitle}
          </p>
        )}

        {/* Slot cho phần còn lại (Giá, Rating...) */}
        <div className="mt-auto pt-2">
          {children &&
            React.Children.map(children, (child) =>
              child.type?.name !== "CardBadge" ? child : null,
            )}
        </div>
      </div>
    </div>
  );
};

// Component phụ để dùng kèm
export const CardBadge = ({ children, className }) => (
  <div
    className={cn(
      "px-2 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider shadow-sm",
      className,
    )}
  >
    {children}
  </div>
);

export default Card;
