// src/pages/reception/components/ConfirmCheckInModal.jsx
import React, { useMemo, useRef } from "react";
import { X, Calendar, Clock, Sparkles } from "lucide-react";

// Hàm chuẩn hóa ngày giờ về định dạng ISO YYYY-MM-DDTHH:mm an toàn tuyệt đối
const toStandardISO = (dateVal, timeVal, defaultHour = 14, defaultMin = 0) => {
  const pad = (n) => String(n).padStart(2, "0");

  if (!dateVal) {
    const now = new Date();
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(defaultHour)}:${pad(defaultMin)}`;
  }

  let y, m, d;
  let h = defaultHour;
  let min = defaultMin;

  // Nếu là Date object (ví dụ new Date()) -> Lấy trực tiếp giờ và phút thực tế
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

  // Nếu có timeVal truyền vào ghi đè
  if (timeVal) {
    const tm = String(timeVal).match(/(\d{1,2}):(\d{1,2})/);
    if (tm) {
      h = Number(tm[1]);
      min = Number(tm[2]);
    }
  }

  return `${y}-${pad(m)}-${pad(d)}T${pad(h)}:${pad(min)}`;
};

// Format ngày giờ PMS hiển thị: "19 Thg 09, 01:45"
const formatPMSDateTime = (isoStr) => {
  if (!isoStr) return "---";
  const s = String(isoStr).trim();
  const match = s.match(
    /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})[T\s](\d{1,2}):(\d{1,2})/,
  );
  if (match) {
    const day = String(match[3]).padStart(2, "0");
    const month = String(match[2]).padStart(2, "0");
    const hours = String(match[4]).padStart(2, "0");
    const mins = String(match[5]).padStart(2, "0");
    return `${day} Thg ${month}, ${hours}:${mins}`;
  }

  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return String(isoStr);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");
  return `${day} Thg ${month}, ${hours}:${mins}`;
};

// 🌟 BỘ CHỌN NGÀY VÀ GIỜ MỚI: TÁCH RIÊNG KHỐI NGÀY & KHỐI GIỜ, BẤM PHÁT BUNG LỊCH/ĐỒNG HỒ NGAY
function EasyDateTimePicker({ value, onChange }) {
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
    <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white transition border border-gray-200 hover:border-[#003580] shadow-2xs">
      {/* KHỐI 1: BẤM VÀO LÀ BUNG BẢNG LỊCH CHỌN NGÀY */}
      <div
        onClick={triggerDatePicker}
        className="relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-50/50 hover:bg-blue-100/70 text-[#003580] font-bold cursor-pointer transition select-none flex-1 justify-center"
        title="Bấm để chọn Ngày"
      >
        <Calendar size={14} className="text-[#003580] shrink-0" />
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

      {/* KHỐI 2: BẤM VÀO LÀ BUNG BẢNG ĐỒNG HỒ CHỌN GIỜ */}
      <div
        onClick={triggerTimePicker}
        className="relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-gray-800 font-bold cursor-pointer transition select-none flex-1 justify-center"
        title="Bấm để chọn Giờ"
      >
        <Clock size={14} className="text-gray-500 shrink-0" />
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

export default function ConfirmCheckInModal({
  isOpen,
  onClose,
  room,
  rooms = [],
  confirmData,
  setConfirmData,
  onOpenGuestStay,
  onOpenChangeRoom,
}) {
  if (!isOpen || !room) return null;

  const b = room.booking || {};

  const selectableRooms = useMemo(() => {
    const list = [room];
    (rooms || []).forEach((r) => {
      if (
        r.id !== room.id &&
        (r.status === "available" || r.status === "dirty")
      ) {
        list.push(r);
      }
    });
    return list;
  }, [room, rooms]);

  // 🌟 ĐÃ SỬA: LẤY ĐÚNG 100% NGÀY & GIỜ HIỆN TẠI KHI BẤM NÚT "HIỆN TẠI"
  const handleSetModeCurrent = () => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const newIn = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;

    // Giữ khoảng thời gian lưu trú cũ hoặc mặc định 2 tiếng
    const origIn = new Date(confirmData.checkin_time || now);
    const origOut = new Date(confirmData.checkout_time || now);
    const diffMs =
      !isNaN(origIn.getTime()) && !isNaN(origOut.getTime())
        ? Math.max(3600000, origOut.getTime() - origIn.getTime())
        : 7200000;

    const outD = new Date(now.getTime() + diffMs);
    const newOut = `${outD.getFullYear()}-${pad(outD.getMonth() + 1)}-${pad(outD.getDate())}T${pad(outD.getHours())}:${pad(outD.getMinutes())}`;

    setConfirmData((prev) => ({
      ...prev,
      checkin_mode: "Hiện tại",
      checkin_time: newIn,
      checkout_time: newOut,
    }));
  };

  // Chuyển sang Giờ Khách Đặt Trước
  const handleSetModeBooked = () => {
    const bookedIn = toStandardISO(b.checkin_date, b.checkin_time, 14, 0);
    const bookedOut = toStandardISO(b.checkout_date, b.checkout_time, 12, 0);

    setConfirmData((prev) => ({
      ...prev,
      checkin_mode: "Giờ đặt",
      checkin_time: bookedIn,
      checkout_time: bookedOut,
    }));
  };

  const safeInTime = confirmData.checkin_time
    ? toStandardISO(confirmData.checkin_time, null)
    : toStandardISO(b.checkin_date, b.checkin_time, 14, 0);

  const safeOutTime = confirmData.checkout_time
    ? toStandardISO(confirmData.checkout_time, null)
    : toStandardISO(b.checkout_date, b.checkout_time, 12, 0);

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-5 bg-black/50 backdrop-blur-xs font-sans animate-fadeIn">
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl border border-gray-200 overflow-hidden text-xs text-gray-900 animate-scaleUp my-auto">
        {/* HEADER MODAL */}
        <div className="flex justify-between items-center px-6 py-3.5 bg-white border-b border-gray-100">
          <h2 className="font-bold text-base text-gray-900 tracking-tight">
            Phòng nhận
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100 cursor-pointer transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* BẢNG CHỌN PHÒNG & GIỜ NHẬN (CÁC CỘT CÓ WHITESPACE-NOWRAP KHÔNG BỊ RỚT CHỮ) */}
        <div className="p-6 space-y-6">
          <div className="border border-blue-100 rounded-2xl overflow-hidden bg-white shadow-2xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-blue-50/70 text-gray-800 text-xs font-bold border-b border-blue-100">
                  <th className="py-3 px-4 whitespace-nowrap">Hạng phòng</th>
                  <th className="py-3 px-3 whitespace-nowrap">Phòng</th>
                  <th className="py-3 px-3 whitespace-nowrap">
                    Tình trạng phòng
                  </th>
                  <th className="py-3 px-3 min-w-[210px] whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="whitespace-nowrap">Nhận</span>
                      <button
                        type="button"
                        onClick={handleSetModeCurrent}
                        className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold cursor-pointer transition whitespace-nowrap ${
                          confirmData.checkin_mode === "Hiện tại"
                            ? "bg-[#003580] text-white shadow-2xs"
                            : "border border-gray-300 text-gray-600 bg-white hover:bg-gray-50"
                        }`}
                      >
                        Hiện tại
                      </button>
                      <button
                        type="button"
                        onClick={handleSetModeBooked}
                        className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold cursor-pointer transition whitespace-nowrap ${
                          confirmData.checkin_mode === "Giờ đặt"
                            ? "bg-[#003580] text-white shadow-2xs"
                            : "border border-gray-300 text-gray-600 bg-white hover:bg-gray-50"
                        }`}
                      >
                        Giờ đặt
                      </button>
                    </div>
                  </th>
                  <th className="py-3 px-4 min-w-[210px] whitespace-nowrap">
                    Trả
                  </th>
                </tr>
              </thead>
              <tbody className="text-xs">
                <tr>
                  <td className="py-3.5 px-4 font-bold text-gray-900 whitespace-nowrap">
                    {room.type_name || "Phòng Deluxe"}
                  </td>
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    <select
                      value={confirmData.room_number || room.room_number}
                      onChange={(e) => {
                        const targetNum = e.target.value;
                        setConfirmData((prev) => ({
                          ...prev,
                          room_number: targetNum,
                        }));
                      }}
                      className="border border-gray-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-[#003580] bg-white cursor-pointer outline-none hover:border-[#003580]"
                    >
                      {selectableRooms.map((r) => (
                        <option key={r.id} value={r.room_number}>
                          {r.room_number}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full whitespace-nowrap">
                      <Sparkles size={11} className="text-emerald-600" />
                      Sạch
                    </span>
                  </td>

                  <td className="py-3.5 px-3">
                    <EasyDateTimePicker
                      value={safeInTime}
                      onChange={(val) =>
                        setConfirmData((prev) => ({
                          ...prev,
                          checkin_time: val,
                        }))
                      }
                    />
                  </td>

                  <td className="py-3.5 px-4">
                    <EasyDateTimePicker
                      value={safeOutTime}
                      onChange={(val) =>
                        setConfirmData((prev) => ({
                          ...prev,
                          checkout_time: val,
                        }))
                      }
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* CÁC NÚT DƯỚI GÓC PHẢI */}
          <div className="flex justify-end items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                if (onOpenChangeRoom) onOpenChangeRoom(room);
              }}
              className="px-5 py-2 border border-[#003580] text-[#003580] hover:bg-blue-50 rounded-xl text-xs font-bold cursor-pointer transition shadow-2xs whitespace-nowrap"
            >
              Sửa đặt phòng
            </button>
            <button
              type="button"
              onClick={onOpenGuestStay}
              className="px-6 py-2 bg-[#003580] hover:bg-[#00224f] text-white rounded-xl text-xs font-bold cursor-pointer transition shadow-xs active:scale-95 whitespace-nowrap"
            >
              Nhận phòng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
