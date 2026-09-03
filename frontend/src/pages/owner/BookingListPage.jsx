// src/pages/owner/BookingListPage.jsx
import React, { useState, useEffect, useMemo } from "react";
import {
  CalendarCheck,
  Building2,
  Search,
  RefreshCw,
  Plus,
  Download,
  Calendar,
  Eye,
  Key,
  LogOut as LogOutIcon,
  Printer,
  X,
  Ticket,
  ShieldCheck,
} from "lucide-react";
import { LoadingSpinner, EmptyState } from "@/components/common";
import { useAuthStore } from "@/stores/authStore";
import PropertySearchSelector from "@/components/common/PropertySearchSelector";

const STATUS_TABS = [
  { id: "all", label: "Tất cả đơn đặt" },
  { id: "pending", label: "Chờ xác nhận (Pending)" },
  { id: "confirmed", label: "Đã xác nhận (Confirmed)" },
  { id: "checked_in", label: "Đang lưu trú (Checked In)" },
  { id: "checked_out", label: "Đã trả phòng (Checked Out)" },
  { id: "cancelled", label: "Đã hủy (Cancelled)" },
];

export default function BookingListPage() {
  const { user } = useAuthStore();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Phân quyền Admin vs Owner
  const userRole = String(user?.role || user?.role_name || "").toLowerCase();
  const isAdmin = userRole.includes("admin") || user?.role_id === 1;
  const userEmail = String(user?.email || "")
    .toLowerCase()
    .trim();

  // 🏢 1. QUẢN LÝ DANH SÁCH CƠ SỞ (ĐÃ KHÓA BẢO MẬT CHỈ HIỆN CƠ SỞ CỦA OWNER)
  const [myHotels, setMyHotels] = useState([]);
  const [selectedHotelId, setSelectedHotelId] = useState("");

  // 🔍 2. BỘ LỌC
  const [statusTab, setStatusTab] = useState("all");
  const [search, setSearch] = useState("");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");

  const [selectedBookingDetails, setSelectedBookingDetails] = useState(null);
  const [isWalkInModalOpen, setIsWalkInModalOpen] = useState(false);
  const [walkInForm, setWalkInForm] = useState({
    guestName: "",
    guestPhone: "",
    guestEmail: "",
    roomName: "Deluxe King Hướng Biển",
    assignedRoom: "P.101",
    checkIn: new Date().toISOString().split("T")[0],
    checkOut: new Date(Date.now() + 86400000).toISOString().split("T")[0],
    totalPrice: 850000,
    depositAmount: 500000,
    paymentMethod: "Tiền mặt tại quầy (Cash)",
    autoCheckIn: true,
  });

  const [checkInModalBooking, setCheckInModalBooking] = useState(null);
  const [assignedRoomNumber, setAssignedRoomNumber] = useState("P.101");
  const [depositAmount, setDepositAmount] = useState(500000);

  const [checkOutModalBooking, setCheckOutModalBooking] = useState(null);
  const [dossierBooking, setDossierBooking] = useState(null);

  const formatVND = (num) => Number(num || 0).toLocaleString("vi-VN") + " ₫";

  // ── 🏢 TẢI DANH SÁCH CƠ SỞ (BẢO MẬT ĐỘC LẬP THEO EMAIL CỦA OWNER) ──
  const loadScopedHotels = () => {
    const localApps = JSON.parse(
      localStorage.getItem("pending_partner_applications") || "[]",
    );

    let scopedList = [];

    if (isAdmin) {
      // 👑 ADMIN: Xem được tất cả cơ sở
      scopedList = localApps.map((h) => ({
        id: String(h.id || h.applicationId),
        name: h.name || h.hotelNameVi || "Cơ sở lưu trú",
        city: h.city || h.province || "Việt Nam",
        image: h.image,
      }));
    } else {
      // 🏨 OWNER: CHỈ XEM ĐƯỢC CƠ SỞ CỦA CHÍNH MÌNH (KHỚP EMAIL)
      scopedList = localApps
        .filter((h) => {
          const hEmail = String(
            h.emailContact || h.email || h.signerEmail || "",
          )
            .toLowerCase()
            .trim();
          return hEmail === userEmail;
        })
        .map((h) => ({
          id: String(h.id || h.applicationId),
          name: h.name || h.hotelNameVi || "Cơ sở của tôi",
          city: h.city || h.province || "Việt Nam",
          image: h.image,
        }));
    }

    setMyHotels(scopedList);

    // Mặc định chọn cơ sở đầu tiên của Owner (hoặc 'all' nếu là Admin)
    if (scopedList.length > 0) {
      setSelectedHotelId(isAdmin ? "all" : String(scopedList[0].id));
    }
  };

  const loadBookings = () => {
    setLoading(true);
    const realBookings = JSON.parse(
      localStorage.getItem("all_bookings") || "[]",
    );
    setBookings(realBookings);
    loadScopedHotels();
    setLoading(false);
  };

  useEffect(() => {
    loadBookings();
  }, [user]);

  const saveAndSync = (updatedList) => {
    setBookings(updatedList);
    localStorage.setItem("all_bookings", JSON.stringify(updatedList));
  };

  const selectedHotelObj = myHotels.find(
    (h) => String(h.id) === String(selectedHotelId),
  );

  const handleUpdateStatus = (bookingCode, newStatus) => {
    const updated = bookings.map((b) =>
      b.code === bookingCode ? { ...b, status: newStatus } : b,
    );
    saveAndSync(updated);
    alert(
      `✓ Đã cập nhật trạng thái đơn #${bookingCode} thành [${newStatus.toUpperCase()}]!`,
    );
    if (selectedBookingDetails && selectedBookingDetails.code === bookingCode) {
      setSelectedBookingDetails((prev) => ({ ...prev, status: newStatus }));
    }
  };

  const handleExportCSV = () => {
    let csv = "\uFEFF";
    csv +=
      "Cơ Sở,Mã Đơn,Tên Khách Hàng,Số Điện Thoại,Email,Hạng Phòng,Số Phòng,Ngày Nhận,Ngày Trả,Tổng Tiền (VND),Trạng Thái,Phương Thức\n";

    filteredBookings.forEach((b) => {
      csv += `"${b.hotel_name || ""}","${b.code}","${b.customer_name}","${b.customer_phone}","${b.customer_email}","${b.room_name}","${b.assigned_room || ""}","${b.check_in}","${b.check_out}",${b.total_price},"${b.status}","${b.payment_method}"\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Don_Dat_Phong_${selectedHotelObj?.name || "Co_So"}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleConfirmCheckIn = () => {
    if (!checkInModalBooking) return;
    const updated = bookings.map((b) =>
      b.code === checkInModalBooking.code
        ? {
            ...b,
            status: "checked_in",
            assigned_room: assignedRoomNumber,
            deposit_amount: Number(depositAmount),
          }
        : b,
    );
    saveAndSync(updated);
    alert(
      `✓ Check-in thành công đơn #${checkInModalBooking.code}! Giao ${assignedRoomNumber}.`,
    );
    setCheckInModalBooking(null);
  };

  const handleConfirmCheckOut = () => {
    if (!checkOutModalBooking) return;
    const updated = bookings.map((b) =>
      b.code === checkOutModalBooking.code
        ? { ...b, status: "checked_out" }
        : b,
    );
    saveAndSync(updated);
    alert(`✓ Check-out thành công đơn #${checkOutModalBooking.code}!`);
    setCheckOutModalBooking(null);
  };

  const statusBadge = {
    pending: {
      label: "Chờ xác nhận (Pending)",
      color: "bg-amber-50 text-amber-800 border-amber-300",
    },
    confirmed: {
      label: "Đã xác nhận (Confirmed)",
      color: "bg-blue-50 text-blue-700 border-blue-200",
    },
    checked_in: {
      label: "Đang lưu trú (In-House)",
      color: "bg-emerald-50 text-emerald-700 border-emerald-300",
    },
    checked_out: {
      label: "Đã trả phòng (Checked Out)",
      color: "bg-slate-100 text-slate-700 border-slate-300",
    },
    cancelled: {
      label: "Đã hủy (Cancelled)",
      color: "bg-rose-50 text-rose-700 border-rose-200",
    },
  };

  // ── 🔍 3. LỌC ĐƠN PHÒNG CHÍNH XÁC THEO CƠ SỞ CỦA OWNER (KHÔNG LỘ ĐƠN CỦA KHÁCH SẠN KHÁC) ──
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      // Nếu là Owner -> Bắt buộc đơn phải thuộc cơ sở của Owner
      if (!isAdmin) {
        if (!selectedHotelId) return false;
        const matchId = String(b.hotel_id) === String(selectedHotelId);
        const matchName =
          selectedHotelObj?.name &&
          b.hotel_name
            ?.toLowerCase()
            .includes(selectedHotelObj.name.toLowerCase());
        if (!matchId && !matchName) return false;
      } else {
        // Nếu là Admin và chọn cơ sở cụ thể
        if (selectedHotelId !== "all") {
          const matchId = String(b.hotel_id) === String(selectedHotelId);
          const matchName =
            selectedHotelObj?.name &&
            b.hotel_name
              ?.toLowerCase()
              .includes(selectedHotelObj.name.toLowerCase());
          if (!matchId && !matchName) return false;
        }
      }

      // Lọc theo trạng thái tab
      if (statusTab !== "all" && b.status !== statusTab) return false;
      // Lọc theo ngày
      if (startDateFilter && b.check_in < startDateFilter) return false;
      if (endDateFilter && b.check_out > endDateFilter) return false;

      // Tìm kiếm
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const bGuest = String(b.customer_name || "").toLowerCase();
        const bPhone = String(b.customer_phone || "");
        const bCode = String(b.code || "").toLowerCase();
        const bRoom = String(
          b.assigned_room || b.room_name || "",
        ).toLowerCase();
        return (
          bGuest.includes(q) ||
          bPhone.includes(q) ||
          bCode.includes(q) ||
          bRoom.includes(q)
        );
      }

      return true;
    });
  }, [
    bookings,
    selectedHotelId,
    selectedHotelObj,
    statusTab,
    startDateFilter,
    endDateFilter,
    search,
    isAdmin,
  ]);

  return (
    <div className="space-y-6 font-sans pb-16 text-slate-800">
      {/* ── 1. HEADER & BỘ CHỌN CƠ SỞ (ĐÃ BẢO MẬT) ── */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-wider mb-1">
            <ShieldCheck size={16} />{" "}
            {isAdmin
              ? "Ban Quản Trị Hệ Thống (Admin)"
              : "Kênh Quản Trị Của Chủ Cơ Sở (Owner PMS)"}
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Xử Lý Đơn Đặt Phòng Theo Cơ Sở
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isAdmin
              ? "Quản lý và kiểm soát toàn bộ đơn phòng của các khách sạn trên sàn"
              : `Quản trị buồng phòng và đón khách tại: ${selectedHotelObj?.name || "Cơ sở của bạn"}`}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
          {/* 🏢 BỘ CHỌN CƠ SỞ (CHỈ HIỆN CƠ SỞ CỦA OWNER, ẨN MỤC TOÀN SÀN NẾU KHÔNG PHẢI ADMIN) */}
          {myHotels.length > 0 && (
            <PropertySearchSelector
              hotels={myHotels}
              selectedHotelId={selectedHotelId}
              onSelectHotel={(id) => setSelectedHotelId(id)}
              showAllOption={isAdmin} // 👈 CHỈ ADMIN MỚI CÓ NÚT "TOÀN SÀN", OWNER BỊ ẨN
              placeholder="Chọn cơ sở của bạn..."
            />
          )}

          <button
            onClick={() => setIsWalkInModalOpen(true)}
            className="px-4 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0 active:scale-95"
          >
            <Plus size={15} /> + Đặt Tại Quầy
          </button>

          <button
            onClick={handleExportCSV}
            className="px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
          >
            <Download size={14} /> Xuất CSV
          </button>
        </div>
      </div>

      {/* ── 2. BỘ LỌC ── */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-100">
          <span className="font-bold text-slate-600">
            Đang hiển thị đơn phòng của:{" "}
            <strong className="text-blue-900 font-black text-sm">
              {isAdmin && selectedHotelId === "all"
                ? "Tất cả các cơ sở lưu trú (Toàn sàn)"
                : selectedHotelObj?.name || "Cơ sở của bạn"}
            </strong>
          </span>
          <span className="text-slate-400 font-semibold">
            {filteredBookings.length} Đơn đặt phòng
          </span>
        </div>

        {/* Status Tabs đếm số lượng */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {STATUS_TABS.map((tab) => {
            const count = bookings.filter((b) => {
              if (!isAdmin) {
                if (!selectedHotelId) return false;
                const matchId = String(b.hotel_id) === String(selectedHotelId);
                const matchName =
                  selectedHotelObj?.name &&
                  b.hotel_name
                    ?.toLowerCase()
                    .includes(selectedHotelObj.name.toLowerCase());
                if (!matchId && !matchName) return false;
              } else if (selectedHotelId !== "all") {
                const matchId = String(b.hotel_id) === String(selectedHotelId);
                const matchName =
                  selectedHotelObj?.name &&
                  b.hotel_name
                    ?.toLowerCase()
                    .includes(selectedHotelObj.name.toLowerCase());
                if (!matchId && !matchName) return false;
              }
              return tab.id === "all" ? true : b.status === tab.id;
            }).length;

            return (
              <button
                key={tab.id}
                onClick={() => setStatusTab(tab.id)}
                className={`px-4 py-2 rounded-2xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                  statusTab === tab.id
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-black ${statusTab === tab.id ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"}`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          <div className="md:col-span-6 relative">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Tìm theo Tên khách, Số điện thoại, Số phòng hoặc Mã đơn..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-600 focus:bg-white"
            />
          </div>

          <div className="md:col-span-6 flex items-center gap-2 text-xs font-medium">
            <Calendar size={15} className="text-slate-400 shrink-0" />
            <span className="text-slate-500 font-bold shrink-0">Lọc ngày:</span>
            <input
              type="date"
              value={startDateFilter}
              onChange={(e) => setStartDateFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border rounded-xl outline-none text-xs flex-1"
            />
            <span className="text-slate-400">&rarr;</span>
            <input
              type="date"
              value={endDateFilter}
              onChange={(e) => setEndDateFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border rounded-xl outline-none text-xs flex-1"
            />
          </div>
        </div>
      </div>

      {/* ── 3. BẢNG DANH SÁCH ĐƠN PHÒNG ── */}
      {loading ? (
        <div className="py-24 flex justify-center bg-white rounded-3xl border">
          <LoadingSpinner
            size="lg"
            label="Đang tải danh sách đơn đặt phòng..."
          />
        </div>
      ) : filteredBookings.length > 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-wider border-b">
              <tr>
                <th className="py-4 px-5">Mã Đơn & Khách Hàng</th>
                <th className="py-4 px-4">Cơ Sở Lưu Trú</th>
                <th className="py-4 px-4">Hạng Phòng & Số Phòng</th>
                <th className="py-4 px-4">Lưu Trú</th>
                <th className="py-4 px-4 text-right">Tổng Tiền</th>
                <th className="py-4 px-4 text-center">Trạng Thái</th>
                <th className="py-4 px-5 text-center">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredBookings.map((b) => {
                const st = statusBadge[b.status] || statusBadge.pending;
                return (
                  <tr
                    key={b.code}
                    onClick={() => setSelectedBookingDetails(b)}
                    className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                  >
                    <td className="py-4 px-5">
                      <span className="font-mono font-black text-blue-900 text-xs tracking-wider bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 inline-block mb-1">
                        #{b.code}
                      </span>
                      <strong className="text-slate-900 block text-sm font-extrabold group-hover:text-blue-700 transition-colors">
                        {b.customer_name}
                      </strong>
                      <span className="text-slate-400 font-mono text-[11px]">
                        {b.customer_phone}
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      <span className="font-bold text-blue-900 block text-xs bg-slate-50 px-2 py-1 rounded-lg border">
                        🏨{" "}
                        {b.hotel_name ||
                          selectedHotelObj?.name ||
                          "Cơ sở lưu trú"}
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      <strong className="text-slate-800 block">
                        {b.room_name}
                      </strong>
                      <span className="text-slate-500 text-[11px] font-semibold">
                        {b.assigned_room || "Chưa xếp phòng"}
                      </span>
                    </td>

                    <td className="py-4 px-4 text-slate-600">
                      <p className="text-slate-900 font-bold">{b.check_in}</p>
                      <p className="text-[11px] text-slate-400">
                        đến {b.check_out}
                      </p>
                    </td>

                    <td className="py-4 px-4 text-right">
                      <strong className="text-sm font-black text-[#ff6a00] block">
                        {formatVND(b.total_price)}
                      </strong>
                      <span className="text-[10px] text-slate-400">
                        {b.payment_method}
                      </span>
                    </td>

                    <td className="py-4 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${st.color}`}
                      >
                        {st.label.split(" ")[0]}
                      </span>
                    </td>

                    <td
                      className="py-4 px-5 text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        {b.status === "pending" && (
                          <button
                            onClick={() =>
                              handleUpdateStatus(b.code, "confirmed")
                            }
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
                          >
                            Duyệt
                          </button>
                        )}
                        {b.status === "confirmed" && (
                          <button
                            onClick={() => {
                              setCheckInModalBooking(b);
                              setAssignedRoomNumber("P.101");
                              setDepositAmount(500000);
                            }}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
                          >
                            Check-in
                          </button>
                        )}
                        {b.status === "checked_in" && (
                          <button
                            onClick={() => setCheckOutModalBooking(b)}
                            className="px-3 py-1.5 bg-slate-900 hover:bg-black text-white font-bold text-xs rounded-xl shadow-xs transition"
                          >
                            Check-out
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedBookingDetails(b)}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
                          title="Xem chi tiết"
                        >
                          <Eye size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          icon={Ticket}
          title={`Không có đơn đặt phòng nào của cơ sở "${selectedHotelObj?.name || "Cơ sở của bạn"}"`}
          description="Khách đặt phòng tại cơ sở này sẽ tự động hiển thị ở đây."
          actionLabel="Tạo đơn tại quầy ngay"
          onAction={() => setIsWalkInModalOpen(true)}
        />
      )}

      {/* MODAL CHI TIẾT ĐƠN */}
      {selectedBookingDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border space-y-4 text-xs">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-black text-base text-blue-950">
                Chi Tiết Đơn #{selectedBookingDetails.code}
              </h3>
              <button onClick={() => setSelectedBookingDetails(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="space-y-2">
              <p>
                <b>Cơ sở lưu trú:</b>{" "}
                <strong className="text-blue-900">
                  {selectedBookingDetails.hotel_name || selectedHotelObj?.name}
                </strong>
              </p>
              <p>
                <b>Khách hàng:</b> {selectedBookingDetails.customer_name} (
                {selectedBookingDetails.customer_phone})
              </p>
              <p>
                <b>Hạng phòng:</b> {selectedBookingDetails.room_name} (
                {selectedBookingDetails.assigned_room})
              </p>
              <p>
                <b>Lưu trú:</b> {selectedBookingDetails.check_in} &rarr;{" "}
                {selectedBookingDetails.check_out}
              </p>
              <p>
                <b>Tổng tiền:</b>{" "}
                <strong className="text-rose-600 text-sm">
                  {formatVND(selectedBookingDetails.total_price)}
                </strong>
              </p>
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedBookingDetails(null)}
                className="px-5 py-2 bg-slate-900 text-white font-bold rounded-xl"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL WALK-IN */}
      {isWalkInModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border space-y-4 text-xs">
            <h3 className="font-black text-base text-slate-900">
              Tạo Đơn Đặt Phòng Tại Quầy
            </h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const newBooking = {
                  code: `GST-${Date.now().toString().slice(-6)}`,
                  hotel_id: selectedHotelId || "HT-1",
                  hotel_name: selectedHotelObj?.name || "Cơ sở của tôi",
                  customer_name: walkInForm.guestName,
                  customer_phone: walkInForm.guestPhone,
                  customer_email: walkInForm.guestEmail || "walkin@guest.com",
                  room_name: walkInForm.roomName,
                  assigned_room: walkInForm.assignedRoom,
                  total_price: Number(walkInForm.totalPrice),
                  payment_method: walkInForm.paymentMethod,
                  payment_status: "paid",
                  status: walkInForm.autoCheckIn ? "checked_in" : "confirmed",
                  check_in: walkInForm.checkIn,
                  check_out: walkInForm.checkOut,
                };
                saveAndSync([newBooking, ...bookings]);
                alert(`✓ Đã tạo thành công đơn #${newBooking.code}!`);
                setIsWalkInModalOpen(false);
              }}
              className="space-y-3"
            >
              <input
                required
                placeholder="Tên khách hàng *"
                value={walkInForm.guestName}
                onChange={(e) =>
                  setWalkInForm({ ...walkInForm, guestName: e.target.value })
                }
                className="w-full p-2.5 border rounded-xl font-bold"
              />
              <input
                required
                placeholder="Số điện thoại *"
                value={walkInForm.guestPhone}
                onChange={(e) =>
                  setWalkInForm({ ...walkInForm, guestPhone: e.target.value })
                }
                className="w-full p-2.5 border rounded-xl font-mono"
              />
              <input
                required
                type="number"
                placeholder="Tiền phòng (VND) *"
                value={walkInForm.totalPrice}
                onChange={(e) =>
                  setWalkInForm({
                    ...walkInForm,
                    totalPrice: Number(e.target.value),
                  })
                }
                className="w-full p-2.5 border rounded-xl font-bold text-emerald-700"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsWalkInModalOpen(false)}
                  className="px-4 py-2 border rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 text-slate-950 font-bold rounded-xl"
                >
                  Tạo Đơn
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CHECK-IN */}
      {checkInModalBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border space-y-4 text-xs">
            <h3 className="font-black text-base text-emerald-700">
              Check-in Giao Phòng ({checkInModalBooking.hotel_name})
            </h3>
            <p>
              Khách: <b>{checkInModalBooking.customer_name}</b>
            </p>
            <input
              placeholder="Số phòng (VD: P.101)"
              value={assignedRoomNumber}
              onChange={(e) => setAssignedRoomNumber(e.target.value)}
              className="w-full p-2.5 border rounded-xl font-bold"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setCheckInModalBooking(null)}
                className="px-4 py-2 border rounded-xl"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmCheckIn}
                className="px-5 py-2 bg-emerald-600 text-white font-bold rounded-xl"
              >
                Hoàn tất Check-in
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CHECK-OUT */}
      {checkOutModalBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border space-y-4 text-xs">
            <h3 className="font-black text-base text-slate-900">
              Check-out Quyết Toán
            </h3>
            <p>
              Khách: <b>{checkOutModalBooking.customer_name}</b>
            </p>
            <p>
              Tổng tiền: <b>{formatVND(checkOutModalBooking.total_price)}</b>
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setCheckOutModalBooking(null)}
                className="px-4 py-2 border rounded-xl"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmCheckOut}
                className="px-5 py-2 bg-slate-900 text-white font-bold rounded-xl"
              >
                Check-out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL IN BILL */}
      {dossierBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 w-full max-w-2xl shadow-2xl border space-y-4 text-xs">
            <div className="text-center border-b pb-2">
              <h2 className="font-black text-base uppercase text-blue-900">
                {dossierBooking.hotel_name}
              </h2>
              <p className="font-bold text-slate-500">
                HÓA ĐƠN QUYẾT TOÁN (GUEST FOLIO)
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <p>
                <b>Khách:</b> {dossierBooking.customer_name}
              </p>
              <p>
                <b>Phòng:</b> {dossierBooking.assigned_room}
              </p>
              <p>
                <b>Tổng thanh toán:</b>{" "}
                <strong className="text-emerald-700">
                  {formatVND(dossierBooking.total_price)}
                </strong>
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDossierBooking(null)}
                className="px-4 py-2 border rounded-xl font-bold"
              >
                Đóng
              </button>
              <button
                onClick={() => window.print()}
                className="px-5 py-2 bg-blue-900 text-white rounded-xl font-bold flex items-center gap-1"
              >
                <Printer size={14} /> In
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
