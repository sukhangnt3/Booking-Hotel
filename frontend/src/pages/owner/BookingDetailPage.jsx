import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  Building2,
  User,
  Phone,
  Mail,
  CalendarDays,
  BedDouble,
  Users,
  CreditCard,
  ShieldCheck,
  ArrowLeft,
  Printer,
  CheckCircle2,
  LogIn,
  LogOut,
  XCircle,
  Clock,
  AlertCircle,
  FileText,
  MapPin,
} from "lucide-react";

// Components
import { Button, Badge } from "@/components/ui";
import { LoadingSpinner, Breadcrumb } from "@/components/common";
import { PaymentStatusBadge } from "@/components/payment";

// Services
import { bookingService } from "@/services";

const BookingDetailPage = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const hotelId = searchParams.get("hotelId");

  // ─── 1. STATES ───
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const formatVND = (num) => Number(num || 0).toLocaleString("vi-VN") + " ₫";

  // ─── 2. FETCH CHI TIẾT BOOKING TỪ API ───
  const fetchBookingDetail = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await bookingService.getById(id);
      setBooking(data?.data || data);
    } catch (err) {
      console.error("Lỗi khi tải chi tiết đơn hàng:", err);
      showToast("Không tìm thấy thông tin đơn đặt phòng này", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookingDetail();
  }, [id]);

  // ─── 3. CÁC THAO TÁC NGHIỆP VỤ (CONFIRM / CHECK-IN / CHECK-OUT / CANCEL) ───
  const handleAction = async (actionType) => {
    setActionLoading(true);
    try {
      if (actionType === "confirm") {
        await bookingService.confirm(id);
        showToast("Đã xác nhận đơn đặt phòng!");
      } else if (actionType === "check_in") {
        await bookingService.checkIn(id);
        showToast("Khách hàng đã nhận phòng thành công!");
      } else if (actionType === "check_out") {
        await bookingService.checkOut(id);
        showToast("Khách hàng đã trả phòng thành công!");
      } else if (actionType === "cancel") {
        if (
          !window.confirm("Bạn có chắc chắn muốn hủy đơn đặt phòng này không?")
        ) {
          setActionLoading(false);
          return;
        }
        await bookingService.cancel(id, {
          reason: "Chủ nhà hủy hoặc khách yêu cầu hủy",
        });
        showToast("Đã hủy đơn đặt phòng.", "info");
      }

      // Load lại dữ liệu mới nhất
      await fetchBookingDetail();
    } catch (err) {
      showToast(
        "Thao tác thất bại: " + (err.message || "Vui lòng thử lại"),
        "error",
      );
    } finally {
      setActionLoading(false);
    }
  };

  // In hóa đơn / Phiếu nhận phòng
  const handlePrint = () => {
    window.print();
  };

  if (loading)
    return (
      <LoadingSpinner fullPage label="Đang tải chi tiết đơn đặt phòng..." />
    );

  if (!booking) {
    return (
      <div className="py-24 text-center space-y-4 font-sans">
        <AlertCircle size={48} className="mx-auto text-slate-400" />
        <h2 className="text-2xl font-black text-slate-800">
          Không tìm thấy đơn đặt phòng #{id}
        </h2>
        <Button onClick={() => navigate(-1)} leftIcon={<ArrowLeft size={16} />}>
          Quay lại danh sách
        </Button>
      </div>
    );
  }

  const status = booking.status || "pending";
  const bookingCode = booking.booking_code || booking.code || id;

  const breadcrumbs = [
    {
      label: "Quản lý đặt phòng",
      link: `/owner/bookings${hotelId ? `?hotelId=${hotelId}` : ""}`,
    },
    { label: `Đơn #${bookingCode}` },
  ];

  return (
    <div className="space-y-8 font-sans max-w-5xl mx-auto pb-20 text-slate-800">
      {/* TOAST THÔNG BÁO */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-5 py-3.5 rounded-2xl shadow-2xl text-white font-bold text-sm animate-in slide-in-from-bottom-5 ${
            toast.type === "error"
              ? "bg-rose-600"
              : toast.type === "info"
                ? "bg-blue-600"
                : "bg-emerald-600"
          }`}
        >
          <CheckCircle2 size={18} />
          <span>{toast.message}</span>
        </div>
      )}

      {/* BREADCRUMB */}
      <div className="print:hidden">
        <Breadcrumb items={breadcrumbs} />
      </div>

      {/* ─── HEADER BAR ─── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <span className="font-mono font-black text-xl text-[#006ce4]">
              #{bookingCode}
            </span>

            {/* Status Badge */}
            {status === "confirmed" ? (
              <Badge variant="primary" size="sm">
                Đã xác nhận
              </Badge>
            ) : status === "checked_in" ? (
              <Badge variant="success" size="sm" showDot>
                Đang ở (Checked-in)
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
                Chờ xác nhận
              </Badge>
            )}

            <PaymentStatusBadge status={booking.payment_status || "unpaid"} />
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Ngày tạo đơn: {booking.created_at || booking.createdAt || "N/A"}
          </p>
        </div>

        {/* Nút In & Quay lại */}
        <div className="flex items-center gap-3 print:hidden">
          <Button
            variant="outline"
            onClick={handlePrint}
            className="border-slate-200 text-slate-700 hover:bg-slate-50 rounded-2xl font-bold"
            leftIcon={<Printer size={16} />}
          >
            In Phiếu
          </Button>

          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="border-slate-200 text-slate-700 hover:bg-slate-50 rounded-2xl font-bold"
            leftIcon={<ArrowLeft size={16} />}
          >
            Quay lại
          </Button>
        </div>
      </div>

      {/* ─── NỘI DUNG CHI TIẾT (2 CỘT) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* CỘT TRÁI (7 COLS): THÔNG TIN KHÁCH & PHÒNG */}
        <div className="lg:col-span-7 space-y-6">
          {/* 1. THÔNG TIN KHÁCH HÀNG */}
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <User className="text-[#006ce4]" size={20} />
              <h2 className="text-lg font-black text-slate-900">
                Thông Tin Khách Hàng
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-2xl space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">
                  Họ và tên
                </span>
                <p className="font-extrabold text-slate-900 text-sm">
                  {booking.customer_name ||
                    booking.guestName ||
                    "Chưa cập nhật"}
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">
                  Số điện thoại
                </span>
                <p className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                  <Phone size={13} className="text-slate-400" />{" "}
                  {booking.guest_phone || booking.phone || "N/A"}
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl space-y-1 sm:col-span-2">
                <span className="text-[10px] uppercase font-bold text-slate-400">
                  Địa chỉ Email
                </span>
                <p className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                  <Mail size={13} className="text-slate-400" />{" "}
                  {booking.guest_email || booking.email || "N/A"}
                </p>
              </div>
            </div>

            {/* Yêu cầu đặc biệt nếu có */}
            {booking.special_require && (
              <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 text-xs space-y-1">
                <span className="font-bold text-[#006ce4] flex items-center gap-1">
                  <FileText size={14} /> Yêu cầu đặc biệt từ khách:
                </span>
                <p className="text-slate-700 italic leading-relaxed font-medium">
                  "{booking.special_require}"
                </p>
              </div>
            )}
          </div>

          {/* 2. THÔNG TIN PHÒNG & THỜI GIAN */}
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Building2 className="text-emerald-600" size={20} />
              <h2 className="text-lg font-black text-slate-900">
                Chi Tiết Chỗ Nghỉ & Phòng
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="font-black text-slate-900 text-base">
                  {booking.hotel?.name || booking.hotel_name || "Chỗ nghỉ"}
                </h3>
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                  <MapPin size={13} className="text-slate-400" />{" "}
                  {booking.hotel?.address ||
                    booking.hotel_address ||
                    "Địa chỉ khách sạn"}
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl space-y-2 border border-slate-100">
                <div className="flex justify-between items-center">
                  <h4 className="font-extrabold text-[#006ce4] text-sm">
                    {booking.room?.name || booking.room_name || "Hạng phòng"}
                  </h4>
                  <Badge variant="primary" size="sm">
                    Số lượng: {booking.quantity || 1} phòng
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-500 font-medium">
                  <span className="flex items-center gap-1">
                    <Users size={13} /> {booking.room?.capacity || 2} khách
                  </span>
                  <span className="flex items-center gap-1">
                    <BedDouble size={13} />{" "}
                    {booking.room?.bed_type || "1 Giường đôi lớn"}
                  </span>
                </div>
              </div>

              {/* Ngày nhận / trả */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                  <span className="text-[10px] uppercase font-bold text-emerald-700 block mb-1">
                    Check-in (Nhận phòng)
                  </span>
                  <span className="font-black text-emerald-900 text-sm">
                    {booking.checkin_date || booking.checkIn}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Từ 14:00
                  </span>
                </div>

                <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-100">
                  <span className="text-[10px] uppercase font-bold text-amber-700 block mb-1">
                    Check-out (Trả phòng)
                  </span>
                  <span className="font-black text-amber-900 text-sm">
                    {booking.checkout_date || booking.checkOut}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Trước 12:00
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CỘT PHẢI (5 COLS): CHI TIẾT TIỀN TỆ & THAO TÁC */}
        <div className="lg:col-span-5 space-y-6">
          {/* BẢNG TÍNH TIỀN */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
            <h3 className="text-lg font-black text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <CreditCard className="text-purple-600" size={18} /> Chi Tiết
              Thanh Toán
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between text-slate-600 font-medium">
                <span>Tiền phòng gốc:</span>
                <span className="font-bold text-slate-800">
                  {formatVND(booking.subtotal || booking.total_price)}
                </span>
              </div>

              {Number(booking.discount_amount) > 0 && (
                <div className="flex justify-between text-emerald-600 font-bold bg-emerald-50 p-2.5 rounded-xl">
                  <span>Giảm giá (Voucher):</span>
                  <span>- {formatVND(booking.discount_amount)}</span>
                </div>
              )}

              {Number(booking.tax_amount) > 0 && (
                <div className="flex justify-between text-slate-500 font-medium">
                  <span>Thuế & Phí dịch vụ:</span>
                  <span>+ {formatVND(booking.tax_amount)}</span>
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 pt-4 flex justify-between items-center">
              <div>
                <span className="text-base font-black text-slate-900 block">
                  Tổng thanh toán
                </span>
                <span className="text-[10px] text-slate-400 italic">
                  Đã gồm thuế & phí sàn
                </span>
              </div>
              <span className="text-2xl font-black text-rose-600 tracking-tight">
                {formatVND(booking.total_price || booking.totalPrice)}
              </span>
            </div>
          </div>

          {/* CÁC NÚT THAO TÁC QUẢN TRỊ (CHECK-IN / OUT / CANCEL) */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-3 print:hidden">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">
              Thao Tác Nghiệp Vụ
            </h3>

            {/* 1. NÚT DUYỆT ĐƠN */}
            {status === "pending" && (
              <Button
                isLoading={actionLoading}
                onClick={() => handleAction("confirm")}
                className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-2xl shadow-md shadow-emerald-100 text-sm"
                leftIcon={<CheckCircle2 size={18} />}
              >
                Xác Nhận Đơn Này
              </Button>
            )}

            {/* 2. NÚT CHECK-IN */}
            {status === "confirmed" && (
              <Button
                isLoading={actionLoading}
                onClick={() => handleAction("check_in")}
                className="w-full h-12 bg-[#006ce4] hover:bg-blue-700 text-white font-extrabold rounded-2xl shadow-md shadow-blue-100 text-sm"
                leftIcon={<LogIn size={18} />}
              >
                Khách Nhận Phòng (Check-in)
              </Button>
            )}

            {/* 3. NÚT CHECK-OUT */}
            {status === "checked_in" && (
              <Button
                isLoading={actionLoading}
                onClick={() => handleAction("check_out")}
                className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-white font-extrabold rounded-2xl shadow-md shadow-amber-100 text-sm"
                leftIcon={<LogOut size={18} />}
              >
                Khách Trả Phòng (Check-out)
              </Button>
            )}

            {/* 4. NÚT HỦY ĐƠN */}
            {status !== "cancelled" && status !== "checked_out" && (
              <Button
                variant="outline"
                isLoading={actionLoading}
                onClick={() => handleAction("cancel")}
                className="w-full h-12 border-rose-200 text-rose-600 hover:bg-rose-50 rounded-2xl font-bold text-sm"
                leftIcon={<XCircle size={18} />}
              >
                Hủy Đơn Đặt Phòng
              </Button>
            )}

            {status === "checked_out" && (
              <div className="p-4 bg-slate-50 text-slate-500 rounded-2xl text-center text-xs font-bold border">
                ✓ Kỳ nghỉ đã hoàn tất thành công
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingDetailPage;
