// src/pages/owner/RoomManagementPage.jsx
import React, { useState, useEffect, useRef } from "react";
import {
  Plus,
  BedDouble,
  Trash2,
  X,
  Camera,
  Search,
  Wifi,
  Tv,
  Wind,
  Coffee,
  Bath,
} from "lucide-react";
import { LoadingSpinner, EmptyState } from "@/components/common";

const ROOM_CATEGORIES = [
  "Standard Room",
  "Superior Room",
  "Deluxe King",
  "Executive Suite",
  "Family Suite",
  "Presidential Suite",
];

const AVAILABLE_AMENITIES = [
  { id: "wifi", label: "Wi-Fi Tốc độ cao", icon: Wifi },
  { id: "air_con", label: "Điều hòa máy lạnh 2 chiều", icon: Wind },
  { id: "smart_tv", label: "Smart TV 55 inch 4K", icon: Tv },
  { id: "minibar", label: "Tủ lạnh Minibar", icon: Coffee },
  { id: "bathtub", label: "Bồn tắm nằm & Nóng lạnh", icon: Bath },
];

export default function RoomManagementPage() {
  const fileInputRef = useRef(null);

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    category: "Deluxe King",
    room_number: "P.",
    floor: "Tầng 1",
    room_area: 30,
    capacity: 2,
    bed_type: "1 Giường đôi King",
    sell_price: 750000,
    room_status: "available",
    amenities: ["wifi", "air_con", "smart_tv"],
    description: "",
    image: "",
  });

  // 🛑 CHỈ ĐỌC DỮ LIỆU PHÒNG THỰC TẾ ĐƯỢC TẠO
  useEffect(() => {
    setLoading(true);
    const realRooms = JSON.parse(
      localStorage.getItem("pms_hotel_rooms_master") || "[]",
    );
    setRooms(realRooms);
    setLoading(false);
  }, []);

  const saveRooms = (updatedList) => {
    setRooms(updatedList);
    localStorage.setItem("pms_hotel_rooms_master", JSON.stringify(updatedList));
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("⚠️ Dung lượng ảnh không được vượt quá 5MB!");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setFormData((prev) => ({ ...prev, image: event.target.result }));
    };
    reader.readAsDataURL(file);
  };

  const toggleAmenity = (id) => {
    setFormData((prev) => {
      const exists = prev.amenities?.includes(id);
      return {
        ...prev,
        amenities: exists
          ? prev.amenities.filter((a) => a !== id)
          : [...(prev.amenities || []), id],
      };
    });
  };

  const handleSave = (e) => {
    e.preventDefault();
    let updated = [];
    if (editingRoom) {
      updated = rooms.map((r) =>
        r.id === editingRoom.id ? { ...formData, id: editingRoom.id } : r,
      );
      alert(
        `✓ Đã cập nhật thành công thông tin phòng ${formData.room_number}!`,
      );
    } else {
      const newRoom = {
        ...formData,
        id: `R-${Date.now().toString().slice(-4)}`,
      };
      updated = [newRoom, ...rooms];
      alert(`✓ Đã tạo mới thành công phòng ${formData.room_number}!`);
    }
    saveRooms(updated);
    setIsModalOpen(false);
  };

  const handleDelete = (id, name) => {
    if (
      !window.confirm(`Xác nhận xóa vĩnh viễn phòng "${name}" khỏi hệ thống?`)
    )
      return;
    const updated = rooms.filter((r) => r.id !== id);
    saveRooms(updated);
  };

  const formatVND = (num) => Number(num || 0).toLocaleString("vi-VN") + " ₫";

  const statusBadgeConfig = {
    available: {
      label: "Sẵn sàng (Available)",
      color: "bg-emerald-50 text-emerald-700 border-emerald-300",
    },
    occupied: {
      label: "Đang ở (Occupied)",
      color: "bg-blue-50 text-blue-700 border-blue-300",
    },
    maintenance: {
      label: "Bảo trì (Maintenance)",
      color: "bg-slate-100 text-slate-700 border-slate-300",
    },
    dirty: {
      label: "Chưa dọn (Dirty)",
      color: "bg-rose-50 text-rose-700 border-rose-300",
    },
  };

  const filteredRooms = rooms.filter((r) => {
    if (categoryFilter !== "all" && r.category !== categoryFilter) return false;
    if (statusFilter !== "all" && r.room_status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        r.name.toLowerCase().includes(q) ||
        r.room_number.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 font-sans pb-16 text-slate-800">
      {/* ── HEADER ── */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider mb-1">
            <BedDouble size={16} /> Quản Trị Buồng Phòng Khách Sạn
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Quản Lý Phòng & Bảng Giá ({rooms.length} Phòng)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Dữ liệu phòng lưu trữ thực tế theo từng số phòng và tình trạng hoạt
            động
          </p>
        </div>

        <button
          onClick={() => {
            setEditingRoom(null);
            setFormData({
              name: "",
              category: "Deluxe King",
              room_number: "P.",
              floor: "Tầng 1",
              room_area: 30,
              capacity: 2,
              bed_type: "1 Giường đôi King",
              sell_price: 750000,
              room_status: "available",
              amenities: ["wifi", "air_con", "smart_tv"],
              description: "",
              image: "",
            });
            setIsModalOpen(true);
          }}
          className="px-5 py-3 bg-[#003580] hover:bg-blue-900 text-white font-bold text-xs rounded-2xl shadow-md transition flex items-center gap-2 cursor-pointer active:scale-95"
        >
          <Plus size={16} /> + Thêm Phòng Mới
        </button>
      </div>

      {/* ── BỘ LỌC ── */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Tìm theo số phòng (P.101), tên phòng..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 border rounded-xl outline-none"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2.5 text-xs font-semibold bg-slate-50 border rounded-xl outline-none cursor-pointer"
        >
          <option value="all">Tất cả hạng phòng</option>
          {ROOM_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 text-xs font-semibold bg-slate-50 border rounded-xl outline-none cursor-pointer"
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="available">🟢 Sẵn sàng đón khách</option>
          <option value="occupied">🔵 Đang có khách ở</option>
          <option value="dirty">🔴 Chưa dọn buồng</option>
          <option value="maintenance">⚪ Đang bảo trì</option>
        </select>
      </div>

      {/* ── DANH SÁCH PHÒNG THỰC TẾ ── */}
      {loading ? (
        <div className="py-24 flex justify-center bg-white rounded-3xl border">
          <LoadingSpinner size="lg" label="Đang tải danh sách phòng..." />
        </div>
      ) : filteredRooms.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRooms.map((room) => {
            const badge =
              statusBadgeConfig[room.room_status] ||
              statusBadgeConfig.available;
            return (
              <div
                key={room.id}
                className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xs hover:shadow-xl transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="relative h-48 bg-slate-100 overflow-hidden">
                    <img
                      src={
                        room.image ||
                        "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=600"
                      }
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <span className="absolute top-3 left-3 bg-black/75 text-white font-mono font-black text-xs px-3 py-1 rounded-xl backdrop-blur-xs">
                      {room.room_number}
                    </span>
                    <span
                      className={`absolute top-3 right-3 text-[10px] font-black uppercase px-3 py-1 rounded-full border shadow-sm ${badge.color}`}
                    >
                      {badge.label.split(" ")[0]}
                    </span>
                  </div>

                  <div className="p-5 space-y-2">
                    <span className="text-[10px] font-bold text-blue-700 uppercase bg-blue-50 px-2 py-0.5 rounded">
                      {room.category}
                    </span>
                    <h3 className="text-base font-black text-slate-900 mt-1">
                      {room.name}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {room.floor} • {room.room_area} m² • Tối đa{" "}
                      {room.capacity} khách
                    </p>

                    {room.description && (
                      <p className="text-xs text-slate-600 line-clamp-2 italic pt-1">
                        "{room.description}"
                      </p>
                    )}
                  </div>
                </div>

                <div className="p-5 pt-0 border-t border-slate-100 mt-2 flex items-center justify-between pt-3">
                  <span className="text-lg font-black text-[#ff6a00]">
                    {formatVND(room.sell_price)}
                    <small className="text-[10px] text-slate-400 font-normal">
                      /đêm
                    </small>
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingRoom(room);
                        setFormData(room);
                        setIsModalOpen(true);
                      }}
                      className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      Sửa
                    </button>
                    <button
                      onClick={() => handleDelete(room.id, room.name)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={BedDouble}
          title="Chưa có buồng phòng nào trong kho"
          description="Hãy tạo phòng mới bằng nút '+ Thêm Phòng Mới' phía trên để bắt đầu đón khách."
          actionLabel="Tạo phòng ngay"
          onAction={() => setIsModalOpen(true)}
        />
      )}

      {/* ── MODAL THÊM / SỬA PHÒNG ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-xl shadow-2xl border space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-black text-base text-slate-900">
                {editingRoom
                  ? `Sửa Thông Tin Phòng ${editingRoom.room_number}`
                  : "Tạo Phòng Mới (Create Room)"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="h-36 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer bg-slate-50 hover:bg-slate-100 overflow-hidden relative"
              >
                {formData.image ? (
                  <img
                    src={formData.image}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center text-slate-400">
                    <Camera size={26} className="mx-auto mb-1 text-slate-500" />
                    <span className="font-bold text-xs block">
                      Tải ảnh thực tế (Tối đa 5MB)
                    </span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">
                    Số phòng / Mã phòng *
                  </label>
                  <input
                    required
                    value={formData.room_number}
                    onChange={(e) =>
                      setFormData({ ...formData, room_number: e.target.value })
                    }
                    placeholder="VD: P.101"
                    className="w-full p-2.5 border rounded-xl font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Tên phòng *</label>
                  <input
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="VD: Deluxe King Hướng Biển"
                    className="w-full p-2.5 border rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold mb-1">Hạng phòng</label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    className="w-full p-2.5 border rounded-xl"
                  >
                    {ROOM_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold mb-1">
                    Giá bán / đêm (VNĐ) *
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.sell_price}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        sell_price: Number(e.target.value),
                      })
                    }
                    className="w-full p-2.5 border rounded-xl font-bold text-emerald-700"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">
                    Trạng thái phòng
                  </label>
                  <select
                    value={formData.room_status}
                    onChange={(e) =>
                      setFormData({ ...formData, room_status: e.target.value })
                    }
                    className="w-full p-2.5 border rounded-xl font-bold"
                  >
                    <option value="available">Sẵn sàng (Available)</option>
                    <option value="occupied">Đang có khách (Occupied)</option>
                    <option value="dirty">Chưa dọn (Dirty)</option>
                    <option value="maintenance">Bảo trì (Maintenance)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold mb-1">Vị trí tầng</label>
                  <input
                    value={formData.floor}
                    onChange={(e) =>
                      setFormData({ ...formData, floor: e.target.value })
                    }
                    placeholder="VD: Tầng 1"
                    className="w-full p-2.5 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Diện tích (m²)</label>
                  <input
                    type="number"
                    value={formData.room_area}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        room_area: Number(e.target.value),
                      })
                    }
                    className="w-full p-2.5 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">
                    Sức chứa (Khách)
                  </label>
                  <input
                    type="number"
                    value={formData.capacity}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        capacity: Number(e.target.value),
                      })
                    }
                    className="w-full p-2.5 border rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">
                  Tiện nghi trong phòng:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {AVAILABLE_AMENITIES.map((am) => {
                    const isChecked = formData.amenities?.includes(am.id);
                    return (
                      <label
                        key={am.id}
                        onClick={() => toggleAmenity(am.id)}
                        className={`p-2 border rounded-xl flex items-center justify-between cursor-pointer transition ${isChecked ? "bg-blue-50 border-blue-300 text-blue-900 font-bold" : "bg-slate-50 text-slate-600"}`}
                      >
                        <span>{am.label}</span>
                        <input
                          type="checkbox"
                          checked={isChecked || false}
                          readOnly
                          className="accent-blue-600"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">
                  Mô tả chi tiết phòng (Tùy chọn):
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="VD: Phòng ban công view biển, đón gió tự nhiên..."
                  className="w-full p-2.5 border rounded-xl outline-none focus:border-blue-600 font-medium"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border rounded-xl font-bold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-[#003580] hover:bg-blue-900 text-white rounded-xl font-bold shadow-md cursor-pointer active:scale-95"
                >
                  {editingRoom ? "Lưu Cập Nhật" : "Tạo Phòng Mới"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
