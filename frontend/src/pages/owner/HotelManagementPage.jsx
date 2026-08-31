import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Building2,
  MapPin,
  BedDouble,
  CheckCircle2,
  Trash2,
  X,
  Star,
  DoorOpen,
} from "lucide-react";
import { LoadingSpinner, EmptyState } from "@/components/common";
import { hotelService } from "@/services";

const HotelManagementPage = () => {
  const navigate = useNavigate();
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHotel, setEditingHotel] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    type: "Khách sạn",
    city: "Đà Nẵng",
    address: "",
    star_rating: 4,
    image: "",
    description: "",
  });

  // Tải danh sách khách sạn thật từ API
  const fetchMyHotels = async () => {
    setLoading(true);
    try {
      const res = await hotelService.getAll({ isOwner: true });
      const list = Array.isArray(res) ? res : res?.data || res?.hotels || [];
      setHotels(list);
    } catch (error) {
      console.error("Lỗi khi tải danh sách khách sạn:", error);
      setHotels([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyHotels();
  }, []);

  const openEditModal = (hotel) => {
    setEditingHotel(hotel);
    setFormData({
      name: hotel.name || "",
      type: hotel.type || "Khách sạn",
      city: hotel.city || "Đà Nẵng",
      address: hotel.address || "",
      star_rating: hotel.star_rating || hotel.stars || 4,
      image: hotel.image || hotel.images?.[0] || "",
      description: hotel.description || "",
    });
    setIsModalOpen(true);
  };

  // Lưu Thêm mới hoặc Cập nhật qua API
  const handleSave = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingHotel) {
        const id = editingHotel.id || editingHotel.hotel_id;
        await hotelService.update(id, formData);
      } else {
        await hotelService.create(formData);
      }
      await fetchMyHotels();
      setIsModalOpen(false);
    } catch (err) {
      alert("Thao tác thất bại: " + (err.message || "Vui lòng kiểm tra lại"));
    } finally {
      setSubmitting(false);
    }
  };

  // Xóa qua API
  const handleDelete = async (id, name) => {
    if (
      !window.confirm(
        `Xác nhận xóa cơ sở lưu trú "${name}"? Toàn bộ phòng và đơn liên quan sẽ bị xóa.`,
      )
    )
      return;
    try {
      await hotelService.delete(id);
      setHotels((prev) => prev.filter((h) => (h.id || h.hotel_id) !== id));
    } catch (err) {
      alert("Không thể xóa: " + (err.message || "Vui lòng thử lại"));
    }
  };

  return (
    <div className="space-y-6 font-sans text-slate-800 pb-12">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-xl border border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Danh sách Cơ sở Lưu trú
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản lý thông tin chỗ nghỉ và đồng bộ trực tiếp với máy chủ GoStay
          </p>
        </div>

        <button
          onClick={() => {
            setEditingHotel(null);
            setFormData({
              name: "",
              type: "Khách sạn",
              city: "Đà Nẵng",
              address: "",
              star_rating: 4,
              image: "",
              description: "",
            });
            setIsModalOpen(true);
          }}
          className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Plus size={16} /> Thêm Cơ Sở Mới
        </button>
      </div>

      {/* ── DANH SÁCH KHÁCH SẠN THẬT ── */}
      {loading ? (
        <div className="py-24 flex justify-center bg-white rounded-xl border border-slate-200">
          <LoadingSpinner size="lg" label="Đang tải dữ liệu chỗ nghỉ..." />
        </div>
      ) : hotels.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {hotels.map((hotel) => {
            const id = hotel.id || hotel.hotel_id;
            const image =
              hotel.image ||
              hotel.images?.[0]?.path ||
              hotel.images?.[0] ||
              "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600";

            return (
              <div
                key={id}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:border-slate-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="relative h-48 w-full bg-slate-100">
                    <img
                      src={image}
                      alt={hotel.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded text-[11px] font-semibold text-emerald-800 border border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 size={12} className="text-emerald-600" />{" "}
                      Đang Hoạt Động
                    </div>
                  </div>

                  <div className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        {hotel.type || "Khách sạn"}
                      </span>
                      <div className="flex items-center text-amber-500 text-xs font-semibold">
                        <Star size={13} className="fill-amber-400 mr-0.5" />
                        {hotel.star_rating || hotel.stars || 4}.0
                      </div>
                    </div>

                    <h3 className="font-bold text-slate-900 text-base line-clamp-1">
                      {hotel.name}
                    </h3>

                    <div className="flex items-center gap-1 text-xs text-slate-500 line-clamp-1">
                      <MapPin size={13} className="text-slate-400 shrink-0" />
                      {hotel.address}, {hotel.city}
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 text-xs">
                      <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                        <span className="text-slate-500 block text-[10px] uppercase font-medium">
                          Tổng số phòng
                        </span>
                        <span className="font-bold text-slate-800 text-sm">
                          {hotel.total_rooms || hotel.rooms_count || 0} phòng
                        </span>
                      </div>
                      <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                        <span className="text-slate-500 block text-[10px] uppercase font-medium">
                          Mã cơ sở
                        </span>
                        <span className="font-mono font-bold text-slate-800 text-sm">
                          #{id}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-5 pt-0 border-t border-slate-100 mt-2">
                  <div className="flex items-center justify-between pt-3">
                    <button
                      onClick={() => handleDelete(id, hotel.name)}
                      className="text-xs text-rose-600 hover:underline font-medium cursor-pointer"
                    >
                      Xóa cơ sở
                    </button>

                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditModal(hotel)}
                        className="px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                      >
                        Chỉnh sửa
                      </button>
                      <button
                        onClick={() => navigate(`/owner/rooms?hotelId=${id}`)}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold cursor-pointer"
                      >
                        Quản lý phòng
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={Building2}
          title="Chưa có cơ sở lưu trú nào"
          description="Đăng ký chỗ nghỉ đầu tiên của bạn để bắt đầu tiếp nhận đặt phòng."
          actionLabel="Tạo cơ sở đầu tiên"
          onAction={() => setIsModalOpen(true)}
        />
      )}

      {/* ── MODAL FORM THẬT ── */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg overflow-hidden border border-slate-200 shadow-xl">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm">
                {editingHotel
                  ? "Cập nhật Thông tin Chỗ nghỉ"
                  : "Đăng ký Cơ sở Lưu trú Mới"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên Khách sạn / Chỗ nghỉ
                </label>
                <input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-slate-900 outline-none"
                  placeholder="VD: InterContinental Danang..."
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Loại hình
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value })
                    }
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-slate-900 outline-none"
                  >
                    <option value="Khách sạn">Khách sạn</option>
                    <option value="Resort">Khu nghỉ dưỡng (Resort)</option>
                    <option value="Biệt thự">Biệt thự (Villa)</option>
                    <option value="Homestay">Homestay / Căn hộ</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Thành phố
                  </label>
                  <select
                    value={formData.city}
                    onChange={(e) =>
                      setFormData({ ...formData, city: e.target.value })
                    }
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-slate-900 outline-none"
                  >
                    <option value="Đà Nẵng">Đà Nẵng</option>
                    <option value="Hà Nội">Hà Nội</option>
                    <option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh</option>
                    <option value="Nha Trang">Nha Trang</option>
                    <option value="Phú Quốc">Phú Quốc</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Địa chỉ chi tiết
                </label>
                <input
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-slate-900 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ảnh đại diện (URL)
                </label>
                <input
                  value={formData.image}
                  onChange={(e) =>
                    setFormData({ ...formData, image: e.target.value })
                  }
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-slate-900 outline-none"
                  placeholder="https://images.unsplash.com/..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? "Đang lưu..." : "Lưu vào hệ thống"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HotelManagementPage;
