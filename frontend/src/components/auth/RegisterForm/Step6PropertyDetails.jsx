// src/components/auth/RegisterForm/Step6PropertyDetails.jsx
import React, { useState, useRef, useEffect } from "react";
import { Star, ChevronDown, Search, Sparkles } from "lucide-react";

const TIME_SLOTS = [
  { label: "12:00 SA (00:00)", value: "00:00" },
  { label: "06:00 SA (06:00)", value: "06:00" },
  { label: "08:00 SA (08:00)", value: "08:00" },
  { label: "10:00 SA (10:00)", value: "10:00" },
  { label: "12:00 TRƯA (12:00)", value: "12:00" },
  { label: "02:00 CH (14:00)", value: "14:00" },
  { label: "03:00 CH (15:00)", value: "15:00" },
  { label: "06:00 CH (18:00)", value: "18:00" },
  { label: "11:00 CH (23:00)", value: "23:00" },
  { label: "11:59 CH (23:59)", value: "23:59" },
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
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-11 px-3.5 text-xs font-bold bg-white rounded-xl border border-slate-300 flex items-center justify-between cursor-pointer focus:border-[#006ce4] select-none"
      >
        <span className="text-slate-900">{displayLabel}</span>
        <ChevronDown size={16} className="text-slate-400" />
      </div>

      {isOpen && (
        <div className="absolute top-full mt-2 z-50 left-0 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 space-y-1 animate-fadeIn">
          {TIME_SLOTS.map((slot) => (
            <div
              key={slot.value}
              onClick={() => {
                onChange(slot.value);
                setIsOpen(false);
              }}
              className="p-2 hover:bg-[#e8f2ff] rounded-xl text-xs font-bold text-slate-700 hover:text-[#003580] cursor-pointer"
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

  return (
    <div className="space-y-6 font-sans text-slate-800 animate-fadeIn">
      <div>
        <div className="flex items-center gap-1.5 text-xs font-black text-[#003580] uppercase tracking-wider mb-1">
          <Sparkles size={14} className="text-[#006ce4]" /> Bước 6 / 8: Xếp hạng
          & Quy định chỗ nghỉ
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Quy định nhận phòng & Chính sách hủy
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Các mốc thời gian này sẽ được trình bày trực tiếp tại mục Quy định của
          chỗ nghỉ trên trang khách sạn.
        </p>
      </div>

      {/* XẾP HẠNG SAO */}
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
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

      {/* GIỜ CHECK-IN / CHECK-OUT */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
          <label className="block text-xs font-black text-slate-800">
            Thời gian nhận phòng (Check-in)
          </label>
          <TimePicker
            value={data?.checkInFrom || "14:00"}
            onChange={(val) => onChange({ checkInFrom: val })}
          />
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
          <label className="block text-xs font-black text-slate-800">
            Thời gian trả phòng (Check-out)
          </label>
          <TimePicker
            value={data?.checkOutTo || "12:00"}
            onChange={(val) => onChange({ checkOutTo: val })}
          />
        </div>
      </div>

      {/* CHÍNH SÁCH HỦY PHÒNG */}
      <div className="space-y-3 pt-2 border-t border-slate-100">
        <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
          Chính sách hủy đặt phòng
        </h2>

        <div className="space-y-2.5">
          {[
            {
              hours: 24,
              title: "Miễn phí hủy trước 24 giờ",
              desc: "Khách được hoàn 100% tiền nếu hủy trước ngày nhận phòng 24 tiếng. Sau đó phạt 100%.",
              badge: "Du khách ưa chuộng nhất",
            },
            {
              hours: 72,
              title: "Miễn phí hủy trước 72 giờ (3 ngày)",
              desc: "Khách được hoàn 100% tiền nếu hủy trước 3 ngày. Giúp chỗ nghỉ chủ động sắp xếp phòng.",
            },
            {
              hours: 0,
              title: "Không hoàn tiền (Non-refundable)",
              desc: "Áp dụng phạt 100% tiền phòng ngay khi đơn đặt thành công.",
            },
          ].map((pol) => (
            <label
              key={pol.hours}
              className={`flex items-start gap-3 p-4 rounded-2xl border-2 cursor-pointer transition ${
                cancellationHours === pol.hours
                  ? "border-[#006ce4] bg-[#e8f2ff]/30 shadow-xs"
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
