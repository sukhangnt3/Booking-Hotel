import React, { useState, useEffect, useCallback } from "react";
import {
  MessageSquareText,
  Search,
  Eye,
  EyeOff,
  Trash2,
  Building2,
  User,
  CalendarDays,
  AlertTriangle,
  CheckCircle2,
  Star,
  ShieldAlert,
} from "lucide-react";

// Components
import { Button, Badge, Input, StarRating, Pagination } from "@/components/ui";
import { LoadingSpinner, EmptyState } from "@/components/common";

// Services
import { reviewService } from "@/services";
import apiClient from "@/services/apiClient";

const STATUS_TABS = [
  { id: "all", label: "Tất cả đánh giá" },
  { id: "visible", label: "Đang hiển thị" },
  { id: "hidden", label: "Đã ẩn / Vi phạm" },
  { id: "low_rating", label: "Đánh giá kém (1-2 sao)" },
];

const SystemReviewPage = () => {
  // ─── 1. STATES ───
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [starFilter, setStarFilter] = useState("all");

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ─── 2. SEARCH DEBOUNCE ───
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 350);

    return () => clearTimeout(timer);
  }, [search]);

  // ─── 3. FETCH TOÀN BỘ REVIEW TOÀN SÀN TỪ API ───
  const fetchAllReviews = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        q: debouncedSearch.trim() || undefined,
        status: statusFilter === "all" ? undefined : statusFilter,
        rating: starFilter === "all" ? undefined : starFilter,
        page: currentPage,
        limit: 10,
      };

      const res = await apiClient.get("/admin/reviews", { params });
      const list = Array.isArray(res) ? res : res?.data || res?.reviews || [];

      setReviews(list);
      setTotalPages(res?.totalPages || res?.total_pages || 1);
    } catch (error) {
      console.error("Lỗi khi tải danh sách kiểm duyệt đánh giá:", error);
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, starFilter, currentPage]);

  useEffect(() => {
    fetchAllReviews();
  }, [fetchAllReviews]);

  // ─── 4. ẨN / HIỆN LẠI ĐÁNH GIÁ ───
  const handleToggleHideReview = async (reviewId, currentHidden) => {
    const nextHidden = !currentHidden;
    setActionLoadingId(reviewId);

    try {
      await apiClient.patch(`/admin/reviews/${reviewId}/visibility`, {
        is_hidden: nextHidden,
      });

      // Cập nhật UI tức thì
      setReviews((prev) =>
        prev.map((r) =>
          r.id === reviewId
            ? { ...r, is_hidden: nextHidden, hidden: nextHidden }
            : r,
        ),
      );

      showToast(
        nextHidden
          ? "Đã ẩn đánh giá vi phạm khỏi hệ thống!"
          : "Đã hiển thị lại đánh giá!",
      );
    } catch (err) {
      showToast("Thao tác thất bại, vui lòng thử lại.", "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  // ─── 5. XÓA VĨNH VIỄN ĐÁNH GIÁ (SPAM) ───
  const handleDeleteReview = async (reviewId) => {
    if (
      !window.confirm(
        "Bạn có chắc chắn muốn XÓA VĨNH VIỄN đánh giá này không? Hành động này không thể hoàn tác.",
      )
    ) {
      return;
    }

    setActionLoadingId(reviewId);
    try {
      await reviewService.delete(reviewId);
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      showToast("Đã xóa vĩnh viễn đánh giá!");
    } catch (err) {
      showToast("Không thể xóa đánh giá lúc này", "error");
    } finally {
      setActionLoadingId(null);
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

      {/* ─── HEADER BAR ─── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase text-blue-600 tracking-wider">
              Kiểm Duyệt Nội Dung
            </span>
            <Badge variant="primary" size="sm">
              {reviews.length} Đánh giá
            </Badge>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
            Kiểm Duyệt Đánh Giá Hệ Thống
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Theo dõi bình luận từ người dùng toàn sàn, xử lý khiếu nại và ẩn các
            phản hồi vi phạm tiêu chuẩn cộng đồng.
          </p>
        </div>
      </div>

      {/* ─── BỘ LỌC STATUS & THANH TÌM KIẾM ─── */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
        {/* Status Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setStatusFilter(tab.id);
                setCurrentPage(1);
              }}
              className={`px-5 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === tab.id
                  ? "bg-slate-900 text-white shadow-md"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Thanh tìm kiếm & lọc sao */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-9 relative">
            <Input
              placeholder="Tìm kiếm theo tên khách hàng, tên khách sạn hoặc nội dung bình luận..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search size={16} className="text-slate-400" />}
              className="bg-slate-50 border-slate-200 h-12"
              clearable
              onClear={() => setSearch("")}
            />
          </div>

          <div className="sm:col-span-3">
            <select
              value={starFilter}
              onChange={(e) => {
                setStarFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-12 bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold px-4 rounded-2xl outline-none cursor-pointer focus:border-blue-600 appearance-none"
            >
              <option value="all">⭐ Tất cả mức sao</option>
              <option value="5">5 Sao (Tuyệt vời)</option>
              <option value="4">4 Sao (Rất tốt)</option>
              <option value="3">3 Sao (Bình thường)</option>
              <option value="2">2 Sao (Kém)</option>
              <option value="1">1 Sao (Rất tệ)</option>
            </select>
          </div>
        </div>
      </div>

      {/* ─── DANH SÁCH REVIEW KIỂM DUYỆT ─── */}
      {loading ? (
        <div className="py-24 flex justify-center bg-white rounded-3xl border border-slate-200/80 shadow-sm">
          <LoadingSpinner
            size="lg"
            label="Đang tải danh sách đánh giá toàn sàn..."
          />
        </div>
      ) : reviews.length > 0 ? (
        <div className="space-y-4">
          {reviews.map((rev) => {
            const id = rev.id || rev.review_id;
            const isHidden = Boolean(rev.is_hidden || rev.hidden);
            const isActing = actionLoadingId === id;
            const star = Number(rev.rating || rev.point || 5);

            return (
              <div
                key={id}
                className={`p-6 md:p-8 rounded-3xl border shadow-sm transition-all space-y-4 relative overflow-hidden group ${
                  isHidden
                    ? "bg-slate-100/80 border-slate-200 opacity-60"
                    : "bg-white border-slate-200/80 hover:shadow-md hover:border-blue-200"
                }`}
              >
                {/* Header Card */}
                <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-3">
                  {/* Khách hàng & Khách sạn */}
                  <div className="flex items-start gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-blue-50 text-[#006ce4] font-black text-base flex items-center justify-center border border-blue-100 shrink-0">
                      {rev.customer_name?.charAt(0) ||
                        rev.user?.name?.charAt(0) ||
                        "U"}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-slate-900 text-sm">
                          {rev.customer_name ||
                            rev.user?.name ||
                            "Khách hàng ẩn danh"}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">
                          đã đánh giá
                        </span>
                        <span className="font-extrabold text-[#006ce4] text-sm flex items-center gap-1">
                          <Building2 size={13} />{" "}
                          {rev.hotel_name || rev.hotel?.name || "Khách sạn"}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-400 font-medium">
                        <StarRating rating={star} size={12} />
                        <span>•</span>
                        <span>
                          {rev.created_at
                            ? new Date(rev.created_at).toLocaleDateString(
                                "vi-VN",
                              )
                            : "Gần đây"}
                        </span>
                        {isHidden && (
                          <span className="text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <ShieldAlert size={12} /> Đã bị ẩn
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* NÚT THAO TÁC (ẨN / HIỆN / XÓA) */}
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    {/* Nút Ẩn / Mở lại */}
                    <Button
                      size="sm"
                      variant="outline"
                      isLoading={isActing}
                      onClick={() => handleToggleHideReview(id, isHidden)}
                      className={`text-xs font-bold rounded-xl px-4 ${
                        isHidden
                          ? "border-slate-300 text-slate-700 bg-white hover:bg-slate-50"
                          : "border-amber-200 text-amber-700 bg-amber-50/50 hover:bg-amber-100"
                      }`}
                      leftIcon={
                        isHidden ? <Eye size={14} /> : <EyeOff size={14} />
                      }
                    >
                      {isHidden ? "Hiện Lại" : "Ẩn Đánh Giá"}
                    </Button>

                    {/* Nút Xóa vĩnh viễn */}
                    <button
                      disabled={isActing}
                      onClick={() => handleDeleteReview(id)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors disabled:opacity-50"
                      title="Xóa vĩnh viễn đánh giá spam"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Nội dung bình luận */}
                <div className="p-4 bg-slate-50/60 rounded-2xl border border-slate-100">
                  <p className="text-sm text-slate-700 leading-relaxed font-medium">
                    "
                    {rev.comment ||
                      rev.description ||
                      "Khách hàng không để lại nhận xét chi tiết."}
                    "
                  </p>
                </div>
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
          icon={MessageSquareText}
          title="Không tìm thấy đánh giá nào"
          description="Hãy thử thay đổi từ khóa tìm kiếm hoặc chọn danh mục bộ lọc khác."
          actionLabel="Xem tất cả đánh giá"
          onAction={() => {
            setStatusFilter("all");
            setStarFilter("all");
            setSearch("");
          }}
        />
      )}
    </div>
  );
};

export default SystemReviewPage;
