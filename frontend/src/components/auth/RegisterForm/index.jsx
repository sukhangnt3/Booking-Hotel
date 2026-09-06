// src/components/auth/RegisterForm.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import Step1GeneralAndRooms, {
  ROOM_AMENITIES_LIST,
} from "./Step1GeneralAndRooms";
import Step2MediaAndLegal from "./Step2MediaAndLegal";
import Step3ContractAndPayment from "./Step3ContractAndPayment";
import Step4PoliciesAndOperations, {
  DEFAULT_AMENITIES_LIST,
} from "./Step4PoliciesAndOperations";
import ReviewModal from "./ReviewModal";
import SubmittedSuccessView from "./SubmittedSuccessView";

import {
  Check,
  ChevronRight,
  ChevronLeft,
  Send,
  Sparkles,
  Eye,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import apiClient from "@/services/apiClient";

const initialFormData = {
  ownerName: "",
  phoneContact: "",
  emailContact: "",
  password: "",
  confirmPassword: "",

  hotelNameVi: "",
  hotelNameEn: "",
  hotelName: "",
  hotelType: "hotel",
  starRating: 5,
  website: "",
  description: "",
  province: "Hồ Chí Minh",
  city: "Hồ Chí Minh",
  district: "Quận 1",
  streetAddress: "",
  address: "",
  latitude: 10.7769,
  longitude: 106.7009,
  image: "",
  hotelMainImage: "",
  rooms: [
    {
      id: "room-default-1",
      roomName: "Phòng Tiêu Chuẩn Giường Đôi (Deluxe Double)",
      bedType: "1 Giường đôi lớn (King/Queen Size)",
      roomSize: 28,
      maxAdults: 2,
      maxChildren: 1,
      totalRooms: 4,
      roomNumbersText: "P.101, P.102, P.103, P.104", // Gợi ý mặc định 4 phòng
      weekdayPrice: 650000,
      weekendPrice: 800000,
      image: "",
      hasPrivateBathroom: true,
      hasWindow: true,
      roomAmenities: [
        "air_conditioner",
        "tv_smart",
        "wifi",
        "hot_water_shower",
      ],
    },
  ],

  hotelImages: [],
  businessType: "company",
  legalDocuments: [],

  signerName: "",
  signerPosition: "Chủ sở hữu",
  signerIdNumber: "",
  signerPhone: "",
  signerEmail: "",
  taxCode: "",
  bankCode: "VCB",
  bankName: "Vietcombank",
  bankAccount: "",
  bankAccountName: "",
  bankBranch: "",
  payoutCycle: "weekly",
  commissionRate: 18,

  checkInFrom: "14:00",
  checkInTo: "23:59",
  checkOutFrom: "06:00",
  checkOutTo: "12:00",
  cancellationPolicy: "flexible_24h",
  hasBreakfast: "free",
  allowChildren: "yes",
  allowPets: "no",
  propertyAmenities: ["wifi", "parking", "24h_front_desk"],
  policies: [],
  experiences: [],

  acceptedTerms: true,
  confirmedAccuracy: true,
};

const STEPS = [
  { id: 1, title: "Tài khoản & Phòng" },
  { id: 2, title: "Ảnh & Pháp lý" },
  { id: 3, title: "Hợp đồng & Thanh toán" },
  { id: 4, title: "Chính sách vận hành" },
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
  const isExistingUser = Boolean(isAuthenticated && user && user.email);

  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [submittedApplication, setSubmittedApplication] = useState(null);

  useEffect(() => {
    try {
      if (user && user.email) {
        setFormData((prev) => ({
          ...prev,
          ownerName: user.full_name || user.name || prev.ownerName,
          emailContact: user.email,
          phoneContact: user.phone || prev.phoneContact || "0901234567",
          signerName: prev.signerName || user.full_name || "Chủ cơ sở",
          signerEmail: prev.signerEmail || user.email,
          signerPhone: prev.signerPhone || user.phone || "0901234567",
          bankAccountName:
            prev.bankAccountName || user.full_name || "CHỦ TÀI KHOẢN",
        }));
      }
    } catch (err) {
      console.warn(err);
    }
  }, [editHotelId, user]);

  const handleChange = (updatedFields) => {
    setFormData((prev) => {
      const merged = { ...prev, ...updatedFields };
      if (updatedFields.hotelNameVi && !updatedFields.hotelName)
        merged.hotelName = updatedFields.hotelNameVi;
      if (updatedFields.streetAddress && !updatedFields.address)
        merged.address = updatedFields.streetAddress;
      return merged;
    });
    setErrors({});
  };

  const validateCurrentStep = () => {
    const err = {};
    const hotelTitle = formData.hotelNameVi || formData.hotelName || "";
    const hotelAddr = formData.streetAddress || formData.address || "";

    if (currentStep === 1) {
      if (!isExistingUser) {
        if (!formData.ownerName) err.ownerName = "Vui lòng nhập họ tên!";
        if (!formData.phoneContact)
          err.phoneContact = "Vui lòng nhập số điện thoại!";
        if (!formData.emailContact) err.emailContact = "Vui lòng nhập email!";
        if (!formData.password || formData.password.length < 6)
          err.password = "Mật khẩu phải từ 6 ký tự!";
      }
      if (!hotelTitle.trim()) err.hotelNameVi = "Vui lòng nhập tên chỗ nghỉ!";
      if (!hotelAddr.trim()) err.streetAddress = "Vui lòng nhập địa chỉ!";
    }
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      setCurrentStep((prev) => Math.min(prev + 1, 4));
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
    if (match) {
      const h = match[1].padStart(2, "0");
      const m = match[2];
      return `${h}:${m}:00`;
    }
    return defaultTime;
  };

  // ════════════════════════════════════════════════════════════════════════════
  // 🚀 NỘP HỒ SƠ LƯU TRỰC TIẾP VÀO POSTGRESQL (TỰ ĐỘNG LƯU ROOM_UNIT)
  // ════════════════════════════════════════════════════════════════════════════
  const handleFinalSubmit = async () => {
    if (!validateCurrentStep()) {
      setIsReviewOpen(false);
      return;
    }
    setLoading(true);

    try {
      // 1. TÁCH SỐ PHÒNG THỰC TẾ (101, 102...) & TIỆN NGHI
      const processedRooms = (formData.rooms || []).map((r, rIdx) => {
        // Tách chuỗi số phòng người dùng gõ
        let numbers = [];
        if (r.roomNumbersText) {
          numbers = r.roomNumbersText
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        }

        // Nếu chưa gõ thì tự động sinh theo số lượng
        if (numbers.length === 0) {
          const count = Number(r.totalRooms || 4);
          for (let i = 1; i <= count; i++) {
            numbers.push(`P.${rIdx + 1}0${i}`);
          }
        }

        const translatedAmenities = (r.roomAmenities || []).map((amenId) => {
          const found = ROOM_AMENITIES_LIST.find((item) => item.id === amenId);
          return found ? found.label : amenId;
        });

        return {
          roomName: r.roomName || r.name || "Phòng Tiêu Chuẩn",
          name: r.roomName || r.name || "Phòng Tiêu Chuẩn",
          maxAdults: Number(r.maxAdults || r.capacity || 2),
          capacity: Number(r.maxAdults || r.capacity || 2),
          weekdayPrice: Number(r.weekdayPrice || r.base_price || 650000),
          base_price: Number(r.weekdayPrice || r.base_price || 650000),
          sell_price: Number(r.weekdayPrice || r.base_price || 650000),
          weekendPrice: Number(r.weekendPrice || 0),
          totalRooms: numbers.length,
          amount: numbers.length,
          type: r.type || "Deluxe",
          bedType:
            r.bedType || r.bed_type || "1 Giường đôi lớn (King/Queen Size)",
          bed_type:
            r.bedType || r.bed_type || "1 Giường đôi lớn (King/Queen Size)",
          roomSize: Number(r.roomSize || r.room_area || 28),
          room_area: Number(r.roomSize || r.room_area || 28),
          image: r.image || "",
          // 👉 MẢNG CÁC SỐ PHÒNG THỰC TẾ GỬI VÀO BẢNG room_unit
          room_numbers: numbers,
          amenities: translatedAmenities,
        };
      });

      // 2. CHUYỂN TIỆN ÍCH KHÁCH SẠN
      const processedHotelAmenities = (formData.propertyAmenities || []).map(
        (amen) => {
          const found = DEFAULT_AMENITIES_LIST.find((item) => item.id === amen);
          return found ? found.label : amen;
        },
      );

      // 3. TẠO PAYLOAD CHUẨN
      const payload = {
        name:
          formData.hotelNameVi ||
          formData.hotelName ||
          formData.hotelNameEn ||
          "Cơ sở lưu trú GoStay",
        address:
          formData.streetAddress || formData.address || "Địa chỉ chỗ nghỉ",
        city: formData.city || formData.province || "Việt Nam",
        latitude: Number(formData.latitude || 10.7769),
        longitude: Number(formData.longitude || 106.7009),
        phone:
          formData.phoneContact ||
          formData.signerPhone ||
          user?.phone ||
          "0900000000",
        email:
          formData.emailContact ||
          formData.signerEmail ||
          user?.email ||
          "hotel@contact.com",
        star_rating: Number(formData.starRating || 5),
        description:
          formData.description ||
          "Khách sạn tiêu chuẩn tiện nghi cao cấp, phục vụ chu đáo 24/7.",
        checkin_time: sanitizeTimeToPostgres(formData.checkInFrom, "14:00:00"),
        checkout_time: sanitizeTimeToPostgres(formData.checkOutTo, "12:00:00"),
        bank_name: formData.bankName || "Vietcombank",
        bank_account: formData.bankAccount || "123456789",
        bank_account_holder:
          formData.bankAccountName ||
          formData.signerName ||
          user?.full_name ||
          "CHỦ TÀI KHOẢN",
        tax_code: formData.taxCode || "",
        business_license_url:
          formData.legalDocuments?.[0]?.url || formData.image || "",
        image: formData.image || formData.hotelMainImage || "",
        rooms: processedRooms,
        amenities: processedHotelAmenities,
      };

      console.log("👉 [GỬI HỒ SƠ LÊN POSTGRESQL]:", payload);

      const res = await apiClient.post("/hotels/register", payload);
      const createdHotel = res.hotel || res.data?.hotel || res.data || res;

      alert(
        "✓ Nộp hồ sơ thành công! Đã tự động tạo danh sách phòng thực tế và gửi xét duyệt.",
      );

      setSubmittedApplication({
        applicationId:
          createdHotel.id || `GST-${Date.now().toString().slice(-6)}`,
        hotelId: createdHotel.id,
        submittedAt: new Date().toISOString(),
        data: createdHotel,
      });

      setIsReviewOpen(false);
    } catch (err) {
      console.error("Lỗi nộp hồ sơ khách sạn:", err);
      alert(
        "Lỗi nộp hồ sơ: " +
          (err.response?.data?.message ||
            err.message ||
            "Máy chủ từ chối yêu cầu."),
      );
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
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 space-y-8 animate-fadeIn font-sans text-slate-800">
      {editHotelId && (
        <div className="p-4 bg-blue-50 border-2 border-blue-300 rounded-2xl flex items-center justify-between text-xs text-blue-950">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-blue-600 shrink-0" />
            <span>
              Đang chỉnh sửa lại hồ sơ cơ sở:{" "}
              <strong>{formData.hotelNameVi || formData.name}</strong>.
            </span>
          </div>
          <span className="bg-blue-600 text-white font-bold px-2.5 py-0.5 rounded-full text-[10px] uppercase">
            Chế độ nộp lại
          </span>
        </div>
      )}

      {/* Header & Stepper */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900">
            {editHotelId
              ? "Chỉnh Sửa & Nộp Lại Hồ Sơ Chỗ Nghỉ"
              : "Đăng Ký Cơ Sở Lưu Trú Đối Tác"}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Khai báo danh mục hạng phòng và số phòng thực tế của khách sạn để
            quản lý lễ tân
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
          {STEPS.map((s) => {
            const isCompleted = currentStep > s.id;
            const isCurrent = currentStep === s.id;
            return (
              <div
                key={s.id}
                onClick={() => setCurrentStep(s.id)}
                className={`p-3 rounded-xl border flex items-center gap-3 transition cursor-pointer ${
                  isCurrent
                    ? "border-blue-600 bg-blue-50/50"
                    : isCompleted
                      ? "border-emerald-300 bg-emerald-50/40"
                      : "bg-slate-50"
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    isCompleted
                      ? "bg-emerald-600 text-white"
                      : isCurrent
                        ? "bg-blue-600 text-white"
                        : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : s.id}
                </div>
                <div className="truncate">
                  <p className="text-[10px] uppercase font-bold text-slate-400">
                    Bước {s.id}
                  </p>
                  <p className="text-xs font-bold truncate text-slate-800">
                    {s.title}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Form từng bước */}
      <div>
        {currentStep === 1 && (
          <Step1GeneralAndRooms
            data={formData}
            onChange={handleChange}
            errors={errors}
          />
        )}
        {currentStep === 2 && (
          <Step2MediaAndLegal
            data={formData}
            onChange={handleChange}
            errors={errors}
          />
        )}
        {currentStep === 3 && (
          <Step3ContractAndPayment
            data={formData}
            onChange={handleChange}
            errors={errors}
          />
        )}
        {currentStep === 4 && (
          <Step4PoliciesAndOperations
            data={formData}
            onChange={handleChange}
            errors={errors}
          />
        )}
      </div>

      {/* Footer */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex justify-between items-center">
        <button
          type="button"
          onClick={handleBack}
          className="px-6 h-11 border rounded-xl text-slate-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer hover:bg-slate-50"
        >
          <ChevronLeft className="w-4 h-4" />{" "}
          {currentStep === 1
            ? "Quay lại chỗ nghỉ"
            : `Quay lại Bước ${currentStep - 1}`}
        </button>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setIsReviewOpen(true)}
            className="px-5 h-11 border border-blue-200 bg-blue-50 text-blue-600 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
          >
            <Eye className="w-4 h-4" /> Xem lại hồ sơ
          </button>

          {currentStep < 4 ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-8 h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              Tiếp tục <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsReviewOpen(true)}
              className="px-8 h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <Send className="w-4 h-4" />{" "}
              {editHotelId ? "Nộp Lại Hồ Sơ Đã Sửa" : "Hoàn tất & Nộp hồ sơ"}
            </button>
          )}
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
