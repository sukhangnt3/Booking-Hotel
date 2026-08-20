import React, { useState, useEffect } from "react";
import {
  Globe,
  Ticket,
  Tag,
  Plus,
  Trash2,
  Sparkles,
  Clock,
  CheckCircle2,
  DollarSign,
  Percent,
  Flame,
  Power,
} from "lucide-react";

// Components
import { Button, Input, Badge, Modal } from "@/components/ui";
import { LoadingSpinner, EmptyState } from "@/components/common";
import { PromotionBadge } from "@/components/promotion";

// Services
import { promotionService } from "@/services";

const GlobalPromotionPage = () => {
  // ─── 1. STATES ───
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Modal tạo voucher sàn mới
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [promoForm, setPromoForm] = useState({
    code: "",
    title: "",
    description: "",
    discount_type: "percentage", // 'percentage' | 'amount'
    value: 15,
    min_spend: 1000000,
    start_date: new Date().toISOString().split("T")[0],
    end_date: new Date(Date.now() + 60 * 86400000).toISOString().split("T")[0],
    usage_limit: 500,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const formatVND = (num) => Number(num || 0).toLocaleString("vi-VN") + " ₫";

  // ─── 2. FETCH TOÀN BỘ VOUCHER TOÀN SÀN TỪ API ───
  const fetchGlobalPromotions = async () => {
    setLoading(true);
    try {
      // Gọi API lấy voucher toàn cục (không gắn riêng khách sạn nào)
      const res = await promotionService.getAll({ isGlobal: true });
      const list = Array.isArray(res)
        ? res
        : res?.data || res?.promotions || [];
      setPromotions(list);
    } catch (err) {
      console.error("Lỗi tải danh sách mã giảm giá toàn sàn:", err);
      setPromotions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGlobalPromotions();
  }, []);

  // ─── 3. TẠO MÃ GIẢM GIÁ TOÀN SÀN MỚI ───
  const handleCreateGlobalPromo = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      ...promoForm,
      is_global: true, // Đánh dấu đây là mã toàn sàn
      hotel_id: null, // Áp dụng cho mọi khách sạn
      code: promoForm.code.trim().toUpperCase(),
      value: Number(promoForm.value),
      min_spend: Number(promoForm.min_spend),
    };

    try {
      await promotionService.create(payload);
      showToast("Tạo mã khuyến mãi toàn sàn thành công!");
      setIsModalOpen(false);
      setPromoForm({
        code: "",
        title: "",
        description: "",
        discount_type: "percentage",
        value: 15,
        min_spend: 1000000,
        start_date: new Date().toISOString().split("T")[0],
        end_date: new Date(Date.now() + 60 * 86400000)
          .toISOString()
          .split("T")[0],
        usage_limit: 500,
      });
      fetchGlobalPromotions();
    } catch (err) {
      showToast(
        "Lỗi khi tạo mã: " + (err.message || "Vui lòng thử lại"),
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── 4. BẬT / TẮT MÃ KHUYẾN MÃI ───
  const handleToggleStatus = async (promoId, currentActive) => {
    const nextStatus = !currentActive;
    try {
      if (promotionService.toggleStatus) {
        await promotionService.toggleStatus(promoId, nextStatus);
      }
      setPromotions((prev) =>
        prev.map((p) =>
          p.id === promoId ? { ...p, is_active: nextStatus } : p,
        ),
      );
      showToast(`Đã ${nextStatus ? "kích hoạt" : "tắt"} mã giảm giá!`);
    } catch (err) {
      showToast("Không thể đổi trạng thái mã", "error");
    }
  };

  // ─── 5. XÓA VOUCHER VĨNH VIỄN ───
  const handleDeletePromo = async (promoId, promoCode) => {
    if (
      !window.confirm(
        `Bạn có chắc muốn xóa vĩnh viễn voucher toàn sàn "${promoCode}" không?`,
      )
    ) {
      return;
    }

    try {
      await promotionService.delete(promoId);
      setPromotions((prev) => prev.filter((p) => p.id !== promoId));
      showToast("Đã xóa voucher toàn sàn!");
    } catch (err) {
      showToast("Không thể xóa mã lúc này", "error");
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
              Chương Trình Toàn Sàn
            </span>
            <Badge variant="primary" size="sm">
              {promotions.length} Voucher GoStay
            </Badge>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
            Mã Giảm Giá Toàn Cục (Global Deals)
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Tạo và phân phối các mã khuyến mãi áp dụng cho tất cả khách sạn trên
            nền tảng GoStay.
          </p>
        </div>

        <Button
          onClick={() => setIsModalOpen(true)}
          className="bg-[#006ce4] hover:bg-blue-700 text-white font-extrabold px-6 h-12 rounded-2xl shadow-lg shadow-blue-100 shrink-0"
          leftIcon={<Plus size={18} />}
        >
          Tạo Mã Toàn Sàn Mới
        </Button>
      </div>

      {/* ─── DANH SÁCH MÃ GIẢM GIÁ TOÀN CỤC (GRID) ─── */}
      {loading ? (
        <div className="py-24 flex justify-center bg-white rounded-3xl border border-slate-200">
          <LoadingSpinner
            size="lg"
            label="Đang tải danh sách voucher toàn sàn..."
          />
        </div>
      ) : promotions.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {promotions.map((promo) => {
            const isPercent =
              promo.discount_type === "percentage" ||
              promo.type === "percentage";
            const discountDisplay = isPercent
              ? `${promo.value || promo.discount}%`
              : formatVND(promo.value || promo.discount);
            const isActive = promo.is_active ?? true;

            return (
              <div
                key={promo.id}
                className={`bg-white rounded-3xl border-2 border-dashed p-6 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between space-y-5 group relative overflow-hidden ${
                  isActive
                    ? "border-blue-300"
                    : "border-slate-200 bg-slate-50/50 opacity-60"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <span className="bg-blue-50 text-[#006ce4] font-mono font-black text-lg px-4 py-1.5 rounded-xl border border-blue-200 tracking-wider">
                        🏷️ {promo.code}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <PromotionBadge
                        type={isPercent ? "percentage" : "amount"}
                        value={Number(promo.value || promo.discount || 15)}
                        size="sm"
                      />
                      <span
                        className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                          isActive
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {isActive ? "Đang bật" : "Đã tắt"}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-base font-extrabold text-slate-900 leading-snug">
                      {promo.title ||
                        `Giảm ${discountDisplay} cho tất cả khách sạn`}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      {promo.description ||
                        `Áp dụng cho mọi đơn đặt phòng có giá trị từ ${formatVND(promo.min_spend || promo.minSpend || 0)}`}
                    </p>
                  </div>
                </div>

                {/* Hạn dùng & Nút thao tác */}
                <div className="pt-4 border-t border-slate-100 flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium flex items-center gap-1.5">
                    <Clock size={13} /> Hạn dùng:{" "}
                    <strong className="text-slate-700">
                      {promo.end_date || promo.validUntil}
                    </strong>
                  </span>

                  <div className="flex items-center gap-2">
                    {/* Bật / Tắt nhanh */}
                    <button
                      onClick={() => handleToggleStatus(promo.id, isActive)}
                      className={`p-2 rounded-xl border transition-colors ${
                        isActive
                          ? "text-amber-600 hover:bg-amber-50 border-amber-200"
                          : "text-emerald-600 hover:bg-emerald-50 border-emerald-200"
                      }`}
                      title={isActive ? "Tắt mã này" : "Bật lại mã này"}
                    >
                      <Power size={14} />
                    </button>

                    {/* Xóa mã */}
                    <button
                      onClick={() => handleDeletePromo(promo.id, promo.code)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Xóa vĩnh viễn"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={Globe}
          title="Chưa có mã giảm giá toàn sàn nào"
          description="Tạo các mã khuyến mãi toàn cầu để kích cầu du lịch cho toàn bộ khách sạn trên GoStay."
          actionLabel="Tạo mã toàn sàn đầu tiên"
          onAction={() => setIsModalOpen(true)}
        />
      )}

      {/* ─── MODAL TẠO MÃ TOÀN SÀN ─── */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Tạo Mã Giảm Giá Toàn Cục Mới"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateGlobalPromo} className="space-y-5">
          <Input
            label="Mã Code Voucher (Viết hoa) *"
            required
            placeholder="Ví dụ: GOSTAY2024, HEVIBES..."
            value={promoForm.code}
            onChange={(e) =>
              setPromoForm({ ...promoForm, code: e.target.value.toUpperCase() })
            }
          />

          <Input
            label="Tiêu đề chương trình *"
            required
            placeholder="Ví dụ: Siêu hội du lịch hè - Giảm 15%"
            value={promoForm.title}
            onChange={(e) =>
              setPromoForm({ ...promoForm, title: e.target.value })
            }
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                Loại giảm giá *
              </label>
              <select
                value={promoForm.discount_type}
                onChange={(e) =>
                  setPromoForm({ ...promoForm, discount_type: e.target.value })
                }
                className="w-full h-11 bg-white border border-gray-300 rounded-xl px-4 text-sm font-semibold outline-none focus:border-[#006ce4]"
              >
                <option value="percentage">Giảm theo % (Phần trăm)</option>
                <option value="amount">Giảm số tiền cố định (VNĐ)</option>
              </select>
            </div>

            <Input
              label={
                promoForm.discount_type === "percentage"
                  ? "Mức giảm (%) *"
                  : "Số tiền giảm (VNĐ) *"
              }
              type="number"
              required
              min="1"
              value={promoForm.value}
              onChange={(e) =>
                setPromoForm({ ...promoForm, value: e.target.value })
              }
            />
          </div>

          <Input
            label="Giá trị đơn hàng tối thiểu (VNĐ) *"
            type="number"
            required
            min="0"
            step="50000"
            placeholder="1.000.000"
            value={promoForm.min_spend}
            onChange={(e) =>
              setPromoForm({ ...promoForm, min_spend: e.target.value })
            }
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Ngày bắt đầu *"
              type="date"
              required
              value={promoForm.start_date}
              onChange={(e) =>
                setPromoForm({ ...promoForm, start_date: e.target.value })
              }
            />

            <Input
              label="Ngày hết hạn *"
              type="date"
              required
              value={promoForm.end_date}
              onChange={(e) =>
                setPromoForm({ ...promoForm, end_date: e.target.value })
              }
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              className="rounded-xl font-bold"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              isLoading={isSubmitting}
              className="bg-[#006ce4] hover:bg-blue-700 text-white font-extrabold rounded-xl px-6"
            >
              Tạo Mã Toàn Sàn
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default GlobalPromotionPage;
