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
    className="w-9 h-7 text-gray-300"
  >
    <path
      d="M1 35L15 13L24 26L31 16L47 35H1Z"
      fill="#F1F5F9"
      stroke="#CBD5E1"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  </svg>
);

const normalizeAmenityKey = (val) => {
  if (!val) return "";
  const s = String(val).toLowerCase().trim();

  if (
    s === "máy lạnh" ||
    s === "điều hòa" ||
    s === "máy điều hòa" ||
    s === "điều hòa máy lạnh" ||
    s === "air_conditioner"
  ) {
    return "air_conditioner";
  }

  if (s === "bình nóng lạnh" || s === "nước nóng" || s === "hot_water") {
    return "hot_water";
  }

  if (s === "tủ lạnh" || s === "refrigerator" || s === "fridge") {
    return "refrigerator";
  }

  if (s === "máy sấy tóc" || s === "hair_dryer") {
    return "hair_dryer";
  }

  return s;
};

const isSameAmenity = (a, item) => {
  if (!a || !item) return false;
  const keyA = normalizeAmenityKey(a);
  const keyItemId = normalizeAmenityKey(item.id);
  const keyItemLabel = normalizeAmenityKey(item.label);

  return keyA === keyItemId || keyA === keyItemLabel;
};

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
    amenities: [],
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
      setRoomUnitsList([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setApiError("");
    try {
      const res = await apiClient.get(
        `/rooms?hotel_id=${selectedHotelId}&_t=${Date.now()}`,
      );
      const list = res?.data || res?.rooms || res || [];
      const loadedRooms = Array.isArray(list) ? list : [];
      setRooms(loadedRooms);

      try {
        const resUnits = await apiClient.get(
          `/rooms/units?hotel_id=${selectedHotelId}&_t=${Date.now()}`,
        );
        const realUnits = resUnits?.data?.units || resUnits?.units || [];
        setRoomUnitsList(Array.isArray(realUnits) ? realUnits : []);
      } catch {
        setRoomUnitsList([]);
      }
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

  const handleOpenAddModal = () => {
    setEditingRoom(null);
    setModalTab("info");
    setFormData({
      ...initialFormState,
      hotel_id: selectedHotelId || (hotels[0]?.id ? String(hotels[0].id) : ""),
      code: "",
      amenities: [],
      images: [],
    });
    setIsModalOpen(true);
    setIsAddMenuOpen(false);
  };

  const handleOpenEditRoomModal = (room, roomCode) => {
    const baseP = Number(room.base_price || 0);
    const hourlyP =
      Number(room.hourly_price) > 0
        ? Number(room.hourly_price)
        : Math.round(baseP * 0.25);
    const overnightP =
      Number(room.overnight_price) > 0 ? Number(room.overnight_price) : baseP;

    let parsedAmenities = [];
    if (Array.isArray(room.amenities)) {
      parsedAmenities = room.amenities.filter(
        (a) =>
          a && a !== "null" && a !== "undefined" && a !== "{}" && a !== "[]",
      );
    } else if (typeof room.amenities === "string") {
      const cleanStr = room.amenities.trim();
      if (
        cleanStr &&
        cleanStr !== "{}" &&
        cleanStr !== "[]" &&
        cleanStr !== "null" &&
        cleanStr !== "undefined"
      ) {
        try {
          const parsed = JSON.parse(cleanStr);
          parsedAmenities = Array.isArray(parsed)
            ? parsed.filter((a) => a && a !== "null" && a !== "undefined")
            : [];
        } catch {
          parsedAmenities = cleanStr
            .replace(/^\{|\}$/g, "")
            .replace(/["']/g, "")
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s && s !== "null" && s !== "undefined");
        }
      }
    } else {
      parsedAmenities = [];
    }

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
      standard_adults: room.standard_adults || 1,
      standard_children: room.standard_children ?? 1,
      max_adults: room.max_adults || room.capacity || 1,
      max_children: room.max_children ?? 1,
      amenities: parsedAmenities,
      images:
        room.thumbnail || room.image ? [room.thumbnail || room.image] : [],
    });
    setModalTab("info");
    setIsModalOpen(true);
  };

  const handleDeleteRoom = async (roomId, roomName) => {
    const confirmMsg = roomName
      ? `Bạn có chắc chắn muốn xóa hạng phòng "${roomName}"?`
      : "Bạn có chắc chắn muốn xóa hạng phòng này?";
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await apiClient.delete(`/rooms/${roomId}`);
      alert(res?.message || "Đã xóa hạng phòng thành công!");
      setRooms((prev) => prev.filter((r) => r.id !== roomId));
      setSelectedIds((prev) => prev.filter((id) => id !== roomId));
      setRoomUnitsList((prev) => prev.filter((u) => u.room_id !== roomId));
      if (editingRoom && editingRoom.id === roomId) {
        setIsModalOpen(false);
      }
      fetchRoomsByHotel();
    } catch (err) {
      alert(`Lỗi khi xóa: ${err.response?.data?.message || err.message}`);
    }
  };

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
      setRooms((prev) => prev.filter((r) => !selectedIds.includes(r.id)));
      setSelectedIds([]);
      fetchRoomsByHotel();
    } catch (err) {
      alert(`Lỗi khi xóa: ${err.response?.data?.message || err.message}`);
      fetchRoomsByHotel();
    }
  };

  const handleDeleteRoomUnit = async (unitId, unitName) => {
    if (!window.confirm(`Bạn có chắc muốn xóa phòng "${unitName}"?`)) return;

    try {
      await apiClient.delete(`/rooms/units/${unitId}`);
      setRoomUnitsList((prev) => prev.filter((u) => u.id !== unitId));
      if (editingRoomUnit && editingRoomUnit.id === unitId) {
        setIsRoomUnitModalOpen(false);
      }
      alert(`✓ Đã xóa phòng "${unitName}" khỏi hệ thống!`);
      fetchRoomsByHotel();
    } catch (err) {
      alert("Lỗi khi xóa phòng: " + err.message);
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
        amenities: Array.isArray(formData.amenities) ? formData.amenities : [],
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
          amenities: [],
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

  const handleSaveRoomUnit = async (e, keepOpen = false) => {
    if (e) e.preventDefault();
    if (!roomUnitFormData.name.trim()) {
      alert("Vui lòng nhập Tên phòng!");
      return;
    }
    if (!roomUnitFormData.room_id) {
      alert("Vui lòng chọn Hạng phòng!");
      return;
    }

    try {
      await apiClient.post("/rooms/units", {
        id: editingRoomUnit?.id,
        room_id: roomUnitFormData.room_id,
        hotel_id: selectedHotelId,
        name: roomUnitFormData.name.trim(),
        area: roomUnitFormData.area || "Tầng 1",
      });

      alert(
        `✓ Đã lưu phòng "${roomUnitFormData.name}" vào "${roomUnitFormData.area || "Tầng 1"}" thành công!`,
      );

      await fetchRoomsByHotel();

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
    } catch (err) {
      alert(`Lỗi lưu phòng: ${err.response?.data?.message || err.message}`);
    }
  };

  const handleToggleRowExpand = (roomId) => {
    setExpandedRowId((prev) => (prev === roomId ? null : roomId));
  };

  return (
    <div className="w-full pb-24 bg-gray-50/50 font-sans text-gray-900 min-h-screen p-4 sm:p-6 lg:p-8 space-y-6">
      {/* HEADER THEO PHONG CÁCH GHOSTAY */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="text-xs font-black text-[#006ce4] uppercase tracking-wider mb-1">
            Hệ thống Quản trị GoStay
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#0a2540] tracking-tight">
            Hạng phòng & Phòng
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 font-normal mt-0.5">
            Quản lý các loại hạng phòng, thiết lập số lượng phòng thực tế và cơ
            cấu giá
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {selectedIds.length > 0 && activeTab === "room_types" && (
            <button
              type="button"
              onClick={handleBulkDelete}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Trash2 size={14} />
              <span>Xóa ({selectedIds.length})</span>
            </button>
          )}

          <div className="relative" ref={addMenuRef}>
            <button
              type="button"
              onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
              className="px-5 py-2.5 bg-[#003580] hover:bg-blue-900 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Plus size={16} strokeWidth={2.5} />
              <span>Thêm mới</span>
              <ChevronDown
                size={14}
                className={`transition-transform ${isAddMenuOpen ? "rotate-180" : ""}`}
              />
            </button>

            {isAddMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 bg-white border border-gray-200 rounded-2xl shadow-xl py-1.5 z-30 min-w-[160px]">
                <button
                  type="button"
                  onClick={handleOpenAddModal}
                  className="w-full px-4 py-2 text-left text-xs font-bold text-gray-700 hover:bg-blue-50 hover:text-[#003580] flex items-center gap-2 cursor-pointer"
                >
                  <Plus size={14} className="text-gray-400" />
                  <span>Hạng phòng</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenAddRoomUnitModal()}
                  className="w-full px-4 py-2 text-left text-xs font-bold text-gray-700 hover:bg-blue-50 hover:text-[#003580] flex items-center gap-2 cursor-pointer border-t border-gray-100"
                >
                  <Plus size={14} className="text-gray-400" />
                  <span>Phòng cụ thể</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {apiError && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-2xl flex items-center gap-2">
          <AlertCircle size={16} /> <span>{apiError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* BỘ LỌC CỘT TRÁI */}
        <div className="md:col-span-3 space-y-4">
          <div className="bg-white rounded-3xl border border-gray-200 p-5 shadow-xs space-y-2">
            <label className="block text-xs font-black uppercase text-[#0a2540] tracking-wider">
              Tìm kiếm
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên hạng phòng..."
              className="w-full text-xs py-2 px-3 bg-gray-50 border border-gray-200 rounded-xl outline-none placeholder:text-gray-400 focus:border-[#003580] focus:bg-white transition"
            />
          </div>

          <div className="bg-white rounded-3xl border border-gray-200 p-5 shadow-xs space-y-3">
            <div
              onClick={() => setIsBranchDropdownOpen(!isBranchDropdownOpen)}
              className="flex justify-between items-center cursor-pointer select-none"
            >
              <div className="flex items-center gap-1.5">
                <Building2 size={16} className="text-[#006ce4]" />
                <span className="text-xs font-black uppercase text-[#0a2540] tracking-wider">
                  Chi nhánh
                </span>
              </div>
              <ChevronDown
                size={14}
                className={`text-gray-400 transition-transform ${isBranchDropdownOpen ? "rotate-180" : ""}`}
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
                  className="w-full text-xs font-bold text-gray-900 bg-gray-50 border border-gray-200 rounded-xl p-2.5 outline-none cursor-pointer focus:border-[#003580]"
                >
                  {hotels.map((h) => (
                    <option key={h.id} value={h.id}>
                      🏨 {h.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="bg-white rounded-3xl border border-gray-200 p-5 shadow-xs space-y-3">
            <span className="block text-xs font-black uppercase text-[#0a2540] tracking-wider">
              Trạng thái
            </span>
            <div className="space-y-2.5 text-xs font-semibold text-gray-700">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="radio"
                  name="statusFilter"
                  value="active"
                  checked={statusFilter === "active"}
                  onChange={() => setStatusFilter("active")}
                  className="accent-[#003580] cursor-pointer"
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
                  className="accent-[#003580] cursor-pointer"
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
                  className="accent-[#003580] cursor-pointer"
                />
                <span>Tất cả</span>
              </label>
            </div>
          </div>
        </div>

        {/* BẢNG CỘT PHẢI */}
        <div className="md:col-span-9 space-y-0">
          <div className="flex items-center gap-1.5 border-b border-transparent">
            <button
              type="button"
              onClick={() => setActiveTab("room_types")}
              className={`px-5 py-2.5 text-xs font-black uppercase tracking-wider rounded-t-2xl transition cursor-pointer ${
                activeTab === "room_types"
                  ? "bg-[#003580] text-white shadow-xs"
                  : "bg-gray-200/70 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Hạng phòng ({filteredRooms.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("room_units")}
              className={`px-5 py-2.5 text-xs font-black uppercase tracking-wider rounded-t-2xl transition cursor-pointer ${
                activeTab === "room_units"
                  ? "bg-[#003580] text-white shadow-xs"
                  : "bg-gray-200/70 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Danh sách phòng ({roomUnitsList.length})
            </button>
          </div>

          <div className="bg-white rounded-b-3xl rounded-tr-3xl border border-gray-200 shadow-sm overflow-hidden">
            {loading ? (
              <div className="py-24 flex justify-center">
                <LoadingSpinner size="md" label="Đang tải dữ liệu phòng..." />
              </div>
            ) : activeTab === "room_types" ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 font-bold uppercase tracking-wider border-b border-gray-200">
                      <th className="py-4 px-3 w-8 text-center">
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
                          className="cursor-pointer rounded accent-[#003580]"
                        />
                      </th>
                      <th className="py-4 px-1 w-7 text-center">
                        <Star size={13} className="text-gray-300 inline" />
                      </th>
                      <th className="py-4 px-3 font-bold whitespace-nowrap">
                        Mã hạng phòng
                      </th>
                      <th className="py-4 px-3 font-bold whitespace-nowrap">
                        Tên hạng phòng
                      </th>
                      <th className="py-4 px-3 font-bold text-center whitespace-nowrap">
                        SL phòng
                      </th>
                      <th className="py-4 px-3 font-bold text-right whitespace-nowrap">
                        Giá theo giờ
                      </th>
                      <th className="py-4 px-3 font-bold text-right whitespace-nowrap">
                        Giá theo ngày
                      </th>
                      <th className="py-4 px-3 font-bold text-right whitespace-nowrap">
                        Giá qua đêm
                      </th>
                      <th className="py-4 px-3 font-bold whitespace-nowrap">
                        Trạng thái
                      </th>
                      <th className="py-4 px-2 w-16 text-center">Thao tác</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {filteredRooms.length === 0 ? (
                      <tr>
                        <td
                          colSpan={10}
                          className="py-16 text-center text-gray-400"
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
                              className={`transition cursor-pointer select-none ${
                                isExpanded
                                  ? "bg-blue-50/70 border-t-2 border-[#003580]"
                                  : isChecked
                                    ? "bg-blue-50/40"
                                    : "hover:bg-gray-50/80"
                              }`}
                            >
                              <td
                                className="py-3 px-3 text-center"
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
                                  className="cursor-pointer rounded accent-[#003580]"
                                />
                              </td>
                              <td className="py-3 px-1 text-center">
                                <Star size={14} className="text-gray-300" />
                              </td>
                              <td className="py-3 px-3 font-bold text-[#003580]">
                                {roomCode}
                              </td>
                              <td className="py-3 px-3 font-bold text-gray-900">
                                {room.name}
                              </td>
                              <td className="py-3 px-3 text-center font-bold text-gray-900">
                                {room.amount || 2}
                              </td>
                              <td className="py-3 px-3 text-right font-medium text-gray-700 tabular-nums">
                                {formatVND(room.hourly_price)}
                              </td>
                              <td className="py-3 px-3 text-right font-bold text-[#ff6a00] tabular-nums">
                                {formatVND(room.base_price)}
                              </td>
                              <td className="py-3 px-3 text-right font-medium text-gray-700 tabular-nums">
                                {formatVND(room.overnight_price)}
                              </td>
                              <td className="py-3 px-3 whitespace-nowrap">
                                <span
                                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                                    room.is_active === false
                                      ? "bg-gray-100 text-gray-600"
                                      : "bg-emerald-50 text-emerald-800"
                                  }`}
                                >
                                  {room.is_active === false
                                    ? "Ngừng kinh doanh"
                                    : "Đang kinh doanh"}
                                </span>
                              </td>
                              <td className="py-3 px-2 text-center whitespace-nowrap">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenEditRoomModal(room, roomCode);
                                    }}
                                    className="p-1 text-gray-400 hover:text-[#003580] cursor-pointer transition"
                                    title="Chỉnh sửa"
                                  >
                                    <Edit2 size={13} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteRoom(room.id, room.name);
                                    }}
                                    className="p-1 text-gray-400 hover:text-rose-600 cursor-pointer transition"
                                    title="Xóa"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </td>
                            </tr>

                            {isExpanded && (
                              <tr className="bg-white border-b-2 border-[#003580]">
                                <td colSpan={10} className="p-5">
                                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 text-xs">
                                    <div className="md:col-span-4 flex gap-2">
                                      <div className="w-48 h-32 bg-gray-100 rounded-2xl border border-gray-200 overflow-hidden flex items-center justify-center">
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
                                        Mã:{" "}
                                        <b className="text-gray-900">
                                          {roomCode}
                                        </b>
                                      </div>
                                      <div>
                                        Tên:{" "}
                                        <b className="text-gray-900">
                                          {room.name}
                                        </b>
                                      </div>
                                      <div>
                                        Số lượng:{" "}
                                        <b className="text-gray-900">
                                          {room.amount || 2} phòng
                                        </b>
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
                                        <b className="text-[#ff6a00] tabular-nums">
                                          {formatVND(room.base_price)} đ
                                        </b>
                                      </div>
                                    </div>
                                    <div className="md:col-span-4 border-l border-gray-200 pl-5">
                                      <span className="font-bold text-gray-900">
                                        Mô tả
                                      </span>
                                      <p className="text-gray-500 mt-1 leading-relaxed">
                                        {room.description ||
                                          "Chưa có mô tả chi tiết."}
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
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 font-bold uppercase tracking-wider border-b border-gray-200">
                      <th className="py-4 px-4 font-bold">Số phòng</th>
                      <th className="py-4 px-4 font-bold">Khu vực</th>
                      <th className="py-4 px-4 font-bold">Thuộc hạng phòng</th>
                      <th className="py-4 px-4 font-bold text-right">
                        Giá theo giờ
                      </th>
                      <th className="py-4 px-4 font-bold text-right">
                        Giá theo ngày
                      </th>
                      <th className="py-4 px-4 font-bold text-right">
                        Giá qua đêm
                      </th>
                      <th className="py-4 px-4 font-bold text-center">
                        Thao tác
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {roomUnitsList.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="py-16 text-center text-gray-400"
                        >
                          Chưa có phòng vật lý nào trong chi nhánh này.
                        </td>
                      </tr>
                    ) : (
                      roomUnitsList.map((unit) => (
                        <tr
                          key={unit.id}
                          onClick={() => handleOpenAddRoomUnitModal(unit)}
                          className="hover:bg-blue-50/40 cursor-pointer transition"
                        >
                          <td className="py-3 px-4 font-bold text-[#003580] flex items-center gap-1.5">
                            <Key size={14} className="text-[#006ce4]" />
                            <span>Phòng {unit.name}</span>
                          </td>
                          <td className="py-3 px-4 font-medium text-gray-700">
                            <span className="px-2.5 py-0.5 bg-blue-50 text-[#003580] font-bold rounded-md border border-blue-100">
                              {unit.area || "Tầng 1"}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-bold text-gray-900">
                            {unit.room_type_name}
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-gray-700 tabular-nums">
                            {formatVND(unit.hourly_price)}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-[#ff6a00] tabular-nums">
                            {formatVND(unit.daily_price)}
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-gray-700 tabular-nums">
                            {formatVND(unit.overnight_price)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenAddRoomUnitModal(unit);
                                }}
                                className="p-1 hover:text-[#003580] cursor-pointer text-gray-400"
                                title="Chỉnh sửa"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteRoomUnit(unit.id, unit.name);
                                }}
                                className="p-1 hover:text-rose-600 cursor-pointer text-gray-400"
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

            <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 font-semibold bg-white">
              <span>
                Tổng cộng:{" "}
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

      {/* MODAL HẠNG PHÒNG */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-gray-200 flex flex-col max-h-[92vh] overflow-hidden font-sans">
            <input
              id="room-image-upload-input"
              type="file"
              ref={fileInputRef}
              multiple
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-white">
              <h3 className="font-black text-base text-[#0a2540]">
                {editingRoom ? "Chỉnh Sửa Hạng Phòng" : "Thêm Hạng Phòng Mới"}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="cursor-pointer text-gray-400 hover:text-gray-600 p-1"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center gap-8 px-6 border-b border-gray-200 text-xs font-bold text-gray-500 bg-white select-none">
              <button
                type="button"
                onClick={() => setModalTab("info")}
                className={`py-3 transition relative cursor-pointer ${
                  modalTab === "info"
                    ? "text-[#003580] font-black"
                    : "hover:text-gray-900"
                }`}
              >
                Thông tin cơ bản
                {modalTab === "info" && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#003580]" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setModalTab("description")}
                className={`py-3 transition relative cursor-pointer ${
                  modalTab === "description"
                    ? "text-[#003580] font-black"
                    : "hover:text-gray-900"
                }`}
              >
                Mô tả & Tiện nghi
                {modalTab === "description" && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#003580]" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setModalTab("units")}
                className={`py-3 transition relative cursor-pointer ${
                  modalTab === "units"
                    ? "text-[#003580] font-black"
                    : "hover:text-gray-900"
                }`}
              >
                Số lượng phòng
                {modalTab === "units" && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#003580]" />
                )}
              </button>
            </div>

            <form
              onSubmit={(e) => handleSaveRoom(e, false)}
              className="flex-1 overflow-y-auto p-6 space-y-6 text-xs"
            >
              {modalTab === "info" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 items-start pt-2">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <label className="w-28 text-gray-700 font-bold">
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
                          className="flex-1 py-1.5 border-b border-gray-300 outline-none text-gray-900 font-bold bg-transparent cursor-pointer focus:border-[#003580]"
                        >
                          {hotels.map((h) => (
                            <option key={h.id} value={h.id}>
                              {h.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-3">
                        <label className="w-28 text-gray-700 font-bold">
                          Mã hạng phòng
                        </label>
                        <input
                          value={formData.code}
                          onChange={(e) =>
                            setFormData({ ...formData, code: e.target.value })
                          }
                          placeholder="Tự động sinh nếu để trống"
                          className="flex-1 py-1.5 border-b border-gray-300 outline-none text-gray-900 bg-transparent font-mono"
                        />
                      </div>

                      <div className="flex items-center gap-3">
                        <label className="w-28 text-gray-700 font-bold">
                          Tên hạng phòng <b className="text-rose-500">*</b>
                        </label>
                        <input
                          required
                          value={formData.name}
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                          placeholder="VD: Deluxe Hướng Biển"
                          className="flex-1 py-1.5 border-b border-[#003580] outline-none text-gray-900 font-bold bg-transparent"
                        />
                      </div>
                    </div>

                    <div className="space-y-3.5">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-700 font-medium">
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
                          className="w-28 text-right py-1 border-b border-gray-300 outline-none focus:border-[#003580] text-gray-900 font-bold bg-transparent"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-gray-700 font-bold">
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
                          className="w-28 text-right py-1 border-b border-[#003580] outline-none text-[#ff6a00] font-black bg-transparent"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-gray-700 font-medium">
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
                          className="w-28 text-right py-1 border-b border-gray-300 outline-none focus:border-[#003580] text-gray-900 font-bold bg-transparent"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-gray-700 font-medium">
                          Phụ thu nhận sớm
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
                            className="w-20 text-right py-1 border-b border-gray-300 outline-none focus:border-[#003580] text-gray-900 bg-transparent font-semibold"
                          />
                          <span className="text-gray-400">/giờ</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-gray-700 font-medium">
                          Phụ thu trả muộn
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
                            className="w-20 text-right py-1 border-b border-gray-300 outline-none focus:border-[#003580] text-gray-900 bg-transparent font-semibold"
                          />
                          <span className="text-gray-400">/giờ</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => scrollImages("left", imageScrollRef)}
                      className="p-1 text-gray-300 hover:text-gray-600 cursor-pointer flex-shrink-0"
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
                          className="relative group w-16 h-14 rounded-xl border border-gray-200 overflow-hidden flex-shrink-0 bg-gray-50"
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
                            className="absolute top-0.5 right-0.5 bg-rose-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition cursor-pointer"
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
                            className="w-16 h-14 rounded-xl border border-dashed border-gray-300 bg-white hover:border-[#003580] cursor-pointer flex items-center justify-center flex-shrink-0 transition"
                            title="Tải ảnh"
                          >
                            <MountainPlaceholderIcon />
                          </label>
                        ),
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => scrollImages("right", imageScrollRef)}
                      className="p-1 text-gray-300 hover:text-gray-600 cursor-pointer flex-shrink-0"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>

                  <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white mt-4">
                    <div className="bg-gray-50 px-4 py-2.5 font-black uppercase tracking-wider text-gray-800 text-xs border-b border-gray-200">
                      Sức chứa phòng
                    </div>
                    <div className="p-4 space-y-3.5 text-xs">
                      <div className="flex items-center gap-6">
                        <span className="w-20 font-bold text-gray-700">
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
                            className="w-12 text-center border-b border-gray-400 outline-none font-bold text-gray-900 py-0.5 bg-transparent"
                          />
                          <span className="text-gray-500">người lớn và</span>
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
                            className="w-12 text-center border-b border-gray-400 outline-none font-bold text-gray-900 py-0.5 bg-transparent"
                          />
                          <span className="text-gray-500">trẻ em</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <span className="w-20 font-bold text-gray-700">
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
                            className="w-12 text-center border-b border-gray-400 outline-none font-bold text-gray-900 py-0.5 bg-transparent"
                          />
                          <span className="text-gray-500">người lớn và</span>
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
                            className="w-12 text-center border-b border-gray-400 outline-none font-bold text-gray-900 py-0.5 bg-transparent"
                          />
                          <span className="text-gray-500">trẻ em</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {modalTab === "description" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-700 font-bold mb-1">
                        Loại giường
                      </label>
                      <input
                        value={formData.bed_type}
                        onChange={(e) =>
                          setFormData({ ...formData, bed_type: e.target.value })
                        }
                        className="w-full p-2.5 border border-gray-200 rounded-xl outline-none focus:border-[#003580]"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 font-bold mb-1">
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
                        className="w-full p-2.5 border border-gray-200 rounded-xl outline-none focus:border-[#003580]"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-gray-800 flex items-center gap-1">
                        <Sparkles size={14} className="text-amber-500" /> Tiện
                        nghi hạng phòng:
                      </label>

                      {Array.isArray(formData.amenities) &&
                        formData.amenities.length > 0 && (
                          <button
                            type="button"
                            onClick={() =>
                              setFormData((prev) => ({
                                ...prev,
                                amenities: [],
                              }))
                            }
                            className="text-[11px] font-bold text-rose-600 hover:text-rose-800 bg-rose-50 px-2 py-0.5 rounded-lg cursor-pointer transition flex items-center gap-1"
                          >
                            <Trash2 size={12} />
                            <span>
                              Xóa tất cả ({formData.amenities.length})
                            </span>
                          </button>
                        )}
                    </div>

                    {Array.isArray(formData.amenities) &&
                      formData.amenities.length > 0 && (
                        <div className="p-2.5 bg-blue-50/50 border border-blue-100 rounded-2xl">
                          <span className="text-[10px] font-black text-[#003580] block mb-1 uppercase tracking-wider">
                            Đang chọn ({formData.amenities.length}):
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {formData.amenities.map((item, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-white border border-blue-200 text-[#003580] text-[11px] font-bold rounded-lg"
                              >
                                <span>{item}</span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setFormData((prev) => ({
                                      ...prev,
                                      amenities: prev.amenities.filter(
                                        (_, i) => i !== idx,
                                      ),
                                    }))
                                  }
                                  className="text-gray-400 hover:text-rose-600 cursor-pointer ml-0.5"
                                >
                                  ✕
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                    <div className="grid grid-cols-2 gap-1.5 bg-gray-50 p-3 rounded-2xl border border-gray-200 max-h-48 overflow-y-auto">
                      {ROOM_AMENITIES_LIST.map((item) => {
                        const currentAmenities = Array.isArray(
                          formData.amenities,
                        )
                          ? formData.amenities
                          : [];

                        const isChecked = currentAmenities.some((a) =>
                          isSameAmenity(a, item),
                        );

                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setFormData((prev) => {
                                const list = Array.isArray(prev.amenities)
                                  ? prev.amenities
                                  : [];
                                const checked = list.some((a) =>
                                  isSameAmenity(a, item),
                                );
                                return {
                                  ...prev,
                                  amenities: checked
                                    ? list.filter(
                                        (a) => !isSameAmenity(a, item),
                                      )
                                    : [...list, item.label],
                                };
                              });
                            }}
                            className={`flex items-center gap-2 p-2 rounded-xl cursor-pointer select-none text-[11px] text-left transition ${
                              isChecked
                                ? "bg-blue-50 text-[#003580] font-bold border border-blue-200"
                                : "hover:bg-white text-gray-700"
                            }`}
                          >
                            <div
                              className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                                isChecked
                                  ? "bg-[#003580] border-[#003580] text-white"
                                  : "border-gray-300 bg-white"
                              }`}
                            >
                              {isChecked && <Check size={10} strokeWidth={3} />}
                            </div>
                            <span className="truncate">{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {modalTab === "units" && (
                <div className="space-y-3">
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-2">
                    <label className="font-bold text-gray-800">
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
                      className="w-24 p-2 border border-gray-200 rounded-xl outline-none bg-white font-bold text-gray-900"
                    />
                    <p className="text-[11px] text-gray-500">
                      Hệ thống sẽ đồng bộ số lượng phòng vật lý tương ứng vào
                      chi nhánh này.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                {editingRoom ? (
                  <button
                    type="button"
                    onClick={() =>
                      handleDeleteRoom(editingRoom.id, editingRoom.name)
                    }
                    className="px-4 py-2 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition active:scale-95"
                  >
                    <Trash2 size={14} />
                    <span>Xóa hạng phòng</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#003580] hover:bg-blue-900 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition active:scale-95"
                  >
                    <Save size={14} />
                    <span>Lưu</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleSaveRoom(e, true)}
                    className="px-5 py-2 bg-[#006ce4] hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition active:scale-95"
                  >
                    <Save size={14} />
                    <span>Lưu & Thêm tiếp</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition"
                  >
                    <Ban size={14} />
                    <span>Hủy</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PHÒNG VẬT LÝ CỤ THỂ */}
      {isRoomUnitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-gray-200 flex flex-col max-h-[92vh] overflow-hidden font-sans">
            <input
              id="room-unit-image-upload"
              type="file"
              ref={roomUnitFileInputRef}
              multiple
              accept="image/*"
              onChange={handleRoomUnitFileChange}
              className="hidden"
            />

            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-white">
              <h3 className="font-black text-base text-[#0a2540]">
                {editingRoomUnit
                  ? `Chỉnh Sửa Phòng ${editingRoomUnit.name}`
                  : "Thêm Phòng Cụ Thể"}
              </h3>
              <button
                type="button"
                onClick={() => setIsRoomUnitModalOpen(false)}
                className="cursor-pointer text-gray-400 hover:text-gray-600 p-1"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => handleSaveRoomUnit(e, false)}
              className="flex-1 overflow-y-auto p-6 space-y-6 text-xs"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 items-start pt-1">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <label className="w-24 text-gray-700 font-bold">
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
                      placeholder="VD: 101, 201..."
                      className="flex-1 py-1.5 border-b border-gray-300 outline-none focus:border-[#003580] text-gray-900 font-bold bg-transparent"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="w-24 text-gray-700 font-bold">
                      Khu vực
                    </label>
                    <div className="flex-1 flex items-center border-b border-gray-300 pb-0.5">
                      <select
                        value={roomUnitFormData.area}
                        onChange={(e) =>
                          setRoomUnitFormData({
                            ...roomUnitFormData,
                            area: e.target.value,
                          })
                        }
                        className="flex-1 outline-none text-[#003580] bg-transparent cursor-pointer font-bold"
                      >
                        <option value="">-- Lựa chọn --</option>
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
                            "Nhập tên khu vực mới (VD: Tầng 4, Khu VIP):",
                          );
                          if (areaName && areaName.trim()) {
                            setAreasList((prev) => [...prev, areaName.trim()]);
                            setRoomUnitFormData((prev) => ({
                              ...prev,
                              area: areaName.trim(),
                            }));
                          }
                        }}
                        className="text-[#006ce4] font-bold px-1.5 cursor-pointer text-sm"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="w-24 text-gray-700 font-bold">
                      Hạng phòng <b className="text-rose-500">*</b>
                    </label>
                    <div className="flex-1 flex items-center border-b border-gray-300 pb-0.5">
                      <select
                        required
                        value={roomUnitFormData.room_id}
                        onChange={(e) =>
                          handleSelectRoomTypeForUnit(e.target.value)
                        }
                        className="flex-1 outline-none text-gray-900 font-bold bg-transparent cursor-pointer"
                      >
                        <option value="">-- Lựa chọn --</option>
                        {rooms.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="w-24 text-gray-700 font-bold">
                      Bắt đầu dùng
                    </label>
                    <div className="flex-1 flex items-center border-b border-gray-300 pb-0.5">
                      <input
                        type="date"
                        value={roomUnitFormData.start_date}
                        onChange={(e) =>
                          setRoomUnitFormData({
                            ...roomUnitFormData,
                            start_date: e.target.value,
                          })
                        }
                        className="flex-1 outline-none text-gray-900 bg-transparent text-xs font-semibold"
                      />
                      <Calendar size={14} className="text-gray-400" />
                    </div>
                  </div>
                </div>

                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700 font-medium">
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
                      className="w-28 text-right py-1 border-b border-gray-300 outline-none focus:border-[#003580] text-gray-900 text-xs font-bold bg-transparent"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-700 font-bold">
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
                      className="w-28 text-right py-1 border-b border-[#003580] outline-none text-[#ff6a00] text-xs font-black bg-transparent"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-700 font-medium">
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
                      className="w-28 text-right py-1 border-b border-gray-300 outline-none focus:border-[#003580] text-gray-900 text-xs font-bold bg-transparent"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-700 font-medium">
                      Phụ thu nhận sớm
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
                        className="w-20 text-right py-1 border-b border-gray-300 outline-none focus:border-[#003580] text-gray-900 text-xs font-semibold bg-transparent"
                      />
                      <span className="text-gray-400 text-xs">/giờ</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-700 font-medium">
                      Phụ thu trả muộn
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
                        className="w-20 text-right py-1 border-b border-gray-300 outline-none focus:border-[#003580] text-gray-900 text-xs font-semibold bg-transparent"
                      />
                      <span className="text-gray-400 text-xs">/giờ</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-0.5">
                    <span className="w-20 text-gray-700 font-bold">
                      Ghi chú
                    </span>
                    <div className="flex-1 flex items-center border-b border-gray-300 pb-0.5">
                      <input
                        value={roomUnitFormData.note}
                        onChange={(e) =>
                          setRoomUnitFormData({
                            ...roomUnitFormData,
                            note: e.target.value,
                          })
                        }
                        placeholder="Ghi chú vị trí hoặc tình trạng..."
                        className="flex-1 outline-none text-gray-800 bg-transparent text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                {editingRoomUnit ? (
                  <button
                    type="button"
                    onClick={() =>
                      handleDeleteRoomUnit(
                        editingRoomUnit.id,
                        editingRoomUnit.name,
                      )
                    }
                    className="px-4 py-2 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition active:scale-95"
                  >
                    <Trash2 size={14} />
                    <span>Xóa phòng</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#003580] hover:bg-blue-900 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition active:scale-95"
                  >
                    <Save size={14} />
                    <span>Lưu</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleSaveRoomUnit(e, true)}
                    className="px-5 py-2 bg-[#006ce4] hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition active:scale-95"
                  >
                    <Save size={14} />
                    <span>Lưu & Thêm tiếp</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsRoomUnitModalOpen(false)}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition"
                  >
                    <Ban size={14} />
                    <span>Hủy</span>
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
