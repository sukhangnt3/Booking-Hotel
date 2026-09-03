// src/pages/owner/RoomManagementPage.jsx
import React, { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
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
  Building2,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { LoadingSpinner, EmptyState } from "@/components/common";
import { useAuthStore } from "@/stores/authStore";
import PropertySearchSelector from "@/components/common/PropertySearchSelector";

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
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuthStore();
  const fileInputRef = useRef(null);

  const userRole = String(user?.role || user?.role_name || "").toLowerCase();
  const isAdmin = userRole.includes("admin") || user?.role_id === 1;
  const userEmail = String(user?.email || "")
    .toLowerCase()
    .trim();

  const [myHotels, setMyHotels] = useState([]);
  const [selectedHotelId, setSelectedHotelId] = useState(
    searchParams.get("hotelId") || "",
  );

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
    room_number: "P.101",
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

  // ── 🏢 TẢI CƠ SỞ (ĐÃ SỬA ĐỌC PROVINCE TRƯỚC) ──
  const loadRoomsAndHotels = () => {
    setLoading(true);
    const localApps = JSON.parse(
      localStorage.getItem("pending_partner_applications") || "[]",
    );
    const approvedIds = JSON.parse(
      localStorage.getItem("approved_hotel_ids") || "[]",
    ).map(String);
    const rejectedIds = JSON.parse(
      localStorage.getItem("rejected_hotel_ids") || "[]",
    ).map(String);

    let scopedHotels = [];
    if (isAdmin) {
      scopedHotels = localApps
        .filter(
          (h) =>
            !rejectedIds.includes(String(h.id || h.applicationId)) &&
            h.status !== "rejected",
        )
        .map((h) => ({
          id: String(h.id || h.applicationId),
          name: h.name || h.hotelNameVi || "Cơ sở lưu trú",
          city: h.province || h.city || "Việt Nam", // 👈 Ưu tiên province
          image: h.image,
          rooms: h.rooms || h.roomTypes || [],
        }));
    } else {
      scopedHotels = localApps
        .filter((h) => {
          const hId = String(h.id || h.applicationId);
          const hEmail = String(h.emailContact || h.email || "")
            .toLowerCase()
            .trim();
          const isMine = hEmail === userEmail;
          const isApproved =
            approvedIds.includes(hId) &&
            !rejectedIds.includes(hId) &&
            h.status === "approved";
          return isMine && isApproved;
        })
        .map((h) => ({
          id: String(h.id || h.applicationId),
          name: h.name || h.hotelNameVi || "Cơ sở của tôi",
          city: h.province || h.city || "Việt Nam", // 👈 Ưu tiên province
          image: h.image,
          rooms: h.rooms || h.roomTypes || [],
        }));
    }

    setMyHotels(scopedHotels);

    let activeHotelId = selectedHotelId;
    if (
      (!activeHotelId ||
        !scopedHotels.some((h) => String(h.id) === String(activeHotelId))) &&
      scopedHotels.length > 0
    ) {
      activeHotelId = String(scopedHotels[0].id);
      setSelectedHotelId(activeHotelId);
      setSearchParams({ hotelId: activeHotelId });
    }

    const currentHotelObj = scopedHotels.find(
      (h) => String(h.id) === String(activeHotelId),
    );

    const masterRooms = JSON.parse(
      localStorage.getItem("pms_hotel_rooms_master") || "[]",
    );
    let targetRooms = [];

    masterRooms.forEach((r) => {
      const matchId = String(r.hotel_id) === String(activeHotelId);
      const matchName =
        currentHotelObj?.name &&
        r.hotel_name?.toLowerCase() === currentHotelObj.name.toLowerCase();
      if (matchId || matchName) {
        targetRooms.push({
          ...r,
          hotel_id: activeHotelId,
          hotel_name: currentHotelObj?.name,
        });
      }
    });

    if (
      targetRooms.length === 0 &&
      currentHotelObj &&
      Array.isArray(currentHotelObj.rooms) &&
      currentHotelObj.rooms.length > 0
    ) {
      currentHotelObj.rooms.forEach((r, idx) => {
        targetRooms.push({
          id: r.id || `R-${activeHotelId}-${idx + 1}`,
          name: r.roomName || r.name || `Phòng Hạng ${idx + 1}`,
          category: r.category || "Deluxe King",
          room_number: r.room_number || `P.${101 + idx}`,
          floor: r.floor || "Tầng 1",
          room_area: r.roomSize || r.room_area || 30,
          capacity: r.maxAdults || r.capacity || 2,
          bed_type: r.bedType || r.bed_type || "1 Giường đôi King",
          sell_price: r.weekdayPrice || r.sell_price || 750000,
          room_status: r.room_status || "available",
          amenities: r.roomAmenities || ["wifi", "air_con", "smart_tv"],
          description: r.description || "",
          image:
            r.image ||
            currentHotelObj.image ||
            "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=600",
          hotel_id: activeHotelId,
          hotel_name: currentHotelObj.name,
        });
      });

      const updatedMaster = [
        ...masterRooms.filter(
          (mr) => String(mr.hotel_id) !== String(activeHotelId),
        ),
        ...targetRooms,
      ];
      localStorage.setItem(
        "pms_hotel_rooms_master",
        JSON.stringify(updatedMaster),
      );
    }

    setRooms(targetRooms);
    setLoading(false);
  };

  useEffect(() => {
    loadRoomsAndHotels();
  }, [user, selectedHotelId]);

  const saveRooms = (updatedList) => {
    setRooms(updatedList);
    const masterRooms = JSON.parse(
      localStorage.getItem("pms_hotel_rooms_master") || "[]",
    );
    const otherRooms = masterRooms.filter(
      (mr) => String(mr.hotel_id) !== String(selectedHotelId),
    );
    localStorage.setItem(
      "pms_hotel_rooms_master",
      JSON.stringify([...otherRooms, ...updatedList]),
    );
  };

  const selectedHotelObj = myHotels.find(
    (h) => String(h.id) === String(selectedHotelId),
  );

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
    const currentHotelId = String(selectedHotelId);
    const currentHotelName = selectedHotelObj?.name || "Cơ sở của tôi";

    let updated = [];
    if (editingRoom) {
      updated = rooms.map((r) =>
        r.id === editingRoom.id
          ? {
              ...r,
              ...formData,
              hotel_id: currentHotelId,
              hotel_name: currentHotelName,
            }
          : r,
      );
      alert(`✓ Đã cập nhật phòng ${formData.room_number}!`);
    } else {
      const newRoom = {
        ...formData,
        id: `R-${currentHotelId}-${Date.now().toString().slice(-4)}`,
        hotel_id: currentHotelId,
        hotel_name: currentHotelName,
      };
      updated = [newRoom, ...rooms];
      alert(
        `✓ Đã tạo mới phòng ${formData.room_number} cho cơ sở "${currentHotelName}" thành công!`,
      );
    }

    saveRooms(updated);
    setIsModalOpen(false);
  };

  const handleDelete = (id, name) => {
    if (!window.confirm(`Xác nhận xóa vĩnh viễn phòng "${name}"?`)) return;
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

  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      if (categoryFilter !== "all" && r.category !== categoryFilter)
        return false;
      if (statusFilter !== "all" && r.room_status !== statusFilter)
        return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          r.name?.toLowerCase().includes(q) ||
          r.room_number?.toLowerCase().includes(q) ||
          r.floor?.toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [rooms, categoryFilter, statusFilter, search]);

  return (
    <div className="space-y-6 font-sans pb-16 text-slate-800">
      {/* ── HEADER ── */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5">
        <div>
          <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider mb-1">
            <BedDouble size={16} /> Quản Trị Buồng Phòng Theo Cơ Sở (Room
            Inventory)
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Quản Lý Phòng & Bảng Giá
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {myHotels.length > 0
              ? `Đang hiển thị sơ đồ phòng của: ${selectedHotelObj?.name || "Chọn cơ sở..."}`
              : "Bạn chưa có cơ sở nào được duyệt mở bán"}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
          {myHotels.length > 0 && (
            <PropertySearchSelector
              hotels={myHotels}
              selectedHotelId={selectedHotelId}
              onSelectHotel={(id) => {
                setSelectedHotelId(id);
                setSearchParams({ hotelId: id });
              }}
              showAllOption={isAdmin}
              placeholder="Chọn cơ sở đã duyệt..."
            />
          )}

          {myHotels.length > 0 && (
            <button
              onClick={() => {
                setEditingRoom(null);
                setFormData({
                  name: "",
                  category: "Deluxe King",
                  room_number: `P.${101 + filteredRooms.length}`,
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
              className="px-5 py-3 bg-[#003580] hover:bg-blue-900 text-white font-bold text-xs rounded-2xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 shrink-0"
            >
              <Plus size={16} /> + Thêm Phòng Mới
            </button>
          )}
        </div>
      </div>

      {myHotels.length === 0 && !isAdmin ? (
        <EmptyState
          icon={AlertCircle}
          title="Chưa có cơ sở nào được phê duyệt mở bán"
          description="Cơ sở của bạn có thể đang ở trạng thái 'Chờ Admin duyệt' hoặc 'Bị từ chối'. Vui lòng kiểm tra trong mục 'Thông Tin Chỗ Nghỉ'."
        />
      ) : (
        <>
          {/* Bộ lọc */}
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
                className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-600 focus:bg-white"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl outline-none cursor-pointer focus:border-blue-600"
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
              className="px-3 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl outline-none cursor-pointer focus:border-blue-600"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="available">🟢 Sẵn sàng đón khách</option>
              <option value="occupied">🔵 Đang có khách ở</option>
              <option value="dirty">🔴 Chưa dọn buồng</option>
              <option value="maintenance">⚪ Đang bảo trì</option>
            </select>
          </div>

          {/* Danh sách phòng */}
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
                          <p className="text-xs text-slate-600 line-clamp-2 italic pt-1 leading-relaxed">
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
              title={`Chưa có buồng phòng nào cho cơ sở "${selectedHotelObj?.name || "Cơ sở đã chọn"}"`}
              description="Bấm nút '+ Thêm Phòng Mới' phía trên để tạo phòng cho cơ sở này."
              actionLabel="+ Tạo phòng cho cơ sở này ngay"
              onAction={() => {
                setEditingRoom(null);
                setFormData({
                  name: "Phòng Deluxe King",
                  category: "Deluxe King",
                  room_number: "P.101",
                  floor: "Tầng 1",
                  room_area: 32,
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
            />
          )}
        </>
      )}

      {/* MODAL THÊM / SỬA PHÒNG */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-xl shadow-2xl border space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="font-black text-base text-slate-900">
                  {editingRoom
                    ? `Sửa Phòng ${editingRoom.room_number}`
                    : "Tạo Hạng Phòng Mới"}
                </h3>
                <p className="text-[11px] text-blue-700 font-bold mt-0.5">
                  Cơ sở: <strong>{selectedHotelObj?.name}</strong>
                </p>
              </div>
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
                      Tải ảnh phòng thực tế (Tối đa 5MB)
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
                  <label className="block font-bold mb-1">
                    Tên hiển thị phòng *
                  </label>
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
                    className="w-full p-2.5 border rounded-xl font-semibold cursor-pointer"
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
                    className="w-full p-2.5 border rounded-xl font-bold cursor-pointer"
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
                  Mô tả phòng (Tùy chọn):
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="VD: Phòng ban công view biển, thoáng mát..."
                  className="w-full p-2.5 border rounded-xl"
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
                  Lưu Cấu Hình
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
