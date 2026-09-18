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
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-5 bg-black/65 backdrop-blur-xs animate-fadeIn font-sans">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl border border-gray-200 overflow-hidden text-xs text-gray-900 animate-scaleUp my-auto">
        {/* HEADER CỐ ĐỊNH */}
        <div className="bg-[#003580] text-white px-7 py-4.5 flex items-center justify-between shadow-xs shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-white shadow-inner">
              <UserCheck size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-lg tracking-tight text-white leading-none">
                  Khai Báo Khách Lưu Trú
                </h3>
                <span className="text-[9px] px-2.5 py-0.5 rounded-full bg-blue-500/30 text-blue-100 font-bold border border-white/15">
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
            <X size={20} />
          </button>
        </div>

        {/* THÂN FORM 2 CỘT RỘNG RÃI */}
        <form
          onSubmit={onSubmit}
          className="flex-1 overflow-y-auto p-7 space-y-4 bg-white"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[#0a2540] font-bold text-xs block">
                Phòng lưu trú <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.room_number}
                onChange={(e) =>
                  setFormData({ ...formData, room_number: e.target.value })
                }
                className="w-full h-10 px-3 border border-blue-200 rounded-xl outline-none font-black text-[#003580] bg-blue-50/60 focus:bg-white focus:border-[#003580] cursor-pointer"
              >
                {rooms.map((r) => (
                  <option key={r.id} value={r.room_number}>
                    Phòng {r.room_number} ({r.type_name || "Tiêu chuẩn"})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[#0a2540] font-bold text-xs block">
                Họ và tên <span className="text-rose-500">*</span>
              </label>
              <input
                required
                value={formData.full_name}
                onChange={(e) =>
                  setFormData({ ...formData, full_name: e.target.value })
                }
                placeholder="Nhập họ và tên trên giấy tờ..."
                className="w-full h-10 px-3 border border-gray-300 rounded-xl outline-none font-bold text-gray-900 bg-gray-50/50 focus:bg-white focus:border-[#003580]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[#0a2540] font-bold text-xs block">
                Giới tính
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "male", label: "Nam" },
                  { id: "female", label: "Nữ" },
                  { id: "other", label: "Khác" },
                ].map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, gender: g.id })}
                    className={`h-10 rounded-xl border font-bold transition cursor-pointer ${
                      formData.gender === g.id
                        ? "bg-[#003580] text-white border-[#003580] shadow-xs"
                        : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[#0a2540] font-bold text-xs block">
                Ngày sinh
              </label>
              <input
                type="date"
                value={formData.birthday}
                onChange={(e) =>
                  setFormData({ ...formData, birthday: e.target.value })
                }
                className="w-full h-10 px-3 border border-gray-300 rounded-xl outline-none font-semibold text-gray-800 bg-gray-50/50 focus:bg-white focus:border-[#003580]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[#0a2540] font-bold text-xs block">
                Loại giấy tờ
              </label>
              <select
                value={formData.id_type}
                onChange={(e) =>
                  setFormData({ ...formData, id_type: e.target.value })
                }
                className="w-full h-10 px-3 border border-gray-300 rounded-xl outline-none bg-gray-50/50 font-bold text-gray-800 cursor-pointer focus:bg-white focus:border-[#003580]"
              >
                <option value="CCCD">CCCD gắn chip</option>
                <option value="CMND">CMND</option>
                <option value="Hộ chiếu">Hộ chiếu (Passport)</option>
                <option value="Bằng lái xe">GPLX / Bằng lái</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[#0a2540] font-bold text-xs block">
                Số định danh / CCCD <span className="text-rose-500">*</span>
              </label>
              <input
                required
                value={formData.id_number}
                onChange={(e) =>
                  setFormData({ ...formData, id_number: e.target.value })
                }
                placeholder="VD: 07920100XXXX..."
                className="w-full h-10 px-3 border border-gray-300 rounded-xl outline-none font-mono font-black text-sm text-[#003580] bg-gray-50/50 focus:bg-white focus:border-[#003580]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[#0a2540] font-bold text-xs block">
                Quốc tịch
              </label>
              <select
                value={formData.nationality}
                onChange={(e) =>
                  setFormData({ ...formData, nationality: e.target.value })
                }
                className="w-full h-10 px-3 border border-gray-300 rounded-xl outline-none bg-gray-50/50 font-bold text-gray-800 cursor-pointer focus:bg-white focus:border-[#003580]"
              >
                <option value="Việt Nam">🇻🇳 Việt Nam</option>
                <option value="Hàn Quốc">🇰🇷 Hàn Quốc</option>
                <option value="Mỹ">🇺🇸 Hoa Kỳ (USA)</option>
                <option value="Khác">🌍 Quốc gia khác</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[#0a2540] font-bold text-xs block">
                Lý do lưu trú
              </label>
              <input
                value={formData.stay_reason}
                onChange={(e) =>
                  setFormData({ ...formData, stay_reason: e.target.value })
                }
                placeholder="Du lịch, Công tác..."
                className="w-full h-10 px-3 border border-gray-300 rounded-xl outline-none bg-gray-50/50 text-gray-900 focus:bg-white focus:border-[#003580]"
              />
            </div>
          </div>

          <div className="space-y-1.5 pt-1">
            <label className="text-[#0a2540] font-bold text-xs block">
              Địa chỉ thường trú
            </label>
            <input
              value={formData.address}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
              placeholder="Số nhà, phường/xã, quận/huyện, tỉnh/thành..."
              className="w-full h-10 px-3 border border-gray-300 rounded-xl outline-none bg-gray-50/50 text-gray-900 focus:bg-white focus:border-[#003580]"
            />
          </div>

          {/* NÚT THAO TÁC CỐ ĐỊNH */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border border-gray-300 bg-white hover:bg-gray-50 rounded-xl font-bold text-gray-700 cursor-pointer transition shadow-2xs"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-7 py-2.5 bg-[#003580] hover:bg-blue-900 text-white font-black rounded-xl shadow-md cursor-pointer transition active:scale-95 flex items-center gap-2"
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
