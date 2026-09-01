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
  RotateCcw,
  FileText,
  FileCheck,
  DollarSign,
  Coffee,
  Baby,
  Dog,
  Sparkles,
  Percent,
  Compass,
  Car,
  User,
  Phone,
  Mail,
  FileBadge,
  Globe,
  Navigation,
  Check,
  Tag,
} from "lucide-react";

import { Button, Modal, Badge } from "@/components/ui";
import { LoadingSpinner, EmptyState } from "@/components/common";
import apiClient from "@/services/apiClient";

const STATUS_TABS = [
  { id: "pending", label: "Chờ phê duyệt" },
  { id: "approved", label: "Đã duyệt & Đang bán" },
  { id: "rejected", label: "Đã từ chối" },
  { id: "all", label: "Tất cả hồ sơ" },
];

const formatHotelType = (type) => {
  if (!type) return "Khách sạn";
  const t = String(type).toLowerCase().trim();
  if (t === "hotel" || t === "khách sạn") return "Khách sạn";
  if (t === "resort" || t === "khu nghỉ dưỡng") return "Khu nghỉ dưỡng";
  if (t === "villa" || t === "biệt thự") return "Biệt thự";
  if (t === "homestay" || t === "căn hộ") return "Homestay";
  return "Khách sạn";
};

const HotelApprovalPage = () => {
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const formatVND = (amount) => {
    return new Intl.NumberFormat("vi-VN").format(amount || 0) + " ₫";
  };

  // ════════════════════════════════════════════════════════════════════════════
  // 🔍 1. FETCH & ĐỒNG BỘ ĐẦY ĐỦ 100% CÁC TRƯỜNG DỮ LIỆU TỪ FORM ĐĂNG KÝ
  // ════════════════════════════════════════════════════════════════════════════
  const fetchHotels = async () => {
    setLoading(true);
    try {
      let apiList = [];
      try {
        const res = await apiClient.get("/admin/hotels");
        apiList = Array.isArray(res.data)
          ? res.data
          : res.data?.hotels || res.data?.data || [];
      } catch (apiErr) {
        console.warn("API admin hotels:", apiErr);
      }

      const localApps = JSON.parse(
        localStorage.getItem("pending_partner_applications") || "[]",
      );

      const approvedHotelIds = JSON.parse(
        localStorage.getItem("approved_hotel_ids") || "[]",
      ).map(String);
      const rejectedHotelIds = JSON.parse(
        localStorage.getItem("rejected_hotel_ids") || "[]",
      ).map(String);
      const rejectedRecords = JSON.parse(
        localStorage.getItem("rejected_owner_records") || "{}",
      );
      const deletedHotelIds = JSON.parse(
        localStorage.getItem("deleted_hotel_ids") || "[]",
      ).map(String);

      const apiIds = new Set(
        apiList.map((h) => String(h.id || h._id || h.hotel_id)).filter(Boolean),
      );

      const uniqueLocalApps = localApps.filter((app) => {
        const appId = String(app.id || app.applicationId || app.hotel_id || "");
        return !apiIds.has(appId);
      });

      const combined = [...uniqueLocalApps, ...apiList];
      const uniqueHotelsMap = new Map();

      combined.forEach((item) => {
        const hotelId = String(
          item.id || item._id || item.hotel_id || item.applicationId || "",
        ).trim();
        const hotelAppId = String(item.applicationId || "").trim();
        const hotelName = String(
          item.hotelNameVi || item.name || "Cơ sở chưa đặt tên",
        ).trim();
        const ownerEmail = String(
          item.emailContact ||
            item.email ||
            item.user?.email ||
            item.signerEmail ||
            "",
        )
          .toLowerCase()
          .trim();

        if (
          !hotelId ||
          deletedHotelIds.includes(hotelId) ||
          deletedHotelIds.includes(hotelName) ||
          Boolean(item.is_deleted || item.isDeleted || item.deletedAt) ||
          item.status === "deleted"
        ) {
          return;
        }

        const dedupeKey = hotelName.toLowerCase() || hotelId;

        if (!uniqueHotelsMap.has(dedupeKey)) {
          let finalStatus = "pending";
          let rejectReason = item.rejectReason || "";

          const isExplicitlyApproved =
            approvedHotelIds.includes(hotelId) ||
            (hotelAppId && approvedHotelIds.includes(hotelAppId));

          const isExplicitlyRejected =
            rejectedHotelIds.includes(hotelId) ||
            (hotelAppId && rejectedHotelIds.includes(hotelAppId));

          if (isExplicitlyRejected) {
            finalStatus = "rejected";
            rejectReason =
              rejectedRecords[ownerEmail]?.reason ||
              item.rejectReason ||
              "Hồ sơ chưa đạt tiêu chuẩn thẩm định.";
          } else if (isExplicitlyApproved) {
            finalStatus = "approved";
          } else {
            finalStatus = "pending";
          }

          // Lấy danh sách phòng
          const customRooms = JSON.parse(
            localStorage.getItem(`hotel_rooms_${hotelId}`) ||
              localStorage.getItem(`hotel_rooms_${hotelName.toLowerCase()}`) ||
              "[]",
          );

          const roomList =
            customRooms.length > 0
              ? customRooms
              : item.rooms || item.roomTypes || item.data?.rooms || [];

          uniqueHotelsMap.set(dedupeKey, {
            ...item,
            id: hotelId,
            applicationId: hotelAppId || hotelId,
            name: hotelName,
            status: finalStatus,
            rejectReason,
            type: formatHotelType(item.hotelType || item.type),
            ownerName:
              item.ownerName ||
              item.signerName ||
              item.user?.full_name ||
              "Chủ cơ sở",
            emailContact: ownerEmail || "Chưa cập nhật email",
            rooms: roomList,
            created_at:
              item.created_at || item.submittedAt || new Date().toISOString(),
          });
        }
      });

      setHotels(Array.from(uniqueHotelsMap.values()));
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

  // ─── 🔄 RESET TẤT CẢ VỀ CHỜ DUYỆT ───
  const handleResetToPending = () => {
    if (
      window.confirm(
        "Bạn có muốn xóa toàn bộ lịch sử duyệt cũ để đưa tất cả cơ sở về lại tab 'Chờ phê duyệt' không?",
      )
    ) {
      localStorage.removeItem("approved_hotel_ids");
      localStorage.removeItem("rejected_hotel_ids");
      localStorage.removeItem("approved_owner_emails");
      localStorage.removeItem("rejected_owner_records");

      const localApps = JSON.parse(
        localStorage.getItem("pending_partner_applications") || "[]",
      );
      const resetApps = localApps.map((a) => ({
        ...a,
        status: "pending",
        is_approved: false,
      }));
      localStorage.setItem(
        "pending_partner_applications",
        JSON.stringify(resetApps),
      );

      showToast("✓ Đã đưa tất cả cơ sở về tab 'Chờ phê duyệt'!");
      setStatusFilter("pending");
      fetchHotels();
    }
  };

  // ─── 🟢 ADMIN PHÊ DUYỆT ───
  const handleApprove = async (hotelId, hotelName, hotelObj) => {
    setActionLoadingId(hotelId);
    const targetId = String(
      hotelId || hotelObj?.id || hotelObj?.applicationId,
    ).trim();
    const appId = String(hotelObj?.applicationId || "").trim();
    const rawEmail =
      hotelObj?.emailContact ||
      hotelObj?.email ||
      hotelObj?.user?.email ||
      hotelObj?.signerEmail;
    const ownerEmail = String(rawEmail || "")
      .toLowerCase()
      .trim();

    try {
      try {
        await apiClient.patch(`/admin/hotels/${targetId}/status`, {
          status: "approved",
          is_approved: true,
          approval_status: "approved",
        });
      } catch (err) {}

      const approvedHotelIds = JSON.parse(
        localStorage.getItem("approved_hotel_ids") || "[]",
      ).map(String);

      if (targetId && !approvedHotelIds.includes(targetId))
        approvedHotelIds.push(targetId);
      if (appId && !approvedHotelIds.includes(appId))
        approvedHotelIds.push(appId);

      localStorage.setItem(
        "approved_hotel_ids",
        JSON.stringify(approvedHotelIds),
      );

      const rejectedHotelIds = JSON.parse(
        localStorage.getItem("rejected_hotel_ids") || "[]",
      ).map(String);
      const updatedRejected = rejectedHotelIds.filter(
        (id) => id !== targetId && id !== appId,
      );
      localStorage.setItem(
        "rejected_hotel_ids",
        JSON.stringify(updatedRejected),
      );

      if (ownerEmail) {
        const approvedEmails = JSON.parse(
          localStorage.getItem("approved_owner_emails") || "[]",
        );
        if (!approvedEmails.includes(ownerEmail)) {
          approvedEmails.push(ownerEmail);
          localStorage.setItem(
            "approved_owner_emails",
            JSON.stringify(approvedEmails),
          );
        }

        const rejectedRecords = JSON.parse(
          localStorage.getItem("rejected_owner_records") || "{}",
        );
        delete rejectedRecords[ownerEmail];
        localStorage.setItem(
          "rejected_owner_records",
          JSON.stringify(rejectedRecords),
        );
      }

      const localApps = JSON.parse(
        localStorage.getItem("pending_partner_applications") || "[]",
      );
      const updatedApps = localApps.map((a) => {
        const aId = String(a.id || a.applicationId || a.hotel_id).trim();
        if (aId === targetId || aId === appId) {
          return { ...a, status: "approved", is_approved: true };
        }
        return a;
      });
      localStorage.setItem(
        "pending_partner_applications",
        JSON.stringify(updatedApps),
      );

      setHotels((prev) =>
        prev.map((item) => {
          if (item.id === hotelId || item.applicationId === appId) {
            return { ...item, status: "approved" };
          }
          return item;
        }),
      );

      showToast(`✓ Đã duyệt "${hotelName}" & kích hoạt mở bán toàn sàn!`);
      setSelectedHotel(null);
      setStatusFilter("approved");
    } catch (err) {
      console.error(err);
      showToast("Lỗi khi duyệt hồ sơ", "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  // ─── 🔴 ADMIN TỪ CHỐI ───
  const handleReject = async (hotelId, hotelName, hotelObj) => {
    const reason = window.prompt(
      `Nhập lý do từ chối hồ sơ "${hotelName}":`,
      "Giấy phép kinh doanh không hợp lệ hoặc thiếu hình ảnh thực tế.",
    );
    if (!reason) return;

    setActionLoadingId(hotelId);
    const targetId = String(
      hotelId || hotelObj?.id || hotelObj?.applicationId,
    ).trim();
    const appId = String(hotelObj?.applicationId || "").trim();
    const rawEmail =
      hotelObj?.emailContact ||
      hotelObj?.email ||
      hotelObj?.user?.email ||
      hotelObj?.signerEmail;
    const ownerEmail = String(rawEmail || "")
      .toLowerCase()
      .trim();

    try {
      try {
        await apiClient.patch(`/admin/hotels/${targetId}/status`, {
          status: "rejected",
          is_approved: false,
          approval_status: "rejected",
          reason,
        });
      } catch (err) {}

      const rejectedHotelIds = JSON.parse(
        localStorage.getItem("rejected_hotel_ids") || "[]",
      ).map(String);
      if (targetId && !rejectedHotelIds.includes(targetId))
        rejectedHotelIds.push(targetId);
      if (appId && !rejectedHotelIds.includes(appId))
        rejectedHotelIds.push(appId);
      localStorage.setItem(
        "rejected_hotel_ids",
        JSON.stringify(rejectedHotelIds),
      );

      const approvedHotelIds = JSON.parse(
        localStorage.getItem("approved_hotel_ids") || "[]",
      ).map(String);
      const updatedApproved = approvedHotelIds.filter(
        (id) => id !== targetId && id !== appId,
      );
      localStorage.setItem(
        "approved_hotel_ids",
        JSON.stringify(updatedApproved),
      );

      const localApps = JSON.parse(
        localStorage.getItem("pending_partner_applications") || "[]",
      );
      const updatedApps = localApps.map((a) => {
        const aId = String(a.id || a.applicationId || a.hotel_id).trim();
        if (aId === targetId || aId === appId) {
          return { ...a, status: "rejected", rejectReason: reason };
        }
        return a;
      });
      localStorage.setItem(
        "pending_partner_applications",
        JSON.stringify(updatedApps),
      );

      setHotels((prev) =>
        prev.map((item) => {
          if (item.id === hotelId || item.applicationId === appId) {
            return { ...item, status: "rejected", rejectReason: reason };
          }
          return item;
        }),
      );

      showToast(`Đã từ chối hồ sơ "${hotelName}".`, "info");
      setSelectedHotel(null);
      setStatusFilter("rejected");
    } catch (err) {
      showToast("Lỗi khi từ chối hồ sơ", "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredHotels = hotels.filter((h) => {
    const status = h.status || "pending";
    if (statusFilter === "all") return true;
    if (statusFilter === "approved") return status === "approved";
    if (statusFilter === "pending") return status === "pending";
    if (statusFilter === "rejected") return status === "rejected";
    return true;
  });

  return (
    <div className="space-y-8 font-sans pb-16 text-slate-800">
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

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider mb-1">
            <ShieldCheck size={16} /> Ban Quản Trị Hệ Thống (Admin Portal)
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
            Phê Duyệt Chỗ Nghỉ & Chủ Khách Sạn
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Tổng cộng <strong>{hotels.length} cơ sở</strong> trên toàn hệ thống.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleResetToPending}
            className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-sm border border-amber-200"
            title="Đưa tất cả các cơ sở về tab Chờ phê duyệt để bắt đầu duyệt lại từ đầu"
          >
            <RotateCcw size={14} /> Đưa tất cả về Chờ duyệt
          </button>

          <button
            onClick={fetchHotels}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw size={14} /> Làm mới
          </button>
        </div>
      </div>

      {/* TABS TRẠNG THÁI */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-2 overflow-x-auto no-scrollbar">
        {STATUS_TABS.map((tab) => {
          const count = hotels.filter((h) => {
            if (tab.id === "all") return true;
            return h.status === tab.id;
          }).length;

          return (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-5 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 ${
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

      {/* DANH SÁCH THẺ HỒ SƠ */}
      {loading ? (
        <div className="py-24 flex justify-center bg-white rounded-3xl border border-slate-200">
          <LoadingSpinner size="lg" label="Đang tải danh sách hồ sơ..." />
        </div>
      ) : filteredHotels.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredHotels.map((h) => {
            const id = h.id;
            const isActing = actionLoadingId === id;
            const status = h.status || "pending";
            const hotelName = h.name || "Chưa đặt tên";
            const image =
              h.image ||
              h.hotelImages?.[0]?.url ||
              h.hotelImages?.[0]?.preview ||
              h.hotelImages?.[0] ||
              "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500";

            return (
              <div
                key={id}
                className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className="relative h-48 w-full overflow-hidden bg-slate-100">
                    <img
                      src={image}
                      alt={hotelName}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 right-3 z-10">
                      {status === "approved" ? (
                        <span className="inline-flex items-center gap-1.5 bg-emerald-500 text-white text-[10px] font-black uppercase px-3 py-1.5 rounded-full shadow-lg">
                          <CheckCircle2 size={13} /> Đã Duyệt (Đang bán)
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

                  <div className="p-6 space-y-4">
                    <div>
                      <span className="text-[10px] font-black uppercase bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                        {h.type || "Khách sạn"}
                      </span>
                      <h3 className="text-xl font-black text-slate-900 mt-1 leading-snug">
                        {hotelName}
                      </h3>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                        <MapPin size={13} className="text-slate-400 shrink-0" />{" "}
                        {h.streetAddress || h.address || h.city || "Việt Nam"}
                      </p>
                    </div>

                    {status === "rejected" && h.rejectReason && (
                      <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2">
                        <AlertCircle size={15} className="shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold">Lý do từ chối:</p>
                          <p className="mt-0.5 text-[11px] leading-relaxed">
                            {h.rejectReason}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Chủ sở hữu:</span>
                        <strong className="text-slate-800">
                          {h.ownerName}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Email Owner:</span>
                        <strong className="text-blue-900 font-mono">
                          {h.emailContact}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 pt-0 space-y-2">
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      size="sm"
                      isLoading={isActing}
                      onClick={() => handleApprove(id, hotelName, h)}
                      disabled={status === "approved"}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-2xl text-xs shadow-md disabled:opacity-40 cursor-pointer"
                      leftIcon={<CheckCircle2 size={16} />}
                    >
                      {status === "approved"
                        ? "Đã Phê Duyệt"
                        : "Chấp Thuận & Kích Hoạt"}
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      isLoading={isActing}
                      onClick={() => handleReject(id, hotelName, h)}
                      disabled={status === "rejected"}
                      className="border-rose-200 text-rose-600 hover:bg-rose-50 rounded-2xl text-xs font-bold disabled:opacity-40 cursor-pointer"
                      leftIcon={<XCircle size={16} />}
                    >
                      {status === "rejected" ? "Đã Từ Chối" : "Từ Chối"}
                    </Button>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedHotel(h)}
                    className="w-full text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl cursor-pointer"
                    leftIcon={<Eye size={14} />}
                  >
                    Xem Chi Tiết Hồ Sơ & Giấy Tờ ({h.rooms?.length || 0} phòng)
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={Building2}
          title="Không có hồ sơ nào trong mục này"
          description="Hiện tại không có cơ sở lưu trú nào ở trạng thái này."
          actionLabel="Xem tất cả hồ sơ"
          onAction={() => setStatusFilter("all")}
        />
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════
          🔍 MODAL THẨM ĐỊNH TOÀN DIỆN ĐẦY ĐỦ 100% (7 KHỐI CHI TIẾT)
      ═══════════════════════════════════════════════════════════════════════════ */}
      {selectedHotel && (
        <Modal
          isOpen={Boolean(selectedHotel)}
          onClose={() => setSelectedHotel(null)}
          title={`Hồ Sơ Thẩm Định Đối Tác: ${selectedHotel.name}`}
          maxWidth="max-w-5xl"
        >
          <div className="space-y-6 text-xs text-slate-700 max-h-[82vh] overflow-y-auto pr-1">
            {/* 1. TỔNG QUAN CƠ SỞ & GIỚI THIỆU */}
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex justify-between items-start flex-wrap gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[11px] uppercase bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                      {formatHotelType(
                        selectedHotel.hotelType || selectedHotel.type,
                      )}
                    </span>
                    <span className="text-amber-500 font-bold">
                      ⭐ {selectedHotel.starRating || 5} Sao
                    </span>
                    <span className="text-slate-400 font-mono text-[10px]">
                      Mã ID: #{selectedHotel.id}
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-slate-900 mt-1">
                    {selectedHotel.name}
                  </h3>
                  <p className="text-slate-600 flex items-center gap-1 mt-0.5">
                    <MapPin size={13} className="text-blue-600 shrink-0" />
                    {selectedHotel.streetAddress ||
                      selectedHotel.address ||
                      selectedHotel.city}
                  </p>
                </div>

                <div className="text-right text-[11px] text-slate-500 space-y-0.5">
                  <p className="flex items-center gap-1 justify-end">
                    <Globe size={13} className="text-slate-400" />
                    <b>Website:</b> {selectedHotel.website || "Chưa có"}
                  </p>
                  <p className="flex items-center gap-1 justify-end font-mono">
                    <Navigation size={13} className="text-slate-400" />
                    GPS: {selectedHotel.latitude || 10.7769},{" "}
                    {selectedHotel.longitude || 106.7009}
                  </p>
                </div>
              </div>

              {/* BÀI VIẾT MÔ TẢ */}
              <div className="pt-2 border-t border-slate-200">
                <span className="font-bold text-slate-800 block mb-1">
                  Mô tả / Giới thiệu cơ sở:
                </span>
                <p className="text-slate-600 leading-relaxed whitespace-pre-line bg-white p-3.5 rounded-xl border border-slate-200">
                  {selectedHotel.description ||
                    "Chủ cơ sở chưa nhập bài viết mô tả chi tiết."}
                </p>
              </div>
            </div>

            {/* 2. HỒ SƠ PHÁP LÝ & HỢP ĐỒNG ĐỐI TÁC */}
            <div className="p-5 bg-blue-50/50 rounded-2xl border border-blue-200 space-y-3">
              <h4 className="font-extrabold text-blue-950 text-sm flex items-center gap-2">
                <FileBadge size={16} className="text-blue-700" /> 1. Hồ Sơ Pháp
                Lý & Thỏa Thuận Hợp Tác
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white p-3 rounded-xl border border-blue-100">
                  <span className="text-[10px] text-slate-400 block font-bold">
                    MÃ SỐ THUẾ
                  </span>
                  <strong className="text-slate-900 font-mono">
                    {selectedHotel.taxCode || "Chưa cung cấp"}
                  </strong>
                </div>
                <div className="bg-white p-3 rounded-xl border border-blue-100">
                  <span className="text-[10px] text-slate-400 block font-bold">
                    LOẠI HÌNH KINH DOANH
                  </span>
                  <strong className="text-slate-900 uppercase">
                    {selectedHotel.businessType === "company"
                      ? "Doanh nghiệp / Công ty"
                      : "Hộ kinh doanh cá thể"}
                  </strong>
                </div>
                <div className="bg-white p-3 rounded-xl border border-blue-100">
                  <span className="text-[10px] text-slate-400 block font-bold">
                    HOA HỒNG SÀN THỎA THUẬN
                  </span>
                  <strong className="text-emerald-600 font-extrabold">
                    {selectedHotel.commissionRate || 18}% / đơn thành công
                  </strong>
                </div>
                <div className="bg-white p-3 rounded-xl border border-blue-100">
                  <span className="text-[10px] text-slate-400 block font-bold">
                    CHU KỲ ĐỐI SOÁT
                  </span>
                  <strong className="text-blue-900">
                    {selectedHotel.payoutCycle === "monthly"
                      ? "Hàng tháng"
                      : "Hàng tuần (Thứ 2)"}
                  </strong>
                </div>
              </div>

              {/* TÀI LIỆU SCAN ĐÍNH KÈM */}
              {selectedHotel.legalDocuments &&
                selectedHotel.legalDocuments.length > 0 && (
                  <div className="pt-2 border-t border-blue-100">
                    <span className="text-[11px] font-bold text-blue-900 block mb-1.5">
                      Tài liệu giấy phép đã tải lên:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {selectedHotel.legalDocuments.map((doc, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1.5 bg-white border border-blue-200 text-blue-800 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-2xs"
                        >
                          <FileCheck size={14} className="text-emerald-600" />
                          {doc.name || "Giấy phép kinh doanh (GPKD)"}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
            </div>

            {/* 3. NGƯỜI ĐẠI DIỆN & TÀI KHOẢN NGÂN HÀNG */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <h4 className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                  <User size={15} className="text-blue-600" /> Người Ký Hợp Đồng
                  & Đại Diện
                </h4>
                <div className="space-y-1 text-slate-600">
                  <p>
                    <b>Họ tên:</b>{" "}
                    <strong className="text-slate-900">
                      {selectedHotel.signerName ||
                        selectedHotel.ownerName ||
                        "N/A"}
                    </strong>{" "}
                    ({selectedHotel.signerPosition || "Chủ sở hữu"})
                  </p>
                  <p>
                    <b>Số CCCD/Hộ chiếu:</b>{" "}
                    <span className="font-mono font-bold text-slate-800">
                      {selectedHotel.signerIdNumber || "Chưa cập nhật"}
                    </span>
                  </p>
                  <p>
                    <b>Số điện thoại:</b>{" "}
                    <span className="font-mono">
                      {selectedHotel.signerPhone ||
                        selectedHotel.phoneContact ||
                        "N/A"}
                    </span>
                  </p>
                  <p>
                    <b>Email nhận hợp đồng:</b>{" "}
                    <span className="font-mono text-blue-800">
                      {selectedHotel.signerEmail ||
                        selectedHotel.emailContact ||
                        "N/A"}
                    </span>
                  </p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <h4 className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                  <CreditCard size={15} className="text-emerald-600" /> Tài
                  Khoản Ngân Hàng Nhận Tiền
                </h4>
                <div className="space-y-1 text-slate-600">
                  <p>
                    <b>Ngân hàng:</b>{" "}
                    <strong className="text-slate-900">
                      {selectedHotel.bankName || "Vietcombank"}
                    </strong>{" "}
                    ({selectedHotel.bankCode || "VCB"})
                  </p>
                  <p>
                    <b>Số tài khoản:</b>{" "}
                    <span className="font-mono font-bold text-blue-900 text-sm">
                      {selectedHotel.bankAccount || "N/A"}
                    </span>
                  </p>
                  <p>
                    <b>Chủ tài khoản:</b>{" "}
                    <strong className="text-slate-900 uppercase">
                      {selectedHotel.bankAccountName ||
                        selectedHotel.ownerName ||
                        "N/A"}
                    </strong>
                  </p>
                  <p>
                    <b>Chi nhánh:</b>{" "}
                    {selectedHotel.bankBranch || "Trụ sở chính"}
                  </p>
                </div>
              </div>
            </div>

            {/* 4. DANH MỤC CÁC HẠNG PHÒNG & BẢNG GIÁ CHI TIẾT */}
            <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 space-y-3">
              <h4 className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                <BedDouble size={16} className="text-blue-600" /> 2. Danh Mục{" "}
                {selectedHotel.rooms?.length || 0} Hạng Phòng Đang Mở Bán
              </h4>

              {selectedHotel.rooms && selectedHotel.rooms.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedHotel.rooms.map((room, idx) => (
                    <div
                      key={room.id || idx}
                      className="p-3.5 bg-white rounded-xl border border-slate-200 text-xs space-y-1.5 shadow-2xs"
                    >
                      <div className="flex justify-between font-bold text-slate-900">
                        <span className="text-sm font-extrabold">
                          {room.roomName || room.name}
                        </span>
                        <span className="text-emerald-600 font-extrabold text-sm">
                          {formatVND(
                            room.sell_price || room.weekdayPrice || room.price,
                          )}
                          /đêm
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 space-y-0.5 font-medium">
                        <p>
                          🛏️{" "}
                          {room.bed_type || room.bedType || "1 Giường đôi lớn"}{" "}
                          • 📐 {room.room_area || room.roomSize || 28} m²
                        </p>
                        <p>
                          👥 Sức chứa: {room.capacity || room.maxAdults || 2}{" "}
                          người lớn, {room.maxChildren || 0} trẻ em
                        </p>
                        <p>
                          📦 Tồn kho:{" "}
                          <strong className="text-blue-900">
                            {room.room_count || room.totalRooms || 5} phòng
                          </strong>
                        </p>
                        {room.weekendPrice && (
                          <p className="text-amber-700 font-semibold">
                            Giá cuối tuần: {formatVND(room.weekendPrice)}/đêm
                          </p>
                        )}
                        <div className="flex gap-2 text-[10px] text-slate-600 pt-1">
                          <span>
                            {room.hasPrivateBathroom
                              ? "✓ Phòng tắm riêng"
                              : "WC chung"}
                          </span>
                          <span>•</span>
                          <span>
                            {room.hasWindow ? "✓ Có cửa sổ" : "Không cửa sổ"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 italic text-center py-4">
                  Chưa có dữ liệu phòng.
                </p>
              )}
            </div>

            {/* 5. DANH MỤC TIỆN ÍCH CHỖ NGHỈ */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
              <h4 className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                <Sparkles size={15} className="text-amber-500" /> 3. Danh Mục
                Tiện Ích & Cơ Sở Vật Chất (
                {selectedHotel.propertyAmenities?.length ||
                  selectedHotel.amenities?.length ||
                  0}{" "}
                tiện ích)
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {(
                  selectedHotel.propertyAmenities ||
                  selectedHotel.amenities || ["Wi-Fi", "Bãi xe"]
                ).map((amenity, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs"
                  >
                    <Check size={13} className="text-cyan-600" />
                    {typeof amenity === "string"
                      ? amenity
                      : amenity.label || amenity.name}
                  </span>
                ))}
              </div>
            </div>

            {/* 6. QUY ĐỊNH VẬN HÀNH & ĐIỂM VUI CHƠI XUNG QUANH */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <h4 className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                <Clock size={15} className="text-blue-600" /> 4. Quy Định Vận
                Hành, Giờ Giấc & Chính Sách
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <p>
                  <b>Giờ nhận phòng:</b> Từ{" "}
                  {selectedHotel.checkin_time ||
                    selectedHotel.checkInFrom ||
                    "14:00"}
                </p>
                <p>
                  <b>Giờ trả phòng:</b> Trước{" "}
                  {selectedHotel.checkout_time ||
                    selectedHotel.checkOutTo ||
                    "12:00"}
                </p>
                <p>
                  <b>Chính sách hủy:</b>{" "}
                  {selectedHotel.cancellationPolicy === "flexible_24h"
                    ? "Linh hoạt (24h)"
                    : "Theo quy định"}
                </p>
              </div>

              {/* CÁC QUY ĐỊNH TỰ SOẠN */}
              {selectedHotel.policies && selectedHotel.policies.length > 0 && (
                <div className="pt-2 border-t border-slate-200 space-y-2">
                  <span className="font-bold text-slate-800 block text-[11px]">
                    Quy định tùy chỉnh của chỗ nghỉ:
                  </span>
                  {selectedHotel.policies.map((pol, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-white rounded-xl border border-slate-200 space-y-0.5"
                    >
                      <strong className="text-blue-900 font-bold block">
                        {pol.title}
                      </strong>
                      <p className="text-slate-600 whitespace-pre-line text-[11px]">
                        {pol.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* TRẢI NGHIỆM XUNG QUANH */}
              {selectedHotel.experiences &&
                selectedHotel.experiences.length > 0 && (
                  <div className="pt-2 border-t border-slate-200 space-y-2">
                    <span className="font-bold text-slate-800 block text-[11px]">
                      Trải nghiệm & Điểm vui chơi gần chỗ nghỉ:
                    </span>
                    {selectedHotel.experiences.map((exp, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 bg-white rounded-xl border border-slate-200 space-y-0.5"
                      >
                        <strong className="text-emerald-900 font-bold block">
                          {exp.title}
                        </strong>
                        <p className="text-slate-600 whitespace-pre-line text-[11px]">
                          {exp.content}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
            </div>

            {/* 7. HÌNH ẢNH CƠ SỞ */}
            <div>
              <p className="font-bold text-slate-600 uppercase mb-2">
                5. Bộ sưu tập hình ảnh (
                {selectedHotel.images?.length ||
                  selectedHotel.hotelImages?.length ||
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
                      typeof img === "object"
                        ? img.preview || img.url || img.path
                        : img
                    }
                    alt="Hotel"
                    className="w-full h-24 object-cover rounded-xl border border-slate-200 shadow-2xs"
                  />
                ))}
              </div>
            </div>

            {/* NÚT DUYỆT / TỪ CHỐI */}
            <div className="flex justify-between items-center pt-4 border-t border-slate-200 sticky bottom-0 bg-white py-2">
              <Button
                variant="outline"
                onClick={() =>
                  handleReject(
                    selectedHotel.id,
                    selectedHotel.name,
                    selectedHotel,
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
                      selectedHotel.id,
                      selectedHotel.name,
                      selectedHotel,
                    )
                  }
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl px-6 cursor-pointer shadow-md"
                >
                  Phê Duyệt & Mở Bán
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
