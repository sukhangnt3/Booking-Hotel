// src/components/review/ReviewForm.jsx
import React, { useState, useEffect } from "react";
import { Lock, Send, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";
import apiClient from "@/services/apiClient";
import { useAuthStore } from "@/stores/authStore";

const SCORE_LABELS = {
  1: "Rất tệ",
  2: "Tệ",
  3: "Không hài lòng",
  4: "Dưới trung bình",
  5: "Trung bình",
  6: "Tạm ổn",
  7: "Hài lòng",
  8: "Rất tốt",
  9: "Tuyệt vời",
  10: "Xuất sắc tuyệt đối",
};

export default function ReviewForm({ hotelId, hotelName, onSubmitSuccess }) {
  const { isAuthenticated } = useAuthStore();

  const [canReview, setCanReview] = useState(false);
  const [bookingInfo, setBookingInfo] = useState(null);
  const [checking, setChecking] = useState(true);

  const [point, setPoint] = useState(10);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Kiểm tra xem khách đã đặt phòng ở khách sạn này chưa
  useEffect(() => {
    async function checkBooking() {
      if (!isAuthenticated || !hotelId) {
        setCanReview(false);
        setChecking(false);
        return;
      }
      try {
        const res = await apiClient.get(`/hotels/${hotelId}/can-review`);
        if (res.data?.canReview) {
          setCanReview(true);
          setBookingInfo(res.data.booking);
        } else {
          setCanReview(false);
        }
      } catch (err) {
        setCanReview(false);
      } finally {
        setChecking(false);
      }
    }
    checkBooking();
  }, [hotelId, isAuthenticated]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!comment.trim()) {
      setError("Vui lòng nhập vài dòng chia sẻ cảm nhận của bạn.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await apiClient.post(`/hotels/${hotelId}/reviews`, {
        hotelId,
        bookingId: bookingInfo?.id,
        point: Number(point),
        description: comment.trim(),
      });

      setSuccess(true);
      setComment("");
      setPoint(10);
      if (onSubmitSuccess) onSubmitSuccess();
    } catch (err) {
      setError(err?.response?.data?.message || "Không thể gửi đánh giá.");
    } finally {
      setSubmitting(false);
    }
  };

  if (checking) return null;

  // TRƯỜNG HỢP 1: KHÁCH CHƯA ĐĂNG NHẬP HOẶC CHƯA TỪNG ĐẶT PHÒNG TẠI ĐÂY
  if (!canReview) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs font-sans text-center space-y-3">
        <div className="w-11 h-11 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center mx-auto">
          <Lock size={20} />
        </div>
        <h4 className="text-sm font-black text-slate-900">
          Chỉ khách đã đặt phòng mới được đánh giá
        </h4>
        <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
          Để đảm bảo tính xác thực và công bằng, hệ thống GoStay chỉ cho phép du
          khách đã thực tế đặt phòng tại <strong>{hotelName}</strong> gửi đánh
          giá.
        </p>
      </div>
    );
  }

  // TRƯỜNG HỢP 2: ĐÁNH GIÁ THÀNH CÔNG
  if (success) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-2xl text-center space-y-2.5 font-sans">
        <CheckCircle2 size={32} className="text-emerald-600 mx-auto" />
        <h4 className="text-sm font-black text-emerald-900">
          Đánh giá của bạn đã được đăng!
        </h4>
        <p className="text-xs text-emerald-700">
          Cảm ơn bạn đã đóng góp đánh giá thực tế cho khách sạn.
        </p>
      </div>
    );
  }

  // TRƯỜNG HỢP 3: KHÁCH ĐÃ ĐẶT PHÒNG -> CHO PHÉP ĐÁNH GIÁ THANG ĐIỂM 10
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs font-sans space-y-4">
      <div className="border-b border-slate-100 pb-3">
        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
          ✓ Đã xác thực đặt phòng
        </span>
        <h4 className="text-sm font-black text-slate-900 mt-1">
          Viết đánh giá cho kỳ nghỉ của bạn
        </h4>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* CHỌN ĐIỂM 1 ĐẾN 10 */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-slate-700">Chấm điểm:</span>
            <span className="font-black text-[#2e7d32]">
              {point}/10 - {SCORE_LABELS[point]}
            </span>
          </div>

          <div className="grid grid-cols-10 gap-1">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setPoint(num)}
                className={`h-8 rounded-lg font-black text-xs transition cursor-pointer border ${
                  point === num
                    ? "bg-[#2e7d32] border-[#2e7d32] text-white shadow-xs"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        {/* NHẬP BÌNH LUẬN */}
        <div className="space-y-1">
          <textarea
            required
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Dịch vụ tốt, đồ ăn ngon, khách sạn đẹp..."
            className="w-full p-3 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#2e7d32] bg-white transition"
          />
        </div>

        {error && <p className="text-xs text-rose-600 font-bold">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5 bg-[#003580] hover:bg-blue-900 text-white font-black text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
        >
          <Send size={13} />
          {submitting ? "Đang gửi..." : "Gửi đánh giá ngay"}
        </button>
      </form>
    </div>
  );
}
