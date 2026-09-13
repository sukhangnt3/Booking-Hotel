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
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  CreditCard,
  Percent,
  X,
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

  // Dữ liệu thống kê tổng quan
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
  const [hotelRevenues, setHotelRevenues] = useState([]);

  // Bộ lọc, Sắp xếp & Phân trang cho bảng doanh thu
  const [hotelSearch, setHotelSearch] = useState("");
  const [sortBy, setSortBy] = useState("gmv_desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  // Popup điều chỉnh tỷ lệ chiết khấu (%) cho từng khách sạn
  const [editingCommissionHotel, setEditingCommissionHotel] = useState(null);
  const [newCommissionRate, setNewCommissionRate] = useState(15);
  const [updatingRate, setUpdatingRate] = useState(false);

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
      setHotelRevenues(data.hotelRevenues || []);

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

  // Cập nhật mức hoa hồng linh hoạt cho khách sạn
  const handleUpdateCommission = async () => {
    if (!editingCommissionHotel) return;
    setUpdatingRate(true);
    try {
      await apiClient.patch(
        `/admin/hotels/${editingCommissionHotel.hotel_id}/commission`,
        {
          commission_rate: Number(newCommissionRate),
        },
      );
      alert(
        `✓ Đã cập nhật mức chiết khấu của [${editingCommissionHotel.hotel_name}] thành ${newCommissionRate}%!`,
      );
      setEditingCommissionHotel(null);
      fetchDashboardData();
    } catch (err) {
      alert(`Lỗi cập nhật: ${err.message}`);
    } finally {
      setUpdatingRate(false);
    }
  };

  const handleQuickApprove = async (hotelId) => {
    try {
      await apiClient.patch(`/admin/hotels/${hotelId}/status`, {
        status: "active",
      });
      alert(
        "✓ Đã phê duyệt đối tác thành công! Khách sạn đã có thể bán phòng.",
      );
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

  // Tìm kiếm & Sắp xếp dữ liệu khách sạn
  const processedHotelRevenues = useMemo(() => {
    let list = [...hotelRevenues];

    // Lọc theo từ khóa tìm kiếm
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

    // Sắp xếp
    list.sort((a, b) => {
      if (sortBy === "gmv_desc") return (b.total_gmv || 0) - (a.total_gmv || 0);
      if (sortBy === "commission_desc")
        return (b.admin_commission || 0) - (a.admin_commission || 0);
      if (sortBy === "bookings_desc")
        return (b.total_bookings || 0) - (a.total_bookings || 0);
      if (sortBy === "name_asc")
        return (a.hotel_name || "").localeCompare(b.hotel_name || "");
      return 0;
    });

    return list;
  }, [hotelRevenues, hotelSearch, sortBy]);

  // Phân trang
  const totalPages = Math.max(
    1,
    Math.ceil(processedHotelRevenues.length / pageSize),
  );
  const paginatedHotelRevenues = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return processedHotelRevenues.slice(start, start + pageSize);
  }, [processedHotelRevenues, currentPage, pageSize]);

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
            Giám Sát Lưu Lượng & Doanh Thu Sàn
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Tổng hợp toàn bộ dòng tiền giao dịch, hoa hồng thực thu và quản lý
            chính sách chiết khấu từng cơ sở
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
          <LoadingSpinner size="lg" label="Đang cập nhật số liệu hệ thống..." />
        </div>
      ) : (
        <>
          {/* 👑 4 THẺ TỔNG QUAN HỆ THỐNG */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* THẺ 1: TỔNG GIÁ TRỊ GIAO DỊCH (GMV) */}
            <div className="bg-white p-5 rounded-3xl border border-blue-200 bg-blue-50/20 shadow-xs space-y-2">
              <div className="flex justify-between items-center text-slate-400">
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800">
                  Tổng Giao Dịch Sàn (GMV)
                </span>
                <CreditCard size={18} className="text-blue-600" />
              </div>
              <h3 className="text-2xl font-black text-blue-800 tracking-tight">
                {formatVND(stats.totalGMV)}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Tổng giá trị phòng khách đã đặt
              </p>
            </div>

            {/* THẺ 2: HOA HỒNG SÀN THỰC THU */}
            <div className="bg-white p-5 rounded-3xl border border-emerald-200 bg-emerald-50/20 shadow-xs space-y-2">
              <div className="flex justify-between items-center text-slate-400">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                  Hoa Hồng Sàn Thực Thu
                </span>
                <DollarSign size={18} className="text-emerald-600" />
              </div>
              <h3 className="text-2xl font-black text-emerald-700 tracking-tight">
                {formatVND(stats.totalRevenue)}
              </h3>
              <p className="text-[11px] text-emerald-600 font-medium">
                Doanh thu thực tế sàn hưởng
              </p>
            </div>

            {/* THẺ 3: TỔNG ĐƠN ĐẶT PHÒNG */}
            <div className="bg-white p-5 rounded-3xl border shadow-xs space-y-2">
              <div className="flex justify-between items-center text-slate-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  Tổng Đơn Đặt Phòng
                </span>
                <CalendarCheck size={18} className="text-purple-600" />
              </div>
              <h3 className="text-2xl font-black text-purple-700 tracking-tight">
                {formatNumber(stats.totalBookings)} Đơn
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Giao dịch phát sinh trên sàn
              </p>
            </div>

            {/* THẺ 4: QUY MÔ HỆ THỐNG */}
            <div className="bg-white p-5 rounded-3xl border shadow-xs space-y-2">
              <div className="flex justify-between items-center text-slate-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  Quy Mô Đối Tác & Khách
                </span>
                <Building2 size={18} className="text-amber-600" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                {stats.totalHotels} Cơ Sở
              </h3>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                <Users size={13} className="text-slate-400" />
                <span>
                  Thành viên: <b>{formatNumber(stats.totalUsers)}</b> người dùng
                </span>
              </div>
            </div>
          </div>

          {/* 🌟 BẢNG QUẢN LÝ DOANH THU & CHÍNH SÁCH HOA HỒNG TỪNG CƠ SỞ */}
          <div className="bg-white p-6 rounded-3xl border shadow-xs space-y-4">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
                  <Building2 size={18} className="text-blue-600" /> Quản Lý
                  Doanh Thu & Chiết Khấu Cơ Sở
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                    {processedHotelRevenues.length} cơ sở
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Thống kê tiền khách đặt phòng và quản lý mức chiết khấu theo
                  từng hợp đồng đối tác
                </p>
              </div>

              {/* THANH CÔNG CỤ: TÌM KIẾM + SẮP XẾP + CHỌN SỐ DÒNG */}
              <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
                <div className="relative flex-1 sm:w-56">
                  <Search
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    value={hotelSearch}
                    onChange={(e) => {
                      setHotelSearch(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Tìm tên khách sạn, chủ cơ sở..."
                    className="w-full h-9 pl-8 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 h-9 text-xs">
                  <ArrowUpDown size={13} className="text-slate-400" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="bg-transparent border-none outline-none font-bold text-slate-700 cursor-pointer text-xs"
                  >
                    <option value="gmv_desc">
                      Top Doanh thu (GMV) cao nhất
                    </option>
                    <option value="commission_desc">
                      Top Hoa hồng cao nhất
                    </option>
                    <option value="bookings_desc">
                      Lượt đặt phòng nhiều nhất
                    </option>
                    <option value="name_asc">Tên khách sạn (A-Z)</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 h-9 text-xs">
                  <span className="text-slate-400">Xem:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="bg-transparent border-none outline-none font-bold text-slate-700 cursor-pointer text-xs"
                  >
                    <option value={5}>5 cơ sở</option>
                    <option value={10}>10 cơ sở</option>
                    <option value={20}>20 cơ sở</option>
                  </select>
                </div>
              </div>
            </div>

            {/* BẢNG DỮ LIỆU */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b">
                  <tr>
                    <th className="py-2.5 px-3">Tên Khách Sạn</th>
                    <th className="py-2.5 px-3">Chủ Cơ Sở (Owner)</th>
                    <th className="py-2.5 px-3 text-center">Đơn Đặt</th>
                    <th className="py-2.5 px-3 text-center">
                      Tỷ Lệ Chiết Khấu
                    </th>
                    <th className="py-2.5 px-3 text-right">
                      Tổng Khách Đặt (GMV)
                    </th>
                    <th className="py-2.5 px-3 text-right">Hoa Hồng Sàn Thu</th>
                    <th className="py-2.5 px-3 text-center">Chính Sách</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {paginatedHotelRevenues.length > 0 ? (
                    paginatedHotelRevenues.map((h) => (
                      <tr
                        key={h.hotel_id}
                        className="hover:bg-slate-50/80 transition"
                      >
                        <td className="py-2.5 px-3">
                          <strong className="text-slate-900 block font-bold text-xs line-clamp-1">
                            {h.hotel_name}
                          </strong>
                          <span className="text-[11px] text-slate-400 font-normal">
                            {h.city || "Việt Nam"}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <p className="font-bold text-slate-800 line-clamp-1">
                            {h.owner_name || "Chưa gán owner"}
                          </p>
                          <p className="text-[11px] text-slate-400 font-mono">
                            {h.owner_phone || h.owner_email || "N/A"}
                          </p>
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-700">
                          {formatNumber(h.total_bookings)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-black rounded-lg border border-blue-200 text-[11px]">
                            {h.commission_rate}%
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                          {formatVND(h.total_gmv)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-emerald-700 text-sm">
                          +{formatVND(h.admin_commission)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCommissionHotel(h);
                              setNewCommissionRate(h.commission_rate || 15);
                            }}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 rounded-lg font-bold text-[11px] transition cursor-pointer border border-slate-200"
                          >
                            Chỉnh % Chiết Khấu
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-8 text-center text-slate-400 italic"
                      >
                        Không tìm thấy khách sạn nào khớp với từ khoá tìm kiếm.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* THANH PHÂN TRANG */}
            {processedHotelRevenues.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
                <span className="text-slate-500">
                  Hiển thị{" "}
                  <b>
                    {(currentPage - 1) * pageSize + 1} -{" "}
                    {Math.min(
                      currentPage * pageSize,
                      processedHotelRevenues.length,
                    )}
                  </b>{" "}
                  trên tổng số <b>{processedHotelRevenues.length}</b> cơ sở
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(1, prev - 1))
                    }
                    className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer text-slate-700"
                    title="Trang trước"
                  >
                    <ChevronLeft size={16} />
                  </button>

                  <span className="px-3 py-1 font-bold bg-slate-100 rounded-xl text-slate-700">
                    Trang {currentPage} / {totalPages}
                  </span>

                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                    }
                    className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer text-slate-700"
                    title="Trang tiếp"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 📊 PHẦN 2: BIỂU ĐỒ GIÁM SÁT LƯU LƯỢNG NGƯỜI DÙNG */}
          <div className="bg-white p-6 rounded-3xl border shadow-xs space-y-5">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b pb-4 border-slate-100">
              <div>
                <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
                  <Activity size={18} className="text-blue-600" /> Giám Sát Lưu
                  Lượng Khách Hàng & Đối Tác
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Lưu lượng tương tác thực tế từ người dùng (loại trừ nội bộ
                  Admin)
                </p>
              </div>

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

          {/* 🛎️ PHẦN 3: HÀNG CHỜ PHÊ DUYỆT ĐỐI TÁC MỚI */}
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
                      <th className="py-3 px-4">Hoa Hồng Sàn</th>
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
                          {hotel.commission_rate ?? 15}%
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
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl inline-flex items-center gap-1 cursor-pointer shadow-xs"
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

      {/* 🌟 MODAL CÀI ĐẶT MỨC HOA HỒNG (% COMMISSION) CHO TỪNG KHÁCH SẠN */}
      {editingCommissionHotel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-sm w-full overflow-hidden animate-fadeIn">
            <div className="bg-[#003580] text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Percent size={18} />
                <h3 className="font-black text-sm">Chính Sách Hoa Hồng Sàn</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingCommissionHotel(null)}
                className="text-white/70 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">
                  Khách sạn áp dụng:
                </span>
                <p className="font-bold text-slate-800 text-sm">
                  {editingCommissionHotel.hotel_name}
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">
                  Tỷ lệ chiết khấu sàn thu (%):
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={newCommissionRate}
                    onChange={(e) => setNewCommissionRate(e.target.value)}
                    className="w-full h-10 px-3 pr-8 text-sm font-black text-blue-700 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                    %
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Mức phí phổ biến trên sàn từ 12% - 20% tùy theo quy mô hợp
                  đồng.
                </p>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingCommissionHotel(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={updatingRate}
                  onClick={handleUpdateCommission}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {updatingRate ? "Đang lưu..." : "Xác Nhận Cập Nhật"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
