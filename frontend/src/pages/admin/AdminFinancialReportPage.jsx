// src/pages/admin/AdminFinancialReportPage.jsx
import React, { useState, useEffect, useMemo } from "react";
import {
  DollarSign,
  TrendingUp,
  Download,
  Building2,
  Receipt,
  Percent,
  CreditCard,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  Search,
  RefreshCw,
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

export default function AdminFinancialReportPage() {
  const [bookings, setBookings] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeGranularity, setTimeGranularity] = useState("monthly"); // monthly | yearly
  const [searchHotel, setSearchHotel] = useState("");

  const formatVND = (num) => Number(num || 0).toLocaleString("vi-VN") + " ₫";

  const loadFinancialData = () => {
    setLoading(true);
    const realBookings = JSON.parse(
      localStorage.getItem("all_bookings") || "[]",
    );
    const localApps = JSON.parse(
      localStorage.getItem("pending_partner_applications") || "[]",
    );

    setBookings(realBookings);
    setHotels(localApps);
    setLoading(false);
  };

  useEffect(() => {
    loadFinancialData();
  }, []);

  // ── 💰 1. TÍNH TOÁN DÒNG TIỀN VÀ HOA HỒNG SÀN TOÀN HỆ THỐNG ──
  const totalGMV = useMemo(() => {
    return bookings
      .filter(
        (b) =>
          b.payment_status === "paid" ||
          b.status === "confirmed" ||
          b.status === "checked_in" ||
          b.status === "checked_out",
      )
      .reduce((sum, b) => sum + Number(b.total_price || 0), 0);
  }, [bookings]);

  // Hoa hồng sàn được hưởng (18%)
  const platformCommissionRevenue = Math.round(totalGMV * 0.18);

  // Số tiền cần thanh toán lại cho các chủ khách sạn (82%)
  const totalPayoutsToPartners = totalGMV - platformCommissionRevenue;

  // ── 🏢 2. BẢNG KÊ QUYẾT TOÁN CÔNG NỢ THEO TỪNG KHÁCH SẠN ──
  const hotelSettlementList = useMemo(() => {
    const hotelMap = new Map();

    bookings.forEach((b) => {
      const isPaid =
        b.payment_status === "paid" ||
        b.status === "confirmed" ||
        b.status === "checked_in" ||
        b.status === "checked_out";
      if (!isPaid) return;

      const hotelName = b.hotel_name || "Khách sạn đối tác";
      const hotelId = String(b.hotel_id || "HT-1");

      if (!hotelMap.has(hotelName)) {
        hotelMap.set(hotelName, {
          id: hotelId,
          name: hotelName,
          totalBookings: 0,
          grossRevenue: 0,
          commissionRate: 18,
          commissionAmount: 0,
          payoutAmount: 0,
          bankAccount: "Vietcombank •••• 1234",
          status: "pending_payout",
        });
      }

      const item = hotelMap.get(hotelName);
      const price = Number(b.total_price || 0);
      item.totalBookings += 1;
      item.grossRevenue += price;
      item.commissionAmount = Math.round(item.grossRevenue * 0.18);
      item.payoutAmount = item.grossRevenue - item.commissionAmount;
    });

    return Array.from(hotelMap.values());
  }, [bookings]);

  // ── 📈 3. DỮ LIỆU BIỂU ĐỒ HOA HỒNG 12 THÁNG ──
  const monthlyCommissionTrends = useMemo(() => {
    const months = [];
    const now = new Date();

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `T${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getFullYear()).slice(-2)}`;
      const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

      const matchBookings = bookings.filter((b) => {
        const bDate = b.created_at || b.check_in || "";
        const isPaid =
          b.payment_status === "paid" ||
          b.status === "confirmed" ||
          b.status === "checked_in" ||
          b.status === "checked_out";
        return isPaid && bDate.startsWith(yearMonth);
      });

      const gmv = matchBookings.reduce(
        (sum, b) => sum + Number(b.total_price || 0),
        0,
      );
      const commission = Math.round(gmv * 0.18);
      const payout = gmv - commission;

      months.push({
        month: monthKey,
        gmv: gmv,
        commission: commission,
        payout: payout,
      });
    }

    return months;
  }, [bookings]);

  // 📥 4. XUẤT CSV ĐỐI SOÁT TÀI CHÍNH SÀN VÀ NỘP THUẾ
  const handleExportAdminCSV = () => {
    let csv = "\uFEFF";
    csv +=
      "Cơ Sở Lưu Trú,Số Đơn Đặt,Tổng Doanh Thu GMV (VND),Tỷ Lệ Hoa Hồng,Hoa Hồng Sàn Thực Thu (VND),Tiền Cần Chuyển Trả Đối Tác (VND),Trạng Thái Đối Soát\n";

    hotelSettlementList.forEach((h) => {
      csv += `"${h.name}",${h.totalBookings},${h.grossRevenue},"18%",${h.commissionAmount},${h.payoutAmount},"${h.status === "paid" ? "Đã thanh toán" : "Chờ quyết toán"}"\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Bao_Cao_Doi_Soat_Tai_Chinh_San_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const filteredSettlements = hotelSettlementList.filter((h) => {
    if (searchHotel.trim()) {
      return h.name.toLowerCase().includes(searchHotel.toLowerCase());
    }
    return true;
  });

  return (
    <div className="space-y-6 font-sans pb-16 text-slate-800">
      {/* ── HEADER ── */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider mb-1">
            <ShieldCheck size={16} /> Báo Cáo Tài Chính & Đối Soát Doanh Thu Sàn
            (Platform Financials)
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Quản Lý Hoa Hồng (18%) & Quyết Toán Đối Tác
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Theo dõi tổng lượng giao dịch sàn (GMV), tiền hoa hồng thực nhận và
            bảng kê chuyển tiền cho các chủ khách sạn
          </p>
        </div>

        <button
          onClick={handleExportAdminCSV}
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer active:scale-95"
        >
          <Download size={16} /> Xuất Báo Cáo Thuế & Đối Soát (CSV)
        </button>
      </div>

      {loading ? (
        <div className="py-24 flex justify-center bg-white rounded-3xl border">
          <LoadingSpinner size="lg" label="Đang đối soát tài chính sàn..." />
        </div>
      ) : (
        <>
          {/* ── 3 THẺ TÀI CHÍNH CỐT LÕI CỦA ADMIN ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {/* 1. Tổng GMV */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Tổng Giao Dịch Toàn Sàn (GMV)
              </span>
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">
                {formatVND(totalGMV)}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Tổng tiền khách đã thanh toán qua sàn
              </p>
            </div>

            {/* 2. Hoa hồng thực thu 18% (Tiền lời của Admin) */}
            <div className="bg-gradient-to-br from-blue-900 to-[#003580] text-white p-6 rounded-3xl shadow-md space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-bold text-blue-200 uppercase tracking-wider">
                  Hoa Hồng Sàn Thực Thu (18%)
                </span>
                <span className="bg-amber-400 text-amber-950 font-black text-[10px] px-2 py-0.5 rounded-full">
                  Lợi nhuận ròng
                </span>
              </div>
              <h3 className="text-3xl font-black text-amber-300 tracking-tight">
                {formatVND(platformCommissionRevenue)}
              </h3>
              <p className="text-xs text-blue-100 flex items-center gap-1">
                <ArrowUpRight size={14} /> Tiền doanh thu thực nhận của Admin
              </p>
            </div>

            {/* 3. Tiền cần chuyển trả đối tác (Payouts) */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Tiền Cần Trả Đối Tác (82%)
                </span>
                <Clock size={16} className="text-amber-600" />
              </div>
              <h3 className="text-3xl font-black text-emerald-700 tracking-tight">
                {formatVND(totalPayoutsToPartners)}
              </h3>
              <p className="text-xs text-amber-800 font-bold">
                Cần chuyển trả định kỳ cho chủ khách sạn
              </p>
            </div>
          </div>

          {/* ── BIỂU ĐỒ HOA HỒNG SÀN 12 THÁNG ── */}
          <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="font-black text-base text-slate-900">
                  Doanh Thu Hoa Hồng 18% Theo Từng Tháng
                </h3>
                <p className="text-xs text-slate-500">
                  Lợi nhuận hoa hồng sàn tích lũy qua 12 tháng liên tục
                </p>
              </div>
              <span className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-xl">
                Đơn vị: VNĐ
              </span>
            </div>

            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyCommissionTrends}>
                  <defs>
                    <linearGradient
                      id="adminCommissionGrad"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                      <stop
                        offset="95%"
                        stopColor="#2563eb"
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
                  <Tooltip formatter={(v) => [formatVND(v), "Hoa hồng sàn"]} />
                  <Area
                    type="monotone"
                    dataKey="commission"
                    stroke="#1d4ed8"
                    strokeWidth={3}
                    fill="url(#adminCommissionGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── 🏢 BẢNG ĐỐI SOÁT & QUYẾT TOÁN CÔNG NỢ TỪNG KHÁCH SẠN ── */}
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xs space-y-4 p-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b pb-4">
              <div>
                <h3 className="font-black text-base text-slate-900">
                  Bảng Đối Soát Quyết Toán Tiền Đối Tác (
                  {hotelSettlementList.length} Cơ sở)
                </h3>
                <p className="text-xs text-slate-500">
                  Danh sách số tiền cần chuyển khoản cho từng khách sạn sau khi
                  trừ hoa hồng 18%
                </p>
              </div>

              <div className="relative w-full sm:w-72">
                <Search
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  placeholder="Tìm theo tên khách sạn..."
                  value={searchHotel}
                  onChange={(e) => setSearchHotel(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border rounded-xl text-xs outline-none focus:border-blue-600"
                />
              </div>
            </div>

            {filteredSettlements.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b">
                    <tr>
                      <th className="py-3.5 px-4">Cơ Sở Lưu Trú</th>
                      <th className="py-3.5 px-4 text-center">Đơn Đã Bán</th>
                      <th className="py-3.5 px-4 text-right">
                        Tổng Tiền Thu (GMV)
                      </th>
                      <th className="py-3.5 px-4 text-right">
                        Hoa Hồng Sàn (18%)
                      </th>
                      <th className="py-3.5 px-4 text-right">
                        Tiền Phải Trả Chủ Nhà (82%)
                      </th>
                      <th className="py-3.5 px-4 text-center">
                        Trạng Thái Quyết Toán
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredSettlements.map((h, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80">
                        <td className="py-4 px-4">
                          <strong className="text-slate-900 block text-sm">
                            {h.name}
                          </strong>
                          <span className="text-[11px] text-slate-400 font-mono">
                            Tài khoản: {h.bankAccount}
                          </span>
                        </td>

                        <td className="py-4 px-4 text-center font-bold text-blue-900">
                          {h.totalBookings} đơn
                        </td>

                        <td className="py-4 px-4 text-right font-black text-slate-900">
                          {formatVND(h.grossRevenue)}
                        </td>

                        <td className="py-4 px-4 text-right font-black text-blue-700">
                          +{formatVND(h.commissionAmount)}
                        </td>

                        <td className="py-4 px-4 text-right font-black text-emerald-700 text-sm">
                          {formatVND(h.payoutAmount)}
                        </td>

                        <td className="py-4 px-4 text-center">
                          <span className="px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 font-bold rounded-full text-[10px] inline-flex items-center gap-1">
                            <Clock size={11} /> Chờ chuyển tiền
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-10 text-center text-slate-400 text-xs">
                Chưa có đơn đặt phòng nào phát sinh doanh thu.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
