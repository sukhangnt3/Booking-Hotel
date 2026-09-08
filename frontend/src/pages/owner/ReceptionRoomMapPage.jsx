// src/pages/owner/ReceptionRoomMapPage.jsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Calendar,
  Search,
  Plus,
  Sparkles,
  MoreVertical,
  Building2,
  DoorOpen,
  ArrowRight,
  AlertCircle,
  Grid,
  List,
  Trash2,
  Edit2,
  Clock,
  User,
  Users,
  CreditCard,
  QrCode,
  CheckCircle2,
  X,
  Key,
  ChevronDown,
  Info,
  ArrowLeft,
} from "lucide-react";
import apiClient from "@/services/apiClient";
import { LoadingSpinner } from "@/components/common";

const toDatetimeLocal = (date) => {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function ReceptionRoomMapPage() {
  const [hotels, setHotels] = useState([]);
  const [selectedHotelId, setSelectedHotelId] = useState("");
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");

  // ─── 1. TỰ ĐỘNG KHÔI PHỤC TAB TỪ SESSIONSTORAGE KHI F5 (CHỐNG MẤT TAB KHI RELOAD) ───
  const [bookingTabs, setBookingTabs] = useState(() => {
    try {
      const saved = sessionStorage.getItem("reception_booking_tabs");
      if (saved) return JSON.parse(saved);
    } catch {}
    return [{ id: "map", label: "Lịch đặt phòng", isFixed: true, type: "map" }];
  });

  const [activeTab, setActiveTab] = useState(() => {
    try {
      const saved = sessionStorage.getItem("reception_active_tab");
      if (saved) return saved;
    } catch {}
    return "map";
  });

  const [tabsData, setTabsData] = useState(() => {
    try {
      const saved = sessionStorage.getItem("reception_tabs_data");
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  });

  // Tự động lưu trạng thái Tab vào sessionStorage mỗi khi có thay đổi
  useEffect(() => {
    try {
      sessionStorage.setItem(
        "reception_booking_tabs",
        JSON.stringify(bookingTabs),
      );
      sessionStorage.setItem("reception_active_tab", activeTab);
      sessionStorage.setItem("reception_tabs_data", JSON.stringify(tabsData));
    } catch {}
  }, [bookingTabs, activeTab, tabsData]);

  const [statusFilters, setStatusFilters] = useState({
    incoming: true,
    occupied: true,
    checkout_soon: true,
    available: true,
  });

  const [searchQuery, setSearchQuery] = useState("");

  // Modal Thêm mới khách hàng (Ảnh 5 - nút [+])
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const initialCustomerForm = {
    customer_code: "",
    name: "",
    phone: "",
    email: "",
    customer_group: "",
    birthday: "",
    type: "personal",
    tax_code: "",
    address: "",
    city: "",
    ward: "",
    note: "",
  };
  const [customerForm, setCustomerForm] = useState(initialCustomerForm);

  // Popup xem chi tiết phòng đang ở (Ảnh nhỏ khi bấm phòng xanh)
  const [activeOccupiedRoom, setActiveOccupiedRoom] = useState(null);

  // Modal Xác nhận trả phòng (Ảnh 5 & 6)
  const [isConfirmCheckoutOpen, setIsConfirmCheckoutOpen] = useState(false);
  const [confirmCheckoutDateTime, setConfirmCheckoutDateTime] = useState(
    toDatetimeLocal(new Date()),
  );
  const [confirmCheckoutMode, setConfirmCheckoutMode] = useState("now");

  // Menu dọn phòng
  const [activeCleaningMenuId, setActiveCleaningMenuId] = useState(null);

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
    async function loadHotels() {
      try {
        const res = await apiClient.get("/hotels/my-hotels?active_only=true");
        const list = res?.data?.hotels || res?.data || res?.hotels || res || [];
        setHotels(Array.isArray(list) ? list : []);
        if (list.length > 0) setSelectedHotelId(String(list[0].id));
      } catch (err) {
        console.error(err);
      }
    }
    loadHotels();
  }, []);

  const fetchRoomMap = useCallback(async () => {
    if (!selectedHotelId) {
      setRooms([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setApiError("");
    try {
      const res = await apiClient.get(
        `/owner/room-map?hotel_id=${selectedHotelId}`,
      );
      const rawRooms = res?.data?.rooms || res?.rooms || res?.data || res || [];
      setRooms(Array.isArray(rawRooms) ? rawRooms : []);
    } catch (err) {
      setApiError(
        err.response?.data?.message ||
          err.message ||
          "Không thể tải sơ đồ phòng.",
      );
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
      checkout_soon: rooms.filter((r) => r.status === "checkout_soon").length,
      available: rooms.filter(
        (r) => r.status === "available" || r.status === "dirty",
      ).length,
    };
  }, [rooms]);

  const groupedRooms = useMemo(() => {
    const groups = {};
    rooms.forEach((room) => {
      const normalizedStatus =
        room.status === "dirty" ? "available" : room.status;
      if (!statusFilters[normalizedStatus]) return;
      if (
        searchQuery.trim() &&
        !room.room_number.toLowerCase().includes(searchQuery.toLowerCase()) &&
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

  // Tạo tab đặt phòng mới khi bấm phòng trống
  const handleOpenNewBookingTab = (room = null) => {
    const targetRoom =
      room || rooms.find((r) => r.status === "available") || rooms[0];
    if (!targetRoom) return;

    const existingNewTabs = bookingTabs.filter((t) => t.type === "new");
    const nextNumber = existingNewTabs.length + 1;
    const tabId = `new_tab_${Date.now()}`;
    const tabLabel = `Đặt phòng ${nextNumber}`;

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

    const initialItem = {
      room_id: targetRoom.id,
      room_number: targetRoom.room_number,
      type_name: targetRoom.type_name,
      rental_type: "Ngày",
      checkin_mode: "Quy định",
      checkin_date: checkinVal,
      checkout_date: checkoutVal,
      duration_label: durationLabel,
      price: price,
    };

    setBookingTabs((prev) => [
      ...prev,
      { id: tabId, label: tabLabel, isFixed: false, type: "new" },
    ]);
    setTabsData((prev) => ({
      ...prev,
      [tabId]: {
        customer_name: "Khách lẻ",
        customer_phone: "",
        price_table: "Bảng giá chung",
        guest_count: { adult: 1, children: 0, id_cards: 0 },
        rooms: [initialItem],
        note: "",
        customer_paid: 0,
      },
    }));
    setActiveTab(tabId);
  };

  // Bấm vào thẻ phòng
  const handleRoomCardClick = (room) => {
    if (room.status === "occupied" || room.status === "checkout_soon") {
      setActiveOccupiedRoom(room);
    } else {
      handleOpenNewBookingTab(room);
    }
  };

  // 👉 BẤM CÂY BÚT ✏️ SỬA PHÒNG ➔ MỞ TAB MÃ ĐƠN (VD: DP395886)
  const handleOpenEditBookingTab = (room) => {
    const bookingCode = room.booking?.code || "DP395886";

    setBookingTabs((prev) => {
      if (!prev.some((t) => t.id === bookingCode)) {
        return [
          ...prev,
          {
            id: bookingCode,
            label: bookingCode,
            isFixed: false,
            type: "edit",
            room,
          },
        ];
      }
      return prev;
    });

    setTabsData((prev) => ({
      ...prev,
      [bookingCode]: {
        booking_code: bookingCode,
        room: room,
        customer_name: room.booking?.customer_name || "Khách lẻ",
        customer_phone: room.booking?.guest_phone || "",
        rental_type: "Ngày",
        checkin_date: toDatetimeLocal(room.booking?.checkin_date || new Date()),
        checkout_date: toDatetimeLocal(
          room.booking?.checkout_date || new Date(Date.now() + 86400000),
        ),
        duration_label: "1 ngày",
        used_duration: room.booking?.stay_duration || "1 ngày",
        price: Number(room.booking?.total_price || room.daily_price || 600000),
      },
    }));

    setActiveOccupiedRoom(null);
    setActiveTab(bookingCode);
  };

  // Đóng Tab
  const handleCloseTab = (tabId) => {
    setBookingTabs((prev) => prev.filter((t) => t.id !== tabId));
    setTabsData((prev) => {
      const copy = { ...prev };
      delete copy[tabId];
      return copy;
    });
    if (activeTab === tabId) {
      setActiveTab("map");
    }
  };

  // Cập nhật từng trường trong tab đặt mới
  const handleUpdateNewBookingItem = (tabId, index, field, value) => {
    setTabsData((prev) => {
      const currentTab = prev[tabId] || {};
      const updatedRooms = [...(currentTab.rooms || [])];
      const item = { ...updatedRooms[index], [field]: value };
      const roomInfo = rooms.find((r) => r.id === item.room_id) || {};

      if (field === "checkin_mode") {
        const now = new Date();
        if (value === "Hiện tại") {
          item.checkin_date = toDatetimeLocal(now);
        } else {
          now.setHours(14, 0, 0, 0);
          item.checkin_date = toDatetimeLocal(now);
        }
      }

      const { durationLabel, price } = calculateDurationAndPrice(
        item.checkin_date,
        item.checkout_date,
        item.rental_type,
        roomInfo,
      );
      item.duration_label = durationLabel;
      item.price = price;

      if (field === "room_id") {
        const sel = rooms.find((r) => r.id === value);
        if (sel) {
          item.room_number = sel.room_number;
          item.type_name = sel.type_name;
          const recalc = calculateDurationAndPrice(
            item.checkin_date,
            item.checkout_date,
            item.rental_type,
            sel,
          );
          item.price = recalc.price;
        }
      }

      updatedRooms[index] = item;
      return {
        ...prev,
        [tabId]: { ...currentTab, rooms: updatedRooms },
      };
    });
  };

  // Nhận phòng / đặt trước từ Tab mới
  const handleConfirmNewBooking = async (tabId, isCheckInNow = true) => {
    const currentTabData = tabsData[tabId];
    if (!currentTabData || currentTabData.rooms.length === 0) {
      alert("Vui lòng chọn ít nhất một phòng!");
      return;
    }

    try {
      for (const item of currentTabData.rooms) {
        await apiClient.post("/owner/bookings/walkin", {
          hotel_id: selectedHotelId,
          room_id: item.room_id,
          customer_name: currentTabData.customer_name.trim(),
          guest_phone: currentTabData.customer_phone.trim(),
          total_price: item.price,
          checkin_date: item.checkin_date,
          checkout_date: item.checkout_date,
          is_check_in_now: isCheckInNow,
        });
      }

      alert(
        isCheckInNow
          ? "✓ Đã nhận phòng thành công!"
          : "✓ Đã lưu đơn đặt trước!",
      );
      handleCloseTab(tabId);
      await fetchRoomMap();
    } catch (err) {
      alert("Lỗi: " + (err.response?.data?.message || err.message));
    }
  };

  // Trả phòng
  const handleCompleteCheckOut = async (bookingCode = null) => {
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
      setIsConfirmCheckoutOpen(false);
      setActiveOccupiedRoom(null);

      if (code && bookingTabs.some((t) => t.id === code)) {
        handleCloseTab(code);
      }

      await fetchRoomMap();
    } catch (err) {
      alert("Lỗi trả phòng: " + (err.response?.data?.message || err.message));
    }
  };

  // Lễ tân bấm "Đã dọn"
  const handleMarkCleaned = async (room) => {
    try {
      await apiClient.post("/owner/rooms/mark-cleaned", {
        hotel_id: selectedHotelId,
        room_number: room.room_number,
      });
      alert(`✓ Phòng ${room.room_number} đã dọn xong, sạch sẽ đón khách mới!`);
      setActiveCleaningMenuId(null);
      await fetchRoomMap();
    } catch (err) {
      alert("Lỗi: " + (err.response?.data?.message || err.message));
    }
  };

  const currentTabInfo =
    bookingTabs.find((t) => t.id === activeTab) || bookingTabs[0];
  const currentTabBookingData = tabsData[activeTab] || {};

  return (
    <div className="bg-[#f0f2f5] min-h-screen text-slate-800 font-sans text-xs pb-12">
      {/* ─── 1. THANH HEADER ĐA TAB CỐ ĐỊNH (STICKY TOP) ─── */}
      <header className="sticky top-0 z-40 bg-[#1b6a38] text-white px-4 py-2 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2 flex-wrap">
          {bookingTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <div
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-full flex items-center gap-1.5 cursor-pointer font-semibold transition ${
                  isActive
                    ? "bg-white text-[#1b6a38] shadow-sm font-bold"
                    : "bg-[#14532d] hover:bg-[#114425] text-white"
                }`}
              >
                {tab.isFixed && <Calendar size={13} />}
                <span>{tab.label}</span>
                {!tab.isFixed && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCloseTab(tab.id);
                    }}
                    className="hover:text-red-500 rounded-full p-0.5 ml-1 cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>
            );
          })}

          <button
            onClick={() => handleOpenNewBookingTab()}
            className="p-1.5 bg-[#14532d] hover:bg-[#114425] text-white rounded-full transition cursor-pointer ml-1"
            title="Mở thêm tab đặt phòng mới"
          >
            <Plus size={13} />
          </button>
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

      {/* ─── 2. TAB: SƠ ĐỒ LỊCH ĐẶT PHÒNG ("map") ─── */}
      {activeTab === "map" && (
        <>
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
                <span className="w-3 h-3 rounded-2xs border border-amber-500 bg-amber-50 inline-block" />
                <span>Sắp đến ({counts.incoming})</span>
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
                <span>Đang sử dụng ({counts.occupied})</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={statusFilters.checkout_soon}
                  onChange={(e) =>
                    setStatusFilters({
                      ...statusFilters,
                      checkout_soon: e.target.checked,
                    })
                  }
                  className="accent-orange-500 rounded"
                />
                <span className="w-3 h-3 rounded-2xs border border-orange-500 bg-orange-50 inline-block" />
                <span>Sắp trả ({counts.checkout_soon})</span>
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
              onClick={() => handleOpenNewBookingTab()}
              className="px-3 py-1.5 bg-[#1b6a38] hover:bg-[#14532d] text-white rounded cursor-pointer shadow-xs transition flex items-center gap-1 font-semibold"
            >
              <Plus size={14} />
              <span>Đặt phòng</span>
            </button>
          </div>

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
                      {roomList.map((room) => {
                        const isOccupied =
                          room.status === "occupied" ||
                          room.status === "checkout_soon";
                        const isDirty = room.status === "dirty";

                        return (
                          <div
                            key={room.id}
                            onClick={() => handleRoomCardClick(room)}
                            className={`rounded-lg border p-3 cursor-pointer transition hover:shadow-md relative select-none min-h-[115px] flex flex-col justify-between ${
                              isOccupied
                                ? "bg-[#eafaf1] border-emerald-300 shadow-2xs"
                                : isDirty
                                  ? "bg-amber-50/80 border-amber-300"
                                  : "bg-white border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <span
                                className={`px-2 py-0.5 rounded text-[11px] font-black tracking-wide ${
                                  isOccupied
                                    ? "bg-[#1b6a38] text-white"
                                    : isDirty
                                      ? "bg-amber-600 text-white"
                                      : "bg-slate-600 text-white"
                                }`}
                              >
                                {room.room_number}
                              </span>

                              <div className="flex items-center gap-1 text-slate-400 relative">
                                <Sparkles
                                  size={12}
                                  className="text-emerald-700"
                                />
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveCleaningMenuId(
                                      activeCleaningMenuId === room.id
                                        ? null
                                        : room.id,
                                    );
                                  }}
                                  className="p-0.5 hover:text-slate-700 cursor-pointer"
                                >
                                  <MoreVertical size={13} />
                                </button>

                                {activeCleaningMenuId === room.id && (
                                  <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl py-1 z-30 min-w-[110px] animate-fadeIn">
                                    {isDirty ? (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleMarkCleaned(room);
                                        }}
                                        className="w-full text-left px-3 py-1.5 text-xs text-emerald-700 hover:bg-emerald-50 font-bold flex items-center gap-1 cursor-pointer"
                                      >
                                        <CheckCircle2 size={12} />
                                        <span>Đã dọn</span>
                                      </button>
                                    ) : (
                                      <div className="px-3 py-1.5 text-xs font-semibold text-amber-700">
                                        Chưa dọn
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            {isOccupied ? (
                              <div className="my-1.5 space-y-1">
                                <div className="font-bold text-slate-800 text-xs truncate">
                                  {room.booking?.customer_name || "Khách lẻ"}
                                </div>
                                <div className="text-[11px] font-bold text-amber-600">
                                  {room.booking?.stay_duration ||
                                    "1 ngày / 1 ngày"}
                                </div>
                              </div>
                            ) : isDirty ? (
                              <div className="my-1.5 space-y-1">
                                <div className="font-bold text-xs text-amber-800">
                                  Chưa dọn
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMarkCleaned(room);
                                  }}
                                  className="text-[10px] bg-amber-200 hover:bg-amber-300 text-amber-900 font-bold px-2 py-0.5 rounded cursor-pointer"
                                >
                                  Bấm để dọn xong
                                </button>
                              </div>
                            ) : (
                              <div className="my-1.5 space-y-0.5">
                                <div className="font-bold text-slate-700 text-xs truncate">
                                  {room.type_name}
                                </div>
                                <div className="text-[10px] text-slate-500 line-clamp-2">
                                  {formatVND(room.hourly_price)}/Giờ -{" "}
                                  {formatVND(room.daily_price)}/Ngày -{" "}
                                  {formatVND(room.overnight_price)}/Đêm
                                </div>
                              </div>
                            )}

                            <div className="pt-1" />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </main>
        </>
      )}

      {/* ─── 3. NỘI DUNG TAB "ĐẶT PHÒNG MỚI" ─── */}
      {currentTabInfo?.type === "new" && (
        <div className="p-4 space-y-4 max-w-6xl mx-auto animate-fadeIn">
          {/* 👉 NÚT BẤM QUAY LẠI SƠ ĐỒ PHÒNG CỰC KỲ TIỆN LỢI */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setActiveTab("map")}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1b6a38] hover:underline cursor-pointer bg-white px-3 py-1.5 rounded-md border border-slate-200 shadow-2xs"
            >
              <ArrowLeft size={14} />
              <span>Quay lại sơ đồ phòng</span>
            </button>
            <span className="font-bold text-slate-600">
              {currentTabInfo.label}
            </span>
          </div>

          {/* Thanh tìm kiếm khách hàng */}
          <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-1 min-w-[300px]">
              <div className="relative flex-1 flex items-center border border-slate-300 rounded-md bg-white px-2.5 py-1.5 shadow-2xs">
                <Search size={14} className="text-slate-400 mr-2 shrink-0" />
                <input
                  type="text"
                  value={currentTabBookingData.customer_name || "Khách lẻ"}
                  onChange={(e) =>
                    setTabsData((prev) => ({
                      ...prev,
                      [activeTab]: {
                        ...prev[activeTab],
                        customer_name: e.target.value,
                      },
                    }))
                  }
                  placeholder="Tìm khách hàng (F4)"
                  className="w-full outline-none text-xs font-semibold text-slate-800"
                />
                <button
                  type="button"
                  onClick={() => setIsAddCustomerOpen(true)}
                  className="ml-2 w-5 h-5 bg-slate-100 hover:bg-emerald-100 text-slate-600 hover:text-[#1b6a38] rounded-full flex items-center justify-center cursor-pointer font-bold shrink-0"
                >
                  +
                </button>
              </div>

              <div className="flex items-center gap-2 border border-slate-300 rounded-md px-2.5 py-1.5 bg-slate-50 font-semibold text-slate-700 shadow-2xs">
                <User size={13} className="text-slate-500" />
                <span>1</span>
                <span className="text-slate-300">|</span>
                <Users size={13} className="text-slate-500" />
                <span>0</span>
                <span className="text-slate-300">|</span>
                <CreditCard size={13} className="text-slate-500" />
                <span>0</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="border border-slate-300 rounded-md px-2.5 py-1.5 bg-white text-slate-700 font-semibold flex items-center gap-1 shadow-2xs">
                <span>🚶</span>
                <ChevronDown size={13} />
              </div>
              <div className="border border-slate-300 rounded-md px-3 py-1.5 bg-white text-slate-700 font-semibold flex items-center gap-1.5 shadow-2xs">
                <span>Bảng giá chung</span>
                <ChevronDown size={13} />
              </div>
            </div>
          </div>

          {/* Bảng phòng đặt */}
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs space-y-4">
            <div className="border border-slate-200 rounded-lg overflow-x-auto bg-white shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#eef8f2] text-slate-700 border-b border-slate-200">
                    <th className="py-2.5 px-3 font-bold">Hạng phòng</th>
                    <th className="py-2.5 px-3 font-bold">
                      Phòng{" "}
                      <span className="bg-[#1b6a38] text-white px-1.5 py-0.2 rounded-full text-[10px]">
                        {currentTabBookingData.rooms?.length || 0}
                      </span>
                    </th>
                    <th className="py-2.5 px-3 font-bold">Hình thức</th>
                    <th className="py-2.5 px-3 font-bold">
                      <div className="flex items-center gap-1">
                        <span>Nhận</span>
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateNewBookingItem(
                              activeTab,
                              0,
                              "checkin_mode",
                              "Hiện tại",
                            )
                          }
                          className={`px-1.5 py-0.2 rounded text-[10px] font-bold cursor-pointer ${
                            currentTabBookingData.rooms?.[0]?.checkin_mode ===
                            "Hiện tại"
                              ? "border border-[#1b6a38] text-[#1b6a38] bg-white"
                              : "border border-slate-300 text-slate-600 bg-white"
                          }`}
                        >
                          Hiện tại
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateNewBookingItem(
                              activeTab,
                              0,
                              "checkin_mode",
                              "Quy định",
                            )
                          }
                          className={`px-1.5 py-0.2 rounded text-[10px] font-bold cursor-pointer ${
                            currentTabBookingData.rooms?.[0]?.checkin_mode ===
                            "Quy định"
                              ? "border border-[#1b6a38] text-[#1b6a38] bg-white"
                              : "border border-slate-300 text-slate-600 bg-white"
                          }`}
                        >
                          Quy định
                        </button>
                      </div>
                    </th>
                    <th className="py-2.5 px-3 font-bold">Trả phòng</th>
                    <th className="py-2.5 px-3 font-bold">Dự kiến</th>
                    <th className="py-2.5 px-3 font-bold text-right">
                      Thành tiền
                    </th>
                    <th className="py-2.5 px-2 w-8 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentTabBookingData.rooms?.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-3 px-3 font-medium text-slate-800">
                        {item.type_name}
                      </td>
                      <td className="py-3 px-3">
                        <select
                          value={item.room_id}
                          onChange={(e) =>
                            handleUpdateNewBookingItem(
                              activeTab,
                              idx,
                              "room_id",
                              e.target.value,
                            )
                          }
                          className="border border-slate-300 rounded px-2 py-1 outline-none font-bold text-slate-800 bg-white cursor-pointer"
                        >
                          {rooms.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.room_number}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 px-3">
                        <select
                          value={item.rental_type}
                          onChange={(e) =>
                            handleUpdateNewBookingItem(
                              activeTab,
                              idx,
                              "rental_type",
                              e.target.value,
                            )
                          }
                          className="border border-slate-300 rounded px-2 py-1 outline-none font-semibold text-slate-800 bg-white cursor-pointer"
                        >
                          <option value="Ngày">Ngày</option>
                          <option value="Giờ">Giờ</option>
                          <option value="Đêm">Đêm</option>
                        </select>
                      </td>
                      <td className="py-3 px-3">
                        <input
                          type="datetime-local"
                          value={item.checkin_date}
                          onChange={(e) =>
                            handleUpdateNewBookingItem(
                              activeTab,
                              idx,
                              "checkin_date",
                              e.target.value,
                            )
                          }
                          className="border border-slate-300 rounded px-1.5 py-0.5 outline-none font-semibold text-slate-800 bg-white"
                        />
                      </td>
                      <td className="py-3 px-3">
                        <input
                          type="datetime-local"
                          value={item.checkout_date}
                          onChange={(e) =>
                            handleUpdateNewBookingItem(
                              activeTab,
                              idx,
                              "checkout_date",
                              e.target.value,
                            )
                          }
                          className="border border-slate-300 rounded px-1.5 py-0.5 outline-none font-semibold text-slate-800 bg-white"
                        />
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-600">
                        {item.duration_label}
                      </td>
                      <td className="py-3 px-3 font-black text-right text-[#1b6a38]">
                        {formatVND(item.price)} đ
                      </td>
                      <td className="py-3 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setTabsData((prev) => ({
                              ...prev,
                              [activeTab]: {
                                ...prev[activeTab],
                                rooms: prev[activeTab].rooms.filter(
                                  (_, i) => i !== idx,
                                ),
                              },
                            }));
                          }}
                          className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-2 items-start">
              <div className="md:col-span-6 flex items-center gap-2">
                <span className="font-semibold text-slate-600 shrink-0">
                  Ghi chú
                </span>
                <input
                  value={currentTabBookingData.note || ""}
                  onChange={(e) =>
                    setTabsData((prev) => ({
                      ...prev,
                      [activeTab]: { ...prev[activeTab], note: e.target.value },
                    }))
                  }
                  placeholder="Nhập ghi chú..."
                  className="flex-1 border-b border-slate-300 py-1 outline-none text-slate-800 text-xs focus:border-[#1b6a38]"
                />
              </div>

              <div className="md:col-span-6 space-y-2.5 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-bold text-slate-700">
                    Khách cần trả:
                  </span>
                  <span className="font-black text-[#1b6a38] text-base">
                    {formatVND(
                      (currentTabBookingData.rooms || []).reduce(
                        (sum, r) => sum + (Number(r.price) || 0),
                        0,
                      ),
                    )}{" "}
                    đ
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => handleConfirmNewBooking(activeTab, true)}
                className="px-6 py-2 bg-[#1b6a38] hover:bg-[#14532d] text-white font-bold rounded-md shadow-xs cursor-pointer text-xs"
              >
                Nhận phòng
              </button>
              <button
                type="button"
                onClick={() => handleConfirmNewBooking(activeTab, false)}
                className="px-6 py-2 bg-[#ea580c] hover:bg-[#c2410c] text-white font-bold rounded-md shadow-xs cursor-pointer text-xs"
              >
                Đặt trước
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 4. NỘI DUNG TAB SỬA ĐƠN ĐẶT PHÒNG (VD: "DP395886" - BẢO LƯU DỮ LIỆU 100% KHI F5) ─── */}
      {currentTabInfo?.type === "edit" && (
        <div className="p-4 space-y-4 max-w-6xl mx-auto animate-fadeIn">
          {/* 👉 NÚT BẤM QUAY LẠI SƠ ĐỒ PHÒNG CỐ ĐỊNH RÕ RÀNG */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setActiveTab("map")}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1b6a38] hover:underline cursor-pointer bg-white px-3.5 py-1.5 rounded-md border border-slate-200 shadow-2xs"
            >
              <ArrowLeft size={14} />
              <span>Quay lại sơ đồ phòng</span>
            </button>
            <span className="font-bold text-slate-600">
              Đơn phòng: {currentTabInfo.label}
            </span>
          </div>

          {/* Thanh tìm kiếm & Khách hàng */}
          <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-1 min-w-[320px]">
              <div className="relative flex-1 flex items-center border border-slate-300 rounded-md bg-white px-3 py-1.5 shadow-2xs">
                <Search size={14} className="text-slate-400 mr-2 shrink-0" />
                <input
                  type="text"
                  value={currentTabBookingData.customer_name || "Khách lẻ"}
                  onChange={(e) =>
                    setTabsData((prev) => ({
                      ...prev,
                      [activeTab]: {
                        ...prev[activeTab],
                        customer_name: e.target.value,
                      },
                    }))
                  }
                  placeholder="Tìm khách hàng (F4)"
                  className="w-full outline-none text-xs font-semibold text-slate-800"
                />
                <button
                  type="button"
                  onClick={() => setIsAddCustomerOpen(true)}
                  className="ml-2 w-5 h-5 bg-slate-100 hover:bg-emerald-100 text-slate-600 hover:text-[#1b6a38] rounded-full flex items-center justify-center cursor-pointer font-bold shrink-0"
                >
                  +
                </button>
              </div>

              <div className="flex items-center gap-2 border border-slate-300 rounded-md px-3 py-1.5 bg-slate-50 font-semibold text-slate-700 shadow-2xs">
                <User size={13} className="text-slate-500" />
                <span>1</span>
                <span className="text-slate-300">|</span>
                <Users size={13} className="text-slate-500" />
                <span>0</span>
                <span className="text-slate-300">|</span>
                <CreditCard size={13} className="text-slate-500" />
                <span>0</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="border border-slate-300 rounded-md px-2.5 py-1.5 bg-white text-slate-700 font-semibold flex items-center gap-1 shadow-2xs">
                <span>🚶</span>
                <ChevronDown size={13} />
              </div>
              <div className="border border-slate-300 rounded-md px-3 py-1.5 bg-white text-slate-700 font-semibold flex items-center gap-1.5 shadow-2xs">
                <span>Bảng giá chung</span>
                <ChevronDown size={13} />
              </div>
            </div>
          </div>

          {/* Dải thẻ phòng */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-[#1b6a38] text-white font-bold px-3 py-1.5 rounded-md flex items-center gap-2 shadow-2xs">
                <span>
                  {currentTabBookingData.room?.room_number || "P.301"}
                </span>
                <button
                  type="button"
                  onClick={() => handleCloseTab(activeTab)}
                  className="hover:text-red-300 cursor-pointer text-xs"
                >
                  ✕
                </button>
              </div>

              <button
                type="button"
                onClick={() => alert("Chọn thêm phòng!")}
                className="text-[#1b6a38] font-bold hover:underline cursor-pointer flex items-center gap-1 pl-1"
              >
                <span>⊕</span>
                <span>Phòng</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsConfirmCheckoutOpen(true)}
                className="px-4 py-1.5 bg-[#0284c7] hover:bg-[#0369a1] text-white font-bold rounded-md shadow-xs cursor-pointer text-xs"
              >
                Trả phòng
              </button>
              <button
                type="button"
                className="p-1.5 border border-slate-300 rounded hover:bg-slate-50 cursor-pointer"
              >
                <MoreVertical size={14} className="text-slate-500" />
              </button>
            </div>
          </div>

          {/* Khung nội dung chi tiết phòng */}
          <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-2xs space-y-4 text-xs font-sans">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("Bạn có chắc muốn đóng tab đơn này?")) {
                      handleCloseTab(activeTab);
                    }
                  }}
                  className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                >
                  <Trash2 size={15} />
                </button>
                <span className="font-bold text-slate-800 text-sm">
                  1.{" "}
                  {currentTabBookingData.room?.type_name ||
                    "Phòng 01 giường đơn"}
                </span>

                <select
                  value={currentTabBookingData.rental_type || "Ngày"}
                  onChange={(e) =>
                    setTabsData((prev) => ({
                      ...prev,
                      [activeTab]: {
                        ...prev[activeTab],
                        rental_type: e.target.value,
                      },
                    }))
                  }
                  className="border border-slate-300 rounded px-2 py-1 outline-none font-bold text-slate-800 bg-white cursor-pointer"
                >
                  <option value="Ngày">Ngày</option>
                  <option value="Giờ">Giờ</option>
                  <option value="Đêm">Đêm</option>
                </select>

                <Edit2 size={13} className="text-slate-400 cursor-pointer" />
              </div>
            </div>

            <div className="space-y-3 pt-1">
              <div className="flex items-center gap-3">
                <span className="w-16 font-semibold text-slate-600">
                  Phòng:
                </span>
                <select
                  value={currentTabBookingData.room?.room_number}
                  onChange={(e) => {
                    const found = rooms.find(
                      (r) => r.room_number === e.target.value,
                    );
                    if (found) {
                      setTabsData((prev) => ({
                        ...prev,
                        [activeTab]: { ...prev[activeTab], room: found },
                      }));
                    }
                  }}
                  className="border border-slate-300 rounded px-2.5 py-1 outline-none font-bold text-slate-800 bg-white cursor-pointer"
                >
                  {rooms.map((r) => (
                    <option key={r.id} value={r.room_number}>
                      {r.room_number}
                    </option>
                  ))}
                </select>
                <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[11px]">
                  Đang sử dụng
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="w-16 font-semibold text-slate-600">
                  Dự kiến:
                </span>
                <input
                  type="datetime-local"
                  value={currentTabBookingData.checkin_date}
                  onChange={(e) =>
                    setTabsData((prev) => ({
                      ...prev,
                      [activeTab]: {
                        ...prev[activeTab],
                        checkin_date: e.target.value,
                      },
                    }))
                  }
                  className="border border-slate-300 rounded px-2 py-1 outline-none font-semibold text-slate-800 bg-white cursor-pointer"
                />
                <span className="text-slate-500 font-bold">đến</span>
                <input
                  type="datetime-local"
                  value={currentTabBookingData.checkout_date}
                  onChange={(e) =>
                    setTabsData((prev) => ({
                      ...prev,
                      [activeTab]: {
                        ...prev[activeTab],
                        checkout_date: e.target.value,
                      },
                    }))
                  }
                  className="border border-slate-300 rounded px-2 py-1 outline-none font-semibold text-slate-800 bg-white cursor-pointer"
                />
                <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold">
                  {currentTabBookingData.duration_label || "1 ngày"}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="w-16 font-semibold text-slate-600">
                  Dùng đến hiện tại:
                </span>
                <span className="text-emerald-700 font-bold">
                  {currentTabBookingData.used_duration || "1 ngày"}
                </span>
              </div>
            </div>

            <div className="border-t pt-4 flex items-center justify-between font-bold text-slate-800">
              <span className="text-sm">
                {currentTabBookingData.room?.type_name} (
                {currentTabBookingData.rental_type || "Ngày"})
              </span>
              <div className="flex items-center gap-8">
                <span>1</span>
                <span className="border-b border-slate-300 pb-0.5 w-24 text-right">
                  {formatVND(currentTabBookingData.price)}
                </span>
                <span className="text-base text-[#1b6a38] font-black">
                  {formatVND(currentTabBookingData.price)} đ
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── 5. POPUP XEM NHANH PHÒNG CÓ KHÁCH (ẢNH NHỎ KHI BẤM PHÒNG XANH) ─── */}
      {activeOccupiedRoom && !isConfirmCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs animate-fadeIn">
          <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-black text-base text-slate-800">
                  {activeOccupiedRoom.room_number}
                </span>
                <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[11px]">
                  Đang sử dụng
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <button
                  type="button"
                  onClick={() => handleOpenEditBookingTab(activeOccupiedRoom)}
                  className="p-1 hover:text-blue-600 cursor-pointer text-slate-600"
                  title="Sửa phòng (Mở Tab mới)"
                >
                  <Edit2 size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveOccupiedRoom(null)}
                  className="p-1 hover:text-slate-600 text-base cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-700">
              <div className="font-bold text-slate-800 text-sm">
                {activeOccupiedRoom.type_name}
              </div>
              <div>
                Khách hàng:{" "}
                <b>{activeOccupiedRoom.booking?.customer_name || "Khách lẻ"}</b>
              </div>
              <div>
                Thời gian ở:{" "}
                <b className="text-amber-600">
                  {activeOccupiedRoom.booking?.stay_duration || "1 ngày"}
                </b>
              </div>
              <div className="flex justify-between border-t pt-2 font-bold">
                <span>Tiền phòng:</span>
                <span className="text-[#1b6a38] text-sm">
                  {formatVND(
                    activeOccupiedRoom.booking?.total_price ||
                      activeOccupiedRoom.daily_price,
                  )}{" "}
                  đ
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => alert("Tính năng đổi phòng đã sẵn sàng!")}
                className="py-2 border border-[#1b6a38] text-[#1b6a38] font-bold rounded-lg hover:bg-emerald-50 cursor-pointer text-center"
              >
                Đổi phòng
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmCheckoutDateTime(toDatetimeLocal(new Date()));
                  setIsConfirmCheckoutOpen(true);
                }}
                className="py-2 bg-[#0284c7] hover:bg-[#0369a1] text-white font-bold rounded-lg shadow-sm cursor-pointer text-center"
              >
                Trả phòng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 6. MODAL XÁC NHẬN TRẢ PHÒNG (ẢNH 5 & 6) ─── */}
      {isConfirmCheckoutOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-2xs animate-fadeIn">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-sm text-slate-800">
                Xác nhận trả phòng -{" "}
                {activeOccupiedRoom?.booking?.code ||
                  currentTabBookingData?.booking_code ||
                  "DP395886"}
              </h3>
              <button
                onClick={() => setIsConfirmCheckoutOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-base cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-2 font-bold text-slate-800">
                <User size={14} className="text-slate-500" />
                <span>
                  {activeOccupiedRoom?.booking?.customer_name ||
                    currentTabBookingData?.customer_name ||
                    "Khách lẻ"}
                </span>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#eef8f2] text-slate-700 border-b">
                      <th className="p-2.5 font-bold">Hạng phòng</th>
                      <th className="p-2.5 font-bold">Phòng</th>
                      <th className="p-2.5 font-bold">Nhận</th>
                      <th className="p-2.5 font-bold">
                        <div className="flex items-center gap-1">
                          <span>Trả</span>
                          <button
                            type="button"
                            onClick={() => {
                              setConfirmCheckoutMode("now");
                              setConfirmCheckoutDateTime(
                                toDatetimeLocal(new Date()),
                              );
                            }}
                            className={`px-1.5 py-0.2 rounded text-[10px] font-bold cursor-pointer ${
                              confirmCheckoutMode === "now"
                                ? "border border-[#1b6a38] text-[#1b6a38] bg-white"
                                : "border border-slate-300 text-slate-600"
                            }`}
                          >
                            Hiện tại
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setConfirmCheckoutMode("scheduled");
                              setConfirmCheckoutDateTime(
                                toDatetimeLocal(
                                  new Date(Date.now() + 86400000),
                                ),
                              );
                            }}
                            className={`px-1.5 py-0.2 rounded text-[10px] font-bold cursor-pointer ${
                              confirmCheckoutMode === "scheduled"
                                ? "border border-[#1b6a38] text-[#1b6a38] bg-white"
                                : "border border-slate-300 text-slate-600"
                            }`}
                          >
                            Giờ đặt
                          </button>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-2.5 font-semibold text-slate-800">
                        {activeOccupiedRoom?.type_name ||
                          currentTabBookingData?.room?.type_name}
                      </td>
                      <td className="p-2.5 font-bold text-emerald-700">
                        {activeOccupiedRoom?.room_number ||
                          currentTabBookingData?.room?.room_number}
                      </td>
                      <td className="p-2.5 text-slate-600">10 Thg8, 14:00</td>
                      <td className="p-2.5">
                        <input
                          type="datetime-local"
                          value={confirmCheckoutDateTime}
                          onChange={(e) =>
                            setConfirmCheckoutDateTime(e.target.value)
                          }
                          className="border border-slate-300 rounded px-1.5 py-0.5 outline-none text-xs font-bold text-slate-800 bg-white cursor-pointer"
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border font-bold">
                <span>Tổng tiền thanh toán:</span>
                <span className="text-[#1b6a38] text-base">
                  {formatVND(
                    activeOccupiedRoom?.daily_price ||
                      currentTabBookingData?.price ||
                      600000,
                  )}{" "}
                  đ
                </span>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() =>
                  handleCompleteCheckOut(currentTabBookingData?.booking_code)
                }
                className="w-full py-2.5 bg-[#1b6a38] hover:bg-[#14532d] text-white font-bold rounded-lg shadow-sm cursor-pointer text-center text-sm"
              >
                Trả phòng và thanh toán
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 7. MODAL THÊM KHÁCH HÀNG (ẢNH 5 ĐỦ 2 CỘT) ─── */}
      {isAddCustomerOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 bg-black/60 backdrop-blur-2xs animate-fadeIn">
          <div className="bg-white rounded-lg w-full max-w-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-800">
                Thêm mới khách hàng
              </h3>
              <button
                onClick={() => setIsAddCustomerOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer text-base leading-none"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!customerForm.name.trim()) return;

                setTabsData((prev) => ({
                  ...prev,
                  [activeTab]: {
                    ...(prev[activeTab] || {}),
                    customer_name: customerForm.name.trim(),
                    customer_phone: customerForm.phone.trim(),
                  },
                }));

                setIsAddCustomerOpen(false);
                setCustomerForm(initialCustomerForm);
              }}
              className="p-5 space-y-4 text-xs font-sans"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3.5">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <label className="w-28 text-slate-600 font-medium">
                      Mã khách hàng
                    </label>
                    <input
                      disabled
                      placeholder="Mã tự động"
                      className="flex-1 p-1.5 border border-slate-300 rounded bg-slate-50 text-slate-500 outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="w-28 text-slate-700 font-bold">
                      Tên khách hàng <b className="text-rose-500">*</b>
                    </label>
                    <input
                      required
                      value={customerForm.name}
                      onChange={(e) =>
                        setCustomerForm({
                          ...customerForm,
                          name: e.target.value,
                        })
                      }
                      className="flex-1 p-1.5 border border-slate-300 rounded outline-none font-semibold text-slate-800 focus:border-[#1b6a38]"
                      placeholder="Nhập tên khách hàng"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="w-28 text-slate-600 font-medium">
                      Điện thoại
                    </label>
                    <input
                      value={customerForm.phone}
                      onChange={(e) =>
                        setCustomerForm({
                          ...customerForm,
                          phone: e.target.value,
                        })
                      }
                      placeholder="0912345678"
                      className="flex-1 p-1.5 border border-slate-300 rounded outline-none focus:border-[#1b6a38]"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <label className="w-28 text-slate-600 font-medium">
                      Loại khách
                    </label>
                    <div className="flex items-center gap-4 font-semibold text-slate-700">
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="radio"
                          checked
                          readOnly
                          className="accent-[#1b6a38]"
                        />
                        <span>Cá nhân</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="w-28 text-slate-600 font-medium">
                      Địa chỉ
                    </label>
                    <input
                      value={customerForm.address}
                      onChange={(e) =>
                        setCustomerForm({
                          ...customerForm,
                          address: e.target.value,
                        })
                      }
                      className="flex-1 p-1.5 border border-slate-300 rounded outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsAddCustomerOpen(false)}
                  className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded cursor-pointer"
                >
                  Bỏ qua
                </button>
                <button
                  type="submit"
                  className="px-5 py-1.5 bg-[#1b6a38] hover:bg-[#14532d] text-white font-bold rounded cursor-pointer shadow-xs"
                >
                  Lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
