// src/pages/owner/DashboardPage.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
  DollarSign,
  BedDouble,
  Clock,
  RefreshCw,
  Building2,
  ArrowUpRight,
  AlertCircle,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { LoadingSpinner } from "@/components/common";
import apiClient from "@/services/apiClient";

export default function OwnerDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");

  const [myHotels, setMyHotels] = useState([]);
  const [selectedHotelId, setSelectedHotelId] = useState("all");

  const [stats, setStats] = useState({
    totalRevenue: 0,
    occupancyRate: 0,
    totalRooms: 0,
    activeRooms: 0,
    todayArrivals: 0,
    todayDepartures: 0,
    chartData: [],
  });

  const formatVND = (num) => Number(num || 0).toLocaleString("vi-VN") + " ₫";

  // 1. Tải danh sách khách sạn đã duyệt của Owner
  const fetchOwnerHotels = useCallback(async () => {
    try {
      const res = await apiClient.get("/hotels/my-hotels?active_only=true");
      const list = res?.data || res?.hotels || res || [];
      setMyHotels(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Lỗi lấy danh sách khách sạn:", err);
      setMyHotels([]);
    }
  }, []);

  // 2. Lấy dữ liệu thống kê từ Backend theo cơ sở được chọn (Nối trực tiếp ?hotel_id=)
  const fetchOwnerStats = useCallback(async () => {
    setLoading(true);
    setApiError("");
    try {
      // 👉 Nối thẳng ?hotel_id= vào URL để truyền tham số chắc chắn 100%
      const queryStr =
        selectedHotelId && selectedHotelId !== "all"
          ? `?hotel_id=${encodeURIComponent(selectedHotelId)}`
          : "";

      const res = await apiClient.get(`/owner/stats${queryStr}`);
      const data = res?.data || res || {};

      setStats({
        totalRevenue: Number(data.totalRevenue || 0),
        occupancyRate: Number(data.occupancyRate || 0),
        totalRooms: Number(data.totalRooms || 0),
        activeRooms: Number(data.activeRooms || 0),
        todayArrivals: Number(data.todayArrivals || 0),
        todayDepartures: Number(data.todayDepartures || 0),
        chartData: Array.isArray(data.chartData) ? data.chartData : [],
      });
    } catch (err) {
      console.error("Lỗi lấy số liệu Dashboard:", err);
      setApiError(err.message || "Không thể tải báo cáo từ máy chủ.");
    } finally {
      setLoading(false);
    }
  }, [selectedHotelId]);

  useEffect(() => {
    fetchOwnerHotels();
  }, [fetchOwnerHotels]);

  useEffect(() => {
    fetchOwnerStats();
  }, [fetchOwnerStats]);

  return (
    <div className="space-y-7 font-sans pb-16 text-slate-800">
      {/* HEADER & DROPDOWN LỌC KHÁCH SẠN */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-wider mb-1">
            <Building2 size={16} /> Bảng Điều Khiển Đối Tác Lưu Trú (PostgreSQL
            Realtime)
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Doanh Thu & Hiệu Suất Lấp Đầy Phòng
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Dữ liệu đồng bộ trực tiếp từ các bảng <code>booking</code>,{" "}
            <code>room</code> & <code>hotel</code>
          </p>
        </div>

        <div className="flex items-center gap-3 w-full lg:w-auto">
          {/* DROPDOWN CHỌN TỪNG CƠ SỞ */}
          <select
            value={selectedHotelId}
            onChange={(e) => setSelectedHotelId(e.target.value)}
            className="p-2.5 border rounded-2xl text-xs font-bold text-slate-700 bg-slate-50 outline-none cursor-pointer"
          >
            <option value="all">🏨 Tất cả khách sạn của tôi</option>
            {myHotels.map((h) => (
              <option key={h.id} value={h.id}>
                🏨 {h.name}
              </option>
            ))}
          </select>

          <button
            onClick={fetchOwnerStats}
            className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl transition cursor-pointer"
            title="Làm mới số liệu"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {apiError && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl flex items-center gap-2 font-bold">
          <AlertCircle size={16} /> <span>{apiError}</span>
        </div>
      )}

      {loading ? (
        <div className="py-24 flex justify-center bg-white rounded-3xl border">
          <LoadingSpinner size="lg" label="Đang truy vấn số liệu..." />
        </div>
      ) : (
        <>
          {/* 4 THẺ KPI */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* THẺ 1: TỔNG DOANH THU */}
            <div className="bg-white p-5 rounded-3xl border shadow-xs space-y-2">
              <div className="flex justify-between items-center text-slate-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  Tổng Doanh Thu
                </span>
                <DollarSign size={18} className="text-emerald-600" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                {formatVND(stats.totalRevenue)}
              </h3>
              <p className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                <ArrowUpRight size={14} /> Dòng tiền thực nhận (paid/completed)
              </p>
            </div>

            {/* THẺ 2: TỶ LỆ LẤP ĐẦY */}
            <div className="bg-white p-5 rounded-3xl border shadow-xs space-y-2">
              <div className="flex justify-between items-center text-slate-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  Tỷ Lệ Lấp Đầy (Occupancy)
                </span>
                <BedDouble size={18} className="text-blue-600" />
              </div>
              <h3 className="text-2xl font-black text-blue-700 tracking-tight">
                {stats.occupancyRate}%
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                {stats.activeRooms} / {stats.totalRooms} phòng đang có khách ở
              </p>
            </div>

            {/* THẺ 3: NHẬN PHÒNG HÔM NAY */}
            <div className="bg-white p-5 rounded-3xl border shadow-xs space-y-2">
              <div className="flex justify-between items-center text-slate-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  Nhận Phòng Hôm Nay
                </span>
                <Clock size={18} className="text-amber-600" />
              </div>
              <h3 className="text-2xl font-black text-amber-700 tracking-tight">
                {stats.todayArrivals} Khách
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Lịch nhận phòng trong ngày
              </p>
            </div>

            {/* THẺ 4: TRẢ PHÒNG HÔM NAY */}
            <div className="bg-white p-5 rounded-3xl border shadow-xs space-y-2">
              <div className="flex justify-between items-center text-slate-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  Trả Phòng Hôm Nay
                </span>
                <Clock size={18} className="text-rose-600" />
              </div>
              <h3 className="text-2xl font-black text-rose-600 tracking-tight">
                {stats.todayDepartures} Khách
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Đã hoàn tất trả phòng hôm nay
              </p>
            </div>
          </div>

          {/* BIỂU ĐỒ DOANH THU & ĐƠN ĐẶT */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 bg-white p-6 rounded-3xl border shadow-xs space-y-4">
              <h3 className="font-black text-base text-slate-900">
                Biểu Đồ Doanh Thu 6 Tháng Gần Nhất
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.chartData}>
                    <defs>
                      <linearGradient
                        id="ownerRevGrad"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#059669"
                          stopOpacity={0.25}
                        />
                        <stop
                          offset="95%"
                          stopColor="#059669"
                          stopOpacity={0.0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#e2e8f0"
                    />
                    <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
                    <YAxis
                      stroke="#64748b"
                      fontSize={11}
                      tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`}
                    />
                    <Tooltip formatter={(v) => [formatVND(v), "Doanh thu"]} />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#059669"
                      strokeWidth={3}
                      fill="url(#ownerRevGrad)"
                      dot={{ r: 5, fill: "#059669" }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="lg:col-span-4 bg-white p-6 rounded-3xl border shadow-xs space-y-4">
              <h3 className="font-black text-base text-slate-900">
                Số Lượt Đặt Phòng Thành Công
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.chartData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#e2e8f0"
                    />
                    <XAxis dataKey="month" stroke="#64748b" fontSize={10} />
                    <YAxis
                      stroke="#64748b"
                      fontSize={11}
                      allowDecimals={false}
                    />
                    <Tooltip
                      formatter={(v) => [`${v} đơn`, "Số đơn thành công"]}
                    />
                    <Bar
                      dataKey="bookings"
                      fill="#003580"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
