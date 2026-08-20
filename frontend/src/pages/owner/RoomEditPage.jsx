import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  BedDouble,
  DollarSign,
  Users,
  Square,
  Image as ImageIcon,
  Trash2,
  ArrowLeft,
  Save,
  Plus,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

// Components
import { Button, Input, Badge, Upload } from "@/components/ui";
import { LoadingSpinner } from "@/components/common";

// Services
import { roomService, uploadService } from "@/services";

const RoomEditPage = () => {
  const navigate = useNavigate();
  const { id } = useParams(); // Nếu có id -> Chế độ Sửa (Edit)
  const [searchParams] = useSearchParams();
  const hotelId = searchParams.get("hotelId");
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(isEdit);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    sell_price: 1000000,
    room_count: 1,
    capacity: 2,
    room_area: 30,
    bed_type: "1 Giường đôi lớn (King)",
    description: "",
    images: [],
  });

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ─── 1. FETCH DỮ LIỆU PHÒNG THẬT KHI Ở CHẾ ĐỘ SỬA (EDIT) ───
  useEffect(() => {
    if (!isEdit) return;

    const fetchRoomDetail = async () => {
      setLoading(true);
      try {
        const data = await roomService.getById(id);
        if (data) {
          setFormData({
            name: data.name || "",
            sell_price: Number(
              data.sell_price || data.base_price || data.price || 1000000,
            ),
            room_count: Number(
              data.room_count || data.totalQuantity || data.amount || 1,
            ),
            capacity: Number(data.capacity || 2),
            room_area: Number(
              data.room_area || data.area || data.roomSize || 30,
            ),
            bed_type: data.bed_type || data.bedType || "1 Giường đôi lớn",
            description: data.description || "",
            images:
              data.images?.map((img) =>
                typeof img === "object" ? img.path : img,
              ) || (data.image ? [data.image] : []),
          });
        }
      } catch (err) {
        console.error("Lỗi tải chi tiết loại phòng:", err);
        showToast("Không tìm thấy thông tin loại phòng này", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchRoomDetail();
  }, [id, isEdit]);

  // ─── 2. XỬ LÝ ẢNH PHÒNG ───
  const handleRemoveImage = (index) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const handleUploadImages = async (files) => {
    try {
      showToast("Đang tải ảnh phòng lên...", "info");
      const res = await uploadService.uploadMultiple(files, "rooms");
      const uploadedUrls = res?.urls || res?.data?.urls || [];

      setFormData((prev) => ({
        ...prev,
        images: [...prev.images, ...uploadedUrls],
      }));
      showToast("Tải ảnh phòng thành công!");
    } catch (err) {
      showToast("Lỗi khi tải ảnh phòng lên", "error");
    }
  };

  // ─── 3. LƯU THÔNG TIN (SUBMIT) ───
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      name: formData.name,
      sell_price: Number(formData.sell_price),
      room_count: Number(formData.room_count),
      capacity: Number(formData.capacity),
      room_area: Number(formData.room_area),
      bed_type: formData.bed_type,
      description: formData.description,
      images: formData.images,
    };

    try {
      if (isEdit) {
        // Cập nhật loại phòng cũ
        await roomService.update(id, payload);
        showToast("Cập nhật loại phòng thành công!");
      } else {
        // Tạo loại phòng mới cho khách sạn
        if (!hotelId) {
          showToast("Thiếu ID khách sạn để thêm phòng!", "error");
          setIsSubmitting(false);
          return;
        }
        await roomService.create(hotelId, payload);
        showToast("Tạo loại phòng mới thành công!");
      }

      setTimeout(() => {
        navigate(`/owner/rooms${hotelId ? `?hotelId=${hotelId}` : ""}`);
      }, 1000);
    } catch (err) {
      console.error("Lỗi khi lưu loại phòng:", err);
      showToast(err.message || "Thao tác thất bại, vui lòng thử lại.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading)
    return <LoadingSpinner fullPage label="Đang tải thông tin loại phòng..." />;

  return (
    <div className="space-y-8 font-sans max-w-4xl mx-auto pb-20 text-slate-800">
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
              {isEdit ? `Chỉnh sửa phòng #${id}` : "Thêm phòng mới"}
            </Badge>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
            {isEdit ? "Cập Nhật Loại Phòng" : "Thêm Hạng Phòng Mới"}
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Cài đặt số lượng phòng mở bán, cấu hình giường ngủ, diện tích và giá
            niêm yết mỗi đêm.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() =>
            navigate(`/owner/rooms${hotelId ? `?hotelId=${hotelId}` : ""}`)
          }
          className="border-slate-200 text-slate-700 hover:bg-slate-50 rounded-2xl font-bold"
          leftIcon={<ArrowLeft size={16} />}
        >
          Quay lại
        </Button>
      </div>

      {/* ─── MAIN FORM ─── */}
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-8"
      >
        {/* 1. THÔNG TIN CƠ BẢN */}
        <div className="space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <BedDouble className="text-[#006ce4]" size={20} />
            <h2 className="text-lg font-black text-slate-900">
              1. Thông Tin Hạng Phòng
            </h2>
          </div>

          <Input
            label="Tên loại phòng *"
            required
            placeholder="Ví dụ: Phòng Deluxe Hướng Biển (Deluxe Sea View)"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Input
              label="Giá niêm yết mỗi đêm (VNĐ) *"
              type="number"
              required
              min="0"
              step="10000"
              placeholder="1.500.000"
              value={formData.sell_price}
              onChange={(e) =>
                setFormData({ ...formData, sell_price: e.target.value })
              }
              leftIcon={<DollarSign size={16} className="text-slate-400" />}
            />

            <Input
              label="Tổng số phòng loại này hiện có (Tồn kho) *"
              type="number"
              required
              min="1"
              placeholder="5"
              value={formData.room_count}
              onChange={(e) =>
                setFormData({ ...formData, room_count: e.target.value })
              }
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Input
              label="Sức chứa tối đa (Người lớn & Trẻ em) *"
              type="number"
              required
              min="1"
              placeholder="2"
              value={formData.capacity}
              onChange={(e) =>
                setFormData({ ...formData, capacity: e.target.value })
              }
              leftIcon={<Users size={16} className="text-slate-400" />}
            />

            <Input
              label="Diện tích phòng (m²) *"
              type="number"
              required
              min="1"
              placeholder="35"
              value={formData.room_area}
              onChange={(e) =>
                setFormData({ ...formData, room_area: e.target.value })
              }
              leftIcon={<Square size={16} className="text-slate-400" />}
            />
          </div>

          <Input
            label="Cấu hình giường ngủ *"
            required
            placeholder="Ví dụ: 1 Giường đôi lớn (King Size) hoặc 2 Giường đơn"
            value={formData.bed_type}
            onChange={(e) =>
              setFormData({ ...formData, bed_type: e.target.value })
            }
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase">
              Mô tả phòng
            </label>
            <textarea
              rows={3}
              placeholder="Mô tả về tầm nhìn (view), bồn tắm nằm, ban công riêng, đồ dùng miễn phí..."
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full p-4 border border-gray-300 rounded-2xl text-sm font-medium outline-none focus:border-[#006ce4] focus:ring-4 focus:ring-blue-50 transition-all placeholder:text-gray-400 leading-relaxed"
            />
          </div>
        </div>

        {/* 2. THƯ VIỆN HÌNH ẢNH LOẠI PHÒNG */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <ImageIcon className="text-[#006ce4]" size={20} />
            <h2 className="text-lg font-black text-slate-900">
              2. Hình Ảnh Loại Phòng
            </h2>
          </div>

          {/* Grid ảnh hiện tại */}
          {formData.images.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {formData.images.map((imgUrl, index) => (
                <div
                  key={index}
                  className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-slate-200 group bg-slate-100"
                >
                  <img
                    src={imgUrl}
                    alt="Room"
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
                      Ảnh chính
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Upload thêm ảnh phòng */}
          <Upload onUpload={handleUploadImages} maxFiles={6} />
        </div>

        {/* ─── FOOTER ACTIONS ─── */}
        <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              navigate(`/owner/rooms${hotelId ? `?hotelId=${hotelId}` : ""}`)
            }
            className="border-slate-200 text-slate-700 hover:bg-slate-50 font-bold px-6 h-12 rounded-2xl"
          >
            Hủy Thay Đổi
          </Button>

          <Button
            type="submit"
            isLoading={isSubmitting}
            className="bg-[#006ce4] hover:bg-blue-700 text-white font-extrabold px-8 h-12 rounded-2xl shadow-lg shadow-blue-100"
            leftIcon={<Save size={18} />}
          >
            {isEdit ? "Lưu Cập Nhật Loại Phòng" : "Tạo Hạng Phòng Mới"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default RoomEditPage;
