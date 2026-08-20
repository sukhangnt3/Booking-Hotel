import React, { useState } from "react";
import { MessageSquare, Send, AlertCircle, CheckCircle2 } from "lucide-react";
import { StarRating, Button, Badge } from "../ui";
import { useAuthStore } from "@/stores/authStore";
import { cn } from "@/utils/cn";

const ReviewForm = ({ hotelId, hotelName, onSubmitSuccess }) => {
  const { user, isAuthenticated } = useAuthStore();

  // 1. STATE QUẢN LÝ FORM
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Nhãn mô tả cho từng mức điểm
  const ratingLabels = {
    1: "Rất tệ",
    2: "Không hài lòng",
    3: "Bình thường",
    4: "Rất tốt",
    5: "Tuyệt vời xuất sắc",
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!isAuthenticated) {
      setError("Vui lòng đăng nhập để gửi đánh giá.");
      return;
    }
    if (rating === 0) {
      setError("Vui lòng chọn số sao đánh giá.");
      return;
    }
    if (comment.trim().length < 10) {
      setError("Nội dung đánh giá phải có ít nhất 10 ký tự.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      // GỌI API THỰC TẾ (Ví dụ)
      // await reviewService.create({ hotelId, rating, comment });

      // Giả lập delay API
      await new Promise((resolve) => setTimeout(resolve, 1500));

      setSuccess(true);
      setRating(0);
      setComment("");
      if (onSubmitSuccess) onSubmitSuccess();
    } catch (err) {
      setError(
        err.response?.data?.message || "Không thể gửi đánh giá lúc này.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="bg-emerald-50 border border-emerald-100 p-8 rounded-2xl text-center space-y-4 animate-in zoom-in">
        <div className="w-16 h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-200">
          <CheckCircle2 size={32} />
        </div>
        <h3 className="text-xl font-bold text-emerald-900">
          Cảm ơn bạn đã đánh giá!
        </h3>
        <p className="text-sm text-emerald-700">
          Nhận xét của bạn giúp cộng đồng GoStay chọn được chỗ nghỉ tốt hơn.
        </p>
        <Button
          variant="outline"
          className="border-emerald-200 text-emerald-700 hover:bg-emerald-100"
          onClick={() => setSuccess(false)}
        >
          Viết đánh giá khác
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* HEADER */}
      <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100 flex items-center gap-3">
        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
          <MessageSquare size={20} />
        </div>
        <div>
          <h3 className="font-bold text-gray-900 text-base">
            Chia sẻ trải nghiệm của bạn
          </h3>
          <p className="text-[11px] text-gray-500 font-medium italic">
            Về chỗ nghỉ: {hotelName}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* PHẦN CHỌN SAO */}
        <div className="space-y-3">
          <label className="text-sm font-bold text-gray-700 block">
            Bạn đánh giá chỗ nghỉ này mấy sao? *
          </label>
          <div className="flex items-center gap-4">
            <StarRating
              editable
              rating={rating}
              onChange={(val) => setRating(val)}
              size={32}
            />
            {rating > 0 && (
              <Badge
                variant="primary"
                className="animate-in fade-in slide-in-from-left-2"
              >
                {ratingLabels[rating]}
              </Badge>
            )}
          </div>
        </div>

        {/* PHẦN NHẬP NỘI DUNG */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-700 block">
            Nhận xét chi tiết *
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Hãy chia sẻ về phòng ốc, vị trí, nhân viên hoặc đồ ăn..."
            className={cn(
              "w-full min-h-[150px] p-4 rounded-xl border border-gray-300 outline-none transition-all text-sm leading-relaxed",
              "focus:border-blue-600 focus:ring-4 focus:ring-blue-100",
              "placeholder:text-gray-400 placeholder:italic",
            )}
          />
          <div className="flex justify-between items-center px-1">
            <p className="text-[10px] text-gray-400 font-medium">
              Tối thiểu 10 ký tự
            </p>
            <p
              className={cn(
                "text-[10px] font-bold",
                comment.length >= 10 ? "text-emerald-500" : "text-gray-300",
              )}
            >
              {comment.length} ký tự
            </p>
          </div>
        </div>

        {/* THÔNG BÁO LỖI */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 text-xs font-bold rounded-lg border border-red-100 animate-pulse">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {/* NÚT GỬI */}
        <div className="pt-2">
          <Button
            type="submit"
            className="w-full h-12 text-base font-black shadow-lg shadow-blue-100"
            isLoading={isSubmitting}
            disabled={!isAuthenticated}
          >
            {!isAuthenticated ? "Đăng nhập để đánh giá" : "Gửi đánh giá ngay"}
          </Button>
          {!isAuthenticated && (
            <p className="text-[10px] text-center text-gray-400 mt-3 italic">
              * Chỉ những khách hàng đã từng đặt phòng mới có thể để lại đánh
              giá xác thực.
            </p>
          )}
        </div>
      </form>
    </div>
  );
};

export default ReviewForm;
