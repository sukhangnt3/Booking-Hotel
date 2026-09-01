import React, { useState } from "react";
import {
  Clock,
  Coffee,
  Baby,
  Dog,
  Sparkles,
  AlertCircle,
  FileCheck2,
  Plus,
  Trash2,
  ClipboardList,
  Compass,
  Check,
  Tag,
} from "lucide-react";

// DANH MỤC 24+ TIỆN ÍCH ĐẦY ĐỦ CHUẨN RESORT & KHÁCH SẠN
const DEFAULT_AMENITIES_LIST = [
  { id: "wifi", label: "Wi-Fi miễn phí tốc độ cao" },
  { id: "parking", label: "Bãi đỗ xe ô tô tại khách sạn" },
  { id: "24h_front_desk", label: "Lễ tân phục vụ 24/7" },
  { id: "pool_outdoor", label: "Hồ bơi ngoài trời / Vô cực" },
  { id: "pool_indoor", label: "Hồ bơi trong nhà / Nước ấm" },
  { id: "restaurant", label: "Nhà hàng & Khu ẩm thực" },
  { id: "bar", label: "Quầy Bar / Rooftop Lounge" },
  { id: "private_beach", label: "Bãi biển riêng" },
  { id: "spa", label: "Dịch vụ Spa, Massage & Xông hơi" },
  { id: "gym", label: "Phòng tập thể dục / Gym" },
  { id: "elevator", label: "Thang máy di chuyển" },
  { id: "room_service", label: "Dịch vụ phòng (Room Service)" },
  { id: "airport_shuttle", label: "Xe đưa đón sân bay" },
  { id: "shuttle_bus", label: "Xe đưa đón trung tâm theo lịch trình" },
  { id: "luggage_storage", label: "Dịch vụ giữ hành lý" },
  { id: "bbq", label: "Khu vực nướng BBQ ngoài trời" },
  { id: "kids_club", label: "Khu vui chơi trẻ em / Kids Club" },
  { id: "tennis", label: "Sân Tennis" },
  { id: "golf", label: "Sân Golf / Dịch vụ Golf" },
  { id: "conference_room", label: "Phòng họp & Hội nghị" },
  { id: "jacuzzi", label: "Bồn tắm sục Jacuzzi" },
  { id: "ev_charger", label: "Trạm sạc xe điện" },
  { id: "ironing", label: "Dịch vụ giặt ủi" },
  { id: "currency_exchange", label: "Thu đổi ngoại tệ" },
];

export const Step4PoliciesAndOperations = ({
  data = {},
  onChange = () => {},
  errors = {},
}) => {
  const propertyAmenities = data?.propertyAmenities || [];
  const [customAmenityInput, setCustomAmenityInput] = useState("");

  // 1. Quản lý Tiện ích tùy chỉnh thêm mới
  const toggleAmenity = (idOrLabel) => {
    const exists = propertyAmenities.includes(idOrLabel);
    const updated = exists
      ? propertyAmenities.filter((item) => item !== idOrLabel)
      : [...propertyAmenities, idOrLabel];
    onChange({ propertyAmenities: updated });
  };

  const handleAddCustomAmenity = (e) => {
    if (e) e.preventDefault();
    const clean = customAmenityInput.trim();
    if (!clean) return;
    if (!propertyAmenities.includes(clean)) {
      onChange({ propertyAmenities: [...propertyAmenities, clean] });
    }
    setCustomAmenityInput("");
  };

  // 2. Danh sách quy định động
  const policies =
    data?.policies && data?.policies.length > 0
      ? data.policies
      : [
          {
            id: "pol-1",
            title: "Di chuyển",
            content:
              "- Máy bay: Đến sân bay trung tâm cách chỗ nghỉ khoảng 25 phút đi taxi.\n- Tàu cao tốc / Xe khách: Có xe đưa đón tận bến theo yêu cầu.",
          },
          {
            id: "pol-2",
            title: "Hướng dẫn nhận phòng",
            content:
              "- Tất cả khách hàng xuất trình CCCD/Hộ chiếu bản gốc khi làm thủ tục.\n- Khách sạn có thể yêu cầu đặt cọc (Deposit) và hoàn trả khi trả phòng.",
          },
        ];

  // 3. Danh sách trải nghiệm xung quanh động
  const experiences =
    data?.experiences && data?.experiences.length > 0
      ? data.experiences
      : [
          {
            id: "exp-1",
            title: "Khu mua sắm & Chợ đêm",
            content:
              "Cách chỗ nghỉ 500m (5 phút đi bộ), hoạt động sầm uất với hàng trăm gian hàng ẩm thực và quà lưu niệm.",
          },
        ];

  // Xử lý Thêm / Sửa / Xóa Quy định
  const handleAddPolicy = () => {
    const newPolicy = {
      id: `pol-${Date.now()}`,
      title: "",
      content: "",
    };
    onChange({ policies: [...policies, newPolicy] });
  };

  const handleUpdatePolicy = (idx, field, value) => {
    const updated = policies.map((item, i) =>
      i === idx ? { ...item, [field]: value } : item,
    );
    onChange({ policies: updated });
  };

  const handleDeletePolicy = (idx) => {
    const updated = policies.filter((_, i) => i !== idx);
    onChange({ policies: updated });
  };

  // Xử lý Thêm / Sửa / Xóa Trải nghiệm
  const handleAddExperience = () => {
    const newExp = {
      id: `exp-${Date.now()}`,
      title: "",
      content: "",
    };
    onChange({ experiences: [...experiences, newExp] });
  };

  const handleUpdateExperience = (idx, field, value) => {
    const updated = experiences.map((item, i) =>
      i === idx ? { ...item, [field]: value } : item,
    );
    onChange({ experiences: updated });
  };

  const handleDeleteExperience = (idx) => {
    const updated = experiences.filter((_, i) => i !== idx);
    onChange({ experiences: updated });
  };

  return (
    <div className="space-y-8 animate-fadeIn font-sans text-slate-800">
      {/* ── SECTION 1: KHUNG GIỜ & CHÍNH SÁCH HỦY LINH HOẠT ── */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              1. Khung Giờ Nhận / Trả Phòng & Chính Sách Hủy
            </h2>
            <p className="text-xs text-slate-500">
              Chủ cơ sở có thể tự do nhập giờ và soạn chính sách hủy phòng chi
              tiết của riêng mình
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1.5">
              Nhận phòng từ (Check-in from)
            </label>
            <input
              type="text"
              value={data?.checkInFrom || "14:00"}
              onChange={(e) => onChange({ checkInFrom: e.target.value })}
              placeholder="VD: 14:00"
              className="w-full h-11 px-3.5 rounded-xl border border-slate-300 bg-white font-bold outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1.5">
              Nhận phòng đến (Check-in to)
            </label>
            <input
              type="text"
              value={data?.checkInTo || "23:59"}
              onChange={(e) => onChange({ checkInTo: e.target.value })}
              placeholder="VD: 23:59 (hoặc 24/24)"
              className="w-full h-11 px-3.5 rounded-xl border border-slate-300 bg-white font-bold outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1.5">
              Trả phòng từ (Check-out from)
            </label>
            <input
              type="text"
              value={data?.checkOutFrom || "06:00"}
              onChange={(e) => onChange({ checkOutFrom: e.target.value })}
              placeholder="VD: 06:00"
              className="w-full h-11 px-3.5 rounded-xl border border-slate-300 bg-white font-bold outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1.5">
              Trả phòng đến (Check-out to)
            </label>
            <input
              type="text"
              value={data?.checkOutTo || "12:00"}
              onChange={(e) => onChange({ checkOutTo: e.target.value })}
              placeholder="VD: 12:00"
              className="w-full h-11 px-3.5 rounded-xl border border-slate-300 bg-white font-bold outline-none focus:border-blue-600"
            />
          </div>
        </div>

        {/* CHỌN NHANH HOẶC TỰ SOẠN CHÍNH SÁCH HỦY */}
        <div className="space-y-3 pt-2">
          <label className="block text-xs font-bold text-slate-700">
            Chính sách hủy phòng áp dụng cho khách:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
            {[
              { id: "flexible_24h", label: "Linh hoạt (Hủy miễn phí 24h)" },
              { id: "moderate_48h", label: "Vừa phải (Hủy miễn phí 48h)" },
              { id: "strict_7d", label: "Nghiêm ngặt (Hủy trước 7 ngày)" },
              {
                id: "non_refundable",
                label: "Không hoàn tiền (Non-refundable)",
              },
            ].map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => onChange({ cancellationPolicy: item.id })}
                className={`p-3 rounded-xl border text-left font-bold transition cursor-pointer ${
                  (data?.cancellationPolicy || "flexible_24h") === item.id
                    ? "border-blue-600 bg-blue-50 text-blue-900 shadow-xs"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="pt-2">
            <label className="block text-[11px] font-bold text-slate-500 mb-1">
              Ghi chú thêm về quy định hoàn tiền / hủy phòng (Tùy chọn):
            </label>
            <textarea
              rows={2}
              value={data?.customCancellationNote || ""}
              onChange={(e) =>
                onChange({ customCancellationNote: e.target.value })
              }
              placeholder="VD: Vào các dịp Lễ Tết (30/4, 2/9, Tết Âm lịch), không hỗ trợ hoàn tiền khi hủy phòng..."
              className="w-full p-3 rounded-xl border border-slate-300 bg-white text-xs font-medium focus:border-blue-600 outline-none"
            />
          </div>
        </div>
      </div>

      {/* ── SECTION 2: BỮA SÁNG, TRẺ EM & THÚ CƯNG (CÓ GHI CHÚ CHI TIẾT) ── */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Coffee className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              2. Quy Định Bữa Sáng, Trẻ Em & Thú Cưng
            </h2>
            <p className="text-xs text-slate-500">
              Thiết lập quyền lợi ăn uống và mức phụ thu theo độ tuổi
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
          {/* Bữa sáng */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
            <label className="block font-bold text-slate-800 flex items-center gap-1.5">
              <Coffee className="w-4 h-4 text-amber-600" /> Bữa sáng (Breakfast)
            </label>
            <select
              value={data?.hasBreakfast || "free"}
              onChange={(e) => onChange({ hasBreakfast: e.target.value })}
              className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white font-bold outline-none cursor-pointer"
            >
              <option value="free">Đã bao gồm ăn sáng miễn phí</option>
              <option value="surcharge">Có phục vụ (Phụ thu theo suất)</option>
              <option value="no">Không phục vụ bữa sáng</option>
            </select>
            <input
              type="text"
              value={data?.breakfastNote || ""}
              onChange={(e) => onChange({ breakfastNote: e.target.value })}
              placeholder="VD: Buffet quốc tế 150k/suất, floating breakfast..."
              className="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white text-[11px] font-medium outline-none"
            />
          </div>

          {/* Trẻ em */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
            <label className="block font-bold text-slate-800 flex items-center gap-1.5">
              <Baby className="w-4 h-4 text-blue-600" /> Trẻ em & Giường phụ
            </label>
            <select
              value={data?.allowChildren || "yes"}
              onChange={(e) => onChange({ allowChildren: e.target.value })}
              className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white font-bold outline-none cursor-pointer"
            >
              <option value="yes">Chào đón mọi lứa tuổi trẻ em</option>
              <option value="conditional">
                Chỉ nhận trẻ em từ 6 tuổi trở lên
              </option>
              <option value="no">Chỉ dành cho người lớn (Adults only)</option>
            </select>
            <input
              type="text"
              value={data?.childrenNote || ""}
              onChange={(e) => onChange({ childrenNote: e.target.value })}
              placeholder="VD: Dưới 6 tuổi miễn phí, kê thêm giường 300k..."
              className="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white text-[11px] font-medium outline-none"
            />
          </div>

          {/* Thú cưng */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
            <label className="block font-bold text-slate-800 flex items-center gap-1.5">
              <Dog className="w-4 h-4 text-orange-600" /> Thú cưng (Pet
              Friendly)
            </label>
            <select
              value={data?.allowPets || "no"}
              onChange={(e) => onChange({ allowPets: e.target.value })}
              className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white font-bold outline-none cursor-pointer"
            >
              <option value="no">Không cho phép mang thú cưng</option>
              <option value="yes">Cho phép mang theo miễn phí</option>
              <option value="on_request">
                Cho phép có điều kiện / Có phụ phí
              </option>
            </select>
            <input
              type="text"
              value={data?.petsNote || ""}
              onChange={(e) => onChange({ petsNote: e.target.value })}
              placeholder="VD: Chỉ nhận chó mèo dưới 5kg, phụ thu 100k..."
              className="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white text-[11px] font-medium outline-none"
            />
          </div>
        </div>
      </div>

      {/* ── SECTION 3: TIỆN ÍCH CHỖ NGHỈ (24+ MỤC + TỰ THÊM TIỆN ÍCH TÙY CHỌN) ── */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                3. Danh Mục Tiện Ích & Cơ Sở Vật Chất (24+ Mục)
              </h2>
              <p className="text-xs text-slate-500">
                Tích chọn các tiện ích sẵn có hoặc tự gõ thêm tiện ích đặc thù
                của chỗ nghỉ
              </p>
            </div>
          </div>
          <span className="text-xs text-slate-600 font-bold px-3 py-1 bg-slate-100 rounded-full self-start sm:self-auto">
            Đã chọn {propertyAmenities.length} tiện ích
          </span>
        </div>

        {/* LƯỚI TIỆN ÍCH */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {DEFAULT_AMENITIES_LIST.map((amenity) => {
            const isChecked =
              propertyAmenities.includes(amenity.id) ||
              propertyAmenities.includes(amenity.label);
            return (
              <label
                key={amenity.id}
                className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between transition ${
                  isChecked
                    ? "border-blue-600 bg-blue-50/70 font-bold text-blue-900 shadow-2xs"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span className="text-xs leading-snug">{amenity.label}</span>
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleAmenity(amenity.id)}
                  className="w-4 h-4 accent-blue-600 rounded shrink-0 ml-2 cursor-pointer"
                />
              </label>
            );
          })}

          {/* HIỂN THỊ CÁC TIỆN ÍCH DO OWNER TỰ GÕ THÊM */}
          {propertyAmenities
            .filter(
              (item) =>
                !DEFAULT_AMENITIES_LIST.some(
                  (def) => def.id === item || def.label === item,
                ),
            )
            .map((customItem, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl border-2 border-emerald-500 bg-emerald-50 text-emerald-950 font-bold flex items-center justify-between text-xs"
              >
                <span className="truncate">✨ {customItem}</span>
                <button
                  type="button"
                  onClick={() => toggleAmenity(customItem)}
                  className="text-rose-500 hover:text-rose-700 ml-2"
                  title="Xóa tiện ích này"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
        </div>

        {/* Ô TỰ GÕ THÊM TIỆN ÍCH ĐỘC ĐÁO */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center gap-3">
          <div className="flex-1 w-full relative">
            <Tag
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={customAmenityInput}
              onChange={(e) => setCustomAmenityInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddCustomAmenity(e)}
              placeholder="Chỗ nghỉ có tiện ích độc lạ? (VD: Lửa trại bãi biển, Trạm sạc VinFast, Hồ câu cá...)"
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:border-blue-600 outline-none"
            />
          </div>
          <button
            type="button"
            onClick={handleAddCustomAmenity}
            className="w-full sm:w-auto px-5 py-2.5 bg-[#003580] hover:bg-blue-900 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition shadow-sm cursor-pointer shrink-0"
          >
            <Plus size={15} /> Thêm tiện ích
          </button>
        </div>
      </div>

      {/* ── SECTION 4: QUY ĐỊNH CỦA CHỖ NGHỈ (TỰ ĐẶT TIÊU ĐỀ & NỘI DUNG TÙY Ý) ── */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                4. Quy Định Chỗ Nghỉ (Tự do đặt Tiêu đề & Nội dung)
              </h2>
              <p className="text-xs text-slate-500">
                Tự tạo các mục quy định như: *Di chuyển, Lịch Shuttle Bus, Hướng
                dẫn nhận phòng, Đặc quyền VIP...*
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddPolicy}
            className="px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition self-start sm:self-auto cursor-pointer border border-blue-200 shadow-xs"
          >
            <Plus size={15} /> Thêm mục quy định
          </button>
        </div>

        <div className="space-y-4">
          {policies.map((pol, idx) => (
            <div
              key={pol.id || idx}
              className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 relative"
            >
              <div className="flex items-center justify-between gap-3">
                <input
                  type="text"
                  value={pol.title}
                  onChange={(e) =>
                    handleUpdatePolicy(idx, "title", e.target.value)
                  }
                  placeholder={`Tiêu đề mục ${idx + 1} (VD: Di chuyển, Lịch xe đưa đón, Đặc quyền The Level...)`}
                  className="flex-1 bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:border-blue-600 outline-none"
                />

                <button
                  type="button"
                  onClick={() => handleDeletePolicy(idx)}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                  title="Xóa mục này"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <textarea
                rows={3}
                value={pol.content}
                onChange={(e) =>
                  handleUpdatePolicy(idx, "content", e.target.value)
                }
                placeholder="Nhập nội dung chi tiết cho mục này (Có thể gõ gạch đầu dòng - hoặc •)..."
                className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs font-medium text-slate-700 focus:border-blue-600 outline-none leading-relaxed"
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── SECTION 5: TRẢI NGHIỆM PHẢI THỬ (CHỦ NHÀ TỰ TẠO KHU VUI CHƠI XUNG QUANH) ── */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                5. Trải Nghiệm Phải Thử Xung Quanh Chỗ Nghỉ
              </h2>
              <p className="text-xs text-slate-500">
                Giới thiệu các điểm du lịch, ẩm thực, giải trí gần khách sạn
                (VD: *Grand World, Safari, Chợ đêm, Cáp treo...*)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddExperience}
            className="px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition self-start sm:self-auto cursor-pointer border border-blue-200 shadow-xs"
          >
            <Plus size={15} /> Thêm điểm trải nghiệm
          </button>
        </div>

        <div className="space-y-4">
          {experiences.map((exp, idx) => (
            <div
              key={exp.id || idx}
              className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 relative"
            >
              <div className="flex items-center justify-between gap-3">
                <input
                  type="text"
                  value={exp.title}
                  onChange={(e) =>
                    handleUpdateExperience(idx, "title", e.target.value)
                  }
                  placeholder={`Tên địa điểm / Khu vui chơi (VD: Tổ hợp Grand World, Vườn thú Safari, Bãi Sao...)`}
                  className="flex-1 bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:border-blue-600 outline-none"
                />

                <button
                  type="button"
                  onClick={() => handleDeleteExperience(idx)}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                  title="Xóa điểm này"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <textarea
                rows={3}
                value={exp.content}
                onChange={(e) =>
                  handleUpdateExperience(idx, "content", e.target.value)
                }
                placeholder="Mô tả các hoạt động thú vị, khoảng cách từ khách sạn hoặc cách di chuyển đến đây..."
                className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs font-medium text-slate-700 focus:border-blue-600 outline-none leading-relaxed"
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── SECTION 6: ĐIỀU KHOẢN ĐỐI TÁC ── */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <FileCheck2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              6. Cam Kết & Ký Thỏa Thuận Đối Tác
            </h2>
            <p className="text-xs text-slate-500">
              Thủ tục cuối cùng để gửi hồ sơ vào hệ thống thẩm định
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <label className="flex items-start gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-blue-50/30 transition">
            <input
              type="checkbox"
              checked={data?.acceptedTerms || false}
              onChange={(e) => onChange({ acceptedTerms: e.target.checked })}
              className="w-5 h-5 accent-blue-600 rounded mt-0.5 shrink-0 cursor-pointer"
            />
            <div className="text-xs leading-relaxed text-slate-700">
              <span className="font-bold text-slate-900">
                Tôi đồng ý với Quy chế hoạt động sàn TMĐT & Hợp đồng hợp tác OTA
                của GoStay.
              </span>
              <p className="text-slate-500 mt-1">
                Hiểu rõ mức hoa hồng {data?.commissionRate || 18}% chỉ tính trên
                các đơn đặt phòng thành công; cam kết giữ đúng giá phòng và đảm
                bảo tiêu chuẩn phòng đã niêm yết.
              </p>
            </div>
          </label>
          {errors?.acceptedTerms && (
            <p className="text-xs text-red-500 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> {errors.acceptedTerms}
            </p>
          )}

          <label className="flex items-start gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-blue-50/30 transition">
            <input
              type="checkbox"
              checked={data?.confirmedAccuracy || false}
              onChange={(e) =>
                onChange({ confirmedAccuracy: e.target.checked })
              }
              className="w-5 h-5 accent-blue-600 rounded mt-0.5 shrink-0 cursor-pointer"
            />
            <div className="text-xs leading-relaxed text-slate-700">
              <span className="font-bold text-slate-900">
                Tôi cam kết mọi thông tin quy định, số tài khoản ngân hàng và
                hình ảnh cung cấp là hoàn toàn xác thực.
              </span>
            </div>
          </label>
          {errors?.confirmedAccuracy && (
            <p className="text-xs text-red-500 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> {errors.confirmedAccuracy}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Step4PoliciesAndOperations;
