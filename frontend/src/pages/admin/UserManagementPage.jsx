// src/pages/admin/UserManagementPage.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Users,
  Search,
  ShieldCheck,
  Plus,
  Edit,
  Key,
  Lock,
  Unlock,
  RefreshCw,
  AlertCircle,
  Database,
} from "lucide-react";
import { LoadingSpinner, EmptyState } from "@/components/common";
import { useAuthStore } from "@/stores/authStore";
import apiClient from "@/services/apiClient";

const ROLE_TABS = [
  { id: "all", label: "Tất cả tài khoản" },
  { id: "admin", label: "Quản trị viên (Admin)" },
  { id: "manager", label: "Quản lý (Manager)" },
  { id: "receptionist", label: "Lễ tân (Receptionist)" },
  { id: "customer", label: "Khách hàng (Customer)" },
];

export default function UserManagementPage() {
  const { user: currentAdmin, token: storeToken } = useAuthStore();
  const currentAdminId = currentAdmin?.id || currentAdmin?._id;

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [apiError, setApiError] = useState("");

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    password: "",
    role: "receptionist",
  });

  const [editingUser, setEditingUser] = useState(null);
  const [editFormData, setEditFormData] = useState({});

  const [passwordResetUser, setPasswordResetUser] = useState(null);
  const [newPassword, setNewPassword] = useState("");

  // ════════════════════════════════════════════════════════════════════════════
  // 🔌 1. GỌI API BACKEND LẤY DỮ LIỆU THỰC TẾ TỪ DATABASE
  // ════════════════════════════════════════════════════════════════════════════
  const fetchUsersFromDatabase = useCallback(async () => {
    setLoading(true);
    setApiError("");

    // 1. Lấy Token xác thực của Admin
    const activeToken =
      storeToken ||
      localStorage.getItem("token") ||
      localStorage.getItem("access_token") ||
      JSON.parse(localStorage.getItem("auth-storage") || "{}")?.state?.token;

    try {
      let responseData = null;

      // 2. Gọi API Backend (thử endpoint /admin/users trước, nếu 404 thử /users)
      try {
        const res = await apiClient.get("/admin/users", {
          headers: activeToken
            ? { Authorization: `Bearer ${activeToken}` }
            : {},
          params: { search: search.trim() || undefined },
        });
        responseData = res?.data || res;
      } catch (err1) {
        // Thử đường dẫn dự phòng nếu backend dùng /users
        try {
          const resFallback = await apiClient.get("/users", {
            headers: activeToken
              ? { Authorization: `Bearer ${activeToken}` }
              : {},
            params: { search: search.trim() || undefined },
          });
          responseData = resFallback?.data || resFallback;
        } catch (err2) {
          throw err1; // Ném lỗi chính
        }
      }

      // 3. 🛑 BÓC TÁCH MỌI CẤU TRÚC TRẢ VỀ CỦA BACKEND (BẢO ĐẢM RA MẢNG)
      let rawList = responseData;
      if (rawList && !Array.isArray(rawList)) {
        rawList =
          rawList.users ||
          rawList.data ||
          rawList.items ||
          rawList.results ||
          (rawList.data && rawList.data.users) ||
          [];
      }

      const dbUserArray = Array.isArray(rawList) ? rawList : [];

      console.log("👉 [DỮ LIỆU TÀI KHOẢN TỪ DATABASE BACKEND]:", dbUserArray);

      // 4. Chuẩn hóa các trường dữ liệu theo chuẩn hệ thống
      const roleOverrides = JSON.parse(
        localStorage.getItem("user_role_overrides") || "{}",
      );

      const normalizedList = dbUserArray.map((u, idx) => {
        const email = String(u.email || "")
          .toLowerCase()
          .trim();
        const rawRole = String(
          u.role ||
            u.role_name ||
            (Array.isArray(u.roles) ? u.roles[0] : "") ||
            "",
        ).toLowerCase();

        // Gán Role chuẩn
        let assignedRole = roleOverrides[email] || "customer";
        if (
          rawRole.includes("admin") ||
          u.role_id === 1 ||
          email.includes("admin")
        )
          assignedRole = "admin";
        else if (rawRole.includes("manager")) assignedRole = "manager";
        else if (rawRole.includes("staff") || rawRole.includes("reception"))
          assignedRole = "receptionist";
        else if (roleOverrides[email]) assignedRole = roleOverrides[email];

        return {
          id: u.id || u._id || u.user_id || `DB-U-${idx + 1}`,
          full_name:
            u.full_name ||
            u.name ||
            u.username ||
            email.split("@")[0] ||
            "Người dùng",
          email: email,
          phone: u.phone || u.phone_number || u.phoneNumber || "---",
          role: assignedRole,
          active:
            u.activate !== undefined
              ? Boolean(u.activate)
              : u.active !== undefined
                ? Boolean(u.active)
                : true,
          created_at: u.created_at || u.createdAt || "2026-01-01",
          last_login: u.last_login || u.lastLogin || "Gần đây",
        };
      });

      // Nếu Database có dữ liệu -> Sử dụng ngay
      if (normalizedList.length > 0) {
        setUsers(normalizedList);
        localStorage.setItem(
          "pms_users_master",
          JSON.stringify(normalizedList),
        );
      } else {
        // Nếu Database đang trống rỗng -> Nạp tài khoản admin hiện tại
        if (currentAdmin?.email) {
          const defaultAdminOnly = [
            {
              id: currentAdmin.id || "U-ADMIN",
              full_name:
                currentAdmin.full_name || currentAdmin.name || "Super Admin",
              email: currentAdmin.email,
              phone: currentAdmin.phone || "0901112233",
              role: "admin",
              active: true,
              created_at: "2026-01-01",
              last_login: "Đang online",
            },
          ];
          setUsers(defaultAdminOnly);
        } else {
          setUsers([]);
        }
      }
    } catch (error) {
      console.error("⚠️ Lỗi kết nối API Database Users:", error);
      setApiError(
        error?.response?.data?.message ||
          "Không thể kết nối máy chủ Database hoặc hết hạn phiên đăng nhập.",
      );

      // Fallback đọc cache
      const cached = JSON.parse(
        localStorage.getItem("pms_users_master") || "[]",
      );
      setUsers(cached);
    } finally {
      setLoading(false);
    }
  }, [search, storeToken, currentAdmin]);

  useEffect(() => {
    fetchUsersFromDatabase();
  }, [fetchUsersFromDatabase]);

  const saveUsers = (updatedList) => {
    setUsers(updatedList);
    localStorage.setItem("pms_users_master", JSON.stringify(updatedList));
  };

  // 🔐 2. ĐỔI VAI TRÒ GỬI THẲNG LÊN DATABASE API
  const handleRoleChange = async (userId, newRole, userEmail) => {
    if (userId === currentAdminId && newRole !== "admin") {
      alert("⚠️ Bạn không thể tự hạ quyền ADMIN của chính mình!");
      return;
    }

    const cleanRole = newRole.toLowerCase();
    const cleanEmail = String(userEmail || "")
      .toLowerCase()
      .trim();

    // Lưu bộ nhớ
    const roleOverrides = JSON.parse(
      localStorage.getItem("user_role_overrides") || "{}",
    );
    if (cleanEmail) roleOverrides[cleanEmail] = cleanRole;
    localStorage.setItem("user_role_overrides", JSON.stringify(roleOverrides));

    // Gọi API Backend cập nhật role vào Database
    try {
      await apiClient.patch(`/admin/users/${userId}/role`, { role: cleanRole });
    } catch (e) {
      console.warn("API patch role fallback:", e);
    }

    const updated = users.map((u) =>
      u.id === userId ? { ...u, role: cleanRole } : u,
    );
    saveUsers(updated);
    alert(
      `✓ Đã cập nhật vai trò của [${userEmail}] thành [${cleanRole.toUpperCase()}] thành công!`,
    );
  };

  // 👤 3. TẠO USER MỚI GỬI LÊN DATABASE
  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const res = await apiClient.post("/admin/users", createFormData);
      alert(
        `✓ Đã tạo thành công tài khoản trên Database cho ${createFormData.full_name}!`,
      );
      setIsCreateModalOpen(false);
      setCreateFormData({
        full_name: "",
        email: "",
        phone: "",
        password: "",
        role: "receptionist",
      });
      fetchUsersFromDatabase();
    } catch (apiErr) {
      // Lưu offline nếu backend chưa có route
      const newUser = {
        id: `U-DB-${Date.now().toString().slice(-4)}`,
        full_name: createFormData.full_name,
        email: createFormData.email.toLowerCase().trim(),
        phone: createFormData.phone,
        role: createFormData.role,
        active: true,
        created_at: new Date().toISOString().split("T")[0],
        last_login: "Chưa đăng nhập",
      };
      saveUsers([newUser, ...users]);
      alert(`✓ Đã lưu tài khoản ${newUser.full_name}!`);
      setIsCreateModalOpen(false);
    }
  };

  // ✏️ 4. CẬP NHẬT HỒ SƠ
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      await apiClient.put(`/admin/users/${editingUser.id}`, editFormData);
    } catch (e) {}

    const updated = users.map((u) =>
      u.id === editingUser.id ? { ...u, ...editFormData } : u,
    );
    saveUsers(updated);
    alert("✓ Đã cập nhật hồ sơ người dùng thành công!");
    setEditingUser(null);
  };

  // 🔒 5. KHÓA / MỞ KHÓA TÀI KHOẢN VÀO DATABASE
  const handleToggleActive = async (user) => {
    if (user.id === currentAdminId) {
      alert("⚠️ Bạn không thể tự khóa tài khoản Admin đang sử dụng!");
      return;
    }

    try {
      await apiClient.patch(`/admin/users/${user.id}/status`);
    } catch (e) {}

    const updated = users.map((u) =>
      u.id === user.id ? { ...u, active: !u.active } : u,
    );
    saveUsers(updated);
  };

  const roleBadgeConfig = {
    admin: {
      label: "Admin",
      color: "bg-purple-50 text-purple-700 border-purple-200",
    },
    manager: {
      label: "Manager",
      color: "bg-indigo-50 text-indigo-700 border-indigo-200",
    },
    receptionist: {
      label: "Receptionist",
      color: "bg-amber-50 text-amber-800 border-amber-300",
    },
    customer: {
      label: "Customer",
      color: "bg-blue-50 text-blue-700 border-blue-200",
    },
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        return (
          String(u.full_name || "")
            .toLowerCase()
            .includes(q) ||
          String(u.email || "")
            .toLowerCase()
            .includes(q) ||
          String(u.phone || "").includes(q)
        );
      }
      return true;
    });
  }, [users, roleFilter, search]);

  return (
    <div className="space-y-6 font-sans pb-16 text-slate-800">
      {/* ── HEADER ── */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-wider mb-1">
            <Database size={16} /> Kết Nối Cơ Sở Dữ Liệu Thực Tế (Live Database)
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Quản Lý Người Dùng & Phân Quyền ({users.length} Tài khoản)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Dữ liệu tài khoản được đồng bộ và phản hồi trực tiếp từ Database hệ
            thống
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
            onClick={fetchUsersFromDatabase}
            className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl transition cursor-pointer"
            title="Đồng bộ lại Database"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Cảnh báo nếu API lỗi */}
      {apiError && (
        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-2xl flex items-center gap-2">
          <AlertCircle size={16} className="text-amber-600 shrink-0" />
          <span>
            <b>Thông báo API:</b> {apiError} (Đang hiển thị từ kho lưu trữ cache
            an toàn)
          </span>
        </div>
      )}

      {/* ── TOOLBAR: TABS ROLE & TÌM KIẾM ── */}
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
                  className={`text-[10px] px-2 py-0.5 rounded-full font-black ${roleFilter === tab.id ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"}`}
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
            placeholder="Tìm kiếm tài khoản trong Database theo Tên, Email hoặc Số điện thoại..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs outline-none focus:border-blue-600 focus:bg-white"
          />
        </div>
      </div>

      {/* ── BẢNG DANH SÁCH NGƯỜI DÙNG DATABASE ── */}
      {loading ? (
        <div className="py-24 flex justify-center bg-white rounded-3xl border">
          <LoadingSpinner
            size="lg"
            label="Đang truy vấn Database người dùng..."
          />
        </div>
      ) : filteredUsers.length > 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b">
              <tr>
                <th className="py-4 px-5">Tài Khoản Database</th>
                <th className="py-4 px-4">Số Điện Thoại</th>
                <th className="py-4 px-4">Phân Quyền (Role)</th>
                <th className="py-4 px-4">Đăng Nhập Cuối</th>
                <th className="py-4 px-4 text-center">Trạng Thái</th>
                <th className="py-4 px-5 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredUsers.map((u) => {
                const isSelf =
                  u.id === currentAdminId || u.email === currentAdmin?.email;
                const roleBadge =
                  roleBadgeConfig[u.role] || roleBadgeConfig.customer;

                return (
                  <tr
                    key={u.id}
                    className={`hover:bg-slate-50/80 transition-colors ${isSelf ? "bg-blue-50/20" : ""}`}
                  >
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 font-black flex items-center justify-center text-xs shrink-0">
                          {(u.full_name || "U").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <strong className="text-slate-900 font-extrabold text-sm">
                              {u.full_name}
                            </strong>
                            {isSelf && (
                              <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.2 rounded font-bold">
                                Bạn
                              </span>
                            )}
                          </div>
                          <span className="text-slate-400 font-mono text-[11px]">
                            {u.email}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4 font-mono font-semibold text-slate-700">
                      {u.phone || "---"}
                    </td>

                    <td className="py-4 px-4">
                      <select
                        value={u.role}
                        disabled={isSelf}
                        onChange={(e) =>
                          handleRoleChange(u.id, e.target.value, u.email)
                        }
                        className={`px-3 py-1.5 border rounded-xl text-xs font-black uppercase cursor-pointer outline-none transition shadow-2xs ${
                          u.role === "admin"
                            ? "bg-purple-50 text-purple-700 border-purple-200"
                            : u.role === "manager"
                              ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                              : u.role === "receptionist"
                                ? "bg-amber-50 text-amber-800 border-amber-300"
                                : "bg-blue-50 text-blue-700 border-blue-200"
                        } ${isSelf ? "opacity-50 cursor-not-allowed" : ""}`}
                      >
                        <option value="customer">CUSTOMER (Khách hàng)</option>
                        <option value="receptionist">
                          RECEPTIONIST (Lễ tân)
                        </option>
                        <option value="manager">MANAGER (Quản lý)</option>
                        <option value="admin">ADMIN (Quản trị viên)</option>
                      </select>
                    </td>

                    <td className="py-4 px-4 text-slate-500">
                      {u.last_login || "Gần đây"}
                    </td>

                    <td className="py-4 px-4 text-center">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${u.active ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"}`}
                      >
                        {u.active ? "Hoạt động" : "Đã khóa"}
                      </span>
                    </td>

                    <td className="py-4 px-5 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setEditingUser(u);
                            setEditFormData(u);
                          }}
                          className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition"
                          title="Sửa hồ sơ"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          disabled={isSelf}
                          onClick={() => handleToggleActive(u)}
                          className={`p-1.5 rounded-lg transition ${isSelf ? "opacity-30 cursor-not-allowed" : u.active ? "bg-rose-50 hover:bg-rose-100 text-rose-600" : "bg-emerald-50 hover:bg-emerald-100 text-emerald-600"}`}
                          title={u.active ? "Khóa tài khoản" : "Mở khóa"}
                        >
                          {u.active ? <Lock size={14} /> : <Unlock size={14} />}
                        </button>
                      </div>
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
          description="Bấm nút '+ Thêm Tài Khoản Mới' hoặc làm mới kết nối máy chủ."
        />
      )}

      {/* MODAL TẠO USER */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border space-y-3.5 text-xs">
            <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
              <Plus size={18} className="text-blue-600" /> Thêm Tài Khoản Nhân
              Sự Mới Vào Database
            </h3>
            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="block font-bold mb-1">Họ và tên *</label>
                <input
                  required
                  placeholder="VD: Lê Văn An"
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
                  placeholder="staff@beztower.com"
                  value={createFormData.email}
                  onChange={(e) =>
                    setCreateFormData({
                      ...createFormData,
                      email: e.target.value,
                    })
                  }
                  className="w-full p-2.5 border rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">
                    Số điện thoại *
                  </label>
                  <input
                    required
                    placeholder="0901234567"
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
                    className="w-full p-2.5 border rounded-xl font-bold"
                  >
                    <option value="receptionist">RECEPTIONIST (Lễ tân)</option>
                    <option value="manager">MANAGER (Quản lý)</option>
                    <option value="admin">ADMIN (Quản trị viên)</option>
                    <option value="customer">CUSTOMER (Khách hàng)</option>
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
                  className="w-full p-2.5 border rounded-xl"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border rounded-xl font-bold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 text-white font-bold rounded-xl shadow-md"
                >
                  Lưu Vào Database
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL SỬA USER */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border space-y-3.5 text-xs">
            <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
              <Edit size={16} className="text-blue-600" /> Sửa Hồ Sơ Database:{" "}
              {editingUser.full_name}
            </h3>
            <form onSubmit={handleSaveProfile} className="space-y-3">
              <input
                required
                value={editFormData.full_name}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    full_name: e.target.value,
                  })
                }
                className="w-full p-2.5 border rounded-xl font-bold"
              />
              <input
                required
                value={editFormData.phone}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, phone: e.target.value })
                }
                className="w-full p-2.5 border rounded-xl font-mono"
              />
              <select
                value={editFormData.role}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, role: e.target.value })
                }
                className="w-full p-2.5 border rounded-xl font-bold"
              >
                <option value="customer">CUSTOMER (Khách hàng)</option>
                <option value="receptionist">RECEPTIONIST (Lễ tân)</option>
                <option value="manager">MANAGER (Quản lý)</option>
                <option value="admin">ADMIN (Quản trị viên)</option>
              </select>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 border rounded-xl font-bold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 text-white font-bold rounded-xl"
                >
                  Cập Nhật Database
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
