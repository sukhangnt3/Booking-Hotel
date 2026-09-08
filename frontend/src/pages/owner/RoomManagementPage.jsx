// src/pages/owner/RoomManagementPage.jsx
import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { useSearchParams } from "react-router-dom";
import {
  Plus,
  Trash2,
  X,
  AlertCircle,
  Star,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  List,
  Edit2,
  Key,
  Save,
  Ban,
  Info,
  Calendar,
  Sparkles,
  Check,
  Building2,
} from "lucide-react";
import { LoadingSpinner } from "@/components/common";
import apiClient from "@/services/apiClient";
import { ROOM_AMENITIES_LIST } from "@/constants/amenitiesData";

export const ROOM_VIEWS = [
  { id: "city_view", label: "Hướng thành phố (City View)" },
  { id: "sea_view", label: "Hướng biển (Ocean / Sea View)" },
  { id: "pool_view", label: "Hướng hồ bơi (Pool View)" },
  { id: "garden_view", label: "Hướng vườn (Garden View)" },
  { id: "mountain_view", label: "Hướng núi / Đồi (Mountain View)" },
  { id: "internal_view", label: "Hướng nội khu / Không cửa sổ" },
];

const formatNumberWithDots = (val) => {
  if (val === undefined || val === null || val === "") return "";
  if (val === 0 || val === "0") return "0";
  const digits = String(val).replace(/\D/g, "");
  if (!digits) return "";
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

const parseDotsToNumber = (val) => {
  if (val === undefined || val === null || val === "") return "";
  const cleanDigits = String(val).replace(/\D/g, "");
  return cleanDigits === "" ? "" : Number(cleanDigits);
};

const compressImageFile = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 900;
        const MAX_HEIGHT = 600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.75));
      };
      img.onerror = () => resolve(event.target.result);
    };
    reader.onerror = () => resolve(null);
  });
};

const MountainPlaceholderIcon = () => (
  <svg
    viewBox="0 0 48 38"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="w-9 h-7 text-slate-200"
  >
    <path
      d="M1 35L15 13L24 26L31 16L47 35H1Z"
      fill="#E2E8F0"
      stroke="#CBD5E1"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  </svg>
);

export default function RoomManagementPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [hotels, setHotels] = useState([]);
  const [selectedHotelId, setSelectedHotelId] = useState(
    searchParams.get("hotelId") || "",
  );
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");

  const [activeTab, setActiveTab] = useState("room_types");

  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const addMenuRef = useRef(null);
  const imageScrollRef = useRef(null);
  const roomUnitImageScrollRef = useRef(null);
  const fileInputRef = useRef(null);
  const roomUnitFileInputRef = useRef(null);

  const [expandedRowId, setExpandedRowId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState("info");
  const [editingRoom, setEditingRoom] = useState(null);

  // 👉 BỔ SUNG SỨC CHỨA TIÊU CHUẨN & TỐI ĐA VÀO FORM STATE
  const initialFormState = {
    hotel_id: "",
    code: "",
    name: "",
    type: "Tiêu chuẩn",
    room_view: "city_view",
    capacity: 2,
    standard_adults: 1,
    standard_children: 1,
    max_adults: 1,
    max_children: 1,
    hourly_price: "",
    base_price: "",
    overnight_price: "",
    early_checkin_fee: "",
    late_checkout_fee: "",
    description: "",
    amount: 2,
    bed_type: "1 Giường đôi King",
    room_area: 28,
    status: "active",
    amenities: ["Máy lạnh", "TV", "Wifi", "Bình nóng lạnh"],
    images: [],
  };
  const [formData, setFormData] = useState(initialFormState);

  const [isRoomUnitModalOpen, setIsRoomUnitModalOpen] = useState(false);
  const [editingRoomUnit, setEditingRoomUnit] = useState(null);
  const [areasList, setAreasList] = useState([
    "Tầng 1",
    "Tầng 2",
    "Tầng 3",
    "Khu A",
    "Khu B",
  ]);

  const initialRoomUnitForm = {
    name: "",
    area: "",
    room_id: "",
    start_date: new Date().toISOString().slice(0, 10),
    hourly_price: "",
    daily_price: "",
    overnight_price: "",
    early_checkin_fee: "",
    late_checkout_fee: "",
    note: "",
    images: [],
  };
  const [roomUnitFormData, setRoomUnitFormData] = useState(initialRoomUnitForm);
  const [roomUnitsList, setRoomUnitsList] = useState([]);

  const formatVND = (num) => Number(num || 0).toLocaleString("vi-VN");

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (addMenuRef.current && !addMenuRef.current.contains(event.target)) {
        setIsAddMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
      const loadedRooms = Array.isArray(list) ? list : [];
      setRooms(loadedRooms);

      const units = [];
      loadedRooms.forEach((r) => {
        const count = Number(r.amount || 2);
        for (let i = 1; i <= count; i++) {
          units.push({
            id: `${r.id}_unit_${i}`,
            room_id: r.id,
            room_type_name: r.name,
            name: `${i < 10 ? "10" + i : "1" + i}`,
            area: i % 2 === 0 ? "Tầng 2" : "Tầng 1",
            hourly_price:
              Number(r.hourly_price) ||
              Math.round((Number(r.base_price) || 600000) * 0.25),
            daily_price: Number(r.base_price) || 600000,
            overnight_price:
              Number(r.overnight_price) || Number(r.base_price) || 600000,
            status: "active",
          });
        }
      });
      setRoomUnitsList(units);
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

  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      const matchQuery =
        !searchQuery.trim() ||
        (r.name && r.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (r.code && r.code.toLowerCase().includes(searchQuery.toLowerCase()));

      if (statusFilter === "active") return matchQuery && r.is_active !== false;
      if (statusFilter === "inactive")
        return matchQuery && r.is_active === false;
      return matchQuery;
    });
  }, [rooms, searchQuery, statusFilter]);

  const scrollImages = (direction, ref) => {
    if (ref && ref.current) {
      const offset = direction === "left" ? -140 : 140;
      ref.current.scrollBy({ left: offset, behavior: "smooth" });
    }
  };

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    try {
      const compressedList = [];
      for (const file of files) {
        const base64 = await compressImageFile(file);
        if (base64) compressedList.push(base64);
      }
      setFormData((prev) => ({
        ...prev,
        images: [...prev.images, ...compressedList],
      }));
    } catch (err) {
      alert("Không thể đọc ảnh.");
    } finally {
      e.target.value = "";
    }
  };

  const handleRoomUnitFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    try {
      const compressedList = [];
      for (const file of files) {
        const base64 = await compressImageFile(file);
        if (base64) compressedList.push(base64);
      }
      setRoomUnitFormData((prev) => ({
        ...prev,
        images: [...prev.images, ...compressedList],
      }));
    } catch (err) {
      alert("Không thể đọc ảnh.");
    } finally {
      e.target.value = "";
    }
  };

  // Mở modal thêm hạng phòng mới
  const handleOpenAddModal = () => {
    setEditingRoom(null);
    setModalTab("info");
    setFormData({
      ...initialFormState,
      hotel_id: selectedHotelId || (hotels[0]?.id ? String(hotels[0].id) : ""),
      code: "",
      images: [],
    });
    setIsModalOpen(true);
    setIsAddMenuOpen(false);
  };

  // Mở modal sửa hạng phòng
  const handleOpenEditRoomModal = (room, roomCode) => {
    const baseP = Number(room.base_price || 0);
    const hourlyP =
      Number(room.hourly_price) > 0
        ? Number(room.hourly_price)
        : Math.round(baseP * 0.25);
    const overnightP =
      Number(room.overnight_price) > 0 ? Number(room.overnight_price) : baseP;

    setEditingRoom(room);
    setFormData({
      ...room,
      hotel_id: String(room.hotel_id || selectedHotelId),
      code: roomCode,
      base_price: baseP,
      hourly_price: hourlyP,
      overnight_price: overnightP,
      early_checkin_fee: room.early_checkin_fee || "",
      late_checkout_fee: room.late_checkout_fee || "",
      // Nạp sức chứa
      standard_adults: room.standard_adults || 1,
      standard_children: room.standard_children ?? 1,
      max_adults: room.max_adults || room.capacity || 1,
      max_children: room.max_children ?? 1,
      images:
        room.thumbnail || room.image ? [room.thumbnail || room.image] : [],
    });
    setModalTab("info");
    setIsModalOpen(true);
  };

  // Xóa 1 hạng phòng
  const handleDeleteRoom = async (roomId, roomName) => {
    const confirmMsg = roomName
      ? `Bạn có chắc chắn muốn xóa hạng phòng "${roomName}"?`
      : "Bạn có chắc chắn muốn xóa hạng phòng này?";
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await apiClient.delete(`/rooms/${roomId}`);
      alert(res?.message || "Đã xóa hạng phòng thành công!");
      setSelectedIds((prev) => prev.filter((id) => id !== roomId));
      if (editingRoom && editingRoom.id === roomId) {
        setIsModalOpen(false);
      }
      await fetchRoomsByHotel();
    } catch (err) {
      alert(`Lỗi khi xóa: ${err.response?.data?.message || err.message}`);
    }
  };

  // Xóa hàng loạt
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (
      !window.confirm(
        `Bạn có chắc chắn muốn xóa ${selectedIds.length} hạng phòng đã chọn?`,
      )
    ) {
      return;
    }

    try {
      for (const id of selectedIds) {
        await apiClient.delete(`/rooms/${id}`);
      }
      alert("Đã xóa thành công các hạng phòng đã chọn!");
      setSelectedIds([]);
      await fetchRoomsByHotel();
    } catch (err) {
      alert(`Lỗi khi xóa: ${err.response?.data?.message || err.message}`);
      await fetchRoomsByHotel();
    }
  };

  // Xóa phòng vật lý
  const handleDeleteRoomUnit = (unitId, unitName) => {
    if (!window.confirm(`Bạn có chắc muốn xóa phòng "${unitName}"?`)) return;
    setRoomUnitsList((prev) => prev.filter((u) => u.id !== unitId));
    if (editingRoomUnit && editingRoomUnit.id === unitId) {
      setIsRoomUnitModalOpen(false);
    }
  };

  const handleSelectRoomTypeForUnit = (selectedRoomId) => {
    if (!selectedRoomId) {
      setRoomUnitFormData((prev) => ({
        ...prev,
        room_id: "",
        hourly_price: "",
        daily_price: "",
        overnight_price: "",
        early_checkin_fee: "",
        late_checkout_fee: "",
      }));
      return;
    }

    const selectedRoom = rooms.find(
      (r) =>
        String(r.id) === String(selectedRoomId) ||
        String(r.name) === String(selectedRoomId),
    );

    if (selectedRoom) {
      const daily = Number(selectedRoom.base_price || 0);
      const hourly =
        Number(selectedRoom.hourly_price) || Math.round(daily * 0.25);
      const overnight = Number(selectedRoom.overnight_price) || daily;
      const early = Number(selectedRoom.early_checkin_fee || 0);
      const late = Number(selectedRoom.late_checkout_fee || 0);

      setRoomUnitFormData((prev) => ({
        ...prev,
        room_id: selectedRoom.id,
        hourly_price: hourly,
        daily_price: daily,
        overnight_price: overnight,
        early_checkin_fee: early,
        late_checkout_fee: late,
      }));
    } else {
      setRoomUnitFormData((prev) => ({ ...prev, room_id: selectedRoomId }));
    }
  };

  const handleOpenAddRoomUnitModal = (unit = null) => {
    setIsAddMenuOpen(false);
    if (unit) {
      setEditingRoomUnit(unit);
      const parentRoom = rooms.find(
        (r) => String(r.id) === String(unit.room_id),
      );
      setRoomUnitFormData({
        name: unit.name || "",
        area: unit.area || "Tầng 1",
        room_id: unit.room_id || (parentRoom ? parentRoom.id : ""),
        start_date: new Date().toISOString().slice(0, 10),
        hourly_price: unit.hourly_price ?? (parentRoom?.hourly_price || ""),
        daily_price: unit.daily_price ?? (parentRoom?.base_price || ""),
        overnight_price:
          unit.overnight_price ?? (parentRoom?.overnight_price || ""),
        early_checkin_fee: parentRoom?.early_checkin_fee || 0,
        late_checkout_fee: parentRoom?.late_checkout_fee || 0,
        note: "",
        images: [],
      });
    } else {
      setEditingRoomUnit(null);
      const firstRoom = rooms[0];
      const daily = Number(firstRoom?.base_price || 0);
      const hourly =
        Number(firstRoom?.hourly_price) || Math.round(daily * 0.25);
      const overnight = Number(firstRoom?.overnight_price) || daily;

      setRoomUnitFormData({
        ...initialRoomUnitForm,
        room_id: firstRoom ? firstRoom.id : "",
        hourly_price: hourly || "",
        daily_price: daily || "",
        overnight_price: overnight || "",
        early_checkin_fee: Number(firstRoom?.early_checkin_fee || 0),
        late_checkout_fee: Number(firstRoom?.late_checkout_fee || 0),
      });
    }
    setIsRoomUnitModalOpen(true);
  };

  // Lưu Hạng phòng
  const handleSaveRoom = async (e, keepOpen = false) => {
    if (e) e.preventDefault();
    const targetHotelId = formData.hotel_id || selectedHotelId;

    if (!targetHotelId) {
      alert("Vui lòng chọn một Chi nhánh / Khách sạn trước!");
      return;
    }
    if (!formData.name.trim()) {
      alert("Vui lòng nhập Tên hạng phòng!");
      return;
    }
    const dailyPrice = Number(formData.base_price);
    if (!dailyPrice || dailyPrice <= 0) {
      alert("Giá theo ngày bắt buộc phải lớn hơn 0!");
      return;
    }

    try {
      const selectedImg =
        formData.images.length > 0 ? formData.images[0] : null;

      const hourlyPrice =
        formData.hourly_price !== "" &&
        formData.hourly_price !== null &&
        Number(formData.hourly_price) > 0
          ? Number(formData.hourly_price)
          : Math.round(dailyPrice * 0.25);

      const overnightPrice =
        formData.overnight_price !== "" &&
        formData.overnight_price !== null &&
        Number(formData.overnight_price) > 0
          ? Number(formData.overnight_price)
          : dailyPrice;

      const payload = {
        hotel_id: targetHotelId,
        name: formData.name.trim(),
        capacity: Number(formData.max_adults || formData.capacity || 2),
        // Gửi sức chứa tiêu chuẩn và tối đa
        standard_adults: Number(formData.standard_adults || 1),
        standard_children: Number(formData.standard_children || 0),
        max_adults: Number(formData.max_adults || 2),
        max_children: Number(formData.max_children || 1),
        base_price: dailyPrice,
        hourly_price: hourlyPrice,
        overnight_price: overnightPrice,
        early_checkin_fee: Number(formData.early_checkin_fee || 0),
        late_checkout_fee: Number(formData.late_checkout_fee || 0),
        amount: Number(formData.amount || 2),
        type: formData.type || "Tiêu chuẩn",
        bed_type: formData.bed_type || "1 Giường đôi King",
        room_area: Number(formData.room_area || 28),
        description: formData.description || "",
        image: selectedImg,
        amenities: formData.amenities,
      };

      if (editingRoom) {
        await apiClient.put(`/rooms/${editingRoom.id}`, payload);
      } else {
        await apiClient.post("/rooms", payload);
      }

      if (targetHotelId !== selectedHotelId) {
        setSelectedHotelId(targetHotelId);
        setSearchParams({ hotelId: targetHotelId });
      } else {
        await fetchRoomsByHotel();
      }

      if (keepOpen) {
        setFormData({
          ...initialFormState,
          hotel_id: targetHotelId,
          code: "",
          images: [],
        });
        setEditingRoom(null);
      } else {
        setIsModalOpen(false);
      }
    } catch (err) {
      alert(`Lỗi: ${err.response?.data?.message || err.message}`);
    }
  };

  // Lưu Phòng vật lý
  const handleSaveRoomUnit = (e, keepOpen = false) => {
    if (e) e.preventDefault();
    if (!roomUnitFormData.name.trim()) {
      alert("Vui lòng nhập Tên phòng!");
      return;
    }
    if (!roomUnitFormData.room_id) {
      alert("Vui lòng chọn Hạng phòng!");
      return;
    }

    const parentRoom = rooms.find(
      (r) => String(r.id) === String(roomUnitFormData.room_id),
    );
    const newUnit = {
      id: editingRoomUnit ? editingRoomUnit.id : Date.now().toString(),
      room_id: roomUnitFormData.room_id,
      room_type_name: parentRoom?.name || "Tiêu chuẩn",
      name: roomUnitFormData.name.trim(),
      area: roomUnitFormData.area || "Tầng 1",
      hourly_price: Number(roomUnitFormData.hourly_price || 0),
      daily_price: Number(roomUnitFormData.daily_price || 0),
      overnight_price: Number(roomUnitFormData.overnight_price || 0),
      status: "active",
    };

    if (editingRoomUnit) {
      setRoomUnitsList((prev) =>
        prev.map((item) => (item.id === editingRoomUnit.id ? newUnit : item)),
      );
    } else {
      setRoomUnitsList((prev) => [newUnit, ...prev]);
    }

    if (keepOpen) {
      setRoomUnitFormData((prev) => ({
        ...prev,
        name: "",
        images: [],
      }));
      setEditingRoomUnit(null);
    } else {
      setIsRoomUnitModalOpen(false);
    }
  };

  const handleToggleRowExpand = (roomId) => {
    setExpandedRowId((prev) => (prev === roomId ? null : roomId));
  };

  return (
    <div className="space-y-4 font-sans text-slate-800 pb-16 min-h-screen">
      {/* TIÊU ĐỀ & NÚT THAO TÁC TRÊN CÙNG */}
      <div className="flex justify-between items-center flex-wrap gap-4 pt-1">
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
          Hạng phòng & Phòng
        </h1>

        <div className="flex items-center gap-2">
          {/* Nút xóa hàng loạt */}
          {selectedIds.length > 0 && activeTab === "room_types" && (
            <button
              onClick={handleBulkDelete}
              className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-md shadow-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95 animate-fadeIn"
            >
              <Trash2 size={14} />
              <span>Xóa ({selectedIds.length})</span>
            </button>
          )}

          <div className="relative" ref={addMenuRef}>
            <button
              onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
              className="px-4 py-2 bg-[#2e7d32] hover:bg-[#256628] text-white font-semibold text-xs rounded-md shadow-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Plus size={14} strokeWidth={2.5} />
              <span>Thêm mới</span>
              <ChevronDown
                size={14}
                className={`transition-transform ${isAddMenuOpen ? "rotate-180" : ""}`}
              />
            </button>

            {isAddMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-md shadow-lg py-1 z-30 min-w-[150px] animate-fadeIn">
                <button
                  onClick={handleOpenAddModal}
                  className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-2 cursor-pointer"
                >
                  <Plus size={14} className="text-slate-500" />
                  <span>Hạng phòng</span>
                </button>
                <button
                  onClick={() => handleOpenAddRoomUnitModal()}
                  className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-2 cursor-pointer border-t border-slate-100"
                >
                  <Plus size={14} className="text-slate-500" />
                  <span>Phòng</span>
                </button>
              </div>
            )}
          </div>

          <button
            title="Đổi kiểu hiển thị"
            className="p-2 bg-[#2e7d32] hover:bg-[#256628] text-white rounded-md transition cursor-pointer"
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {apiError && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2 font-semibold">
          <AlertCircle size={15} /> <span>{apiError}</span>
        </div>
      )}

      {/* BỐ CỤC CHÍNH */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
        {/* CỘT TRÁI: BỘ LỌC */}
        <div className="md:col-span-3 space-y-3.5">
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs space-y-2">
            <label className="block text-xs font-bold text-slate-800">
              Tìm kiếm
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm hạng phòng"
              className="w-full text-xs py-1.5 px-0 border-b border-slate-200 outline-none placeholder:text-slate-400 focus:border-blue-500 transition"
            />
          </div>

          {/* 1. KHU VỰC CHỌN CHI NHÁNH / KHÁCH SẠN */}
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs space-y-3">
            <div
              onClick={() => setIsBranchDropdownOpen(!isBranchDropdownOpen)}
              className="flex justify-between items-center cursor-pointer select-none"
            >
              <div className="flex items-center gap-1.5">
                <Building2 size={14} className="text-slate-600" />
                <span className="text-xs font-bold text-slate-800">
                  Chi nhánh
                </span>
              </div>
              <ChevronDown
                size={14}
                className={`text-slate-500 transition-transform ${isBranchDropdownOpen ? "rotate-180" : ""}`}
              />
            </div>

            {isBranchDropdownOpen && (
              <div className="pt-1">
                <select
                  value={selectedHotelId}
                  onChange={(e) => {
                    const newId = e.target.value;
                    setSelectedHotelId(newId);
                    setSearchParams({ hotelId: newId });
                  }}
                  className="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-300 rounded-md p-2 outline-none cursor-pointer focus:border-[#2e7d32] transition"
                >
                  {hotels.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs space-y-3">
            <span className="block text-xs font-bold text-slate-800">
              Trạng thái
            </span>
            <div className="space-y-2.5 text-xs font-semibold text-slate-700">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="radio"
                  name="statusFilter"
                  value="active"
                  checked={statusFilter === "active"}
                  onChange={() => setStatusFilter("active")}
                  className="accent-[#2e7d32] cursor-pointer"
                />
                <span>Đang kinh doanh</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="radio"
                  name="statusFilter"
                  value="inactive"
                  checked={statusFilter === "inactive"}
                  onChange={() => setStatusFilter("inactive")}
                  className="accent-[#2e7d32] cursor-pointer"
                />
                <span>Ngừng kinh doanh</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="radio"
                  name="statusFilter"
                  value="all"
                  checked={statusFilter === "all"}
                  onChange={() => setStatusFilter("all")}
                  className="accent-[#2e7d32] cursor-pointer"
                />
                <span>Tất cả</span>
              </label>
            </div>
          </div>
        </div>

        {/* CỘT PHẢI: BẢNG DỮ LIỆU */}
        <div className="md:col-span-9 space-y-0">
          <div className="flex items-center gap-1 border-b border-transparent">
            <button
              onClick={() => setActiveTab("room_types")}
              className={`px-5 py-2 text-xs font-bold rounded-t-md transition cursor-pointer ${
                activeTab === "room_types"
                  ? "bg-[#0284c7] text-white shadow-2xs"
                  : "bg-slate-200/80 text-slate-700 hover:bg-slate-300"
              }`}
            >
              Hạng phòng
            </button>
            <button
              onClick={() => setActiveTab("room_units")}
              className={`px-5 py-2 text-xs font-bold rounded-t-md transition cursor-pointer ${
                activeTab === "room_units"
                  ? "bg-[#0284c7] text-white shadow-2xs"
                  : "bg-slate-200/80 text-slate-700 hover:bg-slate-300"
              }`}
            >
              Danh sách phòng
            </button>
          </div>

          <div className="bg-white rounded-b-lg rounded-tr-lg border border-slate-200 shadow-2xs overflow-hidden">
            {loading ? (
              <div className="py-20 flex justify-center">
                <LoadingSpinner size="md" label="Đang tải dữ liệu..." />
              </div>
            ) : activeTab === "room_types" ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#e0f2fe] text-slate-700 border-b border-slate-200">
                      <th className="py-3 px-3 w-8 text-center">
                        <input
                          type="checkbox"
                          checked={
                            selectedIds.length > 0 &&
                            selectedIds.length === filteredRooms.length
                          }
                          onChange={(e) =>
                            setSelectedIds(
                              e.target.checked
                                ? filteredRooms.map((r) => r.id)
                                : [],
                            )
                          }
                          className="cursor-pointer rounded accent-blue-600"
                        />
                      </th>
                      <th className="py-3 px-1 w-7 text-center">
                        <Star size={13} className="text-slate-400 inline" />
                      </th>
                      <th className="py-3 px-3 font-bold text-slate-700 whitespace-nowrap">
                        Mã hạng phòng
                      </th>
                      <th className="py-3 px-3 font-bold text-slate-700 whitespace-nowrap">
                        Tên hạng phòng
                      </th>
                      <th className="py-3 px-3 font-bold text-slate-700 text-center whitespace-nowrap">
                        SL phòng
                      </th>
                      <th className="py-3 px-3 font-bold text-slate-700 text-right whitespace-nowrap">
                        Giá theo giờ
                      </th>
                      <th className="py-3 px-3 font-bold text-slate-700 text-right whitespace-nowrap">
                        Giá theo ngày
                      </th>
                      <th className="py-3 px-3 font-bold text-slate-700 text-right whitespace-nowrap">
                        Giá qua đêm
                      </th>
                      <th className="py-3 px-3 font-bold text-slate-700 whitespace-nowrap">
                        Trạng thái
                      </th>
                      <th className="py-3 px-2 w-16 text-center">Thao tác</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {filteredRooms.length === 0 ? (
                      <tr>
                        <td
                          colSpan={10}
                          className="py-12 text-center text-slate-400"
                        >
                          Chưa có hạng phòng nào trong chi nhánh này.
                        </td>
                      </tr>
                    ) : (
                      filteredRooms.map((room, idx) => {
                        const isChecked = selectedIds.includes(room.id);
                        const isExpanded = expandedRowId === room.id;
                        const roomCode =
                          room.code || `P00${filteredRooms.length - idx}`;
                        const roomImg = room.thumbnail || room.image || "";

                        return (
                          <React.Fragment key={room.id}>
                            <tr
                              onClick={() => handleToggleRowExpand(room.id)}
                              className={`transition cursor-pointer group select-none ${
                                isExpanded
                                  ? "bg-[#f4fbf4] border-t-2 border-emerald-500"
                                  : isChecked
                                    ? "bg-blue-50/60"
                                    : "hover:bg-slate-50"
                              }`}
                            >
                              <td
                                className="py-2.5 px-3 text-center"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() =>
                                    setSelectedIds((prev) =>
                                      prev.includes(room.id)
                                        ? prev.filter((i) => i !== room.id)
                                        : [...prev, room.id],
                                    )
                                  }
                                  className="cursor-pointer rounded accent-blue-600"
                                />
                              </td>
                              <td className="py-2.5 px-1 text-center">
                                <Star size={14} className="text-slate-300" />
                              </td>
                              <td className="py-2.5 px-3 font-bold text-slate-800">
                                {roomCode}
                              </td>
                              <td className="py-2.5 px-3 font-semibold text-slate-800">
                                {room.name}
                              </td>
                              <td className="py-2.5 px-3 text-center font-bold text-slate-800">
                                {room.amount || 2}
                              </td>
                              <td className="py-2.5 px-3 text-right font-medium text-slate-700">
                                {formatVND(room.hourly_price)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-medium text-slate-700">
                                {formatVND(room.base_price)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-medium text-slate-700">
                                {formatVND(room.overnight_price)}
                              </td>
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                <span className="text-slate-800 font-semibold">
                                  {room.is_active === false
                                    ? "Ngừng kinh doanh"
                                    : "Đang kinh doanh"}
                                </span>
                              </td>
                              <td className="py-2.5 px-2 text-center whitespace-nowrap">
                                <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenEditRoomModal(room, roomCode);
                                    }}
                                    className="p-1 text-slate-400 hover:text-blue-600 cursor-pointer transition"
                                    title="Chỉnh sửa hạng phòng"
                                  >
                                    <Edit2 size={13} />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteRoom(room.id, room.name);
                                    }}
                                    className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer transition"
                                    title="Xóa hạng phòng"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </td>
                            </tr>

                            {isExpanded && (
                              <tr className="bg-[#fafffa] border-b-2 border-emerald-500/80">
                                <td colSpan={10} className="p-4 bg-white">
                                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 text-xs">
                                    <div className="md:col-span-4 flex gap-2">
                                      <div className="w-44 h-28 bg-slate-100 rounded border border-slate-200 overflow-hidden flex items-center justify-center">
                                        {roomImg ? (
                                          <img
                                            src={roomImg}
                                            alt={room.name}
                                            className="w-full h-full object-cover"
                                          />
                                        ) : (
                                          <MountainPlaceholderIcon />
                                        )}
                                      </div>
                                    </div>
                                    <div className="md:col-span-4 space-y-1.5">
                                      <div>
                                        Mã hạng phòng: <b>{roomCode}</b>
                                      </div>
                                      <div>
                                        Tên hạng phòng: <b>{room.name}</b>
                                      </div>
                                      <div>
                                        Số lượng phòng:{" "}
                                        <b>{room.amount || 2}</b>
                                      </div>
                                      <div>
                                        Sức chứa tiêu chuẩn:{" "}
                                        <b>
                                          {room.standard_adults || 1} lớn,{" "}
                                          {room.standard_children || 1} trẻ
                                        </b>
                                      </div>
                                      <div>
                                        Sức chứa tối đa:{" "}
                                        <b>
                                          {room.max_adults || 1} lớn,{" "}
                                          {room.max_children || 1} trẻ
                                        </b>
                                      </div>
                                      <div>
                                        Giá theo ngày:{" "}
                                        <b>{formatVND(room.base_price)} đ</b>
                                      </div>
                                    </div>
                                    <div className="md:col-span-4 border-l pl-4">
                                      <span className="font-bold">Mô tả</span>
                                      <p className="text-slate-600 mt-1">
                                        {room.description || "Chưa có mô tả"}
                                      </p>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              /* TAB 2: PHÒNG VẬT LÝ */
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#e0f2fe] text-slate-700 border-b border-slate-200">
                      <th className="py-3 px-4 font-bold">Số phòng</th>
                      <th className="py-3 px-4 font-bold">Khu vực</th>
                      <th className="py-3 px-4 font-bold">Thuộc hạng phòng</th>
                      <th className="py-3 px-4 font-bold text-right">
                        Giá theo giờ
                      </th>
                      <th className="py-3 px-4 font-bold text-right">
                        Giá theo ngày
                      </th>
                      <th className="py-3 px-4 font-bold text-right">
                        Giá qua đêm
                      </th>
                      <th className="py-3 px-4 font-bold text-center">
                        Thao tác
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {roomUnitsList.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="py-12 text-center text-slate-400"
                        >
                          Chưa có phòng vật lý nào.
                        </td>
                      </tr>
                    ) : (
                      roomUnitsList.map((unit) => (
                        <tr
                          key={unit.id}
                          onClick={() => handleOpenAddRoomUnitModal(unit)}
                          className="hover:bg-blue-50/40 cursor-pointer transition"
                        >
                          <td className="py-3 px-4 font-bold text-blue-900 flex items-center gap-1.5">
                            <Key size={13} className="text-emerald-600" />
                            <span>Phòng {unit.name}</span>
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-700">
                            {unit.area}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-800">
                            {unit.room_type_name}
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-slate-700">
                            {formatVND(unit.hourly_price)}
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-slate-700">
                            {formatVND(unit.daily_price)}
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-slate-700">
                            {formatVND(unit.overnight_price)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenAddRoomUnitModal(unit);
                                }}
                                className="p-1 hover:text-blue-600 cursor-pointer text-slate-400"
                                title="Chỉnh sửa"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteRoomUnit(unit.id, unit.name);
                                }}
                                className="p-1 hover:text-rose-600 cursor-pointer text-slate-400"
                                title="Xóa phòng"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-semibold bg-white">
              <span>
                Tổng số:{" "}
                <b>
                  {activeTab === "room_types"
                    ? filteredRooms.length
                    : roomUnitsList.length}
                </b>{" "}
                bản ghi
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL 1: THÊM / SỬA HẠNG PHÒNG */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs animate-fadeIn">
          <div className="bg-white rounded-md w-full max-w-2xl shadow-xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden">
            <input
              id="room-image-upload-input"
              type="file"
              ref={fileInputRef}
              multiple
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="flex justify-between items-center px-6 py-3.5 border-b border-slate-100">
              <h3 className="font-semibold text-sm text-slate-800 tracking-tight">
                {editingRoom ? "Chỉnh sửa hạng phòng" : "Thêm hạng phòng mới"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="cursor-pointer text-slate-400 hover:text-slate-600 transition text-lg"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center gap-8 px-6 border-b border-slate-200 text-xs font-medium text-slate-500 bg-white select-none">
              <button
                type="button"
                onClick={() => setModalTab("info")}
                className={`py-2.5 transition relative cursor-pointer ${
                  modalTab === "info"
                    ? "text-slate-800 font-semibold"
                    : "hover:text-slate-800"
                }`}
              >
                Thông tin
                {modalTab === "info" && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#2e7d32]" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setModalTab("description")}
                className={`py-2.5 transition relative cursor-pointer ${
                  modalTab === "description"
                    ? "text-slate-800 font-semibold"
                    : "hover:text-slate-800"
                }`}
              >
                Mô tả chi tiết
                {modalTab === "description" && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#2e7d32]" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setModalTab("units")}
                className={`py-2.5 transition relative cursor-pointer ${
                  modalTab === "units"
                    ? "text-slate-800 font-semibold"
                    : "hover:text-slate-800"
                }`}
              >
                Danh sách phòng
                {modalTab === "units" && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#2e7d32]" />
                )}
              </button>
            </div>

            <form
              onSubmit={(e) => handleSaveRoom(e, false)}
              className="flex-1 overflow-y-auto p-6 space-y-6 text-xs font-sans"
            >
              {modalTab === "info" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 items-start pt-2">
                    <div className="space-y-4">
                      {/* CHỌN CHI NHÁNH / KHÁCH SẠN */}
                      <div className="flex items-center gap-3">
                        <label className="w-28 text-slate-700 font-normal">
                          Chi nhánh <b className="text-rose-500">*</b>
                        </label>
                        <select
                          required
                          value={formData.hotel_id}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              hotel_id: e.target.value,
                            })
                          }
                          className="flex-1 py-1 border-b border-slate-300 outline-none text-slate-800 font-medium bg-transparent cursor-pointer focus:border-[#2e7d32]"
                        >
                          {hotels.map((h) => (
                            <option key={h.id} value={h.id}>
                              {h.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-3">
                        <label className="w-28 flex items-center gap-1 text-slate-700 font-normal">
                          <span>Mã hạng phòng</span>
                          <Info size={12} className="text-slate-400" />
                        </label>
                        <input
                          value={formData.code}
                          onChange={(e) =>
                            setFormData({ ...formData, code: e.target.value })
                          }
                          placeholder="Mã hạng phòng tự động"
                          className="flex-1 py-1 border-b border-slate-300 outline-none placeholder:text-slate-400 text-slate-700 bg-transparent"
                        />
                      </div>

                      <div className="flex items-center gap-3">
                        <label className="w-28 text-slate-700 font-normal">
                          Tên hạng phòng <b className="text-rose-500">*</b>
                        </label>
                        <input
                          required
                          value={formData.name}
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                          className="flex-1 py-1 border-b border-[#2e7d32] outline-none text-slate-800 font-medium bg-transparent"
                        />
                      </div>
                    </div>

                    <div className="space-y-3.5">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-700 font-normal">
                          Giá theo giờ
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={formatNumberWithDots(formData.hourly_price)}
                          onChange={(e) => {
                            const val = parseDotsToNumber(e.target.value);
                            setFormData((prev) => ({
                              ...prev,
                              hourly_price: val,
                            }));
                          }}
                          placeholder="0"
                          className="w-28 text-right py-0.5 border-b border-slate-300 outline-none focus:border-[#2e7d32] text-slate-800 bg-transparent font-medium"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-700 font-normal">
                          Giá theo ngày <b className="text-rose-500">*</b>
                        </span>
                        <input
                          required
                          type="text"
                          inputMode="numeric"
                          value={formatNumberWithDots(formData.base_price)}
                          onChange={(e) => {
                            const val = parseDotsToNumber(e.target.value);
                            setFormData((prev) => {
                              const updated = { ...prev, base_price: val };
                              if (
                                !prev.hourly_price ||
                                Number(prev.hourly_price) === 0
                              ) {
                                updated.hourly_price = val
                                  ? Math.round(Number(val) * 0.25)
                                  : "";
                              }
                              if (
                                !prev.overnight_price ||
                                Number(prev.overnight_price) === 0
                              ) {
                                updated.overnight_price = val
                                  ? Number(val)
                                  : "";
                              }
                              return updated;
                            });
                          }}
                          placeholder="0"
                          className="w-28 text-right py-0.5 border-b border-slate-300 outline-none focus:border-[#2e7d32] text-slate-800 font-semibold bg-transparent"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-700 font-normal">
                          Giá qua đêm
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={formatNumberWithDots(formData.overnight_price)}
                          onChange={(e) => {
                            const val = parseDotsToNumber(e.target.value);
                            setFormData((prev) => ({
                              ...prev,
                              overnight_price: val,
                            }));
                          }}
                          placeholder="0"
                          className="w-28 text-right py-0.5 border-b border-slate-300 outline-none focus:border-[#2e7d32] text-slate-800 bg-transparent font-medium"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1 text-slate-700 font-normal">
                          <span>Phụ thu nhận sớm</span>
                          <Info size={12} className="text-slate-400" />
                        </span>
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={formatNumberWithDots(
                              formData.early_checkin_fee,
                            )}
                            onChange={(e) => {
                              const val = parseDotsToNumber(e.target.value);
                              setFormData((prev) => ({
                                ...prev,
                                early_checkin_fee: val,
                              }));
                            }}
                            placeholder="0"
                            className="w-20 text-right py-0.5 border-b border-slate-300 outline-none focus:border-[#2e7d32] text-slate-800 bg-transparent"
                          />
                          <span className="text-slate-500">/giờ</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1 text-slate-700 font-normal">
                          <span>Phụ thu trả muộn</span>
                          <Info size={12} className="text-slate-400" />
                        </span>
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={formatNumberWithDots(
                              formData.late_checkout_fee,
                            )}
                            onChange={(e) => {
                              const val = parseDotsToNumber(e.target.value);
                              setFormData((prev) => ({
                                ...prev,
                                late_checkout_fee: val,
                              }));
                            }}
                            placeholder="0"
                            className="w-20 text-right py-0.5 border-b border-slate-300 outline-none focus:border-[#2e7d32] text-slate-800 bg-transparent"
                          />
                          <span className="text-slate-500">/giờ</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* DẢI ẢNH */}
                  <div className="pt-4 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => scrollImages("left", imageScrollRef)}
                      className="p-1 text-slate-300 hover:text-slate-600 cursor-pointer flex-shrink-0"
                    >
                      <ChevronLeft size={20} />
                    </button>

                    <div
                      ref={imageScrollRef}
                      className="flex-1 flex gap-2 overflow-x-auto py-1 scroll-smooth scrollbar-none items-center"
                    >
                      {formData.images.map((imgSrc, idx) => (
                        <div
                          key={idx}
                          className="relative group w-16 h-14 rounded border border-slate-300 overflow-hidden flex-shrink-0 bg-slate-50"
                        >
                          <img
                            src={imgSrc}
                            alt="preview"
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFormData((prev) => ({
                                ...prev,
                                images: prev.images.filter((_, i) => i !== idx),
                              }));
                            }}
                            className="absolute top-0.5 right-0.5 bg-rose-600/90 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition cursor-pointer"
                          >
                            <X size={10} strokeWidth={3} />
                          </button>
                        </div>
                      ))}

                      {[...Array(Math.max(1, 8 - formData.images.length))].map(
                        (_, i) => (
                          <label
                            key={i}
                            htmlFor="room-image-upload-input"
                            className="w-16 h-14 rounded border border-dashed border-slate-300 bg-white hover:border-emerald-500 cursor-pointer flex items-center justify-center flex-shrink-0 transition"
                            title="Bấm để tải ảnh từ máy"
                          >
                            <MountainPlaceholderIcon />
                          </label>
                        ),
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => scrollImages("right", imageScrollRef)}
                      className="p-1 text-slate-300 hover:text-slate-600 cursor-pointer flex-shrink-0"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>

                  {/* ─── KHỐI SỨC CHỨA CHUẨN 100% THEO ẢNH BẠN GỬI ─── */}
                  <div className="border border-slate-200 rounded-md overflow-hidden bg-white mt-4">
                    <div className="bg-[#f1f5f9] px-4 py-2 font-bold text-slate-800 text-xs border-b border-slate-200">
                      Sức chứa
                    </div>
                    <div className="p-4 space-y-3.5 text-xs">
                      {/* Dòng 1: Tiêu chuẩn */}
                      <div className="flex items-center gap-6">
                        <span className="w-20 font-medium text-slate-700">
                          Tiêu chuẩn
                        </span>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="1"
                            value={formData.standard_adults}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                standard_adults: Number(e.target.value),
                              })
                            }
                            className="w-10 text-center border-b border-slate-400 outline-none font-semibold text-slate-800 focus:border-[#2e7d32] py-0.5 bg-transparent"
                          />
                          <span className="text-slate-600">người lớn và</span>
                          <input
                            type="number"
                            min="0"
                            value={formData.standard_children}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                standard_children: Number(e.target.value),
                              })
                            }
                            className="w-10 text-center border-b border-slate-400 outline-none font-semibold text-slate-800 focus:border-[#2e7d32] py-0.5 bg-transparent"
                          />
                          <span className="text-slate-600">trẻ em</span>
                        </div>
                      </div>

                      {/* Dòng 2: Tối đa */}
                      <div className="flex items-center gap-6">
                        <span className="w-20 font-medium text-slate-700">
                          Tối đa
                        </span>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="1"
                            value={formData.max_adults}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                max_adults: Number(e.target.value),
                                capacity: Number(e.target.value),
                              })
                            }
                            className="w-10 text-center border-b border-slate-400 outline-none font-semibold text-slate-800 focus:border-[#2e7d32] py-0.5 bg-transparent"
                          />
                          <span className="text-slate-600">người lớn và</span>
                          <input
                            type="number"
                            min="0"
                            value={formData.max_children}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                max_children: Number(e.target.value),
                              })
                            }
                            className="w-10 text-center border-b border-slate-400 outline-none font-semibold text-slate-800 focus:border-[#2e7d32] py-0.5 bg-transparent"
                          />
                          <span className="text-slate-600">trẻ em</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {modalTab === "description" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">
                      Mô tả hạng phòng
                    </label>
                    <textarea
                      rows={3}
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      placeholder="Nhập mô tả chi tiết..."
                      className="w-full p-2 border border-slate-300 rounded outline-none focus:border-[#2e7d32]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">
                        Loại giường
                      </label>
                      <input
                        value={formData.bed_type}
                        onChange={(e) =>
                          setFormData({ ...formData, bed_type: e.target.value })
                        }
                        className="w-full p-1.5 border border-slate-300 rounded outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">
                        Diện tích phòng (m²)
                      </label>
                      <input
                        type="number"
                        value={formData.room_area}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            room_area: e.target.value,
                          })
                        }
                        className="w-full p-1.5 border border-slate-300 rounded outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold mb-1.5 text-slate-800 flex items-center gap-1">
                      <Sparkles size={13} className="text-amber-500" /> Tiện
                      nghi hạng phòng:
                    </label>
                    <div className="grid grid-cols-2 gap-1.5 bg-slate-50 p-2.5 rounded-lg border border-slate-200 max-h-40 overflow-y-auto">
                      {ROOM_AMENITIES_LIST.map((item) => {
                        const isChecked =
                          formData.amenities.includes(item.id) ||
                          formData.amenities.includes(item.label);
                        return (
                          <label
                            key={item.id}
                            onClick={() => {
                              setFormData((prev) => ({
                                ...prev,
                                amenities: isChecked
                                  ? prev.amenities.filter(
                                      (a) => a !== item.id && a !== item.label,
                                    )
                                  : [...prev.amenities, item.label],
                              }));
                            }}
                            className={`flex items-center gap-2 p-1.5 rounded cursor-pointer select-none text-[11px] ${
                              isChecked
                                ? "bg-emerald-100/70 text-emerald-900 font-bold"
                                : "hover:bg-slate-200/50 text-slate-700"
                            }`}
                          >
                            <div
                              className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
                                isChecked
                                  ? "bg-[#2e7d32] border-[#2e7d32] text-white"
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
                </div>
              )}

              {modalTab === "units" && (
                <div className="space-y-3">
                  <div className="p-3 bg-slate-50 border rounded space-y-2">
                    <label className="font-semibold text-slate-700">
                      Số lượng phòng thực tế:
                    </label>
                    <input
                      type="number"
                      value={formData.amount}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          amount: Number(e.target.value),
                        })
                      }
                      className="w-24 p-1.5 border border-slate-300 rounded outline-none bg-white font-bold"
                    />
                    <p className="text-[11px] text-slate-500">
                      Hệ thống sẽ tự động sinh {formData.amount || 2} phòng
                      tương ứng vào danh sách phòng.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                {editingRoom ? (
                  <button
                    type="button"
                    onClick={() =>
                      handleDeleteRoom(editingRoom.id, editingRoom.name)
                    }
                    className="px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 rounded text-xs flex items-center gap-1.5 cursor-pointer transition active:scale-95"
                  >
                    <Trash2 size={14} />
                    <span>Xóa hạng phòng</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2.5">
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-[#2e7d32] hover:bg-[#256628] text-white font-semibold rounded text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition active:scale-95"
                  >
                    <Save size={14} />
                    <span>Lưu</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleSaveRoom(e, true)}
                    className="px-4 py-1.5 bg-[#2e7d32] hover:bg-[#256628] text-white font-semibold rounded text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition active:scale-95"
                  >
                    <Save size={14} />
                    <span>Lưu & Thêm mới</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-1.5 bg-[#718096] hover:bg-[#4a5568] text-white font-semibold rounded text-xs flex items-center gap-1.5 cursor-pointer transition active:scale-95"
                  >
                    <Ban size={14} />
                    <span>Bỏ qua</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: PHÒNG ĐƠN LẬP */}
      {isRoomUnitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs animate-fadeIn">
          <div className="bg-white rounded-md w-full max-w-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden">
            <input
              id="room-unit-image-upload"
              type="file"
              ref={roomUnitFileInputRef}
              multiple
              accept="image/*"
              onChange={handleRoomUnitFileChange}
              className="hidden"
            />

            <div className="flex justify-between items-center px-6 py-3.5 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-800 tracking-tight">
                Phòng
              </h3>
              <button
                onClick={() => setIsRoomUnitModalOpen(false)}
                className="cursor-pointer text-slate-400 hover:text-slate-600 transition text-lg"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => handleSaveRoomUnit(e, false)}
              className="flex-1 overflow-y-auto p-6 space-y-6 text-xs font-sans"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 items-start pt-1">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <label className="w-24 text-slate-700 font-normal">
                      Tên phòng <b className="text-rose-500">*</b>
                    </label>
                    <input
                      required
                      value={roomUnitFormData.name}
                      onChange={(e) =>
                        setRoomUnitFormData({
                          ...roomUnitFormData,
                          name: e.target.value,
                        })
                      }
                      placeholder="VD: 101, 102..."
                      className="flex-1 py-1 border-b border-slate-300 outline-none focus:border-[#2e7d32] text-slate-800 font-semibold bg-transparent"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="w-24 text-slate-700 font-normal">
                      Khu vực
                    </label>
                    <div className="flex-1 flex items-center border-b border-slate-300 pb-0.5">
                      <select
                        value={roomUnitFormData.area}
                        onChange={(e) =>
                          setRoomUnitFormData({
                            ...roomUnitFormData,
                            area: e.target.value,
                          })
                        }
                        className="flex-1 outline-none text-slate-700 bg-transparent cursor-pointer"
                      >
                        <option value="">--Lựa chọn--</option>
                        {areasList.map((area, idx) => (
                          <option key={idx} value={area}>
                            {area}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          const areaName = window.prompt(
                            "Nhập tên khu vực mới:",
                          );
                          if (areaName && areaName.trim()) {
                            setAreasList((prev) => [...prev, areaName.trim()]);
                            setRoomUnitFormData((prev) => ({
                              ...prev,
                              area: areaName.trim(),
                            }));
                          }
                        }}
                        className="text-slate-500 hover:text-[#2e7d32] font-bold px-1.5 cursor-pointer text-sm"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="w-24 text-slate-700 font-normal">
                      Hạng phòng <b className="text-rose-500">*</b>
                    </label>
                    <div className="flex-1 flex items-center border-b border-slate-300 pb-0.5">
                      <select
                        required
                        value={roomUnitFormData.room_id}
                        onChange={(e) =>
                          handleSelectRoomTypeForUnit(e.target.value)
                        }
                        className="flex-1 outline-none text-slate-800 font-medium bg-transparent cursor-pointer"
                      >
                        <option value="">--Lựa chọn--</option>
                        {rooms.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          setIsRoomUnitModalOpen(false);
                          handleOpenAddModal();
                        }}
                        className="text-slate-500 hover:text-[#2e7d32] font-bold px-1.5 cursor-pointer text-sm"
                        title="Thêm hạng phòng mới"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="w-24 text-slate-700 font-normal">
                      Bắt đầu sử dụng
                    </label>
                    <div className="flex-1 flex items-center border-b border-slate-300 pb-0.5">
                      <input
                        type="date"
                        value={roomUnitFormData.start_date}
                        onChange={(e) =>
                          setRoomUnitFormData({
                            ...roomUnitFormData,
                            start_date: e.target.value,
                          })
                        }
                        className="flex-1 outline-none text-slate-800 bg-transparent text-xs"
                      />
                      <Calendar size={13} className="text-slate-400" />
                    </div>
                  </div>
                </div>

                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-700 font-normal">
                      Giá theo giờ
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formatNumberWithDots(
                        roomUnitFormData.hourly_price,
                      )}
                      onChange={(e) => {
                        const val = parseDotsToNumber(e.target.value);
                        setRoomUnitFormData((prev) => ({
                          ...prev,
                          hourly_price: val,
                        }));
                      }}
                      placeholder="0"
                      className="w-28 text-right py-0.5 border-b border-slate-300 outline-none focus:border-[#2e7d32] text-slate-800 text-xs font-medium bg-transparent"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-700 font-normal">
                      Giá theo ngày
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formatNumberWithDots(roomUnitFormData.daily_price)}
                      onChange={(e) => {
                        const val = parseDotsToNumber(e.target.value);
                        setRoomUnitFormData((prev) => ({
                          ...prev,
                          daily_price: val,
                        }));
                      }}
                      placeholder="0"
                      className="w-28 text-right py-0.5 border-b border-slate-300 outline-none focus:border-[#2e7d32] text-slate-800 text-xs font-medium bg-transparent"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-700 font-normal">
                      Giá qua đêm
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formatNumberWithDots(
                        roomUnitFormData.overnight_price,
                      )}
                      onChange={(e) => {
                        const val = parseDotsToNumber(e.target.value);
                        setRoomUnitFormData((prev) => ({
                          ...prev,
                          overnight_price: val,
                        }));
                      }}
                      placeholder="0"
                      className="w-28 text-right py-0.5 border-b border-slate-300 outline-none focus:border-[#2e7d32] text-slate-800 text-xs font-medium bg-transparent"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-slate-700 font-normal">
                      <span>Phụ thu nhận sớm</span>
                      <Info size={12} className="text-slate-400" />
                    </span>
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={formatNumberWithDots(
                          roomUnitFormData.early_checkin_fee,
                        )}
                        onChange={(e) => {
                          const val = parseDotsToNumber(e.target.value);
                          setRoomUnitFormData((prev) => ({
                            ...prev,
                            early_checkin_fee: val,
                          }));
                        }}
                        placeholder="0"
                        className="w-20 text-right py-0.5 border-b border-slate-300 outline-none focus:border-[#2e7d32] text-slate-800 text-xs bg-transparent"
                      />
                      <span className="text-slate-500 text-xs">/giờ</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-slate-700 font-normal">
                      <span>Phụ thu trả muộn</span>
                      <Info size={12} className="text-slate-400" />
                    </span>
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={formatNumberWithDots(
                          roomUnitFormData.late_checkout_fee,
                        )}
                        onChange={(e) => {
                          const val = parseDotsToNumber(e.target.value);
                          setRoomUnitFormData((prev) => ({
                            ...prev,
                            late_checkout_fee: val,
                          }));
                        }}
                        placeholder="0"
                        className="w-20 text-right py-0.5 border-b border-slate-300 outline-none focus:border-[#2e7d32] text-slate-800 text-xs bg-transparent"
                      />
                      <span className="text-slate-500 text-xs">/giờ</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-0.5">
                    <span className="w-20 text-slate-700 font-normal">
                      Ghi chú
                    </span>
                    <div className="flex-1 flex items-center border-b border-slate-300 pb-0.5">
                      <input
                        value={roomUnitFormData.note}
                        onChange={(e) =>
                          setRoomUnitFormData({
                            ...roomUnitFormData,
                            note: e.target.value,
                          })
                        }
                        placeholder="Thêm ghi chú nếu có..."
                        className="flex-1 outline-none text-slate-700 bg-transparent text-xs"
                      />
                      <Edit2 size={12} className="text-slate-400" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 flex items-center gap-1.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => scrollImages("left", roomUnitImageScrollRef)}
                  className="p-1 text-slate-300 hover:text-slate-600 cursor-pointer flex-shrink-0"
                >
                  <ChevronLeft size={20} />
                </button>

                <div
                  ref={roomUnitImageScrollRef}
                  className="flex-1 flex gap-2 overflow-x-auto py-1 scroll-smooth scrollbar-none items-center"
                >
                  {roomUnitFormData.images.map((imgSrc, idx) => (
                    <div
                      key={idx}
                      className="relative group w-16 h-14 rounded border border-slate-300 overflow-hidden flex-shrink-0 bg-slate-50"
                    >
                      <img
                        src={imgSrc}
                        alt="preview"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setRoomUnitFormData((prev) => ({
                            ...prev,
                            images: prev.images.filter((_, i) => i !== idx),
                          }));
                        }}
                        className="absolute top-0.5 right-0.5 bg-rose-600/90 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition cursor-pointer"
                      >
                        <X size={10} strokeWidth={3} />
                      </button>
                    </div>
                  ))}

                  {[
                    ...Array(Math.max(1, 8 - roomUnitFormData.images.length)),
                  ].map((_, i) => (
                    <label
                      key={i}
                      htmlFor="room-unit-image-upload"
                      className="w-16 h-14 rounded border border-dashed border-slate-300 bg-white hover:border-emerald-500 cursor-pointer flex items-center justify-center flex-shrink-0 transition"
                      title="Bấm để tải ảnh"
                    >
                      <MountainPlaceholderIcon />
                    </label>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => scrollImages("right", roomUnitImageScrollRef)}
                  className="p-1 text-slate-300 hover:text-slate-600 cursor-pointer flex-shrink-0"
                >
                  <ChevronRight size={20} />
                </button>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                {editingRoomUnit ? (
                  <button
                    type="button"
                    onClick={() =>
                      handleDeleteRoomUnit(
                        editingRoomUnit.id,
                        editingRoomUnit.name,
                      )
                    }
                    className="px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 rounded text-xs flex items-center gap-1.5 cursor-pointer transition active:scale-95"
                  >
                    <Trash2 size={14} />
                    <span>Xóa phòng</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2.5">
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-[#2e7d32] hover:bg-[#256628] text-white font-semibold rounded text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition active:scale-95"
                  >
                    <Save size={14} />
                    <span>Lưu</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleSaveRoomUnit(e, true)}
                    className="px-4 py-1.5 bg-[#2e7d32] hover:bg-[#256628] text-white font-semibold rounded text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition active:scale-95"
                  >
                    <Save size={14} />
                    <span>Lưu & Thêm mới</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsRoomUnitModalOpen(false)}
                    className="px-4 py-1.5 bg-[#718096] hover:bg-[#4a5568] text-white font-semibold rounded text-xs flex items-center gap-1.5 cursor-pointer transition active:scale-95"
                  >
                    <Ban size={14} />
                    <span>Bỏ qua</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
