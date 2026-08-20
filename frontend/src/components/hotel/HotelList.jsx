import React from "react";
import { SearchX, Hotel as HotelIcon } from "lucide-react";
import HotelCard from "./HotelCard";
import { cn } from "@/utils/cn";

// 1. Component Skeleton (Hiển thị khi đang load)
const HotelCardSkeleton = () => (
  <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm animate-pulse">
    <div className="aspect-[4/3] bg-gray-200" />
    <div className="p-4 space-y-3">
      <div className="flex justify-between">
        <div className="h-3 w-16 bg-gray-200 rounded" />
        <div className="h-3 w-20 bg-gray-200 rounded" />
      </div>
      <div className="h-5 w-full bg-gray-200 rounded" />
      <div className="h-3 w-2/3 bg-gray-200 rounded" />
      <div className="pt-4 flex justify-between items-center">
        <div className="h-8 w-8 bg-gray-200 rounded-lg" />
        <div className="space-y-1">
          <div className="h-3 w-12 bg-gray-200 rounded ml-auto" />
          <div className="h-5 w-24 bg-gray-200 rounded" />
        </div>
      </div>
    </div>
  </div>
);

const HotelList = ({
  hotels = [],
  isLoading = false,
  gridClassName = "",
  limit = 8, // Số lượng skeleton hiển thị khi đang load
}) => {
  // 2. Trạng thái Đang tải (Loading)
  if (isLoading) {
    return (
      <div
        className={cn(
          "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6",
          gridClassName,
        )}
      >
        {[...Array(limit)].map((_, index) => (
          <HotelCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  // 3. Trạng thái Trống (Empty)
  if (!hotels || hotels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
        <div className="p-4 bg-white rounded-full shadow-sm mb-4">
          <SearchX size={48} className="text-gray-300" />
        </div>
        <h3 className="text-xl font-bold text-gray-900">
          Không tìm thấy khách sạn nào
        </h3>
        <p className="text-gray-500 mt-2 max-w-sm">
          Rất tiếc, chúng tôi không tìm thấy chỗ nghỉ nào phù hợp với lựa chọn
          của bạn. Hãy thử thay đổi bộ lọc hoặc tìm kiếm lại.
        </p>
      </div>
    );
  }

  // 4. Trạng thái có dữ liệu
  return (
    <div
      className={cn(
        "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6",
        gridClassName,
      )}
    >
      {hotels.map((hotel) => (
        <HotelCard
          key={hotel.id || hotel._id}
          hotel={hotel}
          id={hotel.id}
          title={hotel.name || hotel.title}
          image={hotel.image || hotel.thumbnail || hotel.images?.[0]}
          location={hotel.address || hotel.location}
          rating={hotel.rating}
          reviewsCount={hotel.reviews_count || hotel.reviewsCount}
          salePrice={hotel.price || hotel.salePrice}
          stars={hotel.stars}
          isGenius={hotel.is_genius || hotel.isGenius}
          isFavoriteInitial={hotel.is_favorite}
          type={hotel.type}
          onClick={() => (window.location.href = `/hotel/${hotel.id}`)}
        />
      ))}
    </div>
  );
};

export default HotelList;
