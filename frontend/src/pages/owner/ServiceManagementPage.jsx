import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Coffee,
  Utensils,
  Car,
  Sparkles,
  Plus,
  Trash2,
  Edit3,
  Building2,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Tag,
} from "lucide-react";

// Components
import { Button, Input, Badge, Modal } from "@/components/ui";
import { LoadingSpinner, EmptyState } from "@/components/common";

// Services
import { hotelService } from "@/services";
import apiClient from "@/services/apiClient";

const ServiceManagementPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // ─── 1. STATES ───
  const [hotels, setHotels] = useState([]);
  const [selectedHotelId, setSelectedHotelId] = useState(
    searchParams.get("hotelId") || "",
  );
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Modal State (Dùng chung cho cả Thêm mới và Sửa)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [serviceForm, setServiceForm] = useState({
    name: "",
    price: 100000,
    unit: "Người / Ngày",
    description: "",
    is_active: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const formatVND = (num) => Number(num || 0).toLocaleString("vi-VN") + " ₫";

  // ─── 2. LOAD DANH SÁCH KHÁCH SẠN CỦA OWNER ───
  useEffect(() => {
    const fetchHotels = async () => {
      try {
        const res = await hotelService.getAll({ isOwner: true });
        const list = Array.isArray(res) ? res : res?.data || res?.hotels || [];
        setHotels(list);

        if (list.length > 0 && !selectedHotelId) {
          const firstId = String(list[0].id || list[0].hotel_id);
          setSelectedHotelId(firstId);
          setSearchParams({ hotelId: firstId });
        }
      } catch (err) {
        console.error("Lỗi lấy danh sách khách sạn:", err);
      }
    };

    fetchHotels();
  }, []);

  // ─── 3. FETCH DANH SÁCH DỊCH VỤ CỦA KHÁCH SẠN ĐƯỢC CHỌN ───
  const fetchServices = async () => {
    if (!selectedHotelId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await apiClient.get(`/hotels/${selectedHotelId}/services`);
      const list = Array.isArray(res) ? res : res?.data || [];
      setServices(list);
    } catch (err) {
      console.error("Lỗi tải danh sách dịch vụ:", err);
      setServices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, [selectedHotelId]);

  // ─── 4. MỞ MODAL THÊM HOẶC SỬA ───
  const handleOpenModal = (service = null) => {
    if (service) {
      setEditingService(service);
      setServiceForm({
        name: service.name || "",
        price: Number(service.price || 0),
        unit: service.unit || "Lượt",
        description: service.description || "",
        is_active: service.is_active ?? true,
      });
    } else {
      setEditingService(null);
      setServiceForm({
        name: "",
        price: 100000,
        unit: "Người / Ngày",
        description: "",
        is_active: true,
      });
    }
    setIsModalOpen(true);
  };

  // ─── 5. LƯU DỊCH VỤ (SUBMIT FORM) ───
  const handleSubmitService = async (e) => {
    e.preventDefault();
    if (!selectedHotelId) return;

    setIsSubmitting(true);
    const payload = {
      ...serviceForm,
      hotel_id: selectedHotelId,
      price: Number(serviceForm.price),
    };

    try {
      if (editingService) {
        // Cập nhật dịch vụ cũ
        await apiClient.put(`/services/${editingService.id}`, payload);
        showToast("Cập nhật dịch vụ thành công!");
      } else {
        // Tạo dịch vụ mới
        await apiClient.post(`/hotels/${selectedHotelId}/services`, payload);
        showToast("Thêm dịch vụ mới thành công!");
      }

      setIsModalOpen(false);
      fetchServices(); // Load lại danh sách mới
    } catch (err) {
      showToast(
        "Thao tác thất bại: " + (err.message || "Vui lòng thử lại"),
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── 6. XÓA DỊCH VỤ ───
  const handleDeleteService = async (serviceId, serviceName) => {
    if (
      !window.confirm(`Bạn có chắc muốn xóa dịch vụ "${serviceName}" không?`)
    ) {
      return;
    }

    try {
      await apiClient.delete(`/services/${serviceId}`);
      setServices((prev) => prev.filter((s) => s.id !== serviceId));
      showToast("Đã xóa dịch vụ!");
    } catch (err) {
      showToast("Không thể xóa dịch vụ này", "error");
    }
  };

  return (
    <div className="space-y-8 font-sans pb-16 text-slate-800">
      {/* TOAST NOTIFICATION */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-5 py-3.5 rounded-2xl shadow-2xl text-white font-bold text-sm animate-in slide-in-from-bottom-5 ${
            toast.type === "error" ? "bg-rose-600" : "bg-emerald-600"
          }`}
        >
          <CheckCircle2 size={18} />
          <span>{toast.message}</span>
        </div>
      )}

      {/* ─── HEADER & CHỌN KHÁCH SẠN ─── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase text-emerald-600 tracking-wider">
              Tiện Ích & Giá Trị Gia Tăng
            </span>
            <Badge variant="primary" size="sm">
              {services.length} Dịch vụ
            </Badge>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
            Dịch Vụ Đi Kèm Khách Sạn
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Tạo thêm các gói tiện ích gia tăng (Bữa sáng buffet, Đưa đón sân
            bay, Spa...) để bán kèm phòng.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Dropdown chọn khách sạn */}
          {hotels.length > 0 && (
            <div className="relative flex-1 sm:w-64">
              <select
                value={selectedHotelId}
                onChange={(e) => {
                  setSelectedHotelId(e.target.value);
                  setSearchParams({ hotelId: e.target.value });
                }}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold px-4 py-3 rounded-2xl outline-none cursor-pointer focus:border-emerald-500 appearance-none"
              >
                {hotels.map((h) => (
                  <option key={h.id || h.hotel_id} value={h.id || h.hotel_id}>
                    🏨 {h.name}
                  </option>
                ))}
              </select>
              <Building2
                size={16}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
            </div>
          )}

          <Button
            onClick={() => handleOpenModal()}
            disabled={!selectedHotelId}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-6 h-12 rounded-2xl shadow-lg shadow-emerald-100 shrink-0"
            leftIcon={<Plus size={18} />}
          >
            Thêm Dịch Vụ Mới
          </Button>
        </div>
      </div>

      {/* ─── DANH SÁCH THẺ DỊCH VỤ (GRID) ─── */}
      {loading ? (
        <div className="py-24 flex justify-center bg-white rounded-3xl border border-slate-200/80 shadow-sm">
          <LoadingSpinner size="lg" label="Đang tải danh sách dịch vụ..." />
        </div>
      ) : services.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => {
            const isActive = service.is_active ?? true;

            return (
              <div
                key={service.id}
                className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm hover:shadow-xl hover:border-emerald-200 transition-all duration-300 flex flex-col justify-between space-y-4 group"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black shadow-inner">
                      <Coffee size={24} />
                    </div>

                    {isActive ? (
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase px-3 py-1 rounded-full">
                        ● Đang mở bán
                      </span>
                    ) : (
                      <span className="bg-slate-100 text-slate-500 text-[10px] font-black uppercase px-3 py-1 rounded-full">
                        Tạm dừng
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="font-extrabold text-slate-900 text-lg group-hover:text-emerald-600 transition-colors leading-snug">
                      {service.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {service.description ||
                        "Dịch vụ chất lượng cao được cung cấp trực tiếp tại chỗ nghỉ."}
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-4">
                  <div className="flex justify-between items-baseline">
                    <span className="text-[11px] font-bold text-slate-400 uppercase">
                      Giá niêm yết:
                    </span>
                    <div className="text-right">
                      <span className="text-xl font-black text-slate-900">
                        {formatVND(service.price)}
                      </span>
                      <span className="text-[11px] text-slate-400 block font-medium">
                        / {service.unit}
                      </span>
                    </div>
                  </div>

                  {/* NÚT SỬA & XÓA */}
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenModal(service)}
                      className="border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold"
                      leftIcon={<Edit3 size={14} />}
                    >
                      Chỉnh sửa
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleDeleteService(service.id, service.name)
                      }
                      className="border-rose-100 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold"
                      leftIcon={<Trash2 size={14} />}
                    >
                      Xóa
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={Coffee}
          title="Chưa có dịch vụ đi kèm nào"
          description="Hãy tạo thêm các dịch vụ gia tăng như Bữa sáng, Spa, Đưa đón để tăng doanh thu cho chỗ nghỉ."
          actionLabel="Thêm dịch vụ đầu tiên"
          onAction={() => handleOpenModal()}
        />
      )}

      {/* ─── MODAL THÊM / SỬA DỊCH VỤ ─── */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingService ? "Chỉnh Sửa Dịch Vụ" : "Thêm Dịch Vụ Đi Kèm Mới"}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSubmitService} className="space-y-5">
          <Input
            label="Tên gói dịch vụ *"
            required
            placeholder="Ví dụ: Bữa sáng Buffet Á-Âu hoặc Đưa đón sân bay"
            value={serviceForm.name}
            onChange={(e) =>
              setServiceForm({ ...serviceForm, name: e.target.value })
            }
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Đơn giá (VNĐ) *"
              type="number"
              required
              min="0"
              step="10000"
              placeholder="150.000"
              value={serviceForm.price}
              onChange={(e) =>
                setServiceForm({ ...serviceForm, price: e.target.value })
              }
              leftIcon={<DollarSign size={16} className="text-slate-400" />}
            />

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                Đơn vị tính *
              </label>
              <input
                type="text"
                required
                placeholder="Người / Ngày, Lượt, Giờ..."
                value={serviceForm.unit}
                onChange={(e) =>
                  setServiceForm({ ...serviceForm, unit: e.target.value })
                }
                className="w-full h-11 bg-white border border-gray-300 rounded-xl px-4 text-sm font-semibold outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase">
              Mô tả chi tiết
            </label>
            <textarea
              rows={3}
              placeholder="Chi tiết về thực đơn, thời gian phục vụ hoặc loại xe đưa đón..."
              value={serviceForm.description}
              onChange={(e) =>
                setServiceForm({ ...serviceForm, description: e.target.value })
              }
              className="w-full p-4 border border-gray-300 rounded-2xl text-sm font-medium outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 placeholder:text-gray-400 leading-relaxed"
            />
          </div>

          <label className="flex items-center gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200 cursor-pointer">
            <input
              type="checkbox"
              checked={serviceForm.is_active}
              onChange={(e) =>
                setServiceForm({ ...serviceForm, is_active: e.target.checked })
              }
              className="w-5 h-5 rounded text-emerald-600 focus:ring-0 cursor-pointer"
            />
            <div>
              <p className="text-xs font-bold text-slate-800">
                Đang mở bán dịch vụ này
              </p>
              <p className="text-[11px] text-slate-400">
                Khách có thể chọn dịch vụ này khi đặt phòng
              </p>
            </div>
          </label>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              className="rounded-xl font-bold"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              isLoading={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl px-6"
            >
              {editingService ? "Lưu Cập Nhật" : "Tạo Dịch Vụ"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ServiceManagementPage;
