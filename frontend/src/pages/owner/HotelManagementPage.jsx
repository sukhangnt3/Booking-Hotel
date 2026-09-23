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
  Moon,
  Sun,
  Hourglass,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";
import { LoadingSpinner, EmptyState } from "@/components/common";
import apiClient from "@/services/apiClient";

const VIETNAM_BANKS = [
  {
    code: "VCB",
    name: "Vietcombank",
    fullName: "Ngân hàng Ngoại thương Việt Nam",
  },
  { code: "MB", name: "MBBank", fullName: "Ngân hàng Quân đội" },
  {
    code: "TCB",
    name: "Techcombank",
    fullName: "Ngân hàng Kỹ thương Việt Nam",
  },
  {
    code: "ICB",
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

const TIME_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const h = String(i).padStart(2, "0");
  return `${h}:00`;
});

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
  const [editTab, setEditTab] = useState("info"); // info | policies | bank | amenities

  const [hotelForm, setHotelForm] = useState({
    name: "",
    property_type: "hotel",
    star_rating: 3,
    address: "",
    city: "",
    phone: "",
    email: "",
    // Khung giờ
    checkin_time: "14:00",
    checkout_time: "12:00",
    overnight_checkin_time: "22:00",
    overnight_checkout_time: "11:00",
    halfday_checkin_time: "12:00",
    halfday_checkout_time: "21:00",
    hourly_start_time: "08:00",
    hourly_end_time: "22:00",
    hourly_grace_minutes: 15,
    // Công tắc bật/tắt hình thức
    allow_hourly: true,
    allow_overnight: true,
    allow_halfday: true,
    allow_daily: true,
    cancellation_deadline_hours: 24,
    bank_code: "VCB",
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
      overnight_checkin_time: hotel.overnight_checkin_time
        ? String(hotel.overnight_checkin_time).slice(0, 5)
        : "22:00",
      overnight_checkout_time: hotel.overnight_checkout_time
        ? String(hotel.overnight_checkout_time).slice(0, 5)
        : "11:00",
      halfday_checkin_time: hotel.halfday_checkin_time
        ? String(hotel.halfday_checkin_time).slice(0, 5)
        : "12:00",
      halfday_checkout_time: hotel.halfday_checkout_time
        ? String(hotel.halfday_checkout_time).slice(0, 5)
        : "21:00",
      hourly_start_time: hotel.hourly_start_time
        ? String(hotel.hourly_start_time).slice(0, 5)
        : "08:00",
      hourly_end_time: hotel.hourly_end_time
        ? String(hotel.hourly_end_time).slice(0, 5)
        : "22:00",
      hourly_grace_minutes: Number(hotel.hourly_grace_minutes ?? 15),
      allow_hourly: true,
      allow_overnight: true,
      allow_halfday: true,
      allow_daily: true,
      cancellation_deadline_hours: Number(
        hotel.cancellation_deadline_hours ?? 24,
      ),
      bank_code: hotel.bank_code || "VCB",
      bank_name: hotel.bank_name || "Vietcombank",
      bank_account: hotel.bank_account || "",
      bank_account_holder: hotel.bank_account_holder || "",
      tax_code: hotel.tax_code || "",
      description: hotel.description || "",
      image: hotel.image || hotel.image_url || "",
      amenities: Array.isArray(amenitiesList) ? amenitiesList : [],
    });
  };

  const handleOpenEdit = async (hotel) => {
    setEditingHotel(hotel);
    setEditTab("policies"); // Mở ngay vào Tab Khung giờ để Owner dễ thấy và chỉnh sửa
    const initialAmenities = Array.isArray(hotel.amenities)
      ? hotel.amenities
      : [];
    populateHotelForm(hotel, initialAmenities);

    try {
      const res = await apiClient.get(`/hotels/${hotel.id}?_t=${Date.now()}`);
      const freshHotel = res?.data?.hotel || res?.data?.data || res?.data;
      if (freshHotel) {
        setHotelForm((prev) => ({
          ...prev,
          bank_code: freshHotel.bank_code || prev.bank_code,
          bank_name: freshHotel.bank_name || prev.bank_name,
          bank_account: freshHotel.bank_account || prev.bank_account,
          bank_account_holder:
            freshHotel.bank_account_holder || prev.bank_account_holder,
          description: freshHotel.description || prev.description,
          checkin_time: freshHotel.checkin_time
            ? String(freshHotel.checkin_time).slice(0, 5)
            : prev.checkin_time,
          checkout_time: freshHotel.checkout_time
            ? String(freshHotel.checkout_time).slice(0, 5)
            : prev.checkout_time,
          overnight_checkin_time: freshHotel.overnight_checkin_time
            ? String(freshHotel.overnight_checkin_time).slice(0, 5)
            : prev.overnight_checkin_time,
          overnight_checkout_time: freshHotel.overnight_checkout_time
            ? String(freshHotel.overnight_checkout_time).slice(0, 5)
            : prev.overnight_checkout_time,
          halfday_checkin_time: freshHotel.halfday_checkin_time
            ? String(freshHotel.halfday_checkin_time).slice(0, 5)
            : prev.halfday_checkin_time,
          halfday_checkout_time: freshHotel.halfday_checkout_time
            ? String(freshHotel.halfday_checkout_time).slice(0, 5)
            : prev.halfday_checkout_time,
          hourly_start_time: freshHotel.hourly_start_time
            ? String(freshHotel.hourly_start_time).slice(0, 5)
            : prev.hourly_start_time,
          hourly_end_time: freshHotel.hourly_end_time
            ? String(freshHotel.hourly_end_time).slice(0, 5)
            : prev.hourly_end_time,
          hourly_grace_minutes:
            freshHotel.hourly_grace_minutes !== undefined
              ? Number(freshHotel.hourly_grace_minutes)
              : prev.hourly_grace_minutes,
          amenities: Array.isArray(freshHotel.amenities)
            ? freshHotel.amenities
            : prev.amenities,
        }));
      }
    } catch (err) {
      console.warn("Không thể đồng bộ chi tiết phụ:", err);
    }
  };

  // ĐẶT LẠI GIỜ CHUẨN CỦA NGÀNH KHÁCH SẠN
  const handleResetDefaultHours = () => {
    setHotelForm((prev) => ({
      ...prev,
      checkin_time: "14:00",
      checkout_time: "12:00",
      overnight_checkin_time: "22:00",
      overnight_checkout_time: "11:00",
      halfday_checkin_time: "12:00",
      halfday_checkout_time: "21:00",
      hourly_start_time: "08:00",
      hourly_end_time: "22:00",
      hourly_grace_minutes: 15,
    }));
    alert("Đã khôi phục khung giờ về chuẩn mặc định!");
  };

  const handleUpdateHotel = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const checkInVal = String(hotelForm.checkin_time || "14:00").slice(0, 5);
      const checkOutVal = String(hotelForm.checkout_time || "12:00").slice(
        0,
        5,
      );
      const overnightInVal = String(
        hotelForm.overnight_checkin_time || "22:00",
      ).slice(0, 5);
      const overnightOutVal = String(
        hotelForm.overnight_checkout_time || "11:00",
      ).slice(0, 5);
      const halfdayInVal = String(
        hotelForm.halfday_checkin_time || "12:00",
      ).slice(0, 5);
      const halfdayOutVal = String(
        hotelForm.halfday_checkout_time || "21:00",
      ).slice(0, 5);
      const hourlyStartVal = String(
        hotelForm.hourly_start_time || "08:00",
      ).slice(0, 5);
      const hourlyEndVal = String(hotelForm.hourly_end_time || "22:00").slice(
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

        // Lưu đầy đủ giờ
        checkin_time: checkInVal,
        check_in_time: checkInVal,
        checkout_time: checkOutVal,
        check_out_time: checkOutVal,

        overnight_checkin_time: overnightInVal,
        overnight_checkout_time: overnightOutVal,
        halfday_checkin_time: halfdayInVal,
        halfday_checkout_time: halfdayOutVal,

        hourly_start_time: hourlyStartVal,
        hourly_end_time: hourlyEndVal,
        hourly_grace_minutes: Number(hotelForm.hourly_grace_minutes || 15),

        cancellation_deadline_hours: Number(
          hotelForm.cancellation_deadline_hours,
        ),
        cancellationDeadlineHours: Number(
          hotelForm.cancellation_deadline_hours,
        ),

        bank_code: hotelForm.bank_code || "VCB",
        bankCode: hotelForm.bank_code || "VCB",
        bank_name: hotelForm.bank_name || "Vietcombank",
        bankName: hotelForm.bank_name || "Vietcombank",
        bank_account: hotelForm.bank_account.trim(),
        bankAccount: hotelForm.bank_account.trim(),
        bank_account_holder: hotelForm.bank_account_holder.trim().toUpperCase(),
        bankAccountHolder: hotelForm.bank_account_holder.trim().toUpperCase(),

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
                checkin_time: payload.checkin_time,
                checkout_time: payload.checkout_time,
                overnight_checkin_time: payload.overnight_checkin_time,
                overnight_checkout_time: payload.overnight_checkout_time,
                halfday_checkin_time: payload.halfday_checkin_time,
                halfday_checkout_time: payload.halfday_checkout_time,
                hourly_start_time: payload.hourly_start_time,
                hourly_end_time: payload.hourly_end_time,
                hourly_grace_minutes: payload.hourly_grace_minutes,
                amenities: payload.amenities,
              }
            : h,
        ),
      );

      alert("✓ Cập nhật thông tin khách sạn và khung giờ quy định thành công!");
      setEditingHotel(null);
      fetchMyHotels();
    } catch (err) {
      console.error("Lỗi cập nhật khách sạn:", err.response?.data || err);
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
    <div className="w-full pb-24 bg-gray-50/50 font-sans text-gray-900 min-h-screen p-4 sm:p-6 lg:p-8 space-y-6">
      {/* HEADER */}
      <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#006ce4] font-bold text-xs uppercase tracking-wider mb-1">
            <Building2 size={16} /> Quản Trị Cơ Sở Chỗ Nghỉ
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#0a2540] tracking-tight">
            Hồ Sơ Doanh Nghiệp ({hotels.length} Cơ sở)
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Quản lý khung giờ nhận/trả phòng, tài khoản ngân hàng và thiết lập
            tiện nghi
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => navigate("/owner/hotels/register")}
            className="px-5 py-2.5 bg-[#003580] hover:bg-blue-900 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Plus size={16} /> Đăng ký cơ sở mới
          </button>
          <button
            type="button"
            onClick={fetchMyHotels}
            className="p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl cursor-pointer transition"
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

      {/* TABS LỌC TRẠNG THÁI */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-3 overflow-x-auto text-xs font-bold">
        {[
          { id: "all", label: `Tất cả cơ sở (${hotels.length})` },
          { id: "active", label: "Đang mở bán" },
          { id: "pending", label: "Đang chờ duyệt" },
          { id: "rejected", label: "Bị từ chối" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setStatusFilter(tab.id)}
            className={`px-4 py-2 rounded-xl transition cursor-pointer ${
              statusFilter === tab.id
                ? "bg-[#003580] text-white shadow-xs"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* DANH SÁCH CƠ SỞ CHỖ NGHỈ */}
      {loading ? (
        <div className="py-24 flex justify-center bg-white rounded-3xl border border-gray-200 shadow-sm">
          <LoadingSpinner size="lg" label="Đang tải danh sách cơ sở..." />
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
                className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="relative h-48 w-full bg-gray-100 overflow-hidden">
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
                            : "bg-amber-500"
                      }`}
                    >
                      {isApproved ? (
                        <>
                          <CheckCircle2 size={13} /> Đang Mở Bán
                        </>
                      ) : isRejected ? (
                        <>
                          <XCircle size={13} /> Bị Từ Chối
                        </>
                      ) : (
                        <>
                          <Clock size={13} /> Đang Chờ Duyệt
                        </>
                      )}
                    </span>
                  </div>

                  <div className="p-6 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#003580] bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-100">
                        ⭐ {hotel.star_rating || 0} SAO •{" "}
                        {hotel.property_type?.toUpperCase() || "HOTEL"}
                      </span>
                      <span className="text-xs text-gray-400 font-mono">
                        #{String(hotel.id).slice(0, 8)}
                      </span>
                    </div>

                    <h3 className="font-black text-[#0a2540] text-lg leading-snug">
                      {hotel.name}
                    </h3>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <MapPin size={14} className="text-[#006ce4] shrink-0" />
                      {hotel.address}, {hotel.city}
                    </p>

                    <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 flex items-center gap-2 text-xs text-gray-700 font-medium">
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

                <div className="p-6 pt-0 border-t border-gray-100 mt-2 flex items-center justify-between pt-4 gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(hotel)}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition"
                    >
                      <Edit3 size={14} /> Sửa hồ sơ & Giờ
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        window.open(`/hotel/${hotel.id}`, "_blank")
                      }
                      className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-[#006ce4] rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition"
                    >
                      <Eye size={14} /> Xem trang khách
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate(`/owner/rooms?hotelId=${hotel.id}`)}
                    disabled={!isApproved}
                    className="px-5 py-2 bg-[#003580] hover:bg-blue-900 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1 transition shadow-xs"
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

      {/* 🌟 MODAL CHỈNH SỬA THÔNG MINH ĐƯỢC CHIA TABS RÕ RÀNG 🌟 */}
      {editingHotel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs font-sans">
          <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl border border-gray-200 flex flex-col text-xs max-h-[92vh] overflow-hidden my-auto">
            {/* MODAL HEADER */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-white shrink-0">
              <div>
                <h3 className="font-black text-base text-[#0a2540]">
                  Chỉnh Sửa Hồ Sơ Chỗ Nghỉ: {hotelForm.name}
                </h3>
                <p className="text-[11px] text-gray-400">
                  Mã cơ sở: #{String(editingHotel.id).slice(0, 8)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingHotel(null)}
                className="p-1.5 hover:bg-gray-100 rounded-xl cursor-pointer text-gray-400 hover:text-gray-700 transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* THANH TABS ĐIỀU HƯỚNG NHANH */}
            <div className="flex items-center gap-1 px-6 border-b border-gray-200 bg-gray-50/60 shrink-0 text-xs font-bold overflow-x-auto">
              <button
                type="button"
                onClick={() => setEditTab("policies")}
                className={`py-3 px-4 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                  editTab === "policies"
                    ? "border-[#006ce4] text-[#006ce4] font-black bg-white rounded-t-xl"
                    : "border-transparent text-gray-500 hover:text-gray-900"
                }`}
              >
                <Clock size={15} /> <span>Khung giờ & Quy định</span>
              </button>

              <button
                type="button"
                onClick={() => setEditTab("info")}
                className={`py-3 px-4 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                  editTab === "info"
                    ? "border-[#006ce4] text-[#006ce4] font-black bg-white rounded-t-xl"
                    : "border-transparent text-gray-500 hover:text-gray-900"
                }`}
              >
                <Building2 size={15} /> <span>Thông tin cơ sở</span>
              </button>

              <button
                type="button"
                onClick={() => setEditTab("amenities")}
                className={`py-3 px-4 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                  editTab === "amenities"
                    ? "border-[#006ce4] text-[#006ce4] font-black bg-white rounded-t-xl"
                    : "border-transparent text-gray-500 hover:text-gray-900"
                }`}
              >
                <Sparkles size={15} /> <span>Tiện nghi cơ sở</span>
              </button>

              <button
                type="button"
                onClick={() => setEditTab("bank")}
                className={`py-3 px-4 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                  editTab === "bank"
                    ? "border-[#006ce4] text-[#006ce4] font-black bg-white rounded-t-xl"
                    : "border-transparent text-gray-500 hover:text-gray-900"
                }`}
              >
                <CreditCard size={15} /> <span>Ngân hàng & Thuế</span>
              </button>
            </div>

            {/* FORM NỘI DUNG CHÍNH */}
            <form
              onSubmit={handleUpdateHotel}
              className="flex-1 overflow-y-auto p-6 space-y-5 bg-white"
            >
              {/* 🌟 TAB 1: KHUNG GIỜ QUY ĐỊNH (THIẾT KẾ TRỰC QUAN, DỄ CHỈNH SỬA/XÓA) 🌟 */}
              {editTab === "policies" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-blue-50/60 p-3.5 rounded-2xl border border-blue-100">
                    <div className="space-y-0.5">
                      <span className="font-bold text-[#003580] text-xs block">
                        Thiết lập khung giờ lưu trú linh hoạt
                      </span>
                      <p className="text-[11px] text-gray-500">
                        Hệ thống sẽ dựa vào khung giờ này để tính tiền phòng và
                        phụ thu cho khách
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleResetDefaultHours}
                      className="px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-xl font-bold text-[11px] flex items-center gap-1 cursor-pointer transition shadow-2xs"
                    >
                      <RotateCcw size={12} /> <span>Đặt lại giờ chuẩn</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* 1. KHUNG GIỜ THEO NGÀY */}
                    <div className="p-4 rounded-2xl bg-amber-50/40 border border-amber-200/80 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-amber-950 text-xs flex items-center gap-1.5">
                          <Sun size={15} className="text-amber-600" /> 1. Theo
                          Ngày (Ngày đêm)
                        </span>
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                          Tiêu chuẩn
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-gray-600 mb-1">
                            Nhận phòng (từ)
                          </label>
                          <select
                            value={hotelForm.checkin_time}
                            onChange={(e) =>
                              setHotelForm({
                                ...hotelForm,
                                checkin_time: e.target.value,
                              })
                            }
                            className="w-full h-9 px-2.5 border border-gray-300 rounded-xl font-bold bg-white outline-none cursor-pointer focus:border-[#003580]"
                          >
                            {TIME_OPTIONS.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-gray-600 mb-1">
                            Trả phòng (trước)
                          </label>
                          <select
                            value={hotelForm.checkout_time}
                            onChange={(e) =>
                              setHotelForm({
                                ...hotelForm,
                                checkout_time: e.target.value,
                              })
                            }
                            className="w-full h-9 px-2.5 border border-gray-300 rounded-xl font-bold bg-white outline-none cursor-pointer focus:border-[#003580]"
                          >
                            {TIME_OPTIONS.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* 2. KHUNG GIỜ QUA ĐÊM */}
                    <div className="p-4 rounded-2xl bg-indigo-50/40 border border-indigo-200/80 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-indigo-950 text-xs flex items-center gap-1.5">
                          <Moon size={15} className="text-indigo-600" /> 2. Thuê
                          Qua Đêm
                        </span>
                        <span className="text-[10px] font-bold text-indigo-800 bg-indigo-100 px-2 py-0.5 rounded-md">
                          Nghỉ đêm muộn
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-gray-600 mb-1">
                            Nhận phòng (tối từ)
                          </label>
                          <select
                            value={hotelForm.overnight_checkin_time}
                            onChange={(e) =>
                              setHotelForm({
                                ...hotelForm,
                                overnight_checkin_time: e.target.value,
                              })
                            }
                            className="w-full h-9 px-2.5 border border-gray-300 rounded-xl font-bold bg-white outline-none cursor-pointer focus:border-[#003580]"
                          >
                            {TIME_OPTIONS.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-gray-600 mb-1">
                            Trả phòng (trưa sau)
                          </label>
                          <select
                            value={hotelForm.overnight_checkout_time}
                            onChange={(e) =>
                              setHotelForm({
                                ...hotelForm,
                                overnight_checkout_time: e.target.value,
                              })
                            }
                            className="w-full h-9 px-2.5 border border-gray-300 rounded-xl font-bold bg-white outline-none cursor-pointer focus:border-[#003580]"
                          >
                            {TIME_OPTIONS.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* 3. KHUNG GIỜ THEO BUỔI */}
                    <div className="p-4 rounded-2xl bg-teal-50/40 border border-teal-200/80 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-teal-950 text-xs flex items-center gap-1.5">
                          <Hourglass size={15} className="text-teal-600" /> 3.
                          Theo Buổi (Nửa ngày)
                        </span>
                        <span className="text-[10px] font-bold text-teal-800 bg-teal-100 px-2 py-0.5 rounded-md">
                          Trong ngày
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-gray-600 mb-1">
                            Nhận phòng (trưa từ)
                          </label>
                          <select
                            value={hotelForm.halfday_checkin_time}
                            onChange={(e) =>
                              setHotelForm({
                                ...hotelForm,
                                halfday_checkin_time: e.target.value,
                              })
                            }
                            className="w-full h-9 px-2.5 border border-gray-300 rounded-xl font-bold bg-white outline-none cursor-pointer focus:border-[#003580]"
                          >
                            {TIME_OPTIONS.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-gray-600 mb-1">
                            Trả phòng (tối cùng ngày)
                          </label>
                          <select
                            value={hotelForm.halfday_checkout_time}
                            onChange={(e) =>
                              setHotelForm({
                                ...hotelForm,
                                halfday_checkout_time: e.target.value,
                              })
                            }
                            className="w-full h-9 px-2.5 border border-gray-300 rounded-xl font-bold bg-white outline-none cursor-pointer focus:border-[#003580]"
                          >
                            {TIME_OPTIONS.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* 4. KHUNG GIỜ THUÊ THEO GIỜ & ÂN HẠN */}
                    <div className="p-4 rounded-2xl bg-blue-50/40 border border-blue-200/80 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-blue-950 text-xs flex items-center gap-1.5">
                          <Clock size={15} className="text-blue-600" /> 4. Thuê
                          Theo Giờ (Hourly)
                        </span>
                        <span className="text-[10px] font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded-md">
                          Linh hoạt
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[10.5px] font-bold text-gray-600 mb-1">
                            Mở bán (từ)
                          </label>
                          <select
                            value={hotelForm.hourly_start_time}
                            onChange={(e) =>
                              setHotelForm({
                                ...hotelForm,
                                hourly_start_time: e.target.value,
                              })
                            }
                            className="w-full h-9 px-1.5 border border-gray-300 rounded-xl font-bold bg-white outline-none cursor-pointer focus:border-[#003580]"
                          >
                            {TIME_OPTIONS.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10.5px] font-bold text-gray-600 mb-1">
                            Đến trước (tối)
                          </label>
                          <select
                            value={hotelForm.hourly_end_time}
                            onChange={(e) =>
                              setHotelForm({
                                ...hotelForm,
                                hourly_end_time: e.target.value,
                              })
                            }
                            className="w-full h-9 px-1.5 border border-gray-300 rounded-xl font-bold bg-white outline-none cursor-pointer focus:border-[#003580]"
                          >
                            {TIME_OPTIONS.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label
                            className="block text-[10.5px] font-bold text-gray-600 mb-1"
                            title="Số phút trả muộn không bị tính tiền"
                          >
                            Ân hạn (phút) *
                          </label>
                          <select
                            value={hotelForm.hourly_grace_minutes}
                            onChange={(e) =>
                              setHotelForm({
                                ...hotelForm,
                                hourly_grace_minutes: Number(e.target.value),
                              })
                            }
                            className="w-full h-9 px-2 border border-gray-300 rounded-xl font-bold bg-white outline-none cursor-pointer focus:border-[#003580] text-emerald-700"
                          >
                            <option value={0}>0 phút</option>
                            <option value={10}>10 phút</option>
                            <option value={15}>15 phút</option>
                            <option value={30}>30 phút</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* CHÍNH SÁCH HỦY PHÒNG */}
                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-between gap-4">
                    <div>
                      <span className="font-bold text-gray-900 block text-xs">
                        Chính sách miễn phí hủy đặt phòng
                      </span>
                      <p className="text-[11px] text-gray-500">
                        Cho phép khách hủy đơn không mất phí trước thời hạn quy
                        định
                      </p>
                    </div>

                    <select
                      value={hotelForm.cancellation_deadline_hours}
                      onChange={(e) =>
                        setHotelForm({
                          ...hotelForm,
                          cancellation_deadline_hours: Number(e.target.value),
                        })
                      }
                      className="h-10 px-3 border border-gray-300 rounded-xl font-bold bg-white cursor-pointer outline-none focus:border-[#003580] shrink-0"
                    >
                      <option value={24}>Miễn phí hủy trước 24 giờ</option>
                      <option value={48}>Miễn phí hủy trước 48 giờ</option>
                      <option value={72}>Miễn phí hủy trước 72 giờ</option>
                      <option value={0}>Không hoàn tiền khi hủy</option>
                    </select>
                  </div>
                </div>
              )}

              {/* TAB 2: THÔNG TIN CƠ SỞ */}
              {editTab === "info" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block font-bold text-gray-700 mb-1">
                        Tên khách sạn *
                      </label>
                      <input
                        required
                        value={hotelForm.name}
                        onChange={(e) =>
                          setHotelForm({ ...hotelForm, name: e.target.value })
                        }
                        className="w-full h-10 px-3 border border-gray-200 rounded-xl font-bold text-gray-900 bg-white outline-none focus:border-[#003580]"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-gray-700 mb-1">
                        Loại hình *
                      </label>
                      <select
                        value={hotelForm.property_type}
                        onChange={(e) =>
                          setHotelForm({
                            ...hotelForm,
                            property_type: e.target.value,
                          })
                        }
                        className="w-full h-10 px-2.5 border border-gray-200 rounded-xl font-semibold bg-white cursor-pointer outline-none focus:border-[#003580]"
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
                      <label className="block font-bold text-gray-700 mb-1">
                        Hạng sao
                      </label>
                      <select
                        value={hotelForm.star_rating}
                        onChange={(e) =>
                          setHotelForm({
                            ...hotelForm,
                            star_rating: Number(e.target.value),
                          })
                        }
                        className="w-full h-10 px-2.5 border border-gray-200 rounded-xl font-bold bg-white cursor-pointer outline-none focus:border-[#003580]"
                      >
                        {[1, 2, 3, 4, 5].map((s) => (
                          <option key={s} value={s}>
                            {s} Sao {"⭐".repeat(s)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block font-bold text-gray-700 mb-1">
                        Link ảnh đại diện mặt tiền (URL)
                      </label>
                      <input
                        value={hotelForm.image}
                        onChange={(e) =>
                          setHotelForm({ ...hotelForm, image: e.target.value })
                        }
                        placeholder="https://images.unsplash.com/..."
                        className="w-full h-10 px-3 border border-gray-200 rounded-xl bg-white outline-none focus:border-[#003580]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">
                        Tỉnh / Thành phố *
                      </label>
                      <input
                        required
                        value={hotelForm.city}
                        onChange={(e) =>
                          setHotelForm({ ...hotelForm, city: e.target.value })
                        }
                        className="w-full h-10 px-3 border border-gray-200 rounded-xl font-semibold bg-white outline-none focus:border-[#003580]"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block font-bold text-gray-700 mb-1">
                        Địa chỉ chi tiết *
                      </label>
                      <input
                        required
                        value={hotelForm.address}
                        onChange={(e) =>
                          setHotelForm({
                            ...hotelForm,
                            address: e.target.value,
                          })
                        }
                        className="w-full h-10 px-3 border border-gray-200 rounded-xl bg-white outline-none focus:border-[#003580]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-gray-700 mb-1 flex items-center gap-1">
                        <Phone size={12} /> Hotline lễ tân (khách thấy trên web)
                      </label>
                      <input
                        value={hotelForm.phone}
                        onChange={(e) =>
                          setHotelForm({ ...hotelForm, phone: e.target.value })
                        }
                        className="w-full h-10 px-3 border border-gray-200 rounded-xl bg-white outline-none focus:border-[#003580]"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-gray-700 mb-1 flex items-center gap-1">
                        <Mail size={12} /> Email nhận thông báo đơn hàng
                      </label>
                      <input
                        type="email"
                        value={hotelForm.email}
                        onChange={(e) =>
                          setHotelForm({ ...hotelForm, email: e.target.value })
                        }
                        className="w-full h-10 px-3 border border-gray-200 rounded-xl bg-white outline-none focus:border-[#003580]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      Mô tả giới thiệu cơ sở
                    </label>
                    <textarea
                      rows={3}
                      value={hotelForm.description}
                      onChange={(e) =>
                        setHotelForm({
                          ...hotelForm,
                          description: e.target.value,
                        })
                      }
                      placeholder="Nhập mô tả giới thiệu chỗ nghỉ..."
                      className="w-full p-3 border border-gray-200 rounded-xl bg-white outline-none focus:border-[#003580]"
                    />
                  </div>
                </div>
              )}

              {/* TAB 3: TIỆN NGHI */}
              {editTab === "amenities" && (
                <div className="space-y-3">
                  <span className="font-bold text-gray-700 text-xs block">
                    Chọn các tiện ích sẵn có tại cơ sở:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
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
                          className={`flex items-center gap-2.5 p-3 rounded-xl text-left border transition cursor-pointer select-none text-xs ${
                            isChecked
                              ? "bg-blue-50 border-[#006ce4] text-[#003580] font-bold shadow-2xs"
                              : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition ${
                              isChecked
                                ? "bg-[#003580] border-[#003580] text-white"
                                : "border-gray-300 bg-white"
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
              )}

              {/* TAB 4: NGÂN HÀNG & THUẾ */}
              {editTab === "bank" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">
                        Ngân hàng thụ hưởng *
                      </label>
                      <select
                        value={hotelForm.bank_code || "VCB"}
                        onChange={(e) => {
                          const selectedCode = e.target.value;
                          const b = VIETNAM_BANKS.find(
                            (item) => item.code === selectedCode,
                          );
                          setHotelForm({
                            ...hotelForm,
                            bank_code: selectedCode,
                            bank_name: b ? b.name : selectedCode,
                          });
                        }}
                        className="w-full h-10 px-2.5 border border-gray-200 rounded-xl font-semibold bg-white cursor-pointer outline-none focus:border-[#003580]"
                      >
                        {VIETNAM_BANKS.map((b) => (
                          <option key={b.code} value={b.code}>
                            {b.name} ({b.code})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-gray-700 mb-1">
                        Số tài khoản nhận tiền *
                      </label>
                      <input
                        value={hotelForm.bank_account}
                        onChange={(e) =>
                          setHotelForm({
                            ...hotelForm,
                            bank_account: e.target.value.trim(),
                          })
                        }
                        placeholder="Nhập số tài khoản..."
                        className="w-full h-10 px-3 border border-gray-200 rounded-xl font-mono text-[#003580] font-bold bg-white outline-none focus:border-[#003580]"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-gray-700 mb-1">
                        Tên chủ tài khoản (in hoa) *
                      </label>
                      <input
                        value={hotelForm.bank_account_holder}
                        onChange={(e) =>
                          setHotelForm({
                            ...hotelForm,
                            bank_account_holder: e.target.value.toUpperCase(),
                          })
                        }
                        placeholder="VD: NGUYEN VAN A"
                        className="w-full h-10 px-3 border border-gray-200 rounded-xl font-bold uppercase bg-white outline-none focus:border-[#003580]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      Mã số thuế doanh nghiệp / Hộ kinh doanh
                    </label>
                    <input
                      value={hotelForm.tax_code}
                      onChange={(e) =>
                        setHotelForm({ ...hotelForm, tax_code: e.target.value })
                      }
                      placeholder="VD: 0101234567"
                      className="w-full h-10 px-3 border border-gray-200 rounded-xl font-mono bg-white outline-none focus:border-[#003580]"
                    />
                  </div>
                </div>
              )}

              {/* MODAL FOOTER */}
              <div className="flex justify-end gap-2.5 pt-4 border-t border-gray-100 shrink-0">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setEditingHotel(null)}
                  className="px-5 py-2.5 border border-gray-200 rounded-xl font-bold cursor-pointer hover:bg-gray-50 text-gray-700 transition disabled:opacity-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-7 py-2.5 bg-[#003580] hover:bg-blue-900 text-white font-bold rounded-xl cursor-pointer shadow-md transition active:scale-95 disabled:opacity-50"
                >
                  {submitting ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
