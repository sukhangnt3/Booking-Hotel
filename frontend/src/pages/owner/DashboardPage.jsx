import React, { useState } from "react";

const DashboardPage = () => {
  const [selectedHotel, setSelectedHotel] = useState("all");

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Tổng Quan Vận Hành</h2>
          <p className="text-xs text-slate-500 mt-1">Theo dõi tình trạng lấp đầy phòng, check-in và doanh thu hôm nay.</p>
        </div>
        <select
          value={selectedHotel}
          onChange={(e) => setSelectedHotel(e.target.value)}
          className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold px-3 py-2.5 rounded-xl outline-none"
        >
          <option value="all">Tất cả khách sạn của tôi</option>
          <option value="1">InterContinental Danang</option>
          <option value="2">Sea Breeze Villa Phú Quốc</option>
        </select>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Tỷ Lệ Lấp Đầy Phòng</span>
          <div className="text-2xl font-black text-emerald-600 mt-2">85%</div>
          <span className="text-xs text-slate-500 font-semibold mt-1 block">17 / 20 phòng đang hoạt động</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Check-in Hôm Nay</span>
          <div className="text-2xl font-black text-blue-600 mt-2">4 Đơn</div>
          <span className="text-xs text-blue-600 font-bold mt-1 block">2 đơn đã nhận phòng</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Check-out Hôm Nay</span>
          <div className="text-2xl font-black text-amber-600 mt-2">3 Đơn</div>
          <span className="text-xs text-amber-600 font-bold mt-1 block">Cần dọn dẹp sau 12:00</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Doanh Thu Tạm Tính (Tháng)</span>
          <div className="text-2xl font-black text-slate-900 mt-2">48.500.000 đ</div>
          <span className="text-xs text-emerald-600 font-bold mt-1 block">Thực nhận sau trừ 10% hoa hồng</span>
        </div>
      </div>

      {/* DANH SÁCH CHECK-IN TRONG NGÀY */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-black text-sm text-slate-900">📥 Lịch Khách Check-in Hôm Nay</h3>
          <span className="bg-blue-50 text-blue-700 text-xs font-bold px-3 py-1 rounded-full">15/08/2026</span>
        </div>
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-400 text-[10px] font-bold uppercase">
            <tr>
              <th className="p-4">Mã Đơn</th>
              <th className="p-4">Tên Khách</th>
              <th className="p-4">Loại Phòng</th>
              <th className="p-4">Số Phòng Gán</th>
              <th className="p-4">Giờ Dự Kiến</th>
              <th className="p-4">Thanh Toán</th>
              <th className="p-4 text-center">Xác Nhận</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-semibold">
            <tr className="hover:bg-slate-50">
              <td className="p-4 font-black text-blue-600">BK-8821</td>
              <td className="p-4 font-bold">Nguyễn Văn A <br/><span className="text-[11px] text-slate-400">0901234567</span></td>
              <td className="p-4">Biệt thự Biển Ocean View</td>
              <td className="p-4 font-black text-emerald-600">Phòng 201</td>
              <td className="p-4 text-slate-600">14:00 PM</td>
              <td className="p-4"><span className="bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full text-[10px] font-bold">Đã trả (VNPAY)</span></td>
              <td className="p-4 text-center">
                <button onClick={() => alert("Đã nhận phòng thành công!")} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-[11px] font-bold">
                  ✓ Nhận phòng
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DashboardPage;