// src/pages/owner/DashboardPage.jsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import { AlertCircle, ChevronDown, MapPin } from "lucide-react";
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

const TIME_OPTIONS = [
  { id: "today", label: "Hôm nay" },
  { id: "yesterday", label: "Hôm qua" },
  { id: "7days", label: "7 ngày qua" },
  { id: "this_month", label: "Tháng này" },
  { id: "last_month", label: "Tháng trước" },
];

const METRIC_OPTIONS = [
  { id: "revenue", label: "THEO DOANH THU" },
  { id: "quantity", label: "THEO SỐ LƯỢNG" },
];

function calculateSmartTicks(maxVal, defaultMin = 200000) {
  const target = Math.max(maxVal || 0, defaultMin);
  const rawStep = target / 8;
  const power = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const frac = rawStep / power;
  let step;
  if (frac <= 1.2) step = 1 * power;
  else if (frac <= 2.2) step = 2 * power;
  else if (frac <= 3) step = 2.5 * power;
  else if (frac <= 6) step = 5 * power;
  else step = 10 * power;

  const maxDomain = Math.ceil(target / step) * step;
  const ticks = [];
  for (let v = 0; v <= maxDomain; v += step) {
    ticks.push(v);
  }
  return { maxDomain, ticks };
}

function TimeRangeDropdown({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentLabel =
    TIME_OPTIONS.find((opt) => opt.id === value)?.label || "Tháng này";

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer bg-slate-100 hover:bg-slate-200/80 px-2.5 py-1 rounded transition border border-slate-200/60"
      >
        <span>{currentLabel}</span>
        <ChevronDown
          size={13}
          className={`transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 z-50 bg-white shadow-xl border border-slate-200 rounded-xl py-1 w-36 text-xs font-semibold">
          {TIME_OPTIONS.map((item) => (
            <button
              type="button"
              key={item.id}
              onClick={() => {
                onChange(item.id);
                setIsOpen(false);
              }}
              className={`w-full px-3 py-2 cursor-pointer hover:bg-slate-50 flex justify-between items-center text-left ${
                value === item.id
                  ? "text-blue-600 font-bold bg-blue-50/60"
                  : "text-slate-700"
              }`}
            >
              <span>{item.label}</span>
              {value === item.id && <span className="text-blue-600">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MetricDropdown({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentLabel =
    METRIC_OPTIONS.find((item) => item.id === value)?.label || "THEO DOANH THU";

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 bg-slate-100 hover:bg-slate-200/80 px-2.5 py-1 rounded transition cursor-pointer border border-slate-200/60"
      >
        <span>{currentLabel}</span>
        <ChevronDown
          size={13}
          className={`transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 z-50 bg-white shadow-xl border border-slate-200 rounded-xl py-1 w-40 text-xs font-semibold">
          {METRIC_OPTIONS.map((item) => (
            <button
              type="button"
              key={item.id}
              onClick={() => {
                onChange(item.id);
                setIsOpen(false);
              }}
              className={`w-full px-3 py-2 cursor-pointer hover:bg-slate-50 flex justify-between items-center text-left ${
                value === item.id
                  ? "text-blue-600 font-bold bg-blue-50/60"
                  : "text-slate-700"
              }`}
            >
              <span>{item.label}</span>
              {value === item.id && <span className="text-blue-600">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function OwnerDashboardPage() {
  const [initialLoading, setInitialLoading] = useState(true);
  const [apiError, setApiError] = useState("");
  const [myHotels, setMyHotels] = useState([]);
  const [selectedHotelId, setSelectedHotelId] = useState("all");

  const [timeRange, setTimeRange] = useState("this_month");
  const [revenueTab, setRevenueTab] = useState("day");
  const [topRoomMetric, setTopRoomMetric] = useState("revenue");

  // TOÀN BỘ GIÁ TRỊ KHỞI TẠO ĐÃ ĐƯỢC ĐƯA VỀ 0
  const [stats, setStats] = useState({
    occupancyCurrent: {
      occupied: 0,
      vacant: 0,
      total: 0,
      rate: 0,
      vacantRate: 0,
    },
    revenueTotal: 0,
    occupancyTimeline: [],
    revenueTimeline: [],
    topRooms: [],
  });

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
    setApiError("");
    try {
      const res = await apiClient.get(
        `/owner/stats?hotel_id=${selectedHotelId}&range=${timeRange}&rev_tab=${revenueTab}&top_metric=${topRoomMetric}`,
      );
      setStats({
        occupancyCurrent: res.occupancyCurrent || {
          occupied: 0,
          vacant: 0,
          total: 0,
          rate: 0,
          vacantRate: 0,
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
      setInitialLoading(false);
    }
  }, [selectedHotelId, timeRange, revenueTab, topRoomMetric]);

  useEffect(() => {
    fetchHotels();
  }, [fetchHotels]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const getTimeRangeLabel = () => {
    const found = TIME_OPTIONS.find((item) => item.id === timeRange);
    return found ? found.label : "Tháng này";
  };

  const currentHotelName =
    myHotels.find((h) => String(h.id) === String(selectedHotelId))?.name ||
    "Chi nhánh trung tâm";

  const metricKey = topRoomMetric === "revenue" ? "revenue" : "quantity";
  const processedTopRooms = (stats.topRooms || []).map((r) => ({
    ...r,
    quantity: Number(r.quantity ?? r.count ?? r.bookings_count ?? 0),
    revenue: Number(r.revenue ?? 0),
  }));
  processedTopRooms.sort((a, b) => (b[metricKey] || 0) - (a[metricKey] || 0));

  const maxRoomRevenue = Math.max(
    ...processedTopRooms.map((r) => r.revenue || 0),
    0,
  );
  const { maxDomain: top10MaxDomain, ticks: top10RevenueTicks } =
    calculateSmartTicks(maxRoomRevenue, 200000);

  const quantityTicks = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

  const maxDayRevenue = Math.max(
    ...stats.revenueTimeline.map((d) => Number(d.revenue || 0)),
    0,
  );
  const minRevenueChartTarget = maxDayRevenue > 10000000 ? 200000000 : 250000;
  const { maxDomain: revenueChartMaxDomain, ticks: revenueChartTicks } =
    calculateSmartTicks(maxDayRevenue, minRevenueChartTarget);

  return (
    <div className="space-y-6 font-sans text-slate-800 pb-12 bg-slate-100/40 min-h-screen p-2 md:p-4">
      {apiError && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2 font-semibold">
          <AlertCircle size={15} /> <span>{apiError}</span>
        </div>
      )}

      {initialLoading ? (
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

          {/* ─── 2. BIỂU ĐỒ CÔNG SUẤT SỬ DỤNG PHÒNG ─── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h2 className="text-xs font-black uppercase text-slate-700 tracking-wider">
                Công suất sử dụng phòng {getTimeRangeLabel().toLowerCase()}
              </h2>
              <TimeRangeDropdown value={timeRange} onChange={setTimeRange} />
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={stats.occupancyTimeline}
                  margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="none"
                    vertical={false}
                    stroke="#e2e8f0"
                  />
                  <XAxis
                    dataKey="day"
                    stroke="#94a3b8"
                    fontSize={11}
                    interval={0}
                    axisLine={{ stroke: "#cbd5e1" }}
                    tickLine={{ stroke: "#cbd5e1" }}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    domain={[0, 100]}
                    ticks={[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]}
                    interval={0}
                    axisLine={{ stroke: "#cbd5e1" }}
                    tickLine={{ stroke: "#cbd5e1" }}
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

          {/* ─── 3. BIỂU ĐỒ DOANH THU THUẦN ─── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 space-y-4">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-black uppercase text-slate-700 tracking-wider">
                  DOANH THU THUẦN {getTimeRangeLabel().toUpperCase()}
                </h2>
                <div className="flex items-center gap-1.5 text-sm font-bold text-[#0284c7]">
                  <span className="w-4 h-4 rounded-full border border-[#0284c7] flex items-center justify-center text-[10px]">
                    ➔
                  </span>
                  <span>
                    {Number(stats.revenueTotal || 0).toLocaleString("en-US")}
                  </span>
                </div>
              </div>

              <TimeRangeDropdown value={timeRange} onChange={setTimeRange} />
            </div>

            <div className="flex items-center gap-6 border-b border-slate-100 text-xs font-bold pb-2">
              <button
                type="button"
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
                type="button"
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
                type="button"
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
                <BarChart
                  data={stats.revenueTimeline}
                  barCategoryGap="28%"
                  margin={{ top: 10, right: 25, left: 10, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="none"
                    vertical={false}
                    stroke="#e2e8f0"
                  />
                  <XAxis
                    dataKey="label"
                    stroke="#94a3b8"
                    fontSize={11}
                    interval={0}
                    axisLine={{ stroke: "#cbd5e1" }}
                    tickLine={{ stroke: "#cbd5e1" }}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    ticks={revenueChartTicks}
                    domain={[0, revenueChartMaxDomain]}
                    interval={0}
                    axisLine={{ stroke: "#cbd5e1" }}
                    tickLine={{ stroke: "#cbd5e1" }}
                    tickFormatter={(v) => {
                      if (v === 0) return "0";
                      if (v >= 1000000) return `${Math.round(v / 1000000)} tr`;
                      if (v >= 1000) return `${Math.round(v / 1000)}k`;
                      return v;
                    }}
                  />
                  <Tooltip
                    cursor={{ fill: "#f1f5f9" }}
                    wrapperStyle={{ zIndex: 1000, pointerEvents: "none" }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="bg-[#0284c7] text-white px-2.5 py-1 rounded text-xs font-semibold shadow-md whitespace-nowrap">
                            {currentHotelName}:{" "}
                            {Number(d.revenue || 0).toLocaleString("en-US")}
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
                    maxBarSize={36}
                    cursor="pointer"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="flex items-center justify-center gap-2 pt-1 text-xs font-semibold text-slate-600">
              <span className="w-3 h-3 bg-[#0284c7] rounded-xs inline-block" />
              <span>{currentHotelName}</span>
            </div>
          </div>

          {/* ─── 4. BIỂU ĐỒ TOP 10 HẠNG PHÒNG ─── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xs font-black uppercase text-slate-700 tracking-wider">
                  TOP 10 HẠNG PHÒNG TẠI {currentHotelName.toUpperCase()}{" "}
                  {getTimeRangeLabel().toUpperCase()}
                </h2>

                <MetricDropdown
                  value={topRoomMetric}
                  onChange={setTopRoomMetric}
                />
              </div>

              <TimeRangeDropdown value={timeRange} onChange={setTimeRange} />
            </div>

            <div className="h-56 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={processedTopRooms}
                  barCategoryGap="25%"
                  margin={{ top: 5, right: 35, left: 10, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="none"
                    horizontal={false}
                    vertical={true}
                    stroke="#e2e8f0"
                  />
                  <XAxis
                    type="number"
                    stroke="#94a3b8"
                    fontSize={11}
                    interval={0}
                    ticks={
                      topRoomMetric === "quantity"
                        ? quantityTicks
                        : top10RevenueTicks
                    }
                    domain={
                      topRoomMetric === "quantity"
                        ? [0, 11]
                        : [0, top10MaxDomain]
                    }
                    axisLine={{ stroke: "#cbd5e1" }}
                    tickLine={{ stroke: "#cbd5e1" }}
                    tickFormatter={(v) => {
                      if (v === 0) return "0";
                      if (topRoomMetric === "quantity") {
                        return v;
                      }
                      if (v >= 1000000000)
                        return `${+(v / 1000000000).toFixed(1)} tỷ`;
                      if (v >= 1000000)
                        return `${+(v / 1000000).toFixed(1)} tr`;
                      if (v >= 1000) return `${Math.round(v / 1000)}k`;
                      return v;
                    }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="#475569"
                    fontSize={11}
                    width={160}
                    axisLine={{ stroke: "#cbd5e1" }}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: "#f1f5f9" }}
                    wrapperStyle={{ zIndex: 1000, pointerEvents: "none" }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        const displayVal =
                          topRoomMetric === "revenue"
                            ? Number(d.revenue || 0).toLocaleString("en-US")
                            : d.quantity || 0;

                        return (
                          <div className="bg-[#0284c7] text-white px-2.5 py-1 rounded text-xs font-semibold shadow-md whitespace-nowrap">
                            {displayVal} - {d.name}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar
                    dataKey={metricKey}
                    fill="#0284c7"
                    radius={[0, 0, 0, 0]}
                    maxBarSize={30}
                    cursor="pointer"
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
