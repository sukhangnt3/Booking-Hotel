import React, { useState } from "react";

const BookingManagementPage = () => {
  const [search, setSearch] = useState("");
  const [bookings] = useState([
    { id: "b1", code: "BK-8821", guest: "Nguyen Van A", hotel: "InterContinental", amount: 3200000, status: "pending" },
    { id: "b2", code: "BK-8820", guest: "Tran Thi B", hotel: "Vinpearl Resort", amount: 5800000, status: "confirmed" },
  ]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Quản Lý Đặt Phòng (Booking)</h1>
          <p className="text-xs text-slate-500">Tra cứu đơn đặt phòng toàn hệ thống.</p>
        </div>
        <input
          type="text"
          placeholder="Tra cứu mã booking, tên khách..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 w-64"
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b text-xs font-bold text-slate-500 uppercase">
            <tr>
              <th className="p-4">Mã Booking</th>
              <th className="p-4">Khách Hàng</th>
              <th className="p-4">Khách Sạn</th>
              <th className="p-4">Tổng Tiền</th>
              <th className="p-4">Trạng Thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {bookings
              .filter((b) => b.code.toLowerCase().includes(search.toLowerCase()) || b.guest.toLowerCase().includes(search.toLowerCase()))
              .map((b) => (
                <tr key={b.id}>
                  <td className="p-4 font-bold text-blue-600">{b.code}</td>
                  <td className="p-4 font-semibold text-slate-800">{b.guest}</td>
                  <td className="p-4">{b.hotel}</td>
                  <td className="p-4 font-bold">{b.amount.toLocaleString()} đ</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${b.status === "confirmed" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>
                      {b.status}
                    </span>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BookingManagementPage;