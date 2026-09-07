// src/components/auth/ReviewModal.jsx
import React from "react";
import {
  Building2,
  MapPin,
  Bed,
  CreditCard,
  FileCheck,
  Clock,
  ShieldCheck,
  X,
  Send,
  Sparkles,
  Camera,
} from "lucide-react";

export const ReviewModal = ({
  data = {},
  isOpen,
  onClose,
  onConfirmSubmit,
  loading = false,
}) => {
  if (!isOpen) return null;

  const rooms = data?.rooms || [];
  const hotelImages = data?.hotelImages || [];
  const propertyAmenities = data?.propertyAmenities || [];

  const formatVND = (amount) => {
    return new Intl.NumberFormat("vi-VN").format(amount || 0) + " ₫";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn font-sans text-slate-800">
      <div className="bg-white w-full max-w-3xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        {/* HEADER */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center font-bold shadow-md">
              <FileCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                Rà Soát Toàn Bộ Hồ Sơ Trước Khi Gửi Duyệt
              </h2>
              <p className="text-xs text-slate-300">
                Dữ liệu sẽ được thẩm định và lưu trữ trực tiếp vào hệ thống
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-sm text-slate-800">
          {/* 1. TỔNG QUAN CHỖ NGHỈ */}
          <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50/60 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                {data?.hotelName || "Chưa đặt tên"}
                <span className="text-amber-500 text-xs font-semibold">
                  {"⭐".repeat(data?.starRating || 3)} ({data?.starRating || 3}{" "}
                  sao)
                </span>
              </h3>
              <span className="text-xs font-bold uppercase bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full">
                Hoa hồng sàn: {data?.commissionRate || 18}%
              </span>
            </div>

            <p className="text-xs text-slate-600 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              {data?.address || "Chưa nhập địa chỉ"}, {data?.city}
            </p>

            {data?.description && (
              <p className="text-xs text-slate-700 bg-white p-3 rounded-xl border border-slate-200 leading-relaxed">
                <b>Mô tả:</b> {data.description}
              </p>
            )}

            <div className="flex flex-wrap gap-4 text-xs text-slate-600 pt-1">
              <span className="flex items-center gap-1">
                <Clock size={14} className="text-blue-600" /> Nhận phòng:{" "}
                <b>{data?.checkInFrom || "14:00"}</b>
              </span>
              <span className="flex items-center gap-1">
                <Clock size={14} className="text-blue-600" /> Trả phòng:{" "}
                <b>{data?.checkOutTo || "12:00"}</b>
              </span>
              <span className="flex items-center gap-1">
                <ShieldCheck size={14} className="text-emerald-600" /> Hủy phòng
                miễn phí trước:{" "}
                <b>
                  {data?.cancellation_deadline_hours
                    ? `${data.cancellation_deadline_hours} giờ`
                    : "Không hỗ trợ hủy"}
                </b>
              </span>
            </div>

            {propertyAmenities.length > 0 && (
              <div className="pt-2 border-t border-slate-200/60">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Tiện ích khách sạn ({propertyAmenities.length}):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {propertyAmenities.map((amen, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 bg-white border border-slate-200 rounded-md text-[11px] text-slate-700 font-medium"
                    >
                      ✓ {amen}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 2. HẠNG PHÒNG & GIÁ */}
          <div className="border border-slate-200 rounded-2xl p-5 space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Bed className="w-4 h-4 text-blue-600" /> Danh mục {rooms.length}{" "}
              Loại phòng niêm yết:
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {rooms.map((r, i) => (
                <div
                  key={r?.id || i}
                  className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5"
                >
                  <div className="flex justify-between items-center font-bold text-slate-900">
                    <span>
                      #{i + 1}. {r?.name || "Phòng nghỉ"}
                    </span>
                    <span className="text-emerald-600 font-bold">
                      {formatVND(r?.base_price)} / đêm
                    </span>
                  </div>
                  <p className="text-slate-500">
                    {r?.bed_type} • {r?.room_area || 28}m² • Tối đa{" "}
                    {r?.capacity || 2} khách
                  </p>
                  <div className="p-2 bg-white rounded-lg border border-slate-200 text-[11px] text-blue-900">
                    <b>Số phòng thực tế:</b>{" "}
                    {r?.roomNumbersText || `Tổng ${r?.amount || 1} phòng`}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. THƯ VIỆN HÌNH ẢNH */}
          <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <h4 className="font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-blue-600" /> Thư viện hình ảnh (
                {hotelImages.length} ảnh)
              </h4>
              {data?.hotelMainImage && (
                <span className="text-[11px] text-amber-700 font-bold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                  ★ Đã có ảnh bìa chính
                </span>
              )}
            </div>

            {hotelImages.length > 0 && (
              <div className="flex gap-2 overflow-x-auto py-1">
                {hotelImages.slice(0, 6).map((img, idx) => (
                  <img
                    key={idx}
                    src={img.url}
                    alt=""
                    className="w-16 h-12 object-cover rounded-lg border border-slate-200 shrink-0"
                  />
                ))}
                {hotelImages.length > 6 && (
                  <div className="w-16 h-12 rounded-lg bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0">
                    +{hotelImages.length - 6}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 4. PHÁP LÝ & TÀI KHOẢN NGÂN HÀNG */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="border border-slate-200 rounded-2xl p-4 space-y-1.5 text-xs">
              <h4 className="font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> Pháp lý chỗ
                nghỉ
              </h4>
              <p>
                <b>Người liên hệ:</b>{" "}
                {data?.ownerName || data?.signerName || "Chủ cơ sở"}
              </p>
              <p>
                <b>Hotline:</b> {data?.phoneContact || "N/A"}
              </p>
              <p>
                <b>Email:</b> {data?.emailContact || "N/A"}
              </p>
              <p>
                <b>Mã số thuế:</b> {data?.taxCode || "Chưa cập nhật"}
              </p>
              <p>
                <b>Giấy phép ĐKKD:</b>{" "}
                {data?.businessLicenseUrl ? (
                  <span className="text-emerald-600 font-bold">
                    ✓ Đã đính kèm tài liệu
                  </span>
                ) : (
                  <span className="text-slate-400">Chưa tải lên</span>
                )}
              </p>
            </div>

            <div className="border border-slate-200 rounded-2xl p-4 space-y-1.5 text-xs">
              <h4 className="font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-blue-600" /> Tài khoản thụ
                hưởng quyết toán
              </h4>
              <p>
                <b>Ngân hàng:</b> {data?.bankName || "Vietcombank"}
              </p>
              <p className="font-mono">
                <b>Số TK:</b> {data?.bankAccount || "Chưa nhập"}
              </p>
              <p className="font-bold uppercase">
                <b>Chủ TK:</b> {data?.bankAccountHolder || "Chưa nhập"}
              </p>
              <p>
                <b>Kỳ quyết toán:</b> Hàng tuần qua cổng thanh toán tự động
              </p>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="p-5 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
          <button
            type="button"
            onClick={onClose}
            className="px-5 h-11 border border-slate-200 hover:bg-white text-slate-700 font-semibold text-xs rounded-xl transition cursor-pointer"
          >
            Quay lại chỉnh sửa
          </button>

          <button
            type="button"
            onClick={onConfirmSubmit}
            disabled={loading}
            className="px-7 h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-lg transition disabled:opacity-50 flex items-center gap-2 cursor-pointer"
          >
            {loading ? (
              "Đang lưu trữ dữ liệu..."
            ) : (
              <>
                <Send className="w-4 h-4" /> Xác nhận & Nộp hồ sơ
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReviewModal;
