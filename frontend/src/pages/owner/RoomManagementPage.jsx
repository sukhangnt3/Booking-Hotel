import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, BedDouble, Users, Trash2, X, ChevronDown } from "lucide-react";
import { LoadingSpinner, EmptyState } from "@/components/common";
import { roomService, hotelService } from "@/services";

const RoomManagementPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [hotels, setHotels] = useState([]);
  const [selectedHotelId, setSelectedHotelId] = useState(
    searchParams.get("hotelId") || "",
  );
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [roomFormData, setRoomFormData] = useState({
    name: "",
    room_area: 30,
    capacity: 2,
    bed_type: "1 Giường đôi lớn",
    sell_price: 1500000,
    room_count: 5,
    image: "",
  });

  const formatVND = (num) => Number(num || 0).toLocaleString("vi-VN") + " ₫";

  // 1. Tải danh sách cơ sở
  useEffect(() => {
    const loadHotels = async () => {
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
    loadHotels();
  }, []);

  // 2. Tải danh sách Hạng phòng thật theo Khách sạn được chọn
  const fetchRooms = async () => {
    if (!selectedHotelId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await (roomService.getByHotelId
        ? roomService.getByHotelId(selectedHotelId)
        : roomService.getAll({ hotel_id: selectedHotelId }));
      const list = Array.isArray(res) ? res : res?.data || res?.rooms || [];
      setRooms(list);
    } catch (err) {
      console.error("Lỗi tải loại phòng:", err);
      setRooms([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, [selectedHotelId]);

  const openEditModal = (room) => {
    setEditingRoom(room);
    setRoomFormData({
      name: room.name || "",
      room_area: room.room_area || room.area || 30,
      capacity: room.capacity || 2,
      bed_type: room.bed_type || room.bedType || "1 Giường đôi",
      sell_price: room.sell_price || room.price || 1500000,
      room_count: room.room_count || room.quantity || 5,
      image: room.image || room.images?.[0] || "",
    });
    setIsModalOpen(true);
  };

  // 3. Lưu giá & tồn kho phòng vào Database
  const handleSaveRoom = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingRoom) {
        const roomId = editingRoom.id || editingRoom.room_id;
        await roomService.update(roomId, roomFormData);
      } else {
        await roomService.create({
          ...roomFormData,
          hotel_id: selectedHotelId,
        });
      }
      await fetchRooms();
      setIsModalOpen(false);
    } catch (err) {
      alert(
        "Không thể lưu cấu hình phòng: " + (err.message || "Vui lòng thử lại"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  // 4. Xóa loại phòng
  const handleDelete = async (id, name) => {
    if (!window.confirm(`Xác nhận xóa hạng phòng "${name}"?`)) return;
    try {
      await roomService.delete(id);
      setRooms((prev) => prev.filter((r) => (r.id || r.room_id) !== id));
    } catch (err) {
      alert("Lỗi khi xóa phòng: " + err.message);
    }
  };

  return (
    <div className="space-y-6 font-sans text-slate-800 pb-12">
      {/* ── HEADER ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-xl border border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Thiết lập Hạng phòng & Giá niêm yết
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Cài đặt giá bán theo đêm và quản lý số lượng phòng mở bán trực tiếp
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {hotels.length > 0 && (
            <div className="relative flex-1 md:w-64">
              <select
                value={selectedHotelId}
                onChange={(e) => {
                  setSelectedHotelId(e.target.value);
                  setSearchParams({ hotelId: e.target.value });
                }}
                className="w-full bg-white border border-slate-300 text-slate-800 text-xs font-medium px-3 py-2.5 rounded-lg outline-none focus:border-slate-900 appearance-none pr-8 cursor-pointer"
              >
                {hotels.map((h) => (
                  <option key={h.id || h.hotel_id} value={h.id || h.hotel_id}>
                    {h.name}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={15}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
            </div>
          )}

          <button
            onClick={() => {
              setEditingRoom(null);
              setRoomFormData({
                name: "",
                room_area: 30,
                capacity: 2,
                bed_type: "1 Giường đôi lớn",
                sell_price: 1500000,
                room_count: 5,
                image: "",
              });
              setIsModalOpen(true);
            }}
            disabled={!selectedHotelId}
            className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2.5 rounded-lg flex items-center gap-1.5 transition-colors shrink-0 disabled:opacity-50 cursor-pointer"
          >
            <Plus size={16} /> Thêm Hạng Phòng
          </button>
        </div>
      </div>

      {/* ── BẢNG HẠNG PHÒNG THẬT ── */}
      {loading ? (
        <div className="py-24 flex justify-center bg-white rounded-xl border border-slate-200">
          <LoadingSpinner size="lg" label="Đang tải danh mục phòng..." />
        </div>
      ) : rooms.length > 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Hạng phòng</th>
                  <th className="py-3 px-4">Diện tích</th>
                  <th className="py-3 px-4">Sức chứa</th>
                  <th className="py-3 px-4">Cấu hình giường</th>
                  <th className="py-3 px-4 text-right">Giá niêm yết / đêm</th>
                  <th className="py-3 px-4 text-center">Phòng mở bán</th>
                  <th className="py-3 px-4 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {rooms.map((r) => {
                  const id = r.id || r.room_id;
                  const image =
                    r.image ||
                    r.images?.[0] ||
                    "https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=200";

                  return (
                    <tr
                      key={id}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={image}
                            alt={r.name}
                            className="w-12 h-9 object-cover rounded border border-slate-200"
                          />
                          <div>
                            <span className="font-bold text-slate-900 block">
                              {r.name}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono">
                              #{id}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-medium">
                        {r.room_area || r.area || 30} m²
                      </td>
                      <td className="py-3.5 px-4 font-medium">
                        Tối đa {r.capacity || 2} khách
                      </td>
                      <td className="py-3.5 px-4 font-medium">
                        {r.bed_type || r.bedType || "1 Giường đôi"}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                        {formatVND(r.sell_price || r.price)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                          {r.room_count || r.quantity || 5} phòng
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEditModal(r)}
                            className="px-2.5 py-1 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded text-xs font-medium cursor-pointer"
                          >
                            Sửa giá & tồn kho
                          </button>
                          <button
                            onClick={() => handleDelete(id, r.name)}
                            className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState
          icon={BedDouble}
          title="Chưa có hạng phòng nào"
          description="Thiết lập các loại phòng để khách hàng có thể đặt chỗ."
          actionLabel="Thêm hạng phòng đầu tiên"
          onAction={() => setIsModalOpen(true)}
        />
      )}

      {/* ── MODAL SỬA GIÁ & TỒN KHO THẬT ── */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md overflow-hidden border border-slate-200 shadow-xl">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm">
                {editingRoom
                  ? "Thiết lập Giá & Số lượng Phòng"
                  : "Thêm Hạng Phòng Mới"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveRoom} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên Hạng phòng
                </label>
                <input
                  value={roomFormData.name}
                  onChange={(e) =>
                    setRoomFormData({ ...roomFormData, name: e.target.value })
                  }
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-slate-900 outline-none"
                  placeholder="VD: Deluxe King Room..."
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Giá bán / Đêm (VNĐ)
                  </label>
                  <input
                    type="number"
                    value={roomFormData.sell_price}
                    onChange={(e) =>
                      setRoomFormData({
                        ...roomFormData,
                        sell_price: Number(e.target.value),
                      })
                    }
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-slate-900 outline-none font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Số phòng mở bán
                  </label>
                  <input
                    type="number"
                    value={roomFormData.room_count}
                    onChange={(e) =>
                      setRoomFormData({
                        ...roomFormData,
                        room_count: Number(e.target.value),
                      })
                    }
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-slate-900 outline-none font-medium"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Diện tích (m²)
                  </label>
                  <input
                    type="number"
                    value={roomFormData.room_area}
                    onChange={(e) =>
                      setRoomFormData({
                        ...roomFormData,
                        room_area: Number(e.target.value),
                      })
                    }
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-slate-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Sức chứa tối đa
                  </label>
                  <input
                    type="number"
                    value={roomFormData.capacity}
                    onChange={(e) =>
                      setRoomFormData({
                        ...roomFormData,
                        capacity: Number(e.target.value),
                      })
                    }
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-slate-900 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Link Ảnh Phòng
                </label>
                <input
                  value={roomFormData.image}
                  onChange={(e) =>
                    setRoomFormData({ ...roomFormData, image: e.target.value })
                  }
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-slate-900 outline-none"
                  placeholder="https://..."
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
                  {submitting ? "Đang lưu..." : "Lưu cấu hình"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomManagementPage;
