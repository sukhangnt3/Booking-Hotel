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

  // Modal tạo lễ tân mới
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    password: "",
    hotel_id: "",
  });

  // 1. Tải danh sách khách sạn của Owner
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

  // 2. Tải danh sách lễ tân của Owner
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

  // 3. Xử lý tạo tài khoản Lễ tân mới gắn vào Khách sạn
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

  // 4. Xóa / Thu hồi tài khoản Lễ tân
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

  // 5. Khóa / Mở khóa lễ tân
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
    <div className="space-y-6 font-sans pb-16 text-slate-800">
      {/* HEADER */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-wider mb-1">
            <Users size={16} /> Phân Quyền & Quản Lý Đội Ngũ
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Nhân Viên Lễ Tân ({staffList.length} Nhân viên)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Cấp tài khoản lễ tân để nhân viên đăng nhập vào trực quầy và đặt
            phòng cho khách
          </p>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-5 py-3 bg-[#003580] hover:bg-blue-900 text-white font-bold text-xs rounded-2xl shadow-xs transition flex items-center gap-2 cursor-pointer active:scale-95 whitespace-nowrap"
          >
            <UserPlus size={16} /> + Cấp Tài Khoản Lễ Tân Mới
          </button>
          <button
            onClick={fetchStaffList}
            className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl transition cursor-pointer"
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
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Tìm theo tên, email, SĐT lễ tân..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-medium focus:outline-blue-600 shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Building2 size={16} className="text-slate-400 shrink-0" />
          <select
            value={selectedHotelFilter}
            onChange={(e) => setSelectedHotelFilter(e.target.value)}
            className="w-full sm:w-auto p-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 outline-none cursor-pointer shadow-2xs"
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
        <div className="py-24 flex justify-center bg-white rounded-3xl border border-slate-200">
          <LoadingSpinner size="lg" label="Đang tải danh sách nhân viên..." />
        </div>
      ) : filteredStaff.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStaff.map((staff) => (
            <div
              key={staff.id}
              className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 font-bold text-[10px] rounded-md border border-emerald-200 uppercase">
                      Lễ Tân Ca Trực
                    </span>
                    <h3 className="font-black text-slate-900 text-base mt-1">
                      {staff.full_name}
                    </h3>
                  </div>

                  <button
                    onClick={() => handleToggleActive(staff)}
                    className={`p-1.5 rounded-xl border cursor-pointer transition ${
                      staff.activate !== false
                        ? "text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border-emerald-200"
                        : "text-rose-600 bg-rose-50 hover:bg-rose-100 border-rose-200"
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

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Building2 size={13} className="text-[#003580] shrink-0" />
                    <span className="font-bold text-slate-800 truncate">
                      {staff.hotel_name || "Khách sạn trung tâm"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <Mail size={13} className="text-slate-400 shrink-0" />
                    <span className="truncate">{staff.email}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <Phone size={13} className="text-slate-400 shrink-0" />
                    <span>{staff.phone || "---"}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-400">
                  Tạo ngày: {staff.created_at?.split("T")[0] || "---"}
                </span>

                <button
                  onClick={() => handleDeleteStaff(staff.id, staff.full_name)}
                  className="px-3 py-1.5 text-rose-600 hover:bg-rose-50 rounded-xl font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 size={13} /> Xóa lễ tân
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Users}
          title="Chưa có nhân viên lễ tân nào"
          description="Bấm '+ Cấp Tài Khoản Lễ Tân Mới' để tạo tài khoản cho nhân viên làm việc tại quầy."
        />
      )}

      {/* MODAL TẠO LỄ TÂN MỚI */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-200 space-y-4 text-xs font-sans">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="font-black text-base text-slate-900 flex items-center gap-1.5">
                  <UserPlus size={18} className="text-[#003580]" /> Cấp Tài
                  Khoản Nhân Viên Lễ Tân
                </h3>
                <p className="text-[11px] text-slate-400">
                  Nhân viên chỉ có quyền xem sơ đồ phòng và đặt phòng tại cơ sở
                  được gán
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 hover:bg-slate-100 rounded-xl cursor-pointer text-slate-400"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-3.5">
              {/* Chọn khách sạn phân công */}
              <div>
                <label className="block font-bold mb-1 text-slate-700 flex items-center gap-1">
                  <Building2 size={13} className="text-blue-600" /> Cơ sở làm
                  việc (Bắt buộc) *
                </label>
                <select
                  required
                  value={formData.hotel_id}
                  onChange={(e) =>
                    setFormData({ ...formData, hotel_id: e.target.value })
                  }
                  className="w-full p-2.5 border rounded-xl font-bold bg-slate-50 text-slate-900 outline-none focus:border-blue-600"
                >
                  {hotels.map((h) => (
                    <option key={h.id} value={h.id}>
                      🏨 {h.name} ({h.city || "Chi nhánh"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-700">
                  Họ và tên nhân viên *
                </label>
                <input
                  required
                  placeholder="VD: Lê Thị Thu (Lễ tân sáng)"
                  value={formData.full_name}
                  onChange={(e) =>
                    setFormData({ ...formData, full_name: e.target.value })
                  }
                  className="w-full p-2.5 border rounded-xl font-medium outline-none focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1 text-slate-700">
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
                    className="w-full p-2.5 border rounded-xl font-mono text-xs outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1 text-slate-700">
                    Số điện thoại *
                  </label>
                  <input
                    required
                    placeholder="0912 345 678"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className="w-full p-2.5 border rounded-xl outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-700 flex items-center gap-1">
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
                  className="w-full p-2.5 border rounded-xl font-mono outline-none focus:border-blue-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border rounded-xl font-bold cursor-pointer hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-[#003580] hover:bg-blue-900 text-white font-bold rounded-xl cursor-pointer shadow-xs transition active:scale-95 disabled:opacity-50"
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
