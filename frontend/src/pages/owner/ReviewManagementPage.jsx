import React, { useState } from "react";

const ReviewManagementPage = () => {
  const [reviews, setReviews] = useState([
    {
      id: 1,
      guestName: "Phạm Hải Đăng",
      rating: 5,
      date: "10/08/2026",
      roomType: "Biệt Thự Hồ Bơi Riêng",
      comment: "Khách sạn cực kỳ đẹp, nhân viên phục vụ tận tình 10/10. Sẽ quay lại vào kỳ nghỉ tới!",
      reply: "Cảm ơn bạn Hải Đăng rất nhiều! Khách sạn rất hân hạnh được phục vụ gia đình mình.",
    },
    {
      id: 2,
      guestName: "Nguyễn Thị Mai",
      rating: 4,
      date: "05/08/2026",
      roomType: "Phòng Deluxe Hướng Biển",
      comment: "Phòng rộng rãi, sạch sẽ. Tuy nhiên buffet sáng hơi ít món Á.",
      reply: null,
    },
  ]);

  const [replyInput, setReplyInput] = useState({});

  const handleSendReply = (id) => {
    if (!replyInput[id]) return;
    setReviews(reviews.map((r) => (r.id === id ? { ...r, reply: replyInput[id] } : r)));
    setReplyInput({ ...replyInput, [id]: "" });
  };

  return (
    <div className="space-y-6 font-sans text-slate-800">
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <h2 className="text-2xl font-black text-slate-900">Đánh Giá Từ Khách Hàng</h2>
        <p className="text-xs text-slate-500 mt-1">Lắng nghe phản hồi của khách và tương tác trực tiếp để nâng cao uy tín chỗ nghỉ.</p>
      </div>

      <div className="space-y-4">
        {reviews.map((rev) => (
          <div key={rev.id} className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="font-black text-slate-900 text-sm">{rev.guestName}</span>
                <span className="text-xs text-slate-400 ml-2">• Đã ở {rev.roomType} ({rev.date})</span>
              </div>
              <span className="bg-amber-100 text-amber-800 font-black text-xs px-2.5 py-1 rounded-lg">
                ⭐ {rev.rating} / 5.0
              </span>
            </div>

            <p className="text-xs text-slate-700 font-medium italic">"{rev.comment}"</p>

            {/* KHỐI PHẢN HỒI NẾU ĐÃ CÓ */}
            {rev.reply ? (
              <div className="bg-slate-50 border-l-4 border-blue-600 p-3.5 rounded-r-xl text-xs space-y-1">
                <span className="font-black text-blue-900">💬 Phản hồi từ Chủ chỗ nghỉ:</span>
                <p className="text-slate-600 font-semibold">{rev.reply}</p>
              </div>
            ) : (
              /* FORM NHẬP PHẢN HỒI NẾU CHƯA CÓ */
              <div className="flex gap-2 pt-2">
                <input
                  type="text"
                  placeholder="Viết lời cảm ơn hoặc phản hồi cho khách..."
                  value={replyInput[rev.id] || ""}
                  onChange={(e) => setReplyInput({ ...replyInput, [rev.id]: e.target.value })}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-semibold outline-none"
                />
                <button
                  onClick={() => handleSendReply(rev.id)}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition"
                >
                  Gửi phản hồi
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReviewManagementPage;