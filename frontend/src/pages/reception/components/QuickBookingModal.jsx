// src/pages/reception/components/QuickBookingModal.jsx
import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Search,
  Plus,
  Minus,
  QrCode,
  Users,
  Trash2,
  PlusCircle,
  X,
  Calendar,
  Clock,
  Info,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  User,
  Camera,
  RotateCw,
  Edit2,
  Scan,
  CheckCircle2,
} from "lucide-react";

// Hàm chuẩn hóa ngày giờ an toàn tuyệt đối
const toStandardISO = (dateVal, timeVal, defaultHour = 14, defaultMin = 0) => {
  const pad = (n) => String(n).padStart(2, "0");

  if (!dateVal) {
    const now = new Date();
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(defaultHour)}:${pad(defaultMin)}`;
  }

  let y, m, d;
  let h = defaultHour;
  let min = defaultMin;

  if (dateVal instanceof Date && !isNaN(dateVal.getTime())) {
    y = dateVal.getFullYear();
    m = dateVal.getMonth() + 1;
    d = dateVal.getDate();
    h = dateVal.getHours();
    min = dateVal.getMinutes();
  } else {
    const s = String(dateVal).trim();
    const ymdMatch = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (ymdMatch) {
      y = Number(ymdMatch[1]);
      m = Number(ymdMatch[2]);
      d = Number(ymdMatch[3]);
    } else {
      const parsed = new Date(s);
      if (!isNaN(parsed.getTime())) {
        y = parsed.getFullYear();
        m = parsed.getMonth() + 1;
        d = parsed.getDate();
        h = parsed.getHours();
        min = parsed.getMinutes();
      } else {
        const now = new Date();
        y = now.getFullYear();
        m = now.getMonth() + 1;
        d = now.getDate();
      }
    }

    if (String(dateVal).includes("T")) {
      const tm = String(dateVal)
        .split("T")[1]
        .match(/(\d{1,2}):(\d{1,2})/);
      if (tm) {
        h = Number(tm[1]);
        min = Number(tm[2]);
      }
    }
  }

  if (timeVal) {
    const tm = String(timeVal).match(/(\d{1,2}):(\d{1,2})/);
    if (tm) {
      h = Number(tm[1]);
      min = Number(tm[2]);
    }
  }

  return `${y}-${pad(m)}-${pad(d)}T${pad(h)}:${pad(min)}`;
};

function EasyDateTimePicker({ value, onChange, hasWarning }) {
  const dateInputRef = useRef(null);
  const timeInputRef = useRef(null);

  const rawIso = value ? String(value) : "";
  let datePart = "";
  let timePart = "14:00";

  if (rawIso.includes("T")) {
    const [d, t] = rawIso.split("T");
    datePart = d.slice(0, 10);
    timePart = t.slice(0, 5);
  } else if (rawIso) {
    datePart = rawIso.slice(0, 10);
  }

  const displayDateText = useMemo(() => {
    if (!datePart) return "--/--";
    const parts = datePart.split("-");
    if (parts.length === 3) {
      return `${parts[2]} Thg ${parts[1]}`;
    }
    return datePart;
  }, [datePart]);

  const handleDateChange = (newDate) => {
    if (!newDate) return;
    onChange(`${newDate}T${timePart || "14:00"}`);
  };

  const handleTimeChange = (newTime) => {
    if (!newTime) return;
    onChange(`${datePart || new Date().toISOString().slice(0, 10)}T${newTime}`);
  };

  const triggerDatePicker = () => {
    if (dateInputRef.current) {
      if (typeof dateInputRef.current.showPicker === "function") {
        dateInputRef.current.showPicker();
      } else {
        dateInputRef.current.focus();
      }
    }
  };

  const triggerTimePicker = () => {
    if (timeInputRef.current) {
      if (typeof timeInputRef.current.showPicker === "function") {
        timeInputRef.current.showPicker();
      } else {
        timeInputRef.current.focus();
      }
    }
  };

  return (
    <div
      className={`flex items-center gap-1.5 p-1 rounded-xl bg-white transition border ${
        hasWarning
          ? "border-amber-400 bg-amber-50/30"
          : "border-gray-200 hover:border-[#003580] shadow-2xs"
      }`}
    >
      <div
        onClick={triggerDatePicker}
        className={`relative flex items-center gap-1.5 px-2 py-1.5 rounded-lg font-bold cursor-pointer transition select-none flex-1 justify-center ${
          hasWarning
            ? "bg-amber-100/60 text-amber-900 hover:bg-amber-100"
            : "bg-blue-50/50 hover:bg-blue-100/70 text-[#003580]"
        }`}
        title="Bấm để chọn Ngày"
      >
        <Calendar size={13} className="shrink-0" />
        <span className="text-xs whitespace-nowrap">{displayDateText}</span>

        <input
          ref={dateInputRef}
          type="date"
          value={datePart}
          onChange={(e) => handleDateChange(e.target.value)}
          className="absolute inset-0 opacity-0 pointer-events-none w-full h-full"
        />
      </div>

      <span className="text-gray-300 font-normal">|</span>

      <div
        onClick={triggerTimePicker}
        className="relative flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-gray-800 font-bold cursor-pointer transition select-none flex-1 justify-center"
        title="Bấm để chọn Giờ"
      >
        <Clock size={13} className="text-gray-500 shrink-0" />
        <span className="text-xs font-mono whitespace-nowrap">{timePart}</span>

        <input
          ref={timeInputRef}
          type="time"
          value={timePart}
          onChange={(e) => handleTimeChange(e.target.value)}
          className="absolute inset-0 opacity-0 pointer-events-none w-full h-full"
        />
      </div>
    </div>
  );
}

export default function QuickBookingModal({
  isOpen,
  onClose,
  rooms = [],
  bookingData,
  setBookingData,
  onConfirmBooking,
}) {
  const formatNumber = (num) => Number(num || 0).toLocaleString("vi-VN");

  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [customerForm, setCustomerForm] = useState({
    name: "",
    code: "",
    phone: "",
    birthday: "",
    gender: "male",
    email: "",
    nationality: "Việt Nam",
    address: "",
    customer_group: "",
    note: "",
  });

  const [openAccordions, setOpenAccordions] = useState({
    address: false,
    group_note: false,
    attachments: false,
  });

  const [isGuestStayListOpen, setIsGuestStayListOpen] = useState(false);
  const [tempGuestCount, setTempGuestCount] = useState({
    adult: 2,
    children: 0,
  });

  const [isAddGuestDocOpen, setIsAddGuestDocOpen] = useState(false);
  const initialGuestDoc = {
    room_number: "",
    full_name: "",
    gender: "male",
    birthday: "",
    phone: "",
    nationality: "Việt Nam",
    address: "",
    id_type: "CCCD",
    id_number: "",
    stay_reason: "Du lịch",
    note: "",
  };
  const [guestDocForm, setGuestDocForm] = useState(initialGuestDoc);
  const [editingGuestIndex, setEditingGuestIndex] = useState(null);
  const [guestStayList, setGuestStayList] = useState([]);

  const hotelPolicies = useMemo(() => {
    const firstRoom = rooms[0] || {};
    return {
      dailyIn: String(firstRoom.checkin_time || "14:00").slice(0, 5),
      dailyOut: String(firstRoom.checkout_time || "12:00").slice(0, 5),
      overnightIn: String(firstRoom.overnight_checkin_time || "22:00").slice(
        0,
        5,
      ),
      overnightOut: String(firstRoom.overnight_checkout_time || "12:00").slice(
        0,
        5,
      ),
    };
  }, [rooms]);

  // 🌟 ĐÃ BỎ BUỔI: CHỈ CÒN GIỜ, ĐÊM, NGÀY
  const getDefaultDatesForType = (rentalType, checkinMode = "Hiện tại") => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");

    if (rentalType === "Giờ") {
      const end = new Date(now.getTime() + 3600000);
      return {
        checkin: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`,
        checkout: `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}T${pad(end.getHours())}:${pad(end.getMinutes())}`,
      };
    }

    if (rentalType === "Đêm") {
      const start = new Date(now);
      const [inH, inM] = hotelPolicies.overnightIn.split(":").map(Number);
      if (checkinMode === "Quy định") {
        if (now.getHours() < 12) start.setDate(start.getDate() - 1);
        start.setHours(inH || 22, inM || 0, 0, 0);
      }
      const end = new Date(start);
      if (start.getHours() >= 12) end.setDate(end.getDate() + 1);
      const [outH, outM] = hotelPolicies.overnightOut.split(":").map(Number);
      end.setHours(outH || 12, outM || 0, 0, 0);
      return {
        checkin: toStandardISO(start),
        checkout: toStandardISO(end),
      };
    }

    // THEO NGÀY
    const start = new Date(now);
    if (checkinMode === "Quy định") {
      const [h, m] = hotelPolicies.dailyIn.split(":").map(Number);
      start.setHours(h || 14, m || 0, 0, 0);
    }
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    const [outH, outM] = hotelPolicies.dailyOut.split(":").map(Number);
    end.setHours(outH || 12, outM || 0, 0, 0);
    return {
      checkin: toStandardISO(start),
      checkout: toStandardISO(end),
    };
  };

  const calculateDurationAndPriceLogic = (
    checkinStr,
    checkoutStr,
    rentalType,
    roomInfo,
  ) => {
    if (!checkinStr || !checkoutStr)
      return {
        durationLabel: "0 giờ",
        price: 0,
        earlyWarning: "",
        lateWarning: "",
      };

    const checkin = new Date(checkinStr);
    const checkout = new Date(checkoutStr);
    const diffMs = Math.max(0, checkout - checkin);
    const totalMinutes = Math.round(diffMs / (1000 * 60));
    const hours = Math.max(1, Math.ceil(totalMinutes / 60));
    const days = Math.max(1, Math.round(totalMinutes / (24 * 60)));

    const basePrice = Number(
      roomInfo?.base_price || roomInfo?.daily_price || 200000,
    );
    const hourlyPrice = Number(
      roomInfo?.hourly_price || Math.round(basePrice * 0.25) || 100000,
    );
    const overnightPrice = Number(roomInfo?.overnight_price || basePrice);

    let earlyWarning = "";
    let lateWarning = "";

    if (rentalType === "Giờ") {
      return {
        durationLabel: `${hours} giờ`,
        price: hours * hourlyPrice,
        earlyWarning: "",
        lateWarning: "",
      };
    }

    if (rentalType === "Đêm") {
      const [inH, inM] = hotelPolicies.overnightIn.split(":").map(Number);
      const [outH, outM] = hotelPolicies.overnightOut.split(":").map(Number);

      const stdCheckin = new Date(checkin);
      if (checkin.getHours() < 12) stdCheckin.setDate(stdCheckin.getDate() - 1);
      stdCheckin.setHours(inH || 22, inM || 0, 0, 0);

      let earlyHours = 0;
      if (checkin < stdCheckin) {
        earlyHours = Math.ceil((stdCheckin - checkin) / 3600000);
        if (earlyHours > 0) earlyWarning = `Nhận sớm ${earlyHours}h`;
      }

      let lateHours = 0;
      const stdCheckout = new Date(checkout);
      stdCheckout.setHours(outH || 12, outM || 0, 0, 0);
      if (checkout > stdCheckout) {
        lateHours = Math.ceil((checkout - stdCheckout) / 3600000);
        if (lateHours > 0) lateWarning = `Trả muộn ${lateHours}h`;
      }

      return {
        durationLabel: "1 đêm",
        price: overnightPrice + (earlyHours + lateHours) * hourlyPrice,
        earlyWarning,
        lateWarning,
      };
    }

    // THEO NGÀY
    const [inH, inM] = hotelPolicies.dailyIn.split(":").map(Number);
    const stdCheckin = new Date(checkin);
    stdCheckin.setHours(inH || 14, inM || 0, 0, 0);

    let earlyHours = 0;
    if (checkin < stdCheckin) {
      earlyHours = Math.ceil((stdCheckin - checkin) / 3600000);
      if (earlyHours > 0) earlyWarning = `Nhận sớm ${earlyHours}h`;
    }

    let lateHours = 0;
    const [outH, outM] = hotelPolicies.dailyOut.split(":").map(Number);
    const stdCheckout = new Date(checkout);
    stdCheckout.setHours(outH || 12, outM || 0, 0, 0);
    if (checkout > stdCheckout) {
      lateHours = Math.ceil((checkout - stdCheckout) / 3600000);
      if (lateHours > 0) lateWarning = `Trả muộn ${lateHours}h`;
    }

    const finalPrice =
      days * basePrice + (earlyHours + lateHours) * hourlyPrice;
    const durationLabel =
      earlyHours > 0 || lateHours > 0
        ? `${days} ngày ${earlyHours + lateHours} giờ`
        : `${days} ngày`;

    return { durationLabel, price: finalPrice, earlyWarning, lateWarning };
  };

  const totalAmount = (bookingData?.rooms || []).reduce(
    (sum, r) => sum + (Number(r.price) || 0),
    0,
  );

  const [customerPaid, setCustomerPaid] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setCustomerPaid(0);
      const curAdult = Number(bookingData?.guest_count?.adult || 2);
      const curChildren = Number(bookingData?.guest_count?.children || 0);
      setTempGuestCount({ adult: curAdult, children: curChildren });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddMoreRoom = () => {
    const available =
      rooms.find(
        (r) => !bookingData.rooms.some((item) => item.room_id === r.id),
      ) || rooms[0];
    if (!available) return;

    const { checkin, checkout } = getDefaultDatesForType("Ngày", "Hiện tại");
    const calc = calculateDurationAndPriceLogic(
      checkin,
      checkout,
      "Ngày",
      available,
    );

    const newItem = {
      room_id: available.id,
      room_number: available.room_number,
      type_name: available.type_name || available.name || "DELUXE",
      rental_type: "Ngày",
      checkin_mode: "Hiện tại",
      checkin_date: checkin,
      checkout_date: checkout,
      duration_label: calc.durationLabel,
      price: calc.price,
      early_warning: calc.earlyWarning,
      late_warning: calc.lateWarning,
    };

    setBookingData((prev) => ({
      ...prev,
      rooms: [...prev.rooms, newItem],
    }));
  };

  const handleUpdateRoom = (index, field, value) => {
    setBookingData((prev) => {
      const updatedRooms = [...prev.rooms];
      const item = { ...updatedRooms[index], [field]: value };
      const roomInfo = rooms.find((r) => r.id === item.room_id) || {};

      if (field === "room_id") {
        const sel = rooms.find((r) => r.id === value);
        if (sel) {
          item.room_number = sel.room_number;
          item.type_name = sel.type_name || sel.name;
        }
      }

      if (field === "rental_type") {
        const dates = getDefaultDatesForType(value, item.checkin_mode);
        item.checkin_date = dates.checkin;
        item.checkout_date = dates.checkout;
      }

      if (field === "checkin_mode") {
        const dates = getDefaultDatesForType(item.rental_type, value);
        item.checkin_date = dates.checkin;
        item.checkout_date = dates.checkout;
      }

      const calc = calculateDurationAndPriceLogic(
        item.checkin_date,
        item.checkout_date,
        item.rental_type,
        roomInfo,
      );

      item.duration_label = calc.durationLabel;
      item.price = calc.price;
      item.early_warning = calc.earlyWarning;
      item.late_warning = calc.lateWarning;

      updatedRooms[index] = item;
      return {
        ...prev,
        rooms: updatedRooms,
      };
    });
  };

  const handleExecuteConfirm = (isCheckInNow) => {
    const finalAdult = Number(tempGuestCount.adult || 2);
    const finalChildren = Number(tempGuestCount.children || 0);

    const actualPaidAmount = isCheckInNow
      ? Number(customerPaid || totalAmount)
      : Number(customerPaid || 0);

    const formattedRooms = (bookingData.rooms || []).map((r) => {
      let mappedType = "DAY";
      if (r.rental_type === "Giờ") mappedType = "HOUR";
      else if (r.rental_type === "Đêm") mappedType = "OVERNIGHT";

      return {
        ...r,
        rental_type: mappedType,
        customer_paid: actualPaidAmount,
      };
    });

    setBookingData((prev) => ({
      ...prev,
      rooms: formattedRooms,
      adult_total: finalAdult,
      children_total: finalChildren,
      adults: finalAdult,
      children: finalChildren,
      guest_count: {
        adult: finalAdult,
        children: finalChildren,
        cards: guestStayList.length,
      },
      customer_paid: actualPaidAmount,
    }));

    if (onConfirmBooking) {
      onConfirmBooking(isCheckInNow);
    }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-fadeIn font-sans">
      <div className="bg-white rounded-3xl w-full max-w-5xl shadow-2xl border border-gray-200 overflow-hidden text-xs text-gray-900 animate-scaleUp my-auto">
        {/* HEADER MODAL */}
        <div className="flex justify-between items-center px-7 py-4.5 bg-[#003580] text-white shadow-xs">
          <div className="flex items-center gap-2.5">
            <h2 className="font-black text-lg text-white tracking-tight leading-none">
              Đặt/Nhận phòng nhanh
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/20">
              WALK-IN
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white transition cursor-pointer p-1.5 rounded-xl hover:bg-white/10"
          >
            <X size={20} />
          </button>
        </div>

        {/* THANH TÌM KIẾM & BỘ ĐẾM SỐ KHÁCH */}
        <div className="p-7 space-y-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 flex-1 min-w-[280px]">
              <div className="flex items-center border border-gray-300 rounded-xl px-3.5 py-2 bg-white focus-within:border-[#003580] shadow-2xs flex-1 max-w-md">
                <Search size={16} className="text-gray-400 mr-2 shrink-0" />
                <input
                  type="text"
                  value={bookingData.customer_name || ""}
                  onChange={(e) =>
                    setBookingData({
                      ...bookingData,
                      customer_name: e.target.value,
                    })
                  }
                  placeholder="Nhập mã, tên, SĐT, số giấy tờ khách"
                  className="w-full outline-none text-xs font-semibold text-gray-900 bg-transparent placeholder:text-gray-400"
                />
                <button
                  type="button"
                  className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer"
                  title="Quét QR CCCD"
                >
                  <QrCode size={16} />
                </button>

                <button
                  type="button"
                  onClick={() => setIsAddCustomerOpen(true)}
                  className="p-1 text-[#003580] hover:text-blue-900 cursor-pointer ml-1"
                  title="Thêm mới hồ sơ khách hàng"
                >
                  <Plus size={18} strokeWidth={2.5} />
                </button>
              </div>

              <div
                onClick={() => setIsGuestStayListOpen(true)}
                className="flex items-center gap-2.5 border border-gray-300 rounded-xl px-4 py-2 bg-white text-gray-700 font-bold select-none cursor-pointer hover:border-[#003580] hover:bg-blue-50/50 shadow-2xs transition"
                title="Bấm để xem & quản lý khách lưu trú"
              >
                <Users size={15} className="text-[#006ce4]" />
                <span>{tempGuestCount.adult} lớn</span>
                <span className="text-gray-300">|</span>
                <span>👶 {tempGuestCount.children} trẻ</span>
                <span className="text-gray-300">|</span>
                <span className="font-mono text-[#003580]">
                  {guestStayList.length} CCCD
                </span>
              </div>
            </div>
          </div>

          {/* BẢNG PHÒNG CHỌN */}
          <div className="border border-blue-100 rounded-2xl overflow-hidden bg-white shadow-2xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-blue-50/70 text-gray-800 border-b border-blue-100 text-xs font-bold uppercase tracking-wider">
                  <th className="py-3 px-4 whitespace-nowrap">Hạng phòng</th>
                  <th className="py-3 px-3 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span>Phòng</span>
                      <span className="bg-[#003580] text-white px-2 py-0.2 rounded-full text-[10px] font-black">
                        {bookingData.rooms?.length || 1}
                      </span>
                    </div>
                  </th>

                  {/* 🌟 HÌNH THỨC CHUẨN 3 LOẠI */}
                  <th className="py-3 px-3 whitespace-nowrap">Hình thức</th>

                  <th className="py-3 px-3 min-w-[210px] whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span className="whitespace-nowrap">Nhận</span>
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateRoom(0, "checkin_mode", "Hiện tại")
                        }
                        className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold cursor-pointer transition whitespace-nowrap ${
                          bookingData.rooms[0]?.checkin_mode === "Hiện tại"
                            ? "bg-[#003580] text-white font-black shadow-2xs"
                            : "border border-gray-300 text-gray-600 bg-white hover:bg-gray-100"
                        }`}
                      >
                        Hiện tại
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateRoom(0, "checkin_mode", "Quy định")
                        }
                        className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold cursor-pointer transition whitespace-nowrap ${
                          bookingData.rooms[0]?.checkin_mode === "Quy định"
                            ? "bg-[#003580] text-white font-black shadow-2xs"
                            : "border border-gray-300 text-gray-600 bg-white hover:bg-gray-100"
                        }`}
                      >
                        Quy định
                      </button>
                    </div>
                  </th>

                  <th className="py-3 px-3 min-w-[210px] whitespace-nowrap">
                    Trả phòng
                  </th>

                  <th className="py-3 px-3 text-center whitespace-nowrap min-w-[95px]">
                    Dự kiến
                  </th>

                  <th className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <span>Thành tiền</span>
                      <Info size={13} className="text-gray-400" />
                    </div>
                  </th>
                  <th className="py-3 px-2 w-8 text-center"></th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 text-xs">
                {(bookingData.rooms || []).map((item, idx) => (
                  <tr key={idx} className="hover:bg-blue-50/40 transition">
                    <td className="py-3.5 px-4 font-bold text-gray-900 whitespace-nowrap">
                      {item.type_name || "DELUXE"}
                    </td>

                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <select
                        value={item.room_id}
                        onChange={(e) =>
                          handleUpdateRoom(idx, "room_id", e.target.value)
                        }
                        className="border border-gray-200 rounded-xl px-2.5 py-1.5 outline-none font-black text-[#003580] bg-white hover:border-[#003580] cursor-pointer min-w-[90px]"
                      >
                        {rooms.map((r) => (
                          <option key={r.id} value={r.id}>
                            Phòng {r.room_number}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* 🌟 CHỈ CÒN ĐÚNG 3 LỰA CHỌN GỌN GÀNG: Giờ | Đêm | Ngày */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <select
                        value={item.rental_type}
                        onChange={(e) =>
                          handleUpdateRoom(idx, "rental_type", e.target.value)
                        }
                        className="border border-[#003580] rounded-xl px-2.5 py-1.5 outline-none font-bold text-gray-800 bg-white cursor-pointer min-w-[85px]"
                      >
                        <option value="Giờ">Giờ</option>
                        <option value="Đêm">Đêm</option>
                        <option value="Ngày">Ngày</option>
                      </select>
                    </td>

                    <td className="py-3.5 px-3">
                      <div className="space-y-1">
                        <EasyDateTimePicker
                          value={item.checkin_date}
                          hasWarning={Boolean(item.early_warning)}
                          onChange={(val) =>
                            handleUpdateRoom(idx, "checkin_date", val)
                          }
                        />
                        {item.early_warning && (
                          <div className="flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-300 rounded-lg px-2 py-0.5 w-fit whitespace-nowrap">
                            <AlertTriangle
                              size={12}
                              className="text-amber-600 shrink-0"
                            />
                            <span>{item.early_warning}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-3">
                      <div className="space-y-1">
                        <EasyDateTimePicker
                          value={item.checkout_date}
                          hasWarning={Boolean(item.late_warning)}
                          onChange={(val) =>
                            handleUpdateRoom(idx, "checkout_date", val)
                          }
                        />
                        {item.late_warning && (
                          <div className="flex items-center gap-1 text-[11px] font-bold text-rose-800 bg-rose-50 border border-rose-300 rounded-lg px-2 py-0.5 w-fit whitespace-nowrap">
                            <AlertTriangle
                              size={12}
                              className="text-rose-600 shrink-0"
                            />
                            <span>{item.late_warning}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-3 text-center font-bold text-[#003580] whitespace-nowrap">
                      <span className="bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100 inline-block whitespace-nowrap">
                        {item.duration_label || "1 giờ"}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-black text-right text-gray-900 text-sm tabular-nums whitespace-nowrap">
                      {formatNumber(item.price)} ₫
                    </td>

                    <td className="py-3.5 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setBookingData((prev) => ({
                            ...prev,
                            rooms: prev.rooms.filter((_, i) => i !== idx),
                          }));
                        }}
                        className="text-gray-400 hover:text-rose-600 p-1 cursor-pointer transition"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* NÚT THÊM PHÒNG & BẢNG TÍNH TIỀN */}
          <div className="flex items-start justify-between gap-6 pt-2 flex-wrap">
            <div className="space-y-4 flex-1 min-w-[280px]">
              <button
                type="button"
                onClick={handleAddMoreRoom}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#003580] text-[#003580] font-bold hover:bg-blue-50 cursor-pointer transition shadow-2xs active:scale-95 whitespace-nowrap"
              >
                <PlusCircle size={15} />
                <span>Chọn thêm phòng</span>
              </button>

              <div className="flex items-center gap-2 max-w-md">
                <span className="font-bold text-gray-700 shrink-0">
                  Ghi chú:
                </span>
                <input
                  value={bookingData.note || ""}
                  onChange={(e) =>
                    setBookingData({ ...bookingData, note: e.target.value })
                  }
                  placeholder="Nhập ghi chú khách hàng, biển số xe..."
                  className="flex-1 border-b border-gray-300 py-1 outline-none text-gray-800 text-xs focus:border-[#003580] bg-transparent"
                />
              </div>
            </div>

            <div className="w-80 p-4.5 bg-blue-50/60 rounded-2xl border border-blue-200 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-gray-700 whitespace-nowrap">
                  Khách cần trả
                </span>
                <span className="font-black text-base text-[#003580] tabular-nums whitespace-nowrap">
                  {formatNumber(totalAmount)} ₫
                </span>
              </div>

              <div className="pt-2 border-t border-blue-200 flex justify-between items-center text-xs">
                <span className="text-gray-700 font-bold whitespace-nowrap">
                  Khách thanh toán
                </span>
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={customerPaid ? formatNumber(customerPaid) : "0"}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, "");
                      setCustomerPaid(raw ? Number(raw) : 0);
                    }}
                    className="w-28 text-right border-b border-gray-400 focus:border-[#003580] py-0.5 outline-none font-black text-gray-900 bg-transparent tabular-nums"
                  />
                  <span className="font-bold text-gray-700">₫</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="px-7 py-4.5 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => handleExecuteConfirm(false)}
            className="px-6 py-2.5 border border-[#003580] text-[#003580] hover:bg-blue-50 font-bold rounded-xl text-xs shadow-2xs cursor-pointer transition active:scale-95 whitespace-nowrap"
          >
            Đặt trước
          </button>

          <button
            type="button"
            onClick={() => handleExecuteConfirm(true)}
            className="px-6 py-2.5 bg-[#003580] hover:bg-[#00224f] text-white font-black rounded-xl text-xs shadow-xs cursor-pointer transition active:scale-95 flex items-center gap-1.5 whitespace-nowrap"
          >
            <CheckCircle2 size={16} />
            <span>Nhận phòng ngay</span>
          </button>
        </div>
      </div>

      {/* MODAL KHÁCH LƯU TRÚ */}
      {isGuestStayListOpen && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs font-sans">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl border border-gray-200 overflow-hidden text-xs text-gray-900 animate-scaleUp my-auto">
            <div className="flex justify-between items-center px-7 py-4.5 bg-[#003580] text-white">
              <h3 className="font-black text-base tracking-tight leading-none text-white">
                Khách lưu trú - Đặt phòng
              </h3>
              <button
                type="button"
                onClick={() => setIsGuestStayListOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-7 space-y-4.5 overflow-y-auto max-h-[82vh]">
              <div className="flex items-center gap-10 p-4 border border-gray-200 rounded-2xl bg-gray-50/70 shadow-2xs">
                <span className="font-black text-gray-900 text-xs uppercase tracking-wider whitespace-nowrap">
                  Số lượng khách
                </span>

                <div className="flex items-center gap-3">
                  <span className="text-gray-700 font-bold whitespace-nowrap">
                    Người lớn
                  </span>
                  <div className="flex items-center border border-gray-200 rounded-xl bg-white overflow-hidden shadow-2xs">
                    <button
                      type="button"
                      onClick={() =>
                        setTempGuestCount((prev) => ({
                          ...prev,
                          adult: Math.max(1, prev.adult - 1),
                        }))
                      }
                      className="p-1.5 hover:bg-blue-50 text-gray-700 hover:text-[#003580] cursor-pointer"
                    >
                      <Minus size={13} strokeWidth={2.5} />
                    </button>
                    <span className="w-8 text-center font-black text-[#003580]">
                      {tempGuestCount.adult}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setTempGuestCount((prev) => ({
                          ...prev,
                          adult: prev.adult + 1,
                        }))
                      }
                      className="p-1.5 hover:bg-blue-50 text-gray-700 hover:text-[#003580] cursor-pointer"
                    >
                      <Plus size={13} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-gray-700 font-bold whitespace-nowrap">
                    Trẻ em
                  </span>
                  <div className="flex items-center border border-gray-200 rounded-xl bg-white overflow-hidden shadow-2xs">
                    <button
                      type="button"
                      onClick={() =>
                        setTempGuestCount((prev) => ({
                          ...prev,
                          children: Math.max(0, prev.children - 1),
                        }))
                      }
                      className="p-1.5 hover:bg-blue-50 text-gray-700 hover:text-[#003580] cursor-pointer"
                    >
                      <Minus size={13} strokeWidth={2.5} />
                    </button>
                    <span className="w-8 text-center font-black text-gray-800">
                      {tempGuestCount.children}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setTempGuestCount((prev) => ({
                          ...prev,
                          children: prev.children + 1,
                        }))
                      }
                      className="p-1.5 hover:bg-blue-50 text-gray-700 hover:text-[#003580] cursor-pointer"
                    >
                      <Plus size={13} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-b border-gray-200 pb-3 flex-wrap gap-2">
                <div className="border-b-2 border-[#003580] pb-2 font-black text-[#003580] text-xs">
                  Danh sách khai báo ({guestStayList.length}/
                  {tempGuestCount.adult + tempGuestCount.children})
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setGuestStayList([])}
                    className="p-2 border border-gray-300 rounded-xl hover:bg-gray-100 text-gray-600 cursor-pointer"
                    title="Làm mới"
                  >
                    <RotateCw size={14} />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingGuestIndex(null);
                      setGuestDocForm({
                        ...initialGuestDoc,
                        room_number: bookingData.rooms[0]?.room_number || "111",
                        full_name: "",
                      });
                      setIsAddGuestDocOpen(true);
                    }}
                    className="p-2 border border-[#003580] bg-blue-50 text-[#003580] rounded-xl hover:bg-blue-100 cursor-pointer"
                    title="Thêm khách"
                  >
                    <Plus size={15} strokeWidth={2.5} />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingGuestIndex(null);
                      setGuestDocForm({
                        ...initialGuestDoc,
                        room_number: bookingData.rooms[0]?.room_number || "111",
                      });
                      setIsAddGuestDocOpen(true);
                    }}
                    className="px-3.5 py-1.5 border border-gray-300 rounded-xl hover:bg-gray-50 text-gray-700 font-bold cursor-pointer flex items-center gap-1.5"
                  >
                    <Scan size={14} />
                    <span>Quét CCCD</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingGuestIndex(null);
                      setGuestDocForm({
                        ...initialGuestDoc,
                        room_number: bookingData.rooms[0]?.room_number || "111",
                      });
                      setIsAddGuestDocOpen(true);
                    }}
                    className="px-3.5 py-1.5 border border-[#003580] text-[#003580] rounded-xl hover:bg-blue-50 font-bold cursor-pointer flex items-center gap-1.5"
                  >
                    <Camera size={14} />
                    <span>Chụp CCCD / Hộ chiếu</span>
                  </button>
                </div>
              </div>

              <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-blue-50/70 text-gray-800 border-b border-blue-100 font-bold">
                      <th className="py-2.5 px-4 whitespace-nowrap">
                        Họ và tên
                      </th>
                      <th className="py-2.5 px-4 whitespace-nowrap">
                        Thông tin cá nhân
                      </th>
                      <th className="py-2.5 px-4 whitespace-nowrap">Phòng</th>
                      <th className="py-2.5 px-4 whitespace-nowrap">
                        Thời gian khai báo
                      </th>
                      <th className="py-2.5 px-3 text-center w-20"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {guestStayList.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="py-12 text-center text-gray-400 font-medium"
                        >
                          Chưa có thông tin định danh khách lưu trú. Bấm dấu{" "}
                          <b>(+)</b> ở trên để thêm khách!
                        </td>
                      </tr>
                    ) : (
                      guestStayList.map((g, idx) => (
                        <tr
                          key={idx}
                          className="hover:bg-blue-50/30 transition"
                        >
                          <td className="py-3 px-4 font-bold text-gray-900 flex items-center gap-2 whitespace-nowrap">
                            <span>👤 {g.full_name}</span>
                            {idx === 0 && (
                              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-[#003580] font-bold text-[10px]">
                                Trưởng đoàn
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-gray-600 whitespace-nowrap">
                            {g.gender === "male" ? "Nam" : "Nữ"}
                            {g.id_number
                              ? ` • ${g.id_type}: ${g.id_number}`
                              : ""}
                          </td>
                          <td className="py-3 px-4 font-black text-[#003580] whitespace-nowrap">
                            P.{g.room_number || "111"}
                          </td>
                          <td className="py-3 px-4 text-gray-500 font-mono whitespace-nowrap">
                            {g.declaration_time || "---"}
                          </td>
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-2 text-gray-400">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingGuestIndex(idx);
                                  setGuestDocForm(g);
                                  setIsAddGuestDocOpen(true);
                                }}
                                className="hover:text-blue-600 cursor-pointer p-1"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setGuestStayList((prev) =>
                                    prev.filter((_, i) => i !== idx),
                                  );
                                }}
                                className="hover:text-rose-600 cursor-pointer p-1"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-end pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsGuestStayListOpen(false)}
                  className="px-8 py-2.5 bg-[#003580] hover:bg-[#00224f] text-white font-black rounded-xl text-xs shadow-xs cursor-pointer transition active:scale-95 whitespace-nowrap"
                >
                  Lưu
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FORM CHI TIẾT CCCD */}
      {isAddGuestDocOpen && (
        <div className="fixed inset-0 z-[1300] flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs font-sans">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl border border-gray-200 overflow-hidden text-xs text-gray-900 animate-scaleUp my-auto">
            <div className="flex justify-between items-center px-7 py-4.5 bg-[#003580] text-white">
              <h3 className="font-black text-base tracking-tight leading-none text-white">
                {editingGuestIndex !== null
                  ? "Sửa thông tin khách lưu trú"
                  : "Thêm thông tin khách lưu trú"}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddGuestDocOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!guestDocForm.full_name.trim())
                  return alert("Vui lòng nhập họ và tên!");

                const now = new Date();
                const timeStr = `${now.getDate()} Thg ${now.getMonth() + 1} ${now.getFullYear()}, ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

                const item = {
                  ...guestDocForm,
                  declaration_time: guestDocForm.declaration_time || timeStr,
                  stay_duration: guestDocForm.stay_duration || "1 ngày",
                };

                if (editingGuestIndex !== null) {
                  setGuestStayList((prev) => {
                    const up = [...prev];
                    up[editingGuestIndex] = item;
                    return up;
                  });
                } else {
                  setGuestStayList((prev) => [...prev, item]);
                }

                setIsAddGuestDocOpen(false);
              }}
              className="p-7 space-y-4.5 overflow-y-auto max-h-[80vh]"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3.5">
                <div className="space-y-3.5">
                  <div className="flex items-center gap-3">
                    <label className="w-28 text-gray-700 font-bold shrink-0 whitespace-nowrap">
                      Phòng
                    </label>
                    <select
                      value={guestDocForm.room_number}
                      onChange={(e) =>
                        setGuestDocForm({
                          ...guestDocForm,
                          room_number: e.target.value,
                        })
                      }
                      className="flex-1 border border-gray-300 rounded-xl px-3 py-2 outline-none bg-white hover:border-[#003580] cursor-pointer font-bold text-[#003580]"
                    >
                      {rooms.map((r) => (
                        <option key={r.id} value={r.room_number}>
                          Phòng {r.room_number}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="w-28 text-gray-700 font-bold shrink-0 whitespace-nowrap">
                      Họ và tên
                    </label>
                    <div className="flex items-center flex-1 border border-gray-300 rounded-xl px-3 py-1.5 focus-within:border-[#003580] bg-white">
                      <input
                        required
                        value={guestDocForm.full_name}
                        onChange={(e) =>
                          setGuestDocForm({
                            ...guestDocForm,
                            full_name: e.target.value,
                          })
                        }
                        placeholder="Nhập họ và tên..."
                        className="w-full outline-none text-xs bg-transparent font-bold text-gray-900"
                      />
                      <button
                        type="button"
                        className="text-[#003580] hover:text-blue-900 p-1 cursor-pointer"
                        title="Quét QR CCCD"
                      >
                        <QrCode size={18} />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="w-28 text-gray-700 font-bold shrink-0 whitespace-nowrap">
                      Giới tính
                    </label>
                    <div className="flex items-center gap-6 font-bold text-gray-800">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="stay_gender_doc_navy"
                          checked={guestDocForm.gender === "male"}
                          onChange={() =>
                            setGuestDocForm({ ...guestDocForm, gender: "male" })
                          }
                          className="accent-[#003580] w-4 h-4 cursor-pointer"
                        />
                        <span>Nam</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="stay_gender_doc_navy"
                          checked={guestDocForm.gender === "female"}
                          onChange={() =>
                            setGuestDocForm({
                              ...guestDocForm,
                              gender: "female",
                            })
                          }
                          className="accent-[#003580] w-4 h-4 cursor-pointer"
                        />
                        <span>Nữ</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="stay_gender_doc_navy"
                          checked={guestDocForm.gender === "other"}
                          onChange={() =>
                            setGuestDocForm({
                              ...guestDocForm,
                              gender: "other",
                            })
                          }
                          className="accent-[#003580] w-4 h-4 cursor-pointer"
                        />
                        <span>Khác</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="w-28 text-gray-700 font-bold shrink-0 whitespace-nowrap">
                      Ngày sinh
                    </label>
                    <input
                      type="date"
                      value={guestDocForm.birthday}
                      onChange={(e) =>
                        setGuestDocForm({
                          ...guestDocForm,
                          birthday: e.target.value,
                        })
                      }
                      className="flex-1 border border-gray-300 rounded-xl px-3 py-2 outline-none bg-white text-gray-800 font-medium"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="w-28 text-gray-700 font-bold shrink-0 whitespace-nowrap">
                      Số điện thoại
                    </label>
                    <input
                      value={guestDocForm.phone}
                      onChange={(e) =>
                        setGuestDocForm({
                          ...guestDocForm,
                          phone: e.target.value,
                        })
                      }
                      placeholder="Nhập số điện thoại..."
                      className="flex-1 border border-gray-300 rounded-xl px-3 py-2 outline-none focus:border-[#003580] bg-white font-mono font-bold"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="w-28 text-gray-700 font-bold shrink-0 whitespace-nowrap">
                      Quốc tịch
                    </label>
                    <select
                      value={guestDocForm.nationality}
                      onChange={(e) =>
                        setGuestDocForm({
                          ...guestDocForm,
                          nationality: e.target.value,
                        })
                      }
                      className="flex-1 border border-gray-300 rounded-xl px-3 py-2 outline-none bg-white cursor-pointer font-medium"
                    >
                      <option value="Việt Nam">Việt Nam</option>
                      <option value="Hàn Quốc">Hàn Quốc</option>
                      <option value="Mỹ">Mỹ (USA)</option>
                      <option value="Khác">Quốc gia khác</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-3.5">
                  <div className="flex items-center gap-3">
                    <label className="w-28 text-gray-700 font-bold shrink-0 whitespace-nowrap">
                      Địa chỉ
                    </label>
                    <input
                      value={guestDocForm.address}
                      onChange={(e) =>
                        setGuestDocForm({
                          ...guestDocForm,
                          address: e.target.value,
                        })
                      }
                      placeholder="Nhập địa chỉ..."
                      className="flex-1 border border-gray-300 rounded-xl px-3 py-2 outline-none focus:border-[#003580] bg-white"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="w-28 text-gray-700 font-bold shrink-0 whitespace-nowrap">
                      Loại giấy tờ
                    </label>
                    <select
                      value={guestDocForm.id_type}
                      onChange={(e) =>
                        setGuestDocForm({
                          ...guestDocForm,
                          id_type: e.target.value,
                        })
                      }
                      className="flex-1 border border-gray-300 rounded-xl px-3 py-2 outline-none bg-white cursor-pointer font-medium"
                    >
                      <option value="CCCD">CCCD gắn chip</option>
                      <option value="CMND">CMND</option>
                      <option value="Hộ chiếu">Hộ chiếu (Passport)</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="w-28 text-gray-700 font-bold shrink-0 whitespace-nowrap">
                      Số giấy tờ
                    </label>
                    <input
                      value={guestDocForm.id_number}
                      onChange={(e) =>
                        setGuestDocForm({
                          ...guestDocForm,
                          id_number: e.target.value,
                        })
                      }
                      placeholder="Nhập số giấy tờ..."
                      className="flex-1 border border-gray-300 rounded-xl px-3 py-2 outline-none focus:border-[#003580] bg-white font-mono font-bold text-[#003580]"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="w-28 text-gray-700 font-bold shrink-0 whitespace-nowrap">
                      Lý do lưu trú
                    </label>
                    <select
                      value={guestDocForm.stay_reason}
                      onChange={(e) =>
                        setGuestDocForm({
                          ...guestDocForm,
                          stay_reason: e.target.value,
                        })
                      }
                      className="flex-1 border border-[#003580] rounded-xl px-3 py-2 outline-none bg-white cursor-pointer font-bold text-[#003580]"
                    >
                      <option value="Du lịch">Du lịch</option>
                      <option value="Công tác">Công tác</option>
                      <option value="Khác">Khác</option>
                    </select>
                  </div>

                  <div className="flex items-start gap-3">
                    <label className="w-28 text-gray-700 font-bold shrink-0 pt-2 whitespace-nowrap">
                      Ghi chú
                    </label>
                    <textarea
                      rows={3}
                      value={guestDocForm.note}
                      onChange={(e) =>
                        setGuestDocForm({
                          ...guestDocForm,
                          note: e.target.value,
                        })
                      }
                      placeholder="Nhập ghi chú..."
                      className="flex-1 border border-gray-300 rounded-xl p-2 outline-none focus:border-[#003580] bg-white resize-y"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-100">
                <button
                  type="submit"
                  className="px-8 py-2.5 bg-[#003580] hover:bg-[#00224f] text-white font-black rounded-xl text-xs shadow-md cursor-pointer transition active:scale-95 whitespace-nowrap"
                >
                  Lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TẠO MỚI KHÁCH HÀNG */}
      {isAddCustomerOpen && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs font-sans">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl border border-gray-200 overflow-hidden text-xs text-gray-900 animate-scaleUp my-auto">
            <div className="flex justify-between items-center px-7 py-4.5 bg-[#003580] text-white">
              <h3 className="font-black text-base tracking-tight leading-none text-white">
                Thêm mới khách hàng
              </h3>
              <button
                type="button"
                onClick={() => setIsAddCustomerOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!customerForm.name.trim())
                  return alert("Vui lòng nhập tên khách hàng!");

                setBookingData((prev) => ({
                  ...prev,
                  customer_name: customerForm.name.trim(),
                  customer_phone: customerForm.phone.trim(),
                }));

                setIsAddCustomerOpen(false);
              }}
              className="p-7 space-y-4.5 overflow-y-auto max-h-[82vh]"
            >
              <div className="flex items-start gap-4">
                <div className="w-24 h-24 rounded-2xl border border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center text-gray-400 hover:bg-gray-100 cursor-pointer shrink-0">
                  <User size={32} />
                  <span className="text-[10px] text-gray-400 mt-1 flex items-center gap-0.5">
                    <Plus size={10} /> Thêm ảnh
                  </span>
                </div>

                <div className="flex-1 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-gray-700 font-bold block mb-1 whitespace-nowrap">
                        Tên khách hàng
                      </label>
                      <div className="flex items-center border border-[#003580] rounded-xl px-3 py-2 bg-white">
                        <input
                          required
                          value={customerForm.name}
                          onChange={(e) =>
                            setCustomerForm({
                              ...customerForm,
                              name: e.target.value,
                            })
                          }
                          placeholder="Nhập tên khách hàng..."
                          className="w-full outline-none text-xs bg-transparent font-bold text-gray-900"
                        />
                        <button type="button" className="text-[#003580] p-0.5">
                          <QrCode size={17} />
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-gray-700 font-bold block mb-1 whitespace-nowrap">
                        Mã khách hàng
                      </label>
                      <input
                        value={customerForm.code}
                        onChange={(e) =>
                          setCustomerForm({
                            ...customerForm,
                            code: e.target.value,
                          })
                        }
                        placeholder="Mã tự động"
                        className="w-full border border-gray-300 rounded-xl px-3 py-2 outline-none bg-gray-50 text-gray-500 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-gray-700 font-bold block mb-1 whitespace-nowrap">
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
                        className="w-full border border-gray-300 rounded-xl px-3 py-2 outline-none focus:border-[#003580] bg-white font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="text-gray-700 font-bold block mb-1 whitespace-nowrap">
                        Ngày sinh
                      </label>
                      <input
                        type="date"
                        value={customerForm.birthday}
                        onChange={(e) =>
                          setCustomerForm({
                            ...customerForm,
                            birthday: e.target.value,
                          })
                        }
                        className="w-full border border-gray-300 rounded-xl px-3 py-2 outline-none bg-white text-gray-700 font-medium"
                      />
                    </div>

                    <div>
                      <label className="text-gray-700 font-bold block mb-1 whitespace-nowrap">
                        Giới tính
                      </label>
                      <div className="flex items-center gap-5 pt-2 text-gray-800 font-bold">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="cust_gender_web"
                            checked={customerForm.gender === "male"}
                            onChange={() =>
                              setCustomerForm({
                                ...customerForm,
                                gender: "male",
                              })
                            }
                            className="accent-[#003580]"
                          />
                          <span>Nam</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="cust_gender_web"
                            checked={customerForm.gender === "female"}
                            onChange={() =>
                              setCustomerForm({
                                ...customerForm,
                                gender: "female",
                              })
                            }
                            className="accent-[#003580]"
                          />
                          <span>Nữ</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="text-gray-700 font-bold block mb-1 whitespace-nowrap">
                    Email
                  </label>
                  <input
                    type="email"
                    value={customerForm.email}
                    onChange={(e) =>
                      setCustomerForm({
                        ...customerForm,
                        email: e.target.value,
                      })
                    }
                    placeholder="email@example.com"
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 outline-none focus:border-[#003580] bg-white"
                  />
                </div>

                <div>
                  <label className="text-gray-700 font-bold block mb-1 whitespace-nowrap">
                    Quốc tịch
                  </label>
                  <select
                    value={customerForm.nationality}
                    onChange={(e) =>
                      setCustomerForm({
                        ...customerForm,
                        nationality: e.target.value,
                      })
                    }
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 outline-none bg-white cursor-pointer font-medium"
                  >
                    <option value="Việt Nam">Việt Nam</option>
                    <option value="Quốc tế">Quốc gia khác</option>
                  </select>
                </div>
              </div>

              {/* CÁC MỤC THU GỌN ACCORDION */}
              <div className="space-y-2.5 pt-2">
                <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white">
                  <button
                    type="button"
                    onClick={() =>
                      setOpenAccordions({
                        ...openAccordions,
                        address: !openAccordions.address,
                      })
                    }
                    className="w-full px-4.5 py-3 flex items-center justify-between font-bold text-gray-800 hover:bg-gray-50 text-xs"
                  >
                    <span>Địa chỉ</span>
                    {openAccordions.address ? (
                      <ChevronUp size={16} />
                    ) : (
                      <ChevronDown size={16} />
                    )}
                  </button>
                  {openAccordions.address && (
                    <div className="p-4 pt-1 border-t border-gray-100">
                      <input
                        value={customerForm.address}
                        onChange={(e) =>
                          setCustomerForm({
                            ...customerForm,
                            address: e.target.value,
                          })
                        }
                        placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành..."
                        className="w-full border border-gray-300 rounded-xl px-3 py-2 outline-none focus:border-[#003580] bg-white"
                      />
                    </div>
                  )}
                </div>

                <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white">
                  <button
                    type="button"
                    onClick={() =>
                      setOpenAccordions({
                        ...openAccordions,
                        group_note: !openAccordions.group_note,
                      })
                    }
                    className="w-full px-4.5 py-3 flex items-center justify-between font-bold text-gray-800 hover:bg-gray-50 text-xs"
                  >
                    <span>Nhóm khách, Ghi chú</span>
                    {openAccordions.group_note ? (
                      <ChevronUp size={16} />
                    ) : (
                      <ChevronDown size={16} />
                    )}
                  </button>
                  {openAccordions.group_note && (
                    <div className="p-4 pt-1 space-y-3 border-t border-gray-100">
                      <div>
                        <label className="text-gray-600 font-bold block mb-1 whitespace-nowrap">
                          Nhóm khách
                        </label>
                        <input
                          value={customerForm.customer_group}
                          onChange={(e) =>
                            setCustomerForm({
                              ...customerForm,
                              customer_group: e.target.value,
                            })
                          }
                          placeholder="VIP, Khách đoàn, Khách gia đình..."
                          className="w-full border border-gray-300 rounded-xl px-3 py-2 outline-none focus:border-[#003580] bg-white font-medium"
                        />
                      </div>
                      <div>
                        <label className="text-gray-600 font-bold block mb-1 whitespace-nowrap">
                          Ghi chú thêm
                        </label>
                        <textarea
                          rows={2}
                          value={customerForm.note}
                          onChange={(e) =>
                            setCustomerForm({
                              ...customerForm,
                              note: e.target.value,
                            })
                          }
                          placeholder="Ghi chú sở thích, yêu cầu đặc biệt của khách..."
                          className="w-full border border-gray-300 rounded-xl p-2 outline-none focus:border-[#003580] bg-white"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white">
                  <button
                    type="button"
                    onClick={() =>
                      setOpenAccordions({
                        ...openAccordions,
                        attachments: !openAccordions.attachments,
                      })
                    }
                    className="w-full px-4.5 py-3 flex items-center justify-between font-bold text-gray-800 hover:bg-gray-50 text-xs"
                  >
                    <span>Thư viện ảnh, File tải lên</span>
                    {openAccordions.attachments ? (
                      <ChevronUp size={16} />
                    ) : (
                      <ChevronDown size={16} />
                    )}
                  </button>
                  {openAccordions.attachments && (
                    <div className="p-4 pt-1 border-t border-gray-100 text-center py-6 text-gray-400 bg-gray-50/50">
                      <Camera
                        size={24}
                        className="mx-auto mb-1 text-gray-300"
                      />
                      <span>Kéo thả ảnh hoặc tài liệu đính kèm vào đây</span>
                    </div>
                  )}
                </div>
              </div>

              {/* FOOTER */}
              <div className="flex items-center justify-end pt-4 border-t border-gray-100 gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddCustomerOpen(false)}
                  className="px-5 py-2.5 border border-gray-300 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs cursor-pointer transition whitespace-nowrap"
                >
                  Bỏ qua
                </button>
                <button
                  type="submit"
                  className="px-7 py-2.5 bg-[#003580] hover:bg-[#00224f] text-white font-black rounded-xl text-xs shadow-md cursor-pointer transition active:scale-95 whitespace-nowrap"
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
