// src/pages/reception/components/AddGuestDocModal.jsx
import React from "react";
import { X, UserCheck, ShieldCheck } from "lucide-react";

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
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn font-sans">
      <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl border border-gray-200 overflow-hidden text-xs text-gray-900 animate-scaleUp my-auto">
        {/* 1. HEADER CỐ ĐỊNH (SHRINK-0) */}
        <div className="bg-[#003580] text-white p-5 flex items-center justify-between shadow-xs shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-white shadow-inner">
              <UserCheck size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base tracking-tight text-white leading-none">
                  Khai Báo Khách Lưu Trú
                </h3>
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-blue-500/30 text-blue-100 font-bold border border-white/15">
                  CCCD / PASSPORT
                </span>
              </div>
              <p className="text-[11px] text-blue-100/80 font-medium mt-1 leading-none">
                Lưu hồ sơ định danh phục vụ khai báo tạm trú công an
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

        {/* 2. THÂN FORM CÓ THANH CUỘN (FLEX-1 OVERFLOW-Y-AUTO) - ĐẢM BẢO KHÔNG BỊ MẤT NÚT BẤM */}
        <form
          onSubmit={onSubmit}
          className="flex-1 overflow-y-auto p-6 space-y-4 bg-white"
        >
          <div className="flex items-center gap-3">
            <label className="w-28 text-[#0a2540] font-black text-xs">
              Phòng lưu trú <span className="text-rose-500">*</span>
            </label>
            <select
              value={formData.room_number}
              onChange={(e) =>
                setFormData({ ...formData, room_number: e.target.value })
              }
              className="flex-1 p-2.5 border border-blue-200 rounded-xl outline-none font-black text-[#003580] bg-blue-50/60 focus:bg-white focus:border-[#003580] cursor-pointer"
            >
              {rooms.map((r) => (
                <option key={r.id} value={r.room_number}>
                  Phòng {r.room_number} ({r.type_name || "Phòng tiêu chuẩn"})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <label className="w-28 text-[#0a2540] font-black text-xs">
              Họ và tên <span className="text-rose-500">*</span>
            </label>
            <input
              required
              value={formData.full_name}
              onChange={(e) =>
                setFormData({ ...formData, full_name: e.target.value })
              }
              placeholder="Nhập họ và tên trên giấy tờ..."
              className="flex-1 p-2.5 border border-gray-200 rounded-xl outline-none font-bold text-gray-900 bg-gray-50/50 focus:bg-white focus:border-[#003580]"
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="w-28 text-[#0a2540] font-black text-xs">
              Giới tính
            </label>
            <div className="flex items-center gap-2 font-bold text-xs">
              {[
                { id: "male", label: "Nam" },
                { id: "female", label: "Nữ" },
                { id: "other", label: "Khác" },
              ].map((g) => {
                const isChecked = formData.gender === g.id;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, gender: g.id })}
                    className={`px-4 py-2 rounded-xl border transition cursor-pointer ${
                      isChecked
                        ? "bg-[#003580] text-white border-[#003580] shadow-xs font-black"
                        : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {g.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="w-28 text-[#0a2540] font-black text-xs">
              Ngày sinh
            </label>
            <input
              type="date"
              value={formData.birthday}
              onChange={(e) =>
                setFormData({ ...formData, birthday: e.target.value })
              }
              className="flex-1 p-2.5 border border-gray-200 rounded-xl outline-none font-semibold text-gray-800 bg-gray-50/50 focus:bg-white focus:border-[#003580]"
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="w-28 text-[#0a2540] font-black text-xs">
              Quốc tịch
            </label>
            <select
              value={formData.nationality}
              onChange={(e) =>
                setFormData({ ...formData, nationality: e.target.value })
              }
              className="flex-1 p-2.5 border border-gray-200 rounded-xl outline-none bg-gray-50/50 font-bold text-gray-800 cursor-pointer focus:bg-white focus:border-[#003580]"
            >
              <option value="Việt Nam">🇻🇳 Việt Nam</option>
              <option value="Hàn Quốc">🇰🇷 Hàn Quốc</option>
              <option value="Mỹ">🇺🇸 Hoa Kỳ (USA)</option>
              <option value="Trung Quốc">🇨🇳 Trung Quốc</option>
              <option value="Nhật Bản">🇯🇵 Nhật Bản</option>
              <option value="Khác">🌍 Quốc gia khác</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <label className="w-28 text-[#0a2540] font-black text-xs">
              Địa chỉ thường trú
            </label>
            <input
              value={formData.address}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
              placeholder="Số nhà, phường/xã, quận/huyện..."
              className="flex-1 p-2.5 border border-gray-200 rounded-xl outline-none bg-gray-50/50 text-gray-900 focus:bg-white focus:border-[#003580]"
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="w-28 text-[#0a2540] font-black text-xs">
              Loại giấy tờ
            </label>
            <select
              value={formData.id_type}
              onChange={(e) =>
                setFormData({ ...formData, id_type: e.target.value })
              }
              className="flex-1 p-2.5 border border-gray-200 rounded-xl outline-none bg-gray-50/50 font-bold text-gray-800 cursor-pointer focus:bg-white focus:border-[#003580]"
            >
              <option value="CCCD">CCCD (Căn cước công dân gắn chip)</option>
              <option value="CMND">CMND (Chứng minh nhân dân)</option>
              <option value="Hộ chiếu">Hộ chiếu (Passport)</option>
              <option value="Bằng lái xe">GPLX / Bằng lái xe</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <label className="w-28 text-[#0a2540] font-black text-xs">
              Số định danh <span className="text-rose-500">*</span>
            </label>
            <input
              value={formData.id_number}
              onChange={(e) =>
                setFormData({ ...formData, id_number: e.target.value })
              }
              placeholder="VD: 07920100XXXX..."
              className="flex-1 p-2.5 border border-gray-200 rounded-xl outline-none font-mono font-black text-sm text-[#003580] bg-gray-50/50 focus:bg-white focus:border-[#003580]"
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="w-28 text-[#0a2540] font-black text-xs">
              Lý do lưu trú
            </label>
            <input
              value={formData.stay_reason}
              onChange={(e) =>
                setFormData({ ...formData, stay_reason: e.target.value })
              }
              placeholder="VD: Du lịch, Công tác, Thăm thân..."
              className="flex-1 p-2.5 border border-gray-200 rounded-xl outline-none bg-gray-50/50 text-gray-900 focus:bg-white focus:border-[#003580]"
            />
          </div>

          <div className="flex items-start gap-3">
            <label className="w-28 text-[#0a2540] font-black text-xs pt-2">
              Ghi chú thêm
            </label>
            <textarea
              rows={2}
              value={formData.note}
              onChange={(e) =>
                setFormData({ ...formData, note: e.target.value })
              }
              placeholder="Ghi chú thêm tình trạng giấy tờ..."
              className="flex-1 p-2.5 border border-gray-200 rounded-xl outline-none bg-gray-50/50 text-gray-900 focus:bg-white focus:border-[#003580]"
            />
          </div>

          {/* 3. NÚT THAO TÁC CỐ ĐỊNH Ở CHÂN */}
          <div className="flex justify-end gap-2.5 pt-4 border-t border-gray-100 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border border-gray-200 rounded-xl font-bold text-gray-700 hover:bg-gray-50 cursor-pointer transition"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-[#003580] hover:bg-blue-900 text-white font-black rounded-xl shadow-md cursor-pointer transition active:scale-95 flex items-center gap-2"
            >
              <ShieldCheck size={16} />
              <span>Lưu thông tin lưu trú</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
