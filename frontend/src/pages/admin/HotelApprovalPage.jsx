// src/pages/admin/HotelApprovalPage.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
  Building2,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Eye,
  MapPin,
  AlertCircle,
  RefreshCw,
  X,
  FileText,
  Ban,
  Star,
  Clock,
  Bed,
  Users,
  Image as ImageIcon,
  Phone,
  Mail,
  User,
  CreditCard,
  Sparkles,
  Check,
  ExternalLink,
} from "lucide-react";
import { LoadingSpinner, EmptyState } from "@/components/common";
import apiClient from "@/services/apiClient";

// Đồng bộ 100% với PostgreSQL: public.hotel_status_enum
const STATUS_TABS = [
  { id: "pending", label: "Chờ phê duyệt" },
  { id: "active", label: "Đang mở bán" },
  { id: "rejected", label: "Đã từ chối" },
  { id: "suspended", label: "Tạm đình chỉ" },
  { id: "all", label: "Tất cả hồ sơ" },
];

const AMENITY_MAP = {
  wifi: "Wi-Fi miễn phí",
  parking: "Bãi đỗ xe ô tô",
  "24h_front_desk": "Lễ tân 24/7",
  pool_outdoor: "Hồ bơi ngoài trời",
  pool_indoor: "Hồ bơi trong nhà",
  restaurant: "Nhà hàng & Ẩm thực",
  bar: "Quầy Bar / Lounge",
  private_beach: "Bãi biển riêng",
  spa: "Dịch vụ Spa & Massage",
  gym: "Phòng tập thể dục (Gym)",
  elevator: "Thang máy",
  air_conditioner: "Điều hòa máy lạnh",
  tv_smart: "Smart TV",
  hot_water: "Bình nóng lạnh",
  hair_dryer: "Máy sấy tóc",
  refrigerator: "Tủ lạnh / Minibar",
  bathtub: "Bồn tắm nằm",
  balcony: "Ban công / Sân hiên",
  toiletries: "Đồ vệ sinh cá nhân",
};

export default function HotelApprovalPage() {
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [apiError, setApiError] = useState("");

  // Modal chi tiết chuyên sâu
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState("overview"); // "overview" | "rooms" | "photos" | "policy"

  const formatVND = (price) =>
    Number(price || 0).toLocaleString("vi-VN") + " ₫";

  // Lấy danh sách tổng quát từ backend
  const fetchHotelsFromDB = useCallback(async () => {
    setLoading(true);
    setApiError("");
    try {
      const res = await apiClient.get("/admin/hotels");
      const list = Array.isArray(res) ? res : res?.hotels || res?.data || [];
      setHotels(list);
    } catch (err) {
      console.error("Lỗi lấy danh sách khách sạn:", err);
      setApiError(
        err.response?.data?.message ||
          err.message ||
          "Không thể tải dữ liệu từ CSDL",
      );
      setHotels([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHotelsFromDB();
  }, [fetchHotelsFromDB]);

  // Khi click xem chi tiết -> Gọi API lấy trọn vẹn Rooms, Images, Amenities
  const handleOpenDetailModal = async (hotel) => {
    setSelectedHotel(hotel);
    setActiveModalTab("overview");
    setDetailLoading(true);

    try {
      const res = await apiClient.get(`/hotels/${hotel.id}`);
      const fullData =
        res?.data?.hotel || res?.data?.data || res?.data || res?.hotel || hotel;
      setSelectedHotel(fullData);
    } catch (err) {
      console.warn("Không tải được chi tiết phụ, dùng dữ liệu hiện tại:", err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleUpdateStatus = async (hotelId, newStatus, reason = "") => {
    try {
      await apiClient.patch(`/admin/hotels/${hotelId}/status`, {
        status: newStatus,
        rejection_reason: reason,
      });

      setHotels((prev) =>
        prev.map((h) =>
          h.id === hotelId
            ? { ...h, status: newStatus, rejection_reason: reason }
            : h,
        ),
      );

      if (selectedHotel && selectedHotel.id === hotelId) {
        setSelectedHotel((prev) => ({
          ...prev,
          status: newStatus,
          rejection_reason: reason,
        }));
      }

      alert(`Đã cập nhật trạng thái hồ sơ sang: ${newStatus.toUpperCase()}`);
    } catch (err) {
      alert(`Lỗi cập nhật: ${err.response?.data?.message || err.message}`);
    }
  };

  const filteredHotels = hotels.filter((h) =>
    statusFilter === "all" ? true : h.status === statusFilter,
  );

  return (
    <div className="space-y-6 font-sans pb-16 text-slate-800">
      {/* HEADER QUẢN TRỊ */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#003580] font-black text-xs uppercase tracking-wider mb-1">
            <ShieldCheck size={16} className="text-[#006ce4]" /> Phân Hệ Quản
            Trị Hệ Thống
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Xét Duyệt Hồ Sơ Cơ Sở Lưu Trú ({hotels.length})
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Thẩm định tính hợp pháp, hạng phòng, bảng giá và hình ảnh trước khi
            mở bán công khai
          </p>
        </div>

        <button
          onClick={fetchHotelsFromDB}
          className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-[#003580] font-black text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
        >
          <RefreshCw size={14} /> Làm mới dữ liệu
        </button>
      </div>

      {apiError && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl flex items-center gap-2 font-bold">
          <AlertCircle size={16} />
          <span>{apiError}</span>
        </div>
      )}

      {/* TABS LỌC TRẠNG THÁI */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs flex items-center gap-2 overflow-x-auto no-scrollbar">
        {STATUS_TABS.map((tab) => {
          const count = hotels.filter((h) =>
            tab.id === "all" ? true : h.status === tab.id,
          ).length;
          return (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-5 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-2 ${
                statusFilter === tab.id
                  ? "bg-[#003580] text-white shadow-md"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                  statusFilter === tab.id
                    ? "bg-white/20 text-white"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* LƯỚI KHÁCH SẠN */}
      {loading ? (
        <div className="py-24 flex justify-center bg-white rounded-3xl border border-slate-200">
          <LoadingSpinner
            size="lg"
            label="Đang truy vấn dữ liệu hồ sơ đối tác..."
          />
        </div>
      ) : filteredHotels.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredHotels.map((h) => {
            const coverImage =
              h.images?.find((img) => img.is_thumbnail)?.path ||
              h.images?.[0]?.path ||
              h.image ||
              h.thumbnail ||
              "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600";

            return (
              <div
                key={h.id}
                className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="relative h-48 w-full bg-slate-100">
                    <img
                      src={coverImage}
                      alt={h.name}
                      className="w-full h-full object-cover"
                    />
                    <span
                      className={`absolute top-3 right-3 text-[10px] font-black uppercase px-2.5 py-1 rounded-full shadow text-white ${
                        h.status === "active"
                          ? "bg-emerald-600"
                          : h.status === "rejected"
                            ? "bg-rose-600"
                            : h.status === "suspended"
                              ? "bg-slate-700"
                              : "bg-amber-500 animate-pulse"
                      }`}
                    >
                      {h.status === "pending"
                        ? "Chờ duyệt"
                        : h.status === "active"
                          ? "Đang mở bán"
                          : h.status === "rejected"
                            ? "Từ chối"
                            : "Đình chỉ"}
                    </span>

                    <span className="absolute bottom-3 left-3 text-[10px] font-black uppercase bg-black/60 text-white px-2.5 py-1 rounded-md backdrop-blur-xs">
                      {h.property_type || "Khách sạn"}
                    </span>
                  </div>

                  <div className="p-5 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-base font-black text-slate-900 line-clamp-1">
                        {h.name}
                      </h3>
                      <div className="flex text-amber-400 shrink-0">
                        {[...Array(Number(h.star_rating || 3))].map((_, i) => (
                          <Star key={i} size={13} fill="currentColor" />
                        ))}
                      </div>
                    </div>

                    <p className="text-xs text-slate-500 flex items-center gap-1.5 line-clamp-1 font-medium">
                      <MapPin size={13} className="text-[#006ce4] shrink-0" />{" "}
                      {h.address ? `${h.address}, ` : ""}
                      {h.city || "Việt Nam"}
                    </p>

                    <div className="text-xs text-slate-600 flex justify-between pt-2 border-t border-slate-100">
                      <span>Hoa hồng sàn:</span>
                      <span className="font-bold text-[#003580]">
                        {h.commission_rate ?? 18}%
                      </span>
                    </div>

                    {h.status === "rejected" && h.rejection_reason && (
                      <div className="p-2.5 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-xs mt-2 font-medium">
                        <b>Lý do từ chối:</b> {h.rejection_reason}
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-5 pt-0 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleUpdateStatus(h.id, "active")}
                      disabled={h.status === "active"}
                      className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs disabled:opacity-30 cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <CheckCircle2 size={15} /> Duyệt mở bán
                    </button>
                    <button
                      onClick={() => {
                        const reason = window.prompt(
                          "Nhập lý do từ chối hồ sơ (thiếu GPKD, ảnh mờ, giá sai...):",
                          "Hồ sơ pháp lý hoặc hình ảnh chưa đạt tiêu chuẩn kiểm duyệt.",
                        );
                        if (reason)
                          handleUpdateStatus(h.id, "rejected", reason);
                      }}
                      disabled={h.status === "rejected"}
                      className="py-2.5 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-black disabled:opacity-30 cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <XCircle size={15} /> Từ chối
                    </button>
                  </div>
                  <button
                    onClick={() => handleOpenDetailModal(h)}
                    className="w-full py-2.5 bg-[#e8f2ff] hover:bg-blue-100 text-[#003580] font-black text-xs rounded-xl cursor-pointer flex items-center justify-center gap-1.5 transition"
                  >
                    <Eye size={15} className="text-[#006ce4]" /> Xem Chi Tiết
                    Toàn Bộ Hồ Sơ
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={Building2}
          title="Không có hồ sơ nào"
          description="Hiện không có cơ sở lưu trú nào trong danh mục lọc này."
        />
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          MODAL XEM CHI TIẾT TOÀN DIỆN (FULL AUDIT DETAIL INSPECTION)
      ════════════════════════════════════════════════════════════════════════ */}
      {selectedHotel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn font-sans">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[92vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden text-slate-800">
            {/* MODAL HEADER */}
            <div className="p-5 sm:p-6 bg-[#003580] text-white flex items-center justify-between shrink-0">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black uppercase bg-blue-500/40 text-white px-2.5 py-0.5 rounded-full">
                    {selectedHotel.property_type || "Hotel"}
                  </span>
                  <div className="flex text-amber-400">
                    {[...Array(Number(selectedHotel.star_rating || 3))].map(
                      (_, i) => (
                        <Star key={i} size={14} fill="currentColor" />
                      ),
                    )}
                  </div>
                  <span
                    className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                      selectedHotel.status === "active"
                        ? "bg-emerald-600 text-white"
                        : selectedHotel.status === "rejected"
                          ? "bg-rose-600 text-white"
                          : selectedHotel.status === "suspended"
                            ? "bg-slate-700 text-white"
                            : "bg-amber-400 text-slate-900"
                    }`}
                  >
                    {selectedHotel.status}
                  </span>
                </div>

                <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                  {selectedHotel.name}
                </h2>
                <p className="text-xs text-blue-100 flex items-center gap-1.5 font-medium">
                  <MapPin size={13} className="text-blue-300" />
                  {selectedHotel.address ? `${selectedHotel.address}, ` : ""}
                  {selectedHotel.city || "Việt Nam"}
                </p>
              </div>

              <button
                onClick={() => setSelectedHotel(null)}
                className="p-2 text-white/80 hover:text-white rounded-xl hover:bg-white/10 transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* TAB BAR BÊN TRONG MODAL */}
            <div className="px-6 bg-slate-50 border-b border-slate-200 flex gap-2 overflow-x-auto no-scrollbar shrink-0 text-xs font-black">
              {[
                {
                  id: "overview",
                  label: "Tổng quan & Pháp lý",
                  icon: FileText,
                },
                {
                  id: "rooms",
                  label: `Hạng phòng & Giá (${selectedHotel.rooms?.length || 0})`,
                  icon: Bed,
                },
                {
                  id: "photos",
                  label: `Hình ảnh (${selectedHotel.images?.length || (selectedHotel.image ? 1 : 0)})`,
                  icon: ImageIcon,
                },
                { id: "policy", label: "Quy định & Tiện nghi", icon: Clock },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeModalTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveModalTab(tab.id)}
                    className={`py-3.5 px-3 border-b-2 flex items-center gap-1.5 cursor-pointer transition whitespace-nowrap ${
                      isActive
                        ? "border-[#006ce4] text-[#003580]"
                        : "border-transparent text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    <Icon
                      size={14}
                      className={isActive ? "text-[#006ce4]" : ""}
                    />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* MODAL BODY */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {detailLoading ? (
                <div className="py-16 flex justify-center">
                  <LoadingSpinner label="Đang tải toàn bộ dữ liệu phòng và ảnh..." />
                </div>
              ) : (
                <>
                  {/* ── TAB 1: TỔNG QUAN & PHÁP LÝ ── */}
                  {activeModalTab === "overview" && (
                    <div className="space-y-4 animate-fadeIn">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* THÔNG TIN CHỦ CƠ SỞ */}
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                          <h4 className="font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5 text-xs">
                            <User size={15} className="text-[#006ce4]" /> Người
                            đại diện / Host
                          </h4>
                          <div className="space-y-1 text-slate-600">
                            <p>
                              <b>Họ tên:</b>{" "}
                              {selectedHotel.owner_name ||
                                selectedHotel.signer_name ||
                                "Chưa cập nhật"}
                            </p>
                            <p>
                              <b>Số điện thoại:</b>{" "}
                              {selectedHotel.phone ||
                                selectedHotel.owner_phone ||
                                "---"}
                            </p>
                            <p>
                              <b>Email liên hệ:</b>{" "}
                              {selectedHotel.email ||
                                selectedHotel.owner_email ||
                                "---"}
                            </p>
                          </div>
                        </div>

                        {/* TÀI KHOẢN NGÂN HÀNG QUYẾT TOÁN */}
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                          <h4 className="font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5 text-xs">
                            <CreditCard size={15} className="text-[#006ce4]" />{" "}
                            Tài khoản thụ hưởng Napas
                          </h4>
                          <div className="space-y-1 text-slate-600">
                            <p>
                              <b>Ngân hàng:</b>{" "}
                              {selectedHotel.bank_name || "---"}
                            </p>
                            <p className="font-mono">
                              <b>Số tài khoản:</b>{" "}
                              {selectedHotel.bank_account || "---"}
                            </p>
                            <p className="font-bold uppercase">
                              <b>Chủ tài khoản:</b>{" "}
                              {selectedHotel.bank_account_holder || "---"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* PHÁP LÝ & MÃ SỐ THUẾ */}
                      <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2.5">
                        <h4 className="font-black text-slate-900 uppercase tracking-wider text-xs flex items-center gap-1.5">
                          <ShieldCheck size={15} className="text-emerald-600" />{" "}
                          Hồ sơ pháp lý & Thuế
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <span className="text-slate-500 block">
                              Mã số thuế:
                            </span>
                            <span className="font-mono font-bold text-slate-900 text-sm">
                              {selectedHotel.tax_code || "Chưa cập nhật"}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">
                              Hoa hồng cam kết:
                            </span>
                            <span className="font-bold text-[#003580] text-sm">
                              {selectedHotel.commission_rate ?? 18}%
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">
                              Giấy phép đăng ký kinh doanh:
                            </span>
                            {selectedHotel.business_license_url ? (
                              <a
                                href={selectedHotel.business_license_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[#006ce4] font-bold underline inline-flex items-center gap-1 mt-0.5"
                              >
                                <ExternalLink size={13} /> Mở tệp chứng nhận
                                GPKD
                              </a>
                            ) : (
                              <span className="text-slate-400 italic">
                                Chưa tải tệp
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* MÔ TẢ CHỖ NGHỈ */}
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                        <span className="font-black text-slate-800 uppercase tracking-wider block">
                          Mô tả giới thiệu cơ sở lưu trú:
                        </span>
                        <p className="text-slate-600 leading-relaxed whitespace-pre-line">
                          {selectedHotel.description ||
                            "Chưa có mô tả chi tiết."}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* ── TAB 2: DANH MỤC HẠNG PHÒNG & GIÁ ── */}
                  {activeModalTab === "rooms" && (
                    <div className="space-y-4 animate-fadeIn">
                      {Array.isArray(selectedHotel.rooms) &&
                      selectedHotel.rooms.length > 0 ? (
                        <div className="space-y-3.5">
                          {selectedHotel.rooms.map((room, idx) => {
                            const roomAmenities = Array.isArray(room.amenities)
                              ? room.amenities
                              : [];

                            return (
                              <div
                                key={room.id || idx}
                                className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-[#006ce4] transition shadow-xs flex flex-col sm:flex-row justify-between gap-4"
                              >
                                <div className="space-y-2 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="w-5 h-5 rounded bg-[#003580] text-white text-[11px] font-black flex items-center justify-center">
                                      {idx + 1}
                                    </span>
                                    <h4 className="text-sm font-black text-slate-900">
                                      {room.name || "Phòng nghỉ"}
                                    </h4>
                                    <span className="text-[10px] font-bold uppercase bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                                      {room.type || "Deluxe"}
                                    </span>
                                    {room.room_view && (
                                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                                        {room.room_view}
                                      </span>
                                    )}
                                  </div>

                                  <div className="text-slate-600 space-y-1">
                                    <p>
                                      🛏️ {room.bed_type || "1 Giường đôi lớn"}
                                    </p>
                                    <p>
                                      📐 Diện tích: {room.room_area || 28} m² |
                                      👥 Tối đa: {room.capacity || 2} Khách
                                    </p>
                                    <p>
                                      🔢 Tổng số lượng phòng:{" "}
                                      <b>{room.amount || 4} phòng</b>
                                    </p>
                                  </div>

                                  {/* Tiện nghi phòng */}
                                  {roomAmenities.length > 0 && (
                                    <div className="pt-2 flex flex-wrap gap-1.5">
                                      {roomAmenities.map((am, aIdx) => (
                                        <span
                                          key={aIdx}
                                          className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-medium"
                                        >
                                          ✓ {AMENITY_MAP[am] || am}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                <div className="sm:text-right flex sm:flex-col justify-between items-end shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0">
                                  <div>
                                    <span className="text-slate-400 block text-[10px]">
                                      Giá niêm yết / đêm
                                    </span>
                                    <span className="text-base font-black text-[#ff6a00]">
                                      {formatVND(
                                        room.base_price ||
                                          room.sell_price ||
                                          650000,
                                      )}
                                    </span>
                                  </div>

                                  {room.image || room.thumbnail ? (
                                    <img
                                      src={room.image || room.thumbnail}
                                      alt=""
                                      className="w-20 h-14 object-cover rounded-xl border border-slate-200"
                                    />
                                  ) : null}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border">
                          Chưa có thông tin hạng phòng.
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── TAB 3: THƯ VIỆN HÌNH ẢNH ── */}
                  {activeModalTab === "photos" && (
                    <div className="space-y-4 animate-fadeIn">
                      {Array.isArray(selectedHotel.images) &&
                      selectedHotel.images.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                          {selectedHotel.images.map((img, i) => (
                            <div
                              key={img.id || i}
                              className="group relative h-36 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100"
                            >
                              <img
                                src={img.path || img.url}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                              {img.is_thumbnail && (
                                <span className="absolute top-2 left-2 bg-[#003580] text-white text-[9px] font-black px-2 py-0.5 rounded shadow">
                                  ★ Ảnh bìa
                                </span>
                              )}
                              {img.room_id && (
                                <span className="absolute bottom-2 left-2 bg-black/60 text-white text-[9px] font-medium px-2 py-0.5 rounded">
                                  Ảnh phòng
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : selectedHotel.image ? (
                        <div className="h-64 w-full rounded-2xl overflow-hidden border">
                          <img
                            src={selectedHotel.image}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border">
                          Chưa có hình ảnh nào được tải lên.
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── TAB 4: QUY ĐỊNH & TIỆN NGHI ── */}
                  {activeModalTab === "policy" && (
                    <div className="space-y-4 animate-fadeIn">
                      {/* GIỜ NHẬN TRẢ PHÒNG */}
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <span className="text-slate-500 block">
                            Nhận phòng (Check-in):
                          </span>
                          <strong className="text-sm font-black text-slate-900">
                            Từ{" "}
                            {String(
                              selectedHotel.checkin_time || "14:00",
                            ).slice(0, 5)}
                          </strong>
                        </div>
                        <div>
                          <span className="text-slate-500 block">
                            Trả phòng (Check-out):
                          </span>
                          <strong className="text-sm font-black text-slate-900">
                            Trước{" "}
                            {String(
                              selectedHotel.checkout_time || "12:00",
                            ).slice(0, 5)}
                          </strong>
                        </div>
                        <div>
                          <span className="text-slate-500 block">
                            Chính sách hủy phòng:
                          </span>
                          <strong className="text-sm font-black text-emerald-700">
                            {selectedHotel.cancellation_deadline_hours
                              ? `Miễn phí hủy trước ${selectedHotel.cancellation_deadline_hours} giờ`
                              : "Không hoàn tiền"}
                          </strong>
                        </div>
                      </div>

                      {/* TIỆN NGHI CHỖ NGHỈ */}
                      <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3">
                        <span className="font-black text-slate-900 uppercase tracking-wider block">
                          Tiện nghi & Dịch vụ cơ sở lưu trú:
                        </span>
                        {Array.isArray(selectedHotel.amenities) &&
                        selectedHotel.amenities.length > 0 ? (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {selectedHotel.amenities.map((am, i) => (
                              <div
                                key={i}
                                className="flex items-center gap-1.5 text-slate-700"
                              >
                                <Check
                                  size={14}
                                  className="text-emerald-600 shrink-0 stroke-[2.5]"
                                />
                                <span>{AMENITY_MAP[am] || am}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-slate-400 italic">
                            Chưa cập nhật danh mục tiện nghi.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* MODAL FOOTER - THANH HÀNH ĐỘNG CỦA ADMIN */}
            <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0">
              <div>
                {selectedHotel.status === "active" && (
                  <button
                    onClick={() => {
                      const reason = window.prompt(
                        "Nhập lý do đình chỉ hoạt động chỗ nghỉ:",
                        "Vi phạm chính sách thanh toán và cam kết dịch vụ.",
                      );
                      if (reason)
                        handleUpdateStatus(
                          selectedHotel.id,
                          "suspended",
                          reason,
                        );
                    }}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer text-xs"
                  >
                    <Ban size={14} /> Đình chỉ kinh doanh
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  onClick={() => setSelectedHotel(null)}
                  className="px-5 py-2.5 border border-slate-300 hover:bg-white text-slate-700 rounded-xl font-bold text-xs cursor-pointer"
                >
                  Đóng
                </button>

                <button
                  onClick={() => {
                    const reason = window.prompt(
                      "Nhập lý do từ chối phê duyệt hồ sơ:",
                      "Hồ sơ cần bổ sung giấy phép kinh doanh hoặc hình ảnh rõ ràng hơn.",
                    );
                    if (reason)
                      handleUpdateStatus(selectedHotel.id, "rejected", reason);
                  }}
                  disabled={selectedHotel.status === "rejected"}
                  className="px-5 py-2.5 border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl font-black text-xs cursor-pointer disabled:opacity-30 flex items-center gap-1.5"
                >
                  <XCircle size={14} /> Từ chối
                </button>

                <button
                  onClick={() => handleUpdateStatus(selectedHotel.id, "active")}
                  disabled={selectedHotel.status === "active"}
                  className="px-7 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs cursor-pointer shadow-lg disabled:opacity-30 flex items-center gap-1.5"
                >
                  <CheckCircle2 size={15} /> Duyệt mở bán ngay
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
