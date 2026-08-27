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
} from "lucide-react";

export const ReviewModal = ({
  data = {},
  isOpen,
  onClose,
  onConfirmSubmit,
  loading = false,
}) => {
  if (!isOpen) return null;

  // Lấy an toàn danh sách mảng để không bị sập trang web nếu mảng rỗng
  const rooms = data?.rooms || [];
  const hotelImages = data?.hotelImages || [];
  const legalDocuments = data?.legalDocuments || [];

  const formatVND = (amount) => {
    return new Intl.NumberFormat("vi-VN").format(amount || 0) + " ₫";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        {/* MODAL HEADER */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-bold">
              <FileCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                Xem Lại Toàn Bộ Hồ Sơ Đăng Ký Đối Tác
              </h2>
              <p className="text-xs text-slate-300">
                Vui lòng rà soát lại thông tin trước khi chuyển sang hội đồng
                thẩm định
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

        {/* MODAL BODY */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm text-slate-800">
          {/* PROPERTY OVERVIEW */}
          <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50/50 space-y-3">
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600" />{" "}
              {data?.hotelNameVi ||
                data?.hotelNameEn ||
                "Chưa đặt tên chỗ nghỉ"}
              {data?.starRating > 0 && (
                <span className="text-amber-500 text-xs font-semibold">
                  {"★".repeat(data.starRating)} ({data.starRating} sao)
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-600 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              {data?.streetAddress || "Chưa nhập địa chỉ"}
              {data?.ward && `, ${data.ward}`}
              {data?.district && `, ${data.district}`}
              {data?.province && `, ${data.province}`}
            </p>
            <div className="flex flex-wrap gap-4 text-xs text-slate-600 pt-1">
              <span>
                <b>SĐT:</b> {data?.phoneContact || "Chưa có"}
              </span>
              <span>
                <b>Email:</b> {data?.emailContact || "Chưa có"}
              </span>
              <span>
                <b>Loại hình:</b>{" "}
                {data?.hotelType?.toUpperCase() || "KHÁCH SẠN"}
              </span>
            </div>
          </div>

          {/* ROOMS */}
          <div className="border border-slate-200 rounded-2xl p-5 space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Bed className="w-4 h-4 text-blue-600" /> Danh mục {rooms.length}{" "}
              Loại phòng niêm yết:
            </h4>
            {rooms.length === 0 ? (
              <p className="text-xs text-slate-400 italic">
                Chưa có loại phòng nào được tạo.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {rooms.map((r, i) => (
                  <div
                    key={r?.id || i}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1"
                  >
                    <div className="flex justify-between items-center font-bold text-slate-900">
                      <span>
                        #{i + 1}. {r?.roomName || "Chưa đặt tên phòng"}
                      </span>
                      <span className="text-emerald-600 font-bold">
                        {formatVND(r?.weekdayPrice)} / đêm
                      </span>
                    </div>
                    <p className="text-slate-500">
                      {r?.bedType || "Giường đơn"} • {r?.roomSize || 20}m² • Tối
                      đa {r?.maxAdults || 2} người lớn • Kho:{" "}
                      {r?.totalRooms || 1} phòng
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* LEGAL & SIGNER */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="border border-slate-200 rounded-2xl p-4 space-y-2">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> Người đại
                diện ký hợp đồng
              </h4>
              <p className="text-xs">
                <b>Họ tên:</b> {data?.signerName || "N/A"} (
                {data?.signerPosition || "Chủ cơ sở"})
              </p>
              <p className="text-xs">
                <b>SĐT:</b> {data?.signerPhone || "N/A"}
              </p>
              <p className="text-xs">
                <b>Email E-sign:</b> {data?.signerEmail || "N/A"}
              </p>
              <p className="text-xs">
                <b>Số CCCD:</b> {data?.signerIdNumber || "N/A"}
              </p>
              <p className="text-xs">
                <b>Mã số thuế:</b> {data?.taxCode || "N/A"}
              </p>
            </div>

            <div className="border border-slate-200 rounded-2xl p-4 space-y-2">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-blue-600" /> Tài khoản nhận
                thanh toán
              </h4>
              <p className="text-xs">
                <b>Ngân hàng:</b> {data?.bankName || "N/A"}
              </p>
              <p className="text-xs font-mono">
                <b>Số tài khoản:</b> {data?.bankAccount || "N/A"}
              </p>
              <p className="text-xs font-bold text-slate-900">
                <b>Chủ TK:</b> {data?.bankAccountName || "N/A"}
              </p>
              <p className="text-xs">
                <b>Hoa hồng:</b>{" "}
                <span className="text-blue-600 font-bold">
                  {data?.commissionRate || 15}%
                </span>
              </p>
              <p className="text-xs">
                <b>Kỳ quyết toán:</b>{" "}
                {data?.payoutCycle === "weekly" ? "Hàng tuần" : "Hàng tháng"}
              </p>
            </div>
          </div>

          {/* POLICIES */}
          <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-2 text-xs text-slate-700">
            <h4 className="font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-blue-600" /> Chính sách vận hành &
              Tiện ích
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <p>
                <b>Check-in:</b> Từ {data?.checkInFrom || "14:00"} -{" "}
                {data?.checkInTo || "22:00"}
              </p>
              <p>
                <b>Check-out:</b> Từ {data?.checkOutFrom || "06:00"} -{" "}
                {data?.checkOutTo || "12:00"}
              </p>
              <p>
                <b>Chính sách hủy:</b> {data?.cancellationPolicy || "Linh hoạt"}
              </p>
            </div>
            <p>
              <b>Hình ảnh đính kèm:</b> {hotelImages.length} bức ảnh đã tải lên
            </p>
            <p>
              <b>Tài liệu pháp lý:</b> {legalDocuments.length} tài liệu đã đính
              kèm
            </p>
          </div>
        </div>

        {/* MODAL FOOTER */}
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
            className="px-7 h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-200 transition disabled:opacity-50 flex items-center gap-2 cursor-pointer"
          >
            {loading ? (
              "Đang khởi tạo hợp đồng..."
            ) : (
              <>
                <Send className="w-4 h-4" /> Xác nhận & Gửi hồ sơ phê duyệt
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReviewModal;
