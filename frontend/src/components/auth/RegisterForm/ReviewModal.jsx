// src/components/auth/RegisterForm/ReviewModal.jsx
import React, { useEffect } from "react";
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
  Loader2,
  Image as ImageIcon,
} from "lucide-react";

export const ReviewModal = ({
  data = {},
  isOpen,
  onClose,
  onConfirmSubmit,
  loading = false,
}) => {
  // Đóng modal khi bấm phím Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen && !loading) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  const rooms = data?.rooms || [];
  const starCount = Math.min(
    5,
    Math.max(1, Math.round(Number(data?.starRating) || 3)),
  );
  const coverImage =
    data?.hotelMainImage ||
    data?.hotelImages?.[0]?.path ||
    data?.hotelImages?.[0]?.url ||
    data?.image ||
    "";

  const formatVND = (amount) =>
    Number(amount || 0).toLocaleString("vi-VN") + " ₫";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs animate-in fade-in font-sans text-slate-800">
      <div className="bg-white w-full max-w-3xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        {/* HEADER MODAL */}
        <div className="p-5 sm:p-6 bg-[#003580] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 text-white flex items-center justify-center font-bold shrink-0">
              <FileCheck size={22} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight">
                Rà Soát Hồ Sơ Khách Sạn Trước Khi Mở Bán
              </h2>
              <p className="text-xs text-blue-100">
                Kiểm tra thông tin trước khi đồng bộ lên hệ thống GoStay
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white rounded-xl hover:bg-white/10 transition cursor-pointer disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* NỘI DUNG CHI TIẾT */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-sm text-slate-800">
          {/* KHỐI 1: THÔNG TIN CƠ SỞ & ẢNH ĐẠI DIỆN */}
          <div className="border border-slate-200 rounded-2xl p-4 bg-[#f5f7fa] space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-200 shrink-0 border border-slate-300">
                  {coverImage ? (
                    <img
                      src={coverImage}
                      alt="Mặt tiền"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <ImageIcon size={20} />
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="font-black text-base text-[#003580] flex items-center gap-1.5 flex-wrap">
                    <Building2 size={18} className="text-[#006ce4] shrink-0" />
                    {data?.hotelName || "Chưa đặt tên"}
                    <span className="text-amber-500 text-xs font-bold">
                      {"★".repeat(starCount)} ({starCount} sao)
                    </span>
                  </h3>
                  <p className="text-xs text-slate-600 flex items-center gap-1 mt-0.5 font-medium">
                    <MapPin size={13} className="text-[#006ce4] shrink-0" />
                    {data?.address || "Chưa nhập địa chỉ"}, {data?.city}
                  </p>
                </div>
              </div>

              <span className="text-xs font-black uppercase bg-[#006ce4] text-white px-2.5 py-1 rounded-lg shrink-0">
                Hoa hồng: {data?.commissionRate || 18}%
              </span>
            </div>

            <div className="flex flex-wrap gap-4 text-xs text-slate-600 pt-2 border-t border-slate-200">
              <span className="flex items-center gap-1">
                <Clock size={14} className="text-[#006ce4]" /> Nhận phòng:{" "}
                <b>{data?.checkInFrom || "14:00"}</b>
              </span>
              <span className="flex items-center gap-1">
                <Clock size={14} className="text-[#006ce4]" /> Trả phòng:{" "}
                <b>{data?.checkOutTo || "12:00"}</b>
              </span>
              <span className="flex items-center gap-1">
                <ShieldCheck size={14} className="text-emerald-600" /> Hủy miễn
                phí: <b>{data?.cancellation_deadline_hours || 24}h trước</b>
              </span>
            </div>
          </div>

          {/* KHỐI 2: HẠNG PHÒNG & GIÁ BÁN */}
          <div className="border border-slate-200 rounded-2xl p-4 space-y-3">
            <h4 className="font-black text-xs uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Bed size={16} className="text-[#006ce4]" /> Danh mục{" "}
              {rooms.length} Loại phòng mở bán:
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {rooms.map((r, i) => (
                <div
                  key={r?.id || i}
                  className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5"
                >
                  <div className="flex justify-between items-center font-bold text-slate-900">
                    <span className="truncate">
                      #{i + 1}. {r?.name || "Phòng nghỉ"}
                    </span>
                    <span className="text-[#ff6a00] font-black shrink-0 ml-2">
                      {formatVND(r?.base_price || r?.weekdayPrice)}
                    </span>
                  </div>
                  <p className="text-slate-500 font-medium">
                    {r?.bed_type || "1 Giường đôi"} • {r?.room_area || 28}m² •
                    Tối đa {r?.capacity || 2} khách
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* KHỐI 3: THÔNG TIN ĐỐI TÁC & TÀI KHOẢN NGÂN HÀNG */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="border border-slate-200 rounded-2xl p-4 space-y-1.5 text-xs">
              <h4 className="font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5 mb-2">
                <ShieldCheck size={16} className="text-emerald-600" /> Thông tin
                đối tác
              </h4>
              <p>
                <b>Đại diện:</b> {data?.ownerName || "Chủ cơ sở"}
              </p>
              <p>
                <b>Hotline:</b> {data?.phoneContact || "N/A"}
              </p>
              <p>
                <b>Email:</b> {data?.emailContact || "N/A"}
              </p>
            </div>

            <div className="border border-slate-200 rounded-2xl p-4 space-y-1.5 text-xs">
              <h4 className="font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5 mb-2">
                <CreditCard size={16} className="text-[#006ce4]" /> Tài khoản
                quyết toán (Napas)
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
            </div>
          </div>
        </div>

        {/* FOOTER CÁC NÚT BẤM */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex justify-between items-center gap-3">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="px-5 h-11 border border-slate-300 hover:bg-white text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer disabled:opacity-50"
          >
            Chỉnh sửa thêm
          </button>

          <button
            type="button"
            onClick={onConfirmSubmit}
            disabled={loading}
            className="px-7 h-11 bg-[#003580] hover:bg-blue-900 text-white font-black text-xs rounded-xl shadow-lg transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Đang đồng bộ dữ liệu...</span>
              </>
            ) : (
              <>
                <Send size={15} />
                <span>Đồng ý & Gửi hồ sơ</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReviewModal;
