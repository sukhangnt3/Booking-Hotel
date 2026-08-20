import React, { useState, useEffect } from "react";
import {
  Building2,
  BedDouble,
  LogIn,
  LogOut,
  DollarSign,
  TrendingUp,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Filter,
  Sparkles,
} from "lucide-react";

// Components
import { Button, Badge } from "@/components/ui";
import { PaymentStatusBadge } from "@/components/payment";
import { useAuthStore } from "@/stores/authStore";

const DashboardPage = () => {
  const { user } = useAuthStore();
  const [selectedHotel, setSelectedHotel] = useState("all");
  const [todayBookings, setTodayBookings] = useState([]);
  const [stats, setStats] = useState({
    occupancyRate: 85,
    activeRooms: 17,
    totalRooms: 20,
    checkInCount: 4,
    checkInDone: 2,
    checkOutCount: 3,
    cleaningRooms: 3,
    estimatedRevenue: 48500000,
    revenueGrowth: "+12.5%",
  });

  const formatVND = (num) => Number(num || 0).toLocaleString("vi-VN") + " ₫";

  // Dữ liệu mẫu danh sách check-in trong ngày
  useEffect(() => {
    setTodayBookings([
      {
        id: "BK-8821",
        customerName: "Nguyễn Văn A",
        phone: "0901 234 567",
        roomType: "Biệt thự Biển Ocean View",
        roomNumber: "201",
        estimatedTime: "14:00",
        paymentMethod: "VNPAY",
        paymentStatus: "paid",
        status: "checked_in", // 'checked_in' | 'pending'
        totalPrice: 4200000,
      },
      {
        id: "BK-8824",
        customerName: "Trần Thị B",
        phone: "0912 345 678",
        roomType: "Phòng Deluxe King",
        roomNumber: "305",
        estimatedTime: "15:30",
        paymentMethod: "Thanh toán tại chỗ",
        paymentStatus: "unpaid",
        status: "pending",
        totalPrice: 1850000,
      },
      {
        id: "BK-8830",
        customerName: "Lê Hoàng C",
        phone: "0988 765 432",
        roomType: "Phòng Suite Hướng Vườn",
        roomNumber: "102",
        estimatedTime: "18:00",
        paymentMethod: "MoMo",
        paymentStatus: "paid",
        status: "pending",
        totalPrice: 2600000,
      },
    ]);
  }, []);

  const handleCheckIn = (bookingId) => {
    setTodayBookings((prev) =>
      prev.map((b) =>
        b.id === bookingId ? { ...b, status: "checked_in" } : b,
      ),
    );
  };

  return (
    <div className="space-y-8 font-sans pb-16">
      {/* ─── HEADER & CHỌN KHÁCH SẠN ─── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase text-emerald-600 tracking-wider">
              Kênh Vận Hành Chỗ Nghỉ
            </span>
            <Badge variant="success" size="sm">
              Trực tuyến
            </Badge>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
            Tổng Quan Vận Hành
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Theo dõi tỷ lệ lấp đầy phòng, tình trạng nhận phòng và dòng tiền hôm
            nay.
          </p>
        </div>

        {/* Dropdown chọn cơ sở */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <select
              value={selectedHotel}
              onChange={(e) => setSelectedHotel(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold px-4 py-3 rounded-2xl outline-none cursor-pointer focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 transition-all appearance-none"
            >
              <option value="all">🏨 Tất cả chỗ nghỉ của tôi</option>
              <option value="1">InterContinental Danang Resort</option>
              <option value="2">Sea Breeze Villa Phú Quốc</option>
            </select>
            <Building2
              size={16}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
          </div>
        </div>
      </div>

      {/* ─── 4 METRIC CARDS (KPIS) ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* CARD 1: TỶ LỆ LẤP ĐẦY */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-3 relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Tỷ Lệ Lấp Đầy
            </span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <BedDouble size={20} />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-slate-900">
              {stats.occupancyRate}%
            </div>
            <p className="text-xs font-bold text-slate-500 mt-1">
              Đang ở{" "}
              <span className="text-emerald-600 font-black">
                {stats.activeRooms}
              </span>{" "}
              / {stats.totalRooms} phòng
            </p>
          </div>
          {/* Thanh progress bar */}
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-700"
              style={{ width: `${stats.occupancyRate}%` }}
            />
          </div>
        </div>

        {/* CARD 2: CHECK-IN HÔM NAY */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-3 relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Check-in Hôm Nay
            </span>
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#006ce4] flex items-center justify-center">
              <LogIn size={20} />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-slate-900">
              {stats.checkInCount} Đơn
            </div>
            <p className="text-xs font-bold text-[#006ce4] mt-1 flex items-center gap-1">
              <CheckCircle2 size={13} /> {stats.checkInDone} đơn đã nhận phòng
            </p>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div
              className="bg-[#006ce4] h-full rounded-full"
              style={{
                width: `${(stats.checkInDone / stats.checkInCount) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* CARD 3: CHECK-OUT HÔM NAY */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-3 relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Check-out Hôm Nay
            </span>
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <LogOut size={20} />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-slate-900">
              {stats.checkOutCount} Đơn
            </div>
            <p className="text-xs font-bold text-amber-600 mt-1 flex items-center gap-1">
              <Clock size={13} /> Cần dọn {stats.cleaningRooms} phòng sau 12:00
            </p>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div className="bg-amber-500 h-full rounded-full w-2/3" />
          </div>
        </div>

        {/* CARD 4: DOANH THU THÁNG */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-3 relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Doanh Thu Tạm Tính
            </span>
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <DollarSign size={20} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">
              {formatVND(stats.estimatedRevenue)}
            </div>
            <p className="text-xs font-bold text-emerald-600 mt-1 flex items-center gap-1">
              <TrendingUp size={13} /> {stats.revenueGrowth} so với tháng trước
            </p>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div className="bg-purple-600 h-full rounded-full w-4/5" />
          </div>
        </div>
      </div>

      {/* ─── BẢNG LỊCH CHECK-IN TRONG NGÀY ─── */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        {/* Header bảng */}
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
          <div className="space-y-0.5">
            <h3 className="font-black text-lg text-slate-900 flex items-center gap-2">
              <LogIn className="text-[#006ce4]" size={20} />
              Lịch Khách Nhận Phòng (Check-in) Hôm Nay
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Danh sách khách hàng dự kiến đến trong ngày
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="primary" size="md">
              <Calendar size={13} className="mr-1" /> Hôm nay,{" "}
              {new Date().toLocaleDateString("vi-VN")}
            </Badge>
          </div>
        </div>

        {/* Danh sách Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="p-4 pl-6">Mã Đơn</th>
                <th className="p-4">Khách Hàng</th>
                <th className="p-4">Loại Phòng</th>
                <th className="p-4">Số Phòng Gán</th>
                <th className="p-4">Giờ Dự Kiến</th>
                <th className="p-4">Thanh Toán</th>
                <th className="p-4 text-right">Tổng Tiền</th>
                <th className="p-4 pr-6 text-center">Thao Tác</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 font-medium">
              {todayBookings.map((b) => (
                <tr
                  key={b.id}
                  className="hover:bg-slate-50/80 transition-colors"
                >
                  {/* Mã đơn */}
                  <td className="p-4 pl-6 font-mono font-black text-[#006ce4]">
                    {b.id}
                  </td>

                  {/* Tên khách */}
                  <td className="p-4">
                    <div className="font-bold text-slate-900 text-sm">
                      {b.customerName}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {b.phone}
                    </div>
                  </td>

                  {/* Loại phòng */}
                  <td className="p-4 font-bold text-slate-700">{b.roomType}</td>

                  {/* Số phòng gán */}
                  <td className="p-4">
                    <span className="font-black text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
                      Phòng {b.roomNumber}
                    </span>
                  </td>

                  {/* Giờ dự kiến */}
                  <td className="p-4 text-slate-600 font-bold">
                    <span className="flex items-center gap-1">
                      <Clock size={13} className="text-slate-400" />{" "}
                      {b.estimatedTime}
                    </span>
                  </td>

                  {/* Trạng thái thanh toán */}
                  <td className="p-4">
                    <PaymentStatusBadge status={b.paymentStatus} />
                  </td>

                  {/* Tổng tiền */}
                  <td className="p-4 text-right font-black text-slate-900 text-sm">
                    {formatVND(b.totalPrice)}
                  </td>

                  {/* Nút hành động */}
                  <td className="p-4 pr-6 text-center">
                    {b.status === "checked_in" ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 font-bold bg-emerald-50 px-3 py-1.5 rounded-xl text-xs border border-emerald-200">
                        <CheckCircle2 size={14} /> Đã nhận phòng
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleCheckIn(b.id)}
                        className="bg-[#006ce4] hover:bg-blue-700 text-white font-bold px-4 rounded-xl text-xs shadow-md shadow-blue-100"
                      >
                        Nhận phòng
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
