import React, { useState } from "react";

// Import toàn bộ các file thành phần
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
} from "lucide-react";

// Dữ liệu khởi tạo mặc định cho toàn bộ Form
const initialFormData = {
  // BƯỚC 1: THÔNG TIN & PHÒNG
  hotelNameVi: "",
  hotelNameEn: "",
  hotelType: "hotel",
  starRating: 0,
  phoneContact: "",
  emailContact: "",
  website: "",
  description: "",
  province: "Hồ Chí Minh",
  district: "Quận 1",
  ward: "",
  streetAddress: "",
  latitude: 10.7769,
  longitude: 106.7009,
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

  // BƯỚC 2: ẢNH & PHÁP LÝ
  hotelImages: [],
  businessType: "company",
  legalDocuments: [],

  // BƯỚC 3: HỢP ĐỒNG & THANH TOÁN
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

  // BƯỚC 4: CHÍNH SÁCH & VẬN HÀNH
  checkInFrom: "14:00",
  checkInTo: "23:59",
  checkOutFrom: "06:00",
  checkOutTo: "12:00",
  cancellationPolicy: "flexible_24h",
  hasBreakfast: "free",
  allowChildren: "yes",
  allowPets: "no",
  propertyAmenities: ["wifi", "parking", "24h_front_desk"],
  acceptedTerms: false,
  confirmedAccuracy: false,
};

const STEPS = [
  { id: 1, title: "Thông tin & Phòng" },
  { id: 2, title: "Ảnh & Pháp lý" },
  { id: 3, title: "Hợp đồng & Thanh toán" },
  { id: 4, title: "Chính sách vận hành" },
];

export const RegisterForm = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Quản lý hiển thị các Modal / Màn hình hoàn tất
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [submittedApplication, setSubmittedApplication] = useState(null);

  // Cập nhật State từ các Step con
  const handleChange = (updatedFields) => {
    setFormData((prev) => ({ ...prev, ...updatedFields }));
    // Xóa lỗi tương ứng khi người dùng nhập
    setErrors({});
  };

  // Kiểm tra tính hợp lệ trước khi qua bước tiếp theo
  const validateCurrentStep = () => {
    const err = {};
    if (currentStep === 1) {
      if (!formData.hotelNameVi) err.hotelName = "Vui lòng nhập tên chỗ nghỉ!";
      if (!formData.phoneContact)
        err.phoneContact = "Vui lòng nhập số điện thoại liên hệ!";
      if (!formData.emailContact)
        err.emailContact = "Vui lòng nhập email nhận đặt phòng!";
      if (!formData.streetAddress)
        err.streetAddress = "Vui lòng nhập địa chỉ chi tiết!";
      if (formData.rooms.length === 0)
        err.rooms = "Cần có ít nhất 1 loại phòng niêm yết!";
    } else if (currentStep === 2) {
      if (formData.hotelImages.length === 0)
        err.hotelImages = "Vui lòng tải lên ít nhất 1 hình ảnh chỗ nghỉ!";
    } else if (currentStep === 3) {
      if (!formData.signerName)
        err.signerName = "Vui lòng nhập tên người ký hợp đồng!";
      if (!formData.signerPhone)
        err.signerPhone = "Vui lòng nhập SĐT người ký!";
      if (!formData.signerEmail)
        err.signerEmail = "Vui lòng nhập email nhận hợp đồng!";
      if (!formData.bankAccount)
        err.bankAccount = "Vui lòng nhập số tài khoản ngân hàng!";
      if (!formData.bankAccountName)
        err.bankAccountName = "Vui lòng nhập tên chủ tài khoản!";
    } else if (currentStep === 4) {
      if (!formData.acceptedTerms)
        err.acceptedTerms = "Bạn cần đồng ý với điều khoản!";
      if (!formData.confirmedAccuracy)
        err.confirmedAccuracy = "Bạn cần xác thực thông tin chính xác!";
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
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Nộp hồ sơ chính thức
  const handleFinalSubmit = async () => {
    if (!validateCurrentStep()) {
      setIsReviewOpen(false);
      return;
    }

    setLoading(true);
    try {
      // Giả lập nộp lên Server 1.5 giây
      await new Promise((resolve) => setTimeout(resolve, 1500));

      setSubmittedApplication({
        applicationId: `GST-${Date.now().toString().slice(-6)}`,
        submittedAt: new Date().toISOString(),
        data: formData,
      });
      setIsReviewOpen(false);
    } catch (error) {
      alert("Nộp hồ sơ thất bại, vui lòng thử lại!");
    } finally {
      setLoading(false);
    }
  };

  // Reset toàn bộ để làm lại từ đầu
  const handleResetForm = () => {
    setFormData(initialFormData);
    setSubmittedApplication(null);
    setCurrentStep(1);
  };

  // Nếu đã nộp thành công -> Hiển thị trang kết quả
  if (submittedApplication) {
    return (
      <SubmittedSuccessView
        application={submittedApplication}
        onReset={handleResetForm}
      />
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 space-y-8 animate-fadeIn">
      {/* HEADER & STEPPER BAR */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900">
              Đăng Ký Cơ Sở Lưu Trú Đối Tác
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Quy trình 4 bước tiêu chuẩn hóa theo hệ thống OTA quốc tế
            </p>
          </div>

          {/* Nút mở Modal Chấm điểm Audit */}
          <button
            type="button"
            onClick={() => setIsAuditOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold text-xs rounded-xl border border-blue-200 transition cursor-pointer self-start sm:self-auto"
          >
            <ShieldCheck className="w-4 h-4" /> Kiểm tra Chuẩn OTA (Auditor)
          </button>
        </div>

        {/* CÁC NỐT TIẾN TRÌNH (STEPPER) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
          {STEPS.map((s) => {
            const isCompleted = currentStep > s.id;
            const isCurrent = currentStep === s.id;
            return (
              <div
                key={s.id}
                onClick={() => {
                  if (s.id < currentStep) setCurrentStep(s.id);
                }}
                className={`p-3 rounded-xl border flex items-center gap-3 transition ${
                  isCurrent
                    ? "border-blue-600 bg-blue-50/50 shadow-xs"
                    : isCompleted
                      ? "border-emerald-300 bg-emerald-50/40 cursor-pointer"
                      : "border-slate-200 bg-slate-50 opacity-60"
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

      {/* RENDER BƯỚC HIỆN TẠI */}
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

      {/* THANH ĐIỀU HƯỚNG DƯỚI CÙNG (FOOTER ACTIONS) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col-reverse sm:flex-row items-center justify-between gap-4">
        <button
          type="button"
          onClick={handleBack}
          disabled={currentStep === 1}
          className="w-full sm:w-auto px-6 h-11 border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none text-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" /> Quay lại
        </button>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Nút Xem lại trước khi nộp */}
          <button
            type="button"
            onClick={() => setIsReviewOpen(true)}
            className="flex-1 sm:flex-none px-5 h-11 border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <Eye className="w-4 h-4" /> Xem lại hồ sơ
          </button>

          {/* Nút Tiếp tục hoặc Nộp hồ sơ */}
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

      {/* POPUP XEM LẠI TOÀN BỘ THÔNG TIN (REVIEW MODAL) */}
      <ReviewModal
        data={formData}
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        onConfirmSubmit={handleFinalSubmit}
        loading={loading}
      />

      {/* POPUP BẢNG KIỂM ĐỊNH CHUẨN OTA (AUDIT MODAL) */}
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
