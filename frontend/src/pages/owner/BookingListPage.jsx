import React, { useState, useEffect } from "react";
import { Search, Phone, CalendarCheck, ChevronDown } from "lucide-react";
import { LoadingSpinner, EmptyState } from "@/components/common";
import { PaymentStatusBadge } from "@/components/payment";
import { bookingService, hotelService } from "@/services";

const STATUS_TABS = [
  { id: "all", label: "Tất cả đơn" },
  { id: "pending", label: "Chờ xác nhận" },
  { id: "confirmed", label: "Đã xác nhận" },
  { id: "checked_in", label: "Đang lưu trú" },
  { id: "checked_out", label: "Đã hoàn tất" },
];

const BookingListPage = () => {
  const [hotels, setHotels] = useState([]);
  const [selectedHotelId, setSelectedHotelId] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const formatVND = (num) => Number(num || 0).toLocaleString("vi-VN") + " ₫";

  // 1. Tải danh sách cơ sở
  useEffect(() => {
    const loadHotels = async () => {
      try {
        const res = await hotelService.getAll({ isOwner: true });
        const list = Array.isArray(res) ? res : res?.data || res?.hotels || [];
        setHotels(list);
      } catch (err) {
        console.error("Lỗi lấy danh sách khách sạn:", err);
      }
    };
    loadHotels();
  }, []);

  // 2. Tải danh sách đơn đặt phòng thật từ Backend
  const fetchBookings = async () => {
    setLoading(true);
    try {
      const params = {
        hotel_id: selectedHotelId !== "all" ? selectedHotelId : undefined,
        status: filterStatus !== "all" ? filterStatus : undefined,
        search: searchKeyword.trim() || undefined,
      };

      const res = await (bookingService.getAll
        ? bookingService.getAll(params)
        : bookingService.getOwnerBookings(selectedHotelId, params));

      const list = Array.isArray(res) ? res : res?.data || res?.bookings || [];
      setBookings(list);
    } catch (err) {
      console.error("Lỗi tải danh sách booking:", err);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [selectedHotelId, filterStatus]);

  // 3. Xử lý chuyển trạng thái đơn (Xác nhận, Check-in, Check-out)
  const handleUpdateStatus = async (bookingId, newStatus) => {
    setActionLoadingId(bookingId);
    try {
      if (newStatus === "confirmed" && bookingService.confirm) {
        await bookingService.confirm(bookingId);
      } else if (newStatus === "checked_in" && bookingService.checkIn) {
        await bookingService.checkIn(bookingId);
      } else if (newStatus === "checked_out" && bookingService.checkOut) {
        await bookingService.checkOut(bookingId);
      } else if (bookingService.updateStatus) {
        await bookingService.updateStatus(bookingId, newStatus);
      }

      await fetchBookings();
    } catch (err) {
      alert("Thao tác thất bại: " + (err.message || "Vui lòng thử lại"));
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredBookings = bookings.filter((b) => {
    const code = b.booking_code || String(b.id || "");
    const name = b.customer_name || b.guest_name || b.customerName || "";
    return (
      code.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      name.toLowerCase().includes(searchKeyword.toLowerCase())
    );
  });

  return (
    <div className="space-y-6 font-sans text-slate-800 pb-12">
      {/* ── HEADER ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-xl border border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Quản lý Đặt phòng (Bookings)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Tiếp nhận đơn hàng, kiểm tra thanh toán và thực hiện
            check-in/check-out trực tiếp
          </p>
        </div>

        <div className="relative w-full md:w-72">
          <select
            value={selectedHotelId}
            onChange={(e) => setSelectedHotelId(e.target.value)}
            className="w-full bg-white border border-slate-300 text-slate-800 text-xs font-medium px-3 py-2.5 rounded-lg outline-none focus:border-slate-900 appearance-none pr-8 cursor-pointer"
          >
            <option value="all">Tất cả chỗ nghỉ ({hotels.length})</option>
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

      {/* ── BỘ LỌC & SEARCH ── */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
        <div className="flex items-center gap-1 border-b border-slate-100 pb-3 overflow-x-auto">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filterStatus === tab.id
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchBookings();
          }}
          className="flex gap-2"
        >
          <input
            placeholder="Tìm theo mã đơn (BK...), tên khách hoặc SĐT..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 text-xs px-3.5 py-2.5 rounded-lg focus:ring-1 focus:ring-slate-900 outline-none"
          />
          <button
            type="submit"
            className="bg-slate-900 text-white px-4 rounded-lg text-xs font-semibold cursor-pointer shrink-0"
          >
            Tìm
          </button>
        </form>
      </div>

      {/* ── BẢNG DANH SÁCH ĐƠN HÀNG THẬT ── */}
      {loading ? (
        <div className="py-24 flex justify-center bg-white rounded-xl border border-slate-200">
          <LoadingSpinner size="lg" label="Đang tải danh sách đặt phòng..." />
        </div>
      ) : filteredBookings.length > 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Mã Booking</th>
                  <th className="py-3 px-4">Khách hàng</th>
                  <th className="py-3 px-4">Hạng phòng & SL</th>
                  <th className="py-3 px-4">Thời gian lưu trú</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4">Thanh toán</th>
                  <th className="py-3 px-4 text-right">Tổng tiền</th>
                  <th className="py-3 px-4 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredBookings.map((b) => {
                  const id = b.id || b.booking_id;
                  const isActionLoading = actionLoadingId === id;
                  const status = b.status || "pending";

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
                        <div className="text-[11px] text-slate-400">
                          {b.guest_phone || b.phone}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-medium block">
                          {b.room_name || b.roomType || "Phòng tiêu chuẩn"}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Số lượng: {b.quantity || 1} phòng
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-600">
                        {b.checkin_date || b.checkIn} ➔{" "}
                        {b.checkout_date || b.checkOut}
                      </td>
                      <td className="py-3.5 px-4">
                        {status === "confirmed" ? (
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[11px] font-semibold">
                            Đã xác nhận
                          </span>
                        ) : status === "checked_in" ? (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[11px] font-semibold">
                            Đang ở
                          </span>
                        ) : status === "checked_out" ? (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded text-[11px] font-semibold">
                            Đã trả phòng
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[11px] font-semibold">
                            Chờ duyệt
                          </span>
                        )}
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
                        <div className="flex items-center justify-center gap-1.5">
                          {status === "pending" && (
                            <button
                              disabled={isActionLoading}
                              onClick={() =>
                                handleUpdateStatus(id, "confirmed")
                              }
                              className="bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-xs px-2.5 py-1 rounded cursor-pointer disabled:opacity-50"
                            >
                              {isActionLoading ? "..." : "Xác nhận"}
                            </button>
                          )}
                          {status === "confirmed" && (
                            <button
                              disabled={isActionLoading}
                              onClick={() =>
                                handleUpdateStatus(id, "checked_in")
                              }
                              className="bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs px-2.5 py-1 rounded cursor-pointer disabled:opacity-50"
                            >
                              {isActionLoading ? "..." : "Check-in"}
                            </button>
                          )}
                          {status === "checked_in" && (
                            <button
                              disabled={isActionLoading}
                              onClick={() =>
                                handleUpdateStatus(id, "checked_out")
                              }
                              className="bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs px-2.5 py-1 rounded cursor-pointer disabled:opacity-50"
                            >
                              {isActionLoading ? "..." : "Check-out"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState
          icon={CalendarCheck}
          title="Chưa có đơn đặt phòng nào"
          description="Hệ thống chưa ghi nhận đơn đặt phòng nào theo tiêu chí tìm kiếm này."
          actionLabel="Tải lại toàn bộ"
          onAction={() => {
            setFilterStatus("all");
            setSearchKeyword("");
          }}
        />
      )}
    </div>
  );
};

export default BookingListPage;
