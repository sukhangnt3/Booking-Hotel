import React from "react";

const AdminDashboardPage = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">
          Thống Kê Toàn Hệ Thống
        </h1>
        <p className="text-xs text-slate-500">
          Doanh thu, lượng booking và tỷ lệ hoa hồng tổng quan.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase">
            Tổng Doanh Thu
          </p>
          <p className="text-2xl font-black text-slate-900 mt-1">
            128,450,000 đ
          </p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase">
            Tỷ Lệ Hoa Hồng
          </p>
          <p className="text-2xl font-black text-blue-600 mt-1">10%</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase">
            Lợi Nhuận Sàn
          </p>
          <p className="text-2xl font-black text-emerald-600 mt-1">
            12,845,000 đ
          </p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase">
            Tổng Đơn Booking
          </p>
          <p className="text-2xl font-black text-purple-600 mt-1">142 Đơn</p>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
