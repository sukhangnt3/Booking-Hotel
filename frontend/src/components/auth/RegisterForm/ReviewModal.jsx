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
  ClipboardList,
  Compass,
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
  const legalDocuments = data?.legalDocuments || [];
  const policies = data?.policies || [];
  const experiences = data?.experiences || [];

  const formatVND = (amount) => {
    return new Intl.NumberFormat("vi-VN").format(amount || 0) + " ₫";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn font-sans text-slate-800">
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
          {/* 1. TỔNG QUAN CHỖ NGHỈ */}
          <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50/50 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" />{" "}
                {data?.hotelNameVi || data?.hotelName || "Chưa đặt tên"}
                {data?.starRating > 0 && (
                  <span className="text-amber-500 text-xs font-semibold">
                    {"★".repeat(data.starRating)} ({data.starRating} sao)
                  </span>
                )}
              </h3>
              <span className="text-xs font-bold uppercase bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded">
                {data?.hotelType?.toUpperCase() || "KHÁCH SẠN"}
              </span>
            </div>

            <p className="text-xs text-slate-600 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              {data?.streetAddress || data?.address || "Chưa nhập địa chỉ"}
              {data?.province && `, ${data.province}`}
            </p>

            {data?.description && (
              <p className="text-xs text-slate-700 bg-white p-3 rounded-xl border border-slate-200 leading-relaxed whitespace-pre-line">
                <b>Mô tả:</b> {data.description}
              </p>
            )}
          </div>

          {/* 2. DANH MỤC PHÒNG */}
          <div className="border border-slate-200 rounded-2xl p-5 space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Bed className="w-4 h-4 text-blue-600" /> Danh mục {rooms.length}{" "}
              Loại phòng niêm yết:
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {rooms.map((r, i) => (
                <div
                  key={r?.id || i}
                  className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1"
                >
                  <div className="flex justify-between items-center font-bold text-slate-900">
                    <span>
                      #{i + 1}. {r?.roomName || r?.name || "Phòng nghỉ"}
                    </span>
                    <span className="text-emerald-600 font-bold">
                      {formatVND(r?.weekdayPrice || r?.sell_price)} / đêm
                    </span>
                  </div>
                  <p className="text-slate-500">
                    {r?.bedType || r?.bed_type || "1 Giường đôi"} •{" "}
                    {r?.roomSize || r?.room_area || 28}m² • Tối đa{" "}
                    {r?.maxAdults || r?.capacity || 2} khách • Kho:{" "}
                    {r?.totalRooms || r?.room_count || 5} phòng
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* 3. PHÁP LÝ & TÀI KHOẢN NGÂN HÀNG */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="border border-slate-200 rounded-2xl p-4 space-y-2">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> Người đại
                diện ký hợp đồng
              </h4>
              <p className="text-xs">
                <b>Họ tên:</b> {data?.signerName || data?.ownerName || "N/A"} (
                {data?.signerPosition || "Chủ sở hữu"})
              </p>
              <p className="text-xs">
                <b>SĐT:</b> {data?.signerPhone || data?.phoneContact || "N/A"}
              </p>
              <p className="text-xs">
                <b>Email:</b> {data?.signerEmail || data?.emailContact || "N/A"}
              </p>
              <p className="text-xs">
                <b>Mã số thuế:</b> {data?.taxCode || "Chưa có"}
              </p>
            </div>

            <div className="border border-slate-200 rounded-2xl p-4 space-y-2">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-blue-600" /> Tài khoản nhận
                thanh toán
              </h4>
              <p className="text-xs">
                <b>Ngân hàng:</b> {data?.bankName || "Vietcombank"}
              </p>
              <p className="text-xs font-mono">
                <b>Số TK:</b> {data?.bankAccount || "N/A"}
              </p>
              <p className="text-xs font-bold text-slate-900">
                <b>Chủ TK:</b> {data?.bankAccountName || "N/A"}
              </p>
              <p className="text-xs">
                <b>Hoa hồng:</b>{" "}
                <span className="text-blue-600 font-bold">
                  {data?.commissionRate || 18}%
                </span>
              </p>
            </div>
          </div>

          {/* 4. QUY ĐỊNH CHỖ NGHỈ */}
          {policies.length > 0 && (
            <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-2 text-xs">
              <h4 className="font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <ClipboardList className="w-4 h-4 text-blue-600" /> Quy định chỗ
                nghỉ tùy chỉnh ({policies.length} mục)
              </h4>
              <div className="space-y-1.5">
                {policies.map((p, idx) => (
                  <div
                    key={idx}
                    className="bg-white p-2.5 rounded-lg border border-slate-200"
                  >
                    <strong className="text-blue-900 block">{p.title}</strong>
                    <p className="text-slate-600 whitespace-pre-line">
                      {p.content}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. TRẢI NGHIỆM XUNG QUANH */}
          {experiences.length > 0 && (
            <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-2 text-xs">
              <h4 className="font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-emerald-600" /> Điểm vui chơi
                gần chỗ nghỉ ({experiences.length} điểm)
              </h4>
              <div className="space-y-1.5">
                {experiences.map((exp, idx) => (
                  <div
                    key={idx}
                    className="bg-white p-2.5 rounded-lg border border-slate-200"
                  >
                    <strong className="text-emerald-900 block">
                      {exp.title}
                    </strong>
                    <p className="text-slate-600 whitespace-pre-line">
                      {exp.content}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
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
            className="px-7 h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-lg transition disabled:opacity-50 flex items-center gap-2 cursor-pointer"
          >
            {loading ? (
              "Đang khởi tạo hợp đồng..."
            ) : (
              <>
                <Send className="w-4 h-4" /> Xác nhận & Nộp hồ sơ đối tác
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReviewModal;
