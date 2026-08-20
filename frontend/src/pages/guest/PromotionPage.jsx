import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Ticket,
  Sparkles,
  Copy,
  Check,
  Clock,
  CalendarDays,
  Percent,
  Tag,
  ArrowRight,
  Flame,
} from "lucide-react";

// Components
import { Button, Badge } from "@/components/ui";
import { Breadcrumb, LoadingSpinner, EmptyState } from "@/components/common";
import { PromotionBadge } from "@/components/promotion";
import { promotionService } from "@/services";

const PromotionPage = () => {
  const navigate = useNavigate();
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");
  const [copiedCode, setCopiedCode] = useState(null);

  // ─── 1. FETCH DANH SÁCH PROMOTIONS ───
  useEffect(() => {
    const fetchDeals = async () => {
      setLoading(true);
      try {
        const data = await promotionService.getGlobalDeals();
        setPromotions(Array.isArray(data) ? data : data?.data || []);
      } catch (err) {
        console.error("Lỗi lấy danh sách khuyến mãi:", err);
        // Fallback data mẫu chất lượng cao nếu Backend chưa có API
        setPromotions([
          {
            id: 1,
            code: "GOSTAY2024",
            title: "Chào hè rực rỡ - Giảm 15% toàn sàn",
            description:
              "Áp dụng cho tất cả khách sạn tại Đà Nẵng, Nha Trang và Phú Quốc.",
            discountType: "percentage",
            discountValue: 15,
            minSpend: 1500000,
            expiryDate: "30/08/2024",
            category: "summer",
            isHot: true,
          },
          {
            id: 2,
            code: "LUXURY500K",
            title: "Ưu đãi Resort cao cấp 5 sao",
            description:
              "Giảm ngay 500.000đ cho đơn đặt phòng từ 2 đêm tại các khu nghỉ dưỡng cao cấp.",
            discountType: "amount",
            discountValue: 500000,
            minSpend: 4000000,
            expiryDate: "15/09/2024",
            category: "luxury",
            isHot: true,
          },
          {
            id: 3,
            code: "WELCOME50",
            title: "Khách hàng mới - Giảm 50k",
            description:
              "Áp dụng cho lần đầu tiên đặt phòng trên hệ thống GoStay.",
            discountType: "amount",
            discountValue: 50000,
            minSpend: 500000,
            expiryDate: "31/12/2024",
            category: "newbie",
          },
          {
            id: 4,
            code: "WEEKEND20",
            title: "Cuối tuần thảnh thơi - Giảm 20%",
            description:
              "Ưu đãi đặc quyền cho các kỳ nghỉ nhận phòng vào Thứ 6 hoặc Thứ 7.",
            discountType: "percentage",
            discountValue: 20,
            minSpend: 2000000,
            expiryDate: "20/10/2024",
            category: "summer",
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchDeals();
  }, []);

  // ─── 2. HÀM SAO CHÉP MÃ KHUYẾN MÃI ───
  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500); // Trả lại icon sau 2.5s
  };

  const categories = [
    { id: "all", label: "Tất cả ưu đãi" },
    { id: "summer", label: "Ưu đãi mùa hè" },
    { id: "luxury", label: "Resort sang trọng" },
    { id: "newbie", label: "Khách hàng mới" },
  ];

  const filteredPromos =
    activeCategory === "all"
      ? promotions
      : promotions.filter((p) => p.category === activeCategory);

  const formatVND = (num) => Number(num || 0).toLocaleString("vi-VN") + " ₫";

  const breadcrumbs = [
    { label: "Trang chủ", link: "/" },
    { label: "Khuyến mãi & Mã giảm giá" },
  ];

  return (
    <div className="bg-gray-50/60 min-h-screen pb-24 font-sans">
      <div className="max-w-7xl mx-auto px-4 pt-4">
        <Breadcrumb items={breadcrumbs} />

        {/* ─── HERO BANNER KHUYẾN MÃI ─── */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-[#003580] rounded-3xl p-8 md:p-12 text-white mt-4 mb-10 shadow-xl relative overflow-hidden">
          <div className="max-w-2xl space-y-4 relative z-10">
            <div className="inline-flex items-center gap-2 bg-yellow-400/20 text-yellow-300 px-3.5 py-1 rounded-full text-xs font-bold border border-yellow-400/30">
              <Sparkles size={14} /> GoStay Deals & Rewards
            </div>

            <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
              Mã giảm giá & Ưu đãi đặc quyền
            </h1>

            <p className="text-sm md:text-base text-blue-100/90 leading-relaxed font-normal">
              Thu thập mã ưu đãi để tiết kiệm tối đa cho kỳ nghỉ sắp tới của
              bạn. Giảm giá trực tiếp khi thanh toán!
            </p>
          </div>

          {/* Trang trí nền */}
          <div className="absolute -right-16 -bottom-16 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        </div>

        {/* ─── CATEGORY TABS ─── */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 mb-8">
          {categories.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id)}
              className={`px-5 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                activeCategory === tab.id
                  ? "bg-[#003580] text-white shadow-md shadow-blue-900/20"
                  : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ─── DANH SÁCH MÃ GIẢM GIÁ (COUPON GRID) ─── */}
        {loading ? (
          <div className="py-20 flex justify-center bg-white rounded-3xl border border-gray-200">
            <LoadingSpinner size="lg" label="Đang tải các ưu đãi mới nhất..." />
          </div>
        ) : filteredPromos.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredPromos.map((promo) => {
              const isCopied = copiedCode === promo.code;

              return (
                <div
                  key={promo.id}
                  className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm hover:shadow-xl hover:border-blue-300 transition-all duration-300 flex flex-col justify-between relative overflow-hidden group"
                >
                  {/* Tag Hot nếu có */}
                  {promo.isHot && (
                    <div className="absolute top-0 right-0 bg-rose-500 text-white text-[10px] font-black uppercase px-3 py-1 rounded-bl-xl flex items-center gap-1 shadow-sm">
                      <Flame size={12} /> Hot Deal
                    </div>
                  )}

                  <div className="space-y-4">
                    {/* Header Coupon */}
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 bg-blue-50 text-[#006ce4] rounded-2xl flex items-center justify-center shrink-0 shadow-inner">
                        <Ticket size={28} />
                      </div>

                      <div className="space-y-1 flex-1 pr-12">
                        <div className="flex items-center gap-2">
                          <PromotionBadge
                            type={promo.discountType}
                            value={promo.discountValue}
                            size="sm"
                          />
                        </div>
                        <h3 className="font-black text-gray-900 text-lg group-hover:text-[#006ce4] transition-colors leading-snug">
                          {promo.title}
                        </h3>
                      </div>
                    </div>

                    <p className="text-xs text-gray-600 leading-relaxed font-medium">
                      {promo.description}
                    </p>

                    {/* Điều kiện chi tiết */}
                    <div className="bg-gray-50/80 p-3.5 rounded-2xl border border-dashed border-gray-200 text-xs text-gray-500 space-y-1.5 font-medium">
                      <div className="flex justify-between">
                        <span>Đơn tối thiểu:</span>
                        <strong className="text-gray-800">
                          {formatVND(promo.minSpend)}
                        </strong>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-1">
                          <Clock size={12} /> Hạn sử dụng:
                        </span>
                        <strong className="text-rose-600">
                          {promo.expiryDate}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* VÙNG SAO CHÉP MÃ & DÙNG NGAY */}
                  <div className="pt-6 mt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                    {/* Hộp Code */}
                    <div className="flex items-center bg-gray-100 px-4 py-2 rounded-xl border border-gray-200 w-full sm:w-auto justify-between gap-3">
                      <span className="font-mono font-black text-sm text-blue-900 tracking-wider">
                        {promo.code}
                      </span>

                      <button
                        onClick={() => handleCopyCode(promo.code)}
                        className={`text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                          isCopied
                            ? "text-emerald-600"
                            : "text-gray-500 hover:text-gray-900"
                        }`}
                        title="Sao chép mã"
                      >
                        {isCopied ? (
                          <>
                            <Check size={14} className="text-emerald-600" /> Đã
                            chép
                          </>
                        ) : (
                          <>
                            <Copy size={14} /> Chép mã
                          </>
                        )}
                      </button>
                    </div>

                    {/* Nút Sử dụng ngay */}
                    <Button
                      onClick={() => navigate(`/hotels?promo=${promo.code}`)}
                      className="w-full sm:w-auto h-10 px-6 text-xs font-black rounded-xl bg-[#006ce4] shadow-md shadow-blue-100"
                      rightIcon={<ArrowRight size={14} />}
                    >
                      Dùng ngay
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="Chưa có khuyến mãi nào trong danh mục này"
            description="Hãy chọn danh mục khác hoặc quay lại sau để cập nhật các ưu đãi mới nhất."
            actionLabel="Xem tất cả ưu đãi"
            onAction={() => setActiveCategory("all")}
          />
        )}
      </div>
    </div>
  );
};

export default PromotionPage;
