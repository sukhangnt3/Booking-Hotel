// src/pages/owner/StaffManagementPage.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
  Users,
  UserPlus,
  Search,
  Building2,
  Lock,
  Unlock,
  Trash2,
  RefreshCw,
  Mail,
  Phone,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react";
import { LoadingSpinner, EmptyState } from "@/components/common";
import apiClient from "@/services/apiClient";

export default function StaffManagementPage() {
  const [staffList, setStaffList] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedHotelFilter, setSelectedHotelFilter] = useState("all");
  const [apiError, setApiError] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    password: "",
    hotel_id: "",
  });

  const fetchMyHotels = useCallback(async () => {
    try {
      const res = await apiClient.get("/hotels/my-hotels?active_only=true");
      const list = res?.data || res?.hotels || res || [];
      const hotelArr = Array.isArray(list) ? list : [];
      setHotels(hotelArr);
      if (hotelArr.length > 0 && !formData.hotel_id) {
        setFormData((prev) => ({ ...prev, hotel_id: hotelArr[0].id }));
      }
    } catch (err) {
      console.error("Lỗi lấy danh sách khách sạn:", err);
    }
  }, [formData.hotel_id]);

  const fetchStaffList = useCallback(async () => {
    setLoading(true);
    setApiError("");
    try {
      const res = await apiClient.get("/owner/staff");
      const list = res?.data || res?.staff || res || [];
      setStaffList(Array.isArray(list) ? list : []);
    } catch (err) {
      setApiError(
        err?.response?.data?.message ||
          "Không thể kết nối danh sách nhân viên.",
      );
      setStaffList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMyHotels();
    fetchStaffList();
  }, [fetchMyHotels, fetchStaffList]);

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    if (!formData.hotel_id) {
      alert("Vui lòng chọn khách sạn cho lễ tân!");
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.post("/owner/staff", {
        ...formData,
        role: "RECEPTIONIST",
      });

      alert(`✓ Đã tạo thành công tài khoản Lễ tân: [${formData.full_name}]!`);
      setIsModalOpen(false);
      setFormData({
        full_name: "",
        email: "",
        phone: "",
        password: "",
        hotel_id: hotels[0]?.id || "",
      });
      fetchStaffList();
    } catch (err) {
      alert(`Lỗi tạo lễ tân: ${err?.response?.data?.message || err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteStaff = async (staffId, staffName) => {
    if (
      !window.confirm(
        `Bạn có chắc muốn xóa nhân viên lễ tân [${staffName}] khỏi cơ sở?`,
      )
    )
      return;
    try {
      await apiClient.delete(`/owner/staff/${staffId}`);
      setStaffList((prev) => prev.filter((s) => s.id !== staffId));
      alert(`✓ Đã xóa tài khoản nhân viên [${staffName}]!`);
    } catch (err) {
      alert(`Lỗi khi xóa: ${err?.response?.data?.message || err.message}`);
    }
  };

  const handleToggleActive = async (staff) => {
    try {
      await apiClient.patch(`/owner/staff/${staff.id}/status`, {
        activate: !staff.activate,
      });
      setStaffList((prev) =>
        prev.map((s) =>
          s.id === staff.id ? { ...s, activate: !s.activate } : s,
        ),
      );
    } catch (err) {
      alert("Lỗi đổi trạng thái: " + err.message);
    }
  };

  const filteredStaff = staffList.filter((s) => {
    if (
      selectedHotelFilter !== "all" &&
      String(s.hotel_id) !== String(selectedHotelFilter)
    ) {
      return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        s.full_name?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q) ||
        s.phone?.includes(q)
      );
    }
    return true;
  });

  return (
    <div className="w-full pb-24 bg-gray-50/50 font-sans text-gray-900 min-h-screen p-4 sm:p-6 lg:p-8 space-y-6">
      {/* HEADER THEO PHONG CÁCH GHOSTAY */}
      <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#006ce4] font-bold text-xs uppercase tracking-wider mb-1">
            <Users size={16} /> Phân Quyền & Quản Lý Đội Ngũ
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#0a2540] tracking-tight">
            Nhân Viên Lễ Tân ({staffList.length} Nhân viên)
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Cấp tài khoản lễ tân để nhân viên đăng nhập vào trực quầy và đặt
            phòng
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="px-5 py-2.5 bg-[#003580] hover:bg-blue-900 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-2 cursor-pointer active:scale-95 whitespace-nowrap"
          >
            <UserPlus size={16} /> Cấp tài khoản mới
          </button>
          <button
            type="button"
            onClick={fetchStaffList}
            className="p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition cursor-pointer"
            title="Làm mới danh sách"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {apiError && (
        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-2xl flex items-center gap-2 font-semibold">
          <AlertCircle size={16} className="text-amber-600 shrink-0" />
          <span>{apiError}</span>
        </div>
      )}

      {/* THANH TÌM KIẾM & LỌC CƠ SỞ */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Tìm theo tên, email, SĐT..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#003580] shadow-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Building2 size={16} className="text-gray-400 shrink-0" />
          <select
            value={selectedHotelFilter}
            onChange={(e) => setSelectedHotelFilter(e.target.value)}
            className="w-full sm:w-auto p-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none cursor-pointer shadow-xs"
          >
            <option value="all">Tất cả chi nhánh khách sạn</option>
            {hotels.map((h) => (
              <option key={h.id} value={h.id}>
                🏨 {h.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* DANH SÁCH LỄ TÂN */}
      {loading ? (
        <div className="py-24 flex justify-center bg-white rounded-3xl border border-gray-200 shadow-sm">
          <LoadingSpinner size="lg" label="Đang tải danh sách nhân viên..." />
        </div>
      ) : filteredStaff.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStaff.map((staff) => (
            <div
              key={staff.id}
              className="bg-white rounded-3xl border border-gray-200 p-5 shadow-xs hover:shadow-md transition space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="px-2.5 py-0.5 bg-blue-50 text-[#003580] font-black text-[10px] rounded-md border border-blue-100 uppercase">
                      Lễ Tân Ca Trực
                    </span>
                    <h3 className="font-black text-[#0a2540] text-base mt-1.5">
                      {staff.full_name}
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleActive(staff)}
                    className={`p-2 rounded-xl border cursor-pointer transition ${
                      staff.activate !== false
                        ? "text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200"
                        : "text-rose-700 bg-rose-50 hover:bg-rose-100 border-rose-200"
                    }`}
                    title={
                      staff.activate !== false
                        ? "Tài khoản đang mở"
                        : "Tài khoản đang bị khóa"
                    }
                  >
                    {staff.activate !== false ? (
                      <Unlock size={14} />
                    ) : (
                      <Lock size={14} />
                    )}
                  </button>
                </div>

                <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200/80 space-y-1.5 text-xs text-gray-600">
                  <div className="flex items-center gap-2">
                    <Building2 size={13} className="text-[#003580] shrink-0" />
                    <span className="font-bold text-gray-900 truncate">
                      {staff.hotel_name || "Khách sạn trung tâm"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    <Mail size={13} className="text-gray-400 shrink-0" />
                    <span className="truncate">{staff.email}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    <Phone size={13} className="text-gray-400 shrink-0" />
                    <span>{staff.phone || "---"}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                <span className="text-[11px] text-gray-400">
                  Tạo ngày: {staff.created_at?.split("T")[0] || "---"}
                </span>

                <button
                  type="button"
                  onClick={() => handleDeleteStaff(staff.id, staff.full_name)}
                  className="px-3 py-1.5 text-rose-600 hover:bg-rose-50 rounded-xl font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 size={13} /> Xóa
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Users}
          title="Chưa có nhân viên lễ tân nào"
          description="Bấm '+ Cấp Tài Khoản Mới' để tạo tài khoản cho nhân viên làm việc tại quầy."
        />
      )}

      {/* MODAL TẠO LỄ TÂN MỚI */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-gray-200 space-y-4 text-xs font-sans">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-black text-base text-[#0a2540] flex items-center gap-1.5">
                  <UserPlus size={18} className="text-[#003580]" /> Cấp Tài
                  Khoản Nhân Viên Lễ Tân
                </h3>
                <p className="text-[11px] text-gray-500">
                  Nhân viên chỉ có quyền truy cập sơ đồ phòng và tiếp tân cơ sở
                  được gán
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 hover:bg-gray-100 rounded-xl cursor-pointer text-gray-400"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-3.5">
              <div>
                <label className="block font-bold mb-1 text-gray-800 flex items-center gap-1">
                  <Building2 size={13} className="text-[#006ce4]" /> Cơ sở làm
                  việc (Bắt buộc) *
                </label>
                <select
                  required
                  value={formData.hotel_id}
                  onChange={(e) =>
                    setFormData({ ...formData, hotel_id: e.target.value })
                  }
                  className="w-full p-2.5 border border-gray-200 rounded-xl font-bold bg-gray-50 text-gray-900 outline-none focus:border-[#003580]"
                >
                  {hotels.map((h) => (
                    <option key={h.id} value={h.id}>
                      🏨 {h.name} ({h.city || "Chi nhánh"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1 text-gray-800">
                  Họ và tên nhân viên *
                </label>
                <input
                  required
                  placeholder="VD: Lê Thị Thu (Lễ tân ca sáng)"
                  value={formData.full_name}
                  onChange={(e) =>
                    setFormData({ ...formData, full_name: e.target.value })
                  }
                  className="w-full p-2.5 border border-gray-200 rounded-xl font-semibold outline-none focus:border-[#003580]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1 text-gray-800">
                    Email đăng nhập *
                  </label>
                  <input
                    required
                    type="email"
                    placeholder="letan@gostay.vn"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="w-full p-2.5 border border-gray-200 rounded-xl font-mono text-xs outline-none focus:border-[#003580]"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1 text-gray-800">
                    Số điện thoại *
                  </label>
                  <input
                    required
                    placeholder="0912 345 678"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className="w-full p-2.5 border border-gray-200 rounded-xl outline-none focus:border-[#003580]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1 text-gray-800 flex items-center gap-1">
                  <KeyRound size={13} className="text-amber-600" /> Mật khẩu
                  khởi tạo *
                </label>
                <input
                  required
                  type="password"
                  placeholder="Tối thiểu 6 ký tự..."
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="w-full p-2.5 border border-gray-200 rounded-xl font-mono outline-none focus:border-[#003580]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 rounded-xl font-bold cursor-pointer hover:bg-gray-50 text-gray-700"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-[#003580] hover:bg-blue-900 text-white font-bold rounded-xl cursor-pointer shadow-sm transition active:scale-95 disabled:opacity-50"
                >
                  {submitting ? "Đang lưu..." : "✓ Xác Nhận & Cấp Tài Khoản"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
