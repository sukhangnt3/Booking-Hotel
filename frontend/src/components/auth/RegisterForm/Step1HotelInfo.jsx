// src/components/auth/RegisterForm/index.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Check,
  ChevronRight,
  ChevronLeft,
  Eye,
  ShieldCheck,
  Building2,
  HelpCircle,
  Loader2,
} from "lucide-react";

import { Step1HotelInfo } from "./Step1HotelInfo.jsx";
import { Step2Amenities } from "./Step2Amenities.jsx";
import { Step3RoomsAndPricing } from "./Step3RoomsAndPricing.jsx";
import { Step4PricingAndPayout } from "./Step4PricingAndPayout.jsx";
import { Step5PhotoGallery } from "./Step5PhotoGallery.jsx";
import { Step6PropertyDetails } from "./Step6PropertyDetails.jsx";
import { Step7HostProfile } from "./Step7HostProfile.jsx";
import { Step8Publish } from "./Step8Publish.jsx";
import { ReviewModal } from "./ReviewModal.jsx";
import { AuditReportView } from "./AuditReportView.jsx";
import SubmittedSuccessView from "./SubmittedSuccessView.jsx";

import { useAuthStore } from "@/stores/authStore";
import { authService } from "@/services";
import apiClient from "@/services/apiClient";

const initialFormData = {
  isAccountCreated: false,
  ownerId: null,
  ownerName: "",
  phoneContact: "",
  emailContact: "",
  password: "",
  hotelName: "",
  propertyType: "hotel",
  address: "",
  buildingInfo: "",
  residenceCountry: "Việt Nam",
  city: "",
  province: "",
  district: "",
  zipCode: "",
  latitude: 10.7769,
  longitude: 106.7009,
  is_beachfront: false,
  distance_to_center: 1.2,

  propertyAmenities: [],
  rooms: [],
  hasBreakfast: "no",

  enableFirstBookingDiscount: false,
  initialPromoPercent: 0,
  payoutMethod: "bank_transfer",
  bankCode: "VCB",
  bankName: "Vietcombank",
  bankAccount: "",
  bankAccountHolder: "",

  hotelMainImage: "",
  hotelImages: [],

  starRating: 3,
  description: "",
  checkInFrom: "14:00",
  checkInTo: "23:59",
  checkOutTo: "12:00",
  cancellation_deadline_hours: 24,

  firstName: "",
  lastName: "",
  nationality: "Việt Nam",
  dob: "",
  preferredLanguage: "Tiếng Việt",

  taxCode: "",
  businessLicenseUrl: "",
  commissionRate: 18.0,
  acceptedTerms: false,
};

const STEPS = [
  { id: 1, title: "Tài khoản & Chỗ nghỉ" },
  { id: 2, title: "Tiện nghi cơ sở" },
  { id: 3, title: "Hạng phòng & Giá" },
  { id: 4, title: "Quyết toán doanh thu" },
  { id: 5, title: "Bộ sưu tập ảnh" },
  { id: 6, title: "Quy định chỗ nghỉ" },
  { id: 7, title: "Hồ sơ đối tác" },
  { id: 8, title: "Đăng tải mở bán" },
];

export const RegisterForm = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const { user, isAuthenticated, setAuth } = useAuthStore();

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [submittedApplication, setSubmittedApplication] = useState(null);

  useEffect(() => {
    if (user && user.email && isAuthenticated) {
      setFormData((prev) => ({
        ...prev,
        isAccountCreated: true,
        ownerId: user.id || prev.ownerId,
        ownerName: user.full_name || user.name || prev.ownerName,
        emailContact: user.email,
        phoneContact: user.phone || prev.phoneContact,
        bankAccountHolder:
          user.full_name?.toUpperCase() ||
          user.name?.toUpperCase() ||
          prev.bankAccountHolder,
      }));
    }
  }, [user, isAuthenticated]);

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
      const isAlreadyReady = isAuthenticated && Boolean(user?.id);

      if (!isAlreadyReady) {
        if (!formData.ownerName?.trim()) {
          err.ownerName = "Vui lòng nhập họ và tên chủ cơ sở!";
        }
        if (!formData.phoneContact?.trim()) {
          err.phoneContact = "Vui lòng nhập số điện thoại liên lạc!";
        }
        if (!formData.emailContact?.trim()) {
          err.emailContact = "Vui lòng nhập email đăng nhập!";
        } else if (
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.emailContact.trim())
        ) {
          err.emailContact = "Định dạng email không hợp lệ!";
        }
        if (!formData.password || formData.password.length < 6) {
          err.password = "Mật khẩu tối thiểu 6 ký tự!";
        }
      }

      if (!formData.hotelName?.trim()) {
        err.hotelName = "Vui lòng nhập tên cơ sở lưu trú!";
      }
      if (!formData.address?.trim()) {
        err.address = "Vui lòng nhập địa chỉ phố!";
      }
      if (!formData.city?.trim()) {
        err.city = "Vui lòng nhập tên thành phố!";
      }
    }

    if (currentStep === 3) {
      if (!formData.rooms || formData.rooms.length === 0) {
        err.rooms = "Cần ít nhất 1 loại phòng để sẵn sàng mở bán!";
      } else {
        formData.rooms.forEach((r, i) => {
          if (!r.name?.trim()) {
            err[`room_${i}_name`] = "Vui lòng chọn hoặc nhập tên phòng!";
          }
          if (!r.base_price || Number(r.base_price) <= 0) {
            err[`room_${i}_price`] = "Giá bán phòng phải lớn hơn 0 ₫!";
          }
        });
      }
    }

    if (currentStep === 4) {
      if (formData.payoutMethod === "bank_transfer") {
        if (!formData.bankAccount?.trim()) {
          err.bankAccount = "Vui lòng cung cấp số tài khoản ngân hàng!";
        }
        if (!formData.bankAccountHolder?.trim()) {
          err.bankAccountHolder = "Vui lòng nhập tên chủ tài khoản thụ hưởng!";
        }
      }
    }

    if (currentStep === 5) {
      const totalPhotos = (formData.hotelImages || []).length;
      if (totalPhotos < 3) {
        err.hotelImages = "Vui lòng tải lên tối thiểu 3 hình ảnh sắc nét!";
      }
    }

    if (currentStep === 6) {
      if (!formData.checkInFrom) {
        err.checkInFrom = "Vui lòng chọn thời gian nhận phòng!";
      }
      if (!formData.checkOutTo) {
        err.checkOutTo = "Vui lòng chọn thời gian trả phòng!";
      }
    }

    if (currentStep === 8) {
      if (!formData.acceptedTerms) {
        err.acceptedTerms =
          "Quý đối tác cần đọc và chấp nhận mức hoa hồng sàn cùng Quy chế hoạt động!";
      }
    }

    setErrors(err);
    if (Object.keys(err).length > 0) {
      window.scrollTo({ top: 100, behavior: "smooth" });
      return false;
    }
    return true;
  };

  // 🌟 BƯỚC 1 CHỈ CHECK EMAIL CÓ BỊ TRÙNG HAY KHÔNG (KHÔNG TẠO USER VỘI)
  const handleNext = async () => {
    if (!validateCurrentStep()) return;

    const isAccountReady = isAuthenticated && Boolean(user?.id);

    if (currentStep === 1 && !isAccountReady) {
      setLoading(true);
      const email = (formData.emailContact || "").trim().toLowerCase();

      try {
        // Gọi API kiểm tra email đã tồn tại hay chưa
        const checkRes = await apiClient
          .get(`/auth/check-email?email=${encodeURIComponent(email)}`)
          .catch(() => null);

        if (checkRes?.data?.exists || checkRes?.exists) {
          setErrors((prev) => ({
            ...prev,
            emailContact: "Email này đã được đăng ký tài khoản trên hệ thống!",
          }));
          setLoading(false);
          return;
        }

        // Email hợp lệ -> Chỉ chuyển bước, không tạo rác trong bảng users!
        setCurrentStep(2);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch (err) {
        console.warn("Bỏ qua kiểm tra email offline:", err);
        setCurrentStep(2);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } finally {
        setLoading(false);
      }
    } else {
      setCurrentStep((prev) => Math.min(prev + 1, 8));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleBack = () => {
    if (currentStep === 1) {
      navigate("/");
    } else {
      setCurrentStep((prev) => Math.max(prev - 1, 1));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const sanitizeTimeToPostgres = (timeStr, defaultTime) => {
    if (!timeStr) return defaultTime;
    const match = String(timeStr).match(/^(\d{1,2}):(\d{2})/);
    return match ? `${match[1].padStart(2, "0")}:${match[2]}:00` : defaultTime;
  };

  // 🌟 BƯỚC 8: ĐẾN ĐÂY MỚI LƯU TÀI KHOẢN VÀ KHÁCH SẠN TRỌN GÓI VÀO DATABASE
  const handleFinalSubmit = async () => {
    if (!validateCurrentStep()) {
      setIsReviewOpen(false);
      return;
    }

    setLoading(true);

    try {
      let activeToken =
        localStorage.getItem("token") ||
        localStorage.getItem("access_token") ||
        useAuthStore.getState().token;

      let currentOwnerId = user?.id || formData.ownerId;

      // 1. NẾU CHƯA ĐĂNG NHẬP / CHƯA CÓ TÀI KHOẢN -> TẠO NGAY TẠI BƯỚC NÀY
      if (!activeToken || !currentOwnerId) {
        const email = (formData.emailContact || "").trim().toLowerCase();
        const password = formData.password;

        const regRes = await apiClient.post("/auth/register", {
          full_name: formData.ownerName.trim(),
          name: formData.ownerName.trim(),
          email: email,
          phone: formData.phoneContact.trim(),
          password: password,
          role: "hotel_owner",
        });

        activeToken =
          regRes.data?.token ||
          regRes.data?.data?.token ||
          regRes.token ||
          regRes.data?.accessToken;

        const createdUser =
          regRes.data?.user || regRes.data?.data?.user || regRes.user;

        if (!activeToken) {
          const loginRes = await apiClient.post("/auth/login", {
            email: email,
            password: password,
          });
          activeToken =
            loginRes.data?.token ||
            loginRes.data?.data?.token ||
            loginRes.token ||
            loginRes.data?.accessToken;
        }

        if (activeToken) {
          localStorage.setItem("token", activeToken);
          localStorage.setItem("access_token", activeToken);
          if (setAuth) setAuth(activeToken, createdUser);
        }
      }

      // 2. TẠO KHÁCH SẠN VỚI TỶ LỆ HOA HỒNG VÀ THÔNG TIN NGÂN HÀNG
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
          description: r.description || "Phòng nghỉ hiện đại, tiện nghi.",
          type: r.type || "Deluxe",
          room_view: r.room_view || "city_view",
          bed_type: r.bed_type || "1 Giường đôi lớn (King/Queen Size)",
          room_area: Number(r.room_area || 28),
          amount: numbers.length,
          room_numbers: numbers,
          amenities: r.roomAmenities || [
            "air_conditioner",
            "tv_smart",
            "wifi",
            "hot_water",
          ],
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
        city: formData.city || formData.province || "Vũng Tàu",
        latitude: Number(formData.latitude || 10.7769),
        longitude: Number(formData.longitude || 106.7009),
        is_beachfront: Boolean(formData.is_beachfront),
        distance_to_center: Number(formData.distance_to_center || 1.2),
        phone: formData.phoneContact || user?.phone || "0900000000",
        email: formData.emailContact || user?.email || "hotel@contact.com",
        star_rating: Number(formData.starRating || 3),
        description:
          formData.description ||
          `Tận hưởng kỳ nghỉ dưỡng tuyệt vời tại ${formData.hotelName} với dịch vụ chất lượng cao.`,
        checkin_time: sanitizeTimeToPostgres(formData.checkInFrom, "14:00:00"),
        checkout_time: sanitizeTimeToPostgres(formData.checkOutTo, "12:00:00"),
        cancellation_deadline_hours: Number(
          formData.cancellation_deadline_hours || 24,
        ),
        bank_code: formData.bankCode || "VCB",
        bank_name: formData.bankName || "Vietcombank",
        bank_account: formData.bankAccount || "Chưa cập nhật",
        bank_account_holder: formData.bankAccountHolder || formData.ownerName,
        tax_code: formData.taxCode || null,
        business_license_url: formData.businessLicenseUrl || null,
        commission_rate: Number(formData.commissionRate || 18.0), // 💰 HOA HỒNG SÀN THU
        image: formData.hotelMainImage || allImages[0]?.path || "",
        rooms: processedRooms,
        amenities: formData.propertyAmenities,
        images: allImages,
      };

      const res = await apiClient.post("/hotels/register", payload, {
        headers: {
          Authorization: `Bearer ${activeToken}`,
        },
      });

      const responseData = res?.data || res;
      const createdHotel = responseData?.hotel || responseData;

      setSubmittedApplication({
        applicationId:
          createdHotel.id || `GST-${Date.now().toString().slice(-6)}`,
        hotelId: createdHotel.id,
        submittedAt: new Date().toISOString(),
        data: createdHotel,
      });

      setIsReviewOpen(false);
    } catch (err) {
      console.error("Lỗi đăng tải khách sạn:", err);
      const errorMsg =
        err.response?.data?.message ||
        err.message ||
        "Đã xảy ra lỗi khi đăng tải.";
      alert(`Đăng ký chưa thành công: ${errorMsg}`);
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
    <div className="min-h-screen bg-[#f5f7fa] font-sans text-slate-800 pb-20">
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-6 sm:px-12 py-3 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#003580] text-white flex items-center justify-center font-black shadow-md">
              <Building2 size={22} />
            </div>
            <div>
              <span className="font-black text-[#003580] text-lg tracking-tight block leading-none">
                GoStay Partner Hub
              </span>
              <span className="text-[11px] font-bold text-slate-400">
                Đăng ký mở bán cơ sở lưu trú trực tuyến
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <button
              type="button"
              onClick={() => setIsAuditOpen(true)}
              className="text-xs font-bold text-[#006ce4] bg-[#e8f2ff] hover:bg-blue-100 px-3.5 py-2 rounded-xl border border-blue-200 flex items-center gap-1.5 transition cursor-pointer"
            >
              <ShieldCheck size={16} />
              <span className="hidden sm:inline">
                Kiểm định hồ sơ (Auditor)
              </span>
            </button>

            <button
              onClick={() => navigate("/")}
              className="text-xs font-bold text-slate-600 hover:text-slate-900 px-3 py-2 rounded-xl hover:bg-slate-100 transition cursor-pointer"
            >
              Lưu & Thoát
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto pt-8 px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        <div className="hidden md:block md:col-span-4 lg:col-span-3 sticky top-20 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-black text-[#003580] uppercase tracking-wider pb-3 border-b border-slate-100 mb-4 flex items-center justify-between">
            <span>Tiến trình hồ sơ</span>
            <span className="text-[#006ce4] font-black">{currentStep}/8</span>
          </div>

          <div className="space-y-1">
            {STEPS.map((s) => {
              const isPassed = currentStep > s.id;
              const isCurrent = currentStep === s.id;

              return (
                <div
                  key={s.id}
                  onClick={() => s.id <= currentStep && setCurrentStep(s.id)}
                  className={`flex items-center gap-3 p-2.5 rounded-xl text-xs font-bold cursor-pointer transition ${
                    isCurrent
                      ? "bg-[#e8f2ff] text-[#003580] shadow-xs"
                      : isPassed
                        ? "text-slate-700 hover:bg-slate-50"
                        : "text-slate-400 opacity-60 cursor-not-allowed"
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black shrink-0 transition ${
                      isPassed
                        ? "bg-emerald-600 text-white"
                        : isCurrent
                          ? "bg-[#003580] text-white shadow"
                          : "bg-slate-100 text-slate-400 border border-slate-200"
                    }`}
                  >
                    {isPassed ? <Check size={13} strokeWidth={3} /> : s.id}
                  </div>
                  <span className="truncate">{s.title}</span>
                </div>
              );
            })}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 text-[11px] text-slate-500 leading-relaxed space-y-1">
            <p className="font-bold text-slate-700 flex items-center gap-1">
              <HelpCircle size={13} className="text-[#006ce4]" /> Hỗ trợ đối tác
              24/7
            </p>
            <p>Hotline: 1900 6868 (Phím 2)</p>
            <p>Email: partner@gostay.vn</p>
          </div>
        </div>

        <div className="md:col-span-8 lg:col-span-9 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm">
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

          <div className="flex items-center justify-between pt-8 mt-10 border-t border-slate-100 gap-3">
            <button
              type="button"
              onClick={handleBack}
              className="px-6 h-12 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
            >
              <ChevronLeft size={16} /> Quay lại
            </button>

            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => setIsReviewOpen(true)}
                className="px-5 h-12 border border-blue-200 bg-[#e8f2ff] hover:bg-blue-100 text-[#003580] rounded-xl font-black text-xs transition cursor-pointer flex items-center gap-1.5"
              >
                <Eye size={16} /> Xem lại hồ sơ
              </button>

              {currentStep < 8 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={loading}
                  className="px-8 h-12 bg-[#003580] hover:bg-blue-900 text-white font-black text-xs rounded-xl shadow-lg transition active:scale-[0.98] cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {loading && currentStep === 1 ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Đang kiểm
                      tra email...
                    </>
                  ) : (
                    <>
                      Tiếp theo <ChevronRight size={16} />
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleFinalSubmit}
                  disabled={loading}
                  className="px-10 h-12 bg-[#003580] hover:bg-blue-900 text-white font-black text-xs rounded-xl shadow-lg transition active:scale-[0.98] cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Đang tạo
                      tài khoản & đăng tải...
                    </>
                  ) : (
                    "Xác nhận & Mở bán"
                  )}
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

      {isAuditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <AuditReportView
            data={formData}
            onClose={() => setIsAuditOpen(false)}
          />
        </div>
      )}
    </div>
  );
};

export default RegisterForm;
