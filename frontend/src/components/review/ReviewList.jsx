// src/components/review/ReviewList.jsx
import React from "react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

// Hàm tự sinh 2 chữ cái viết tắt từ tên khách hàng (Ví dụ: "Trương Văn Tường" -> "TT")
const getInitials = (name) => {
  if (!name) return "KH";
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  const first = parts[0][0];
  const last = parts[parts.length - 1][0];
  return (first + last).toUpperCase();
};

export default function ReviewList({ reviews = [], ratingSummary, hotelName }) {
  const averageScore = Number(ratingSummary?.average_rating || 9.3);
  const totalReviews =
    reviews.length > 0
      ? reviews.length
      : Number(ratingSummary?.total_reviews || 0);

  const getScoreLabel = (score) => {
    if (score >= 9.0) return "Tuyệt vời";
    if (score >= 8.0) return "Rất tốt";
    if (score >= 7.0) return "Hài lòng";
    return "Được đánh giá tốt";
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-xs font-sans">
      {/* 1. TIÊU ĐỀ CHÍNH GIỐNG ẢNH */}
      <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
        Đánh giá khách hàng về {hotelName || "chỗ nghỉ"}
      </h3>

      {/* 2. HUY HIỆU ĐIỂM XANH LÁ CÂY VÀ SỐ LƯỢNG ĐÁNH GIÁ */}
      <div className="flex items-center gap-2 mt-3 pb-5 border-b border-slate-200">
        <span className="bg-[#2e7d32] text-white font-black text-sm px-2.5 py-1 rounded-md shadow-xs">
          {averageScore.toFixed(1)}
        </span>
        <span className="text-[#2e7d32] font-black text-sm">
          {getScoreLabel(averageScore)}
        </span>
        <span className="text-slate-300 font-normal">|</span>
        <span className="text-xs text-slate-500 font-medium">
          {totalReviews} đánh giá
        </span>
      </div>

      {/* 3. TIÊU ĐỀ ĐÁNH GIÁ GẦN ĐÂY */}
      <div className="pt-4 pb-1">
        <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
          Đánh giá gần đây
        </h4>
      </div>

      {/* 4. DANH SÁCH BÌNH LUẬN GIỐNG 100% GIAO DIỆN MẪU */}
      {reviews && reviews.length > 0 ? (
        <div className="divide-y divide-slate-100">
          {reviews.map((item, idx) => {
            const customerName = item.user_name || "Khách du lịch";
            const initials = getInitials(customerName);
            const dateStr = item.created_at
              ? format(new Date(item.created_at), "dd-MM-yyyy")
              : "Gần đây";

            return (
              <div key={item.id || idx} className="py-4 space-y-2">
                <div className="flex items-center gap-3">
                  {/* Avatar tròn màu xanh lơ với 2 chữ cái viết tắt */}
                  <div className="w-10 h-10 rounded-full bg-[#17a2b8] text-white font-bold text-xs flex items-center justify-center shrink-0 tracking-wider shadow-xs">
                    {initials}
                  </div>
                  <div>
                    <h5 className="font-extrabold text-sm text-slate-900 leading-tight">
                      {customerName}
                    </h5>
                    <p className="text-xs text-slate-400 mt-0.5">{dateStr}</p>
                  </div>
                </div>

                {/* Nội dung nhận xét của khách */}
                {item.description && (
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed pt-1">
                    {item.description}
                  </p>
                )}

                {/* Phản hồi từ chủ chỗ nghỉ nếu có */}
                {item.reply && (
                  <div className="mt-2 p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-600 italic">
                    <strong className="text-slate-800 not-italic block font-bold mb-0.5">
                      Phản hồi từ khách sạn:
                    </strong>
                    {item.reply}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-10 text-center text-slate-400 text-xs">
          Chưa có đánh giá nào gần đây cho chỗ nghỉ này.
        </div>
      )}
    </div>
  );
}
