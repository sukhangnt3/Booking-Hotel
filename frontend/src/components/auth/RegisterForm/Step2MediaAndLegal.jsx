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

  // Khởi tạo an toàn cho mảng ảnh và tài liệu
  const hotelImages = data?.hotelImages || [];
  const legalDocuments = data?.legalDocuments || [];

  const handlePhotoUpload = (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newImages = [];
    Array.from(files).forEach((file, index) => {
      const url = URL.createObjectURL(file);
      newImages.push({
        id: `img-${Date.now()}-${index}`,
        file,
        preview: url,
        category: "room",
        title: file.name.replace(/\.[^/.]+$/, ""),
      });
    });

    onChange({ hotelImages: [...hotelImages, ...newImages] });
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

    const newDocs = [];
    Array.from(files).forEach((file) => {
      const url = URL.createObjectURL(file);
      newDocs.push({
        name: file.name,
        file,
        preview: url,
        docType: docType || "business_license",
        uploadDate: new Date().toISOString().split("T")[0],
      });
    });

    onChange({ legalDocuments: [...legalDocuments, ...newDocs] });
  };

  const handleDeleteDoc = (index) => {
    const updated = [...legalDocuments];
    updated.splice(index, 1);
    onChange({ legalDocuments: updated });
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* SECTION 1: BỘ SƯU TẬP HÌNH ẢNH */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                1. Thư viện Hình ảnh Chỗ nghỉ
              </h2>
              <p className="text-xs text-slate-500">
                Tải lên tối thiểu 2 - 4 ảnh chất lượng cao (Mặt tiền, Sảnh,
                Phòng ngủ, Phòng tắm)
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

        {/* DROPZONE AREA */}
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
              Nhấp để chọn ảnh hoặc kéo thả vào đây
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Hỗ trợ JPG, PNG, WEBP (Kích thước đề xuất 1200x800 px, tối đa
              10MB/ảnh)
            </p>
          </div>
        </div>

        {/* IMAGE PREVIEW GRID */}
        {hotelImages.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pt-2">
            {hotelImages.map((img, idx) => (
              <div
                key={img.id || idx}
                className="group relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50"
              >
                <img
                  src={img.preview}
                  alt={img.title || `Hotel Image ${idx + 1}`}
                  className="w-full h-40 object-cover"
                />
                <button
                  type="button"
                  onClick={() => handleDeletePhoto(img.id)}
                  title="Xóa ảnh"
                  className="absolute top-2 right-2 w-7 h-7 bg-red-500/90 hover:bg-red-600 text-white rounded-lg flex items-center justify-center opacity-90 hover:opacity-100 transition shadow-sm cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <div className="p-2.5 bg-white border-t border-slate-100">
                  <select
                    value={img.category || "room"}
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

      {/* SECTION 2: HỒ SƠ PHÁP LÝ & GIẤY PHÉP KINH DOANH */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              2. Xác thực Pháp lý & Giấy phép Hoạt động
            </h2>
            <p className="text-xs text-slate-500">
              Cung cấp hồ sơ pháp lý theo quy định lưu trú du lịch của Bộ Văn
              hóa, Thể thao & Du lịch
            </p>
          </div>
        </div>

        {errors?.legalDocuments && (
          <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
            {errors.legalDocuments}
          </div>
        )}

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
              Dành cho Công ty TNHH, Cổ phần, Doanh nghiệp tư nhân sở hữu Giấy
              chứng nhận Đăng ký kinh doanh.
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
              Dành cho chủ hộ kinh doanh cá thể, Homestay, Villa tự doanh có
              ĐKKD hộ cá thể hoặc CCCD chính chủ.
            </p>
          </div>
        </div>

        {/* UPLOAD TỪNG LOẠI TÀI LIỆU PHÁP LÝ */}
        <div className="space-y-4 pt-2">
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">
            Danh mục tài liệu cần thẩm định (Tải lên file PDF hoặc Ảnh chụp sắc
            nét):
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* GPKD / ĐKKD */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                  <FileCheck className="w-4 h-4 text-blue-600" />
                  <span>Giấy phép Đăng ký Kinh doanh (ĐKKD) *</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Bản quét hoặc ảnh chụp mặt chính có dấu đỏ của Sở Kế hoạch &
                  Đầu tư hoặc UBND Quận/Huyện.
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

            {/* CCCD / HỘ CHIẾU NGƯỜI ĐẠI DIỆN */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                  <FileCheck className="w-4 h-4 text-blue-600" />
                  <span>CCCD / Hộ chiếu Người đại diện *</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Mặt trước và mặt sau Căn cước công dân gắn chip của người đứng
                  tên ký kết hợp đồng.
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

          {/* LIST OF UPLOADED DOCUMENTS */}
          {legalDocuments.length > 0 && (
            <div className="space-y-2 pt-2">
              <span className="text-xs font-bold text-slate-700">
                Tài liệu đã đính kèm:
              </span>
              <div className="space-y-2">
                {legalDocuments.map((doc, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{doc.name}</p>
                        <p className="text-[11px] text-slate-400">
                          Loại:{" "}
                          {doc.docType === "business_license"
                            ? "Giấy phép ĐKKD"
                            : "CCCD / Hộ chiếu"}{" "}
                          • Ngày tải: {doc.uploadDate}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteDoc(idx)}
                      className="p-1.5 text-slate-400 hover:text-red-500 transition cursor-pointer"
                      title="Xóa tài liệu"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Step2MediaAndLegal;
