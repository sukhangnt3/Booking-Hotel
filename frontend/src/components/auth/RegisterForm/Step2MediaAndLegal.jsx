import React, { useRef } from "react";
import {
  Camera,
  Upload,
  Trash2,
  FileText,
  ShieldCheck,
  CheckCircle2,
  FileCheck,
  Building,
} from "lucide-react";

export const Step2MediaAndLegal = ({
  data = {},
  onChange = () => {},
  errors = {},
}) => {
  const photoInputRef = useRef(null);

  const hotelImages = data?.hotelImages || [];
  const legalDocuments = data?.legalDocuments || [];

  // ════════════════════════════════════════════════════════════════════════════
  // 📸 CHUYỂN FILE ẢNH THẬT TỪ MÁY THÀNH DỮ LIỆU CHUẨN
  // ════════════════════════════════════════════════════════════════════════════
  const handlePhotoUpload = (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const maxWidth = 1200;
          const scale = Math.min(maxWidth / img.width, 1);
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          const realImageData = canvas.toDataURL("image/jpeg", 0.85);

          const newImgObj = {
            id: `img-${Date.now()}-${index}`,
            url: realImageData,
            preview: realImageData,
            category: "exterior",
            title: file.name.replace(/\.[^/.]+$/, ""),
          };

          onChange({ hotelImages: [...(data?.hotelImages || []), newImgObj] });
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    });

    e.target.value = null;
  };

  const handleDeletePhoto = (id) => {
    onChange({ hotelImages: hotelImages.filter((img) => img.id !== id) });
  };

  const handleUpdatePhotoCategory = (id, category) => {
    const updated = hotelImages.map((img) =>
      img.id === id ? { ...img, category } : img,
    );
    onChange({ hotelImages: updated });
  };

  const handleLegalDocUpload = (e, docType) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const newDoc = {
          name: file.name,
          url: event.target.result,
          preview: event.target.result,
          docType: docType || "business_license",
          uploadDate: new Date().toISOString().split("T")[0],
        };
        onChange({ legalDocuments: [...(data?.legalDocuments || []), newDoc] });
      };
      reader.readAsDataURL(file);
    });

    e.target.value = null;
  };

  const handleDeleteDoc = (index) => {
    const updated = [...legalDocuments];
    updated.splice(index, 1);
    onChange({ legalDocuments: updated });
  };

  return (
    <div className="space-y-8 animate-fadeIn font-sans text-slate-800">
      {/* ── 1. THƯ VIỆN HÌNH ẢNH ── */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                1. Thư Viện Hình Ảnh Chỗ Nghỉ
              </h2>
              <p className="text-xs text-slate-500">
                Tải lên ít nhất 3 bức ảnh sắc nét (Mặt tiền, Sảnh lễ tân, Phòng
                ngủ, Phòng tắm, Tiện ích)
              </p>
            </div>
          </div>
          <span className="text-xs text-slate-500 font-bold px-3 py-1 bg-slate-100 rounded-full">
            Đã tải {hotelImages.length} ảnh
          </span>
        </div>

        {errors?.hotelImages && (
          <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
            {errors.hotelImages}
          </div>
        )}

        <div
          onClick={() => photoInputRef.current?.click()}
          className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/20 rounded-2xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center gap-3"
        >
          <input
            type="file"
            multiple
            accept="image/*"
            ref={photoInputRef}
            onChange={handlePhotoUpload}
            className="hidden"
          />
          <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
            <Upload className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">
              Nhấp để chọn ảnh từ máy tính hoặc điện thoại
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Ảnh sẽ được tự động đồng bộ và lưu trữ trên toàn hệ thống.
            </p>
          </div>
        </div>

        {/* IMAGE PREVIEWS */}
        {hotelImages.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pt-2">
            {hotelImages.map((img, idx) => (
              <div
                key={img.id || idx}
                className="group relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50 shadow-sm"
              >
                <img
                  src={img.preview || img.url}
                  alt={img.title || `Hotel Image ${idx + 1}`}
                  className="w-full h-40 object-cover"
                />
                <button
                  type="button"
                  onClick={() => handleDeletePhoto(img.id)}
                  title="Xóa ảnh"
                  className="absolute top-2 right-2 w-7 h-7 bg-red-500 hover:bg-red-600 text-white rounded-lg flex items-center justify-center shadow transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <div className="p-2.5 bg-white border-t border-slate-100">
                  <select
                    value={img.category || "exterior"}
                    onChange={(e) =>
                      handleUpdatePhotoCategory(img.id, e.target.value)
                    }
                    className="w-full text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-1.5 outline-none cursor-pointer"
                  >
                    <option value="exterior">Ảnh Mặt tiền (Exterior)</option>
                    <option value="lobby">Khu vực Lễ tân (Lobby)</option>
                    <option value="room">Phòng ngủ (Bedroom)</option>
                    <option value="bathroom">Phòng tắm (Bathroom)</option>
                    <option value="pool">
                      Hồ bơi / Tiện ích (Pool/Amenity)
                    </option>
                    <option value="dining">Nhà hàng / Ẩm thực (Dining)</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 2. HỒ SƠ PHÁP LÝ & GIẤY PHÉP KINH DOANH ── */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              2. Xác Thực Pháp Lý & Giấy Phép Hoạt Động
            </h2>
            <p className="text-xs text-slate-500">
              Cung cấp hồ sơ pháp lý theo quy định kinh doanh dịch vụ lưu trú du
              lịch
            </p>
          </div>
        </div>

        {/* LOẠI HÌNH PHÁP NHÂN */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div
            onClick={() => onChange({ businessType: "company" })}
            className={`p-5 rounded-2xl border-2 cursor-pointer transition ${
              data?.businessType === "company"
                ? "border-blue-600 bg-blue-50/40 shadow-xs"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Building className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-sm text-slate-900">
                  Doanh nghiệp / Công ty
                </h3>
              </div>
              {data?.businessType === "company" && (
                <CheckCircle2 className="w-5 h-5 text-blue-600" />
              )}
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Dành cho Công ty TNHH, Cổ phần sở hữu Giấy ĐKKD.
            </p>
          </div>

          <div
            onClick={() => onChange({ businessType: "individual" })}
            className={`p-5 rounded-2xl border-2 cursor-pointer transition ${
              data?.businessType === "individual"
                ? "border-blue-600 bg-blue-50/40 shadow-xs"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-sm text-slate-900">
                  Hộ kinh doanh cá thể / Cá nhân
                </h3>
              </div>
              {data?.businessType === "individual" && (
                <CheckCircle2 className="w-5 h-5 text-blue-600" />
              )}
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Dành cho chủ hộ kinh doanh, Homestay, Villa tự doanh.
            </p>
          </div>
        </div>

        {/* UPLOAD TÀI LIỆU SCAN */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                <FileCheck className="w-4 h-4 text-blue-600" />
                <span>Giấy phép Đăng ký Kinh doanh (ĐKKD) *</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Bản chụp hoặc quét sắc nét giấy ĐKKD.
              </p>
            </div>
            <label className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 cursor-pointer shadow-2xs transition">
              <Upload className="w-3.5 h-3.5" /> Tải lên Giấy ĐKKD
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => handleLegalDocUpload(e, "business_license")}
                className="hidden"
              />
            </label>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                <FileCheck className="w-4 h-4 text-blue-600" />
                <span>CCCD / Hộ chiếu Người đại diện *</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Mặt trước và mặt sau CCCD gắn chip.
              </p>
            </div>
            <label className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 cursor-pointer shadow-2xs transition">
              <Upload className="w-3.5 h-3.5" /> Tải lên CCCD / Hộ chiếu
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => handleLegalDocUpload(e, "id_card_front")}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Step2MediaAndLegal;
