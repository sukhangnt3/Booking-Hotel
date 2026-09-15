// src/pages/reception/components/CheckInGuestStayModal.jsx
import React from "react";
import {
  Plus,
  Minus,
  RotateCw,
  CreditCard,
  Edit,
  X,
  Users,
  CheckCircle2,
} from "lucide-react";

export default function CheckInGuestStayModal({
  isOpen,
  onClose,
  room,
  guestCount,
  setGuestCount,
  guestList,
  setGuestList,
  onOpenGuestDocForm,
  onSaveGuestInfoOnly,
  onFinalExecuteCheckIn,
}) {
  if (!isOpen || !room) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn font-sans">
      <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl border border-gray-200 overflow-hidden text-xs text-gray-900 animate-scaleUp">
        {/* ─── HEADER MODAL ĐỒNG BỘ MÀU XANH NAVY #003580 ─── */}
        <div className="bg-[#003580] text-white p-5 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-white shadow-inner">
              <Users size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base tracking-tight leading-none text-white">
                  Danh Sách Khách Lưu Trú
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/20 text-white font-bold">
                  #{room.booking?.code || "DP000008"}
                </span>
              </div>
              <p className="text-[11px] text-blue-100/80 font-medium mt-1 leading-none">
                Phòng {room.room_number} • {room.type_name || "Tiêu chuẩn"}
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

        {/* ─── BODY MODAL ─── */}
        <div className="p-6 space-y-5 bg-white">
          {/* Dòng 1: Số lượng khách */}
          <div className="flex items-center justify-between p-4 bg-gray-50/70 border border-gray-200 rounded-2xl flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#006ce4]" />
              <span className="font-black text-[#0a2540] text-xs uppercase tracking-wider">
                Số lượng khách thực tế
              </span>
            </div>

            <div className="flex items-center gap-6 flex-wrap">
              {/* Người lớn */}
              <div className="flex items-center gap-2.5">
                <span className="text-gray-600 font-bold text-xs">
                  Người lớn
                </span>
                <div className="flex items-center border border-gray-200 rounded-xl bg-white overflow-hidden shadow-2xs">
                  <button
                    type="button"
                    onClick={() =>
                      setGuestCount((prev) => ({
                        ...prev,
                        adult: Math.max(1, prev.adult - 1),
                      }))
                    }
                    className="p-2 hover:bg-blue-50 text-gray-700 hover:text-[#003580] cursor-pointer transition"
                  >
                    <Minus size={13} strokeWidth={2.5} />
                  </button>
                  <input
                    type="number"
                    value={guestCount.adult}
                    onChange={(e) =>
                      setGuestCount({
                        ...guestCount,
                        adult: Math.max(1, Number(e.target.value)),
                      })
                    }
                    className="w-10 text-center font-black text-[#003580] outline-none tabular-nums"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setGuestCount((prev) => ({
                        ...prev,
                        adult: prev.adult + 1,
                      }))
                    }
                    className="p-2 hover:bg-blue-50 text-gray-700 hover:text-[#003580] cursor-pointer transition"
                  >
                    <Plus size={13} strokeWidth={2.5} />
                  </button>
                </div>
              </div>

              {/* Trẻ em */}
              <div className="flex items-center gap-2.5">
                <span className="text-gray-600 font-bold text-xs">Trẻ em</span>
                <div className="flex items-center border border-gray-200 rounded-xl bg-white overflow-hidden shadow-2xs">
                  <button
                    type="button"
                    onClick={() =>
                      setGuestCount((prev) => ({
                        ...prev,
                        children: Math.max(0, prev.children - 1),
                      }))
                    }
                    className="p-2 hover:bg-blue-50 text-gray-700 hover:text-[#003580] cursor-pointer transition"
                  >
                    <Minus size={13} strokeWidth={2.5} />
                  </button>
                  <input
                    type="number"
                    value={guestCount.children}
                    onChange={(e) =>
                      setGuestCount({
                        ...guestCount,
                        children: Math.max(0, Number(e.target.value)),
                      })
                    }
                    className="w-10 text-center font-black text-gray-800 outline-none tabular-nums"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setGuestCount((prev) => ({
                        ...prev,
                        children: prev.children + 1,
                      }))
                    }
                    className="p-2 hover:bg-blue-50 text-gray-700 hover:text-[#003580] cursor-pointer transition"
                  >
                    <Plus size={13} strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Dòng 2: Thanh thao tác danh sách */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <span className="font-black text-[#0a2540] text-xs uppercase tracking-wider block">
                Hồ sơ định danh khách
              </span>
              <span className="text-[11px] text-gray-400">
                Đã khai báo {guestList.length} người lưu trú
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setGuestList([])}
                className="p-2 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-100 hover:text-rose-600 cursor-pointer transition"
                title="Làm mới danh sách"
              >
                <RotateCw size={14} />
              </button>

              <button
                type="button"
                onClick={() => onOpenGuestDocForm(null, null)}
                className="px-3.5 py-2 border border-gray-200 hover:border-[#003580] text-gray-800 font-bold rounded-xl hover:bg-blue-50/50 cursor-pointer flex items-center gap-1.5 transition shadow-2xs"
                title="Thêm người đi cùng"
              >
                <Plus size={14} />
                <span>Thêm khách</span>
              </button>

              <button
                type="button"
                onClick={() => onOpenGuestDocForm(null, null)}
                className="px-4 py-2 bg-[#003580] hover:bg-blue-900 text-white font-bold rounded-xl cursor-pointer flex items-center gap-1.5 shadow-xs transition active:scale-95"
              >
                <CreditCard size={14} />
                <span>Khai báo CCCD</span>
              </button>
            </div>
          </div>

          {/* Bảng danh sách khách */}
          <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 text-gray-500 font-bold uppercase tracking-wider border-b border-gray-200">
                  <th className="py-3 px-4">Họ và tên</th>
                  <th className="py-3 px-4">Thông tin cá nhân</th>
                  <th className="py-3 px-4">Phòng</th>
                  <th className="py-3 px-4">Thời gian khai báo</th>
                  <th className="py-3 px-4">Thời gian lưu trú</th>
                  <th className="py-3 px-2 text-center w-20">Sửa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {guestList.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-10 text-center text-gray-400 font-medium"
                    >
                      <p className="mb-2.5">
                        Chưa có thông tin định danh khách lưu trú
                      </p>
                      <button
                        type="button"
                        onClick={() => onOpenGuestDocForm(null, null)}
                        className="px-4 py-1.5 bg-blue-50 text-[#003580] border border-blue-200 rounded-xl font-bold hover:bg-blue-100 transition cursor-pointer"
                      >
                        + Khai báo ngay
                      </button>
                    </td>
                  </tr>
                ) : (
                  guestList.map((g, idx) => (
                    <tr key={idx} className="hover:bg-blue-50/40 transition">
                      <td className="py-3 px-4 font-bold text-gray-900">
                        {g.full_name}
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {g.gender === "male" ? "Nam" : "Nữ"} • {g.id_type}:{" "}
                        <b className="text-[#003580] font-mono font-bold">
                          {g.id_number ? (
                            g.id_number
                          ) : (
                            <span className="text-amber-600 font-normal italic">
                              Chưa nhập số CCCD
                            </span>
                          )}
                        </b>
                      </td>
                      <td className="py-3 px-4 font-black text-[#003580]">
                        P.{g.room_number}
                      </td>
                      <td className="py-3 px-4 text-gray-500 font-mono">
                        {g.declaration_time}
                      </td>
                      <td className="py-3 px-4 text-gray-700 font-medium">
                        {g.stay_duration}
                      </td>
                      <td className="py-3 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => onOpenGuestDocForm(g, idx)}
                          className="p-1.5 text-[#006ce4] hover:text-[#003580] hover:bg-blue-50 rounded-lg font-bold transition cursor-pointer"
                          title="Sửa thông tin CCCD"
                        >
                          <Edit size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* ─── FOOTER NÚT THAO TÁC ─── */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onSaveGuestInfoOnly}
              className="px-5 py-2.5 border border-gray-200 text-gray-700 hover:bg-gray-50 font-bold rounded-xl cursor-pointer transition shadow-2xs"
            >
              Lưu thông tin
            </button>

            <button
              type="button"
              onClick={onFinalExecuteCheckIn}
              className="px-6 py-2.5 bg-[#003580] hover:bg-blue-900 text-white font-black rounded-xl shadow-md cursor-pointer transition active:scale-95 flex items-center gap-2"
            >
              <CheckCircle2 size={16} />
              <span>Nhận phòng ngay</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
