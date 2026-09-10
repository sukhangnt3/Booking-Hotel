// src/pages/owner/HotelManagementPage.jsx
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Building2,
  MapPin,
  CheckCircle2,
  Clock,
  XCircle,
  CreditCard,
  RefreshCw,
  AlertCircle,
  Edit3,
  X,
  BedDouble,
  Phone,
  Mail,
  Sparkles,
  Check,
  Eye,
} from "lucide-react";
import { LoadingSpinner, EmptyState } from "@/components/common";
import apiClient from "@/services/apiClient";

const VIETNAM_BANKS = [
  {
    code: "VCB",
    name: "Vietcombank",
    fullName: "Ngân hàng Ngoại thương Việt Nam",
  },
  { code: "MB", name: "MB Bank", fullName: "Ngân hàng Quân đội" },
  {
    code: "TCB",
    name: "Techcombank",
    fullName: "Ngân hàng Kỹ thương Việt Nam",
  },
  {
    code: "CTG",
    name: "VietinBank",
    fullName: "Ngân hàng Công Thương Việt Nam",
  },
  { code: "BIDV", name: "BIDV", fullName: "Ngân hàng Đầu tư và Phát triển" },
  { code: "ACB", name: "ACB", fullName: "Ngân hàng Á Châu" },
  { code: "VPB", name: "VPBank", fullName: "Ngân hàng Việt Nam Thịnh Vượng" },
  { code: "TPB", name: "TPBank", fullName: "Ngân hàng Tiên Phong" },
];

const HOTEL_AMENITIES_OPTIONS = [
  { id: "wifi", label: "Wi-Fi miễn phí toàn khuôn viên" },
  { id: "parking", label: "Bãi đỗ xe ô tô tại chỗ nghỉ" },
  { id: "24h_front_desk", label: "Lễ tân phục vụ 24/7" },
  { id: "elevator", label: "Thang máy di chuyển" },
  { id: "pool_outdoor", label: "Hồ bơi ngoài trời / Vô cực" },
  { id: "pool_indoor", label: "Hồ bơi trong nhà / Nước ấm" },
  { id: "restaurant", label: "Nhà hàng & Khu ẩm thực" },
  { id: "bar", label: "Quầy Bar / Lounge" },
  { id: "spa", label: "Dịch vụ Spa & Massage" },
  { id: "gym", label: "Phòng tập thể dục / Gym" },
  { id: "private_beach", label: "Bãi biển riêng" },
  { id: "room_service", label: "Dịch vụ phòng" },
  { id: "air_conditioner", label: "Điều hòa máy lạnh" },
  { id: "tv_smart", label: "Smart TV màn hình phẳng" },
];

// Chuẩn hóa chuỗi xóa dấu tiếng Việt và ký tự đặc biệt
const normalizeAmenityText = (text) => {
  if (!text) return "";
  return String(text)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
};

const AMENITY_KEYWORDS = {
  wifi: ["wifi", "internet", "mang"],
  parking: ["parking", "bando", "doxe", "chodaung", "baido"],
  "24h_front_desk": ["24h", "letan", "frontdesk"],
  elevator: ["elevator", "thangmay", "lift"],
  pool_outdoor: ["pooloutdoor", "ngoaitroi", "vocuc"],
  pool_indoor: ["poolindoor", "trongnha", "nuocam"],
  restaurant: ["restaurant", "nhahang", "amthuc"],
  bar: ["bar", "quaybar", "lounge"],
  spa: ["spa", "massage"],
  gym: ["gym", "theduc", "fitness"],
  private_beach: ["beach", "bien", "baibien"],
  room_service: ["roomservice", "dichvuphong"],
  air_conditioner: ["airconditioner", "dieuhoa", "maylanh", "ac"],
  tv_smart: ["smarttv", "tivi", "tv"],
};

export default function HotelManagementPage() {
  const navigate = useNavigate();
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [apiError, setApiError] = useState("");

  const [editingHotel, setEditingHotel] = useState(null);
  const [hotelForm, setHotelForm] = useState({
    name: "",
    property_type: "hotel",
    star_rating: 3,
    address: "",
    city: "",
    phone: "",
    email: "",
    checkin_time: "14:00",
    checkout_time: "12:00",
    cancellation_deadline_hours: 24,
    bank_name: "Vietcombank",
    bank_account: "",
    bank_account_holder: "",
    tax_code: "",
    description: "",
    image: "",
    amenities: [],
  });

  const fetchMyHotels = useCallback(async () => {
    setLoading(true);
    setApiError("");
    try {
      const res = await apiClient.get(`/hotels/my-hotels?_t=${Date.now()}`);
      const list =
        res?.data?.hotels || res?.data?.data || res?.data || res || [];
      setHotels(Array.isArray(list) ? list : []);
    } catch (err) {
      setApiError(
        err.response?.data?.message ||
          err.message ||
          "Không thể tải danh sách cơ sở.",
      );
      setHotels([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMyHotels();
  }, [fetchMyHotels]);

  // Kiểm tra tiện ích đã được chọn hay chưa
  const isAmenityChecked = (item, currentAmenities = []) => {
    if (!Array.isArray(currentAmenities) || currentAmenities.length === 0)
      return false;

    const targetKey = item.id.toLowerCase();
    const targetNormLabel = normalizeAmenityText(item.label);
    const keywords = AMENITY_KEYWORDS[item.id] || [];

    return currentAmenities.some((a) => {
      if (!a) return false;
      const rawStr =
        typeof a === "object" ? a.name || a.label || a.id || "" : String(a);
      const normA = normalizeAmenityText(rawStr);

      if (rawStr.toLowerCase() === targetKey) return true;
      if (normA === targetNormLabel) return true;

      if (keywords.length > 0 && keywords.some((kw) => normA.includes(kw))) {
        if (item.id === "pool_indoor" && normA.includes("ngoaitroi"))
          return false;
        if (
          item.id === "pool_outdoor" &&
          (normA.includes("trongnha") || normA.includes("nuocam"))
        )
          return false;
        return true;
      }

      return false;
    });
  };

  const populateHotelForm = (hotel, amenitiesList = []) => {
    setHotelForm({
      name: hotel.name || "",
      property_type: hotel.property_type || "hotel",
      star_rating: Number(hotel.star_rating ?? 3),
      address: hotel.address || "",
      city: hotel.city || "",
      phone: hotel.phone || "",
      email: hotel.email || "",
      checkin_time: hotel.checkin_time
        ? String(hotel.checkin_time).slice(0, 5)
        : "14:00",
      checkout_time: hotel.checkout_time
        ? String(hotel.checkout_time).slice(0, 5)
        : "12:00",
      cancellation_deadline_hours: Number(
        hotel.cancellation_deadline_hours ?? 24,
      ),
      bank_name: hotel.bank_name || "Vietcombank",
      bank_account: hotel.bank_account || "",
      bank_account_holder: hotel.bank_account_holder || "",
      tax_code: hotel.tax_code || "",
      description: hotel.description || "",
      image: hotel.image || hotel.image_url || "",
      amenities: Array.isArray(amenitiesList) ? amenitiesList : [],
    });
  };

  // Mở form sửa và lấy dữ liệu tươi mới nhất từ Database
  const handleOpenEdit = async (hotel) => {
    setEditingHotel(hotel);
    const initialAmenities = Array.isArray(hotel.amenities)
      ? hotel.amenities
      : [];
    populateHotelForm(hotel, initialAmenities);

    try {
      const res = await apiClient.get(`/hotels/${hotel.id}?_t=${Date.now()}`);
      const freshHotel = res?.data?.hotel || res?.data?.data || res?.data;
      if (freshHotel && Array.isArray(freshHotel.amenities)) {
        setHotelForm((prev) => ({
          ...prev,
          description: freshHotel.description || prev.description,
          checkin_time: freshHotel.checkin_time
            ? String(freshHotel.checkin_time).slice(0, 5)
            : prev.checkin_time,
          checkout_time: freshHotel.checkout_time
            ? String(freshHotel.checkout_time).slice(0, 5)
            : prev.checkout_time,
          amenities: freshHotel.amenities,
        }));
      }
    } catch (err) {
      console.warn("Không thể đồng bộ chi tiết phụ:", err);
    }
  };

  // Lưu thông tin khách sạn
  const handleUpdateHotel = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const checkInVal = String(hotelForm.checkin_time || "14:00").slice(0, 5);
      const checkOutVal = String(hotelForm.checkout_time || "12:00").slice(
        0,
        5,
      );

      const payload = {
        name: hotelForm.name.trim(),
        property_type: hotelForm.property_type,
        propertyType: hotelForm.property_type,
        star_rating: Number(hotelForm.star_rating),
        starRating: Number(hotelForm.star_rating),
        address: hotelForm.address.trim(),
        city: hotelForm.city.trim(),
        phone: hotelForm.phone.trim(),
        email: hotelForm.email.trim(),

        checkin_time: checkInVal,
        check_in_time: checkInVal,
        checkout_time: checkOutVal,
        check_out_time: checkOutVal,

        cancellation_deadline_hours: Number(
          hotelForm.cancellation_deadline_hours,
        ),
        cancellationDeadlineHours: Number(
          hotelForm.cancellation_deadline_hours,
        ),

        bank_name: hotelForm.bank_name,
        bank_account: hotelForm.bank_account.trim(),
        bank_account_holder: hotelForm.bank_account_holder.trim().toUpperCase(),
        tax_code: hotelForm.tax_code.trim(),
        description: hotelForm.description,
        image: hotelForm.image.trim(),
        image_url: hotelForm.image.trim(),
        amenities: hotelForm.amenities,
      };

      const res = await apiClient.put(`/hotels/${editingHotel.id}`, payload);
      const updatedData = res?.data?.hotel || res?.data?.data || payload;

      setHotels((prev) =>
        prev.map((h) =>
          h.id === editingHotel.id
            ? {
                ...h,
                ...updatedData,
                description: payload.description,
                checkin_time: payload.checkin_time,
                checkout_time: payload.checkout_time,
                amenities: payload.amenities,
              }
            : h,
        ),
      );

      alert("✓ Cập nhật thông tin khách sạn thành công!");
      setEditingHotel(null);
      fetchMyHotels();
    } catch (err) {
      console.error(
        "Chi tiết lỗi cập nhật khách sạn:",
        err.response?.data || err,
      );
      const serverMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Lỗi không thể lưu thông tin khách sạn";
      alert(`Lỗi khi lưu: ${serverMsg}`);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredHotels = hotels.filter((h) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "active")
      return h.status === "active" || h.status === "approved";
    return h.status === statusFilter;
  });

  return (
    <div className="space-y-6 font-sans pb-16 text-slate-800">
      {/* HEADER */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#003580] font-bold text-xs uppercase tracking-wider mb-1">
            <Building2 size={16} /> Quản Trị Cơ Sở Chỗ Nghỉ
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Hồ Sơ Doanh Nghiệp Chỗ Nghỉ ({hotels.length} Cơ sở)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Dữ liệu đồng bộ trực tiếp từ Database
          </p>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => navigate("/owner/hotels/register")}
            className="px-5 py-3 bg-[#003580] hover:bg-blue-900 text-white font-bold text-xs rounded-full shadow-xs transition flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Plus size={24} /> Đăng Ký Cơ Sở Mới
          </button>
          <button
            onClick={fetchMyHotels}
            className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full cursor-pointer transition"
            title="Làm mới dữ liệu"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {apiError && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl flex items-center gap-2 font-bold">
          <AlertCircle size={16} /> <span>{apiError}</span>
        </div>
      )}

      {/* TABS LỌC */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto text-xs font-bold">
        {[
          { id: "all", label: `Tất cả cơ sở (${hotels.length})` },
          { id: "active", label: "Đang mở bán" },
          { id: "pending", label: "Đang chờ duyệt" },
          { id: "rejected", label: "Bị từ chối" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={`px-4 py-2 rounded-xl transition cursor-pointer ${
              statusFilter === tab.id
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-white border text-slate-600 hover:bg-slate-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* DANH SÁCH CƠ SỞ CHỖ NGHỈ */}
      {loading ? (
        <div className="py-24 flex justify-center bg-white rounded-3xl border">
          <LoadingSpinner
            size="lg"
            label="Đang tải danh sách cơ sở từ Database..."
          />
        </div>
      ) : filteredHotels.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredHotels.map((hotel) => {
            const isApproved =
              hotel.status === "active" || hotel.status === "approved";
            const isRejected = hotel.status === "rejected";

            return (
              <div
                key={hotel.id}
                className="bg-white rounded-3xl border overflow-hidden shadow-xs hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="relative h-48 w-full bg-slate-100 overflow-hidden">
                    <img
                      src={
                        hotel.image_url ||
                        hotel.image ||
                        "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600"
                      }
                      alt={hotel.name}
                      className="w-full h-full object-cover"
                    />
                    <span
                      className={`absolute top-3 right-3 text-white font-bold text-[11px] px-3 py-1 rounded-full shadow flex items-center gap-1.5 ${
                        isApproved
                          ? "bg-emerald-600"
                          : isRejected
                            ? "bg-rose-600"
                            : "bg-amber-500 animate-pulse"
                      }`}
                    >
                      {isApproved ? (
                        <>
                          <CheckCircle2 size={13} /> ✓ Đang Mở Bán
                        </>
                      ) : isRejected ? (
                        <>
                          <XCircle size={13} /> Bị Từ Chối
                        </>
                      ) : (
                        <>
                          <Clock size={13} /> ⏳ Đang Chờ Duyệt
                        </>
                      )}
                    </span>
                  </div>

                  <div className="p-6 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded">
                        ⭐ {hotel.star_rating || 0} SAO •{" "}
                        {hotel.property_type?.toUpperCase() || "HOTEL"}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        #{String(hotel.id).slice(0, 8)}
                      </span>
                    </div>

                    <h3 className="font-black text-slate-900 text-lg leading-snug">
                      {hotel.name}
                    </h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <MapPin size={13} className="text-[#006ce4] shrink-0" />
                      {hotel.address}, {hotel.city}
                    </p>

                    <div className="p-3 bg-slate-50 rounded-2xl border flex items-center gap-2 text-xs text-slate-700 font-medium">
                      <CreditCard
                        size={15}
                        className="text-emerald-600 shrink-0"
                      />
                      <span>
                        TK: <b>{hotel.bank_account || "Chưa cập nhật"}</b> (
                        {hotel.bank_name || "Ngân hàng"}) -{" "}
                        {hotel.bank_account_holder}
                      </span>
                    </div>

                    {isRejected && hotel.rejection_reason && (
                      <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
                        <b>Lý do từ chối:</b> {hotel.rejection_reason}
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-6 pt-0 border-t mt-2 flex items-center justify-between pt-3 gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEdit(hotel)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-xs font-bold flex items-center gap-1.5 cursor-pointer transition"
                    >
                      <Edit3 size={14} /> Sửa
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        window.open(`/hotels/${hotel.id}`, "_blank")
                      }
                      className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-[#006ce4] rounded-full text-xs font-bold flex items-center gap-1.5 cursor-pointer transition"
                      title="Mở tab mới xem trực tiếp trang chi tiết khách sạn này"
                    >
                      <Eye size={14} /> Xem trang khách
                    </button>
                  </div>

                  <button
                    onClick={() => navigate(`/owner/rooms?hotelId=${hotel.id}`)}
                    disabled={!isApproved}
                    className="px-5 py-2 bg-[#003580] hover:bg-blue-900 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white rounded-full text-xs font-bold cursor-pointer flex items-center gap-1 transition"
                  >
                    <BedDouble size={14} /> Quản lý phòng & Giá →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={Building2}
          title="Chưa có cơ sở nào"
          description="Bấm '+ Đăng Ký Cơ Sở Mới' để bắt đầu gửi hồ sơ chỗ nghỉ của bạn lên hệ thống."
        />
      )}

      {/* MODAL SỬA KHÁCH SẠN */}
      {editingHotel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-2xl shadow-2xl border space-y-5 text-xs max-h-[90vh] overflow-y-auto font-sans">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">
                  Chỉnh Sửa Toàn Diện Cơ Sở Chỗ Nghỉ
                </h3>
                <p className="text-[11px] text-slate-400">
                  Cập nhật các thuộc tính vận hành và tiện nghi của #
                  {String(editingHotel.id).slice(0, 8)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingHotel(null)}
                className="p-1.5 hover:bg-slate-100 rounded-xl cursor-pointer text-slate-400 hover:text-slate-700 transition"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateHotel} className="space-y-4">
              {/* KHỐI 1: ĐỊNH DANH */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <span className="font-bold text-slate-900 flex items-center gap-1.5 uppercase text-[11px] tracking-wider">
                  <Building2 size={14} className="text-blue-600" /> 1. Định danh
                  & Loại hình
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-600 mb-1">
                      Tên khách sạn *
                    </label>
                    <input
                      required
                      value={hotelForm.name}
                      onChange={(e) =>
                        setHotelForm({ ...hotelForm, name: e.target.value })
                      }
                      className="w-full h-10 px-3 border rounded-xl font-bold text-slate-900 bg-white outline-none focus:border-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-600 mb-1">
                      Loại hình chỗ nghỉ *
                    </label>
                    <select
                      value={hotelForm.property_type}
                      onChange={(e) =>
                        setHotelForm({
                          ...hotelForm,
                          property_type: e.target.value,
                        })
                      }
                      className="w-full h-10 px-2.5 border rounded-xl font-semibold bg-white cursor-pointer outline-none focus:border-blue-600"
                    >
                      <option value="hotel">Khách sạn (Hotel)</option>
                      <option value="resort">Khu nghỉ dưỡng (Resort)</option>
                      <option value="homestay">Homestay</option>
                      <option value="villa">Biệt thự (Villa)</option>
                      <option value="apartment">Căn hộ (Apartment)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-600 mb-1">
                      Hạng sao (star_rating)
                    </label>
                    <select
                      value={hotelForm.star_rating}
                      onChange={(e) =>
                        setHotelForm({
                          ...hotelForm,
                          star_rating: Number(e.target.value),
                        })
                      }
                      className="w-full h-10 px-2.5 border rounded-xl font-bold bg-white cursor-pointer outline-none focus:border-blue-600"
                    >
                      {[1, 2, 3, 4, 5].map((s) => (
                        <option key={s} value={s}>
                          {s} Sao {"⭐".repeat(s)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-600 mb-1">
                      Link ảnh mặt tiền đại diện (URL)
                    </label>
                    <input
                      value={hotelForm.image}
                      onChange={(e) =>
                        setHotelForm({ ...hotelForm, image: e.target.value })
                      }
                      placeholder="https://images.unsplash.com/..."
                      className="w-full h-10 px-3 border rounded-xl bg-white outline-none focus:border-blue-600"
                    />
                  </div>
                </div>
              </div>

              {/* KHỐI 2: VỊ TRÍ & LIÊN HỆ */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <span className="font-bold text-slate-900 flex items-center gap-1.5 uppercase text-[11px] tracking-wider">
                  <MapPin size={14} className="text-rose-600" /> 2. Vị trí &
                  Hotline liên hệ
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-600 mb-1">
                      Tỉnh / Thành phố *
                    </label>
                    <input
                      required
                      value={hotelForm.city}
                      onChange={(e) =>
                        setHotelForm({ ...hotelForm, city: e.target.value })
                      }
                      className="w-full h-10 px-3 border rounded-xl font-semibold bg-white outline-none focus:border-blue-600"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-600 mb-1">
                      Địa chỉ chi tiết *
                    </label>
                    <input
                      required
                      value={hotelForm.address}
                      onChange={(e) =>
                        setHotelForm({ ...hotelForm, address: e.target.value })
                      }
                      className="w-full h-10 px-3 border rounded-xl bg-white outline-none focus:border-blue-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-600 mb-1 flex items-center gap-1">
                      <Phone size={12} /> Hotline lễ tân
                    </label>
                    <input
                      value={hotelForm.phone}
                      onChange={(e) =>
                        setHotelForm({ ...hotelForm, phone: e.target.value })
                      }
                      className="w-full h-10 px-3 border rounded-xl bg-white outline-none focus:border-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-600 mb-1 flex items-center gap-1">
                      <Mail size={12} /> Email thông báo đặt phòng
                    </label>
                    <input
                      type="email"
                      value={hotelForm.email}
                      onChange={(e) =>
                        setHotelForm({ ...hotelForm, email: e.target.value })
                      }
                      className="w-full h-10 px-3 border rounded-xl bg-white outline-none focus:border-blue-600"
                    />
                  </div>
                </div>
              </div>

              {/* KHỐI 3: VẬN HÀNH & CHÍNH SÁCH HỦY */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <span className="font-bold text-slate-900 flex items-center gap-1.5 uppercase text-[11px] tracking-wider">
                  <Clock size={14} className="text-amber-600" /> 3. Giờ nhận /
                  trả phòng & Hủy phòng
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-600 mb-1">
                      Giờ nhận phòng (checkin)
                    </label>
                    <input
                      value={hotelForm.checkin_time}
                      onChange={(e) =>
                        setHotelForm({
                          ...hotelForm,
                          checkin_time: e.target.value,
                        })
                      }
                      placeholder="14:00"
                      className="w-full h-10 px-3 border rounded-xl font-bold bg-white outline-none focus:border-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-600 mb-1">
                      Giờ trả phòng (checkout)
                    </label>
                    <input
                      value={hotelForm.checkout_time}
                      onChange={(e) =>
                        setHotelForm({
                          ...hotelForm,
                          checkout_time: e.target.value,
                        })
                      }
                      placeholder="12:00"
                      className="w-full h-10 px-3 border rounded-xl font-bold bg-white outline-none focus:border-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-600 mb-1">
                      Chính sách hủy phòng
                    </label>
                    <select
                      value={hotelForm.cancellation_deadline_hours}
                      onChange={(e) =>
                        setHotelForm({
                          ...hotelForm,
                          cancellation_deadline_hours: Number(e.target.value),
                        })
                      }
                      className="w-full h-10 px-2.5 border rounded-xl font-semibold bg-white cursor-pointer outline-none focus:border-blue-600"
                    >
                      <option value={24}>Hủy trước 24 giờ</option>
                      <option value={72}>Hủy trước 72 giờ</option>
                      <option value={0}>Không hoàn tiền</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* KHỐI 4: QUYẾT TOÁN & TÀI KHOẢN NGÂN HÀNG */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <span className="font-bold text-slate-900 flex items-center gap-1.5 uppercase text-[11px] tracking-wider">
                  <CreditCard size={14} className="text-emerald-600" /> 4. Tài
                  khoản thụ hưởng & Thuế
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-600 mb-1">
                      Ngân hàng
                    </label>
                    <select
                      value={hotelForm.bank_name}
                      onChange={(e) =>
                        setHotelForm({
                          ...hotelForm,
                          bank_name: e.target.value,
                        })
                      }
                      className="w-full h-10 px-2.5 border rounded-xl font-semibold bg-white cursor-pointer outline-none focus:border-blue-600"
                    >
                      {VIETNAM_BANKS.map((b) => (
                        <option key={b.code} value={b.name}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-600 mb-1">
                      Số tài khoản
                    </label>
                    <input
                      value={hotelForm.bank_account}
                      onChange={(e) =>
                        setHotelForm({
                          ...hotelForm,
                          bank_account: e.target.value,
                        })
                      }
                      className="w-full h-10 px-3 border rounded-xl font-mono text-blue-900 font-bold bg-white outline-none focus:border-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-600 mb-1">
                      Chủ tài khoản
                    </label>
                    <input
                      value={hotelForm.bank_account_holder}
                      onChange={(e) =>
                        setHotelForm({
                          ...hotelForm,
                          bank_account_holder: e.target.value.toUpperCase(),
                        })
                      }
                      className="w-full h-10 px-3 border rounded-xl font-bold uppercase bg-white outline-none focus:border-blue-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-600 mb-1">
                    Mã số thuế doanh nghiệp / Hộ KD
                  </label>
                  <input
                    value={hotelForm.tax_code}
                    onChange={(e) =>
                      setHotelForm({ ...hotelForm, tax_code: e.target.value })
                    }
                    placeholder="VD: 0101234567"
                    className="w-full h-10 px-3 border rounded-xl font-mono bg-white outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              {/* KHỐI 5: TIỆN NGHI & CƠ SỞ VẬT CHẤT */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <span className="font-bold text-slate-900 flex items-center gap-1.5 uppercase text-[11px] tracking-wider">
                  <Sparkles size={14} className="text-amber-500" /> 5. Tiện nghi
                  & Cơ sở vật chất chỗ nghỉ
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {HOTEL_AMENITIES_OPTIONS.map((item) => {
                    const isChecked = isAmenityChecked(
                      item,
                      hotelForm.amenities,
                    );
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setHotelForm((prev) => {
                            const list = Array.isArray(prev.amenities)
                              ? prev.amenities
                              : [];
                            const checked = isAmenityChecked(item, list);
                            if (checked) {
                              return {
                                ...prev,
                                amenities: list.filter(
                                  (a) => !isAmenityChecked(item, [a]),
                                ),
                              };
                            } else {
                              return {
                                ...prev,
                                amenities: [...list, item.label],
                              };
                            }
                          });
                        }}
                        className={`flex items-center gap-2 p-2.5 rounded-xl text-left border transition cursor-pointer select-none text-xs ${
                          isChecked
                            ? "bg-emerald-50 border-emerald-400 text-emerald-900 font-bold shadow-2xs"
                            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition ${
                            isChecked
                              ? "bg-emerald-600 border-emerald-600 text-white"
                              : "border-slate-300 bg-white"
                          }`}
                        >
                          {isChecked && <Check size={12} strokeWidth={3} />}
                        </div>
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* MÔ TẢ */}
              <div>
                <label className="block font-bold text-slate-600 mb-1">
                  Mô tả cơ sở lưu trú
                </label>
                <textarea
                  rows={3}
                  value={hotelForm.description}
                  onChange={(e) =>
                    setHotelForm({ ...hotelForm, description: e.target.value })
                  }
                  placeholder="Nhập mô tả giới thiệu chỗ nghỉ..."
                  className="w-full p-3 border rounded-xl bg-white outline-none focus:border-blue-600"
                />
              </div>

              {/* NÚT THAO TÁC */}
              <div className="flex justify-end gap-2.5 pt-3 border-t">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setEditingHotel(null)}
                  className="px-6 py-2.5 border rounded-full font-bold cursor-pointer hover:bg-slate-50 text-slate-700 transition disabled:opacity-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-7 py-2.5 bg-[#003580] hover:bg-blue-900 text-white font-bold rounded-full cursor-pointer shadow-md transition active:scale-95 disabled:opacity-50"
                >
                  {submitting ? "Đang lưu..." : "Lưu Thay Đổi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
