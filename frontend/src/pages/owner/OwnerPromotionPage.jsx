import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Ticket,
  Tag,
  Plus,
  Trash2,
  Building2,
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
import { promotionService, hotelService } from "@/services";

const OwnerPromotionPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // ─── 1. STATES ───
  const [hotels, setHotels] = useState([]);
  const [selectedHotelId, setSelectedHotelId] = useState(
    searchParams.get("hotelId") || "",
  );

  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Modal tạo mã mới
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [promoForm, setPromoForm] = useState({
    code: "",
    discount_type: "percentage", // 'percentage' | 'amount'
    value: 10,
    min_spend: 1000000,
    start_date: new Date().toISOString().split("T")[0],
    end_date: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
    quantity_limit: 50,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const formatVND = (num) => Number(num || 0).toLocaleString("vi-VN") + " ₫";

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

  // ─── 3. FETCH DANH SÁCH MÃ GIẢM GIÁ CỦA KHÁCH SẠN ───
  const fetchPromotions = async () => {
    if (!selectedHotelId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await promotionService.getOwnerPromotions({
        hotelId: selectedHotelId,
      });
      const list = Array.isArray(res)
        ? res
        : res?.data || res?.promotions || [];
      setPromotions(list);
    } catch (err) {
      console.error("Lỗi tải mã giảm giá:", err);
      setPromotions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromotions();
  }, [selectedHotelId]);

  // ─── 4. TẠO MÃ GIẢM GIÁ MỚI ───
  const handleCreatePromo = async (e) => {
    e.preventDefault();
    if (!selectedHotelId) return;

    setIsSubmitting(true);
    const payload = {
      ...promoForm,
      hotel_id: selectedHotelId,
      code: promoForm.code.trim().toUpperCase(),
      value: Number(promoForm.value),
      min_spend: Number(promoForm.min_spend),
    };

    try {
      await promotionService.create(payload);
      showToast("Tạo mã khuyến mãi mới thành công!");
      setIsModalOpen(false);
      setPromoForm({
        code: "",
        discount_type: "percentage",
        value: 10,
        min_spend: 1000000,
        start_date: new Date().toISOString().split("T")[0],
        end_date: new Date(Date.now() + 30 * 86400000)
          .toISOString()
          .split("T")[0],
        quantity_limit: 50,
      });
      fetchPromotions();
    } catch (err) {
      showToast(
        "Lỗi khi tạo mã: " + (err.message || "Vui lòng thử lại"),
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── 5. XÓA HOẶC TẮT VOUCHER ───
  const handleDeletePromo = async (promoId, promoCode) => {
    if (
      !window.confirm(`Bạn có chắc muốn xóa mã voucher "${promoCode}" không?`)
    ) {
      return;
    }

    try {
      await promotionService.delete(promoId);
      setPromotions((prev) => prev.filter((p) => p.id !== promoId));
      showToast("Đã xóa mã giảm giá!");
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

      {/* ─── HEADER & CHỌN KHÁCH SẠN ─── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase text-emerald-600 tracking-wider">
              Chương Trình Khuyến Mãi
            </span>
            <Badge variant="primary" size="sm">
              {promotions.length} Voucher
            </Badge>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
            Mã Giảm Giá Chỗ Nghỉ
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Tạo voucher giảm giá riêng để thu hút khách đặt phòng vào các ngày
            trong tuần hoặc mùa thấp điểm.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Dropdown chọn khách sạn */}
          {hotels.length > 0 && (
            <div className="relative flex-1 sm:w-64">
              <select
                value={selectedHotelId}
                onChange={(e) => {
                  setSelectedHotelId(e.target.value);
                  setSearchParams({ hotelId: e.target.value });
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

          <Button
            onClick={() => setIsModalOpen(true)}
            disabled={!selectedHotelId}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-6 h-12 rounded-2xl shadow-lg shadow-emerald-100 shrink-0"
            leftIcon={<Plus size={18} />}
          >
            Tạo Mã Voucher Mới
          </Button>
        </div>
      </div>

      {/* ─── DANH SÁCH MÃ GIẢM GIÁ (GRID VOUCHER) ─── */}
      {loading ? (
        <div className="py-24 flex justify-center bg-white rounded-3xl border border-slate-200/80 shadow-sm">
          <LoadingSpinner size="lg" label="Đang tải danh sách voucher..." />
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

            return (
              <div
                key={promo.id}
                className="bg-white rounded-3xl border-2 border-dashed border-slate-300 p-6 shadow-sm hover:shadow-xl hover:border-emerald-400 transition-all duration-300 flex flex-col justify-between space-y-4 group relative overflow-hidden"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <span className="bg-emerald-50 text-emerald-800 font-mono font-black text-lg px-4 py-1.5 rounded-xl border border-emerald-200 tracking-wider">
                        🏷️ {promo.code}
                      </span>
                    </div>

                    <PromotionBadge
                      type={isPercent ? "percentage" : "amount"}
                      value={Number(promo.value || promo.discount || 10)}
                      size="sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <p className="text-base font-extrabold text-slate-900">
                      Giảm ngay{" "}
                      <span className="text-emerald-600 font-black">
                        {discountDisplay}
                      </span>{" "}
                      cho mỗi đơn phòng
                    </p>
                    <p className="text-xs text-slate-500 font-medium">
                      Áp dụng cho đơn đặt phòng từ{" "}
                      <strong className="text-slate-800">
                        {formatVND(promo.min_spend || promo.minSpend || 0)}
                      </strong>
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium flex items-center gap-1.5">
                    <Clock size={13} /> Hạn dùng:{" "}
                    <strong className="text-slate-700">
                      {promo.end_date || promo.validUntil}
                    </strong>
                  </span>

                  <button
                    onClick={() => handleDeletePromo(promo.id, promo.code)}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title="Xóa voucher này"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={Ticket}
          title="Chưa có mã giảm giá nào"
          description="Tạo các mã khuyến mãi đặc biệt để kích cầu khách đặt phòng trong mùa thấp điểm."
          actionLabel="Tạo voucher đầu tiên"
          onAction={() => setIsModalOpen(true)}
        />
      )}

      {/* ─── MODAL TẠO MÃ GIẢM GIÁ ─── */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Tạo Mã Voucher Khuyến Mãi Mới"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreatePromo} className="space-y-5">
          <Input
            label="Mã Code Voucher (Viết hoa, không dấu) *"
            required
            placeholder="Ví dụ: SUMMER2024, HE50K..."
            value={promoForm.code}
            onChange={(e) =>
              setPromoForm({ ...promoForm, code: e.target.value.toUpperCase() })
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
                className="w-full h-11 bg-white border border-gray-300 rounded-xl px-4 text-sm font-semibold outline-none focus:border-emerald-500"
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
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl px-6"
            >
              Tạo Voucher Ngay
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default OwnerPromotionPage;
