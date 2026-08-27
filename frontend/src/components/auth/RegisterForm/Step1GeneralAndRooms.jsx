import React, { useState } from "react";
import {
  Building2,
  MapPin,
  Plus,
  Trash2,
  Bed,
  Users,
  DollarSign,
  Maximize,
  Layers,
  Compass,
  Phone,
  Mail,
  Globe,
} from "lucide-react";

// DỮ LIỆU TỈNH / THÀNH PHỐ THẬT (Kèm tọa độ GPS và Quận/Huyện)
const PROVINCES_DATA = [
  {
    name: "Hồ Chí Minh",
    districts: [
      "Quận 1",
      "Quận 3",
      "Quận 4",
      "Quận 7",
      "Bình Thạnh",
      "Tân Bình",
      "TP. Thủ Đức",
    ],
    coords: { lat: 10.7769, lng: 106.7009 },
  },
  {
    name: "Hà Nội",
    districts: [
      "Hoàn Kiếm",
      "Ba Đình",
      "Tây Hồ",
      "Đống Đa",
      "Cầu Giấy",
      "Hai Bà Trưng",
      "Nam Từ Liêm",
    ],
    coords: { lat: 21.0285, lng: 105.8542 },
  },
  {
    name: "Đà Nẵng",
    districts: [
      "Hải Châu",
      "Sơn Trà",
      "Ngũ Hành Sơn",
      "Thanh Khê",
      "Liên Chiểu",
    ],
    coords: { lat: 16.0544, lng: 108.2022 },
  },
  {
    name: "Lâm Đồng",
    districts: ["TP. Đà Lạt", "TP. Bảo Lộc", "Đức Trọng", "Lạc Dương"],
    coords: { lat: 11.9404, lng: 108.4583 },
  },
  {
    name: "Khánh Hòa",
    districts: ["TP. Nha Trang", "TP. Cam Ranh", "Thị xã Ninh Hòa"],
    coords: { lat: 12.2388, lng: 109.1967 },
  },
  {
    name: "Kiên Giang",
    districts: ["TP. Phú Quốc", "TP. Rạch Giá", "TP. Hà Tiên"],
    coords: { lat: 10.2899, lng: 103.984 },
  },
  {
    name: "Quảng Ninh",
    districts: ["TP. Hạ Long", "TP. Cẩm Phả", "TP. Uông Bí", "Huyện Vân Đồn"],
    coords: { lat: 20.9505, lng: 107.0734 },
  },
  {
    name: "Bà Rịa - Vũng Tàu",
    districts: [
      "TP. Vũng Tàu",
      "TP. Bà Rịa",
      "Thị xã Phú Mỹ",
      "Huyện Xuyên Mộc",
    ],
    coords: { lat: 10.346, lng: 107.0843 },
  },
];

// DANH SÁCH TIỆN NGHI PHÒNG NGHỈ THẬT
const ROOM_AMENITIES_LIST = [
  { id: "air_conditioner", label: "Điều hòa máy lạnh" },
  { id: "tv_smart", label: "Smart TV màn hình phẳng" },
  { id: "minibar", label: "Tủ lạnh Minibar" },
  { id: "hot_water_shower", label: "Bình tắm nóng lạnh" },
  { id: "hairdryer", label: "Máy sấy tóc" },
  { id: "wifi", label: "Wi-Fi tốc độ cao" },
  { id: "balcony", label: "Ban công view thoáng" },
  { id: "kettle", label: "Ấm đun nước siêu tốc" },
];

export const Step1GeneralAndRooms = ({
  data = {},
  onChange = () => {},
  errors = {},
}) => {
  const rooms = data?.rooms || [];

  const [selectedProvinceObj, setSelectedProvinceObj] = useState(
    PROVINCES_DATA.find((p) => p.name === data?.province) || PROVINCES_DATA[0],
  );
  const [editingRoomId, setEditingRoomId] = useState(rooms[0]?.id || null);

  const handleProvinceChange = (e) => {
    const provinceName = e.target.value;
    const found = PROVINCES_DATA.find((p) => p.name === provinceName);
    if (found) {
      setSelectedProvinceObj(found);
      onChange({
        province: provinceName,
        district: found.districts[0] || "",
        latitude: found.coords.lat,
        longitude: found.coords.lng,
      });
    }
  };

  const handleAddRoom = () => {
    const newRoom = {
      id: `room-${Date.now()}`,
      roomName: `Phòng Tiêu Chuẩn ${rooms.length + 1}`,
      bedType: "1 Giường đôi lớn (King/Queen Size)",
      roomSize: 28,
      maxAdults: 2,
      maxChildren: 1,
      totalRooms: 5,
      weekdayPrice: 600000,
      weekendPrice: 750000,
      hasPrivateBathroom: true,
      hasBalcony: false,
      hasWindow: true,
      roomAmenities: [
        "air_conditioner",
        "tv_smart",
        "minibar",
        "hot_water_shower",
        "hairdryer",
      ],
    };
    const updated = [...rooms, newRoom];
    onChange({ rooms: updated });
    setEditingRoomId(newRoom.id);
  };

  const handleUpdateRoom = (roomId, updates) => {
    const updated = rooms.map((r) =>
      r.id === roomId ? { ...r, ...updates } : r,
    );
    onChange({ rooms: updated });
  };

  const handleDeleteRoom = (roomId) => {
    if (rooms.length <= 1) {
      alert("Chỗ nghỉ cần tối thiểu 1 loại phòng để sẵn sàng niêm yết.");
      return;
    }
    const updated = rooms.filter((r) => r.id !== roomId);
    onChange({ rooms: updated });
    if (editingRoomId === roomId) {
      setEditingRoomId(updated[0]?.id || null);
    }
  };

  const toggleRoomAmenity = (roomId, amenityId) => {
    const room = rooms.find((r) => r.id === roomId);
    if (!room) return;
    const exists = room.roomAmenities?.includes(amenityId);
    const updatedAmenities = exists
      ? room.roomAmenities.filter((id) => id !== amenityId)
      : [...(room.roomAmenities || []), amenityId];
    handleUpdateRoom(roomId, { roomAmenities: updatedAmenities });
  };

  const formatVND = (amount) => {
    return new Intl.NumberFormat("vi-VN").format(amount || 0) + " ₫";
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* SECTION 1: THÔNG TIN CƠ BẢN */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                1. Thông tin Định danh Cơ sở lưu trú
              </h2>
              <p className="text-xs text-slate-500">
                Tên hiển thị trên cổng tìm kiếm của du khách trong nước & quốc
                tế
              </p>
            </div>
          </div>
          <span className="text-xs font-bold px-3 py-1 bg-slate-100 text-slate-600 rounded-full">
            Bắt buộc
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
              Tên cơ sở lưu trú (Tiếng Việt) *
            </label>
            <input
              type="text"
              value={data?.hotelNameVi || ""}
              onChange={(e) => onChange({ hotelNameVi: e.target.value })}
              placeholder="VD: Khách sạn Biển Đông Luxury"
              className={`w-full h-11 px-4 text-sm rounded-xl border ${
                errors?.hotelName
                  ? "border-red-500 bg-red-50/30"
                  : "border-slate-200"
              } text-slate-900 bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition`}
            />
            {errors?.hotelName && (
              <p className="text-xs text-red-500 mt-1">{errors.hotelName}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
              Tên cơ sở lưu trú (Tiếng Anh quốc tế)
            </label>
            <input
              type="text"
              value={data?.hotelNameEn || ""}
              onChange={(e) => onChange({ hotelNameEn: e.target.value })}
              placeholder="VD: East Sea Luxury Hotel"
              className="w-full h-11 px-4 text-sm rounded-xl border border-slate-200 text-slate-900 bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
              Loại hình lưu trú *
            </label>
            <select
              value={data?.hotelType || "hotel"}
              onChange={(e) => onChange({ hotelType: e.target.value })}
              className="w-full h-11 px-4 text-sm rounded-xl border border-slate-200 text-slate-900 bg-white focus:border-blue-600 outline-none transition"
            >
              <option value="hotel">Khách sạn tiêu chuẩn (Hotel)</option>
              <option value="resort">Khu nghỉ dưỡng (Resort)</option>
              <option value="homestay">Homestay / Nhà dân</option>
              <option value="apartment">
                Căn hộ dịch vụ (Serviced Apartment)
              </option>
              <option value="villa">Biệt thự nghỉ dưỡng (Villa)</option>
              <option value="hostel">Nhà nghỉ / Hostel</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
              Xếp hạng sao (Dự kiến hoặc Chứng nhận)
            </label>
            <select
              value={data?.starRating ?? 0}
              onChange={(e) => onChange({ starRating: Number(e.target.value) })}
              className="w-full h-11 px-4 text-sm rounded-xl border border-slate-200 text-slate-900 bg-white focus:border-blue-600 outline-none transition font-medium"
            >
              <option value={0}>Không xếp hạng / Nhà dân ấm cúng</option>
              <option value={1}>1 Sao ⭐</option>
              <option value={2}>2 Sao ⭐⭐</option>
              <option value={3}>3 Sao ⭐⭐⭐</option>
              <option value={4}>4 Sao ⭐⭐⭐⭐ (Cao cấp)</option>
              <option value={5}>5 Sao ⭐⭐⭐⭐⭐ (Sang trọng bậc nhất)</option>
            </select>
          </div>
        </div>

        {/* LIÊN HỆ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-blue-600" /> SĐT Lễ tân / Quản
              lý *
            </label>
            <input
              type="tel"
              value={data?.phoneContact || ""}
              onChange={(e) => onChange({ phoneContact: e.target.value })}
              placeholder="VD: 02838123456 hoặc 0905123456"
              className={`w-full h-11 px-4 text-sm rounded-xl border ${
                errors?.phoneContact
                  ? "border-red-500 bg-red-50/30"
                  : "border-slate-200"
              } text-slate-900 bg-white focus:border-blue-600 outline-none`}
            />
            {errors?.phoneContact && (
              <p className="text-xs text-red-500 mt-1">{errors.phoneContact}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-blue-600" /> Email nhận thông
              báo *
            </label>
            <input
              type="email"
              value={data?.emailContact || ""}
              onChange={(e) => onChange({ emailContact: e.target.value })}
              placeholder="reservation@hotel.com"
              className={`w-full h-11 px-4 text-sm rounded-xl border ${
                errors?.emailContact
                  ? "border-red-500 bg-red-50/30"
                  : "border-slate-200"
              } text-slate-900 bg-white focus:border-blue-600 outline-none`}
            />
            {errors?.emailContact && (
              <p className="text-xs text-red-500 mt-1">{errors.emailContact}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-slate-400" /> Website / Fanpage
            </label>
            <input
              type="url"
              value={data?.website || ""}
              onChange={(e) => onChange({ website: e.target.value })}
              placeholder="https://myhotel.vn"
              className="w-full h-11 px-4 text-sm rounded-xl border border-slate-200 text-slate-900 bg-white focus:border-blue-600 outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
            Mô tả ngắn gọn về chỗ nghỉ
          </label>
          <textarea
            rows={2}
            value={data?.description || ""}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="Khách sạn sở hữu hồ bơi vô cực view biển tuyệt đẹp, chỉ cách bãi tắm 2 phút đi bộ..."
            className="w-full p-4 text-sm rounded-xl border border-slate-200 text-slate-900 bg-white focus:border-blue-600 outline-none"
          />
        </div>
      </div>

      {/* SECTION 2: ĐỊA ĐIỂM & BẢN ĐỒ */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              2. Vị trí địa lý & Tọa độ Google Maps
            </h2>
            <p className="text-xs text-slate-500">
              Giúp khách hàng tìm thấy cơ sở lưu trú của bạn dễ dàng
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
              Tỉnh / Thành phố *
            </label>
            <select
              value={data?.province || selectedProvinceObj.name}
              onChange={handleProvinceChange}
              className="w-full h-11 px-4 text-sm rounded-xl border border-slate-200 text-slate-900 bg-white focus:border-blue-600 outline-none"
            >
              {PROVINCES_DATA.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
              Quận / Huyện *
            </label>
            <select
              value={data?.district || selectedProvinceObj.districts[0]}
              onChange={(e) => onChange({ district: e.target.value })}
              className="w-full h-11 px-4 text-sm rounded-xl border border-slate-200 text-slate-900 bg-white focus:border-blue-600 outline-none"
            >
              {selectedProvinceObj.districts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
              Phường / Xã
            </label>
            <input
              type="text"
              value={data?.ward || ""}
              onChange={(e) => onChange({ ward: e.target.value })}
              placeholder="VD: Phường Bến Nghé"
              className="w-full h-11 px-4 text-sm rounded-xl border border-slate-200 text-slate-900 bg-white focus:border-blue-600 outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
            Địa chỉ chi tiết (Số nhà, tên đường, tòa nhà) *
          </label>
          <input
            type="text"
            value={data?.streetAddress || ""}
            onChange={(e) => onChange({ streetAddress: e.target.value })}
            placeholder="VD: Số 123 Đường Lê Lợi, Bến Thành"
            className={`w-full h-11 px-4 text-sm rounded-xl border ${
              errors?.streetAddress
                ? "border-red-500 bg-red-50/30"
                : "border-slate-200"
            } text-slate-900 bg-white focus:border-blue-600 outline-none`}
          />
          {errors?.streetAddress && (
            <p className="text-xs text-red-500 mt-1">{errors.streetAddress}</p>
          )}
        </div>

        {/* GPS COORDINATES */}
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Compass className="w-5 h-5 text-blue-600 shrink-0" />
            <div>
              <p className="text-xs font-bold text-slate-800">
                Tọa độ GPS định vị bản đồ (Tự động gán theo khu vực)
              </p>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                Latitude: {Number(data?.latitude || 0).toFixed(4)} | Longitude:{" "}
                {Number(data?.longitude || 0).toFixed(4)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="0.0001"
              value={data?.latitude || 0}
              onChange={(e) =>
                onChange({ latitude: parseFloat(e.target.value) || 0 })
              }
              className="w-24 h-9 px-2.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-900"
              title="Vĩ độ (Lat)"
            />
            <input
              type="number"
              step="0.0001"
              value={data?.longitude || 0}
              onChange={(e) =>
                onChange({ longitude: parseFloat(e.target.value) || 0 })
              }
              className="w-24 h-9 px-2.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-900"
              title="Kinh độ (Lng)"
            />
            <button
              type="button"
              onClick={() => {
                if (navigator.geolocation) {
                  navigator.geolocation.getCurrentPosition((pos) => {
                    onChange({
                      latitude: pos.coords.latitude,
                      longitude: pos.coords.longitude,
                    });
                  });
                }
              }}
              className="h-9 px-4 bg-white border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 rounded-lg transition cursor-pointer"
            >
              Lấy vị trí GPS
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 3: THIẾT LẬP CÁC LOẠI PHÒNG (ROOM TYPES) */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                3. Danh mục Loại phòng & Bảng giá ban đầu
              </h2>
              <p className="text-xs text-slate-500">
                Cấu hình các hạng phòng (Deluxe, Superior, Suite...) và giá bán
                đêm
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleAddRoom}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-200 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Thêm loại phòng
          </button>
        </div>

        {errors?.rooms && (
          <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
            {errors.rooms}
          </div>
        )}

        {/* ROOM TABS */}
        <div className="flex flex-wrap gap-2 border-b border-slate-100 pb-3">
          {rooms.map((room, idx) => (
            <div key={room.id} className="flex items-center">
              <button
                type="button"
                onClick={() => setEditingRoomId(room.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                  editingRoomId === room.id
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <span>
                  Phòng {idx + 1}: {room.roomName || "Chưa đặt tên"}
                </span>
                <span className="opacity-80 font-normal">
                  ({formatVND(room.weekdayPrice)})
                </span>
              </button>
              {rooms.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleDeleteRoom(room.id)}
                  title="Xóa phòng này"
                  className="p-1.5 text-slate-400 hover:text-red-500 transition ml-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* ACTIVE ROOM EDITOR */}
        {rooms.map((room, idx) => {
          if (room.id !== editingRoomId) return null;

          return (
            <div
              key={room.id}
              className="bg-slate-50 rounded-2xl border border-slate-200/80 p-6 space-y-5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-widest text-blue-600 bg-blue-50 px-3 py-1 rounded-lg border border-blue-100">
                  Cấu hình Hạng phòng #{idx + 1}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  {room.totalRooms} phòng sẵn có trong kho
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="lg:col-span-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Tên hạng phòng *
                  </label>
                  <input
                    type="text"
                    value={room.roomName || ""}
                    onChange={(e) =>
                      handleUpdateRoom(room.id, { roomName: e.target.value })
                    }
                    placeholder="VD: Deluxe Double Sea View"
                    className="w-full h-11 px-4 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 focus:border-blue-600 outline-none"
                  />
                  {errors?.[`room_${idx}_name`] && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors[`room_${idx}_name`]}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                    <Bed className="w-3.5 h-3.5 text-blue-600" /> Loại giường
                    chính *
                  </label>
                  <select
                    value={room.bedType || "1 Giường đôi lớn (King/Queen Size)"}
                    onChange={(e) =>
                      handleUpdateRoom(room.id, { bedType: e.target.value })
                    }
                    className="w-full h-11 px-3 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:border-blue-600 outline-none font-medium"
                  >
                    <option value="1 Giường đôi lớn (King/Queen Size)">
                      1 Giường đôi lớn (King/Queen)
                    </option>
                    <option value="2 Giường đơn (Twin Bed)">
                      2 Giường đơn (Twin Bed)
                    </option>
                    <option value="1 Giường đơn (Single)">
                      1 Giường đơn nhỏ (Single)
                    </option>
                    <option value="1 Giường đôi + 1 Giường đơn (Family Triple)">
                      1 Giường đôi + 1 Giường đơn
                    </option>
                    <option value="2 Giường đôi lớn (Family Quad)">
                      2 Giường đôi (Phòng gia đình)
                    </option>
                    <option value="Giường tầng (Dorm Bunk Bed)">
                      Giường tầng (Bunk Bed)
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                    <Maximize className="w-3.5 h-3.5 text-slate-400" /> Diện
                    tích phòng (m²)
                  </label>
                  <input
                    type="number"
                    value={room.roomSize || 25}
                    onChange={(e) =>
                      handleUpdateRoom(room.id, {
                        roomSize: Number(e.target.value),
                      })
                    }
                    className="w-full h-11 px-4 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 focus:border-blue-600 outline-none"
                  />
                </div>
              </div>

              {/* SỨC CHỨA & GIÁ TIỀN */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-blue-600" /> Người lớn
                    tối đa
                  </label>
                  <select
                    value={room.maxAdults || 2}
                    onChange={(e) =>
                      handleUpdateRoom(room.id, {
                        maxAdults: Number(e.target.value),
                      })
                    }
                    className="w-full h-11 px-4 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 focus:border-blue-600 outline-none"
                  >
                    {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
                      <option key={n} value={n}>
                        {n} người lớn
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Trẻ em đi kèm
                  </label>
                  <select
                    value={room.maxChildren ?? 1}
                    onChange={(e) =>
                      handleUpdateRoom(room.id, {
                        maxChildren: Number(e.target.value),
                      })
                    }
                    className="w-full h-11 px-4 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 focus:border-blue-600 outline-none"
                  >
                    {[0, 1, 2, 3, 4].map((n) => (
                      <option key={n} value={n}>
                        {n} trẻ em
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-600" /> Giá
                    ngày thường (VND) *
                  </label>
                  <input
                    type="number"
                    step="10000"
                    value={room.weekdayPrice || 0}
                    onChange={(e) =>
                      handleUpdateRoom(room.id, {
                        weekdayPrice: Number(e.target.value),
                      })
                    }
                    placeholder="VD: 650000"
                    className="w-full h-11 px-4 text-sm font-bold text-emerald-600 rounded-xl border border-slate-200 bg-white focus:border-blue-600 outline-none"
                  />
                  <span className="text-[11px] font-semibold text-slate-500 mt-1 block">
                    = {formatVND(room.weekdayPrice)}
                  </span>
                  {errors?.[`room_${idx}_price`] && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors[`room_${idx}_price`]}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Tổng số phòng kho
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={room.totalRooms || 1}
                    onChange={(e) =>
                      handleUpdateRoom(room.id, {
                        totalRooms: Number(e.target.value),
                      })
                    }
                    className="w-full h-11 px-4 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 focus:border-blue-600 outline-none"
                  />
                </div>
              </div>

              {/* TIỆN NGHI TRONG PHÒNG */}
              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
                  Tiện nghi có sẵn bên trong hạng phòng:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {ROOM_AMENITIES_LIST.map((amenity) => {
                    const isChecked = room.roomAmenities?.includes(amenity.id);
                    return (
                      <label
                        key={amenity.id}
                        className={`px-3.5 py-2.5 rounded-xl text-xs font-medium cursor-pointer border flex items-center justify-between transition ${
                          isChecked
                            ? "bg-blue-50 border-blue-200 text-blue-900 font-bold"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <span className="truncate mr-1">{amenity.label}</span>
                        <input
                          type="checkbox"
                          checked={isChecked || false}
                          onChange={() =>
                            toggleRoomAmenity(room.id, amenity.id)
                          }
                          className="w-4 h-4 accent-blue-600 rounded"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Step1GeneralAndRooms;
