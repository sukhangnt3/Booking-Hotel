import React, { useState, useRef } from "react";
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
  Phone,
  Mail,
  UserPlus,
  Lock,
  Camera,
  Upload,
  CheckCircle2,
  FileText,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";

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
    name: "Kiên Giang",
    districts: ["TP. Phú Quốc", "TP. Rạch Giá", "TP. Hà Tiên"],
    coords: { lat: 10.2899, lng: 103.984 },
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
  const { user, isAuthenticated } = useAuthStore();
  const rooms = data?.rooms || [];
  const hotelCoverInputRef = useRef(null);
  const roomPhotoInputRef = useRef(null);

  const [selectedProvinceObj, setSelectedProvinceObj] = useState(
    PROVINCES_DATA.find((p) => p.name === data?.province) || PROVINCES_DATA[0],
  );
  const [editingRoomId, setEditingRoomId] = useState(rooms[0]?.id || null);

  const isExistingOwner = Boolean(isAuthenticated && user && user.email);

  const handleProvinceChange = (e) => {
    const provinceName = e.target.value;
    const found = PROVINCES_DATA.find((p) => p.name === provinceName);
    if (found) {
      setSelectedProvinceObj(found);
      onChange({
        province: provinceName,
        city: provinceName, // 👈 ĐỒNG BỘ CẢ 2 TRƯỜNG ĐỂ KHÔNG BỊ DÍNH HCM
        district: found.districts[0] || "",
        latitude: found.coords.lat,
        longitude: found.coords.lng,
      });
    }
  };

  const handleHotelCoverUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxWidth = 900;
        const scale = Math.min(maxWidth / img.width, 1);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const compressed = canvas.toDataURL("image/jpeg", 0.75);
        onChange({
          image: compressed,
          hotelMainImage: compressed,
          hotelImages: [
            {
              id: "img-main",
              url: compressed,
              preview: compressed,
              category: "exterior",
            },
            ...(data?.hotelImages || []).filter((i) => i.id !== "img-main"),
          ],
        });
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = null;
  };

  const handleRoomPhotoUpload = (e, roomId) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxWidth = 800;
        const scale = Math.min(maxWidth / img.width, 1);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const compressedRoomImg = canvas.toDataURL("image/jpeg", 0.75);
        handleUpdateRoom(roomId, { image: compressedRoomImg });
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = null;
  };

  const handleAddRoom = () => {
    const newRoom = {
      id: `room-${Date.now()}`,
      roomName: `Phòng Hạng ${rooms.length + 1}`,
      bedType: "1 Giường đôi lớn (King/Queen Size)",
      roomSize: 28,
      maxAdults: 2,
      maxChildren: 1,
      totalRooms: 5,
      weekdayPrice: 650000,
      weekendPrice: 800000,
      image: "",
      hasPrivateBathroom: true,
      hasBalcony: false,
      hasWindow: true,
      roomAmenities: [
        "air_conditioner",
        "tv_smart",
        "minibar",
        "hot_water_shower",
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
    <div className="space-y-8 animate-fadeIn font-sans text-slate-800">
      {/* ── 1. THIẾT LẬP TÀI KHOẢN ── */}
      {isExistingOwner ? (
        <div className="bg-blue-50/60 rounded-2xl p-6 border-2 border-blue-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 size={20} className="text-blue-600" />
              <h3 className="font-extrabold text-blue-950 text-sm">
                Đang Đăng Ký Thêm Cơ Sở Cho Đối Tác Hiện Tại
              </h3>
            </div>
            <span className="text-[10px] font-black uppercase bg-blue-200 text-blue-900 px-2.5 py-0.5 rounded-full">
              Tài khoản đã xác thực
            </span>
          </div>
          <p className="text-xs text-blue-800 leading-relaxed">
            Cơ sở mới sẽ tự động liên kết với tài khoản:{" "}
            <strong className="font-mono font-bold text-blue-950">
              {user?.email}
            </strong>{" "}
            (Chủ cơ sở: {user?.full_name || data?.ownerName}). Bạn không cần tạo
            mật khẩu mới!
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  1. Thiết Lập Tài Khoản Đối Tác Quản Trị
                </h2>
                <p className="text-xs text-slate-500">
                  Thông tin dùng để đăng nhập vào trang quản trị cơ sở lưu trú
                  (Owner Portal)
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                Họ và tên Chủ cơ sở / Người đại diện *
              </label>
              <input
                type="text"
                value={data?.ownerName || ""}
                onChange={(e) => onChange({ ownerName: e.target.value })}
                placeholder="VD: Nguyễn Văn An"
                className="w-full h-11 px-4 text-sm rounded-xl border border-slate-200 text-slate-900 bg-white focus:border-blue-600 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-blue-600" /> SĐT Đăng nhập /
                Zalo *
              </label>
              <input
                type="tel"
                value={data?.phoneContact || ""}
                onChange={(e) => onChange({ phoneContact: e.target.value })}
                placeholder="VD: 0905123456"
                className="w-full h-11 px-4 text-sm rounded-xl border border-slate-200 text-slate-900 bg-white focus:border-blue-600 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-blue-600" /> Email Đăng nhập
                quản trị *
              </label>
              <input
                type="email"
                value={data?.emailContact || ""}
                onChange={(e) => onChange({ emailContact: e.target.value })}
                placeholder="owner.hotel@gmail.com"
                className="w-full h-11 px-4 text-sm rounded-xl border border-slate-200 text-slate-900 bg-white focus:border-blue-600 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-blue-600" /> Mật khẩu *
                </label>
                <input
                  type="password"
                  value={data?.password || ""}
                  onChange={(e) => onChange({ password: e.target.value })}
                  placeholder="Tối thiểu 6 ký tự"
                  className="w-full h-11 px-4 text-sm rounded-xl border border-slate-200 text-slate-900 bg-white focus:border-blue-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                  Xác nhận lại *
                </label>
                <input
                  type="password"
                  value={data?.confirmPassword || ""}
                  onChange={(e) =>
                    onChange({ confirmPassword: e.target.value })
                  }
                  placeholder="Nhập lại mật khẩu"
                  className="w-full h-11 px-4 text-sm rounded-xl border border-slate-200 text-slate-900 bg-white focus:border-blue-600 outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 2. THÔNG TIN ĐỊNH DANH & ẢNH BÌA ── */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                2. Thông tin Chỗ Nghỉ & Ảnh Mặt Tiền Chính
              </h2>
              <p className="text-xs text-slate-500">
                Tên hiển thị và ảnh đại diện xuất hiện trên trang tìm kiếm của
                du khách
              </p>
            </div>
          </div>
        </div>

        {/* Ô TẢI ẢNH BÌA */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center gap-5">
          <input
            type="file"
            ref={hotelCoverInputRef}
            onChange={handleHotelCoverUpload}
            accept="image/*"
            className="hidden"
          />
          <div
            onClick={() => hotelCoverInputRef.current?.click()}
            className="w-full sm:w-48 h-32 rounded-xl bg-slate-200 border-2 border-dashed border-slate-300 hover:border-blue-500 overflow-hidden flex items-center justify-center cursor-pointer relative shadow-inner group shrink-0"
          >
            {data?.image || data?.hotelMainImage ? (
              <img
                src={data?.image || data?.hotelMainImage}
                alt="Hotel Cover"
                className="w-full h-full object-cover group-hover:opacity-90"
              />
            ) : (
              <div className="text-center p-2 text-slate-400">
                <Camera size={26} className="mx-auto mb-1 text-slate-500" />
                <span className="text-[11px] font-bold block">
                  Tải ảnh mặt tiền
                </span>
              </div>
            )}
          </div>

          <div className="flex-1 space-y-1.5 text-center sm:text-left">
            <h4 className="font-bold text-sm text-slate-900">
              Ảnh Bìa / Mặt Tiền Chính
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Bức ảnh này sẽ là ảnh đại diện lớn nhất hiển thị trên cổng tìm
              kiếm cho du khách.
            </p>
            <button
              type="button"
              onClick={() => hotelCoverInputRef.current?.click()}
              className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-lg shadow-sm transition flex items-center gap-1.5 mx-auto sm:mx-0 cursor-pointer"
            >
              <Upload size={13} />{" "}
              {data?.image ? "Đổi ảnh bìa khác" : "Chọn ảnh từ máy"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
              Tên cơ sở lưu trú (Tiếng Việt) *
            </label>
            <input
              type="text"
              value={data?.hotelNameVi || data?.hotelName || ""}
              onChange={(e) =>
                onChange({
                  hotelNameVi: e.target.value,
                  hotelName: e.target.value,
                })
              }
              placeholder="VD: Khách sạn Biển Đông Luxury Phú Quốc"
              className="w-full h-11 px-4 text-sm rounded-xl border border-slate-200 text-slate-900 bg-white focus:border-blue-600 outline-none font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
              Tên tiếng Anh (Tùy chọn)
            </label>
            <input
              type="text"
              value={data?.hotelNameEn || ""}
              onChange={(e) => onChange({ hotelNameEn: e.target.value })}
              placeholder="VD: East Sea Luxury Hotel"
              className="w-full h-11 px-4 text-sm rounded-xl border border-slate-200 text-slate-900 bg-white focus:border-blue-600 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
              Loại hình lưu trú *
            </label>
            <select
              value={data?.hotelType || "hotel"}
              onChange={(e) => onChange({ hotelType: e.target.value })}
              className="w-full h-11 px-4 text-sm rounded-xl border border-slate-200 text-slate-900 bg-white focus:border-blue-600 outline-none cursor-pointer font-semibold"
            >
              <option value="hotel">Khách sạn tiêu chuẩn (Hotel)</option>
              <option value="resort">Khu nghỉ dưỡng (Resort)</option>
              <option value="homestay">Homestay / Căn hộ</option>
              <option value="villa">Biệt thự nghỉ dưỡng (Villa)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
              Xếp hạng sao
            </label>
            <select
              value={data?.starRating ?? 5}
              onChange={(e) => onChange({ starRating: Number(e.target.value) })}
              className="w-full h-11 px-4 text-sm rounded-xl border border-slate-200 text-slate-900 bg-white focus:border-blue-600 outline-none font-semibold cursor-pointer"
            >
              <option value={1}>1 Sao ⭐</option>
              <option value={2}>2 Sao ⭐⭐</option>
              <option value={3}>3 Sao ⭐⭐⭐</option>
              <option value={4}>4 Sao ⭐⭐⭐⭐</option>
              <option value={5}>5 Sao ⭐⭐⭐⭐⭐ (Sang trọng cao cấp)</option>
            </select>
          </div>
        </div>

        {/* 🛑 Ô NHẬP BÀI VIẾT MÔ TẢ / GIỚI THIỆU CHỖ NGHỈ */}
        <div className="pt-2">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <FileText size={15} className="text-blue-600" /> Giới thiệu / Mô tả
            chi tiết chỗ nghỉ
          </label>
          <p className="text-[11px] text-slate-400 mb-2">
            Mô tả không gian, phong cách kiến trúc, vị trí thuận lợi và các tiện
            ích nổi bật của chỗ nghỉ để thu hút du khách.
          </p>
          <textarea
            rows={4}
            value={data?.description || ""}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="VD: Tọa lạc trên bãi biển tuyệt đẹp tại Phú Quốc, khách sạn mang phong cách Indochine hiện đại kết hợp tiện nghi cao cấp 5 sao. Cơ sở gồm 7 tầng với hồ bơi vô cực, nhà hàng fine-dining và dịch vụ đón tiễn sân bay chu đáo 24/7..."
            className="w-full border border-slate-300 rounded-xl p-3.5 text-xs font-medium focus:border-blue-600 outline-none leading-relaxed"
          />
        </div>
      </div>

      {/* ── 3. VỊ TRÍ ĐỊA LÝ ── */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              3. Vị Trí Địa Lý & Địa Chỉ Chỗ Nghỉ
            </h2>
            <p className="text-xs text-slate-500">
              Địa chỉ chính xác giúp định vị trên Google Maps và tìm kiếm theo
              khu vực
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
              Tỉnh / Thành phố *
            </label>
            <select
              value={data?.province || selectedProvinceObj.name}
              onChange={handleProvinceChange}
              className="w-full h-11 px-4 text-sm rounded-xl border border-slate-200 text-slate-900 bg-white focus:border-blue-600 outline-none cursor-pointer font-semibold"
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
              className="w-full h-11 px-4 text-sm rounded-xl border border-slate-200 text-slate-900 bg-white focus:border-blue-600 outline-none cursor-pointer font-semibold"
            >
              {selectedProvinceObj.districts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
            Địa chỉ chi tiết (Số nhà, tên đường, phường/xã) *
          </label>
          <input
            type="text"
            value={data?.streetAddress || data?.address || ""}
            onChange={(e) =>
              onChange({
                streetAddress: e.target.value,
                address: e.target.value,
              })
            }
            placeholder="VD: Số 456 Đường Trần Hưng Đạo, Phường Dương Đông"
            className="w-full h-11 px-4 text-sm rounded-xl border border-slate-200 text-slate-900 bg-white focus:border-blue-600 outline-none font-medium"
          />
        </div>
      </div>

      {/* ── 4. THIẾT LẬP CÁC LOẠI PHÒNG ── */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                4. Danh Mục Loại Phòng & Giá Bán
              </h2>
              <p className="text-xs text-slate-500">
                Thiết lập giá ngày thường, giá cuối tuần và ảnh thực tế cho từng
                loại phòng
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleAddRoom}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Thêm loại phòng
          </button>
        </div>

        {/* TABS CHỌN PHÒNG ĐANG SỬA */}
        <div className="flex flex-wrap gap-2 border-b border-slate-100 pb-3">
          {rooms.map((room, idx) => (
            <div key={room.id} className="flex items-center">
              <button
                type="button"
                onClick={() => setEditingRoomId(room.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                  editingRoomId === room.id
                    ? "bg-blue-600 text-white shadow-md"
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
              className="bg-slate-50 rounded-2xl border border-slate-200 p-6 space-y-5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-widest text-blue-600 bg-blue-50 px-3 py-1 rounded-lg border border-blue-100">
                  Cấu hình Hạng phòng #{idx + 1}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  {room.totalRooms} phòng trong kho
                </span>
              </div>

              {/* TẢI ẢNH PHÒNG */}
              <div className="p-4 bg-white rounded-xl border border-slate-200 flex items-center gap-4">
                <div
                  onClick={() => roomPhotoInputRef.current?.click()}
                  className="w-28 h-20 rounded-lg bg-slate-100 border-2 border-dashed border-slate-300 hover:border-blue-500 overflow-hidden flex items-center justify-center cursor-pointer relative group"
                >
                  {room.image ? (
                    <img
                      src={room.image}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Camera size={20} className="text-slate-400" />
                  )}
                </div>
                <div>
                  <input
                    type="file"
                    ref={roomPhotoInputRef}
                    onChange={(e) => handleRoomPhotoUpload(e, room.id)}
                    accept="image/*"
                    className="hidden"
                  />
                  <p className="text-xs font-bold text-slate-900">
                    Ảnh thực tế phòng này
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Chọn ảnh phòng ngủ sắc nét từ máy.
                  </p>
                  <button
                    type="button"
                    onClick={() => roomPhotoInputRef.current?.click()}
                    className="mt-1.5 px-3 py-1 bg-slate-50 hover:bg-slate-100 border text-slate-700 text-[11px] font-bold rounded-lg cursor-pointer transition flex items-center gap-1"
                  >
                    <Upload size={12} />{" "}
                    {room.image ? "Đổi ảnh phòng" : "Tải ảnh phòng"}
                  </button>
                </div>
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
                      handleUpdateRoom(room.id, {
                        roomName: e.target.value,
                        name: e.target.value,
                      })
                    }
                    placeholder="VD: Deluxe King Hướng Biển"
                    className="w-full h-11 px-4 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 focus:border-blue-600 outline-none font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                    <Bed className="w-3.5 h-3.5 text-blue-600" /> Giường chính *
                  </label>
                  <select
                    value={room.bedType || "1 Giường đôi lớn (King/Queen Size)"}
                    onChange={(e) =>
                      handleUpdateRoom(room.id, {
                        bedType: e.target.value,
                        bed_type: e.target.value,
                      })
                    }
                    className="w-full h-11 px-3 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:border-blue-600 outline-none font-semibold cursor-pointer"
                  >
                    <option value="1 Giường đôi lớn (King/Queen Size)">
                      1 Giường đôi lớn (King/Queen)
                    </option>
                    <option value="2 Giường đơn (Twin Bed)">
                      2 Giường đơn (Twin Bed)
                    </option>
                    <option value="1 Giường đôi + 1 Giường đơn (Family)">
                      1 Giường đôi + 1 Giường đơn
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                    <Maximize className="w-3.5 h-3.5 text-slate-400" /> Diện
                    tích (m²)
                  </label>
                  <input
                    type="number"
                    value={room.roomSize || 28}
                    onChange={(e) =>
                      handleUpdateRoom(room.id, {
                        roomSize: Number(e.target.value),
                        room_area: Number(e.target.value),
                      })
                    }
                    className="w-full h-11 px-4 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 focus:border-blue-600 outline-none"
                  />
                </div>
              </div>

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
                        capacity: Number(e.target.value),
                      })
                    }
                    className="w-full h-11 px-4 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 focus:border-blue-600 outline-none"
                  >
                    {[1, 2, 3, 4, 5, 6].map((n) => (
                      <option key={n} value={n}>
                        {n} người lớn
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
                        sell_price: Number(e.target.value),
                      })
                    }
                    className="w-full h-11 px-4 text-sm font-bold text-emerald-600 rounded-xl border border-slate-200 bg-white focus:border-blue-600 outline-none"
                  />
                  <span className="text-[11px] font-semibold text-slate-500 mt-1 block">
                    = {formatVND(room.weekdayPrice)}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5 text-amber-600" /> Giá
                    cuối tuần (Tùy chọn)
                  </label>
                  <input
                    type="number"
                    step="10000"
                    value={room.weekendPrice || 0}
                    onChange={(e) =>
                      handleUpdateRoom(room.id, {
                        weekendPrice: Number(e.target.value),
                      })
                    }
                    className="w-full h-11 px-4 text-sm font-bold text-amber-600 rounded-xl border border-slate-200 bg-white focus:border-blue-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Số phòng trong kho *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={room.totalRooms || 5}
                    onChange={(e) =>
                      handleUpdateRoom(room.id, {
                        totalRooms: Number(e.target.value),
                        room_count: Number(e.target.value),
                      })
                    }
                    className="w-full h-11 px-4 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 focus:border-blue-600 outline-none font-bold"
                  />
                </div>
              </div>

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
