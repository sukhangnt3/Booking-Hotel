import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  Users,
  CheckCircle2,
  Clock,
  TrendingUp,
  DollarSign,
  ShieldCheck,
  MapPin,
  XCircle,
} from "lucide-react";

import { LoadingSpinner } from "@/components/common";
import { bookingService } from "@/services";
import apiClient from "@/services/apiClient";

export default function AdminDashboardPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalHotels: 0,
    activeHotels: 0,
    pendingHotels: 0,
    totalPartners: 0,
    totalGrossRevenue: 0,
    platformCommission: 0,
    totalPaidBookings: 0,
  });
  const [recentPartners, setRecentPartners] = useState([]);

  // ════════════════════════════════════════════════════════════════════════════
  // 🔍 1. FETCH & ĐỒNG BỘ THỐNG KÊ (ĐẾM CHUẨN XÁC HỒ SƠ CHỜ THẨM ĐỊNH)
  // ════════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        let apiHotels = [];
        try {
          const res = await apiClient.get("/admin/hotels");
          apiHotels = Array.isArray(res.data)
            ? res.data
            : res.data?.hotels || res.data?.data || [];
        } catch (e) {
          console.warn("API hotels error:", e);
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
        const deletedHotelIds = JSON.parse(
          localStorage.getItem("deleted_hotel_ids") || "[]",
        ).map(String);

        // Gộp cả 2 nguồn
        const combined = [...localApps, ...apiHotels];
        const uniqueHotelsMap = new Map();

        combined.forEach((h) => {
          const hotelId = String(
            h.id || h._id || h.applicationId || h.hotel_id || "",
          ).trim();
          const hotelAppId = String(h.applicationId || "").trim();
          const hotelName = String(h.hotelNameVi || h.name || "").trim();
          const ownerEmail = String(
            h.emailContact || h.email || h.user?.email || h.signerEmail || "",
          )
            .toLowerCase()
            .trim();

          // 🛑 1. Bỏ qua nếu đã bị xóa
          if (
            !hotelId ||
            deletedHotelIds.includes(hotelId) ||
            deletedHotelIds.includes(hotelName) ||
            Boolean(h.is_deleted || h.isDeleted || h.deletedAt) ||
            h.status === "deleted"
          ) {
            return;
          }

          const dedupeKey = hotelName.toLowerCase() || hotelId;

          if (!uniqueHotelsMap.has(dedupeKey)) {
            let finalStatus = "pending";

            // 🛑 2. Kiểm tra Từ chối
            const isRejected =
              rejectedHotelIds.includes(hotelId) ||
              (hotelAppId && rejectedHotelIds.includes(hotelAppId)) ||
              h.status === "rejected";

            // 🛑 3. Kiểm tra Đã duyệt (CHỈ KHI MÃ ID ĐÃ ĐƯỢC ADMIN BẤM DUYỆT THẬT)
            const isApproved =
              !isRejected &&
              (approvedHotelIds.includes(hotelId) ||
                (hotelAppId && approvedHotelIds.includes(hotelAppId)) ||
                (h.status === "approved" &&
                  h.is_approved === true &&
                  !h.status?.includes("pending")));

            if (isRejected) {
              finalStatus = "rejected";
            } else if (isApproved) {
              finalStatus = "approved";
            } else {
              finalStatus = "pending"; // 👈 HỒ SƠ MỚI NỘP LUÔN LÀ PENDING ĐỂ TÍNH VÀO KPI CHỜ THẨM ĐỊNH
            }

            uniqueHotelsMap.set(dedupeKey, {
              ...h,
              id: hotelId,
              name: hotelName || "Cơ sở lưu trú",
              ownerName:
                h.ownerName || h.signerName || h.user?.full_name || "Chủ cơ sở",
              emailContact: ownerEmail || "Chưa có email",
              phoneContact: h.phoneContact || h.signerPhone || h.phone || "N/A",
              city: h.province || h.city || "Hồ Chí Minh",
              status: finalStatus,
              created_at:
                h.created_at || h.submittedAt || new Date().toISOString(),
            });
          }
        });

        const allList = Array.from(uniqueHotelsMap.values());
        const activeList = allList.filter((h) => h.status === "approved");
        const pendingList = allList.filter((h) => h.status === "pending");

        // ══════════════════════════════════════════════════════════════════════
        // 🏆 2. ĐẾM SỐ LƯỢNG ĐỐI TÁC ĐÃ CÓ CƠ SỞ HOẠT ĐỘNG
        // ══════════════════════════════════════════════════════════════════════
        const activePartnersEmailSet = new Set();
        allList.forEach((h) => {
          if (h.status === "approved" && h.emailContact) {
            activePartnersEmailSet.add(h.emailContact);
          }
        });

        // 3. Doanh thu
        let allBookingsList = [];
        try {
          if (bookingService?.getHistory) {
            const bRes = await bookingService.getHistory();
            allBookingsList = Array.isArray(bRes)
              ? bRes
              : bRes?.data || bRes?.bookings || [];
          }
        } catch (e) {}

        const paidCache = JSON.parse(
          localStorage.getItem("paid_bookings") || "[]",
        );
        const realPaidBookings = allBookingsList.filter((b) => {
          const code = b.booking_code || b.id;
          return (
            b.payment_status === "paid" ||
            b.status === "confirmed" ||
            paidCache.includes(code)
          );
        });

        const totalGross = realPaidBookings.reduce((sum, b) => {
          const price = Number(b.total_price || b.totalPrice || b.amount || 0);
          return sum + price;
        }, 0);

        const totalCommission = Math.round(totalGross * 0.18);

        // 🛑 CẬP NHẬT CHUẨN XÁC CẢ 4 THẺ KPI
        setStats({
          totalHotels: activeList.length + pendingList.length,
          activeHotels: activeList.length,
          pendingHotels: pendingList.length, // 👈 SẼ NHẢY SỐ > 0 KHI CÓ HỒ SƠ MỚI
          totalPartners:
            activePartnersEmailSet.size || (activeList.length > 0 ? 1 : 0),
          totalGrossRevenue: totalGross,
          platformCommission: totalCommission,
          totalPaidBookings: realPaidBookings.length,
        });

        const activeAndPendingOnly = allList.filter(
          (h) => h.status !== "rejected",
        );
        setRecentPartners(activeAndPendingOnly);
      } catch (err) {
        console.error("Lỗi tải dashboard:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const formatVND = (num) => Number(num || 0).toLocaleString("vi-VN") + " ₫";

  return (
    <div className="space-y-8 font-sans text-slate-800 pb-16">
      {/* ── HEADER ── */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider mb-1">
            <ShieldCheck size={16} /> Bảng Điều Khiển Tổng Quan (Super Admin)
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
            Tổng Quan Hoạt Động Toàn Sàn GoStay
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Dữ liệu doanh thu và đối tác được tổng hợp độc lập theo từng cơ sở
            lưu trú
          </p>
        </div>

        <button
          onClick={() => navigate("/admin/hotels")}
          className="px-5 py-2.5 bg-[#003580] hover:bg-blue-900 text-white font-bold text-xs rounded-xl transition shadow-md flex items-center gap-2 cursor-pointer"
        >
          <span>Kiểm duyệt cơ sở</span>
          {stats.pendingHotels > 0 && (
            <span className="bg-amber-400 text-amber-950 font-black text-[10px] px-2 py-0.5 rounded-full animate-pulse">
              {stats.pendingHotels} chờ duyệt
            </span>
          )}
        </button>
      </div>

      {loading ? (
        <div className="py-24 flex justify-center bg-white rounded-3xl border border-slate-200">
          <LoadingSpinner size="lg" label="Đang đối soát dữ liệu sàn..." />
        </div>
      ) : (
        <>
          {/* ══════════════════════════════════════════════════════════════════
              📊 4 THẺ KPI ĐỒNG BỘ THỰC TẾ (HỒ SƠ CHỜ THẨM ĐỊNH > 0)
          ══════════════════════════════════════════════════════════════════ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* 1. Tổng Đối Tác */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Tổng Số Đối Tác
                </span>
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold">
                  <Users size={20} />
                </div>
              </div>
              <div>
                <h3 className="text-3xl font-black text-slate-900 tracking-tight">
                  {stats.totalPartners}
                </h3>
                <p className="text-xs text-emerald-600 font-bold mt-1 flex items-center gap-1">
                  <TrendingUp size={14} /> Đối tác chính thức
                </p>
              </div>
            </div>

            {/* 2. Đang Mở Bán */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Cơ Sở Đang Mở Bán
                </span>
                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-bold">
                  <CheckCircle2 size={20} />
                </div>
              </div>
              <div>
                <h3 className="text-3xl font-black text-emerald-600 tracking-tight">
                  {stats.activeHotels}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Đã phê duyệt mở bán
                </p>
              </div>
            </div>

            {/* 3. Hồ Sơ Chờ Thẩm Định (NHẢY SỐ CHUẨN XÁC) */}
            <div
              onClick={() => navigate("/admin/hotels")}
              className={`bg-white p-6 rounded-3xl border-2 shadow-sm space-y-3 cursor-pointer transition group ${
                stats.pendingHotels > 0
                  ? "border-amber-400 bg-amber-50/20 hover:bg-amber-50/40"
                  : "border-slate-200"
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
                  Hồ Sơ Chờ Thẩm Định
                </span>
                <div className="w-10 h-10 bg-amber-100 text-amber-700 rounded-xl flex items-center justify-center font-bold">
                  <Clock
                    size={20}
                    className={stats.pendingHotels > 0 ? "animate-pulse" : ""}
                  />
                </div>
              </div>
              <div>
                <h3 className="text-3xl font-black text-amber-600 tracking-tight">
                  {stats.pendingHotels}
                </h3>
                <p className="text-xs text-blue-700 font-bold mt-1 group-hover:underline flex items-center gap-1">
                  {stats.pendingHotels > 0
                    ? "Nhấp để duyệt ngay →"
                    : "Đã thẩm định hết ✓"}
                </p>
              </div>
            </div>

            {/* 4. Tổng Doanh Thu Sàn */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Tổng Doanh Thu Sàn
                </span>
                <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center font-bold">
                  <DollarSign size={20} />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                  {formatVND(stats.totalGrossRevenue)}
                </h3>
                <p className="text-xs text-emerald-700 font-extrabold mt-1">
                  Hoa hồng 18% thực thu: {formatVND(stats.platformCommission)}
                </p>
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              📋 BẢNG DANH SÁCH TẤT CẢ CƠ SỞ
          ══════════════════════════════════════════════════════════════════ */}
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm space-y-4 p-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  Cơ Sở Lưu Trú & Đối Tác Đang Hoạt Động (
                  {recentPartners.length})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Danh sách các cơ sở đang mở bán hoặc đang chờ phê duyệt trên
                  hệ thống
                </p>
              </div>

              <button
                onClick={() => navigate("/admin/hotels")}
                className="text-xs text-[#003580] font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                Xem tất cả hồ sơ &rarr;
              </button>
            </div>

            {recentPartners.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Tên Chỗ Nghỉ</th>
                      <th className="py-3 px-4">Chủ Cơ Sở</th>
                      <th className="py-3 px-4">Email Đăng Nhập</th>
                      <th className="py-3 px-4">Khu Vực</th>
                      <th className="py-3 px-4 text-center">Trạng Thái</th>
                      <th className="py-3 px-4 text-center">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {recentPartners.map((h) => {
                      const isApproved = h.status === "approved";
                      const isPending = h.status === "pending";

                      return (
                        <tr
                          key={h.id}
                          className="hover:bg-slate-50/70 transition"
                        >
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 bg-blue-50 text-blue-700 rounded-lg flex items-center justify-center font-bold shrink-0">
                                <Building2 size={16} />
                              </div>
                              <div>
                                <strong className="font-extrabold text-slate-900 block text-sm">
                                  {h.name}
                                </strong>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  #{h.id}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 font-bold text-slate-800">
                            {h.ownerName}
                          </td>

                          <td className="py-3.5 px-4 font-mono text-blue-900">
                            {h.emailContact}
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="flex items-center gap-1 text-slate-600">
                              <MapPin
                                size={13}
                                className="text-slate-400 shrink-0"
                              />
                              {h.city}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            {isApproved ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 size={12} /> Đang Mở Bán
                              </span>
                            ) : isPending ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                                <Clock size={12} /> Chờ Thẩm Định
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                <XCircle size={12} /> Đã Từ Chối
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <button
                              onClick={() => navigate("/admin/hotels")}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-[#003580] hover:text-white text-slate-700 font-bold text-xs rounded-lg transition cursor-pointer"
                            >
                              Xử lý duyệt
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-10 text-center text-slate-400 text-xs">
                Hiện chưa có đối tác nào trên hệ thống.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
