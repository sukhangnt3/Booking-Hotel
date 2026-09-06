// src/components/review/ReviewList.jsx
import React from "react";
import {
  MessageSquare,
  ThumbsUp,
  Star,
  CornerDownRight,
  Building2,
  User,
} from "lucide-react";
import { StarRating, Pagination, Badge } from "../ui";
import { cn } from "@/utils/cn";

// Component hiển thị từng dòng nhận xét
const ReviewCard = ({ review }) => {
  const formatDate = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const reviewerName =
    review.user_name || review.userName || review.full_name || "Khách hàng";
  const reviewerAvatar = review.user_avatar || review.avatar || null;
  const ratingScore = Number(review.point || review.rating || 5);

  return (
    <div className="py-7 border-b border-gray-100 last:border-0 font-sans">
      <div className="flex flex-col md:flex-row gap-6">
        {/* CỘT TRÁI: THÔNG TIN NGƯỜI ĐÁNH GIÁ */}
        <div className="w-full md:w-52 shrink-0 space-y-2">
          <div className="flex items-center gap-3">
            {reviewerAvatar ? (
              <img
                src={reviewerAvatar}
                alt={reviewerName}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(reviewerName)}&background=003580&color=fff&bold=true`;
                }}
                className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-xs"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[#003580] text-white flex items-center justify-center font-bold text-sm shadow-xs">
                {reviewerName.charAt(0).toUpperCase()}
              </div>
            )}

            <div className="overflow-hidden">
              <p className="text-sm font-bold text-gray-900 truncate">
                {reviewerName}
              </p>
              <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold inline-block">
                ✓ Khách đã lưu trú
              </span>
            </div>
          </div>

          <p className="text-[11px] text-gray-400 font-medium">
            Đánh giá ngày: {formatDate(review.created_at || review.createdAt)}
          </p>
        </div>

        {/* CỘT PHẢI: NỘI DUNG NHẬN XÉT & PHẢN HỒI */}
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-3">
            <div className="bg-[#003580] text-white text-xs font-black px-2.5 py-1 rounded-lg shadow-xs">
              {ratingScore.toFixed(1)} / 5
            </div>
            <div className="flex text-amber-400">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  size={14}
                  fill={i < ratingScore ? "currentColor" : "none"}
                  className={
                    i < ratingScore ? "text-amber-400" : "text-gray-200"
                  }
                />
              ))}
            </div>
            <span className="text-xs font-bold text-gray-700">
              {ratingScore >= 5
                ? "Tuyệt vời xuất sắc"
                : ratingScore >= 4
                  ? "Rất tốt"
                  : ratingScore >= 3
                    ? "Hài lòng"
                    : "Chưa tốt"}
            </span>
          </div>

          <p className="text-xs sm:text-sm text-gray-700 leading-relaxed whitespace-pre-line">
            {review.description ||
              review.comment ||
              "Khách không để lại lời bình chi tiết."}
          </p>

          {/* KHUNG PHẢN HỒI TỪ CHỦ KHÁCH SẠN (CỘT REPLY BẢNG 19) */}
          {review.reply && (
            <div className="mt-4 p-4 rounded-2xl bg-blue-50/70 border border-blue-100 text-xs space-y-1.5 animate-in fade-in">
              <div className="flex items-center gap-2 text-[#003580] font-bold">
                <CornerDownRight size={14} />
                <Building2 size={14} />
                <span>Phản hồi từ Chỗ nghỉ (GoStay Partner)</span>
              </div>
              <p className="text-slate-700 leading-relaxed pl-5 whitespace-pre-line italic">
                "{review.reply}"
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default function ReviewList({
  reviews = [],
  ratingSummary = null,
  currentPage = 1,
  totalPage = 1,
  onPageChange,
  isLoading = false,
}) {
  const averageRating = Number(ratingSummary?.average_rating || 0);
  const totalReviews = Number(
    ratingSummary?.total_reviews || reviews.length || 0,
  );

  return (
    <div className="space-y-6 bg-white p-6 md:p-8 rounded-3xl border border-gray-200 shadow-sm font-sans">
      {/* HEADER TỔNG KẾT */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-6">
        <div>
          <h3 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <MessageSquare size={22} className="text-[#003580]" />
            Đánh giá từ khách lưu trú ({totalReviews})
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Nhận xét xác thực từ những khách hàng đã thực tế đặt phòng tại đây
          </p>
        </div>

        {totalReviews > 0 && (
          <div className="flex items-center gap-3 bg-blue-50 px-4 py-2 rounded-2xl border border-blue-100">
            <div className="bg-[#003580] text-white text-lg font-black w-10 h-10 flex items-center justify-center rounded-xl shadow-xs">
              {averageRating > 0 ? averageRating.toFixed(1) : "5.0"}
            </div>
            <div>
              <p className="text-xs font-bold text-[#003580] leading-none">
                {averageRating >= 4.5
                  ? "Xuất sắc"
                  : averageRating >= 4.0
                    ? "Rất tốt"
                    : "Hài lòng"}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {totalReviews} lượt đánh giá
              </p>
            </div>
          </div>
        )}
      </div>

      {/* DANH SÁCH BÌNH LUẬN */}
      <div
        className={cn("divide-y divide-gray-100", isLoading && "opacity-50")}
      >
        {reviews.length > 0 ? (
          reviews.map((item) => <ReviewCard key={item.id} review={item} />)
        ) : (
          <div className="py-12 text-center text-gray-400 space-y-2">
            <MessageSquare size={36} className="mx-auto text-gray-300" />
            <p className="text-xs font-semibold">
              Chưa có đánh giá nào cho chỗ nghỉ này.
            </p>
            <p className="text-[11px]">
              Hãy là người đầu tiên đặt phòng và để lại cảm nhận của bạn!
            </p>
          </div>
        )}
      </div>

      {/* PHÂN TRANG (NẾU CÓ NHIỀU HƠN 1 TRANG) */}
      {!isLoading && totalPage > 1 && (
        <div className="pt-4 flex justify-center border-t border-gray-100">
          <Pagination
            currentPage={currentPage}
            totalCount={totalReviews}
            pageSize={reviews.length || 10}
            onPageChange={(p) => onPageChange && onPageChange(p)}
          />
        </div>
      )}
    </div>
  );
}
