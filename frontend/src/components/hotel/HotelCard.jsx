import React, { useState, useEffect } from "react";
import { Heart, MapPin } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import hotelService from "@/services/hotelService";
import { Badge, StarRating } from "../ui"; // Tận dụng UI Kit
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
  // 1. Lấy ID và trạng thái Auth từ Store
  const targetHotelId = id || hotel?.hotel_id || hotel?.id || hotel?._id;
  const { isAuthenticated, token } = useAuthStore();

  const [isFavorite, setIsFavorite] = useState(false);
  const [loadingFav, setLoadingFav] = useState(false);

  // Khởi tạo trạng thái yêu thích
  useEffect(() => {
    setIsFavorite(isFavoriteInitial || hotel?.is_favorite || false);
  }, [isFavoriteInitial, hotel]);

  // 2. Xử lý Yêu thích
  const handleFavoriteClick = async (e) => {
    e.stopPropagation();
    if (loadingFav) return;

    if (!isAuthenticated) {
      alert("Vui lòng đăng nhập để lưu khách sạn yêu thích!");
      return;
    }

    const previousState = isFavorite;
    setIsFavorite(!previousState); // Cập nhật UI ngay lập tức

    try {
      setLoadingFav(true);
      if (previousState) {
        await hotelService.removeFavorite(targetHotelId);
      } else {
        await hotelService.addFavorite(targetHotelId);
      }
    } catch (error) {
      setIsFavorite(previousState); // Hoàn tác nếu lỗi
      alert(error.response?.data?.message || "Lỗi cập nhật yêu thích");
    } finally {
      setLoadingFav(false);
    }
  };

  // 3. Định dạng giá tiền
  const formatPrice = (price) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);
  };

  return (
    <div
      onClick={onClick}
      className="group bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full relative cursor-pointer"
    >
      {/* NÚT TRÁI TIM */}
      <button
        onClick={handleFavoriteClick}
        disabled={loadingFav}
        className={cn(
          "absolute top-3 right-3 z-20 p-2 rounded-full shadow-lg transition-all active:scale-90",
          isFavorite
            ? "bg-white text-rose-500"
            : "bg-black/20 text-white hover:bg-white hover:text-rose-500",
        )}
      >
        <Heart
          size={20}
          fill={isFavorite ? "currentColor" : "none"}
          strokeWidth={isFavorite ? 0 : 2.5}
        />
      </button>

      {/* ẢNH KHÁCH SẠN */}
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-200">
        <img
          src={image || "https://placehold.co/600x400?text=No+Image"}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
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

      {/* NỘI DUNG */}
      <div className="p-4 flex flex-col flex-1">
        <div className="flex justify-between items-start mb-1">
          <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">
            {type || "Chỗ nghỉ"}
          </span>
          {stars > 0 && (
            <StarRating rating={stars} size={12} className="gap-0.5" />
          )}
        </div>

        <h3 className="font-bold text-gray-900 text-base line-clamp-1 group-hover:text-[#006ce4] transition-colors">
          {title}
        </h3>

        <div className="flex items-center gap-1 text-gray-500 mt-1">
          <MapPin size={12} className="shrink-0" />
          <p className="text-xs line-clamp-1">{location}</p>
        </div>

        {/* ĐÁNH GIÁ */}
        <div className="mt-4 flex items-center gap-2">
          <div className="bg-[#003580] text-white text-sm font-bold w-8 h-8 flex items-center justify-center rounded-lg rounded-bl-none">
            {rating || "N/A"}
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-gray-800 leading-none">
              {rating >= 9 ? "Xuất sắc" : rating >= 8 ? "Rất tốt" : "Tốt"}
            </span>
            <span className="text-[11px] text-gray-500">
              {reviewsCount || 0} đánh giá
            </span>
          </div>
        </div>

        {/* GIÁ TIỀN */}
        <div className="mt-auto pt-4 flex flex-col items-end">
          <span className="text-[11px] text-gray-500 font-medium">
            Giá mỗi đêm từ
          </span>
          <span className="text-lg font-black text-red-600">
            {salePrice ? formatPrice(salePrice) : "Liên hệ"}
          </span>
          <span className="text-[10px] text-gray-400 italic">
            Đã bao gồm thuế và phí
          </span>
        </div>
      </div>
    </div>
  );
};

export default HotelCard;
