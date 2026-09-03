// src/pages/admin/HotelApprovalPage.jsx
import React, { useState, useEffect } from "react";
import {
  Building2,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Eye,
  Clock,
  MapPin,
  BedDouble,
  CreditCard,
  AlertCircle,
  RefreshCw,
  FileText,
  FileCheck,
  DollarSign,
  Sparkles,
  User,
  Phone,
  Mail,
  FileBadge,
  Globe,
  Navigation,
  Check,
  Trash2,
  Calendar,
  Coffee,
  Baby,
  Dog,
  Compass,
  X,
  Tag,
} from "lucide-react";
import { LoadingSpinner, EmptyState } from "@/components/common";

const STATUS_TABS = [
  { id: "pending", label: "Chờ phê duyệt" },
  { id: "approved", label: "Đã duyệt & Đang bán" },
  { id: "rejected", label: "Đã từ chối" },
  { id: "all", label: "Tất cả hồ sơ" },
];

export default function HotelApprovalPage() {
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const formatVND = (amount) =>
    Number(amount || 0).toLocaleString("vi-VN") + " ₫";

  // ════════════════════════════════════════════════════════════════════════════
  // 🔍 1. TẢI TOÀN BỘ DỮ LIỆU ĐĂNG KÝ THỰC TẾ CỦA CHỦ CƠ SỞ
  // ════════════════════════════════════════════════════════════════════════════
  const fetchHotels = () => {
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
      const rejectedRecords = JSON.parse(
        localStorage.getItem("rejected_owner_records") || "{}",
      );

      const mappedList = localApps.map((item, index) => {
        const hotelId = String(
          item.id || item.applicationId || `HT-${index + 1}`,
        ).trim();
        const ownerEmail = String(item.emailContact || item.email || "")
          .toLowerCase()
          .trim();

        let finalStatus = "pending";
        let rejectReason = item.rejectReason || "";

        if (rejectedIds.includes(hotelId) || item.status === "rejected") {
          finalStatus = "rejected";
          rejectReason =
            rejectedRecords[ownerEmail]?.reason ||
            item.rejectReason ||
            "Hồ sơ chưa đạt tiêu chuẩn pháp lý";
        } else if (
          approvedIds.includes(hotelId) ||
          item.status === "approved" ||
          item.is_approved === true
        ) {
          finalStatus = "approved";
        } else {
          finalStatus = "pending";
        }

        return {
          ...item,
          id: hotelId,
          name: item.hotelNameVi || item.name || "Cơ sở lưu trú mới",
          ownerName: item.ownerName || item.signerName || "Chủ cơ sở",
          emailContact: ownerEmail || "Chưa cập nhật email",
          phoneContact: item.phoneContact || item.signerPhone || "0901234567",
          city: item.province || item.city || "Việt Nam",
          address: item.streetAddress || item.address || "Địa chỉ chỗ nghỉ",
          status: finalStatus,
          rejectReason: rejectReason,
          rooms: item.rooms || item.roomTypes || [],
          hotelImages: item.hotelImages || (item.image ? [item.image] : []),
          legalDocuments: item.legalDocuments || [],
          propertyAmenities: item.propertyAmenities || [
            "wifi",
            "parking",
            "24h_front_desk",
          ],
          policies: item.policies || [],
          experiences: item.experiences || [],
          image:
            item.image ||
            item.hotelImages?.[0] ||
            "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600",
          starRating: item.starRating || 5,
          type: item.hotelType || item.type || "Khách sạn",
          created_at:
            item.created_at || item.submittedAt || new Date().toISOString(),
        };
      });

      setHotels(mappedList);
    } catch (err) {
      console.error("Lỗi tải danh sách duyệt:", err);
      setHotels([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHotels();
  }, []);

  // 🟢 DUYỆT CƠ SỞ
  const handleApprove = (hotel) => {
    setActionLoadingId(hotel.id);
    const targetId = String(hotel.id).trim();
    const ownerEmail = String(hotel.emailContact || "")
      .toLowerCase()
      .trim();

    try {
      const approvedIds = JSON.parse(
        localStorage.getItem("approved_hotel_ids") || "[]",
      ).map(String);
      if (!approvedIds.includes(targetId)) approvedIds.push(targetId);
      localStorage.setItem("approved_hotel_ids", JSON.stringify(approvedIds));

      const rejectedIds = JSON.parse(
        localStorage.getItem("rejected_hotel_ids") || "[]",
      ).map(String);
      localStorage.setItem(
        "rejected_hotel_ids",
        JSON.stringify(rejectedIds.filter((id) => id !== targetId)),
      );

      if (ownerEmail) {
        const approvedEmails = JSON.parse(
          localStorage.getItem("approved_owner_emails") || "[]",
        );
        if (!approvedEmails.includes(ownerEmail))
          approvedEmails.push(ownerEmail);
        localStorage.setItem(
          "approved_owner_emails",
          JSON.stringify(approvedEmails),
        );
      }

      const localApps = JSON.parse(
        localStorage.getItem("pending_partner_applications") || "[]",
      );
      const updatedApps = localApps.map((a) => {
        if (String(a.id || a.applicationId) === targetId) {
          return { ...a, status: "approved", is_approved: true };
        }
        return a;
      });
      localStorage.setItem(
        "pending_partner_applications",
        JSON.stringify(updatedApps),
      );

      // Tự động chuyển phòng vào kho buồng phòng PMS
      if (hotel.rooms && hotel.rooms.length > 0) {
        const currentMasterRooms = JSON.parse(
          localStorage.getItem("pms_hotel_rooms_master") || "[]",
        );
        const newRoomsToAdd = hotel.rooms.map((r, i) => ({
          id: r.id || `R-${targetId}-${i + 1}`,
          name: r.roomName || r.name || `Phòng Hạng ${i + 1}`,
          category: r.category || "Deluxe King",
          room_number: `P.${101 + i}`,
          floor: "Tầng 1",
          room_area: r.roomSize || r.room_area || 30,
          capacity: r.maxAdults || r.capacity || 2,
          bed_type: r.bedType || r.bed_type || "1 Giường đôi King",
          sell_price: r.weekdayPrice || r.sell_price || 750000,
          room_status: "available",
          amenities: r.roomAmenities || ["wifi", "air_con", "smart_tv"],
          image: r.image || hotel.image,
        }));

        const mergedRooms = [
          ...currentMasterRooms,
          ...newRoomsToAdd.filter(
            (nr) => !currentMasterRooms.some((mr) => mr.id === nr.id),
          ),
        ];
        localStorage.setItem(
          "pms_hotel_rooms_master",
          JSON.stringify(mergedRooms),
        );
      }

      setHotels((prev) =>
        prev.map((h) => (h.id === targetId ? { ...h, status: "approved" } : h)),
      );
      alert(
        `✓ Đã PHÊ DUYỆT thành công cơ sở "${hotel.name}"! Khách sạn đã được kích hoạt mở bán.`,
      );
      setSelectedHotel(null);
      setStatusFilter("approved");
    } catch (err) {
      alert("Lỗi khi phê duyệt hồ sơ!");
    } finally {
      setActionLoadingId(null);
    }
  };

  // 🔴 TỪ CHỐI CƠ SỞ
  const handleReject = (hotel) => {
    const reason = window.prompt(
      `Nhập lý do từ chối hồ sơ "${hotel.name}":`,
      "Giấy phép kinh doanh chưa hợp lệ hoặc thiếu hình ảnh thực tế của buồng phòng.",
    );
    if (!reason) return;

    setActionLoadingId(hotel.id);
    const targetId = String(hotel.id).trim();
    const ownerEmail = String(hotel.emailContact || "")
      .toLowerCase()
      .trim();

    try {
      const rejectedIds = JSON.parse(
        localStorage.getItem("rejected_hotel_ids") || "[]",
      ).map(String);
      if (!rejectedIds.includes(targetId)) rejectedIds.push(targetId);
      localStorage.setItem("rejected_hotel_ids", JSON.stringify(rejectedIds));

      const approvedIds = JSON.parse(
        localStorage.getItem("approved_hotel_ids") || "[]",
      ).map(String);
      localStorage.setItem(
        "approved_hotel_ids",
        JSON.stringify(approvedIds.filter((id) => id !== targetId)),
      );

      if (ownerEmail) {
        const rejectedRecords = JSON.parse(
          localStorage.getItem("rejected_owner_records") || "{}",
        );
        rejectedRecords[ownerEmail] = {
          reason,
          date: new Date().toISOString(),
        };
        localStorage.setItem(
          "rejected_owner_records",
          JSON.stringify(rejectedRecords),
        );
      }

      const localApps = JSON.parse(
        localStorage.getItem("pending_partner_applications") || "[]",
      );
      const updatedApps = localApps.map((a) => {
        if (String(a.id || a.applicationId) === targetId) {
          return { ...a, status: "rejected", rejectReason: reason };
        }
        return a;
      });
      localStorage.setItem(
        "pending_partner_applications",
        JSON.stringify(updatedApps),
      );

      setHotels((prev) =>
        prev.map((h) =>
          h.id === targetId
            ? { ...h, status: "rejected", rejectReason: reason }
            : h,
        ),
      );
      alert(`Đã từ chối hồ sơ "${hotel.name}".`);
      setSelectedHotel(null);
      setStatusFilter("rejected");
    } catch (err) {
      alert("Lỗi khi từ chối hồ sơ!");
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredHotels = hotels.filter((h) =>
    statusFilter === "all" ? true : h.status === statusFilter,
  );

  return (
    <div className="space-y-6 font-sans pb-16 text-slate-800">
      {/* ── HEADER ── */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider mb-1">
            <ShieldCheck size={16} /> Ban Quản Trị Hệ Thống (Super Admin)
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Phê Duyệt Hồ Sơ Chỗ Nghỉ & Đối Tác ({hotels.length} Hồ sơ)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Thẩm định đầy đủ thông tin pháp lý, buồng phòng, tài khoản ngân hàng
            và chính sách vận hành
          </p>
        </div>

        <button
          onClick={fetchHotels}
          className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw size={14} /> Làm mới danh sách
        </button>
      </div>

      {/* ── TABS TRẠNG THÁI ── */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-2xs flex items-center gap-2 overflow-x-auto no-scrollbar">
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
                className={`text-[10px] px-2 py-0.5 rounded-full font-black ${statusFilter === tab.id ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"}`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── DANH SÁCH THẺ HỒ SƠ ── */}
      {loading ? (
        <div className="py-24 flex justify-center bg-white rounded-3xl border">
          <LoadingSpinner
            size="lg"
            label="Đang tải danh sách hồ sơ đăng ký..."
          />
        </div>
      ) : filteredHotels.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredHotels.map((h) => {
            const isApproved = h.status === "approved";
            const isPending = h.status === "pending";
            const isRejected = h.status === "rejected";

            return (
              <div
                key={h.id}
                className="bg-white rounded-3xl border border-slate-200 shadow-2xs hover:shadow-xl transition-all overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className="relative h-48 w-full bg-slate-100 overflow-hidden">
                    <img
                      src={h.image}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 right-3">
                      {isApproved && (
                        <span className="bg-emerald-600 text-white text-[10px] font-black uppercase px-3 py-1.5 rounded-full shadow-lg">
                          ✓ Đã Duyệt (Đang Bán)
                        </span>
                      )}
                      {isPending && (
                        <span className="bg-amber-500 text-white text-[10px] font-black uppercase px-3 py-1.5 rounded-full shadow-lg animate-pulse">
                          ⏳ Chờ Thẩm Định
                        </span>
                      )}
                      {isRejected && (
                        <span className="bg-rose-600 text-white text-[10px] font-black uppercase px-3 py-1.5 rounded-full shadow-lg">
                          ✗ Đã Từ Chối
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-6 space-y-3">
                    <span className="text-[10px] font-black uppercase bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                      {h.type} • ⭐ {h.starRating} Sao
                    </span>
                    <h3 className="text-xl font-black text-slate-900 leading-snug">
                      {h.name}
                    </h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <MapPin size={13} className="text-blue-600 shrink-0" />{" "}
                      {h.address}, {h.city}
                    </p>

                    <div className="bg-slate-50 p-4 rounded-2xl border text-xs space-y-1.5">
                      <p className="flex justify-between">
                        <span className="text-slate-500">Chủ sở hữu:</span>
                        <strong className="text-slate-900">
                          {h.ownerName}
                        </strong>
                      </p>
                      <p className="flex justify-between">
                        <span className="text-slate-500">Email đăng nhập:</span>
                        <strong className="text-blue-900 font-mono">
                          {h.emailContact}
                        </strong>
                      </p>
                      <p className="flex justify-between">
                        <span className="text-slate-500">
                          Số phòng niêm yết:
                        </span>
                        <strong>{h.rooms?.length || 0} Hạng phòng</strong>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-6 pt-0 space-y-2">
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleApprove(h)}
                      disabled={isApproved}
                      className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-2xl text-xs shadow-md disabled:opacity-40 cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 size={15} />{" "}
                      {isApproved ? "Đã Phê Duyệt" : "Chấp Thuận & Mở Bán"}
                    </button>
                    <button
                      onClick={() => handleReject(h)}
                      disabled={isRejected}
                      className="py-2.5 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-2xl text-xs font-bold disabled:opacity-40 cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <XCircle size={15} />{" "}
                      {isRejected ? "Đã Từ Chối" : "Từ Chối Hồ Sơ"}
                    </button>
                  </div>

                  <button
                    onClick={() => setSelectedHotel(h)}
                    className="w-full py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-900 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer border border-blue-200"
                  >
                    <Eye size={15} /> Xem Đầy Đủ 100% Hồ Sơ & Giấy Tờ KYC (
                    {h.rooms?.length || 0} phòng)
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={Building2}
          title="Không có hồ sơ nào trong mục này"
          description="Khi có chủ cơ sở mới đăng ký, hồ sơ sẽ hiển thị ở đây để Admin thẩm định."
          actionLabel="Xem tất cả hồ sơ"
          onAction={() => setStatusFilter("all")}
        />
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════
          🔍 MODAL THẨM ĐỊNH TOÀN DIỆN 100% (7 KHỐI ĐẦY ĐỦ THÔNG TIN)
      ═══════════════════════════════════════════════════════════════════════════ */}
      {selectedHotel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-5xl shadow-2xl border space-y-6 max-h-[92vh] overflow-y-auto p-6 sm:p-8 text-xs text-slate-700">
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-black uppercase bg-blue-600 text-white px-2.5 py-0.5 rounded-full">
                    Hồ Sơ Thẩm Định KYC Đối Tác
                  </span>
                  <span className="font-mono text-slate-400 text-xs">
                    Mã hồ sơ: #{selectedHotel.id}
                  </span>
                </div>
                <h2 className="text-2xl font-black text-slate-900">
                  {selectedHotel.name}
                </h2>
                <p className="text-slate-500 flex items-center gap-1 mt-1">
                  <MapPin size={14} className="text-blue-600 shrink-0" />{" "}
                  {selectedHotel.address}, {selectedHotel.city}
                </p>
              </div>
              <button
                onClick={() => setSelectedHotel(null)}
                className="p-2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* KHỐI 1: BÀI VIẾT GIỚI THIỆU & MÔ TẢ CHỖ NGHỈ */}
            <div className="p-4 bg-slate-50 rounded-2xl border space-y-2">
              <span className="font-black text-slate-900 text-xs uppercase flex items-center gap-1.5">
                <FileText size={15} className="text-blue-600" /> 1. Bài Viết Mô
                Tả & Giới Thiệu Chỗ Nghỉ
              </span>
              <p className="text-slate-700 leading-relaxed whitespace-pre-line bg-white p-3.5 rounded-xl border">
                {selectedHotel.description ||
                  "Chủ cơ sở chưa nhập bài viết mô tả chi tiết."}
              </p>
            </div>

            {/* KHỐI 2: HỒ SƠ PHÁP LÝ & GIẤY PHÉP KINH DOANH SCAN */}
            <div className="p-5 bg-blue-50/50 rounded-2xl border border-blue-200 space-y-4">
              <span className="font-black text-blue-950 text-xs uppercase flex items-center gap-1.5">
                <FileBadge size={16} className="text-blue-700" /> 2. Hồ Sơ Pháp
                Lý & Người Ký Hợp Đồng
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="bg-white p-3 rounded-xl border">
                  <span className="text-[10px] text-slate-400 font-bold block">
                    NGƯỜI KÝ HỢP ĐỒNG
                  </span>
                  <strong className="text-slate-900 block">
                    {selectedHotel.signerName || selectedHotel.ownerName}
                  </strong>
                  <span className="text-[10px] text-slate-500">
                    {selectedHotel.signerPosition || "Chủ sở hữu"}
                  </span>
                </div>
                <div className="bg-white p-3 rounded-xl border">
                  <span className="text-[10px] text-slate-400 font-bold block">
                    SỐ CCCD / HỘ CHIẾU
                  </span>
                  <strong className="font-mono text-slate-900">
                    {selectedHotel.signerIdNumber || "Chưa cập nhật"}
                  </strong>
                </div>
                <div className="bg-white p-3 rounded-xl border">
                  <span className="text-[10px] text-slate-400 font-bold block">
                    MÃ SỐ THUẾ
                  </span>
                  <strong className="font-mono text-blue-900">
                    {selectedHotel.taxCode || "Chưa có"}
                  </strong>
                </div>
                <div className="bg-white p-3 rounded-xl border">
                  <span className="text-[10px] text-slate-400 font-bold block">
                    LOẠI HÌNH DOANH NGHIỆP
                  </span>
                  <strong className="text-slate-900 uppercase">
                    {selectedHotel.businessType === "company"
                      ? "Doanh Nghiệp / Công Ty"
                      : "Hộ Kinh Doanh Cá Thể"}
                  </strong>
                </div>
              </div>

              {/* Ảnh scan giấy phép */}
              {selectedHotel.legalDocuments?.length > 0 && (
                <div className="pt-2 border-t border-blue-100">
                  <span className="font-bold text-blue-900 block mb-2 text-xs">
                    Ảnh Scan Giấy Phép Kinh Doanh & CCCD Đã Tải Lên:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {selectedHotel.legalDocuments.map((doc, idx) => (
                      <div
                        key={idx}
                        className="p-2 bg-white rounded-xl border border-blue-200 flex items-center gap-2"
                      >
                        <FileCheck size={16} className="text-emerald-600" />
                        <span className="font-semibold text-blue-900">
                          {doc.name || `Tài liệu scan ${idx + 1}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* KHỐI 3: TÀI KHOẢN NGÂN HÀNG & MỨC HOA HỒNG */}
            <div className="p-5 bg-slate-50 rounded-2xl border space-y-3">
              <span className="font-black text-slate-900 text-xs uppercase flex items-center gap-1.5">
                <CreditCard size={16} className="text-emerald-600" /> 3. Tài
                Khoản Ngân Hàng Nhận Tiền & Hoa Hồng Sàn
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-white p-3 rounded-xl border">
                  <span className="text-[10px] text-slate-400 font-bold block">
                    NGÂN HÀNG THỤ HƯỞNG
                  </span>
                  <strong className="text-slate-900">
                    {selectedHotel.bankName || "MBBank"}
                  </strong>
                </div>
                <div className="bg-white p-3 rounded-xl border">
                  <span className="text-[10px] text-slate-400 font-bold block">
                    SỐ TÀI KHOẢN
                  </span>
                  <strong className="font-mono text-blue-900 text-sm">
                    {selectedHotel.bankAccount || "123456789"}
                  </strong>
                </div>
                <div className="bg-white p-3 rounded-xl border">
                  <span className="text-[10px] text-slate-400 font-bold block">
                    CHỦ TÀI KHOẢN
                  </span>
                  <strong className="text-slate-900 uppercase">
                    {selectedHotel.bankAccountName || selectedHotel.ownerName}
                  </strong>
                </div>
                <div className="bg-white p-3 rounded-xl border">
                  <span className="text-[10px] text-slate-400 font-bold block">
                    HOA HỒNG THỎA THUẬN
                  </span>
                  <strong className="text-emerald-700 text-sm font-black">
                    {selectedHotel.commissionRate || 18}% / đơn thành công
                  </strong>
                </div>
              </div>
            </div>

            {/* KHỐI 4: DANH MỤC CÁC HẠNG PHÒNG & GIÁ BÁN */}
            <div className="space-y-3">
              <span className="font-black text-slate-900 text-xs uppercase flex items-center gap-1.5">
                <BedDouble size={16} className="text-blue-600" /> 4. Danh Mục{" "}
                {selectedHotel.rooms?.length || 0} Hạng Phòng Đăng Ký Niêm Yết:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selectedHotel.rooms?.map((r, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-slate-50 rounded-2xl border space-y-2"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <strong className="text-slate-900 text-sm font-black block">
                          {r.roomName || r.name}
                        </strong>
                        <span className="text-slate-500 text-xs">
                          {r.bedType || r.bed_type} •{" "}
                          {r.roomSize || r.room_area || 28}m² • Tối đa{" "}
                          {r.maxAdults || 2} khách
                        </span>
                      </div>
                      <span className="text-emerald-700 font-black text-sm">
                        {formatVND(r.weekdayPrice || r.sell_price)}/đêm
                      </span>
                    </div>

                    {/* Tiện nghi phòng */}
                    {r.roomAmenities?.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {r.roomAmenities.map((am, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 bg-white rounded-md border text-[10px] font-semibold text-slate-600"
                          >
                            ✓ {am}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* KHỐI 5: CHÍNH SÁCH VẬN HÀNH & GIỜ GIẤC */}
            <div className="p-5 bg-slate-50 rounded-2xl border space-y-3">
              <span className="font-black text-slate-900 text-xs uppercase flex items-center gap-1.5">
                <Clock size={16} className="text-amber-600" /> 5. Quy Định Giờ
                Giấc & Chính Sách Hủy Phòng
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-white p-3 rounded-xl border">
                  <span className="text-slate-400 block font-bold text-[10px]">
                    GIỜ NHẬN PHÒNG
                  </span>
                  <strong>Từ {selectedHotel.checkInFrom || "14:00"}</strong>
                </div>
                <div className="bg-white p-3 rounded-xl border">
                  <span className="text-slate-400 block font-bold text-[10px]">
                    GIỜ TRẢ PHÒNG
                  </span>
                  <strong>Trước {selectedHotel.checkOutTo || "12:00"}</strong>
                </div>
                <div className="bg-white p-3 rounded-xl border">
                  <span className="text-slate-400 block font-bold text-[10px]">
                    CHÍNH SÁCH HỦY
                  </span>
                  <strong className="text-blue-900">
                    {selectedHotel.cancellationPolicy === "flexible_24h"
                      ? "Linh hoạt (Hủy trước 24h)"
                      : "Theo quy định"}
                  </strong>
                </div>
              </div>
            </div>

            {/* KHỐI 6: BỘ SƯU TẬP HÌNH ẢNH CƠ SỞ */}
            <div className="space-y-3">
              <span className="font-black text-slate-900 text-xs uppercase flex items-center gap-1.5">
                <Sparkles size={16} className="text-amber-500" /> 6. Thư Viện
                Hình Ảnh Chỗ Nghỉ ({selectedHotel.hotelImages?.length || 1} ảnh)
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {selectedHotel.hotelImages?.map((img, i) => (
                  <div
                    key={i}
                    className="h-28 rounded-2xl overflow-hidden border bg-slate-100"
                  >
                    <img
                      src={
                        typeof img === "string" ? img : img.preview || img.url
                      }
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* STICKY FOOTER THAO TÁC PHÊ DUYỆT */}
            <div className="flex justify-between items-center pt-4 border-t sticky bottom-0 bg-white py-2">
              <button
                onClick={() => handleReject(selectedHotel)}
                className="px-5 py-3 border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold rounded-2xl text-xs cursor-pointer"
              >
                Từ Chối Hồ Sơ
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedHotel(null)}
                  className="px-5 py-3 bg-slate-100 rounded-2xl font-bold text-xs"
                >
                  Đóng
                </button>
                <button
                  onClick={() => handleApprove(selectedHotel)}
                  className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl text-xs shadow-lg cursor-pointer active:scale-95"
                >
                  Phê Duyệt & Mở Bán Toàn Sàn
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
