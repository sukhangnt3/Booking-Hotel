// src/pages/reception/ReceptionMapPage.jsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Calendar, Search, Plus, Building2 } from "lucide-react";
import apiClient from "@/services/apiClient";
import { LoadingSpinner } from "@/components/common";

// Import các component đã tách
import RoomCard from "./components/RoomCard";
import IncomingRoomModal from "./components/IncomingRoomModal";
import ConfirmCheckInModal from "./components/ConfirmCheckInModal";
import CheckInGuestStayModal from "./components/CheckInGuestStayModal";
import AddGuestDocModal from "./components/AddGuestDocModal";
import OccupiedRoomModal from "./components/OccupiedRoomModal";
import QuickBookingModal from "./components/QuickBookingModal";

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

  const [statusFilters, setStatusFilters] = useState({
    incoming: true,
    occupied: true,
    checkout_soon: true,
    available: true,
  });
  const [searchQuery, setSearchQuery] = useState("");

  // Menu dọn phòng
  const [activeCleaningMenuId, setActiveCleaningMenuId] = useState(null);

  // Modal State
  const [activeIncomingRoom, setActiveIncomingRoom] = useState(null);
  const [activeOccupiedRoom, setActiveOccupiedRoom] = useState(null);

  // Flow Nhận phòng
  const [isConfirmCheckInOpen, setIsConfirmCheckInOpen] = useState(false);
  const [confirmCheckInData, setConfirmCheckInData] = useState({
    checkin_mode: "Hiện tại",
    checkin_time: "",
    checkout_time: "",
    duration_label: "1 đêm",
  });
  const [isCheckInGuestStayOpen, setIsCheckInGuestStayOpen] = useState(false);
  const [checkInGuestCount, setCheckInGuestCount] = useState({
    adult: 1,
    children: 0,
  });
  const [checkInGuestList, setCheckInGuestList] = useState([]);

  // Form nhập CCCD
  const [isAddGuestDocOpen, setIsAddGuestDocOpen] = useState(false);
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
  const [isQuickBookingOpen, setIsQuickBookingOpen] = useState(false);
  const [quickBookingData, setQuickBookingData] = useState({
    customer_name: "",
    customer_phone: "",
    guest_count: { adult: 2, children: 0, id_cards: 0 },
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
          list = res?.data?.hotels || res?.data || res?.hotels || res || [];
        } catch {}

        if (!Array.isArray(list) || list.length === 0) {
          const resAll = await apiClient.get("/hotels?active_only=true");
          list =
            resAll?.data?.hotels ||
            resAll?.data ||
            resAll?.hotels ||
            resAll ||
            [];
        }

        const validHotels = Array.isArray(list) ? list : [];
        setHotels(validHotels);
        if (validHotels.length > 0)
          setSelectedHotelId(String(validHotels[0].id));
      } catch (err) {
        console.error("Lỗi lấy khách sạn:", err);
      } finally {
        setLoading(false);
      }
    }
    loadHotels();
  }, []);

  const fetchRoomMap = useCallback(async () => {
    if (!selectedHotelId) return;
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

  const counts = useMemo(() => {
    return {
      incoming: rooms.filter((r) => r.status === "incoming").length,
      occupied: rooms.filter((r) => r.status === "occupied").length,
      available: rooms.filter(
        (r) => r.status === "available" || r.status === "dirty",
      ).length,
    };
  }, [rooms]);

  const groupedRooms = useMemo(() => {
    const groups = {};
    rooms.forEach((room) => {
      let normalizedStatus = room.status;
      if (normalizedStatus === "dirty" || !statusFilters[normalizedStatus]) {
        normalizedStatus = "available";
      }
      if (!statusFilters[normalizedStatus]) return;

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

  // Click phòng
  const handleRoomCardClick = (room) => {
    if (room.status === "occupied" || room.status === "checkout_soon") {
      setActiveOccupiedRoom(room);
    } else if (room.status === "incoming") {
      setActiveIncomingRoom(room);
    } else {
      handleOpenQuickBooking(room);
    }
  };

  // Mở Đặt phòng nhanh
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
    setIsQuickBookingOpen(true);
  };

  const handleConfirmQuickBooking = async (isCheckInNow = true) => {
    if (quickBookingData.rooms.length === 0)
      return alert("Vui lòng chọn ít nhất một phòng!");
    try {
      for (const item of quickBookingData.rooms) {
        await apiClient.post("/owner/bookings/walkin", {
          hotel_id: selectedHotelId,
          room_id: item.room_id,
          customer_name: quickBookingData.customer_name.trim() || "Khách lẻ",
          guest_phone: quickBookingData.customer_phone.trim(),
          total_price: item.price,
          customer_paid: Number(quickBookingData.customer_paid || 0), // 🌟 PHẢI CÓ DÒNG NÀY ĐỂ GỬI 100.000 ĐI
          checkin_date: item.checkin_date,
          checkout_date: item.checkout_date,
          is_check_in_now: isCheckInNow,
        });
      }
      alert(
        isCheckInNow ? "✓ Nhận phòng thành công!" : "✓ Đã lưu đơn đặt trước!",
      );
      setIsQuickBookingOpen(false);
      await fetchRoomMap();
    } catch (err) {
      alert("Lỗi: " + (err.response?.data?.message || err.message));
    }
  };

  // Mở xác nhận nhận phòng
  const handleOpenConfirmCheckIn = () => {
    if (!activeIncomingRoom?.booking) return;
    const now = new Date();
    const defaultCheckout = new Date(
      activeIncomingRoom.booking.checkout_date || now,
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
      adult: activeIncomingRoom.booking.adult_total || 1,
      children: activeIncomingRoom.booking.children_total || 0,
    });

    const nowTimeStr = `${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")} ${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
    setCheckInGuestList([
      {
        room_number: activeIncomingRoom.room_number,
        full_name: activeIncomingRoom.booking.customer_name || "Khách lưu trú",
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

    setIsConfirmCheckInOpen(true);
  };

  // Mở form nhập CCCD
  const handleOpenGuestDocForm = (guestItem = null, index = null) => {
    setEditingGuestIndex(index);
    if (guestItem) {
      setGuestDocForm({ ...guestItem });
    } else {
      setGuestDocForm({
        ...initialGuestDocForm,
        room_number: activeIncomingRoom?.room_number || "P.101",
        full_name: "",
      });
    }
    setIsAddGuestDocOpen(true);
  };

  // Lưu CCCD vào danh sách
  const handleGuestDocSubmit = (e) => {
    e.preventDefault();
    if (!guestDocForm.full_name.trim())
      return alert("Vui lòng nhập Họ và tên!");

    const now = new Date();
    const newGuestItem = {
      ...guestDocForm,
      declaration_time: `${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")} ${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`,
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
    setIsAddGuestDocOpen(false);
  };

  // Hoàn tất check-in
  const handleFinalExecuteCheckIn = async () => {
    if (!activeIncomingRoom?.booking?.id) return;
    try {
      await apiClient.post(
        `/owner/bookings/${activeIncomingRoom.booking.id}/checkin`,
        {
          room_number: activeIncomingRoom.room_number,
          checkin_date: confirmCheckInData.checkin_time,
          checkout_date: confirmCheckInData.checkout_time,
          adult_total: checkInGuestCount.adult,
          children_total: checkInGuestCount.children,
          guests: checkInGuestList,
        },
      );

      alert(`✓ Đã nhận phòng ${activeIncomingRoom.room_number} thành công!`);
      setIsConfirmCheckInOpen(false);
      setIsCheckInGuestStayOpen(false);
      setActiveIncomingRoom(null);
      await fetchRoomMap();
    } catch (err) {
      alert("Lỗi: " + (err.response?.data?.message || err.message));
    }
  };

  // Chỉ lưu thông tin khách
  const handleSaveGuestStayInfoOnly = () => {
    alert("✓ Đã lưu thông tin khách lưu trú!");
    setIsCheckInGuestStayOpen(false);
    setIsConfirmCheckInOpen(true);
  };

  // Trả phòng
  const handleCompleteCheckOut = async (bookingCode) => {
    const code = bookingCode || activeOccupiedRoom?.booking?.code;
    const room =
      rooms.find((r) => r.booking?.code === code) || activeOccupiedRoom;
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
      setActiveOccupiedRoom(null);
      await fetchRoomMap();
    } catch (err) {
      alert("Lỗi trả phòng: " + (err.response?.data?.message || err.message));
    }
  };

  // Dọn phòng
  const handleMarkCleaned = async (room) => {
    try {
      await apiClient.post("/owner/rooms/mark-cleaned", {
        hotel_id: selectedHotelId,
        room_number: room.room_number,
      });
      alert(`✓ Phòng ${room.room_number} đã dọn xong!`);
      setActiveCleaningMenuId(null);
      await fetchRoomMap();
    } catch (err) {
      alert("Lỗi: " + (err.response?.data?.message || err.message));
    }
  };

  const handleMarkDirty = async (room) => {
    try {
      await apiClient.post("/owner/rooms/mark-dirty", {
        hotel_id: selectedHotelId,
        room_number: room.room_number,
      });
      alert(`✓ Đã chuyển phòng ${room.room_number} sang Cần dọn!`);
      setActiveCleaningMenuId(null);
      await fetchRoomMap();
    } catch (err) {
      alert("Lỗi: " + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div className="bg-[#f0f2f5] min-h-screen text-slate-800 font-sans text-xs pb-12">
      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-[#1b6a38] text-white px-4 py-2.5 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-full bg-white text-[#1b6a38] shadow-sm font-bold flex items-center gap-1.5">
            <Calendar size={13} />
            <span>Lịch đặt phòng</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-[#14532d] px-3 py-1.5 rounded-md border border-emerald-600/50">
            <Building2 size={14} className="text-emerald-300" />
            <select
              value={selectedHotelId}
              onChange={(e) => setSelectedHotelId(e.target.value)}
              className="bg-transparent outline-none font-bold text-white cursor-pointer text-xs"
            >
              {hotels.map((h) => (
                <option key={h.id} value={h.id} className="text-slate-800">
                  {h.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* TOOLBAR */}
      <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between shadow-2xs flex-wrap gap-3">
        <div className="relative flex items-center">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm số phòng, tên khách..."
            className="pl-2 pr-7 py-1 bg-slate-50 border border-slate-300 rounded text-xs outline-none focus:border-[#1b6a38] w-48"
          />
          <Search size={13} className="absolute right-2 text-slate-400" />
        </div>

        <div className="flex items-center gap-5 font-semibold text-slate-700 select-none flex-wrap">
          <label className="flex items-center gap-1.5 cursor-pointer">
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
            <span className="w-3 h-3 rounded-2xs border border-amber-500 bg-[#fff9f1] inline-block" />
            <span>Phòng sắp đến ({counts.incoming})</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={statusFilters.occupied}
              onChange={(e) =>
                setStatusFilters({
                  ...statusFilters,
                  occupied: e.target.checked,
                })
              }
              className="accent-emerald-600 rounded"
            />
            <span className="w-3 h-3 rounded-2xs border border-emerald-500 bg-emerald-100 inline-block" />
            <span>Phòng đang có khách ({counts.occupied})</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={statusFilters.available}
              onChange={(e) =>
                setStatusFilters({
                  ...statusFilters,
                  available: e.target.checked,
                })
              }
              className="accent-slate-400 rounded"
            />
            <span className="w-3 h-3 rounded-2xs border border-slate-300 bg-white inline-block" />
            <span>Phòng trống ({counts.available})</span>
          </label>
        </div>

        <button
          onClick={() => handleOpenQuickBooking()}
          className="px-3 py-1.5 bg-[#1b6a38] hover:bg-[#14532d] text-white rounded cursor-pointer shadow-xs transition flex items-center gap-1 font-semibold"
        >
          <Plus size={14} />
          <span>Đặt phòng</span>
        </button>
      </div>

      {/* SƠ ĐỒ PHÒNG */}
      <main className="p-4 space-y-6">
        {loading ? (
          <div className="py-24 flex justify-center">
            <LoadingSpinner size="lg" label="Đang tải sơ đồ phòng..." />
          </div>
        ) : (
          Object.keys(groupedRooms).map((area) => {
            const roomList = groupedRooms[area];
            return (
              <div key={area} className="space-y-2.5">
                <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
                  <span>{area}</span>
                  <span className="bg-emerald-700 text-white text-[11px] font-bold px-1.5 py-0.2 rounded-full">
                    {roomList.length}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                  {roomList.map((room) => (
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
                    />
                  ))}
                </div>
              </div>
            );
          })
        )}
      </main>

      {/* TẬP HỢP TẤT CẢ CÁC MODAL ĐÃ TÁCH */}
      <IncomingRoomModal
        room={activeIncomingRoom}
        onClose={() => setActiveIncomingRoom(null)}
        onOpenConfirmCheckIn={handleOpenConfirmCheckIn}
        formatDisplayDateTime={formatDisplayDateTime}
        countdownText={getCheckinCountdownText(
          activeIncomingRoom?.booking?.checkin_date,
        )}
        formatVND={formatVND}
      />

      <ConfirmCheckInModal
        isOpen={isConfirmCheckInOpen}
        onClose={() => setIsConfirmCheckInOpen(false)}
        room={activeIncomingRoom}
        confirmData={confirmCheckInData}
        setConfirmData={setConfirmCheckInData}
        onOpenGuestStay={() => {
          setIsConfirmCheckInOpen(false);
          setIsCheckInGuestStayOpen(true);
          handleOpenGuestDocForm(checkInGuestList[0], 0);
        }}
        onFinalExecuteCheckIn={handleFinalExecuteCheckIn}
        guestCount={checkInGuestCount}
        guestList={checkInGuestList}
        toDatetimeLocal={toDatetimeLocal}
      />

      <CheckInGuestStayModal
        isOpen={isCheckInGuestStayOpen}
        onClose={() => setIsCheckInGuestStayOpen(false)}
        room={activeIncomingRoom}
        guestCount={checkInGuestCount}
        setGuestCount={setCheckInGuestCount}
        guestList={checkInGuestList}
        setGuestList={setCheckInGuestList}
        onOpenGuestDocForm={handleOpenGuestDocForm}
        onSaveGuestInfoOnly={handleSaveGuestStayInfoOnly}
        onFinalExecuteCheckIn={handleFinalExecuteCheckIn}
      />

      <AddGuestDocModal
        isOpen={isAddGuestDocOpen}
        onClose={() => setIsAddGuestDocOpen(false)}
        rooms={rooms}
        formData={guestDocForm}
        setFormData={setGuestDocForm}
        onSubmit={handleGuestDocSubmit}
      />

      <OccupiedRoomModal
        room={activeOccupiedRoom}
        onClose={() => setActiveOccupiedRoom(null)}
        onCheckOut={handleCompleteCheckOut}
        formatVND={formatVND}
      />

      <QuickBookingModal
        isOpen={isQuickBookingOpen}
        onClose={() => setIsQuickBookingOpen(false)}
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
