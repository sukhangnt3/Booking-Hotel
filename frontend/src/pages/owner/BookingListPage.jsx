import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const BookingListPage = () => {
  const navigate = useNavigate();
  const [filterStatus, setFilterStatus] = useState("all");

  const [bookings] = useState([
    {
      id: "BK-9081",
      guestName: "Trần Minh Hoàng",
      phone: "0988123456",
      roomType: "Biệt Thự Hồ Bơi Riêng",
      roomNumber: "201",
      checkIn: "15/08/2026",
      checkOut: "17/08/2026",
      totalPrice: 9000000,
      paymentStatus: "paid",
      bookingStatus: "confirmed",
    },
    {
      id: "BK-9082",
      guestName: "Lê Thu Thảo",
      phone: "0912987654",
      roomType: "Phòng Deluxe Hướng Biển",
      roomNumber: "102",
      checkIn: "16/08/2026",
      checkOut: "18/08/2026",
      totalPrice: 3600000,
      paymentStatus: "pay_at_hotel",
      bookingStatus: "pending",
    },
  ]);

  return (
    <div className="space-y-6 font-sans text-slate-800">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Quản Lý Đặt Phòng (Bookings)</h2>
          <p className="text-xs text-slate-500 mt-1">Danh sách khách đặt phòng, kiểm tra trạng thái thanh toán và thao tác nhận/trả phòng.</p>
        </div>
        <div className="flex gap-2">
          {["all", "pending", "confirmed", "checked_in"].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition capitalize ${
                filterStatus === status ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {status === "all" ? "Tất cả" : status === "pending" ? "Chờ xác nhận" : status === "confirmed" ? "Đã xác nhận" : "Đã Check-in"}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 uppercase text-[10px] font-bold text-slate-400">
            <tr>
              <th className="p-4">Mã Booking</th>
              <th className="p-4">Khách Hàng</th>
              <th className="p-4">Hạng Phòng / Số Phòng</th>
              <th className="p-4">Thời Gian Lưu Trú</th>
              <th className="p-4">Tổng Tiền</th>
              <th className="p-4">Thanh Toán</th>
              <th className="p-4 text-center">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-semibold">
            {bookings.map((b) => (
              <tr key={b.id} className="hover:bg-slate-50">
                <td className="p-4 font-black text-blue-600">{b.id}</td>
                <td className="p-4">
                  <div className="font-bold text-slate-900">{b.guestName}</div>
                  <div className="text-[11px] text-slate-400">{b.phone}</div>
                </td>
                <td className="p-4">
                  <div>{b.roomType}</div>
                  <span className="inline-block mt-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded">
                    Phòng {b.roomNumber}
                  </span>
                </td>
                <td className="p-4 text-slate-600">
                  📅 {b.checkIn} ➔ {b.checkOut}
                </td>
                <td className="p-4 font-black text-slate-900">{b.totalPrice.toLocaleString()} đ</td>
                <td className="p-4">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                    b.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {b.paymentStatus === 'paid' ? '✓ Đã thanh toán' : '🟡 Trả tại chỗ nghỉ'}
                  </span>
                </td>
                <td className="p-4 text-center">
                  <button
                    onClick={() => navigate(`/owner/bookings/${b.id}`)}
                    className="bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-1.5 rounded-lg text-[11px] font-bold transition"
                  >
                    Chi tiết & Check-in
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BookingListPage;