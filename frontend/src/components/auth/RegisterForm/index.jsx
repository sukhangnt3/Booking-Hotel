import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../../../services/apiClient";

// Import các Step con
import Step1GeneralAndRooms from "./Step1GeneralAndRooms";
import Step2MediaAndLegal from "./Step2MediaAndLegal";
import Step3ContractAndPayment from "./Step3ContractAndPayment";
import Step4PoliciesAndOperations from "./Step4PoliciesAndOperations";
import AuditReportView from "./AuditReportView";
import ReviewModal from "./ReviewModal";
import SubmittedSuccessView from "./SubmittedSuccessView";

import {
  Check,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  Eye,
  Send,
  RotateCcw,
  Sparkles,
  Home,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";

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
  ward: "",
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

  // Các trường quy định động Bước 4
  checkInFrom: "14:00",
  checkInTo: "23:59",
  checkOutFrom: "06:00",
  checkOutTo: "12:00",
  cancellationPolicy: "flexible_24h",
  hasBreakfast: "free",
  allowChildren: "yes",
  allowPets: "no",
  propertyAmenities: ["wifi", "parking", "24h_front_desk"],

  // 🛑 DANH SÁCH QUY ĐỊNH & TRẢI NGHIỆM ĐỘNG
  policies: [
    {
      id: "pol-1",
      title: "Di chuyển",
      content:
        "- Máy bay: Đến sân bay trung tâm cách chỗ nghỉ khoảng 25 phút đi taxi.\n- Tàu cao tốc / Xe khách: Có xe đưa đón tận bến theo yêu cầu.",
    },
    {
      id: "pol-2",
      title: "Hướng dẫn nhận phòng",
      content:
        "- Tất cả khách hàng xuất trình CCCD/Hộ chiếu bản gốc khi làm thủ tục.\n- Khách sạn có thể yêu cầu đặt cọc (Deposit) và hoàn trả khi trả phòng.",
    },
  ],
  experiences: [
    {
      id: "exp-1",
      title: "Khu mua sắm & Chợ đêm",
      content:
        "Cách chỗ nghỉ 500m (5 phút đi bộ), hoạt động sầm uất với hàng trăm gian hàng ẩm thực và quà lưu niệm.",
    },
  ],

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
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [isRestored, setIsRestored] = useState(false);

  const { user, isAuthenticated } = useAuthStore();
  const isExistingUser = Boolean(isAuthenticated && user && user.email);

  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [submittedApplication, setSubmittedApplication] = useState(null);

  // ════════════════════════════════════════════════════════════════════════════
  // 🔄 1. TỰ ĐỘNG ĐIỀN THÔNG TIN TÀI KHOẢN
  // ════════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    try {
      const currentUser =
        user || JSON.parse(localStorage.getItem("user") || "null");

      if (currentUser && currentUser.email) {
        setFormData((prev) => ({
          ...prev,
          ownerName:
            currentUser.full_name ||
            currentUser.name ||
            prev.ownerName ||
            "Chủ cơ sở",
          emailContact: currentUser.email || prev.emailContact,
          phoneContact:
            currentUser.phone ||
            currentUser.phone_number ||
            prev.phoneContact ||
            "0901234567",
          signerName:
            prev.signerName ||
            currentUser.full_name ||
            currentUser.name ||
            "Người đại diện",
          signerEmail: prev.signerEmail || currentUser.email || "",
          signerPhone: prev.signerPhone || currentUser.phone || "0901234567",
          bankAccountName:
            prev.bankAccountName || currentUser.full_name || "CHỦ TÀI KHOẢN",
        }));
      }
    } catch (err) {
      console.warn("Lỗi khởi tạo Form:", err);
    }
  }, [user]);

  const handleChange = (updatedFields) => {
    setFormData((prev) => {
      const merged = { ...prev, ...updatedFields };
      if (updatedFields.hotelNameVi && !updatedFields.hotelName) {
        merged.hotelName = updatedFields.hotelNameVi;
      }
      if (updatedFields.hotelName && !updatedFields.hotelNameVi) {
        merged.hotelNameVi = updatedFields.hotelName;
      }
      if (updatedFields.streetAddress && !updatedFields.address) {
        merged.address = updatedFields.streetAddress;
      }
      if (updatedFields.address && !updatedFields.streetAddress) {
        merged.streetAddress = updatedFields.address;
      }
      return merged;
    });
    setErrors({});
  };

  // ════════════════════════════════════════════════════════════════════════════
  // 🔍 2. KIỂM TRA HỢP LỆ
  // ════════════════════════════════════════════════════════════════════════════
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
        if (!formData.password || formData.password.length < 6) {
          err.password = "Mật khẩu phải từ 6 ký tự!";
        }
      }

      if (!hotelTitle.trim()) {
        err.hotelNameVi = "Vui lòng nhập tên chỗ nghỉ!";
        err.hotelName = "Vui lòng nhập tên chỗ nghỉ!";
      }

      if (!hotelAddr.trim()) {
        err.streetAddress = "Vui lòng nhập địa chỉ chi tiết!";
        err.address = "Vui lòng nhập địa chỉ chi tiết!";
      }
    } else if (currentStep === 2) {
      const hasImages =
        (formData.hotelImages && formData.hotelImages.length > 0) ||
        Boolean(formData.image) ||
        Boolean(formData.hotelMainImage);

      if (!hasImages) {
        err.hotelImages = "Vui lòng tải lên ít nhất 1 hình ảnh!";
      }
    } else if (currentStep === 3) {
      if (!formData.signerName) err.signerName = "Vui lòng nhập tên người ký!";
      if (!formData.bankAccount)
        err.bankAccount = "Vui lòng nhập số tài khoản!";
    }

    setErrors(err);

    if (Object.keys(err).length > 0) {
      const firstErrorMsg = Object.values(err)[0];
      alert(`⚠️ ${firstErrorMsg}`);
      return false;
    }

    return true;
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      setCurrentStep((prev) => Math.min(prev + 1, 4));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // ════════════════════════════════════════════════════════════════════════════
  // 👈 NÚT QUAY LẠI: Ở BƯỚC 1 SẼ VỀ TRANG CHỦ, Ở BƯỚC 2-3-4 SẼ LÙI BƯỚC
  // ════════════════════════════════════════════════════════════════════════════
  const handleBack = () => {
    if (currentStep === 1) {
      navigate("/"); // Bấm ở Bước 1 sẽ quay về Trang chủ an toàn
    } else {
      setCurrentStep((prev) => Math.max(prev - 1, 1));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // ════════════════════════════════════════════════════════════════════════════
  // 🚀 3. NỘP HỒ SƠ & ĐỒNG BỘ TOÀN DIỆN
  // ════════════════════════════════════════════════════════════════════════════
  const handleFinalSubmit = async () => {
    if (!validateCurrentStep()) {
      setIsReviewOpen(false);
      return;
    }
    setLoading(true);

    const ownerEmailKey = String(formData.emailContact || user?.email || "")
      .toLowerCase()
      .trim();

    try {
      const cleanImages = (formData.hotelImages || [])
        .map((img) =>
          typeof img === "string" ? img : img.url || img.preview || "",
        )
        .filter(Boolean);

      const mainCoverImg =
        formData.image ||
        formData.hotelMainImage ||
        cleanImages[0] ||
        "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800";

      const cleanDocs = (formData.legalDocuments || []).map((doc) => ({
        name: doc.name || "Tài liệu",
        url: doc.url || doc.preview || "",
        docType: doc.docType || "business_license",
      }));

      // Tự động đảm bảo luôn có phòng tiêu chuẩn
      const rawRoomsList =
        formData.rooms && formData.rooms.length > 0
          ? formData.rooms
          : [initialFormData.rooms[0]];

      const formattedRooms = rawRoomsList.map((r, idx) => ({
        id: r.id || `room-${idx + 1}`,
        roomName: r.roomName || r.name || `Phòng Tiêu Chuẩn ${idx + 1}`,
        name: r.roomName || r.name || `Phòng Tiêu Chuẩn ${idx + 1}`,
        bedType:
          r.bedType || r.bed_type || "1 Giường đôi lớn (King/Queen Size)",
        bed_type:
          r.bedType || r.bed_type || "1 Giường đôi lớn (King/Queen Size)",
        roomSize: Number(r.roomSize || r.room_area) || 28,
        room_area: Number(r.roomSize || r.room_area) || 28,
        maxAdults: Number(r.maxAdults || r.capacity) || 2,
        capacity: Number(r.maxAdults || r.capacity) || 2,
        maxChildren: Number(r.maxChildren) || 0,
        totalRooms: Number(r.totalRooms || r.room_count) || 5,
        room_count: Number(r.totalRooms || r.room_count) || 5,
        weekdayPrice: Number(r.weekdayPrice || r.sell_price) || 650000,
        sell_price: Number(r.weekdayPrice || r.sell_price) || 650000,
        weekendPrice: Number(r.weekendPrice) || 800000,
        image: r.image || mainCoverImg,
        hasPrivateBathroom: Boolean(r.hasPrivateBathroom ?? true),
        hasBalcony: Boolean(r.hasBalcony),
        hasWindow: Boolean(r.hasWindow ?? true),
        roomAmenities: r.roomAmenities || [
          "wifi",
          "air_conditioner",
          "tv_smart",
        ],
      }));

      const baseMinPrice = Math.min(
        ...formattedRooms.map((r) => Number(r.weekdayPrice || 650000)),
      );

      const hotelNameFinal =
        formData.hotelNameVi || formData.hotelName || "Chỗ nghỉ GoStay";
      const hotelAddressFinal =
        formData.streetAddress || formData.address || "Việt Nam";

      const payload = {
        owner_id: user?.id || null,
        ownerName: formData.ownerName || user?.full_name || "Chủ cơ sở",
        full_name: formData.ownerName || user?.full_name || "Chủ cơ sở",
        emailContact: ownerEmailKey,
        email: ownerEmailKey,
        phoneContact: formData.phoneContact || user?.phone || "0901234567",
        phone: formData.phoneContact || user?.phone || "0901234567",
        password: formData.password || undefined,
        role: "owner",

        activate: false,
        status: "pending",
        is_approved: false,

        hotelNameVi: hotelNameFinal,
        hotelNameEn: formData.hotelNameEn || hotelNameFinal,
        name: hotelNameFinal,
        hotelType: formData.hotelType || "hotel",
        type: formData.hotelType || "hotel",
        starRating: Number(formData.starRating) || 5,
        website: formData.website || "",
        description: formData.description || "",
        province: formData.province || "Hồ Chí Minh",
        city: formData.province || "Hồ Chí Minh",
        district: formData.district || "",
        ward: formData.ward || "",
        streetAddress: hotelAddressFinal,
        address: hotelAddressFinal,
        latitude: formData.latitude || 10.7769,
        longitude: formData.longitude || 106.7009,

        image: mainCoverImg,
        hotelImages: cleanImages.length > 0 ? cleanImages : [mainCoverImg],
        images: cleanImages.length > 0 ? cleanImages : [mainCoverImg],

        rooms: formattedRooms,
        roomTypes: formattedRooms,
        weekdayPrice: baseMinPrice,
        min_price: baseMinPrice,
        price: baseMinPrice,

        businessType: formData.businessType || "company",
        legalDocuments: cleanDocs,

        signerName:
          formData.signerName || formData.ownerName || "Người đại diện",
        signerPosition: formData.signerPosition || "Chủ sở hữu",
        signerIdNumber: formData.signerIdNumber || "",
        signerPhone:
          formData.signerPhone || formData.phoneContact || "0901234567",
        signerEmail: formData.signerEmail || ownerEmailKey,
        taxCode: formData.taxCode || "",
        bankCode: formData.bankCode || "VCB",
        bankName: formData.bankName || "Vietcombank",
        bankAccount: formData.bankAccount || "1234567890",
        bankAccountName:
          formData.bankAccountName || formData.ownerName || "CHỦ TÀI KHOẢN",
        bankBranch: formData.bankBranch || "",
        payoutCycle: formData.payoutCycle || "weekly",
        commissionRate: Number(formData.commissionRate) || 18,

        // Các quy định từ Bước 4
        checkInFrom: formData.checkInFrom || "14:00",
        checkInTo: formData.checkInTo || "23:59",
        checkOutFrom: formData.checkOutFrom || "06:00",
        checkOutTo: formData.checkOutTo || "12:00",
        cancellationPolicy: formData.cancellationPolicy || "flexible_24h",
        hasBreakfast: formData.hasBreakfast || "free",
        allowChildren: formData.allowChildren || "yes",
        allowPets: formData.allowPets || "no",
        propertyAmenities: formData.propertyAmenities || [
          "wifi",
          "parking",
          "24h_front_desk",
        ],

        // 🛑 LƯU QUY ĐỊNH & TRẢI NGHIỆM ĐỘNG CỦA OWNER
        policies: formData.policies || initialFormData.policies,
        experiences: formData.experiences || initialFormData.experiences,
        customPolicies: formData.policies || initialFormData.policies,
        nearbyExperiences: formData.experiences || initialFormData.experiences,
      };

      let response = null;
      try {
        response = await apiClient.post("/partner/register", payload);
      } catch (apiErr) {
        console.warn("Lưu hồ sơ fallback:", apiErr);
      }

      const generatedAppId =
        response?.data?.applicationId ||
        `GST-${Date.now().toString().slice(-6)}`;
      const generatedHotelId =
        response?.data?.hotelId || `HT-${Date.now().toString().slice(-4)}`;

      // 1. Xóa án phạt cũ
      if (ownerEmailKey) {
        const rejectedRecords = JSON.parse(
          localStorage.getItem("rejected_owner_records") || "{}",
        );
        delete rejectedRecords[ownerEmailKey];
        localStorage.setItem(
          "rejected_owner_records",
          JSON.stringify(rejectedRecords),
        );
      }

      // 2. Thêm vào danh sách chờ duyệt
      const pendingList = JSON.parse(
        localStorage.getItem("pending_partner_applications") || "[]",
      );
      const newApplication = {
        id: generatedHotelId,
        applicationId: generatedAppId,
        ...payload,
        status: "pending",
        activate: false,
        created_at: new Date().toISOString(),
      };

      pendingList.unshift(newApplication);
      localStorage.setItem(
        "pending_partner_applications",
        JSON.stringify(pendingList),
      );

      // 3. Lưu phòng trực tiếp vào kho
      localStorage.setItem(
        `hotel_rooms_${generatedHotelId}`,
        JSON.stringify(formattedRooms),
      );
      localStorage.setItem(
        `hotel_rooms_${hotelNameFinal.toLowerCase().trim()}`,
        JSON.stringify(formattedRooms),
      );

      setSubmittedApplication({
        applicationId: generatedAppId,
        hotelId: generatedHotelId,
        submittedAt: new Date().toISOString(),
        data: payload,
      });

      setIsReviewOpen(false);
    } catch (error) {
      console.error("Lỗi nộp hồ sơ:", error);
      alert("Đăng ký thất bại, vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetForm = () => {
    setFormData(initialFormData);
    setSubmittedApplication(null);
    setCurrentStep(1);
    setIsRestored(false);
  };

  if (submittedApplication) {
    return (
      <SubmittedSuccessView
        application={submittedApplication}
        onReset={handleResetForm}
      />
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 space-y-8 animate-fadeIn font-sans text-slate-800">
      {/* HEADER & STEPPER */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900">
              {isExistingUser
                ? "Đăng Ký Thêm Cơ Sở Lưu Trú Mới"
                : "Đăng Ký Cơ Sở Lưu Trú Đối Tác"}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              {isExistingUser
                ? "Thêm cơ sở lưu trú mới vào tài khoản đối tác hiện tại của bạn"
                : "Quy trình 4 bước tạo tài khoản & đăng ký niêm yết theo chuẩn OTA"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsAuditOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold text-xs rounded-xl border border-blue-200 transition cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" /> Kiểm tra Chuẩn OTA
            </button>
          </div>
        </div>

        {/* STEPPER CHO PHÉP CHUYỂN BƯỚC LINH HOẠT */}
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
                    ? "border-blue-600 bg-blue-50/50 shadow-xs"
                    : isCompleted
                      ? "border-emerald-300 bg-emerald-50/40"
                      : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
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
                  <p
                    className={`text-xs font-bold truncate ${
                      isCurrent ? "text-blue-900" : "text-slate-700"
                    }`}
                  >
                    {s.title}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RENDER STEP HIỆN TẠI */}
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

      {/* FOOTER ĐIỀU HƯỚNG */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col-reverse sm:flex-row items-center justify-between gap-4">
        {/* NÚT QUAY LẠI: Ở BƯỚC 1 SẼ VỀ TRANG CHỦ, Ở BƯỚC 2-3-4 SẼ LÙI BƯỚC */}
        <button
          type="button"
          onClick={handleBack}
          className="w-full sm:w-auto px-6 h-11 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
        >
          {currentStep === 1 ? (
            <>
              <Home className="w-4 h-4" /> Quay lại trang chủ
            </>
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" /> Quay lại Bước{" "}
              {currentStep - 1}
            </>
          )}
        </button>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setIsReviewOpen(true)}
            className="flex-1 sm:flex-none px-5 h-11 border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <Eye className="w-4 h-4" /> Xem lại hồ sơ
          </button>

          {currentStep < 4 ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex-1 sm:flex-none px-8 h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-200 flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              Tiếp tục <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsReviewOpen(true)}
              className="flex-1 sm:flex-none px-8 h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-200 flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Send className="w-4 h-4" /> Hoàn tất & Nộp hồ sơ
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

      {isAuditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-2xl">
            <AuditReportView
              data={formData}
              onClose={() => setIsAuditOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default RegisterForm;
