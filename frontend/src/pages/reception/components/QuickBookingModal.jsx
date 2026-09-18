// src/pages/reception/components/QuickBookingModal.jsx
import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Search,
  Plus,
  User,
  CreditCard,
  Smartphone,
  PlusCircle,
  Trash2,
  Minus,
  RotateCw,
  X,
  UserCheck,
  CalendarCheck,
  Users,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Calendar as CalendarIcon,
  Lock,
} from "lucide-react";

// --- HỖ TRỢ CHUYỂN DATE THÀNH CHUỖI DATETIME-LOCAL ---
const formatToLocalISO = (date) => {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
};

// Định dạng hiển thị: "15 Thg 09, 16:16"
const formatDisplayDateTime = (isoStr) => {
  if (!isoStr) return "";
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return isoStr;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");
  return `${day} Thg ${month}, ${hours}:${mins}`;
};

// Kiểm tra xem ngày có phải là ngày mai hoặc tương lai không
const isDateInFuture = (dateStr) => {
  if (!dateStr) return false;
  const checkin = new Date(dateStr);
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return checkin.getTime() > today.getTime();
};

// 🌟 BỘ CHỌN GIỜ SIÊU GỌN W-[178PX]
function SlimDateTimePicker({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const dateInputRef = useRef(null);

  const selectedDateStr = value ? value.split("T")[0] : "";
  const selectedTimeStr = value
    ? value.split("T")[1]?.slice(0, 5) || "14:00"
    : "14:00";

  // Mốc giờ mỗi 30 phút: 00:00 -> 23:30
  const timeSlots = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const hh = String(h).padStart(2, "0");
      const mm = String(m).padStart(2, "0");
      timeSlots.push(`${hh}:${mm}`);
    }
  }

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  const handleSelectTime = (timeStr) => {
    const datePart = selectedDateStr || new Date().toISOString().slice(0, 10);
    onChange(`${datePart}T${timeStr}`);
    setIsOpen(false);
  };

  const handleDateChange = (e) => {
    const newDatePart = e.target.value;
    if (newDatePart) {
      onChange(`${newDatePart}T${selectedTimeStr}`);
    }
  };

  return (
    <div className="relative w-[178px]" ref={dropdownRef}>
      <div
        className={`flex items-center justify-between w-full border rounded-xl px-2.5 py-1.5 bg-white text-xs font-bold transition select-none cursor-pointer ${
          isOpen
            ? "border-[#003580] ring-2 ring-blue-100 text-[#003580]"
            : "border-gray-200 hover:border-gray-300 text-gray-800"
        }`}
      >
        <span
          onClick={() => setIsOpen(!isOpen)}
          className="truncate cursor-pointer"
        >
          {formatDisplayDateTime(value)}
        </span>

        <div className="flex items-center gap-1.5 text-gray-400 pl-1.5 border-l border-gray-100 shrink-0">
          <button
            type="button"
            onClick={() => {
              if (dateInputRef.current) {
                dateInputRef.current.showPicker?.() ||
                  dateInputRef.current.focus();
              }
            }}
            className="hover:text-[#003580] cursor-pointer"
            title="Đổi ngày"
          >
            <CalendarIcon size={13} />
          </button>
          <input
            ref={dateInputRef}
            type="date"
            value={selectedDateStr}
            onChange={handleDateChange}
            className="sr-only"
          />

          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="hover:text-[#003580] cursor-pointer"
            title="Chọn giờ"
          >
            <Clock size={13} />
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1 w-full bg-white border border-gray-200 rounded-2xl shadow-xl z-[9999] py-1 max-h-52 overflow-y-auto animate-fadeIn scrollbar-thin divide-y divide-gray-50 text-xs">
          {timeSlots.map((slot) => {
            const isSelected = selectedTimeStr === slot;
            return (
              <button
                key={slot}
                type="button"
                onClick={() => handleSelectTime(slot)}
                className={`w-full text-center py-1.5 font-bold transition cursor-pointer text-xs ${
                  isSelected
                    ? "bg-[#003580] text-white"
                    : "hover:bg-blue-50 text-gray-700 hover:text-[#003580]"
                }`}
              >
                {slot}
              </button>
            );
          })}
        </div>
      )}
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
  formatVND: propFormatVND,
  calculateDurationAndPrice,
  toDatetimeLocal: propToDatetimeLocal,
}) {
  const toDatetimeLocal = propToDatetimeLocal || formatToLocalISO;
  const formatVND = (num) =>
    propFormatVND
      ? propFormatVND(num)
      : Number(num || 0).toLocaleString("vi-VN") + " ₫";

  // 1. STATE KHÁCH HÀNG
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [customerForm, setCustomerForm] = useState({
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
  });

  // 2. STATE SỐ KHÁCH (MẶC ĐỊNH 2 LỚN, 0 TRẺ)
  const [isGuestStayOpen, setIsGuestStayOpen] = useState(false);
  const [tempGuestCount, setTempGuestCount] = useState({
    adult: 2,
    children: 0,
  });
  const [guestStayList, setGuestStayList] = useState([]);

  // 3. STATE KHAI BÁO CCCD
  const [isAddGuestDocOpen, setIsAddGuestDocOpen] = useState(false);
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

  // Kiểm tra ngày nhận ở tương lai
  const hasFutureCheckin = (bookingData?.rooms || []).some((r) =>
    isDateInFuture(r.checkin_date),
  );

  // 🌟 GIỜ QUY ĐỊNH CỦA KHÁCH SẠN
  const hotelPolicies = useMemo(() => {
    const firstRoom = rooms[0] || {};
    return {
      dailyIn: String(firstRoom.checkin_time || "14:00").slice(0, 5),
      dailyOut: String(firstRoom.checkout_time || "12:00").slice(0, 5),
      overnightIn: String(
        firstRoom.overnight_checkin_time ||
          firstRoom.overnight_checkin ||
          "22:00",
      ).slice(0, 5),
      overnightOut: String(
        firstRoom.overnight_checkout_time ||
          firstRoom.overnight_checkout ||
          "12:00",
      ).slice(0, 5),
      halfdayIn: String(
        firstRoom.halfday_checkin_time || firstRoom.halfday_checkin || "12:00",
      ).slice(0, 5),
      halfdayOut: String(
        firstRoom.halfday_checkout_time ||
          firstRoom.halfday_checkout ||
          "21:00",
      ).slice(0, 5),
    };
  }, [rooms]);

  // TẠO THỜI GIAN THEO TỪNG HÌNH THỨC
  const getDefaultDatesForType = (rentalType, checkinMode = "Quy định") => {
    const now = new Date();

    if (rentalType === "Giờ") {
      const start = new Date(now);
      const end = new Date(start);
      end.setHours(end.getHours() + 1);
      return {
        checkin: toDatetimeLocal(start),
        checkout: toDatetimeLocal(end),
      };
    }

    if (rentalType === "Đêm") {
      const start = new Date(now);
      if (checkinMode !== "Hiện tại") {
        const [h, m] = hotelPolicies.overnightIn.split(":").map(Number);
        start.setHours(h || 22, m || 0, 0, 0);
      }
      const end = new Date(start);
      if (start.getHours() >= 20) {
        end.setDate(end.getDate() + 1);
      }
      const [outH, outM] = hotelPolicies.overnightOut.split(":").map(Number);
      end.setHours(outH || 12, outM || 0, 0, 0);
      return {
        checkin: toDatetimeLocal(start),
        checkout: toDatetimeLocal(end),
      };
    }

    if (rentalType === "Buổi") {
      const start = new Date(now);
      if (checkinMode !== "Hiện tại") {
        const [h, m] = hotelPolicies.halfdayIn.split(":").map(Number);
        start.setHours(h || 12, m || 0, 0, 0);
      }
      const end = new Date(start);
      const [outH, outM] = hotelPolicies.halfdayOut.split(":").map(Number);
      end.setHours(outH || 21, outM || 0, 0, 0);
      return {
        checkin: toDatetimeLocal(start),
        checkout: toDatetimeLocal(end),
      };
    }

    // THEO NGÀY: 14h hôm nay -> 12h hôm sau
    const start = new Date(now);
    if (checkinMode !== "Hiện tại") {
      const [h, m] = hotelPolicies.dailyIn.split(":").map(Number);
      start.setHours(h || 14, m || 0, 0, 0);
    }
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    const [outH, outM] = hotelPolicies.dailyOut.split(":").map(Number);
    end.setHours(outH || 12, outM || 0, 0, 0);
    return {
      checkin: toDatetimeLocal(start),
      checkout: toDatetimeLocal(end),
    };
  };

  // 🌟 TÍNH TOÁN GIÁ & PHỤ THU NHẬN SỚM / TRẢ MUỘN THEO GIỜ QUY ĐỊNH
  const calculateDurationAndPriceLogic = (
    checkinStr,
    checkoutStr,
    rentalType,
    roomInfo,
  ) => {
    if (!checkinStr || !checkoutStr) {
      return {
        durationLabel: "0 giờ",
        price: 0,
        earlyWarning: "",
        lateWarning: "",
        earlySurcharge: 0,
        lateSurcharge: 0,
      };
    }

    const checkin = new Date(checkinStr);
    const checkout = new Date(checkoutStr);

    const basePrice = Number(
      roomInfo?.base_price || roomInfo?.daily_price || 200000,
    );
    const overnightPrice =
      Number(roomInfo?.overnight_price) > 0
        ? Number(roomInfo.overnight_price)
        : basePrice;
    const halfDayPrice =
      Number(roomInfo?.half_day_price) > 0
        ? Number(roomInfo.half_day_price)
        : Math.round(basePrice * 0.8);
    const hourlyPrice =
      Number(roomInfo?.hourly_price) > 0
        ? Number(roomInfo.hourly_price)
        : Math.round(basePrice * 0.25);

    const autoSurcharge = roomInfo?.auto_surcharge !== false;
    const surchargeType = roomInfo?.surcharge_type || "tiered";
    const earlyCheckinFee = Number(roomInfo?.early_checkin_fee || hourlyPrice);
    const lateCheckoutFee = Number(roomInfo?.late_checkout_fee || hourlyPrice);
    const earlyTiers = roomInfo?.early_surcharge_tiers || [
      { hours: 1, percent: 10 },
      { hours: 2, percent: 30 },
    ];
    const lateTiers = roomInfo?.late_surcharge_tiers || [
      { hours: 1, percent: 10 },
      { hours: 2, percent: 30 },
    ];

    const computeTierFee = (hours, tiers, baseP) => {
      if (!tiers || tiers.length === 0 || hours <= 0) return 0;
      const sorted = [...tiers].sort(
        (a, b) => Number(a.hours) - Number(b.hours),
      );
      let matchPercent = 0;
      for (const t of sorted) {
        if (hours >= Number(t.hours)) {
          matchPercent = Number(t.percent);
        }
      }
      if (matchPercent === 0 && sorted.length > 0 && hours > 0) {
        matchPercent = Number(sorted[0].percent);
      }
      return Math.round((baseP * matchPercent) / 100);
    };

    let durationLabel = "";
    let roomPrice = 0;
    let earlySurcharge = 0;
    let lateSurcharge = 0;
    let earlyHours = 0;
    let lateHours = 0;
    let earlyWarning = "";
    let lateWarning = "";

    const diffMs = checkout - checkin;
    const totalMinutes = Math.max(0, Math.round(diffMs / (1000 * 60)));
    const diffHours = Math.floor(totalMinutes / 60);
    const remainMins = totalMinutes % 60;

    // 1. THEO GIỜ
    if (rentalType === "Giờ") {
      const billedHours = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60)));
      roomPrice = billedHours * hourlyPrice;

      if (remainMins > 0) {
        durationLabel = `${diffHours} giờ ${remainMins} phút`;
      } else {
        durationLabel = `${diffHours || 1} giờ`;
      }

      return {
        durationLabel,
        price: roomPrice,
        earlyWarning: "",
        lateWarning: "",
        earlySurcharge: 0,
        lateSurcharge: 0,
      };
    }

    // 2. QUA ĐÊM
    if (rentalType === "Đêm") {
      roomPrice = overnightPrice;
      const [stdH, stdM] = hotelPolicies.overnightIn.split(":").map(Number);
      const stdCheckin = new Date(checkin);
      stdCheckin.setHours(stdH || 22, stdM || 0, 0, 0);

      if (checkin < stdCheckin) {
        earlyHours = Math.ceil((stdCheckin - checkin) / (1000 * 60 * 60));
      }

      const [outH, outM] = hotelPolicies.overnightOut.split(":").map(Number);
      const stdCheckout = new Date(checkout);
      stdCheckout.setHours(outH || 12, outM || 0, 0, 0);
      if (checkout > stdCheckout) {
        lateHours = Math.ceil((checkout - stdCheckout) / (1000 * 60 * 60));
      }

      if (autoSurcharge) {
        if (earlyHours > 0) {
          earlySurcharge =
            surchargeType === "tiered"
              ? computeTierFee(earlyHours, earlyTiers, basePrice)
              : earlyHours * earlyCheckinFee;
        }
        if (lateHours > 0) {
          lateSurcharge =
            surchargeType === "tiered"
              ? computeTierFee(lateHours, lateTiers, basePrice)
              : lateHours * lateCheckoutFee;
        }
      }

      if (earlyHours >= 2) {
        earlyWarning = `⚠️ Nhận sớm ${earlyHours}h (trước ${hotelPolicies.overnightIn})`;
      } else if (earlyHours > 0) {
        earlyWarning = `Nhận sớm ${earlyHours}h`;
      }

      if (lateHours >= 2) {
        lateWarning = `⚠️ Trả muộn ${lateHours}h (sau ${hotelPolicies.overnightOut})`;
      } else if (lateHours > 0) {
        lateWarning = `Trả muộn ${lateHours}h`;
      }

      durationLabel = "1 đêm";

      return {
        durationLabel,
        price: roomPrice + earlySurcharge + lateSurcharge,
        earlyWarning,
        lateWarning,
        earlySurcharge,
        lateSurcharge,
      };
    }

    // 3. THEO BUỔI
    if (rentalType === "Buổi") {
      roomPrice = halfDayPrice;
      const [stdH, stdM] = hotelPolicies.halfdayIn.split(":").map(Number);
      const stdCheckin = new Date(checkin);
      stdCheckin.setHours(stdH || 12, stdM || 0, 0, 0);

      if (checkin < stdCheckin) {
        earlyHours = Math.ceil((stdCheckin - checkin) / (1000 * 60 * 60));
      }

      const [outH, outM] = hotelPolicies.halfdayOut.split(":").map(Number);
      const stdCheckout = new Date(checkout);
      stdCheckout.setHours(outH || 21, outM || 0, 0, 0);
      if (checkout > stdCheckout) {
        lateHours = Math.ceil((checkout - stdCheckout) / (1000 * 60 * 60));
      }

      if (autoSurcharge) {
        if (earlyHours > 0) {
          earlySurcharge =
            surchargeType === "tiered"
              ? computeTierFee(earlyHours, earlyTiers, basePrice)
              : earlyHours * earlyCheckinFee;
        }
        if (lateHours > 0) {
          lateSurcharge =
            surchargeType === "tiered"
              ? computeTierFee(lateHours, lateTiers, basePrice)
              : lateHours * lateCheckoutFee;
        }
      }

      if (earlyHours >= 2) {
        earlyWarning = `⚠️ Nhận sớm ${earlyHours}h (trước ${hotelPolicies.halfdayIn})`;
      } else if (earlyHours > 0) {
        earlyWarning = `Nhận sớm ${earlyHours}h`;
      }

      if (lateHours >= 2) {
        lateWarning = `⚠️ Trả muộn ${lateHours}h (sau ${hotelPolicies.halfdayOut})`;
      } else if (lateHours > 0) {
        lateWarning = `Trả muộn ${lateHours}h`;
      }

      durationLabel = "1 buổi";

      return {
        durationLabel,
        price: roomPrice + earlySurcharge + lateSurcharge,
        earlyWarning,
        lateWarning,
        earlySurcharge,
        lateSurcharge,
      };
    }

    // 4. THEO NGÀY
    const days = Math.max(1, Math.round(totalMinutes / (24 * 60)) || 1);
    roomPrice = days * basePrice;

    const [stdH, stdM] = hotelPolicies.dailyIn.split(":").map(Number);
    const stdCheckin = new Date(checkin);
    stdCheckin.setHours(stdH || 14, stdM || 0, 0, 0);

    if (checkin < stdCheckin) {
      earlyHours = Math.ceil((stdCheckin - checkin) / (1000 * 60 * 60));
    }

    const [outH, outM] = hotelPolicies.dailyOut.split(":").map(Number);
    const stdCheckout = new Date(checkout);
    stdCheckout.setHours(outH || 12, outM || 0, 0, 0);
    if (checkout > stdCheckout) {
      lateHours = Math.ceil((checkout - stdCheckout) / (1000 * 60 * 60));
    }

    if (autoSurcharge) {
      if (earlyHours > 0) {
        earlySurcharge =
          surchargeType === "tiered"
            ? computeTierFee(earlyHours, earlyTiers, basePrice)
            : earlyHours * earlyCheckinFee;
      }
      if (lateHours > 0) {
        lateSurcharge =
          surchargeType === "tiered"
            ? computeTierFee(lateHours, lateTiers, basePrice)
            : lateHours * lateCheckoutFee;
      }
    }

    if (earlyHours >= 2) {
      earlyWarning = `⚠️ Nhận sớm ${earlyHours}h (trước ${hotelPolicies.dailyIn})`;
    } else if (earlyHours > 0) {
      earlyWarning = `Nhận sớm ${earlyHours}h`;
    }

    if (lateHours >= 2) {
      lateWarning = `⚠️ Trả muộn ${lateHours}h (sau ${hotelPolicies.dailyOut})`;
    } else if (lateHours > 0) {
      lateWarning = `Trả muộn ${lateHours}h`;
    }

    durationLabel = `${days} ngày`;
    return {
      durationLabel,
      price: roomPrice + earlySurcharge + lateSurcharge,
      earlyWarning,
      lateWarning,
      earlySurcharge,
      lateSurcharge,
    };
  };

  const totalAmount = (bookingData?.rooms || []).reduce(
    (sum, r) => sum + (Number(r.price) || 0),
    0,
  );

  const totalEarlySurcharge = (bookingData?.rooms || []).reduce(
    (sum, r) => sum + (Number(r.early_surcharge) || 0),
    0,
  );
  const totalLateSurcharge = (bookingData?.rooms || []).reduce(
    (sum, r) => sum + (Number(r.late_surcharge) || 0),
    0,
  );

  // ĐỒNG BỘ MẶC ĐỊNH 2 LỚN, 0 TRẺ
  useEffect(() => {
    if (isOpen) {
      const currentAdults = Number(
        bookingData?.guest_count?.adult ??
          bookingData?.adult_total ??
          bookingData?.adults ??
          2,
      );
      const currentChildren = Number(
        bookingData?.guest_count?.children ??
          bookingData?.children_total ??
          bookingData?.children ??
          0,
      );
      setTempGuestCount({
        adult: currentAdults,
        children: currentChildren,
      });

      setBookingData((prev) => ({
        ...prev,
        adult_total: currentAdults,
        adults: currentAdults,
        children_total: currentChildren,
        children: currentChildren,
      }));
    }
  }, [isOpen]);

  // THU ĐỦ 100% TIỀN PHÒNG KHI ĐẶT TẠI QUẦY
  useEffect(() => {
    if (isOpen && totalAmount > 0) {
      setBookingData((prev) => ({
        ...prev,
        customer_paid: totalAmount,
      }));
    }
  }, [isOpen, totalAmount]);

  if (!isOpen) return null;

  const handleAddMoreRoom = () => {
    const available =
      rooms.find(
        (r) =>
          r.status === "available" &&
          !bookingData.rooms.some((item) => item.room_id === r.id),
      ) || rooms[0];

    if (!available) return;

    const { checkin, checkout } = getDefaultDatesForType("Ngày", "Quy định");
    const calc = calculateDurationAndPriceLogic(
      checkin,
      checkout,
      "Ngày",
      available,
    );

    const newItem = {
      room_id: available.id,
      room_number: available.room_number,
      type_name: available.type_name || available.name || "Tiêu chuẩn",
      rental_type: "Ngày",
      checkin_mode: "Quy định",
      checkin_date: checkin,
      checkout_date: checkout,
      duration_label: calc.durationLabel,
      price: calc.price,
      early_warning: calc.earlyWarning,
      late_warning: calc.lateWarning,
      early_surcharge: calc.earlySurcharge,
      late_surcharge: calc.lateSurcharge,
    };

    setBookingData((prev) => {
      const newRooms = [...prev.rooms, newItem];
      const newTotal = newRooms.reduce((s, r) => s + (Number(r.price) || 0), 0);
      return {
        ...prev,
        rooms: newRooms,
        customer_paid: newTotal,
      };
    });
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
      item.early_surcharge = calc.earlySurcharge;
      item.late_surcharge = calc.lateSurcharge;

      updatedRooms[index] = item;
      const newTotal = updatedRooms.reduce(
        (s, r) => s + (Number(r.price) || 0),
        0,
      );

      return {
        ...prev,
        rooms: updatedRooms,
        customer_paid: newTotal,
      };
    });
  };

  const handleExecuteConfirm = (isCheckInNow) => {
    if (isCheckInNow && hasFutureCheckin) {
      alert(
        "⚠️ Ngày nhận phòng là ngày mai hoặc tương lai! Bạn không thể nhận phòng ngay lúc này, vui lòng chọn 'Đặt trước'.",
      );
      return;
    }

    const finalAdult = Number(tempGuestCount.adult ?? 2);
    const finalChildren = Number(tempGuestCount.children ?? 0);

    setBookingData((prev) => ({
      ...prev,
      adult: finalAdult,
      adults: finalAdult,
      adult_total: finalAdult,
      children: finalChildren,
      children_total: finalChildren,
      guest_count: {
        ...(prev.guest_count || {}),
        adult: finalAdult,
        children: finalChildren,
        id_cards: guestStayList.length,
      },
    }));

    if (onConfirmBooking) {
      onConfirmBooking(isCheckInNow);
    }
  };

  return (
    <>
      {/* ─── MODAL CONTAINER CHÍNH ─── */}
      <div className="fixed inset-0 z-[999] flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn font-sans">
        <div className="bg-white rounded-3xl w-full max-w-5xl max-h-[95vh] flex flex-col shadow-2xl border border-gray-200 overflow-visible text-xs text-gray-900 animate-scaleUp my-auto">
          {/* 1. HEADER XANH GOSTAY */}
          <div className="flex justify-between items-center px-6 py-4 bg-[#003580] text-white shadow-xs shrink-0 rounded-t-3xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-white shadow-inner">
                <CalendarCheck size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-base text-white tracking-tight leading-none">
                    Nhận Phòng Trực Tiếp Tại Quầy
                  </h3>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-white/20 text-white border border-white/20">
                    WALK-IN
                  </span>
                </div>
                <p className="text-[11px] text-blue-100/80 font-medium mt-1 leading-none">
                  0% hoa hồng sàn • Tự động phụ thu nhận sớm & trả muộn theo cấu
                  hình khách sạn
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-white/80 hover:text-white rounded-xl hover:bg-white/10 transition cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* 2. BODY */}
          <div className="p-6 space-y-4 overflow-y-auto flex-1 bg-white">
            {/* TÌM KIẾM KHÁCH & SỐ KHÁCH */}
            <div className="flex items-center gap-3 flex-wrap">
              {bookingData.customer_name ? (
                <div className="flex items-center justify-between border border-blue-200 rounded-xl px-3.5 py-2 bg-blue-50/60 shadow-2xs min-w-[160px]">
                  <div className="flex items-center gap-2 font-black text-[#003580]">
                    <User size={14} className="text-[#006ce4]" />
                    <span>{bookingData.customer_name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setBookingData((prev) => ({
                        ...prev,
                        customer_name: "",
                        customer_phone: "",
                      }))
                    }
                    className="text-gray-400 hover:text-rose-600 pl-2.5 font-bold cursor-pointer transition"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="flex items-center border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 focus-within:bg-white focus-within:border-[#003580] shadow-2xs w-80 transition">
                  <Search size={14} className="text-gray-400 mr-2 shrink-0" />
                  <input
                    type="text"
                    value={bookingData.customer_name || ""}
                    onChange={(e) =>
                      setBookingData({
                        ...bookingData,
                        customer_name: e.target.value,
                      })
                    }
                    placeholder="Tìm hoặc nhập tên khách..."
                    className="w-full outline-none text-xs font-semibold text-gray-900 bg-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setIsAddCustomerOpen(true)}
                    className="ml-1 p-1 text-gray-500 hover:text-[#003580] font-bold cursor-pointer transition"
                    title="Thêm hồ sơ khách hàng mới"
                  >
                    <Plus size={16} strokeWidth={2.5} />
                  </button>
                </div>
              )}

              {/* Pill số khách & CCCD */}
              <div
                onClick={() => setIsGuestStayOpen(true)}
                className="flex items-center gap-2 border border-gray-200 rounded-xl px-3.5 py-2 bg-gray-50 hover:bg-blue-50/60 font-bold text-gray-700 cursor-pointer shadow-2xs select-none transition"
              >
                <Users size={14} className="text-[#006ce4]" />
                <span>{tempGuestCount.adult} lớn</span>
                <span className="text-gray-300">|</span>
                <span>👶 {tempGuestCount.children} trẻ</span>
                <span className="text-gray-300">|</span>
                <CreditCard size={13} className="text-gray-500" />
                <span className="font-mono">{guestStayList.length} CCCD</span>
              </div>

              {bookingData.customer_phone && (
                <div className="flex items-center gap-1.5 font-mono font-bold text-[#003580] bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100">
                  <Smartphone size={13} className="text-[#006ce4]" />
                  <span>{bookingData.customer_phone}</span>
                </div>
              )}
            </div>

            {/* BẢNG DANH SÁCH PHÒNG CHỌN */}
            <div className="border border-gray-200 rounded-2xl bg-white shadow-2xs overflow-visible">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 border-b border-gray-200 text-xs font-bold uppercase tracking-wider">
                    <th className="py-3.5 px-3.5 align-middle">Hạng phòng</th>
                    <th className="py-3.5 px-3.5 align-middle">
                      Phòng{" "}
                      <span className="bg-[#003580] text-white px-2 py-0.2 rounded-full text-[10px] font-black">
                        {bookingData.rooms?.length || 0}
                      </span>
                    </th>
                    <th className="py-3.5 px-3.5 align-middle">Hình thức</th>

                    {/* CỘT NHẬN PHÒNG */}
                    <th className="py-3.5 px-3.5 w-[200px] align-middle">
                      <div className="flex items-center gap-1.5">
                        <span>Nhận</span>
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateRoom(0, "checkin_mode", "Hiện tại")
                          }
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-black cursor-pointer transition ${
                            bookingData.rooms[0]?.checkin_mode === "Hiện tại"
                              ? "bg-[#003580] text-white shadow-2xs"
                              : "border border-gray-200 text-gray-600 bg-white hover:bg-gray-100"
                          }`}
                        >
                          Hiện tại
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateRoom(0, "checkin_mode", "Quy định")
                          }
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-black cursor-pointer transition ${
                            bookingData.rooms[0]?.checkin_mode === "Quy định"
                              ? "bg-[#003580] text-white shadow-2xs"
                              : "border border-gray-200 text-gray-600 bg-white hover:bg-gray-100"
                          }`}
                        >
                          Quy định
                        </button>
                      </div>
                    </th>

                    {/* CỘT TRẢ PHÒNG */}
                    <th className="py-3.5 px-3.5 w-[200px] align-middle">
                      Trả phòng
                    </th>
                    <th className="py-3.5 px-3.5 text-center align-middle whitespace-nowrap">
                      Dự kiến
                    </th>
                    <th className="py-3.5 px-3.5 text-right align-middle whitespace-nowrap">
                      Thành tiền
                    </th>
                    <th className="py-3.5 px-2 w-8 text-center align-middle"></th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100 text-xs">
                  {(bookingData.rooms || []).map((item, idx) => (
                    <tr key={idx} className="hover:bg-blue-50/40 transition">
                      {/* 1. Hạng phòng */}
                      <td className="py-3 px-3.5 font-bold text-gray-900 align-middle">
                        {item.type_name}
                      </td>

                      {/* 2. Phòng */}
                      <td className="py-3 px-3.5 align-middle">
                        <select
                          value={item.room_id}
                          onChange={(e) =>
                            handleUpdateRoom(idx, "room_id", e.target.value)
                          }
                          className="border border-gray-200 rounded-xl px-2.5 py-1.5 outline-none font-black text-[#003580] bg-white focus:border-[#003580] cursor-pointer"
                        >
                          {rooms.map((r) => (
                            <option key={r.id} value={r.id}>
                              Phòng {r.room_number}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* 3. Hình thức */}
                      <td className="py-3 px-3.5 align-middle">
                        <select
                          value={item.rental_type}
                          onChange={(e) =>
                            handleUpdateRoom(idx, "rental_type", e.target.value)
                          }
                          className="border border-gray-200 rounded-xl px-2.5 py-1.5 outline-none font-bold text-gray-800 bg-white focus:border-[#003580] cursor-pointer"
                        >
                          <option value="Ngày">Theo ngày</option>
                          <option value="Giờ">Theo giờ</option>
                          <option value="Đêm">Qua đêm</option>
                          <option value="Buổi">Theo buổi</option>
                        </select>
                      </td>

                      {/* 4. Nhận phòng & Cảnh báo */}
                      <td className="py-3 px-3.5 align-middle">
                        <div className="flex flex-col items-start gap-1">
                          <SlimDateTimePicker
                            value={item.checkin_date}
                            onChange={(newVal) =>
                              handleUpdateRoom(idx, "checkin_date", newVal)
                            }
                          />

                          {item.early_warning && (
                            <div className="flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 w-fit animate-fadeIn">
                              <AlertTriangle size={11} className="shrink-0" />
                              <span>{item.early_warning}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 5. Trả phòng & Cảnh báo */}
                      <td className="py-3 px-3.5 align-middle">
                        <div className="flex flex-col items-start gap-1">
                          <SlimDateTimePicker
                            value={item.checkout_date}
                            onChange={(newVal) =>
                              handleUpdateRoom(idx, "checkout_date", newVal)
                            }
                          />

                          {item.late_warning && (
                            <div className="flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 w-fit animate-fadeIn">
                              <AlertTriangle size={11} className="shrink-0" />
                              <span>{item.late_warning}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 6. Dự kiến */}
                      <td className="py-3 px-3.5 text-center align-middle whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-md bg-blue-50 text-[#003580] font-bold border border-blue-100 whitespace-nowrap">
                          {item.duration_label}
                        </span>
                      </td>

                      {/* 7. Thành tiền */}
                      <td className="py-3 px-3.5 font-black text-right text-[#003580] text-sm tabular-nums whitespace-nowrap align-middle">
                        <div>{formatVND(item.price)}</div>
                        {(item.early_surcharge > 0 ||
                          item.late_surcharge > 0) && (
                          <div className="text-[10px] text-amber-700 font-bold font-sans">
                            {item.early_surcharge > 0 &&
                              `+ Sớm: ${formatVND(item.early_surcharge)} `}
                            {item.late_surcharge > 0 &&
                              `+ Trễ: ${formatVND(item.late_surcharge)}`}
                          </div>
                        )}
                      </td>

                      {/* 8. Nút xóa */}
                      <td className="py-3 px-2 text-center align-middle">
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
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* GHI CHÚ & BẢNG THU TIỀN */}
            <div className="flex items-start justify-between gap-6 pt-2 flex-wrap">
              <div className="space-y-3 flex-1 min-w-[280px]">
                <button
                  type="button"
                  onClick={handleAddMoreRoom}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#003580] text-[#003580] font-bold hover:bg-blue-50 cursor-pointer transition shadow-2xs active:scale-95"
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
                    placeholder="Nhập biển số xe, yêu cầu phòng..."
                    className="flex-1 border-b border-gray-300 py-1 outline-none text-gray-800 text-xs focus:border-[#003580] bg-transparent"
                  />
                </div>
              </div>

              {/* BẢNG THU TIỀN */}
              <div className="w-84 space-y-2.5 text-right bg-blue-50/60 p-4 rounded-2xl border border-blue-200">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-gray-700">
                    Tổng tiền phòng:
                  </span>
                  <span className="font-black text-[#0a2540] text-base tabular-nums">
                    {formatVND(totalAmount)}
                  </span>
                </div>

                {(totalEarlySurcharge > 0 || totalLateSurcharge > 0) && (
                  <div className="space-y-1 py-1 border-t border-blue-100 text-[11px]">
                    {totalEarlySurcharge > 0 && (
                      <div className="flex justify-between items-center text-amber-800 font-semibold">
                        <span>Phụ thu nhận sớm:</span>
                        <span className="tabular-nums font-bold">
                          +{formatVND(totalEarlySurcharge)}
                        </span>
                      </div>
                    )}
                    {totalLateSurcharge > 0 && (
                      <div className="flex justify-between items-center text-rose-800 font-semibold">
                        <span>Phụ thu trả muộn:</span>
                        <span className="tabular-nums font-bold">
                          +{formatVND(totalLateSurcharge)}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-between items-center text-xs pt-2 border-t border-blue-200">
                  <span className="font-black text-[#003580] flex items-center gap-1">
                    Thu lúc nhận phòng:
                  </span>
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={
                        bookingData.customer_paid !== undefined
                          ? Number(bookingData.customer_paid).toLocaleString(
                              "vi-VN",
                            )
                          : ""
                      }
                      onChange={(e) => {
                        const rawValue = e.target.value.replace(/\D/g, "");
                        setBookingData({
                          ...bookingData,
                          customer_paid: rawValue ? Number(rawValue) : 0,
                        });
                      }}
                      className="w-28 text-right border-b-2 border-[#003580] py-0.5 outline-none font-black text-[#003580] text-base bg-transparent tabular-nums"
                      placeholder="0"
                    />
                    <span className="font-bold text-[#003580]">₫</span>
                  </div>
                </div>
                <p className="text-[10px] text-gray-500 font-medium">
                  (Quy chuẩn lễ tân: Thu đủ 100% trước khi giao chìa khóa)
                </p>
              </div>
            </div>
          </div>

          {/* 3. FOOTER */}
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/70 flex items-center justify-between shrink-0 rounded-b-3xl">
            <button
              type="button"
              className="text-xs text-gray-500 font-bold hover:text-gray-800 cursor-pointer"
            >
              Thêm tùy chọn
            </button>

            <div className="flex items-center gap-3">
              {hasFutureCheckin && (
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-800 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200 animate-fadeIn">
                  <Lock size={13} className="text-amber-600" />
                  <span>Ngày nhận ở tương lai: Chỉ áp dụng Đặt trước</span>
                </div>
              )}

              {/* NÚT ĐẶT TRƯỚC */}
              <button
                type="button"
                onClick={() => handleExecuteConfirm(false)}
                className={`px-6 py-2.5 font-black rounded-xl text-xs transition cursor-pointer shadow-xs active:scale-95 ${
                  hasFutureCheckin
                    ? "bg-amber-600 hover:bg-amber-700 text-white ring-2 ring-amber-400 ring-offset-1"
                    : "bg-amber-600 hover:bg-amber-700 text-white"
                }`}
              >
                Đặt trước
              </button>

              {/* NÚT NHẬN PHÒNG NGAY */}
              <button
                type="button"
                disabled={hasFutureCheckin}
                onClick={() => handleExecuteConfirm(true)}
                className={`px-6 py-2.5 font-black rounded-xl text-xs transition flex items-center gap-1.5 ${
                  hasFutureCheckin
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed border border-gray-300 opacity-60 shadow-none"
                    : "bg-[#003580] hover:bg-blue-900 text-white shadow-md cursor-pointer active:scale-95"
                }`}
                title={
                  hasFutureCheckin
                    ? "Không thể nhận phòng trước ngày hôm nay. Vui lòng chọn Đặt trước!"
                    : "Xác nhận nhận phòng ngay"
                }
              >
                <CheckCircle2 size={16} />
                <span>Nhận phòng ngay</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── MODAL 1: THÊM KHÁCH HÀNG ─── */}
      {isAddCustomerOpen && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn font-sans">
          <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl border border-gray-200 overflow-hidden text-xs text-gray-900 animate-scaleUp my-auto">
            <div className="flex justify-between items-center px-6 py-4 bg-[#003580] text-white shadow-xs shrink-0">
              <div className="flex items-center gap-2">
                <UserCheck size={18} />
                <h3 className="font-black text-base tracking-tight leading-none text-white">
                  Thêm Mới Hồ Sơ Khách Hàng
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddCustomerOpen(false)}
                className="p-1.5 text-white/80 hover:text-white rounded-xl hover:bg-white/10 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!customerForm.name.trim()) {
                  alert("Vui lòng nhập Tên khách hàng!");
                  return;
                }
                setBookingData((prev) => ({
                  ...prev,
                  customer_name: customerForm.name.trim(),
                  customer_phone: customerForm.phone.trim(),
                }));
                setIsAddCustomerOpen(false);
              }}
              className="p-6 overflow-y-auto flex-1 space-y-4 bg-white"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3.5">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <label className="w-28 text-gray-700 font-bold">
                      Tên khách *
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
                      placeholder="Nhập tên khách hàng..."
                      className="flex-1 p-2.5 border border-gray-200 rounded-xl outline-none font-bold text-gray-900 focus:border-[#003580]"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="w-28 text-gray-700 font-bold">
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
                      className="flex-1 p-2.5 border border-gray-200 rounded-xl outline-none focus:border-[#003580]"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="w-28 text-gray-700 font-bold">
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
                      className="flex-1 p-2.5 border border-gray-200 rounded-xl outline-none focus:border-[#003580]"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="w-28 text-gray-700 font-bold">
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
                      placeholder="Khách quen, VIP..."
                      className="flex-1 p-2.5 border border-gray-200 rounded-xl outline-none focus:border-[#003580]"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="w-28 text-gray-700 font-bold">
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
                      className="flex-1 p-2.5 border border-gray-200 rounded-xl outline-none text-gray-800 bg-white focus:border-[#003580]"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <label className="w-28 text-gray-700 font-bold">
                      Loại khách
                    </label>
                    <div className="flex items-center gap-4 font-bold text-gray-700">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="cust_type"
                          checked={customerForm.type === "personal"}
                          onChange={() =>
                            setCustomerForm({
                              ...customerForm,
                              type: "personal",
                            })
                          }
                          className="accent-[#003580]"
                        />
                        <span>Cá nhân</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="cust_type"
                          checked={customerForm.type === "company"}
                          onChange={() =>
                            setCustomerForm({
                              ...customerForm,
                              type: "company",
                            })
                          }
                          className="accent-[#003580]"
                        />
                        <span>Công ty</span>
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="w-28 text-gray-700 font-bold">
                      Mã số thuế
                    </label>
                    <input
                      value={customerForm.tax_code}
                      onChange={(e) =>
                        setCustomerForm({
                          ...customerForm,
                          tax_code: e.target.value,
                        })
                      }
                      className="flex-1 p-2.5 border border-gray-200 rounded-xl outline-none focus:border-[#003580] font-mono"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="w-28 text-gray-700 font-bold">
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
                      className="flex-1 p-2.5 border border-gray-200 rounded-xl outline-none focus:border-[#003580]"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="w-28 text-gray-700 font-bold">
                      Tỉnh/Thành
                    </label>
                    <input
                      value={customerForm.city}
                      onChange={(e) =>
                        setCustomerForm({
                          ...customerForm,
                          city: e.target.value,
                        })
                      }
                      className="flex-1 p-2.5 border border-gray-200 rounded-xl outline-none focus:border-[#003580]"
                    />
                  </div>
                  <div className="flex items-start gap-3">
                    <label className="w-28 text-gray-700 font-bold pt-2">
                      Ghi chú
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
                      placeholder="Nhập ghi chú..."
                      className="flex-1 p-2.5 border border-gray-200 rounded-xl outline-none focus:border-[#003580]"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-gray-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAddCustomerOpen(false)}
                  className="px-5 py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold rounded-xl cursor-pointer transition"
                >
                  Bỏ qua
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#003580] hover:bg-blue-900 text-white font-black rounded-xl shadow-md cursor-pointer transition active:scale-95"
                >
                  Lưu hồ sơ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: KHÁCH LƯU TRÚ ─── */}
      {isGuestStayOpen && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn font-sans">
          <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl border border-gray-200 overflow-hidden text-xs text-gray-900 animate-scaleUp my-auto">
            <div className="flex justify-between items-center px-6 py-4 bg-[#003580] text-white shadow-xs shrink-0">
              <div className="flex items-center gap-2">
                <Users size={18} />
                <h3 className="font-black text-base tracking-tight leading-none text-white">
                  Khách Lưu Trú •{" "}
                  {bookingData.rooms[0]?.room_number || "Đặt phòng"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsGuestStayOpen(false)}
                className="p-1.5 text-white/80 hover:text-white rounded-xl hover:bg-white/10 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto flex-1 bg-white">
              <div className="flex items-center justify-between p-4 bg-gray-50/70 border border-gray-200 rounded-2xl flex-wrap gap-4">
                <span className="font-black text-[#0a2540] text-xs uppercase tracking-wider">
                  Số lượng khách
                </span>
                <div className="flex items-center gap-6 flex-wrap">
                  <div className="flex items-center gap-2.5">
                    <span className="text-gray-600 font-bold text-xs">
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
                        className="p-2 hover:bg-blue-50 text-gray-700 hover:text-[#003580] cursor-pointer transition"
                      >
                        <Minus size={13} strokeWidth={2.5} />
                      </button>
                      <input
                        type="number"
                        value={tempGuestCount.adult}
                        onChange={(e) =>
                          setTempGuestCount({
                            ...tempGuestCount,
                            adult: Math.max(1, Number(e.target.value)),
                          })
                        }
                        className="w-10 text-center font-black text-[#003580] outline-none tabular-nums"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setTempGuestCount((prev) => ({
                            ...prev,
                            adult: prev.adult + 1,
                          }))
                        }
                        className="p-2 hover:bg-blue-50 text-gray-700 hover:text-[#003580] cursor-pointer transition"
                      >
                        <Plus size={13} strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <span className="text-gray-600 font-bold text-xs">
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
                        className="p-2 hover:bg-blue-50 text-gray-700 hover:text-[#003580] cursor-pointer transition"
                      >
                        <Minus size={13} strokeWidth={2.5} />
                      </button>
                      <input
                        type="number"
                        value={tempGuestCount.children}
                        onChange={(e) =>
                          setTempGuestCount({
                            ...tempGuestCount,
                            children: Math.max(0, Number(e.target.value)),
                          })
                        }
                        className="w-10 text-center font-black text-gray-800 outline-none tabular-nums"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setTempGuestCount((prev) => ({
                            ...prev,
                            children: prev.children + 1,
                          }))
                        }
                        className="p-2 hover:bg-blue-50 text-gray-700 hover:text-[#003580] cursor-pointer transition"
                      >
                        <Plus size={13} strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <span className="font-black text-[#0a2540] text-xs uppercase tracking-wider block">
                    Thông tin chi tiết
                  </span>
                  <span className="text-[11px] text-gray-400">
                    Đã khai báo {guestStayList.length} người
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setGuestStayList([])}
                    className="p-2 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-100 hover:text-rose-600 cursor-pointer transition"
                    title="Làm mới"
                  >
                    <RotateCw size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setGuestDocForm({
                        ...initialGuestDocForm,
                        room_number:
                          bookingData.rooms[0]?.room_number || "P.101",
                        full_name: "",
                      });
                      setIsAddGuestDocOpen(true);
                    }}
                    className="px-4 py-2 bg-[#003580] hover:bg-blue-900 text-white font-bold rounded-xl cursor-pointer flex items-center gap-1.5 shadow-xs transition active:scale-95"
                  >
                    <PlusCircle size={14} />
                    <span>Khai báo CCCD</span>
                  </button>
                </div>
              </div>

              <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 font-bold uppercase tracking-wider border-b border-gray-200">
                      <th className="py-3 px-4">Họ và tên</th>
                      <th className="py-3 px-4">Thông tin cá nhân</th>
                      <th className="py-3 px-4">Phòng</th>
                      <th className="py-3 px-4">Thời gian khai báo</th>
                      <th className="py-3 px-4">Thời gian lưu trú</th>
                    </tr>
                  </thead>
                  <tbody>
                    {guestStayList.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="py-12 text-center text-gray-400 font-medium"
                        >
                          Chưa có thông tin định danh khách lưu trú
                        </td>
                      </tr>
                    ) : (
                      guestStayList.map((g, idx) => (
                        <tr
                          key={idx}
                          className="hover:bg-blue-50/40 transition border-b border-gray-100"
                        >
                          <td className="py-3 px-4 font-bold text-gray-900">
                            {g.full_name}
                          </td>
                          <td className="py-3 px-4 text-gray-600">
                            {g.gender === "male" ? "Nam" : "Nữ"} • {g.id_type}:{" "}
                            <b className="text-[#003580] font-mono font-bold">
                              {g.id_number}
                            </b>
                          </td>
                          <td className="py-3 px-4 font-black text-[#003580]">
                            P.{g.room_number}
                          </td>
                          <td className="py-3 px-4 text-gray-500 font-mono">
                            {g.declaration_time}
                          </td>
                          <td className="py-3 px-4 text-gray-700 font-medium">
                            {g.stay_duration}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50/70 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => {
                  const finalAdult = Number(tempGuestCount.adult ?? 2);
                  const finalChildren = Number(tempGuestCount.children ?? 0);

                  setBookingData((prev) => ({
                    ...prev,
                    adult: finalAdult,
                    adults: finalAdult,
                    adult_total: finalAdult,
                    children: finalChildren,
                    children_total: finalChildren,
                    guest_count: {
                      ...(prev.guest_count || {}),
                      adult: finalAdult,
                      children: finalChildren,
                      id_cards: guestStayList.length,
                    },
                  }));
                  setIsGuestStayOpen(false);
                }}
                className="px-8 py-2.5 bg-[#003580] hover:bg-blue-900 text-white font-black rounded-xl shadow-md cursor-pointer transition active:scale-95"
              >
                Xác nhận số lượng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 3: KHAI BÁO CCCD ─── */}
      {isAddGuestDocOpen && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn font-sans">
          <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl border border-gray-200 overflow-hidden text-xs text-gray-900 animate-scaleUp my-auto">
            <div className="flex justify-between items-center px-6 py-4 bg-[#003580] text-white shadow-xs shrink-0">
              <div className="flex items-center gap-2">
                <CreditCard size={18} />
                <h3 className="font-black text-base tracking-tight leading-none text-white">
                  Khai Báo CCCD Khách Lưu Trú
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddGuestDocOpen(false)}
                className="p-1.5 text-white/80 hover:text-white rounded-xl hover:bg-white/10 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!guestDocForm.full_name.trim())
                  return alert("Vui lòng nhập Họ và tên người lưu trú!");
                const now = new Date();
                const timeStr = `${now.getHours()}:${String(
                  now.getMinutes(),
                ).padStart(2, "0")} ${now.getDate()}/${
                  now.getMonth() + 1
                }/${now.getFullYear()}`;
                const newGuestItem = {
                  ...guestDocForm,
                  declaration_time: timeStr,
                  stay_duration: "1 ngày",
                };
                setGuestStayList((prev) => [...prev, newGuestItem]);
                setIsAddGuestDocOpen(false);
              }}
              className="p-6 overflow-y-auto flex-1 space-y-4 bg-white"
            >
              <div className="flex items-center gap-3">
                <label className="w-24 text-gray-700 font-bold">Phòng *</label>
                <select
                  value={guestDocForm.room_number}
                  onChange={(e) =>
                    setGuestDocForm({
                      ...guestDocForm,
                      room_number: e.target.value,
                    })
                  }
                  className="flex-1 p-2.5 border border-gray-200 rounded-xl outline-none font-black text-[#003580] bg-blue-50/60 focus:bg-white focus:border-[#003580] cursor-pointer"
                >
                  {rooms.map((r) => (
                    <option key={r.id} value={r.room_number}>
                      Phòng {r.room_number} ({r.type_name || "Phòng nghỉ"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3">
                <label className="w-24 text-gray-700 font-bold">
                  Họ và tên *
                </label>
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
                  className="flex-1 p-2.5 border border-gray-200 rounded-xl outline-none font-bold text-gray-900 focus:border-[#003580]"
                />
              </div>

              <div className="flex items-center gap-3">
                <label className="w-24 text-gray-700 font-bold">
                  Giới tính
                </label>
                <div className="flex items-center gap-4 font-bold text-gray-700">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="guest_gender_qb"
                      checked={guestDocForm.gender === "male"}
                      onChange={() =>
                        setGuestDocForm({ ...guestDocForm, gender: "male" })
                      }
                      className="accent-[#003580]"
                    />
                    <span>Nam</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="guest_gender_qb"
                      checked={guestDocForm.gender === "female"}
                      onChange={() =>
                        setGuestDocForm({ ...guestDocForm, gender: "female" })
                      }
                      className="accent-[#003580]"
                    />
                    <span>Nữ</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="w-24 text-gray-700 font-bold">
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
                  className="flex-1 p-2.5 border border-gray-200 rounded-xl outline-none text-gray-800 bg-white focus:border-[#003580]"
                />
              </div>

              <div className="flex items-center gap-3">
                <label className="w-24 text-gray-700 font-bold">
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
                  className="flex-1 p-2.5 border border-gray-200 rounded-xl outline-none bg-white cursor-pointer font-bold focus:border-[#003580]"
                >
                  <option value="Việt Nam">🇻🇳 Việt Nam</option>
                  <option value="Khác">🌍 Quốc gia khác</option>
                </select>
              </div>

              <div className="flex items-center gap-3">
                <label className="w-24 text-gray-700 font-bold">
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
                  className="flex-1 p-2.5 border border-gray-200 rounded-xl outline-none bg-white cursor-pointer font-bold focus:border-[#003580]"
                >
                  <option value="CCCD">CCCD gắn chip</option>
                  <option value="CMND">CMND</option>
                  <option value="Hộ chiếu">Hộ chiếu (Passport)</option>
                </select>
              </div>

              <div className="flex items-center gap-3">
                <label className="w-24 text-gray-700 font-bold">
                  Số giấy tờ *
                </label>
                <input
                  required
                  value={guestDocForm.id_number}
                  onChange={(e) =>
                    setGuestDocForm({
                      ...guestDocForm,
                      id_number: e.target.value,
                    })
                  }
                  placeholder="Nhập số CCCD/Hộ chiếu..."
                  className="flex-1 p-2.5 border border-gray-200 rounded-xl outline-none font-mono font-black text-sm text-[#003580] focus:border-[#003580]"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-gray-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAddGuestDocOpen(false)}
                  className="px-5 py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold rounded-xl cursor-pointer transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#003580] hover:bg-blue-900 text-white font-black rounded-xl shadow-md cursor-pointer transition active:scale-95"
                >
                  Lưu thông tin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
