// src/pages/reception/components/ConfirmCheckInModal.jsx
import React from "react";
import { User, Users } from "lucide-react";

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
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs animate-fadeIn">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-200 overflow-hidden text-xs font-sans animate-scaleUp">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200">
          <h3 className="font-extrabold text-sm text-slate-900">
            Xác nhận nhận phòng - {room.booking?.code || "DP000008"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-lg font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Thông tin khách hàng & số lượng khách đã khai báo */}
          <div className="flex items-center justify-between text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2">
              <User size={15} className="text-slate-400" />
              <span className="font-bold text-[#1b6a38] text-xs">
                {room.booking?.customer_name || "Khách lẻ"} -{" "}
                {room.booking?.guest_phone || "---"}
              </span>
            </div>

            <div className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
              <Users size={14} className="text-slate-400" />
              <span>
                {guestCount.adult} người lớn, {guestCount.children} trẻ em
                {guestList.length > 0 && ` (${guestList.length} giấy tờ/CCCD)`}
              </span>
            </div>
          </div>

          {/* Bảng chi tiết giờ nhận / trả phòng */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#eef8f2] text-slate-700 border-b text-xs">
                  <th className="py-2.5 px-4 font-bold">Hạng phòng</th>
                  <th className="py-2.5 px-4 font-bold">Phòng</th>
                  <th className="py-2.5 px-4 font-bold">
                    <div className="flex items-center gap-1.5">
                      <span>Nhận</span>
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
                        className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer transition ${
                          confirmData.checkin_mode === "Hiện tại"
                            ? "border border-[#1b6a38] text-[#1b6a38] bg-white shadow-2xs"
                            : "border border-slate-300 text-slate-600 bg-white"
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
                        className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer transition ${
                          confirmData.checkin_mode === "Giờ đặt"
                            ? "border border-[#1b6a38] text-[#1b6a38] bg-white shadow-2xs"
                            : "border border-slate-300 text-slate-600 bg-white"
                        }`}
                      >
                        Giờ đặt
                      </button>
                    </div>
                  </th>
                  <th className="py-2.5 px-4 font-bold">Trả</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="py-3 px-4 font-medium text-slate-800">
                    {room.type_name}
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-900">
                    {room.room_number}
                  </td>
                  <td className="py-3 px-4">
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
                        className="border border-slate-300 rounded-lg px-2 py-1 outline-none text-slate-800 font-semibold bg-white"
                      />
                      <span className="text-slate-500 font-medium whitespace-nowrap">
                        {confirmData.duration_label}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <input
                      type="datetime-local"
                      value={confirmData.checkout_time}
                      onChange={(e) =>
                        setConfirmData((prev) => ({
                          ...prev,
                          checkout_time: e.target.value,
                        }))
                      }
                      className="border border-slate-300 rounded-lg px-2 py-1 outline-none text-slate-800 font-semibold bg-white"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer 2 Nút */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-white">
          <button
            type="button"
            onClick={onOpenGuestStay}
            className="px-4 py-2 border border-[#1b6a38] text-[#1b6a38] hover:bg-emerald-50 font-bold rounded-lg cursor-pointer transition text-xs shadow-2xs"
          >
            Xác nhận và thêm TT khách
          </button>

          <button
            type="button"
            onClick={onFinalExecuteCheckIn}
            className="px-6 py-2 bg-[#1b6a38] hover:bg-[#14532d] text-white font-bold rounded-lg shadow-sm cursor-pointer transition active:scale-95 text-xs"
          >
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  );
}
