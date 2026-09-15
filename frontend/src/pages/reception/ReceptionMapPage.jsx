// src/pages/reception/ReceptionMapPage.jsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Calendar, Search, Plus, Building2 } from "lucide-react";
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
  return `${day} thg ${month}, ${hours}:${minutes}`;
};

const getCheckinCountdownText = (checkinDateStr) => {
  if (!checkinDateStr) return "31 phút nữa nhận phòng";
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

  // 🌟 3 BỘ LỌC TRẠNG THÁI CHUẨN XÁC
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

  const formatVND = (num) => Number(num || 0).toLocaleString("vi-VN");

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

  useEffect(() => {
    fetchRoomMap();
  }, [fetchRoomMap]);

  // 🌟 ĐẾM SỐ LƯỢNG CHUẨN XÁC THEO TỪNG NHÓM TRẠNG THÁI
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

  // 🌟 THUẬT TOÁN LỌC PHÒNG CHUẨN XÁC 100%
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

  // Click vào thẻ phòng
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

  // 🌟 GỬI ĐẦY ĐỦ THÔNG TIN SỐ KHÁCH LÊN SERVER
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
      alert(
        `✓ Đã đổi sang phòng ${newRoomNumber} thành công! (${
          mode === "split_stay" ? "Tính thời gian cả 2 phòng" : "Chuyển toàn bộ"
        })`,
      );
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
              )} ₫)`
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

  // 🌟 CẬP NHẬT TỨC THÌ (OPTIMISTIC UI): BẤM LÀ ĐỔI MÀU NGAY TRONG 0.1s
  const handleMarkCleaned = async (room) => {
    try {
      // Đổi màu sang Sạch ngay tức thì
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
      // Đổi sang trạng thái Cần dọn (viền cam + icon chổi) ngay tức thì
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
    <div className="min-h-screen bg-gray-50/50 text-gray-900 font-sans text-xs pb-16">
      {/* ─── TOOLBAR TIẾP TÂN ─── */}
      <div className="bg-white border-b border-gray-200 px-5 py-3.5 flex items-center justify-between shadow-xs flex-wrap gap-4 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm số phòng, tên khách..."
              className="pl-3 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:border-[#003580] focus:bg-white w-56 font-semibold"
            />
            <Search size={14} className="absolute right-3 text-gray-400" />
          </div>

          <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-1.5">
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
                  className="text-gray-900 font-bold"
                >
                  🏨 {h.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* BỘ LỌC CHECKBOX: TÍCH CHỌN MỤC NÀO CHỈ HIỆN ĐÚNG MỤC ĐÓ */}
        <div className="flex items-center gap-5 font-bold text-gray-700 select-none flex-wrap">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={statusFilters.incoming}
              onChange={(e) =>
                setStatusFilters({
                  ...statusFilters,
                  incoming: e.target.checked,
                })
              }
              className="accent-amber-500 rounded"
            />
            <span className="w-3.5 h-3.5 rounded-md border border-amber-500 bg-[#fff9f1] inline-block" />
            <span>Phòng sắp đến ({counts.incoming})</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={statusFilters.occupied}
              onChange={(e) =>
                setStatusFilters({
                  ...statusFilters,
                  occupied: e.target.checked,
                })
              }
              className="accent-[#003580] rounded"
            />
            <span className="w-3.5 h-3.5 rounded-md border border-[#003580] bg-blue-50 inline-block" />
            <span>Đang có khách ({counts.occupied})</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={statusFilters.available}
              onChange={(e) =>
                setStatusFilters({
                  ...statusFilters,
                  available: e.target.checked,
                })
              }
              className="accent-gray-400 rounded"
            />
            <span className="w-3.5 h-3.5 rounded-md border border-gray-300 bg-white inline-block" />
            <span>Phòng trống ({counts.available})</span>
          </label>
        </div>

        <button
          type="button"
          onClick={() => handleOpenQuickBooking()}
          className="px-4 py-2 bg-[#003580] hover:bg-blue-900 text-white rounded-xl cursor-pointer shadow-xs transition flex items-center gap-1.5 font-bold active:scale-95"
        >
          <Plus size={16} />
          <span>Đặt phòng nhanh</span>
        </button>
      </div>

      {/* ─── SƠ ĐỒ PHÒNG ─── */}
      <main className="p-4 sm:p-6 space-y-6">
        {loading ? (
          <div className="py-24 flex justify-center">
            <LoadingSpinner size="lg" label="Đang đồng bộ sơ đồ phòng..." />
          </div>
        ) : hotels.length === 0 ? (
          <div className="py-24 text-center text-gray-400 font-medium">
            Tài khoản này chưa được phân công cơ sở khách sạn nào.
          </div>
        ) : Object.keys(groupedRooms).length === 0 ? (
          <div className="py-24 text-center text-gray-400 font-medium">
            Không tìm thấy phòng nào phù hợp với bộ lọc tìm kiếm.
          </div>
        ) : (
          Object.keys(groupedRooms).map((area) => {
            const roomList = groupedRooms[area];
            return (
              <div key={area} className="space-y-3">
                <div className="flex items-center gap-2 font-black text-[#0a2540] text-sm">
                  <span>{area}</span>
                  <span className="bg-[#003580] text-white text-[11px] font-black px-2 py-0.5 rounded-full">
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

      {/* ─── 1. MODAL PHÒNG SẮP ĐẾN ─── */}
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

      {/* ─── 2. MODAL XÁC NHẬN NHẬN PHÒNG ─── */}
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

      {/* ─── 3. MODAL DANH SÁCH KHÁCH LƯU TRÚ ─── */}
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

      {/* ─── 4. MODAL NHẬP CCCD ĐỊNH DANH ─── */}
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

      {/* ─── 5. MODAL PHÒNG ĐANG CÓ KHÁCH (TRẢ PHÒNG / QUYẾT TOÁN) ─── */}
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

      {/* ─── 6. MODAL ĐỔI PHÒNG ─── */}
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

      {/* ─── 7. MODAL ĐẶT PHÒNG NHANH ─── */}
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
