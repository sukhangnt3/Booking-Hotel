import React, { useState, useEffect, useMemo } from "react";
import {
  Building2,
  BedDouble,
  LogIn,
  LogOut,
  TrendingUp,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Clock,
  ChevronDown,
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
import { PaymentStatusBadge } from "@/components/payment";
import { hotelService, bookingService, roomService } from "@/services";

const DashboardPage = () => {
  const [hotels, setHotels] = useState([]);
  const [selectedHotelId, setSelectedHotelId] = useState("all");
  const [bookings, setBookings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const formatVND = (num) => Number(num || 0).toLocaleString("vi-VN") + " ₫";
  const formatShortVND = (num) => (Number(num || 0) / 1000000).toFixed(1) + "M";

  // 1. Tải danh sách khách sạn của Owner
  useEffect(() => {
    const loadHotels = async () => {
      try {
        const res = await hotelService.getAll({ isOwner: true });
        const list = Array.isArray(res) ? res : res?.data || res?.hotels || [];
        setHotels(list);
      } catch (err) {
        console.error("Lỗi tải danh sách khách sạn:", err);
      }
    };
    loadHotels();
  }, []);

  // 2. Tải toàn bộ Đơn đặt phòng & Danh mục phòng thực tế
  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const params =
        selectedHotelId !== "all" ? { hotel_id: selectedHotelId } : {};
      const [bookingRes, roomRes] = await Promise.all([
        bookingService.getAll
          ? bookingService.getAll(params)
          : bookingService.getOwnerBookings(selectedHotelId, params),
        roomService.getAll
          ? roomService.getAll(params)
          : roomService.getByHotelId(selectedHotelId),
      ]);

      const bookingList = Array.isArray(bookingRes)
        ? bookingRes
        : bookingRes?.data || bookingRes?.bookings || [];
      const roomList = Array.isArray(roomRes)
        ? roomRes
        : roomRes?.data || roomRes?.rooms || [];

      setBookings(bookingList);
      setRooms(roomList);
    } catch (err) {
      console.error("Lỗi khi tải dữ liệu Dashboard thật:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [selectedHotelId]);

  // 3. Tính toán các chỉ số KPI thật từ dữ liệu
  const totalRoomsCount = useMemo(() => {
    return (
      rooms.reduce(
        (acc, r) =>
          acc + Number(r.room_count || r.totalQuantity || r.quantity || 1),
        0,
      ) || 1
    );
  }, [rooms]);

  const todayStr = new Date().toISOString().split("T")[0];

  // Lọc danh sách check-in hôm nay thật
  const todayCheckIns = useMemo(() => {
    return bookings.filter((b) => {
      const checkInDate = (b.checkin_date || b.checkIn || "").split("T")[0];
      return checkInDate === todayStr || b.status === "confirmed";
    });
  }, [bookings, todayStr]);

  const activeStaying = useMemo(() => {
    return bookings.filter((b) => b.status === "checked_in").length;
  }, [bookings]);

  const occupancyRate =
    totalRoomsCount > 0
      ? Math.min(Math.round((activeStaying / totalRoomsCount) * 100), 100)
      : 0;

  const totalRevenue = useMemo(() => {
    return bookings
      .filter((b) => b.payment_status === "paid" || b.status === "checked_out")
      .reduce((sum, b) => sum + Number(b.total_price || b.totalPrice || 0), 0);
  }, [bookings]);

  // 4. Tạo dữ liệu biểu đồ thật 7 ngày gần nhất
  const chartData = useMemo(() => {
    const days = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return {
        dateStr: d.toISOString().split("T")[0],
        dayName: days[d.getDay()],
        revenue: 0,
        occupancy: 0,
      };
    });

    last7Days.forEach((slot) => {
      const matchBookings = bookings.filter((b) => {
        const bDate = (b.created_at || b.checkin_date || b.checkIn || "").split(
          "T",
        )[0];
        return bDate === slot.dateStr;
      });

      slot.revenue = matchBookings.reduce(
        (sum, b) => sum + Number(b.total_price || b.totalPrice || 0),
        0,
      );
      slot.occupancy =
        totalRoomsCount > 0
          ? Math.min(
              Math.round((matchBookings.length / totalRoomsCount) * 100),
              100,
            )
          : 0;
    });

    return last7Days;
  }, [bookings, totalRoomsCount]);

  // 5. Thao tác Check-in trực tiếp qua API
  const handleCheckIn = async (bookingId) => {
    setActionLoadingId(bookingId);
    try {
      if (bookingService.checkIn) {
        await bookingService.checkIn(bookingId);
      } else if (bookingService.updateStatus) {
        await bookingService.updateStatus(bookingId, "checked_in");
      }
      await fetchDashboardData();
    } catch (err) {
      alert("Thao tác thất bại: " + (err.message || "Vui lòng thử lại"));
    } finally {
      setActionLoadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="py-32 flex justify-center items-center">
        <LoadingSpinner
          size="lg"
          label="Đang đồng bộ dữ liệu vận hành từ hệ thống..."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans text-slate-800 pb-12">
      {/* ── TOP BAR ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Hệ thống Vận hành
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              Live Database
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">
            Tổng quan Vận hành & Hiệu suất
          </h1>
        </div>

        <div className="relative w-full md:w-72">
          <select
            value={selectedHotelId}
            onChange={(e) => setSelectedHotelId(e.target.value)}
            className="w-full bg-white border border-slate-300 text-slate-800 text-xs font-medium px-3 py-2.5 rounded-lg outline-none focus:border-slate-900 appearance-none pr-8 cursor-pointer"
          >
            <option value="all">Tất cả cơ sở lưu trú ({hotels.length})</option>
            {hotels.map((h) => (
              <option key={h.id || h.hotel_id} value={h.id || h.hotel_id}>
                {h.name}
              </option>
            ))}
          </select>
          <ChevronDown
            size={15}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
        </div>
      </div>

      {/* ── 4 KPI CARDS THẬT ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-3">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-xs font-semibold uppercase">
              Tỷ lệ lấp đầy
            </span>
            <BedDouble size={18} className="text-slate-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900">
              {occupancyRate}%
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {activeStaying} / {totalRoomsCount} phòng
            </span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-slate-900 h-full rounded-full"
              style={{ width: `${occupancyRate}%` }}
            />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-3">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-xs font-semibold uppercase">
              Check-in Hôm nay
            </span>
            <LogIn size={18} className="text-slate-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900">
              {todayCheckIns.length} Đơn
            </span>
            <span className="text-xs text-emerald-600 font-semibold">
              {todayCheckIns.filter((b) => b.status === "checked_in").length} đã
              vào phòng
            </span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-600 h-full rounded-full"
              style={{
                width: `${todayCheckIns.length > 0 ? (todayCheckIns.filter((b) => b.status === "checked_in").length / todayCheckIns.length) * 100 : 0}%`,
              }}
            />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-3">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-xs font-semibold uppercase">
              Tổng Đơn Đã Nhận
            </span>
            <LogOut size={18} className="text-slate-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900">
              {bookings.length} Đơn
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Toàn hệ thống
            </span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-amber-500 h-full rounded-full"
              style={{ width: "100%" }}
            />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-3">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-xs font-semibold uppercase">
              Tổng Doanh Thu
            </span>
            <TrendingUp size={18} className="text-slate-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-bold text-slate-900">
              {formatVND(totalRevenue)}
            </span>
            <span className="text-xs text-emerald-600 font-semibold flex items-center">
              <ArrowUpRight size={14} /> Thực thu
            </span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-blue-600 h-full rounded-full"
              style={{ width: "100%" }}
            />
          </div>
        </div>
      </div>

      {/* ── BIỂU ĐỒ RECHARTS THỰC TẾ ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Biểu đồ Doanh thu Thực tế
              </h3>
              <p className="text-xs text-slate-500">
                Dữ liệu doanh thu thực nhận theo 7 ngày qua
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              Đơn vị: VNĐ
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="areaColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0f172a" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#0f172a" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e2e8f0"
                />
                <XAxis
                  dataKey="dayName"
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={formatShortVND}
                />
                <Tooltip
                  formatter={(val) => [formatVND(val), "Doanh thu"]}
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                    fontSize: "12px",
                    fontWeight: 600,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#0f172a"
                  strokeWidth={2}
                  fill="url(#areaColor)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-sm">
              Tỷ lệ Lấp đầy Thực tế (%)
            </h3>
            <p className="text-xs text-slate-500">
              Hiệu suất phòng có khách lưu trú
            </p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e2e8f0"
                />
                <XAxis
                  dataKey="dayName"
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  domain={[0, 100]}
                  unit="%"
                  tickLine={false}
                />
                <Tooltip
                  formatter={(val) => [`${val}%`, "Lấp đầy"]}
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                    fontSize: "12px",
                    fontWeight: 600,
                  }}
                />
                <Bar dataKey="occupancy" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── BẢNG LỊCH CHECK-IN THẬT ── */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              Danh sách Nhận phòng Hôm nay
            </h3>
            <p className="text-xs text-slate-500">
              Khách hàng có lịch nhận phòng trong ngày
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-600 bg-white border border-slate-200 px-3 py-1 rounded-md">
            {todayStr}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Mã Đơn</th>
                <th className="py-3 px-4">Khách hàng</th>
                <th className="py-3 px-4">Hạng phòng</th>
                <th className="py-3 px-4">Thời gian</th>
                <th className="py-3 px-4">Thanh toán</th>
                <th className="py-3 px-4 text-right">Tổng tiền</th>
                <th className="py-3 px-4 text-center">Xử lý</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {todayCheckIns.length > 0 ? (
                todayCheckIns.map((b) => {
                  const id = b.id || b.booking_id;
                  const isCheckedIn = b.status === "checked_in";
                  return (
                    <tr
                      key={id}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        #{b.booking_code || id}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">
                          {b.customer_name || b.guest_name || b.customerName}
                        </div>
                        <div className="text-slate-400 text-[11px]">
                          {b.guest_phone || b.phone}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-medium">
                        {b.room_name || b.roomType || "Phòng tiêu chuẩn"}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        {b.checkin_date || b.checkIn}
                      </td>
                      <td className="py-3.5 px-4">
                        <PaymentStatusBadge
                          status={b.payment_status || b.paymentStatus}
                        />
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                        {formatVND(b.total_price || b.totalPrice)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {isCheckedIn ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded text-[11px] border border-emerald-200">
                            <CheckCircle2 size={13} /> Đã nhận phòng
                          </span>
                        ) : (
                          <button
                            disabled={actionLoadingId === id}
                            onClick={() => handleCheckIn(id)}
                            className="bg-slate-900 hover:bg-slate-800 text-white font-medium px-3 py-1.5 rounded-lg text-xs transition-colors disabled:opacity-50"
                          >
                            {actionLoadingId === id
                              ? "Đang xử lý..."
                              : "Nhận phòng"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={7}
                    className="py-8 text-center text-slate-400 font-medium"
                  >
                    Không có đơn nhận phòng nào trong hôm nay.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
