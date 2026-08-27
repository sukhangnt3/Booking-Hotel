import React from "react";
import { CheckCircle2, Clock, Printer, RotateCcw } from "lucide-react";

export const SubmittedSuccessView = ({
  application = {},
  onReset = () => {},
}) => {
  // Lấy an toàn các trường dữ liệu, tự động tạo mã hồ sơ nếu chưa có
  const data = application?.data || {};
  const applicationId =
    application?.applicationId || `GST-${Date.now().toString().slice(-6)}`;
  const submittedAt = application?.submittedAt || new Date().toISOString();
  const rooms = data?.rooms || [];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 space-y-8 animate-fadeIn">
      {/* SUCCESS HERO CARD */}
      <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-10 shadow-sm text-center relative overflow-hidden">
        <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <span className="text-xs font-bold px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full uppercase tracking-wider">
          Đăng ký thành công • Chờ duyệt
        </span>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-4 mb-2">
          Hồ Sơ Đã Được Tiếp Nhận Vào Hệ Thống!
        </h1>
        <p className="text-sm text-slate-500 max-w-lg mx-auto leading-relaxed">
          Cảm ơn bạn đã lựa chọn trở thành Đối tác của GoStay. Hệ thống đã tạo
          mã hồ sơ thẩm định và gửi thư xác nhận đến email của bạn.
        </p>

        {/* APPLICATION CODE BOX */}
        <div className="mt-6 inline-flex flex-col items-center bg-slate-900 text-white px-8 py-4 rounded-xl shadow-sm">
          <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-widest">
            Mã Hồ Sơ Đối Tác (Tracking Code)
          </span>
          <span className="text-xl sm:text-2xl font-mono font-black text-amber-400 tracking-wider my-1">
            {applicationId}
          </span>
          <span className="text-[10px] text-slate-400">
            Thời gian nộp: {new Date(submittedAt).toLocaleString("vi-VN")}
          </span>
        </div>
      </div>

      {/* 4-STAGE AUDIT TIMELINE */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
          <Clock className="w-5 h-5 text-blue-600" /> Quy trình 4 Bước Thẩm Định
          & Mở Bán
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 relative">
          {[
            {
              step: 1,
              title: "Tiếp nhận hồ sơ",
              desc: "Hệ thống đã lưu trữ dữ liệu & bộ ảnh",
              status: "completed",
            },
            {
              step: 2,
              title: "Thẩm định pháp lý",
              desc: "Kiểm tra GPKD & Số tài khoản ngân hàng (24-48h)",
              status: "active",
            },
            {
              step: 3,
              title: "Ký hợp đồng E-sign",
              desc: "Gửi hợp đồng điện tử tới email người ký",
              status: "pending",
            },
            {
              step: 4,
              title: "Mở bán trên OTA",
              desc: "Bàn giao tài khoản Portal & đón lượt đặt đầu tiên",
              status: "pending",
            },
          ].map((s) => (
            <div
              key={s.step}
              className={`p-4 rounded-xl border flex flex-col justify-between ${
                s.status === "completed"
                  ? "bg-emerald-50/60 border-emerald-300"
                  : s.status === "active"
                    ? "bg-blue-50/70 border-blue-400 shadow-2xs"
                    : "bg-slate-50 border-slate-200 opacity-60"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      s.status === "completed"
                        ? "bg-emerald-600 text-white"
                        : s.status === "active"
                          ? "bg-blue-600 text-white animate-pulse"
                          : "bg-slate-300 text-slate-700"
                    }`}
                  >
                    {s.status === "completed" ? "✓" : s.step}
                  </span>
                  {s.status === "active" && (
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">
                      Đang xử lý
                    </span>
                  )}
                </div>
                <h4 className="text-xs font-bold text-slate-900">{s.title}</h4>
                <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                  {s.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SUMMARY DETAILS */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4 text-xs text-slate-700">
        <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2">
          Tóm tắt thông tin đăng ký
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <p>
            🏢 <b className="text-slate-900">Tên chỗ nghỉ:</b>{" "}
            {data?.hotelNameVi || data?.hotelNameEn || "Chưa đặt tên"}
          </p>
          <p>
            📍 <b className="text-slate-900">Địa chỉ:</b>{" "}
            {data?.streetAddress || "N/A"}
            {data?.district && `, ${data.district}`}
            {data?.province && `, ${data.province}`}
          </p>
          <p>
            👤 <b className="text-slate-900">Người đại diện:</b>{" "}
            {data?.signerName || "N/A"} ({data?.signerPhone || "N/A"})
          </p>
          <p>
            💳 <b className="text-slate-900">Tài khoản thụ hưởng:</b>{" "}
            {data?.bankName || "N/A"} - {data?.bankAccount || "N/A"}
          </p>
          <p>
            📊 <b className="text-slate-900">Số lượng loại phòng:</b>{" "}
            {rooms.length} hạng phòng
          </p>
          <p>
            🤝 <b className="text-slate-900">Tỷ lệ hoa hồng thỏa thuận:</b>{" "}
            <span className="text-blue-600 font-bold">
              {data?.commissionRate || 18}%
            </span>
          </p>
        </div>
      </div>

      {/* ACTIONS */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
        <button
          type="button"
          onClick={handlePrint}
          className="w-full sm:w-auto px-6 h-11 border border-slate-200 hover:bg-slate-50 rounded-xl font-bold text-xs text-slate-700 flex items-center justify-center gap-2 transition cursor-pointer"
        >
          <Printer className="w-4 h-4" /> In phiếu đăng ký
        </button>

        <button
          type="button"
          onClick={onReset}
          className="w-full sm:w-auto px-8 h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-lg shadow-blue-200 transition flex items-center justify-center gap-2 cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" /> Tạo đơn đăng ký mới / Thử nghiệm lại
        </button>
      </div>
    </div>
  );
};

export default SubmittedSuccessView;
