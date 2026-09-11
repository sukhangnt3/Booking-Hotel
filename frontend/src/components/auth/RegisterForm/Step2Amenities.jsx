// src/components/auth/RegisterForm/Step2Amenities.jsx
import React from "react";
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
  ShieldAlert,
} from "lucide-react";

export const AGODA_AMENITIES = [
  { id: "wifi", label: "Wi-Fi miễn phí toàn khuôn viên", icon: Wifi },
  { id: "parking", label: "Bãi đỗ xe ô tô tại chỗ nghỉ", icon: Car },
  { id: "24h_front_desk", label: "Lễ tân phục vụ 24/7", icon: Clock },
  { id: "pool_outdoor", label: "Hồ bơi ngoài trời / Vô cực", icon: Waves },
  { id: "pool_indoor", label: "Hồ bơi trong nhà / Nước ấm", icon: Waves },
  { id: "restaurant", label: "Nhà hàng & Khu ẩm thực", icon: Utensils },
  { id: "bar", label: "Quầy Bar / Lounge", icon: Wine },
  { id: "private_beach", label: "Bãi biển riêng", icon: Palmtree },
  { id: "spa", label: "Dịch vụ Spa & Massage", icon: Sparkles },
  { id: "gym", label: "Phòng tập thể dục / Gym", icon: Dumbbell },
  { id: "elevator", label: "Thang máy di chuyển", icon: ArrowUpDown },
  { id: "air_conditioner", label: "Điều hòa máy lạnh", icon: Snowflake },
  { id: "laundry", label: "Dịch vụ giặt ủi", icon: Shirt },
  { id: "airport_shuttle", label: "Đưa đón sân bay", icon: Plane },
  { id: "pets_allowed", label: "Cho phép mang thú cưng", icon: Dog },
  { id: "sauna", label: "Xông hơi (Sauna)", icon: Flame },
];

export const Step2Amenities = ({ data = {}, onChange = () => {} }) => {
  const selectedAmenities = data?.propertyAmenities || [
    "wifi",
    "parking",
    "24h_front_desk",
    "elevator",
  ];

  const toggleAmenity = (id) => {
    const exists = selectedAmenities.includes(id);
    const updated = exists
      ? selectedAmenities.filter((item) => item !== id)
      : [...selectedAmenities, id];
    onChange({ propertyAmenities: updated });
  };

  return (
    <div className="space-y-6 font-sans text-slate-800 animate-fadeIn">
      <div>
        <div className="flex items-center gap-1.5 text-xs font-black text-[#003580] uppercase tracking-wider mb-1">
          <Sparkles size={14} className="text-[#006ce4]" /> Bước 2 / 8: Tiện
          nghi & Cơ sở vật chất
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Cơ sở lưu trú của bạn có những tiện ích gì?
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Các tiện nghi này sẽ được đối soát tự động và hiển thị ở mục Tiện ích
          trên trang chi tiết khách sạn.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
        {AGODA_AMENITIES.map((item) => {
          const Icon = item.icon;
          const isSelected = selectedAmenities.includes(item.id);

          return (
            <div
              key={item.id}
              onClick={() => toggleAmenity(item.id)}
              className={`relative h-28 rounded-2xl border-2 p-3 flex flex-col items-center justify-center gap-2 text-center cursor-pointer transition-all duration-200 select-none ${
                isSelected
                  ? "border-[#006ce4] bg-[#e8f2ff] text-[#003580] shadow-sm font-bold"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              {isSelected && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#006ce4] text-white flex items-center justify-center shadow-xs">
                  <Check size={12} strokeWidth={3} />
                </div>
              )}

              <Icon
                size={26}
                strokeWidth={2}
                className={isSelected ? "text-[#006ce4]" : "text-slate-500"}
              />
              <span className="text-[11px] sm:text-xs leading-tight line-clamp-2 px-1">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="p-4 bg-[#e8f2ff]/80 border border-blue-200 rounded-2xl flex items-start gap-3 text-xs text-[#003580] leading-relaxed">
        <Info size={18} className="text-[#006ce4] shrink-0 mt-0.5" />
        <p>
          Chỗ nghỉ cung cấp đầy đủ thông tin tiện nghi chất lượng cao thường
          nhận được nhiều lượt đặt phòng hơn 40%. Bạn có thể thay đổi hoặc thêm
          tiện nghi bất kỳ lúc nào tại Trang quản trị.
        </p>
      </div>
    </div>
  );
};

export default Step2Amenities;
