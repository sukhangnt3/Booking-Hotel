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

const formatToLocalISO = (date) => {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
};

const formatDisplayDateTime = (isoStr) => {
  if (!isoStr) return "";
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return isoStr;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");
  return `${day}/${month}, ${hours}:${mins}`;
};

const isDateInFuture = (dateStr) => {
  if (!dateStr) return false;
  const checkin = new Date(dateStr);
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return checkin.getTime() > today.getTime();
};

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

  const [isGuestStayOpen, setIsGuestStayOpen] = useState(false);
  const [tempGuestCount, setTempGuestCount] = useState({
    adult: 2,
    children: 0,
  });
  const [guestStayList, setGuestStayList] = useState([]);

  const hasFutureCheckin = (bookingData?.rooms || []).some((r) =>
    isDateInFuture(r.checkin_date),
  );

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

  const getDefaultDatesForType = (rentalType, checkinMode = "Quy định") => {
    const now = new Date();

    if (rentalType === "Giờ") {
      const start = new Date(now);
      const end = new Date(start);
      end.setHours(end.getHours() + 2); // Mặc định thuê 2 tiếng
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

    const diffMs = checkout - checkin;
    const totalMinutes = Math.max(0, Math.round(diffMs / (1000 * 60)));
    const diffHours = Math.floor(totalMinutes / 60);
    const remainMins = totalMinutes % 60;

    if (rentalType === "Giờ") {
      const billedHours = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60)));
      const roomPrice = billedHours * hourlyPrice;

      return {
        durationLabel: `${billedHours} giờ`,
        price: roomPrice,
        earlyWarning: "",
        lateWarning: "",
        earlySurcharge: 0,
        lateSurcharge: 0,
      };
    }

    if (rentalType === "Đêm") {
      return {
        durationLabel: "1 đêm",
        price: overnightPrice,
        earlyWarning: "",
        lateWarning: "",
        earlySurcharge: 0,
        lateSurcharge: 0,
      };
    }

    if (rentalType === "Buổi") {
      return {
        durationLabel: "1 buổi",
        price: halfDayPrice,
        earlyWarning: "",
        lateWarning: "",
        earlySurcharge: 0,
        lateSurcharge: 0,
      };
    }

    const days = Math.max(1, Math.round(totalMinutes / (24 * 60)) || 1);
    return {
      durationLabel: `${days} ngày`,
      price: days * basePrice,
      earlyWarning: "",
      lateWarning: "",
      earlySurcharge: 0,
      lateSurcharge: 0,
    };
  };

  const totalAmount = (bookingData?.rooms || []).reduce(
    (sum, r) => sum + (Number(r.price) || 0),
    0,
  );

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

  // 🌟 GỬI ĐẦY ĐỦ RENTAL_TYPE, SỐ NGƯỜI LỚN & TRẺ EM SANG BACKEND
  const handleExecuteConfirm = (isCheckInNow) => {
    if (isCheckInNow && hasFutureCheckin) {
      alert("⚠️ Ngày nhận phòng là tương lai! Vui lòng chọn 'Đặt trước'.");
      return;
    }

    const finalAdult = Number(tempGuestCount.adult ?? 2);
    const finalChildren = Number(tempGuestCount.children ?? 0);

    const updatedRooms = (bookingData.rooms || []).map((r) => ({
      ...r,
      rental_type: r.rental_type || "Ngày",
    }));

    setBookingData((prev) => ({
      ...prev,
      rooms: updatedRooms,
      adult: finalAdult,
      adults: finalAdult,
      adult_total: finalAdult,
      children: finalChildren,
      children_total: finalChildren,
      guest_count: {
        ...(prev.guest_count || {}),
        adult: finalAdult,
        children: finalChildren,
      },
    }));

    if (onConfirmBooking) {
      onConfirmBooking(isCheckInNow);
    }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-3 sm:p-5 bg-black/65 backdrop-blur-xs animate-fadeIn font-sans">
      <div className="bg-white rounded-3xl w-full max-w-5xl max-h-[95vh] flex flex-col shadow-2xl border border-gray-200 overflow-hidden text-xs text-gray-900 animate-scaleUp my-auto">
        {/* HEADER MODAL */}
        <div className="flex justify-between items-center px-7 py-4.5 bg-[#003580] text-white shadow-xs shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-white shadow-inner">
              <CalendarCheck size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="font-black text-lg text-white tracking-tight leading-none">
                  Nhận Phòng Trực Tiếp Tại Quầy
                </h3>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-white/20 text-white border border-white/20">
                  WALK-IN (0% HOA HỒNG)
                </span>
              </div>
              <p className="text-[11px] text-blue-100/80 font-medium mt-1 leading-none">
                Hỗ trợ thuê theo Giờ, Đêm, Buổi và Ngày
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white rounded-xl hover:bg-white/10 transition cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* BODY */}
        <div className="p-7 space-y-5 overflow-y-auto flex-1 bg-white">
          <div className="flex items-center gap-3.5 flex-wrap">
            <div className="flex items-center border border-gray-200 rounded-xl px-3.5 py-2.5 bg-gray-50 focus-within:bg-white focus-within:border-[#003580] shadow-2xs w-80 transition">
              <Search size={15} className="text-gray-400 mr-2 shrink-0" />
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
            </div>

            <div
              onClick={() => setIsGuestStayOpen(true)}
              className="flex items-center gap-2 border border-gray-200 rounded-xl px-4 py-2.5 bg-gray-50 hover:bg-blue-50/60 font-bold text-gray-700 cursor-pointer shadow-2xs select-none transition"
            >
              <Users size={15} className="text-[#006ce4]" />
              <span>{tempGuestCount.adult} người lớn</span>
              <span className="text-gray-300">|</span>
              <span>{tempGuestCount.children} trẻ em</span>
            </div>

            {bookingData.customer_phone && (
              <div className="flex items-center gap-1.5 font-mono font-bold text-[#003580] bg-blue-50 px-3.5 py-2 rounded-xl border border-blue-100">
                <Smartphone size={14} className="text-[#006ce4]" />
                <span>{bookingData.customer_phone}</span>
              </div>
            )}
          </div>

          {/* BẢNG CHỌN PHÒNG */}
          <div className="border border-gray-200 rounded-2xl bg-white shadow-2xs overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 border-b border-gray-200 text-xs font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Hạng phòng</th>
                  <th className="py-3.5 px-4">Phòng</th>
                  <th className="py-3.5 px-4">Hình thức</th>
                  <th className="py-3.5 px-4">Nhận phòng</th>
                  <th className="py-3.5 px-4">Trả phòng</th>
                  <th className="py-3.5 px-4 text-center">Dự kiến</th>
                  <th className="py-3.5 px-4 text-right">Thành tiền</th>
                  <th className="py-3.5 px-2 w-8 text-center"></th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 text-xs">
                {(bookingData.rooms || []).map((item, idx) => (
                  <tr key={idx} className="hover:bg-blue-50/40 transition">
                    <td className="py-3 px-4 font-bold text-gray-900">
                      {item.type_name}
                    </td>
                    <td className="py-3 px-4">
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
                    <td className="py-3 px-4">
                      <select
                        value={item.rental_type}
                        onChange={(e) =>
                          handleUpdateRoom(idx, "rental_type", e.target.value)
                        }
                        className="border border-gray-200 rounded-xl px-2.5 py-1.5 outline-none font-bold text-gray-800 bg-white focus:border-[#003580] cursor-pointer"
                      >
                        <option value="Ngày">Theo ngày</option>
                        <option value="Giờ">Theo giờ (2 tiếng)</option>
                        <option value="Đêm">Qua đêm</option>
                        <option value="Buổi">Theo buổi</option>
                      </select>
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="datetime-local"
                        value={item.checkin_date}
                        onChange={(e) =>
                          handleUpdateRoom(idx, "checkin_date", e.target.value)
                        }
                        className="border border-gray-200 rounded-xl px-2.5 py-1.5 outline-none font-bold text-gray-800 bg-white focus:border-[#003580]"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="datetime-local"
                        value={item.checkout_date}
                        onChange={(e) =>
                          handleUpdateRoom(idx, "checkout_date", e.target.value)
                        }
                        className="border border-gray-200 rounded-xl px-2.5 py-1.5 outline-none font-bold text-gray-800 bg-white focus:border-[#003580]"
                      />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2.5 py-1 rounded-md bg-blue-50 text-[#003580] font-bold border border-blue-100">
                        {item.duration_label}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-black text-right text-[#003580] text-sm tabular-nums">
                      {formatVND(item.price)}
                    </td>
                    <td className="py-3 px-2 text-center">
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
            <button
              type="button"
              onClick={handleAddMoreRoom}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#003580] text-[#003580] font-bold hover:bg-blue-50 cursor-pointer transition shadow-2xs"
            >
              <PlusCircle size={15} />
              <span>Chọn thêm phòng</span>
            </button>

            <div className="w-80 space-y-2.5 text-right bg-blue-50/60 p-4 rounded-2xl border border-blue-200">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-gray-700">
                  Tổng tiền phòng:
                </span>
                <span className="font-black text-[#0a2540] text-base tabular-nums">
                  {formatVND(totalAmount)}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs pt-2 border-t border-blue-200">
                <span className="font-black text-[#003580]">
                  Thu lúc nhận phòng:
                </span>
                <span className="font-black text-base text-[#003580] tabular-nums">
                  {formatVND(totalAmount)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="px-7 py-4.5 border-t border-gray-100 bg-gray-50/80 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={() => handleExecuteConfirm(false)}
            className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-black rounded-xl text-xs transition cursor-pointer shadow-xs active:scale-95"
          >
            Đặt trước
          </button>

          <button
            type="button"
            disabled={hasFutureCheckin}
            onClick={() => handleExecuteConfirm(true)}
            className={`px-7 py-2.5 font-black rounded-xl text-xs transition flex items-center gap-2 ${
              hasFutureCheckin
                ? "bg-gray-200 text-gray-400 cursor-not-allowed border border-gray-300 opacity-60"
                : "bg-[#003580] hover:bg-blue-900 text-white shadow-md cursor-pointer active:scale-95"
            }`}
          >
            <CheckCircle2 size={16} />
            <span>Nhận phòng ngay</span>
          </button>
        </div>
      </div>
    </div>
  );
}
