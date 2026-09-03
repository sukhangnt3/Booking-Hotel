// src/pages/admin/UserManagementPage.jsx
import React, { useState, useEffect } from "react";
import {
  Users,
  Search,
  ShieldCheck,
  Plus,
  Edit,
  Key,
  Lock,
  Unlock,
  X,
} from "lucide-react";
import { LoadingSpinner, EmptyState } from "@/components/common";
import { useAuthStore } from "@/stores/authStore";

const ROLE_TABS = [
  { id: "all", label: "Tất cả tài khoản" },
  { id: "admin", label: "Quản trị viên (Admin)" },
  { id: "manager", label: "Quản lý (Manager)" },
  { id: "receptionist", label: "Lễ tân (Receptionist)" },
  { id: "customer", label: "Khách hàng (Customer)" },
];

export default function UserManagementPage() {
  const { user: currentAdmin } = useAuthStore();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

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

  // 🛑 CHỈ ĐỌC TÀI KHOẢN THỰC TẾ + TÀI KHOẢN ĐANG ĐĂNG NHẬP
  const loadUsers = () => {
    setLoading(true);
    const saved = JSON.parse(localStorage.getItem("pms_users_master") || "[]");

    // Nếu kho rỗng, tự động lấy chính tài khoản Admin đang đăng nhập làm tài khoản đầu tiên
    if (saved.length === 0 && currentAdmin?.email) {
      const initialAdmin = [
        {
          id: currentAdmin.id || "U-1",
          full_name:
            currentAdmin.full_name || currentAdmin.name || "Super Admin",
          email: currentAdmin.email,
          phone: currentAdmin.phone || "0901112233",
          role: "admin",
          active: true,
          created_at: new Date().toISOString().split("T")[0],
          last_login: "Vừa xong",
        },
      ];
      setUsers(initialAdmin);
      localStorage.setItem("pms_users_master", JSON.stringify(initialAdmin));
    } else {
      setUsers(saved);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadUsers();
  }, [currentAdmin]);

  const saveUsers = (updatedList) => {
    setUsers(updatedList);
    localStorage.setItem("pms_users_master", JSON.stringify(updatedList));
  };

  const handleCreateUser = (e) => {
    e.preventDefault();
    const newUser = {
      id: `U-${Date.now().toString().slice(-4)}`,
      full_name: createFormData.full_name,
      email: createFormData.email,
      phone: createFormData.phone,
      role: createFormData.role,
      active: true,
      created_at: new Date().toISOString().split("T")[0],
      last_login: "Chưa đăng nhập",
    };

    const updated = [newUser, ...users];
    saveUsers(updated);
    alert(`✓ Đã tạo thành công tài khoản cho ${newUser.full_name}!`);
    setIsCreateModalOpen(false);
    setCreateFormData({
      full_name: "",
      email: "",
      phone: "",
      password: "",
      role: "receptionist",
    });
  };

  const handleSaveProfile = (e) => {
    e.preventDefault();
    if (!editingUser) return;
    const updated = users.map((u) =>
      u.id === editingUser.id ? { ...u, ...editFormData } : u,
    );
    saveUsers(updated);
    alert("✓ Đã cập nhật hồ sơ người dùng!");
    setEditingUser(null);
  };

  const handleToggleActive = (user) => {
    const updated = users.map((u) =>
      u.id === user.id ? { ...u, active: !u.active } : u,
    );
    saveUsers(updated);
  };

  const filteredUsers = users.filter((u) => {
    if (roleFilter !== "all" && u.role !== roleFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        u.full_name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.phone.includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 font-sans pb-16 text-slate-800">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-purple-600 font-bold text-xs uppercase tracking-wider mb-1">
            <ShieldCheck size={16} /> Quản Trị Người Dùng Thực Tế (RBAC)
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Danh Sách Tài Khoản Nhân Sự ({users.length} Tài khoản)
          </h1>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-5 py-3 bg-[#003580] hover:bg-blue-900 text-white font-bold text-xs rounded-2xl shadow-md transition flex items-center gap-2 cursor-pointer"
        >
          <Plus size={16} /> Thêm Tài Khoản Mới
        </button>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-3xl border shadow-2xs space-y-3">
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {ROLE_TABS.map((tab) => {
            const count = users.filter((u) =>
              tab.id === "all" ? true : u.role === tab.id,
            ).length;
            return (
              <button
                key={tab.id}
                onClick={() => setRoleFilter(tab.id)}
                className={`px-4 py-2 rounded-2xl text-xs font-bold transition cursor-pointer ${
                  roleFilter === tab.id
                    ? "bg-slate-900 text-white"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span>{tab.label}</span> ({count})
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
            placeholder="Tìm theo Tên nhân viên, Email hoặc Số điện thoại..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border rounded-2xl text-xs outline-none"
          />
        </div>
      </div>

      {/* Bảng */}
      {loading ? (
        <div className="py-24 flex justify-center bg-white rounded-3xl border">
          <LoadingSpinner size="lg" label="Đang tải danh sách tài khoản..." />
        </div>
      ) : filteredUsers.length > 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b">
              <tr>
                <th className="py-4 px-5">Tài Khoản</th>
                <th className="py-4 px-4">Số Điện Thoại</th>
                <th className="py-4 px-4">Phân Quyền (Role)</th>
                <th className="py-4 px-4">Trạng Thái</th>
                <th className="py-4 px-5 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/80">
                  <td className="py-4 px-5">
                    <strong className="text-slate-900 block text-sm">
                      {u.full_name}
                    </strong>
                    <span className="text-slate-400 text-[11px]">
                      {u.email}
                    </span>
                  </td>
                  <td className="py-4 px-4 font-mono">{u.phone}</td>
                  <td className="py-4 px-4">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-50 text-blue-700 border">
                      {u.role}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${u.active ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}
                    >
                      {u.active ? "Hoạt động" : "Đã khóa"}
                    </span>
                  </td>
                  <td className="py-4 px-5 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setEditingUser(u);
                          setEditFormData(u);
                        }}
                        className="p-1.5 bg-blue-50 text-blue-700 rounded-lg"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => handleToggleActive(u)}
                        className={`p-1.5 rounded-lg ${u.active ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"}`}
                      >
                        {u.active ? <Lock size={14} /> : <Unlock size={14} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          icon={Users}
          title="Chưa có tài khoản nào"
          description="Bấm nút '+ Thêm Tài Khoản Mới' để tạo nhân sự đầu tiên."
        />
      )}

      {/* Modal Tạo User */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border space-y-3 text-xs">
            <h3 className="font-bold text-sm text-slate-900">
              Thêm Tài Khoản Nhân Sự Mới
            </h3>
            <form onSubmit={handleCreateUser} className="space-y-3">
              <input
                required
                placeholder="Họ và tên nhân sự *"
                value={createFormData.full_name}
                onChange={(e) =>
                  setCreateFormData({
                    ...createFormData,
                    full_name: e.target.value,
                  })
                }
                className="w-full p-2.5 border rounded-xl"
              />
              <input
                required
                type="email"
                placeholder="Email đăng nhập *"
                value={createFormData.email}
                onChange={(e) =>
                  setCreateFormData({
                    ...createFormData,
                    email: e.target.value,
                  })
                }
                className="w-full p-2.5 border rounded-xl"
              />
              <input
                required
                placeholder="Số điện thoại *"
                value={createFormData.phone}
                onChange={(e) =>
                  setCreateFormData({
                    ...createFormData,
                    phone: e.target.value,
                  })
                }
                className="w-full p-2.5 border rounded-xl"
              />
              <select
                value={createFormData.role}
                onChange={(e) =>
                  setCreateFormData({ ...createFormData, role: e.target.value })
                }
                className="w-full p-2.5 border rounded-xl font-bold"
              >
                <option value="receptionist">RECEPTIONIST (Lễ tân)</option>
                <option value="manager">MANAGER (Quản lý)</option>
                <option value="admin">ADMIN (Quản trị viên)</option>
                <option value="customer">CUSTOMER (Khách hàng)</option>
              </select>
              <input
                required
                type="password"
                placeholder="Mật khẩu *"
                value={createFormData.password}
                onChange={(e) =>
                  setCreateFormData({
                    ...createFormData,
                    password: e.target.value,
                  })
                }
                className="w-full p-2.5 border rounded-xl"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border rounded-xl font-bold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 text-white rounded-xl font-bold"
                >
                  Tạo Tài Khoản
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Sửa User */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border space-y-3 text-xs">
            <h3 className="font-bold text-sm text-slate-900">
              Sửa Tài Khoản {editingUser.full_name}
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
                className="w-full p-2.5 border rounded-xl"
              />
              <input
                required
                value={editFormData.phone}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, phone: e.target.value })
                }
                className="w-full p-2.5 border rounded-xl"
              />
              <select
                value={editFormData.role}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, role: e.target.value })
                }
                className="w-full p-2.5 border rounded-xl font-bold"
              >
                <option value="receptionist">RECEPTIONIST (Lễ tân)</option>
                <option value="manager">MANAGER (Quản lý)</option>
                <option value="admin">ADMIN (Quản trị viên)</option>
                <option value="customer">CUSTOMER (Khách hàng)</option>
              </select>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 border rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 text-white rounded-xl font-bold"
                >
                  Lưu Thay Đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
