// src/pages/owner/HotelManagementPage.jsx
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Building2,
  MapPin,
  CheckCircle2,
  Clock,
  XCircle,
  CreditCard,
  RefreshCw,
  AlertCircle,
  Edit3,
  X,
  BedDouble,
  Star,
} from "lucide-react";
import { LoadingSpinner, EmptyState } from "@/components/common";
import apiClient from "@/services/apiClient";

export default function HotelManagementPage() {
  const navigate = useNavigate();
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [apiError, setApiError] = useState("");

  // Modal Sửa Khách Sạn
  const [editingHotel, setEditingHotel] = useState(null);
  const [hotelForm, setHotelForm] = useState({
    name: "",
    address: "",
    city: "",
    phone: "",
    bank_account: "",
    bank_name: "",
    description: "",
  });

  // Modal Thêm Mới Cơ Sở Khách Sạn
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    address: "",
    city: "Hồ Chí Minh",
    phone: "",
    email: "",
    star_rating: 3,
    description: "",
    bank_name: "MBBank",
    bank_account: "",
    bank_account_holder: "",
    image: "",
  });

  const fetchMyHotels = useCallback(async () => {
    setLoading(true);
    setApiError("");
    try {
      const res = await apiClient.get("/hotels/my-hotels");
      const list = res?.data || res?.hotels || res || [];
      setHotels(Array.isArray(list) ? list : []);
    } catch (err) {
      setApiError(err.message || "Không thể tải dữ liệu từ máy chủ.");
      setHotels([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMyHotels();
  }, [fetchMyHotels]);

  // Mở form chỉnh sửa cơ sở
  const handleOpenEdit = (hotel) => {
    setEditingHotel(hotel);
    setHotelForm({
      name: hotel.name || "",
      address: hotel.address || "",
      city: hotel.city || "",
      phone: hotel.phone || "",
      bank_account: hotel.bank_account || "",
      bank_name: hotel.bank_name || "",
      description: hotel.description || "",
    });
  };

  // Cập nhật thông tin cơ sở
  const handleUpdateHotel = async (e) => {
    e.preventDefault();
    try {
      await apiClient.put(`/owner/hotels/${editingHotel.id}`, hotelForm);
      alert("✓ Cập nhật thông tin khách sạn thành công!");
      setEditingHotel(null);
      fetchMyHotels();
    } catch (err) {
      alert(`Lỗi: ${err.message || "Không thể cập nhật thông tin"}`);
    }
  };

  // Tạo mới cơ sở khách sạn trực tiếp vào database
  const handleCreateHotel = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...createForm,
        star_rating: Number(createForm.star_rating),
        image:
          createForm.image ||
          "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600",
      };

      await apiClient.post("/hotels/register", payload);
      alert(
        "✓ Hồ sơ đăng ký cơ sở đã được gửi thành công và đang chờ Admin duyệt!",
      );
      setIsCreateModalOpen(false);
      setCreateForm({
        name: "",
        address: "",
        city: "Hồ Chí Minh",
        phone: "",
        email: "",
        star_rating: 3,
        description: "",
        bank_name: "MBBank",
        bank_account: "",
        bank_account_holder: "",
        image: "",
      });
      fetchMyHotels();
    } catch (err) {
      alert(`Lỗi đăng ký: ${err.response?.data?.message || err.message}`);
    }
  };

  const filteredHotels = hotels.filter((h) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "active")
      return h.status === "active" || h.status === "approved";
    return h.status === statusFilter;
  });

  return (
    <div className="space-y-6 font-sans pb-16 text-slate-800">
      {/* HEADER */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#003580] font-bold text-xs uppercase tracking-wider mb-1">
            <Building2 size={16} /> Quản Trị Cơ Sở Chỗ Nghỉ
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Hồ Sơ Doanh Nghiệp Chỗ Nghỉ ({hotels.length} Cơ sở)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Dữ liệu đồng bộ trực tiếp từ Database PostgreSQL
          </p>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-5 py-3 bg-[#003580] hover:bg-blue-900 text-white font-bold text-xs rounded-2xl shadow-xs transition flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Plus size={16} /> + Đăng Ký Cơ Sở Mới
          </button>
          <button
            onClick={fetchMyHotels}
            className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl cursor-pointer"
            title="Làm mới dữ liệu"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {apiError && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl flex items-center gap-2 font-bold">
          <AlertCircle size={16} /> <span>{apiError}</span>
        </div>
      )}

      {/* TABS LỌC */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto text-xs font-bold">
        {[
          { id: "all", label: `Tất cả cơ sở (${hotels.length})` },
          { id: "active", label: "Đang mở bán (Đã duyệt)" },
          { id: "pending", label: "Đang chờ duyệt" },
          { id: "rejected", label: "Bị từ chối" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={`px-4 py-2 rounded-xl transition cursor-pointer ${
              statusFilter === tab.id
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-white border text-slate-600 hover:bg-slate-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* DANH SÁCH KHÁCH SẠN */}
      {loading ? (
        <div className="py-24 flex justify-center bg-white rounded-3xl border">
          <LoadingSpinner
            size="lg"
            label="Đang tải danh sách cơ sở từ Database..."
          />
        </div>
      ) : filteredHotels.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredHotels.map((hotel) => {
            const isApproved =
              hotel.status === "active" || hotel.status === "approved";
            const isRejected = hotel.status === "rejected";

            return (
              <div
                key={hotel.id}
                className="bg-white rounded-3xl border overflow-hidden shadow-xs hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="relative h-48 w-full bg-slate-100 overflow-hidden">
                    <img
                      src={
                        hotel.image ||
                        "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600"
                      }
                      alt={hotel.name}
                      className="w-full h-full object-cover"
                    />
                    <span
                      className={`absolute top-3 right-3 text-white font-bold text-[11px] px-3 py-1 rounded-full shadow flex items-center gap-1.5 ${
                        isApproved
                          ? "bg-emerald-600"
                          : isRejected
                            ? "bg-rose-600"
                            : "bg-amber-500 animate-pulse"
                      }`}
                    >
                      {isApproved ? (
                        <>
                          <CheckCircle2 size={13} /> ✓ Đang Mở Bán
                        </>
                      ) : isRejected ? (
                        <>
                          <XCircle size={13} /> Bị Từ Chối
                        </>
                      ) : (
                        <>
                          <Clock size={13} /> ⏳ Đang Chờ Duyệt
                        </>
                      )}
                    </span>
                  </div>

                  <div className="p-6 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded">
                        ⭐ {hotel.star_rating || 3} SAO
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        #{String(hotel.id).slice(0, 8)}
                      </span>
                    </div>

                    <h3 className="font-black text-slate-900 text-lg leading-snug">
                      {hotel.name}
                    </h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <MapPin size={13} className="text-[#006ce4] shrink-0" />
                      {hotel.address}, {hotel.city}
                    </p>

                    <div className="p-3 bg-slate-50 rounded-2xl border flex items-center gap-2 text-xs text-slate-700 font-medium">
                      <CreditCard
                        size={15}
                        className="text-emerald-600 shrink-0"
                      />
                      <span>
                        Tài khoản:{" "}
                        <b>{hotel.bank_account || "Chưa cập nhật"}</b> (
                        {hotel.bank_name || "Ngân hàng"})
                      </span>
                    </div>

                    {isRejected && hotel.rejection_reason && (
                      <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
                        <b>Lý do từ chối:</b> {hotel.rejection_reason}
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-6 pt-0 border-t mt-2 flex items-center justify-between pt-3">
                  <button
                    onClick={() => handleOpenEdit(hotel)}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit3 size={14} /> Chỉnh sửa cơ sở
                  </button>

                  <button
                    onClick={() => navigate(`/owner/rooms?hotelId=${hotel.id}`)}
                    disabled={!isApproved}
                    className="px-4 py-2 bg-[#003580] hover:bg-blue-900 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1"
                  >
                    <BedDouble size={14} /> Quản lý phòng & Giá →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={Building2}
          title="Chưa có cơ sở nào"
          description="Bấm '+ Đăng Ký Cơ Sở Mới' để bắt đầu gửi hồ sơ chỗ nghỉ của bạn lên hệ thống."
        />
      )}

      {/* MODAL 1: ĐĂNG KÝ CƠ SỞ MỚI */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border space-y-4 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="font-black text-base text-slate-900">
                  Đăng Ký Cơ Sở Chỗ Nghỉ Mới
                </h3>
                <p className="text-slate-400 text-[11px]">
                  Hồ sơ sẽ được gửi đến Admin xét duyệt trước khi mở bán
                </p>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateHotel} className="space-y-3">
              <div>
                <label className="block font-bold mb-1">
                  Tên khách sạn / Resort *
                </label>
                <input
                  required
                  placeholder="Ví dụ: Khách Sạn Biển Xanh Resort"
                  value={createForm.name}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, name: e.target.value })
                  }
                  className="w-full p-2.5 border rounded-xl font-bold text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">
                    Thành phố / Tỉnh *
                  </label>
                  <input
                    required
                    placeholder="Ví dụ: Đà Nẵng, Nha Trang..."
                    value={createForm.city}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, city: e.target.value })
                    }
                    className="w-full p-2.5 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">
                    Hạng sao (1 - 5) *
                  </label>
                  <select
                    value={createForm.star_rating}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        star_rating: e.target.value,
                      })
                    }
                    className="w-full p-2.5 border rounded-xl font-bold bg-white"
                  >
                    <option value={1}>1 Sao ⭐</option>
                    <option value={2}>2 Sao ⭐⭐</option>
                    <option value={3}>3 Sao ⭐⭐⭐</option>
                    <option value={4}>4 Sao ⭐⭐⭐⭐</option>
                    <option value={5}>5 Sao ⭐⭐⭐⭐⭐</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">
                  Địa chỉ chi tiết *
                </label>
                <input
                  required
                  placeholder="Ví dụ: 123 Đường Võ Nguyên Giáp, Phường Phước Mỹ"
                  value={createForm.address}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, address: e.target.value })
                  }
                  className="w-full p-2.5 border rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">
                    Hotline liên hệ
                  </label>
                  <input
                    placeholder="0912 345 678"
                    value={createForm.phone}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, phone: e.target.value })
                    }
                    className="w-full p-2.5 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Email quản trị</label>
                  <input
                    type="email"
                    placeholder="hotel@example.com"
                    value={createForm.email}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, email: e.target.value })
                    }
                    className="w-full p-2.5 border rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">
                    Số tài khoản nhận thanh toán *
                  </label>
                  <input
                    required
                    placeholder="0123456789"
                    value={createForm.bank_account}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        bank_account: e.target.value,
                      })
                    }
                    className="w-full p-2.5 border rounded-xl font-mono text-blue-900 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">
                    Tên ngân hàng *
                  </label>
                  <input
                    required
                    placeholder="Ví dụ: MBBank, VCB..."
                    value={createForm.bank_name}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        bank_name: e.target.value,
                      })
                    }
                    className="w-full p-2.5 border rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">
                  Link hình ảnh đại diện (URL)
                </label>
                <input
                  placeholder="https://images.unsplash.com/..."
                  value={createForm.image}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, image: e.target.value })
                  }
                  className="w-full p-2.5 border rounded-xl text-slate-600"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Mô tả chỗ nghỉ</label>
                <textarea
                  rows={3}
                  placeholder="Giới thiệu đôi nét về không gian và dịch vụ..."
                  value={createForm.description}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      description: e.target.value,
                    })
                  }
                  className="w-full p-2.5 border rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border rounded-xl font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#003580] hover:bg-blue-900 text-white font-bold rounded-xl cursor-pointer"
                >
                  Gửi Hồ Sơ Phê Duyệt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: SỬA THÔNG TIN KHÁCH SẠN */}
      {editingHotel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border space-y-4 text-xs">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-black text-base text-slate-900">
                Chỉnh Sửa Thông Tin Khách Sạn
              </h3>
              <button onClick={() => setEditingHotel(null)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateHotel} className="space-y-3">
              <div>
                <label className="block font-bold mb-1">Tên khách sạn *</label>
                <input
                  required
                  value={hotelForm.name}
                  onChange={(e) =>
                    setHotelForm({ ...hotelForm, name: e.target.value })
                  }
                  className="w-full p-2.5 border rounded-xl font-bold text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Thành phố *</label>
                  <input
                    required
                    value={hotelForm.city}
                    onChange={(e) =>
                      setHotelForm({ ...hotelForm, city: e.target.value })
                    }
                    className="w-full p-2.5 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Hotline lễ tân</label>
                  <input
                    value={hotelForm.phone}
                    onChange={(e) =>
                      setHotelForm({ ...hotelForm, phone: e.target.value })
                    }
                    className="w-full p-2.5 border rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">Địa chỉ chi tiết</label>
                <input
                  value={hotelForm.address}
                  onChange={(e) =>
                    setHotelForm({ ...hotelForm, address: e.target.value })
                  }
                  className="w-full p-2.5 border rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">
                    Số tài khoản ngân hàng
                  </label>
                  <input
                    value={hotelForm.bank_account}
                    onChange={(e) =>
                      setHotelForm({
                        ...hotelForm,
                        bank_account: e.target.value,
                      })
                    }
                    className="w-full p-2.5 border rounded-xl font-mono text-blue-900 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Tên ngân hàng</label>
                  <input
                    value={hotelForm.bank_name}
                    onChange={(e) =>
                      setHotelForm({ ...hotelForm, bank_name: e.target.value })
                    }
                    className="w-full p-2.5 border rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">Mô tả cơ sở</label>
                <textarea
                  rows={3}
                  value={hotelForm.description}
                  onChange={(e) =>
                    setHotelForm({ ...hotelForm, description: e.target.value })
                  }
                  className="w-full p-2.5 border rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setEditingHotel(null)}
                  className="px-4 py-2 border rounded-xl font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#003580] text-white font-bold rounded-xl cursor-pointer"
                >
                  Lưu Thay Đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
