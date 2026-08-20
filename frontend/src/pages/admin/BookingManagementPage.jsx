import React, { useState, useEffect, useCallback } from "react";
import {
  Receipt,
  Search,
  Building2,
  User,
  CalendarDays,
  Eye,
  Phone,
  Mail,
  Clock,
  CreditCard,
  CheckCircle2,
  XCircle,
  FileText,
  Filter,
  DollarSign,
} from "lucide-react";

// Components
import { Button, Badge, Input, Pagination, Modal } from "@/components/ui";
import { LoadingSpinner, EmptyState } from "@/components/common";
import { PaymentStatusBadge } from "@/components/payment";

// Services
import { bookingService } from "@/services";

const STATUS_TABS = [
  { id: "all", label: "Tất cả đơn" },
  { id: "pending", label: "Chờ xác nhận" },
  { id: "confirmed", label: "Đã xác nhận" },
  { id: "checked_in", label: "Đang ở" },
  { id: "checked_out", label: "Đã hoàn tất" },
  { id: "cancelled", label: "Đã hủy" },
];

const BookingManagementPage = () => {
  // ─── 1. STATES ───
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal Chi tiết Booking
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const formatVND = (num) => Number(num || 0).toLocaleString("vi-VN") + " ₫";

  // ─── 2. SEARCH DEBOUNCE ───
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 350);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // ─── 3. FETCH TOÀN BỘ BOOKING TOÀN SÀN ───
  const fetchAllBookings = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        q: debouncedSearch.trim() || undefined,
        status: statusFilter === "all" ? undefined : statusFilter,
        page: currentPage,
        limit: 10,
      };

      const res = await bookingService.getAll(params);
      const list = Array.isArray(res) ? res : res?.data || res?.bookings || [];

      setBookings(list);
      setTotalPages(res?.totalPages || res?.total_pages || 1);
    } catch (error) {
      console.error("Lỗi khi tải danh sách booking toàn sàn:", error);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, currentPage]);

  useEffect(() => {
    fetchAllBookings();
  }, [fetchAllBookings]);

  // ─── 4. ADMIN CAN THIỆP ĐỔI TRẠNG THÁI ĐƠN ───
  const handleAdminUpdateStatus = async (bookingId, newStatus) => {
    setIsUpdatingStatus(true);
    try {
      if (bookingService.updateStatus) {
        await bookingService.updateStatus(bookingId, { status: newStatus });
      }
      showToast(
        `Đã chuyển trạng thái đơn hàng sang: ${newStatus.toUpperCase()}!`,
      );
      setSelectedBooking(null);
      fetchAllBookings();
    } catch (err) {
      showToast("Cập nhật trạng thái thất bại", "error");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <div className="space-y-8 font-sans pb-16 text-slate-800">
      {/* TOAST NOTIFICATION */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-5 py-3.5 rounded-2xl shadow-2xl text-white font-bold text-sm animate-in slide-in-from-bottom-5 ${
            toast.type === "error" ? "bg-rose-600" : "bg-emerald-600"
          }`}
        >
          <CheckCircle2 size={18} />
          <span>{toast.message}</span>
        </div>
      )}

      {/* ─── HEADER BAR ─── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase text-blue-600 tracking-wider">
              Hệ Thống Giao Dịch Toàn Sàn
            </span>
            <Badge variant="primary" size="sm">
              {bookings.length} Giao dịch
            </Badge>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
            Quản Lý Đặt Phòng (Bookings)
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Tra cứu, đối soát toàn bộ đơn đặt phòng, theo dõi dòng tiền thanh
            toán và can thiệp khi có tranh chấp.
          </p>
        </div>
      </div>

      {/* ─── BỘ LỌC STATUS & TÌM KIẾM ─── */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
        {/* Status Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setStatusFilter(tab.id);
                setCurrentPage(1);
              }}
              className={`px-5 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === tab.id
                  ? "bg-slate-900 text-white shadow-md"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Thanh tìm kiếm */}
        <div className="relative">
          <Input
            placeholder="Tra cứu nhanh theo mã đơn (#BK...), tên khách hàng, SĐT hoặc tên khách sạn..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search size={16} className="text-slate-400" />}
            className="bg-slate-50 border-slate-200 h-12"
            clearable
            onClear={() => setSearchTerm("")}
          />
        </div>
      </div>

      {/* ─── BẢNG DỮ LIỆU GIAO DỊCH ─── */}
      {loading ? (
        <div className="py-24 flex justify-center bg-white rounded-3xl border border-slate-200/80 shadow-sm">
          <LoadingSpinner
            size="lg"
            label="Đang đối soát dữ liệu đặt phòng toàn sàn..."
          />
        </div>
      ) : bookings.length > 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              {/* Header Bảng */}
              <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="p-4 pl-6">Mã Đơn</th>
                  <th className="p-4">Khách Hàng</th>
                  <th className="p-4">Chỗ Nghỉ & Hạng Phòng</th>
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
                  const status = b.status || "pending";

                  return (
                    <tr
                      key={b.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      {/* Mã đơn */}
                      <td className="p-4 pl-6 font-mono font-black text-[#006ce4] text-sm">
                        #{id}
                      </td>

                      {/* Khách hàng */}
                      <td className="p-4">
                        <div className="font-extrabold text-slate-900 text-sm">
                          {b.customer_name ||
                            b.customer?.name ||
                            b.guestName ||
                            "Khách đặt"}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {b.guest_phone ||
                            b.customer?.phone ||
                            b.phone ||
                            "---"}
                        </div>
                      </td>

                      {/* Chỗ nghỉ */}
                      <td className="p-4">
                        <div className="font-bold text-slate-800 text-sm line-clamp-1">
                          {b.hotel_name || b.hotel?.name || "Khách sạn"}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {b.room_name || b.room?.name || "Phòng tiêu chuẩn"} (
                          {b.quantity || 1} phòng)
                        </div>
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
                            Đã hoàn tất
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
                          status={b.payment_status || "paid"}
                        />
                      </td>

                      {/* Tổng tiền */}
                      <td className="p-4 text-right font-black text-slate-900 text-sm">
                        {formatVND(
                          b.total_price || b.totalAmount || b.totalPrice,
                        )}
                      </td>

                      {/* Nút Xem chi tiết */}
                      <td className="p-4 pr-6 text-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedBooking(b)}
                          className="px-3.5 py-1.5 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold"
                          leftIcon={<Eye size={14} />}
                        >
                          Chi Tiết
                        </Button>
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
          icon={Receipt}
          title="Không tìm thấy đơn đặt phòng nào"
          description="Hãy thử thay đổi từ khóa tra cứu hoặc chọn danh mục trạng thái khác."
          actionLabel="Xem tất cả đơn"
          onAction={() => {
            setStatusFilter("all");
            setSearchTerm("");
          }}
        />
      )}

      {/* ─── MODAL CHI TIẾT GIAO DỊCH (ADMIN INSPECT) ─── */}
      {selectedBooking && (
        <Modal
          isOpen={Boolean(selectedBooking)}
          onClose={() => setSelectedBooking(null)}
          title={`Chi Tiết Giao Dịch: #${selectedBooking.booking_code || selectedBooking.id}`}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-6 text-xs text-slate-700">
            {/* 1. KHÁCH HÀNG & CHỖ NGHỈ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Khách hàng đặt
                </span>
                <p className="font-extrabold text-slate-900 text-sm">
                  {selectedBooking.customer_name ||
                    selectedBooking.customer?.name ||
                    "Khách lẻ"}
                </p>
                <p className="text-slate-500 font-medium">
                  {selectedBooking.guest_phone ||
                    selectedBooking.customer?.phone ||
                    "Chưa có SĐT"}
                </p>
                <p className="text-slate-500 font-medium">
                  {selectedBooking.guest_email ||
                    selectedBooking.customer?.email ||
                    "Chưa có Email"}
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Chỗ nghỉ & Hạng phòng
                </span>
                <p className="font-extrabold text-[#006ce4] text-sm">
                  {selectedBooking.hotel_name || selectedBooking.hotel?.name}
                </p>
                <p className="font-bold text-slate-800">
                  {selectedBooking.room_name || selectedBooking.room?.name} (
                  {selectedBooking.quantity || 1} phòng)
                </p>
                <p className="text-slate-500 font-medium">
                  Lưu trú:{" "}
                  {selectedBooking.checkin_date || selectedBooking.checkIn} ➔{" "}
                  {selectedBooking.checkout_date || selectedBooking.checkOut}
                </p>
              </div>
            </div>

            {/* 2. DÒNG TIỀN VÀ THANH TOÁN */}
            <div className="p-5 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-blue-200/60">
                <span className="font-bold text-slate-600">
                  Trạng thái thanh toán:
                </span>
                <PaymentStatusBadge
                  status={selectedBooking.payment_status || "paid"}
                />
              </div>
              <div className="flex justify-between items-center text-sm font-black text-slate-900">
                <span>Tổng giá trị đơn hàng (GMV):</span>
                <span className="text-xl text-rose-600 font-black">
                  {formatVND(
                    selectedBooking.total_price ||
                      selectedBooking.totalAmount ||
                      selectedBooking.totalPrice,
                  )}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 italic">
                * Phí hoa hồng sàn 10% ước tính:{" "}
                {formatVND(Number(selectedBooking.total_price || 0) * 0.1)}
              </p>
            </div>

            {/* 3. GHI CHÚ YÊU CẦU ĐẶC BIỆT */}
            {selectedBooking.special_require && (
              <div className="p-3.5 bg-slate-50 rounded-xl border space-y-1">
                <span className="font-bold text-slate-500 block">
                  Yêu cầu đặc biệt từ khách:
                </span>
                <p className="text-slate-700 italic">
                  "{selectedBooking.special_require}"
                </p>
              </div>
            )}

            {/* 4. THAO TÁC CAN THIỆP CỦA ADMIN */}
            <div className="pt-4 border-t border-slate-100 flex flex-wrap justify-between items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-400">
                  Đổi trạng thái:
                </span>
                <select
                  value={selectedBooking.status || "pending"}
                  disabled={isUpdatingStatus}
                  onChange={(e) =>
                    handleAdminUpdateStatus(selectedBooking.id, e.target.value)
                  }
                  className="bg-slate-100 border border-slate-300 font-black rounded-xl px-3 py-1.5 text-xs outline-none cursor-pointer"
                >
                  <option value="pending">Chờ xác nhận</option>
                  <option value="confirmed">Đã xác nhận</option>
                  <option value="checked_in">Đang ở</option>
                  <option value="checked_out">Đã hoàn tất</option>
                  <option value="cancelled">Hủy đơn</option>
                </select>
              </div>

              <Button
                variant="outline"
                onClick={() => setSelectedBooking(null)}
                className="rounded-xl font-bold px-5 text-xs"
              >
                Đóng Cửa Sổ
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default BookingManagementPage;
