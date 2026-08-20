import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Key,
  Sparkles,
  Brush,
  User,
  Plus,
  Building2,
  BedDouble,
  CheckCircle2,
  Clock,
  Wrench,
  XCircle,
  Filter,
} from "lucide-react";

// Components
import { Button, Badge, Modal, Input } from "@/components/ui";
import { LoadingSpinner, EmptyState } from "@/components/common";

// Services
import { roomService, hotelService } from "@/services";

const RoomNumberPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // ─── 1. STATES ───
  const [hotels, setHotels] = useState([]);
  const [selectedHotelId, setSelectedHotelId] = useState(
    searchParams.get("hotelId") || "",
  );
  const [roomTypes, setRoomTypes] = useState([]);
  const [selectedTypeId, setSelectedTypeId] = useState(
    searchParams.get("typeId") || "all",
  );

  const [roomNumbers, setRoomNumbers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'available' | 'occupied' | 'dirty'

  // Modal thêm số phòng
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newRoomForm, setNewRoomForm] = useState({
    room_type_id: "",
    room_numbers_input: "", // Ví dụ: "101, 102, 103, 104"
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ─── 2. LOAD DANH SÁCH KHÁCH SẠN CỦA OWNER ───
  useEffect(() => {
    const fetchHotels = async () => {
      try {
        const res = await hotelService.getAll({ isOwner: true });
        const list = Array.isArray(res) ? res : res?.data || res?.hotels || [];
        setHotels(list);

        if (list.length > 0 && !selectedHotelId) {
          const firstHotelId = String(list[0].id || list[0].hotel_id);
          setSelectedHotelId(firstHotelId);
          setSearchParams({ hotelId: firstHotelId });
        }
      } catch (err) {
        console.error("Lỗi tải danh sách khách sạn:", err);
      }
    };

    fetchHotels();
  }, []);

  // ─── 3. LOAD LOẠI PHÒNG & SỐ PHÒNG ───
  const fetchRoomData = async () => {
    if (!selectedHotelId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // 1. Lấy danh sách loại phòng của khách sạn
      const typesRes = await roomService.getByHotelId(selectedHotelId);
      const typesList = Array.isArray(typesRes)
        ? typesRes
        : typesRes?.data || [];
      setRoomTypes(typesList);

      if (typesList.length > 0 && !newRoomForm.room_type_id) {
        setNewRoomForm((prev) => ({
          ...prev,
          room_type_id: String(typesList[0].id),
        }));
      }

      // 2. Lấy danh sách tất cả các số phòng cụ thể (101, 102...)
      let numbersList = [];
      if (selectedTypeId && selectedTypeId !== "all") {
        const numRes = await roomService.getRoomNumbers(selectedTypeId);
        numbersList = Array.isArray(numRes) ? numRes : numRes?.data || [];
      } else {
        // Lấy toàn bộ số phòng của tất cả loại phòng
        const allNums = await Promise.all(
          typesList.map((t) =>
            roomService.getRoomNumbers(t.id).catch(() => []),
          ),
        );
        numbersList = allNums.flatMap((item) =>
          Array.isArray(item) ? item : item?.data || [],
        );
      }

      setRoomNumbers(numbersList);
    } catch (err) {
      console.error("Lỗi tải sơ đồ phòng:", err);
      setRoomNumbers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoomData();
  }, [selectedHotelId, selectedTypeId]);

  // ─── 4. ĐỔI TRẠNG THÁI VỆ SINH (HOUSEKEEPING) ───
  const handleToggleClean = async (roomNumberItem) => {
    const nextClean =
      roomNumberItem.clean_status === "clean" ? "dirty" : "clean";

    // Cập nhật UI tức thì
    setRoomNumbers((prev) =>
      prev.map((r) =>
        r.id === roomNumberItem.id ? { ...r, clean_status: nextClean } : r,
      ),
    );

    try {
      if (roomService.updateRoomNumberStatus) {
        await roomService.updateRoomNumberStatus(roomNumberItem.id, {
          clean_status: nextClean,
        });
      }
    } catch (err) {
      console.error("Lỗi cập nhật trạng thái dọn dẹp:", err);
      // Hoàn tác nếu lỗi
      setRoomNumbers((prev) =>
        prev.map((r) =>
          r.id === roomNumberItem.id
            ? { ...r, clean_status: roomNumberItem.clean_status }
            : r,
        ),
      );
    }
  };

  // ─── 5. TẠO HÀNG LOẠT SỐ PHÒNG MỚI (MODAL SUBMIT) ───
  const handleCreateRoomNumbers = async (e) => {
    e.preventDefault();
    if (!newRoomForm.room_numbers_input.trim()) return;

    setIsSubmitting(true);
    // Tách chuỗi "101, 102, 103" thành mảng ["101", "102", "103"]
    const numbersArray = newRoomForm.room_numbers_input
      .split(/[,;\n]+/)
      .map((n) => n.trim())
      .filter(Boolean);

    try {
      await roomService.createRoomNumbers(
        newRoomForm.room_type_id,
        numbersArray,
      );
      alert(`Đã thêm thành công ${numbersArray.length} phòng mới!`);
      setIsModalOpen(false);
      setNewRoomForm((prev) => ({ ...prev, room_numbers_input: "" }));
      fetchRoomData(); // Load lại sơ đồ phòng
    } catch (err) {
      alert("Lỗi khi thêm số phòng: " + (err.message || "Vui lòng thử lại"));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Lọc phòng theo trạng thái
  const filteredRooms = roomNumbers.filter((r) => {
    if (statusFilter === "available") return r.status === "available";
    if (statusFilter === "occupied") return r.status === "occupied";
    if (statusFilter === "dirty") return r.clean_status === "dirty";
    return true;
  });

  return (
    <div className="space-y-8 font-sans pb-16 text-slate-800">
      {/* ─── HEADER & CHỌN KHÁCH SẠN ─── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase text-emerald-600 tracking-wider">
              Sơ Đồ Phòng Vật Lý
            </span>
            <Badge variant="primary" size="sm">
              {roomNumbers.length} Phòng hoạt động
            </Badge>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
            Sơ Đồ & Tình Trạng Số Phòng
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Theo dõi trực quan phòng 101, 102... tình trạng có khách, phòng bảo
            trì và dọn dẹp vệ sinh.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Dropdown chọn khách sạn */}
          {hotels.length > 0 && (
            <div className="relative flex-1 sm:w-60">
              <select
                value={selectedHotelId}
                onChange={(e) => {
                  setSelectedHotelId(e.target.value);
                  setSearchParams({
                    hotelId: e.target.value,
                    typeId: selectedTypeId,
                  });
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

          {/* Nút mở Modal thêm phòng */}
          <Button
            onClick={() => setIsModalOpen(true)}
            disabled={roomTypes.length === 0}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-6 h-12 rounded-2xl shadow-lg shadow-emerald-100 shrink-0"
            leftIcon={<Plus size={18} />}
          >
            Thêm Số Phòng Mới
          </Button>
        </div>
      </div>

      {/* ─── THANH LỌC LOẠI PHÒNG & TRẠNG THÁI ─── */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        {/* Lọc theo Loại phòng */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar w-full lg:w-auto pb-1 lg:pb-0">
          <button
            onClick={() => setSelectedTypeId("all")}
            className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              selectedTypeId === "all"
                ? "bg-slate-900 text-white shadow-md"
                : "bg-slate-50 text-slate-600 hover:bg-slate-100"
            }`}
          >
            Tất cả hạng phòng
          </button>

          {roomTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => setSelectedTypeId(String(type.id))}
              className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedTypeId === String(type.id)
                  ? "bg-[#006ce4] text-white shadow-md shadow-blue-100"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              {type.name}
            </button>
          ))}
        </div>

        {/* Chú thích màu & Lọc nhanh */}
        <div className="flex items-center gap-2 flex-wrap text-xs font-bold">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded-xl border transition-all ${
              statusFilter === "all"
                ? "bg-slate-200 border-slate-300"
                : "border-slate-100 text-slate-500"
            }`}
          >
            Tất cả ({roomNumbers.length})
          </button>
          <button
            onClick={() => setStatusFilter("available")}
            className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 ${
              statusFilter === "available"
                ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                : "border-slate-100 text-emerald-600 bg-emerald-50/50"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> Trống
          </button>
          <button
            onClick={() => setStatusFilter("occupied")}
            className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 ${
              statusFilter === "occupied"
                ? "bg-blue-100 text-blue-800 border-blue-300"
                : "border-slate-100 text-[#006ce4] bg-blue-50/50"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#006ce4]" /> Đang ở
          </button>
          <button
            onClick={() => setStatusFilter("dirty")}
            className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 ${
              statusFilter === "dirty"
                ? "bg-rose-100 text-rose-800 border-rose-300"
                : "border-slate-100 text-rose-600 bg-rose-50/50"
            }`}
          >
            <Brush size={12} /> Chưa dọn
          </button>
        </div>
      </div>

      {/* ─── SƠ ĐỒ LƯỚI PHÒNG (ROOM GRID MAP) ─── */}
      {loading ? (
        <div className="py-24 flex justify-center bg-white rounded-3xl border border-slate-200/80 shadow-sm">
          <LoadingSpinner size="lg" label="Đang tải sơ đồ phòng..." />
        </div>
      ) : filteredRooms.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filteredRooms.map((room) => {
            const isClean = room.clean_status === "clean" || room.is_clean;
            const isOccupied = room.status === "occupied";
            const isReserved = room.status === "reserved";
            const isMaintenance = room.status === "maintenance";

            return (
              <div
                key={room.id}
                className={`p-4 rounded-3xl border-2 space-y-3 shadow-sm transition-all relative overflow-hidden group hover:shadow-md ${
                  isOccupied
                    ? "border-[#006ce4] bg-blue-50/30"
                    : isReserved
                      ? "border-amber-400 bg-amber-50/30"
                      : isMaintenance
                        ? "border-slate-300 bg-slate-100 opacity-60"
                        : "border-emerald-400 bg-emerald-50/30"
                }`}
              >
                {/* Số phòng & Badge dọn dẹp */}
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xl font-black text-slate-900 tracking-tight">
                      P.{room.room_number || room.number || room.id}
                    </span>
                  </div>

                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-lg flex items-center gap-1 ${
                      isClean
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-rose-100 text-rose-700 animate-pulse"
                    }`}
                  >
                    {isClean ? <Sparkles size={11} /> : <Brush size={11} />}
                    {isClean ? "Sạch" : "Chưa dọn"}
                  </span>
                </div>

                {/* Loại phòng & Tên khách */}
                <div className="text-xs space-y-1 font-medium">
                  <p className="font-bold text-slate-700 line-clamp-1">
                    {room.room_type_name || room.type?.name || "Hạng phòng"}
                  </p>

                  <div className="text-[11px]">
                    {isOccupied ? (
                      <p className="font-bold text-[#006ce4] flex items-center gap-1 truncate">
                        <User size={12} />{" "}
                        {room.current_guest || "Khách đang ở"}
                      </p>
                    ) : isReserved ? (
                      <p className="font-bold text-amber-600 flex items-center gap-1 truncate">
                        <Clock size={12} /> Khách sắp đến
                      </p>
                    ) : isMaintenance ? (
                      <p className="font-bold text-slate-500 flex items-center gap-1">
                        <Wrench size={12} /> Đang bảo trì
                      </p>
                    ) : (
                      <p className="font-bold text-emerald-600 flex items-center gap-1">
                        ● Sẵn sàng đón khách
                      </p>
                    )}
                  </div>
                </div>

                {/* Nút đổi trạng thái dọn dẹp nhanh */}
                <div className="pt-2 border-t border-slate-200/50">
                  <button
                    onClick={() => handleToggleClean(room)}
                    className="w-full text-[11px] font-bold py-1.5 px-2 rounded-xl bg-white border border-slate-200 hover:border-slate-400 text-slate-700 transition-colors shadow-sm cursor-pointer"
                  >
                    Đổi: {isClean ? "Báo chưa dọn" : "Báo đã dọn sạch"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={Key}
          title="Chưa có số phòng nào được tạo"
          description="Hãy tạo danh sách số phòng vật lý (ví dụ: 101, 102, 103...) để bắt đầu phân phòng cho khách đặt."
          actionLabel="Thêm số phòng ngay"
          onAction={() => setIsModalOpen(true)}
        />
      )}

      {/* ─── MODAL TẠO SỐ PHÒNG MỚI HÀNG LOẠT ─── */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Thêm Danh Sách Số Phòng Mới"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateRoomNumbers} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
              Thuộc Hạng Phòng *
            </label>
            <select
              value={newRoomForm.room_type_id}
              onChange={(e) =>
                setNewRoomForm({ ...newRoomForm, room_type_id: e.target.value })
              }
              required
              className="w-full h-11 bg-white border border-gray-300 rounded-xl px-4 text-sm font-semibold outline-none focus:border-emerald-500"
            >
              {roomTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase">
              Danh sách số phòng * (Cách nhau bởi dấu phẩy hoặc xuống dòng)
            </label>
            <textarea
              rows={4}
              required
              placeholder="Ví dụ: 101, 102, 103, 104, 201, 202..."
              value={newRoomForm.room_numbers_input}
              onChange={(e) =>
                setNewRoomForm({
                  ...newRoomForm,
                  room_numbers_input: e.target.value,
                })
              }
              className="w-full p-4 border border-gray-300 rounded-2xl text-sm font-bold font-mono outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50"
            />
            <p className="text-[11px] text-slate-400 italic">
              * Hệ thống sẽ tự động tạo từng phòng vật lý tương ứng.
            </p>
          </div>

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
              Xác Nhận Tạo Phòng
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default RoomNumberPage;
