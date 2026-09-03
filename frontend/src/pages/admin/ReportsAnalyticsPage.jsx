// src/pages/admin/ReportsAnalyticsPage.jsx
import React, { useState, useEffect, useMemo } from "react";
import {
  TrendingUp,
  Download,
  Calendar,
  DollarSign,
  BedDouble,
  BarChart3,
  ArrowUpRight,
  RefreshCw,
} from "lucide-react";
import {
  AreaChart,
  Area,
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

export default function ReportsAnalyticsPage() {
  const [reportType, setReportType] = useState("revenue"); // revenue | occupancy | bookings
  const [timeGranularity, setTimeGranularity] = useState("monthly"); // daily | monthly | yearly
  const [bookings, setBookings] = useState([]);
  const [rooms, setRooms] = useState([]);

  // Tải dữ liệu thật
  useEffect(() => {
    const realBookings = JSON.parse(
      localStorage.getItem("all_bookings") || "[]",
    );
    const realRooms = JSON.parse(
      localStorage.getItem("pms_hotel_rooms_master") || "[]",
    );
    setBookings(realBookings);
    setRooms(realRooms);
  }, []);

  const formatVND = (val) => Number(val || 0).toLocaleString("vi-VN") + " ₫";
  const totalRoomsCount = rooms.length || 1;

  // ── NHÓM DỮ LIỆU ĐƠN HÀNG THỰC TẾ THEO CHU KỲ (DAILY / MONTHLY / YEARLY) ──
  const dynamicReportDataset = useMemo(() => {
    const groupedMap = new Map();

    bookings.forEach((b) => {
      const dateStr = (
        b.created_at ||
        b.check_in ||
        new Date().toISOString()
      ).split("T")[0];
      let key = dateStr;

      if (timeGranularity === "monthly") {
        key = dateStr.slice(0, 7); // YYYY-MM
      } else if (timeGranularity === "yearly") {
        key = dateStr.slice(0, 4); // YYYY
      }

      if (!groupedMap.has(key)) {
        groupedMap.set(key, {
          time: key,
          revenue: 0,
          bookings: 0,
          occupancy: 0,
        });
      }

      const item = groupedMap.get(key);
      const isPaid =
        b.payment_status === "paid" ||
        b.status === "confirmed" ||
        b.status === "checked_in" ||
        b.status === "checked_out";

      if (isPaid) {
        item.revenue += Number(b.total_price || 0);
      }
      item.bookings += 1;
    });

    const list = Array.from(groupedMap.values()).map((row) => ({
      ...row,
      occupancy: Math.min(
        Math.round(
          (row.bookings /
            (totalRoomsCount * (timeGranularity === "daily" ? 1 : 30))) *
            100,
        ),
        100,
      ),
      adr: row.bookings > 0 ? Math.round(row.revenue / row.bookings) : 0,
      revpar: Math.round(
        row.revenue /
          (totalRoomsCount * (timeGranularity === "daily" ? 1 : 30)),
      ),
    }));

    // Nếu chưa có đơn nào, tạo mốc mặc định để biểu đồ không bị rỗng
    if (list.length === 0) {
      return [
        {
          time: "Hiện tại",
          revenue: 0,
          bookings: 0,
          occupancy: 0,
          adr: 0,
          revpar: 0,
        },
      ];
    }

    return list.sort((a, b) => a.time.localeCompare(b.time));
  }, [bookings, timeGranularity, totalRoomsCount]);

  const totalRevenue = dynamicReportDataset.reduce(
    (sum, d) => sum + d.revenue,
    0,
  );
  const totalBookings = dynamicReportDataset.reduce(
    (sum, d) => sum + d.bookings,
    0,
  );
  const avgOccupancy =
    Math.round(
      dynamicReportDataset.reduce((sum, d) => sum + d.occupancy, 0) /
        dynamicReportDataset.length,
    ) || 0;

  // 📥 XUẤT FILE CSV THẬT RA EXCEL
  const handleExportCSV = () => {
    let csvContent = "\uFEFF";
    csvContent +=
      "Thoi Gian,Doanh Thu (VND),So Luot Dat,Ty Le Lap Day (%),Gia Binh Quan ADR (VND),RevPAR (VND)\n";

    dynamicReportDataset.forEach((row) => {
      csvContent += `"${row.time}",${row.revenue},${row.bookings},${row.occupancy}%,${row.adr},${row.revpar}\n`;
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Bao_Cao_Thuc_Te_${timeGranularity.toUpperCase()}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 font-sans pb-16 text-slate-800">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-rose-600 font-bold text-xs uppercase tracking-wider mb-1">
            <BarChart3 size={16} /> Báo Cáo Phân Tích Thực Tế (Live Analytics)
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Thống Kê Doanh Thu & Hiệu Suất Buồng Phòng
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Dữ liệu tổng hợp từ {bookings.length} đơn đặt phòng thực tế trong
            kho dữ liệu
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer active:scale-95"
        >
          <Download size={16} /> Xuất Báo Cáo CSV (Excel)
        </button>
      </div>

      {/* 3 KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 bg-white rounded-3xl border shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase">
            TỔNG DOANH THU THỰC TẾ
          </span>
          <h3 className="text-2xl font-black text-slate-900">
            {formatVND(totalRevenue)}
          </h3>
        </div>

        <div className="p-5 bg-white rounded-3xl border shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase">
            TỔNG ĐƠN ĐÃ ĐẶT
          </span>
          <h3 className="text-2xl font-black text-indigo-700">
            {totalBookings} Đơn
          </h3>
        </div>

        <div className="p-5 bg-white rounded-3xl border shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase">
            TỶ LỆ LẤP ĐẦY TRUNG BÌNH
          </span>
          <h3 className="text-2xl font-black text-blue-700">{avgOccupancy}%</h3>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-5 rounded-3xl border shadow-2xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex gap-2">
          {[
            { id: "daily", label: "Theo Ngày" },
            { id: "monthly", label: "Theo Tháng" },
            { id: "yearly", label: "Theo Năm" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTimeGranularity(t.id)}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition cursor-pointer ${
                timeGranularity === t.id
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          {[
            { id: "revenue", label: "📊 Doanh Thu" },
            { id: "occupancy", label: "📈 Lấp Đầy" },
            { id: "bookings", label: "💹 Lượt Đặt" },
          ].map((r) => (
            <button
              key={r.id}
              onClick={() => setReportType(r.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                reportType === r.id
                  ? "bg-blue-600 text-white"
                  : "bg-slate-50 text-slate-700 border"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Biểu đồ */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl border shadow-2xs space-y-4">
        <h3 className="font-black text-base text-slate-900">
          Biểu Đồ Phân Tích Thực Tế Theo {timeGranularity.toUpperCase()}
        </h3>

        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            {reportType === "revenue" ? (
              <AreaChart data={dynamicReportDataset}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e2e8f0"
                />
                <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
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
                  fill="#bfdbfe"
                />
              </AreaChart>
            ) : (
              <BarChart data={dynamicReportDataset}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e2e8f0"
                />
                <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip formatter={(v) => [`${v} đơn`, "Lượt đặt"]} />
                <Bar dataKey="bookings" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
