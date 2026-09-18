// src/pages/owner/DashboardPage.jsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  AlertCircle,
  ChevronDown,
  Building2,
  CreditCard,
  CheckCircle2,
  ShieldAlert,
  Info,
  Clock,
  X,
  TrendingDown,
  ChevronRight,
  LineChart as LineIcon,
  BarChart2,
} from "lucide-react";
import {
  BarChart,
  Bar,
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

const TIME_OPTIONS = [
  { id: "today", label: "Hôm nay" },
  { id: "yesterday", label: "Hôm qua" },
  { id: "7days", label: "7 ngày qua" },
  { id: "this_month", label: "Tháng này" },
  { id: "last_month", label: "Tháng trước" },
];

function calculateSmartTicks(maxVal) {
  const target = Math.max(maxVal || 0, 500000);
  const rawStep = target / 4;
  const power = Math.pow(10, Math.floor(Math.log10(rawStep))) || 1;
  const frac = rawStep / power;
  let step;
  if (frac <= 1.2) step = 1 * power;
  else if (frac <= 2.5) step = 2.5 * power;
  else if (frac <= 5) step = 5 * power;
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
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition cursor-pointer shadow-2xs"
      >
        <span>{currentLabel}</span>
        <ChevronDown
          size={13}
          className={`text-gray-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 z-40 bg-white shadow-xl border border-gray-100 rounded-xl py-1.5 min-w-[130px] text-xs">
          {TIME_OPTIONS.map((item) => (
            <button
              type="button"
              key={item.id}
              onClick={() => {
                onChange(item.id);
                setIsOpen(false);
              }}
              className={`w-full px-3.5 py-2 text-left flex items-center justify-between cursor-pointer transition ${
                value === item.id
                  ? "bg-blue-50 text-[#006ce4] font-bold"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <span>{item.label}</span>
              {value === item.id && <span className="text-[#006ce4]">✓</span>}
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

  const [revenueTimeRange, setRevenueTimeRange] = useState("this_month");
  const [occupancyTimeRange, setOccupancyTimeRange] = useState("this_month");

  const [bookingValueTab, setBookingValueTab] = useState("stay_date");
  const [occupancyLeftTab, setOccupancyLeftTab] = useState("day");
  const [occupancyRightTab, setOccupancyRightTab] = useState("room_type");

  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState("payment");
  const [actionStatus, setActionStatus] = useState("");

  const [stats, setStats] = useState({
    occupancyCurrent: {
      occupied: 0,
      vacant: 0,
      total: 0,
      rate: 0,
      vacantRate: 0,
    },
    staying: {
      totalGuests: 0,
      adults: 0,
      children: 0,
    },
    housekeeping: {
      waitingClean: 0,
      occupiedAndWaitingClean: 0,
    },
    automationSummary: {
      autoReconciledToday: 0,
      autoReconciledAmount: 0,
      paymentAlerts: [],
      leakAlerts: [],
      totalUnpaidAmount: 0,
      potentialLeakTotal: 0,
    },
    channelStats: {
      directAmount: 0,
      directCount: 0,
      directPercent: 0,
      onlineAmount: 0,
      onlineCount: 0,
      onlinePercent: 0,
      cancelledAmount: 0,
      cancelledCount: 0,
      chartData: [],
    },
    stayDateStats: {
      totalAmount: 0,
      totalCount: 0,
      growthRate: 0,
      growthLabel: "so với kỳ trước",
      chartData: [],
    },
    occupancyAnalytics: {
      hasData: false,
      avgRate: null,
      timelineDay: [],
      timelineWeekday: [],
      byRoomType: [],
      byArea: [],
    },
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
        `/owner/stats?hotel_id=${selectedHotelId}&revenue_range=${revenueTimeRange}&occupancy_range=${occupancyTimeRange}`,
      );

      const totalOccupied = res.occupancyCurrent?.occupied || 0;

      // 🌟 ĐẢM BẢO LUÔN CÓ DỮ LIỆU ĐỂ VẼ BIỂU ĐỒ KÊNH BÁN
      const chStats = res.channelStats || {};
      const directAmt = Number(chStats.directAmount || 0);
      const onlineAmt = Number(chStats.onlineAmount || 0);

      const resolvedChannelChartData =
        Array.isArray(chStats.chartData) && chStats.chartData.length > 0
          ? chStats.chartData
          : [
              {
                name: "Khách trực tiếp",
                booked: directAmt,
                count: chStats.directCount || 0,
              },
              {
                name: "Khách đặt online",
                booked: onlineAmt,
                count: chStats.onlineCount || 0,
              },
            ];

      // 🌟 ĐẢM BẢO BIỂU ĐỒ THEO NGÀY CÓ MẢNG HỢP LỆ
      const sDateStats = res.stayDateStats || {};
      const resolvedStayChartData = Array.isArray(sDateStats.chartData)
        ? sDateStats.chartData
        : [];

      setStats({
        occupancyCurrent: res.occupancyCurrent || {
          occupied: 0,
          vacant: 0,
          total: 0,
          rate: 0,
          vacantRate: 0,
        },
        staying: res.staying || {
          totalGuests: res.stayingTotalGuests || totalOccupied,
          adults: res.stayingAdults || totalOccupied,
          children: res.stayingChildren || 0,
        },
        housekeeping: res.housekeeping || {
          waitingClean: 0,
          occupiedAndWaitingClean: 0,
        },
        automationSummary: res.automationSummary || {
          autoReconciledToday: 0,
          autoReconciledAmount: 0,
          paymentAlerts: [],
          leakAlerts: [],
          totalUnpaidAmount: 0,
          potentialLeakTotal: 0,
        },
        channelStats: {
          ...chStats,
          directAmount: directAmt,
          onlineAmount: onlineAmt,
          chartData: resolvedChannelChartData,
        },
        stayDateStats: {
          ...sDateStats,
          chartData: resolvedStayChartData,
        },
        occupancyAnalytics: res.occupancyAnalytics || {
          hasData: false,
          avgRate: null,
          timelineDay: [],
          timelineWeekday: [],
          byRoomType: [],
          byArea: [],
        },
      });
    } catch (err) {
      setApiError(err.message || "Không thể tải báo cáo từ máy chủ.");
    } finally {
      setInitialLoading(false);
    }
  }, [selectedHotelId, revenueTimeRange, occupancyTimeRange]);

  useEffect(() => {
    fetchHotels();
  }, [fetchHotels]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Tính toán Ticks thông minh cho trục Y
  const maxBookingVal = Math.max(
    Number(stats.channelStats.directAmount || 0),
    Number(stats.channelStats.onlineAmount || 0),
    Number(stats.stayDateStats.totalAmount || 0),
    ...(stats.stayDateStats.chartData || []).map((d) => Number(d.amount || 0)),
    500000,
  );
  const { maxDomain: channelMaxDomain, ticks: channelTicks } =
    calculateSmartTicks(maxBookingVal);

  const currentOccupancyLineData =
    occupancyLeftTab === "day"
      ? stats.occupancyAnalytics.timelineDay
      : stats.occupancyAnalytics.timelineWeekday;

  const currentOccupancyBarData =
    occupancyRightTab === "room_type"
      ? stats.occupancyAnalytics.byRoomType
      : stats.occupancyAnalytics.byArea;

  const selectedHotelName =
    selectedHotelId === "all"
      ? "Chi nhánh trung tâm"
      : myHotels.find((h) => String(h.id) === String(selectedHotelId))?.name ||
        "Chi nhánh trung tâm";

  return (
    <div className="w-full pb-24 bg-[#f4f6f9] font-sans text-gray-900 min-h-screen p-4 sm:p-6 lg:p-7 space-y-4">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-xs">
        <div>
          <div className="text-xs font-black text-[#006ce4] uppercase tracking-wider mb-0.5">
            Hệ thống Quản trị GoStay
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
            Tổng quan Hoạt động
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 shadow-xs">
            <Building2 size={16} className="text-[#006ce4] shrink-0" />
            <span className="text-xs text-gray-500 font-medium">
              Chi nhánh:
            </span>
            <select
              value={selectedHotelId}
              onChange={(e) => setSelectedHotelId(e.target.value)}
              className="bg-transparent text-xs font-bold text-gray-900 outline-none cursor-pointer pr-1"
            >
              <option value="all">Chi nhánh trung tâm</option>
              {myHotels.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {apiError && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-2xl flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{apiError}</span>
        </div>
      )}

      {initialLoading ? (
        <div className="py-28 flex justify-center bg-white rounded-3xl border border-gray-200 shadow-sm">
          <LoadingSpinner size="lg" label="Đang tải dữ liệu kinh doanh..." />
        </div>
      ) : (
        <>
          {/* HÀNG 3 THẺ TỔNG QUAN */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="text-sm font-bold text-gray-900">
                    Công suất
                  </div>
                </div>
                <div className="mt-2.5">
                  <div className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                    {stats.occupancyCurrent.occupied} phòng (
                    {stats.occupancyCurrent.rate}%)
                  </div>
                  <div className="text-xs text-gray-500 font-medium mt-0.5">
                    Đang có khách
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4 pt-3 text-xs text-gray-700 font-medium border-t border-gray-100">
                <span className="w-2.5 h-2.5 rounded-full bg-[#006ce4] shrink-0" />
                <span>Tổng: {stats.occupancyCurrent.total} phòng</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="text-sm font-bold text-gray-900">Lưu trú</div>
                </div>
                <div className="mt-2.5">
                  <div className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                    {stats.staying.totalGuests} khách
                  </div>
                  <div className="text-xs text-gray-500 font-medium mt-0.5">
                    Đang lưu trú
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4 pt-3 text-xs text-gray-700 font-medium border-t border-gray-100">
                <span className="w-2.5 h-2.5 rounded-full bg-[#006ce4] shrink-0" />
                <span>
                  Người lớn: {stats.staying.adults}, Trẻ em:{" "}
                  {stats.staying.children}
                </span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="text-sm font-bold text-gray-900">
                    Buồng phòng
                  </div>
                </div>
                <div className="mt-2.5">
                  <div className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                    {stats.housekeeping.waitingClean} phòng
                  </div>
                  <div className="text-xs text-gray-500 font-medium mt-0.5">
                    Đang chờ dọn
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4 pt-3 text-xs text-gray-700 font-medium border-t border-gray-100">
                <span className="w-2.5 h-2.5 rounded-full bg-[#006ce4] shrink-0" />
                <span>
                  Khách ở & chờ dọn:{" "}
                  {stats.housekeeping.occupiedAndWaitingClean} phòng
                </span>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════════ */}
          {/* 🌟 BIỂU ĐỒ 1: GIÁ TRỊ ĐẶT PHÒNG 🌟 */}
          {/* ═══════════════════════════════════════════════════════════════════════ */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900 tracking-tight">
                Giá trị đặt phòng
              </h2>
              <TimeRangeDropdown
                value={revenueTimeRange}
                onChange={setRevenueTimeRange}
              />
            </div>

            {/* TAB: THEO KÊNH BÁN & THEO NGÀY LƯU TRÚ */}
            <div className="flex items-center gap-6 border-b border-gray-100 text-xs font-semibold pt-1">
              <button
                type="button"
                onClick={() => setBookingValueTab("stay_date")}
                className={`pb-2.5 transition relative cursor-pointer ${
                  bookingValueTab === "stay_date"
                    ? "text-[#006ce4] font-bold after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2.5px] after:bg-[#006ce4]"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                Theo ngày lưu trú
              </button>
              <button
                type="button"
                onClick={() => setBookingValueTab("channel")}
                className={`pb-2.5 transition relative cursor-pointer ${
                  bookingValueTab === "channel"
                    ? "text-[#006ce4] font-bold after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2.5px] after:bg-[#006ce4]"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                Theo kênh bán
              </button>
            </div>

            {/* TAB 1: THEO NGÀY LƯU TRÚ */}
            {bookingValueTab === "stay_date" ? (
              <div className="space-y-4">
                <div className="w-fit min-w-[240px] p-4 bg-white border border-gray-200 rounded-2xl space-y-1.5 shadow-2xs">
                  <div className="text-xs text-gray-700 font-bold">
                    Tổng tiền phòng
                  </div>
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight tabular-nums">
                      {Number(
                        stats.stayDateStats.totalAmount || 0,
                      ).toLocaleString("vi-VN")}{" "}
                      đ
                    </span>
                    <span className="text-xs font-bold text-emerald-600">
                      ↗ {stats.stayDateStats.growthRate || 0}%{" "}
                      {stats.stayDateStats.growthLabel || ""}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 font-medium">
                    {stats.stayDateStats.totalCount || 0} lượt đặt phòng
                  </div>
                </div>

                <div className="h-64 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={stats.stayDateStats.chartData}
                      barCategoryGap="35%"
                      margin={{ top: 15, right: 20, left: 10, bottom: 5 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#edf2f7"
                      />
                      <XAxis
                        dataKey="label"
                        stroke="#94a3b8"
                        fontSize={11}
                        tickLine={false}
                        axisLine={{ stroke: "#e2e8f0" }}
                      />
                      <YAxis
                        stroke="#94a3b8"
                        fontSize={11}
                        ticks={channelTicks}
                        domain={[0, channelMaxDomain]}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => {
                          if (v === 0) return "0";
                          if (v >= 1000000) return `${v / 1000000}tr`;
                          if (v >= 1000) return `${v / 1000}k`;
                          return v;
                        }}
                      />
                      <Tooltip
                        cursor={{ fill: "rgba(0, 108, 228, 0.04)" }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const d = payload[0].payload;
                            return (
                              <div className="bg-white text-gray-800 border border-gray-200 px-3 py-2 rounded-xl text-xs shadow-xl space-y-1">
                                <div className="font-bold text-gray-900 border-b border-gray-100 pb-1">
                                  Ngày {d.label}
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-[#006ce4]" />
                                  <span className="text-gray-600">
                                    Doanh thu:
                                  </span>
                                  <span className="font-black text-[#003580]">
                                    {Number(d.amount || 0).toLocaleString(
                                      "vi-VN",
                                    )}{" "}
                                    đ
                                  </span>
                                </div>
                                <div className="text-[11px] text-gray-500">
                                  {d.booking_count || 0} lượt đặt
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar
                        dataKey="amount"
                        fill="#006ce4"
                        radius={[8, 8, 0, 0]}
                        maxBarSize={36}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              /* TAB 2: THEO KÊNH BÁN */
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-white border border-gray-200 rounded-2xl space-y-2 shadow-2xs">
                    <div className="text-xs text-gray-600 font-bold">
                      Khách đến trực tiếp
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl sm:text-2xl font-black text-gray-900 tabular-nums">
                        {Number(
                          stats.channelStats.directAmount || 0,
                        ).toLocaleString("vi-VN")}{" "}
                        đ
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200">
                        {stats.channelStats.directPercent || 0}%
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-500">
                      {stats.channelStats.directCount || 0} đặt phòng
                    </div>
                  </div>

                  <div className="p-4 bg-white border border-gray-200 rounded-2xl space-y-2 shadow-2xs">
                    <div className="text-xs text-gray-600 font-bold">
                      Khách đặt online
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl sm:text-2xl font-black text-gray-900 tabular-nums">
                        {Number(
                          stats.channelStats.onlineAmount || 0,
                        ).toLocaleString("vi-VN")}{" "}
                        đ
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200">
                        {stats.channelStats.onlinePercent || 0}%
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-500">
                      {stats.channelStats.onlineCount || 0} đặt phòng
                    </div>
                  </div>
                </div>

                <div className="h-64 w-full pt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={stats.channelStats.chartData}
                      barCategoryGap="45%"
                      margin={{ top: 15, right: 30, left: 10, bottom: 5 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#edf2f7"
                      />
                      <XAxis
                        dataKey="name"
                        stroke="#94a3b8"
                        fontSize={11}
                        tickLine={false}
                        axisLine={{ stroke: "#e2e8f0" }}
                      />
                      <YAxis
                        stroke="#94a3b8"
                        fontSize={11}
                        ticks={channelTicks}
                        domain={[0, channelMaxDomain]}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) =>
                          v >= 1000000
                            ? `${v / 1000000}tr`
                            : v >= 1000
                              ? `${v / 1000}k`
                              : v
                        }
                      />
                      <Tooltip
                        cursor={{ fill: "rgba(0, 108, 228, 0.04)" }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const d = payload[0].payload;
                            return (
                              <div className="bg-white text-gray-800 border border-gray-200 px-3 py-2 rounded-xl text-xs shadow-xl space-y-1">
                                <div className="font-bold text-gray-900 border-b border-gray-100 pb-1">
                                  {d.name}
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-[#006ce4]" />
                                  <span className="text-gray-600">
                                    Giá trị:
                                  </span>
                                  <span className="font-black text-[#003580]">
                                    {Number(d.booked || 0).toLocaleString(
                                      "vi-VN",
                                    )}{" "}
                                    đ
                                  </span>
                                </div>
                                <div className="text-[11px] text-gray-500">
                                  {d.count || 0} lượt đặt
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar
                        dataKey="booked"
                        fill="#006ce4"
                        radius={[8, 8, 0, 0]}
                        maxBarSize={36}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>

          {/* ═══════════════════════════════════════════════════════════════════════ */}
          {/* 🌟 BIỂU ĐỒ 2: CÔNG SUẤT PHÒNG 🌟 */}
          {/* ═══════════════════════════════════════════════════════════════════════ */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-bold text-gray-900 tracking-tight">
                  Công suất phòng
                </h2>
              </div>
              <TimeRangeDropdown
                value={occupancyTimeRange}
                onChange={setOccupancyTimeRange}
              />
            </div>

            <div className="w-fit min-w-[170px] p-3.5 bg-gray-50/50 border border-gray-200 rounded-xl space-y-1">
              <div className="text-xs text-gray-600 font-medium">
                Trung bình
              </div>
              <div className="text-2xl font-black text-gray-900 tracking-tight tabular-nums">
                {stats.occupancyAnalytics.avgRate !== null
                  ? `${stats.occupancyAnalytics.avgRate}%`
                  : "—"}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-2">
              <div className="lg:col-span-7 space-y-3 border-r border-gray-100 pr-0 lg:pr-6">
                <div className="flex items-center gap-6 border-b border-gray-100 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setOccupancyLeftTab("day")}
                    className={`pb-2 transition relative cursor-pointer ${
                      occupancyLeftTab === "day"
                        ? "text-[#006ce4] font-bold after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[#006ce4]"
                        : "text-gray-500 hover:text-gray-800"
                    }`}
                  >
                    Theo ngày
                  </button>
                  <button
                    type="button"
                    onClick={() => setOccupancyLeftTab("weekday")}
                    className={`pb-2 transition relative cursor-pointer ${
                      occupancyLeftTab === "weekday"
                        ? "text-[#006ce4] font-bold after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[#006ce4]"
                        : "text-gray-500 hover:text-gray-800"
                    }`}
                  >
                    Theo thứ
                  </button>
                </div>

                <div className="h-60 w-full pt-2">
                  {currentOccupancyLineData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={currentOccupancyLineData}
                        margin={{ top: 10, right: 25, left: -20, bottom: 5 }}
                      >
                        <defs>
                          <linearGradient
                            id="occupancyGrad"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#006ce4"
                              stopOpacity={0.25}
                            />
                            <stop
                              offset="95%"
                              stopColor="#006ce4"
                              stopOpacity={0.0}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="#f1f5f9"
                        />
                        <XAxis
                          dataKey="label"
                          stroke="#94a3b8"
                          fontSize={10}
                          interval={0}
                          axisLine={{ stroke: "#e2e8f0" }}
                          tickLine={false}
                        />
                        <YAxis
                          stroke="#94a3b8"
                          fontSize={11}
                          domain={[0, 100]}
                          ticks={[0, 20, 40, 60, 80, 100]}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          formatter={(v) => [`${v}%`, "Công suất"]}
                          contentStyle={{
                            backgroundColor: "#003580",
                            borderRadius: "10px",
                            border: "none",
                            color: "#fff",
                            fontSize: "11px",
                            fontWeight: "bold",
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="rate"
                          stroke="#006ce4"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#occupancyGrad)"
                          dot={{ r: 3.5, fill: "#006ce4" }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-2">
                      <div className="w-12 h-12 rounded-full bg-blue-50/60 flex items-center justify-center text-[#006ce4]">
                        <LineIcon size={24} />
                      </div>
                      <div className="text-xs font-semibold">
                        Không có dữ liệu trong kỳ này.
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="lg:col-span-5 space-y-4 pl-0 lg:pl-2">
                <div className="flex items-center gap-6 border-b border-gray-100 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setOccupancyRightTab("room_type")}
                    className={`pb-2 transition relative cursor-pointer ${
                      occupancyRightTab === "room_type"
                        ? "text-[#006ce4] font-bold after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[#006ce4]"
                        : "text-gray-500 hover:text-gray-800"
                    }`}
                  >
                    Theo hạng phòng
                  </button>
                  <button
                    type="button"
                    onClick={() => setOccupancyRightTab("area")}
                    className={`pb-2 transition relative cursor-pointer ${
                      occupancyRightTab === "area"
                        ? "text-[#006ce4] font-bold after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[#006ce4]"
                        : "text-gray-500 hover:text-gray-800"
                    }`}
                  >
                    Theo khu vực
                  </button>
                </div>

                <div className="space-y-4 pt-2">
                  {stats.occupancyAnalytics.hasData &&
                  currentOccupancyBarData.length > 0 ? (
                    currentOccupancyBarData.map((item, idx) => (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex justify-between items-center text-xs font-medium text-gray-800">
                          <span>{item.name}</span>
                          <span className="font-bold text-gray-900 tabular-nums">
                            {item.rate}%
                          </span>
                        </div>
                        <div className="w-full bg-[#f1f5f9] h-4 rounded-full overflow-hidden p-0.5">
                          <div
                            className="bg-[#006ce4] h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.min(100, Math.max(0, item.rate))}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="h-48 flex flex-col items-center justify-center text-gray-400 space-y-2">
                      <div className="w-12 h-12 rounded-full bg-blue-50/60 flex items-center justify-center text-[#006ce4]">
                        <BarChart2 size={24} />
                      </div>
                      <div className="text-xs font-semibold">
                        Không có dữ liệu trong kỳ này.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* MODAL CẢNH BÁO */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden border border-gray-200 animate-in zoom-in-95">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-[#003580] text-white">
              <div className="flex items-center gap-2.5">
                {modalType === "leak" ? (
                  <ShieldAlert size={20} />
                ) : (
                  <CreditCard size={20} />
                )}
                <h3 className="text-sm font-black uppercase tracking-wider">
                  {modalType === "leak"
                    ? "Kiểm toán Thất thoát & Rò rỉ Doanh thu"
                    : "Cảnh báo Thanh toán & Thu hồi tiền phòng"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-white/80 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-3 max-h-[65vh] overflow-y-auto">
              {(modalType === "leak"
                ? stats.automationSummary.leakAlerts
                : stats.automationSummary.paymentAlerts
              ).map((item) => (
                <div
                  key={item.id}
                  className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-2.5"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-xs font-black text-gray-900">
                        Phòng {item.room} - Mã: {item.booking_code}
                      </div>
                      <div className="text-[11px] text-gray-600">
                        Khách: {item.guest}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-black text-rose-600 tabular-nums">
                        {Number(item.amount).toLocaleString("vi-VN")} đ
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-5 py-2 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl cursor-pointer shadow-sm transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
