import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Building2,
  MapPin,
  Phone,
  Clock,
  ShieldCheck,
  Image as ImageIcon,
  Plus,
  Trash2,
  ArrowLeft,
  Save,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

// Components
import { Button, Input, Badge } from "@/components/ui";
import { LoadingSpinner } from "@/components/common";
import { Upload } from "@/components/ui";

// Services
import { hotelService, uploadService } from "@/services";

const POPULAR_AMENITIES = [
  "WiFi miễn phí",
  "Hồ bơi ngoài trời",
  "Bãi đậu xe miễn phí",
  "Phòng Gym / Thể hình",
  "Nhà hàng & Bar",
  "Điều hòa nhiệt độ",
  "Lễ tân 24/7",
  "Bữa sáng miễn phí",
  "Bãi biển riêng",
  "Dọn phòng hàng ngày",
];

const HotelEditPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    type: "Khách sạn",
    phone: "",
    city: "",
    address: "",
    description: "",
    start_checkin_time: "14:00",
    start_checkout_time: "12:00",
    cancellation_policy: "",
    animal_allowed: false,
    amenities: [],
    images: [],
  });

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ─── 1. FETCH DỮ LIỆU KHÁCH SẠN THẬT TỪ API ───
  useEffect(() => {
    const fetchHotelData = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const data = await hotelService.getById(id);
        if (data) {
          setFormData({
            name: data.name || "",
            type: data.type || "Khách sạn",
            phone: data.phone || data.hotline || "",
            city: data.city || "",
            address: data.address || "",
            description: data.description || "",
            start_checkin_time:
              data.policy?.start_checkin_time ||
              data.start_checkin_time ||
              "14:00",
            start_checkout_time:
              data.policy?.start_checkout_time ||
              data.start_checkout_time ||
              "12:00",
            cancellation_policy:
              data.policy?.cancellation_policy ||
              data.cancellation_policy ||
              "",
            animal_allowed: Boolean(
              data.policy?.animal_allowed || data.animal_allowed,
            ),
            amenities:
              data.amenities?.map((a) =>
                typeof a === "object" ? a.name : a,
              ) || [],
            images:
              data.images?.map((img) =>
                typeof img === "object" ? img.path : img,
              ) || (data.image ? [data.image] : []),
          });
        }
      } catch (err) {
        console.error("Lỗi khi tải chi tiết khách sạn:", err);
        showToast("Không tìm thấy thông tin khách sạn này", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchHotelData();
  }, [id]);

  // ─── 2. XỬ LÝ CHỌN / BỎ CHỌN TIỆN NGHI ───
  const toggleAmenity = (name) => {
    setFormData((prev) => {
      const exists = prev.amenities.includes(name);
      return {
        ...prev,
        amenities: exists
          ? prev.amenities.filter((item) => item !== name)
          : [...prev.amenities, name],
      };
    });
  };

  // ─── 3. XỬ LÝ XÓA ẢNH ───
  const handleRemoveImage = (index) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  // ─── 4. XỬ LÝ UPLOAD THÊM ẢNH ───
  const handleUploadImages = async (files) => {
    try {
      showToast("Đang tải ảnh lên...", "info");
      const res = await uploadService.uploadMultiple(files, "hotels");
      const uploadedUrls = res?.urls || res?.data?.urls || [];

      setFormData((prev) => ({
        ...prev,
        images: [...prev.images, ...uploadedUrls],
      }));
      showToast("Tải ảnh lên thành công!");
    } catch (err) {
      showToast("Lỗi khi tải ảnh lên máy chủ", "error");
    }
  };

  // ─── 5. LƯU CẬP NHẬT (SUBMIT) ───
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      name: formData.name,
      type: formData.type,
      phone: formData.phone,
      city: formData.city,
      address: formData.address,
      description: formData.description,
      policy: {
        start_checkin_time: formData.start_checkin_time,
        start_checkout_time: formData.start_checkout_time,
        cancellation_policy: formData.cancellation_policy,
        animal_allowed: formData.animal_allowed,
      },
      amenities: formData.amenities,
      images: formData.images,
    };

    try {
      await hotelService.update(id, payload);
      showToast("Cập nhật thông tin khách sạn thành công!");
      setTimeout(() => navigate("/owner/hotels"), 1000);
    } catch (err) {
      console.error("Lỗi cập nhật:", err);
      showToast(err.message || "Cập nhật thất bại, vui lòng thử lại.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading)
    return <LoadingSpinner fullPage label="Đang tải dữ liệu chỗ nghỉ..." />;

  return (
    <div className="space-y-8 font-sans max-w-5xl mx-auto pb-20 text-slate-800">
      {/* TOAST NOTIFICATION */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-5 py-3.5 rounded-2xl shadow-2xl text-white font-bold text-sm animate-in slide-in-from-bottom-5 ${
            toast.type === "error"
              ? "bg-rose-600"
              : toast.type === "info"
                ? "bg-blue-600"
                : "bg-emerald-600"
          }`}
        >
          <CheckCircle2 size={18} />
          <span>{toast.message}</span>
        </div>
      )}

      {/* ─── HEADER BAR ─── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="primary" size="sm">
              Mã chỗ nghỉ: #{id}
            </Badge>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
            Chỉnh Sửa Chỗ Nghỉ
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Cập nhật thông tin mô tả, chính sách nhận/trả phòng và hình ảnh chỗ
            nghỉ.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() => navigate("/owner/hotels")}
          className="border-slate-200 text-slate-700 hover:bg-slate-50 rounded-2xl font-bold"
          leftIcon={<ArrowLeft size={16} />}
        >
          Quay lại danh sách
        </Button>
      </div>

      {/* ─── MAIN FORM ─── */}
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-8"
      >
        {/* 1. THÔNG TIN CHUNG */}
        <div className="space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Building2 className="text-[#006ce4]" size={20} />
            <h2 className="text-lg font-black text-slate-900">
              1. Thông Tin Chung
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="md:col-span-2">
              <Input
                label="Tên chỗ nghỉ / Khách sạn *"
                required
                placeholder="Ví dụ: InterContinental Danang Resort"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                Loại hình *
              </label>
              <select
                value={formData.type}
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value })
                }
                className="w-full h-11 bg-white border border-gray-300 rounded-xl px-4 text-sm font-semibold outline-none focus:border-[#006ce4] focus:ring-4 focus:ring-blue-50 transition-all"
              >
                <option value="Khách sạn">Khách sạn</option>
                <option value="Resort">Resort / Khu nghỉ dưỡng</option>
                <option value="Homestay">Homestay</option>
                <option value="Biệt thự">Biệt thự / Villa</option>
                <option value="Căn hộ">Căn hộ dịch vụ</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Input
              label="Số điện thoại lễ tân / Hotline *"
              required
              placeholder="0236 3938 888"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              leftIcon={<Phone size={16} className="text-slate-400" />}
            />

            <Input
              label="Tỉnh / Thành phố *"
              required
              placeholder="Ví dụ: Đà Nẵng"
              value={formData.city}
              onChange={(e) =>
                setFormData({ ...formData, city: e.target.value })
              }
              leftIcon={<MapPin size={16} className="text-slate-400" />}
            />
          </div>

          <Input
            label="Địa chỉ chi tiết *"
            required
            placeholder="Số nhà, tên đường, phường/xã, quận/huyện..."
            value={formData.address}
            onChange={(e) =>
              setFormData({ ...formData, address: e.target.value })
            }
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase">
              Mô tả giới thiệu
            </label>
            <textarea
              rows={4}
              placeholder="Giới thiệu về vị trí, view biển, các trải nghiệm ẩm thực, dịch vụ cao cấp..."
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full p-4 border border-gray-300 rounded-2xl text-sm font-medium outline-none focus:border-[#006ce4] focus:ring-4 focus:ring-blue-50 transition-all placeholder:text-gray-400 leading-relaxed"
            />
          </div>
        </div>

        {/* 2. CHÍNH SÁCH & KHUNG GIỜ */}
        <div className="space-y-5 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Clock className="text-amber-500" size={20} />
            <h2 className="text-lg font-black text-slate-900">
              2. Khung Giờ & Chính Sách
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Input
              label="Giờ Check-in quy định"
              type="time"
              value={formData.start_checkin_time}
              onChange={(e) =>
                setFormData({ ...formData, start_checkin_time: e.target.value })
              }
            />

            <Input
              label="Giờ Check-out quy định"
              type="time"
              value={formData.start_checkout_time}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  start_checkout_time: e.target.value,
                })
              }
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase">
              Chính sách hủy phòng
            </label>
            <textarea
              rows={2}
              placeholder="Ví dụ: Miễn phí hủy trước 3 ngày nhận phòng. Hủy sau thời gian này chịu phí 100% đêm đầu tiên."
              value={formData.cancellation_policy}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  cancellation_policy: e.target.value,
                })
              }
              className="w-full p-4 border border-gray-300 rounded-2xl text-sm font-medium outline-none focus:border-[#006ce4] focus:ring-4 focus:ring-blue-50 transition-all placeholder:text-gray-400"
            />
          </div>

          <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200 cursor-pointer group">
            <input
              type="checkbox"
              checked={formData.animal_allowed}
              onChange={(e) =>
                setFormData({ ...formData, animal_allowed: e.target.checked })
              }
              className="w-5 h-5 rounded text-emerald-600 focus:ring-0 cursor-pointer"
            />
            <div>
              <p className="text-sm font-bold text-slate-800 group-hover:text-emerald-600 transition-colors">
                Cho phép mang theo vật nuôi / thú cưng
              </p>
              <p className="text-xs text-slate-500">
                Bật nếu chỗ nghỉ của bạn có trang bị dịch vụ cho thú cưng
              </p>
            </div>
          </label>
        </div>

        {/* 3. TIỆN NGHI CHỖ NGHỈ */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <ShieldCheck className="text-emerald-600" size={20} />
            <h2 className="text-lg font-black text-slate-900">
              3. Tiện Nghi Phổ Biến
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {POPULAR_AMENITIES.map((name) => {
              const isSelected = formData.amenities.includes(name);
              return (
                <button
                  type="button"
                  key={name}
                  onClick={() => toggleAmenity(name)}
                  className={`p-3 rounded-2xl text-xs font-bold border transition-all text-center cursor-pointer ${
                    isSelected
                      ? "bg-emerald-50 text-emerald-700 border-emerald-300 shadow-sm"
                      : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {isSelected ? "✓ " : "+ "} {name}
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. THƯ VIỆN HÌNH ẢNH */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <ImageIcon className="text-[#006ce4]" size={20} />
            <h2 className="text-lg font-black text-slate-900">
              4. Thư Viện Hình Ảnh Chỗ Nghỉ
            </h2>
          </div>

          {/* Grid ảnh hiện tại */}
          {formData.images.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
              {formData.images.map((imgUrl, index) => (
                <div
                  key={index}
                  className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-slate-200 group bg-slate-100"
                >
                  <img
                    src={imgUrl}
                    alt="Hotel"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(index)}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-rose-600 text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                    title="Xóa ảnh"
                  >
                    <Trash2 size={14} />
                  </button>
                  {index === 0 && (
                    <span className="absolute bottom-2 left-2 bg-slate-900/80 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-md">
                      Ảnh bìa
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Component Upload thêm ảnh */}
          <Upload onUpload={handleUploadImages} maxFiles={10} />
        </div>

        {/* ─── FOOTER ACTIONS ─── */}
        <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/owner/hotels")}
            className="border-slate-200 text-slate-700 hover:bg-slate-50 font-bold px-6 h-12 rounded-2xl"
          >
            Hủy Thay Đổi
          </Button>

          <Button
            type="submit"
            isLoading={isSubmitting}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-8 h-12 rounded-2xl shadow-lg shadow-emerald-100"
            leftIcon={<Save size={18} />}
          >
            Lưu Cập Nhật Chỗ Nghỉ
          </Button>
        </div>
      </form>
    </div>
  );
};

export default HotelEditPage;
