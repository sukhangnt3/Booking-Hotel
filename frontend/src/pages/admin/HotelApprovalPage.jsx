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
  Percent,
  Ban,
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

export default function HotelApprovalPage() {
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [apiError, setApiError] = useState("");

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
      setSelectedHotel(null);
    } catch (err) {
      alert(`Lỗi cập nhật: ${err.response?.data?.message || err.message}`);
    }
  };

  const filteredHotels = hotels.filter((h) =>
    statusFilter === "all" ? true : h.status === statusFilter,
  );

  return (
    <div className="space-y-6 font-sans pb-16 text-slate-800">
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider mb-1">
            <ShieldCheck size={16} /> Phân Hệ Admin
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Xét Duyệt Hồ Sơ Doanh Nghiệp ({hotels.length})
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Dữ liệu đồng bộ trực tiếp từ bảng <code>public.hotel</code>
          </p>
        </div>

        <button
          onClick={fetchHotelsFromDB}
          className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw size={14} /> Làm mới
        </button>
      </div>

      {apiError && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl flex items-center gap-2 font-bold">
          <AlertCircle size={16} />
          <span>{apiError}</span>
        </div>
      )}

      {/* Tabs Filter */}
      <div className="bg-white p-4 rounded-3xl border shadow-xs flex items-center gap-2 overflow-x-auto no-scrollbar">
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
                  ? "bg-slate-900 text-white shadow-md"
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

      {/* Grid Khách sạn */}
      {loading ? (
        <div className="py-24 flex justify-center bg-white rounded-3xl border">
          <LoadingSpinner size="lg" label="Đang truy vấn bảng hotel..." />
        </div>
      ) : filteredHotels.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredHotels.map((h) => {
            // Lấy ảnh thumbnail từ relation hoặc fallback
            const coverImage =
              h.images?.find((img) => img.is_thumbnail)?.path ||
              h.images?.[0]?.path ||
              h.thumbnail ||
              "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600";

            return (
              <div
                key={h.id}
                className="bg-white rounded-3xl border overflow-hidden shadow-xs hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="relative h-44 w-full bg-slate-100">
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
                      {h.status}
                    </span>
                  </div>

                  <div className="p-5 space-y-2">
                    <h3 className="text-base font-black text-slate-900 line-clamp-1">
                      {h.name}
                    </h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1 line-clamp-1">
                      <MapPin size={13} className="text-blue-600 shrink-0" />{" "}
                      {h.address}, {h.city}
                    </p>
                    <div className="text-xs text-slate-600 flex justify-between pt-1 border-t">
                      <span>Hoa hồng hệ thống:</span>
                      <span className="font-bold text-blue-700">
                        {h.commission_rate ?? 18}%
                      </span>
                    </div>
                    {h.status === "rejected" && h.rejection_reason && (
                      <div className="p-2.5 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-xs mt-2">
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
                      className="py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs disabled:opacity-30 cursor-pointer flex items-center justify-center gap-1"
                    >
                      <CheckCircle2 size={14} /> Duyệt
                    </button>
                    <button
                      onClick={() => {
                        const reason = window.prompt(
                          "Nhập lý do từ chối/yêu cầu bổ sung:",
                          "Thiếu giấy phép kinh doanh hợp lệ",
                        );
                        if (reason)
                          handleUpdateStatus(h.id, "rejected", reason);
                      }}
                      disabled={h.status === "rejected"}
                      className="py-2 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold disabled:opacity-30 cursor-pointer flex items-center justify-center gap-1"
                    >
                      <XCircle size={14} /> Từ chối
                    </button>
                  </div>
                  <button
                    onClick={() => setSelectedHotel(h)}
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer flex items-center justify-center gap-1"
                  >
                    <Eye size={13} /> Xem Pháp Lý & Hồ Sơ
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
          description="Hiện không có đối tác lưu trú nào trong danh mục này."
        />
      )}

      {/* Modal chi tiết pháp lý */}
      {selectedHotel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border space-y-4 text-xs">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-black text-base text-slate-900">
                {selectedHotel.name}
              </h3>
              <button onClick={() => setSelectedHotel(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="space-y-2.5 bg-slate-50 p-4 rounded-2xl">
              <div>
                <b>Địa chỉ:</b> {selectedHotel.address}, {selectedHotel.city}
              </div>
              <div>
                <b>Điện thoại:</b> {selectedHotel.phone || "---"} |{" "}
                <b>Email:</b> {selectedHotel.email || "---"}
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                <div>
                  <b>Mã số thuế:</b> {selectedHotel.tax_code || "Chưa cập nhật"}
                </div>
                <div>
                  <b>Mức hoa hồng:</b> {selectedHotel.commission_rate}%
                </div>
                <div>
                  <b>Ngân hàng:</b> {selectedHotel.bank_name || "---"}
                </div>
                <div>
                  <b>Số tài khoản:</b> {selectedHotel.bank_account || "---"}
                </div>
              </div>
              <div className="pt-2 border-t">
                <b>Giấy phép kinh doanh:</b>
                {selectedHotel.business_license_url ? (
                  <a
                    href={selectedHotel.business_license_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 block underline mt-1 flex items-center gap-1"
                  >
                    <FileText size={14} /> Xem tệp tài liệu đính kèm
                  </a>
                ) : (
                  <span className="text-slate-400 block mt-1">
                    Chưa tải lên
                  </span>
                )}
              </div>
            </div>
            <div className="flex justify-between items-center pt-2">
              {selectedHotel.status === "active" && (
                <button
                  onClick={() =>
                    handleUpdateStatus(
                      selectedHotel.id,
                      "suspended",
                      "Vi phạm chính sách vận hành",
                    )
                  }
                  className="px-3 py-2 bg-slate-800 text-white rounded-xl font-bold flex items-center gap-1"
                >
                  <Ban size={14} /> Đình chỉ kinh doanh
                </button>
              )}
              <div className="flex gap-2 ml-auto">
                <button
                  onClick={() => setSelectedHotel(null)}
                  className="px-4 py-2 border rounded-xl font-bold"
                >
                  Đóng
                </button>
                <button
                  onClick={() => handleUpdateStatus(selectedHotel.id, "active")}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold"
                >
                  Xác nhận duyệt
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
