import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Users,
  Search,
  ShieldCheck,
  Lock,
  Unlock,
  CheckCircle2,
  Filter,
} from "lucide-react";

// Components
import { Button, Badge, Input, Pagination } from "@/components/ui";
import { LoadingSpinner, EmptyState } from "@/components/common";

// Services & Stores
import apiClient from "@/services/apiClient";
import { useAuthStore } from "@/stores/authStore";

const ROLE_TABS = [
  { id: "all", label: "Tất cả tài khoản" },
  { id: "admin", label: "Quản trị viên (Admin)" },
  { id: "owner", label: "Chủ chỗ nghỉ (Owner)" },
  { id: "customer", label: "Khách hàng (Customer)" },
];

const UserManagementPage = () => {
  const { user: currentAdmin } = useAuthStore();
  const currentAdminId = currentAdmin?.id || currentAdmin?._id;

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const [currentPage, setCurrentPage] = useState(1);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  // ─── FETCH TẤT CẢ USER ───
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/admin/users", {
        params: { search: debouncedSearch.trim() || undefined },
      });
      const list = Array.isArray(res) ? res : res?.data || res?.users || [];
      setUsers(list);
    } catch (error) {
      console.error("Lỗi khi tải danh sách người dùng:", error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Hàm chuẩn hóa Role của từng User
  const getPrimaryRole = (rolesList, singleRole) => {
    const roles = Array.isArray(rolesList)
      ? rolesList.map((r) => String(r).toLowerCase())
      : [String(singleRole || "").toLowerCase()];

    if (roles.includes("admin") || roles.includes("role_admin")) return "admin";
    if (
      roles.includes("owner") ||
      roles.includes("hotel_owner") ||
      roles.includes("partner")
    )
      return "owner";
    return "customer";
  };

  // ─── LỌC THEO ROLE ───
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const userRole = getPrimaryRole(u.roles, u.role);
      if (roleFilter === "admin") return userRole === "admin";
      if (roleFilter === "owner") return userRole === "owner";
      if (roleFilter === "customer") return userRole === "customer";
      return true;
    });
  }, [users, roleFilter]);

  const pageSize = 10;
  const totalPages = Math.ceil(filteredUsers.length / pageSize) || 1;
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  // ─── ĐỔI ROLE ───
  const handleRoleChange = async (userId, newRole, userName) => {
    if (userId === currentAdminId && newRole !== "admin") {
      alert("⚠️ Bạn không thể tự hạ quyền ADMIN của chính mình!");
      return;
    }

    if (
      !window.confirm(
        `Xác nhận đổi vai trò của "${userName}" thành [${newRole.toUpperCase()}]?`,
      )
    ) {
      return;
    }

    try {
      await apiClient.patch(`/admin/users/${userId}/role`, {
        role: newRole.toLowerCase(),
      });
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? {
                ...u,
                role: newRole.toLowerCase(),
                roles: [newRole.toLowerCase()],
              }
            : u,
        ),
      );
      showToast(
        `Đã đổi vai trò của "${userName}" thành ${newRole.toUpperCase()}!`,
      );
    } catch (error) {
      showToast("Cập nhật vai trò thất bại!", "error");
    }
  };

  // ─── KHÓA / MỞ KHÓA ───
  const toggleUserStatus = async (userId, userName, currentActive) => {
    if (userId === currentAdminId) {
      alert("⚠️ Bạn không thể tự khóa tài khoản Admin đang sử dụng!");
      return;
    }

    const actionText = currentActive ? "KHÓA" : "MỞ KHÓA";
    if (
      !window.confirm(
        `Bạn có chắc chắn muốn ${actionText} tài khoản của "${userName}"?`,
      )
    ) {
      return;
    }

    try {
      const res = await apiClient.patch(`/admin/users/${userId}/status`);
      const newStatus = res?.activate ?? !currentActive;

      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? { ...u, activate: newStatus, active: newStatus }
            : u,
        ),
      );
      showToast(
        `Đã ${actionText.toLowerCase()} tài khoản "${userName}" thành công!`,
      );
    } catch (error) {
      showToast("Thao tác thất bại.", "error");
    }
  };

  // ─── 👈 RENDER AVATAR GOOGLE THẬT CHO TỪNG DÒNG USER ───
  const renderAvatar = (u, isSelf) => {
    const name =
      u.full_name || u.name || u.username || u.email?.split("@")[0] || "User";
    const savedGoogleAvatar = u.email
      ? localStorage.getItem(`google_avatar_${u.email}`)
      : null;

    // Ưu tiên đọc ảnh Google thật của chính bạn hoặc từ database
    const rawAvatar =
      (isSelf
        ? currentAdmin?.avatar || currentAdmin?.picture || savedGoogleAvatar
        : null) ||
      u.avatar ||
      u.picture ||
      u.avatar_url ||
      u.photo_url ||
      u.image ||
      savedGoogleAvatar;

    const hasValidAvatar =
      rawAvatar &&
      typeof rawAvatar === "string" &&
      rawAvatar.trim() !== "" &&
      !rawAvatar.includes("placeholder") &&
      rawAvatar !== "null" &&
      rawAvatar !== "undefined";

    const role = getPrimaryRole(u.roles, u.role);
    const bgColors = {
      admin: "4F46E5",
      owner: "059669",
      customer: "006CE4",
    };
    const bg = bgColors[role] || "006CE4";

    const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${bg}&color=fff&bold=true`;

    return (
      <img
        src={hasValidAvatar ? rawAvatar : fallbackUrl}
        alt={name}
        onError={(e) => {
          e.currentTarget.onerror = null;
          e.currentTarget.src = fallbackUrl;
        }}
        className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-sm shrink-0"
      />
    );
  };

  return (
    <div className="space-y-8 font-sans pb-16 text-slate-800">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-5 py-3.5 rounded-2xl shadow-2xl text-white font-bold text-sm animate-in slide-in-from-bottom-5 ${
            toast.type === "error" ? "bg-rose-600" : "bg-emerald-600"
          }`}
        >
          <CheckCircle2 size={18} />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase text-blue-600 tracking-wider">
              Quản Trị Thành Viên
            </span>
            <Badge variant="primary" size="sm">
              {filteredUsers.length} Tài khoản
            </Badge>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
            Quản Lý Người Dùng & Phân Quyền
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Quản lý danh sách tài khoản toàn hệ thống, phân quyền và kiểm soát
            trạng thái hoạt động.
          </p>
        </div>
      </div>

      {/* Bộ lọc Role & Search */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {ROLE_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setRoleFilter(tab.id);
                setCurrentPage(1);
              }}
              className={`px-5 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                roleFilter === tab.id
                  ? "bg-slate-900 text-white shadow-md"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <Input
            placeholder="Tìm kiếm theo tên, email hoặc số điện thoại..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search size={16} className="text-slate-400" />}
            className="bg-slate-50 border-slate-200 h-12"
            clearable
            onClear={() => setSearch("")}
          />
        </div>
      </div>

      {/* Bảng dữ liệu */}
      {loading ? (
        <div className="py-24 flex justify-center bg-white rounded-3xl border border-slate-200/80 shadow-sm">
          <LoadingSpinner size="lg" label="Đang tải danh sách người dùng..." />
        </div>
      ) : paginatedUsers.length > 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="p-4 pl-6">Người Dùng</th>
                  <th className="p-4">Số Điện Thoại</th>
                  <th className="p-4">Phân Quyền (Role)</th>
                  <th className="p-4">Trạng Thái</th>
                  <th className="p-4 pr-6 text-right">Thao Tác</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 font-medium">
                {paginatedUsers.map((u) => {
                  const name = u.full_name || u.name || "Chưa đặt tên";
                  const email = u.email || "Không có email";
                  const phone = u.phone || u.phone_number || "---";
                  const isSelf = u.id === currentAdminId;
                  const isActive =
                    u.activate !== undefined
                      ? Boolean(u.activate)
                      : Boolean(u.active ?? true);
                  const currentRole = getPrimaryRole(u.roles, u.role);

                  return (
                    <tr
                      key={u.id}
                      className={`hover:bg-slate-50/80 transition-colors ${isSelf ? "bg-blue-50/20" : ""}`}
                    >
                      <td className="p-4 pl-6">
                        <div className="flex items-center gap-3">
                          {/* 👈 RENDER AVATAR GOOGLE THẬT */}
                          {renderAvatar(u, isSelf)}
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-extrabold text-slate-900 text-sm">
                                {name}
                              </p>
                              {isSelf && (
                                <span className="px-2 py-0.5 text-[9px] font-black bg-blue-100 text-blue-700 rounded-full border border-blue-200">
                                  Bạn
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 font-medium mt-0.5">
                              {email}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="p-4 text-xs font-semibold text-slate-600">
                        {phone}
                      </td>

                      <td className="p-4">
                        <select
                          value={currentRole}
                          disabled={isSelf}
                          onChange={(e) =>
                            handleRoleChange(u.id, e.target.value, name)
                          }
                          className={`px-3 py-1.5 border rounded-xl text-xs font-black uppercase cursor-pointer outline-none transition shadow-sm ${
                            currentRole === "admin"
                              ? "bg-purple-50 text-purple-700 border-purple-200"
                              : currentRole === "owner"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-blue-50 text-[#006ce4] border-blue-200"
                          } ${isSelf ? "opacity-60 cursor-not-allowed" : ""}`}
                        >
                          <option value="customer">CUSTOMER (Khách)</option>
                          <option value="owner">OWNER (Chủ nhà)</option>
                          <option value="admin">ADMIN (Quản trị)</option>
                        </select>
                      </td>

                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full border ${
                            isActive
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-rose-500"}`}
                          />
                          {isActive ? "Hoạt động" : "Đã khóa"}
                        </span>
                      </td>

                      <td className="p-4 pr-6 text-right">
                        <Button
                          size="sm"
                          disabled={isSelf}
                          onClick={() => toggleUserStatus(u.id, name, isActive)}
                          className={`text-xs font-bold rounded-xl px-4 ${
                            isSelf
                              ? "bg-slate-200 text-slate-400 cursor-not-allowed border-none shadow-none"
                              : isActive
                                ? "bg-rose-600 hover:bg-rose-700 text-white shadow-sm"
                                : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                          }`}
                        >
                          {isActive ? "Khóa Tài Khoản" : "Mở Khóa"}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="p-4 flex justify-center border-t border-slate-100">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalCount={filteredUsers.length}
                pageSize={10}
                onPageChange={(p) => setCurrentPage(p)}
              />
            </div>
          )}
        </div>
      ) : (
        <EmptyState
          icon={Users}
          title="Không có tài khoản nào phù hợp"
          description={`Không tìm thấy tài khoản nào thuộc nhóm vai trò "${roleFilter.toUpperCase()}".`}
          actionLabel="Xem tất cả tài khoản"
          onAction={() => {
            setRoleFilter("all");
            setSearch("");
          }}
        />
      )}
    </div>
  );
};

export default UserManagementPage;
