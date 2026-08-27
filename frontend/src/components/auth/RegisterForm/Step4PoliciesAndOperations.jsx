import React from "react";
import {
  Clock,
  Coffee,
  Baby,
  Dog,
  Sparkles,
  AlertCircle,
  FileCheck2,
} from "lucide-react";

// DANH SÁCH TIỆN ÍCH KHÁCH SẠN THẬT
const PROPERTY_AMENITIES_LIST = [
  { id: "wifi", label: "Wi-Fi miễn phí toàn khuôn viên" },
  { id: "pool", label: "Hồ bơi ngoài trời / Vô cực" },
  { id: "parking", label: "Bãi đỗ xe ô tô miễn phí" },
  { id: "restaurant", label: "Nhà hàng & Quầy Bar" },
  { id: "24h_front_desk", label: "Lễ tân phục vụ 24/7" },
  { id: "elevator", label: "Thang máy di chuyển" },
  { id: "gym", label: "Phòng tập thể dục / Gym" },
  { id: "spa", label: "Dịch vụ Spa & Massage" },
  { id: "airport_shuttle", label: "Xe đưa đón sân bay" },
  { id: "luggage_storage", label: "Giữ hành lý miễn phí" },
  { id: "room_service", label: "Dịch vụ phòng (Room Service)" },
  { id: "pet_friendly", label: "Cho phép mang thú cưng" },
];

export const Step4PoliciesAndOperations = ({
  data = {},
  onChange = () => {},
  errors = {},
}) => {
  // Lấy mảng an toàn để không bị sập trang
  const propertyAmenities = data?.propertyAmenities || [];

  const toggleAmenity = (id) => {
    const exists = propertyAmenities.includes(id);
    const updated = exists
      ? propertyAmenities.filter((item) => item !== id)
      : [...propertyAmenities, id];
    onChange({ propertyAmenities: updated });
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* SECTION 1: THỜI GIAN NHẬN / TRẢ PHÒNG & CHÍNH SÁCH HỦY */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              1. Quy định Khung Giờ & Chính sách Hủy phòng
            </h2>
            <p className="text-xs text-slate-500">
              Thiết lập khung giờ đón khách và quy định hoàn tiền khi hủy phòng
            </p>
          </div>
        </div>

        {errors?.checkTimes && (
          <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
            {errors.checkTimes}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
              Nhận phòng từ (Check-in from)
            </label>
            <select
              value={data?.checkInFrom || "14:00"}
              onChange={(e) => onChange({ checkInFrom: e.target.value })}
              className="w-full h-11 px-4 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 focus:border-blue-600 outline-none font-medium cursor-pointer"
            >
              <option value="12:00">12:00 trưa</option>
              <option value="13:00">13:00</option>
              <option value="14:00">14:00 (Tiêu chuẩn quốc tế)</option>
              <option value="15:00">15:00</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
              Nhận phòng đến (Check-in to)
            </label>
            <select
              value={data?.checkInTo || "23:59"}
              onChange={(e) => onChange({ checkInTo: e.target.value })}
              className="w-full h-11 px-4 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 focus:border-blue-600 outline-none font-medium cursor-pointer"
            >
              <option value="22:00">22:00</option>
              <option value="23:00">23:00</option>
              <option value="23:59">23:59 (Suốt đêm / Lễ tân 24/7)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
              Trả phòng từ (Check-out from)
            </label>
            <select
              value={data?.checkOutFrom || "06:00"}
              onChange={(e) => onChange({ checkOutFrom: e.target.value })}
              className="w-full h-11 px-4 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 focus:border-blue-600 outline-none font-medium cursor-pointer"
            >
              <option value="06:00">06:00 sáng</option>
              <option value="07:00">07:00 sáng</option>
              <option value="08:00">08:00 sáng</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
              Trả phòng đến (Check-out to)
            </label>
            <select
              value={data?.checkOutTo || "12:00"}
              onChange={(e) => onChange({ checkOutTo: e.target.value })}
              className="w-full h-11 px-4 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 focus:border-blue-600 outline-none font-medium cursor-pointer"
            >
              <option value="11:00">11:00 trưa</option>
              <option value="12:00">12:00 trưa (Tiêu chuẩn quốc tế)</option>
              <option value="13:00">13:00</option>
            </select>
          </div>
        </div>

        {/* CANCELLATION POLICY OPTIONS */}
        <div className="pt-2">
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
            Chính sách Hủy phòng áp dụng cho khách hàng:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              {
                id: "flexible_24h",
                title: "Linh hoạt (24 Giờ)",
                desc: "Khách được hủy miễn phí trước 24 giờ nhận phòng. Hủy muộn tính phí đêm đầu.",
                badge: "Tăng lượt đặt phòng",
              },
              {
                id: "moderate_48h",
                title: "Vừa phải (48 Giờ)",
                desc: "Khách được hủy miễn phí trước 48 giờ. Phù hợp đa số khách sạn boutique.",
                badge: "Cân bằng",
              },
              {
                id: "strict_7d",
                title: "Nghiêm ngặt (7 Ngày)",
                desc: "Khách chỉ được hủy miễn phí trước ngày nhận phòng 7 ngày.",
                badge: "Dành cho Villa/Resort",
              },
              {
                id: "non_refundable",
                title: "Không hoàn tiền (Non-Refundable)",
                desc: "Khách thanh toán 100% khi đặt, không hỗ trợ hoàn tiền khi hủy.",
                badge: "Giá khuyến mãi",
              },
            ].map((item) => {
              const isSelected =
                (data?.cancellationPolicy || "flexible_24h") === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => onChange({ cancellationPolicy: item.id })}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition ${
                    isSelected
                      ? "border-blue-600 bg-blue-50/40 shadow-2xs"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-slate-900">
                      {item.title}
                    </span>
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                      {item.badge}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* SECTION 2: BỮA SÁNG & TRẺ EM & THÚ CƯNG */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Coffee className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              2. Bữa sáng, Trẻ em & Thú cưng
            </h2>
            <p className="text-xs text-slate-500">
              Thông tin gia tăng trải nghiệm và tránh phát sinh khiếu nại
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <Coffee className="w-3.5 h-3.5 text-amber-600" /> Bữa sáng
              (Breakfast)
            </label>
            <select
              value={data?.hasBreakfast || "free"}
              onChange={(e) => onChange({ hasBreakfast: e.target.value })}
              className="w-full h-11 px-4 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 focus:border-blue-600 outline-none font-medium cursor-pointer"
            >
              <option value="free">Đã bao gồm bữa sáng miễn phí</option>
              <option value="surcharge">Có phục vụ (Phụ thu theo suất)</option>
              <option value="no">Không phục vụ bữa sáng</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <Baby className="w-3.5 h-3.5 text-blue-600" /> Trẻ em & Giường phụ
            </label>
            <select
              value={data?.allowChildren || "yes"}
              onChange={(e) => onChange({ allowChildren: e.target.value })}
              className="w-full h-11 px-4 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 focus:border-blue-600 outline-none font-medium cursor-pointer"
            >
              <option value="yes">Chào đón mọi lứa tuổi trẻ em</option>
              <option value="conditional">
                Chỉ nhận trẻ em từ 6 tuổi trở lên
              </option>
              <option value="no">Chỉ dành cho người lớn (Adults only)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <Dog className="w-3.5 h-3.5 text-orange-600" /> Thú cưng (Pet
              Friendly)
            </label>
            <select
              value={data?.allowPets || "no"}
              onChange={(e) => onChange({ allowPets: e.target.value })}
              className="w-full h-11 px-4 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 focus:border-blue-600 outline-none font-medium cursor-pointer"
            >
              <option value="no">Không cho phép mang thú cưng</option>
              <option value="yes">Cho phép mang theo miễn phí</option>
              <option value="on_request">
                Cho phép có điều kiện / Có phụ phí
              </option>
            </select>
          </div>
        </div>
      </div>

      {/* SECTION 3: TIỆN ÍCH CHỖ NGHỈ TOÀN DIỆN */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                3. Danh mục Tiện ích & Dịch vụ Chung
              </h2>
              <p className="text-xs text-slate-500">
                Tích chọn các tiện ích có sẵn tại cơ sở để tăng điểm SEO tìm
                kiếm
              </p>
            </div>
          </div>
          <span className="text-xs text-slate-500 font-bold px-3 py-1 bg-slate-100 rounded-full">
            Đã chọn {propertyAmenities.length} tiện ích
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {PROPERTY_AMENITIES_LIST.map((amenity) => {
            const isChecked = propertyAmenities.includes(amenity.id);
            return (
              <label
                key={amenity.id}
                className={`p-3.5 rounded-xl border cursor-pointer flex items-center justify-between transition ${
                  isChecked
                    ? "border-blue-600 bg-blue-50/60 font-bold text-blue-900"
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
        </div>
      </div>

      {/* SECTION 4: ĐIỀU KHOẢN ĐỐI TÁC & CAM KẾT PHÁP LÝ */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <FileCheck2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              4. Cam kết & Ký Thỏa thuận Đối tác
            </h2>
            <p className="text-xs text-slate-500">
              Thủ tục cuối cùng để gửi hồ sơ vào hệ thống thẩm định tự động
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
                Tôi cam kết mọi thông tin pháp lý, số tài khoản ngân hàng và
                hình ảnh cung cấp là hoàn toàn xác thực.
              </span>
              <p className="text-slate-500 mt-1">
                Chịu trách nhiệm trước pháp luật về tính hợp pháp của hoạt động
                kinh doanh lưu trú tại địa chỉ đã đăng ký.
              </p>
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
