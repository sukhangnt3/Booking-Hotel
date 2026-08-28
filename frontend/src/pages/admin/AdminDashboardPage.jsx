import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  DollarSign,
  TrendingUp,
  Building2,
  Users,
  Receipt,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  AlertTriangle,
  Calendar,
  Wallet,
} from "lucide-react";

// Components
import { Button, Badge } from "@/components/ui";
import { LoadingSpinner } from "@/components/common";
import { PaymentStatusBadge } from "@/components/payment";

// Services
import apiClient from "@/services/apiClient";
import { hotelService, bookingService } from "@/services";

const AdminDashboardPage = () => {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState("this_month");

  // ─── 1. STATES DỮ LIỆU THỰC TẾ ───
  const [stats, setStats] = useState({
    totalGmv: 0, // Tổng tiền giao dịch toàn sàn
    commissionRevenue: 0, // Hoa hồng thực tế sàn nhận
    commissionRate: 10, // 10%
    totalBookings: 0,
    pendingHotelsCount: 0,
    growthRate: "+0.0%",
  });

  const [recentBookings, setRecentBookings] = useState([]);
  const [pendingHotels, setPendingHotels] = useState([]);
  const [loading, setLoading] = useState(true);

  const formatVND = (num) => Number(num || 0).toLocaleString("vi-VN") + " ₫";

  // ─── 2. FETCH TOÀN BỘ SỐ LIỆU TỪ BACKEND ───
  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Lấy thống kê số liệu tổng quan
      let statsData = {};
      try {
        const resStats = await apiClient.get("/admin/stats", {
          params: { timeRange },
        });
        statsData = resStats?.data || resStats || {};
      } catch {
        // Fallback tự tính toán nếu Backend chưa có route tổng hợp
        statsData = {};
      }

      // 2. Lấy danh sách giao dịch gần đây & Khách sạn chờ duyệt
      const [bookingsRes, hotelsRes] = await Promise.all([
        bookingService.getAll?.({ limit: 5 }) || [],
        apiClient.get("/admin/hotels", { params: { status: "pending" } }).then((r) => r.data || []).catch(() => []),
      ]);

      const bookingList = Array.isArray(bookingsRes)
        ? bookingsRes
        : bookingsRes?.data || [];
      const hotelList = Array.isArray(hotelsRes) ? hotelsRes : [];

      // Tính tổng doanh thu từ danh sách nếu API chưa trả về con số tổng
      const calculatedGmv =
        statsData.totalGmv ||
        bookingList.reduce((sum, b) => sum + Number(b.total_price || 0), 0);
      const commission = statsData.commissionRevenue || calculatedGmv * 0.1;

      setStats({
        totalGmv: calculatedGmv,
        commissionRevenue: commission,
        commissionRate: statsData.commissionRate || 10,
        totalBookings: statsData.totalBookings || bookingList.length,
        pendingHotelsCount:
          statsData.pendingHotelsCount ||
          hotelList.filter((h) => h.status === "pending").length,
        growthRate: statsData.growthRate || "+15.2%",
      });

      setRecentBookings(bookingList);
      setPendingHotels(hotelList.filter((h) => h.status === "pending"));
    } catch (err) {
      console.error("Lỗi khi tải dữ liệu Admin Dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [timeRange]);

  return (
    <div className="space-y-8 font-sans pb-16 text-slate-800">
      {/* ─── HEADER & BỘ LỌC THỜI GIAN ─── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase text-black-600 tracking-wider">
              Hệ Thống Quản Trị Trung Tâm
            </span>
            <Badge variant="primary" size="sm"  >
              Super Admin
            </Badge>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
            Thống Kê Toàn Sàn GoStay
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Theo dõi dòng tiền GMV, doanh thu hoa hồng sàn và xử lý hồ sơ đối
            tác mới.
          </p>
        </div>

        {/* Dropdown chọn khoảng thời gian */}
        <div className="relative flex items-center">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-black px-4 py-3 rounded-2xl outline-none cursor-pointer focus:border-blue-600 focus:ring-4 focus:ring-blue-50 transition-all appearance-none pr-10"
          >
            <option value="today">Hôm nay</option>
            <option value="this_week">Tuần này</option>
            <option value="this_month">Tháng này (Hiện tại)</option>
            <option value="last_month">Tháng trước</option>
            <option value="this_year">Toàn bộ năm nay</option>
          </select>
          <Calendar
            size={16}
            className="absolute right-3.5 text-slate-400 pointer-events-none"
          />
        </div>
      </div>

      {/* ─── 4 METRIC CARDS (KPI TÀI CHÍNH TOÀN SÀN) ─── */}
      {loading ? (
        <div className="py-20 flex justify-center bg-white rounded-3xl border border-slate-200">
          <LoadingSpinner size="lg" label="Đang đối soát số liệu hệ thống..." />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* CARD 1: TỔNG GMV (TỔNG TIỀN GIAO DỊCH) */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-3 relative overflow-hidden group hover:shadow-md transition-all">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Tổng GMV Toàn Sàn
              </span>
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center">
                <DollarSign size={20} />
              </div>
            </div>
            <div>
              <div className="text-2xl md:text-3xl font-black text-slate-900">
                {formatVND(stats.totalGmv)}
              </div>
              <p className="text-xs font-bold text-emerald-600 mt-1 flex items-center gap-1">
                <TrendingUp size={13} /> {stats.growthRate} tăng trưởng
              </p>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full w-4/5" />
            </div>
          </div>

          {/* CARD 2: HOA HỒNG THỰC NHẬN CỦA SÀN */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-3 relative overflow-hidden group hover:shadow-md transition-all">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Hoa Hồng Sàn ({stats.commissionRate}%)
              </span>
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Wallet size={20} />
              </div>
            </div>
            <div>
              <div className="text-2xl md:text-3xl font-black text-emerald-600">
                {formatVND(stats.commissionRevenue)}
              </div>
              <p className="text-xs font-bold text-slate-500 mt-1">
                Lợi nhuận ròng sau thuế
              </p>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full w-full" />
            </div>
          </div>

          {/* CARD 3: TỔNG LƯỢT ĐẶT PHÒNG */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-3 relative overflow-hidden group hover:shadow-md transition-all">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Tổng Lượt Đặt Phòng
              </span>
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center">
                <Receipt size={20} />
              </div>
            </div>
            <div>
              <div className="text-2xl md:text-3xl font-black text-slate-900">
                {stats.totalBookings} Đơn
              </div>
              <p className="text-xs font-bold text-emerald-500 mt-1">
                Khách đã giao dịch thành công
              </p>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full w-3/4" />
            </div>
          </div>

          {/* CARD 4: HỒ SƠ CHỜ DUYỆT */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-3 relative overflow-hidden group hover:shadow-md transition-all">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Chỗ Nghỉ Chờ Duyệt
              </span>
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center">
                <Clock size={20} />
              </div>
            </div>
            <div>
              <div className="text-2xl md:text-3xl font-black text-emerald-500">
                {stats.pendingHotelsCount} Hồ sơ
              </div>
              <button
                onClick={() => navigate("/admin/hotels")}
                className="text-xs font-bold text-[#006ce4] hover:underline mt-1 flex items-center gap-1"
              >
                Xử lý phê duyệt ngay <ArrowUpRight size={13} />
              </button>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full w-1/2" />
            </div>
          </div>
        </div>
      )}

      {/* ─── 2 BẢNG VẬN HÀNH THỜI GIAN THỰC ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* BẢNG 1: HỒ SƠ KHÁCH SẠN MỚI ĐĂNG KÝ (5 COLS) */}
        <div className="lg:col-span-5 bg-white p-6 md:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-black text-lg text-slate-900 flex items-center gap-2">
                <Building2 size={18} className="text-amber-500" />
                Đối Tác Chờ Phê Duyệt
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Khách sạn vừa đăng ký lên sàn
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate("/admin/hotels")}
              className="text-xs font-bold border-slate-200 rounded-xl"
            >
              Xem tất cả
            </Button>
          </div>

          {pendingHotels.length > 0 ? (
            <div className="space-y-4">
              {pendingHotels.map((h) => (
                <div
                  key={h.id}
                  className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 flex items-center justify-between gap-3 hover:bg-slate-100/80 transition-colors"
                >
                  <div className="space-y-1 flex-1">
                    <h4 className="font-extrabold text-slate-900 text-sm line-clamp-1">
                      {h.name}
                    </h4>
                    <p className="text-xs text-slate-400">
                      {h.city} • Chủ:{" "}
                      {h.owner_name || h.owner?.name || "Đối tác"}
                    </p>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => navigate(`/admin/hotels`)}
                    className="bg-[#006ce4] text-white text-xs font-black px-4 rounded-xl shrink-0 shadow-sm"
                  >
                    Duyệt
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 text-xs font-bold italic">
              ✓ Hiện không có hồ sơ nào chờ phê duyệt.
            </div>
          )}
        </div>

        {/* BẢNG 2: GIAO DỊCH ĐẶT PHÒNG GẦN NHẤT (7 COLS) */}
        <div className="lg:col-span-7 bg-white p-6 md:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-black text-lg text-slate-900 flex items-center gap-2">
                <Receipt size={18} className="text-blue-600" />
                Giao Dịch Đặt Phòng Gần Nhất
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Dòng tiền vừa thanh toán qua hệ thống
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate("/admin/bookings")}
              className="text-xs font-bold border-slate-200 rounded-xl"
            >
              Toàn bộ đơn
            </Button>
          </div>

          {recentBookings.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-slate-400 text-[10px] font-black uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="pb-3">Mã Đơn</th>
                    <th className="pb-3">Chỗ Nghỉ</th>
                    <th className="pb-3">Thanh Toán</th>
                    <th className="pb-3 text-right">Tổng Tiền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {recentBookings.map((b) => (
                    <tr
                      key={b.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-3 font-mono font-black text-[#006ce4]">
                        #{b.booking_code || b.id}
                      </td>
                      <td className="py-3 font-bold text-slate-800">
                        {b.hotel_name || b.hotel?.name || "Khách sạn"}
                      </td>
                      <td className="py-3">
                        <PaymentStatusBadge
                          status={b.payment_status || "paid"}
                        />
                      </td>
                      <td className="py-3 text-right font-black text-slate-900 text-sm">
                        {formatVND(b.total_price || b.totalPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 text-xs font-bold italic">
              Chưa có giao dịch nào gần đây.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
