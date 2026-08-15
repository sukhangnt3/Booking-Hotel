import React, { useState } from "react";

const BookingManagementPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedBooking, setSelectedBooking] = useState(null);

  const [bookings, setBookings] = useState([
    {
      id: "BK-8821",
      customer: { name: "Nguyễn Văn A", phone: "0901234567", email: "vana@gmail.com" },
      hotel: "InterContinental Danang",
      roomType: "Biệt thự Biển",
      checkIn: "15/08/2026",
      checkOut: "17/08/2026",
      totalAmount: 3200000,
      paymentStatus: "Đã thanh toán (VNPAY)",
      status: "pending",
      note: "Khách yêu cầu phòng tầng cao view biển",
    },
    {
      id: "BK-8820",
      customer: { name: "Trần Thị B", phone: "0987654321", email: "thib@gmail.com" },
      hotel: "Vinpearl Resort Nha Trang",
      roomType: "Deluxe Ocean View",
      checkIn: "18/08/2026",
      checkOut: "20/08/2026",
      totalAmount: 5800000,
      paymentStatus: "Thanh toán tại chỗ nghỉ",
      status: "confirmed",
      note: "Có chuẩn bị nôi em bé",
    },
  ]);

  const filteredBookings = bookings.filter((item) => {
    const matchSearch =
      item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.customer.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === "all" || item.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <h2 className="text-2xl font-black text-slate-900">Quản Lý Đặt Phòng (Booking)</h2>
        <p className="text-xs text-slate-500 mt-1">Tra cứu và kiểm soát tình trạng đặt phòng toàn hệ thống.</p>
      </div>

      {/* FILTER BAR */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row gap-3 justify-between">
        <input
          type="text"
          placeholder="🔍 Tìm mã booking, tên khách hàng..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs w-full md:w-80 outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-50 border border-slate-200 text-xs font-bold px-3 py-2 rounded-xl outline-none"
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="pending">Chờ xác nhận</option>
          <option value="confirmed">Đã xác nhận</option>
          <option value="completed">Đã hoàn tất</option>
          <option value="cancelled">Đã hủy</option>
        </select>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 uppercase text-[10px] font-bold text-slate-500">
            <tr>
              <th className="p-4">Mã Booking</th>
              <th className="p-4">Khách hàng</th>
              <th className="p-4">Khách sạn</th>
              <th className="p-4">Thời gian</th>
              <th className="p-4">Tổng tiền</th>
              <th className="p-4">Trạng thái</th>
              <th className="p-4 text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-semibold">
            {filteredBookings.map((bk) => (
              <tr key={bk.id} className="hover:bg-slate-50">
                <td className="p-4 font-black text-blue-600">{bk.id}</td>
                <td className="p-4">
                  <div className="font-bold">{bk.customer.name}</div>
                  <div className="text-[11px] text-slate-400">{bk.customer.phone}</div>
                </td>
                <td className="p-4">
                  <div className="font-bold">{bk.hotel}</div>
                  <div className="text-[11px] text-slate-400">{bk.roomType}</div>
                </td>
                <td className="p-4">{bk.checkIn} → {bk.checkOut}</td>
                <td className="p-4 font-black text-slate-900">{bk.totalAmount.toLocaleString()} đ</td>
                <td className="p-4">
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                    bk.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {bk.status === 'pending' ? '🟡 Chờ xác nhận' : '🔵 Đã xác nhận'}
                  </span>
                </td>
                <td className="p-4 text-center">
                  <button
                    onClick={() => setSelectedBooking(bk)}
                    className="bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg text-[11px] font-bold"
                  >
                    👁️ Chi tiết
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL CHI TIẾT */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-black text-slate-900">Chi Tiết Đơn {selectedBooking.id}</h3>
            <div className="text-xs space-y-2 bg-slate-50 p-4 rounded-xl border">
              <p><strong>Khách hàng:</strong> {selectedBooking.customer.name} - {selectedBooking.customer.phone}</p>
              <p><strong>Khách sạn:</strong> {selectedBooking.hotel}</p>
              <p><strong>Loại phòng:</strong> {selectedBooking.roomType}</p>
              <p><strong>Hình thức trả:</strong> {selectedBooking.paymentStatus}</p>
              <p><strong>Ghi chú:</strong> {selectedBooking.note || "Không có"}</p>
            </div>
            <div className="flex justify-end">
              <button onClick={() => setSelectedBooking(null)} className="bg-slate-200 px-4 py-2 rounded-xl text-xs font-bold">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingManagementPage;