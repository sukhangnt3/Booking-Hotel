// src/components/auth/RegisterForm/Step6PropertyDetails.jsx
import React, { useState, useRef, useEffect } from "react";
import { Star, ChevronDown, Lightbulb, Search, Check } from "lucide-react";

// ════════════════════════════════════════════════════════════════════════════
// ⏰ BẢNG 24 GIỜ CHUẨN AGODA (HIỂN THỊ AM/PM & MAP RA GIỜ 24H CHO DATABASE)
// ════════════════════════════════════════════════════════════════════════════
const AGODA_TIME_SLOTS = [
  { label: "12:00 AM", value: "00:00" },
  { label: "1:00 AM", value: "01:00" },
  { label: "2:00 AM", value: "02:00" },
  { label: "3:00 AM", value: "03:00" },
  { label: "4:00 AM", value: "04:00" },
  { label: "5:00 AM", value: "05:00" },
  { label: "6:00 AM", value: "06:00" },
  { label: "7:00 AM", value: "07:00" },
  { label: "8:00 AM", value: "08:00" },
  { label: "9:00 AM", value: "09:00" },
  { label: "10:00 AM", value: "10:00" },
  { label: "11:00 AM", value: "11:00" },
  { label: "12:00 PM", value: "12:00" },
  { label: "1:00 PM", value: "13:00" },
  { label: "2:00 PM", value: "14:00" },
  { label: "3:00 PM", value: "15:00" },
  { label: "4:00 PM", value: "16:00" },
  { label: "5:00 PM", value: "17:00" },
  { label: "6:00 PM", value: "18:00" },
  { label: "7:00 PM", value: "19:00" },
  { label: "8:00 PM", value: "20:00" },
  { label: "9:00 PM", value: "21:00" },
  { label: "10:00 PM", value: "22:00" },
  { label: "11:00 PM", value: "23:00" },
];

// ════════════════════════════════════════════════════════════════════════════
// 🔘 COMPONENT BỘ CHỌN GIỜ THÔNG MINH CÓ SEARCH & POPOVER CHUẨN AGODA
// ════════════════════════════════════════════════════════════════════════════
const AgodaTimePicker = ({ value, onChange, placeholder = "Chọn giờ" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const popoverRef = useRef(null);

  // Tìm nhãn hiển thị AM/PM tương ứng
  const currentSlot = AGODA_TIME_SLOTS.find(
    (s) => s.value === value || s.label === value,
  );
  const displayLabel = currentSlot ? currentSlot.label : value || placeholder;

  // Lọc danh sách theo từ khóa tìm kiếm
  const filteredSlots = AGODA_TIME_SLOTS.filter(
    (s) =>
      s.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.value.includes(searchTerm),
  );

  // Đóng popover khi click ra ngoài màn hình
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleSelect = (slot) => {
    onChange(slot.value); // Lưu giờ chuẩn 24h vào Database (VD: "14:00")
    setIsOpen(false);
    setSearchTerm("");
  };

  return (
    <div className="relative w-full" ref={popoverRef}>
      {/* Nút bấm hiển thị (Ô input Agoda) */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full h-11 px-3.5 text-xs font-semibold bg-white rounded-xl border ${
          isOpen ? "border-blue-600 ring-2 ring-blue-100" : "border-slate-300"
        } flex items-center justify-between cursor-pointer transition select-none`}
      >
        <span className={value ? "text-slate-900 font-bold" : "text-slate-400"}>
          {displayLabel}
        </span>
        <ChevronDown
          size={16}
          className={`text-slate-400 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-blue-600" : ""
          }`}
        />
      </div>

      {/* ── HỘP THOẠI POPOVER CÓ MŨI TÊN NHỌN (Y HỆT ẢNH CHỤP AGODA) ── */}
      {isOpen && (
        <div className="absolute top-full mt-2.5 z-50 left-0 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200 p-3 space-y-2 animate-fadeIn">
          {/* Mũi tên nhọn trỏ lên trên */}
          <div className="absolute -top-2 left-6 w-0 h-0 border-x-8 border-x-transparent border-b-8 border-b-white filter drop-shadow-[0_-2px_1px_rgba(0,0,0,0.05)]" />

          {/* Thanh tìm kiếm tròn bo viền xanh: 🔍 Search */}
          <div className="relative">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              autoFocus
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search"
              className="w-full h-9 pl-9 pr-3 text-xs font-medium rounded-full border border-blue-500 bg-blue-50/20 focus:bg-white outline-none"
            />
          </div>

          {/* Danh sách các khung giờ kèm nút Radio tròn */}
          <div className="max-h-56 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
            {filteredSlots.length > 0 ? (
              filteredSlots.map((slot) => {
                const isSelected = currentSlot?.value === slot.value;

                return (
                  <div
                    key={slot.value}
                    onClick={() => handleSelect(slot)}
                    className="p-2 hover:bg-slate-50 rounded-xl flex items-center gap-3 cursor-pointer transition text-xs select-none"
                  >
                    {/* Nút tròn Radio chuẩn ảnh Agoda */}
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition ${
                        isSelected
                          ? "border-blue-600 bg-blue-600 text-white"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      {isSelected && (
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </div>

                    <span
                      className={`text-xs ${
                        isSelected
                          ? "font-bold text-blue-900"
                          : "font-medium text-slate-700"
                      }`}
                    >
                      {slot.label}
                    </span>
                  </div>
                );
              })
            ) : (
              <p className="text-[11px] text-slate-400 text-center py-2">
                Không tìm thấy giờ phù hợp
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// 🏨 BƯỚC 6: THÔNG TIN CHI TIẾT CƠ SỞ LƯU TRÚ
// ════════════════════════════════════════════════════════════════════════════
export const Step6PropertyDetails = ({
  data = {},
  onChange = () => {},
  errors = {},
}) => {
  const hotelName = data?.hotelName || "";
  const starRating = data?.starRating || 3;
  const [hoverStar, setHoverStar] = useState(0);

  const cancellationHours = Number(data?.cancellation_deadline_hours ?? 24);

  const handleNameChange = (e) => {
    const val = e.target.value.slice(0, 50);
    onChange({ hotelName: val });
  };

  const handleStarClick = (rating) => {
    onChange({ starRating: rating });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-7 font-sans text-slate-800 animate-fadeIn">
      {/* ── TIÊU ĐỀ BƯỚC 6 CHUẨN AGODA ── */}
      <div>
        <div className="flex items-center justify-between text-xs text-slate-400 font-bold mb-1">
          <span>Bước 6/8</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Thông tin chi tiết cơ sở lưu trú
        </h1>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          MỤC 1: TÊN CƠ SỞ LƯU TRÚ (CÓ BỘ ĐẾM 0/50)
      ════════════════════════════════════════════════════════════════════════ */}
      <div className="space-y-2">
        <h2 className="text-lg font-bold text-slate-900">Tên cơ sở lưu trú</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          Đây là tên khách hàng sẽ thấy và sử dụng để xác định cơ sở lưu trú của
          quý đối tác. Đừng lo lắng, chúng tôi sẽ tạo các ngôn ngữ khác bằng mẫu
          dịch chuẩn.
        </p>

        <div className="pt-1">
          <input
            type="text"
            value={hotelName}
            onChange={handleNameChange}
            placeholder="Tên cơ sở lưu trú"
            className={`w-full h-12 px-4 text-sm font-semibold rounded-xl border ${
              errors?.hotelName
                ? "border-rose-500 bg-rose-50/20"
                : "border-slate-300"
            } bg-white outline-none focus:border-blue-600 transition`}
          />
          <div className="flex justify-end mt-1 text-[11px] text-slate-400 font-medium">
            <span>{hotelName.length}/50</span>
          </div>
          {errors?.hotelName && (
            <p className="text-xs text-rose-500 mt-1">{errors.hotelName}</p>
          )}
        </div>
      </div>

      <hr className="border-slate-100" />

      {/* ════════════════════════════════════════════════════════════════════════
          MỤC 2: XẾP HẠNG SAO (BỘ CHỌN 5 NGÔI SAO CHUẨN AGODA)
      ════════════════════════════════════════════════════════════════════════ */}
      <div className="space-y-2">
        <h2 className="text-lg font-bold text-slate-900">Xếp hạng sao</h2>
        <p className="text-xs text-slate-500">
          Xếp hạng cơ sở lưu trú của quý đối tác để giúp du khách có kỳ vọng phù
          hợp cho kỳ lưu trú.{" "}
          <span className="text-blue-600 font-bold hover:underline cursor-pointer">
            Bạn cần trợ giúp?
          </span>
        </p>

        <div className="flex items-center gap-2 pt-1">
          {[1, 2, 3, 4, 5].map((star) => {
            const isFilled = (hoverStar || starRating) >= star;

            return (
              <button
                key={star}
                type="button"
                onClick={() => handleStarClick(star)}
                onMouseEnter={() => setHoverStar(star)}
                onMouseLeave={() => setHoverStar(0)}
                className="p-1 cursor-pointer transition transform hover:scale-110"
              >
                <Star
                  size={32}
                  strokeWidth={1.5}
                  className={`${
                    isFilled
                      ? "text-amber-400 fill-amber-400"
                      : "text-slate-300 hover:text-amber-300"
                  } transition-colors`}
                />
              </button>
            );
          })}
          <span className="text-xs font-bold text-slate-700 ml-2">
            ({starRating} Sao)
          </span>
        </div>
      </div>

      <hr className="border-slate-100" />

      {/* ════════════════════════════════════════════════════════════════════════
          MỤC 3: THỜI GIAN NHẬN / TRẢ PHÒNG (CUSTOM TIME PICKER AGODA CHUẨN 100%)
      ════════════════════════════════════════════════════════════════════════ */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-slate-900">
          Thời gian nhận phòng/trả phòng
        </h2>

        {/* Khung 1: Khi nào khách có thể nhận phòng (Từ - Đến) */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
          <label className="block text-xs font-bold text-slate-800">
            Khi nào khách hàng có thể nhận phòng?
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Nhận phòng TỪ */}
            <div>
              <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                Từ
              </label>
              <AgodaTimePicker
                value={data?.checkInFrom || "14:00"}
                onChange={(val) => onChange({ checkInFrom: val })}
                placeholder="Từ"
              />
            </div>

            {/* Nhận phòng ĐẾN */}
            <div>
              <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                Đến
              </label>
              <AgodaTimePicker
                value={data?.checkInTo || "23:00"}
                onChange={(val) => onChange({ checkInTo: val })}
                placeholder="Đến"
              />
            </div>
          </div>
        </div>

        {/* Khung 2: Thời gian khách phải trả phòng */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
          <label className="block text-xs font-bold text-slate-800">
            Thời gian nào khách hàng sẽ phải trả phòng?
          </label>
          <AgodaTimePicker
            value={data?.checkOutTo || "12:00"}
            onChange={(val) => onChange({ checkOutTo: val })}
            placeholder="Trả phòng"
          />
        </div>
      </div>

      <hr className="border-slate-100" />

      {/* ════════════════════════════════════════════════════════════════════════
          MỤC 4: CHÍNH SÁCH HỦY
      ════════════════════════════════════════════════════════════════════════ */}
      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Chính sách hủy</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Chọn một trong số các lựa chọn dưới đây:
          </p>
        </div>

        <div className="space-y-3">
          <label className="flex items-start gap-3 p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 cursor-pointer transition">
            <input
              type="radio"
              name="cancellation_policy"
              checked={cancellationHours === 24}
              onChange={() => onChange({ cancellation_deadline_hours: 24 })}
              className="w-4 h-4 mt-0.5 accent-blue-600 cursor-pointer"
            />
            <div className="text-xs leading-relaxed flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-slate-900">
                  Có thể hoàn tiền, tối đa 1 ngày trước ngày nhận phòng
                </span>
                <span className="text-[10px] font-bold bg-emerald-700 text-white px-2 py-0.5 rounded-md flex items-center gap-1">
                  ▲ Được khách yêu thích nhất
                </span>
              </div>
              <p className="text-slate-500 mt-1">
                Khách có thể hủy cho đến 1 ngày (24 tiếng) trước ngày nhận
                phòng. Hủy phòng trong vòng 24 tiếng trước ngày nhận phòng sẽ
                phải thanh toán phí phạt là 100% tiền đặt phòng.
              </p>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 cursor-pointer transition">
            <input
              type="radio"
              name="cancellation_policy"
              checked={cancellationHours === 72}
              onChange={() => onChange({ cancellation_deadline_hours: 72 })}
              className="w-4 h-4 mt-0.5 accent-blue-600 cursor-pointer"
            />
            <div className="text-xs leading-relaxed flex-1">
              <span className="font-bold text-slate-900 block">
                Có thể hoàn tiền, tối đa 3 ngày trước ngày nhận phòng
              </span>
              <p className="text-slate-500 mt-1">
                Khách có thể hủy cho đến 3 ngày (72 tiếng) trước ngày nhận
                phòng. Hủy phòng trong vòng 72 tiếng trước ngày nhận phòng sẽ
                phải thanh toán phí phạt là 100% tiền đặt phòng.
              </p>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 cursor-pointer transition">
            <input
              type="radio"
              name="cancellation_policy"
              checked={cancellationHours === 0}
              onChange={() => onChange({ cancellation_deadline_hours: 0 })}
              className="w-4 h-4 mt-0.5 accent-blue-600 cursor-pointer"
            />
            <div className="text-xs leading-relaxed flex-1">
              <span className="font-bold text-slate-900 block">
                Không hoàn tiền
              </span>
              <p className="text-slate-500 mt-1">
                Không hủy miễn phí. Áp dụng phí phạt 100% tiền đơn đặt phòng cho
                mọi việc hủy phòng.
              </p>
            </div>
          </label>
        </div>

        <div className="p-3.5 bg-blue-50/80 border border-blue-200/90 rounded-2xl flex items-start gap-2.5 text-xs text-blue-900 leading-relaxed mt-2">
          <div className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
            <Lightbulb size={11} />
          </div>
          <p>
            <strong>Mẹo:</strong> Đừng lo lắng. Quý đối tác có thể thay đổi
            chính sách hủy ngay cả sau khi đăng thông tin cơ sở lưu trú.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Step6PropertyDetails;
