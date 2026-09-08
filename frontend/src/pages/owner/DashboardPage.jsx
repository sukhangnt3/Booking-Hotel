// src/pages/owner/DashboardPage.jsx
import React, { useState, useEffect, useCallback } from "react";
import { RefreshCw, AlertCircle, ChevronDown, MapPin } from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
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

  // Bộ lọc thời gian chuẩn theo ảnh mẫu (today, yesterday, 7days, this_month, last_month)
  const [timeRange, setTimeRange] = useState("this_month");
  const [isTimeDropdownOpen, setIsTimeDropdownOpen] = useState(false);

  // Bộ lọc kiểu hiển thị doanh thu (day, hour, weekday)
  const [revenueTab, setRevenueTab] = useState("day");

  const [stats, setStats] = useState({
    occupancyCurrent: {
      occupied: 1,
      vacant: 7,
      total: 8,
      rate: 13,
      vacantRate: 88,
    },
    revenueTotal: 0,
    occupancyTimeline: [],
    revenueTimeline: [],
    topRooms: [],
  });

  const formatVND = (num) => Number(num || 0).toLocaleString("vi-VN") + " ₫";
  const formatShortVND = (num) => {
    const val = Number(num || 0);
    if (val >= 1000000000) return (val / 1000000000).toFixed(1) + " tỷ";
    if (val >= 1000000) return (val / 1000000).toFixed(0) + " tr";
    if (val >= 1000) return (val / 1000).toFixed(0) + "k";
    return val;
  };

  const fetchHotels = useCallback(async () => {
    try {
      const res = await apiClient.get("/hotels/my-hotels?active_only=true");
      const list = res?.data || res?.hotels || res || [];
      setMyHotels(Array.isArray(list) ? list : []);
    } catch {
      setMyHotels([]);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setApiError("");
    try {
      const res = await apiClient.get(
        `/owner/stats?hotel_id=${selectedHotelId}&range=${timeRange}&rev_tab=${revenueTab}`,
      );
      setStats({
        occupancyCurrent: res.occupancyCurrent || {
          occupied: 1,
          vacant: 7,
          total: 8,
          rate: 13,
          vacantRate: 88,
        },
        revenueTotal: res.revenueTotal || 0,
        occupancyTimeline: Array.isArray(res.occupancyTimeline)
          ? res.occupancyTimeline
          : [],
        revenueTimeline: Array.isArray(res.revenueTimeline)
          ? res.revenueTimeline
          : [],
        topRooms: Array.isArray(res.topRooms) ? res.topRooms : [],
      });
    } catch (err) {
      setApiError(err.message || "Không thể tải báo cáo từ máy chủ.");
    } finally {
      setLoading(false);
    }
  }, [selectedHotelId, timeRange, revenueTab]);

  useEffect(() => {
    fetchHotels();
  }, [fetchHotels]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const getTimeRangeLabel = () => {
    switch (timeRange) {
      case "today":
        return "Hôm nay";
      case "yesterday":
        return "Hôm qua";
      case "7days":
        return "7 ngày qua";
      case "last_month":
        return "Tháng trước";
      default:
        return "Tháng này";
    }
  };

  const currentHotelName =
    myHotels.find((h) => String(h.id) === String(selectedHotelId))?.name ||
    "Chi nhánh trung tâm";

  return (
    <div className="space-y-6 font-sans text-slate-800 pb-12 bg-slate-100/40 min-h-screen p-2 md:p-4">
      {apiError && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2 font-semibold">
          <AlertCircle size={15} /> <span>{apiError}</span>
        </div>
      )}

      {loading ? (
        <div className="py-24 flex justify-center bg-white rounded-2xl border">
          <LoadingSpinner size="lg" label="Đang tải hệ thống thống kê..." />
        </div>
      ) : (
        <>
          {/* ─── 1. CÔNG SUẤT PHÒNG HIỆN TẠI ─── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h2 className="text-xs font-black uppercase text-slate-700 tracking-wider">
                Công suất phòng hiện tại
              </h2>
              <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600">
                <MapPin size={14} />
                <select
                  value={selectedHotelId}
                  onChange={(e) => setSelectedHotelId(e.target.value)}
                  className="bg-transparent outline-none cursor-pointer font-bold text-blue-600"
                >
                  <option value="all">Tất cả chi nhánh</option>
                  {myHotels.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 divide-y md:divide-y-0 md:divide-x divide-slate-100">
              {/* Đang có khách */}
              <div className="flex items-center gap-5 pt-2 md:pt-0">
                <div className="relative w-16 h-16 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="32"
                      cy="32"
                      r="26"
                      stroke="#f1f5f9"
                      strokeWidth="6"
                      fill="transparent"
                    />
                    <circle
                      cx="32"
                      cy="32"
                      r="26"
                      stroke="#10b981"
                      strokeWidth="6"
                      fill="transparent"
                      strokeDasharray="163"
                      strokeDashoffset={
                        163 - (163 * stats.occupancyCurrent.rate) / 100
                      }
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute text-xs font-black text-slate-800">
                    {stats.occupancyCurrent.rate}%
                  </span>
                </div>
                <div>
                  <div className="text-sm font-black text-slate-900">
                    {stats.occupancyCurrent.occupied} /{" "}
                    {stats.occupancyCurrent.total} phòng
                  </div>
                  <div className="text-xs font-semibold text-slate-500">
                    Đang có khách
                  </div>
                </div>
              </div>

              {/* Đang trống */}
              <div className="flex items-center gap-5 pl-0 md:pl-6 pt-4 md:pt-0">
                <div className="relative w-16 h-16 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="32"
                      cy="32"
                      r="26"
                      stroke="#f1f5f9"
                      strokeWidth="6"
                      fill="transparent"
                    />
                    <circle
                      cx="32"
                      cy="32"
                      r="26"
                      stroke="#f59e0b"
                      strokeWidth="6"
                      fill="transparent"
                      strokeDasharray="163"
                      strokeDashoffset={
                        163 - (163 * stats.occupancyCurrent.vacantRate) / 100
                      }
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute text-xs font-black text-slate-800">
                    {stats.occupancyCurrent.vacantRate}%
                  </span>
                </div>
                <div>
                  <div className="text-sm font-black text-slate-900">
                    {stats.occupancyCurrent.vacant} /{" "}
                    {stats.occupancyCurrent.total} phòng
                  </div>
                  <div className="text-xs font-semibold text-slate-500">
                    Đang trống
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ─── 2. BIỂU ĐỒ CÔNG SUẤT SỬ DỤNG PHÒNG THÁNG NÀY ─── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 relative">
              <h2 className="text-xs font-black uppercase text-slate-700 tracking-wider">
                Công suất sử dụng phòng {getTimeRangeLabel().toLowerCase()}
              </h2>
              <button
                onClick={() => setIsTimeDropdownOpen(!isTimeDropdownOpen)}
                className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer bg-blue-50 px-3 py-1.5 rounded-lg"
              >
                <span>{getTimeRangeLabel()}</span>
                <ChevronDown size={14} />
              </button>

              {isTimeDropdownOpen && (
                <div className="absolute right-0 top-12 z-50 bg-white shadow-xl border border-slate-200 rounded-xl py-1 w-40 text-xs font-semibold">
                  {[
                    { id: "today", label: "Hôm nay" },
                    { id: "yesterday", label: "Hôm qua" },
                    { id: "7days", label: "7 ngày qua" },
                    { id: "this_month", label: "Tháng này" },
                    { id: "last_month", label: "Tháng trước" },
                  ].map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        setTimeRange(item.id);
                        setIsTimeDropdownOpen(false);
                      }}
                      className={`px-3 py-2 cursor-pointer hover:bg-slate-50 flex justify-between items-center ${
                        timeRange === item.id
                          ? "text-blue-600 font-bold bg-blue-50/50"
                          : "text-slate-700"
                      }`}
                    >
                      <span>{item.label}</span>
                      {timeRange === item.id && (
                        <span className="text-blue-600">✓</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.occupancyTimeline}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#f1f5f9"
                  />
                  <XAxis
                    dataKey="day"
                    stroke="#94a3b8"
                    fontSize={11}
                    interval={0}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    domain={[0, 100]}
                    ticks={[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]}
                    interval={0}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip formatter={(v) => [`${v}%`, "Công suất"]} />
                  <Line
                    type="monotone"
                    dataKey="rate"
                    stroke="#0284c7"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "#0284c7" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-2 pt-1 text-xs font-semibold text-slate-600">
              <span className="w-3 h-3 bg-blue-500 rounded-xs inline-block" />
              <span>{currentHotelName}</span>
            </div>
          </div>

          {/* ─── 3. BIỂU ĐỒ DOANH THU THUẦN (CHUẨN ẢNH MẪU) ─── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 space-y-4">
            <div className="flex justify-between items-center relative">
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-black uppercase text-slate-700 tracking-wider">
                  DOANH THU THUẦN THÁNG NÀY
                </h2>
                <div className="flex items-center gap-1 text-sm font-black text-[#0284c7]">
                  <span className="w-4 h-4 rounded-full border-2 border-[#0284c7] flex items-center justify-center text-[10px]">
                    ➔
                  </span>
                  <span>{stats.revenueTotal?.toLocaleString("vi-VN")}</span>
                </div>
              </div>

              <button
                onClick={() => setIsTimeDropdownOpen(!isTimeDropdownOpen)}
                className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
              >
                <span>{getTimeRangeLabel()}</span>
                <ChevronDown size={14} />
              </button>
            </div>

            {/* Thanh Tab gạch chân */}
            <div className="flex items-center gap-6 border-b border-slate-100 text-xs font-bold pb-2">
              <button
                onClick={() => setRevenueTab("day")}
                className={`pb-2 relative transition cursor-pointer ${
                  revenueTab === "day"
                    ? "text-[#0284c7] font-black after:content-[''] after:absolute after:bottom-[-9px] after:left-0 after:w-full after:h-0.5 after:bg-[#0284c7]"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Theo ngày
              </button>
              <button
                onClick={() => setRevenueTab("hour")}
                className={`pb-2 relative transition cursor-pointer ${
                  revenueTab === "hour"
                    ? "text-[#0284c7] font-black after:content-[''] after:absolute after:bottom-[-9px] after:left-0 after:w-full after:h-0.5 after:bg-[#0284c7]"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Theo giờ
              </button>
              <button
                onClick={() => setRevenueTab("weekday")}
                className={`pb-2 relative transition cursor-pointer ${
                  revenueTab === "weekday"
                    ? "text-[#0284c7] font-black after:content-[''] after:absolute after:bottom-[-9px] after:left-0 after:w-full after:h-0.5 after:bg-[#0284c7]"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Theo thứ
              </button>
            </div>

            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.revenueTimeline} barCategoryGap="28%">
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#f1f5f9"
                  />
                  <XAxis
                    dataKey="label"
                    stroke="#94a3b8"
                    fontSize={11}
                    interval={0}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickFormatter={(v) => {
                      if (v === 0) return "0";
                      return `${Math.round(v / 1000000)} tr`;
                    }}
                  />
                  <Tooltip
                    formatter={(v) => [
                      Number(v || 0).toLocaleString("vi-VN") + " ₫",
                      "Doanh thu",
                    ]}
                  />
                  <Bar
                    dataKey="revenue"
                    fill="#0284c7"
                    radius={[0, 0, 0, 0]}
                    maxBarSize={36}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="flex items-center justify-center gap-2 pt-1 text-xs font-semibold text-slate-600">
              <span className="w-3 h-3 bg-[#0284c7] rounded-xs inline-block" />
              <span>{currentHotelName}</span>
            </div>
          </div>

          {/* ─── 4. TOP 10 HẠNG PHÒNG (PHÒNG 01 GIƯỜNG ĐƠN...) ─── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-black uppercase text-slate-700 tracking-wider">
                  TOP 10 HẠNG PHÒNG TẠI {currentHotelName.toUpperCase()}{" "}
                  {getTimeRangeLabel().toUpperCase()}
                </h2>
                <span className="text-xs font-bold text-[#0284c7] cursor-pointer">
                  THEO DOANH THU ▾
                </span>
              </div>

              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-lg">
                {getTimeRangeLabel()}
              </span>
            </div>

            <div className="h-56 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={stats.topRooms}
                  barCategoryGap="25%"
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={false}
                    stroke="#f1f5f9"
                  />
                  <XAxis
                    type="number"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickFormatter={(v) => {
                      if (v === 0) return "0";
                      if (v >= 1000000) return `${v / 1000000}M`;
                      return `${v / 1000}k`;
                    }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="#475569"
                    fontSize={11}
                    width={160}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="bg-[#0284c7] text-white px-3 py-1.5 rounded-md text-xs font-bold shadow-lg">
                            {Number(d.revenue).toLocaleString("vi-VN")} -{" "}
                            {d.name}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar
                    dataKey="revenue"
                    fill="#0284c7"
                    radius={[0, 0, 0, 0]}
                    maxBarSize={30}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
