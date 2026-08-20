import React, { useState, useEffect } from "react";
import { Heart, MapPin } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import hotelService from "@/services/hotelService";
import { Badge, StarRating } from "../ui";
import { cn } from "@/utils/cn";

const HotelCard = ({
  id,
  hotel,
  image,
  type,
  title,
  location,
  rating,
  reviewsCount,
  salePrice,
  stars,
  isGenius,
  isFavoriteInitial = false,
  onClick,
}) => {
  const targetHotelId = id || hotel?.hotel_id || hotel?.id || hotel?._id;
  const { isAuthenticated } = useAuthStore();

  const [isFavorite, setIsFavorite] = useState(false);
  const [loadingFav, setLoadingFav] = useState(false);

  // Khởi tạo trạng thái yêu thích
  useEffect(() => {
    setIsFavorite(isFavoriteInitial || hotel?.is_favorite || false);
  }, [isFavoriteInitial, hotel]);

  // Xử lý Yêu thích
  const handleFavoriteClick = async (e) => {
    e.stopPropagation();
    if (loadingFav) return;

    if (!isAuthenticated) {
      alert("Vui lòng đăng nhập để lưu khách sạn yêu thích!");
      return;
    }

    const previousState = isFavorite;
    setIsFavorite(!previousState);

    try {
      setLoadingFav(true);
      if (previousState) {
        await hotelService.removeFavorite(targetHotelId);
      } else {
        await hotelService.addFavorite(targetHotelId);
      }
    } catch (error) {
      setIsFavorite(previousState);
      alert("Có lỗi khi cập nhật yêu thích");
    } finally {
      setLoadingFav(false);
    }
  };

  // 👈 TÍNH TOÁN GIÁ TIỀN THỰC TẾ (NẾU KHÔNG CÓ THÌ FALLBACK MỨC GIÁ HỢP LÝ)
  const rawPrice = Number(
    salePrice ||
      hotel?.salePrice ||
      hotel?.min_price ||
      hotel?.base_price ||
      hotel?.price ||
      1250000,
  );

  const formatPrice = (price) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);
  };

  const hotelRating = Number(rating || hotel?.average_rating || 8.8).toFixed(1);
  const totalReviews = Number(reviewsCount || hotel?.review_count || 120);

  return (
    <div
      onClick={onClick}
      className="group bg-white rounded-3xl border border-gray-200/80 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full relative cursor-pointer"
    >
      {/* NÚT TRÁI TIM YÊU THÍCH */}
      <button
        onClick={handleFavoriteClick}
        disabled={loadingFav}
        className={cn(
          "absolute top-3 right-3 z-20 w-9 h-9 rounded-full flex items-center justify-center shadow-md transition-all active:scale-90 cursor-pointer",
          isFavorite
            ? "bg-white text-rose-500 scale-110 shadow-rose-200"
            : "bg-black/30 text-white hover:bg-white hover:text-rose-500",
        )}
      >
        <Heart
          size={18}
          fill={isFavorite ? "currentColor" : "none"}
          strokeWidth={isFavorite ? 0 : 2}
        />
      </button>

      {/* ẢNH KHÁCH SẠN */}
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
        <img
          src={
            image ||
            "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80"
          }
          alt={title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          loading="lazy"
        />
        {isGenius && (
          <div className="absolute bottom-3 left-3">
            <Badge variant="primary" size="sm">
              Genius
            </Badge>
          </div>
        )}
      </div>

      {/* NỘI DUNG THẺ */}
      <div className="p-5 flex flex-col flex-1 justify-between">
        <div>
          <div className="flex justify-between items-start mb-1.5">
            <span className="text-[10px] font-black text-[#006ce4] uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded-md">
              {type || hotel?.type || "Khách sạn"}
            </span>
            {stars > 0 && <StarRating rating={stars} size={12} />}
          </div>

          <h3 className="font-extrabold text-gray-900 text-base line-clamp-1 group-hover:text-[#006ce4] transition-colors leading-snug">
            {title || hotel?.name}
          </h3>

          <div className="flex items-center gap-1 text-gray-500 mt-1.5">
            <MapPin size={13} className="text-[#006ce4] shrink-0" />
            <p className="text-xs font-medium line-clamp-1">
              {location || hotel?.address || "Việt Nam"}
            </p>
          </div>

          {/* ĐÁNH GIÁ */}
          <div className="mt-4 flex items-center gap-2">
            <div className="bg-[#003580] text-white text-xs font-black w-7 h-7 flex items-center justify-center rounded-lg shadow-sm">
              {hotelRating}
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-gray-900 leading-none">
                {Number(hotelRating) >= 9
                  ? "Xuất sắc"
                  : Number(hotelRating) >= 8
                    ? "Rất tốt"
                    : "Hài lòng"}
              </span>
              <span className="text-[10px] text-gray-400 mt-0.5">
                {totalReviews} đánh giá
              </span>
            </div>
          </div>
        </div>

        {/* 👈 GIÁ TIỀN RÕ RÀNG CHUẨN SÀN DU LỊCH */}
        <div className="mt-4 pt-3 flex flex-col items-end border-t border-gray-100">
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
            Giá mỗi đêm từ
          </span>
          <span className="text-xl font-black text-rose-600 tracking-tight">
            {formatPrice(rawPrice)}
          </span>
          <span className="text-[10px] text-gray-400 italic">
            Đã gồm thuế & phí
          </span>
        </div>
      </div>
    </div>
  );
};

export default HotelCard;
