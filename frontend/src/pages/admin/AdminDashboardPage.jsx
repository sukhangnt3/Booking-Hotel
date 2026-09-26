import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  Activity,
  Users,
  Building2,
  DollarSign,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  BarChart2,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  CreditCard,
  Wallet,
  X,
  Check,
  Loader2,
  CalendarDays,
  History,
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
  const [timeRange, setTimeRange] = useState("today");

  const [stats, setStats] = useState({
    totalGMV: 0,
    totalRevenue: 0,
    totalBookings: 0,
    totalHotels: 0,
    totalUsers: 0,
    totalOwnerPayout: 0,
    pendingHotels: 0,
  });

  const [trafficData, setTrafficData] = useState([]);
  const [pendingList, setPendingList] = useState([]);
  const [hotelRevenues, setHotelRevenues] = useState([]);

  // TAB CHUYỂN ĐỔI: "ACTIVE" (Cần quyết toán) HOẶC "HISTORY" (Lịch sử đã chuyển tiền)
  const [payoutTab, setPayoutTab] = useState("active");
  const [payoutHistoryList, setPayoutHistoryList] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Filter & Phân trang
  const [hotelSearch, setHotelSearch] = useState("");
  const [sortBy, setSortBy] = useState("payout_desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  // Modal Quyết toán
  const [selectedPayoutHotel, setSelectedPayoutHotel] = useState(null);
  const [isConfirming, setIsConfirming] = useState(false);

  const formatVND = (num) => Number(num || 0).toLocaleString("vi-VN") + " ₫";
  const formatNumber = (num) => Number(num || 0).toLocaleString("vi-VN");

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && selectedPayoutHotel && !isConfirming) {
        setSelectedPayoutHotel(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedPayoutHotel, isConfirming]);

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

      const rawHotelRevenues = data.hotelRevenues || [];

      setStats({
        totalGMV: Number(data.totalGMV || 0),
        totalRevenue: Number(data.totalRevenue || 0),
        totalBookings: Number(data.totalBookings || 0),
        totalHotels: Number(data.totalHotels || 0),
        totalUsers: Number(data.totalUsers || 0),
        totalOwnerPayout: Number(data.totalOwnerPayout || 0),
        pendingHotels: Number(data.pendingHotels || hotelsData.length || 0),
      });

      setPendingList(hotelsData.slice(0, 5));
      setHotelRevenues(rawHotelRevenues);

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

  const fetchPayoutHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await apiClient.get("/admin/payouts/history");
      const list = res?.data?.history || res?.data || [];
      setPayoutHistoryList(Array.isArray(list) ? list : []);
    } catch (err) {
      console.warn("Chưa lấy được lịch sử:", err.message);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    if (payoutTab === "history") {
      fetchPayoutHistory();
    }
  }, [payoutTab, fetchPayoutHistory]);

  const handleConfirmPayout = async () => {
    if (!selectedPayoutHotel) return;
    setIsConfirming(true);

    const hotelId = selectedPayoutHotel.hotel_id;
    const amount = Number(selectedPayoutHotel.owner_payout || 0);
    const hotelName = selectedPayoutHotel.hotel_name;

    try {
      await apiClient.post("/admin/payouts/confirm", {
        hotel_id: hotelId,
        amount,
        note: `Quyết toán chu kỳ cho cơ sở [${hotelName}]`,
      });

      alert(
        `✓ THÀNH CÔNG! Đã hoàn tất quyết toán ${formatVND(amount)} cho cơ sở [${hotelName}]. Số tiền nợ kỳ này đã về 0 ₫!`,
      );
      setSelectedPayoutHotel(null);
      await fetchDashboardData();
      if (payoutTab === "history") fetchPayoutHistory();
    } catch (e) {
      alert(
        "Lỗi khi lưu quyết toán: " + (e.response?.data?.message || e.message),
      );
    } finally {
      setIsConfirming(false);
    }
  };

  const handleQuickApprove = async (hotelId) => {
    try {
      await apiClient.patch(`/admin/hotels/${hotelId}/status`, {
        status: "active",
      });
      alert("✓ Đã phê duyệt cơ sở thành công!");
      fetchDashboardData();
    } catch (err) {
      alert(`Lỗi phê duyệt: ${err.message}`);
    }
  };

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

  const processedHotelRevenues = useMemo(() => {
    let list = [...hotelRevenues];
    if (hotelSearch.trim()) {
      const q = hotelSearch.toLowerCase().trim();
      list = list.filter(
        (h) =>
          h.hotel_name?.toLowerCase().includes(q) ||
          h.owner_name?.toLowerCase().includes(q) ||
          h.owner_phone?.includes(q) ||
          h.city?.toLowerCase().includes(q),
      );
    }

    list.sort((a, b) => {
      if (sortBy === "payout_desc")
        return (b.owner_payout || 0) - (a.owner_payout || 0);
      if (sortBy === "gmv_desc") return (b.total_gmv || 0) - (a.total_gmv || 0);
      if (sortBy === "commission_desc")
        return (b.admin_commission || 0) - (a.admin_commission || 0);
      if (sortBy === "name_asc")
        return (a.hotel_name || "").localeCompare(b.hotel_name || "");
      return 0;
    });

    return list;
  }, [hotelRevenues, hotelSearch, sortBy]);

  const totalPages = Math.max(
    1,
    Math.ceil(processedHotelRevenues.length / pageSize),
  );
  const paginatedHotelRevenues = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return processedHotelRevenues.slice(start, start + pageSize);
  }, [processedHotelRevenues, currentPage, pageSize]);

  return (
    <div className="w-full pb-24 bg-gray-50/50 font-sans text-gray-900 min-h-screen p-4 sm:p-6 lg:p-8 space-y-6">
      {/* HEADER QUẢN TRỊ ADMIN */}
      <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-2xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#006ce4] font-bold text-xs uppercase tracking-wider mb-1">
            <ShieldCheck size={16} /> Bảng Điều Hành Quản Trị Viên (Admin
            Center)
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#0a2540] tracking-tight">
            Giám Sát Doanh Thu & Quyết Toán Định Kỳ
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Hệ thống đối soát hoa hồng thực thu và chuyển khoản định kỳ (Weekly
            Payout) cho đối tác
          </p>
        </div>

        <button
          type="button"
          onClick={fetchDashboardData}
          className="p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition cursor-pointer"
          title="Làm mới số liệu"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {apiError && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl flex items-center gap-2 font-bold animate-in fade-in">
          <AlertCircle size={16} /> <span>{apiError}</span>
        </div>
      )}

      {loading ? (
        <div className="py-24 flex justify-center bg-white rounded-3xl border border-gray-200 shadow-2xs">
          <LoadingSpinner size="lg" label="Đang đối soát số liệu hệ thống..." />
        </div>
      ) : (
        <>
          {/* 1. 4 THẺ CHỈ SỐ TỔNG QUAN */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-blue-100 shadow-2xs space-y-2">
              <div className="flex justify-between items-center text-gray-400">
                <span className="text-[11px] font-black uppercase tracking-wider text-[#003580]">
                  Tổng Giao Dịch Sàn (GMV)
                </span>
                <CreditCard size={18} className="text-[#006ce4]" />
              </div>
              <h3 className="text-2xl font-black text-[#003580] tracking-tight tabular-nums">
                {formatVND(stats.totalGMV)}
              </h3>
              <p className="text-[11px] text-gray-500 font-medium">
                Toàn bộ tiền phòng khách đã đặt
              </p>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-emerald-100 shadow-2xs space-y-2">
              <div className="flex justify-between items-center text-gray-400">
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800">
                  Hoa Hồng Sàn Thực Thu
                </span>
                <DollarSign size={18} className="text-emerald-600" />
              </div>
              <h3 className="text-2xl font-black text-emerald-700 tracking-tight tabular-nums">
                {formatVND(stats.totalRevenue)}
              </h3>
              <p className="text-[11px] text-emerald-600 font-semibold">
                Doanh thu thực tế của Admin (đã trừ cấn)
              </p>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-amber-100 shadow-2xs space-y-2">
              <div className="flex justify-between items-center text-gray-400">
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-800">
                  Tiền Cần Trả Owner
                </span>
                <Wallet size={18} className="text-amber-600" />
              </div>
              <h3 className="text-2xl font-black text-amber-700 tracking-tight tabular-nums">
                {formatVND(stats.totalOwnerPayout)}
              </h3>
              <p className="text-[11px] text-gray-500 font-medium">
                Tiền cọc thừa cần bắn trả khách sạn
              </p>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-2xs space-y-2">
              <div className="flex justify-between items-center text-gray-400">
                <span className="text-[11px] font-black uppercase tracking-wider text-[#0a2540]">
                  Quy Mô Mạng Lưới
                </span>
                <Building2 size={18} className="text-purple-600" />
              </div>
              <h3 className="text-2xl font-black text-purple-700 tracking-tight">
                {stats.totalHotels} Cơ Sở
              </h3>
              <div className="flex items-center gap-1.5 text-[11px] text-gray-500 font-medium">
                <Users size={13} className="text-gray-400" />
                <span>
                  Mạng lưới: <b>{formatNumber(stats.totalUsers)}</b> thành viên
                </span>
              </div>
            </div>
          </div>

          {/* 2. BẢNG QUYẾT TOÁN CƠ SỞ KÈM ĐỐI SOÁT MINH BẠCH */}
          <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-2xs space-y-4">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 pb-3 border-b border-gray-100">
              <div>
                <h3 className="font-black text-base text-[#0a2540] flex items-center gap-2">
                  <Building2 size={18} className="text-[#003580]" /> Quản Lý
                  Quyết Toán Định Kỳ Cho Đối Tác
                </h3>
                <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5">
                  <CalendarDays size={13} className="text-[#006ce4]" />
                  <span>
                    Chỉ quyết toán khi khách{" "}
                    <strong>đã trả phòng (Check-out)</strong>. Công thức:{" "}
                    <b>Tiền quyết toán = [Sàn thu] - [Hoa hồng]</b>.
                  </span>
                </p>
              </div>

              {/* TAB NÚT CHUYỂN ĐỔI */}
              <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setPayoutTab("active")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    payoutTab === "active"
                      ? "bg-white text-[#003580] shadow-xs"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Cần quyết toán (
                  {
                    processedHotelRevenues.filter(
                      (h) => Number(h.owner_payout || 0) > 0,
                    ).length
                  }
                  )
                </button>
                <button
                  type="button"
                  onClick={() => setPayoutTab("history")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    payoutTab === "history"
                      ? "bg-white text-[#003580] shadow-xs"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <History size={14} />
                  <span>Lịch sử đã chuyển tiền</span>
                </button>
              </div>
            </div>

            {payoutTab === "active" ? (
              <>
                {/* THANH TÌM KIẾM CƠ SỞ */}
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                  <div className="relative flex-1 sm:w-64 max-w-sm">
                    <Search
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="text"
                      value={hotelSearch}
                      onChange={(e) => {
                        setHotelSearch(e.target.value);
                        setCurrentPage(1);
                      }}
                      placeholder="Tìm khách sạn, tên chủ..."
                      className="w-full h-9 pl-8 pr-3 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#003580] focus:bg-white"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-2.5 h-9 text-xs">
                      <ArrowUpDown size={13} className="text-gray-400" />
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="bg-transparent border-none outline-none font-bold text-gray-700 cursor-pointer text-xs"
                      >
                        <option value="payout_desc">
                          Tiền cần trả Owner cao nhất
                        </option>
                        <option value="gmv_desc">
                          Top Doanh thu (GMV) cao nhất
                        </option>
                        <option value="commission_desc">
                          Top Hoa hồng cao nhất
                        </option>
                        <option value="name_asc">Tên khách sạn (A-Z)</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-2.5 h-9 text-xs">
                      <span className="text-gray-400">Xem:</span>
                      <select
                        value={pageSize}
                        onChange={(e) => {
                          setPageSize(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        className="bg-transparent border-none outline-none font-bold text-gray-700 cursor-pointer text-xs"
                      >
                        <option value={5}>5 cơ sở</option>
                        <option value={10}>10 cơ sở</option>
                        <option value={20}>20 cơ sở</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* BẢNG DỮ LIỆU ĐỐI SOÁT CHUẨN XÁC */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-gray-50 text-gray-500 font-bold uppercase tracking-wider border-b border-gray-200">
                      <tr>
                        <th className="py-3.5 px-3">Tên Khách Sạn</th>
                        <th className="py-3.5 px-3">Chủ Cơ Sở (Owner)</th>
                        <th className="py-3.5 px-3 text-center">Tỷ Lệ Sàn</th>
                        <th className="py-3.5 px-3 text-right">
                          Tổng Giá Trị Đơn (GMV)
                        </th>
                        <th className="py-3.5 px-3 text-right text-blue-800">
                          Sàn Đã Thu (Online)
                        </th>
                        <th className="py-3.5 px-3 text-right text-emerald-700">
                          Hoa Hồng Sàn
                        </th>
                        <th className="py-3.5 px-3 text-right">
                          Tiền Cần Quyết Toán
                        </th>
                        <th className="py-3.5 px-3 text-center">Thao Tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium">
                      {paginatedHotelRevenues.length > 0 ? (
                        paginatedHotelRevenues.map((h) => {
                          const isSettled = Number(h.owner_payout || 0) <= 0;

                          return (
                            <tr
                              key={h.hotel_id}
                              className="hover:bg-blue-50/40 transition"
                            >
                              <td className="py-3.5 px-3">
                                <strong className="text-gray-900 block font-bold text-xs line-clamp-1">
                                  {h.hotel_name}
                                </strong>
                                <span className="text-[11px] text-gray-400 font-normal">
                                  {h.city || "Việt Nam"} • Đã hoàn thành:{" "}
                                  <b>{h.completed_bookings || 0}</b>/
                                  {h.total_bookings} đơn
                                </span>
                              </td>
                              <td className="py-3.5 px-3">
                                <p className="font-bold text-gray-800 line-clamp-1">
                                  {h.owner_name || "Chưa gán owner"}
                                </p>
                                <p className="text-[11px] text-gray-400 font-mono">
                                  {h.owner_phone || h.owner_email || "N/A"}
                                </p>
                              </td>
                              <td className="py-3.5 px-3 text-center">
                                <span className="px-2.5 py-0.5 bg-blue-50 text-[#003580] font-black rounded-lg border border-blue-100 text-[11px]">
                                  {h.commission_rate}%
                                </span>
                              </td>
                              <td className="py-3.5 px-3 text-right font-bold text-gray-900 tabular-nums">
                                {formatVND(h.total_gmv)}
                              </td>
                              <td className="py-3.5 px-3 text-right font-bold text-blue-900 tabular-nums">
                                {formatVND(h.total_online_collected)}
                              </td>
                              <td className="py-3.5 px-3 text-right font-black text-emerald-700 tabular-nums">
                                +{formatVND(h.admin_commission)}
                              </td>
                              <td className="py-3.5 px-3 text-right font-black text-sm tabular-nums">
                                {isSettled ? (
                                  <span className="text-gray-400 font-semibold">
                                    0 ₫
                                  </span>
                                ) : (
                                  <span className="text-[#003580]">
                                    {formatVND(h.owner_payout)}
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 px-3 text-center">
                                {isSettled ? (
                                  <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold rounded-xl inline-flex items-center gap-1 text-[11px]">
                                    <CheckCircle2 size={13} /> Đã Quyết Toán
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setSelectedPayoutHotel(h)}
                                    className="px-3.5 py-1.5 bg-[#003580] hover:bg-blue-900 text-white font-bold rounded-xl inline-flex items-center gap-1.5 cursor-pointer shadow-2xs transition active:scale-95"
                                  >
                                    <CreditCard size={13} /> Quyết Toán
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td
                            colSpan={8}
                            className="py-12 text-center text-gray-400 italic"
                          >
                            Không tìm thấy khách sạn nào khớp với tìm kiếm.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* PHÂN TRANG */}
                {processedHotelRevenues.length > 0 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-gray-100 text-xs">
                    <span className="text-gray-500">
                      Hiển thị{" "}
                      <b>
                        {(currentPage - 1) * pageSize + 1} -{" "}
                        {Math.min(
                          currentPage * pageSize,
                          processedHotelRevenues.length,
                        )}
                      </b>{" "}
                      trên <b>{processedHotelRevenues.length}</b> cơ sở
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={currentPage === 1}
                        onClick={() =>
                          setCurrentPage((p) => Math.max(1, p - 1))
                        }
                        className="p-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer text-gray-700"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <span className="px-3 py-1 font-bold bg-gray-100 rounded-xl text-gray-700">
                        Trang {currentPage} / {totalPages}
                      </span>
                      <button
                        type="button"
                        disabled={currentPage === totalPages}
                        onClick={() =>
                          setCurrentPage((p) => Math.min(totalPages, p + 1))
                        }
                        className="p-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer text-gray-700"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* LỊCH SỬ CÁC ĐỢT ĐÃ CHUYỂN TIỀN QUYẾT TOÁN */
              <div className="overflow-x-auto">
                {loadingHistory ? (
                  <div className="py-12 flex justify-center text-gray-400">
                    <Loader2
                      size={24}
                      className="animate-spin text-[#003580]"
                    />
                  </div>
                ) : payoutHistoryList.length > 0 ? (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-gray-50 text-gray-500 font-bold uppercase tracking-wider border-b border-gray-200">
                      <tr>
                        <th className="py-3 px-3">Thời Gian Chuyển</th>
                        <th className="py-3 px-3">Khách Sạn</th>
                        <th className="py-3 px-3">Người Thụ Hưởng</th>
                        <th className="py-3 px-3">Tài Khoản Nhận</th>
                        <th className="py-3 px-3 text-right">
                          Số Tiền Đã Giải Ngân
                        </th>
                        <th className="py-3 px-3">Nội Dung / Ghi Chú</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium">
                      {payoutHistoryList.map((item) => (
                        <tr
                          key={item.id}
                          className="hover:bg-gray-50/80 transition"
                        >
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="font-bold text-gray-900 block">
                              {new Date(item.created_at).toLocaleDateString(
                                "vi-VN",
                              )}
                            </span>
                            <span className="text-[11px] text-gray-400 font-mono">
                              {new Date(item.created_at).toLocaleTimeString(
                                "vi-VN",
                                { hour: "2-digit", minute: "2-digit" },
                              )}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <strong className="text-gray-900 font-bold block">
                              {item.hotel_name || "---"}
                            </strong>
                            <span className="text-[11px] text-gray-400">
                              {item.hotel_city || "Việt Nam"}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-bold text-gray-800 block">
                              {item.bank_account_holder ||
                                item.owner_name ||
                                "---"}
                            </span>
                            <span className="text-[11px] text-gray-400">
                              {item.owner_phone || "N/A"}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono">
                            <span className="font-bold text-[#003580]">
                              {item.bank_account || "N/A"}
                            </span>
                            <span className="text-[11px] text-gray-400 block font-sans">
                              {item.bank_name || "Ngân hàng"}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-black text-emerald-700 text-sm tabular-nums whitespace-nowrap">
                            {formatVND(item.amount)}
                          </td>
                          <td className="py-3 px-3 text-gray-600 italic">
                            {item.note || "Quyết toán định kỳ"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="py-12 text-center text-gray-400 italic">
                    Chưa có giao dịch quyết toán nào được ghi nhận trong lịch
                    sử.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 3. BIỂU ĐỒ LƯU LƯỢNG */}
          <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-2xs space-y-5">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b pb-4 border-gray-100">
              <div>
                <h3 className="font-black text-base text-[#0a2540] flex items-center gap-2">
                  <Activity size={18} className="text-[#006ce4]" /> Giám Sát Lưu
                  Lượng Khách Hàng & Đối Tác
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Lưu lượng tương tác thực tế từ người dùng trên toàn hệ thống
                  GoStay
                </p>
              </div>

              <div className="flex items-center bg-gray-100 p-1 rounded-2xl border border-gray-200">
                {[
                  { id: "today", label: "Hôm nay" },
                  { id: "7days", label: "7 ngày qua" },
                  { id: "30days", label: "30 ngày qua" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setTimeRange(tab.id)}
                    className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                      timeRange === tab.id
                        ? "bg-white text-[#003580] shadow-xs"
                        : "text-gray-500 hover:text-gray-900"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                  Tổng Lượt Tương Tác
                </span>
                <p className="text-lg font-black text-gray-900 mt-0.5 tabular-nums">
                  {formatNumber(analyticsSummary.total)}{" "}
                  <span className="text-xs font-medium text-gray-500">
                    lượt
                  </span>
                </p>
              </div>

              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block flex items-center gap-1">
                  <BarChart2 size={13} className="text-[#006ce4]" /> Trung Bình
                  / {timeRange === "today" ? "Khung giờ" : "Ngày"}
                </span>
                <p className="text-lg font-black text-[#003580] mt-0.5 tabular-nums">
                  {formatNumber(analyticsSummary.avg)}{" "}
                  <span className="text-xs font-medium text-gray-500">
                    lượt
                  </span>
                </p>
              </div>

              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block flex items-center gap-1">
                  <TrendingUp size={13} className="text-emerald-600" /> Đỉnh
                  Điểm (Peak)
                </span>
                <p className="text-lg font-black text-emerald-700 mt-0.5 tabular-nums">
                  {formatNumber(analyticsSummary.peak.requests)}{" "}
                  <span className="text-xs font-medium text-gray-500">
                    lượt ({analyticsSummary.peak.time})
                  </span>
                </p>
              </div>
            </div>

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
                  <XAxis
                    dataKey="time"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    interval={timeRange === "30days" ? 4 : 0}
                  />
                  <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                  <Tooltip
                    formatter={(v) => [
                      `${formatNumber(v)} lượt tương tác`,
                      "Lưu lượng",
                    ]}
                    contentStyle={{
                      backgroundColor: "#0a2540",
                      borderRadius: "12px",
                      border: "none",
                      color: "#fff",
                      fontSize: "12px",
                      fontWeight: "bold",
                    }}
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
                    strokeWidth={2.5}
                    fill="url(#trafficGrad)"
                    dot={{ r: 3, fill: "#003580" }}
                    activeDot={{ r: 5, fill: "#006ce4" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 4. HÀNG CHỜ PHÊ DUYỆT ĐỐI TÁC */}
          <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-2xs space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-black text-base text-[#0a2540] flex items-center gap-2">
                  <Clock size={18} className="text-amber-600" /> Hàng Chờ Phê
                  Duyệt Đối Tác Mới ({pendingList.length})
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Các cơ sở khách sạn vừa nộp hồ sơ đang chờ Admin thẩm định để
                  mở bán
                </p>
              </div>

              <button
                type="button"
                onClick={() => navigate("/admin/hotels")}
                className="text-xs font-bold text-[#006ce4] hover:underline flex items-center gap-1 cursor-pointer"
              >
                Xem tất cả hồ sơ <ArrowRight size={14} />
              </button>
            </div>

            {pendingList.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-gray-50 text-gray-500 font-bold uppercase tracking-wider border-b border-gray-200">
                    <tr>
                      <th className="py-3 px-4">Tên Cơ Sở Chỗ Nghỉ</th>
                      <th className="py-3 px-4">Chủ Doanh Nghiệp</th>
                      <th className="py-3 px-4">Khu Vực</th>
                      <th className="py-3 px-4">Hoa Hồng Sàn</th>
                      <th className="py-3 px-4 text-right">Thao Tác Nhanh</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {pendingList.map((hotel) => (
                      <tr
                        key={hotel.id}
                        className="hover:bg-blue-50/40 transition"
                      >
                        <td className="py-3.5 px-4">
                          <strong className="text-gray-900 block font-bold">
                            {hotel.name}
                          </strong>
                          <span className="text-[11px] text-gray-400">
                            {hotel.address}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-gray-800">
                            {hotel.owner_name || "Chủ đối tác"}
                          </p>
                          <p className="text-gray-400">
                            {hotel.owner_phone || hotel.owner_email}
                          </p>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-gray-700">
                          {hotel.city || "Việt Nam"}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-[#003580]">
                          {hotel.commission_rate ?? 15}%
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => navigate("/admin/hotels")}
                              className="px-3.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl cursor-pointer transition"
                            >
                              Xem hồ sơ
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickApprove(hotel.id)}
                              className="px-4 py-1.5 bg-[#003580] hover:bg-blue-900 text-white font-bold rounded-xl inline-flex items-center gap-1.5 cursor-pointer shadow-2xs transition active:scale-95"
                            >
                              <CheckCircle2 size={13} /> Duyệt nhanh
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-10 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                <CheckCircle2
                  size={32}
                  className="text-emerald-500 mx-auto mb-1.5"
                />
                <p className="font-bold text-xs text-gray-900">
                  Tuyệt vời! Không có hồ sơ nào đang chờ duyệt
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Tất cả hồ sơ đối tác đăng ký đều đã được xử lý
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {/* MODAL QUYẾT TOÁN CHO OWNER */}
      {selectedPayoutHotel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl max-w-lg w-full overflow-hidden font-sans">
            <div className="bg-[#003580] text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet size={18} />
                <h3 className="font-black text-base tracking-tight">
                  Quyết Toán Định Kỳ Cho Chủ Cơ Sở
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPayoutHotel(null)}
                className="text-white/70 hover:text-white p-1 rounded-xl cursor-pointer transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 font-bold">
                    Khách sạn thụ hưởng:
                  </span>
                  <span className="font-black text-gray-900 text-sm">
                    {selectedPayoutHotel.hotel_name}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 font-bold">
                    Chủ cơ sở (Owner):
                  </span>
                  <span className="font-bold text-gray-800">
                    {selectedPayoutHotel.owner_name} (
                    {selectedPayoutHotel.owner_phone || "N/A"})
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 font-bold">
                    Đơn hoàn tất (Check-out):
                  </span>
                  <span className="font-bold text-emerald-700">
                    {selectedPayoutHotel.completed_bookings || 0} đơn đủ điều
                    kiện
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 font-bold">
                    Tỷ lệ hoa hồng sàn:
                  </span>
                  <span className="font-black text-[#003580]">
                    {selectedPayoutHotel.commission_rate}%
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl">
                  <span className="text-[10px] uppercase font-bold text-emerald-800 block">
                    Hoa hồng Sàn giữ lại
                  </span>
                  <span className="text-base font-black text-emerald-700 tabular-nums">
                    +{formatVND(selectedPayoutHotel.admin_commission)}
                  </span>
                </div>
                <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl">
                  <span className="text-[10px] uppercase font-bold text-[#003580] block">
                    Tiền chuyển cho Owner
                  </span>
                  <span className="text-base font-black text-[#003580] tabular-nums">
                    {formatVND(selectedPayoutHotel.owner_payout)}
                  </span>
                </div>
              </div>

              <div className="border border-gray-200 p-4 rounded-2xl space-y-2 bg-white">
                <h4 className="font-black uppercase tracking-wider text-gray-900 flex items-center gap-1.5">
                  <CreditCard size={14} className="text-[#006ce4]" /> STK Nhận
                  Tiền Của Owner
                </h4>
                <p>
                  <b>Ngân hàng:</b>{" "}
                  {selectedPayoutHotel.bank_name ||
                    selectedPayoutHotel.bank_code ||
                    "Vietcombank"}
                </p>
                <p className="font-mono">
                  <b>Số tài khoản:</b>{" "}
                  <span className="text-sm font-black text-[#003580]">
                    {selectedPayoutHotel.bank_account || "Chưa cập nhật"}
                  </span>
                </p>
                <p className="uppercase">
                  <b>Chủ tài khoản:</b>{" "}
                  {selectedPayoutHotel.bank_account_holder ||
                    selectedPayoutHotel.owner_name}
                </p>
              </div>

              {selectedPayoutHotel.bank_account ? (
                <div className="text-center pt-1 space-y-2">
                  <span className="text-[11px] font-bold text-gray-500 block">
                    Mở App Ngân hàng quét mã để chuyển đúng{" "}
                    {formatVND(selectedPayoutHotel.owner_payout)}:
                  </span>
                  <img
                    src={`https://img.vietqr.io/image/${selectedPayoutHotel.bank_code || "VCB"}-${selectedPayoutHotel.bank_account}-compact2.png?amount=${selectedPayoutHotel.owner_payout}&addInfo=${encodeURIComponent(`PAYOUT${String(selectedPayoutHotel.hotel_id).replace(/[^a-zA-Z0-9]/g, "")}`)}&accountName=${encodeURIComponent(selectedPayoutHotel.bank_account_holder || selectedPayoutHotel.owner_name)}`}
                    alt="VietQR Payout"
                    className="w-40 h-40 mx-auto rounded-2xl border border-gray-200 p-2 shadow-2xs bg-white"
                  />
                  <p className="text-[11px] text-gray-400 font-medium">
                    Sau khi quét mã chuyển tiền thành công trên điện thoại, bấm
                    nút bên dưới để hoàn tất:
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl font-bold text-center">
                  ⚠️ Cơ sở này chưa cập nhật Số tài khoản ngân hàng trong hồ sơ!
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setSelectedPayoutHotel(null)}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl cursor-pointer transition"
                >
                  Đóng
                </button>

                <button
                  type="button"
                  disabled={isConfirming}
                  onClick={handleConfirmPayout}
                  className="px-5 py-2.5 bg-[#003580] hover:bg-blue-900 text-white font-black rounded-xl cursor-pointer transition shadow-2xs disabled:opacity-50 inline-flex items-center gap-1.5 active:scale-95"
                >
                  {isConfirming ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      <span>Xác Nhận Đã Chuyển Tiền</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
