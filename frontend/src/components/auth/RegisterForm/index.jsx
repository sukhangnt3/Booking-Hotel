// src/components/auth/RegisterForm/index.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

// 👉 IMPORT ĐỦ 8 BƯỚC CHUẨN AGODA
import { Step1HotelInfo } from "./Step1HotelInfo.jsx";
import { Step2Amenities } from "./Step2Amenities.jsx";
import { Step3RoomsAndPricing } from "./Step3RoomsAndPricing.jsx";
import { Step4PricingAndPayout } from "./Step4PricingAndPayout.jsx";
import { Step5PhotoGallery } from "./Step5PhotoGallery.jsx";
import { Step6PropertyDetails } from "./Step6PropertyDetails.jsx";
import { Step7HostProfile } from "./Step7HostProfile.jsx";
import { Step8Publish } from "./Step8Publish.jsx";
import { ReviewModal } from "./ReviewModal.jsx";
import SubmittedSuccessView from "./SubmittedSuccessView.jsx";

import {
  Check,
  ChevronRight,
  ChevronLeft,
  Eye,
  AlertCircle,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import apiClient from "@/services/apiClient";

const initialFormData = {
  // 1. Vị trí
  province: "Hồ Chí Minh",
  city: "Hồ Chí Minh",
  district: "Quận 1",
  address: "",
  buildingInfo: "",
  zipCode: "",
  latitude: 10.7769,
  longitude: 106.7009,

  // 2. Tiện nghi
  propertyAmenities: ["wifi", "parking", "24h_front_desk", "air_conditioner"],

  // 3. Phòng & Giá cơ bản
  rooms: [
    {
      id: "room-default-1",
      name: "Phòng Cao Cấp (Deluxe)",
      room_view: "city_view",
      bed_type: "1 Giường đôi lớn (King/Queen Size)",
      room_area: 28,
      capacity: 2,
      amount: 4,
      roomNumbersText: "P.101, P.102, P.103, P.104",
      base_price: 650000,
      description: "Phòng nghỉ hiện đại, tiện nghi.",
      type: "Deluxe",
      roomAmenities: [
        "air_conditioner",
        "tv_smart",
        "wifi",
        "hot_water_shower",
      ],
    },
  ],
  hasBreakfast: "no",

  // 4. Khuyến mại & Phương thức nhận tiền VN
  enableFirstBookingDiscount: true,
  payoutMethod: "bank_transfer",
  bankName: "Vietcombank",
  bankAccount: "",
  bankAccountHolder: "",

  // 5. Hình ảnh
  hotelMainImage: "",
  hotelImages: [],

  // 6. Chi tiết (Tên, Sao, Giờ, Hủy)
  hotelName: "",
  propertyType: "hotel",
  starRating: 3,
  description: "",
  checkInFrom: "14:00",
  checkInTo: "23:59",
  checkOutTo: "12:00",
  cancellation_deadline_hours: 24,

  // 7. Hồ sơ Host
  firstName: "",
  lastName: "",
  ownerName: "",
  nationality: "Việt Nam",
  dob: "1995-01-01",
  residenceCountry: "Việt Nam",
  preferredLanguage: "Tiếng Việt",
  phoneContact: "",
  emailContact: "",
  password: "",

  // 8. Đăng tải
  taxCode: "",
  businessLicenseUrl: "",
  commissionRate: 18.0,
  acceptedTerms: false,
};

// 👉 8 BƯỚC CHUẨN MENU TRÁI AGODA
const AGODA_STEPS = [
  { id: 1, title: "Vị trí" },
  { id: 2, title: "Tiện nghi" },
  { id: 3, title: "Phòng" },
  { id: 4, title: "Định giá" },
  { id: 5, title: "Ảnh" },
  { id: 6, title: "Chi tiết" },
  { id: 7, title: "Hồ sơ" },
  { id: 8, title: "Đăng" },
];

export const RegisterForm = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editHotelId = searchParams.get("editHotelId");

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const { user, isAuthenticated } = useAuthStore();

  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [submittedApplication, setSubmittedApplication] = useState(null);

  useEffect(() => {
    if (user && user.email) {
      setFormData((prev) => ({
        ...prev,
        ownerName: user.full_name || prev.ownerName,
        emailContact: user.email,
        phoneContact: user.phone || prev.phoneContact || "0901234567",
        bankAccountHolder:
          user.full_name?.toUpperCase() || prev.bankAccountHolder,
      }));
    }
  }, [user]);

  const handleChange = (updatedFields) => {
    setFormData((prev) => ({ ...prev, ...updatedFields }));
    setErrors((prevErrors) => {
      const newErrors = { ...prevErrors };
      Object.keys(updatedFields).forEach((key) => delete newErrors[key]);
      return newErrors;
    });
  };

  const validateCurrentStep = () => {
    const err = {};

    if (currentStep === 1) {
      if (!formData.address?.trim())
        err.address = "Vui lòng nhập địa chỉ đường phố!";
    }
    if (currentStep === 3) {
      if (!formData.rooms || formData.rooms.length === 0) {
        err.rooms = "Cần ít nhất 1 phòng để mở bán!";
      }
    }
    if (currentStep === 5) {
      if (!formData.hotelImages || formData.hotelImages.length < 3) {
        err.hotelImages = "Thêm ít nhất 3 ảnh để tiếp tục!";
      }
    }
    if (currentStep === 6) {
      if (!formData.hotelName?.trim())
        err.hotelName = "Vui lòng nhập tên cơ sở lưu trú!";
    }
    if (currentStep === 7) {
      if (!formData.ownerName?.trim())
        err.ownerName = "Vui lòng nhập họ và tên!";
      if (!formData.phoneContact?.trim())
        err.phoneContact = "Vui lòng nhập số điện thoại!";
    }
    if (currentStep === 8) {
      if (!formData.acceptedTerms)
        err.acceptedTerms =
          "Quý đối tác cần đồng ý với Điều khoản để đăng tải!";
    }

    setErrors(err);
    if (Object.keys(err).length > 0) {
      window.scrollTo({ top: 100, behavior: "smooth" });
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      setCurrentStep((prev) => Math.min(prev + 1, 8));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleBack = () => {
    if (currentStep === 1) navigate("/owner/hotels");
    else {
      setCurrentStep((prev) => Math.max(prev - 1, 1));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const sanitizeTimeToPostgres = (timeStr, defaultTime) => {
    if (!timeStr) return defaultTime;
    const match = String(timeStr).match(/^(\d{1,2}):(\d{2})/);
    return match ? `${match[1].padStart(2, "0")}:${match[2]}:00` : defaultTime;
  };

  // ════════════════════════════════════════════════════════════════════════════
  // 🚀 NỘP HỒ SƠ LÊN POSTGRESQL (BƯỚC 8 ĐĂNG TẢI)
  // ════════════════════════════════════════════════════════════════════════════
  const handleFinalSubmit = async () => {
    if (!validateCurrentStep()) {
      setIsReviewOpen(false);
      return;
    }
    setLoading(true);

    try {
      const processedRooms = formData.rooms.map((r, rIdx) => {
        let numbers = [];
        if (r.roomNumbersText) {
          numbers = r.roomNumbersText
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        }
        if (numbers.length === 0) {
          const count = Number(r.amount || 4);
          for (let i = 1; i <= count; i++) numbers.push(`P.${rIdx + 1}0${i}`);
        }

        return {
          name: r.name || `Phòng Hạng ${rIdx + 1}`,
          capacity: Number(r.capacity || 2),
          base_price: Number(r.base_price || 650000),
          description: r.description || "Phòng nghỉ tiêu chuẩn cao cấp",
          type: r.type || "Deluxe",
          room_view: r.room_view || "city_view",
          bed_type: r.bed_type || "1 Giường đôi lớn (King/Queen Size)",
          room_area: Number(r.room_area || 28),
          amount: numbers.length,
          room_numbers: numbers,
          amenities: r.roomAmenities || [],
        };
      });

      const allImages = (formData.hotelImages || []).map((img, idx) => ({
        path: img.url,
        is_thumbnail: img.url === formData.hotelMainImage,
        room_id: img.roomId || null,
        display_order: idx,
      }));

      const payload = {
        name: formData.hotelName || "Cơ sở lưu trú",
        property_type: formData.propertyType || "hotel",
        address: formData.address,
        city: formData.city || formData.province || "Hồ Chí Minh",
        latitude: Number(formData.latitude || 10.7769),
        longitude: Number(formData.longitude || 106.7009),
        phone: formData.phoneContact || user?.phone || "0900000000",
        email: formData.emailContact || user?.email || "hotel@contact.com",
        star_rating: Number(formData.starRating || 3),
        description: formData.description || "Khách sạn chất lượng cao.",
        checkin_time: sanitizeTimeToPostgres(formData.checkInFrom, "14:00:00"),
        checkout_time: sanitizeTimeToPostgres(formData.checkOutTo, "12:00:00"),
        cancellation_deadline_hours: Number(
          formData.cancellation_deadline_hours || 24,
        ),
        bank_name: formData.bankName || "Vietcombank",
        bank_account: formData.bankAccount || "Chưa cập nhật",
        bank_account_holder: formData.bankAccountHolder || formData.ownerName,
        tax_code: formData.taxCode || null,
        business_license_url: formData.businessLicenseUrl || null,
        commission_rate: Number(formData.commissionRate || 18.0),

        image: formData.hotelMainImage || allImages[0]?.path || "",
        owner_name: formData.ownerName,
        owner_phone: formData.phoneContact,
        owner_email: formData.emailContact,
        password: formData.password || "123456",

        rooms: processedRooms,
        amenities: formData.propertyAmenities,
        images: allImages,
      };

      const res = await apiClient.post("/hotels/register", payload);
      const createdHotel = res.hotel || res.data?.hotel || res.data || res;

      alert(
        "🎉 Đăng tải thành công! Hồ sơ cơ sở lưu trú của quý đối tác đã được gửi lên hệ thống.",
      );

      setSubmittedApplication({
        applicationId:
          createdHotel.id || `AGD-${Date.now().toString().slice(-6)}`,
        hotelId: createdHotel.id,
        submittedAt: new Date().toISOString(),
        data: createdHotel,
      });

      setIsReviewOpen(false);
    } catch (err) {
      console.error("Lỗi đăng tải:", err);
      alert(`Lỗi: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (submittedApplication) {
    return (
      <SubmittedSuccessView
        application={submittedApplication}
        onReset={() => navigate("/owner/hotels")}
      />
    );
  }

  return (
    <div className="min-h-screen bg-white font-sans text-slate-800 pb-16">
      {/* ── TOP HEADER AGODA STYLE ── */}
      <header className="border-b border-slate-100 py-3.5 px-6 sm:px-12 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Logo các chấm màu đặc trưng Agoda */}
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
          </div>
          <span className="font-extrabold text-base tracking-tight text-slate-900 ml-1.5">
            agoda
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs font-semibold text-slate-600">
          <button
            onClick={() => navigate("/owner/hotels")}
            className="hover:underline cursor-pointer text-slate-500"
          >
            Lưu và thoát
          </button>
          <span className="text-base cursor-pointer" title="Tiếng Việt">
            🇻🇳
          </span>
        </div>
      </header>

      {/* ── KHUNG GIAO DIỆN CHÍNH (CỘT TRÁI STEPPER + NỘI DUNG PHẢI) ── */}
      <div className="max-w-6xl mx-auto pt-8 px-4 sm:px-8 grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* ── CỘT MENU BÊN TRÁI: STEPPER 8 BƯỚC AGODA ── */}
        <div className="hidden md:block md:col-span-3 lg:col-span-3 pr-4">
          <div className="sticky top-8 space-y-0">
            {AGODA_STEPS.map((s, idx) => {
              const isPassed = currentStep > s.id;
              const isCurrent = currentStep === s.id;

              return (
                <div key={s.id} className="relative flex items-start group">
                  {/* Đường kẻ nối dọc */}
                  {idx < AGODA_STEPS.length - 1 && (
                    <div
                      className={`absolute left-[13px] top-7 w-[2px] h-8 -ml-[0.5px] ${
                        isPassed ? "bg-blue-600" : "bg-slate-200"
                      }`}
                    />
                  )}

                  {/* Vòng tròn số bước */}
                  <div
                    onClick={() => s.id <= currentStep && setCurrentStep(s.id)}
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition cursor-pointer z-10 ${
                      isPassed
                        ? "bg-blue-600 text-white"
                        : isCurrent
                          ? "bg-blue-600 text-white ring-4 ring-blue-100"
                          : "bg-white border-2 border-slate-300 text-slate-400"
                    }`}
                  >
                    {isPassed ? <Check size={13} strokeWidth={3} /> : s.id}
                  </div>

                  {/* Tên bước */}
                  <span
                    onClick={() => s.id <= currentStep && setCurrentStep(s.id)}
                    className={`ml-3 text-xs font-semibold pt-1 cursor-pointer transition ${
                      isCurrent
                        ? "text-blue-600 font-bold"
                        : isPassed
                          ? "text-slate-800"
                          : "text-slate-400"
                    }`}
                  >
                    {s.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── CỘT NỘI DUNG BÊN PHẢI (HIỂN THỊ TỪNG BƯỚC) ── */}
        <div className="md:col-span-9 lg:col-span-8">
          {currentStep === 1 && (
            <Step1HotelInfo
              data={formData}
              onChange={handleChange}
              errors={errors}
            />
          )}
          {currentStep === 2 && (
            <Step2Amenities data={formData} onChange={handleChange} />
          )}
          {currentStep === 3 && (
            <Step3RoomsAndPricing
              data={formData}
              onChange={handleChange}
              errors={errors}
            />
          )}
          {currentStep === 4 && (
            <Step4PricingAndPayout
              data={formData}
              onChange={handleChange}
              errors={errors}
            />
          )}
          {currentStep === 5 && (
            <Step5PhotoGallery
              data={formData}
              onChange={handleChange}
              errors={errors}
            />
          )}
          {currentStep === 6 && (
            <Step6PropertyDetails
              data={formData}
              onChange={handleChange}
              errors={errors}
            />
          )}
          {currentStep === 7 && (
            <Step7HostProfile
              data={formData}
              onChange={handleChange}
              errors={errors}
            />
          )}
          {currentStep === 8 && (
            <Step8Publish
              data={formData}
              onChange={handleChange}
              errors={errors}
            />
          )}

          {/* ── NÚT ĐIỀU HƯỚNG DẠNG VIÊN THUỐC BO TRÒN CHUẨN AGODA ── */}
          <div className="max-w-2xl mx-auto flex items-center justify-between pt-8 mt-8 border-t border-slate-100">
            <button
              type="button"
              onClick={handleBack}
              className="px-8 h-11 border border-slate-300 hover:bg-slate-50 rounded-full font-bold text-xs text-slate-700 transition cursor-pointer"
            >
              Quay trở lại
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsReviewOpen(true)}
                className="px-5 h-11 border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-full font-bold text-xs transition cursor-pointer flex items-center gap-1"
              >
                <Eye size={15} /> Xem lại
              </button>

              {currentStep < 8 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-10 h-11 bg-[#1964d2] hover:bg-blue-700 text-white font-bold text-xs rounded-full shadow-md transition cursor-pointer active:scale-95"
                >
                  Tiếp theo
                </button>
              ) : (
                /* 👉 NÚT ĐĂNG TẢI CHUẨN BƯỚC 8 CỦA AGODA */
                <button
                  type="button"
                  onClick={handleFinalSubmit}
                  disabled={loading}
                  className="px-12 h-11 bg-[#1964d2] hover:bg-blue-700 text-white font-bold text-xs rounded-full shadow-lg transition cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {loading ? "Đang đăng tải..." : "Đăng tải"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <ReviewModal
        data={formData}
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        onConfirmSubmit={handleFinalSubmit}
        loading={loading}
      />
    </div>
  );
};

export default RegisterForm;
