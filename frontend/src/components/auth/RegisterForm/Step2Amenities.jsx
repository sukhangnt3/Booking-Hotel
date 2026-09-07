// src/components/auth/RegisterForm/Step2Amenities.jsx
import React from "react";
import {
  Waves,
  Car,
  Sparkles,
  Flame,
  CigaretteOff,
  Wifi,
  Plane,
  Dog,
  Dumbbell,
  Cigarette,
  Clock,
  Snowflake,
  Utensils,
  Wine,
  ArrowUpDown,
  Shirt,
  Info,
  Check,
} from "lucide-react";

// 👉 DANH MỤC TIỆN NGHI KÈM ICON CHUẨN AGODA (Khớp 100% ảnh chụp)
export const AGODA_AMENITIES = [
  { id: "pool_outdoor", label: "Bể Bơi", icon: Waves },
  { id: "parking", label: "Bãi để xe", icon: Car },
  { id: "spa", label: "Spa & Massage", icon: Sparkles },
  { id: "sauna", label: "Xông khô (Sauna)", icon: Flame },
  { id: "non_smoking", label: "Không hút thuốc", icon: CigaretteOff },
  { id: "wifi", label: "Wi-Fi [miễn phí]", icon: Wifi },
  { id: "airport_shuttle", label: "Đưa đón sân bay", icon: Plane },
  { id: "pets_allowed", label: "Được phép đưa thú nuôi vào", icon: Dog },
  { id: "gym", label: "Phòng tập (Gym)", icon: Dumbbell },
  { id: "smoking_area", label: "Khu vực hút thuốc", icon: Cigarette },
  { id: "24h_front_desk", label: "Bàn tiếp tân [24 giờ]", icon: Clock },
  { id: "air_conditioner", label: "Máy điều hòa", icon: Snowflake },
  { id: "restaurant", label: "Nhà hàng & Ẩm thực", icon: Utensils },
  { id: "bar", label: "Quầy Bar / Lounge", icon: Wine },
  { id: "elevator", label: "Thang máy di chuyển", icon: ArrowUpDown },
  { id: "laundry", label: "Dịch vụ giặt ủi", icon: Shirt },
];

export const Step2Amenities = ({ data = {}, onChange = () => {} }) => {
  const selectedAmenities = data?.propertyAmenities || [
    "wifi",
    "parking",
    "24h_front_desk",
  ];

  const toggleAmenity = (id) => {
    const exists = selectedAmenities.includes(id);
    const updated = exists
      ? selectedAmenities.filter((item) => item !== id)
      : [...selectedAmenities, id];
    onChange({ propertyAmenities: updated });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 font-sans text-slate-800 animate-fadeIn">
      {/* ── TIÊU ĐỀ AGODA STYLE ── */}
      <div>
        <div className="flex items-center justify-between text-xs text-slate-400 font-bold mb-1">
          <span>Bước 2/5</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Tiện nghi
        </h1>
      </div>

      {/* ── PHỤ ĐỀ ── */}
      <div>
        <h2 className="text-lg font-bold text-slate-900">
          Những điều khách yêu thích
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Du khách ưu tiên các tiện nghi này khi đặt phòng lưu trú
        </p>
      </div>

      {/* ── LƯỚI THẺ TIỆN NGHI 4 CỘT (GIỐNG HỆT ẢNH CHỤP AGODA) ── */}
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
                  ? "border-blue-600 bg-blue-50/50 text-blue-900 shadow-sm"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              {/* Icon tích xanh khi được chọn */}
              {isSelected && (
                <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs">
                  <Check size={11} strokeWidth={3} />
                </div>
              )}

              <Icon
                size={28}
                strokeWidth={1.75}
                className={isSelected ? "text-blue-600" : "text-slate-600"}
              />
              <span className="text-xs font-semibold leading-tight line-clamp-2 px-1">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* ── HỘP THÔNG BÁO XANH DƯƠNG DƯỚI NÚT (CHUẨN AGODA 100%) ── */}
      <div className="p-4 bg-blue-50/80 border border-blue-200/80 rounded-2xl flex items-start gap-3 text-xs text-blue-900 leading-relaxed">
        <Info size={18} className="text-blue-600 shrink-0 mt-0.5" />
        <p>
          Những cơ sở lưu trú có nhiều tiện nghi hơn thường nhận được nhiều lượt
          xem hơn. Quý đối tác có thể bổ sung thêm tiện ích chi tiết vào trang
          quản trị sau khi cơ sở đi vào hoạt động.
        </p>
      </div>
    </div>
  );
};

export default Step2Amenities;
