import React, { useState } from "react";

const SystemReviewPage = () => {
  const [reviews, setReviews] = useState([
    { id: 1, user: "Nguyễn Văn A", hotel: "InterContinental Danang", rating: 5, comment: "Dịch vụ quá tuyệt vời!", hidden: false },
    { id: 2, user: "Trần Thị B", hotel: "Vinpearl Resort", rating: 1, comment: "Phòng bẩn, spam quảng cáo tin nhắn vi phạm...", hidden: false },
  ]);

  const toggleHide = (id) => {
    setReviews(reviews.map((r) => (r.id === id ? { ...r, hidden: !r.hidden } : r)));
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <h2 className="text-2xl font-black text-slate-900">Kiểm Duyệt Đánh Giá</h2>
        <p className="text-xs text-slate-500 mt-1">Theo dõi bình luận người dùng và ẩn các phản hồi vi phạm chuẩn mực.</p>
      </div>

      <div className="space-y-4">
        {reviews.map((r) => (
          <div key={r.id} className={`p-5 rounded-2xl border shadow-sm transition ${r.hidden ? "bg-slate-100 opacity-60" : "bg-white"}`}>
            <div className="flex justify-between items-start">
              <div>
                <span className="font-bold text-xs text-slate-900">{r.user}</span>
                <span className="text-xs text-slate-400"> đánh giá </span>
                <span className="font-bold text-xs text-blue-600">{r.hotel}</span>
                <div className="text-amber-400 text-sm mt-0.5">{"★".repeat(r.rating)}</div>
              </div>
              <button
                onClick={() => toggleHide(r.id)}
                className={`text-xs font-bold px-3 py-1 rounded-lg ${
                  r.hidden ? "bg-slate-200 text-slate-700" : "bg-rose-50 text-rose-600"
                }`}
              >
                {r.hidden ? "👁️ Hiện lại" : "🚫 Ẩn đánh giá"}
              </button>
            </div>
            <p className="text-xs text-slate-700 mt-3 italic">"{r.comment}"</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SystemReviewPage;