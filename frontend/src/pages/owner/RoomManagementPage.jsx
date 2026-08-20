import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Plus,
  BedDouble,
  Users,
  Key,
  Settings,
  Trash2,
  Building2,
  DoorOpen,
  Square,
  Sparkles,
} from "lucide-react";

// Components
import { Button, Badge } from "@/components/ui";
import { LoadingSpinner, EmptyState } from "@/components/common";

// Services
import { roomService, hotelService } from "@/services";

const RoomManagementPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // ─── 1. STATES ───
  const [hotels, setHotels] = useState([]);
  const [selectedHotelId, setSelectedHotelId] = useState(
    searchParams.get("hotelId") || "",
  );
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  const formatVND = (num) => Number(num || 0).toLocaleString("vi-VN") + " ₫";

  // ─── 2. LOAD DANH SÁCH KHÁCH SẠN CỦA OWNER ĐẦU TIÊN ───
  useEffect(() => {
    const fetchHotels = async () => {
      try {
        const res = await hotelService.getAll({ isOwner: true });
        const list = Array.isArray(res) ? res : res?.data || res?.hotels || [];
        setHotels(list);

        // Nếu chưa chọn khách sạn nào, tự động chọn khách sạn đầu tiên
        if (list.length > 0 && !selectedHotelId) {
          const firstId = list[0].id || list[0].hotel_id;
          setSelectedHotelId(String(firstId));
          setSearchParams({ hotelId: String(firstId) });
        }
      } catch (err) {
        console.error("Lỗi lấy danh sách khách sạn:", err);
      }
    };

    fetchHotels();
  }, []);

  // ─── 3. LOAD DANH SÁCH LOẠI PHÒNG KHI ĐỔI KHÁCH SẠN ───
  const fetchRooms = async () => {
    if (!selectedHotelId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await roomService.getByHotelId(selectedHotelId);
      const list = Array.isArray(res) ? res : res?.data || res?.rooms || [];
      setRooms(list);
    } catch (err) {
      console.error("Lỗi lấy danh sách loại phòng:", err);
      setRooms([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, [selectedHotelId]);

  // Đổi khách sạn đang xem
  const handleHotelChange = (newHotelId) => {
    setSelectedHotelId(newHotelId);
    setSearchParams({ hotelId: newHotelId });
  };

  // ─── 4. XÓA LOẠI PHÒNG ───
  const handleDeleteRoom = async (roomId, roomName) => {
    if (
      !window.confirm(
        `Bạn có chắc muốn xóa loại phòng "${roomName}" không? Các số phòng thuộc loại này cũng sẽ bị xóa.`,
      )
    ) {
      return;
    }

    setDeletingId(roomId);
    try {
      await roomService.delete(roomId);
      setRooms((prev) => prev.filter((r) => r.id !== roomId));
    } catch (err) {
      alert("Không thể xóa loại phòng: " + (err.message || "Vui lòng thử lại"));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-8 font-sans pb-16 text-slate-800">
      {/* ─── HEADER & CHỌN KHÁCH SẠN ─── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase text-emerald-600 tracking-wider">
              Quản Lý Phòng
            </span>
            <Badge variant="primary" size="sm">
              {rooms.length} Loại phòng
            </Badge>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
            Danh Mục Loại Phòng
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Thiết lập các hạng phòng, cài đặt giá niêm yết mỗi đêm và sức chứa
            khách tối đa.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          {/* Dropdown chọn cơ sở */}
          {hotels.length > 0 && (
            <div className="relative">
              <select
                value={selectedHotelId}
                onChange={(e) => handleHotelChange(e.target.value)}
                className="w-full sm:w-64 bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold px-4 py-3 rounded-2xl outline-none cursor-pointer focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 appearance-none"
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

          {/* Nút thêm loại phòng mới */}
          <Button
            onClick={() =>
              navigate(`/owner/rooms/new?hotelId=${selectedHotelId}`)
            }
            disabled={!selectedHotelId}
            className="bg-[#006ce4] hover:bg-blue-700 text-white font-extrabold px-6 h-12 rounded-2xl shadow-lg shadow-blue-100 shrink-0"
            leftIcon={<Plus size={18} />}
          >
            Thêm Loại Phòng Mới
          </Button>
        </div>
      </div>

      {/* ─── DANH SÁCH BẢNG LOẠI PHÒNG (TABLE) ─── */}
      {loading ? (
        <div className="py-24 flex justify-center bg-white rounded-3xl border border-slate-200/80 shadow-sm">
          <LoadingSpinner size="lg" label="Đang tải danh sách loại phòng..." />
        </div>
      ) : rooms.length > 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              {/* Header Bảng */}
              <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="p-4 pl-6">Loại Phòng & Hình Ảnh</th>
                  <th className="p-4">Diện Tích</th>
                  <th className="p-4">Sức Chứa</th>
                  <th className="p-4">Loại Giường</th>
                  <th className="p-4 text-right">Giá Niêm Yết / Đêm</th>
                  <th className="p-4 text-center">Tồn Kho (Số Phòng)</th>
                  <th className="p-4 pr-6 text-center">Thao Tác</th>
                </tr>
              </thead>

              {/* Body Bảng */}
              <tbody className="divide-y divide-slate-100 font-medium">
                {rooms.map((room) => {
                  const id = room.id || room.room_id;
                  const isDeleting = deletingId === id;
                  const image =
                    room.image ||
                    room.images?.[0]?.path ||
                    room.images?.[0] ||
                    "https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=500";

                  return (
                    <tr
                      key={id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      {/* Ảnh & Tên */}
                      <td className="p-4 pl-6">
                        <div className="flex items-center gap-3">
                          <img
                            src={image}
                            alt={room.name}
                            className="w-16 h-12 object-cover rounded-xl border border-slate-200 shrink-0"
                          />
                          <div>
                            <p className="font-extrabold text-slate-900 text-sm leading-snug">
                              {room.name}
                            </p>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              ID: #{id}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Diện tích */}
                      <td className="p-4 font-bold text-slate-600">
                        <span className="flex items-center gap-1">
                          <Square size={13} className="text-slate-400" />
                          {room.room_area || room.area || 25} m²
                        </span>
                      </td>

                      {/* Sức chứa */}
                      <td className="p-4 font-bold text-slate-600">
                        <span className="flex items-center gap-1">
                          <Users size={14} className="text-[#006ce4]" />
                          Tối đa {room.capacity || 2} khách
                        </span>
                      </td>

                      {/* Loại giường */}
                      <td className="p-4 font-bold text-slate-600">
                        <span className="flex items-center gap-1">
                          <BedDouble size={14} className="text-slate-400" />
                          {room.bed_type || room.bedType || "1 Giường đôi lớn"}
                        </span>
                      </td>

                      {/* Giá niêm yết */}
                      <td className="p-4 text-right font-black text-emerald-600 text-sm">
                        {formatVND(
                          room.sell_price || room.base_price || room.price,
                        )}
                      </td>

                      {/* Tồn kho */}
                      <td className="p-4 text-center">
                        <span className="bg-slate-100 text-slate-800 px-3 py-1 rounded-xl font-black text-[11px] border border-slate-200">
                          {room.room_count ||
                            room.totalQuantity ||
                            room.amount ||
                            5}{" "}
                          phòng
                        </span>
                      </td>

                      {/* Nút thao tác */}
                      <td className="p-4 pr-6 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {/* Sửa thông tin loại phòng */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              navigate(
                                `/owner/rooms/edit/${id}?hotelId=${selectedHotelId}`,
                              )
                            }
                            className="px-3 py-1.5 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold"
                            title="Chỉnh sửa loại phòng"
                          >
                            <Settings size={14} className="mr-1" /> Sửa
                          </Button>

                          {/* Sơ đồ số phòng (🔑 Room Numbers) */}
                          <Button
                            size="sm"
                            onClick={() =>
                              navigate(
                                `/owner/room-numbers?typeId=${id}&hotelId=${selectedHotelId}`,
                              )
                            }
                            className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-xl text-xs font-black border border-blue-200"
                            title="Quản lý số phòng cụ thể"
                          >
                            <Key size={14} className="mr-1" /> Sơ đồ phòng
                          </Button>

                          {/* Xóa loại phòng */}
                          <button
                            disabled={isDeleting}
                            onClick={() => handleDeleteRoom(id, room.name)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors disabled:opacity-50"
                            title="Xóa loại phòng này"
                          >
                            <Trash2 size={16} />
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
          title="Chưa có loại phòng nào cho khách sạn này"
          description="Hãy tạo các hạng phòng (Standard, Deluxe, Suite...) để khách hàng bắt đầu đặt phòng."
          actionLabel="Tạo loại phòng đầu tiên"
          onAction={() =>
            navigate(`/owner/rooms/new?hotelId=${selectedHotelId}`)
          }
        />
      )}
    </div>
  );
};

export default RoomManagementPage;
