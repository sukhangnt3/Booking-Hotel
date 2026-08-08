import React, { useState } from "react";

const SystemReviewPage = () => {
  const [reviews, setReviews] = useState([
    { id: "r1", user: "Le Van C", hotel: "Grand Plaza", rating: 2, comment: "Dịch vụ kém, phòng không sạch!", hidden: false },
    { id: "r2", user: "Pham Thi D", hotel: "InterContinental", rating: 5, comment: "Khách sạn tuyệt vời!", hidden: false },
  ]);

  const toggleHide = (id) => {
    setReviews(reviews.map((r) => (r.id === id ? { ...r, hidden: !r.hidden } : r)));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Kiểm Duyệt Đánh Giá</h1>
        <p className="text-xs text-slate-500">Kiểm duyệt và ẩn các nhận xét không phù hợp.</p>
      </div>

      <div className="space-y-4">
        {reviews.map((r) => (
          <div key={r.id} className={`bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3 ${r.hidden ? "opacity-50" : ""}`}>
            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold text-slate-900">{r.user}</p>
                <p className="text-xs text-blue-600 font-semibold">{r.hotel}</p>
              </div>
              <span className="text-amber-400 font-bold text-sm">{"★".repeat(r.rating)}</span>
            </div>
            <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border">{r.comment}</p>
            <div className="flex justify-between items-center pt-1">
              <span className="text-[11px] font-bold text-slate-400">{r.hidden ? "Đã ẩn" : "Công khai"}</span>
              <button onClick={() => toggleHide(r.id)} className={`px-3 py-1.5 text-xs font-bold rounded-lg text-white ${r.hidden ? "bg-emerald-600" : "bg-rose-600"}`}>
                {r.hidden ? "Hiện Đánh Giá" : "Ẩn Đánh Giá"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SystemReviewPage;