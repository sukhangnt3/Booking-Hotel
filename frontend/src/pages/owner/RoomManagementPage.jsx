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
  Eye,
  Key,
  Wand2,
  Bed,
  Users,
  Maximize,
} from "lucide-react";
import { LoadingSpinner, EmptyState } from "@/components/common";
import apiClient from "@/services/apiClient";
import { ROOM_AMENITIES_LIST } from "@/constants/amenitiesData";

// 👉 Định nghĩa trực tiếp danh mục Hướng phòng trong file, không phụ thuộc file khác
export const ROOM_VIEWS = [
  { id: "city_view", label: "Hướng thành phố (City View)" },
  { id: "sea_view", label: "Hướng biển (Ocean / Sea View)" },
  { id: "pool_view", label: "Hướng hồ bơi (Pool View)" },
  { id: "garden_view", label: "Hướng vườn (Garden View)" },
  { id: "mountain_view", label: "Hướng núi / Đồi (Mountain View)" },
  { id: "internal_view", label: "Hướng nội khu / Không cửa sổ" },
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

  const [formData, setFormData] = useState({
    name: "",
    type: "Deluxe",
    room_view: "city_view",
    capacity: 2,
    base_price: 650000,
    amount: 4,
    roomNumbersText: "101, 102, 103, 104",
    bed_type: "1 Giường đôi lớn (King/Queen Size)",
    room_area: 28,
    description: "",
    image: "",
    amenities: ["air_conditioner", "tv_smart", "wifi", "hot_water_shower"],
  });

  const formatVND = (num) => Number(num || 0).toLocaleString("vi-VN") + " ₫";

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

  const handleRoomNumbersChange = (val) => {
    const count = val
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean).length;
    setFormData((prev) => ({
      ...prev,
      roomNumbersText: val,
      amount: count > 0 ? count : 1,
    }));
  };

  const handleAutoGenerateRoomNumbers = (count) => {
    const nextIdx = rooms.length + 1;
    const generated = Array.from(
      { length: count },
      (_, i) => `P.${nextIdx}0${i + 1}`,
    ).join(", ");
    setFormData((prev) => ({
      ...prev,
      roomNumbersText: generated,
      amount: count,
    }));
  };

  const handleToggleAmenity = (amenityId) => {
    setFormData((prev) => {
      const exists = prev.amenities.includes(amenityId);
      return {
        ...prev,
        amenities: exists
          ? prev.amenities.filter((a) => a !== amenityId)
          : [...prev.amenities, amenityId],
      };
    });
  };

  const handleSaveRoom = async (e) => {
    e.preventDefault();
    try {
      const numbers = formData.roomNumbersText
        ? formData.roomNumbersText
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [];

      const payload = {
        ...formData,
        hotel_id: selectedHotelId,
        base_price: Number(formData.base_price),
        capacity: Number(formData.capacity),
        amount: numbers.length > 0 ? numbers.length : Number(formData.amount),
        room_area: Number(formData.room_area || 28),
        room_numbers: numbers,
      };

      if (editingRoom) {
        await apiClient.put(`/rooms/${editingRoom.id}`, payload);
        alert("✓ Đã cập nhật hạng phòng và số phòng thành công!");
      } else {
        await apiClient.post("/rooms", payload);
        alert("✓ Đã thêm loại phòng mới và lưu vào cơ sở dữ liệu!");
      }

      setIsModalOpen(false);
      fetchRoomsByHotel();
    } catch (err) {
      alert(`Lỗi lưu phòng: ${err.response?.data?.message || err.message}`);
    }
  };

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
            <DollarSign size={16} /> Quản Lý Hạng Phòng & Số Phòng (Bảng Room &
            Room_Unit)
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Cập Nhật Giá Bán, Hướng Phòng & Sức Chứa
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Đồng bộ trực tiếp với hệ thống phòng ngủ và số phòng lễ tân giao
            chìa khóa
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
            className="h-11 px-4 border rounded-full text-xs font-bold text-blue-900 bg-slate-50 outline-none cursor-pointer"
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
                type: "Deluxe",
                room_view: "sea_view",
                capacity: 2,
                base_price: 650000,
                amount: 4,
                roomNumbersText: "P.101, P.102, P.103, P.104",
                bed_type: "1 Giường đôi lớn (King/Queen Size)",
                room_area: 30,
                description: "",
                image: "",
                amenities: [
                  "air_conditioner",
                  "tv_smart",
                  "wifi",
                  "hot_water_shower",
                ],
              });
              setIsModalOpen(true);
            }}
            className="px-5 h-11 bg-[#003580] hover:bg-blue-900 text-white font-bold text-xs rounded-full shadow-xs transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap active:scale-95"
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
          {rooms.map((room) => {
            const viewObj = ROOM_VIEWS.find((v) => v.id === room.room_view);

            return (
              <div
                key={room.id}
                className="bg-white rounded-3xl border overflow-hidden shadow-xs hover:shadow-md transition flex flex-col justify-between"
              >
                <div className="p-6 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold text-blue-700 uppercase bg-blue-50 px-2 py-0.5 rounded">
                          {room.type || "Tiêu Chuẩn"}
                        </span>
                        {viewObj && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded flex items-center gap-1">
                            <Eye size={11} /> {viewObj.label.split("(")[0]}
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-black text-slate-900 mt-1 leading-snug">
                        {room.name}
                      </h3>
                    </div>
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-bold text-xs rounded-full shrink-0">
                      Kho: {room.amount} phòng
                    </span>
                  </div>

                  <div className="space-y-1 text-xs text-slate-600 pt-2 border-t">
                    <p className="flex items-center gap-1">
                      <Bed size={13} className="text-blue-600" /> Giường:{" "}
                      <b>{room.bed_type || "1 Giường đôi"}</b>
                    </p>
                    <p className="flex items-center gap-1">
                      <Users size={13} className="text-blue-600" /> Sức chứa:{" "}
                      <b>{room.capacity} Người lớn</b>
                    </p>
                    <p className="flex items-center gap-1">
                      <Maximize size={13} className="text-slate-400" /> Diện
                      tích: <b>{room.room_area || 28} m²</b>
                    </p>
                    {room.room_numbers && (
                      <p className="flex items-center gap-1 text-blue-900 pt-1">
                        <Key size={13} className="text-blue-600" /> Số phòng:{" "}
                        <b>
                          {Array.isArray(room.room_numbers)
                            ? room.room_numbers.join(", ")
                            : room.room_numbers}
                        </b>
                      </p>
                    )}
                  </div>

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
                        name: room.name || "",
                        type: room.type || "Deluxe",
                        room_view: room.room_view || "city_view",
                        capacity: room.capacity || 2,
                        base_price: room.base_price || 650000,
                        amount: room.amount || 4,
                        roomNumbersText: Array.isArray(room.room_numbers)
                          ? room.room_numbers.join(", ")
                          : room.roomNumbersText || "P.101, P.102",
                        bed_type:
                          room.bed_type || "1 Giường đôi lớn (King/Queen Size)",
                        room_area: room.room_area || 28,
                        description: room.description || "",
                        image: room.image || "",
                        amenities: Array.isArray(room.amenities)
                          ? room.amenities
                          : [],
                      });
                      setIsModalOpen(true);
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-full text-xs font-bold transition cursor-pointer"
                  >
                    Chỉnh sửa phòng
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
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={BedDouble}
          title="Chưa có loại phòng nào cho cơ sở này"
          description="Bấm '+ Thêm Hạng Phòng' để cấu hình loại phòng và bảng giá mở bán."
        />
      )}

      {/* MODAL THÊM / SỬA PHÒNG */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-lg shadow-2xl border space-y-4 text-xs max-h-[90vh] overflow-y-auto font-sans">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-extrabold text-base text-slate-900">
                {editingRoom ? "Chỉnh Sửa Hạng Phòng" : "Thêm Hạng Phòng Mới"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="cursor-pointer text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveRoom} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-600 mb-1">
                  Tên hạng phòng *
                </label>
                <input
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="VD: Phòng Deluxe King Hướng Biển"
                  className="w-full h-10 px-3 border rounded-xl font-bold bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-600 mb-1">
                    Tầm nhìn / Hướng phòng (room_view) *
                  </label>
                  <select
                    value={formData.room_view}
                    onChange={(e) =>
                      setFormData({ ...formData, room_view: e.target.value })
                    }
                    className="w-full h-10 px-2.5 border rounded-xl font-semibold bg-white cursor-pointer"
                  >
                    {ROOM_VIEWS.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-600 mb-1">
                    Giá 1 đêm (base_price) *
                  </label>
                  <input
                    required
                    type="number"
                    step="10000"
                    value={formData.base_price}
                    onChange={(e) =>
                      setFormData({ ...formData, base_price: e.target.value })
                    }
                    className="w-full h-10 px-3 border rounded-xl font-black text-[#ff6a00] bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-600 mb-1">
                    Sức chứa (người)
                  </label>
                  <select
                    value={formData.capacity}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        capacity: Number(e.target.value),
                      })
                    }
                    className="w-full h-10 px-2.5 border rounded-xl bg-white"
                  >
                    {[1, 2, 3, 4, 5, 6].map((n) => (
                      <option key={n} value={n}>
                        {n} người lớn
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block font-bold text-slate-600 mb-1">
                    Loại giường (bed_type) *
                  </label>
                  <select
                    value={formData.bed_type}
                    onChange={(e) =>
                      setFormData({ ...formData, bed_type: e.target.value })
                    }
                    className="w-full h-10 px-2.5 border rounded-xl font-semibold bg-white cursor-pointer"
                  >
                    <option value="1 Giường đôi lớn (King/Queen Size)">
                      1 Giường đôi lớn (King/Queen Size)
                    </option>
                    <option value="2 Giường đơn (Twin Bed)">
                      2 Giường đơn (Twin Bed)
                    </option>
                    <option value="1 Giường đôi + 1 Giường đơn (Family)">
                      1 Giường đôi + 1 Giường đơn (Family)
                    </option>
                  </select>
                </div>
              </div>

              {/* SỐ PHÒNG THỰC TẾ CHO BẢNG ROOM_UNIT */}
              <div className="p-3 bg-blue-50/60 rounded-2xl border border-blue-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-blue-950 flex items-center gap-1 text-[11px]">
                    <Key size={13} className="text-blue-600" /> Danh sách số
                    phòng thực tế (room_unit):
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleAutoGenerateRoomNumbers(4)}
                      className="text-[10px] font-bold text-blue-600 hover:text-blue-700 cursor-pointer flex items-center gap-0.5"
                    >
                      <Wand2 size={10} /> Sinh 4 phòng
                    </button>
                  </div>
                </div>
                <input
                  value={formData.roomNumbersText}
                  onChange={(e) => handleRoomNumbersChange(e.target.value)}
                  placeholder="VD: 101, 102, 103, 104"
                  className="w-full h-9 px-3 text-xs font-bold text-blue-900 bg-white rounded-xl border border-slate-300 outline-none"
                />
                <span className="text-[10px] text-slate-400 block">
                  Tổng cộng: {formData.amount || 0} phòng kho thực tế
                </span>
              </div>

              {/* TIỆN NGHI PHÒNG CHUẨN */}
              <div className="pt-1">
                <label className="block font-bold mb-1.5 text-slate-800 flex items-center gap-1">
                  <Sparkles size={13} className="text-amber-500" /> Tiện nghi
                  phòng (room_amenity):
                </label>
                <div className="grid grid-cols-2 gap-1.5 bg-slate-50 p-3 rounded-2xl border">
                  {ROOM_AMENITIES_LIST.map((item) => {
                    const isChecked =
                      formData.amenities.includes(item.id) ||
                      formData.amenities.includes(item.label);
                    return (
                      <label
                        key={item.id}
                        onClick={() => handleToggleAmenity(item.id)}
                        className={`flex items-center gap-2 p-1.5 rounded-lg cursor-pointer transition select-none text-[11px] font-medium ${
                          isChecked
                            ? "bg-blue-100 text-blue-900 font-bold"
                            : "hover:bg-slate-200/50 text-slate-700"
                        }`}
                      >
                        <div
                          className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
                            isChecked
                              ? "bg-[#003580] border-[#003580] text-white"
                              : "border-slate-300 bg-white"
                          }`}
                        >
                          {isChecked && <Check size={10} strokeWidth={3} />}
                        </div>
                        <span className="truncate">{item.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2 border rounded-full font-bold cursor-pointer hover:bg-slate-50 text-slate-700"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-[#003580] hover:bg-blue-900 text-white font-bold rounded-full cursor-pointer shadow-md transition active:scale-95"
                >
                  Lưu Hạng Phòng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
