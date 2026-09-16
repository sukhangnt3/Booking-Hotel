// src/pages/reception/ReceptionMapPage.jsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Calendar,
  Search,
  Plus,
  Building2,
  CheckCircle2,
  X,
  ClipboardList,
  CalendarDays,
  Clock,
  Check,
  Globe,
} from "lucide-react";
import apiClient from "@/services/apiClient";
import { LoadingSpinner } from "@/components/common";

// Import các modal component
import RoomCard from "./components/RoomCard";
import IncomingRoomModal from "./components/IncomingRoomModal";
import ConfirmCheckInModal from "./components/ConfirmCheckInModal";
import CheckInGuestStayModal from "./components/CheckInGuestStayModal";
import AddGuestDocModal from "./components/AddGuestDocModal";
import OccupiedRoomModal from "./components/OccupiedRoomModal";
import QuickBookingModal from "./components/QuickBookingModal";
import ChangeRoomModal from "./components/ChangeRoomModal";

const toDatetimeLocal = (date) => {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const formatDisplayDateTime = (dateStr) => {
  if (!dateStr) return "---";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  const day = d.getDate();
  const month = d.getMonth() + 1;
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${day} Thg ${month < 10 ? "0" + month : month}, ${hours}:${minutes}`;
};

const getCheckinCountdownText = (checkinDateStr) => {
  if (!checkinDateStr) return "Sắp đến nhận phòng";
  const now = new Date();
  const checkin = new Date(checkinDateStr);
  const diffMs = checkin.getTime() - now.getTime();

  if (diffMs <= 0) return "Sắp đến nhận phòng";

  const diffMins = Math.round(diffMs / (1000 * 60));
  if (diffMins < 60) return `${diffMins} phút nữa nhận phòng`;

  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  if (diffHours < 24) return `${diffHours} giờ nữa nhận phòng`;

  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  return `${diffDays} ngày nữa nhận phòng`;
};

export default function ReceptionMapPage() {
  const [hotels, setHotels] = useState([]);
  const [selectedHotelId, setSelectedHotelId] = useState("");
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  // 3 BỘ LỌC TRẠNG THÁI PHÒNG
  const [statusFilters, setStatusFilters] = useState({
    incoming: true,
    occupied: true,
    available: true,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCleaningMenuId, setActiveCleaningMenuId] = useState(null);

  // Modal State
  const [activeModalType, setActiveModalType] = useState(null);
  const [activeRoomData, setActiveRoomData] = useState(null);
  const [changeRoomTarget, setChangeRoomTarget] = useState(null);

  // STATE CHO ĐƠN CHỜ XÁC NHẬN
  const [pendingBookings, setPendingBookings] = useState([]);
  const [isPendingModalOpen, setIsPendingModalOpen] = useState(false);
  const [assigningBooking, setAssigningBooking] = useState(null);
  const [selectedAssignRoom, setSelectedAssignRoom] = useState("");
  const [isSubmittingAssign, setIsSubmittingAssign] = useState(false);

  // Dữ liệu luồng Check-in
  const [confirmCheckInData, setConfirmCheckInData] = useState({
    checkin_mode: "Hiện tại",
    checkin_time: "",
    checkout_time: "",
    duration_label: "1 đêm",
  });
  const [checkInGuestCount, setCheckInGuestCount] = useState({
    adult: 1,
    children: 0,
  });
  const [checkInGuestList, setCheckInGuestList] = useState([]);

  // Form nhập CCCD
  const [editingGuestIndex, setEditingGuestIndex] = useState(null);
  const initialGuestDocForm = {
    room_number: "",
    full_name: "",
    gender: "male",
    birthday: "",
    nationality: "Việt Nam",
    address: "",
    id_type: "CCCD",
    id_number: "",
    stay_reason: "Du lịch",
    note: "",
  };
  const [guestDocForm, setGuestDocForm] = useState(initialGuestDocForm);

  // Đặt phòng nhanh
  const [quickBookingData, setQuickBookingData] = useState({
    customer_name: "",
    customer_phone: "",
    guest_count: { adult: 2, children: 0, id_cards: 0 },
    adult_total: 2,
    children_total: 0,
    rooms: [],
    note: "",
    customer_paid: 0,
  });

  const formatVND = (num) => Number(num || 0).toLocaleString("vi-VN") + " ₫";

  const calculateDurationAndPrice = (
    checkinStr,
    checkoutStr,
    rentalType,
    roomInfo,
  ) => {
    const checkin = new Date(checkinStr);
    const checkout = new Date(checkoutStr);
    const diffMs = Math.max(0, checkout - checkin);
    const diffHours = Math.max(1, Math.round(diffMs / (1000 * 60 * 60)));
    const diffDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));

    let durationLabel = "1 ngày";
    let price = Number(roomInfo.daily_price || 0);

    if (rentalType === "Giờ") {
      durationLabel = `${diffHours} giờ`;
      price = Number(roomInfo.hourly_price || 0) * diffHours;
    } else if (rentalType === "Đêm") {
      durationLabel = `${diffDays} đêm`;
      price =
        Number(roomInfo.overnight_price || roomInfo.daily_price || 0) *
        diffDays;
    } else {
      durationLabel = `${diffDays} ngày`;
      price = Number(roomInfo.daily_price || 0) * diffDays;
    }
    return { durationLabel, price };
  };

  useEffect(() => {
    const handleClickOutside = () => setActiveCleaningMenuId(null);
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  useEffect(() => {
    async function loadHotels() {
      try {
        setLoading(true);
        let list = [];
        try {
          const res = await apiClient.get("/hotels/my-hotels?active_only=true");
          list =
            res?.data?.hotels ||
            res?.data?.data ||
            res?.data ||
            res?.hotels ||
            [];
        } catch (err) {
          console.error("Lỗi gọi /hotels/my-hotels:", err);
        }

        const validHotels = Array.isArray(list) ? list : [];
        setHotels(validHotels);

        if (validHotels.length > 0) {
          setSelectedHotelId(String(validHotels[0].id));
        } else {
          setSelectedHotelId("");
        }
      } catch (err) {
        console.error("Lỗi lấy khách sạn:", err);
        setHotels([]);
        setSelectedHotelId("");
      } finally {
        setLoading(false);
      }
    }
    loadHotels();
  }, []);

  const fetchRoomMap = useCallback(async () => {
    if (!selectedHotelId) {
      setRooms([]);
      return;
    }
    setLoading(true);
    try {
      const res = await apiClient.get(
        `/owner/room-map?hotel_id=${selectedHotelId}&_t=${Date.now()}`,
      );
      const rawRooms = res?.data?.rooms || res?.rooms || res?.data || res || [];
      setRooms(Array.isArray(rawRooms) ? rawRooms : []);
    } catch (err) {
      setRooms([]);
    } finally {
      setLoading(false);
    }
  }, [selectedHotelId]);

  // Lấy danh sách đơn chờ xác nhận từ backend
  const fetchPendingBookings = useCallback(async () => {
    try {
      const url = selectedHotelId
        ? `/owner/bookings/pending-online?hotel_id=${selectedHotelId}&_t=${Date.now()}`
        : `/owner/bookings/pending-online?_t=${Date.now()}`;

      const res = await apiClient.get(url);
      let list = [];
      if (Array.isArray(res)) {
        list = res;
      } else if (Array.isArray(res?.data)) {
        list = res.data;
      } else if (Array.isArray(res?.data?.data)) {
        list = res.data.data;
      } else if (Array.isArray(res?.bookings)) {
        list = res.bookings;
      }

      setPendingBookings(list);
    } catch (err) {
      console.warn("Chưa lấy được đơn chờ xác nhận:", err.message);
    }
  }, [selectedHotelId]);

  // Tự động load dữ liệu
  useEffect(() => {
    fetchRoomMap();
    fetchPendingBookings();

    const interval = setInterval(() => {
      fetchPendingBookings();
    }, 4000);

    return () => clearInterval(interval);
  }, [fetchRoomMap, fetchPendingBookings]);

  // Đếm số lượng theo nhóm trạng thái
  const counts = useMemo(() => {
    return {
      incoming: rooms.filter((r) => r.status === "incoming").length,
      occupied: rooms.filter(
        (r) => r.status === "occupied" || r.status === "checkout_soon",
      ).length,
      available: rooms.filter(
        (r) => r.status === "available" || r.status === "dirty",
      ).length,
    };
  }, [rooms]);

  // Nhóm phòng theo Tầng/Khu vực
  const groupedRooms = useMemo(() => {
    const groups = {};
    rooms.forEach((room) => {
      let filterCategory = "available";
      if (room.status === "incoming") {
        filterCategory = "incoming";
      } else if (
        room.status === "occupied" ||
        room.status === "checkout_soon"
      ) {
        filterCategory = "occupied";
      } else {
        filterCategory = "available";
      }

      if (!statusFilters[filterCategory]) {
        return;
      }

      if (
        searchQuery.trim() &&
        !room.room_number?.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !room.type_name?.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !room.booking?.customer_name
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase())
      ) {
        return;
      }

      const area = room.area || "Tầng 1";
      if (!groups[area]) groups[area] = [];
      groups[area].push(room);
    });
    return groups;
  }, [rooms, statusFilters, searchQuery]);

  // Danh sách các phòng trống khả dụng để xếp phòng
  const availableRoomsForAssign = useMemo(() => {
    if (!assigningBooking) return [];

    const vacantRooms = rooms.filter(
      (r) => r.status === "available" && !r.booking,
    );

    const sameTypeRooms = vacantRooms.filter(
      (r) =>
        !assigningBooking.room_type_id ||
        String(r.room_type_id) === String(assigningBooking.room_type_id) ||
        (assigningBooking.room_type_name &&
          r.type_name
            ?.toLowerCase()
            .includes(assigningBooking.room_type_name?.toLowerCase())),
    );

    return sameTypeRooms.length > 0 ? sameTypeRooms : vacantRooms;
  }, [rooms, assigningBooking]);

  // Lễ tân xác nhận xếp phòng
  const handleConfirmAssignRoom = async () => {
    if (!selectedAssignRoom) {
      return alert("Vui lòng chọn số phòng trong danh sách!");
    }
    setIsSubmittingAssign(true);
    try {
      await apiClient.post("/owner/bookings/confirm-assign-room", {
        booking_id: assigningBooking.id,
        room_number: selectedAssignRoom,
        hotel_id: selectedHotelId || assigningBooking.hotel_id,
      });

      alert(
        `✓ Đã xác nhận đơn #${assigningBooking.booking_code} và gán vào phòng ${selectedAssignRoom} thành công!`,
      );
      setAssigningBooking(null);
      setSelectedAssignRoom("");
      setIsPendingModalOpen(false);

      await Promise.all([fetchRoomMap(), fetchPendingBookings()]);
    } catch (err) {
      alert(
        "Lỗi xác nhận phòng: " + (err.response?.data?.message || err.message),
      );
    } finally {
      setIsSubmittingAssign(false);
    }
  };

  const handleRoomCardClick = (room) => {
    setActiveRoomData(room);
    if (room.status === "occupied" || room.status === "checkout_soon") {
      setActiveModalType("occupied");
    } else if (room.status === "incoming") {
      setActiveModalType("incoming");
    } else {
      handleOpenQuickBooking(room);
    }
  };

  const handleOpenQuickBooking = (room = null) => {
    const targetRoom =
      room || rooms.find((r) => r.status === "available") || rooms[0];
    if (!targetRoom) return;

    const today = new Date();
    today.setHours(14, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    tomorrow.setHours(12, 0, 0, 0);

    const checkinVal = toDatetimeLocal(today);
    const checkoutVal = toDatetimeLocal(tomorrow);
    const { durationLabel, price } = calculateDurationAndPrice(
      checkinVal,
      checkoutVal,
      "Ngày",
      targetRoom,
    );

    setQuickBookingData({
      customer_name: "",
      customer_phone: "",
      guest_count: { adult: 2, children: 0, id_cards: 0 },
      adult_total: 2,
      children_total: 0,
      rooms: [
        {
          room_id: targetRoom.id,
          room_number: targetRoom.room_number,
          type_name: targetRoom.type_name,
          rental_type: "Ngày",
          checkin_mode: "Quy định",
          checkin_date: checkinVal,
          checkout_date: checkoutVal,
          duration_label: durationLabel,
          price: price,
        },
      ],
      note: "",
      customer_paid: 0,
    });
    setActiveModalType("quick_booking");
  };

  const handleConfirmQuickBooking = async (isCheckInNow = true) => {
    if (quickBookingData.rooms.length === 0)
      return alert("Vui lòng chọn ít nhất một phòng!");
    try {
      const finalAdults = Number(
        quickBookingData.guest_count?.adult ??
          quickBookingData.adult_total ??
          quickBookingData.adults ??
          2,
      );
      const finalChildren = Number(
        quickBookingData.guest_count?.children ??
          quickBookingData.children_total ??
          quickBookingData.children ??
          0,
      );

      for (const item of quickBookingData.rooms) {
        await apiClient.post("/owner/bookings/walkin", {
          hotel_id: selectedHotelId,
          room_id: item.room_id,
          customer_name: quickBookingData.customer_name.trim() || "Khách lẻ",
          guest_phone: quickBookingData.customer_phone.trim(),
          total_price: item.price,
          customer_paid: Number(quickBookingData.customer_paid || 0),
          checkin_date: item.checkin_date,
          checkout_date: item.checkout_date,
          is_check_in_now: isCheckInNow,
          adult_total: finalAdults,
          children_total: finalChildren,
          adults: finalAdults,
          children: finalChildren,
          guest_count: {
            adult: finalAdults,
            children: finalChildren,
          },
        });
      }
      alert(
        isCheckInNow ? "✓ Nhận phòng thành công!" : "✓ Đã lưu đơn đặt trước!",
      );
      setActiveModalType(null);
      await fetchRoomMap();
    } catch (err) {
      alert("Lỗi: " + (err.response?.data?.message || err.message));
    }
  };

  const handleOpenChangeRoom = (room) => {
    setChangeRoomTarget(room);
    setActiveModalType("change_room");
  };

  const handleExecuteChangeRoom = async ({
    newRoomNumber,
    mode,
    newTotalPrice,
    roomLegs,
  }) => {
    if (!changeRoomTarget?.booking?.id) return;
    try {
      await apiClient.post(
        `/owner/bookings/${changeRoomTarget.booking.id}/change-room`,
        {
          new_room_number: newRoomNumber,
          hotel_id: selectedHotelId,
          mode: mode,
          new_total_price: newTotalPrice,
          room_legs: roomLegs,
        },
      );
      alert(`✓ Đã đổi sang phòng ${newRoomNumber} thành công!`);
      setActiveModalType(null);
      setActiveRoomData(null);
      await fetchRoomMap();
    } catch (err) {
      alert("Lỗi đổi phòng: " + (err.response?.data?.message || err.message));
      throw err;
    }
  };

  const handleOpenConfirmCheckIn = () => {
    if (!activeRoomData?.booking) return;

    const now = new Date();
    const defaultCheckout = new Date(
      activeRoomData.booking.checkout_date || now,
    );
    if (isNaN(defaultCheckout.getTime())) {
      defaultCheckout.setDate(now.getDate() + 1);
      defaultCheckout.setHours(12, 0, 0, 0);
    }

    setConfirmCheckInData({
      checkin_mode: "Hiện tại",
      checkin_time: toDatetimeLocal(now),
      checkout_time: toDatetimeLocal(defaultCheckout),
      duration_label: "1 đêm",
    });

    setCheckInGuestCount({
      adult: Number(activeRoomData.booking.adult_total || 1),
      children: Number(activeRoomData.booking.children_total || 0),
    });

    const nowTimeStr = `${now.getHours()}:${String(now.getMinutes()).padStart(
      2,
      "0",
    )} ${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
    setCheckInGuestList([
      {
        room_number: activeRoomData.room_number,
        full_name: activeRoomData.booking.customer_name || "Khách lưu trú",
        gender: "male",
        birthday: "",
        nationality: "Việt Nam",
        address: "",
        id_type: "CCCD",
        id_number: "",
        stay_reason: "Du lịch",
        declaration_time: nowTimeStr,
        stay_duration: "1 ngày",
        note: "",
      },
    ]);

    setActiveModalType("confirm_checkin");
  };

  const handleOpenGuestDocForm = (guestItem = null, index = null) => {
    setEditingGuestIndex(index);
    if (guestItem) {
      setGuestDocForm({ ...guestItem });
    } else {
      setGuestDocForm({
        ...initialGuestDocForm,
        room_number: activeRoomData?.room_number || "P.101",
        full_name: "",
      });
    }
    setActiveModalType("add_guest_doc");
  };

  const handleGuestDocSubmit = (e) => {
    e.preventDefault();
    if (!guestDocForm.full_name.trim())
      return alert("Vui lòng nhập Họ và tên!");

    const now = new Date();
    const newGuestItem = {
      ...guestDocForm,
      declaration_time: `${now.getHours()}:${String(now.getMinutes()).padStart(
        2,
        "0",
      )} ${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`,
      stay_duration: "1 ngày",
    };

    if (editingGuestIndex !== null) {
      setCheckInGuestList((prev) => {
        const updated = [...prev];
        updated[editingGuestIndex] = newGuestItem;
        return updated;
      });
    } else {
      setCheckInGuestList((prev) => [...prev, newGuestItem]);
    }
    setActiveModalType("guest_stay");
  };

  const handleFinalExecuteCheckIn = async () => {
    if (!activeRoomData?.booking?.id) return;
    const b = activeRoomData.booking;

    const isDeposit =
      b.payment_type === "DEPOSIT_30" ||
      Number(b.deposit_amount) > 0 ||
      Number(b.remaining_amount) > 0;
    const remainingToCollect = isDeposit
      ? Number(b.remaining_amount) || Math.round(Number(b.total_price) * 0.7)
      : 0;

    try {
      await apiClient.post(`/owner/bookings/${b.id}/checkin`, {
        room_number: activeRoomData.room_number,
        checkin_date: confirmCheckInData.checkin_time,
        checkout_date: confirmCheckInData.checkout_time,
        adult_total: checkInGuestCount.adult,
        children_total: checkInGuestCount.children,
        adults: checkInGuestCount.adult,
        children: checkInGuestCount.children,
        guests: checkInGuestList,
        collected_at_counter: remainingToCollect,
      });

      alert(
        `✓ Đã nhận phòng ${activeRoomData.room_number} thành công!` +
          (isDeposit
            ? ` (Đã thu nốt số tiền còn lại tại quầy: ${formatVND(
                remainingToCollect,
              )})`
            : ""),
      );
      setActiveModalType(null);
      setActiveRoomData(null);
      await fetchRoomMap();
    } catch (err) {
      alert("Lỗi: " + (err.response?.data?.message || err.message));
    }
  };

  const handleSaveGuestStayInfoOnly = () => {
    alert("✓ Đã lưu thông tin khách lưu trú!");
    setActiveModalType("confirm_checkin");
  };

  const handleCompleteCheckOut = async (bookingCode) => {
    const code = bookingCode || activeRoomData?.booking?.code;
    const room = rooms.find((r) => r.booking?.code === code) || activeRoomData;
    if (!room?.booking?.id) return;

    try {
      await apiClient.post(`/owner/bookings/${room.booking.id}/checkout`, {
        late_fee: 0,
        minibar_fee: 0,
        other_fee: 0,
      });
      alert(
        `✓ Đã trả phòng ${room.room_number}! Phòng chuyển sang trạng thái Chưa dọn.`,
      );
      setActiveModalType(null);
      setActiveRoomData(null);
      await fetchRoomMap();
    } catch (err) {
      alert("Lỗi trả phòng: " + (err.response?.data?.message || err.message));
    }
  };

  const handleMarkCleaned = async (room) => {
    try {
      setRooms((prev) =>
        prev.map((r) =>
          r.id === room.id
            ? {
                ...r,
                is_dirty: false,
                unit_status: "available",
                status: r.booking ? "occupied" : "available",
              }
            : r,
        ),
      );
      setActiveCleaningMenuId(null);

      await apiClient.post("/owner/rooms/mark-cleaned", {
        hotel_id: selectedHotelId,
        room_number: room.room_number,
      });
      await fetchRoomMap();
    } catch (err) {
      alert("Lỗi: " + (err.response?.data?.message || err.message));
      await fetchRoomMap();
    }
  };

  const handleMarkDirty = async (room) => {
    try {
      setRooms((prev) =>
        prev.map((r) =>
          r.id === room.id
            ? {
                ...r,
                is_dirty: true,
                unit_status: "dirty",
                status: r.booking ? "occupied" : "dirty",
              }
            : r,
        ),
      );
      setActiveCleaningMenuId(null);

      await apiClient.post("/owner/rooms/mark-dirty", {
        hotel_id: selectedHotelId,
        room_number: room.room_number,
      });
      await fetchRoomMap();
    } catch (err) {
      alert("Lỗi: " + (err.response?.data?.message || err.message));
      await fetchRoomMap();
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans text-xs pb-16">
      {/* ─── DÒNG 1: TOOLBAR HEADER TIẾP TÂN THEO PHONG CÁCH GOSTAY ─── */}
      <header className="bg-white border-b border-slate-200 px-5 py-3 flex items-center justify-between shadow-xs sticky top-0 z-20 gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm số phòng, tên khách..."
              className="pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#003580] focus:bg-white w-56 font-semibold"
            />
            <Search size={14} className="absolute right-3 text-slate-400" />
          </div>

          <div className="flex items-center gap-2 bg-blue-50/70 border border-blue-200/80 rounded-xl px-3 py-1.5">
            <Building2 size={14} className="text-[#003580]" />
            <select
              value={selectedHotelId}
              onChange={(e) => setSelectedHotelId(e.target.value)}
              className="bg-transparent outline-none font-bold text-[#003580] cursor-pointer text-xs"
            >
              {hotels.map((h) => (
                <option
                  key={h.id}
                  value={h.id}
                  className="text-slate-900 font-bold"
                >
                  🏨 {h.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* NÚT CHỜ XÁC NHẬN DUY NHẤT */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsPendingModalOpen(true)}
            className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 transition cursor-pointer border shadow-2xs ${
              pendingBookings.length > 0
                ? "bg-blue-50/80 border-[#003580] text-[#003580]"
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <ClipboardList size={16} className="text-[#003580]" />
            <span className="text-xs">Chờ xác nhận</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                pendingBookings.length > 0
                  ? "bg-[#003580] text-white"
                  : "bg-slate-200 text-slate-700"
              }`}
            >
              {pendingBookings.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenQuickBooking()}
            className="px-4 py-2 bg-[#003580] hover:bg-[#00224f] text-white rounded-xl cursor-pointer shadow-xs transition flex items-center gap-1.5 font-bold active:scale-95"
          >
            <Plus size={16} />
            <span>+ Đặt phòng</span>
          </button>
        </div>
      </header>

      {/* ─── DÒNG 2: THANH TAB TRẠNG THÁI ─── */}
      <div className="bg-white border-b border-slate-200 px-5 py-2.5 flex items-center justify-between gap-4 flex-wrap text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() =>
              setStatusFilters({
                ...statusFilters,
                incoming: !statusFilters.incoming,
              })
            }
            className={`px-3.5 py-1 rounded-full font-bold flex items-center gap-1.5 transition cursor-pointer border ${
              statusFilters.incoming
                ? "bg-amber-50 border-amber-400 text-amber-900"
                : "bg-slate-100 border-slate-200 text-slate-400"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
            <span>● Đã đặt trước ({counts.incoming})</span>
          </button>

          <button
            type="button"
            onClick={() =>
              setStatusFilters({
                ...statusFilters,
                occupied: !statusFilters.occupied,
              })
            }
            className={`px-3.5 py-1 rounded-full font-bold flex items-center gap-1.5 transition cursor-pointer border ${
              statusFilters.occupied
                ? "bg-blue-50 border-blue-400 text-[#003580]"
                : "bg-slate-100 border-slate-200 text-slate-400"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#003580] inline-block" />
            <span>● Đang sử dụng ({counts.occupied})</span>
          </button>

          <button
            type="button"
            onClick={() =>
              setStatusFilters({
                ...statusFilters,
                available: !statusFilters.available,
              })
            }
            className={`px-3.5 py-1 rounded-full font-bold flex items-center gap-1.5 transition cursor-pointer border ${
              statusFilters.available
                ? "bg-slate-100 border-slate-300 text-slate-800"
                : "bg-slate-50 border-slate-200 text-slate-400"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />
            <span>● Đang trống ({counts.available})</span>
          </button>
        </div>

        <div className="text-slate-500 font-semibold text-[11px]">
          Tổng cộng: <b className="text-slate-900">{rooms.length} phòng</b>
        </div>
      </div>

      {/* ─── SƠ ĐỒ PHÒNG ─── */}
      <main className="p-4 sm:p-6 space-y-6">
        {loading ? (
          <div className="py-24 flex justify-center">
            <LoadingSpinner size="lg" label="Đang đồng bộ sơ đồ phòng..." />
          </div>
        ) : hotels.length === 0 ? (
          <div className="py-24 text-center text-slate-400 font-medium">
            Tài khoản này chưa được phân công cơ sở khách sạn nào.
          </div>
        ) : Object.keys(groupedRooms).length === 0 ? (
          <div className="py-24 text-center text-slate-400 font-medium">
            Không tìm thấy phòng nào phù hợp với bộ lọc tìm kiếm.
          </div>
        ) : (
          Object.keys(groupedRooms).map((area) => {
            const roomList = groupedRooms[area];
            return (
              <div key={area} className="space-y-3">
                <div className="flex items-center gap-2 font-black text-[#0a2540] text-sm">
                  <span>{area}</span>
                  <span className="bg-[#003580] text-white text-[11px] font-black px-2.5 py-0.5 rounded-full">
                    {roomList.length} phòng
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {roomList.map((room) => {
                    const b = room.booking;
                    const isDep =
                      b?.payment_type === "DEPOSIT_30" ||
                      Number(b?.deposit_amount) > 0 ||
                      Number(b?.remaining_amount) > 0;
                    const remAmount = isDep
                      ? Number(b?.remaining_amount) ||
                        Math.round(Number(b?.total_price) * 0.7)
                      : 0;

                    return (
                      <RoomCard
                        key={room.id}
                        room={room}
                        onClick={() => handleRoomCardClick(room)}
                        activeCleaningMenuId={activeCleaningMenuId}
                        setActiveCleaningMenuId={setActiveCleaningMenuId}
                        onMarkCleaned={handleMarkCleaned}
                        onMarkDirty={handleMarkDirty}
                        formatVND={formatVND}
                        countdownText={getCheckinCountdownText(
                          room.booking?.checkin_date,
                        )}
                        isDeposit={isDep}
                        remainingAmount={remAmount}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </main>

      {/* ─── MODAL 1: "KHÁCH ĐẶT ONLINE - CHỜ XÁC NHẬN" (ĐÃ SỬA TOÀN BỘ LỖI RỚT DÒNG) ─── */}
      {isPendingModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-6xl w-full shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[88vh]">
            {/* Header Modal 1 - GoStay Navy */}
            <div className="px-6 py-4 bg-[#003580] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="font-extrabold text-base">
                  Khách đặt online
                </span>
                <span className="bg-white/20 text-white px-2.5 py-0.5 rounded-full font-bold text-xs">
                  Chờ xếp phòng ({pendingBookings.length})
                </span>
              </div>
              <button
                onClick={() => setIsPendingModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Bảng danh sách đơn - Đã tối ưu chống rớt dòng tuyệt đối */}
            <div className="p-6 overflow-y-auto overflow-x-auto flex-1">
              {pendingBookings.length === 0 ? (
                <div className="py-16 text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <ClipboardList size={24} />
                  </div>
                  <div className="text-slate-600 font-bold text-sm">
                    Hiện không có đơn đặt phòng nào đang chờ xác nhận
                  </div>
                  <div className="text-slate-400 text-xs">
                    Khi khách thanh toán QR thành công, đơn đặt phòng sẽ tự động
                    xuất hiện tại đây.
                  </div>
                </div>
              ) : (
                <table className="w-full min-w-[980px] text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 text-[11px] font-bold uppercase tracking-wider whitespace-nowrap">
                      <th className="pb-3.5 px-4 w-[150px]">Mã đặt phòng</th>
                      <th className="pb-3.5 px-4 w-[120px]">Kênh bán</th>
                      <th className="pb-3.5 px-4 w-[170px]">Khách đặt</th>
                      <th className="pb-3.5 px-4 w-[230px]">
                        Thời gian lưu trú
                      </th>
                      <th className="pb-3.5 px-4">Hạng phòng</th>
                      <th className="pb-3.5 px-4 text-right w-[120px]">
                        Tổng cộng
                      </th>
                      <th className="pb-3.5 px-4 text-right w-[120px]">
                        Khách đã trả
                      </th>
                      <th className="pb-3.5 px-4 text-center w-[130px]">
                        Thao tác
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-semibold">
                    {pendingBookings.map((b) => (
                      <tr key={b.id} className="hover:bg-blue-50/40 transition">
                        {/* 1. MÃ ĐẶT PHÒNG */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span className="font-bold text-[#003580] text-sm block">
                            #{b.booking_code}
                          </span>
                          <span className="text-[11px] text-slate-400 font-normal block mt-0.5">
                            {formatDisplayDateTime(b.created_at)}
                          </span>
                        </td>

                        {/* 2. KÊNH BÁN */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-[11px] font-bold inline-block whitespace-nowrap">
                            GoStay Online
                          </span>
                        </td>

                        {/* 3. KHÁCH ĐẶT */}
                        <td className="py-4 px-4">
                          <div className="font-bold text-slate-900 text-sm whitespace-nowrap">
                            {b.customer_name}
                          </div>
                          <div className="text-slate-500 text-[11px] whitespace-nowrap mt-0.5">
                            {b.guest_phone || b.guest_email || "Chưa có SĐT"}
                          </div>
                        </td>

                        {/* 4. THỜI GIAN LƯU TRÚ */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="text-slate-800 font-bold">
                            {formatDisplayDateTime(b.checkin_date)} -{" "}
                            {formatDisplayDateTime(b.checkout_date)}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {b.adult_total} người lớn, {b.children_total} trẻ em
                          </div>
                        </td>

                        {/* 5. HẠNG PHÒNG - GIỮ NGUYÊN 1 DÒNG ĐẸP ĐẼ */}
                        <td className="py-4 px-4">
                          <span className="bg-blue-50 border border-blue-200 text-[#003580] px-3 py-1 rounded-lg text-xs font-bold inline-flex items-center whitespace-nowrap shadow-2xs">
                            1 {b.room_type_name || "Phòng tiêu chuẩn"}
                          </span>
                        </td>

                        {/* 6. TỔNG CỘNG */}
                        <td className="py-4 px-4 text-right font-black text-slate-900 text-sm tabular-nums whitespace-nowrap">
                          {formatVND(b.total_price)}
                        </td>

                        {/* 7. KHÁCH ĐÃ TRẢ */}
                        <td className="py-4 px-4 text-right font-black text-emerald-700 text-sm tabular-nums whitespace-nowrap">
                          {formatVND(b.paid_amount || b.total_price)}
                        </td>

                        {/* 8. THAO TÁC - NÚT XÁC NHẬN NẰM NGUYÊN 1 HÀNG */}
                        <td className="py-4 px-4 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => {
                              setAssigningBooking(b);
                              setSelectedAssignRoom("");
                            }}
                            className="px-4 py-2 bg-[#003580] hover:bg-[#00224f] text-white rounded-xl font-bold text-xs shadow-xs transition cursor-pointer active:scale-95 inline-flex items-center justify-center gap-1.5 min-w-[110px] whitespace-nowrap"
                          >
                            <Check size={15} />
                            <span>Xác nhận</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Chân Modal 1 */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-[11px] text-slate-500 shrink-0">
              <span>Khách sạn đang nhận đặt phòng trực tuyến qua GoStay.</span>
              <button
                type="button"
                onClick={() => setIsPendingModalOpen(false)}
                className="px-4 py-1.5 border border-slate-200 rounded-lg text-slate-700 font-bold hover:bg-slate-100 cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: "XÁC NHẬN ĐẶT PHÒNG & CHỌN PHÒNG" ─── */}
      {assigningBooking && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-200">
            {/* Header Modal 2 */}
            <div className="px-6 py-4 bg-[#003580] text-white flex items-center justify-between">
              <h3 className="font-black text-base">
                Xác nhận đặt phòng - #{assigningBooking.booking_code}
              </h3>
              <button
                onClick={() => setAssigningBooking(null)}
                className="text-white/80 hover:text-white cursor-pointer p-1 rounded-lg hover:bg-white/10"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Tên & SĐT khách */}
              <div className="text-slate-800 font-bold flex items-center gap-2 text-sm">
                <span>👤 {assigningBooking.customer_name}</span>
                <span className="text-slate-400 font-normal">
                  -{" "}
                  {assigningBooking.guest_phone ||
                    assigningBooking.guest_email ||
                    "Chưa có SĐT"}
                </span>
              </div>

              {/* Hộp chi tiết xếp phòng */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex items-center justify-between flex-wrap gap-4">
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">
                    Hạng phòng
                  </div>
                  <div className="font-bold text-[#003580] text-sm">
                    {assigningBooking.room_type_name || "Phòng tiêu chuẩn"}
                  </div>
                </div>

                {/* Ô CHỌN SỐ PHÒNG */}
                <div className="min-w-[190px]">
                  <div className="text-[10px] text-slate-600 font-bold uppercase mb-1">
                    Phòng <span className="text-rose-500">*</span>
                  </div>
                  <select
                    value={selectedAssignRoom}
                    onChange={(e) => setSelectedAssignRoom(e.target.value)}
                    className="w-full bg-white border-2 border-[#003580] text-[#003580] font-bold rounded-xl p-2 text-xs outline-none shadow-xs cursor-pointer focus:ring-2 focus:ring-blue-200"
                  >
                    <option value="">-- Chọn số phòng --</option>
                    {availableRoomsForAssign.map((r) => (
                      <option key={r.id} value={r.room_number}>
                        Phòng {r.room_number} ({r.area || "Tầng 1"} -{" "}
                        {r.type_name})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">
                    Nhận
                  </div>
                  <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <CalendarDays size={13} className="text-[#006ce4]" />
                    <span>
                      {formatDisplayDateTime(assigningBooking.checkin_date)}
                    </span>
                  </div>
                </div>

                <div className="text-center">
                  <span className="px-2.5 py-1 rounded-md bg-blue-50 text-[#003580] font-black text-xs border border-blue-200">
                    1 đêm
                  </span>
                </div>

                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">
                    Trả
                  </div>
                  <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <CalendarDays size={13} className="text-[#006ce4]" />
                    <span>
                      {formatDisplayDateTime(assigningBooking.checkout_date)}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-500 italic">
                Sau khi xác nhận, các phòng sẽ chuyển về trạng thái đặt trước
                (Màu vàng trên sơ đồ phòng).
              </p>
            </div>

            {/* Footer Modal 2 */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setAssigningBooking(null)}
                className="px-5 py-2.5 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isSubmittingAssign}
                onClick={handleConfirmAssignRoom}
                className="px-6 py-2.5 bg-[#003580] hover:bg-[#00224f] text-white rounded-xl font-bold text-xs shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-2 active:scale-95 whitespace-nowrap"
              >
                <Check size={16} />
                <span>{isSubmittingAssign ? "Đang xử lý..." : "Xác nhận"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 3: "CHI TIẾT PHÒNG ĐÃ ĐẶT TRƯỚC" ─── */}
      <IncomingRoomModal
        isOpen={activeModalType === "incoming"}
        room={activeRoomData}
        onClose={() => {
          setActiveModalType(null);
          setActiveRoomData(null);
        }}
        onOpenConfirmCheckIn={handleOpenConfirmCheckIn}
        onOpenChangeRoom={handleOpenChangeRoom}
        formatDisplayDateTime={formatDisplayDateTime}
        countdownText={getCheckinCountdownText(
          activeRoomData?.booking?.checkin_date,
        )}
        formatVND={formatVND}
      />

      {/* Các modal phụ trợ */}
      <ConfirmCheckInModal
        isOpen={activeModalType === "confirm_checkin"}
        onClose={() => {
          setActiveModalType(null);
          setActiveRoomData(null);
        }}
        room={activeRoomData}
        confirmData={confirmCheckInData}
        setConfirmData={setConfirmCheckInData}
        onOpenGuestStay={() => {
          setActiveModalType("guest_stay");
        }}
        onFinalExecuteCheckIn={handleFinalExecuteCheckIn}
        guestCount={checkInGuestCount}
        guestList={checkInGuestList}
        toDatetimeLocal={toDatetimeLocal}
      />

      <CheckInGuestStayModal
        isOpen={activeModalType === "guest_stay"}
        onClose={() => {
          setActiveModalType("confirm_checkin");
        }}
        room={activeRoomData}
        guestCount={checkInGuestCount}
        setGuestCount={setCheckInGuestCount}
        guestList={checkInGuestList}
        setGuestList={setCheckInGuestList}
        onOpenGuestDocForm={handleOpenGuestDocForm}
        onSaveGuestInfoOnly={handleSaveGuestStayInfoOnly}
        onFinalExecuteCheckIn={handleFinalExecuteCheckIn}
      />

      <AddGuestDocModal
        isOpen={activeModalType === "add_guest_doc"}
        onClose={() => {
          setActiveModalType("guest_stay");
        }}
        rooms={rooms}
        formData={guestDocForm}
        setFormData={setGuestDocForm}
        onSubmit={handleGuestDocSubmit}
      />

      <OccupiedRoomModal
        room={activeModalType === "occupied" ? activeRoomData : null}
        onClose={() => {
          setActiveModalType(null);
          setActiveRoomData(null);
        }}
        onCheckOut={handleCompleteCheckOut}
        onOpenChangeRoom={handleOpenChangeRoom}
        formatVND={formatVND}
      />

      <ChangeRoomModal
        isOpen={activeModalType === "change_room"}
        onClose={() => {
          setActiveModalType(null);
          setChangeRoomTarget(null);
        }}
        currentRoom={changeRoomTarget}
        allRooms={rooms}
        onConfirmChange={handleExecuteChangeRoom}
      />

      <QuickBookingModal
        isOpen={activeModalType === "quick_booking"}
        onClose={() => setActiveModalType(null)}
        rooms={rooms}
        bookingData={quickBookingData}
        setBookingData={setQuickBookingData}
        onConfirmBooking={handleConfirmQuickBooking}
        formatVND={formatVND}
        calculateDurationAndPrice={calculateDurationAndPrice}
        toDatetimeLocal={toDatetimeLocal}
      />
    </div>
  );
}
