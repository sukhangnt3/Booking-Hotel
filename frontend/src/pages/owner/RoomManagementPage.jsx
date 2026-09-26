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
  Search,
  Percent,
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
    className="w-10 h-8 text-gray-300"
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

const isSameAmenity = (a, item) => {
  if (!a || !item) return false;
  const keyA = String(a).toLowerCase().trim();
  const keyItemId = String(item.id).toLowerCase().trim();
  const keyItemLabel = String(item.label).toLowerCase().trim();
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
  const fileInputRef = useRef(null);

  const [expandedRowId, setExpandedRowId] = useState(null);
  const [expandedUnitId, setExpandedUnitId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);

  // MODAL HẠNG PHÒNG
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState("info");
  const [editingRoom, setEditingRoom] = useState(null);

  const [formRoomUnits, setFormRoomUnits] = useState([]);
  const [newRoomUnitInput, setNewRoomUnitInput] = useState("");
  const [newRoomUnitArea, setNewRoomUnitArea] = useState("Tầng 8");

  // KHỞI TẠO STATE CHỈ CÒN 3 LOẠI GIÁ (NGÀY, ĐÊM, GIỜ - ĐÃ BỎ BUỔI)
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
    base_price: "", // Giá ngày đêm
    overnight_price: "", // Qua đêm
    hourly_price: "", // Giờ
    auto_surcharge: true,
    surcharge_type: "tiered",
    early_checkin_fee: "",
    late_checkout_fee: "",
    early_surcharge_tiers: [
      { hours: 1, percent: 10 },
      { hours: 2, percent: 30 },
    ],
    late_surcharge_tiers: [
      { hours: 1, percent: 10 },
      { hours: 2, percent: 30 },
    ],
    apply_to_all_rooms: false,
    description: "",
    amount: 1,
    bed_type: "1 Giường đôi King",
    room_area: 28,
    status: "active",
    amenities: [],
    images: [],
  };
  const [formData, setFormData] = useState(initialFormState);

  // MODAL PHÒNG CỤ THỂ
  const [isRoomUnitModalOpen, setIsRoomUnitModalOpen] = useState(false);
  const [editingRoomUnit, setEditingRoomUnit] = useState(null);
  const [areasList, setAreasList] = useState([
    "Tầng 1",
    "Tầng 2",
    "Tầng 3",
    "Tầng 4",
    "Tầng 5",
    "Tầng 8",
    "Khu VIP",
  ]);

  const initialRoomUnitForm = {
    name: "",
    area: "Tầng 8",
    room_id: "",
    start_date: new Date().toISOString().slice(0, 10),
    note: "",
  };
  const [roomUnitFormData, setRoomUnitFormData] = useState(initialRoomUnitForm);
  const [roomUnitsList, setRoomUnitsList] = useState([]);

  const formatVND = (num) => Number(num || 0).toLocaleString("vi-VN");

  const getHotelName = useCallback(
    (hotelId) => {
      const targetId = hotelId || selectedHotelId;
      const found = hotels.find((h) => String(h.id) === String(targetId));
      return found?.name || "Chi nhánh trung tâm";
    },
    [hotels, selectedHotelId],
  );

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
      setRooms(Array.isArray(list) ? list : []);

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

  const handleOpenAddModal = () => {
    setEditingRoom(null);
    setModalTab("info");
    setFormRoomUnits([]);
    setNewRoomUnitInput("");
    setFormData({
      ...initialFormState,
      hotel_id: selectedHotelId || (hotels[0]?.id ? String(hotels[0].id) : ""),
      code: "",
      amount: 1,
      amenities: [],
      images: [],
    });
    setIsModalOpen(true);
    setIsAddMenuOpen(false);
  };

  const handleOpenEditRoomModal = (room, roomCode) => {
    const baseP = Number(room.base_price || 0);
    const overnightP =
      Number(room.overnight_price || 0) > 0
        ? Number(room.overnight_price)
        : baseP;
    const hourlyP =
      Number(room.hourly_price || 0) > 0
        ? Number(room.hourly_price)
        : Math.round(baseP * 0.25);

    let parsedAmenities = Array.isArray(room.amenities) ? room.amenities : [];

    const roomImgList =
      Array.isArray(room.images) && room.images.length > 0
        ? room.images
        : room.thumbnail
          ? [room.thumbnail]
          : room.image
            ? [room.image]
            : [];

    const relatedUnits = roomUnitsList.filter(
      (u) => String(u.room_id) === String(room.id),
    );
    setFormRoomUnits(
      relatedUnits.map((u) => ({
        id: u.id,
        name: u.name,
        area: u.area || "Tầng 8",
        status: u.status || "available",
      })),
    );

    const earlyTiers =
      Array.isArray(room.early_surcharge_tiers) &&
      room.early_surcharge_tiers.length > 0
        ? room.early_surcharge_tiers
        : [
            { hours: 1, percent: 10 },
            { hours: 2, percent: 30 },
          ];

    const lateTiers =
      Array.isArray(room.late_surcharge_tiers) &&
      room.late_surcharge_tiers.length > 0
        ? room.late_surcharge_tiers
        : [
            { hours: 1, percent: 10 },
            { hours: 2, percent: 30 },
          ];

    const roomAmount = Number(
      room.amount ??
        room.total_rooms ??
        room.quantity ??
        room.room_count ??
        (relatedUnits.length > 0 ? relatedUnits.length : 1),
    );

    setEditingRoom(room);
    setFormData({
      ...room,
      hotel_id: String(room.hotel_id || selectedHotelId),
      code: roomCode,
      amount: roomAmount,
      base_price: baseP,
      overnight_price: overnightP,
      hourly_price: hourlyP,
      auto_surcharge:
        room.auto_surcharge !== undefined ? Boolean(room.auto_surcharge) : true,
      surcharge_type: room.surcharge_type || "tiered",
      early_checkin_fee: room.early_checkin_fee || "",
      late_checkout_fee: room.late_checkout_fee || "",
      early_surcharge_tiers: earlyTiers,
      late_surcharge_tiers: lateTiers,
      apply_to_all_rooms: false,
      standard_adults: room.standard_adults || 1,
      standard_children: room.standard_children ?? 1,
      max_adults: room.max_adults || room.capacity || 1,
      max_children: room.max_children ?? 1,
      amenities: parsedAmenities,
      images: roomImgList,
    });
    setModalTab("info");
    setIsModalOpen(true);
  };

  const handleAddEarlyTier = () => {
    setFormData((prev) => {
      const currentTiers = prev.early_surcharge_tiers || [];
      const nextHour =
        currentTiers.length > 0
          ? Number(currentTiers[currentTiers.length - 1].hours) + 1
          : 1;
      return {
        ...prev,
        early_surcharge_tiers: [
          ...currentTiers,
          { hours: nextHour, percent: 0 },
        ],
      };
    });
  };

  const handleUpdateEarlyTier = (idx, field, value) => {
    setFormData((prev) => {
      const updated = [...(prev.early_surcharge_tiers || [])];
      updated[idx] = { ...updated[idx], [field]: Number(value || 0) };
      return { ...prev, early_surcharge_tiers: updated };
    });
  };

  const handleRemoveEarlyTier = (idx) => {
    setFormData((prev) => ({
      ...prev,
      early_surcharge_tiers: prev.early_surcharge_tiers.filter(
        (_, i) => i !== idx,
      ),
    }));
  };

  const handleAddLateTier = () => {
    setFormData((prev) => {
      const currentTiers = prev.late_surcharge_tiers || [];
      const nextHour =
        currentTiers.length > 0
          ? Number(currentTiers[currentTiers.length - 1].hours) + 1
          : 1;
      return {
        ...prev,
        late_surcharge_tiers: [
          ...currentTiers,
          { hours: nextHour, percent: 0 },
        ],
      };
    });
  };

  const handleUpdateLateTier = (idx, field, value) => {
    setFormData((prev) => {
      const updated = [...(prev.late_surcharge_tiers || [])];
      updated[idx] = { ...updated[idx], [field]: Number(value || 0) };
      return { ...prev, late_surcharge_tiers: updated };
    });
  };

  const handleRemoveLateTier = (idx) => {
    setFormData((prev) => ({
      ...prev,
      late_surcharge_tiers: prev.late_surcharge_tiers.filter(
        (_, i) => i !== idx,
      ),
    }));
  };

  const handleAddUnitToForm = () => {
    if (!newRoomUnitInput.trim()) return;
    const trimmed = newRoomUnitInput.trim();
    if (
      formRoomUnits.some((u) => u.name.toLowerCase() === trimmed.toLowerCase())
    ) {
      return alert("Phòng này đã có trong danh sách!");
    }
    const updatedUnits = [
      ...formRoomUnits,
      {
        id: `temp_${Date.now()}`,
        name: trimmed,
        area: newRoomUnitArea || "Tầng 8",
        status: "available",
      },
    ];
    setFormRoomUnits(updatedUnits);
    setFormData((prev) => ({
      ...prev,
      amount: Math.max(Number(prev.amount || 0), updatedUnits.length),
    }));
    setNewRoomUnitInput("");
  };

  const handleRemoveUnitFromForm = (idx) => {
    const updated = formRoomUnits.filter((_, i) => i !== idx);
    setFormRoomUnits(updated);
  };

  const handleDeleteRoom = async (roomId, roomName) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa hạng phòng "${roomName}"?`))
      return;
    try {
      const res = await apiClient.delete(`/rooms/${roomId}`);
      alert(res?.message || "Đã xóa hạng phòng thành công!");
      fetchRoomsByHotel();
      setIsModalOpen(false);
    } catch (err) {
      alert(`Lỗi khi xóa: ${err.response?.data?.message || err.message}`);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (
      !window.confirm(
        `Bạn có chắc muốn xóa ${selectedIds.length} hạng phòng đã chọn?`,
      )
    )
      return;
    try {
      for (const id of selectedIds) {
        await apiClient.delete(`/rooms/${id}`);
      }
      alert("Đã xóa thành công các hạng phòng đã chọn!");
      setSelectedIds([]);
      fetchRoomsByHotel();
    } catch (err) {
      alert(`Lỗi khi xóa: ${err.response?.data?.message || err.message}`);
    }
  };

  const handleDeleteRoomUnit = async (unitId, unitName) => {
    if (!window.confirm(`Bạn có chắc muốn xóa phòng "${unitName}"?`)) return;
    try {
      await apiClient.delete(`/rooms/units/${unitId}`);
      alert(`✓ Đã xóa phòng "${unitName}" thành công!`);
      fetchRoomsByHotel();
      setIsRoomUnitModalOpen(false);
    } catch (err) {
      alert("Lỗi khi xóa phòng: " + err.message);
    }
  };

  const handleOpenAddRoomUnitModal = (unit = null) => {
    setIsAddMenuOpen(false);
    if (unit) {
      setEditingRoomUnit(unit);
      setRoomUnitFormData({
        name: unit.name || "",
        area: unit.area || "Tầng 8",
        room_id: unit.room_id || "",
        start_date: new Date().toISOString().slice(0, 10),
        note: "",
      });
    } else {
      setEditingRoomUnit(null);
      setRoomUnitFormData({
        ...initialRoomUnitForm,
        room_id: rooms[0]?.id || "",
      });
    }
    setIsRoomUnitModalOpen(true);
  };

  // LƯU HẠNG PHÒNG: 3 MỨC GIÁ CHUẨN
  const handleSaveRoom = async (e) => {
    if (e) e.preventDefault();
    const targetHotelId = formData.hotel_id || selectedHotelId;

    if (!targetHotelId) return alert("Vui lòng chọn Khách sạn!");
    if (!formData.name.trim()) return alert("Vui lòng nhập Tên hạng phòng!");

    const dailyPrice = Number(formData.base_price);
    if (!dailyPrice || dailyPrice <= 0) {
      return alert("Giá ngày đêm bắt buộc phải lớn hơn 0!");
    }

    try {
      const selectedImg =
        formData.images.length > 0 ? formData.images[0] : null;

      const parsedAmount = Number(formData.amount || 1);
      const finalAmount = Math.max(parsedAmount, formRoomUnits.length);

      const earlyFee = formData.auto_surcharge
        ? Number(formData.early_checkin_fee || 0)
        : 0;
      const lateFee = formData.auto_surcharge
        ? Number(formData.late_checkout_fee || 0)
        : 0;

      const payload = {
        hotel_id: targetHotelId,
        name: formData.name.trim(),
        code: formData.code?.trim(),
        capacity: Number(formData.max_adults || formData.capacity || 2),
        standard_adults: Number(formData.standard_adults || 1),
        standard_children: Number(formData.standard_children || 0),
        max_adults: Number(formData.max_adults || 2),
        max_children: Number(formData.max_children || 1),
        base_price: dailyPrice,
        overnight_price: Number(formData.overnight_price) || dailyPrice,
        hourly_price:
          Number(formData.hourly_price) || Math.round(dailyPrice * 0.25),
        auto_surcharge: Boolean(formData.auto_surcharge),
        surcharge_type: formData.surcharge_type,
        early_checkin_fee: earlyFee,
        late_checkout_fee: lateFee,
        early_surcharge_tiers: formData.early_surcharge_tiers || [],
        late_surcharge_tiers: formData.late_surcharge_tiers || [],
        apply_to_all_rooms: Boolean(formData.apply_to_all_rooms),
        amount: finalAmount,
        total_rooms: finalAmount,
        room_units: formRoomUnits,
        type: formData.type || "Tiêu chuẩn",
        bed_type: formData.bed_type || "1 Giường đôi King",
        room_area: Number(formData.room_area || 28),
        description: formData.description || "",
        image: selectedImg,
        images: formData.images,
        amenities: Array.isArray(formData.amenities) ? formData.amenities : [],
      };

      if (editingRoom) {
        await apiClient.put(`/rooms/${editingRoom.id}`, payload);
      } else {
        await apiClient.post("/rooms", payload);
      }

      alert("✓ Đã lưu hạng phòng và cài đặt phụ thu thành công!");
      await fetchRoomsByHotel();
      setIsModalOpen(false);
    } catch (err) {
      alert(`Lỗi: ${err.response?.data?.message || err.message}`);
    }
  };

  const handleSaveRoomUnit = async (e) => {
    if (e) e.preventDefault();
    if (!roomUnitFormData.name.trim()) return alert("Vui lòng nhập Tên phòng!");
    if (!roomUnitFormData.room_id) return alert("Vui lòng chọn Hạng phòng!");

    try {
      await apiClient.post("/rooms/units", {
        id: editingRoomUnit?.id,
        room_id: roomUnitFormData.room_id,
        hotel_id: selectedHotelId,
        name: roomUnitFormData.name.trim(),
        area: roomUnitFormData.area || "Tầng 8",
      });

      alert(`✓ Đã lưu phòng "${roomUnitFormData.name}" thành công!`);
      await fetchRoomsByHotel();
      setIsRoomUnitModalOpen(false);
    } catch (err) {
      alert(`Lỗi lưu phòng: ${err.response?.data?.message || err.message}`);
    }
  };

  const selectedParentRoom = rooms.find(
    (r) => String(r.id) === String(roomUnitFormData.room_id),
  );

  return (
    <div className="w-full pb-24 bg-gray-50/50 font-sans text-gray-900 min-h-screen p-3 sm:p-5 lg:p-6 space-y-5">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <div className="text-xs font-black text-[#006ce4] uppercase tracking-wider mb-1">
            Hệ thống Quản trị GoStay
          </div>
          <h1 className="text-2xl font-black text-[#0a2540] tracking-tight">
            Hạng phòng & Phòng
          </h1>
          <p className="text-xs text-gray-500 font-normal mt-0.5">
            Quản lý các loại hạng phòng, thiết lập danh sách phòng vật lý và cơ
            cấu giá
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && activeTab === "room_types" && (
            <button
              type="button"
              onClick={handleBulkDelete}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Trash2 size={14} /> <span>Xóa ({selectedIds.length})</span>
            </button>
          )}

          <div className="relative" ref={addMenuRef}>
            <button
              type="button"
              onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
              className="px-4 py-2 bg-[#003580] hover:bg-blue-900 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Plus size={15} strokeWidth={2.5} />
              <span>+ Hạng phòng & Phòng</span>
              <ChevronDown
                size={13}
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

      {/* LƯỚI BẢNG CHÍNH */}
      <div className="grid grid-cols-1 md:grid-cols-12 xl:grid-cols-12 gap-5 items-start">
        {/* BỘ LỌC BÊN TRÁI */}
        <div className="md:col-span-3 xl:col-span-2 space-y-3.5">
          <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs space-y-1.5">
            <label className="block text-[11px] font-black uppercase text-[#0a2540] tracking-wider">
              Tìm kiếm
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên/mã..."
              className="w-full text-xs py-1.5 px-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-[#003580] focus:bg-white transition"
            />
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs space-y-2">
            <div
              onClick={() => setIsBranchDropdownOpen(!isBranchDropdownOpen)}
              className="flex justify-between items-center cursor-pointer select-none"
            >
              <div className="flex items-center gap-1.5">
                <Building2 size={15} className="text-[#006ce4]" />
                <span className="text-[11px] font-black uppercase text-[#0a2540] tracking-wider">
                  Chi nhánh
                </span>
              </div>
              <ChevronDown
                size={13}
                className={`text-gray-400 transition-transform ${isBranchDropdownOpen ? "rotate-180" : ""}`}
              />
            </div>

            {isBranchDropdownOpen && (
              <select
                value={selectedHotelId}
                onChange={(e) => {
                  const newId = e.target.value;
                  setSelectedHotelId(newId);
                  setSearchParams({ hotelId: newId });
                }}
                className="w-full text-xs font-bold text-gray-900 bg-gray-50 border border-gray-200 rounded-lg p-2 outline-none cursor-pointer focus:border-[#003580]"
              >
                {hotels.map((h) => (
                  <option key={h.id} value={h.id}>
                    🏨 {h.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs space-y-2">
            <span className="block text-[11px] font-black uppercase text-[#0a2540] tracking-wider">
              Trạng thái
            </span>
            <div className="space-y-2 text-xs font-semibold text-gray-700">
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

        {/* BẢNG BÊN PHẢI */}
        <div className="md:col-span-9 xl:col-span-10 space-y-0">
          <div className="flex items-center gap-1 border-b border-transparent">
            <button
              type="button"
              onClick={() => setActiveTab("room_types")}
              className={`px-5 py-2 text-xs font-black uppercase tracking-wider rounded-t-xl transition cursor-pointer ${
                activeTab === "room_types"
                  ? "bg-[#003580] text-white shadow-xs"
                  : "bg-gray-200/70 text-gray-600 hover:bg-gray-200"
              }`}
            >
              HẠNG PHÒNG ({filteredRooms.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("room_units")}
              className={`px-5 py-2 text-xs font-black uppercase tracking-wider rounded-t-xl transition cursor-pointer ${
                activeTab === "room_units"
                  ? "bg-[#003580] text-white shadow-xs"
                  : "bg-gray-200/70 text-gray-600 hover:bg-gray-200"
              }`}
            >
              PHÒNG ({roomUnitsList.length})
            </button>
          </div>

          <div className="bg-white rounded-b-2xl rounded-tr-2xl border border-gray-200 shadow-sm overflow-hidden">
            {loading ? (
              <div className="py-20 flex justify-center">
                <LoadingSpinner size="md" label="Đang tải dữ liệu phòng..." />
              </div>
            ) : activeTab === "room_types" ? (
              /* TAB 1: BẢNG HẠNG PHÒNG (ĐÃ XÓA GIÁ BUỔI) */
              <div className="w-full overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200 text-xs">
                      <th className="py-3 px-2.5 w-8 text-center">
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
                      <th className="py-3 px-2 font-bold whitespace-nowrap">
                        Mã hạng phòng
                      </th>
                      <th className="py-3 px-2.5 font-bold whitespace-nowrap">
                        Tên hạng phòng
                      </th>
                      <th className="py-3 px-2 font-bold text-center whitespace-nowrap">
                        SL phòng
                      </th>
                      <th className="py-3 px-2.5 font-bold text-right whitespace-nowrap">
                        Giá ngày đêm
                      </th>
                      <th className="py-3 px-2.5 font-bold text-right whitespace-nowrap">
                        Giá qua đêm
                      </th>
                      <th className="py-3 px-2.5 font-bold text-right whitespace-nowrap">
                        Giá giờ
                      </th>
                      <th className="py-3 px-2.5 font-bold text-center whitespace-nowrap">
                        Trạng thái
                      </th>
                      <th className="py-3 px-2.5 font-bold text-center whitespace-nowrap">
                        Chi nhánh
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredRooms.map((room) => {
                      const isExpanded = expandedRowId === room.id;
                      const roomCode = room.code || "P001";
                      const roomImg =
                        room.thumbnail ||
                        room.image ||
                        (Array.isArray(room.images) && room.images[0]) ||
                        "";

                      const displayAmount = Number(
                        room.amount ??
                          room.total_rooms ??
                          room.quantity ??
                          room.room_count ??
                          1,
                      );

                      return (
                        <React.Fragment key={room.id}>
                          <tr
                            onClick={() =>
                              setExpandedRowId(isExpanded ? null : room.id)
                            }
                            className={`transition cursor-pointer select-none ${
                              isExpanded
                                ? "bg-blue-50/70 border-t-2 border-[#003580]"
                                : "hover:bg-gray-50/80"
                            }`}
                          >
                            <td
                              className="py-3 px-2.5 text-center"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <input
                                type="checkbox"
                                checked={selectedIds.includes(room.id)}
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
                            <td className="py-3 px-2 font-black text-[#003580] whitespace-nowrap">
                              {roomCode}
                            </td>
                            <td className="py-3 px-2.5 font-black text-gray-900 whitespace-nowrap">
                              {room.name}
                            </td>
                            <td className="py-3 px-2 text-center font-bold text-gray-900">
                              {displayAmount}
                            </td>
                            <td className="py-3 px-2.5 text-right font-bold text-gray-900 tabular-nums whitespace-nowrap">
                              {formatVND(room.base_price)}
                            </td>
                            <td className="py-3 px-2.5 text-right font-medium text-gray-800 tabular-nums whitespace-nowrap">
                              {formatVND(room.overnight_price)}
                            </td>
                            <td className="py-3 px-2.5 text-right font-medium text-gray-800 tabular-nums whitespace-nowrap">
                              {formatVND(room.hourly_price)}
                            </td>
                            <td className="py-3 px-2.5 text-center whitespace-nowrap">
                              <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                                {room.is_active === false
                                  ? "Ngừng kinh doanh"
                                  : "Đang kinh doanh"}
                              </span>
                            </td>
                            <td className="py-3 px-2.5 text-center text-gray-700 font-bold whitespace-nowrap">
                              {room.hotel_name || getHotelName(room.hotel_id)}
                            </td>
                          </tr>

                          {/* MỞ RỘNG CHI TIẾT */}
                          {isExpanded && (
                            <tr className="bg-white border-b-2 border-[#003580]">
                              <td colSpan={9} className="p-5 space-y-4">
                                <div className="flex items-start justify-between">
                                  <div className="flex items-center gap-3.5">
                                    <div className="w-20 h-16 bg-gray-100 rounded-xl overflow-hidden border border-gray-200 shrink-0 flex items-center justify-center shadow-xs">
                                      {roomImg ? (
                                        <img
                                          src={roomImg}
                                          alt={room.name}
                                          className="w-full h-full object-cover"
                                          onError={(e) => {
                                            e.target.style.display = "none";
                                          }}
                                        />
                                      ) : (
                                        <MountainPlaceholderIcon />
                                      )}
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <h4 className="text-sm font-black text-gray-900">
                                          {room.name}
                                        </h4>
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                                          Đang kinh doanh
                                        </span>
                                      </div>
                                      <div className="text-gray-400 text-[11px] mt-0.5">
                                        🏷️ {roomCode}
                                      </div>
                                    </div>
                                  </div>
                                  <span className="text-xs text-gray-700 font-bold">
                                    {room.hotel_name ||
                                      getHotelName(room.hotel_id)}
                                  </span>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs border-b border-gray-100 pb-4">
                                  <div>
                                    <span className="text-gray-500 block">
                                      Số lượng phòng
                                    </span>
                                    <b className="text-gray-900 text-sm">
                                      {displayAmount}
                                    </b>
                                  </div>
                                  <div>
                                    <span className="text-gray-500 block">
                                      Sức chứa tiêu chuẩn
                                    </span>
                                    <b className="text-gray-900">
                                      {room.standard_adults || 1} người lớn,{" "}
                                      {room.standard_children || 1} trẻ em
                                    </b>
                                  </div>
                                  <div>
                                    <span className="text-gray-500 block">
                                      Sức chứa tối đa
                                    </span>
                                    <b className="text-gray-900">
                                      {room.max_adults || 1} người lớn,{" "}
                                      {room.max_children || 1} trẻ em
                                    </b>
                                  </div>
                                  <div>
                                    <span className="text-gray-500 block">
                                      Phụ thu thêm giờ
                                    </span>
                                    <span className="text-gray-800 font-medium">
                                      {room.auto_surcharge ? (
                                        room.surcharge_type === "tiered" ? (
                                          <span className="text-[#006ce4] font-bold">
                                            Theo bậc thang (%)
                                          </span>
                                        ) : (
                                          <span className="text-[#006ce4] font-bold">
                                            Theo giờ cố định
                                          </span>
                                        )
                                      ) : (
                                        "Không tự động tính phụ thu"
                                      )}
                                    </span>
                                  </div>
                                </div>

                                {/* BẢNG 3 MỨC GIÁ CƠ SỞ CHUẨN */}
                                <div className="w-full max-w-lg text-xs space-y-1.5">
                                  <div className="flex justify-between border-b border-gray-200 pb-1.5 text-gray-500 font-bold">
                                    <span>Loại hình lưu trú</span>
                                    <span>Giá cơ sở</span>
                                  </div>
                                  <div className="flex justify-between py-1 border-b border-gray-100 font-semibold">
                                    <span className="text-gray-700">
                                      Ngày đêm
                                    </span>
                                    <span className="font-bold text-gray-900 tabular-nums">
                                      {formatVND(room.base_price)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between py-1 border-b border-gray-100 font-semibold">
                                    <span className="text-gray-700">
                                      Qua đêm
                                    </span>
                                    <span className="font-bold text-gray-900 tabular-nums">
                                      {formatVND(room.overnight_price)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between py-1 font-semibold">
                                    <span className="text-gray-700">Giờ</span>
                                    <span className="font-bold text-gray-900 tabular-nums">
                                      {formatVND(room.hourly_price)}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleDeleteRoom(room.id, room.name)
                                    }
                                    className="text-gray-500 hover:text-rose-600 flex items-center gap-1.5 font-bold cursor-pointer"
                                  >
                                    <Trash2 size={13} /> <span>Xóa</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleOpenEditRoomModal(room, roomCode)
                                    }
                                    className="px-4 py-1.5 bg-[#006ce4] hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5 transition"
                                  >
                                    <Edit2 size={13} /> <span>Chỉnh sửa</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              /* TAB 2: BẢNG PHÒNG CỤ THỂ (ĐÃ XÓA GIÁ BUỔI) */
              <div className="w-full overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200 text-xs">
                      <th className="py-3 px-2.5 w-8 text-center">
                        <input
                          type="checkbox"
                          className="rounded accent-[#003580]"
                        />
                      </th>
                      <th className="py-3 px-2 font-bold whitespace-nowrap">
                        Tên phòng
                      </th>
                      <th className="py-3 px-2.5 font-bold whitespace-nowrap">
                        Tên hạng phòng
                      </th>
                      <th className="py-3 px-2 font-bold whitespace-nowrap">
                        Khu vực
                      </th>
                      <th className="py-3 px-2.5 font-bold text-right whitespace-nowrap">
                        Giá ngày đêm
                      </th>
                      <th className="py-3 px-2.5 font-bold text-right whitespace-nowrap">
                        Giá qua đêm
                      </th>
                      <th className="py-3 px-2.5 font-bold text-right whitespace-nowrap">
                        Giá giờ
                      </th>
                      <th className="py-3 px-2.5 font-bold text-center whitespace-nowrap">
                        Trạng thái
                      </th>
                      <th className="py-3 px-2.5 font-bold text-center whitespace-nowrap">
                        Chi nhánh
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {roomUnitsList.map((unit) => {
                      const isExpanded = expandedUnitId === unit.id;

                      return (
                        <React.Fragment key={unit.id}>
                          <tr
                            onClick={() =>
                              setExpandedUnitId(isExpanded ? null : unit.id)
                            }
                            className={`hover:bg-blue-50/40 cursor-pointer transition ${
                              isExpanded
                                ? "bg-blue-50/70 border-t-2 border-[#003580]"
                                : ""
                            }`}
                          >
                            <td
                              className="py-3 px-2.5 text-center"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <input
                                type="checkbox"
                                className="rounded accent-[#003580]"
                              />
                            </td>
                            <td className="py-3 px-2 font-black text-[#003580] whitespace-nowrap">
                              {unit.name}
                            </td>
                            <td className="py-3 px-2.5 font-black text-gray-900 whitespace-nowrap">
                              {unit.room_type_name}
                            </td>
                            <td className="py-3 px-2 font-medium text-gray-700 whitespace-nowrap">
                              {unit.area || "Tầng 8"}
                            </td>
                            <td className="py-3 px-2.5 text-right font-bold text-gray-900 tabular-nums whitespace-nowrap">
                              {formatVND(unit.daily_price)}
                            </td>
                            <td className="py-3 px-2.5 text-right font-medium text-gray-800 tabular-nums whitespace-nowrap">
                              {formatVND(unit.overnight_price)}
                            </td>
                            <td className="py-3 px-2.5 text-right font-medium text-gray-800 tabular-nums whitespace-nowrap">
                              {formatVND(unit.hourly_price)}
                            </td>
                            <td className="py-3 px-2.5 text-center whitespace-nowrap">
                              <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                                Đang kinh doanh
                              </span>
                            </td>
                            <td className="py-3 px-2.5 text-center text-gray-700 font-bold whitespace-nowrap">
                              {unit.hotel_name || getHotelName(unit.hotel_id)}
                            </td>
                          </tr>

                          {/* MỞ RỘNG PHÒNG CON */}
                          {isExpanded && (
                            <tr className="bg-white border-b-2 border-[#003580]">
                              <td colSpan={9} className="p-5 space-y-4">
                                <div className="flex items-start justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-[#003580] flex items-center justify-center font-black">
                                      <Key size={18} />
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <h4 className="text-sm font-black text-gray-900">
                                          {unit.name}
                                        </h4>
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                                          Đang kinh doanh
                                        </span>
                                      </div>
                                      <div className="text-gray-500 text-[11px] mt-0.5 flex items-center gap-3 font-semibold">
                                        <span>🛏️ {unit.room_type_name}</span>
                                        <span>📍 {unit.area || "Tầng 8"}</span>
                                      </div>
                                    </div>
                                  </div>
                                  <span className="text-xs text-gray-700 font-bold">
                                    {unit.hotel_name ||
                                      getHotelName(unit.hotel_id)}
                                  </span>
                                </div>

                                <div className="grid grid-cols-2 gap-4 text-xs border-b border-gray-100 pb-4">
                                  <div>
                                    <span className="text-gray-500 block">
                                      Ngày bắt đầu sử dụng
                                    </span>
                                    <b className="text-gray-900">15/09/2026</b>
                                  </div>
                                  <div>
                                    <span className="text-gray-500 block">
                                      Phụ thu thêm giờ
                                    </span>
                                    <span className="text-gray-800 font-medium">
                                      Thừa hưởng từ hạng phòng
                                    </span>
                                  </div>
                                </div>

                                {/* BẢNG 3 MỨC GIÁ THỪA HƯỞNG */}
                                <div className="w-full max-w-lg text-xs space-y-1.5">
                                  <div className="flex justify-between border-b border-gray-200 pb-1.5 text-gray-500 font-bold">
                                    <span>Loại hình lưu trú</span>
                                    <span>Giá cơ sở</span>
                                  </div>
                                  <div className="flex justify-between py-1 border-b border-gray-100 font-semibold">
                                    <span className="text-gray-700">
                                      Ngày đêm
                                    </span>
                                    <span className="font-bold text-gray-900 tabular-nums">
                                      {formatVND(unit.daily_price)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between py-1 border-b border-gray-100 font-semibold">
                                    <span className="text-gray-700">
                                      Qua Đêm
                                    </span>
                                    <span className="font-bold text-gray-900 tabular-nums">
                                      {formatVND(unit.overnight_price)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between py-1 font-semibold">
                                    <span className="text-gray-700">Giờ</span>
                                    <span className="font-bold text-gray-900 tabular-nums">
                                      {formatVND(unit.hourly_price)}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                                  <div className="flex items-center gap-4 text-xs text-gray-500">
                                    <span>
                                      Ghi chú: {unit.note || "Chưa có"}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleOpenAddRoomUnitModal(unit)
                                    }
                                    className="px-4 py-1.5 bg-[#006ce4] hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5 transition"
                                  >
                                    <Edit2 size={13} /> <span>Chỉnh sửa</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL HẠNG PHÒNG */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-fadeIn font-sans">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl border border-gray-200 overflow-hidden text-xs text-gray-900 my-auto">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-white shrink-0">
              <h3 className="font-black text-base text-[#0a2540]">
                {editingRoom ? "Sửa hạng phòng" : "Thêm hạng phòng mới"}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="cursor-pointer text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex items-center gap-6 px-6 border-b border-gray-200 text-xs font-bold text-gray-500 bg-white shrink-0 select-none">
              <button
                type="button"
                onClick={() => setModalTab("info")}
                className={`py-3 transition relative cursor-pointer ${
                  modalTab === "info"
                    ? "text-[#006ce4] font-black"
                    : "hover:text-gray-900"
                }`}
              >
                Thông tin
                {modalTab === "info" && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#006ce4]" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setModalTab("images")}
                className={`py-3 transition relative cursor-pointer ${
                  modalTab === "images"
                    ? "text-[#006ce4] font-black"
                    : "hover:text-gray-900"
                }`}
              >
                Hình ảnh, mô tả
                {modalTab === "images" && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#006ce4]" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setModalTab("amenities")}
                className={`py-3 transition relative cursor-pointer ${
                  modalTab === "amenities"
                    ? "text-[#006ce4] font-black"
                    : "hover:text-gray-900"
                }`}
              >
                Tiện ích
                {modalTab === "amenities" && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#006ce4]" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setModalTab("units")}
                className={`py-3 transition relative cursor-pointer ${
                  modalTab === "units"
                    ? "text-[#006ce4] font-black"
                    : "hover:text-gray-900"
                }`}
              >
                Danh sách phòng ({formRoomUnits.length})
                {modalTab === "units" && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#006ce4]" />
                )}
              </button>
            </div>

            <form
              onSubmit={handleSaveRoom}
              className="flex-1 overflow-y-auto p-6 space-y-6 text-xs bg-white"
            >
              {modalTab === "info" && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-4 items-start pt-1">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <label className="w-28 text-gray-700 font-bold">
                          Chi nhánh
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
                          placeholder="VD: P001"
                          className="flex-1 py-1.5 border-b border-gray-300 outline-none text-gray-900 bg-transparent font-mono"
                        />
                      </div>

                      <div className="flex items-center gap-3">
                        <label className="w-28 text-gray-700 font-bold">
                          Tên hạng phòng
                        </label>
                        <input
                          required
                          value={formData.name}
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                          placeholder="VD: PHÒNG KHÁNH HOÀ"
                          className="flex-1 py-1.5 border-b border-[#003580] outline-none text-gray-900 font-bold bg-transparent"
                        />
                      </div>

                      {/* TRƯỜNG SỐ LƯỢNG PHÒNG VẬT LÝ */}
                      <div className="flex items-center gap-3">
                        <label className="w-28 text-gray-700 font-bold">
                          Số lượng phòng
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="200"
                          value={formData.amount}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              amount: Math.max(1, Number(e.target.value) || 1),
                            })
                          }
                          className="w-24 py-1.5 border-b border-gray-300 outline-none text-gray-900 font-bold bg-transparent text-center"
                        />
                      </div>
                    </div>

                    {/* 🌟 3 MỨC GIÁ CHUẨN (MÀU CHỮ ĐỒNG BỘ text-gray-900) */}
                    <div className="space-y-3.5">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-700 font-bold">
                          Giá ngày đêm
                        </span>
                        <input
                          required
                          type="text"
                          inputMode="numeric"
                          value={formatNumberWithDots(formData.base_price)}
                          onChange={(e) => {
                            const val = parseDotsToNumber(e.target.value);
                            setFormData((prev) => ({
                              ...prev,
                              base_price: val,
                              overnight_price: prev.overnight_price || val,
                              hourly_price:
                                prev.hourly_price ||
                                (val ? Math.round(Number(val) * 0.25) : ""),
                            }));
                          }}
                          placeholder="200.000"
                          className="w-28 text-right py-1 border-b border-[#003580] outline-none text-gray-900 font-bold bg-transparent"
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
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              overnight_price: parseDotsToNumber(
                                e.target.value,
                              ),
                            })
                          }
                          placeholder="100.000"
                          className="w-28 text-right py-1 border-b border-gray-300 outline-none focus:border-[#003580] text-gray-900 font-bold bg-transparent"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-gray-700 font-medium">
                          Giá giờ
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={formatNumberWithDots(formData.hourly_price)}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              hourly_price: parseDotsToNumber(e.target.value),
                            })
                          }
                          placeholder="100.000"
                          className="w-28 text-right py-1 border-b border-gray-300 outline-none focus:border-[#003580] text-gray-900 font-bold bg-transparent"
                        />
                      </div>
                    </div>
                  </div>

                  {/* SỨC CHỨA PHÒNG */}
                  <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white">
                    <div className="bg-gray-50 px-4 py-2 font-black uppercase tracking-wider text-gray-800 text-xs border-b border-gray-200">
                      Sức chứa phòng
                    </div>
                    <div className="p-4 space-y-3 text-xs">
                      <div className="flex items-center gap-6">
                        <span className="w-24 font-bold text-gray-700">
                          Tiêu chuẩn:
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
                        <span className="w-24 font-bold text-gray-700">
                          Tối đa:
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

                  {/* PHỤ THU THÊM GIỜ */}
                  <div className="border border-gray-200 rounded-2xl p-4 sm:p-5 bg-white shadow-2xs space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h4 className="text-sm font-black text-gray-900 tracking-tight">
                          Phụ thu thêm giờ
                        </h4>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          Tự động tính phụ thu khi khách nhận sớm hoặc trả muộn
                          so với giờ quy định
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            auto_surcharge: !prev.auto_surcharge,
                          }))
                        }
                        className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors shrink-0 ${
                          formData.auto_surcharge
                            ? "bg-[#006ce4]"
                            : "bg-gray-300"
                        }`}
                      >
                        <div
                          className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                            formData.auto_surcharge
                              ? "translate-x-5"
                              : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>

                    {formData.auto_surcharge && (
                      <div className="space-y-4 pt-1 animate-fadeIn">
                        <div>
                          <label className="text-gray-700 font-bold block mb-1 text-[11px]">
                            Cách tính phụ thu
                          </label>
                          <select
                            value={formData.surcharge_type}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                surcharge_type: e.target.value,
                              })
                            }
                            className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 outline-none focus:border-[#003580] cursor-pointer"
                          >
                            <option value="tiered">
                              Tính phụ thu theo bậc thang (% giá phòng)
                            </option>
                            <option value="hourly">
                              Tính phụ thu cho mỗi giờ (cố định đ/giờ)
                            </option>
                          </select>
                        </div>

                        {formData.surcharge_type === "tiered" ? (
                          <div className="space-y-4">
                            {/* 1. NHẬN SỚM */}
                            <div className="p-3.5 bg-gray-50/70 border border-gray-200 rounded-2xl space-y-2.5">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-gray-800 text-xs flex items-center gap-1.5">
                                  <span>1.</span> <span>Nhận sớm</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={handleAddEarlyTier}
                                  className="text-[11px] font-bold text-[#006ce4] hover:underline cursor-pointer flex items-center gap-1"
                                >
                                  <Plus size={13} /> <span>Thêm giờ</span>
                                </button>
                              </div>

                              <div className="space-y-2">
                                {(formData.early_surcharge_tiers || []).map(
                                  (tier, idx) => (
                                    <div
                                      key={idx}
                                      className="flex items-center gap-2 bg-white p-2 border border-gray-200 rounded-xl"
                                    >
                                      <span className="text-gray-500 shrink-0">
                                        Từ
                                      </span>
                                      <input
                                        type="number"
                                        min="1"
                                        value={tier.hours}
                                        onChange={(e) =>
                                          handleUpdateEarlyTier(
                                            idx,
                                            "hours",
                                            e.target.value,
                                          )
                                        }
                                        className="w-12 text-center p-1 border border-gray-300 rounded-lg font-bold text-gray-900 outline-none"
                                      />
                                      <span className="text-gray-500 shrink-0">
                                        giờ
                                      </span>
                                      <span className="text-gray-300">|</span>
                                      <span className="text-gray-500 shrink-0">
                                        Phụ thu
                                      </span>
                                      <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={tier.percent}
                                        onChange={(e) =>
                                          handleUpdateEarlyTier(
                                            idx,
                                            "percent",
                                            e.target.value,
                                          )
                                        }
                                        className="w-14 text-center p-1 border border-gray-300 rounded-lg font-black text-[#003580] outline-none"
                                      />
                                      <span className="font-bold text-gray-700 shrink-0">
                                        %
                                      </span>

                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleRemoveEarlyTier(idx)
                                        }
                                        className="p-1 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 ml-auto cursor-pointer"
                                        title="Xóa nấc này"
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    </div>
                                  ),
                                )}

                                {(formData.early_surcharge_tiers || [])
                                  .length === 0 && (
                                  <div className="text-[11px] text-gray-400 italic">
                                    Chưa có nấc nhận sớm. Bấm "+ Thêm giờ" để
                                    tạo.
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* 2. TRẢ MUỘN */}
                            <div className="p-3.5 bg-gray-50/70 border border-gray-200 rounded-2xl space-y-2.5">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-gray-800 text-xs flex items-center gap-1.5">
                                  <span>2.</span> <span>Trả muộn</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={handleAddLateTier}
                                  className="text-[11px] font-bold text-[#006ce4] hover:underline cursor-pointer flex items-center gap-1"
                                >
                                  <Plus size={13} /> <span>Thêm giờ</span>
                                </button>
                              </div>

                              <div className="space-y-2">
                                {(formData.late_surcharge_tiers || []).map(
                                  (tier, idx) => (
                                    <div
                                      key={idx}
                                      className="flex items-center gap-2 bg-white p-2 border border-gray-200 rounded-xl"
                                    >
                                      <span className="text-gray-500 shrink-0">
                                        Từ
                                      </span>
                                      <input
                                        type="number"
                                        min="1"
                                        value={tier.hours}
                                        onChange={(e) =>
                                          handleUpdateLateTier(
                                            idx,
                                            "hours",
                                            e.target.value,
                                          )
                                        }
                                        className="w-12 text-center p-1 border border-gray-300 rounded-lg font-bold text-gray-900 outline-none"
                                      />
                                      <span className="text-gray-500 shrink-0">
                                        giờ
                                      </span>
                                      <span className="text-gray-300">|</span>
                                      <span className="text-gray-500 shrink-0">
                                        Phụ thu
                                      </span>
                                      <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={tier.percent}
                                        onChange={(e) =>
                                          handleUpdateLateTier(
                                            idx,
                                            "percent",
                                            e.target.value,
                                          )
                                        }
                                        className="w-14 text-center p-1 border border-gray-300 rounded-lg font-black text-[#003580] outline-none"
                                      />
                                      <span className="font-bold text-gray-700 shrink-0">
                                        %
                                      </span>

                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleRemoveLateTier(idx)
                                        }
                                        className="p-1 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 ml-auto cursor-pointer"
                                        title="Xóa nấc này"
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    </div>
                                  ),
                                )}

                                {(formData.late_surcharge_tiers || [])
                                  .length === 0 && (
                                  <div className="text-[11px] text-gray-400 italic">
                                    Chưa có nấc trả muộn. Bấm "+ Thêm giờ" để
                                    tạo.
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="p-3 bg-gray-50/70 border border-gray-200 rounded-xl flex items-center justify-between gap-4">
                              <span className="font-bold text-gray-800 text-xs">
                                1. Nhận sớm
                              </span>
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={formatNumberWithDots(
                                    formData.early_checkin_fee,
                                  )}
                                  onChange={(e) =>
                                    setFormData({
                                      ...formData,
                                      early_checkin_fee: parseDotsToNumber(
                                        e.target.value,
                                      ),
                                    })
                                  }
                                  placeholder="0"
                                  className="w-24 p-1.5 bg-white border border-gray-300 rounded-lg text-right font-black text-gray-900 outline-none tabular-nums"
                                />
                                <span className="text-gray-600 font-medium">
                                  mỗi giờ
                                </span>
                              </div>
                            </div>

                            <div className="p-3 bg-gray-50/70 border border-gray-200 rounded-xl flex items-center justify-between gap-4">
                              <span className="font-bold text-gray-800 text-xs">
                                2. Trả muộn
                              </span>
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={formatNumberWithDots(
                                    formData.late_checkout_fee,
                                  )}
                                  onChange={(e) =>
                                    setFormData({
                                      ...formData,
                                      late_checkout_fee: parseDotsToNumber(
                                        e.target.value,
                                      ),
                                    })
                                  }
                                  placeholder="0"
                                  className="w-24 p-1.5 bg-white border border-gray-300 rounded-lg text-right font-black text-gray-900 outline-none tabular-nums"
                                />
                                <span className="text-gray-600 font-medium">
                                  mỗi giờ
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        <label className="flex items-center gap-2 pt-1 cursor-pointer select-none text-gray-700 font-medium text-xs">
                          <input
                            type="checkbox"
                            checked={formData.apply_to_all_rooms}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                apply_to_all_rooms: e.target.checked,
                              })
                            }
                            className="rounded accent-[#006ce4] w-4 h-4 cursor-pointer"
                          />
                          <span>
                            Áp dụng mức phụ thu cho các hạng phòng khác
                          </span>
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: HÌNH ẢNH & MÔ TẢ */}
              {modalTab === "images" && (
                <div className="space-y-4">
                  <input
                    id="room-image-upload-input"
                    type="file"
                    ref={fileInputRef}
                    multiple
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  <div>
                    <label className="block text-gray-700 font-bold mb-2">
                      Ảnh đại diện & thư viện ảnh:
                    </label>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => scrollImages("left", imageScrollRef)}
                        className="p-1 text-gray-300 hover:text-gray-600 cursor-pointer shrink-0"
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
                            className="relative group w-20 h-16 rounded-xl border border-gray-200 overflow-hidden shrink-0 bg-gray-50"
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
                                  images: prev.images.filter(
                                    (_, i) => i !== idx,
                                  ),
                                }));
                              }}
                              className="absolute top-0.5 right-0.5 bg-rose-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition cursor-pointer"
                            >
                              <X size={10} strokeWidth={3} />
                            </button>
                          </div>
                        ))}

                        <label
                          htmlFor="room-image-upload-input"
                          className="w-20 h-16 rounded-xl border border-dashed border-gray-300 bg-white hover:border-[#003580] cursor-pointer flex items-center justify-center shrink-0 transition"
                          title="Tải ảnh từ máy tính"
                        >
                          <MountainPlaceholderIcon />
                        </label>
                      </div>

                      <button
                        type="button"
                        onClick={() => scrollImages("right", imageScrollRef)}
                        className="p-1 text-gray-300 hover:text-gray-600 cursor-pointer shrink-0"
                      >
                        <ChevronRight size={20} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2">
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

                  <div>
                    <label className="block text-gray-700 font-bold mb-1">
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
                      placeholder="Nhập mô tả về hạng phòng..."
                      className="w-full p-2.5 border border-gray-200 rounded-xl outline-none focus:border-[#003580]"
                    />
                  </div>
                </div>
              )}

              {/* TAB 3: TIỆN ÍCH */}
              {modalTab === "amenities" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-gray-800 flex items-center gap-1">
                      <Sparkles size={14} className="text-amber-500" /> Chọn
                      tiện ích có sẵn:
                    </label>

                    {Array.isArray(formData.amenities) &&
                      formData.amenities.length > 0 && (
                        <button
                          type="button"
                          onClick={() =>
                            setFormData((prev) => ({ ...prev, amenities: [] }))
                          }
                          className="text-[11px] font-bold text-rose-600 hover:text-rose-800 bg-rose-50 px-2.5 py-0.5 rounded-lg cursor-pointer transition flex items-center gap-1"
                        >
                          <Trash2 size={12} />{" "}
                          <span>Xóa tất cả ({formData.amenities.length})</span>
                        </button>
                      )}
                  </div>

                  {Array.isArray(formData.amenities) &&
                    formData.amenities.length > 0 && (
                      <div className="p-2.5 bg-blue-50/50 border border-blue-100 rounded-2xl flex flex-wrap gap-1.5">
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
                    )}

                  <div className="grid grid-cols-2 gap-2 bg-gray-50 p-3 rounded-2xl border border-gray-200 max-h-56 overflow-y-auto">
                    {ROOM_AMENITIES_LIST.map((item) => {
                      const currentAmenities = Array.isArray(formData.amenities)
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
                                  ? list.filter((a) => !isSameAmenity(a, item))
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
              )}

              {/* TAB 4: DANH SÁCH PHÒNG */}
              {modalTab === "units" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex items-center border border-gray-300 rounded-2xl px-3.5 py-2 bg-white focus-within:border-[#006ce4] shadow-2xs">
                      <Search
                        size={15}
                        className="text-gray-400 mr-2 shrink-0"
                      />
                      <input
                        type="text"
                        value={newRoomUnitInput}
                        onChange={(e) => setNewRoomUnitInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddUnitToForm();
                          }
                        }}
                        placeholder="Thêm phòng vào hạng phòng (VD: EXE801, 101...)"
                        className="w-full text-xs font-semibold outline-none bg-transparent"
                      />
                    </div>
                    <select
                      value={newRoomUnitArea}
                      onChange={(e) => setNewRoomUnitArea(e.target.value)}
                      className="border border-gray-300 rounded-2xl px-3 py-2 text-xs font-bold text-gray-700 bg-white outline-none cursor-pointer"
                    >
                      {areasList.map((a, i) => (
                        <option key={i} value={a}>
                          {a}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleAddUnitToForm}
                      className="px-4 py-2 bg-[#006ce4] hover:bg-blue-700 text-white font-bold rounded-2xl text-xs shadow-2xs cursor-pointer transition active:scale-95 shrink-0"
                    >
                      + Thêm
                    </button>
                  </div>

                  <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-gray-100/70 text-gray-600 font-bold border-b border-gray-200">
                          <th className="py-3 px-4 w-12 text-center">STT</th>
                          <th className="py-3 px-4 font-bold">Tên phòng</th>
                          <th className="py-3 px-4 font-bold">Khu vực</th>
                          <th className="py-3 px-4 font-bold">Trạng thái</th>
                          <th className="py-3 px-4 w-12 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {formRoomUnits.length === 0 ? (
                          <tr>
                            <td
                              colSpan={5}
                              className="py-12 text-center text-gray-400"
                            >
                              Chưa có phòng nào trong hạng phòng này. Nhập tên
                              phòng ở trên để thêm vào!
                            </td>
                          </tr>
                        ) : (
                          formRoomUnits.map((unit, idx) => (
                            <tr
                              key={idx}
                              className="hover:bg-gray-50/80 transition"
                            >
                              <td className="py-3.5 px-4 text-center font-bold text-gray-500">
                                {idx + 1}
                              </td>
                              <td className="py-3.5 px-4 font-bold text-gray-900">
                                {unit.name}
                              </td>
                              <td className="py-3.5 px-4 font-medium text-gray-700">
                                {unit.area || "Tầng 8"}
                              </td>
                              <td className="py-3.5 px-4">
                                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  Đang kinh doanh
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveUnitFromForm(idx)}
                                  className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition border border-gray-200 cursor-pointer"
                                  title="Xóa phòng này"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="text-[11px] text-gray-500 font-medium">
                    💡 Hạng phòng hiện đang có <b>{formData.amount} phòng</b>{" "}
                    (trong đó {formRoomUnits.length} phòng đã được gán tên định
                    danh cụ thể).
                  </div>
                </div>
              )}
            </form>

            <div className="px-6 py-4 border-t border-gray-100 bg-white flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-2.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs cursor-pointer transition"
              >
                Bỏ qua
              </button>
              <button
                type="button"
                onClick={handleSaveRoom}
                className="px-8 py-2.5 rounded-full bg-[#006ce4] hover:bg-blue-600 text-white font-bold text-xs shadow-md cursor-pointer transition active:scale-95"
              >
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PHÒNG CỤ THỂ */}
      {isRoomUnitModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-fadeIn font-sans">
          <div className="bg-white rounded-3xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl border border-gray-200 overflow-hidden text-xs text-gray-900 my-auto">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-white shrink-0">
              <h3 className="font-black text-base text-[#0a2540]">
                {editingRoomUnit
                  ? `Chỉnh Sửa Phòng: ${editingRoomUnit.name}`
                  : "Thêm Phòng Cụ Thể"}
              </h3>
              <button
                type="button"
                onClick={() => setIsRoomUnitModalOpen(false)}
                className="cursor-pointer text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={handleSaveRoomUnit}
              className="flex-1 overflow-y-auto p-6 space-y-4 text-xs bg-white"
            >
              <div>
                <label className="font-bold text-gray-700 block mb-1">
                  Tên phòng (VD: EXE804, 101...){" "}
                  <b className="text-rose-500">*</b>
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
                  className="w-full p-2.5 border border-gray-200 rounded-xl font-bold text-gray-900 outline-none focus:border-[#003580]"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">
                  Khu vực
                </label>
                <div className="flex items-center gap-1.5">
                  <select
                    value={roomUnitFormData.area}
                    onChange={(e) =>
                      setRoomUnitFormData({
                        ...roomUnitFormData,
                        area: e.target.value,
                      })
                    }
                    className="flex-1 p-2.5 border border-gray-200 rounded-xl font-bold text-gray-900 outline-none"
                  >
                    {areasList.map((a, i) => (
                      <option key={i} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      const name = window.prompt("Nhập tên khu vực mới:");
                      if (name?.trim())
                        setAreasList((prev) => [...prev, name.trim()]);
                    }}
                    className="p-2 border border-gray-200 rounded-xl font-bold text-[#006ce4] hover:bg-blue-50"
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">
                  Thuộc Hạng phòng <b className="text-rose-500">*</b>
                </label>
                <select
                  required
                  value={roomUnitFormData.room_id}
                  onChange={(e) =>
                    setRoomUnitFormData({
                      ...roomUnitFormData,
                      room_id: e.target.value,
                    })
                  }
                  className="w-full p-2.5 border border-gray-200 rounded-xl font-bold text-[#003580] outline-none"
                >
                  <option value="">-- Chọn hạng phòng --</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({formatVND(r.base_price)} đ/ngày)
                    </option>
                  ))}
                </select>
              </div>

              {/* BẢNG GIÁ THỪA HƯỞNG (3 LOẠI GIÁ CHUẨN, MÀU CHỮ ĐỒNG BỘ text-gray-900) */}
              <div className="space-y-2.5 bg-gray-50/80 p-4 rounded-2xl border border-gray-200">
                <span className="font-bold text-gray-600 text-xs block uppercase">
                  Bảng giá thừa hưởng từ "
                  {selectedParentRoom?.name || "Hạng phòng"}"
                </span>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-600 font-medium">
                    Giá ngày đêm:
                  </span>
                  <b className="text-gray-900 tabular-nums font-bold text-sm">
                    {formatVND(selectedParentRoom?.base_price || 0)} đ
                  </b>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-600 font-medium">
                    Giá qua đêm:
                  </span>
                  <b className="text-gray-900 tabular-nums font-bold">
                    {formatVND(selectedParentRoom?.overnight_price || 0)} đ
                  </b>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-600 font-medium">Giá giờ:</span>
                  <b className="text-gray-900 tabular-nums font-bold">
                    {formatVND(selectedParentRoom?.hourly_price || 0)} đ
                  </b>
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">
                  Ghi chú
                </label>
                <input
                  value={roomUnitFormData.note}
                  onChange={(e) =>
                    setRoomUnitFormData({
                      ...roomUnitFormData,
                      note: e.target.value,
                    })
                  }
                  placeholder="Nhập ghi chú vị trí hoặc tình trạng..."
                  className="w-full p-2.5 border border-gray-200 rounded-xl outline-none focus:border-[#003580]"
                />
              </div>
            </form>

            <div className="px-6 py-4 border-t border-gray-100 bg-white flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsRoomUnitModalOpen(false)}
                className="px-6 py-2.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs cursor-pointer transition"
              >
                Bỏ qua
              </button>
              <button
                type="button"
                onClick={handleSaveRoomUnit}
                className="px-8 py-2.5 rounded-full bg-[#006ce4] hover:bg-blue-600 text-white font-bold text-xs shadow-md cursor-pointer transition active:scale-95"
              >
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
