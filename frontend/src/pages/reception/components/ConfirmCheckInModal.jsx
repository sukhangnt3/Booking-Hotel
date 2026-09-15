// src/pages/reception/components/ConfirmCheckInModal.jsx
import React from "react";
import { User, Users, X, CheckCircle2, Key } from "lucide-react";

export default function ConfirmCheckInModal({
  isOpen,
  onClose,
  room,
  confirmData,
  setConfirmData,
  onOpenGuestStay,
  onFinalExecuteCheckIn,
  guestCount,
  guestList,
  toDatetimeLocal,
}) {
  if (!isOpen || !room) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn font-sans">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl border border-gray-200 overflow-hidden text-xs text-gray-900 animate-scaleUp my-auto">
        {/* 1. HEADER CỐ ĐỊNH (SHRINK-0) */}
        <div className="bg-[#003580] text-white p-5 flex items-center justify-between shadow-xs shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-white shadow-inner">
              <Key size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base tracking-tight leading-none text-white">
                  Xác Nhận Nhận Phòng
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/20 text-white font-bold">
                  #{room.booking?.code || "DP000008"}
                </span>
              </div>
              <p className="text-[11px] text-blue-100/80 font-medium mt-1 leading-none">
                Kiểm tra mốc thời gian nhận - trả phòng trước khi giao chìa khóa
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white rounded-xl hover:bg-white/10 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* 2. THÂN FORM CÓ THANH CUỘN (FLEX-1 OVERFLOW-Y-AUTO) */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1 bg-white">
          {/* THÔNG TIN KHÁCH HÀNG */}
          <div className="flex items-center justify-between text-gray-800 bg-blue-50/60 p-3.5 rounded-2xl border border-blue-200/80 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-100 text-[#003580] flex items-center justify-center">
                <User size={15} />
              </div>
              <div>
                <span className="font-black text-[#003580] text-xs block">
                  {room.booking?.customer_name || "Khách lẻ"}
                </span>
                <span className="text-[11px] text-gray-500 font-mono">
                  {room.booking?.guest_phone || "Chưa có số điện thoại"}
                </span>
              </div>
            </div>

            <div className="text-xs font-bold text-gray-700 flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-blue-100 shadow-2xs">
              <Users size={14} className="text-[#006ce4]" />
              <span>
                {guestCount.adult} người lớn, {guestCount.children} trẻ em
                {guestList.length > 0 && ` (${guestList.length} CCCD)`}
              </span>
            </div>
          </div>

          {/* BẢNG GIỜ NHẬN / TRẢ */}
          <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 border-b border-gray-200 text-xs uppercase font-bold tracking-wider">
                  <th className="py-3 px-4">Hạng phòng</th>
                  <th className="py-3 px-4">Phòng</th>
                  <th className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span>Nhận phòng</span>
                      <button
                        type="button"
                        onClick={() => {
                          const now = new Date();
                          setConfirmData((prev) => ({
                            ...prev,
                            checkin_mode: "Hiện tại",
                            checkin_time: toDatetimeLocal(now),
                          }));
                        }}
                        className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black cursor-pointer transition ${
                          confirmData.checkin_mode === "Hiện tại"
                            ? "bg-[#003580] text-white shadow-2xs"
                            : "border border-gray-200 text-gray-600 bg-white hover:bg-gray-100"
                        }`}
                      >
                        Hiện tại
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const orig = new Date(
                            room.booking?.checkin_date || new Date(),
                          );
                          setConfirmData((prev) => ({
                            ...prev,
                            checkin_mode: "Giờ đặt",
                            checkin_time: toDatetimeLocal(orig),
                          }));
                        }}
                        className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black cursor-pointer transition ${
                          confirmData.checkin_mode === "Giờ đặt"
                            ? "bg-[#003580] text-white shadow-2xs"
                            : "border border-gray-200 text-gray-600 bg-white hover:bg-gray-100"
                        }`}
                      >
                        Giờ đặt
                      </button>
                    </div>
                  </th>
                  <th className="py-3 px-4">Trả phòng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                <tr>
                  <td className="py-3.5 px-4 font-bold text-gray-900">
                    {room.type_name}
                  </td>
                  <td className="py-3.5 px-4 font-black text-[#003580]">
                    P.{room.room_number}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="datetime-local"
                        value={confirmData.checkin_time}
                        onChange={(e) =>
                          setConfirmData((prev) => ({
                            ...prev,
                            checkin_time: e.target.value,
                          }))
                        }
                        className="border border-gray-200 rounded-xl px-2.5 py-1.5 outline-none text-gray-900 font-bold bg-white focus:border-[#003580]"
                      />
                      <span className="text-[#006ce4] font-black whitespace-nowrap bg-blue-50 px-2 py-1 rounded-md border border-blue-100 text-[11px]">
                        {confirmData.duration_label}
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <input
                      type="datetime-local"
                      value={confirmData.checkout_time}
                      onChange={(e) =>
                        setConfirmData((prev) => ({
                          ...prev,
                          checkout_time: e.target.value,
                        }))
                      }
                      className="border border-gray-200 rounded-xl px-2.5 py-1.5 outline-none text-gray-900 font-bold bg-white focus:border-[#003580]"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 3. FOOTER CỐ ĐỊNH (SHRINK-0) */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3 bg-gray-50/70 shrink-0">
          <button
            type="button"
            onClick={onOpenGuestStay}
            className="px-5 py-2.5 border border-gray-200 text-gray-800 hover:bg-white font-bold rounded-xl cursor-pointer transition text-xs shadow-2xs"
          >
            Thêm thông tin khách
          </button>

          <button
            type="button"
            onClick={onFinalExecuteCheckIn}
            className="px-6 py-2.5 bg-[#003580] hover:bg-blue-900 text-white font-black rounded-xl shadow-md cursor-pointer transition active:scale-95 text-xs flex items-center gap-2"
          >
            <CheckCircle2 size={16} />
            <span>Xác nhận giao phòng</span>
          </button>
        </div>
      </div>
    </div>
  );
}
