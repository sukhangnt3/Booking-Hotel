// src/pages/owner/HotelManagementPage.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Building2,
  MapPin,
  CheckCircle2,
  Clock,
  XCircle,
  Star,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Trash2,
  BedDouble,
  Sparkles,
} from "lucide-react";
import { LoadingSpinner, EmptyState } from "@/components/common";
import { useAuthStore } from "@/stores/authStore";

export default function HotelManagementPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

  const userEmail = String(user?.email || "")
    .toLowerCase()
    .trim();

  // 1. Tải toàn bộ danh sách khách sạn thuộc sở hữu của tài khoản này
  const fetchMyHotels = () => {
    setLoading(true);
    try {
      const localApps = JSON.parse(
        localStorage.getItem("pending_partner_applications") || "[]",
      );
      const approvedIds = JSON.parse(
        localStorage.getItem("approved_hotel_ids") || "[]",
      ).map(String);
      const rejectedIds = JSON.parse(
        localStorage.getItem("rejected_hotel_ids") || "[]",
      ).map(String);

      // Lọc các khách sạn khớp với Email của Owner
      const myOwnedHotels = localApps
        .filter((h) => {
          const hEmail = String(h.emailContact || h.email || "")
            .toLowerCase()
            .trim();
          return !userEmail || hEmail === userEmail || user?.role === "admin";
        })
        .map((h, idx) => {
          const id = String(h.id || h.applicationId || `HT-${idx + 1}`).trim();
          let status = "pending";

          if (rejectedIds.includes(id) || h.status === "rejected") {
            status = "rejected";
          } else if (approvedIds.includes(id) || h.status === "approved") {
            status = "approved";
          }

          return {
            ...h,
            id,
            name: h.name || h.hotelNameVi || "Cơ sở lưu trú của tôi",
            city: h.city || h.province || "Việt Nam",
            address: h.address || h.streetAddress || "Địa chỉ chỗ nghỉ",
            status,
            starRating: h.starRating || 5,
            type: h.hotelType || h.type || "Khách sạn",
            image:
              h.image ||
              "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600",
            totalRooms: h.rooms?.length || 1,
          };
        });

      setHotels(myOwnedHotels);
    } catch (err) {
      console.error(err);
      setHotels([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyHotels();
  }, [user]);

  const handleDeleteHotel = (hotel) => {
    if (!window.confirm(`Xác nhận xóa cơ sở "${hotel.name}"?`)) return;

    const localApps = JSON.parse(
      localStorage.getItem("pending_partner_applications") || "[]",
    );
    const updated = localApps.filter(
      (h) => String(h.id || h.applicationId) !== String(hotel.id),
    );
    localStorage.setItem(
      "pending_partner_applications",
      JSON.stringify(updated),
    );

    fetchMyHotels();
  };

  const filteredHotels = hotels.filter((h) => {
    if (statusFilter === "all") return true;
    return h.status === statusFilter;
  });

  return (
    <div className="space-y-6 font-sans pb-16 text-slate-800">
      {/* ── HEADER & NÚT ĐĂNG KÝ THÊM CƠ SỞ MỚI ── */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider mb-1">
            <Building2 size={16} /> Chuỗi Cơ Sở Lưu Trú Của Bạn
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Quản Lý Danh Sách Chỗ Nghỉ ({hotels.length} Cơ sở)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Chủ cơ sở:{" "}
            <strong className="text-blue-900">
              {user?.full_name || user?.email}
            </strong>
          </p>
        </div>

        {/* 🚀 NÚT BẤM ĐĂNG KÝ THÊM CƠ SỞ MỚI DÀNH CHO OWNER */}
        <button
          onClick={() => navigate("/register-owner")}
          className="px-5 py-3 bg-[#003580] hover:bg-blue-900 text-white font-bold text-xs rounded-2xl shadow-md transition flex items-center gap-2 cursor-pointer active:scale-95 shrink-0"
        >
          <Plus size={16} /> + Đăng Ký Thêm Cơ Sở Mới
        </button>
      </div>

      {/* ── THÔNG BÁO HƯỚNG DẪN ── */}
      <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl flex items-start gap-3 text-xs text-blue-900">
        <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-bold">Đăng ký chuỗi cơ sở độc lập:</p>
          <p className="text-blue-800 text-[11px] leading-relaxed">
            Bạn có thể đăng ký không giới hạn số lượng khách sạn, resort,
            homestay. Mỗi cơ sở sau khi nộp sẽ được Admin thẩm định riêng biệt
            và tự động xuất hiện trong menu quản lý của bạn.
          </p>
        </div>
      </div>

      {/* ── TABS TRẠNG THÁI ── */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto text-xs font-bold">
        {[
          { id: "all", label: `Tất cả cơ sở (${hotels.length})` },
          { id: "approved", label: "Đang mở bán" },
          { id: "pending", label: "Chờ Admin duyệt" },
          { id: "rejected", label: "Bị từ chối" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={`px-4 py-2 rounded-xl transition cursor-pointer ${
              statusFilter === tab.id
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── DANH SÁCH CÁC KHÁCH SẠN CỦA OWNER ── */}
      {loading ? (
        <div className="py-24 flex justify-center bg-white rounded-3xl border">
          <LoadingSpinner
            size="lg"
            label="Đang tải danh sách chỗ nghỉ của bạn..."
          />
        </div>
      ) : filteredHotels.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredHotels.map((hotel) => {
            const isApproved = hotel.status === "approved";
            const isPending = hotel.status === "pending";

            return (
              <div
                key={hotel.id}
                className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xs hover:shadow-lg transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="relative h-48 w-full bg-slate-100 overflow-hidden">
                    <img
                      src={hotel.image}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 right-3">
                      {isApproved ? (
                        <span className="bg-emerald-600 text-white font-bold text-[11px] px-3 py-1 rounded-full shadow flex items-center gap-1.5">
                          <CheckCircle2 size={13} /> Đang Mở Bán
                        </span>
                      ) : isPending ? (
                        <span className="bg-amber-500 text-white font-bold text-[11px] px-3 py-1 rounded-full shadow flex items-center gap-1.5 animate-pulse">
                          <Clock size={13} /> Chờ Admin Thẩm Định
                        </span>
                      ) : (
                        <span className="bg-rose-600 text-white font-bold text-[11px] px-3 py-1 rounded-full shadow flex items-center gap-1.5">
                          <XCircle size={13} /> Bị Từ Chối
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-6 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md">
                        {hotel.type} • ⭐ {hotel.starRating} Sao
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        #{hotel.id}
                      </span>
                    </div>

                    <h3 className="font-extrabold text-slate-900 text-lg leading-snug">
                      {hotel.name}
                    </h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <MapPin size={13} className="text-blue-600 shrink-0" />{" "}
                      {hotel.address}, {hotel.city}
                    </p>

                    {isPending && (
                      <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                        <AlertCircle
                          size={15}
                          className="shrink-0 text-amber-600"
                        />
                        <span>
                          Cơ sở này đang được Ban Quản Trị thẩm định trong 24h.
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-6 pt-0 border-t border-slate-100 mt-2 flex items-center justify-between pt-3">
                  <button
                    onClick={() => handleDeleteHotel(hotel)}
                    className="text-xs text-rose-600 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 size={13} /> Xóa cơ sở
                  </button>

                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate(`/hotel/${hotel.id}`)}
                      className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1"
                    >
                      Xem trang web <ExternalLink size={12} />
                    </button>

                    {isApproved ? (
                      <button
                        onClick={() =>
                          navigate(`/owner/bookings?hotelId=${hotel.id}`)
                        }
                        className="px-4 py-2 bg-[#003580] hover:bg-blue-900 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                      >
                        Quản lý đơn phòng
                      </button>
                    ) : (
                      <button
                        disabled
                        className="px-4 py-2 bg-slate-100 text-slate-400 rounded-xl text-xs font-bold cursor-not-allowed"
                      >
                        Chờ duyệt mở bán
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={Building2}
          title="Chưa có cơ sở lưu trú nào"
          description="Bấm nút '+ Đăng Ký Thêm Cơ Sở Mới' để đăng ký khách sạn đầu tiên của bạn."
          actionLabel="+ Đăng ký cơ sở ngay"
          onAction={() => navigate("/register-owner")}
        />
      )}
    </div>
  );
}
