import React, { useState, useEffect } from "react";
import {
  Building2,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Eye,
  Clock,
  Phone,
  Mail,
  FileText,
  MapPin,
  BedDouble,
  CreditCard,
  Percent,
  ExternalLink,
} from "lucide-react";

// Components
import { Button, Badge, Modal } from "@/components/ui";
import { LoadingSpinner, EmptyState } from "@/components/common";

// Services
import apiClient from "@/services/apiClient";

const STATUS_TABS = [
  { id: "pending", label: "Chờ phê duyệt" },
  { id: "approved", label: "Đã duyệt & Đang bán" },
  { id: "rejected", label: "Đã từ chối" },
  { id: "all", label: "Tất cả hồ sơ" },
];

const HotelApprovalPage = () => {
  // ─── 1. STATES ───
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Modal xem chi tiết hồ sơ
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const formatVND = (amount) => {
    return new Intl.NumberFormat("vi-VN").format(amount || 0) + " ₫";
  };

  // ─── 2. FETCH DANH SÁCH HỒ SƠ TỪ API ───
  const fetchHotels = async () => {
    setLoading(true);
    try {
      const params = {
        status: statusFilter === "all" ? undefined : statusFilter,
      };

      let list = [];
      const res = await apiClient.get("/admin/hotels", { params });
      list = Array.isArray(res.data) ? res.data : res.data?.hotels || [];
      setHotels(list);
    } catch (err) {
      console.error("Lỗi tải danh sách duyệt khách sạn:", err);
      setHotels([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHotels();
  }, [statusFilter]);

  // ─── 3. THAO TÁC DUYỆT / TỪ CHỐI ───
  const handleApprove = async (hotelId, hotelName) => {
    setActionLoadingId(hotelId);
    try {
      await apiClient.patch(`/admin/hotels/${hotelId}/status`, {
        status: "approved",
      });

      showToast(`Đã duyệt khách sạn "${hotelName}" lên sàn!`);
      setSelectedHotel(null);
      fetchHotels(); // Tải lại danh sách
    } catch (err) {
      showToast(
        "Lỗi khi duyệt hồ sơ: " + (err.message || "Vui lòng thử lại"),
        "error",
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (hotelId, hotelName) => {
    const reason = window.prompt(
      `Nhập lý do từ chối hồ sơ "${hotelName}":`,
      "Giấy phép kinh doanh không hợp lệ hoặc thiếu thông tin phòng.",
    );
    if (!reason) return;

    setActionLoadingId(hotelId);
    try {
      await apiClient.patch(`/admin/hotels/${hotelId}/status`, {
        status: "rejected",
        reason,
      });

      showToast(`Đã từ chối hồ sơ "${hotelName}".`, "info");
      setSelectedHotel(null);
      fetchHotels();
    } catch (err) {
      showToast("Lỗi khi từ chối hồ sơ", "error");
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
            toast.type === "error"
              ? "bg-rose-600"
              : toast.type === "info"
                ? "bg-blue-600"
                : "bg-emerald-600"
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
              Kiểm Duyệt Đối Tác
            </span>
            <Badge variant="primary" size="sm">
              {hotels.length} Hồ sơ
            </Badge>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
            Phê Duyệt Chỗ Nghỉ Mới
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Kiểm tra thông tin pháp lý, chất lượng hình ảnh và phê duyệt đối tác
            mới đăng ký gia nhập sàn GoStay.
          </p>
        </div>
      </div>

      {/* ─── TABS LỌC TRẠNG THÁI ─── */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm flex items-center gap-2 overflow-x-auto no-scrollbar">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
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

      {/* ─── DANH SÁCH THẺ HỒ SƠ (GRID) ─── */}
      {loading ? (
        <div className="py-24 flex justify-center bg-white rounded-3xl border border-slate-200">
          <LoadingSpinner
            size="lg"
            label="Đang tải danh sách hồ sơ đối tác..."
          />
        </div>
      ) : hotels.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {hotels.map((h) => {
            const id = h.id || h.hotel_id || h._id;
            const isActing = actionLoadingId === id;
            const status = h.status || (h.is_approved ? "approved" : "pending");

            // Xử lý an toàn tên và ảnh
            const hotelName = h.hotelNameVi || h.name || "Chưa đặt tên";
            const image =
              h.image ||
              h.hotelImages?.[0]?.preview ||
              h.images?.[0]?.path ||
              h.images?.[0] ||
              "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500";

            return (
              <div
                key={id}
                className="bg-white rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col justify-between group space-y-4"
              >
                <div>
                  {/* Ảnh & Trạng thái */}
                  <div className="relative h-48 w-full overflow-hidden bg-slate-100">
                    <img
                      src={image}
                      alt={hotelName}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />

                    <div className="absolute top-3 right-3 z-10">
                      {status === "approved" ? (
                        <span className="inline-flex items-center gap-1.5 bg-emerald-500 text-white text-[10px] font-black uppercase px-3 py-1.5 rounded-full shadow-lg">
                          <CheckCircle2 size={13} /> Đã Duyệt
                        </span>
                      ) : status === "rejected" ? (
                        <span className="inline-flex items-center gap-1.5 bg-rose-500 text-white text-[10px] font-black uppercase px-3 py-1.5 rounded-full shadow-lg">
                          <XCircle size={13} /> Đã Từ Chối
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 bg-amber-500 text-white text-[10px] font-black uppercase px-3 py-1.5 rounded-full shadow-lg animate-pulse">
                          <Clock size={13} /> Chờ Admin Duyệt
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Thông tin hồ sơ */}
                  <div className="p-6 space-y-4">
                    <div>
                      <span className="text-[10px] font-black uppercase bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                        {h.hotelType || h.type || "Khách sạn"}
                      </span>
                      <h3 className="text-xl font-black text-slate-900 mt-1 leading-snug group-hover:text-blue-600 transition-colors">
                        {hotelName}
                      </h3>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                        <MapPin size={13} className="text-slate-400 shrink-0" />{" "}
                        {h.streetAddress || h.address},{" "}
                        {h.district && `${h.district}, `}
                        {h.province || h.city}
                      </p>
                    </div>

                    {/* Thông tin chủ sở hữu & pháp lý */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Người đại diện:</span>
                        <strong className="text-slate-800">
                          {h.signerName ||
                            h.owner_name ||
                            h.owner?.name ||
                            "Chưa rõ"}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Hotline / SĐT:</span>
                        <strong className="text-slate-800">
                          {h.phoneContact || h.signerPhone || h.phone || "N/A"}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">
                          Hoa hồng thỏa thuận:
                        </span>
                        <strong className="text-blue-600 font-black">
                          {h.commissionRate || 18}%
                        </strong>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-slate-200">
                        <span className="text-slate-500">Ngày gửi hồ sơ:</span>
                        <span className="font-mono text-slate-700 font-bold">
                          {h.created_at || h.createdAt
                            ? new Date(
                                h.created_at || h.createdAt,
                              ).toLocaleDateString("vi-VN")
                            : "Vừa xong"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* CÁC NÚT THAO TÁC */}
                <div className="p-6 pt-0 space-y-2">
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      size="sm"
                      isLoading={isActing}
                      onClick={() => handleApprove(id, hotelName)}
                      disabled={status === "approved"}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-2xl text-xs shadow-md shadow-emerald-100 disabled:opacity-40 cursor-pointer"
                      leftIcon={<CheckCircle2 size={16} />}
                    >
                      {status === "approved" ? "Đã Phê Duyệt" : "Chấp Thuận"}
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      isLoading={isActing}
                      onClick={() => handleReject(id, hotelName)}
                      disabled={status === "rejected"}
                      className="border-rose-200 text-rose-600 hover:bg-rose-50 rounded-2xl text-xs font-bold disabled:opacity-40 cursor-pointer"
                      leftIcon={<XCircle size={16} />}
                    >
                      Từ Chối
                    </Button>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedHotel(h)}
                    className="w-full text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl cursor-pointer"
                    leftIcon={<Eye size={14} />}
                  >
                    Xem Chi Tiết Đầy Đủ & Pháp Lý
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={Building2}
          title="Không có hồ sơ nào trong danh mục này"
          description="Hiện tại không có chỗ nghỉ nào đang chờ xử lý."
          actionLabel="Xem tất cả hồ sơ"
          onAction={() => setStatusFilter("all")}
        />
      )}

      {/* ─── MODAL XEM CHI TIẾT ĐẦY ĐỦ HỒ SƠ ─── */}
      {selectedHotel && (
        <Modal
          isOpen={Boolean(selectedHotel)}
          onClose={() => setSelectedHotel(null)}
          title={`Thẩm Định Hồ Sơ: ${selectedHotel.hotelNameVi || selectedHotel.name}`}
          maxWidth="max-w-3xl"
        >
          <div className="space-y-6 text-xs text-slate-700 max-h-[75vh] overflow-y-auto pr-1">
            {/* 1. HÌNH ẢNH */}
            <div>
              <p className="font-bold text-slate-400 uppercase mb-2">
                1. Bộ sưu tập hình ảnh (
                {selectedHotel.hotelImages?.length ||
                  selectedHotel.images?.length ||
                  1}{" "}
                ảnh)
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {(
                  selectedHotel.hotelImages ||
                  selectedHotel.images || [selectedHotel.image]
                ).map((img, i) => (
                  <img
                    key={i}
                    src={
                      typeof img === "object" ? img.preview || img.path : img
                    }
                    alt="Hotel Gallery"
                    className="w-full h-24 object-cover rounded-xl border border-slate-200"
                  />
                ))}
              </div>
            </div>

            {/* 2. DANH MỤC CÁC LOẠI PHÒNG */}
            {selectedHotel.rooms && selectedHotel.rooms.length > 0 && (
              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-2">
                <p className="font-bold text-slate-700 uppercase flex items-center gap-1.5">
                  <BedDouble size={15} className="text-blue-600" /> Danh mục{" "}
                  {selectedHotel.rooms.length} loại phòng niêm yết:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedHotel.rooms.map((room, idx) => (
                    <div
                      key={room.id || idx}
                      className="p-2.5 bg-white rounded-xl border text-xs"
                    >
                      <div className="flex justify-between font-bold text-slate-900">
                        <span>{room.roomName}</span>
                        <span className="text-emerald-600">
                          {formatVND(room.weekdayPrice)}/đêm
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {room.bedType} • Kho: {room.totalRooms} phòng
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. TÀI KHOẢN NGÂN HÀNG & PHÁP LÝ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-4 bg-blue-50/40 rounded-2xl border border-blue-100 space-y-1.5">
                <span className="font-bold text-blue-900 flex items-center gap-1">
                  <CreditCard size={14} /> Tài khoản nhận quyết toán:
                </span>
                <p>
                  <b>Ngân hàng:</b> {selectedHotel.bankName || "N/A"}
                </p>
                <p>
                  <b>Số tài khoản:</b>{" "}
                  <span className="font-mono font-bold text-slate-900">
                    {selectedHotel.bankAccount || "N/A"}
                  </span>
                </p>
                <p>
                  <b>Chủ tài khoản:</b> {selectedHotel.bankAccountName || "N/A"}
                </p>
              </div>

              <div className="p-4 bg-amber-50/40 rounded-2xl border border-amber-100 space-y-1.5">
                <span className="font-bold text-amber-900 flex items-center gap-1">
                  <ShieldCheck size={14} /> Người ký & Pháp lý:
                </span>
                <p>
                  <b>Người đại diện:</b> {selectedHotel.signerName || "N/A"} (
                  {selectedHotel.signerPosition || "Chủ cơ sở"})
                </p>
                <p>
                  <b>Số CCCD / MST:</b>{" "}
                  {selectedHotel.signerIdNumber ||
                    selectedHotel.taxCode ||
                    "N/A"}
                </p>
                <p>
                  <b>Email nhận hợp đồng:</b>{" "}
                  {selectedHotel.signerEmail ||
                    selectedHotel.emailContact ||
                    "N/A"}
                </p>
              </div>
            </div>

            {/* 4. TÀI LIỆU ĐÍNH KÈM (CCCD / GIẤY ĐKKD) */}
            {selectedHotel.legalDocuments &&
              selectedHotel.legalDocuments.length > 0 && (
                <div>
                  <p className="font-bold text-slate-400 uppercase mb-2">
                    Tài liệu pháp lý tải lên:
                  </p>
                  <div className="space-y-2">
                    {selectedHotel.legalDocuments.map((doc, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-slate-50 border rounded-xl"
                      >
                        <span className="font-medium text-slate-800">
                          {doc.name || `Tài liệu pháp lý #${idx + 1}`}
                        </span>
                        {doc.preview && (
                          <a
                            href={doc.preview}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 font-bold flex items-center gap-1 hover:underline"
                          >
                            Xem file <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* THAO TÁC TRONG MODAL */}
            <div className="flex justify-between items-center pt-4 border-t border-slate-100">
              <Button
                variant="outline"
                onClick={() =>
                  handleReject(
                    selectedHotel.id || selectedHotel.hotel_id,
                    selectedHotel.hotelNameVi || selectedHotel.name,
                  )
                }
                className="text-rose-600 border-rose-200 hover:bg-rose-50 rounded-xl font-bold cursor-pointer"
              >
                Từ Chối Hồ Sơ
              </Button>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setSelectedHotel(null)}
                  className="rounded-xl font-bold cursor-pointer"
                >
                  Đóng
                </Button>
                <Button
                  onClick={() =>
                    handleApprove(
                      selectedHotel.id || selectedHotel.hotel_id,
                      selectedHotel.hotelNameVi || selectedHotel.name,
                    )
                  }
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl px-6 cursor-pointer"
                >
                  Phê Duyệt Ngay
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default HotelApprovalPage;
