// src/components/auth/RegisterForm/Step6PropertyDetails.jsx
import React, { useState, useRef, useEffect } from "react";
import {
  Star,
  ChevronDown,
  Sparkles,
  AlertCircle,
  Sun,
  Clock,
  Moon,
  ShieldCheck,
  Info,
} from "lucide-react";

const TIME_SLOTS = [
  { label: "06:00 SA (06:00)", value: "06:00" },
  { label: "07:00 SA (07:00)", value: "07:00" },
  { label: "08:00 SA (08:00)", value: "08:00" },
  { label: "09:00 SA (09:00)", value: "09:00" },
  { label: "10:00 SA (10:00)", value: "10:00" },
  { label: "11:00 SA (11:00)", value: "11:00" },
  { label: "12:00 TRƯA (12:00)", value: "12:00" },
  { label: "01:00 CH (13:00)", value: "13:00" },
  { label: "02:00 CH (14:00)", value: "14:00" },
  { label: "03:00 CH (15:00)", value: "15:00" },
  { label: "04:00 CH (16:00)", value: "16:00" },
  { label: "05:00 CH (17:00)", value: "17:00" },
  { label: "06:00 CH (18:00)", value: "18:00" },
  { label: "07:00 CH (19:00)", value: "19:00" },
  { label: "08:00 CH (20:00)", value: "20:00" },
  { label: "09:00 CH (21:00)", value: "21:00" },
  { label: "10:00 CH (22:00)", value: "22:00" },
  { label: "11:00 CH (23:00)", value: "23:00" },
  { label: "11:59 ĐÊM (23:59)", value: "23:59" },
];

const TimePicker = ({ value, onChange, placeholder = "Chọn giờ" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef(null);

  const currentSlot = TIME_SLOTS.find(
    (s) => s.value === value || s.label === value,
  );
  const displayLabel = currentSlot ? currentSlot.label : value || placeholder;

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative w-full" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-11 px-3 text-xs font-bold bg-white rounded-xl border border-slate-300 flex items-center justify-between cursor-pointer focus:border-[#006ce4] select-none text-left shadow-2xs"
      >
        <span className="text-slate-900 truncate">{displayLabel}</span>
        <ChevronDown size={15} className="text-slate-400 shrink-0 ml-1" />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-1.5 z-50 left-0 w-full sm:w-60 max-h-60 overflow-y-auto bg-white rounded-2xl shadow-2xl border border-slate-200 p-1.5 space-y-1 animate-in fade-in custom-scrollbar">
          {TIME_SLOTS.map((slot) => (
            <div
              key={slot.value}
              onClick={() => {
                onChange(slot.value);
                setIsOpen(false);
              }}
              className={`p-2 rounded-xl text-xs font-bold cursor-pointer transition ${
                value === slot.value
                  ? "bg-[#e8f2ff] text-[#003580]"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              {slot.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const Step6PropertyDetails = ({
  data = {},
  onChange = () => {},
  errors = {},
}) => {
  const starRating = data?.starRating || 3;
  const cancellationHours = Number(data?.cancellation_deadline_hours ?? 24);

  // Mốc giờ theo ngày
  const checkInFrom = data?.checkInFrom || "14:00";
  const checkInTo = data?.checkInTo || "23:59";
  const checkOutTo = data?.checkOutTo || "12:00";

  // Mốc giờ theo giờ
  const hourlyStartTime = data?.hourly_start_time || "07:00";
  const hourlyEndTime = data?.hourly_end_time || "21:00";

  // Mốc giờ qua đêm
  const overnightCheckInTime = data?.overnight_checkin_time || "21:00";
  const overnightCheckOutTime = data?.overnight_checkout_time || "11:00";

  const isInvalidCheckInTime =
    checkInFrom &&
    checkInTo &&
    checkInFrom >= checkInTo &&
    checkInTo !== "23:59";

  return (
    <div className="space-y-6 font-sans text-slate-800 animate-in fade-in">
      <div>
        <div className="flex items-center gap-1.5 text-xs font-black text-[#003580] uppercase tracking-wider mb-1">
          <Sparkles size={14} className="text-[#006ce4]" /> Bước 6 / 8: Xếp hạng
          & Quy định chỗ nghỉ
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Quy định nhận phòng & Chính sách vận hành
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Các mốc thời gian này sẽ được trình bày trực tiếp tại mục Quy định của
          chỗ nghỉ trên trang chi tiết khách sạn và áp dụng vào bộ tìm kiếm thời
          gian thực.
        </p>
      </div>

      {/* 🌟 1. TIÊU CHUẨN XẾP HẠNG SAO */}
      <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
        <label className="block text-xs font-black text-slate-800 uppercase tracking-wider">
          Tiêu chuẩn xếp hạng sao
        </label>
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => onChange({ starRating: star })}
              className="p-1 cursor-pointer transition transform hover:scale-110"
            >
              <Star
                size={30}
                className={
                  starRating >= star
                    ? "text-amber-400 fill-amber-400"
                    : "text-slate-300"
                }
              />
            </button>
          ))}
          <span className="text-xs font-black text-[#003580] ml-2">
            ({starRating} Sao tiêu chuẩn)
          </span>
        </div>
      </div>

      {/* 🌟 2. QUY ĐỊNH KHUNG GIỜ THEO TỪNG HÌNH THỨC THUÊ (CHUẨN GO2JOY) */}
      <div className="space-y-4 pt-1">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
            Thời gian nhận - trả phòng theo từng hình thức
          </h2>
          <span className="text-[11px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">
            Hỗ trợ tìm kiếm thời gian thực 24/7
          </span>
        </div>

        {/* KHỐI 1: THEO NGÀY (TIÊU CHUẨN) */}
        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex items-center gap-2 text-xs font-black text-[#003580]">
            <Sun size={16} className="text-amber-500" />
            <span>1. Lưu trú theo ngày đêm (Tiêu chuẩn)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <span className="block text-[10px] font-bold text-slate-500">
                Nhận phòng từ
              </span>
              <TimePicker
                value={checkInFrom}
                onChange={(val) => onChange({ checkInFrom: val })}
              />
            </div>

            <div className="space-y-1">
              <span className="block text-[10px] font-bold text-slate-500">
                Nhận phòng đến
              </span>
              <TimePicker
                value={checkInTo}
                onChange={(val) => onChange({ checkInTo: val })}
              />
            </div>

            <div className="space-y-1">
              <span className="block text-[10px] font-bold text-slate-500">
                Trả phòng trước
              </span>
              <TimePicker
                value={checkOutTo}
                onChange={(val) => onChange({ checkOutTo: val })}
              />
            </div>
          </div>

          {isInvalidCheckInTime && (
            <div className="flex items-center gap-1 text-[11px] font-bold text-rose-600">
              <AlertCircle size={13} />
              <span>Thời gian "Đến" phải sau thời gian "Từ".</span>
            </div>
          )}

          <p className="text-[10px] text-slate-400">
            Tiêu chuẩn khách sạn: Nhận phòng linh hoạt từ 14:00 đến đêm và trả
            phòng trước 12:00 trưa hôm sau.
          </p>
        </div>

        {/* KHỐI 2: THEO GIỜ */}
        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex items-center gap-2 text-xs font-black text-[#003580]">
            <Clock size={16} className="text-blue-600" />
            <span>2. Khung giờ nhận khách thuê theo giờ (Hourly)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <span className="block text-[10px] font-bold text-slate-500">
                Bắt đầu đón khách từ
              </span>
              <TimePicker
                value={hourlyStartTime}
                onChange={(val) => onChange({ hourly_start_time: val })}
              />
            </div>

            <div className="space-y-1">
              <span className="block text-[10px] font-bold text-slate-500">
                Ngưng nhận khách sau
              </span>
              <TimePicker
                value={hourlyEndTime}
                onChange={(val) => onChange({ hourly_end_time: val })}
              />
            </div>
          </div>

          <p className="text-[10px] text-slate-400">
            Ví dụ: Đón khách từ 07:00 sáng đến 21:00 tối (ngoài khung giờ này
            khách sạn sẽ chỉ nhận khách qua đêm).
          </p>
        </div>

        {/* KHỐI 3: QUA ĐÊM */}
        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex items-center gap-2 text-xs font-black text-[#003580]">
            <Moon size={16} className="text-indigo-600" />
            <span>3. Khung giờ nhận khách thuê qua đêm (Overnight)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <span className="block text-[10px] font-bold text-slate-500">
                Nhận phòng ca tối từ
              </span>
              <TimePicker
                value={overnightCheckInTime}
                onChange={(val) => onChange({ overnight_checkin_time: val })}
              />
            </div>

            <div className="space-y-1">
              <span className="block text-[10px] font-bold text-slate-500">
                Trả phòng trước (sáng hôm sau)
              </span>
              <TimePicker
                value={overnightCheckOutTime}
                onChange={(val) => onChange({ overnight_checkout_time: val })}
              />
            </div>
          </div>

          <p className="text-[10px] text-slate-400">
            Ví dụ: Bắt đầu nhận phòng qua đêm từ 21:00 hoặc 22:00 tối và khách
            trả phòng trước 11:00 trưa hôm sau.
          </p>
        </div>
      </div>

      {/* 🌟 3. CHÍNH SÁCH HỦY PHÒNG */}
      <div className="space-y-3 pt-2 border-t border-slate-100">
        <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
          Chính sách hủy đặt phòng
        </h2>

        <div className="space-y-2.5">
          {[
            {
              hours: 24,
              title: "Miễn phí hủy trước 24 giờ",
              desc: "Khách được hoàn 100% tiền nếu hủy trước giờ nhận phòng 24 tiếng. Sau thời gian này sẽ tính phí phạt theo quy định.",
              badge: "Du khách ưa chuộng nhất",
            },
            {
              hours: 72,
              title: "Miễn phí hủy trước 72 giờ (3 ngày)",
              desc: "Khách được hoàn 100% tiền nếu hủy trước 3 ngày. Giúp chỗ nghỉ chủ động sắp xếp nguồn phòng.",
            },
            {
              hours: 0,
              title: "Không hoàn tiền (Non-refundable)",
              desc: "Áp dụng phạt 100% tiền phòng ngay khi đơn đặt thành công để đảm bảo doanh thu chắc chắn.",
            },
          ].map((pol) => (
            <label
              key={pol.hours}
              className={`flex items-start gap-3 p-4 rounded-2xl border-2 cursor-pointer transition ${
                cancellationHours === pol.hours
                  ? "border-[#006ce4] bg-[#e8f2ff]/40 shadow-xs"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <input
                type="radio"
                name="cancellation_hours"
                checked={cancellationHours === pol.hours}
                onChange={() =>
                  onChange({ cancellation_deadline_hours: pol.hours })
                }
                className="w-4 h-4 mt-0.5 accent-[#006ce4] cursor-pointer"
              />

              <div className="text-xs leading-relaxed flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-black text-slate-900">{pol.title}</span>
                  {pol.badge && (
                    <span className="text-[10px] font-black bg-emerald-600 text-white px-2 py-0.5 rounded">
                      {pol.badge}
                    </span>
                  )}
                </div>
                <p className="text-slate-500 mt-0.5">{pol.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Step6PropertyDetails;
