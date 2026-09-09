// src/pages/reception/components/AddGuestDocModal.jsx
import React from "react";

export default function AddGuestDocModal({
  isOpen,
  onClose,
  rooms = [],
  formData,
  setFormData,
  onSubmit,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs animate-fadeIn">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden text-xs font-sans animate-scaleUp">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200">
          <h3 className="font-extrabold text-sm text-slate-900">
            Thêm thông tin khách lưu trú
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-lg font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-3.5">
          {/* Phòng */}
          <div className="flex items-center gap-3">
            <label className="w-24 text-slate-700 font-medium">Phòng</label>
            <select
              value={formData.room_number}
              onChange={(e) =>
                setFormData({ ...formData, room_number: e.target.value })
              }
              className="flex-1 p-2 border border-slate-300 rounded-lg outline-none font-bold text-slate-900 bg-white cursor-pointer"
            >
              {rooms.map((r) => (
                <option key={r.id} value={r.room_number}>
                  {r.room_number}
                </option>
              ))}
            </select>
          </div>

          {/* Họ và tên */}
          <div className="flex items-center gap-3">
            <label className="w-24 text-slate-700 font-medium">Họ và tên</label>
            <input
              required
              value={formData.full_name}
              onChange={(e) =>
                setFormData({ ...formData, full_name: e.target.value })
              }
              placeholder="Nhập họ và tên người lưu trú..."
              className="flex-1 p-2 border border-emerald-600 rounded-lg outline-none font-bold text-slate-900"
            />
          </div>

          {/* Giới tính */}
          <div className="flex items-center gap-3">
            <label className="w-24 text-slate-700 font-medium">Giới tính</label>
            <div className="flex items-center gap-6 font-semibold text-slate-700">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="guest_gender"
                  checked={formData.gender === "male"}
                  onChange={() => setFormData({ ...formData, gender: "male" })}
                  className="accent-[#1b6a38]"
                />
                <span>Nam</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="guest_gender"
                  checked={formData.gender === "female"}
                  onChange={() =>
                    setFormData({ ...formData, gender: "female" })
                  }
                  className="accent-[#1b6a38]"
                />
                <span>Nữ</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="guest_gender"
                  checked={formData.gender === "other"}
                  onChange={() => setFormData({ ...formData, gender: "other" })}
                  className="accent-[#1b6a38]"
                />
                <span>Khác</span>
              </label>
            </div>
          </div>

          {/* Ngày sinh */}
          <div className="flex items-center gap-3">
            <label className="w-24 text-slate-700 font-medium">Ngày sinh</label>
            <input
              type="date"
              value={formData.birthday}
              onChange={(e) =>
                setFormData({ ...formData, birthday: e.target.value })
              }
              className="flex-1 p-2 border border-slate-300 rounded-lg outline-none text-slate-700 bg-white"
            />
          </div>

          {/* Quốc tịch */}
          <div className="flex items-center gap-3">
            <label className="w-24 text-slate-700 font-medium">Quốc tịch</label>
            <select
              value={formData.nationality}
              onChange={(e) =>
                setFormData({ ...formData, nationality: e.target.value })
              }
              className="flex-1 p-2 border border-slate-300 rounded-lg outline-none bg-white cursor-pointer"
            >
              <option value="Việt Nam">Việt Nam</option>
              <option value="Hàn Quốc">Hàn Quốc</option>
              <option value="Mỹ">Mỹ</option>
              <option value="Khác">Khác</option>
            </select>
          </div>

          {/* Địa chỉ */}
          <div className="flex items-center gap-3">
            <label className="w-24 text-slate-700 font-medium">Địa chỉ</label>
            <input
              value={formData.address}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
              placeholder="Nhập địa chỉ thường trú..."
              className="flex-1 p-2 border border-slate-300 rounded-lg outline-none"
            />
          </div>

          {/* Loại giấy tờ */}
          <div className="flex items-center gap-3">
            <label className="w-24 text-slate-700 font-medium">
              Loại giấy tờ
            </label>
            <select
              value={formData.id_type}
              onChange={(e) =>
                setFormData({ ...formData, id_type: e.target.value })
              }
              className="flex-1 p-2 border border-slate-300 rounded-lg outline-none bg-white cursor-pointer"
            >
              <option value="CCCD">CCCD</option>
              <option value="CMND">CMND</option>
              <option value="Hộ chiếu">Hộ chiếu</option>
              <option value="Bằng lái xe">Bằng lái xe</option>
            </select>
          </div>

          {/* Số giấy tờ */}
          <div className="flex items-center gap-3">
            <label className="w-24 text-slate-700 font-medium">
              Số giấy tờ
            </label>
            <input
              value={formData.id_number}
              onChange={(e) =>
                setFormData({ ...formData, id_number: e.target.value })
              }
              placeholder="Nhập số CCCD / Hộ chiếu..."
              className="flex-1 p-2 border border-slate-300 rounded-lg outline-none font-mono"
            />
          </div>

          {/* Lý do lưu trú */}
          <div className="flex items-center gap-3">
            <label className="w-24 text-slate-700 font-medium">
              Lý do lưu trú
            </label>
            <input
              value={formData.stay_reason}
              onChange={(e) =>
                setFormData({ ...formData, stay_reason: e.target.value })
              }
              className="flex-1 p-2 border border-slate-300 rounded-lg outline-none"
            />
          </div>

          {/* Ghi chú */}
          <div className="flex items-start gap-3">
            <label className="w-24 text-slate-700 font-medium pt-1">
              Ghi chú
            </label>
            <textarea
              rows={2}
              value={formData.note}
              onChange={(e) =>
                setFormData({ ...formData, note: e.target.value })
              }
              placeholder="Nhập ghi chú..."
              className="flex-1 p-2 border border-slate-300 rounded-lg outline-none"
            />
          </div>

          {/* Nút lưu */}
          <div className="flex justify-end pt-2 border-t">
            <button
              type="submit"
              className="px-8 py-2 bg-[#1b6a38] hover:bg-[#14532d] text-white font-bold rounded-lg shadow-sm cursor-pointer transition active:scale-95"
            >
              Lưu thông tin
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
