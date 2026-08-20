import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  MessageSquare,
  Send,
  Star,
  Building2,
  Reply,
  CheckCircle2,
  User,
  CalendarDays,
  CornerDownRight,
  Filter,
} from "lucide-react";

// Components
import { Button, Badge, StarRating, Pagination } from "@/components/ui";
import { LoadingSpinner, EmptyState } from "@/components/common";

// Services
import { reviewService, hotelService } from "@/services";

const ReviewManagementPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // ─── 1. STATES ───
  const [hotels, setHotels] = useState([]);
  const [selectedHotelId, setSelectedHotelId] = useState(
    searchParams.get("hotelId") || "",
  );
  const [filterStar, setFilterStar] = useState("all");

  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // State quản lý text nhập phản hồi cho từng review: { [reviewId]: "text" }
  const [replyInput, setReplyInput] = useState({});
  const [submittingReplyId, setSubmittingReplyId] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ─── 2. LOAD DANH SÁCH KHÁCH SẠN CỦA OWNER ───
  useEffect(() => {
    const fetchHotels = async () => {
      try {
        const res = await hotelService.getAll({ isOwner: true });
        const list = Array.isArray(res) ? res : res?.data || res?.hotels || [];
        setHotels(list);

        if (list.length > 0 && !selectedHotelId) {
          const firstId = String(list[0].id || list[0].hotel_id);
          setSelectedHotelId(firstId);
          setSearchParams({ hotelId: firstId });
        }
      } catch (err) {
        console.error("Lỗi lấy danh sách khách sạn:", err);
      }
    };

    fetchHotels();
  }, []);

  // ─── 3. FETCH DANH SÁCH ĐÁNH GIÁ THỰC TẾ ───
  const fetchReviews = async () => {
    if (!selectedHotelId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const params = {
        hotelId: selectedHotelId,
        rating: filterStar === "all" ? undefined : filterStar,
        page: currentPage,
        limit: 8,
      };

      const res = await reviewService.getOwnerReviews(params);
      const list = Array.isArray(res) ? res : res?.data || res?.reviews || [];

      setReviews(list);
      setTotalPages(res?.totalPages || res?.total_pages || 1);
    } catch (err) {
      console.error("Lỗi tải đánh giá:", err);
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [selectedHotelId, filterStar, currentPage]);

  // ─── 4. GỬI PHẢN HỒI (REPLY) ───
  const handleSendReply = async (reviewId) => {
    const replyText = replyInput[reviewId]?.trim();
    if (!replyText) return;

    setSubmittingReplyId(reviewId);
    try {
      await reviewService.reply(reviewId, replyText);

      // Cập nhật UI tức thì
      setReviews((prev) =>
        prev.map((r) =>
          r.id === reviewId
            ? { ...r, reply: replyText, reply_content: replyText }
            : r,
        ),
      );

      // Xóa ô nhập
      setReplyInput((prev) => ({ ...prev, [reviewId]: "" }));
      showToast("Đã gửi phản hồi cho khách hàng!");
    } catch (err) {
      showToast("Không thể gửi phản hồi lúc này.", "error");
    } finally {
      setSubmittingReplyId(null);
    }
  };

  return (
    <div className="space-y-8 font-sans pb-16 text-slate-800">
      {/* TOAST NOTIFICATION */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-5 py-3.5 rounded-2xl shadow-2xl text-white font-bold text-sm animate-in slide-in-from-bottom-5 ${
            toast.type === "error" ? "bg-rose-600" : "bg-emerald-600"
          }`}
        >
          <CheckCircle2 size={18} />
          <span>{toast.message}</span>
        </div>
      )}

      {/* ─── HEADER & CHỌN KHÁCH SẠN ─── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase text-emerald-600 tracking-wider">
              Tương Tác Khách Hàng
            </span>
            <Badge variant="primary" size="sm">
              {reviews.length} Nhận xét
            </Badge>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
            Đánh Giá Từ Khách Hàng
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Lắng nghe phản hồi thực tế của khách và gửi lời cảm ơn hoặc giải
            trình để nâng cao uy tín chỗ nghỉ.
          </p>
        </div>

        {/* Dropdown chọn cơ sở */}
        {hotels.length > 0 && (
          <div className="relative w-full md:w-64">
            <select
              value={selectedHotelId}
              onChange={(e) => {
                setSelectedHotelId(e.target.value);
                setSearchParams({ hotelId: e.target.value });
                setCurrentPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold px-4 py-3 rounded-2xl outline-none cursor-pointer focus:border-emerald-500 appearance-none"
            >
              {hotels.map((h) => (
                <option key={h.id || h.hotel_id} value={h.id || h.hotel_id}>
                  🏨 {h.name}
                </option>
              ))}
            </select>
            <Building2
              size={16}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
          </div>
        )}
      </div>

      {/* ─── THANH LỌC THEO SỐ SAO ─── */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex items-center gap-2 overflow-x-auto no-scrollbar">
        <span className="text-xs font-bold text-slate-400 uppercase mr-2 tracking-wider">
          Lọc theo sao:
        </span>
        {["all", 5, 4, 3, 2, 1].map((s) => (
          <button
            key={s}
            onClick={() => {
              setFilterStar(String(s));
              setCurrentPage(1);
            }}
            className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              filterStar === String(s)
                ? "bg-[#006ce4] text-white shadow-md shadow-blue-100"
                : "bg-slate-50 text-slate-600 hover:bg-slate-100"
            }`}
          >
            {s === "all" ? "Tất cả đánh giá" : `${s} Sao ⭐`}
          </button>
        ))}
      </div>

      {/* ─── DANH SÁCH ĐÁNH GIÁ & KHỐI REPLY ─── */}
      {loading ? (
        <div className="py-24 flex justify-center bg-white rounded-3xl border border-slate-200/80 shadow-sm">
          <LoadingSpinner size="lg" label="Đang tải danh sách đánh giá..." />
        </div>
      ) : reviews.length > 0 ? (
        <div className="space-y-5">
          {reviews.map((rev) => {
            const hasReply = Boolean(rev.reply || rev.reply_content);
            const isSubmitting = submittingReplyId === rev.id;

            return (
              <div
                key={rev.id}
                className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all space-y-5"
              >
                {/* Header nhận xét */}
                <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-blue-50 text-[#006ce4] font-black text-base flex items-center justify-center border border-blue-100 shrink-0">
                      {rev.guest_name?.charAt(0) ||
                        rev.user?.name?.charAt(0) ||
                        "U"}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-base leading-snug">
                        {rev.guest_name || rev.user?.name || "Khách hàng"}
                      </h3>
                      <p className="text-xs text-slate-400 font-medium mt-0.5 flex items-center gap-2">
                        <span>
                          {rev.room_name || rev.roomType || "Phòng tiêu chuẩn"}
                        </span>
                        <span>•</span>
                        <span>
                          {rev.created_at
                            ? new Date(rev.created_at).toLocaleDateString(
                                "vi-VN",
                              )
                            : "Gần đây"}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Điểm số */}
                  <div className="flex items-center gap-2 self-start">
                    <StarRating
                      rating={rev.rating || rev.point || 5}
                      size={14}
                    />
                    <span className="bg-[#003580] text-white font-black text-xs px-2.5 py-1 rounded-xl shadow-sm">
                      {Number(rev.rating || rev.point || 5).toFixed(1)}
                    </span>
                  </div>
                </div>

                {/* Nội dung nhận xét của khách */}
                <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-sm text-slate-700 leading-relaxed font-medium italic">
                    "
                    {rev.comment ||
                      rev.description ||
                      "Chỗ nghỉ sạch sẽ, phục vụ tận tình chu đáo."}
                    "
                  </p>
                </div>

                {/* KHỐI PHẢN HỒI (REPLY) */}
                {hasReply ? (
                  /* ĐÃ CÓ PHẢN HỒI */
                  <div className="bg-blue-50/60 border border-blue-200 p-4 rounded-2xl space-y-1.5 ml-4 sm:ml-8 animate-in fade-in">
                    <div className="flex items-center gap-1.5 text-xs font-black text-blue-900">
                      <CornerDownRight size={14} className="text-[#006ce4]" />
                      <span>Phản hồi từ Chủ chỗ nghỉ:</span>
                    </div>
                    <p className="text-xs text-slate-700 font-medium leading-relaxed pl-5">
                      {rev.reply || rev.reply_content}
                    </p>
                  </div>
                ) : (
                  /* CHƯA PHẢN HỒI -> FORM NHẬP */
                  <div className="pt-2 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        placeholder="Viết lời cảm ơn hoặc phản hồi cho khách..."
                        value={replyInput[rev.id] || ""}
                        onChange={(e) =>
                          setReplyInput({
                            ...replyInput,
                            [rev.id]: e.target.value,
                          })
                        }
                        className="w-full h-11 bg-slate-50 border border-slate-200 rounded-2xl px-4 text-xs font-semibold outline-none focus:border-[#006ce4] focus:bg-white transition-all placeholder:text-slate-400"
                      />
                    </div>
                    <Button
                      size="sm"
                      isLoading={isSubmitting}
                      disabled={!replyInput[rev.id]?.trim()}
                      onClick={() => handleSendReply(rev.id)}
                      className="bg-[#006ce4] hover:bg-blue-700 text-white font-extrabold px-5 h-11 rounded-2xl text-xs shadow-md shadow-blue-100 shrink-0"
                      leftIcon={<Send size={14} />}
                    >
                      Gửi Phản Hồi
                    </Button>
                  </div>
                )}
              </div>
            );
          })}

          {/* Phân trang */}
          {totalPages > 1 && (
            <div className="pt-6 flex justify-center">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={(p) => setCurrentPage(p)}
              />
            </div>
          )}
        </div>
      ) : (
        <EmptyState
          icon={MessageSquare}
          title="Chưa có đánh giá nào"
          description="Chỗ nghỉ này chưa nhận được nhận xét nào theo bộ lọc đang chọn."
          actionLabel="Xem tất cả đánh giá"
          onAction={() => setFilterStar("all")}
        />
      )}
    </div>
  );
};

export default ReviewManagementPage;
