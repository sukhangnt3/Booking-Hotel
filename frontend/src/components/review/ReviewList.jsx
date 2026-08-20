import React from "react";
import { MessageSquare, ThumbsUp, User, Star } from "lucide-react";
import { StarRating, Pagination, Badge } from "../ui";
import { cn } from "@/utils/cn";

// Component hiển thị từng dòng nhận xét
const ReviewCard = ({ review }) => {
  // Hàm định dạng ngày tháng thực tế từ ISO string
  const formatDate = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <div className="py-8 border-b border-gray-100 last:border-0">
      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-48 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold uppercase">
              {review.user?.name?.charAt(0) || "U"}
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">
                {review.user?.name || "Khách hàng"}
              </p>
              <Badge variant="outline" className="text-[9px] py-0">
                Khách xác thực
              </Badge>
            </div>
          </div>
          <p className="text-[11px] text-gray-400 mt-4 flex items-center gap-1.5 font-medium">
            📅 Đánh giá {formatDate(review.createdAt)}
          </p>
        </div>

        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-3">
            <div className="bg-[#003580] text-white text-sm font-bold px-2 py-1 rounded-lg">
              {review.rating?.toFixed(1)}
            </div>
            <p className="text-sm font-bold text-gray-800">
              {review.rating >= 9
                ? "Xuất sắc"
                : review.rating >= 7
                  ? "Rất tốt"
                  : "Hài lòng"}
            </p>
          </div>

          <p className="text-sm text-gray-600 leading-relaxed">
            {review.comment}
          </p>

          <button className="flex items-center gap-2 text-xs text-gray-400 hover:text-blue-600 transition-colors pt-2 font-bold">
            <ThumbsUp size={14} />
            Hữu ích ({review.likes_count || 0})
          </button>
        </div>
      </div>
    </div>
  );
};

const ReviewList = ({
  reviews = [], // Mảng danh sách review từ API
  ratingSummary = null, // Dữ liệu tóm tắt (avg, total, star_counts)
  currentPage = 1,
  totalPage = 1,
  currentFilter = "all", // Sao đang lọc (all, 5, 4, 3, 2, 1)
  onFilterChange, // Hàm xử lý khi bấm lọc sao
  onPageChange, // Hàm xử lý khi bấm chuyển trang
  isLoading = false, // Trạng thái đang tải từ API
}) => {
  // 1. Dữ liệu phân bổ sao từ thực tế (Backend trả về ví dụ: {5: 100, 4: 20, ...})
  const starCounts = ratingSummary?.star_counts || {
    5: 0,
    4: 0,
    3: 0,
    2: 0,
    1: 0,
  };
  const total = ratingSummary?.total_reviews || 1; // Tránh chia cho 0

  const starLevels = [
    { star: 5, color: "bg-emerald-500" },
    { star: 4, color: "bg-blue-500" },
    { star: 3, color: "bg-yellow-500" },
    { star: 2, color: "bg-orange-500" },
    { star: 1, color: "bg-rose-500" },
  ];

  return (
    <div className="space-y-8 bg-white p-6 md:p-8 rounded-2xl border border-gray-100 shadow-sm">
      {/* PHẦN 1: TỔNG KẾT (DỮ LIỆU THỰC TẾ) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center border-b border-gray-100 pb-10">
        <div className="md:col-span-4 text-center md:text-left space-y-3">
          <h3 className="text-xl font-black text-gray-900">
            Đánh giá của khách
          </h3>
          <div className="flex items-center justify-center md:justify-start gap-4">
            <div className="bg-[#003580] text-white text-3xl font-black w-16 h-16 flex items-center justify-center rounded-2xl shadow-lg">
              {ratingSummary?.average_rating?.toFixed(1) || 0}
            </div>
            <div>
              <p className="text-lg font-bold text-blue-900">
                {ratingSummary?.average_rating >= 9 ? "Xuất sắc" : "Rất tốt"}
              </p>
              <p className="text-sm text-gray-500 font-medium">
                {ratingSummary?.total_reviews || 0} đánh giá xác thực
              </p>
            </div>
          </div>
        </div>

        {/* Biểu đồ thanh ngang */}
        <div className="md:col-span-8 space-y-2">
          {starLevels.map((item) => {
            const count = starCounts[item.star] || 0;
            const percentage = (count / total) * 100;
            return (
              <div
                key={item.star}
                className="flex items-center gap-4 text-xs font-bold text-gray-600"
              >
                <span className="w-12">{item.star} sao</span>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-700",
                      item.color,
                    )}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="w-8 text-right opacity-50">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* PHẦN 2: BỘ LỌC (Sẽ gọi API khi click) */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-bold text-gray-700 mr-2 uppercase text-[10px] tracking-widest">
          Lọc theo:
        </span>
        {["all", 5, 4, 3, 2, 1].map((s) => (
          <button
            key={s}
            disabled={isLoading}
            onClick={() => onFilterChange && onFilterChange(s)}
            className={cn(
              "px-4 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer disabled:opacity-50",
              currentFilter === String(s) ||
                (s === "all" && currentFilter === "all")
                ? "bg-[#003580] text-white border-[#003580] shadow-md"
                : "bg-white text-gray-600 border-gray-200 hover:border-blue-600",
            )}
          >
            {s === "all" ? "Tất cả" : `${s} Sao`}
          </button>
        ))}
      </div>

      {/* PHẦN 3: DANH SÁCH REVIEW (Loading state) */}
      <div
        className={cn(
          "divide-y divide-gray-50 transition-opacity",
          isLoading && "opacity-50",
        )}
      >
        {reviews.length > 0
          ? reviews.map((item) => <ReviewCard key={item.id} review={item} />)
          : !isLoading && (
              <div className="py-20 text-center space-y-3">
                <MessageSquare size={48} className="mx-auto text-gray-200" />
                <p className="text-gray-400 font-medium italic">
                  Không tìm thấy đánh giá nào phù hợp.
                </p>
              </div>
            )}
      </div>

      {/* PHẦN 4: PHÂN TRANG (Gọi API chuyển trang) */}
      {!isLoading && totalPage > 1 && (
        <div className="pt-6 flex justify-center">
          <Pagination
            currentPage={currentPage}
            totalCount={ratingSummary?.total_reviews || 0}
            pageSize={reviews.length || 5}
            onPageChange={(p) => onPageChange && onPageChange(p)}
          />
        </div>
      )}
    </div>
  );
};

export default ReviewList;
