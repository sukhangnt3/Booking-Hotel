// src/components/review/ReviewForm.jsx
import React, { useState } from "react";
import { MessageSquare, AlertCircle, CheckCircle2 } from "lucide-react";
import { StarRating, Button, Badge } from "../ui";
import { useAuthStore } from "@/stores/authStore";
import { reviewService } from "@/services";
import { cn } from "@/utils/cn";

export default function ReviewForm({ hotelId, hotelName, onSubmitSuccess }) {
  const { isAuthenticated } = useAuthStore();

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const ratingLabels = {
    1: "Rất tệ",
    2: "Không hài lòng",
    3: "Bình thường",
    4: "Rất tốt",
    5: "Tuyệt vời xuất sắc",
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isAuthenticated) {
      setError("Vui lòng đăng nhập để gửi đánh giá.");
      return;
    }
    if (rating === 0) {
      setError("Vui lòng chọn số sao đánh giá.");
      return;
    }
    if (comment.trim().length < 5) {
      setError("Nội dung đánh giá phải có ít nhất 5 ký tự.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      await reviewService.create({
        hotelId,
        point: rating,
        description: comment.trim(),
      });

      setSuccess(true);
      setRating(5);
      setComment("");
      if (onSubmitSuccess) onSubmitSuccess();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err.message ||
          "Không thể gửi đánh giá lúc này.",
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
          Đánh giá của bạn đã được ghi nhận trực tiếp vào hệ thống GoStay.
        </p>
        <Button
          variant="outline"
          className="border-emerald-200 text-emerald-700 hover:bg-emerald-100 cursor-pointer"
          onClick={() => setSuccess(false)}
        >
          Viết đánh giá khác
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
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
              <Badge variant="primary">{ratingLabels[rating]}</Badge>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-700 block">
            Nhận xét chi tiết *
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Hãy chia sẻ về phòng ốc, vị trí, nhân viên hoặc trải nghiệm của bạn..."
            className="w-full min-h-[120px] p-4 rounded-xl border border-gray-300 outline-none text-sm leading-relaxed focus:border-[#003580] transition-all"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 text-xs font-bold rounded-lg border border-red-100">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <div className="pt-2">
          <Button
            type="submit"
            className="w-full h-12 text-base font-black bg-[#003580] hover:bg-blue-900 text-white cursor-pointer"
            isLoading={isSubmitting}
            disabled={!isAuthenticated}
          >
            {!isAuthenticated ? "Đăng nhập để đánh giá" : "Gửi đánh giá ngay"}
          </Button>
        </div>
      </form>
    </div>
  );
}
