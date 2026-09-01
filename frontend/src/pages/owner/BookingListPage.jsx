import React, { useState, useEffect } from "react";
import {
  CalendarDays,
  Users,
  BedDouble,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Building2,
  DollarSign,
  Ticket,
  CreditCard,
  MapPin,
  RefreshCw,
  Key,
  LogOut as LogOutIcon,
  Printer,
  X,
  FileText,
  ShieldCheck,
  FileCheck,
  Download,
  Wine,
  RotateCcw,
  Plus,
  Coins,
  ArrowRightLeft,
  Utensils,
  Car,
  Sparkles,
  HeartHandshake,
  Receipt,
  Bell,
  Package,
  Gift,
  ChevronRight,
  TrendingUp,
  UserCheck,
  Layers,
  CalendarCheck,
} from "lucide-react";

import { LoadingSpinner, EmptyState } from "@/components/common";
import { bookingService } from "@/services";

const TABS = [
  { id: "all", label: "Tất cả đơn đặt" },
  { id: "pending_office", label: "Chờ thu tiền tại quầy" },
  { id: "confirmed", label: "Chờ Check-in" },
  { id: "checked_in", label: "Đang lưu trú (In-house)" },
  { id: "checked_out", label: "Đã Check-out (Hoàn tất)" },
  { id: "cancelled", label: "Đã hủy" },
];

function docSoThanhChu(so) {
  if (!so || so === 0) return "Không đồng";
  if (so < 1000000) {
    return `${Math.round(so / 1000).toLocaleString("vi-VN")} nghìn đồng chẵn`;
  }
  return `${(so / 1000000).toFixed(2)} triệu đồng chẵn`;
}

export default function BookingListPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState("all");
  const [toast, setToast] = useState(null);

  // ── MODALS ──
  const [checkInModalBooking, setCheckInModalBooking] = useState(null);
  const [assignedRoomNumber, setAssignedRoomNumber] = useState("Phòng 101");
  const [depositAmount, setDepositAmount] = useState(500000);
  const [checkInNote, setCheckInNote] = useState("Đã kiểm tra CCCD & Nhận cọc");

  const [roomMoveBooking, setRoomMoveBooking] = useState(null);
  const [newRoomNumber, setNewRoomNumber] = useState("Phòng 201");
  const [roomMoveReason, setRoomMoveReason] = useState(
    "Khách yêu cầu đổi view thoáng",
  );

  const [extraServiceBooking, setExtraServiceBooking] = useState(null);
  const [serviceCategory, setServiceCategory] = useState("minibar");
  const [serviceName, setServiceName] = useState("2 Lon Bia Tiger & Snack");
  const [servicePrice, setServicePrice] = useState(60000);

  const [conciergeModalBooking, setConciergeModalBooking] = useState(null);
  const [conciergeType, setConciergeType] = useState("wake_up");
  const [conciergeContent, setConciergeContent] = useState("");

  const [checkOutModalBooking, setCheckOutModalBooking] = useState(null);

  const [dossierBooking, setDossierBooking] = useState(null);
  const [dossierTab, setDossierTab] = useState("bill");

  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);

  const [vatTaxRate, setVatTaxRate] = useState(8);
  const [companyVatInfo, setCompanyVatInfo] = useState({
    buyerName: "",
    companyName: "CÔNG TY CỔ PHẦN TẬP ĐOÀN ĐẦU TƯ DU LỊCH VIỆT NAM",
    taxCode: "0108991234",
    companyAddress:
      "Số 123 Đường Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh",
    buyerEmail: "ketoan.congty@gmail.com",
  });

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const formatVND = (num) => Number(num || 0).toLocaleString("vi-VN") + " ₫";

  // ════════════════════════════════════════════════════════════════════════════
  // 🔍 1. FETCH & ĐỒNG BỘ DỮ LIỆU
  // ════════════════════════════════════════════════════════════════════════════
  const fetchBookings = async () => {
    setLoading(true);
    try {
      let apiBookings = [];
      try {
        if (bookingService?.getHistory) {
          const res = await bookingService.getHistory();
          apiBookings = Array.isArray(res)
            ? res
            : res?.data?.data || res?.data || res?.bookings || [];
        }
      } catch (e) {}

      const localBookings = JSON.parse(
        localStorage.getItem("all_bookings") || "[]",
      );
      const paidCache = JSON.parse(
        localStorage.getItem("paid_bookings") || "[]",
      );

      const combined = [...localBookings, ...apiBookings];
      const uniqueMap = new Map();

      combined.forEach((b) => {
        const code = String(b.code || b.booking_code || b.id || "").trim();
        if (code && !uniqueMap.has(code)) {
          const isPaid =
            b.payment_status === "paid" ||
            b.status === "confirmed" ||
            b.status === "checked_in" ||
            b.status === "checked_out" ||
            paidCache.includes(code);

          const isCancelled =
            b.status === "cancelled" || b.payment_status === "cancelled";

          let finalStatus = b.status || "pending";
          if (isCancelled) finalStatus = "cancelled";
          else if (b.status === "checked_out") finalStatus = "checked_out";
          else if (b.status === "checked_in") finalStatus = "checked_in";
          else if (isPaid) finalStatus = "confirmed";

          uniqueMap.set(code, {
            ...b,
            code,
            customer_name: b.customer_name || b.user?.name || "Khách hàng",
            customer_phone: b.customer_phone || b.user?.phone || "0901234567",
            customer_email: b.customer_email || b.user?.email || "N/A",
            hotel_name:
              b.hotel_name || b.hotel?.name || "Khách sạn nghỉ dưỡng GoStay",
            room_name: b.room_name || b.roomType || "Phòng Tiêu Chuẩn",
            assigned_room: b.assigned_room || b.room_number || "Chưa xếp phòng",
            total_price: Number(b.total_price || b.amount || 650000),
            deposit_amount: Number(b.deposit_amount || 0),
            extra_services: b.extra_services || [],
            concierge_logs: b.concierge_logs || [],
            payment_status: isPaid
              ? "paid"
              : isCancelled
                ? "cancelled"
                : "unpaid",
            payment_method: b.payment_method || "office",
            status: finalStatus,
            check_in:
              b.check_in || b.checkIn || new Date().toISOString().split("T")[0],
            check_out:
              b.check_out ||
              b.checkOut ||
              new Date(Date.now() + 86400000).toISOString().split("T")[0],
            created_at: b.created_at || new Date().toISOString(),
          });
        }
      });

      setBookings(Array.from(uniqueMap.values()));
    } catch (err) {
      console.error("Lỗi tải đơn:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  // ── THU TIỀN TẠI QUẦY ──
  const handleConfirmOfficePayment = async (bookingCode) => {
    if (!window.confirm(`Xác nhận đã thu tiền cho đơn #${bookingCode}?`))
      return;

    const localBookings = JSON.parse(
      localStorage.getItem("all_bookings") || "[]",
    );
    const updatedBookings = localBookings.map((b) => {
      if (b.code === bookingCode || b.booking_code === bookingCode) {
        return { ...b, payment_status: "paid", status: "confirmed" };
      }
      return b;
    });
    localStorage.setItem("all_bookings", JSON.stringify(updatedBookings));

    setBookings((prev) =>
      prev.map((b) =>
        b.code === bookingCode
          ? { ...b, payment_status: "paid", status: "confirmed" }
          : b,
      ),
    );

    showToast(`✓ Đã thu tiền thành công đơn #${bookingCode}!`);
  };

  // ── CHECK-IN ──
  const handleConfirmCheckIn = () => {
    if (!checkInModalBooking) return;
    const bookingCode = checkInModalBooking.code;

    const localBookings = JSON.parse(
      localStorage.getItem("all_bookings") || "[]",
    );
    const updatedBookings = localBookings.map((b) => {
      if (b.code === bookingCode || b.booking_code === bookingCode) {
        return {
          ...b,
          status: "checked_in",
          assigned_room: assignedRoomNumber,
          deposit_amount: Number(depositAmount),
          checkin_note: checkInNote,
          checked_in_at: new Date().toISOString(),
        };
      }
      return b;
    });
    localStorage.setItem("all_bookings", JSON.stringify(updatedBookings));

    setBookings((prev) =>
      prev.map((b) =>
        b.code === bookingCode
          ? {
              ...b,
              status: "checked_in",
              assigned_room: assignedRoomNumber,
              deposit_amount: Number(depositAmount),
              checkin_note: checkInNote,
              checked_in_at: new Date().toISOString(),
            }
          : b,
      ),
    );

    showToast(
      `✓ Check-in thành công! Giao ${assignedRoomNumber} & Nhận cọc ${formatVND(depositAmount)}.`,
    );
    setCheckInModalBooking(null);
  };

  // ── ĐỔI PHÒNG ──
  const handleConfirmRoomMove = () => {
    if (!roomMoveBooking) return;
    const bookingCode = roomMoveBooking.code;

    const localBookings = JSON.parse(
      localStorage.getItem("all_bookings") || "[]",
    );
    const updatedBookings = localBookings.map((b) => {
      if (b.code === bookingCode || b.booking_code === bookingCode) {
        return { ...b, assigned_room: newRoomNumber };
      }
      return b;
    });
    localStorage.setItem("all_bookings", JSON.stringify(updatedBookings));

    setBookings((prev) =>
      prev.map((b) =>
        b.code === bookingCode ? { ...b, assigned_room: newRoomNumber } : b,
      ),
    );

    showToast(`✓ Đã chuyển sang ${newRoomNumber} thành công!`);
    setRoomMoveBooking(null);
  };

  // ── THÊM DỊCH VỤ ──
  const handleAddExtraService = (e) => {
    e.preventDefault();
    if (!extraServiceBooking) return;
    const bookingCode = extraServiceBooking.code;

    const newServiceItem = {
      id: `srv-${Date.now()}`,
      category: serviceCategory,
      name: serviceName,
      price: Number(servicePrice),
      time: new Date().toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    const localBookings = JSON.parse(
      localStorage.getItem("all_bookings") || "[]",
    );
    const updatedBookings = localBookings.map((b) => {
      if (b.code === bookingCode || b.booking_code === bookingCode) {
        const currentServices = b.extra_services || [];
        const newTotal = Number(b.total_price || 0) + Number(servicePrice);
        return {
          ...b,
          extra_services: [...currentServices, newServiceItem],
          total_price: newTotal,
        };
      }
      return b;
    });
    localStorage.setItem("all_bookings", JSON.stringify(updatedBookings));

    setBookings((prev) =>
      prev.map((b) => {
        if (b.code === bookingCode) {
          const currentServices = b.extra_services || [];
          const newTotal = Number(b.total_price || 0) + Number(servicePrice);
          return {
            ...b,
            extra_services: [...currentServices, newServiceItem],
            total_price: newTotal,
          };
        }
        return b;
      }),
    );

    showToast(
      `✓ Đã ghi nợ "${serviceName}" (+${formatVND(servicePrice)}) vào phòng!`,
    );
    setExtraServiceBooking(null);
  };

  // ── NHẬT KÝ LỄ TÂN ──
  const handleAddConciergeLog = (e) => {
    e.preventDefault();
    if (!conciergeModalBooking) return;
    const bookingCode = conciergeModalBooking.code;

    const newLogItem = {
      id: `log-${Date.now()}`,
      type: conciergeType,
      content: conciergeContent,
      time: new Date().toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      date: new Date().toLocaleDateString("vi-VN"),
    };

    const localBookings = JSON.parse(
      localStorage.getItem("all_bookings") || "[]",
    );
    const updatedBookings = localBookings.map((b) => {
      if (b.code === bookingCode || b.booking_code === bookingCode) {
        const currentLogs = b.concierge_logs || [];
        return { ...b, concierge_logs: [newLogItem, ...currentLogs] };
      }
      return b;
    });
    localStorage.setItem("all_bookings", JSON.stringify(updatedBookings));

    setBookings((prev) =>
      prev.map((b) => {
        if (b.code === bookingCode) {
          const currentLogs = b.concierge_logs || [];
          return { ...b, concierge_logs: [newLogItem, ...currentLogs] };
        }
        return b;
      }),
    );

    showToast(
      `✓ Đã lưu sổ nhật ký lễ tân phòng ${conciergeModalBooking.assigned_room}!`,
    );
    setConciergeModalBooking(null);
    setConciergeContent("");
  };

  // ── CHECK-OUT ──
  const handleConfirmFinalCheckOut = () => {
    if (!checkOutModalBooking) return;
    const bookingCode = checkOutModalBooking.code;

    const localBookings = JSON.parse(
      localStorage.getItem("all_bookings") || "[]",
    );
    const updatedBookings = localBookings.map((b) => {
      if (b.code === bookingCode || b.booking_code === bookingCode) {
        return {
          ...b,
          status: "checked_out",
          checked_out_at: new Date().toISOString(),
        };
      }
      return b;
    });
    localStorage.setItem("all_bookings", JSON.stringify(updatedBookings));

    setBookings((prev) =>
      prev.map((b) =>
        b.code === bookingCode ? { ...b, status: "checked_out" } : b,
      ),
    );

    showToast(
      `✓ Check-out thành công đơn #${bookingCode}! Đã hoàn tất đối soát.`,
    );
    setCheckOutModalBooking(null);
  };

  // ── MỞ HỒ SƠ THANH TOÁN (GUEST FOLIO) ──
  const handleOpenDossier = (booking, defaultTab = "bill") => {
    setDossierBooking(booking);
    setDossierTab(defaultTab);
    setCompanyVatInfo({
      buyerName: booking.customer_name || "",
      companyName: "CÔNG TY CỔ PHẦN TẬP ĐOÀN ĐẦU TƯ DU LỊCH VIỆT NAM",
      taxCode: "0108991234",
      companyAddress:
        "Số 123 Đường Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh",
      buyerEmail: booking.customer_email || "ketoan.congty@gmail.com",
    });
  };

  // ── BÁO CÁO GIAO CA ──
  const cashTotalToday = bookings
    .filter(
      (b) =>
        b.payment_method === "office" &&
        (b.payment_status === "paid" || b.status === "confirmed"),
    )
    .reduce((sum, b) => sum + Number(b.total_price || 0), 0);

  const qrTotalToday = bookings
    .filter(
      (b) =>
        b.payment_method === "qr" &&
        (b.payment_status === "paid" || b.status === "confirmed"),
    )
    .reduce((sum, b) => sum + Number(b.total_price || 0), 0);

  const totalDepositHeld = bookings
    .filter((b) => b.status === "checked_in")
    .reduce((sum, b) => sum + Number(b.deposit_amount || 0), 0);

  const waitingCheckInCount = bookings.filter(
    (b) =>
      (b.payment_status === "paid" || b.status === "confirmed") &&
      b.status === "confirmed",
  ).length;
  const inHouseCount = bookings.filter((b) => b.status === "checked_in").length;
  const checkedOutCount = bookings.filter(
    (b) => b.status === "checked_out",
  ).length;

  const filteredBookings = bookings.filter((b) => {
    const isPaid = b.payment_status === "paid" || b.status === "confirmed";
    const isCancelled =
      b.status === "cancelled" || b.payment_status === "cancelled";
    const isOfficePending =
      b.payment_method === "office" && !isPaid && !isCancelled;
    const isWaitingCheckIn = isPaid && b.status === "confirmed";
    const isCheckedIn = b.status === "checked_in";
    const isCheckedOut = b.status === "checked_out";

    if (statusTab === "pending_office") return isOfficePending;
    if (statusTab === "confirmed") return isWaitingCheckIn;
    if (statusTab === "checked_in") return isCheckedIn;
    if (statusTab === "checked_out") return isCheckedOut;
    if (statusTab === "cancelled") return isCancelled;

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      return (
        b.code.toLowerCase().includes(q) ||
        b.customer_name.toLowerCase().includes(q) ||
        b.customer_phone.includes(q) ||
        (b.assigned_room && b.assigned_room.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-7 font-sans text-slate-800 pb-20">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-5 py-3.5 rounded-2xl shadow-2xl text-white font-bold text-sm bg-slate-950 border border-slate-700 animate-in slide-in-from-bottom-5">
          <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
          <span>{toast.message}</span>
        </div>
      )}

      {/* ── 1. HEADER CHÍNH ── */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-bold text-xs">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
            Hệ Thống Lễ Tân & Thu Ngân 24/7 (PMS v2.5)
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Quản Lý Đặt Phòng & Vận Hành Lưu Trú
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Trung tâm điều phối đón khách, giao nhận phòng, phục vụ minibar và
            in hóa đơn GTGT
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setIsShiftModalOpen(true)}
            className="flex-1 sm:flex-none px-4 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-2xl transition flex items-center justify-center gap-2 shadow-sm cursor-pointer active:scale-95"
          >
            <Coins size={16} /> Báo Cáo Két Tiền
          </button>

          <button
            onClick={fetchBookings}
            className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl transition cursor-pointer active:scale-95"
            title="Làm mới dữ liệu"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* ── 2. BẢNG 4 CHỈ SỐ KPI VẬN HÀNH TRONG NGÀY ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Khách sắp đến
            </span>
            <Clock size={18} className="text-blue-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-black text-blue-900">
              {waitingCheckInCount}
            </h3>
            <span className="text-xs text-slate-400 font-bold">đơn</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Đang lưu trú
            </span>
            <BedDouble size={18} className="text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-black text-emerald-600">
              {inHouseCount}
            </h3>
            <span className="text-xs text-slate-400 font-bold">phòng</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Đã Check-out
            </span>
            <CheckCircle2 size={18} className="text-slate-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-black text-slate-700">
              {checkedOutCount}
            </h3>
            <span className="text-xs text-slate-400 font-bold">lượt</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Tiền mặt tại két
            </span>
            <DollarSign size={18} className="text-amber-500" />
          </div>
          <div className="flex items-baseline gap-1">
            <h3 className="text-2xl font-black text-amber-700 tracking-tight">
              {formatVND(cashTotalToday)}
            </h3>
          </div>
        </div>
      </div>

      {/* ── 3. TOOLBAR: TABS & TÌM KIẾM ── */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {TABS.map((tab) => {
            const count = bookings.filter((b) => {
              const isPaid =
                b.payment_status === "paid" || b.status === "confirmed";
              const isCancelled =
                b.status === "cancelled" || b.payment_status === "cancelled";
              if (tab.id === "all") return true;
              if (tab.id === "pending_office")
                return b.payment_method === "office" && !isPaid && !isCancelled;
              if (tab.id === "confirmed")
                return isPaid && b.status === "confirmed";
              if (tab.id === "checked_in") return b.status === "checked_in";
              if (tab.id === "checked_out") return b.status === "checked_out";
              if (tab.id === "cancelled") return isCancelled;
              return true;
            }).length;

            return (
              <button
                key={tab.id}
                onClick={() => setStatusTab(tab.id)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                  statusTab === tab.id
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                    statusTab === tab.id
                      ? "bg-white/20 text-white"
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm nhanh theo Mã đơn (#GST-...), Tên khách hàng, Số điện thoại hoặc Số phòng..."
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold focus:border-blue-600 focus:bg-white transition outline-none"
          />
        </div>
      </div>

      {/* ── 4. BẢNG DỮ LIỆU ĐƠN PHÒNG CHUẨN PMS ── */}
      {loading ? (
        <div className="py-28 flex justify-center bg-white rounded-3xl border border-slate-200 shadow-2xs">
          <LoadingSpinner size="lg" label="Đang đối soát dữ liệu phòng..." />
        </div>
      ) : filteredBookings.length > 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50/80 text-slate-400 text-[10px] font-black uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-4 px-5">Đơn Hàng & Khách</th>
                  <th className="py-4 px-4">Hạng Phòng & Bàn Giao</th>
                  <th className="py-4 px-4">Khung Giờ Lưu Trú</th>
                  <th className="py-4 px-4">Tiền Cọc (Deposit)</th>
                  <th className="py-4 px-4 text-right">Tổng Tiền</th>
                  <th className="py-4 px-4 text-center">Trạng Thái</th>
                  <th className="py-4 px-5 text-center">Nghiệp Vụ Lễ Tân</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredBookings.map((b) => {
                  const isPaid =
                    b.payment_status === "paid" || b.status === "confirmed";
                  const isCancelled =
                    b.status === "cancelled" ||
                    b.payment_status === "cancelled";
                  const isOfficePending =
                    b.payment_method === "office" && !isPaid && !isCancelled;
                  const isWaitingCheckIn = isPaid && b.status === "confirmed";
                  const isCheckedIn = b.status === "checked_in";
                  const isCheckedOut = b.status === "checked_out";

                  return (
                    <tr
                      key={b.code}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      {/* Mã đơn & Khách */}
                      <td className="py-4 px-5">
                        <div className="space-y-0.5">
                          <span className="font-mono font-black text-blue-900 text-xs tracking-wider bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 inline-block mb-1">
                            #{b.code}
                          </span>
                          <strong className="text-slate-900 block text-sm font-extrabold">
                            {b.customer_name}
                          </strong>
                          <p className="text-[11px] text-slate-400 font-mono">
                            {b.customer_phone}
                          </p>
                        </div>
                      </td>

                      {/* Hạng phòng & Phòng bàn giao */}
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          <strong className="text-slate-800 block">
                            {b.room_name}
                          </strong>
                          {isCheckedIn ? (
                            <span className="inline-flex items-center gap-1.5 font-black text-xs text-blue-700 bg-blue-50 px-2.5 py-1 rounded-xl border border-blue-200">
                              <Key size={13} /> {b.assigned_room}
                            </span>
                          ) : isCheckedOut ? (
                            <span className="text-slate-400 text-[11px] font-semibold italic">
                              Đã trả ({b.assigned_room})
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px] italic">
                              Chưa xếp phòng
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Ngày nhận / trả */}
                      <td className="py-4 px-4 text-xs font-semibold text-slate-600">
                        <div className="space-y-0.5">
                          <p className="text-slate-900 font-bold">
                            {b.check_in}
                          </p>
                          <p className="text-slate-400 text-[11px]">
                            đến {b.check_out}
                          </p>
                        </div>
                      </td>

                      {/* Tiền cọc */}
                      <td className="py-4 px-4">
                        {b.deposit_amount > 0 ? (
                          <span className="inline-flex items-center gap-1 font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
                            🛡️ {formatVND(b.deposit_amount)}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">
                            Chưa thu cọc
                          </span>
                        )}
                      </td>

                      {/* Tổng tiền */}
                      <td className="py-4 px-4 text-right">
                        <strong className="text-sm font-black text-[#ff6a00] block">
                          {formatVND(b.total_price)}
                        </strong>
                        {b.extra_services && b.extra_services.length > 0 && (
                          <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded-md inline-block mt-0.5">
                            +{b.extra_services.length} dịch vụ
                          </span>
                        )}
                      </td>

                      {/* Trạng thái */}
                      <td className="py-4 px-4 text-center">
                        {isOfficePending ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300 animate-pulse">
                            <Clock size={13} /> Chờ thu tiền
                          </span>
                        ) : isWaitingCheckIn ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
                            <Clock size={13} /> Chờ Check-in
                          </span>
                        ) : isCheckedIn ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <BedDouble size={13} /> Đang ở
                          </span>
                        ) : isCheckedOut ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            <CheckCircle2 size={13} /> Đã Check-out
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <XCircle size={13} /> Đã hủy
                          </span>
                        )}
                      </td>

                      {/* Cụm Nghiệp vụ Lễ tân */}
                      <td className="py-4 px-5 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {isOfficePending && (
                            <button
                              type="button"
                              onClick={() => handleConfirmOfficePayment(b.code)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center gap-1 cursor-pointer"
                            >
                              <DollarSign size={13} /> Thu tiền
                            </button>
                          )}

                          {isWaitingCheckIn && (
                            <button
                              type="button"
                              onClick={() => {
                                setCheckInModalBooking(b);
                                setAssignedRoomNumber("Phòng 101");
                                setDepositAmount(500000);
                              }}
                              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center gap-1 cursor-pointer"
                            >
                              <Key size={13} /> Check-in
                            </button>
                          )}

                          {isCheckedIn && (
                            <>
                              <button
                                type="button"
                                onClick={() => setExtraServiceBooking(b)}
                                className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-bold text-xs rounded-xl transition flex items-center gap-1 cursor-pointer"
                                title="Thêm Minibar, Giặt là, Thuê xe..."
                              >
                                <Wine size={13} /> + Minibar
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setRoomMoveBooking(b);
                                  setNewRoomNumber("Phòng 202");
                                }}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition cursor-pointer"
                                title="Hỗ trợ chuyển phòng"
                              >
                                <ArrowRightLeft size={14} />
                              </button>

                              <button
                                type="button"
                                onClick={() => setConciergeModalBooking(b)}
                                className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl transition cursor-pointer"
                                title="Nhật ký báo thức / Bưu phẩm / Phàn nàn"
                              >
                                <Bell size={14} />
                              </button>

                              <button
                                type="button"
                                onClick={() => setCheckOutModalBooking(b)}
                                className="px-3 py-1.5 bg-slate-900 hover:bg-black text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center gap-1 cursor-pointer"
                              >
                                <LogOutIcon size={13} /> Check-out
                              </button>
                            </>
                          )}

                          {/* 🛑 ĐÃ ĐỔI TÊN THÀNH HỒ SƠ THANH TOÁN CHUẨN XỊN */}
                          <button
                            type="button"
                            onClick={() => handleOpenDossier(b, "bill")}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs rounded-xl transition flex items-center gap-1 cursor-pointer"
                            title="Hồ sơ quyết toán & Hóa đơn VAT"
                          >
                            <FileText size={13} /> Hồ Sơ Thanh Toán
                          </button>
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
          icon={Ticket}
          title="Không tìm thấy đơn đặt phòng nào"
          description="Hiện tại không có đơn nào phù hợp với bộ lọc tìm kiếm này."
          actionLabel="Xem tất cả đơn đặt"
          onAction={() => {
            setStatusTab("all");
            setSearch("");
          }}
        />
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════
          🔑 MODAL CHECK-IN & THU CỌC
      ═══════════════════════════════════════════════════════════════════════════ */}
      {checkInModalBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in font-sans">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
            <div className="p-5 bg-blue-600 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                <h3 className="font-extrabold text-sm">
                  Thủ Tục Check-in & Giao Phòng
                </h3>
              </div>
              <button
                onClick={() => setCheckInModalBooking(null)}
                className="text-blue-200 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <div className="p-3.5 bg-blue-50/60 rounded-2xl border border-blue-100 space-y-1">
                <p>
                  <b>Khách hàng:</b>{" "}
                  <strong className="text-blue-950">
                    {checkInModalBooking.customer_name}
                  </strong>{" "}
                  ({checkInModalBooking.customer_phone})
                </p>
                <p>
                  <b>Hạng phòng:</b> {checkInModalBooking.room_name}
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Chọn số phòng bàn giao cho khách:
                </label>
                <select
                  value={assignedRoomNumber}
                  onChange={(e) => setAssignedRoomNumber(e.target.value)}
                  className="w-full h-11 border-2 border-blue-500 rounded-xl px-3.5 font-bold text-blue-900 bg-white outline-none cursor-pointer"
                >
                  <option value="Phòng 101">
                    🔑 Phòng 101 (Tầng 1 - View Vườn)
                  </option>
                  <option value="Phòng 102">
                    🔑 Phòng 102 (Tầng 1 - View Vườn)
                  </option>
                  <option value="Phòng 201">
                    🔑 Phòng 201 (Tầng 2 - Ban công)
                  </option>
                  <option value="Phòng 202">
                    🔑 Phòng 202 (Tầng 2 - Ban công)
                  </option>
                  <option value="Phòng 301">
                    🔑 Phòng 301 (Tầng 3 - VIP Ocean)
                  </option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Thu tiền đặt cọc (Deposit VNĐ):
                </label>
                <input
                  type="number"
                  step="50000"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(Number(e.target.value))}
                  className="w-full h-11 border border-slate-300 rounded-xl px-3.5 font-extrabold text-emerald-700 text-sm outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Ghi chú lễ tân:
                </label>
                <input
                  type="text"
                  value={checkInNote}
                  onChange={(e) => setCheckInNote(e.target.value)}
                  className="w-full h-11 border border-slate-300 rounded-xl px-3.5 outline-none font-medium"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  onClick={() => setCheckInModalBooking(null)}
                  className="px-4 py-2.5 border border-slate-300 rounded-xl font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  onClick={handleConfirmCheckIn}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl shadow-md cursor-pointer"
                >
                  Xác nhận Check-in
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════
          🚪 MODAL CHECK-OUT & QUYẾT TOÁN CỌC
      ═══════════════════════════════════════════════════════════════════════════ */}
      {checkOutModalBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in font-sans">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
            <div className="p-5 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-extrabold text-sm flex items-center gap-2">
                <Receipt size={18} /> Quyết Toán & Tiễn Khách (Check-out)
              </h3>
              <button
                onClick={() => setCheckOutModalBooking(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-slate-800">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Tiền phòng lưu trú:</span>
                  <strong className="text-slate-900">
                    {formatVND(checkOutModalBooking.total_price)}
                  </strong>
                </div>

                {checkOutModalBooking.extra_services?.length > 0 && (
                  <div className="space-y-1 pt-1.5 border-t border-slate-200">
                    <span className="font-bold text-purple-700 block">
                      Dịch vụ phụ phát sinh (
                      {checkOutModalBooking.extra_services.length} mục):
                    </span>
                    {checkOutModalBooking.extra_services.map((srv, i) => (
                      <div
                        key={i}
                        className="flex justify-between text-[11px] text-slate-600 pl-2"
                      >
                        <span>
                          • {srv.name} ({srv.time}):
                        </span>
                        <strong className="font-mono">
                          +{formatVND(srv.price)}
                        </strong>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-between pt-2 border-t border-slate-200 text-emerald-800 font-bold">
                  <span>Tiền cọc đã nhận lúc Check-in (Deposit):</span>
                  <span>
                    -{formatVND(checkOutModalBooking.deposit_amount || 0)}
                  </span>
                </div>

                <div className="flex justify-between items-center pt-2.5 border-t-2 border-slate-900 text-sm">
                  <strong className="text-slate-900">
                    Số tiền cọc cần hoàn trả cho khách:
                  </strong>
                  <strong className="text-base font-black text-emerald-700 font-mono">
                    {formatVND(
                      Math.max(0, checkOutModalBooking.deposit_amount || 0),
                    )}
                  </strong>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setCheckOutModalBooking(null)}
                  className="px-4 py-2.5 border border-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  onClick={handleConfirmFinalCheckOut}
                  className="px-6 py-2.5 bg-slate-900 hover:bg-black text-white font-extrabold rounded-xl shadow-md cursor-pointer"
                >
                  Hoàn cọc & Check-out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════
          🍷 MODAL GHI NỢ DỊCH VỤ / MINIBAR
      ═══════════════════════════════════════════════════════════════════════════ */}
      {extraServiceBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in font-sans">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
            <div className="p-5 bg-purple-600 text-white flex justify-between items-center">
              <h3 className="font-extrabold text-sm flex items-center gap-2">
                <Wine size={18} /> Ghi Nợ Dịch Vụ / Minibar Vào Phòng
              </h3>
              <button
                onClick={() => setExtraServiceBooking(null)}
                className="text-purple-200 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <form
              onSubmit={handleAddExtraService}
              className="p-6 space-y-4 text-xs"
            >
              <p>
                <b>Khách hàng:</b> {extraServiceBooking.customer_name} (
                {extraServiceBooking.assigned_room})
              </p>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Loại dịch vụ:
                </label>
                <select
                  value={serviceCategory}
                  onChange={(e) => setServiceCategory(e.target.value)}
                  className="w-full h-11 border border-slate-300 rounded-xl px-3.5 bg-white font-semibold outline-none cursor-pointer"
                >
                  <option value="minibar">
                    🍷 Minibar (Nước ngọt, Bia, Snack)
                  </option>
                  <option value="laundry">👔 Dịch vụ Giặt ủi (Laundry)</option>
                  <option value="vehicle">🛵 Thuê xe máy / Ô tô</option>
                  <option value="dining">
                    🍽️ Ăn uống tại phòng / Nhà hàng
                  </option>
                  <option value="spa">💆 Dịch vụ Spa & Massage</option>
                  <option value="damage">
                    ⚠️ Bồi thường hư hỏng trang thiết bị
                  </option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Tên dịch vụ chi tiết:
                </label>
                <input
                  type="text"
                  required
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  className="w-full h-11 border border-slate-300 rounded-xl px-3.5 bg-white outline-none font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Số tiền (VNĐ):
                </label>
                <input
                  type="number"
                  step="5000"
                  required
                  value={servicePrice}
                  onChange={(e) => setServicePrice(e.target.value)}
                  className="w-full h-11 border border-slate-300 rounded-xl px-3.5 bg-white font-extrabold text-purple-700 text-sm outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setExtraServiceBooking(null)}
                  className="px-4 py-2.5 border border-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-extrabold rounded-xl shadow-md cursor-pointer"
                >
                  Xác nhận ghi nợ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════
          🛎️ MODAL NHẬT KÝ CHĂM SÓC KHÁCH HÀNG (CONCIERGE)
      ═══════════════════════════════════════════════════════════════════════════ */}
      {conciergeModalBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in font-sans">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
            <div className="p-5 bg-blue-700 text-white flex justify-between items-center">
              <h3 className="font-extrabold text-sm flex items-center gap-2">
                <Bell size={18} /> Nhật Ký Chăm Sóc & Yêu Cầu Của Khách
              </h3>
              <button
                onClick={() => setConciergeModalBooking(null)}
                className="text-blue-200 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p>
                <b>Khách hàng:</b> {conciergeModalBooking.customer_name} (
                {conciergeModalBooking.assigned_room})
              </p>

              {conciergeModalBooking.concierge_logs?.length > 0 && (
                <div className="space-y-1.5 max-h-36 overflow-y-auto p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <span className="font-bold text-slate-600 block mb-1">
                    Lịch sử yêu cầu đã lưu:
                  </span>
                  {conciergeModalBooking.concierge_logs.map((log, i) => (
                    <div
                      key={i}
                      className="text-[11px] bg-white p-2.5 rounded-xl border border-slate-200 flex justify-between items-start"
                    >
                      <span>
                        •{" "}
                        <b>
                          {log.type === "wake_up"
                            ? "⏰ Báo thức"
                            : log.type === "birthday"
                              ? "🎂 Sinh nhật"
                              : log.type === "complaint"
                                ? "⚠️ Phàn nàn"
                                : "📦 Bưu phẩm"}
                          :
                        </b>{" "}
                        {log.content}
                      </span>
                      <span className="text-slate-400 font-mono text-[10px] shrink-0 ml-2">
                        {log.time}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <form
                onSubmit={handleAddConciergeLog}
                className="space-y-3 pt-2 border-t border-slate-100"
              >
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">
                    Loại nghiệp vụ chăm sóc:
                  </label>
                  <select
                    value={conciergeType}
                    onChange={(e) => setConciergeType(e.target.value)}
                    className="w-full h-11 border border-slate-300 rounded-xl px-3.5 bg-white font-semibold outline-none cursor-pointer"
                  >
                    <option value="wake_up">
                      ⏰ Hẹn giờ báo thức (Wake-up call)
                    </option>
                    <option value="package">
                      📦 Nhận giữ thư từ / Bưu phẩm
                    </option>
                    <option value="birthday">
                      🎂 Quà tặng sinh nhật khách VIP
                    </option>
                    <option value="housekeeping">
                      🧹 Yêu cầu thêm chăn/gối/dọn phòng
                    </option>
                    <option value="complaint">
                      ⚠️ Tiếp nhận & Giải quyết phàn nàn
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">
                    Nội dung chi tiết:
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={conciergeContent}
                    onChange={(e) => setConciergeContent(e.target.value)}
                    placeholder="VD: Hẹn báo thức lúc 06:00 sáng mai gọi taxi ra sân bay..."
                    className="w-full border border-slate-300 rounded-xl p-3 outline-none focus:border-blue-600 font-medium"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setConciergeModalBooking(null)}
                    className="px-4 py-2.5 border border-slate-300 rounded-xl font-bold cursor-pointer"
                  >
                    Đóng
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-extrabold rounded-xl shadow-md cursor-pointer"
                  >
                    Lưu vào sổ lễ tân
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════
          📄 MODAL HỒ SƠ THANH TOÁN (GUEST FOLIO, VAT INVOICE, REGISTRATION, THANK YOU)
      ═══════════════════════════════════════════════════════════════════════════ */}
      {dossierBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in font-sans">
          <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200 max-h-[90vh] flex flex-col">
            <div className="p-5 bg-slate-900 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-400" />
                <h3 className="font-extrabold text-sm">
                  Hồ Sơ Quyết Toán & Hóa Đơn Điện Tử (Guest Folio)
                </h3>
              </div>
              <button
                onClick={() => setDossierBooking(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* TAB SELECTOR */}
            <div className="flex gap-2 p-3 bg-slate-100 border-b border-slate-200 overflow-x-auto shrink-0">
              {[
                { id: "bill", label: "1. Bảng kê chi phí (Guest Folio)" },
                { id: "vat", label: "2. Hóa đơn GTGT (VAT MISA)" },
                { id: "registration", label: "3. Phiếu đăng ký nhận phòng" },
                { id: "thankyou", label: "4. Thư cảm ơn của Giám Đốc" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setDossierTab(tab.id)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    dossierTab === tab.id
                      ? "bg-[#003580] text-white shadow-xs"
                      : "bg-white text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* NỘI DUNG TỪNG MÓN */}
            <div
              className="p-8 space-y-5 text-xs text-slate-800 overflow-y-auto flex-1 bg-white"
              id="printable-dossier"
            >
              {dossierTab === "bill" && (
                <div className="space-y-4">
                  <div className="text-center border-b pb-3 space-y-0.5">
                    <h2 className="font-black text-base uppercase text-[#003580]">
                      {dossierBooking.hotel_name}
                    </h2>
                    <p className="font-bold text-xs uppercase text-slate-600">
                      BẢNG TỔNG HỢP CHI PHÍ DỊCH VỤ (GUEST FOLIO)
                    </p>
                    <p className="text-[11px] text-slate-400 font-mono">
                      Mã đơn: #{dossierBooking.code}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <p>
                      <b>Khách hàng:</b> {dossierBooking.customer_name} (
                      {dossierBooking.customer_phone})
                    </p>
                    <p>
                      <b>Số phòng:</b> {dossierBooking.assigned_room} (
                      {dossierBooking.room_name})
                    </p>
                    <p>
                      <b>Nhận phòng:</b> {dossierBooking.check_in}
                    </p>
                    <p>
                      <b>Trả phòng:</b> {dossierBooking.check_out}
                    </p>
                  </div>

                  <table className="w-full border-collapse border border-slate-200 text-xs">
                    <thead className="bg-slate-50 font-bold">
                      <tr>
                        <th className="border p-2.5 text-left">
                          Dịch vụ sử dụng
                        </th>
                        <th className="border p-2.5 text-center w-28">
                          Thời gian
                        </th>
                        <th className="border p-2.5 text-right w-36">
                          Thành tiền
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border p-2.5">
                          Tiền phòng lưu trú ({dossierBooking.room_name})
                        </td>
                        <td className="border p-2.5 text-center">
                          {dossierBooking.check_in}
                        </td>
                        <td className="border p-2.5 text-right font-bold">
                          {formatVND(dossierBooking.total_price)}
                        </td>
                      </tr>
                      {dossierBooking.extra_services?.map((srv, idx) => (
                        <tr key={idx}>
                          <td className="border p-2.5">• {srv.name}</td>
                          <td className="border p-2.5 text-center">
                            {srv.time}
                          </td>
                          <td className="border p-2.5 text-right font-bold">
                            +{formatVND(srv.price)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="p-4 bg-slate-50 rounded-2xl flex justify-between items-center text-sm font-bold border border-slate-200">
                    <span>TỔNG TIỀN PHẢI THANH TOÁN:</span>
                    <span className="text-xl font-black text-[#ff6a00]">
                      {formatVND(dossierBooking.total_price)}
                    </span>
                  </div>
                </div>
              )}

              {dossierTab === "vat" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-12 gap-4 pb-4 border-b-2 border-slate-900">
                    <div className="col-span-8 space-y-1">
                      <h2 className="font-black text-base uppercase text-[#003580]">
                        {dossierBooking.hotel_name}
                      </h2>
                      <p className="text-[11px]">
                        <b>Mã số thuế:</b> 031581779-001
                      </p>
                      <p className="text-[11px]">
                        <b>Địa chỉ:</b> Trung tâm du lịch, Việt Nam
                      </p>
                    </div>
                    <div className="col-span-4 text-right">
                      <p className="font-mono text-[10px]">
                        Ký hiệu: <b>1C26MMS</b>
                      </p>
                      <p className="font-mono text-rose-600 font-bold text-xs">
                        Số:{" "}
                        <b>0000{dossierBooking.code?.slice(-4) || "1234"}</b>
                      </p>
                    </div>
                  </div>

                  <h1 className="text-center text-lg font-black uppercase text-slate-900">
                    HÓA ĐƠN GIÁ TRỊ GIA TĂNG
                  </h1>

                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                    <p>
                      <b>Đơn vị mua hàng:</b> {companyVatInfo.companyName}
                    </p>
                    <p>
                      <b>Mã số thuế:</b>{" "}
                      <span className="font-mono font-bold text-blue-900">
                        {companyVatInfo.taxCode}
                      </span>
                    </p>
                    <p>
                      <b>Địa chỉ:</b> {companyVatInfo.companyAddress}
                    </p>
                  </div>

                  {(() => {
                    const totalPayment = Number(
                      dossierBooking.total_price || 650000,
                    );
                    const preTaxAmount = Math.round(
                      totalPayment / (1 + vatTaxRate / 100),
                    );
                    const vatAmount = totalPayment - preTaxAmount;
                    return (
                      <div className="space-y-2">
                        <table className="w-full border-collapse border text-xs">
                          <thead className="bg-slate-50 font-bold">
                            <tr>
                              <th className="border p-2">
                                Tên Hàng Hóa, Dịch Vụ
                              </th>
                              <th className="border p-2 text-center w-16">
                                ĐVT
                              </th>
                              <th className="border p-2 text-right w-36">
                                Thành Tiền
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="border p-2">
                                Dịch vụ lưu trú: {dossierBooking.room_name} (
                                {dossierBooking.assigned_room})
                              </td>
                              <td className="border p-2 text-center">Đêm</td>
                              <td className="border p-2 text-right font-mono font-bold">
                                {formatVND(preTaxAmount)}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                        <div className="p-3.5 bg-slate-50 rounded-xl flex justify-between text-xs border">
                          <span>
                            Thuế GTGT ({vatTaxRate}%):{" "}
                            <strong>+{formatVND(vatAmount)}</strong>
                          </span>
                          <span>
                            Tổng cộng:{" "}
                            <strong className="text-sm font-black text-blue-900">
                              {formatVND(totalPayment)}
                            </strong>
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {dossierTab === "registration" && (
                <div className="space-y-4 text-center">
                  <h2 className="font-black text-base uppercase text-[#003580]">
                    {dossierBooking.hotel_name}
                  </h2>
                  <h3 className="font-bold text-sm uppercase text-slate-700">
                    PHIẾU ĐĂNG KÝ NHẬN PHÒNG (REGISTRATION CARD)
                  </h3>
                  <div className="text-left p-4 bg-slate-50 rounded-2xl border space-y-2 text-xs">
                    <p>
                      <b>Khách hàng:</b> {dossierBooking.customer_name} (
                      {dossierBooking.customer_phone})
                    </p>
                    <p>
                      <b>Phòng:</b> {dossierBooking.assigned_room} (
                      {dossierBooking.room_name})
                    </p>
                    <p>
                      <b>Thời gian:</b> {dossierBooking.check_in} đến{" "}
                      {dossierBooking.check_out}
                    </p>
                    <p>
                      <b>Tiền cọc đã thu:</b>{" "}
                      {formatVND(dossierBooking.deposit_amount || 0)}
                    </p>
                  </div>
                </div>
              )}

              {dossierTab === "thankyou" && (
                <div className="space-y-4 p-6 bg-emerald-50/50 rounded-3xl border border-emerald-200">
                  <div className="text-center border-b border-emerald-200 pb-3">
                    <h2 className="font-black text-base uppercase text-emerald-950">
                      {dossierBooking.hotel_name}
                    </h2>
                    <p className="text-[11px] text-slate-500 italic">
                      THƯ TRI ÂN KHÁCH HÀNG
                    </p>
                  </div>
                  <p>
                    Kính gửi Quý khách{" "}
                    <strong>{dossierBooking.customer_name}</strong>,
                  </p>
                  <p className="leading-relaxed">
                    Ban Giám đốc và toàn thể nhân viên khách sạn{" "}
                    <strong>{dossierBooking.hotel_name}</strong> xin gửi lời cảm
                    ơn chân thành nhất vì Quý khách đã lựa chọn chúng tôi cho kỳ
                    nghỉ vừa qua.
                  </p>
                  <p className="leading-relaxed">
                    Kính chúc Quý khách có một hành trình tiếp theo thật nhiều
                    niềm vui. Rất mong được đón tiếp Quý khách trong những
                    chuyến đi sắp tới!
                  </p>
                  <div className="text-right pt-4">
                    <strong className="text-slate-900 block">
                      Ban Giám Đốc Khách Sạn
                    </strong>
                    <span className="text-[10px] text-slate-400 italic">
                      Trân trọng cảm ơn,
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* FOOTER */}
            <div className="p-5 bg-slate-50 border-t border-slate-200 flex justify-end gap-2.5 shrink-0">
              <button
                onClick={() => setDossierBooking(null)}
                className="px-5 py-2.5 border border-slate-300 rounded-xl font-bold text-xs text-slate-600 hover:bg-white cursor-pointer"
              >
                Đóng
              </button>
              <button
                onClick={() => window.print()}
                className="px-6 py-2.5 bg-[#003580] hover:bg-blue-900 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <Printer size={15} /> In phiếu này
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════
          📊 MODAL BÁO CÁO GIAO CA THU NGÂN
      ═══════════════════════════════════════════════════════════════════════════ */}
      {isShiftModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in font-sans">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
            <div className="p-5 bg-amber-500 text-amber-950 flex justify-between items-center font-bold text-sm">
              <div className="flex items-center gap-2">
                <Coins size={18} />
                <span>Báo Cáo Bàn Giao Ca Trực & Két Tiền Hôm Nay</span>
              </div>
              <button
                onClick={() => setIsShiftModalOpen(false)}
                className="hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-slate-800">
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 space-y-3">
                <div className="flex justify-between items-center text-sm font-bold border-b border-amber-200 pb-2">
                  <span>💵 Tiền mặt thực thu tại quầy:</span>
                  <span className="text-xl font-black text-emerald-700">
                    {formatVND(cashTotalToday)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>💳 Tiền chuyển khoản QR:</span>
                  <strong className="font-mono font-bold text-blue-900">
                    {formatVND(qrTotalToday)}
                  </strong>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>🛡️ Tiền cọc đang giữ của khách đang ở:</span>
                  <strong className="font-bold text-amber-800">
                    {formatVND(totalDepositHeld)}
                  </strong>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setIsShiftModalOpen(false)}
                  className="px-4 py-2.5 border border-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-5 py-2.5 bg-slate-900 text-white font-extrabold rounded-xl flex items-center gap-1 cursor-pointer shadow-md"
                >
                  <Printer size={15} /> In biên bản bàn giao ca
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════
          🔄 MODAL ĐỔI PHÒNG KHI ĐANG Ở
      ═══════════════════════════════════════════════════════════════════════════ */}
      {roomMoveBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in font-sans">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
            <div className="p-5 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-extrabold text-sm flex items-center gap-2">
                <ArrowRightLeft size={16} /> Đổi Phòng Cho Khách Đang Ở
              </h3>
              <button
                onClick={() => setRoomMoveBooking(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <p>
                <b>Khách hàng:</b> {roomMoveBooking.customer_name}
              </p>
              <p>
                <b>Phòng hiện tại:</b>{" "}
                <span className="font-bold text-rose-600">
                  {roomMoveBooking.assigned_room}
                </span>
              </p>
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Chuyển sang số phòng mới:
                </label>
                <select
                  value={newRoomNumber}
                  onChange={(e) => setNewRoomNumber(e.target.value)}
                  className="w-full h-11 border border-slate-300 rounded-xl px-3.5 font-bold bg-white outline-none cursor-pointer"
                >
                  <option value="Phòng 102">🔑 Phòng 102 (Tầng 1)</option>
                  <option value="Phòng 201">🔑 Phòng 201 (Tầng 2)</option>
                  <option value="Phòng 202">🔑 Phòng 202 (Tầng 2)</option>
                  <option value="Phòng 301">🔑 Phòng 301 (Tầng 3 VIP)</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Lý do chuyển buồng:
                </label>
                <input
                  type="text"
                  value={roomMoveReason}
                  onChange={(e) => setRoomMoveReason(e.target.value)}
                  className="w-full h-11 border border-slate-300 rounded-xl px-3.5 font-medium outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setRoomMoveBooking(null)}
                  className="px-4 py-2.5 border border-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  onClick={handleConfirmRoomMove}
                  className="px-5 py-2.5 bg-slate-900 text-white font-extrabold rounded-xl shadow-md cursor-pointer"
                >
                  Xác nhận đổi phòng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
