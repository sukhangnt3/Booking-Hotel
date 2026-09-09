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
  Database,
} from "lucide-react";
import { LoadingSpinner, EmptyState } from "@/components/common";
import { useAuthStore } from "@/stores/authStore";
import apiClient from "@/services/apiClient";

// 4 Roles chuẩn theo bảng roles trong Database PostgreSQL (Đã thêm RECEPTIONIST)
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

  // ── 1. LẤY TÀI KHOẢN TỪ DATABASE ──
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

        // Đọc role từ mảng u.roles hoặc u.role / u.role_name
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
      console.error("Lỗi kết nối API Database Users:", error);
      setApiError(
        error?.response?.data?.message ||
          "Không thể kết nối máy chủ Database người dùng.",
      );
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchUsersFromDB();
  }, [fetchUsersFromDB]);

  // ── 2. ĐỔI VAI TRÒ (ROLE) GỬI LÊN DATABASE ──
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
      alert(
        `✓ Đã cập nhật quyền của [${userEmail}] thành [${newRole}] trên Database!`,
      );
    } catch (err) {
      alert(
        `Lỗi cập nhật Role: ${err?.response?.data?.message || "Không thể cập nhật quyền trên Database!"}`,
      );
    }
  };

  // ── 3. TẠO TÀI KHOẢN MỚI LƯU VÀO DATABASE ──
  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post("/admin/users", createFormData);
      alert(
        `✓ Đã tạo thành công tài khoản [${createFormData.full_name}] vào Database!`,
      );
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

  // ── 4. KHÓA / MỞ KHÓA TÀI KHOẢN ──
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
          u.id === targetUser.id ? { ...u, activate: !u.activate } : u,
        ),
      );
      alert(
        `✓ Đã ${targetUser.activate ? "KHÓA" : "MỞ KHÓA"} tài khoản [${targetUser.email}] trên Database!`,
      );
    } catch (err) {
      alert("Không thể cập nhật trạng thái khóa/mở trên Database!");
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
    <div className="space-y-6 font-sans pb-16 text-slate-800">
      {/* HEADER */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-wider mb-1">
            <Database size={16} /> Kết Nối Cơ Sở Dữ Liệu Thực Tế (PostgreSQL)
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Quản Lý Người Dùng & Phân Quyền ({users.length} Tài khoản)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Dữ liệu người dùng được truy vấn từ bảng users & user_roles
          </p>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex-1 sm:flex-none px-5 py-3 bg-[#003580] hover:bg-blue-900 text-white font-bold text-xs rounded-2xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <Plus size={16} /> + Thêm Tài Khoản Mới
          </button>
          <button
            onClick={fetchUsersFromDB}
            className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl transition cursor-pointer"
            title="Tải lại Database"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {apiError && (
        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-2xl flex items-center gap-2">
          <AlertCircle size={16} className="text-amber-600 shrink-0" />
          <span>
            <b>Lỗi kết nối:</b> {apiError}
          </span>
        </div>
      )}

      {/* TOOLBAR */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {ROLE_TABS.map((tab) => {
            const count = users.filter((u) =>
              tab.id === "all" ? true : u.role === tab.id,
            ).length;
            return (
              <button
                key={tab.id}
                onClick={() => setRoleFilter(tab.id)}
                className={`px-4 py-2 rounded-2xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                  roleFilter === tab.id
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                    roleFilter === tab.id
                      ? "bg-white/20 text-white"
                      : "bg-slate-200 text-slate-700"
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
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Tìm kiếm theo Tên, Email hoặc Số điện thoại..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs outline-none focus:border-blue-600"
          />
        </div>
      </div>

      {/* BẢNG TÀI KHOẢN */}
      {loading ? (
        <div className="py-24 flex justify-center bg-white rounded-3xl border">
          <LoadingSpinner size="lg" label="Đang tải dữ liệu từ Database..." />
        </div>
      ) : filteredUsers.length > 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b">
              <tr>
                <th className="py-4 px-5">Tài Khoản Database</th>
                <th className="py-4 px-4">Số Điện Thoại</th>
                <th className="py-4 px-4">Phân Quyền (Role)</th>
                <th className="py-4 px-4">Ngày Tạo</th>
                <th className="py-4 px-4 text-center">Trạng Thái</th>
                <th className="py-4 px-5 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredUsers.map((u) => {
                const isSelf =
                  u.id === currentAdminId || u.email === currentAdmin?.email;
                return (
                  <tr key={u.id} className="hover:bg-slate-50/80">
                    <td className="py-4 px-5">
                      <strong className="text-slate-900 font-bold text-sm block">
                        {u.full_name}
                      </strong>
                      <span className="text-slate-400 font-mono text-[11px]">
                        {u.email}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-mono">{u.phone}</td>
                    <td className="py-4 px-4">
                      <select
                        value={u.role}
                        disabled={isSelf}
                        onChange={(e) =>
                          handleRoleChange(u.id, e.target.value, u.email)
                        }
                        className={`px-3 py-1.5 border rounded-xl text-xs font-black uppercase cursor-pointer outline-none ${
                          u.role === "ADMIN"
                            ? "bg-purple-50 text-purple-700 border-purple-200"
                            : u.role === "HOTEL_OWNER"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : u.role === "RECEPTIONIST"
                                ? "bg-amber-50 text-amber-800 border-amber-300"
                                : "bg-blue-50 text-blue-700 border-blue-200"
                        }`}
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
                    <td className="py-4 px-4 text-slate-500">{u.created_at}</td>
                    <td className="py-4 px-4 text-center">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          u.activate
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-rose-50 text-rose-700"
                        }`}
                      >
                        {u.activate ? "Hoạt động" : "Đã khóa"}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-right">
                      <button
                        disabled={isSelf}
                        onClick={() => handleToggleActive(u)}
                        className={`p-2 rounded-xl border transition cursor-pointer ${
                          isSelf
                            ? "opacity-30 cursor-not-allowed"
                            : u.activate
                              ? "hover:bg-rose-50 text-rose-600"
                              : "hover:bg-emerald-50 text-emerald-600"
                        }`}
                        title={u.activate ? "Khóa tài khoản" : "Mở khóa"}
                      >
                        {u.activate ? <Lock size={14} /> : <Unlock size={14} />}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          icon={Users}
          title="Không tìm thấy tài khoản nào trong Database"
          description="Bấm '+ Thêm Tài Khoản Mới' để tạo người dùng đầu tiên vào hệ thống."
        />
      )}

      {/* MODAL TẠO TÀI KHOẢN MỚI */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border space-y-3.5 text-xs">
            <h3 className="font-black text-base text-slate-900">
              Thêm Tài Khoản Mới Vào Database
            </h3>
            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="block font-bold mb-1">Họ và tên *</label>
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
                  className="w-full p-2.5 border rounded-xl"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">
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
                  className="w-full p-2.5 border rounded-xl font-mono"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">
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
                    className="w-full p-2.5 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">
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
                    className="w-full p-2.5 border rounded-xl font-bold cursor-pointer"
                  >
                    <option value="CUSTOMER">CUSTOMER (Khách hàng)</option>
                    <option value="RECEPTIONIST">
                      RECEPTIONIST (Nhân viên lễ tân)
                    </option>
                    <option value="HOTEL_OWNER">
                      HOTEL_OWNER (Chủ khách sạn)
                    </option>
                    <option value="ADMIN">ADMIN (Quản trị viên)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-bold mb-1">
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
                  className="w-full p-2.5 border rounded-xl font-mono"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border rounded-xl font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#003580] hover:bg-blue-900 text-white font-bold rounded-xl cursor-pointer"
                >
                  Lưu Vào Database
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
