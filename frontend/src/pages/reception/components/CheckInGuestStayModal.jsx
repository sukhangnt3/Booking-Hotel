// src/pages/reception/components/CheckInGuestStayModal.jsx
import React from "react";
import { Plus, Minus, RotateCw, CreditCard, Edit } from "lucide-react";

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
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs animate-fadeIn">
      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl border border-slate-200 overflow-hidden text-xs font-sans animate-scaleUp">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200">
          <h3 className="font-extrabold text-sm text-slate-900">
            Khách lưu trú - {room.booking?.code || "DP000008"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-lg font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Dòng 1: Số lượng khách */}
          <div className="flex items-center gap-8 flex-wrap">
            <span className="font-bold text-slate-800 text-xs">
              Số lượng khách
            </span>

            {/* Người lớn */}
            <div className="flex items-center gap-3">
              <span className="text-slate-600 font-medium">Người lớn</span>
              <div className="flex items-center border border-slate-300 rounded-lg bg-white overflow-hidden">
                <button
                  type="button"
                  onClick={() =>
                    setGuestCount((prev) => ({
                      ...prev,
                      adult: Math.max(1, prev.adult - 1),
                    }))
                  }
                  className="p-1.5 hover:bg-slate-100 text-slate-600 cursor-pointer"
                >
                  <Minus size={13} />
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
                  className="w-10 text-center font-bold text-slate-900 outline-none"
                />
                <button
                  type="button"
                  onClick={() =>
                    setGuestCount((prev) => ({
                      ...prev,
                      adult: prev.adult + 1,
                    }))
                  }
                  className="p-1.5 hover:bg-slate-100 text-slate-600 cursor-pointer"
                >
                  <Plus size={13} />
                </button>
              </div>
            </div>

            {/* Trẻ em */}
            <div className="flex items-center gap-3">
              <span className="text-slate-600 font-medium">Trẻ em</span>
              <div className="flex items-center border border-slate-300 rounded-lg bg-white overflow-hidden">
                <button
                  type="button"
                  onClick={() =>
                    setGuestCount((prev) => ({
                      ...prev,
                      children: Math.max(0, prev.children - 1),
                    }))
                  }
                  className="p-1.5 hover:bg-slate-100 text-slate-600 cursor-pointer"
                >
                  <Minus size={13} />
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
                  className="w-10 text-center font-bold text-slate-900 outline-none"
                />
                <button
                  type="button"
                  onClick={() =>
                    setGuestCount((prev) => ({
                      ...prev,
                      children: prev.children + 1,
                    }))
                  }
                  className="p-1.5 hover:bg-slate-100 text-slate-600 cursor-pointer"
                >
                  <Plus size={13} />
                </button>
              </div>
            </div>
          </div>

          {/* Dòng 2: Nút thao tác */}
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-800 text-xs">
              Thông tin chi tiết
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setGuestList([])}
                className="p-2 border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 cursor-pointer"
                title="Xóa danh sách"
              >
                <RotateCw size={14} />
              </button>

              <button
                type="button"
                onClick={() => onOpenGuestDocForm(null, null)}
                className="px-3 py-1.5 border border-slate-300 hover:border-[#1b6a38] text-slate-700 font-bold rounded-lg hover:bg-slate-50 cursor-pointer flex items-center gap-1.5 shadow-2xs"
                title="Thêm người đi cùng"
              >
                <Plus size={14} />
                <span>Thêm khách</span>
              </button>

              <button
                type="button"
                onClick={() => onOpenGuestDocForm(null, null)}
                className="px-3.5 py-1.5 border border-[#1b6a38] text-[#1b6a38] font-bold rounded-lg hover:bg-emerald-50 cursor-pointer flex items-center gap-1.5 shadow-2xs"
              >
                <CreditCard size={14} />
                <span>Giấy tờ / CCCD</span>
              </button>
            </div>
          </div>

          {/* Bảng danh sách khách */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#eef8f2] text-slate-700 border-b">
                  <th className="py-2.5 px-3 font-bold">Họ và tên</th>
                  <th className="py-2.5 px-3 font-bold">Thông tin cá nhân</th>
                  <th className="py-2.5 px-3 font-bold">Phòng</th>
                  <th className="py-2.5 px-3 font-bold">Thời gian khai báo</th>
                  <th className="py-2.5 px-3 font-bold">Thời gian lưu trú</th>
                  <th className="py-2.5 px-2 text-center w-20">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {guestList.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-8 text-center text-slate-400 font-medium"
                    >
                      <p className="mb-2">Chưa có thông tin khách lưu trú</p>
                      <button
                        type="button"
                        onClick={() => onOpenGuestDocForm(null, null)}
                        className="px-3 py-1 bg-emerald-50 text-[#1b6a38] border border-emerald-600 rounded font-bold hover:bg-emerald-100"
                      >
                        + Nhập thông tin khách
                      </button>
                    </td>
                  </tr>
                ) : (
                  guestList.map((g, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-slate-50 border-b border-slate-100"
                    >
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        {g.full_name}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {g.gender === "male" ? "Nam" : "Nữ"} • {g.id_type}:{" "}
                        <b className="text-slate-900 font-mono">
                          {g.id_number ? (
                            g.id_number
                          ) : (
                            <span className="text-amber-600 font-normal italic">
                              Chưa nhập số CCCD
                            </span>
                          )}
                        </b>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-emerald-800">
                        {g.room_number}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">
                        {g.declaration_time}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {g.stay_duration}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => onOpenGuestDocForm(g, idx)}
                          className="p-1 text-emerald-700 hover:text-emerald-900 font-bold"
                          title="Nhập / Sửa CCCD"
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

          {/* Footer: Nút [Lưu thông tin] và [Nhận phòng ngay] */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onSaveGuestInfoOnly}
              className="px-5 py-2 border border-[#1b6a38] text-[#1b6a38] hover:bg-emerald-50 font-bold rounded-lg cursor-pointer transition text-xs shadow-2xs"
            >
              Lưu thông tin
            </button>

            <button
              type="button"
              onClick={onFinalExecuteCheckIn}
              className="px-6 py-2 bg-[#1b6a38] hover:bg-[#14532d] text-white font-bold rounded-lg shadow-sm cursor-pointer transition active:scale-95 text-xs"
            >
              Nhận phòng ngay
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
