import React, { useState } from "react";

const AdminDashboardPage = () => {
  const [timeRange, setTimeRange] = useState("this_month");

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Thống Kê Toàn Hệ Thống</h2>
          <p className="text-xs text-slate-500 mt-1">Tổng quan doanh thu, đơn hàng và khách sạn chờ duyệt.</p>
        </div>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold px-3 py-2 rounded-xl outline-none"
        >
          <option value="this_month">Tháng này</option>
          <option value="last_month">Tháng trước</option>
          <option value="this_year">Năm nay</option>
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Tổng Doanh Thu</span>
          <div className="text-2xl font-black text-slate-900 mt-2">128,450,000 đ</div>
          <span className="text-xs text-emerald-600 font-bold mt-2 block">+12.5% so với tháng trước</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Hoa Hồng Sàn (10%)</span>
          <div className="text-2xl font-black text-blue-600 mt-2">12,845,000 đ</div>
          <span className="text-xs text-blue-600 font-bold mt-2 block">Lợi nhuận thực tế</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Tổng Booking</span>
          <div className="text-2xl font-black text-purple-700 mt-2">142 Đơn</div>
          <span className="text-xs text-emerald-600 font-bold mt-2 block">+8.1% tăng trưởng</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Khách sạn chờ duyệt</span>
          <div className="text-2xl font-black text-amber-600 mt-2">3 Hồ sơ</div>
          <span className="text-xs text-amber-600 font-bold mt-2 block">Cần xử lý ngay</span>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;