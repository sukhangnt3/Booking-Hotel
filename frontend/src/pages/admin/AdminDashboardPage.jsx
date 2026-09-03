// src/pages/admin/AdminDashboardPage.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  DollarSign,
  BedDouble,
  TrendingUp,
  AlertCircle,
  Clock,
  CheckCircle2,
  LogIn,
  LogOut,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  Brush,
  Search,
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
import PropertySearchSelector from "@/components/common/PropertySearchSelector";

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  const [allHotels, setAllHotels] = useState([]);
  const [selectedHotelId, setSelectedHotelId] = useState("all");
  const [searchHotelQuery, setSearchHotelQuery] = useState("");

  const [bookings, setBookings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [housekeeping, setHousekeeping] = useState([]);
  const [pendingVerifications, setPendingVerifications] = useState([]);

  const loadRealData = () => {
    setLoading(true);
    const localApps = JSON.parse(
      localStorage.getItem("pending_partner_applications") || "[]",
    );
    const uniqueHotelsMap = new Map();

    localApps.forEach((h) => {
      const id = String(h.id || h.applicationId || h.hotel_id || "").trim();
      const name = String(h.name || h.hotelNameVi || "Cơ sở lưu trú").trim();
      if (id && !uniqueHotelsMap.has(id)) {
        uniqueHotelsMap.set(id, {
          id,
          name,
          city: h.city || h.province || "Việt Nam",
          image: h.image,
        });
      }
    });

    if (uniqueHotelsMap.size === 0) {
      uniqueHotelsMap.set("HT-101", {
        id: "HT-101",
        name: "BezTower & Residences",
        city: "TP. Hồ Chí Minh",
      });
    }

    setAllHotels(Array.from(uniqueHotelsMap.values()));

    const realBookings = JSON.parse(
      localStorage.getItem("all_bookings") || "[]",
    );
    const realRooms = JSON.parse(
      localStorage.getItem("pms_hotel_rooms_master") || "[]",
    );
    const realHousekeeping = JSON.parse(
      localStorage.getItem("pms_housekeeping_rooms") || "[]",
    );
    const realVerifications = JSON.parse(
      localStorage.getItem("pms_payment_verifications") || "[]",
    );

    setBookings(realBookings);
    setRooms(realRooms);
    setHousekeeping(realHousekeeping);
    setPendingVerifications(
      realVerifications.filter((p) => p.status === "pending"),
    );
    setLoading(false);
  };

  useEffect(() => {
    loadRealData();
  }, []);

  const formatVND = (num) => Number(num || 0).toLocaleString("vi-VN") + " ₫";
  const todayStr = new Date().toISOString().split("T")[0];
  const selectedHotelObj = allHotels.find(
    (h) => String(h.id) === String(selectedHotelId),
  );

  // Lọc dữ liệu theo cơ sở đang chọn
  const scopedBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (selectedHotelId !== "all") {
        const matchId = String(b.hotel_id) === String(selectedHotelId);
        const matchName =
          selectedHotelObj?.name &&
          b.hotel_name
            ?.toLowerCase()
            .includes(selectedHotelObj.name.toLowerCase());
        if (!matchId && !matchName) return false;
      }

      if (searchHotelQuery.trim()) {
        const q = searchHotelQuery.toLowerCase().trim();
        const bHotel = String(b.hotel_name || "").toLowerCase();
        const bGuest = String(b.customer_name || "").toLowerCase();
        const bCode = String(b.code || "").toLowerCase();
        const bRoom = String(
          b.assigned_room || b.room_name || "",
        ).toLowerCase();
        return (
          bHotel.includes(q) ||
          bGuest.includes(q) ||
          bCode.includes(q) ||
          bRoom.includes(q)
        );
      }

      return true;
    });
  }, [bookings, selectedHotelId, selectedHotelObj, searchHotelQuery]);

  const totalRevenue = useMemo(() => {
    return scopedBookings
      .filter(
        (b) =>
          b.payment_status === "paid" ||
          b.status === "confirmed" ||
          b.status === "checked_in" ||
          b.status === "checked_out",
      )
      .reduce((sum, b) => sum + Number(b.total_price || 0), 0);
  }, [scopedBookings]);

  const activeOccupiedRooms = scopedBookings.filter(
    (b) => b.status === "checked_in",
  ).length;
  const totalRoomsCount = rooms.length || 1;
  const occupancyRate = Math.min(
    Math.round((activeOccupiedRooms / totalRoomsCount) * 100),
    100,
  );

  const todayArrivals = useMemo(() => {
    return scopedBookings.filter((b) => {
      const checkInDate = (b.check_in || b.checkin_date || "").split("T")[0];
      return (
        checkInDate === todayStr ||
        (b.status === "confirmed" && !b.checked_in_at)
      );
    });
  }, [scopedBookings, todayStr]);

  const recentBookings = scopedBookings.slice(0, 5);

  const real12MonthsChartData = useMemo(() => {
    const months = [];
    const now = new Date();

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `T${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getFullYear()).slice(-2)}`;
      const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

      const matchBookings = scopedBookings.filter((b) => {
        const bDate = b.created_at || b.check_in || "";
        return bDate.startsWith(yearMonth);
      });

      const monthRevenue = matchBookings
        .filter(
          (b) =>
            b.payment_status === "paid" ||
            b.status === "confirmed" ||
            b.status === "checked_in" ||
            b.status === "checked_out",
        )
        .reduce((sum, b) => sum + Number(b.total_price || 0), 0);

      const monthOccupancy =
        totalRoomsCount > 0
          ? Math.min(
              Math.round((matchBookings.length / (totalRoomsCount * 30)) * 100),
              100,
            )
          : 0;

      months.push({
        month: monthKey,
        revenue: monthRevenue,
        bookings: matchBookings.length,
        occupancy: monthOccupancy,
      });
    }

    return months;
  }, [scopedBookings, totalRoomsCount]);

  const cleanCount = housekeeping.filter((r) => r.status === "clean").length;
  const dirtyCount = housekeeping.filter((r) => r.status === "dirty").length;
  const inProgressCount = housekeeping.filter(
    (r) => r.status === "in_progress",
  ).length;
  const maintenanceCount = housekeeping.filter(
    (r) => r.status === "maintenance",
  ).length;

  return (
    <div className="space-y-7 font-sans pb-16 text-slate-800">
      {/* ── 1. HEADER & BỘ CHỌN CƠ SỞ THÔNG MINH ── */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5">
        <div>
          <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider mb-1">
            <ShieldCheck size={16} /> Bảng Điều Khiển Quản Trị Trung Tâm (Super
            Admin)
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Tổng Quan Doanh Thu & Vận Hành Hệ Thống
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Lọc và tra cứu số liệu theo từng cơ sở lưu trú hoặc theo dõi toàn bộ
            hệ thống
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
          {/* 🏢 SỬ DỤNG BỘ CHỌN THÔNG MINH TẠI ĐÂY */}
          <PropertySearchSelector
            hotels={allHotels}
            selectedHotelId={selectedHotelId}
            onSelectHotel={(id) => setSelectedHotelId(id)}
          />

          <button
            onClick={loadRealData}
            className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl transition cursor-pointer flex items-center justify-center"
            title="Làm mới dữ liệu"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* ── THANH TÌM KIẾM ── */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-2xs flex items-center gap-3">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Tìm nhanh theo Tên khách sạn/Cơ sở lưu trú, Tên khách hàng, Số phòng hoặc Mã đơn..."
            value={searchHotelQuery}
            onChange={(e) => setSearchHotelQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs outline-none focus:border-blue-600 focus:bg-white"
          />
        </div>
        {searchHotelQuery && (
          <button
            onClick={() => setSearchHotelQuery("")}
            className="text-xs text-rose-600 font-bold hover:underline px-2"
          >
            Xóa tìm kiếm
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-24 flex justify-center bg-white rounded-3xl border">
          <LoadingSpinner size="lg" label="Đang đối soát dữ liệu cơ sở..." />
        </div>
      ) : (
        <>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex justify-between items-center text-xs">
            <span className="text-slate-600 font-bold">
              Đang phân tích số liệu của:{" "}
              <strong className="text-blue-900 font-black text-sm">
                {selectedHotelId === "all"
                  ? "Toàn bộ tất cả cơ sở trên sàn"
                  : selectedHotelObj?.name}
              </strong>
            </span>
            <span className="text-slate-500 font-semibold">
              {scopedBookings.length} Đơn phát sinh
            </span>
          </div>

          {/* 4 Thẻ KPI */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-2">
              <div className="flex justify-between items-center text-slate-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  Doanh Thu Cơ Sở
                </span>
                <DollarSign size={18} className="text-emerald-600" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                {formatVND(totalRevenue)}
              </h3>
              <p className="text-[11px] text-emerald-600 font-bold">
                Từ {scopedBookings.length} đơn đặt phòng
              </p>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-2">
              <div className="flex justify-between items-center text-slate-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  Tỷ Lệ Lấp Đầy Hiện Tại
                </span>
                <BedDouble size={18} className="text-blue-600" />
              </div>
              <h3 className="text-2xl font-black text-blue-700 tracking-tight">
                {occupancyRate}%
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                {activeOccupiedRooms} / {rooms.length} phòng đang có khách
              </p>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-2">
              <div className="flex justify-between items-center text-slate-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  Khách Đến Hôm Nay
                </span>
                <LogIn size={18} className="text-amber-600" />
              </div>
              <h3 className="text-2xl font-black text-amber-700 tracking-tight">
                {todayArrivals.length} Lượt
              </h3>
              <p className="text-[11px] text-amber-800 font-bold">
                Check-in trong ngày
              </p>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-2">
              <div className="flex justify-between items-center text-slate-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  Chờ Duyệt Thanh Toán
                </span>
                <AlertCircle size={18} className="text-rose-600" />
              </div>
              <h3 className="text-2xl font-black text-rose-600 tracking-tight">
                {pendingVerifications.length} Giao dịch
              </h3>
              <p className="text-[11px] text-rose-700 font-bold">
                Chờ kiểm tra ủy nhiệm chi
              </p>
            </div>
          </div>

          {/* Biểu đồ 12 Tháng */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex justify-between items-center border-b pb-3">
                <div>
                  <h3 className="font-black text-base text-slate-900">
                    Doanh Thu 12 Tháng (Revenue Visualizations)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Doanh thu theo chu kỳ của cơ sở được chọn
                  </p>
                </div>
                <span className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-xl">
                  Đơn vị: VNĐ
                </span>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={real12MonthsChartData}>
                    <defs>
                      <linearGradient
                        id="adminScopedRevenue"
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
                      stroke="#e2e8f0"
                    />
                    <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
                    <YAxis
                      stroke="#64748b"
                      fontSize={11}
                      tickFormatter={(v) => `${v / 1000000}M`}
                    />
                    <Tooltip formatter={(v) => [formatVND(v), "Doanh thu"]} />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#003580"
                      strokeWidth={3}
                      fill="url(#adminScopedRevenue)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
              <div className="border-b pb-3">
                <h3 className="font-black text-base text-slate-900">
                  Lượt Đặt Phòng (Monthly Bookings)
                </h3>
                <p className="text-xs text-slate-500">
                  Số lượng đơn theo tháng
                </p>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={real12MonthsChartData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#e2e8f0"
                    />
                    <XAxis dataKey="month" stroke="#64748b" fontSize={10} />
                    <YAxis stroke="#64748b" fontSize={11} />
                    <Tooltip formatter={(v) => [`${v} đơn`, "Số lượt đặt"]} />
                    <Bar
                      dataKey="bookings"
                      fill="#6366f1"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* 3 Khối vận hành */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6 bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-4">
              <div className="flex justify-between items-center border-b pb-3">
                <h3 className="font-black text-base text-slate-900">
                  Đơn Đặt Phòng Gần Nhất ({recentBookings.length})
                </h3>
                <button
                  onClick={() => navigate("/owner/bookings")}
                  className="text-xs font-bold text-blue-600 hover:underline"
                >
                  Xem tất cả
                </button>
              </div>

              <div className="space-y-3">
                {recentBookings.length > 0 ? (
                  recentBookings.map((b) => (
                    <div
                      key={b.code}
                      className="p-3 bg-slate-50 rounded-2xl border flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-blue-900">
                            #{b.code}
                          </span>
                          <strong className="text-slate-900 font-bold">
                            {b.customer_name}
                          </strong>
                        </div>
                        <span className="text-slate-500 text-[11px]">
                          {b.hotel_name} • <b>{formatVND(b.total_price)}</b>
                        </span>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-blue-50 text-blue-700 border border-blue-200">
                        {b.status}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400 italic text-center py-6">
                    Không có đơn đặt phòng nào cho cơ sở này.
                  </p>
                )}
              </div>
            </div>

            <div className="lg:col-span-3 bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-4">
              <div className="border-b pb-3 flex justify-between items-center">
                <h3 className="font-black text-base text-slate-900 flex items-center gap-1.5">
                  <LogIn size={16} className="text-blue-600" /> Khách Đến Hôm
                  Nay
                </h3>
                <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                  {todayArrivals.length}
                </span>
              </div>

              <div className="space-y-3">
                {todayArrivals.length > 0 ? (
                  todayArrivals.map((arr) => (
                    <div
                      key={arr.code}
                      className="p-3 bg-slate-50 rounded-2xl border space-y-1 text-xs"
                    >
                      <strong className="text-slate-900 font-bold block">
                        {arr.customer_name}
                      </strong>
                      <p className="text-slate-600 text-[11px]">
                        {arr.room_name} ({arr.assigned_room || "Chưa xếp phòng"}
                        )
                      </p>
                      <span className="text-[10px] font-mono text-blue-900 font-bold block">
                        #{arr.code}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400 italic text-center py-6">
                    Không có khách check-in hôm nay.
                  </p>
                )}
              </div>
            </div>

            <div className="lg:col-span-3 bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-4">
              <div className="border-b pb-3 flex justify-between items-center">
                <h3 className="font-black text-base text-slate-900 flex items-center gap-1.5">
                  <Sparkles size={16} className="text-emerald-600" /> Trạng Thái
                  Dọn Phòng
                </h3>
                <button
                  onClick={() => navigate("/owner/housekeeping")}
                  className="text-xs text-blue-600 font-bold hover:underline"
                >
                  Quản lý
                </button>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 flex justify-between items-center">
                  <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                    <CheckCircle2 size={13} /> Sạch Sẵn Sàng:
                  </span>
                  <strong className="text-emerald-900 font-black">
                    {cleanCount} phòng
                  </strong>
                </div>

                <div className="p-2.5 bg-rose-50 rounded-xl border border-rose-200 flex justify-between items-center">
                  <span className="font-bold text-rose-900 flex items-center gap-1.5">
                    <AlertCircle size={13} /> Cần Dọn Buồng:
                  </span>
                  <strong className="text-rose-900 font-black">
                    {dirtyCount} phòng
                  </strong>
                </div>

                <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 flex justify-between items-center">
                  <span className="font-bold text-amber-900 flex items-center gap-1.5">
                    <Clock size={13} /> Đang Vệ Sinh:
                  </span>
                  <strong className="text-amber-900 font-black">
                    {inProgressCount} phòng
                  </strong>
                </div>

                <div className="p-2.5 bg-slate-50 rounded-xl border flex justify-between items-center">
                  <span className="font-bold text-slate-700 flex items-center gap-1.5">
                    <Brush size={13} /> Đang Bảo Trì:
                  </span>
                  <strong className="text-slate-800 font-black">
                    {maintenanceCount} phòng
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
