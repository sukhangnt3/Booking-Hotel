import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  CalendarCheck,
  Search,
  Building2,
  CalendarDays,
  Users,
  DoorOpen,
  CheckCircle2,
  LogIn,
  LogOut,
  Clock,
  XCircle,
  ExternalLink,
  Phone,
} from "lucide-react";

// Components
import { Button, Badge, Input, Pagination } from "@/components/ui";
import { LoadingSpinner, EmptyState } from "@/components/common";
import { PaymentStatusBadge } from "@/components/payment";

// Services
import { bookingService, hotelService } from "@/services";

const STATUS_TABS = [
  { id: "all", label: "Tất cả đơn" },
  { id: "pending", label: "Chờ xác nhận" },
  { id: "confirmed", label: "Đã xác nhận" },
  { id: "checked_in", label: "Đang ở (Checked-in)" },
  { id: "checked_out", label: "Đã trả phòng" },
  { id: "cancelled", label: "Đã hủy" },
];

const BookingListPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // ─── 1. STATES ───
  const [hotels, setHotels] = useState([]);
  const [selectedHotelId, setSelectedHotelId] = useState(
    searchParams.get("hotelId") || "",
  );
  const [filterStatus, setFilterStatus] = useState(
    searchParams.get("status") || "all",
  );
  const [searchKeyword, setSearchKeyword] = useState("");

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const formatVND = (num) => Number(num || 0).toLocaleString("vi-VN") + " ₫";

  // ─── 2. LOAD DANH SÁCH KHÁCH SẠN CỦA OWNER ───
  useEffect(() => {
    const fetchHotels = async () => {
      try {
        const res = await hotelService.getAll({ isOwner: true });
        const list = Array.isArray(res) ? res : res?.data || res?.hotels || [];
        setHotels(list);

        if (list.length > 0 && !selectedHotelId) {
          const firstId = String(list[0].id || list[0].hotel_id);
          setSelectedHotelId(firstId);
          setSearchParams({ hotelId: firstId });
        }
      } catch (err) {
        console.error("Lỗi lấy danh sách khách sạn:", err);
      }
    };

    fetchHotels();
  }, []);

  // ─── 3. FETCH DANH SÁCH BOOKING THỰC TẾ ───
  const fetchBookings = async () => {
    if (!selectedHotelId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const params = {
        hotelId: selectedHotelId,
        status: filterStatus === "all" ? undefined : filterStatus,
        q: searchKeyword.trim() || undefined,
        page: currentPage,
        limit: 10,
      };

      const res = await bookingService.getOwnerBookings(
        selectedHotelId,
        params,
      );
      const list = Array.isArray(res) ? res : res?.data || res?.bookings || [];

      setBookings(list);
      setTotalPages(res?.totalPages || res?.total_pages || 1);
    } catch (err) {
      console.error("Lỗi tải danh sách đặt phòng:", err);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [selectedHotelId, filterStatus, currentPage]);

  // ─── 4. CÁC THAO TÁC DUYỆT / CHECK-IN / CHECK-OUT ───
  const handleUpdateStatus = async (bookingId, action) => {
    setActionLoadingId(bookingId);
    try {
      if (action === "confirm") {
        await bookingService.confirm(bookingId);
      } else if (action === "check_in") {
        await bookingService.checkIn(bookingId);
      } else if (action === "check_out") {
        await bookingService.checkOut(bookingId);
      }

      // Cập nhật lại danh sách booking
      await fetchBookings();
    } catch (err) {
      alert("Thao tác thất bại: " + (err.message || "Vui lòng thử lại"));
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchBookings();
  };

  return (
    <div className="space-y-8 font-sans pb-16 text-slate-800">
      {/* ─── HEADER & CHỌN KHÁCH SẠN ─── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase text-emerald-600 tracking-wider">
              Kênh Vận Hành
            </span>
            <Badge variant="primary" size="sm">
              {bookings.length} Đơn đặt phòng
            </Badge>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
            Quản Lý Đặt Phòng (Bookings)
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Theo dõi khách đặt phòng, kiểm tra trạng thái thanh toán và thực
            hiện check-in/check-out.
          </p>
        </div>

        {/* Dropdown chọn khách sạn */}
        {hotels.length > 0 && (
          <div className="relative w-full md:w-64">
            <select
              value={selectedHotelId}
              onChange={(e) => {
                setSelectedHotelId(e.target.value);
                setSearchParams({
                  hotelId: e.target.value,
                  status: filterStatus,
                });
                setCurrentPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold px-4 py-3 rounded-2xl outline-none cursor-pointer focus:border-emerald-500 appearance-none"
            >
              {hotels.map((h) => (
                <option key={h.id || h.hotel_id} value={h.id || h.hotel_id}>
                  🏨 {h.name}
                </option>
              ))}
            </select>
            <Building2
              size={16}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
          </div>
        )}
      </div>

      {/* ─── BỘ LỌC STATUS & THANH TÌM KIẾM ─── */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
        {/* Status Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setFilterStatus(tab.id);
                setSearchParams({ hotelId: selectedHotelId, status: tab.id });
                setCurrentPage(1);
              }}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                filterStatus === tab.id
                  ? "bg-[#006ce4] text-white shadow-md shadow-blue-100"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Thanh tìm kiếm mã đơn / tên khách */}
        <form onSubmit={handleSearchSubmit} className="flex gap-3">
          <div className="relative flex-1">
            <Input
              placeholder="Tìm kiếm theo mã đơn (BK...), tên khách hàng hoặc số điện thoại..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              leftIcon={<Search size={16} className="text-slate-400" />}
              className="bg-slate-50 border-slate-200 h-11"
            />
          </div>
          <Button
            type="submit"
            className="bg-slate-900 hover:bg-black text-white px-6 rounded-2xl text-xs font-bold"
          >
            Tìm Kiếm
          </Button>
        </form>
      </div>

      {/* ─── BẢNG DANH SÁCH ĐƠN HÀNG ─── */}
      {loading ? (
        <div className="py-24 flex justify-center bg-white rounded-3xl border border-slate-200/80 shadow-sm">
          <LoadingSpinner size="lg" label="Đang tải danh sách đặt phòng..." />
        </div>
      ) : bookings.length > 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              {/* Header Bảng */}
              <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="p-4 pl-6">Mã Booking</th>
                  <th className="p-4">Khách Hàng</th>
                  <th className="p-4">Hạng Phòng & Số Lượng</th>
                  <th className="p-4">Thời Gian Lưu Trú</th>
                  <th className="p-4">Trạng Thái Đơn</th>
                  <th className="p-4">Thanh Toán</th>
                  <th className="p-4 text-right">Tổng Tiền</th>
                  <th className="p-4 pr-6 text-center">Thao Tác</th>
                </tr>
              </thead>

              {/* Body Bảng */}
              <tbody className="divide-y divide-slate-100 font-medium">
                {bookings.map((b) => {
                  const id = b.booking_code || b.code || b.id;
                  const isActionLoading = actionLoadingId === b.id;
                  const status = b.status || "pending";

                  return (
                    <tr
                      key={b.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      {/* Mã Booking */}
                      <td className="p-4 pl-6 font-mono font-black text-[#006ce4] text-sm">
                        #{id}
                      </td>

                      {/* Thông tin khách hàng */}
                      <td className="p-4">
                        <div className="font-extrabold text-slate-900 text-sm">
                          {b.customer_name || b.guestName || "Khách đặt"}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Phone size={12} />{" "}
                          {b.guest_phone || b.phone || "Chưa có SĐT"}
                        </div>
                      </td>

                      {/* Loại phòng */}
                      <td className="p-4">
                        <div className="font-bold text-slate-800">
                          {b.room_name || b.roomType || "Phòng Tiêu Chuẩn"}
                        </div>
                        <span className="inline-block mt-0.5 text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          Số lượng: {b.quantity || 1} phòng
                        </span>
                      </td>

                      {/* Thời gian */}
                      <td className="p-4 font-bold text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <CalendarDays size={14} className="text-[#006ce4]" />
                          <span>
                            {b.checkin_date || b.checkIn} ➔{" "}
                            {b.checkout_date || b.checkOut}
                          </span>
                        </div>
                      </td>

                      {/* Trạng thái đơn */}
                      <td className="p-4">
                        {status === "confirmed" ? (
                          <Badge variant="primary" size="sm">
                            Đã xác nhận
                          </Badge>
                        ) : status === "checked_in" ? (
                          <Badge variant="success" size="sm" showDot>
                            Đang ở
                          </Badge>
                        ) : status === "checked_out" ? (
                          <Badge variant="default" size="sm">
                            Đã trả phòng
                          </Badge>
                        ) : status === "cancelled" ? (
                          <Badge variant="danger" size="sm">
                            Đã hủy
                          </Badge>
                        ) : (
                          <Badge variant="warning" size="sm" showDot>
                            Chờ duyệt
                          </Badge>
                        )}
                      </td>

                      {/* Thanh toán */}
                      <td className="p-4">
                        <PaymentStatusBadge
                          status={
                            b.payment_status || b.paymentStatus || "unpaid"
                          }
                        />
                      </td>

                      {/* Tổng tiền */}
                      <td className="p-4 text-right font-black text-slate-900 text-sm">
                        {formatVND(b.total_price || b.totalPrice)}
                      </td>

                      {/* Nút hành động */}
                      <td className="p-4 pr-6 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {/* Nút Duyệt / Check-in / Check-out theo quy trình */}
                          {status === "pending" && (
                            <Button
                              size="sm"
                              isLoading={isActionLoading}
                              onClick={() =>
                                handleUpdateStatus(b.id, "confirm")
                              }
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-xl shadow-sm"
                            >
                              Xác nhận
                            </Button>
                          )}

                          {status === "confirmed" && (
                            <Button
                              size="sm"
                              isLoading={isActionLoading}
                              onClick={() =>
                                handleUpdateStatus(b.id, "check_in")
                              }
                              className="bg-[#006ce4] hover:bg-blue-700 text-white font-bold text-xs px-3 py-1.5 rounded-xl shadow-sm"
                              leftIcon={<LogIn size={13} />}
                            >
                              Check-in
                            </Button>
                          )}

                          {status === "checked_in" && (
                            <Button
                              size="sm"
                              isLoading={isActionLoading}
                              onClick={() =>
                                handleUpdateStatus(b.id, "check_out")
                              }
                              className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs px-3 py-1.5 rounded-xl shadow-sm"
                              leftIcon={<LogOut size={13} />}
                            >
                              Check-out
                            </Button>
                          )}

                          {/* Xem chi tiết đơn */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              navigate(
                                `/owner/bookings/${b.id}?hotelId=${selectedHotelId}`,
                              )
                            }
                            className="text-slate-600 border-slate-200 hover:bg-slate-100 text-xs font-bold px-3 py-1.5 rounded-xl"
                          >
                            Chi tiết
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Phân trang */}
          {totalPages > 1 && (
            <div className="p-4 flex justify-center border-t border-slate-100">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={(p) => setCurrentPage(p)}
              />
            </div>
          )}
        </div>
      ) : (
        <EmptyState
          icon={CalendarCheck}
          title="Chưa có đơn đặt phòng nào"
          description="Hiện tại khách sạn chưa nhận được đơn đặt phòng nào theo bộ lọc này."
          actionLabel="Xem tất cả đơn"
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
