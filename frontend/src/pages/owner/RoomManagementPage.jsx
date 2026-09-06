// src/pages/owner/RoomManagementPage.jsx
import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Plus,
  BedDouble,
  Trash2,
  X,
  DollarSign,
  AlertCircle,
  Sparkles,
  Check,
} from "lucide-react";
import { LoadingSpinner, EmptyState } from "@/components/common";
import apiClient from "@/services/apiClient";

const COMMON_AMENITIES = [
  "Điều hòa nhiệt độ",
  "Bồn tắm nằm",
  "Ban công ngắm cảnh",
  "Tủ lạnh mini / Minibar",
  "Smart TV màn hình phẳng",
  "Máy sấy tóc",
  "Két an toàn",
  "Bình đun siêu tốc",
];

export default function RoomManagementPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [hotels, setHotels] = useState([]);
  const [selectedHotelId, setSelectedHotelId] = useState(
    searchParams.get("hotelId") || "",
  );
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);

  // Form states khớp 100% với bảng room và room_amenity trong PostgreSQL
  const [formData, setFormData] = useState({
    name: "",
    capacity: 2,
    base_price: 500000,
    amount: 5,
    type: "Deluxe",
    bed_type: "1 Giường đôi King",
    room_area: 28,
    description: "",
    image: "",
    amenities: ["Điều hòa nhiệt độ", "Smart TV màn hình phẳng"],
  });

  const formatVND = (num) => Number(num || 0).toLocaleString("vi-VN") + " ₫";

  // 1. Tải danh sách khách sạn đã active cho dropdown
  const fetchMyHotels = useCallback(async () => {
    try {
      const res = await apiClient.get("/hotels/my-hotels?active_only=true");
      const list = res?.data || res?.hotels || res || [];
      const hotelArr = Array.isArray(list) ? list : [];
      setHotels(hotelArr);

      if (hotelArr.length > 0 && !selectedHotelId) {
        const firstId = String(hotelArr[0].id);
        setSelectedHotelId(firstId);
        setSearchParams({ hotelId: firstId });
      }
    } catch (err) {
      console.error("Lỗi lấy danh sách khách sạn:", err);
      setHotels([]);
    }
  }, [selectedHotelId, setSearchParams]);

  // 2. Tải danh sách phòng theo khách sạn được chọn
  const fetchRoomsByHotel = useCallback(async () => {
    if (!selectedHotelId || selectedHotelId === "all") {
      setRooms([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setApiError("");
    try {
      const res = await apiClient.get(`/rooms?hotel_id=${selectedHotelId}`);
      const list = res?.data || res?.rooms || res || [];
      setRooms(Array.isArray(list) ? list : []);
    } catch (err) {
      setApiError(err.message || "Không thể tải danh sách phòng.");
      setRooms([]);
    } finally {
      setLoading(false);
    }
  }, [selectedHotelId]);

  useEffect(() => {
    fetchMyHotels();
  }, [fetchMyHotels]);

  useEffect(() => {
    fetchRoomsByHotel();
  }, [fetchRoomsByHotel]);

  // Toggle tiện nghi phòng
  const handleToggleAmenity = (amenityName) => {
    setFormData((prev) => {
      const exists = prev.amenities.includes(amenityName);
      return {
        ...prev,
        amenities: exists
          ? prev.amenities.filter((a) => a !== amenityName)
          : [...prev.amenities, amenityName],
      };
    });
  };

  // 3. Lưu phòng vào PostgreSQL
  const handleSaveRoom = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        hotel_id: selectedHotelId,
        base_price: Number(formData.base_price),
        capacity: Number(formData.capacity),
        amount: Number(formData.amount),
        room_area: Number(formData.room_area || 25),
      };

      if (editingRoom) {
        await apiClient.put(`/rooms/${editingRoom.id}`, payload);
        alert("✓ Đã cập nhật hạng phòng và tiện nghi thành công!");
      } else {
        await apiClient.post("/rooms", payload);
        alert("✓ Đã thêm loại phòng mới và lưu tiện nghi vào cơ sở dữ liệu!");
      }

      setIsModalOpen(false);
      fetchRoomsByHotel();
    } catch (err) {
      alert(`Lỗi lưu phòng: ${err.message || "Máy chủ từ chối yêu cầu."}`);
    }
  };

  // 4. Xóa phòng
  const handleDeleteRoom = async (roomId) => {
    if (!window.confirm("Bạn có chắc muốn xóa loại phòng này?")) return;
    try {
      await apiClient.delete(`/rooms/${roomId}`);
      setRooms((prev) => prev.filter((r) => r.id !== roomId));
    } catch (err) {
      alert(`Lỗi xóa: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 font-sans pb-16 text-slate-800">
      {/* HEADER */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider mb-1">
            <DollarSign size={16} /> Quản Lý Phòng & Tiện Nghi (Bảng Room &
            Room_Amenity)
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Cập Nhật Trạng Thái Phòng, Giá & Tiện Nghi
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Thiết lập giá cơ bản, số lượng phòng trống và tiện ích cho từng cơ
            sở
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={selectedHotelId}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedHotelId(val);
              setSearchParams({ hotelId: val });
            }}
            className="p-2.5 border rounded-2xl text-xs font-bold text-blue-900 bg-slate-50 outline-none cursor-pointer"
          >
            {hotels.length === 0 && (
              <option value="">Chưa có khách sạn nào được duyệt</option>
            )}
            {hotels.map((h) => (
              <option key={h.id} value={h.id}>
                🏨 {h.name}
              </option>
            ))}
          </select>

          <button
            onClick={() => {
              if (!selectedHotelId) {
                alert("Vui lòng chọn cơ sở khách sạn trước khi thêm phòng!");
                return;
              }
              setEditingRoom(null);
              setFormData({
                name: "Phòng Deluxe King Hướng Biển",
                capacity: 2,
                base_price: 650000,
                amount: 5,
                type: "Deluxe",
                bed_type: "1 Giường đôi King Size",
                room_area: 30,
                description: "",
                image: "",
                amenities: [
                  "Điều hòa nhiệt độ",
                  "Bồn tắm nằm",
                  "Smart TV màn hình phẳng",
                ],
              });
              setIsModalOpen(true);
            }}
            className="px-4 py-2.5 bg-[#003580] hover:bg-blue-900 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap active:scale-95"
          >
            <Plus size={15} /> + Thêm Hạng Phòng
          </button>
        </div>
      </div>

      {apiError && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl flex items-center gap-2 font-bold">
          <AlertCircle size={16} /> <span>{apiError}</span>
        </div>
      )}

      {/* DANH SÁCH THẺ PHÒNG */}
      {loading ? (
        <div className="py-24 flex justify-center bg-white rounded-3xl border">
          <LoadingSpinner
            size="lg"
            label="Đang tải danh sách phòng từ Database..."
          />
        </div>
      ) : rooms.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rooms.map((room) => (
            <div
              key={room.id}
              className="bg-white rounded-3xl border overflow-hidden shadow-xs hover:shadow-md transition flex flex-col justify-between"
            >
              <div className="p-6 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold text-blue-700 uppercase bg-blue-50 px-2 py-0.5 rounded">
                      {room.type || "Tiêu Chuẩn"}
                    </span>
                    <h3 className="text-lg font-black text-slate-900 mt-1 leading-snug">
                      {room.name}
                    </h3>
                  </div>
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-bold text-xs rounded-full shrink-0">
                    Kho: {room.amount} phòng
                  </span>
                </div>

                <div className="space-y-1 text-xs text-slate-500 pt-2 border-t">
                  <p>
                    Giường: <b>{room.bed_type || "1 Giường đôi"}</b>
                  </p>
                  <p>
                    Sức chứa: <b>{room.capacity} Người lớn</b>
                  </p>
                  <p>
                    Diện tích: <b>{room.room_area || 25} m²</b>
                  </p>
                </div>

                {/* HIỂN THỊ TIỆN NGHI TỪ BẢNG ROOM_AMENITY */}
                {room.amenities && room.amenities.length > 0 && (
                  <div className="pt-2">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                      Tiện nghi phòng:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {room.amenities.map((am, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium"
                        >
                          ✓ {am}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t mt-2">
                  <span className="text-xs text-slate-400 block">
                    Giá niêm yết (base_price):
                  </span>
                  <strong className="text-xl font-black text-[#ff6a00]">
                    {formatVND(room.base_price)}
                  </strong>
                  <span className="text-xs text-slate-500"> / đêm</span>
                </div>
              </div>

              <div className="p-5 pt-0 border-t flex justify-end gap-2 pt-3">
                <button
                  onClick={() => {
                    setEditingRoom(room);
                    setFormData({
                      ...room,
                      amenities: Array.isArray(room.amenities)
                        ? room.amenities
                        : [],
                    });
                    setIsModalOpen(true);
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Sửa Giá & Tiện Nghi
                </button>
                <button
                  onClick={() => handleDeleteRoom(room.id)}
                  className="p-2 text-slate-400 hover:text-rose-600 cursor-pointer"
                  title="Xóa phòng"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={BedDouble}
          title="Chưa có loại phòng nào cho cơ sở này"
          description="Bấm '+ Thêm Hạng Phòng' để cấu hình loại phòng và bảng giá mở bán."
        />
      )}

      {/* MODAL THÊM / SỬA PHÒNG & TIỆN NGHI */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border space-y-4 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-black text-base text-slate-900">
                {editingRoom
                  ? "Chỉnh Sửa Hạng Phòng"
                  : "Thêm Hạng Phòng Mới Vào Database"}
              </h3>
              <button onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveRoom} className="space-y-3">
              <div>
                <label className="block font-bold mb-1">Tên hạng phòng *</label>
                <input
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="VD: Phòng Deluxe King Hướng Biển"
                  className="w-full p-2.5 border rounded-xl font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">
                    Giá bán 1 đêm (base_price) *
                  </label>
                  <input
                    required
                    type="number"
                    value={formData.base_price}
                    onChange={(e) =>
                      setFormData({ ...formData, base_price: e.target.value })
                    }
                    className="w-full p-2.5 border rounded-xl font-black text-[#ff6a00]"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">
                    Số lượng phòng kho (amount) *
                  </label>
                  <input
                    required
                    type="number"
                    min={1}
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({ ...formData, amount: e.target.value })
                    }
                    className="w-full p-2.5 border rounded-xl font-black text-emerald-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold mb-1">
                    Sức chứa (người)
                  </label>
                  <input
                    type="number"
                    value={formData.capacity}
                    onChange={(e) =>
                      setFormData({ ...formData, capacity: e.target.value })
                    }
                    className="w-full p-2.5 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Loại giường</label>
                  <input
                    value={formData.bed_type}
                    onChange={(e) =>
                      setFormData({ ...formData, bed_type: e.target.value })
                    }
                    placeholder="1 King / 2 Single"
                    className="w-full p-2.5 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Diện tích (m²)</label>
                  <input
                    type="number"
                    value={formData.room_area}
                    onChange={(e) =>
                      setFormData({ ...formData, room_area: e.target.value })
                    }
                    className="w-full p-2.5 border rounded-xl"
                  />
                </div>
              </div>

              {/* CHỌN TIỆN NGHI PHÒNG (BẢNG ROOM_AMENITY) */}
              <div className="pt-2 border-t">
                <label className="block font-bold mb-2 text-slate-800 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-amber-500" />
                  Tiện nghi phòng (Lưu vào bảng room_amenity)
                </label>
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-2xl border">
                  {COMMON_AMENITIES.map((item) => {
                    const isChecked = formData.amenities.includes(item);
                    return (
                      <label
                        key={item}
                        onClick={() => handleToggleAmenity(item)}
                        className={`flex items-center gap-2 p-1.5 rounded-lg cursor-pointer transition select-none text-[11px] font-semibold ${
                          isChecked
                            ? "bg-blue-100 text-blue-900"
                            : "hover:bg-slate-200/60 text-slate-700"
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center ${
                            isChecked
                              ? "bg-[#003580] border-[#003580] text-white"
                              : "border-slate-300 bg-white"
                          }`}
                        >
                          {isChecked && <Check size={11} strokeWidth={3} />}
                        </div>
                        <span className="truncate">{item}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">
                  Link ảnh phòng (URL)
                </label>
                <input
                  value={formData.image}
                  onChange={(e) =>
                    setFormData({ ...formData, image: e.target.value })
                  }
                  placeholder="https://images.unsplash.com/..."
                  className="w-full p-2.5 border rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border rounded-xl font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#003580] text-white font-bold rounded-xl cursor-pointer"
                >
                  Lưu Vào PostgreSQL
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
