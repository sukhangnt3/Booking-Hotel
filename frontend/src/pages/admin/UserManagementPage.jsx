// src/pages/admin/UserManagementPage.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Users,
  Search,
  Plus,
  Lock,
  Unlock,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
  X,
} from "lucide-react";
import { LoadingSpinner, EmptyState } from "@/components/common";
import { useAuthStore } from "@/stores/authStore";
import apiClient from "@/services/apiClient";

const ROLE_TABS = [
  { id: "all", label: "Tất cả tài khoản" },
  { id: "ADMIN", label: "Quản trị viên (ADMIN)" },
  { id: "HOTEL_OWNER", label: "Chủ khách sạn (HOTEL_OWNER)" },
  { id: "RECEPTIONIST", label: "Lễ tân (RECEPTIONIST)" },
  { id: "CUSTOMER", label: "Khách hàng (CUSTOMER)" },
];

export default function UserManagementPage() {
  const { user: currentAdmin } = useAuthStore();
  const currentAdminId = currentAdmin?.id || currentAdmin?._id;

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [apiError, setApiError] = useState("");

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    password: "",
    role: "CUSTOMER",
  });

  const fetchUsersFromDB = useCallback(async () => {
    setLoading(true);
    setApiError("");

    try {
      let resData = null;
      try {
        const res = await apiClient.get("/admin/users", {
          params: { search: search.trim() || undefined },
        });
        resData = res?.data || res;
      } catch {
        const resFallback = await apiClient.get("/users", {
          params: { search: search.trim() || undefined },
        });
        resData = resFallback?.data || resFallback;
      }

      let rawList = resData;
      if (rawList && !Array.isArray(rawList)) {
        rawList = rawList.users || rawList.data || rawList.items || [];
      }

      const dbUserArray = Array.isArray(rawList) ? rawList : [];

      const normalizedList = dbUserArray.map((u, idx) => {
        const email = String(u.email || "")
          .toLowerCase()
          .trim();

        let rawRole = "";
        if (Array.isArray(u.roles) && u.roles.length > 0) {
          rawRole = u.roles[0];
        } else {
          rawRole = u.role || u.role_name || "";
        }

        let role = String(rawRole).toUpperCase();
        if (role.includes("ADMIN")) {
          role = "ADMIN";
        } else if (role.includes("OWNER") || role.includes("HOTEL")) {
          role = "HOTEL_OWNER";
        } else if (
          role.includes("RECEPTIONIST") ||
          role.includes("STAFF") ||
          role.includes("LE_TAN")
        ) {
          role = "RECEPTIONIST";
        } else {
          role = "CUSTOMER";
        }

        return {
          id: u.id || u._id || u.user_id || `DB-U-${idx + 1}`,
          full_name:
            u.full_name ||
            u.name ||
            u.username ||
            email.split("@")[0] ||
            "Người dùng",
          email: email,
          phone: u.phone || u.phone_number || "---",
          role: role,
          activate: u.activate !== undefined ? Boolean(u.activate) : true,
          created_at: (u.created_at || u.createdAt || "2026-01-01").split(
            "T",
          )[0],
          last_login: u.last_login || u.lastLogin || "Gần đây",
        };
      });

      setUsers(normalizedList);
    } catch (error) {
      console.error("Lỗi tải danh sách người dùng:", error);
      setApiError(
        error?.response?.data?.message ||
          "Không thể kết nối máy chủ dữ liệu người dùng.",
      );
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchUsersFromDB();
  }, [fetchUsersFromDB]);

  const handleRoleChange = async (userId, newRole, userEmail) => {
    if (userId === currentAdminId && newRole !== "ADMIN") {
      alert("⚠️ Bạn không thể tự hạ quyền ADMIN của chính mình!");
      return;
    }

    try {
      await apiClient.patch(`/admin/users/${userId}/role`, { role: newRole });
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)),
      );
      alert(`✓ Đã cập nhật quyền của [${userEmail}] thành [${newRole}]!`);
    } catch (err) {
      alert(
        `Lỗi cập nhật Role: ${err?.response?.data?.message || "Không thể cập nhật quyền người dùng!"}`,
      );
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post("/admin/users", createFormData);
      alert(`✓ Đã tạo thành công tài khoản [${createFormData.full_name}]!`);
      setIsCreateModalOpen(false);
      setCreateFormData({
        full_name: "",
        email: "",
        phone: "",
        password: "",
        role: "CUSTOMER",
      });
      fetchUsersFromDB();
    } catch (apiErr) {
      alert(
        `Lỗi tạo tài khoản: ${apiErr?.response?.data?.message || "Máy chủ từ chối tạo tài khoản!"}`,
      );
    }
  };

  const handleToggleActive = async (targetUser) => {
    if (targetUser.id === currentAdminId) {
      alert("⚠️ Bạn không thể tự khóa tài khoản Admin của mình!");
      return;
    }

    try {
      await apiClient.patch(`/admin/users/${targetUser.id}/status`, {
        activate: !targetUser.activate,
      });

      setUsers((prev) =>
        prev.map((u) =>
          u.id === targetUser.id ? { ...u, activate: !targetUser.activate } : u,
        ),
      );
      alert(
        `✓ Đã ${targetUser.activate ? "KHÓA" : "MỞ KHÓA"} tài khoản [${targetUser.email}]!`,
      );
    } catch (err) {
      alert("Không thể cập nhật trạng thái tài khoản!");
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        return (
          u.full_name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.phone.includes(q)
        );
      }
      return true;
    });
  }, [users, roleFilter, search]);

  return (
    <div className="w-full pb-24 bg-gray-50/50 font-sans text-gray-900 min-h-screen p-4 sm:p-6 lg:p-8 space-y-6">
      {/* ─── HEADER THEO PHONG CÁCH GHOSTAY ─── */}
      <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#006ce4] font-bold text-xs uppercase tracking-wider mb-1">
            <ShieldCheck size={16} /> Quản Trị Hệ Thống Người Dùng GoStay
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#0a2540] tracking-tight">
            Người Dùng & Phân Quyền ({users.length} Tài khoản)
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Quản lý danh sách thành viên, cấp quyền đối tác khách sạn, lễ tân và
            khách hàng
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="flex-1 sm:flex-none px-5 py-2.5 bg-[#003580] hover:bg-blue-900 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <Plus size={16} /> Thêm tài khoản mới
          </button>
          <button
            type="button"
            onClick={fetchUsersFromDB}
            className="p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition cursor-pointer"
            title="Tải lại danh sách"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {apiError && (
        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-2xl flex items-center gap-2 font-bold">
          <AlertCircle size={16} className="text-amber-600 shrink-0" />
          <span>Lỗi kết nối: {apiError}</span>
        </div>
      )}

      {/* ─── TOOLBAR & BỘ LỌC ROLE ─── */}
      <div className="bg-white p-4 rounded-3xl border border-gray-200 shadow-xs space-y-3">
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {ROLE_TABS.map((tab) => {
            const count = users.filter((u) =>
              tab.id === "all" ? true : u.role === tab.id,
            ).length;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setRoleFilter(tab.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                  roleFilter === tab.id
                    ? "bg-[#003580] text-white shadow-xs"
                    : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                    roleFilter === tab.id
                      ? "bg-white/20 text-white"
                      : "bg-gray-200 text-gray-700"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Tìm kiếm theo Tên, Email hoặc Số điện thoại..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-[#003580] focus:bg-white transition"
          />
        </div>
      </div>

      {/* ─── BẢNG DANH SÁCH TÀI KHOẢN ─── */}
      {loading ? (
        <div className="py-24 flex justify-center bg-white rounded-3xl border border-gray-200 shadow-sm">
          <LoadingSpinner size="lg" label="Đang tải dữ liệu người dùng..." />
        </div>
      ) : filteredUsers.length > 0 ? (
        <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-gray-50 text-gray-500 font-bold uppercase tracking-wider border-b border-gray-200">
                <tr>
                  <th className="py-4 px-5">Tài Khoản & Email</th>
                  <th className="py-4 px-4">Số Điện Thoại</th>
                  <th className="py-4 px-4">Phân Quyền (Role)</th>
                  <th className="py-4 px-4">Ngày Tạo</th>
                  <th className="py-4 px-4 text-center">Trạng Thái</th>
                  <th className="py-4 px-5 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {filteredUsers.map((u) => {
                  const isSelf =
                    u.id === currentAdminId || u.email === currentAdmin?.email;
                  return (
                    <tr key={u.id} className="hover:bg-blue-50/40 transition">
                      <td className="py-4 px-5">
                        <strong className="text-gray-900 font-bold text-sm block">
                          {u.full_name}
                        </strong>
                        <span className="text-gray-400 font-mono text-[11px]">
                          {u.email}
                        </span>
                      </td>
                      <td className="py-4 px-4 font-mono text-gray-700">
                        {u.phone}
                      </td>
                      <td className="py-4 px-4">
                        <select
                          value={u.role}
                          disabled={isSelf}
                          onChange={(e) =>
                            handleRoleChange(u.id, e.target.value, u.email)
                          }
                          className={`px-3 py-1.5 border rounded-xl text-xs font-black uppercase cursor-pointer outline-none transition ${
                            u.role === "ADMIN"
                              ? "bg-purple-50 text-purple-700 border-purple-200"
                              : u.role === "HOTEL_OWNER"
                                ? "bg-blue-50 text-[#003580] border-blue-200"
                                : u.role === "RECEPTIONIST"
                                  ? "bg-amber-50 text-amber-800 border-amber-200"
                                  : "bg-gray-50 text-gray-700 border-gray-200"
                          } ${isSelf ? "opacity-60 cursor-not-allowed" : ""}`}
                        >
                          <option value="CUSTOMER">CUSTOMER (Khách)</option>
                          <option value="RECEPTIONIST">
                            RECEPTIONIST (Lễ tân)
                          </option>
                          <option value="HOTEL_OWNER">
                            HOTEL_OWNER (Chủ KS)
                          </option>
                          <option value="ADMIN">ADMIN (Quản trị)</option>
                        </select>
                      </td>
                      <td className="py-4 px-4 text-gray-500 font-mono">
                        {u.created_at}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span
                          className={`px-3 py-1 rounded-full text-[11px] font-bold ${
                            u.activate
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                              : "bg-rose-50 text-rose-700 border border-rose-100"
                          }`}
                        >
                          {u.activate ? "Hoạt động" : "Đã khóa"}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-right">
                        <button
                          type="button"
                          disabled={isSelf}
                          onClick={() => handleToggleActive(u)}
                          className={`p-2 rounded-xl border transition cursor-pointer ${
                            isSelf
                              ? "opacity-30 cursor-not-allowed border-gray-200"
                              : u.activate
                                ? "hover:bg-rose-50 text-rose-600 border-rose-200"
                                : "hover:bg-emerald-50 text-emerald-600 border-emerald-200"
                          }`}
                          title={u.activate ? "Khóa tài khoản" : "Mở khóa"}
                        >
                          {u.activate ? (
                            <Lock size={14} />
                          ) : (
                            <Unlock size={14} />
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState
          icon={Users}
          title="Không tìm thấy tài khoản nào"
          description="Bấm '+ Thêm Tài Khoản Mới' để tạo người dùng vào hệ thống."
        />
      )}

      {/* ─── MODAL TẠO TÀI KHOẢN MỚI ─── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans">
          <div className="bg-white rounded-3xl p-6 sm:p-7 w-full max-w-md shadow-2xl border border-gray-200 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="font-black text-base text-[#0a2540]">
                Thêm Tài Khoản Người Dùng Mới
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 hover:bg-gray-100 rounded-xl cursor-pointer text-gray-400 hover:text-gray-700 transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3.5">
              <div>
                <label className="block font-bold mb-1 text-gray-700">
                  Họ và tên *
                </label>
                <input
                  required
                  placeholder="VD: Nguyễn Văn A"
                  value={createFormData.full_name}
                  onChange={(e) =>
                    setCreateFormData({
                      ...createFormData,
                      full_name: e.target.value,
                    })
                  }
                  className="w-full p-2.5 border border-gray-200 rounded-xl font-medium outline-none focus:border-[#003580]"
                />
              </div>

              <div>
                <label className="block font-bold mb-1 text-gray-700">
                  Email đăng nhập *
                </label>
                <input
                  required
                  type="email"
                  placeholder="user@example.com"
                  value={createFormData.email}
                  onChange={(e) =>
                    setCreateFormData({
                      ...createFormData,
                      email: e.target.value,
                    })
                  }
                  className="w-full p-2.5 border border-gray-200 rounded-xl font-mono outline-none focus:border-[#003580]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1 text-gray-700">
                    Số điện thoại *
                  </label>
                  <input
                    required
                    placeholder="0912345678"
                    value={createFormData.phone}
                    onChange={(e) =>
                      setCreateFormData({
                        ...createFormData,
                        phone: e.target.value,
                      })
                    }
                    className="w-full p-2.5 border border-gray-200 rounded-xl outline-none focus:border-[#003580]"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1 text-gray-700">
                    Phân quyền (Role) *
                  </label>
                  <select
                    value={createFormData.role}
                    onChange={(e) =>
                      setCreateFormData({
                        ...createFormData,
                        role: e.target.value,
                      })
                    }
                    className="w-full p-2.5 border border-gray-200 rounded-xl font-bold text-gray-800 outline-none focus:border-[#003580] cursor-pointer"
                  >
                    <option value="CUSTOMER">Khách hàng (CUSTOMER)</option>
                    <option value="RECEPTIONIST">Lễ tân (RECEPTIONIST)</option>
                    <option value="HOTEL_OWNER">
                      Chủ khách sạn (HOTEL_OWNER)
                    </option>
                    <option value="ADMIN">Quản trị viên (ADMIN)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1 text-gray-700">
                  Mật khẩu khởi tạo *
                </label>
                <input
                  required
                  type="password"
                  placeholder="Tối thiểu 6 ký tự"
                  value={createFormData.password}
                  onChange={(e) =>
                    setCreateFormData({
                      ...createFormData,
                      password: e.target.value,
                    })
                  }
                  className="w-full p-2.5 border border-gray-200 rounded-xl font-mono outline-none focus:border-[#003580]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-700 rounded-xl font-bold cursor-pointer hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#003580] hover:bg-blue-900 text-white font-bold rounded-xl cursor-pointer shadow-sm transition active:scale-95"
                >
                  Xác nhận lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
