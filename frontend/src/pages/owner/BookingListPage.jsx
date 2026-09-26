// src/pages/owner/BookingListPage.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Clock,
  Key,
  LogOut,
  X,
  Plus,
  ArrowUpDown,
  MoreHorizontal,
  Download,
  Upload,
  Calendar as CalendarIcon,
  ChevronDown,
  User,
  SlidersHorizontal,
  QrCode,
  DoorOpen,
  Info,
  Building2,
} from "lucide-react";
import { LoadingSpinner, EmptyState } from "@/components/common";
import apiClient from "@/services/apiClient";
import QuickBookingModal from "../reception/components/QuickBookingModal";
import ConfirmCheckInModal from "../reception/components/ConfirmCheckInModal";

// 🌟 HÀM TÍNH TOÁN TIỀN PHÒNG & TIỀN CỌC 30% CHUẨN XÁC CHỐNG THẤT THOÁT
const resolveBookingPaymentDetails = (b) => {
  const totalPrice = Number(b?.total_price || 0);
  const isWalkIn =
    String(b?.booking_code || "").startsWith("DP") ||
    b?.booking_type === "walk_in" ||
    b?.source === "counter";

  let isDeposit = false;
  let paidAmount = 0;

  if (isWalkIn) {
    if (b?.payment_status === "paid") {
      paidAmount = totalPrice;
    } else {
      paidAmount = Number(
        b?.customer_paid ?? b?.paid_amount ?? b?.deposit_amount ?? 0,
      );
    }
  } else {
    // Đơn đặt online qua GoStay
    const depAmt = Number(b?.deposit_amount || 0);
    const pdAmt = Number(b?.paid_amount || 0);

    isDeposit =
      b?.payment_type === "DEPOSIT_30" ||
      b?.is_deposit === true ||
      (depAmt > 0 && depAmt < totalPrice) ||
      (pdAmt > 0 && pdAmt < totalPrice);

    if (isDeposit) {
      paidAmount =
        depAmt > 0 ? depAmt : pdAmt > 0 ? pdAmt : Math.round(totalPrice * 0.3);
    } else if (b?.payment_status === "paid") {
      paidAmount = totalPrice;
    } else if (pdAmt > 0) {
      paidAmount = pdAmt;
    } else {
      paidAmount = 0;
    }
  }

  const remainingAmount = Math.max(0, totalPrice - paidAmount);
  return { totalPrice, paidAmount, remainingAmount, isDeposit, isWalkIn };
};

export default function BookingListPage() {
  const [bookings, setBookings] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [selectedHotelId, setSelectedHotelId] = useState("");
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [apiError, setApiError] = useState("");
  const [pageSize, setPageSize] = useState(20);

  // Dropdown thao tác 3 chấm
  const [activeMenuId, setActiveMenuId] = useState(null);

  // Modal Đặt phòng nhanh (+ Đặt phòng)
  const [isQuickBookingOpen, setIsQuickBookingOpen] = useState(false);
  const [quickBookingData, setQuickBookingData] = useState({
    customer_name: "",
    customer_phone: "",
    guest_count: { adult: 2, children: 1, cards: 0 },
    rooms: [],
    note: "",
    customer_paid: 0,
  });

  // Modal Check-in
  const [confirmCheckInRoom, setConfirmCheckInRoom] = useState(null);
  const [confirmCheckInData, setConfirmCheckInData] = useState({
    checkin_mode: "Giờ đặt",
    checkin_time: "",
    checkout_time: "",
    duration_label: "1 giờ",
  });
  const [checkInGuestCount, setCheckInGuestCount] = useState({
    adult: 1,
    children: 0,
  });
  const [checkInGuestList, setCheckInGuestList] = useState([]);

  const formatNumber = (num) => Number(num || 0).toLocaleString("vi-VN");

  const formatPMSDateTime = (dateVal, timeVal) => {
    if (!dateVal) return "---";
    const dateStr = String(dateVal).slice(0, 10);
    const parts = dateStr.split("-");
    if (parts.length < 3) return String(dateVal);
    const [y, m, d] = parts;
    let t = "14:00";
    if (timeVal) {
      t = String(timeVal).slice(0, 5);
    } else if (String(dateVal).includes("T")) {
      t = String(dateVal).split("T")[1].slice(0, 5);
    }
    return `${d} Thg ${m}, ${t}`;
  };

  const formatCreationTime = (isoStr) => {
    if (!isoStr) return "";
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return "";
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, "0");
    const mins = String(d.getMinutes()).padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${mins}`;
  };

  const fetchMyHotels = useCallback(async () => {
    try {
      const res = await apiClient.get("/hotels/my-hotels?active_only=true");
      const list = res?.data || res?.hotels || res || [];
      const hotelArr = Array.isArray(list) ? list : [];
      setHotels(hotelArr);
      if (hotelArr.length > 0) {
        setSelectedHotelId(String(hotelArr[0].id));
      }
    } catch (err) {
      console.error("Lỗi lấy khách sạn:", err);
    }
  }, []);

  const fetchOwnerBookings = useCallback(async () => {
    setLoading(true);
    setApiError("");
    try {
      const url = selectedHotelId
        ? `/owner/bookings?hotel_id=${selectedHotelId}&_t=${Date.now()}`
        : `/owner/bookings?_t=${Date.now()}`;
      const res = await apiClient.get(url);
      const list = res?.data || res?.bookings || res || [];
      setBookings(Array.isArray(list) ? list : []);
    } catch (err) {
      setApiError(
        err.message || "Không thể kết nối đến dữ liệu đơn đặt phòng.",
      );
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, [selectedHotelId]);

  const fetchRooms = useCallback(async () => {
    if (!selectedHotelId) return;
    try {
      const rRes = await apiClient.get(
        `/owner/room-map?hotel_id=${selectedHotelId}&_t=${Date.now()}`,
      );
      const rList = rRes?.data?.rooms || rRes?.rooms || [];
      setRooms(Array.isArray(rList) ? rList : []);
    } catch (e) {
      console.warn("Chưa lấy được danh sách phòng:", e.message);
    }
  }, [selectedHotelId]);

  useEffect(() => {
    fetchMyHotels();
  }, [fetchMyHotels]);

  useEffect(() => {
    if (selectedHotelId) {
      fetchOwnerBookings();
      fetchRooms();
    }
  }, [selectedHotelId, fetchOwnerBookings, fetchRooms]);

  useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  const counts = useMemo(() => {
    const now = new Date();
    return {
      pending: bookings.filter((b) => b.status === "pending").length,
      checked_out: bookings.filter((b) => b.status === "checked_out").length,
      confirmed: bookings.filter((b) => b.status === "confirmed").length,
      incoming_soon: bookings.filter((b) => b.status === "confirmed").length,
      occupied: bookings.filter((b) => b.status === "checked_in").length,
      checkout_soon: bookings.filter((b) => b.status === "checked_in").length,
      overdue: bookings.filter((b) => {
        if (b.status !== "checked_in") return false;
        const outDate = String(b.checkout_date).slice(0, 10);
        const outTime = String(b.checkout_time || "12:00").slice(0, 5);
        return new Date(`${outDate}T${outTime}:00`) < now;
      }).length,
      invoice_waiting: bookings.filter((b) => b.status === "checked_out")
        .length,
    };
  }, [bookings]);

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (activeTab === "pending" && b.status !== "pending") return false;
      if (activeTab === "checked_out" && b.status !== "checked_out")
        return false;
      if (activeTab === "confirmed" && b.status !== "confirmed") return false;
      if (activeTab === "incoming_soon" && b.status !== "confirmed")
        return false;
      if (activeTab === "occupied" && b.status !== "checked_in") return false;

      if (search.trim()) {
        const q = search.toLowerCase().trim();
        return (
          b.booking_code?.toLowerCase().includes(q) ||
          b.customer_name?.toLowerCase().includes(q) ||
          b.guest_phone?.includes(q) ||
          b.room_number?.toLowerCase().includes(q) ||
          b.room_name?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [bookings, activeTab, search]);

  const handleOpenCheckIn = (booking) => {
    const inDate = String(booking.checkin_date || "").slice(0, 10);
    const outDate = String(booking.checkout_date || inDate).slice(0, 10);
    const inTime = String(booking.checkin_time || "14:00").slice(0, 5);
    const outTime = String(booking.checkout_time || "12:00").slice(0, 5);

    const diffMs = Math.max(
      0,
      new Date(`${outDate}T${outTime}:00`) - new Date(`${inDate}T${inTime}:00`),
    );
    const hours = Math.max(1, Math.round(diffMs / 36e5));
    const durationLabel =
      booking.rental_type === "HOUR" ? `${hours} giờ` : "1 đêm";

    setConfirmCheckInRoom({
      room_number: booking.room_number || "111",
      type_name: booking.room_name || "DELUXE",
      daily_price: booking.total_price,
      booking: booking,
    });

    setConfirmCheckInData({
      checkin_mode: "Giờ đặt",
      checkin_time: `${inDate}T${inTime}`,
      checkout_time: `${outDate}T${outTime}`,
      duration_label: durationLabel,
    });

    setCheckInGuestCount({
      adult: Number(booking.adult_total || 2),
      children: Number(booking.children_total || 1),
    });
  };

  const handleFinalExecuteCheckIn = async () => {
    if (!confirmCheckInRoom?.booking?.id) return;
    const b = confirmCheckInRoom.booking;

    try {
      await apiClient.post(`/owner/bookings/${b.id}/checkin`, {
        room_number: confirmCheckInRoom.room_number,
        checkin_date: confirmCheckInData.checkin_time,
        checkout_date: confirmCheckInData.checkout_time,
        adult_total: checkInGuestCount.adult,
        children_total: checkInGuestCount.children,
        collected_at_counter: 0,
      });

      alert(`✓ Đã nhận phòng ${confirmCheckInRoom.room_number} thành công!`);
      setConfirmCheckInRoom(null);
      fetchOwnerBookings();
    } catch (err) {
      alert("Lỗi nhận phòng: " + (err.response?.data?.message || err.message));
    }
  };

  const handleOpenQuickBooking = () => {
    const targetRoom = rooms[0] || {
      id: "room_default",
      room_number: "111",
      type_name: "DELUXE",
      base_price: 100000,
      hourly_price: 100000,
      hotel_id: selectedHotelId,
    };

    const now = new Date();
    const start = new Date(now);
    const end = new Date(start);
    end.setHours(end.getHours() + 1);

    const pad = (n) => String(n).padStart(2, "0");
    const toISO = (d) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

    setQuickBookingData({
      customer_name: "",
      customer_phone: "",
      guest_count: { adult: 2, children: 1, cards: 0 },
      rooms: [
        {
          room_id: targetRoom.id,
          hotel_id: targetRoom.hotel_id || selectedHotelId,
          room_number: targetRoom.room_number,
          type_name: targetRoom.type_name,
          rental_type: "Giờ",
          checkin_mode: "Hiện tại",
          checkin_date: toISO(start),
          checkout_date: toISO(end),
          duration_label: "1 giờ",
          price: Number(targetRoom.hourly_price || 100000),
        },
      ],
      note: "",
      customer_paid: 0,
    });

    setIsQuickBookingOpen(true);
  };

  const handleConfirmQuickBooking = async (isCheckInNow) => {
    if (quickBookingData.rooms.length === 0)
      return alert("Vui lòng chọn phòng!");
    try {
      const activeHotelId =
        selectedHotelId || hotels[0]?.id || rooms[0]?.hotel_id;

      for (const item of quickBookingData.rooms) {
        await apiClient.post("/owner/bookings/walkin", {
          hotel_id: activeHotelId,
          room_id: item.room_id,
          room_number: item.room_number,
          customer_name: quickBookingData.customer_name.trim() || "Khách lẻ",
          guest_phone: quickBookingData.customer_phone.trim(),
          total_price: item.price,
          customer_paid: Number(quickBookingData.customer_paid || 0),
          checkin_date: item.checkin_date,
          checkout_date: item.checkout_date,
          rental_type: item.rental_type,
          is_check_in_now: isCheckInNow,
          adult_total: quickBookingData.adult_total || 2,
          children_total: quickBookingData.children_total || 1,
        });
      }

      alert(
        isCheckInNow ? "✓ Nhận phòng thành công!" : "✓ Đã lưu đơn đặt trước!",
      );
      setIsQuickBookingOpen(false);
      await fetchOwnerBookings();
    } catch (err) {
      alert("Lỗi đặt phòng: " + (err.response?.data?.message || err.message));
    }
  };

  // 🌟 XUẤT EXCEL CHUẨN XÁC: Tính đúng tiền cọc và tiền còn nợ
  const handleExportExcel = () => {
    if (filteredBookings.length === 0)
      return alert("Không có dữ liệu để xuất!");
    let csv =
      "STT,Ma Dat Phong,Khach Hang,SDT,Phong,Hang Phong,Gio Nhan,Gio Tra,Thoi Gian,Tong Cong,Khach Da Tra,Con Lai\n";
    filteredBookings.forEach((b, idx) => {
      const { totalPrice, paidAmount, remainingAmount } =
        resolveBookingPaymentDetails(b);

      csv += `${idx + 1},"${b.booking_code}","${b.customer_name || ""}","${b.guest_phone || ""}","${b.room_number || ""}","${b.room_name || ""}","${b.checkin_date} ${b.checkin_time}","${b.checkout_date} ${b.checkout_time}","${b.rental_type}",${totalPrice},${paidAmount},${remainingAmount}\n`;
    });

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Danh_Sach_Dat_Phong_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  return (
    <div className="w-full pb-20 bg-[#f4f6f8] font-sans text-gray-900 min-h-screen p-3 sm:p-5 space-y-3">
      {/* TOOLBAR TÌM KIẾM & CHỌN CƠ SỞ */}
      <div className="bg-white p-3.5 rounded-3xl border border-gray-200 shadow-2xs flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-[300px]">
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="px-3.5 py-1.5 bg-[#003580] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <span>📰 Danh Sách</span>
            </button>
            <div className="flex items-center border border-gray-200 rounded-xl p-1 bg-white text-gray-500">
              <button type="button" className="p-1 hover:text-gray-900">
                ☰
              </button>
              <button type="button" className="p-1 hover:text-gray-900">
                ▦
              </button>
            </div>
          </div>

          <div className="flex items-center border border-gray-200 rounded-xl px-3 py-1.5 bg-white focus-within:border-[#003580] shadow-2xs flex-1 max-w-md">
            <Search size={15} className="text-gray-400 mr-2 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm khách hàng, mã đặt phòng,..."
              className="w-full outline-none text-xs text-gray-900 bg-transparent placeholder:text-gray-400 font-medium"
            />
            <button
              type="button"
              className="p-0.5 text-gray-400 hover:text-gray-600"
            >
              <SlidersHorizontal size={14} />
            </button>
            <button
              type="button"
              className="p-0.5 text-gray-400 hover:text-gray-600 ml-1"
            >
              <QrCode size={14} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {hotels.length > 1 && (
            <div className="flex items-center border border-gray-200 rounded-xl px-3 py-1.5 bg-white text-xs font-bold text-[#003580] shadow-2xs">
              <Building2 size={14} className="mr-1.5 text-[#003580]" />
              <select
                value={selectedHotelId}
                onChange={(e) => setSelectedHotelId(e.target.value)}
                className="bg-transparent outline-none cursor-pointer"
              >
                {hotels.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center border border-gray-200 rounded-xl px-3 py-1.5 bg-white text-xs text-gray-700 font-semibold cursor-pointer shadow-2xs">
            <span>Thời gian lưu trú</span>
            <ChevronDown size={14} className="ml-1 text-gray-400" />
          </div>

          <button
            type="button"
            onClick={handleOpenQuickBooking}
            className="px-4 py-2 bg-[#003580] hover:bg-blue-900 text-white font-black text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition active:scale-95"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>Đặt phòng</span>
          </button>
        </div>
      </div>

      {/* TABS LỌC TRẠNG THÁI */}
      <div className="bg-white p-2.5 rounded-2xl border border-gray-200 shadow-2xs flex items-center justify-between gap-2 overflow-x-auto text-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { id: "all", label: `● Tất cả (${bookings.length})` },
            {
              id: "pending",
              label: `● Chờ xác nhận${counts.pending ? ` (${counts.pending})` : ""}`,
            },
            {
              id: "checked_out",
              label: `● Đã trả${counts.checked_out ? ` (${counts.checked_out})` : ""}`,
            },
            {
              id: "confirmed",
              label: `● Đã đặt trước${counts.confirmed ? ` (${counts.confirmed})` : ""}`,
            },
            {
              id: "incoming_soon",
              label: `● Sắp nhận${counts.incoming_soon ? ` (${counts.incoming_soon})` : ""}`,
            },
            {
              id: "occupied",
              label: `● Đang sử dụng${counts.occupied ? ` (${counts.occupied})` : ""}`,
            },
            {
              id: "checkout_soon",
              label: `● Sắp trả${counts.checkout_soon ? ` (${counts.checkout_soon})` : ""}`,
            },
            {
              id: "overdue",
              label: `● Quá giờ trả${counts.overdue ? ` (${counts.overdue})` : ""}`,
            },
            {
              id: "invoice_waiting",
              label: `● Chờ tạo hóa đơn${counts.invoice_waiting ? ` (${counts.invoice_waiting})` : ""}`,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-blue-50 text-[#003580] font-black border border-blue-300 shadow-2xs"
                  : "text-gray-600 hover:bg-gray-100 border border-transparent"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={fetchOwnerBookings}
          className="flex items-center gap-1 px-3 py-1 text-gray-600 hover:text-gray-900 font-bold text-xs rounded-xl hover:bg-gray-100 transition cursor-pointer shrink-0"
        >
          <RefreshCw
            size={13}
            className={loading ? "animate-spin text-[#003580]" : ""}
          />
          <span>Đồng bộ</span>
        </button>
      </div>

      {apiError && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl flex items-center gap-2 font-bold">
          <AlertCircle size={15} /> <span>{apiError}</span>
        </div>
      )}

      {/* BẢNG DANH SÁCH ĐƠN PHÒNG */}
      <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-blue-50/70 text-gray-800 border-b border-blue-100 font-bold whitespace-nowrap uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3 text-center w-12">STT</th>
                <th className="py-3 px-4">Mã đặt phòng</th>
                <th className="py-3 px-4">Kênh bán</th>
                <th className="py-3 px-4">Thông tin khách</th>
                <th className="py-3 px-3">
                  <div className="flex items-center gap-1 cursor-pointer">
                    <span>Giờ nhận</span>
                    <ArrowUpDown size={12} className="text-gray-400" />
                  </div>
                </th>
                <th className="py-3 px-3">
                  <div className="flex items-center gap-1 cursor-pointer">
                    <span>Giờ trả</span>
                    <ArrowUpDown size={12} className="text-gray-400" />
                  </div>
                </th>
                <th className="py-3 px-3">Lưu trú</th>
                <th className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <span>Giá tiền</span>
                    <Info size={12} className="text-gray-400" />
                  </div>
                </th>
                <th className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <span>Tổng cộng</span>
                    <Info size={12} className="text-gray-400" />
                  </div>
                </th>
                <th className="py-3 px-4 text-right">Khách đã trả</th>
                <th className="py-3 px-4 text-right text-rose-600">
                  Còn cần trả
                </th>
                <th className="py-3 px-4 text-center w-32">Thao tác</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={12} className="py-20 text-center">
                    <LoadingSpinner
                      size="md"
                      label="Đang tải danh sách đặt phòng..."
                    />
                  </td>
                </tr>
              ) : filteredBookings.length === 0 ? (
                <tr>
                  <td
                    colSpan={12}
                    className="py-16 text-center text-gray-400 italic"
                  >
                    Không tìm thấy đơn đặt phòng nào phù hợp. Bấm{" "}
                    <b>+ Đặt phòng</b> ở góc trên để tạo đơn mới!
                  </td>
                </tr>
              ) : (
                filteredBookings.map((b, idx) => {
                  // 🌟 TÍNH TOÁN TIỀN PHÒNG CHUẨN XÁC CHỐNG THẤT THOÁT
                  const {
                    totalPrice,
                    paidAmount,
                    remainingAmount,
                    isDeposit,
                    isWalkIn,
                  } = resolveBookingPaymentDetails(b);

                  const isHourly =
                    b.rental_type === "HOUR" || b.rental_type === "Giờ";
                  const durationText = isHourly
                    ? `${b.stay_duration || 1} giờ`
                    : "1 đêm";
                  const unitLabel = isHourly ? "/giờ" : "/đêm";

                  return (
                    <tr
                      key={b.id || idx}
                      className="hover:bg-blue-50/30 transition"
                    >
                      {/* 1. STT */}
                      <td className="py-3.5 px-3 text-center text-gray-500 font-semibold">
                        {idx + 1}
                      </td>

                      {/* 2. MÃ ĐẶT PHÒNG */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-bold text-[#003580] text-xs block cursor-pointer hover:underline font-mono">
                          {b.booking_code || `DP00000${idx + 9}`}
                        </span>
                        <span className="text-[11px] text-gray-400 font-normal block mt-0.5">
                          {formatCreationTime(b.created_at || new Date())}
                        </span>
                        <span className="text-[11px] text-gray-500 font-medium block mt-0.5">
                          {b.quantity || 1} phòng
                        </span>
                      </td>

                      {/* 3. KÊNH BÁN */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-gray-800 font-medium text-xs">
                          <span>{isWalkIn ? "🚶" : "🌐"}</span>
                          <span>
                            {isWalkIn
                              ? "Khách đến trực tiếp"
                              : "Khách đặt online"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="px-2 py-0.5 bg-[#f57c00] text-white font-black text-[10px] rounded">
                            {b.room_number || "111"}
                          </span>
                          <span className="text-gray-600 font-bold text-[11px]">
                            {b.room_name || "DELUXE"}
                          </span>
                        </div>
                      </td>

                      {/* 4. THÔNG TIN KHÁCH */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <strong className="text-[#003580] font-bold text-xs block">
                          {b.customer_name || "Khách hàng"}
                        </strong>
                        <span className="text-gray-500 text-[11px] block mt-0.5 font-normal">
                          {b.adult_total || 2} người lớn,{" "}
                          {b.children_total || 0} trẻ em
                        </span>
                      </td>

                      {/* 5. GIỜ NHẬN */}
                      <td className="py-3.5 px-3 whitespace-nowrap text-gray-800 text-xs">
                        {formatPMSDateTime(b.checkin_date, b.checkin_time)}
                      </td>

                      {/* 6. GIỜ TRẢ */}
                      <td className="py-3.5 px-3 whitespace-nowrap text-gray-800 text-xs">
                        {formatPMSDateTime(b.checkout_date, b.checkout_time)}
                      </td>

                      {/* 7. LƯU TRÚ */}
                      <td className="py-3.5 px-3 whitespace-nowrap font-medium text-gray-700">
                        {durationText}
                      </td>

                      {/* 8. GIÁ TIỀN */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <span className="font-bold text-gray-900 block tabular-nums">
                          {formatNumber(totalPrice)}
                        </span>
                        <span className="text-gray-400 text-[10px] block">
                          {unitLabel}
                        </span>
                      </td>

                      {/* 9. TỔNG CỘNG */}
                      <td className="py-3.5 px-4 text-right font-black text-gray-900 tabular-nums whitespace-nowrap">
                        {formatNumber(totalPrice)}
                      </td>

                      {/* 10. KHÁCH ĐÃ TRẢ (HIỂN THỊ ĐÚNG SỐ TIỀN THỰC TẾ) */}
                      <td className="py-3.5 px-4 text-right font-bold text-gray-700 tabular-nums whitespace-nowrap">
                        <span
                          className={
                            isDeposit
                              ? "text-emerald-700 font-black"
                              : "text-gray-900"
                          }
                        >
                          {formatNumber(paidAmount)}
                        </span>
                        {isDeposit && (
                          <span className="text-[10px] text-emerald-600 block font-normal">
                            (Cọc 30%)
                          </span>
                        )}
                      </td>

                      {/* 11. CÒN CẦN TRẢ (BÁO ĐỎ CHÍNH XÁC KHOẢN TIỀN CÒN THIẾU CẦN THU) */}
                      <td className="py-3.5 px-4 text-right font-black tabular-nums whitespace-nowrap">
                        {remainingAmount === 0 ? (
                          <span className="text-gray-400 font-bold">0</span>
                        ) : (
                          <div className="space-y-0.5">
                            <span className="text-rose-600 text-xs block">
                              {formatNumber(remainingAmount)}
                            </span>
                            <span className="text-[10px] text-rose-500 font-medium block">
                              (Thu tại quầy)
                            </span>
                          </div>
                        )}
                      </td>

                      {/* 12. THAO TÁC */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5 relative">
                          {b.status === "confirmed" ||
                          b.status === "pending" ? (
                            <button
                              type="button"
                              onClick={() => handleOpenCheckIn(b)}
                              className="px-3.5 py-1.5 bg-[#003580] hover:bg-blue-900 text-white font-bold rounded-xl text-xs cursor-pointer transition shadow-2xs active:scale-95"
                            >
                              Nhận phòng
                            </button>
                          ) : b.status === "checked_in" ? (
                            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl font-bold text-[11px]">
                              Đang ở
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-xl font-bold text-[11px]">
                              Đã trả
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(
                                activeMenuId === b.id ? null : b.id,
                              );
                            }}
                            className="p-1 border border-gray-200 hover:bg-gray-100 rounded-xl text-gray-600 cursor-pointer"
                          >
                            <MoreHorizontal size={15} />
                          </button>

                          {activeMenuId === b.id && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="absolute right-0 top-8 z-30 bg-white border border-gray-200 rounded-2xl shadow-xl py-1 w-36 text-xs text-left divide-y divide-gray-100 animate-fadeIn"
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  alert(`Chi tiết đơn #${b.booking_code}`);
                                  setActiveMenuId(null);
                                }}
                                className="w-full px-3.5 py-2 hover:bg-blue-50 text-gray-700 font-medium cursor-pointer"
                              >
                                Xem chi tiết
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  alert(`In hóa đơn đơn #${b.booking_code}`);
                                  setActiveMenuId(null);
                                }}
                                className="w-full px-3.5 py-2 hover:bg-blue-50 text-gray-700 font-medium cursor-pointer"
                              >
                                In hóa đơn
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PHÂN TRANG VÀ XUẤT EXCEL */}
        <div className="px-4 py-3 bg-white border-t border-gray-100 flex items-center justify-between gap-4 flex-wrap text-xs">
          <div className="flex items-center gap-2 text-gray-600">
            <span>Hiển thị</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="border border-gray-200 rounded-xl px-2.5 py-1 bg-white outline-none cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <span>
              trên tổng số <b>{filteredBookings.length}</b> đặt phòng
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => alert("Chức năng Import file Excel")}
              className="px-3.5 py-1.5 border border-[#003580] text-[#003580] font-bold rounded-xl hover:bg-blue-50 cursor-pointer transition shadow-2xs"
            >
              Import
            </button>
            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3.5 py-1.5 border border-[#003580] text-[#003580] font-bold rounded-xl hover:bg-blue-50 cursor-pointer transition shadow-2xs"
            >
              Xuất file Excel
            </button>
          </div>
        </div>
      </div>

      {/* MODAL ĐẶT PHÒNG NHANH */}
      <QuickBookingModal
        isOpen={isQuickBookingOpen}
        onClose={() => setIsQuickBookingOpen(false)}
        rooms={rooms}
        bookingData={quickBookingData}
        setBookingData={setQuickBookingData}
        onConfirmBooking={handleConfirmQuickBooking}
        formatVND={(num) => Number(num || 0).toLocaleString("vi-VN") + " ₫"}
      />

      {/* MODAL XÁC NHẬN NHẬN PHÒNG */}
      {confirmCheckInRoom && (
        <ConfirmCheckInModal
          isOpen={Boolean(confirmCheckInRoom)}
          onClose={() => setConfirmCheckInRoom(null)}
          room={confirmCheckInRoom}
          confirmData={confirmCheckInData}
          setConfirmData={setConfirmCheckInData}
          onOpenGuestStay={() => {}}
          onFinalExecuteCheckIn={handleFinalExecuteCheckIn}
          guestCount={checkInGuestCount}
          guestList={checkInGuestList}
        />
      )}
    </div>
  );
}
