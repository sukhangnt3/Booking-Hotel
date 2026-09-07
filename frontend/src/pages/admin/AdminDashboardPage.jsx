import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  Activity,
  Users,
  Building2,
  CalendarCheck,
  DollarSign,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  BarChart2,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { LoadingSpinner } from "@/components/common";
import apiClient from "@/services/apiClient";

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");

  // 🟢 Bộ lọc thời gian chuẩn: 'today' | '7days' | '30days'
  const [timeRange, setTimeRange] = useState("today");

  const [stats, setStats] = useState({
    totalUsers: 0,
    totalHotels: 0,
    totalBookings: 0,
    totalRevenue: 0,
    totalGMV: 0,
    pendingHotels: 0,
  });

  const [trafficData, setTrafficData] = useState([]);
  const [pendingList, setPendingList] = useState([]);

  const formatVND = (num) => Number(num || 0).toLocaleString("vi-VN") + " ₫";
  const formatNumber = (num) => Number(num || 0).toLocaleString("vi-VN");

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setApiError("");
    try {
      const [statsRes, hotelsRes] = await Promise.all([
        apiClient.get(`/admin/stats?range=${timeRange}`),
        apiClient.get("/admin/hotels?status=pending"),
      ]);

      const data = statsRes?.data || statsRes || {};
      const hotelsData = Array.isArray(hotelsRes)
        ? hotelsRes
        : hotelsRes?.hotels || hotelsRes?.data || [];

      setStats({
        totalUsers: Number(data.totalUsers || 0),
        totalHotels: Number(data.totalHotels || 0),
        totalBookings: Number(data.totalBookings || 0),
        totalRevenue: Number(data.totalRevenue || 0),
        totalGMV: Number(data.totalGMV || 0),
        pendingHotels: Number(data.pendingHotels || hotelsData.length || 0),
      });

      setPendingList(hotelsData.slice(0, 5));

      if (Array.isArray(data.hourlyTraffic) && data.hourlyTraffic.length > 0) {
        setTrafficData(data.hourlyTraffic);
      } else {
        setTrafficData([
          { time: "00:00", full_date: "00:00 - 03:00", requests: 0 },
          { time: "03:00", full_date: "03:00 - 06:00", requests: 0 },
          { time: "06:00", full_date: "06:00 - 09:00", requests: 0 },
          { time: "09:00", full_date: "09:00 - 12:00", requests: 0 },
          { time: "12:00", full_date: "12:00 - 15:00", requests: 0 },
          { time: "15:00", full_date: "15:00 - 18:00", requests: 0 },
          { time: "18:00", full_date: "18:00 - 21:00", requests: 0 },
          { time: "21:00", full_date: "21:00 - 24:00", requests: 0 },
        ]);
      }
    } catch (err) {
      console.error("Lỗi lấy dữ liệu:", err);
      setApiError(
        err.response?.data?.message || err.message || "Lỗi truy vấn Database",
      );
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleQuickApprove = async (hotelId) => {
    try {
      await apiClient.patch(`/admin/hotels/${hotelId}/status`, {
        status: "active",
      });
      alert("✓ Đã phê duyệt cơ sở thành công! Cơ sở đã được mở bán.");
      fetchDashboardData();
    } catch (err) {
      alert(`Lỗi phê duyệt: ${err.message}`);
    }
  };

  // 🟢 TÍNH TOÁN CÁC CHỈ SỐ PHÂN TÍCH NHANH (GIỐNG STRIPE & GOOGLE ANALYTICS)
  const analyticsSummary = useMemo(() => {
    const total = trafficData.reduce(
      (sum, item) => sum + Number(item.requests || 0),
      0,
    );
    const count = trafficData.length || 1;
    const avg = Math.round(total / count);

    let peak = { time: "--", requests: 0 };
    trafficData.forEach((item) => {
      if (Number(item.requests) > peak.requests) {
        peak = {
          time: item.full_date || item.time,
          requests: Number(item.requests),
        };
      }
    });

    return { total, avg, peak };
  }, [trafficData]);

  return (
    <div className="space-y-6 font-sans pb-16 text-slate-800">
      {/* 🟢 HEADER */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider mb-1">
            <ShieldCheck size={16} /> Bảng Điều Hành Quản Trị Viên (Admin
            Center)
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Giám Sát Lưu Lượng & Vận Hành Toàn Sàn
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Dữ liệu tập trung phục vụ xét duyệt đối tác và giám sát hệ thống
          </p>
        </div>

        <button
          onClick={fetchDashboardData}
          className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl transition cursor-pointer"
          title="Làm mới số liệu"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {apiError && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl flex items-center gap-2 font-bold">
          <AlertCircle size={16} /> <span>{apiError}</span>
        </div>
      )}

      {loading ? (
        <div className="py-24 flex justify-center bg-white rounded-3xl border">
          <LoadingSpinner size="lg" label="Đang đối soát số liệu hệ thống..." />
        </div>
      ) : (
        <>
          {/* 👑 4 THẺ TỔNG QUAN HỆ THỐNG */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* THẺ 1: HOA HỒNG SÀN & TỔNG GIAO DỊCH GMV */}
            <div className="bg-white p-5 rounded-3xl border shadow-xs space-y-2">
              <div className="flex justify-between items-center text-slate-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  Hoa Hồng Sàn Thực Thu
                </span>
                <DollarSign size={18} className="text-emerald-600" />
              </div>
              <h3 className="text-2xl font-black text-emerald-700 tracking-tight">
                {formatVND(stats.totalRevenue)}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Tổng giao dịch (GMV):{" "}
                <b className="text-slate-800">{formatVND(stats.totalGMV)}</b>
              </p>
            </div>

            {/* THẺ 2: NGƯỜI DÙNG */}
            <div className="bg-white p-5 rounded-3xl border shadow-xs space-y-2">
              <div className="flex justify-between items-center text-slate-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  Tài Khoản Người Dùng
                </span>
                <Users size={18} className="text-purple-600" />
              </div>
              <h3 className="text-2xl font-black text-purple-700 tracking-tight">
                {stats.totalUsers} Người Dùng
              </h3>
              <button
                onClick={() => navigate("/admin/users")}
                className="text-[11px] text-purple-700 font-bold flex items-center gap-1 hover:underline cursor-pointer"
              >
                Quản lý & Phân quyền →
              </button>
            </div>

            {/* THẺ 3: CƠ SỞ ĐỐI TÁC */}
            <div className="bg-white p-5 rounded-3xl border shadow-xs space-y-2">
              <div className="flex justify-between items-center text-slate-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  Cơ Sở Khách Sạn
                </span>
                <Building2 size={18} className="text-blue-600" />
              </div>
              <h3 className="text-2xl font-black text-blue-700 tracking-tight">
                {stats.totalHotels} Cơ Sở
              </h3>
              {stats.pendingHotels > 0 ? (
                <p className="text-[11px] text-amber-600 font-bold">
                  ⚠️ Có {stats.pendingHotels} cơ sở đang chờ duyệt
                </p>
              ) : (
                <p className="text-[11px] text-slate-500 font-medium">
                  ✓ Đã duyệt toàn bộ hồ sơ
                </p>
              )}
            </div>

            {/* THẺ 4: TỔNG ĐƠN ĐẶT PHÒNG */}
            <div className="bg-white p-5 rounded-3xl border shadow-xs space-y-2">
              <div className="flex justify-between items-center text-slate-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  Tổng Đơn Đặt Phòng
                </span>
                <CalendarCheck size={18} className="text-amber-600" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                {stats.totalBookings} Đơn
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Giao dịch toàn hệ thống
              </p>
            </div>
          </div>

          {/* 📊 PHẦN 1: GIÁM SÁT LƯU LƯỢNG CHUẨN THỰC TẾ (CÓ FILTER + 3 CHỈ SỐ NHANH) */}
          <div className="bg-white p-6 rounded-3xl border shadow-xs space-y-5">
            {/* Header của biểu đồ */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b pb-4 border-slate-100">
              <div>
                <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
                  <Activity size={18} className="text-blue-600" /> Giám Sát Lưu
                  Lượng Khách Hàng & Đối Tác
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Lưu lượng tương tác thực tế từ người dùng (loại trừ thao tác
                  nội bộ của Admin)
                </p>
              </div>

              {/* Bộ lọc thời gian */}
              <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200">
                {[
                  { id: "today", label: "Hôm nay" },
                  { id: "7days", label: "7 ngày qua" },
                  { id: "30days", label: "30 ngày qua" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setTimeRange(tab.id)}
                    className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                      timeRange === tab.id
                        ? "bg-white text-blue-700 shadow-xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 🟢 3 THẺ CHỈ SỐ NHANH PHÂN TÍCH (CHUẨN STRIPE / GOOGLE ANALYTICS) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Tổng Lượt Tương Tác
                </span>
                <p className="text-lg font-black text-slate-800 mt-0.5">
                  {formatNumber(analyticsSummary.total)}{" "}
                  <span className="text-xs font-medium text-slate-500">
                    lượt
                  </span>
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                  <BarChart2 size={12} className="text-blue-600" /> Trung Bình /{" "}
                  {timeRange === "today" ? "Khung giờ" : "Ngày"}
                </span>
                <p className="text-lg font-black text-blue-700 mt-0.5">
                  {formatNumber(analyticsSummary.avg)}{" "}
                  <span className="text-xs font-medium text-slate-500">
                    lượt
                  </span>
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                  <TrendingUp size={12} className="text-emerald-600" /> Đỉnh
                  Điểm (Peak)
                </span>
                <p className="text-lg font-black text-emerald-700 mt-0.5">
                  {formatNumber(analyticsSummary.peak.requests)}{" "}
                  <span className="text-xs font-medium text-slate-500">
                    lượt ({analyticsSummary.peak.time})
                  </span>
                </p>
              </div>
            </div>

            {/* Biểu đồ Recharts */}
            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trafficData}>
                  <defs>
                    <linearGradient
                      id="trafficGrad"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="#003580"
                        stopOpacity={0.25}
                      />
                      <stop
                        offset="95%"
                        stopColor="#003580"
                        stopOpacity={0.0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#f1f5f9"
                  />
                  {/* 🟢 TỰ ĐỘNG GIÃN CÁCH TRỤC HOÀNH (KHÔNG BAO GIỜ BỊ ĐÈ CHỮ) */}
                  <XAxis
                    dataKey="time"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    interval={timeRange === "30days" ? 4 : 0}
                  />
                  <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                  {/* 🟢 TOOLTIP HIỂN THỊ ĐẦY ĐỦ THỜI GIAN VÀ ĐỊNH DẠNG SỐ CÓ DẤU CHẤM */}
                  <Tooltip
                    formatter={(v) => [
                      `${formatNumber(v)} lượt tương tác`,
                      "Lưu lượng",
                    ]}
                    labelFormatter={(_, payload) => {
                      const item = payload?.[0]?.payload;
                      if (!item) return "";
                      return timeRange === "today"
                        ? `Khung giờ: ${item.full_date || item.time}`
                        : `Ngày: ${item.full_date || item.time}`;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="requests"
                    stroke="#003580"
                    strokeWidth={3}
                    fill="url(#trafficGrad)"
                    dot={{ r: 3, fill: "#003580" }}
                    activeDot={{ r: 6, fill: "#003580" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 🛎️ PHẦN 2: HÀNG CHỜ PHÊ DUYỆT ĐỐI TÁC MỚI */}
          <div className="bg-white p-6 rounded-3xl border shadow-xs space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
                  <Clock size={18} className="text-amber-600" /> Hàng Chờ Phê
                  Duyệt Đối Tác Mới ({pendingList.length})
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Các cơ sở khách sạn vừa nộp hồ sơ đang chờ Admin thẩm định để
                  mở bán
                </p>
              </div>

              <button
                onClick={() => navigate("/admin/hotels")}
                className="text-xs font-bold text-blue-700 hover:underline flex items-center gap-1 cursor-pointer"
              >
                Xem tất cả hồ sơ <ArrowRight size={14} />
              </button>
            </div>

            {pendingList.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b">
                    <tr>
                      <th className="py-3 px-4">Tên Cơ Sở Chỗ Nghỉ</th>
                      <th className="py-3 px-4">Chủ Doanh Nghiệp</th>
                      <th className="py-3 px-4">Khu Vực</th>
                      <th className="py-3 px-4">Hoa Hồng</th>
                      <th className="py-3 px-4 text-right">Thao Tác Nhanh</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {pendingList.map((hotel) => (
                      <tr key={hotel.id} className="hover:bg-slate-50/80">
                        <td className="py-3.5 px-4">
                          <strong className="text-slate-900 block">
                            {hotel.name}
                          </strong>
                          <span className="text-[11px] text-slate-400">
                            {hotel.address}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-slate-800">
                            {hotel.owner_name || "Chủ đối tác"}
                          </p>
                          <p className="text-slate-400">
                            {hotel.owner_phone || hotel.owner_email}
                          </p>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-700">
                          {hotel.city || "Việt Nam"}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-blue-700">
                          {hotel.commission_rate ?? 18}%
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => navigate("/admin/hotels")}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                            >
                              Xem Hồ Sơ
                            </button>
                            <button
                              onClick={() => handleQuickApprove(hotel.id)}
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center gap-1 cursor-pointer shadow-xs"
                            >
                              <CheckCircle2 size={13} /> Duyệt Nhanh
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <CheckCircle2
                  size={32}
                  className="text-emerald-500 mx-auto mb-1.5"
                />
                <p className="font-bold text-xs text-slate-800">
                  Tuyệt vời! Không có hồ sơ nào đang chờ duyệt
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Tất cả đối tác đăng ký đều đã được xử lý xong
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
