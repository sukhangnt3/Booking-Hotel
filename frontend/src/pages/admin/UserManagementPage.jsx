import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";

// Backend
const API_BASE_URL = "http://localhost:5000";

const UserManagementPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentAdminId, setCurrentAdminId] = useState(null);

  // =========================================================
  // LẤY ID ADMIN ĐANG ĐĂNG NHẬP
  // =========================================================
  useEffect(() => {
    try {
      const authStorage = localStorage.getItem("auth-storage");

      if (authStorage) {
        const parsed = JSON.parse(authStorage);
        setCurrentAdminId(parsed?.state?.user?.id || null);
      }
    } catch (error) {
      console.error("Lỗi lấy thông tin Admin đăng nhập:", error);
    }
  }, []);

  // =========================================================
  // SEARCH DEBOUNCE
  // =========================================================
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  // =========================================================
  // LẤY TOKEN
  // =========================================================
  const getAuthHeaders = () => {
    let token =
      localStorage.getItem("token") || localStorage.getItem("accessToken");

    if (!token) {
      try {
        const authStorage = localStorage.getItem("auth-storage");

        if (authStorage) {
          const parsed = JSON.parse(authStorage);
          token = parsed?.state?.token;
        }
      } catch (error) {
        console.error("Lỗi đọc token từ auth-storage:", error);
      }
    }

    return {
      headers: {
        Authorization: token ? `Bearer ${token}` : "",
        "Content-Type": "application/json",
      },
      withCredentials: true,
    };
  };

  // =========================================================
  // LẤY DANH SÁCH USER
  // =========================================================
  const fetchUsers = useCallback(async () => {
    setLoading(true);

    try {
      const response = await axios.get(`${API_BASE_URL}/api/admin/users`, {
        params: {
          search: debouncedSearch.trim(),
        },
        ...getAuthHeaders(),
      });

      const data = response.data;

      let extractedUsers = [];

      if (Array.isArray(data)) {
        extractedUsers = data;
      } else if (Array.isArray(data?.data)) {
        extractedUsers = data.data;
      } else if (Array.isArray(data?.users)) {
        extractedUsers = data.users;
      }

      setUsers(extractedUsers);
    } catch (error) {
      console.error("❌ Lỗi fetch users:", error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // =========================================================
  // LẤY ROLE ƯU TIÊN
  // ADMIN > OWNER > CUSTOMER > GUEST
  // =========================================================
  const getPrimaryRole = (rolesList, singleRole) => {
    const roles = Array.isArray(rolesList)
      ? rolesList.map((role) => String(role).toLowerCase())
      : [String(singleRole || "").toLowerCase()];

    if (roles.includes("admin")) return "admin";
    if (roles.includes("owner")) return "owner";
    if (roles.includes("customer")) return "customer";
    if (roles.includes("guest")) return "guest";

    return roles[0] || "customer";
  };

  // =========================================================
  // ĐỔI ROLE
  // =========================================================
  const handleRoleChange = async (userId, newRole, userName) => {
    // Không cho admin tự hạ quyền
    if (userId === currentAdminId && newRole !== "admin") {
      alert("⚠️ Bạn không thể tự hạ quyền ADMIN của chính mình!");
      return;
    }

    const confirmChange = window.confirm(
      `Xác nhận chuyển vai trò của "${userName}" thành [${newRole.toUpperCase()}]?`,
    );

    if (!confirmChange) return;

    try {
      const response = await axios.patch(
        `${API_BASE_URL}/api/admin/users/${userId}/role`,
        {
          role: newRole.toLowerCase(),
        },
        getAuthHeaders(),
      );

      setUsers((prev) =>
        prev.map((user) => {
          if (user.id === userId) {
            return {
              ...user,
              roles: [newRole.toLowerCase()],
              role: newRole.toLowerCase(),
            };
          }

          return user;
        }),
      );

      alert(response.data?.message || "Đã cập nhật vai trò!");
    } catch (error) {
      console.error("❌ Lỗi đổi role:", error);

      alert(error.response?.data?.message || "Cập nhật vai trò thất bại!");

      fetchUsers();
    }
  };

  // =========================================================
  // KHÓA / MỞ KHÓA USER
  // =========================================================
  const toggleUserStatus = async (userId, userName, currentStatus) => {
    // Không cho admin tự khóa
    if (userId === currentAdminId) {
      alert("⚠️ Bạn không thể tự khóa tài khoản Admin đang sử dụng!");
      return;
    }

    const actionText = currentStatus ? "KHÓA" : "MỞ KHÓA";

    const confirmToggle = window.confirm(
      `Bạn có chắc chắn muốn ${actionText} tài khoản của "${userName}"?`,
    );

    if (!confirmToggle) return;

    try {
      const response = await axios.patch(
        `${API_BASE_URL}/api/admin/users/${userId}/status`,
        {},
        getAuthHeaders(),
      );

      const newStatus = response.data?.activate;

      setUsers((prev) =>
        prev.map((user) => {
          if (user.id === userId) {
            return {
              ...user,
              activate: newStatus,
              active: newStatus,
            };
          }

          return user;
        }),
      );

      alert(response.data?.message || "Thao tác thành công.");
    } catch (error) {
      console.error("❌ Lỗi đổi status:", error);

      alert(error.response?.data?.message || "Thao tác thất bại!");
    }
  };

  // =========================================================
  // STYLE ROLE
  // =========================================================
  const getRoleBadgeStyle = (role) => {
    switch (role?.toLowerCase()) {
      case "admin":
        return "bg-purple-100 text-purple-700 border-purple-200 font-bold";

      case "owner":
        return "bg-blue-100 text-blue-700 border-blue-200 font-bold";

      case "customer":
        return "bg-emerald-100 text-emerald-700 border-emerald-200 font-medium";

      case "guest":
      default:
        return "bg-slate-100 text-slate-600 border-slate-200 font-medium";
    }
  };

  // =========================================================
  // AVATAR
  // =========================================================
  const renderAvatar = (name, avatarUrl) => {
    if (avatarUrl) {
      return (
        <img
          src={avatarUrl}
          alt={name}
          className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-sm"
        />
      );
    }

    const initials = name
      ? name
          .split(" ")
          .map((n) => n[0])
          .slice(-2)
          .join("")
          .toUpperCase()
      : "U";

    return (
      <div className="w-10 h-10 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs shadow-sm">
        {initials}
      </div>
    );
  };

  // =========================================================
  // UI
  // =========================================================
  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header + Search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Quản Lý Người Dùng
          </h1>

          <p className="text-xs text-slate-500 mt-1">
            Quản lý danh sách tài khoản, phân quyền và trạng thái hoạt động.
          </p>
        </div>

        <div className="w-full sm:w-80">
          <div className="relative">
            <input
              type="text"
              placeholder="Tìm theo tên hoặc email..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm transition"
            />

            <svg
              className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Bảng */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 font-medium space-y-2">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-blue-600 mb-2"></div>

            <p>Đang tải danh sách người dùng...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-slate-500 font-medium">
            🚫 Không tìm thấy người dùng nào phù hợp.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="p-4 pl-6">Người Dùng</th>

                  <th className="p-4">Số Điện Thoại</th>

                  <th className="p-4">Vai Trò</th>

                  <th className="p-4">Trạng Thái</th>

                  <th className="p-4 pr-6 text-right">Thao Tác</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {users.map((user) => {
                  const name =
                    user.full_name ||
                    user.fullName ||
                    user.name ||
                    "Chưa đặt tên";

                  const email = user.email || "Không có email";

                  const phone = user.phone || "---";

                  const avatarUrl = user.avatar || user.picture;

                  const isSelf = user.id === currentAdminId;

                  const isActive =
                    user.activate !== undefined
                      ? Boolean(user.activate)
                      : Boolean(user.active);

                  const currentRole = getPrimaryRole(user.roles, user.role);

                  return (
                    <tr
                      key={user.id}
                      className={`hover:bg-slate-50/80 transition ${
                        isSelf ? "bg-blue-50/30" : ""
                      }`}
                    >
                      {/* User */}
                      <td className="p-4 pl-6">
                        <div className="flex items-center gap-3">
                          {renderAvatar(name, avatarUrl)}

                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-slate-900 leading-snug">
                                {name}
                              </p>

                              {isSelf && (
                                <span className="px-2 py-0.5 text-[10px] font-extrabold bg-blue-100 text-blue-700 rounded-full border border-blue-200">
                                  Bạn
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-slate-400 font-medium">
                              {email}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="p-4 text-xs font-medium text-slate-600">
                        {phone}
                      </td>

                      {/* Role */}
                      <td className="p-4">
                        <select
                          value={currentRole}
                          disabled={isSelf}
                          onChange={(event) =>
                            handleRoleChange(user.id, event.target.value, name)
                          }
                          className={`px-3 py-1.5 border rounded-xl text-xs cursor-pointer outline-none transition uppercase shadow-sm ${getRoleBadgeStyle(
                            currentRole,
                          )} ${isSelf ? "opacity-75 cursor-not-allowed" : ""}`}
                        >
                          <option value="admin">ADMIN</option>

                          <option value="owner">OWNER</option>

                          <option value="customer">CUSTOMER</option>

                          <option value="guest">GUEST</option>
                        </select>
                      </td>

                      {/* Status */}
                      <td className="p-4">
                        <span
                          className={`px-3 py-1 text-xs font-bold rounded-full inline-flex items-center gap-1.5 border ${
                            isActive
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isActive ? "bg-emerald-500" : "bg-rose-500"
                            }`}
                          />

                          {isActive ? "Hoạt động" : "Đã khóa"}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="p-4 pr-6 text-right">
                        <button
                          onClick={() =>
                            toggleUserStatus(user.id, name, isActive)
                          }
                          disabled={isSelf}
                          title={
                            isSelf
                              ? "Bạn không thể tự khóa chính mình"
                              : isActive
                                ? "Khóa tài khoản này"
                                : "Mở khóa tài khoản"
                          }
                          className={`px-3.5 py-1.5 font-bold text-xs rounded-xl text-white transition shadow-sm ${
                            isSelf
                              ? "bg-slate-300 cursor-not-allowed"
                              : isActive
                                ? "bg-rose-600 hover:bg-rose-700 active:scale-95"
                                : "bg-emerald-600 hover:bg-emerald-700 active:scale-95"
                          }`}
                        >
                          {isActive ? "Khóa Tài Khoản" : "Mở Khóa"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserManagementPage;
