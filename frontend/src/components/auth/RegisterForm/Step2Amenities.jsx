// src/components/auth/RegisterForm/Step2Amenities.jsx
import React, { useMemo } from "react";
import {
  Waves,
  Car,
  Sparkles,
  Flame,
  Wifi,
  Plane,
  Dog,
  Dumbbell,
  Clock,
  Snowflake,
  Utensils,
  Wine,
  ArrowUpDown,
  Shirt,
  Info,
  Check,
  Palmtree,
  CheckSquare,
} from "lucide-react";

export const AMENITIES = [
  { id: "wifi", label: "Wi-Fi miễn phí toàn khuôn viên", icon: Wifi },
  { id: "parking", label: "Bãi đỗ xe ô tô tại chỗ nghỉ", icon: Car },
  { id: "24h_front_desk", label: "Lễ tân phục vụ 24/7", icon: Clock },
  { id: "air_conditioner", label: "Điều hòa máy lạnh", icon: Snowflake },
  { id: "elevator", label: "Thang máy di chuyển", icon: ArrowUpDown },
  { id: "pool_outdoor", label: "Hồ bơi ngoài trời / Vô cực", icon: Waves },
  { id: "pool_indoor", label: "Hồ bơi trong nhà / Nước ấm", icon: Waves },
  { id: "restaurant", label: "Nhà hàng & Khu ẩm thực", icon: Utensils },
  { id: "bar", label: "Quầy Bar / Lounge", icon: Wine },
  { id: "private_beach", label: "Bãi biển riêng", icon: Palmtree },
  { id: "spa", label: "Dịch vụ Spa & Massage", icon: Sparkles },
  { id: "gym", label: "Phòng tập thể dục / Gym", icon: Dumbbell },
  { id: "laundry", label: "Dịch vụ giặt ủi", icon: Shirt },
  { id: "airport_shuttle", label: "Đưa đón sân bay", icon: Plane },
  { id: "pets_allowed", label: "Cho phép mang thú cưng", icon: Dog },
  { id: "sauna", label: "Xông hơi (Sauna)", icon: Flame },
];

const POPULAR_IDS = ["wifi", "parking", "24h_front_desk", "air_conditioner"];

export const Step2Amenities = ({ data = {}, onChange = () => {} }) => {
  const selectedAmenities = useMemo(() => {
    if (Array.isArray(data?.propertyAmenities)) return data.propertyAmenities;
    if (Array.isArray(data?.amenities)) return data.amenities;
    return [];
  }, [data]);

  const toggleAmenity = (id) => {
    const exists = selectedAmenities.includes(id);
    const updated = exists
      ? selectedAmenities.filter((item) => item !== id)
      : [...selectedAmenities, id];

    onChange({
      propertyAmenities: updated,
      amenities: updated,
      property_amenities: updated,
    });
  };

  // Chọn nhanh các tiện ích cơ bản
  const handleSelectPopular = () => {
    const combined = Array.from(
      new Set([...selectedAmenities, ...POPULAR_IDS]),
    );
    onChange({
      propertyAmenities: combined,
      amenities: combined,
      property_amenities: combined,
    });
  };

  // Xóa toàn bộ lựa chọn
  const handleClearAll = () => {
    onChange({
      propertyAmenities: [],
      amenities: [],
      property_amenities: [],
    });
  };

  return (
    <div className="space-y-6 font-sans text-slate-800 animate-in fade-in">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-black text-[#003580] uppercase tracking-wider mb-1">
            <Sparkles size={14} className="text-[#006ce4]" /> Bước 2 / 8: Tiện
            nghi & Cơ sở vật chất
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Cơ sở lưu trú của bạn có những tiện ích gì?
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Đã chọn:{" "}
            <strong className="text-[#006ce4]">
              {selectedAmenities.length}
            </strong>{" "}
            tiện ích.
          </p>
        </div>

        {/* Nút thao tác nhanh */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleSelectPopular}
            className="px-3 py-1.5 bg-[#e8f2ff] hover:bg-blue-100 text-[#003580] text-xs font-bold rounded-xl border border-blue-200 flex items-center gap-1 transition cursor-pointer"
          >
            <CheckSquare size={13} /> Chọn tiện ích cơ bản
          </button>
          {selectedAmenities.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-600 text-xs font-bold rounded-xl border border-rose-200 transition cursor-pointer"
            >
              Xóa chọn
            </button>
          )}
        </div>
      </div>

      {/* LƯỚI DANH MỤC TIỆN ÍCH */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
        {AMENITIES.map((item) => {
          const Icon = item.icon;
          const isSelected = selectedAmenities.includes(item.id);

          return (
            <button
              type="button"
              key={item.id}
              onClick={() => toggleAmenity(item.id)}
              className={`relative h-28 rounded-2xl border-2 p-3 flex flex-col items-center justify-center gap-2 text-center cursor-pointer transition select-none ${
                isSelected
                  ? "border-[#006ce4] bg-[#e8f2ff] text-[#003580] shadow-xs font-bold"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              {isSelected && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#006ce4] text-white flex items-center justify-center shadow-2xs">
                  <Check size={12} strokeWidth={3} />
                </div>
              )}

              <Icon
                size={26}
                strokeWidth={2}
                className={isSelected ? "text-[#006ce4]" : "text-slate-400"}
              />
              <span className="text-[11px] sm:text-xs leading-tight line-clamp-2 px-1">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      <div className="p-4 bg-[#e8f2ff]/80 border border-blue-200 rounded-2xl flex items-start gap-3 text-xs text-[#003580] leading-relaxed">
        <Info size={18} className="text-[#006ce4] shrink-0 mt-0.5" />
        <p>
          Bạn có thể bấm để chọn hoặc bỏ chọn tiện ích tùy thích. Cơ sở lưu trú
          có thể cập nhật thêm tiện ích bất kỳ lúc nào sau khi mở bán tại Trang
          quản trị.
        </p>
      </div>
    </div>
  );
};

export default Step2Amenities;
