// src/pages/owner/BookingListPage.jsx
import React, { useState, useEffect, useMemo } from "react";
import {
  CalendarCheck,
  Building2,
  Search,
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
  AlertCircle,
  Sparkles,
  BedDouble,
  Receipt,
} from "lucide-react";
import { LoadingSpinner, EmptyState } from "@/components/common";
import { useAuthStore } from "@/stores/authStore";
import PropertySearchSelector from "@/components/common/PropertySearchSelector";

const STATUS_TABS = [
  { id: "all", label: "Tất cả đơn" },
  { id: "confirmed", label: "Chờ Check-in" },
  { id: "checked_in", label: "Đang lưu trú (In-House)" },
  { id: "checked_out", label: "Đã Check-out" },
  { id: "pending", label: "Chờ duyệt" },
  { id: "cancelled", label: "Đã hủy" },
];

export default function BookingListPage() {
  const { user } = useAuthStore();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const userRole = String(user?.role || user?.role_name || "").toLowerCase();
  const isAdmin = userRole.includes("admin") || user?.role_id === 1;
  const isReceptionist = userRole === "receptionist" || userRole === "staff";
  const userEmail = String(user?.email || "")
    .toLowerCase()
    .trim();

  const [myHotels, setMyHotels] = useState([]);
  const [selectedHotelId, setSelectedHotelId] = useState("");

  const [statusTab, setStatusTab] = useState(
    isReceptionist ? "confirmed" : "all",
  );
  const [search, setSearch] = useState("");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");

  // Modals
  const [selectedBookingDetails, setSelectedBookingDetails] = useState(null);
  const [isWalkInModalOpen, setIsWalkInModalOpen] = useState(false);
  const [checkInModalBooking, setCheckInModalBooking] = useState(null);
  const [checkOutModalBooking, setCheckOutModalBooking] = useState(null);
  const [assignRoomModalBooking, setAssignRoomModalBooking] = useState(null);
  const [dossierBooking, setDossierBooking] = useState(null);

  // Form State Modals
  const [assignedRoomInput, setAssignedRoomInput] = useState("P.101");
  const [depositAmountInput, setDepositAmountInput] = useState(500000);
  const [extraServiceFee, setExtraServiceFee] = useState(0); // Phí Minibar / Giặt ủi khi checkout
  const [checkoutNotes, setCheckoutNotes] = useState("");

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

  const formatVND = (num) => Number(num || 0).toLocaleString("vi-VN") + " ₫";

  // 1. TẢI CƠ SỞ THEO PHÂN QUYỀN
  const loadScopedHotels = () => {
    const localApps = JSON.parse(
      localStorage.getItem("pending_partner_applications") || "[]",
    );
    const approvedIds = JSON.parse(
      localStorage.getItem("approved_hotel_ids") || "[]",
    ).map(String);
    const rejectedIds = JSON.parse(
      localStorage.getItem("rejected_hotel_ids") || "[]",
    ).map(String);

    let scopedList = [];

    if (isAdmin) {
      scopedList = localApps
        .filter((h) => !rejectedIds.includes(String(h.id || h.applicationId)))
        .map((h) => ({
          id: String(h.id || h.applicationId),
          name: h.name || h.hotelNameVi || h.hotel_name || "Cơ sở lưu trú",
          city: h.province || h.city || "Việt Nam",
        }));
    } else if (isReceptionist && user?.hotel_id) {
      // Lễ tân được gắn cứng với cơ sở được giao trực ca
      const targetHotel = localApps.find(
        (h) => String(h.id || h.applicationId) === String(user.hotel_id),
      );
      scopedList = [
        {
          id: String(user.hotel_id),
          name: user.hotel_name || targetHotel?.name || "Cơ sở trực ca",
          city: targetHotel?.province || "Việt Nam",
        },
      ];
    } else {
      scopedList = localApps
        .filter((h) => {
          const hId = String(h.id || h.applicationId);
          const hEmail = String(h.emailContact || h.email || "")
            .toLowerCase()
            .trim();
          return (
            hEmail === userEmail &&
            approvedIds.includes(hId) &&
            !rejectedIds.includes(hId)
          );
        })
        .map((h) => ({
          id: String(h.id || h.applicationId),
          name: h.name || h.hotelNameVi || "Cơ sở của tôi",
          city: h.province || "Việt Nam",
        }));
    }

    setMyHotels(scopedList);

    if (scopedList.length > 0) {
      setSelectedHotelId((prev) =>
        prev
          ? prev
          : isReceptionist
            ? String(scopedList[0].id)
            : isAdmin
              ? "all"
              : String(scopedList[0].id),
      );
    } else {
      setSelectedHotelId("");
    }
    return scopedList;
  };

  // 2. TẢI ĐƠN PHÒNG VÀ ĐỒNG BỘ
  const loadBookings = () => {
    setLoading(true);
    const hotelsList = loadScopedHotels();
    const rawBookings = JSON.parse(
      localStorage.getItem("all_bookings") || "[]",
    );

    const normalized = rawBookings.map((b) => {
      const hId = String(
        b.hotel_id || b.hotelId || b.hotel?.id || b.hotel?._id || "",
      ).trim();

      const matchedHotel = hotelsList.find((h) => String(h.id) === hId);
      const realHotelName =
        matchedHotel?.name || b.hotel_name || b.hotelName || "Cơ sở lưu trú";

      return {
        ...b,
        code: String(b.code || b.booking_code || b.id || ""),
        hotel_id: hId || (matchedHotel ? String(matchedHotel.id) : ""),
        hotel_name: realHotelName,
        customer_name:
          b.customer_name || b.customerName || b.guestName || "Khách vãng lai",
        customer_phone: b.customer_phone || b.customerPhone || b.phone || "N/A",
        customer_email: b.customer_email || b.customerEmail || b.email || "",
        room_name:
          b.room_name || b.roomName || b.roomType || "Phòng Tiêu Chuẩn",
        assigned_room: b.assigned_room || b.assignedRoom || "",
        check_in: b.check_in || b.checkIn || b.checkin_date || "",
        check_out: b.check_out || b.checkOut || b.checkout_date || "",
        total_price: Number(b.total_price || b.totalPrice || b.amount || 0),
        deposit_amount: Number(b.deposit_amount || 0),
        extra_fee: Number(b.extra_fee || 0),
        status: b.status || "pending",
        payment_method: b.payment_method || b.paymentMethod || "VietQR 24/7",
      };
    });

    setBookings(normalized);
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

  // 🛎️ 1. THAO TÁC XẾP PHÒNG
  const handleConfirmAssignRoom = () => {
    if (!assignRoomModalBooking) return;
    const updated = bookings.map((b) =>
      b.code === assignRoomModalBooking.code
        ? { ...b, assigned_room: assignedRoomInput }
        : b,
    );
    saveAndSync(updated);
    alert(
      `✓ Đã xếp phòng ${assignedRoomInput} cho khách [${assignRoomModalBooking.customer_name}]!`,
    );
    setAssignRoomModalBooking(null);
  };

  // 🛎️ 2. THAO TÁC CHECK-IN (NHẬN PHÒNG & THU CỌC)
  const handleConfirmCheckIn = () => {
    if (!checkInModalBooking) return;
    const updated = bookings.map((b) =>
      b.code === checkInModalBooking.code
        ? {
            ...b,
            status: "checked_in",
            assigned_room: assignedRoomInput || b.assigned_room || "P.101",
            deposit_amount: Number(depositAmountInput),
            checkin_time: new Date().toLocaleTimeString("vi-VN"),
          }
        : b,
    );
    saveAndSync(updated);
    alert(
      `✓ ĐÃ CHECK-IN THÀNH CÔNG!\nKhách: ${checkInModalBooking.customer_name}\nPhòng: ${assignedRoomInput}\nTiền cọc: ${formatVND(depositAmountInput)}`,
    );
    setCheckInModalBooking(null);
  };

  // 🛎️ 3. THAO TÁC CHECK-OUT (TÍNH PHỤ PHÍ & GỬI YÊU CẦU DỌN PHÒNG)
  const handleConfirmCheckOut = () => {
    if (!checkOutModalBooking) return;
    const finalTotal =
      Number(checkOutModalBooking.total_price) + Number(extraServiceFee);

    // Cập nhật đơn đặt phòng thành đã trả phòng
    const updatedBookings = bookings.map((b) =>
      b.code === checkOutModalBooking.code
        ? {
            ...b,
            status: "checked_out",
            extra_fee: Number(extraServiceFee),
            total_price: finalTotal,
            checkout_time: new Date().toLocaleTimeString("vi-VN"),
          }
        : b,
    );
    saveAndSync(updatedBookings);

    // TỰ ĐỘNG ĐẨY PHÒNG SANG DANH SÁCH CẦN DỌN DẸP (BUỒNG PHÒNG)
    const currentTasks = JSON.parse(
      localStorage.getItem("housekeeping_tasks") || "[]",
    );
    const newTask = {
      id: `HK-${Date.now().toString().slice(-4)}`,
      hotel_id: checkOutModalBooking.hotel_id,
      hotel_name: checkOutModalBooking.hotel_name,
      room_number: checkOutModalBooking.assigned_room || "P.101",
      room_type: checkOutModalBooking.room_name,
      status: "dirty", // Phòng bẩn cần dọn
      priority: "urgent", // Ưu tiên dọn đón khách tiếp theo
      created_at:
        new Date().toLocaleTimeString("vi-VN") +
        " " +
        new Date().toLocaleDateString("vi-VN"),
      notes:
        checkoutNotes || "Khách vừa check-out, cần thay ga gối và khử khuẩn",
    };
    localStorage.setItem(
      "housekeeping_tasks",
      JSON.stringify([
        newTask,
        ...currentTasks.filter((t) => t.room_number !== newTask.room_number),
      ]),
    );

    alert(
      `✓ CHECK-OUT THÀNH CÔNG!\n` +
        `Đã quyết toán đơn #${checkOutModalBooking.code}.\n` +
        `Đã tự động gửi yêu cầu dọn phòng [${newTask.room_number}] sang bộ phận Buồng Phòng!`,
    );

    // Mở hóa đơn Folio để in nếu cần
    setDossierBooking({
      ...checkOutModalBooking,
      extra_fee: Number(extraServiceFee),
      total_price: finalTotal,
    });
    setCheckOutModalBooking(null);
  };

  // 🛎️ 4. BẤM NÚT GỬI YÊU CẦU BUỒNG PHÒNG THỦ CÔNG
  const handleQuickHousekeepingRequest = (roomNumber, hotelId, hotelName) => {
    const currentTasks = JSON.parse(
      localStorage.getItem("housekeeping_tasks") || "[]",
    );
    const newTask = {
      id: `HK-${Date.now().toString().slice(-4)}`,
      hotel_id: hotelId,
      hotel_name: hotelName,
      room_number: roomNumber,
      room_type: "Phòng đang lưu trú",
      status: "dirty",
      priority: "normal",
      created_at: new Date().toLocaleTimeString("vi-VN"),
      notes: "Lễ tân yêu cầu: Khách gọi dọn phòng / bổ sung khăn nước",
    };
    localStorage.setItem(
      "housekeeping_tasks",
      JSON.stringify([newTask, ...currentTasks]),
    );
    alert(`✓ Đã gửi yêu cầu buồng phòng cho ${roomNumber}!`);
  };

  // 3. LỌC ĐƠN PHÒNG
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (selectedHotelId && selectedHotelId !== "all") {
        const matchId = String(b.hotel_id) === String(selectedHotelId);
        const matchName =
          selectedHotelObj?.name &&
          String(b.hotel_name).toLowerCase().trim() ===
            String(selectedHotelObj.name).toLowerCase().trim();
        if (!matchId && !matchName) return false;
      }

      if (statusTab !== "all" && b.status !== statusTab) return false;
      if (startDateFilter && b.check_in < startDateFilter) return false;
      if (endDateFilter && b.check_out > endDateFilter) return false;

      if (search.trim()) {
        const q = search.toLowerCase().trim();
        return (
          String(b.customer_name || "")
            .toLowerCase()
            .includes(q) ||
          String(b.customer_phone || "").includes(q) ||
          String(b.code || "")
            .toLowerCase()
            .includes(q) ||
          String(b.assigned_room || "")
            .toLowerCase()
            .includes(q)
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
  ]);

  const statusBadge = {
    pending: {
      label: "Chờ duyệt",
      color: "bg-amber-50 text-amber-800 border-amber-300",
    },
    confirmed: {
      label: "Chờ nhận phòng",
      color: "bg-blue-50 text-blue-700 border-blue-200",
    },
    checked_in: {
      label: "Đang lưu trú (In-House)",
      color: "bg-emerald-50 text-emerald-700 border-emerald-300",
    },
    checked_out: {
      label: "Đã Check-out",
      color: "bg-slate-100 text-slate-700 border-slate-300",
    },
    cancelled: {
      label: "Đã hủy",
      color: "bg-rose-50 text-rose-700 border-rose-200",
    },
  };

  return (
    <div className="space-y-6 font-sans pb-16 text-slate-800">
      {/* ── TOPBAR GIAO DIỆN CA TRỰC ── */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5">
        <div>
          <div className="flex items-center gap-2 text-amber-600 font-bold text-xs uppercase tracking-wider mb-1">
            <CalendarCheck size={16} />{" "}
            {isReceptionist
              ? "Bàn Làm Việc Lễ Tân (Front Desk Operations)"
              : "Kênh Quản Trị Đặt Phòng (Owner PMS)"}
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Xử Lý Check-in / Check-out & Xếp Phòng
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Cơ sở:{" "}
            <strong className="text-blue-900 font-bold">
              {selectedHotelObj?.name || "Chọn cơ sở..."}
            </strong>
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
          {!isReceptionist && myHotels.length > 0 && (
            <PropertySearchSelector
              hotels={myHotels}
              selectedHotelId={selectedHotelId}
              onSelectHotel={(id) => setSelectedHotelId(id)}
              showAllOption={isAdmin}
            />
          )}

          <button
            onClick={() => setIsWalkInModalOpen(true)}
            className="px-4 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
          >
            <Plus size={15} /> + Khách Đặt Tại Quầy
          </button>
        </div>
      </div>

      {/* ── BỘ LỌC TRẠNG THÁI CA TRỰC ── */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {STATUS_TABS.map((tab) => {
            const count = bookings.filter((b) => {
              if (selectedHotelId && selectedHotelId !== "all") {
                if (String(b.hotel_id) !== String(selectedHotelId))
                  return false;
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

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          <div className="md:col-span-6 relative">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Tìm theo tên khách, SĐT, số phòng hoặc mã đơn..."
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

      {/* ── BẢNG ĐIỀU HÀNH TÁC NGHIỆP ── */}
      {loading ? (
        <div className="py-24 flex justify-center bg-white rounded-3xl border">
          <LoadingSpinner
            size="lg"
            label="Đang tải danh sách đặt phòng ca trực..."
          />
        </div>
      ) : filteredBookings.length > 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-wider border-b">
              <tr>
                <th className="py-4 px-5">Mã & Khách Hàng</th>
                <th className="py-4 px-4">Cơ Sở</th>
                <th className="py-4 px-4">Phòng & Xếp Chỗ</th>
                <th className="py-4 px-4">Lưu Trú</th>
                <th className="py-4 px-4 text-right">Thanh Toán</th>
                <th className="py-4 px-4 text-center">Trạng Thái</th>
                <th className="py-4 px-5 text-center">Tác Nghiệp Lễ Tân</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredBookings.map((b) => {
                const st = statusBadge[b.status] || statusBadge.pending;
                return (
                  <tr
                    key={b.code}
                    className="hover:bg-blue-50/30 transition-colors"
                  >
                    <td className="py-4 px-5">
                      <span className="font-mono font-black text-blue-900 text-xs bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 inline-block mb-1">
                        #{b.code}
                      </span>
                      <strong className="text-slate-900 block text-sm font-extrabold">
                        {b.customer_name}
                      </strong>
                      <span className="text-slate-400 font-mono text-[11px]">
                        {b.customer_phone}
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      <span className="font-bold text-blue-900 text-xs bg-slate-50 px-2 py-1 rounded-lg border">
                        🏨 {b.hotel_name}
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      <strong className="text-slate-800 block">
                        {b.room_name}
                      </strong>
                      {b.assigned_room ? (
                        <span className="inline-flex items-center gap-1 font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 mt-1">
                          <BedDouble size={12} /> {b.assigned_room}
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            setAssignRoomModalBooking(b);
                            setAssignedRoomInput("P.101");
                          }}
                          className="text-[11px] font-bold text-amber-600 hover:text-amber-700 underline mt-1 cursor-pointer block"
                        >
                          + Xếp phòng ngay
                        </button>
                      )}
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
                      {b.deposit_amount > 0 && (
                        <span className="text-[10px] text-emerald-600 font-bold block">
                          Đã cọc: {formatVND(b.deposit_amount)}
                        </span>
                      )}
                    </td>

                    <td className="py-4 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${st.color}`}
                      >
                        {st.label}
                      </span>
                    </td>

                    <td className="py-4 px-5 text-center">
                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                        {/* Nút Check-in */}
                        {b.status === "confirmed" && (
                          <button
                            onClick={() => {
                              setCheckInModalBooking(b);
                              setAssignedRoomInput(b.assigned_room || "P.101");
                              setDepositAmountInput(500000);
                            }}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1"
                          >
                            <Key size={13} /> Check-in
                          </button>
                        )}

                        {/* Nút Check-out */}
                        {b.status === "checked_in" && (
                          <button
                            onClick={() => {
                              setCheckOutModalBooking(b);
                              setExtraServiceFee(0);
                              setCheckoutNotes("");
                            }}
                            className="px-3 py-1.5 bg-slate-900 hover:bg-black text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1"
                          >
                            <LogOutIcon size={13} /> Check-out
                          </button>
                        )}

                        {/* Nút Gửi Buồng Phòng dọn dẹp */}
                        {b.status === "checked_in" && b.assigned_room && (
                          <button
                            onClick={() =>
                              handleQuickHousekeepingRequest(
                                b.assigned_room,
                                b.hotel_id,
                                b.hotel_name,
                              )
                            }
                            className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl transition cursor-pointer"
                            title="Yêu cầu Buồng phòng dọn dẹp"
                          >
                            <Sparkles size={14} />
                          </button>
                        )}

                        <button
                          onClick={() => setSelectedBookingDetails(b)}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition cursor-pointer"
                          title="Chi tiết đơn"
                        >
                          <Eye size={14} />
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
          title="Không có đơn phòng nào ở mục này"
          description="Các đơn đặt phòng của khách hoặc đơn tại quầy sẽ hiển thị ở đây."
          actionLabel="+ Khách đặt tại quầy"
          onAction={() => setIsWalkInModalOpen(true)}
        />
      )}

      {/* ── MODAL 1: CHECK-IN GIAO PHÒNG & THU TIỀN CỌC ── */}
      {checkInModalBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border space-y-4 text-xs">
            <h3 className="font-black text-base text-emerald-700 flex items-center gap-2">
              <Key size={18} /> Thủ Tục Check-in Nhận Phòng
            </h3>
            <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-1">
              <p>
                Khách hàng: <b>{checkInModalBooking.customer_name}</b> (
                {checkInModalBooking.customer_phone})
              </p>
              <p>
                Hạng phòng đặt: <b>{checkInModalBooking.room_name}</b>
              </p>
              <p>
                Tổng tiền phòng:{" "}
                <b>{formatVND(checkInModalBooking.total_price)}</b>
              </p>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Xác nhận số phòng bàn giao (Room Key) *
              </label>
              <input
                required
                placeholder="VD: P.101, P.202"
                value={assignedRoomInput}
                onChange={(e) => setAssignedRoomInput(e.target.value)}
                className="w-full p-2.5 border rounded-xl font-bold text-blue-900 text-sm"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Tiền cọc giữ chìa khóa / minibar (VND)
              </label>
              <input
                type="number"
                value={depositAmountInput}
                onChange={(e) => setDepositAmountInput(e.target.value)}
                className="w-full p-2.5 border rounded-xl font-mono font-bold text-emerald-700"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                onClick={() => setCheckInModalBooking(null)}
                className="px-4 py-2 border rounded-xl font-bold cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmCheckIn}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md cursor-pointer"
              >
                Hoàn tất Check-in
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: CHECK-OUT QUYẾT TOÁN & ĐẨY BUỒNG PHÒNG ── */}
      {checkOutModalBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border space-y-4 text-xs">
            <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
              <LogOutIcon size={18} /> Thủ Tục Check-out & Quyết Toán
            </h3>
            <div className="p-3 bg-slate-50 rounded-2xl border space-y-1">
              <p>
                Khách hàng: <b>{checkOutModalBooking.customer_name}</b>
              </p>
              <p>
                Phòng trả:{" "}
                <b className="text-blue-900">
                  {checkOutModalBooking.assigned_room}
                </b>
              </p>
              <p>
                Tiền phòng: <b>{formatVND(checkOutModalBooking.total_price)}</b>
              </p>
              <p>
                Tiền cọc đã giữ:{" "}
                <b className="text-emerald-700">
                  {formatVND(checkOutModalBooking.deposit_amount)}
                </b>
              </p>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Phụ phí phát sinh (Minibar, hư hao, đồ uống) VND
              </label>
              <input
                type="number"
                placeholder="0"
                value={extraServiceFee}
                onChange={(e) => setExtraServiceFee(e.target.value)}
                className="w-full p-2.5 border rounded-xl font-mono font-bold text-rose-600"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Ghi chú cho bộ phận Buồng phòng dọn dẹp
              </label>
              <textarea
                rows={2}
                placeholder="VD: Thay toàn bộ ga giường, khách để quên cục sạc..."
                value={checkoutNotes}
                onChange={(e) => setCheckoutNotes(e.target.value)}
                className="w-full p-2.5 border rounded-xl font-medium"
              />
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-950 font-medium">
              ✨ Bấm <b>"Xác nhận Check-out"</b> sẽ tự động phát tín hiệu sang
              màn hình <b>"Giám Sát Buồng Phòng"</b> để nhân viên đến dọn dẹp
              ngay!
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                onClick={() => setCheckOutModalBooking(null)}
                className="px-4 py-2 border rounded-xl font-bold cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmCheckOut}
                className="px-5 py-2 bg-slate-900 hover:bg-black text-white font-bold rounded-xl shadow-md cursor-pointer"
              >
                Xác nhận Check-out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 3: XẾP PHÒNG THỦ CÔNG ── */}
      {assignRoomModalBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border space-y-4 text-xs">
            <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
              <BedDouble size={18} className="text-blue-600" /> Xếp Phòng Cho
              Đơn #{assignRoomModalBooking.code}
            </h3>
            <p>
              Khách: <b>{assignRoomModalBooking.customer_name}</b>
            </p>
            <p>
              Hạng phòng: <b>{assignRoomModalBooking.room_name}</b>
            </p>
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Nhập số phòng phân công *
              </label>
              <input
                required
                placeholder="VD: P.201, P.305"
                value={assignedRoomInput}
                onChange={(e) => setAssignedRoomInput(e.target.value)}
                className="w-full p-2.5 border rounded-xl font-bold text-blue-900"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                onClick={() => setAssignRoomModalBooking(null)}
                className="px-4 py-2 border rounded-xl font-bold cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmAssignRoom}
                className="px-5 py-2 bg-blue-600 text-white font-bold rounded-xl cursor-pointer"
              >
                Lưu xếp phòng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 4: HÓA ĐƠN QUYẾT TOÁN FOLIO ── */}
      {dossierBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border space-y-4 text-xs">
            <div className="text-center border-b pb-3">
              <h2 className="font-black text-lg text-blue-950 uppercase">
                {dossierBooking.hotel_name}
              </h2>
              <p className="text-slate-400 font-bold">
                PHIẾU QUYẾT TOÁN THANH TOÁN (FOLIO)
              </p>
            </div>
            <div className="space-y-1.5">
              <p>
                Mã hóa đơn: <b>#{dossierBooking.code}</b>
              </p>
              <p>
                Khách hàng: <b>{dossierBooking.customer_name}</b> (
                {dossierBooking.customer_phone})
              </p>
              <p>
                Phòng: <b>{dossierBooking.assigned_room}</b> -{" "}
                {dossierBooking.room_name}
              </p>
              <p>
                Thời gian lưu trú: {dossierBooking.check_in} &rarr;{" "}
                {dossierBooking.check_out}
              </p>
              <p>
                Tiền phòng:{" "}
                {formatVND(
                  dossierBooking.total_price - (dossierBooking.extra_fee || 0),
                )}
              </p>
              <p>
                Phụ phí Minibar/Dịch vụ:{" "}
                {formatVND(dossierBooking.extra_fee || 0)}
              </p>
              <div className="border-t pt-2 mt-2 flex justify-between items-center text-sm font-black text-emerald-700">
                <span>TỔNG THANH TOÁN:</span>
                <span>{formatVND(dossierBooking.total_price)}</span>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                onClick={() => setDossierBooking(null)}
                className="px-4 py-2 border rounded-xl font-bold cursor-pointer"
              >
                Đóng
              </button>
              <button
                onClick={() => window.print()}
                className="px-5 py-2 bg-blue-900 text-white font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                <Printer size={15} /> In Hóa Đơn
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 5: KHÁCH ĐẶT TẠI QUẦY (WALK-IN) ── */}
      {isWalkInModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border space-y-4 text-xs">
            <h3 className="font-black text-base text-slate-900">
              Tạo Đơn Khách Đặt Tại Quầy
            </h3>
            <p className="text-slate-500">
              Cơ sở: <b>{selectedHotelObj?.name}</b>
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const newBooking = {
                  code: `GST-${Date.now().toString().slice(-6)}`,
                  hotel_id: String(selectedHotelId),
                  hotel_name: selectedHotelObj?.name || "Cơ sở lưu trú",
                  customer_name: walkInForm.guestName,
                  customer_phone: walkInForm.guestPhone,
                  customer_email: walkInForm.guestEmail || "walkin@guest.com",
                  room_name: walkInForm.roomName,
                  assigned_room: walkInForm.assignedRoom,
                  total_price: Number(walkInForm.totalPrice),
                  deposit_amount: Number(walkInForm.depositAmount),
                  payment_method: walkInForm.paymentMethod,
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
              <div className="grid grid-cols-2 gap-2">
                <input
                  required
                  placeholder="Số phòng (VD: P.101)"
                  value={walkInForm.assignedRoom}
                  onChange={(e) =>
                    setWalkInForm({
                      ...walkInForm,
                      assignedRoom: e.target.value,
                    })
                  }
                  className="w-full p-2.5 border rounded-xl font-bold"
                />
                <input
                  required
                  type="number"
                  placeholder="Tiền phòng"
                  value={walkInForm.totalPrice}
                  onChange={(e) =>
                    setWalkInForm({
                      ...walkInForm,
                      totalPrice: Number(e.target.value),
                    })
                  }
                  className="w-full p-2.5 border rounded-xl font-bold text-emerald-700"
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="autocheckin"
                  checked={walkInForm.autoCheckIn}
                  onChange={(e) =>
                    setWalkInForm({
                      ...walkInForm,
                      autoCheckIn: e.target.checked,
                    })
                  }
                />
                <label
                  htmlFor="autocheckin"
                  className="font-bold text-slate-700"
                >
                  Check-in nhận phòng ngay lập tức
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsWalkInModalOpen(false)}
                  className="px-4 py-2 border rounded-xl font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 text-slate-950 font-bold rounded-xl cursor-pointer"
                >
                  Tạo Đơn
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
